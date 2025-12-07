-- Phase 5: Update Delta RPC to use template-driven category lookups
-- Feature: Progress Calculation Refactor
--
-- BEFORE: Delta RPC used get_milestone_weight() and hardcoded category mappings
-- AFTER: Delta RPC uses get_component_template() for category and weight lookups
--
-- CALCULATION FORMULAS:
-- delta_mh = budgeted_manhours × (weight/100) × (value_delta/100)
-- category_pct = (category_earned_mh / category_budget) × 100
-- total_pct = (total_earned_mh / total_budget) × 100
--
-- See docs/PROGRESS-CALCULATION.md for full documentation

-- Drop existing function to change implementation
DROP FUNCTION IF EXISTS get_progress_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

-- Task 5.1: Update get_progress_delta_by_dimension() RPC
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
  WITH event_deltas AS (
    SELECT
      me.component_id,
      me.milestone_name,
      COALESCE(me.value, 0) - COALESCE(me.previous_value, 0) AS value_delta,
      c.area_id,
      c.system_id,
      c.test_package_id,
      c.component_type,
      c.project_id,
      COALESCE(c.budgeted_manhours, 0) AS budgeted_manhours,
      -- Get category and weight from template (NOT hardcoded)
      t.category,
      t.weight AS milestone_weight
    FROM milestone_events me
    JOIN components c ON c.id = me.component_id
    LEFT JOIN LATERAL (
      SELECT gt.category, gt.weight
      FROM get_component_template(c.project_id, c.component_type) gt
      WHERE gt.milestone_name = me.milestone_name
    ) t ON true
    WHERE c.project_id = p_project_id
      AND me.created_at >= p_start_date
      AND me.created_at < p_end_date
      AND c.is_retired = false
      AND c.component_type != 'field_weld'
  ),
  dimension_mapping AS (
    SELECT
      ed.*,
      CASE p_dimension
        WHEN 'area' THEN ed.area_id
        WHEN 'system' THEN ed.system_id
        WHEN 'test_package' THEN ed.test_package_id
      END AS dim_id
    FROM event_deltas ed
  ),
  aggregated AS (
    SELECT
      dm.dim_id,
      SUM(CASE WHEN dm.category = 'receive' THEN dm.value_delta * dm.milestone_weight / 100.0 ELSE 0 END) AS receive_delta,
      SUM(CASE WHEN dm.category = 'install' THEN dm.value_delta * dm.milestone_weight / 100.0 ELSE 0 END) AS install_delta,
      SUM(CASE WHEN dm.category = 'punch' THEN dm.value_delta * dm.milestone_weight / 100.0 ELSE 0 END) AS punch_delta,
      SUM(CASE WHEN dm.category = 'test' THEN dm.value_delta * dm.milestone_weight / 100.0 ELSE 0 END) AS test_delta,
      SUM(CASE WHEN dm.category = 'restore' THEN dm.value_delta * dm.milestone_weight / 100.0 ELSE 0 END) AS restore_delta,
      COUNT(DISTINCT dm.component_id)::INT AS active_count
    FROM dimension_mapping dm
    WHERE dm.dim_id IS NOT NULL
      AND dm.category IS NOT NULL
      AND dm.milestone_weight IS NOT NULL
    GROUP BY dm.dim_id
  ),
  budget_by_dim AS (
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
      AND c.component_type != 'field_weld'
    GROUP BY 1
  )
  SELECT
    COALESCE(a.dim_id, b.dim_id) AS dimension_id,
    CASE p_dimension
      WHEN 'area' THEN (SELECT name FROM areas WHERE id = COALESCE(a.dim_id, b.dim_id))
      WHEN 'system' THEN (SELECT name FROM systems WHERE id = COALESCE(a.dim_id, b.dim_id))
      WHEN 'test_package' THEN (SELECT name FROM test_packages WHERE id = COALESCE(a.dim_id, b.dim_id))
    END AS dimension_name,
    COALESCE(a.active_count, 0) AS components_with_activity,
    0::NUMERIC AS delta_received,
    0::NUMERIC AS delta_installed,
    0::NUMERIC AS delta_punch,
    0::NUMERIC AS delta_tested,
    0::NUMERIC AS delta_restored,
    CASE WHEN COALESCE(b.mh_budget, 0) > 0
      THEN ROUND(((COALESCE(a.receive_delta, 0) + COALESCE(a.install_delta, 0) +
                   COALESCE(a.punch_delta, 0) + COALESCE(a.test_delta, 0) +
                   COALESCE(a.restore_delta, 0)) / b.mh_budget) * 100, 2)
      ELSE 0
    END AS delta_total,
    ROUND(COALESCE(b.mh_budget, 0), 2) AS mh_budget,
    ROUND(COALESCE(b.receive_mh_budget, 0), 2) AS receive_mh_budget,
    ROUND(COALESCE(b.install_mh_budget, 0), 2) AS install_mh_budget,
    ROUND(COALESCE(b.punch_mh_budget, 0), 2) AS punch_mh_budget,
    ROUND(COALESCE(b.test_mh_budget, 0), 2) AS test_mh_budget,
    ROUND(COALESCE(b.restore_mh_budget, 0), 2) AS restore_mh_budget,
    ROUND(COALESCE(a.receive_delta, 0), 2) AS delta_receive_mh_earned,
    ROUND(COALESCE(a.install_delta, 0), 2) AS delta_install_mh_earned,
    ROUND(COALESCE(a.punch_delta, 0), 2) AS delta_punch_mh_earned,
    ROUND(COALESCE(a.test_delta, 0), 2) AS delta_test_mh_earned,
    ROUND(COALESCE(a.restore_delta, 0), 2) AS delta_restore_mh_earned,
    ROUND(COALESCE(a.receive_delta, 0) + COALESCE(a.install_delta, 0) +
          COALESCE(a.punch_delta, 0) + COALESCE(a.test_delta, 0) +
          COALESCE(a.restore_delta, 0), 2) AS delta_total_mh_earned,
    CASE WHEN COALESCE(b.mh_budget, 0) > 0
      THEN ROUND(((COALESCE(a.receive_delta, 0) + COALESCE(a.install_delta, 0) +
                   COALESCE(a.punch_delta, 0) + COALESCE(a.test_delta, 0) +
                   COALESCE(a.restore_delta, 0)) / b.mh_budget) * 100, 2)
      ELSE 0
    END AS delta_mh_pct_complete
  FROM aggregated a
  FULL OUTER JOIN budget_by_dim b ON a.dim_id = b.dim_id
  WHERE COALESCE(a.dim_id, b.dim_id) IS NOT NULL
  ORDER BY dimension_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_progress_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION get_progress_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Calculate progress delta by dimension using template-driven category lookups.
Now uses get_component_template() for category and weight lookups instead of hardcoded mappings.
Feature: Progress Calculation Refactor Phase 5';


-- Task 5.2: Update get_field_weld_delta_by_dimension() to use template lookups
DROP FUNCTION IF EXISTS get_field_weld_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION get_field_weld_delta_by_dimension(
  p_project_id UUID,
  p_dimension TEXT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS TABLE (
  dimension_id UUID,
  dimension_name TEXT,
  stencil TEXT,
  welds_with_activity INT,
  delta_fitup_count INT,
  delta_weld_complete_count INT,
  delta_accepted_count INT,
  delta_pct_total NUMERIC
) AS $$
BEGIN
  IF p_dimension NOT IN ('area', 'system', 'test_package', 'welder') THEN
    RAISE EXCEPTION 'Invalid dimension: %. Must be area, system, test_package, or welder', p_dimension;
  END IF;

  RETURN QUERY
  WITH first_and_last_events AS (
    SELECT
      me.component_id,
      me.milestone_name,
      FIRST_VALUE(COALESCE(me.previous_value, 0)) OVER (
        PARTITION BY me.component_id, me.milestone_name
        ORDER BY me.created_at ASC
      ) AS value_before_period,
      LAST_VALUE(COALESCE(me.value, 0)) OVER (
        PARTITION BY me.component_id, me.milestone_name
        ORDER BY me.created_at ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
      ) AS value_at_end,
      c.area_id,
      c.system_id,
      c.test_package_id,
      c.attributes->>'assigned_welder_id' AS welder_id_str,
      c.project_id AS comp_project_id,
      c.component_type,
      ROW_NUMBER() OVER (
        PARTITION BY me.component_id, me.milestone_name
        ORDER BY me.created_at ASC
      ) AS rn
    FROM milestone_events me
    JOIN components c ON c.id = me.component_id
    WHERE c.project_id = p_project_id
      AND me.created_at >= p_start_date
      AND me.created_at < p_end_date
      AND c.is_retired = false
      AND c.component_type = 'field_weld'
  ),
  net_deltas AS (
    SELECT
      fle.component_id,
      fle.milestone_name,
      CASE WHEN fle.value_at_end > fle.value_before_period THEN 1 ELSE 0 END AS net_completion,
      fle.area_id,
      fle.system_id,
      fle.test_package_id,
      fle.welder_id_str,
      fle.comp_project_id,
      fle.component_type
    FROM first_and_last_events fle
    WHERE fle.rn = 1
  ),
  milestone_categorized AS (
    SELECT
      nd.*,
      -- Get category from template instead of hardcoded mapping
      t.category AS milestone_category,
      t.weight AS milestone_weight
    FROM net_deltas nd
    LEFT JOIN LATERAL (
      SELECT gt.category, gt.weight
      FROM get_component_template(nd.comp_project_id, nd.component_type) gt
      WHERE gt.milestone_name = nd.milestone_name
    ) t ON true
  ),
  dimension_aggregates AS (
    SELECT
      CASE p_dimension
        WHEN 'area' THEN mc.area_id
        WHEN 'system' THEN mc.system_id
        WHEN 'test_package' THEN mc.test_package_id
        WHEN 'welder' THEN mc.welder_id_str::UUID
      END AS dim_id,
      COUNT(DISTINCT mc.component_id)::INT AS active_welds,
      -- Sum net completions by category
      COALESCE(SUM(CASE WHEN mc.milestone_category = 'fitup' THEN mc.net_completion ELSE 0 END), 0)::INT AS d_fitup,
      COALESCE(SUM(CASE WHEN mc.milestone_category = 'weld' THEN mc.net_completion ELSE 0 END), 0)::INT AS d_weld_complete,
      COALESCE(SUM(CASE WHEN mc.milestone_category = 'accepted' THEN mc.net_completion ELSE 0 END), 0)::INT AS d_accepted,
      -- Get weights for each category from template (for percentage calculation)
      MAX(CASE WHEN mc.milestone_category = 'fitup' THEN mc.milestone_weight ELSE 0 END) AS fitup_weight,
      MAX(CASE WHEN mc.milestone_category = 'weld' THEN mc.milestone_weight ELSE 0 END) AS weld_weight,
      MAX(CASE WHEN mc.milestone_category = 'accepted' THEN mc.milestone_weight ELSE 0 END) AS accepted_weight
    FROM milestone_categorized mc
    WHERE mc.milestone_category IS NOT NULL
    GROUP BY dim_id
  ),
  weighted_totals AS (
    SELECT
      da.*,
      CASE
        WHEN da.active_welds > 0 THEN
          ((da.d_fitup * da.fitup_weight + da.d_weld_complete * da.weld_weight + da.d_accepted * da.accepted_weight) / da.active_welds)
        ELSE 0
      END AS d_pct_total
    FROM dimension_aggregates da
  )
  SELECT
    wt.dim_id AS dimension_id,
    CASE p_dimension
      WHEN 'area' THEN a.name
      WHEN 'system' THEN s.name
      WHEN 'test_package' THEN tp.name
      WHEN 'welder' THEN w.name
    END AS dimension_name,
    CASE p_dimension WHEN 'welder' THEN w.stencil ELSE NULL END AS stencil,
    wt.active_welds AS welds_with_activity,
    wt.d_fitup AS delta_fitup_count,
    wt.d_weld_complete AS delta_weld_complete_count,
    wt.d_accepted AS delta_accepted_count,
    ROUND(wt.d_pct_total, 2) AS delta_pct_total
  FROM weighted_totals wt
  LEFT JOIN areas a ON p_dimension = 'area' AND a.id = wt.dim_id
  LEFT JOIN systems s ON p_dimension = 'system' AND s.id = wt.dim_id
  LEFT JOIN test_packages tp ON p_dimension = 'test_package' AND tp.id = wt.dim_id
  LEFT JOIN welders w ON p_dimension = 'welder' AND w.id = wt.dim_id
  WHERE wt.dim_id IS NOT NULL
  ORDER BY dimension_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_field_weld_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION get_field_weld_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Calculate field weld progress delta using template-driven category lookups.
Now uses get_component_template() for category and weight lookups instead of hardcoded mappings.
Feature: Progress Calculation Refactor Phase 5';
