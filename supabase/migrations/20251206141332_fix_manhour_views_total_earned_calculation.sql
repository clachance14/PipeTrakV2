-- Migration: Fix Manhour Views - Total Earned Calculation
-- Bug Fix: total_mh_earned was calculated using c.percent_complete (stored on component)
--          instead of the sum of category earned values.
--
-- BEFORE (BUG):
--   total_mh_earned = SUM(mh * percent_complete / 100)
--   This uses the component's stored percent_complete, which is a different calculation
--
-- AFTER (FIXED):
--   total_mh_earned = receive_mh_earned + install_mh_earned + punch_mh_earned + test_mh_earned + restore_mh_earned
--   This correctly sums the category earned values
--
-- IMPACT:
--   - All Time manhour reports now have mathematically consistent totals
--   - Sum of category earned = total earned (as expected)
--   - Delta reports can now correctly compare against All Time
--
-- Affected views:
--   - vw_manhour_progress_by_area
--   - vw_manhour_progress_by_system
--   - vw_manhour_progress_by_test_package

-- ============================================================================
-- VIEW 1: vw_manhour_progress_by_area (FIXED total_mh_earned)
-- ============================================================================

DROP VIEW IF EXISTS vw_manhour_progress_by_area;

CREATE OR REPLACE VIEW vw_manhour_progress_by_area AS
WITH component_data AS (
  SELECT
    c.area_id,
    c.project_id,
    c.component_type,
    COALESCE(c.budgeted_manhours, 0) AS mh,
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
),
with_category_earned AS (
  SELECT
    we.*,
    -- Calculate category earned values
    we.mh * we.receive_w * we.receive_pct / 100.0 AS receive_earned,
    we.mh * we.install_w * we.install_pct / 100.0 AS install_earned,
    we.mh * we.punch_w * we.punch_pct / 100.0 AS punch_earned,
    we.mh * we.test_w * we.test_pct / 100.0 AS test_earned,
    we.mh * we.restore_w * we.restore_pct / 100.0 AS restore_earned
  FROM with_earned we
)
-- Part 1: Components WITH area assignment
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.project_id,
  COALESCE(SUM(ce.mh), 0) AS mh_budget,
  COALESCE(SUM(ce.mh * ce.receive_w), 0) AS receive_mh_budget,
  COALESCE(SUM(ce.receive_earned), 0) AS receive_mh_earned,
  COALESCE(SUM(ce.mh * ce.install_w), 0) AS install_mh_budget,
  COALESCE(SUM(ce.install_earned), 0) AS install_mh_earned,
  COALESCE(SUM(ce.mh * ce.punch_w), 0) AS punch_mh_budget,
  COALESCE(SUM(ce.punch_earned), 0) AS punch_mh_earned,
  COALESCE(SUM(ce.mh * ce.test_w), 0) AS test_mh_budget,
  COALESCE(SUM(ce.test_earned), 0) AS test_mh_earned,
  COALESCE(SUM(ce.mh * ce.restore_w), 0) AS restore_mh_budget,
  COALESCE(SUM(ce.restore_earned), 0) AS restore_mh_earned,
  -- FIXED: total_mh_earned is now the sum of category earned values
  COALESCE(SUM(ce.receive_earned + ce.install_earned + ce.punch_earned + ce.test_earned + ce.restore_earned), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(ce.mh), 0) > 0
    THEN ROUND((SUM(ce.receive_earned + ce.install_earned + ce.punch_earned + ce.test_earned + ce.restore_earned) / SUM(ce.mh) * 100)::numeric, 1)
    ELSE 0
  END AS mh_pct_complete
FROM areas a
INNER JOIN with_category_earned ce ON ce.area_id = a.id
GROUP BY a.id, a.name, a.project_id

UNION ALL

-- Part 2: Components WITHOUT area assignment (Not Assigned)
SELECT
  NULL AS area_id,
  'Not Assigned' AS area_name,
  ce.project_id,
  COALESCE(SUM(ce.mh), 0) AS mh_budget,
  COALESCE(SUM(ce.mh * ce.receive_w), 0) AS receive_mh_budget,
  COALESCE(SUM(ce.receive_earned), 0) AS receive_mh_earned,
  COALESCE(SUM(ce.mh * ce.install_w), 0) AS install_mh_budget,
  COALESCE(SUM(ce.install_earned), 0) AS install_mh_earned,
  COALESCE(SUM(ce.mh * ce.punch_w), 0) AS punch_mh_budget,
  COALESCE(SUM(ce.punch_earned), 0) AS punch_mh_earned,
  COALESCE(SUM(ce.mh * ce.test_w), 0) AS test_mh_budget,
  COALESCE(SUM(ce.test_earned), 0) AS test_mh_earned,
  COALESCE(SUM(ce.mh * ce.restore_w), 0) AS restore_mh_budget,
  COALESCE(SUM(ce.restore_earned), 0) AS restore_mh_earned,
  -- FIXED: total_mh_earned is now the sum of category earned values
  COALESCE(SUM(ce.receive_earned + ce.install_earned + ce.punch_earned + ce.test_earned + ce.restore_earned), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(ce.mh), 0) > 0
    THEN ROUND((SUM(ce.receive_earned + ce.install_earned + ce.punch_earned + ce.test_earned + ce.restore_earned) / SUM(ce.mh) * 100)::numeric, 1)
    ELSE 0
  END AS mh_pct_complete
FROM with_category_earned ce
WHERE ce.area_id IS NULL
GROUP BY ce.project_id
HAVING COUNT(*) > 0;

GRANT SELECT ON vw_manhour_progress_by_area TO authenticated;


-- ============================================================================
-- VIEW 2: vw_manhour_progress_by_system (FIXED total_mh_earned)
-- ============================================================================

DROP VIEW IF EXISTS vw_manhour_progress_by_system;

CREATE OR REPLACE VIEW vw_manhour_progress_by_system AS
WITH component_data AS (
  SELECT
    c.system_id,
    c.project_id,
    c.component_type,
    COALESCE(c.budgeted_manhours, 0) AS mh,
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
),
with_category_earned AS (
  SELECT
    we.*,
    we.mh * we.receive_w * we.receive_pct / 100.0 AS receive_earned,
    we.mh * we.install_w * we.install_pct / 100.0 AS install_earned,
    we.mh * we.punch_w * we.punch_pct / 100.0 AS punch_earned,
    we.mh * we.test_w * we.test_pct / 100.0 AS test_earned,
    we.mh * we.restore_w * we.restore_pct / 100.0 AS restore_earned
  FROM with_earned we
)
-- Part 1: Components WITH system assignment
SELECT
  s.id AS system_id,
  s.name AS system_name,
  s.project_id,
  COALESCE(SUM(ce.mh), 0) AS mh_budget,
  COALESCE(SUM(ce.mh * ce.receive_w), 0) AS receive_mh_budget,
  COALESCE(SUM(ce.receive_earned), 0) AS receive_mh_earned,
  COALESCE(SUM(ce.mh * ce.install_w), 0) AS install_mh_budget,
  COALESCE(SUM(ce.install_earned), 0) AS install_mh_earned,
  COALESCE(SUM(ce.mh * ce.punch_w), 0) AS punch_mh_budget,
  COALESCE(SUM(ce.punch_earned), 0) AS punch_mh_earned,
  COALESCE(SUM(ce.mh * ce.test_w), 0) AS test_mh_budget,
  COALESCE(SUM(ce.test_earned), 0) AS test_mh_earned,
  COALESCE(SUM(ce.mh * ce.restore_w), 0) AS restore_mh_budget,
  COALESCE(SUM(ce.restore_earned), 0) AS restore_mh_earned,
  -- FIXED: total_mh_earned is now the sum of category earned values
  COALESCE(SUM(ce.receive_earned + ce.install_earned + ce.punch_earned + ce.test_earned + ce.restore_earned), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(ce.mh), 0) > 0
    THEN ROUND((SUM(ce.receive_earned + ce.install_earned + ce.punch_earned + ce.test_earned + ce.restore_earned) / SUM(ce.mh) * 100)::numeric, 1)
    ELSE 0
  END AS mh_pct_complete
FROM systems s
INNER JOIN with_category_earned ce ON ce.system_id = s.id
GROUP BY s.id, s.name, s.project_id

UNION ALL

-- Part 2: Components WITHOUT system assignment (Not Assigned)
SELECT
  NULL AS system_id,
  'Not Assigned' AS system_name,
  ce.project_id,
  COALESCE(SUM(ce.mh), 0) AS mh_budget,
  COALESCE(SUM(ce.mh * ce.receive_w), 0) AS receive_mh_budget,
  COALESCE(SUM(ce.receive_earned), 0) AS receive_mh_earned,
  COALESCE(SUM(ce.mh * ce.install_w), 0) AS install_mh_budget,
  COALESCE(SUM(ce.install_earned), 0) AS install_mh_earned,
  COALESCE(SUM(ce.mh * ce.punch_w), 0) AS punch_mh_budget,
  COALESCE(SUM(ce.punch_earned), 0) AS punch_mh_earned,
  COALESCE(SUM(ce.mh * ce.test_w), 0) AS test_mh_budget,
  COALESCE(SUM(ce.test_earned), 0) AS test_mh_earned,
  COALESCE(SUM(ce.mh * ce.restore_w), 0) AS restore_mh_budget,
  COALESCE(SUM(ce.restore_earned), 0) AS restore_mh_earned,
  -- FIXED: total_mh_earned is now the sum of category earned values
  COALESCE(SUM(ce.receive_earned + ce.install_earned + ce.punch_earned + ce.test_earned + ce.restore_earned), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(ce.mh), 0) > 0
    THEN ROUND((SUM(ce.receive_earned + ce.install_earned + ce.punch_earned + ce.test_earned + ce.restore_earned) / SUM(ce.mh) * 100)::numeric, 1)
    ELSE 0
  END AS mh_pct_complete
FROM with_category_earned ce
WHERE ce.system_id IS NULL
GROUP BY ce.project_id
HAVING COUNT(*) > 0;

GRANT SELECT ON vw_manhour_progress_by_system TO authenticated;


-- ============================================================================
-- VIEW 3: vw_manhour_progress_by_test_package (FIXED total_mh_earned)
-- ============================================================================

DROP VIEW IF EXISTS vw_manhour_progress_by_test_package;

CREATE OR REPLACE VIEW vw_manhour_progress_by_test_package AS
WITH component_data AS (
  SELECT
    c.test_package_id,
    c.project_id,
    c.component_type,
    COALESCE(c.budgeted_manhours, 0) AS mh,
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
),
with_category_earned AS (
  SELECT
    we.*,
    we.mh * we.receive_w * we.receive_pct / 100.0 AS receive_earned,
    we.mh * we.install_w * we.install_pct / 100.0 AS install_earned,
    we.mh * we.punch_w * we.punch_pct / 100.0 AS punch_earned,
    we.mh * we.test_w * we.test_pct / 100.0 AS test_earned,
    we.mh * we.restore_w * we.restore_pct / 100.0 AS restore_earned
  FROM with_earned we
)
-- Part 1: Components WITH test package assignment
SELECT
  tp.id AS test_package_id,
  tp.name AS test_package_name,
  tp.project_id,
  COALESCE(SUM(ce.mh), 0) AS mh_budget,
  COALESCE(SUM(ce.mh * ce.receive_w), 0) AS receive_mh_budget,
  COALESCE(SUM(ce.receive_earned), 0) AS receive_mh_earned,
  COALESCE(SUM(ce.mh * ce.install_w), 0) AS install_mh_budget,
  COALESCE(SUM(ce.install_earned), 0) AS install_mh_earned,
  COALESCE(SUM(ce.mh * ce.punch_w), 0) AS punch_mh_budget,
  COALESCE(SUM(ce.punch_earned), 0) AS punch_mh_earned,
  COALESCE(SUM(ce.mh * ce.test_w), 0) AS test_mh_budget,
  COALESCE(SUM(ce.test_earned), 0) AS test_mh_earned,
  COALESCE(SUM(ce.mh * ce.restore_w), 0) AS restore_mh_budget,
  COALESCE(SUM(ce.restore_earned), 0) AS restore_mh_earned,
  -- FIXED: total_mh_earned is now the sum of category earned values
  COALESCE(SUM(ce.receive_earned + ce.install_earned + ce.punch_earned + ce.test_earned + ce.restore_earned), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(ce.mh), 0) > 0
    THEN ROUND((SUM(ce.receive_earned + ce.install_earned + ce.punch_earned + ce.test_earned + ce.restore_earned) / SUM(ce.mh) * 100)::numeric, 1)
    ELSE 0
  END AS mh_pct_complete
FROM test_packages tp
INNER JOIN with_category_earned ce ON ce.test_package_id = tp.id
GROUP BY tp.id, tp.name, tp.project_id

UNION ALL

-- Part 2: Components WITHOUT test package assignment (Not Assigned)
SELECT
  NULL AS test_package_id,
  'Not Assigned' AS test_package_name,
  ce.project_id,
  COALESCE(SUM(ce.mh), 0) AS mh_budget,
  COALESCE(SUM(ce.mh * ce.receive_w), 0) AS receive_mh_budget,
  COALESCE(SUM(ce.receive_earned), 0) AS receive_mh_earned,
  COALESCE(SUM(ce.mh * ce.install_w), 0) AS install_mh_budget,
  COALESCE(SUM(ce.install_earned), 0) AS install_mh_earned,
  COALESCE(SUM(ce.mh * ce.punch_w), 0) AS punch_mh_budget,
  COALESCE(SUM(ce.punch_earned), 0) AS punch_mh_earned,
  COALESCE(SUM(ce.mh * ce.test_w), 0) AS test_mh_budget,
  COALESCE(SUM(ce.test_earned), 0) AS test_mh_earned,
  COALESCE(SUM(ce.mh * ce.restore_w), 0) AS restore_mh_budget,
  COALESCE(SUM(ce.restore_earned), 0) AS restore_mh_earned,
  -- FIXED: total_mh_earned is now the sum of category earned values
  COALESCE(SUM(ce.receive_earned + ce.install_earned + ce.punch_earned + ce.test_earned + ce.restore_earned), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(ce.mh), 0) > 0
    THEN ROUND((SUM(ce.receive_earned + ce.install_earned + ce.punch_earned + ce.test_earned + ce.restore_earned) / SUM(ce.mh) * 100)::numeric, 1)
    ELSE 0
  END AS mh_pct_complete
FROM with_category_earned ce
WHERE ce.test_package_id IS NULL
GROUP BY ce.project_id
HAVING COUNT(*) > 0;

GRANT SELECT ON vw_manhour_progress_by_test_package TO authenticated;


-- ============================================================================
-- MIGRATION COMPLETE: 20251206141332_fix_manhour_views_total_earned_calculation.sql
-- ============================================================================
-- Views updated: 3 (vw_manhour_progress_by_area, _by_system, _by_test_package)
-- Bug fixed: total_mh_earned now = sum of category earned values
-- Before: used c.percent_complete (stored on component, different calculation)
-- After: uses receive_earned + install_earned + punch_earned + test_earned + restore_earned
-- ============================================================================
