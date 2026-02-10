-- Migration: Fix calculate_earned_milestone_value to use template categories
-- Bug: Function used hardcoded milestone names that don't match actual templates.
--   e.g. looked for 'Punch Complete' when template has 'Punch',
--        looked for 'Hydrotest' when template has 'Test',
--        hardcoded 0 for field_weld tested/restored when they now have Test/Restore milestones.
-- Result: Punch/Tested/Restored columns showed 0% even when components were 100% complete.
-- Fix: New 4-param overload that reads actual milestone names from templates via category.

-- ============================================================================
-- PART 1: Backfill categories on system progress_templates JSONB
-- ============================================================================
-- Some templates were inserted before the category system existed.
-- Add category to any milestone JSONB object that doesn't have one.

UPDATE progress_templates
SET milestones_config = (
  SELECT jsonb_agg(
    CASE
      WHEN m->>'category' IS NOT NULL THEN m
      ELSE m || jsonb_build_object('category',
        CASE
          -- Field-weld: Fit-up is the receive phase (not install)
          WHEN component_type = 'field_weld' AND (m->>'name') = 'Fit-up' THEN 'receive'
          WHEN component_type = 'field_weld' AND (m->>'name') = 'Fit-Up' THEN 'receive'
          WHEN component_type = 'field_weld' AND (m->>'name') = 'Weld Complete' THEN 'install'
          WHEN component_type = 'field_weld' AND (m->>'name') = 'Weld Made' THEN 'install'
          WHEN component_type = 'field_weld' AND (m->>'name') = 'Accepted' THEN 'punch'
          -- General mappings (all other component types)
          WHEN (m->>'name') = 'Receive' THEN 'receive'
          WHEN (m->>'name') IN ('Install', 'Erect', 'Connect', 'Support', 'Fabricate') THEN 'install'
          WHEN (m->>'name') IN ('Punch', 'Punch Complete', 'Repair Complete') THEN 'punch'
          WHEN (m->>'name') IN ('Test', 'Hydrotest', 'NDE Final') THEN 'test'
          WHEN (m->>'name') IN ('Restore', 'Insulate', 'Paint') THEN 'restore'
          ELSE NULL
        END
      )
    END
    ORDER BY (m->>'order')::int NULLS LAST
  )
  FROM jsonb_array_elements(milestones_config) m
)
WHERE milestones_config IS NOT NULL;

-- ============================================================================
-- PART 2: Backfill categories on project_progress_templates
-- ============================================================================

UPDATE project_progress_templates
SET category = CASE
  -- Field-weld specific
  WHEN component_type = 'field_weld' AND milestone_name IN ('Fit-up', 'Fit-Up') THEN 'receive'
  WHEN component_type = 'field_weld' AND milestone_name IN ('Weld Complete', 'Weld Made') THEN 'install'
  WHEN component_type = 'field_weld' AND milestone_name = 'Accepted' THEN 'punch'
  -- General mappings
  WHEN milestone_name = 'Receive' THEN 'receive'
  WHEN milestone_name IN ('Install', 'Erect', 'Connect', 'Support', 'Fabricate') THEN 'install'
  WHEN milestone_name IN ('Punch', 'Punch Complete', 'Repair Complete') THEN 'punch'
  WHEN milestone_name IN ('Test', 'Hydrotest', 'NDE Final') THEN 'test'
  WHEN milestone_name IN ('Restore', 'Insulate', 'Paint') THEN 'restore'
  ELSE category
END
WHERE category IS NULL;

-- ============================================================================
-- PART 3: Create category-driven calculate_earned_milestone_value (4-param)
-- ============================================================================
-- This overload reads actual milestone names from templates via get_component_template().
-- It maps the standard milestone parameter ('received','installed','punch','tested','restored')
-- to the template category ('receive','install','punch','test','restore'), then evaluates
-- actual milestone values from current_milestones JSONB.

CREATE OR REPLACE FUNCTION calculate_earned_milestone_value(
  p_project_id UUID,
  p_component_type TEXT,
  p_milestones JSONB,
  p_standard_milestone TEXT
) RETURNS NUMERIC AS $$
DECLARE
  v_template RECORD;
  v_earned NUMERIC := 0;
  v_total_weight NUMERIC := 0;
  v_normalized NUMERIC;
  v_category TEXT;
BEGIN
  IF p_milestones IS NULL OR p_milestones = '{}'::jsonb THEN
    RETURN 0;
  END IF;

  -- Map standard milestone parameter to category name
  v_category := CASE p_standard_milestone
    WHEN 'received' THEN 'receive'
    WHEN 'installed' THEN 'install'
    WHEN 'punch' THEN 'punch'
    WHEN 'tested' THEN 'test'
    WHEN 'restored' THEN 'restore'
    ELSE p_standard_milestone
  END;

  -- Iterate over template milestones matching the requested category
  FOR v_template IN
    SELECT * FROM get_component_template(p_project_id, p_component_type)
    WHERE category = v_category
  LOOP
    v_total_weight := v_total_weight + v_template.weight;

    v_normalized := normalize_milestone_value(
      p_milestones->v_template.milestone_name
    );

    IF v_template.is_partial THEN
      -- Partial milestones: proportional credit
      v_earned := v_earned + (v_template.weight * v_normalized / 100.0);
    ELSE
      -- Discrete milestones: all-or-nothing (>=50 threshold matches field_weld views)
      IF v_normalized >= 50 THEN
        v_earned := v_earned + v_template.weight;
      END IF;
    END IF;
  END LOOP;

  IF v_total_weight > 0 THEN
    RETURN ROUND((v_earned / v_total_weight) * 100, 0);
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_earned_milestone_value(UUID, TEXT, JSONB, TEXT) IS
'Category-driven earned milestone calculation. Reads actual milestone names from templates
instead of hardcoding them. Use this 4-param version for correctness.';

-- ============================================================================
-- PART 4: Recreate component progress views using 4-param function
-- ============================================================================

-- VIEW 1: vw_progress_by_area
DROP VIEW IF EXISTS vw_progress_by_area;

CREATE OR REPLACE VIEW vw_progress_by_area AS

-- Part 1: Components WITH area assignment
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.project_id,
  COUNT(c.id) AS budget,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'received'))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'installed'))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'punch'))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'tested'))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'restored'))::numeric, 0) AS pct_restored,
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
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'received'))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'installed'))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'punch'))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'tested'))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'restored'))::numeric, 0) AS pct_restored,
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total
FROM components c
WHERE NOT c.is_retired
  AND c.area_id IS NULL
GROUP BY c.project_id
HAVING COUNT(c.id) > 0;

COMMENT ON VIEW vw_progress_by_area IS
'Aggregates component progress statistics grouped by Area, including Not Assigned.
Uses category-driven milestone calculation for correctness.';

GRANT SELECT ON vw_progress_by_area TO authenticated;


-- VIEW 2: vw_progress_by_system
DROP VIEW IF EXISTS vw_progress_by_system;

CREATE OR REPLACE VIEW vw_progress_by_system AS

-- Part 1: Components WITH system assignment
SELECT
  s.id AS system_id,
  s.name AS system_name,
  s.project_id,
  COUNT(c.id) AS budget,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'received'))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'installed'))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'punch'))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'tested'))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'restored'))::numeric, 0) AS pct_restored,
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
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'received'))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'installed'))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'punch'))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'tested'))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'restored'))::numeric, 0) AS pct_restored,
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total
FROM components c
WHERE NOT c.is_retired
  AND c.system_id IS NULL
GROUP BY c.project_id
HAVING COUNT(c.id) > 0;

COMMENT ON VIEW vw_progress_by_system IS
'Aggregates component progress statistics grouped by System, including Not Assigned.
Uses category-driven milestone calculation for correctness.';

GRANT SELECT ON vw_progress_by_system TO authenticated;


-- VIEW 3: vw_progress_by_test_package
DROP VIEW IF EXISTS vw_progress_by_test_package;

CREATE OR REPLACE VIEW vw_progress_by_test_package AS

-- Part 1: Components WITH test package assignment
SELECT
  tp.id AS test_package_id,
  tp.name AS test_package_name,
  tp.project_id,
  COUNT(c.id) AS budget,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'received'))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'installed'))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'punch'))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'tested'))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'restored'))::numeric, 0) AS pct_restored,
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
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'received'))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'installed'))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'punch'))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'tested'))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.project_id, c.component_type, c.current_milestones, 'restored'))::numeric, 0) AS pct_restored,
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total
FROM components c
WHERE NOT c.is_retired
  AND c.test_package_id IS NULL
GROUP BY c.project_id
HAVING COUNT(c.id) > 0;

COMMENT ON VIEW vw_progress_by_test_package IS
'Aggregates component progress statistics grouped by Test Package, including Not Assigned.
Uses category-driven milestone calculation for correctness.';

GRANT SELECT ON vw_progress_by_test_package TO authenticated;


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Fixed: Component progress report Punch/Tested/Restored columns now read actual
-- milestone names from templates via category instead of using wrong hardcoded names.
-- Old 3-param function preserved for backward compatibility (manhour views still use it).
-- Note: Manhour views still use old 3-param function + have separate weight issues.
