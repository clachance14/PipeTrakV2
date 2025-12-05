-- Migration: Create manhour progress views for reports
-- Feature: 032-manhour-earned-value (Reports integration)
-- Purpose: Aggregate manhour budget and earned values by Area, System, and Test Package
--
-- These views provide data for the Manhour View toggle in Component Progress Reports

-- ============================================================================
-- View 1: vw_manhour_progress_by_area
-- ============================================================================

CREATE OR REPLACE VIEW vw_manhour_progress_by_area AS
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.project_id,

  -- Total MH Budget
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0)), 0) AS mh_budget,

  -- Receive: MH Budget and Earned
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'receive')), 0) AS receive_mh_budget,
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'receive')
      * calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received') / 100.0), 0) AS receive_mh_earned,

  -- Install: MH Budget and Earned
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'install')), 0) AS install_mh_budget,
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'install')
      * calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed') / 100.0), 0) AS install_mh_earned,

  -- Punch: MH Budget and Earned
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'punch')), 0) AS punch_mh_budget,
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'punch')
      * calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch') / 100.0), 0) AS punch_mh_earned,

  -- Test: MH Budget and Earned
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'test')), 0) AS test_mh_budget,
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'test')
      * calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested') / 100.0), 0) AS test_mh_earned,

  -- Restore: MH Budget and Earned
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'restore')), 0) AS restore_mh_budget,
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'restore')
      * calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored') / 100.0), 0) AS restore_mh_earned,

  -- Total MH Earned (using overall percent_complete)
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * COALESCE(c.percent_complete, 0) / 100.0), 0) AS total_mh_earned,

  -- Overall % Complete (manhour-weighted)
  CASE WHEN COALESCE(SUM(COALESCE(c.budgeted_manhours, 0)), 0) > 0
    THEN ROUND((SUM(COALESCE(c.budgeted_manhours, 0) * COALESCE(c.percent_complete, 0) / 100.0) /
                SUM(COALESCE(c.budgeted_manhours, 0)) * 100)::numeric, 1)
    ELSE 0
  END AS mh_pct_complete

FROM areas a
LEFT JOIN components c ON c.area_id = a.id AND NOT c.is_retired
GROUP BY a.id, a.name, a.project_id;

COMMENT ON VIEW vw_manhour_progress_by_area IS
'Aggregates manhour budget and earned values by Area for Component Progress Reports.
Used when Manhour View is selected in the reports UI.';

GRANT SELECT ON vw_manhour_progress_by_area TO authenticated;


-- ============================================================================
-- View 2: vw_manhour_progress_by_system
-- ============================================================================

CREATE OR REPLACE VIEW vw_manhour_progress_by_system AS
SELECT
  s.id AS system_id,
  s.name AS system_name,
  s.project_id,

  -- Total MH Budget
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0)), 0) AS mh_budget,

  -- Receive: MH Budget and Earned
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'receive')), 0) AS receive_mh_budget,
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'receive')
      * calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received') / 100.0), 0) AS receive_mh_earned,

  -- Install: MH Budget and Earned
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'install')), 0) AS install_mh_budget,
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'install')
      * calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed') / 100.0), 0) AS install_mh_earned,

  -- Punch: MH Budget and Earned
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'punch')), 0) AS punch_mh_budget,
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'punch')
      * calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch') / 100.0), 0) AS punch_mh_earned,

  -- Test: MH Budget and Earned
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'test')), 0) AS test_mh_budget,
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'test')
      * calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested') / 100.0), 0) AS test_mh_earned,

  -- Restore: MH Budget and Earned
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'restore')), 0) AS restore_mh_budget,
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'restore')
      * calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored') / 100.0), 0) AS restore_mh_earned,

  -- Total MH Earned (using overall percent_complete)
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * COALESCE(c.percent_complete, 0) / 100.0), 0) AS total_mh_earned,

  -- Overall % Complete (manhour-weighted)
  CASE WHEN COALESCE(SUM(COALESCE(c.budgeted_manhours, 0)), 0) > 0
    THEN ROUND((SUM(COALESCE(c.budgeted_manhours, 0) * COALESCE(c.percent_complete, 0) / 100.0) /
                SUM(COALESCE(c.budgeted_manhours, 0)) * 100)::numeric, 1)
    ELSE 0
  END AS mh_pct_complete

FROM systems s
LEFT JOIN components c ON c.system_id = s.id AND NOT c.is_retired
GROUP BY s.id, s.name, s.project_id;

COMMENT ON VIEW vw_manhour_progress_by_system IS
'Aggregates manhour budget and earned values by System for Component Progress Reports.';

GRANT SELECT ON vw_manhour_progress_by_system TO authenticated;


-- ============================================================================
-- View 3: vw_manhour_progress_by_test_package
-- ============================================================================

CREATE OR REPLACE VIEW vw_manhour_progress_by_test_package AS
SELECT
  tp.id AS test_package_id,
  tp.name AS test_package_name,
  tp.project_id,

  -- Total MH Budget
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0)), 0) AS mh_budget,

  -- Receive: MH Budget and Earned
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'receive')), 0) AS receive_mh_budget,
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'receive')
      * calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received') / 100.0), 0) AS receive_mh_earned,

  -- Install: MH Budget and Earned
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'install')), 0) AS install_mh_budget,
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'install')
      * calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed') / 100.0), 0) AS install_mh_earned,

  -- Punch: MH Budget and Earned
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'punch')), 0) AS punch_mh_budget,
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'punch')
      * calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch') / 100.0), 0) AS punch_mh_earned,

  -- Test: MH Budget and Earned
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'test')), 0) AS test_mh_budget,
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'test')
      * calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested') / 100.0), 0) AS test_mh_earned,

  -- Restore: MH Budget and Earned
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'restore')), 0) AS restore_mh_budget,
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * get_milestone_weight(c.project_id, c.component_type, 'restore')
      * calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored') / 100.0), 0) AS restore_mh_earned,

  -- Total MH Earned (using overall percent_complete)
  COALESCE(SUM(COALESCE(c.budgeted_manhours, 0) * COALESCE(c.percent_complete, 0) / 100.0), 0) AS total_mh_earned,

  -- Overall % Complete (manhour-weighted)
  CASE WHEN COALESCE(SUM(COALESCE(c.budgeted_manhours, 0)), 0) > 0
    THEN ROUND((SUM(COALESCE(c.budgeted_manhours, 0) * COALESCE(c.percent_complete, 0) / 100.0) /
                SUM(COALESCE(c.budgeted_manhours, 0)) * 100)::numeric, 1)
    ELSE 0
  END AS mh_pct_complete

FROM test_packages tp
LEFT JOIN components c ON c.test_package_id = tp.id AND NOT c.is_retired
GROUP BY tp.id, tp.name, tp.project_id;

COMMENT ON VIEW vw_manhour_progress_by_test_package IS
'Aggregates manhour budget and earned values by Test Package for Component Progress Reports.';

GRANT SELECT ON vw_manhour_progress_by_test_package TO authenticated;
