-- Migration: Fix calculate_earned_milestone_value (3-param) with correct milestone names
-- Issue: Previous migration (20260210153000) created a 4-param category-driven function
--        that calls get_component_template() per row, causing statement timeouts on views
--        with 700+ components.
-- Fix: Correct the hardcoded milestone names in the fast 3-param IMMUTABLE function and
--      revert views to use it. No DB lookups = no timeouts.
--
-- Milestone name corrections:
--   punch:    'Punch Complete'/'Test Complete'/'Accepted' → 'Punch' (all types)
--   tested:   'Hydrotest' → 'Test' (spool), hardcoded 0 → 'Test' (field_weld, ELSE)
--   restored: 'Insulate' → 'Restore' (support), hardcoded 0 → 'Restore' (field_weld)
--   installed: added 'pipe' case (Erect + Connect + Support partial milestones)

-- ============================================================================
-- PART 0: Drop ALL overloads + dependent views to eliminate ambiguity
-- ============================================================================
-- There are 3 overloads in the DB:
--   1. (TEXT, JSONB, TEXT)           — original 3-param IMMUTABLE
--   2. (TEXT, JSONB, TEXT, UUID)     — from 20251206160030 with DEFAULT NULL (causes ambiguity!)
--   3. (UUID, TEXT, JSONB, TEXT)     — from 20260210153000 (causes timeouts)
-- We must drop ALL three, then recreate only #1 with correct milestone names.

DROP VIEW IF EXISTS vw_progress_by_area CASCADE;
DROP VIEW IF EXISTS vw_progress_by_system CASCADE;
DROP VIEW IF EXISTS vw_progress_by_test_package CASCADE;
DROP FUNCTION IF EXISTS calculate_earned_milestone_value(TEXT, JSONB, TEXT) CASCADE;
DROP FUNCTION IF EXISTS calculate_earned_milestone_value(TEXT, JSONB, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS calculate_earned_milestone_value(UUID, TEXT, JSONB, TEXT) CASCADE;

-- ============================================================================
-- PART 1: Fix the 3-param function with correct milestone names
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_earned_milestone_value(
  p_component_type TEXT,
  p_milestones JSONB,
  p_standard_milestone TEXT
) RETURNS NUMERIC AS $$
DECLARE
  v_earned NUMERIC := 0;
  v_total_weight NUMERIC := 0;
BEGIN
  IF p_milestones IS NULL OR p_milestones = '{}'::jsonb THEN
    RETURN 0;
  END IF;

  CASE p_standard_milestone
    -- ================================================================
    -- RECEIVED: Receive / Fit-up
    -- ================================================================
    WHEN 'received' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          v_earned := CASE WHEN (p_milestones->>'Receive') IN ('true', '1', '100') THEN 5 ELSE 0 END;
          v_total_weight := 5;
        WHEN 'field_weld' THEN
          v_earned := CASE WHEN (p_milestones->>'Fit-up') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
        ELSE
          -- valve, fitting, flange, instrument, support, tubing, hose, misc, pipe, threaded_pipe
          v_earned := CASE WHEN (p_milestones->>'Receive') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
      END CASE;

    -- ================================================================
    -- INSTALLED: Erect+Connect / Weld Complete / Install / partial
    -- ================================================================
    WHEN 'installed' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          v_earned :=
            CASE WHEN (p_milestones->>'Erect') IN ('true', '1', '100') THEN 40 ELSE 0 END +
            CASE WHEN (p_milestones->>'Connect') IN ('true', '1', '100') THEN 40 ELSE 0 END;
          v_total_weight := 80;
        WHEN 'field_weld' THEN
          v_earned := CASE WHEN (p_milestones->>'Weld Complete') IN ('true', '1', '100') THEN 60 ELSE 0 END;
          v_total_weight := 60;
        WHEN 'pipe' THEN
          -- Pipe v2: Erect (30%) + Connect (30%) + Support (20%) — partial milestones (0-100)
          v_earned :=
            COALESCE((p_milestones->>'Erect')::numeric, 0) * 0.30 +
            COALESCE((p_milestones->>'Connect')::numeric, 0) * 0.30 +
            COALESCE((p_milestones->>'Support')::numeric, 0) * 0.20;
          v_total_weight := 80;
        WHEN 'threaded_pipe' THEN
          -- Threaded Pipe: partial milestones each 16%
          v_earned :=
            COALESCE((p_milestones->>'Fabricate')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Install')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Erect')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Connect')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Support')::numeric, 0) * 0.16;
          v_total_weight := 80;
        ELSE
          -- valve, fitting, flange, instrument, support, tubing, hose, misc
          v_earned := CASE WHEN (p_milestones->>'Install') IN ('true', '1', '100') THEN 60 ELSE 0 END;
          v_total_weight := 60;
      END CASE;

    -- ================================================================
    -- PUNCH: 'Punch' for ALL types (was wrongly 'Punch Complete'/'Test Complete'/'Accepted')
    -- ================================================================
    WHEN 'punch' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          v_earned := CASE WHEN (p_milestones->>'Punch') IN ('true', '1', '100') THEN 5 ELSE 0 END;
          v_total_weight := 5;
        ELSE
          -- ALL other types: Punch (10%)
          v_earned := CASE WHEN (p_milestones->>'Punch') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
      END CASE;

    -- ================================================================
    -- TESTED: 'Test' for ALL types (was wrongly 'Hydrotest'/hardcoded 0)
    -- ================================================================
    WHEN 'tested' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          v_earned := CASE WHEN (p_milestones->>'Test') IN ('true', '1', '100') THEN 5 ELSE 0 END;
          v_total_weight := 5;
        ELSE
          -- ALL other types: Test (15%)
          v_earned := CASE WHEN (p_milestones->>'Test') IN ('true', '1', '100') THEN 15 ELSE 0 END;
          v_total_weight := 15;
      END CASE;

    -- ================================================================
    -- RESTORED: 'Restore' for ALL types (was wrongly 'Insulate'/hardcoded 0)
    -- ================================================================
    WHEN 'restored' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          v_earned := CASE WHEN (p_milestones->>'Restore') IN ('true', '1', '100') THEN 5 ELSE 0 END;
          v_total_weight := 5;
        ELSE
          -- ALL other types: Restore (5%)
          v_earned := CASE WHEN (p_milestones->>'Restore') IN ('true', '1', '100') THEN 5 ELSE 0 END;
          v_total_weight := 5;
      END CASE;

    ELSE
      RETURN 0;
  END CASE;

  IF v_total_weight > 0 THEN
    RETURN (v_earned / v_total_weight) * 100;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================================
-- PART 1b: Recreate the (TEXT, JSONB, TEXT, UUID) overload WITHOUT DEFAULT
-- ============================================================================
-- This overload is called by calculate_category_earned_mh() for manhour views.
-- Original (20251206160030) had DEFAULT NULL on p_project_id which caused
-- ambiguity with the 3-param function. Recreate WITHOUT default.

CREATE OR REPLACE FUNCTION calculate_earned_milestone_value(
  p_component_type TEXT,
  p_milestones JSONB,
  p_category TEXT,
  p_project_id UUID   -- NO DEFAULT — prevents ambiguity with 3-param overload
) RETURNS NUMERIC AS $$
DECLARE
  v_category_earned_weight NUMERIC := 0;
  v_category_total_weight NUMERIC := 0;
  v_template RECORD;
  v_normalized NUMERIC;
BEGIN
  FOR v_template IN
    SELECT * FROM get_component_template(p_project_id, p_component_type)
    WHERE category = p_category
  LOOP
    v_normalized := normalize_milestone_value(
      p_milestones->v_template.milestone_name
    );

    v_category_total_weight := v_category_total_weight + v_template.weight;

    IF v_template.is_partial THEN
      v_category_earned_weight := v_category_earned_weight + (v_template.weight * v_normalized / 100.0);
    ELSE
      IF v_normalized = 100 THEN
        v_category_earned_weight := v_category_earned_weight + v_template.weight;
      END IF;
    END IF;
  END LOOP;

  IF v_category_total_weight > 0 THEN
    RETURN (v_category_earned_weight / v_category_total_weight) * 100;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;


-- ============================================================================
-- PART 2: Revert component progress views to use fast 3-param function
-- ============================================================================

-- VIEW 1: vw_progress_by_area
DROP VIEW IF EXISTS vw_progress_by_area;

CREATE OR REPLACE VIEW vw_progress_by_area AS

SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.project_id,
  COUNT(c.id) AS budget,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received'::text))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed'::text))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch'::text))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested'::text))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored'::text))::numeric, 0) AS pct_restored,
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total
FROM areas a
INNER JOIN components c ON c.area_id = a.id AND NOT c.is_retired
GROUP BY a.id, a.name, a.project_id

UNION ALL

SELECT
  NULL AS area_id,
  'Not Assigned' AS area_name,
  c.project_id,
  COUNT(c.id) AS budget,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received'::text))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed'::text))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch'::text))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested'::text))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored'::text))::numeric, 0) AS pct_restored,
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total
FROM components c
WHERE NOT c.is_retired AND c.area_id IS NULL
GROUP BY c.project_id
HAVING COUNT(c.id) > 0;

GRANT SELECT ON vw_progress_by_area TO authenticated;


-- VIEW 2: vw_progress_by_system
DROP VIEW IF EXISTS vw_progress_by_system;

CREATE OR REPLACE VIEW vw_progress_by_system AS

SELECT
  s.id AS system_id,
  s.name AS system_name,
  s.project_id,
  COUNT(c.id) AS budget,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received'::text))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed'::text))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch'::text))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested'::text))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored'::text))::numeric, 0) AS pct_restored,
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total
FROM systems s
INNER JOIN components c ON c.system_id = s.id AND NOT c.is_retired
GROUP BY s.id, s.name, s.project_id

UNION ALL

SELECT
  NULL AS system_id,
  'Not Assigned' AS system_name,
  c.project_id,
  COUNT(c.id) AS budget,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received'::text))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed'::text))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch'::text))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested'::text))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored'::text))::numeric, 0) AS pct_restored,
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total
FROM components c
WHERE NOT c.is_retired AND c.system_id IS NULL
GROUP BY c.project_id
HAVING COUNT(c.id) > 0;

GRANT SELECT ON vw_progress_by_system TO authenticated;


-- VIEW 3: vw_progress_by_test_package
DROP VIEW IF EXISTS vw_progress_by_test_package;

CREATE OR REPLACE VIEW vw_progress_by_test_package AS

SELECT
  tp.id AS test_package_id,
  tp.name AS test_package_name,
  tp.project_id,
  COUNT(c.id) AS budget,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received'::text))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed'::text))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch'::text))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested'::text))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored'::text))::numeric, 0) AS pct_restored,
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total
FROM test_packages tp
INNER JOIN components c ON c.test_package_id = tp.id AND NOT c.is_retired
GROUP BY tp.id, tp.name, tp.project_id

UNION ALL

SELECT
  NULL AS test_package_id,
  'Not Assigned' AS test_package_name,
  c.project_id,
  COUNT(c.id) AS budget,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received'::text))::numeric, 0) AS pct_received,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed'::text))::numeric, 0) AS pct_installed,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch'::text))::numeric, 0) AS pct_punch,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested'::text))::numeric, 0) AS pct_tested,
  ROUND(AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored'::text))::numeric, 0) AS pct_restored,
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total
FROM components c
WHERE NOT c.is_retired AND c.test_package_id IS NULL
GROUP BY c.project_id
HAVING COUNT(c.id) > 0;

GRANT SELECT ON vw_progress_by_test_package TO authenticated;


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Fixed: 3-param function now uses correct milestone names (Punch, Test, Restore)
--        instead of wrong names (Punch Complete, Test Complete, Hydrotest, Insulate, etc.)
-- Performance: IMMUTABLE function with no DB lookups = fast, no statement timeouts
-- Views: Reverted to 3-param function for performance
-- Note: 4-param category-driven function from 20260210153000 has been dropped (CASCADE)
