-- Migration: Fix Manhour Views to Use Project-Specific Templates
--
-- ROOT CAUSE OF BUG:
-- Dashboard uses calculate_component_percent which reads from project_progress_templates (correct).
-- But manhour views use HARDCODED weights, ignoring project-specific templates.
--
-- Example for Dark Knight 1605 project:
--   Spool project_progress_templates: Receive=2%, Erect=41%, Connect=41%, Punch=6%, Test=5%, Restore=5%
--   Spool default progress_templates:  Receive=5%, Erect=40%, Connect=40%, Punch=5%, Test=5%, Restore=5%
--
-- Dashboard (correct): Spool with Receive=100 shows percent_complete=2%
-- View (wrong): Same spool shows receive_earned = mh * 0.05 = 5% (hardcoded default)
--
-- SOLUTION: Create a helper function to get category weights that checks
-- project_progress_templates first, then falls back to defaults.

-- ============================================================================
-- Helper function: Get category weight for a component type
-- ============================================================================

CREATE OR REPLACE FUNCTION get_category_weight(
  p_project_id UUID,
  p_component_type TEXT,
  p_category TEXT  -- 'receive', 'install', 'punch', 'test', 'restore'
) RETURNS NUMERIC AS $$
DECLARE
  v_weight NUMERIC := 0;
BEGIN
  -- First try project-specific templates
  IF EXISTS (
    SELECT 1 FROM project_progress_templates
    WHERE project_id = p_project_id AND component_type = p_component_type
    LIMIT 1
  ) THEN
    CASE p_category
      WHEN 'receive' THEN
        SELECT COALESCE(SUM(weight), 0) / 100.0 INTO v_weight
        FROM project_progress_templates
        WHERE project_id = p_project_id
          AND component_type = p_component_type
          AND milestone_name IN ('Receive');

      WHEN 'install' THEN
        CASE p_component_type
          WHEN 'spool' THEN
            SELECT COALESCE(SUM(weight), 0) / 100.0 INTO v_weight
            FROM project_progress_templates
            WHERE project_id = p_project_id
              AND component_type = p_component_type
              AND milestone_name IN ('Erect', 'Connect');
          WHEN 'field_weld' THEN
            SELECT COALESCE(SUM(weight), 0) / 100.0 INTO v_weight
            FROM project_progress_templates
            WHERE project_id = p_project_id
              AND component_type = p_component_type
              AND milestone_name IN ('Fit-up', 'Weld Complete');
          WHEN 'threaded_pipe' THEN
            SELECT COALESCE(SUM(weight), 0) / 100.0 INTO v_weight
            FROM project_progress_templates
            WHERE project_id = p_project_id
              AND component_type = p_component_type
              AND milestone_name IN ('Fabricate', 'Install', 'Erect', 'Connect', 'Support');
          ELSE
            SELECT COALESCE(SUM(weight), 0) / 100.0 INTO v_weight
            FROM project_progress_templates
            WHERE project_id = p_project_id
              AND component_type = p_component_type
              AND milestone_name IN ('Install');
        END CASE;

      WHEN 'punch' THEN
        SELECT COALESCE(SUM(weight), 0) / 100.0 INTO v_weight
        FROM project_progress_templates
        WHERE project_id = p_project_id
          AND component_type = p_component_type
          AND milestone_name IN ('Punch', 'Punch Complete', 'Accepted', 'Test Complete');

      WHEN 'test' THEN
        SELECT COALESCE(SUM(weight), 0) / 100.0 INTO v_weight
        FROM project_progress_templates
        WHERE project_id = p_project_id
          AND component_type = p_component_type
          AND milestone_name IN ('Test', 'Hydrotest');

      WHEN 'restore' THEN
        SELECT COALESCE(SUM(weight), 0) / 100.0 INTO v_weight
        FROM project_progress_templates
        WHERE project_id = p_project_id
          AND component_type = p_component_type
          AND milestone_name IN ('Restore', 'Insulate');
    END CASE;

    RETURN v_weight;
  END IF;

  -- Fall back to hardcoded defaults
  CASE p_category
    WHEN 'receive' THEN
      CASE p_component_type
        WHEN 'spool' THEN v_weight := 0.05;
        WHEN 'field_weld' THEN v_weight := 0.0;
        ELSE v_weight := 0.10;
      END CASE;
    WHEN 'install' THEN
      CASE p_component_type
        WHEN 'spool' THEN v_weight := 0.80;
        WHEN 'field_weld' THEN v_weight := 0.70;
        WHEN 'threaded_pipe' THEN v_weight := 0.80;
        ELSE v_weight := 0.60;
      END CASE;
    WHEN 'punch' THEN
      CASE p_component_type
        WHEN 'spool' THEN v_weight := 0.05;
        WHEN 'field_weld' THEN v_weight := 0.10;
        ELSE v_weight := 0.10;
      END CASE;
    WHEN 'test' THEN
      CASE p_component_type
        WHEN 'spool' THEN v_weight := 0.05;
        WHEN 'field_weld' THEN v_weight := 0.15;
        WHEN 'valve' THEN v_weight := 0.10;
        WHEN 'instrument' THEN v_weight := 0.10;
        ELSE v_weight := 0.0;
      END CASE;
    WHEN 'restore' THEN
      CASE p_component_type
        WHEN 'spool' THEN v_weight := 0.05;
        WHEN 'field_weld' THEN v_weight := 0.05;
        WHEN 'support' THEN v_weight := 0.10;
        ELSE v_weight := 0.10;
      END CASE;
  END CASE;

  RETURN v_weight;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_category_weight(UUID, TEXT, TEXT) IS
'Get manhour category weight for a component type, checking project_progress_templates first.';

-- ============================================================================
-- VIEW 1: vw_manhour_progress_by_area (Uses dynamic weights)
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
    -- Use helper function to get project-specific or default weights
    get_category_weight(c.project_id, c.component_type, 'receive') AS receive_w,
    get_category_weight(c.project_id, c.component_type, 'install') AS install_w,
    get_category_weight(c.project_id, c.component_type, 'punch') AS punch_w,
    get_category_weight(c.project_id, c.component_type, 'test') AS test_w,
    get_category_weight(c.project_id, c.component_type, 'restore') AS restore_w
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
category_earned AS (
  SELECT
    we.*,
    we.mh * we.receive_w * we.receive_pct / 100.0 AS receive_earned,
    we.mh * we.install_w * we.install_pct / 100.0 AS install_earned,
    we.mh * we.punch_w * we.punch_pct / 100.0 AS punch_earned,
    we.mh * we.test_w * we.test_pct / 100.0 AS test_earned,
    we.mh * we.restore_w * we.restore_pct / 100.0 AS restore_earned
  FROM with_earned we
)
SELECT
  ce.project_id,
  ce.area_id,
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
  COALESCE(SUM(ce.receive_earned + ce.install_earned + ce.punch_earned + ce.test_earned + ce.restore_earned), 0) AS total_mh_earned
FROM category_earned ce
GROUP BY ce.project_id, ce.area_id;

-- ============================================================================
-- VIEW 2: vw_manhour_progress_by_drawing (Uses dynamic weights)
-- ============================================================================

DROP VIEW IF EXISTS vw_manhour_progress_by_drawing;

CREATE OR REPLACE VIEW vw_manhour_progress_by_drawing AS
WITH component_data AS (
  SELECT
    c.drawing_id,
    c.project_id,
    c.component_type,
    COALESCE(c.budgeted_manhours, 0) AS mh,
    c.current_milestones,
    get_category_weight(c.project_id, c.component_type, 'receive') AS receive_w,
    get_category_weight(c.project_id, c.component_type, 'install') AS install_w,
    get_category_weight(c.project_id, c.component_type, 'punch') AS punch_w,
    get_category_weight(c.project_id, c.component_type, 'test') AS test_w,
    get_category_weight(c.project_id, c.component_type, 'restore') AS restore_w
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
category_earned AS (
  SELECT
    we.*,
    we.mh * we.receive_w * we.receive_pct / 100.0 AS receive_earned,
    we.mh * we.install_w * we.install_pct / 100.0 AS install_earned,
    we.mh * we.punch_w * we.punch_pct / 100.0 AS punch_earned,
    we.mh * we.test_w * we.test_pct / 100.0 AS test_earned,
    we.mh * we.restore_w * we.restore_pct / 100.0 AS restore_earned
  FROM with_earned we
)
SELECT
  ce.project_id,
  ce.drawing_id,
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
  COALESCE(SUM(ce.receive_earned + ce.install_earned + ce.punch_earned + ce.test_earned + ce.restore_earned), 0) AS total_mh_earned
FROM category_earned ce
GROUP BY ce.project_id, ce.drawing_id;

-- ============================================================================
-- VIEW 3: vw_manhour_progress_by_test_package (Uses dynamic weights)
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
    get_category_weight(c.project_id, c.component_type, 'receive') AS receive_w,
    get_category_weight(c.project_id, c.component_type, 'install') AS install_w,
    get_category_weight(c.project_id, c.component_type, 'punch') AS punch_w,
    get_category_weight(c.project_id, c.component_type, 'test') AS test_w,
    get_category_weight(c.project_id, c.component_type, 'restore') AS restore_w
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
category_earned AS (
  SELECT
    we.*,
    we.mh * we.receive_w * we.receive_pct / 100.0 AS receive_earned,
    we.mh * we.install_w * we.install_pct / 100.0 AS install_earned,
    we.mh * we.punch_w * we.punch_pct / 100.0 AS punch_earned,
    we.mh * we.test_w * we.test_pct / 100.0 AS test_earned,
    we.mh * we.restore_w * we.restore_pct / 100.0 AS restore_earned
  FROM with_earned we
)
SELECT
  ce.project_id,
  ce.test_package_id,
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
  COALESCE(SUM(ce.receive_earned + ce.install_earned + ce.punch_earned + ce.test_earned + ce.restore_earned), 0) AS total_mh_earned
FROM category_earned ce
GROUP BY ce.project_id, ce.test_package_id;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Created get_category_weight() function that reads from project_progress_templates
-- Recreated all 3 manhour views to use dynamic weights instead of hardcoded values
-- This ensures views match dashboard calculation which uses calculate_component_percent
