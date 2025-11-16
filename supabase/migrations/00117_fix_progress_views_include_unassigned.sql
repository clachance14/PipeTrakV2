-- Migration 00117: Fix Progress Views to Include Unassigned Components
-- Bug Fix: Reports showing "No Components Found" when components exist but lack metadata assignment
--
-- Root Cause: Views use LEFT JOIN from metadata tables, showing empty metadata rows
-- but missing components with NULL foreign keys (area_id, system_id, test_package_id)
--
-- Solution: Use UNION to combine:
--   1. Components assigned to metadata (INNER JOIN)
--   2. Unassigned components (NULL foreign key) as "Unassigned" row
--
-- Affected views:
--   - vw_progress_by_area
--   - vw_progress_by_system
--   - vw_progress_by_test_package

-- ============================================================================
-- VIEW 1: Progress by Area (FIXED)
-- ============================================================================

CREATE OR REPLACE VIEW vw_progress_by_area AS
-- Assigned components grouped by area
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
INNER JOIN components c ON c.area_id = a.id AND NOT c.is_retired
GROUP BY a.id, a.name, a.project_id

UNION ALL

-- Unassigned components (area_id IS NULL)
SELECT
  NULL AS area_id,
  'Unassigned' AS area_name,
  c.project_id,
  COUNT(c.id) AS budget,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received'))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed'))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch'))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested'))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored'))::numeric, 0) AS pct_restored,
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total
FROM components c
WHERE c.area_id IS NULL AND NOT c.is_retired
GROUP BY c.project_id
HAVING COUNT(c.id) > 0;  -- Only include if unassigned components exist

COMMENT ON VIEW vw_progress_by_area IS
'Aggregates component progress statistics grouped by Area.
Includes "Unassigned" row for components without area assignment.
Used for generating Area-grouped progress reports in Feature 019.';

-- ============================================================================
-- VIEW 2: Progress by System (FIXED)
-- ============================================================================

CREATE OR REPLACE VIEW vw_progress_by_system AS
-- Assigned components grouped by system
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
INNER JOIN components c ON c.system_id = s.id AND NOT c.is_retired
GROUP BY s.id, s.name, s.project_id

UNION ALL

-- Unassigned components (system_id IS NULL)
SELECT
  NULL AS system_id,
  'Unassigned' AS system_name,
  c.project_id,
  COUNT(c.id) AS budget,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received'))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed'))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch'))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested'))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored'))::numeric, 0) AS pct_restored,
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total
FROM components c
WHERE c.system_id IS NULL AND NOT c.is_retired
GROUP BY c.project_id
HAVING COUNT(c.id) > 0;  -- Only include if unassigned components exist

COMMENT ON VIEW vw_progress_by_system IS
'Aggregates component progress statistics grouped by System.
Includes "Unassigned" row for components without system assignment.
Used for generating System-grouped progress reports in Feature 019.';

-- ============================================================================
-- VIEW 3: Progress by Test Package (FIXED)
-- ============================================================================

CREATE OR REPLACE VIEW vw_progress_by_test_package AS
-- Assigned components grouped by test package
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
INNER JOIN components c ON c.test_package_id = tp.id AND NOT c.is_retired
GROUP BY tp.id, tp.name, tp.project_id

UNION ALL

-- Unassigned components (test_package_id IS NULL)
SELECT
  NULL AS test_package_id,
  'Unassigned' AS test_package_name,
  c.project_id,
  COUNT(c.id) AS budget,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received'))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed'))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch'))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested'))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored'))::numeric, 0) AS pct_restored,
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total
FROM components c
WHERE c.test_package_id IS NULL AND NOT c.is_retired
GROUP BY c.project_id
HAVING COUNT(c.id) > 0;  -- Only include if unassigned components exist

COMMENT ON VIEW vw_progress_by_test_package IS
'Aggregates component progress statistics grouped by Test Package.
Includes "Unassigned" row for components without test package assignment.
Used for generating Test Package-grouped progress reports in Feature 019.';

-- Grant access (existing grants still apply)
GRANT SELECT ON vw_progress_by_area TO authenticated;
GRANT SELECT ON vw_progress_by_system TO authenticated;
GRANT SELECT ON vw_progress_by_test_package TO authenticated;
