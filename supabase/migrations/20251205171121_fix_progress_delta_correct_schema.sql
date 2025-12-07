-- Migration: Fix progress delta using correct schema
-- Feature: 033-timeline-report-filter
--
-- The components table stores:
-- - current_milestones (JSONB) - current milestone states
-- - percent_complete (NUMERIC) - current overall % complete
--
-- The milestone_events table stores:
-- - component_id, milestone_name, value, previous_value, created_at
--
-- Strategy: Calculate current % for each dimension, then calculate what it was at period start
-- by subtracting the changes that happened during the period.

-- ============================================================================
-- FUNCTION: get_progress_delta_by_dimension (FIXED - uses correct schema)
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

  -- % complete deltas per milestone category
  delta_received NUMERIC,
  delta_installed NUMERIC,
  delta_punch NUMERIC,
  delta_tested NUMERIC,
  delta_restored NUMERIC,
  delta_total NUMERIC,

  -- Raw MH values (for compatibility - using component counts as proxy)
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
  WITH dimension_current AS (
    -- Get current progress for each dimension (from existing views)
    SELECT
      CASE p_dimension
        WHEN 'area' THEN c.area_id
        WHEN 'system' THEN c.system_id
        WHEN 'test_package' THEN c.test_package_id
      END AS dim_id,
      COUNT(c.id)::INT AS component_count,
      -- Current milestone percentages (using the standard calculation)
      AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received')) AS curr_received,
      AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed')) AS curr_installed,
      AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch')) AS curr_punch,
      AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested')) AS curr_tested,
      AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored')) AS curr_restored,
      AVG(c.percent_complete) AS curr_total
    FROM components c
    WHERE c.project_id = p_project_id
      AND c.is_retired = false
      AND c.component_type != 'field_weld'
      AND CASE p_dimension
        WHEN 'area' THEN c.area_id IS NOT NULL
        WHEN 'system' THEN c.system_id IS NOT NULL
        WHEN 'test_package' THEN c.test_package_id IS NOT NULL
      END
    GROUP BY dim_id
  ),
  period_changes AS (
    -- Calculate the sum of all milestone changes during the period for each dimension
    -- This represents the progress GAINED during the period
    SELECT
      CASE p_dimension
        WHEN 'area' THEN c.area_id
        WHEN 'system' THEN c.system_id
        WHEN 'test_package' THEN c.test_package_id
      END AS dim_id,
      COUNT(DISTINCT me.component_id)::INT AS active_components,
      -- Sum of positive changes per milestone category
      COALESCE(SUM(CASE
        WHEN me.milestone_name IN ('Receive', 'Fit-Up')
        THEN GREATEST((COALESCE(me.value, 0) - COALESCE(me.previous_value, 0)), 0)
        ELSE 0
      END), 0) AS change_received,
      COALESCE(SUM(CASE
        WHEN me.milestone_name IN ('Install', 'Erect', 'Connect', 'Weld Made', 'Fabricate', 'Support')
        THEN GREATEST((COALESCE(me.value, 0) - COALESCE(me.previous_value, 0)), 0)
        ELSE 0
      END), 0) AS change_installed,
      COALESCE(SUM(CASE
        WHEN me.milestone_name IN ('Punch Complete', 'Repair Complete', 'Test Complete')
        THEN GREATEST((COALESCE(me.value, 0) - COALESCE(me.previous_value, 0)), 0)
        ELSE 0
      END), 0) AS change_punch,
      COALESCE(SUM(CASE
        WHEN me.milestone_name IN ('Test', 'Hydrotest', 'NDE Final')
        THEN GREATEST((COALESCE(me.value, 0) - COALESCE(me.previous_value, 0)), 0)
        ELSE 0
      END), 0) AS change_tested,
      COALESCE(SUM(CASE
        WHEN me.milestone_name IN ('Restore', 'Insulate', 'Paint')
        THEN GREATEST((COALESCE(me.value, 0) - COALESCE(me.previous_value, 0)), 0)
        ELSE 0
      END), 0) AS change_restored,
      -- Total percent_complete change
      COALESCE(SUM(GREATEST((COALESCE(me.value, 0) - COALESCE(me.previous_value, 0)), 0)), 0) AS change_total
    FROM milestone_events me
    JOIN components c ON c.id = me.component_id
    WHERE c.project_id = p_project_id
      AND c.is_retired = false
      AND c.component_type != 'field_weld'
      AND me.created_at >= p_start_date
      AND me.created_at < p_end_date
    GROUP BY dim_id
  ),
  delta_results AS (
    -- Calculate delta percentages
    -- Delta = (change in period) / (number of active components) * weighting factor
    SELECT
      dc.dim_id,
      COALESCE(pc.active_components, 0) AS components_with_activity,
      dc.component_count,
      -- Per-milestone delta as % of total components
      -- Using simplified calculation: average change per active component
      CASE WHEN COALESCE(pc.active_components, 0) > 0 THEN
        ROUND((pc.change_received / pc.active_components), 2)
      ELSE 0 END AS delta_received,
      CASE WHEN COALESCE(pc.active_components, 0) > 0 THEN
        ROUND((pc.change_installed / pc.active_components), 2)
      ELSE 0 END AS delta_installed,
      CASE WHEN COALESCE(pc.active_components, 0) > 0 THEN
        ROUND((pc.change_punch / pc.active_components), 2)
      ELSE 0 END AS delta_punch,
      CASE WHEN COALESCE(pc.active_components, 0) > 0 THEN
        ROUND((pc.change_tested / pc.active_components), 2)
      ELSE 0 END AS delta_tested,
      CASE WHEN COALESCE(pc.active_components, 0) > 0 THEN
        ROUND((pc.change_restored / pc.active_components), 2)
      ELSE 0 END AS delta_restored,
      -- Total delta as average percent_complete change
      CASE WHEN COALESCE(pc.active_components, 0) > 0 THEN
        ROUND((pc.change_total / pc.active_components), 2)
      ELSE 0 END AS delta_total
    FROM dimension_current dc
    LEFT JOIN period_changes pc ON pc.dim_id = dc.dim_id
    WHERE pc.active_components > 0  -- Only show dimensions with activity
  )
  -- Final output with dimension names
  SELECT
    dr.dim_id AS dimension_id,
    CASE p_dimension
      WHEN 'area' THEN a.name
      WHEN 'system' THEN s.name
      WHEN 'test_package' THEN tp.name
    END AS dimension_name,
    dr.components_with_activity,
    dr.delta_received,
    dr.delta_installed,
    dr.delta_punch,
    dr.delta_tested,
    dr.delta_restored,
    dr.delta_total,
    -- MH columns (using component count as proxy for budget)
    dr.component_count::NUMERIC AS mh_budget,
    dr.delta_received AS delta_receive_mh_earned,
    dr.delta_installed AS delta_install_mh_earned,
    dr.delta_punch AS delta_punch_mh_earned,
    dr.delta_tested AS delta_test_mh_earned,
    dr.delta_restored AS delta_restore_mh_earned,
    dr.delta_total AS delta_total_mh_earned,
    dr.delta_total AS delta_mh_pct_complete
  FROM delta_results dr
  LEFT JOIN areas a ON p_dimension = 'area' AND a.id = dr.dim_id
  LEFT JOIN systems s ON p_dimension = 'system' AND s.id = dr.dim_id
  LEFT JOIN test_packages tp ON p_dimension = 'test_package' AND tp.id = dr.dim_id
  WHERE dr.dim_id IS NOT NULL
  ORDER BY dimension_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_progress_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Calculate progress delta per milestone within a date range.
Shows average progress change per active component for each milestone category.
Feature: 033-timeline-report-filter';


-- ============================================================================
-- FUNCTION 2: get_field_weld_delta_by_dimension (keep existing - no changes needed)
-- ============================================================================
-- The field weld function is unchanged since it uses milestone_events correctly
