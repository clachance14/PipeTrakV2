-- Migration: Inline weight calculations in manhour views
-- 
-- Issue: get_milestone_weight() function calls are too slow even with CTE optimization
-- Solution: Inline weight logic using CASE statements for fixed weights (fallback values)
--           For most projects without custom templates, use hardcoded default weights
--
-- Default weights (from progress_templates):
-- Spool:       Receive=5%, Erect=40%, Connect=40%, Punch=5%, Hydrotest=5%, Restore=5%
-- Field Weld:  Fit-up=30%, Weld Complete=65%, Accepted=5% (no receive/test/restore)
-- Others:      Receive=10%, Install=60%, Test Complete=10%, Test=10%, Restore=10%

-- Drop old views
DROP VIEW IF EXISTS vw_manhour_progress_by_area;
DROP VIEW IF EXISTS vw_manhour_progress_by_system;
DROP VIEW IF EXISTS vw_manhour_progress_by_test_package;

-- ============================================================================
-- View 1: vw_manhour_progress_by_area (Inline weights)
-- ============================================================================

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
LEFT JOIN with_earned we ON we.area_id = a.id
GROUP BY a.id, a.name, a.project_id;

GRANT SELECT ON vw_manhour_progress_by_area TO authenticated;


-- ============================================================================
-- View 2: vw_manhour_progress_by_system (Inline weights)
-- ============================================================================

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
LEFT JOIN with_earned we ON we.system_id = s.id
GROUP BY s.id, s.name, s.project_id;

GRANT SELECT ON vw_manhour_progress_by_system TO authenticated;


-- ============================================================================
-- View 3: vw_manhour_progress_by_test_package (Inline weights)
-- ============================================================================

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
LEFT JOIN with_earned we ON we.test_package_id = tp.id
GROUP BY tp.id, tp.name, tp.project_id;

GRANT SELECT ON vw_manhour_progress_by_test_package TO authenticated;

-- Note: This uses default weights. For projects with custom templates,
-- a future enhancement could check project_progress_templates and apply overrides.
