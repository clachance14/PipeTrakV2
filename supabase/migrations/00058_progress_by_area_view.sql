-- Migration 00058: Progress by Area View
-- Feature: Weekly Progress Reports (019)
-- Purpose: Aggregate component progress by Area for report generation

-- This view calculates progress statistics for each area in a project:
-- - Budget: Count of non-retired components in the area
-- - Standardized milestone percentages (Received, Installed, Punch, Tested, Restored)
-- - Overall completion percentage
--
-- Used by useProgressReport hook when grouping dimension is 'area'

CREATE OR REPLACE VIEW vw_progress_by_area AS
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.project_id,
  COUNT(c.id) AS budget,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received'))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed'))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch'))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested'))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored'))::numeric, 0) AS pct_restored,
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total
FROM areas a
LEFT JOIN components c ON c.area_id = a.id AND NOT c.is_retired
GROUP BY a.id, a.name, a.project_id;

-- Add comment for documentation
COMMENT ON VIEW vw_progress_by_area IS
'Aggregates component progress statistics grouped by Area.
Used for generating Area-grouped progress reports in Feature 019.';

-- Grant access to authenticated users (RLS enforced via project_id check in query)
GRANT SELECT ON vw_progress_by_area TO authenticated;
