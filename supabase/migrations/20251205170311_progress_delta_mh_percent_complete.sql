-- Migration: Progress delta showing manhour % complete change per milestone
-- Feature: 033-timeline-report-filter
--
-- What this calculates:
-- For each milestone, calculate (current MH % complete) - (MH % complete at start of period)
-- This shows the actual progress delta in percentage terms
--
-- Example: If "Installed" was at 45% MH complete at period start and is now 47.5%,
-- the delta would be +2.5%

-- ============================================================================
-- FUNCTION 1: get_progress_delta_by_dimension (REWRITTEN)
-- Now shows manhour % complete delta per milestone
-- ============================================================================

CREATE OR REPLACE FUNCTION get_progress_delta_by_dimension(
  p_project_id UUID,
  p_dimension TEXT,      -- 'area', 'system', 'test_package'
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS TABLE (
  dimension_id UUID,
  dimension_name TEXT,
  components_with_activity INT,

  -- Manhour % complete deltas per milestone (what changed during period)
  delta_received NUMERIC,
  delta_installed NUMERIC,
  delta_punch NUMERIC,
  delta_tested NUMERIC,
  delta_restored NUMERIC,
  delta_total NUMERIC,

  -- Manhour-based deltas (raw values, for compatibility)
  mh_budget NUMERIC,
  delta_receive_mh_earned NUMERIC,
  delta_install_mh_earned NUMERIC,
  delta_punch_mh_earned NUMERIC,
  delta_test_mh_earned NUMERIC,
  delta_restore_mh_earned NUMERIC,
  delta_total_mh_earned NUMERIC,
  delta_mh_pct_complete NUMERIC
) AS $$
BEGIN
  -- Validate dimension parameter
  IF p_dimension NOT IN ('area', 'system', 'test_package') THEN
    RAISE EXCEPTION 'Invalid dimension: %. Must be area, system, or test_package', p_dimension;
  END IF;

  RETURN QUERY
  WITH dimension_components AS (
    -- Get all components in each dimension with their manhour budgets and weights
    SELECT
      c.id AS component_id,
      CASE p_dimension
        WHEN 'area' THEN c.area_id
        WHEN 'system' THEN c.system_id
        WHEN 'test_package' THEN c.test_package_id
      END AS dim_id,
      c.component_type,
      COALESCE(c.budgeted_manhours, 0) AS budgeted_mh,
      -- Get milestone weights for this component type
      get_milestone_weight(p_project_id, c.component_type, 'receive') AS w_receive,
      get_milestone_weight(p_project_id, c.component_type, 'install') AS w_install,
      get_milestone_weight(p_project_id, c.component_type, 'punch') AS w_punch,
      get_milestone_weight(p_project_id, c.component_type, 'test') AS w_test,
      get_milestone_weight(p_project_id, c.component_type, 'restore') AS w_restore
    FROM components c
    WHERE c.project_id = p_project_id
      AND c.is_retired = false
      AND c.component_type != 'field_weld'
      AND CASE p_dimension
        WHEN 'area' THEN c.area_id IS NOT NULL
        WHEN 'system' THEN c.system_id IS NOT NULL
        WHEN 'test_package' THEN c.test_package_id IS NOT NULL
      END
  ),
  current_milestone_values AS (
    -- Get current milestone values for each component
    SELECT
      cm.component_id,
      cm.milestone_name,
      COALESCE(cm.value, 0) AS current_value
    FROM component_milestones cm
    JOIN dimension_components dc ON dc.component_id = cm.component_id
  ),
  milestone_values_at_start AS (
    -- Calculate milestone values at the START of the period
    -- This is: current_value - sum of all changes during the period
    SELECT
      cmv.component_id,
      cmv.milestone_name,
      cmv.current_value - COALESCE(
        (SELECT SUM(COALESCE(me.value, 0) - COALESCE(me.previous_value, 0))
         FROM milestone_events me
         WHERE me.component_id = cmv.component_id
           AND me.milestone_name = cmv.milestone_name
           AND me.created_at >= p_start_date
           AND me.created_at < p_end_date),
        0
      ) AS value_at_start
    FROM current_milestone_values cmv
  ),
  component_mh_earned AS (
    -- Calculate MH earned per milestone at start and current for each component
    SELECT
      dc.component_id,
      dc.dim_id,
      dc.budgeted_mh,
      -- Current MH earned per milestone
      COALESCE(MAX(CASE WHEN cmv.milestone_name = 'Receive' THEN cmv.current_value * dc.budgeted_mh * dc.w_receive / 10000 END), 0) AS curr_receive_mh,
      COALESCE(MAX(CASE WHEN cmv.milestone_name IN ('Install', 'Erect', 'Connect', 'Fabricate', 'Support') THEN cmv.current_value * dc.budgeted_mh * dc.w_install / 10000 END), 0) AS curr_install_mh,
      COALESCE(MAX(CASE WHEN cmv.milestone_name = 'Punch Complete' THEN cmv.current_value * dc.budgeted_mh * dc.w_punch / 10000 END), 0) AS curr_punch_mh,
      COALESCE(MAX(CASE WHEN cmv.milestone_name IN ('Test', 'Hydrotest') THEN cmv.current_value * dc.budgeted_mh * dc.w_test / 10000 END), 0) AS curr_test_mh,
      COALESCE(MAX(CASE WHEN cmv.milestone_name IN ('Restore', 'Insulate') THEN cmv.current_value * dc.budgeted_mh * dc.w_restore / 10000 END), 0) AS curr_restore_mh,
      -- MH earned at start per milestone
      COALESCE(MAX(CASE WHEN mvs.milestone_name = 'Receive' THEN mvs.value_at_start * dc.budgeted_mh * dc.w_receive / 10000 END), 0) AS start_receive_mh,
      COALESCE(MAX(CASE WHEN mvs.milestone_name IN ('Install', 'Erect', 'Connect', 'Fabricate', 'Support') THEN mvs.value_at_start * dc.budgeted_mh * dc.w_install / 10000 END), 0) AS start_install_mh,
      COALESCE(MAX(CASE WHEN mvs.milestone_name = 'Punch Complete' THEN mvs.value_at_start * dc.budgeted_mh * dc.w_punch / 10000 END), 0) AS start_punch_mh,
      COALESCE(MAX(CASE WHEN mvs.milestone_name IN ('Test', 'Hydrotest') THEN mvs.value_at_start * dc.budgeted_mh * dc.w_test / 10000 END), 0) AS start_test_mh,
      COALESCE(MAX(CASE WHEN mvs.milestone_name IN ('Restore', 'Insulate') THEN mvs.value_at_start * dc.budgeted_mh * dc.w_restore / 10000 END), 0) AS start_restore_mh
    FROM dimension_components dc
    LEFT JOIN current_milestone_values cmv ON cmv.component_id = dc.component_id
    LEFT JOIN milestone_values_at_start mvs ON mvs.component_id = dc.component_id AND mvs.milestone_name = cmv.milestone_name
    GROUP BY dc.component_id, dc.dim_id, dc.budgeted_mh
  ),
  dimension_totals AS (
    -- Aggregate to dimension level
    SELECT
      cme.dim_id,
      COUNT(DISTINCT cme.component_id)::INT AS total_components,
      SUM(cme.budgeted_mh) AS total_budget,
      -- Current MH earned totals
      SUM(cme.curr_receive_mh) AS curr_receive_total,
      SUM(cme.curr_install_mh) AS curr_install_total,
      SUM(cme.curr_punch_mh) AS curr_punch_total,
      SUM(cme.curr_test_mh) AS curr_test_total,
      SUM(cme.curr_restore_mh) AS curr_restore_total,
      -- Start MH earned totals
      SUM(cme.start_receive_mh) AS start_receive_total,
      SUM(cme.start_install_mh) AS start_install_total,
      SUM(cme.start_punch_mh) AS start_punch_total,
      SUM(cme.start_test_mh) AS start_test_total,
      SUM(cme.start_restore_mh) AS start_restore_total
    FROM component_mh_earned cme
    WHERE cme.dim_id IS NOT NULL
    GROUP BY cme.dim_id
  ),
  active_components AS (
    -- Count components that had milestone events in the period
    SELECT
      CASE p_dimension
        WHEN 'area' THEN c.area_id
        WHEN 'system' THEN c.system_id
        WHEN 'test_package' THEN c.test_package_id
      END AS dim_id,
      COUNT(DISTINCT me.component_id)::INT AS active_count
    FROM milestone_events me
    JOIN components c ON c.id = me.component_id
    WHERE c.project_id = p_project_id
      AND me.created_at >= p_start_date
      AND me.created_at < p_end_date
      AND c.is_retired = false
      AND c.component_type != 'field_weld'
    GROUP BY 1
  ),
  delta_calculations AS (
    -- Calculate percentage deltas
    SELECT
      dt.dim_id,
      COALESCE(ac.active_count, 0) AS components_with_activity,
      dt.total_budget,
      -- Delta MH earned (raw)
      (dt.curr_receive_total - dt.start_receive_total) AS delta_receive_mh,
      (dt.curr_install_total - dt.start_install_total) AS delta_install_mh,
      (dt.curr_punch_total - dt.start_punch_total) AS delta_punch_mh,
      (dt.curr_test_total - dt.start_test_total) AS delta_test_mh,
      (dt.curr_restore_total - dt.start_restore_total) AS delta_restore_mh,
      -- Delta % complete per milestone (change in MH% for that milestone)
      CASE WHEN dt.total_budget > 0 THEN
        ((dt.curr_receive_total - dt.start_receive_total) / dt.total_budget) * 100
      ELSE 0 END AS delta_receive_pct,
      CASE WHEN dt.total_budget > 0 THEN
        ((dt.curr_install_total - dt.start_install_total) / dt.total_budget) * 100
      ELSE 0 END AS delta_install_pct,
      CASE WHEN dt.total_budget > 0 THEN
        ((dt.curr_punch_total - dt.start_punch_total) / dt.total_budget) * 100
      ELSE 0 END AS delta_punch_pct,
      CASE WHEN dt.total_budget > 0 THEN
        ((dt.curr_test_total - dt.start_test_total) / dt.total_budget) * 100
      ELSE 0 END AS delta_test_pct,
      CASE WHEN dt.total_budget > 0 THEN
        ((dt.curr_restore_total - dt.start_restore_total) / dt.total_budget) * 100
      ELSE 0 END AS delta_restore_pct
    FROM dimension_totals dt
    LEFT JOIN active_components ac ON ac.dim_id = dt.dim_id
  )
  -- Final output with dimension names
  SELECT
    dc.dim_id AS dimension_id,
    CASE p_dimension
      WHEN 'area' THEN a.name
      WHEN 'system' THEN s.name
      WHEN 'test_package' THEN tp.name
    END AS dimension_name,
    dc.components_with_activity,
    -- Percentage deltas per milestone (clamped to non-negative)
    ROUND(GREATEST(dc.delta_receive_pct, 0), 2) AS delta_received,
    ROUND(GREATEST(dc.delta_install_pct, 0), 2) AS delta_installed,
    ROUND(GREATEST(dc.delta_punch_pct, 0), 2) AS delta_punch,
    ROUND(GREATEST(dc.delta_test_pct, 0), 2) AS delta_tested,
    ROUND(GREATEST(dc.delta_restore_pct, 0), 2) AS delta_restored,
    -- Total delta (sum of milestone deltas)
    ROUND(GREATEST(
      dc.delta_receive_pct + dc.delta_install_pct + dc.delta_punch_pct +
      dc.delta_test_pct + dc.delta_restore_pct, 0
    ), 2) AS delta_total,
    -- Raw MH values
    ROUND(dc.total_budget, 2) AS mh_budget,
    ROUND(GREATEST(dc.delta_receive_mh, 0), 2) AS delta_receive_mh_earned,
    ROUND(GREATEST(dc.delta_install_mh, 0), 2) AS delta_install_mh_earned,
    ROUND(GREATEST(dc.delta_punch_mh, 0), 2) AS delta_punch_mh_earned,
    ROUND(GREATEST(dc.delta_test_mh, 0), 2) AS delta_test_mh_earned,
    ROUND(GREATEST(dc.delta_restore_mh, 0), 2) AS delta_restore_mh_earned,
    ROUND(GREATEST(
      dc.delta_receive_mh + dc.delta_install_mh + dc.delta_punch_mh +
      dc.delta_test_mh + dc.delta_restore_mh, 0
    ), 2) AS delta_total_mh_earned,
    -- Overall % complete delta
    ROUND(GREATEST(
      dc.delta_receive_pct + dc.delta_install_pct + dc.delta_punch_pct +
      dc.delta_test_pct + dc.delta_restore_pct, 0
    ), 2) AS delta_mh_pct_complete
  FROM delta_calculations dc
  LEFT JOIN areas a ON p_dimension = 'area' AND a.id = dc.dim_id
  LEFT JOIN systems s ON p_dimension = 'system' AND s.id = dc.dim_id
  LEFT JOIN test_packages tp ON p_dimension = 'test_package' AND tp.id = dc.dim_id
  WHERE dc.dim_id IS NOT NULL
    AND dc.components_with_activity > 0  -- Only show dimensions with activity
  ORDER BY dimension_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_progress_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Calculate manhour % complete delta per milestone within a date range.
Shows how much each milestone progressed (in MH % terms) during the period.
Example: If Installed was 45% and is now 47.5%, delta is +2.5%.
Feature: 033-timeline-report-filter';


-- ============================================================================
-- FUNCTION 2: get_field_weld_delta_by_dimension (unchanged logic, just cleanup)
-- ============================================================================

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
      fle.welder_id_str
    FROM first_and_last_events fle
    WHERE fle.rn = 1
  ),
  milestone_categorized AS (
    SELECT
      nd.*,
      CASE
        WHEN nd.milestone_name IN ('Fit-Up', 'Fitup Complete') THEN 'fitup'
        WHEN nd.milestone_name IN ('Weld Made', 'Weld Complete') THEN 'weld_complete'
        WHEN nd.milestone_name IN ('Accepted', 'NDE Final') THEN 'accepted'
        ELSE NULL
      END AS milestone_category
    FROM net_deltas nd
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
      COALESCE(SUM(CASE WHEN mc.milestone_category = 'fitup' THEN mc.net_completion ELSE 0 END), 0)::INT AS d_fitup,
      COALESCE(SUM(CASE WHEN mc.milestone_category = 'weld_complete' THEN mc.net_completion ELSE 0 END), 0)::INT AS d_weld_complete,
      COALESCE(SUM(CASE WHEN mc.milestone_category = 'accepted' THEN mc.net_completion ELSE 0 END), 0)::INT AS d_accepted
    FROM milestone_categorized mc
    WHERE mc.milestone_category IS NOT NULL
    GROUP BY dim_id
  ),
  weighted_totals AS (
    SELECT
      da.*,
      CASE
        WHEN da.active_welds > 0 THEN
          ((da.d_fitup * 0.2 + da.d_weld_complete * 0.4 + da.d_accepted * 0.4) / da.active_welds) * 100
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

COMMENT ON FUNCTION get_field_weld_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Calculate field weld progress delta within a date range.
Shows net completions per milestone category.
Feature: 033-timeline-report-filter';
