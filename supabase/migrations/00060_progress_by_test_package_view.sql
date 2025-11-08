-- Migration 00060: Progress by Test Package View
-- Feature: Weekly Progress Reports (019)
-- Purpose: Aggregate component progress by Test Package for report generation

-- This view calculates progress statistics for each test package in a project:
-- - Budget: Count of non-retired components in the test package
-- - Standardized milestone percentages (Received, Installed, Punch, Tested, Restored)
-- - Overall completion percentage
--
-- Used by useProgressReport hook when grouping dimension is 'test_package'

CREATE OR REPLACE VIEW vw_progress_by_test_package AS
SELECT
  tp.id AS test_package_id,
  tp.name AS test_package_name,
  tp.project_id,
  COUNT(c.id) AS budget,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received'))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed'))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch'))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested'))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored'))::numeric, 0) AS pct_restored,
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total
FROM test_packages tp
LEFT JOIN components c ON c.test_package_id = tp.id AND NOT c.is_retired
GROUP BY tp.id, tp.name, tp.project_id;

-- Add comment for documentation
COMMENT ON VIEW vw_progress_by_test_package IS
'Aggregates component progress statistics grouped by Test Package.
Used for generating Test Package-grouped progress reports in Feature 019.';

-- Grant access to authenticated users (RLS enforced via project_id check in query)
GRANT SELECT ON vw_progress_by_test_package TO authenticated;
