-- Migration: Optimize manhour progress views for performance
-- 
-- Issue: get_milestone_weight() called per-row causes N+1 query explosion and timeouts
-- Solution: Pre-compute weights per project/component_type in a CTE to avoid repeated lookups

-- Drop old views first
DROP VIEW IF EXISTS vw_manhour_progress_by_area;
DROP VIEW IF EXISTS vw_manhour_progress_by_system;
DROP VIEW IF EXISTS vw_manhour_progress_by_test_package;

-- ============================================================================
-- View 1: vw_manhour_progress_by_area (Optimized)
-- ============================================================================

CREATE OR REPLACE VIEW vw_manhour_progress_by_area AS
WITH project_weights AS (
  -- Pre-compute weights for all project/component_type combinations
  SELECT DISTINCT
    c.project_id,
    c.component_type,
    get_milestone_weight(c.project_id, c.component_type, 'receive') AS receive_weight,
    get_milestone_weight(c.project_id, c.component_type, 'install') AS install_weight,
    get_milestone_weight(c.project_id, c.component_type, 'punch') AS punch_weight,
    get_milestone_weight(c.project_id, c.component_type, 'test') AS test_weight,
    get_milestone_weight(c.project_id, c.component_type, 'restore') AS restore_weight
  FROM components c
  WHERE NOT c.is_retired
),
component_manhours AS (
  SELECT
    c.area_id,
    c.project_id,
    COALESCE(c.budgeted_manhours, 0) AS mh,
    COALESCE(c.percent_complete, 0) AS pct,
    COALESCE(pw.receive_weight, 0) AS receive_w,
    COALESCE(pw.install_weight, 0) AS install_w,
    COALESCE(pw.punch_weight, 0) AS punch_w,
    COALESCE(pw.test_weight, 0) AS test_w,
    COALESCE(pw.restore_weight, 0) AS restore_w,
    calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received') AS receive_earned_pct,
    calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed') AS install_earned_pct,
    calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch') AS punch_earned_pct,
    calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested') AS test_earned_pct,
    calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored') AS restore_earned_pct
  FROM components c
  LEFT JOIN project_weights pw ON pw.project_id = c.project_id AND pw.component_type = c.component_type
  WHERE NOT c.is_retired
)
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.project_id,
  COALESCE(SUM(cm.mh), 0) AS mh_budget,
  COALESCE(SUM(cm.mh * cm.receive_w), 0) AS receive_mh_budget,
  COALESCE(SUM(cm.mh * cm.receive_w * cm.receive_earned_pct / 100.0), 0) AS receive_mh_earned,
  COALESCE(SUM(cm.mh * cm.install_w), 0) AS install_mh_budget,
  COALESCE(SUM(cm.mh * cm.install_w * cm.install_earned_pct / 100.0), 0) AS install_mh_earned,
  COALESCE(SUM(cm.mh * cm.punch_w), 0) AS punch_mh_budget,
  COALESCE(SUM(cm.mh * cm.punch_w * cm.punch_earned_pct / 100.0), 0) AS punch_mh_earned,
  COALESCE(SUM(cm.mh * cm.test_w), 0) AS test_mh_budget,
  COALESCE(SUM(cm.mh * cm.test_w * cm.test_earned_pct / 100.0), 0) AS test_mh_earned,
  COALESCE(SUM(cm.mh * cm.restore_w), 0) AS restore_mh_budget,
  COALESCE(SUM(cm.mh * cm.restore_w * cm.restore_earned_pct / 100.0), 0) AS restore_mh_earned,
  COALESCE(SUM(cm.mh * cm.pct / 100.0), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(cm.mh), 0) > 0
    THEN ROUND((SUM(cm.mh * cm.pct / 100.0) / SUM(cm.mh) * 100)::numeric, 1)
    ELSE 0
  END AS mh_pct_complete
FROM areas a
LEFT JOIN component_manhours cm ON cm.area_id = a.id
GROUP BY a.id, a.name, a.project_id;

COMMENT ON VIEW vw_manhour_progress_by_area IS
'Aggregates manhour budget and earned values by Area for Component Progress Reports.';

GRANT SELECT ON vw_manhour_progress_by_area TO authenticated;


-- ============================================================================
-- View 2: vw_manhour_progress_by_system (Optimized)
-- ============================================================================

CREATE OR REPLACE VIEW vw_manhour_progress_by_system AS
WITH project_weights AS (
  SELECT DISTINCT
    c.project_id,
    c.component_type,
    get_milestone_weight(c.project_id, c.component_type, 'receive') AS receive_weight,
    get_milestone_weight(c.project_id, c.component_type, 'install') AS install_weight,
    get_milestone_weight(c.project_id, c.component_type, 'punch') AS punch_weight,
    get_milestone_weight(c.project_id, c.component_type, 'test') AS test_weight,
    get_milestone_weight(c.project_id, c.component_type, 'restore') AS restore_weight
  FROM components c
  WHERE NOT c.is_retired
),
component_manhours AS (
  SELECT
    c.system_id,
    c.project_id,
    COALESCE(c.budgeted_manhours, 0) AS mh,
    COALESCE(c.percent_complete, 0) AS pct,
    COALESCE(pw.receive_weight, 0) AS receive_w,
    COALESCE(pw.install_weight, 0) AS install_w,
    COALESCE(pw.punch_weight, 0) AS punch_w,
    COALESCE(pw.test_weight, 0) AS test_w,
    COALESCE(pw.restore_weight, 0) AS restore_w,
    calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received') AS receive_earned_pct,
    calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed') AS install_earned_pct,
    calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch') AS punch_earned_pct,
    calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested') AS test_earned_pct,
    calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored') AS restore_earned_pct
  FROM components c
  LEFT JOIN project_weights pw ON pw.project_id = c.project_id AND pw.component_type = c.component_type
  WHERE NOT c.is_retired
)
SELECT
  s.id AS system_id,
  s.name AS system_name,
  s.project_id,
  COALESCE(SUM(cm.mh), 0) AS mh_budget,
  COALESCE(SUM(cm.mh * cm.receive_w), 0) AS receive_mh_budget,
  COALESCE(SUM(cm.mh * cm.receive_w * cm.receive_earned_pct / 100.0), 0) AS receive_mh_earned,
  COALESCE(SUM(cm.mh * cm.install_w), 0) AS install_mh_budget,
  COALESCE(SUM(cm.mh * cm.install_w * cm.install_earned_pct / 100.0), 0) AS install_mh_earned,
  COALESCE(SUM(cm.mh * cm.punch_w), 0) AS punch_mh_budget,
  COALESCE(SUM(cm.mh * cm.punch_w * cm.punch_earned_pct / 100.0), 0) AS punch_mh_earned,
  COALESCE(SUM(cm.mh * cm.test_w), 0) AS test_mh_budget,
  COALESCE(SUM(cm.mh * cm.test_w * cm.test_earned_pct / 100.0), 0) AS test_mh_earned,
  COALESCE(SUM(cm.mh * cm.restore_w), 0) AS restore_mh_budget,
  COALESCE(SUM(cm.mh * cm.restore_w * cm.restore_earned_pct / 100.0), 0) AS restore_mh_earned,
  COALESCE(SUM(cm.mh * cm.pct / 100.0), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(cm.mh), 0) > 0
    THEN ROUND((SUM(cm.mh * cm.pct / 100.0) / SUM(cm.mh) * 100)::numeric, 1)
    ELSE 0
  END AS mh_pct_complete
FROM systems s
LEFT JOIN component_manhours cm ON cm.system_id = s.id
GROUP BY s.id, s.name, s.project_id;

COMMENT ON VIEW vw_manhour_progress_by_system IS
'Aggregates manhour budget and earned values by System for Component Progress Reports.';

GRANT SELECT ON vw_manhour_progress_by_system TO authenticated;


-- ============================================================================
-- View 3: vw_manhour_progress_by_test_package (Optimized)
-- ============================================================================

CREATE OR REPLACE VIEW vw_manhour_progress_by_test_package AS
WITH project_weights AS (
  SELECT DISTINCT
    c.project_id,
    c.component_type,
    get_milestone_weight(c.project_id, c.component_type, 'receive') AS receive_weight,
    get_milestone_weight(c.project_id, c.component_type, 'install') AS install_weight,
    get_milestone_weight(c.project_id, c.component_type, 'punch') AS punch_weight,
    get_milestone_weight(c.project_id, c.component_type, 'test') AS test_weight,
    get_milestone_weight(c.project_id, c.component_type, 'restore') AS restore_weight
  FROM components c
  WHERE NOT c.is_retired
),
component_manhours AS (
  SELECT
    c.test_package_id,
    c.project_id,
    COALESCE(c.budgeted_manhours, 0) AS mh,
    COALESCE(c.percent_complete, 0) AS pct,
    COALESCE(pw.receive_weight, 0) AS receive_w,
    COALESCE(pw.install_weight, 0) AS install_w,
    COALESCE(pw.punch_weight, 0) AS punch_w,
    COALESCE(pw.test_weight, 0) AS test_w,
    COALESCE(pw.restore_weight, 0) AS restore_w,
    calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received') AS receive_earned_pct,
    calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed') AS install_earned_pct,
    calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch') AS punch_earned_pct,
    calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested') AS test_earned_pct,
    calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored') AS restore_earned_pct
  FROM components c
  LEFT JOIN project_weights pw ON pw.project_id = c.project_id AND pw.component_type = c.component_type
  WHERE NOT c.is_retired
)
SELECT
  tp.id AS test_package_id,
  tp.name AS test_package_name,
  tp.project_id,
  COALESCE(SUM(cm.mh), 0) AS mh_budget,
  COALESCE(SUM(cm.mh * cm.receive_w), 0) AS receive_mh_budget,
  COALESCE(SUM(cm.mh * cm.receive_w * cm.receive_earned_pct / 100.0), 0) AS receive_mh_earned,
  COALESCE(SUM(cm.mh * cm.install_w), 0) AS install_mh_budget,
  COALESCE(SUM(cm.mh * cm.install_w * cm.install_earned_pct / 100.0), 0) AS install_mh_earned,
  COALESCE(SUM(cm.mh * cm.punch_w), 0) AS punch_mh_budget,
  COALESCE(SUM(cm.mh * cm.punch_w * cm.punch_earned_pct / 100.0), 0) AS punch_mh_earned,
  COALESCE(SUM(cm.mh * cm.test_w), 0) AS test_mh_budget,
  COALESCE(SUM(cm.mh * cm.test_w * cm.test_earned_pct / 100.0), 0) AS test_mh_earned,
  COALESCE(SUM(cm.mh * cm.restore_w), 0) AS restore_mh_budget,
  COALESCE(SUM(cm.mh * cm.restore_w * cm.restore_earned_pct / 100.0), 0) AS restore_mh_earned,
  COALESCE(SUM(cm.mh * cm.pct / 100.0), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(cm.mh), 0) > 0
    THEN ROUND((SUM(cm.mh * cm.pct / 100.0) / SUM(cm.mh) * 100)::numeric, 1)
    ELSE 0
  END AS mh_pct_complete
FROM test_packages tp
LEFT JOIN component_manhours cm ON cm.test_package_id = tp.id
GROUP BY tp.id, tp.name, tp.project_id;

COMMENT ON VIEW vw_manhour_progress_by_test_package IS
'Aggregates manhour budget and earned values by Test Package for Component Progress Reports.';

GRANT SELECT ON vw_manhour_progress_by_test_package TO authenticated;
