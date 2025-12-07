-- Migration: Fix progress delta to calculate NET change per component
-- Feature: 033-timeline-report-filter
-- Issue: When a component has multiple events in the period, they were being summed
--        causing values > 100%. Should calculate net change (end value - start value).
--
-- Change: Instead of summing individual event deltas, calculate:
--         (last value in period) - (value before first event in period)
--         Then clamp to [0, 100] range and ensure non-negative

-- ============================================================================
-- FUNCTION 1: get_progress_delta_by_dimension (FIXED)
-- Purpose: Calculate component progress NET delta grouped by area/system/test_package
-- Change: Calculate net change per component/milestone, not sum of events
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

  -- Count-based deltas (percentage points)
  delta_received NUMERIC,
  delta_installed NUMERIC,
  delta_punch NUMERIC,
  delta_tested NUMERIC,
  delta_restored NUMERIC,
  delta_total NUMERIC,

  -- Manhour-based deltas
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
  WITH first_and_last_events AS (
    -- For each component/milestone, find the first and last event in the period
    -- to calculate NET change (not sum of all events)
    SELECT
      me.component_id,
      me.milestone_name,
      -- First event's previous_value = value before period started
      FIRST_VALUE(COALESCE(me.previous_value, 0)) OVER (
        PARTITION BY me.component_id, me.milestone_name
        ORDER BY me.created_at ASC
      ) AS value_before_period,
      -- Last event's value = value at end of period
      LAST_VALUE(COALESCE(me.value, 0)) OVER (
        PARTITION BY me.component_id, me.milestone_name
        ORDER BY me.created_at ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
      ) AS value_at_end,
      c.area_id,
      c.system_id,
      c.test_package_id,
      c.component_type,
      COALESCE(c.budgeted_manhours, 0) AS budgeted_manhours,
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
      AND c.component_type != 'field_weld'
  ),
  net_deltas AS (
    -- Calculate net delta per component/milestone (only keep first row per group)
    -- Net delta = (end value - start value), clamped to non-negative
    SELECT
      fle.component_id,
      fle.milestone_name,
      -- Net change, but never negative (rollbacks don't count as negative progress)
      GREATEST(fle.value_at_end - fle.value_before_period, 0) AS net_delta,
      fle.area_id,
      fle.system_id,
      fle.test_package_id,
      fle.component_type,
      fle.budgeted_manhours
    FROM first_and_last_events fle
    WHERE fle.rn = 1  -- Only keep one row per component/milestone
  ),
  milestone_categorized AS (
    -- Categorize milestones into standard categories
    SELECT
      nd.*,
      CASE
        WHEN nd.milestone_name IN ('Receive') THEN 'receive'
        WHEN nd.milestone_name IN ('Install', 'Erect', 'Connect', 'Fabricate', 'Support') THEN 'install'
        WHEN nd.milestone_name IN ('Punch Complete') THEN 'punch'
        WHEN nd.milestone_name IN ('Test', 'Hydrotest') THEN 'test'
        WHEN nd.milestone_name IN ('Restore', 'Insulate') THEN 'restore'
        ELSE NULL
      END AS standard_milestone
    FROM net_deltas nd
  ),
  dimension_aggregates AS (
    -- Aggregate by dimension
    SELECT
      CASE p_dimension
        WHEN 'area' THEN mc.area_id
        WHEN 'system' THEN mc.system_id
        WHEN 'test_package' THEN mc.test_package_id
      END AS dim_id,
      COUNT(DISTINCT mc.component_id)::INT AS active_components,

      -- Count-based deltas (average percentage point change per component)
      COALESCE(SUM(CASE WHEN mc.standard_milestone = 'receive' THEN mc.net_delta ELSE 0 END) /
               NULLIF(COUNT(DISTINCT mc.component_id), 0), 0) AS d_received,
      COALESCE(SUM(CASE WHEN mc.standard_milestone = 'install' THEN mc.net_delta ELSE 0 END) /
               NULLIF(COUNT(DISTINCT mc.component_id), 0), 0) AS d_installed,
      COALESCE(SUM(CASE WHEN mc.standard_milestone = 'punch' THEN mc.net_delta ELSE 0 END) /
               NULLIF(COUNT(DISTINCT mc.component_id), 0), 0) AS d_punch,
      COALESCE(SUM(CASE WHEN mc.standard_milestone = 'test' THEN mc.net_delta ELSE 0 END) /
               NULLIF(COUNT(DISTINCT mc.component_id), 0), 0) AS d_tested,
      COALESCE(SUM(CASE WHEN mc.standard_milestone = 'restore' THEN mc.net_delta ELSE 0 END) /
               NULLIF(COUNT(DISTINCT mc.component_id), 0), 0) AS d_restored,

      -- Total manhour budget for active components
      SUM(DISTINCT mc.budgeted_manhours) AS total_mh_budget,

      -- Manhour-based deltas (raw manhour values)
      COALESCE(SUM(CASE WHEN mc.standard_milestone = 'receive' THEN
                     mc.net_delta * mc.budgeted_manhours *
                     get_milestone_weight(p_project_id, mc.component_type, 'receive') / 100
                   ELSE 0 END), 0) AS d_receive_mh,
      COALESCE(SUM(CASE WHEN mc.standard_milestone = 'install' THEN
                     mc.net_delta * mc.budgeted_manhours *
                     get_milestone_weight(p_project_id, mc.component_type, 'install') / 100
                   ELSE 0 END), 0) AS d_install_mh,
      COALESCE(SUM(CASE WHEN mc.standard_milestone = 'punch' THEN
                     mc.net_delta * mc.budgeted_manhours *
                     get_milestone_weight(p_project_id, mc.component_type, 'punch') / 100
                   ELSE 0 END), 0) AS d_punch_mh,
      COALESCE(SUM(CASE WHEN mc.standard_milestone = 'test' THEN
                     mc.net_delta * mc.budgeted_manhours *
                     get_milestone_weight(p_project_id, mc.component_type, 'test') / 100
                   ELSE 0 END), 0) AS d_test_mh,
      COALESCE(SUM(CASE WHEN mc.standard_milestone = 'restore' THEN
                     mc.net_delta * mc.budgeted_manhours *
                     get_milestone_weight(p_project_id, mc.component_type, 'restore') / 100
                   ELSE 0 END), 0) AS d_restore_mh

    FROM milestone_categorized mc
    WHERE mc.standard_milestone IS NOT NULL
    GROUP BY dim_id
  ),
  weighted_totals AS (
    -- Calculate weighted total delta and MH percent complete
    SELECT
      da.*,
      -- Weighted total using project-specific weights (average across components)
      (da.d_received * 0.1 + da.d_installed * 0.4 + da.d_punch * 0.15 +
       da.d_tested * 0.25 + da.d_restored * 0.1) AS d_total,
      -- Total MH earned
      (da.d_receive_mh + da.d_install_mh + da.d_punch_mh + da.d_test_mh + da.d_restore_mh) AS d_total_mh,
      -- MH percent complete delta
      CASE
        WHEN da.total_mh_budget > 0 THEN
          ((da.d_receive_mh + da.d_install_mh + da.d_punch_mh + da.d_test_mh + da.d_restore_mh) /
           da.total_mh_budget) * 100
        ELSE 0
      END AS d_mh_pct
    FROM dimension_aggregates da
  )
  -- Join with dimension tables to get names
  SELECT
    wt.dim_id AS dimension_id,
    CASE p_dimension
      WHEN 'area' THEN a.name
      WHEN 'system' THEN s.name
      WHEN 'test_package' THEN tp.name
    END AS dimension_name,
    wt.active_components AS components_with_activity,
    ROUND(wt.d_received, 2) AS delta_received,
    ROUND(wt.d_installed, 2) AS delta_installed,
    ROUND(wt.d_punch, 2) AS delta_punch,
    ROUND(wt.d_tested, 2) AS delta_tested,
    ROUND(wt.d_restored, 2) AS delta_restored,
    ROUND(wt.d_total, 2) AS delta_total,
    ROUND(wt.total_mh_budget, 2) AS mh_budget,
    ROUND(wt.d_receive_mh, 2) AS delta_receive_mh_earned,
    ROUND(wt.d_install_mh, 2) AS delta_install_mh_earned,
    ROUND(wt.d_punch_mh, 2) AS delta_punch_mh_earned,
    ROUND(wt.d_test_mh, 2) AS delta_test_mh_earned,
    ROUND(wt.d_restore_mh, 2) AS delta_restore_mh_earned,
    ROUND(wt.d_total_mh, 2) AS delta_total_mh_earned,
    ROUND(wt.d_mh_pct, 2) AS delta_mh_pct_complete
  FROM weighted_totals wt
  LEFT JOIN areas a ON p_dimension = 'area' AND a.id = wt.dim_id
  LEFT JOIN systems s ON p_dimension = 'system' AND s.id = wt.dim_id
  LEFT JOIN test_packages tp ON p_dimension = 'test_package' AND tp.id = wt.dim_id
  WHERE wt.dim_id IS NOT NULL
  ORDER BY dimension_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_progress_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Calculate component progress NET delta within a date range, grouped by area/system/test_package.
Returns both count-based percentage deltas and manhour-based deltas.
Calculates net change (end - start) per component, not sum of individual events.
Values are clamped to non-negative (rollbacks filtered out).
Feature: 033-timeline-report-filter';


-- ============================================================================
-- FUNCTION 2: get_field_weld_delta_by_dimension (FIXED)
-- Purpose: Calculate field weld progress NET delta grouped by area/system/test_package/welder
-- Change: Calculate net change per weld/milestone, not sum of events
-- ============================================================================

CREATE OR REPLACE FUNCTION get_field_weld_delta_by_dimension(
  p_project_id UUID,
  p_dimension TEXT,      -- 'area', 'system', 'test_package', 'welder'
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS TABLE (
  dimension_id UUID,
  dimension_name TEXT,
  stencil TEXT,
  welds_with_activity INT,

  -- Count-based deltas
  delta_fitup_count INT,
  delta_weld_complete_count INT,
  delta_accepted_count INT,
  delta_pct_total NUMERIC
) AS $$
BEGIN
  -- Validate dimension parameter
  IF p_dimension NOT IN ('area', 'system', 'test_package', 'welder') THEN
    RAISE EXCEPTION 'Invalid dimension: %. Must be area, system, test_package, or welder', p_dimension;
  END IF;

  RETURN QUERY
  WITH first_and_last_events AS (
    -- For each weld/milestone, find the first and last event in the period
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
    -- Calculate net delta per weld/milestone
    -- For field welds: 0 -> 100 = completed (+1), 100 -> 0 = rolled back (0, not -1)
    SELECT
      fle.component_id,
      fle.milestone_name,
      -- Net completion count: 1 if went from incomplete to complete, 0 otherwise
      CASE
        WHEN fle.value_at_end > fle.value_before_period THEN 1
        ELSE 0
      END AS net_completion,
      fle.area_id,
      fle.system_id,
      fle.test_package_id,
      fle.welder_id_str
    FROM first_and_last_events fle
    WHERE fle.rn = 1
  ),
  milestone_categorized AS (
    -- Categorize field weld milestones
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
    -- Aggregate by dimension
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
    -- Calculate weighted total delta
    SELECT
      da.*,
      CASE
        WHEN da.active_welds > 0 THEN
          ((da.d_fitup * 0.2 + da.d_weld_complete * 0.4 + da.d_accepted * 0.4) / da.active_welds) * 100
        ELSE 0
      END AS d_pct_total
    FROM dimension_aggregates da
  )
  -- Join with dimension tables to get names and stencils
  SELECT
    wt.dim_id AS dimension_id,
    CASE p_dimension
      WHEN 'area' THEN a.name
      WHEN 'system' THEN s.name
      WHEN 'test_package' THEN tp.name
      WHEN 'welder' THEN w.name
    END AS dimension_name,
    CASE p_dimension
      WHEN 'welder' THEN w.stencil
      ELSE NULL
    END AS stencil,
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
'Calculate field weld progress NET delta within a date range, grouped by area/system/test_package/welder.
Returns count-based deltas for Fitup, Weld Complete, and Accepted milestones.
Calculates net change (end - start) per weld, not sum of individual events.
Feature: 033-timeline-report-filter';
