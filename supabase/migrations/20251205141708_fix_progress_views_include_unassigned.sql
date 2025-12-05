-- Migration: Fix Progress Views - Include Unassigned Components
-- Bug Fix: Component and Manhour progress reports exclude components without metadata assignments
-- Root Cause: Views use LEFT JOIN from metadata tables (areas, systems, test_packages) to components,
--             which excludes components that have NULL metadata foreign keys.
--
-- Solution: Use UNION ALL pattern to combine:
--   1. Components WITH metadata assignments (INNER JOIN)
--   2. Components WITHOUT metadata assignments (shown as "Not Assigned")
--
-- This is the same architectural pattern used in migration 20251120150000_fix_field_weld_views_include_unassigned.sql
--
-- Affected views:
--   Component Progress (Feature 019):
--     - vw_progress_by_area
--     - vw_progress_by_system
--     - vw_progress_by_test_package
--   Manhour Progress (Feature 032):
--     - vw_manhour_progress_by_area
--     - vw_manhour_progress_by_system
--     - vw_manhour_progress_by_test_package

-- ============================================================================
-- VIEW 1: vw_progress_by_area (FIXED with UNION)
-- ============================================================================

DROP VIEW IF EXISTS vw_progress_by_area;

CREATE OR REPLACE VIEW vw_progress_by_area AS

-- Part 1: Components WITH area assignment
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

-- Part 2: Components WITHOUT area assignment (Not Assigned)
SELECT
  NULL AS area_id,
  'Not Assigned' AS area_name,
  c.project_id,
  COUNT(c.id) AS budget,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received'))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed'))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch'))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested'))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored'))::numeric, 0) AS pct_restored,
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total
FROM components c
WHERE NOT c.is_retired
  AND c.area_id IS NULL
GROUP BY c.project_id
HAVING COUNT(c.id) > 0;

COMMENT ON VIEW vw_progress_by_area IS
'Aggregates component progress statistics grouped by Area, including Not Assigned.
Used for generating Area-grouped progress reports in Feature 019.';

GRANT SELECT ON vw_progress_by_area TO authenticated;


-- ============================================================================
-- VIEW 2: vw_progress_by_system (FIXED with UNION)
-- ============================================================================

DROP VIEW IF EXISTS vw_progress_by_system;

CREATE OR REPLACE VIEW vw_progress_by_system AS

-- Part 1: Components WITH system assignment
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

-- Part 2: Components WITHOUT system assignment (Not Assigned)
SELECT
  NULL AS system_id,
  'Not Assigned' AS system_name,
  c.project_id,
  COUNT(c.id) AS budget,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received'))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed'))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch'))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested'))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored'))::numeric, 0) AS pct_restored,
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total
FROM components c
WHERE NOT c.is_retired
  AND c.system_id IS NULL
GROUP BY c.project_id
HAVING COUNT(c.id) > 0;

COMMENT ON VIEW vw_progress_by_system IS
'Aggregates component progress statistics grouped by System, including Not Assigned.
Used for generating System-grouped progress reports in Feature 019.';

GRANT SELECT ON vw_progress_by_system TO authenticated;


-- ============================================================================
-- VIEW 3: vw_progress_by_test_package (FIXED with UNION)
-- ============================================================================

DROP VIEW IF EXISTS vw_progress_by_test_package;

CREATE OR REPLACE VIEW vw_progress_by_test_package AS

-- Part 1: Components WITH test package assignment
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

-- Part 2: Components WITHOUT test package assignment (Not Assigned)
SELECT
  NULL AS test_package_id,
  'Not Assigned' AS test_package_name,
  c.project_id,
  COUNT(c.id) AS budget,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received'))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed'))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch'))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested'))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored'))::numeric, 0) AS pct_restored,
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total
FROM components c
WHERE NOT c.is_retired
  AND c.test_package_id IS NULL
GROUP BY c.project_id
HAVING COUNT(c.id) > 0;

COMMENT ON VIEW vw_progress_by_test_package IS
'Aggregates component progress statistics grouped by Test Package, including Not Assigned.
Used for generating Test Package-grouped progress reports in Feature 019.';

GRANT SELECT ON vw_progress_by_test_package TO authenticated;


-- ============================================================================
-- VIEW 4: vw_manhour_progress_by_area (FIXED with UNION)
-- ============================================================================

DROP VIEW IF EXISTS vw_manhour_progress_by_area;

CREATE OR REPLACE VIEW vw_manhour_progress_by_area AS
WITH component_data AS (
  SELECT
    c.area_id,
    c.project_id,
    c.component_type,
    COALESCE(c.budgeted_manhours, 0) AS mh,
    COALESCE(c.percent_complete, 0) AS pct,
    c.current_milestones,
    -- Inline weight calculations (avoids function call overhead)
    CASE c.component_type
      WHEN 'spool' THEN 0.05
      WHEN 'field_weld' THEN 0.0  -- No receive for field welds
      ELSE 0.10
    END AS receive_w,
    CASE c.component_type
      WHEN 'spool' THEN 0.80  -- Erect + Connect
      WHEN 'field_weld' THEN 0.95  -- Fit-up (30%) + Weld Complete (65%)
      WHEN 'threaded_pipe' THEN 0.80
      ELSE 0.60
    END AS install_w,
    CASE c.component_type
      WHEN 'spool' THEN 0.05
      WHEN 'field_weld' THEN 0.05  -- Accepted
      WHEN 'instrument' THEN 0.10
      ELSE 0.10
    END AS punch_w,
    CASE c.component_type
      WHEN 'spool' THEN 0.05  -- Hydrotest
      WHEN 'field_weld' THEN 0.0  -- No test
      WHEN 'valve' THEN 0.10
      WHEN 'instrument' THEN 0.10
      ELSE 0.0
    END AS test_w,
    CASE c.component_type
      WHEN 'spool' THEN 0.05
      WHEN 'field_weld' THEN 0.0  -- No restore
      WHEN 'support' THEN 0.10  -- Insulate
      ELSE 0.10
    END AS restore_w
  FROM components c
  WHERE NOT c.is_retired
),
with_earned AS (
  SELECT
    cd.*,
    calculate_earned_milestone_value(cd.component_type, cd.current_milestones, 'received') AS receive_pct,
    calculate_earned_milestone_value(cd.component_type, cd.current_milestones, 'installed') AS install_pct,
    calculate_earned_milestone_value(cd.component_type, cd.current_milestones, 'punch') AS punch_pct,
    calculate_earned_milestone_value(cd.component_type, cd.current_milestones, 'tested') AS test_pct,
    calculate_earned_milestone_value(cd.component_type, cd.current_milestones, 'restored') AS restore_pct
  FROM component_data cd
)
-- Part 1: Components WITH area assignment
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.project_id,
  COALESCE(SUM(we.mh), 0) AS mh_budget,
  COALESCE(SUM(we.mh * we.receive_w), 0) AS receive_mh_budget,
  COALESCE(SUM(we.mh * we.receive_w * we.receive_pct / 100.0), 0) AS receive_mh_earned,
  COALESCE(SUM(we.mh * we.install_w), 0) AS install_mh_budget,
  COALESCE(SUM(we.mh * we.install_w * we.install_pct / 100.0), 0) AS install_mh_earned,
  COALESCE(SUM(we.mh * we.punch_w), 0) AS punch_mh_budget,
  COALESCE(SUM(we.mh * we.punch_w * we.punch_pct / 100.0), 0) AS punch_mh_earned,
  COALESCE(SUM(we.mh * we.test_w), 0) AS test_mh_budget,
  COALESCE(SUM(we.mh * we.test_w * we.test_pct / 100.0), 0) AS test_mh_earned,
  COALESCE(SUM(we.mh * we.restore_w), 0) AS restore_mh_budget,
  COALESCE(SUM(we.mh * we.restore_w * we.restore_pct / 100.0), 0) AS restore_mh_earned,
  COALESCE(SUM(we.mh * we.pct / 100.0), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(we.mh), 0) > 0
    THEN ROUND((SUM(we.mh * we.pct / 100.0) / SUM(we.mh) * 100)::numeric, 1)
    ELSE 0
  END AS mh_pct_complete
FROM areas a
INNER JOIN with_earned we ON we.area_id = a.id
GROUP BY a.id, a.name, a.project_id

UNION ALL

-- Part 2: Components WITHOUT area assignment (Not Assigned)
SELECT
  NULL AS area_id,
  'Not Assigned' AS area_name,
  we.project_id,
  COALESCE(SUM(we.mh), 0) AS mh_budget,
  COALESCE(SUM(we.mh * we.receive_w), 0) AS receive_mh_budget,
  COALESCE(SUM(we.mh * we.receive_w * we.receive_pct / 100.0), 0) AS receive_mh_earned,
  COALESCE(SUM(we.mh * we.install_w), 0) AS install_mh_budget,
  COALESCE(SUM(we.mh * we.install_w * we.install_pct / 100.0), 0) AS install_mh_earned,
  COALESCE(SUM(we.mh * we.punch_w), 0) AS punch_mh_budget,
  COALESCE(SUM(we.mh * we.punch_w * we.punch_pct / 100.0), 0) AS punch_mh_earned,
  COALESCE(SUM(we.mh * we.test_w), 0) AS test_mh_budget,
  COALESCE(SUM(we.mh * we.test_w * we.test_pct / 100.0), 0) AS test_mh_earned,
  COALESCE(SUM(we.mh * we.restore_w), 0) AS restore_mh_budget,
  COALESCE(SUM(we.mh * we.restore_w * we.restore_pct / 100.0), 0) AS restore_mh_earned,
  COALESCE(SUM(we.mh * we.pct / 100.0), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(we.mh), 0) > 0
    THEN ROUND((SUM(we.mh * we.pct / 100.0) / SUM(we.mh) * 100)::numeric, 1)
    ELSE 0
  END AS mh_pct_complete
FROM with_earned we
WHERE we.area_id IS NULL
GROUP BY we.project_id
HAVING COUNT(*) > 0;

GRANT SELECT ON vw_manhour_progress_by_area TO authenticated;


-- ============================================================================
-- VIEW 5: vw_manhour_progress_by_system (FIXED with UNION)
-- ============================================================================

DROP VIEW IF EXISTS vw_manhour_progress_by_system;

CREATE OR REPLACE VIEW vw_manhour_progress_by_system AS
WITH component_data AS (
  SELECT
    c.system_id,
    c.project_id,
    c.component_type,
    COALESCE(c.budgeted_manhours, 0) AS mh,
    COALESCE(c.percent_complete, 0) AS pct,
    c.current_milestones,
    CASE c.component_type
      WHEN 'spool' THEN 0.05
      WHEN 'field_weld' THEN 0.0
      ELSE 0.10
    END AS receive_w,
    CASE c.component_type
      WHEN 'spool' THEN 0.80
      WHEN 'field_weld' THEN 0.95
      WHEN 'threaded_pipe' THEN 0.80
      ELSE 0.60
    END AS install_w,
    CASE c.component_type
      WHEN 'spool' THEN 0.05
      WHEN 'field_weld' THEN 0.05
      WHEN 'instrument' THEN 0.10
      ELSE 0.10
    END AS punch_w,
    CASE c.component_type
      WHEN 'spool' THEN 0.05
      WHEN 'field_weld' THEN 0.0
      WHEN 'valve' THEN 0.10
      WHEN 'instrument' THEN 0.10
      ELSE 0.0
    END AS test_w,
    CASE c.component_type
      WHEN 'spool' THEN 0.05
      WHEN 'field_weld' THEN 0.0
      WHEN 'support' THEN 0.10
      ELSE 0.10
    END AS restore_w
  FROM components c
  WHERE NOT c.is_retired
),
with_earned AS (
  SELECT
    cd.*,
    calculate_earned_milestone_value(cd.component_type, cd.current_milestones, 'received') AS receive_pct,
    calculate_earned_milestone_value(cd.component_type, cd.current_milestones, 'installed') AS install_pct,
    calculate_earned_milestone_value(cd.component_type, cd.current_milestones, 'punch') AS punch_pct,
    calculate_earned_milestone_value(cd.component_type, cd.current_milestones, 'tested') AS test_pct,
    calculate_earned_milestone_value(cd.component_type, cd.current_milestones, 'restored') AS restore_pct
  FROM component_data cd
)
-- Part 1: Components WITH system assignment
SELECT
  s.id AS system_id,
  s.name AS system_name,
  s.project_id,
  COALESCE(SUM(we.mh), 0) AS mh_budget,
  COALESCE(SUM(we.mh * we.receive_w), 0) AS receive_mh_budget,
  COALESCE(SUM(we.mh * we.receive_w * we.receive_pct / 100.0), 0) AS receive_mh_earned,
  COALESCE(SUM(we.mh * we.install_w), 0) AS install_mh_budget,
  COALESCE(SUM(we.mh * we.install_w * we.install_pct / 100.0), 0) AS install_mh_earned,
  COALESCE(SUM(we.mh * we.punch_w), 0) AS punch_mh_budget,
  COALESCE(SUM(we.mh * we.punch_w * we.punch_pct / 100.0), 0) AS punch_mh_earned,
  COALESCE(SUM(we.mh * we.test_w), 0) AS test_mh_budget,
  COALESCE(SUM(we.mh * we.test_w * we.test_pct / 100.0), 0) AS test_mh_earned,
  COALESCE(SUM(we.mh * we.restore_w), 0) AS restore_mh_budget,
  COALESCE(SUM(we.mh * we.restore_w * we.restore_pct / 100.0), 0) AS restore_mh_earned,
  COALESCE(SUM(we.mh * we.pct / 100.0), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(we.mh), 0) > 0
    THEN ROUND((SUM(we.mh * we.pct / 100.0) / SUM(we.mh) * 100)::numeric, 1)
    ELSE 0
  END AS mh_pct_complete
FROM systems s
INNER JOIN with_earned we ON we.system_id = s.id
GROUP BY s.id, s.name, s.project_id

UNION ALL

-- Part 2: Components WITHOUT system assignment (Not Assigned)
SELECT
  NULL AS system_id,
  'Not Assigned' AS system_name,
  we.project_id,
  COALESCE(SUM(we.mh), 0) AS mh_budget,
  COALESCE(SUM(we.mh * we.receive_w), 0) AS receive_mh_budget,
  COALESCE(SUM(we.mh * we.receive_w * we.receive_pct / 100.0), 0) AS receive_mh_earned,
  COALESCE(SUM(we.mh * we.install_w), 0) AS install_mh_budget,
  COALESCE(SUM(we.mh * we.install_w * we.install_pct / 100.0), 0) AS install_mh_earned,
  COALESCE(SUM(we.mh * we.punch_w), 0) AS punch_mh_budget,
  COALESCE(SUM(we.mh * we.punch_w * we.punch_pct / 100.0), 0) AS punch_mh_earned,
  COALESCE(SUM(we.mh * we.test_w), 0) AS test_mh_budget,
  COALESCE(SUM(we.mh * we.test_w * we.test_pct / 100.0), 0) AS test_mh_earned,
  COALESCE(SUM(we.mh * we.restore_w), 0) AS restore_mh_budget,
  COALESCE(SUM(we.mh * we.restore_w * we.restore_pct / 100.0), 0) AS restore_mh_earned,
  COALESCE(SUM(we.mh * we.pct / 100.0), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(we.mh), 0) > 0
    THEN ROUND((SUM(we.mh * we.pct / 100.0) / SUM(we.mh) * 100)::numeric, 1)
    ELSE 0
  END AS mh_pct_complete
FROM with_earned we
WHERE we.system_id IS NULL
GROUP BY we.project_id
HAVING COUNT(*) > 0;

GRANT SELECT ON vw_manhour_progress_by_system TO authenticated;


-- ============================================================================
-- VIEW 6: vw_manhour_progress_by_test_package (FIXED with UNION)
-- ============================================================================

DROP VIEW IF EXISTS vw_manhour_progress_by_test_package;

CREATE OR REPLACE VIEW vw_manhour_progress_by_test_package AS
WITH component_data AS (
  SELECT
    c.test_package_id,
    c.project_id,
    c.component_type,
    COALESCE(c.budgeted_manhours, 0) AS mh,
    COALESCE(c.percent_complete, 0) AS pct,
    c.current_milestones,
    CASE c.component_type
      WHEN 'spool' THEN 0.05
      WHEN 'field_weld' THEN 0.0
      ELSE 0.10
    END AS receive_w,
    CASE c.component_type
      WHEN 'spool' THEN 0.80
      WHEN 'field_weld' THEN 0.95
      WHEN 'threaded_pipe' THEN 0.80
      ELSE 0.60
    END AS install_w,
    CASE c.component_type
      WHEN 'spool' THEN 0.05
      WHEN 'field_weld' THEN 0.05
      WHEN 'instrument' THEN 0.10
      ELSE 0.10
    END AS punch_w,
    CASE c.component_type
      WHEN 'spool' THEN 0.05
      WHEN 'field_weld' THEN 0.0
      WHEN 'valve' THEN 0.10
      WHEN 'instrument' THEN 0.10
      ELSE 0.0
    END AS test_w,
    CASE c.component_type
      WHEN 'spool' THEN 0.05
      WHEN 'field_weld' THEN 0.0
      WHEN 'support' THEN 0.10
      ELSE 0.10
    END AS restore_w
  FROM components c
  WHERE NOT c.is_retired
),
with_earned AS (
  SELECT
    cd.*,
    calculate_earned_milestone_value(cd.component_type, cd.current_milestones, 'received') AS receive_pct,
    calculate_earned_milestone_value(cd.component_type, cd.current_milestones, 'installed') AS install_pct,
    calculate_earned_milestone_value(cd.component_type, cd.current_milestones, 'punch') AS punch_pct,
    calculate_earned_milestone_value(cd.component_type, cd.current_milestones, 'tested') AS test_pct,
    calculate_earned_milestone_value(cd.component_type, cd.current_milestones, 'restored') AS restore_pct
  FROM component_data cd
)
-- Part 1: Components WITH test package assignment
SELECT
  tp.id AS test_package_id,
  tp.name AS test_package_name,
  tp.project_id,
  COALESCE(SUM(we.mh), 0) AS mh_budget,
  COALESCE(SUM(we.mh * we.receive_w), 0) AS receive_mh_budget,
  COALESCE(SUM(we.mh * we.receive_w * we.receive_pct / 100.0), 0) AS receive_mh_earned,
  COALESCE(SUM(we.mh * we.install_w), 0) AS install_mh_budget,
  COALESCE(SUM(we.mh * we.install_w * we.install_pct / 100.0), 0) AS install_mh_earned,
  COALESCE(SUM(we.mh * we.punch_w), 0) AS punch_mh_budget,
  COALESCE(SUM(we.mh * we.punch_w * we.punch_pct / 100.0), 0) AS punch_mh_earned,
  COALESCE(SUM(we.mh * we.test_w), 0) AS test_mh_budget,
  COALESCE(SUM(we.mh * we.test_w * we.test_pct / 100.0), 0) AS test_mh_earned,
  COALESCE(SUM(we.mh * we.restore_w), 0) AS restore_mh_budget,
  COALESCE(SUM(we.mh * we.restore_w * we.restore_pct / 100.0), 0) AS restore_mh_earned,
  COALESCE(SUM(we.mh * we.pct / 100.0), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(we.mh), 0) > 0
    THEN ROUND((SUM(we.mh * we.pct / 100.0) / SUM(we.mh) * 100)::numeric, 1)
    ELSE 0
  END AS mh_pct_complete
FROM test_packages tp
INNER JOIN with_earned we ON we.test_package_id = tp.id
GROUP BY tp.id, tp.name, tp.project_id

UNION ALL

-- Part 2: Components WITHOUT test package assignment (Not Assigned)
SELECT
  NULL AS test_package_id,
  'Not Assigned' AS test_package_name,
  we.project_id,
  COALESCE(SUM(we.mh), 0) AS mh_budget,
  COALESCE(SUM(we.mh * we.receive_w), 0) AS receive_mh_budget,
  COALESCE(SUM(we.mh * we.receive_w * we.receive_pct / 100.0), 0) AS receive_mh_earned,
  COALESCE(SUM(we.mh * we.install_w), 0) AS install_mh_budget,
  COALESCE(SUM(we.mh * we.install_w * we.install_pct / 100.0), 0) AS install_mh_earned,
  COALESCE(SUM(we.mh * we.punch_w), 0) AS punch_mh_budget,
  COALESCE(SUM(we.mh * we.punch_w * we.punch_pct / 100.0), 0) AS punch_mh_earned,
  COALESCE(SUM(we.mh * we.test_w), 0) AS test_mh_budget,
  COALESCE(SUM(we.mh * we.test_w * we.test_pct / 100.0), 0) AS test_mh_earned,
  COALESCE(SUM(we.mh * we.restore_w), 0) AS restore_mh_budget,
  COALESCE(SUM(we.mh * we.restore_w * we.restore_pct / 100.0), 0) AS restore_mh_earned,
  COALESCE(SUM(we.mh * we.pct / 100.0), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(we.mh), 0) > 0
    THEN ROUND((SUM(we.mh * we.pct / 100.0) / SUM(we.mh) * 100)::numeric, 1)
    ELSE 0
  END AS mh_pct_complete
FROM with_earned we
WHERE we.test_package_id IS NULL
GROUP BY we.project_id
HAVING COUNT(*) > 0;

GRANT SELECT ON vw_manhour_progress_by_test_package TO authenticated;


-- ============================================================================
-- MIGRATION COMPLETE: 20251205141708_fix_progress_views_include_unassigned.sql
-- ============================================================================
-- Views updated: 6 (3 component progress + 3 manhour progress)
-- Bug fixed: Components with NULL metadata assignments now appear as "Not Assigned"
-- Pattern: UNION ALL combines assigned (INNER JOIN) + unassigned (NULL metadata) components
-- ============================================================================
