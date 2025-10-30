-- Migration 00059: Progress by System View
-- Feature: Weekly Progress Reports (019)
-- Purpose: Aggregate component progress by System for report generation

-- This view calculates progress statistics for each system in a project:
-- - Budget: Count of non-retired components in the system
-- - Standardized milestone percentages (Received, Installed, Punch, Tested, Restored)
-- - Overall completion percentage
--
-- Used by useProgressReport hook when grouping dimension is 'system'

CREATE OR REPLACE VIEW vw_progress_by_system AS
SELECT
  s.id AS system_id,
  s.name AS system_name,
  s.project_id,
  COUNT(c.id) AS budget,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received'))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed'))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch'))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested'))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored'))::numeric, 0) AS pct_restored,
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total
FROM systems s
LEFT JOIN components c ON c.system_id = s.id AND NOT c.is_retired
GROUP BY s.id, s.name, s.project_id;

-- Add comment for documentation
COMMENT ON VIEW vw_progress_by_system IS
'Aggregates component progress statistics grouped by System.
Used for generating System-grouped progress reports in Feature 019.';

-- Grant access to authenticated users (RLS enforced via project_id check in query)
GRANT SELECT ON vw_progress_by_system TO authenticated;
