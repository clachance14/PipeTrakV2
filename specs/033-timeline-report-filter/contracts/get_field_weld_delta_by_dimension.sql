-- RPC Contract: get_field_weld_delta_by_dimension
-- Feature: 033-timeline-report-filter
-- Purpose: Calculate field weld progress delta within a date range, grouped by dimension

-- FUNCTION SIGNATURE
CREATE OR REPLACE FUNCTION get_field_weld_delta_by_dimension(
  p_project_id UUID,
  p_dimension TEXT,      -- 'area', 'system', 'test_package', 'welder'
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS TABLE (
  dimension_id UUID,
  dimension_name TEXT,
  stencil TEXT,                     -- Welder stencil (welder dimension only, NULL otherwise)
  welds_with_activity INT,

  -- Count-based deltas (percentage points)
  delta_fitup_count INT,
  delta_weld_complete_count INT,
  delta_accepted_count INT,
  delta_pct_total NUMERIC
) AS $$
  -- Implementation in migration file
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PARAMETERS
-- p_project_id: Required. Project UUID to filter components.
-- p_dimension: Required. One of 'area', 'system', 'test_package', 'welder'.
-- p_start_date: Required. Inclusive start of date range (TIMESTAMPTZ).
-- p_end_date: Required. Exclusive end of date range (TIMESTAMPTZ).

-- RETURNS
-- dimension_id: UUID of the area/system/test_package/welder
-- dimension_name: Display name of the dimension (welder name for welder dimension)
-- stencil: Welder stencil number (only populated for welder dimension)
-- welds_with_activity: Count of field welds that had milestone events in range
-- delta_fitup_count: Change in number of welds with fitup complete
-- delta_weld_complete_count: Change in number of welds with weld complete
-- delta_accepted_count: Change in number of welds accepted
-- delta_pct_total: Weighted percentage total change

-- BEHAVIOR
-- 1. Queries milestone_events WHERE created_at >= p_start_date AND created_at < p_end_date
-- 2. Joins to components table, filters component_type = 'field_weld'
-- 3. Excludes is_retired = true
-- 4. For welder dimension, joins to welders table via assigned_welder_id
-- 5. Calculates delta as count of transitions (0->100 = +1, 100->0 = -1)
-- 6. Milestone mapping: fitup_complete -> fitup, weld_complete -> weld, accepted -> accepted
-- 7. Groups results by dimension
-- 8. Returns ALL dimensions (including those with zero activity) - filtering done in hook

-- SECURITY
-- SECURITY DEFINER with explicit project_id filter
-- RLS on milestone_events and components ensures tenant isolation

-- EXAMPLE CALL
-- SELECT * FROM get_field_weld_delta_by_dimension(
--   '123e4567-e89b-12d3-a456-426614174000',
--   'welder',
--   '2025-11-28T00:00:00Z',
--   '2025-12-05T00:00:00Z'
-- );
