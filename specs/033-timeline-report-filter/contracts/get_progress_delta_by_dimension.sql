-- RPC Contract: get_progress_delta_by_dimension
-- Feature: 033-timeline-report-filter
-- Purpose: Calculate component progress delta within a date range, grouped by dimension

-- FUNCTION SIGNATURE
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
  -- Implementation in migration file
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PARAMETERS
-- p_project_id: Required. Project UUID to filter components.
-- p_dimension: Required. One of 'area', 'system', 'test_package'.
-- p_start_date: Required. Inclusive start of date range (TIMESTAMPTZ).
-- p_end_date: Required. Exclusive end of date range (TIMESTAMPTZ).

-- RETURNS
-- dimension_id: UUID of the area/system/test_package
-- dimension_name: Display name of the dimension
-- components_with_activity: Count of components that had milestone events in range
-- delta_*: Percentage point change for each milestone (positive = progress, negative = rollback)
-- mh_budget: Total manhour budget for components with activity
-- delta_*_mh_earned: Manhour earned change for each milestone
-- delta_mh_pct_complete: (delta_total_mh_earned / mh_budget) * 100

-- BEHAVIOR
-- 1. Queries milestone_events WHERE created_at >= p_start_date AND created_at < p_end_date
-- 2. Joins to components table, excludes is_retired = true
-- 3. Excludes field_weld component_type (handled by separate RPC)
-- 4. Calculates delta as SUM(value - previous_value) for each milestone
-- 5. Applies milestone weights from get_milestone_weight() for weighted totals
-- 6. Groups results by dimension
-- 7. Returns ALL dimensions (including those with zero activity) - filtering done in hook

-- SECURITY
-- SECURITY DEFINER with explicit project_id filter
-- RLS on milestone_events and components ensures tenant isolation

-- EXAMPLE CALL
-- SELECT * FROM get_progress_delta_by_dimension(
--   '123e4567-e89b-12d3-a456-426614174000',
--   'area',
--   '2025-11-28T00:00:00Z',
--   '2025-12-05T00:00:00Z'
-- );
