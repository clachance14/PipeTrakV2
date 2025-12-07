-- Migration: Simplify get_progress_delta_by_dimension RPC
-- Feature: Timeline Report Filter (033)
--
-- BEFORE: Complex CROSS JOIN LATERAL that recalculates weights per event
-- AFTER: Simple aggregation using pre-calculated delta_mh and category columns
--
-- Key changes:
-- 1. Include ALL component types (no field_weld exclusion)
-- 2. Sum delta_mh by category using FILTER clauses
-- 3. Calculate budget separately from components table
-- 4. Remove CROSS JOIN LATERAL complexity

-- Drop existing function
DROP FUNCTION IF EXISTS get_progress_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

-- Create simplified version
CREATE OR REPLACE FUNCTION get_progress_delta_by_dimension(
  p_project_id UUID,
  p_dimension TEXT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS TABLE (
  dimension_id UUID,
  dimension_name TEXT,
  components_with_activity INT,
  delta_received NUMERIC,
  delta_installed NUMERIC,
  delta_punch NUMERIC,
  delta_tested NUMERIC,
  delta_restored NUMERIC,
  delta_total NUMERIC,
  mh_budget NUMERIC,
  receive_mh_budget NUMERIC,
  install_mh_budget NUMERIC,
  punch_mh_budget NUMERIC,
  test_mh_budget NUMERIC,
  restore_mh_budget NUMERIC,
  delta_receive_mh_earned NUMERIC,
  delta_install_mh_earned NUMERIC,
  delta_punch_mh_earned NUMERIC,
  delta_test_mh_earned NUMERIC,
  delta_restore_mh_earned NUMERIC,
  delta_total_mh_earned NUMERIC,
  delta_mh_pct_complete NUMERIC
) AS $$
BEGIN
  IF p_dimension NOT IN ('area', 'system', 'test_package') THEN
    RAISE EXCEPTION 'Invalid dimension: %. Must be area, system, or test_package', p_dimension;
  END IF;

  RETURN QUERY
  WITH delta_aggregation AS (
    -- Aggregate delta_mh by dimension and category
    SELECT
      CASE p_dimension
        WHEN 'area' THEN c.area_id
        WHEN 'system' THEN c.system_id
        WHEN 'test_package' THEN c.test_package_id
      END AS dim_id,
      COUNT(DISTINCT me.component_id)::INT AS active_count,
      -- Sum delta_mh by category using FILTER clauses
      SUM(me.delta_mh) FILTER (WHERE me.category = 'receive') AS receive_earned,
      SUM(me.delta_mh) FILTER (WHERE me.category = 'install') AS install_earned,
      SUM(me.delta_mh) FILTER (WHERE me.category = 'punch') AS punch_earned,
      SUM(me.delta_mh) FILTER (WHERE me.category = 'test') AS test_earned,
      SUM(me.delta_mh) FILTER (WHERE me.category = 'restore') AS restore_earned
    FROM milestone_events me
    JOIN components c ON c.id = me.component_id
    WHERE c.project_id = p_project_id
      AND me.created_at >= p_start_date
      AND me.created_at < p_end_date
      AND c.is_retired = false
      AND me.category IS NOT NULL  -- Only include events with category
      AND me.delta_mh IS NOT NULL  -- Only include events with calculated delta
    GROUP BY dim_id
  ),
  budget_by_dim AS (
    -- Calculate budget by dimension using template weights
    SELECT
      CASE p_dimension
        WHEN 'area' THEN c.area_id
        WHEN 'system' THEN c.system_id
        WHEN 'test_package' THEN c.test_package_id
      END AS dim_id,
      SUM(COALESCE(c.budgeted_manhours, 0)) AS mh_budget,
      -- Calculate category budgets using template weights
      SUM(COALESCE(c.budgeted_manhours, 0) * COALESCE(cat.category_weight, 0) / 100.0) FILTER (WHERE cat.category = 'receive') AS receive_mh_budget,
      SUM(COALESCE(c.budgeted_manhours, 0) * COALESCE(cat.category_weight, 0) / 100.0) FILTER (WHERE cat.category = 'install') AS install_mh_budget,
      SUM(COALESCE(c.budgeted_manhours, 0) * COALESCE(cat.category_weight, 0) / 100.0) FILTER (WHERE cat.category = 'punch') AS punch_mh_budget,
      SUM(COALESCE(c.budgeted_manhours, 0) * COALESCE(cat.category_weight, 0) / 100.0) FILTER (WHERE cat.category = 'test') AS test_mh_budget,
      SUM(COALESCE(c.budgeted_manhours, 0) * COALESCE(cat.category_weight, 0) / 100.0) FILTER (WHERE cat.category = 'restore') AS restore_mh_budget
    FROM components c
    CROSS JOIN LATERAL (
      -- Sum up all milestone weights for each category
      SELECT
        gt.category,
        SUM(gt.weight) AS category_weight
      FROM get_component_template(c.project_id, c.component_type) gt
      GROUP BY gt.category
    ) cat
    WHERE c.project_id = p_project_id
      AND c.is_retired = false
    GROUP BY dim_id
  )
  SELECT
    COALESCE(a.dim_id, b.dim_id) AS dimension_id,
    CASE p_dimension
      WHEN 'area' THEN (SELECT name FROM areas WHERE id = COALESCE(a.dim_id, b.dim_id))
      WHEN 'system' THEN (SELECT name FROM systems WHERE id = COALESCE(a.dim_id, b.dim_id))
      WHEN 'test_package' THEN (SELECT name FROM test_packages WHERE id = COALESCE(a.dim_id, b.dim_id))
    END AS dimension_name,
    COALESCE(a.active_count, 0) AS components_with_activity,
    -- Legacy columns (placeholders for compatibility)
    0::NUMERIC AS delta_received,
    0::NUMERIC AS delta_installed,
    0::NUMERIC AS delta_punch,
    0::NUMERIC AS delta_tested,
    0::NUMERIC AS delta_restored,
    -- Calculate delta_total as percentage of budget
    CASE WHEN COALESCE(b.mh_budget, 0) > 0
      THEN ROUND(((COALESCE(a.receive_earned, 0) + COALESCE(a.install_earned, 0) +
                   COALESCE(a.punch_earned, 0) + COALESCE(a.test_earned, 0) +
                   COALESCE(a.restore_earned, 0)) / b.mh_budget) * 100, 2)
      ELSE 0
    END AS delta_total,
    -- Budget columns
    ROUND(COALESCE(b.mh_budget, 0), 2) AS mh_budget,
    ROUND(COALESCE(b.receive_mh_budget, 0), 2) AS receive_mh_budget,
    ROUND(COALESCE(b.install_mh_budget, 0), 2) AS install_mh_budget,
    ROUND(COALESCE(b.punch_mh_budget, 0), 2) AS punch_mh_budget,
    ROUND(COALESCE(b.test_mh_budget, 0), 2) AS test_mh_budget,
    ROUND(COALESCE(b.restore_mh_budget, 0), 2) AS restore_mh_budget,
    -- Delta earned columns (use pre-calculated delta_mh)
    ROUND(COALESCE(a.receive_earned, 0), 2) AS delta_receive_mh_earned,
    ROUND(COALESCE(a.install_earned, 0), 2) AS delta_install_mh_earned,
    ROUND(COALESCE(a.punch_earned, 0), 2) AS delta_punch_mh_earned,
    ROUND(COALESCE(a.test_earned, 0), 2) AS delta_test_mh_earned,
    ROUND(COALESCE(a.restore_earned, 0), 2) AS delta_restore_mh_earned,
    ROUND(COALESCE(a.receive_earned, 0) + COALESCE(a.install_earned, 0) +
          COALESCE(a.punch_earned, 0) + COALESCE(a.test_earned, 0) +
          COALESCE(a.restore_earned, 0), 2) AS delta_total_mh_earned,
    -- Calculate percentage complete
    CASE WHEN COALESCE(b.mh_budget, 0) > 0
      THEN ROUND(((COALESCE(a.receive_earned, 0) + COALESCE(a.install_earned, 0) +
                   COALESCE(a.punch_earned, 0) + COALESCE(a.test_earned, 0) +
                   COALESCE(a.restore_earned, 0)) / b.mh_budget) * 100, 2)
      ELSE 0
    END AS delta_mh_pct_complete
  FROM delta_aggregation a
  FULL OUTER JOIN budget_by_dim b ON a.dim_id = b.dim_id
  WHERE COALESCE(a.dim_id, b.dim_id) IS NOT NULL
  ORDER BY dimension_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_progress_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION get_progress_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Calculate progress delta by dimension using pre-calculated delta_mh and category columns.
Simplified from complex CROSS JOIN LATERAL to simple aggregation.
Includes ALL component types (no field_weld exclusion).
Feature: Timeline Report Filter (033)';
