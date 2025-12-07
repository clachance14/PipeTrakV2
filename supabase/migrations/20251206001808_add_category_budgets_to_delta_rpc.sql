-- Migration: Add Category Budgets to Delta RPC
-- Feature: 033-timeline-report-filter
--
-- Problem: Delta report shows "Delta Received" as % of total budget (0.7%)
--          but All Time shows Receive % as % of receive budget (28.5%)
--          For a project <30 days old, these should match.
--
-- Solution: Add category-specific budgets to the RPC return so the UI
--           can calculate: deltaReceiveMhEarned / receiveMhBudget
--           instead of: deltaReceiveMhEarned / totalMhBudget

-- Drop existing function to change return type
DROP FUNCTION IF EXISTS get_progress_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

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
  -- NEW: Category-specific budgets (matches vw_manhour_progress_by_area)
  receive_mh_budget NUMERIC,
  install_mh_budget NUMERIC,
  punch_mh_budget NUMERIC,
  test_mh_budget NUMERIC,
  restore_mh_budget NUMERIC,
  -- Existing delta earned fields
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
  WITH milestone_events_in_range AS (
    -- Get all milestone events in the date range with component info
    SELECT
      me.id AS event_id,
      me.component_id,
      me.milestone_name,
      me.value,
      me.previous_value,
      me.created_at,
      c.component_type,
      c.project_id AS comp_project_id,
      COALESCE(c.budgeted_manhours, 0) AS budgeted_manhours,
      CASE p_dimension
        WHEN 'area' THEN c.area_id
        WHEN 'system' THEN c.system_id
        WHEN 'test_package' THEN c.test_package_id
      END AS dim_id
    FROM milestone_events me
    JOIN components c ON c.id = me.component_id
    WHERE c.project_id = p_project_id
      AND c.is_retired = false
      AND me.created_at >= p_start_date
      AND me.created_at < p_end_date
  ),
  -- For each component/milestone pair, find the first and last events
  first_last_events AS (
    SELECT DISTINCT ON (mer.component_id, mer.milestone_name)
      mer.component_id,
      mer.milestone_name,
      mer.component_type,
      mer.comp_project_id,
      mer.budgeted_manhours,
      mer.dim_id,
      -- First event's previous_value (or 0 if null) = start value
      FIRST_VALUE(COALESCE(mer.previous_value, 0)) OVER (
        PARTITION BY mer.component_id, mer.milestone_name
        ORDER BY mer.created_at ASC
      ) AS start_value,
      -- Last event's value = end value
      LAST_VALUE(mer.value) OVER (
        PARTITION BY mer.component_id, mer.milestone_name
        ORDER BY mer.created_at ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
      ) AS end_value
    FROM milestone_events_in_range mer
    WHERE mer.dim_id IS NOT NULL
  ),
  -- Calculate net change for each component/milestone pair
  net_changes AS (
    SELECT
      fle.component_id,
      fle.milestone_name,
      fle.component_type,
      fle.comp_project_id,
      fle.budgeted_manhours,
      fle.dim_id,
      -- Net change = end - start, but only count POSITIVE progress
      -- Rollbacks result in 0 gain, not negative progress
      GREATEST(COALESCE(fle.end_value, 0) - COALESCE(fle.start_value, 0), 0) AS net_value_change,
      -- Get milestone category
      get_milestone_standard_category(fle.component_type, fle.milestone_name) AS standard_category,
      -- Get milestone weight from project templates (with fallback to system templates)
      COALESCE(
        (SELECT ppt.weight FROM project_progress_templates ppt
         WHERE ppt.project_id = fle.comp_project_id
           AND ppt.component_type = fle.component_type
           AND LOWER(ppt.milestone_name) = LOWER(fle.milestone_name)
         LIMIT 1),
        (SELECT (m.milestone->>'weight')::NUMERIC
         FROM progress_templates pt,
              LATERAL jsonb_array_elements(pt.milestones_config) AS m(milestone)
         WHERE pt.component_type = fle.component_type
           AND pt.version = 1
           AND LOWER(m.milestone->>'name') = LOWER(fle.milestone_name)
         LIMIT 1),
        0
      ) AS milestone_weight
    FROM first_last_events fle
  ),
  -- Calculate delta manhours
  calculated_deltas AS (
    SELECT
      nc.component_id,
      nc.dim_id,
      nc.standard_category,
      -- delta_mh = (net_value_change / 100) * budgeted_manhours * (milestone_weight / 100)
      (nc.net_value_change / 100.0) * nc.budgeted_manhours * (nc.milestone_weight / 100.0) AS delta_mh
    FROM net_changes nc
    WHERE nc.standard_category IS NOT NULL
      AND nc.milestone_weight > 0
  ),
  -- Calculate category budgets per dimension (same calculation as vw_manhour_progress_by_area)
  dimension_totals AS (
    SELECT
      CASE p_dimension
        WHEN 'area' THEN c.area_id
        WHEN 'system' THEN c.system_id
        WHEN 'test_package' THEN c.test_package_id
      END AS dim_id,
      SUM(COALESCE(c.budgeted_manhours, 0)) AS total_mh_budget,
      -- Category budgets using same weights as vw_manhour_progress_by_area
      SUM(COALESCE(c.budgeted_manhours, 0) *
        CASE c.component_type
          WHEN 'spool' THEN 0.05
          WHEN 'field_weld' THEN 0.0
          ELSE 0.10
        END
      ) AS receive_budget,
      SUM(COALESCE(c.budgeted_manhours, 0) *
        CASE c.component_type
          WHEN 'spool' THEN 0.80
          WHEN 'field_weld' THEN 0.95
          WHEN 'threaded_pipe' THEN 0.80
          ELSE 0.60
        END
      ) AS install_budget,
      SUM(COALESCE(c.budgeted_manhours, 0) *
        CASE c.component_type
          WHEN 'spool' THEN 0.05
          WHEN 'field_weld' THEN 0.05
          WHEN 'instrument' THEN 0.10
          ELSE 0.10
        END
      ) AS punch_budget,
      SUM(COALESCE(c.budgeted_manhours, 0) *
        CASE c.component_type
          WHEN 'spool' THEN 0.05
          WHEN 'field_weld' THEN 0.0
          WHEN 'valve' THEN 0.10
          WHEN 'instrument' THEN 0.10
          ELSE 0.0
        END
      ) AS test_budget,
      SUM(COALESCE(c.budgeted_manhours, 0) *
        CASE c.component_type
          WHEN 'spool' THEN 0.05
          WHEN 'field_weld' THEN 0.0
          WHEN 'support' THEN 0.10
          ELSE 0.10
        END
      ) AS restore_budget
    FROM components c
    WHERE c.project_id = p_project_id
      AND c.is_retired = false
    GROUP BY 1
    HAVING CASE p_dimension
      WHEN 'area' THEN c.area_id
      WHEN 'system' THEN c.system_id
      WHEN 'test_package' THEN c.test_package_id
    END IS NOT NULL
  ),
  dimension_deltas AS (
    SELECT
      cd.dim_id,
      COUNT(DISTINCT cd.component_id)::INT AS active_count,
      COALESCE(SUM(CASE WHEN cd.standard_category = 'receive' THEN cd.delta_mh ELSE 0 END), 0) AS d_receive_mh,
      COALESCE(SUM(CASE WHEN cd.standard_category = 'install' THEN cd.delta_mh ELSE 0 END), 0) AS d_install_mh,
      COALESCE(SUM(CASE WHEN cd.standard_category = 'punch' THEN cd.delta_mh ELSE 0 END), 0) AS d_punch_mh,
      COALESCE(SUM(CASE WHEN cd.standard_category = 'test' THEN cd.delta_mh ELSE 0 END), 0) AS d_test_mh,
      COALESCE(SUM(CASE WHEN cd.standard_category = 'restore' THEN cd.delta_mh ELSE 0 END), 0) AS d_restore_mh
    FROM calculated_deltas cd
    GROUP BY cd.dim_id
  )
  SELECT
    dt.dim_id AS dimension_id,
    CASE p_dimension
      WHEN 'area' THEN a.name
      WHEN 'system' THEN s.name
      WHEN 'test_package' THEN tp.name
    END AS dimension_name,
    COALESCE(dd.active_count, 0) AS components_with_activity,
    0::NUMERIC AS delta_received,
    0::NUMERIC AS delta_installed,
    0::NUMERIC AS delta_punch,
    0::NUMERIC AS delta_tested,
    0::NUMERIC AS delta_restored,
    CASE WHEN dt.total_mh_budget > 0
      THEN ROUND(((COALESCE(dd.d_receive_mh, 0) + COALESCE(dd.d_install_mh, 0) +
                   COALESCE(dd.d_punch_mh, 0) + COALESCE(dd.d_test_mh, 0) +
                   COALESCE(dd.d_restore_mh, 0)) / dt.total_mh_budget) * 100, 2)
      ELSE 0
    END AS delta_total,
    ROUND(dt.total_mh_budget, 2) AS mh_budget,
    -- NEW: Category budgets
    ROUND(COALESCE(dt.receive_budget, 0), 2) AS receive_mh_budget,
    ROUND(COALESCE(dt.install_budget, 0), 2) AS install_mh_budget,
    ROUND(COALESCE(dt.punch_budget, 0), 2) AS punch_mh_budget,
    ROUND(COALESCE(dt.test_budget, 0), 2) AS test_mh_budget,
    ROUND(COALESCE(dt.restore_budget, 0), 2) AS restore_mh_budget,
    -- Existing delta earned fields
    ROUND(COALESCE(dd.d_receive_mh, 0), 2) AS delta_receive_mh_earned,
    ROUND(COALESCE(dd.d_install_mh, 0), 2) AS delta_install_mh_earned,
    ROUND(COALESCE(dd.d_punch_mh, 0), 2) AS delta_punch_mh_earned,
    ROUND(COALESCE(dd.d_test_mh, 0), 2) AS delta_test_mh_earned,
    ROUND(COALESCE(dd.d_restore_mh, 0), 2) AS delta_restore_mh_earned,
    ROUND(COALESCE(dd.d_receive_mh, 0) + COALESCE(dd.d_install_mh, 0) +
          COALESCE(dd.d_punch_mh, 0) + COALESCE(dd.d_test_mh, 0) +
          COALESCE(dd.d_restore_mh, 0), 2) AS delta_total_mh_earned,
    CASE WHEN dt.total_mh_budget > 0
      THEN ROUND(((COALESCE(dd.d_receive_mh, 0) + COALESCE(dd.d_install_mh, 0) +
                   COALESCE(dd.d_punch_mh, 0) + COALESCE(dd.d_test_mh, 0) +
                   COALESCE(dd.d_restore_mh, 0)) / dt.total_mh_budget) * 100, 2)
      ELSE 0
    END AS delta_mh_pct_complete
  FROM dimension_totals dt
  LEFT JOIN dimension_deltas dd ON dd.dim_id = dt.dim_id
  LEFT JOIN areas a ON p_dimension = 'area' AND a.id = dt.dim_id
  LEFT JOIN systems s ON p_dimension = 'system' AND s.id = dt.dim_id
  LEFT JOIN test_packages tp ON p_dimension = 'test_package' AND tp.id = dt.dim_id
  WHERE dt.dim_id IS NOT NULL
  ORDER BY dimension_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
