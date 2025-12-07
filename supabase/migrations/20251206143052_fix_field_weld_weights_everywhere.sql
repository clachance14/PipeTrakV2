-- Migration: Fix Field Weld Weights Everywhere
--
-- PROBLEM: field_weld weights are inconsistent across:
--   1. progress_templates (used by c.percent_complete via calculate_component_percent)
--   2. calculate_earned_milestone_value function (used by manhour views)
--   3. Inline weights in manhour views
--
-- CORRECT WEIGHTS (from progress_templates):
--   Fit-up: 10%
--   Weld Complete: 60%
--   Punch (Accepted): 10%
--   Test: 15%
--   Restore: 5%
--
-- However, field welds only have 3 milestones: Fit-up, Weld Complete, Accepted
-- Test and Restore don't exist for field welds (no milestone keys)
--
-- The progress_templates for field_weld says:
--   Fit-up: 10%, Weld Complete: 60%, Punch: 10%, Test: 15%, Restore: 5%
--
-- But the actual milestone keys on components are:
--   Fit-up, Weld Complete, Accepted (maps to Punch)
--
-- So the ACHIEVABLE progress is only: 10% + 60% + 10% = 80%
-- Test (15%) and Restore (5%) can NEVER be earned because those milestones don't exist.
--
-- For the views to match c.percent_complete (which CAN reach 100% if templates are properly configured),
-- we need to ensure the calculate_earned_milestone_value function uses the same weights as progress_templates.
--
-- The real fix is: field_weld progress_templates should only have milestones that exist.
-- But for now, let's make the function match the templates.

-- ============================================================================
-- UPDATE calculate_earned_milestone_value to match progress_templates weights
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
    WHEN 'received' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          v_earned := CASE WHEN (p_milestones->>'Receive') IN ('true', '1', '100') THEN 5 ELSE 0 END;
          v_total_weight := 5;
        WHEN 'field_weld' THEN
          -- Field Weld: Fit-up = 10% (FIXED from 30%)
          -- Note: Fit-up is grouped under "received" category in views
          v_earned := CASE WHEN (p_milestones->>'Fit-up') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
        ELSE
          v_earned := CASE WHEN (p_milestones->>'Receive') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
      END CASE;

    WHEN 'installed' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          v_earned :=
            CASE WHEN (p_milestones->>'Erect') IN ('true', '1', '100') THEN 40 ELSE 0 END +
            CASE WHEN (p_milestones->>'Connect') IN ('true', '1', '100') THEN 40 ELSE 0 END;
          v_total_weight := 80;
        WHEN 'field_weld' THEN
          -- Field Weld: Weld Complete = 60% (FIXED from 65%)
          v_earned := CASE WHEN (p_milestones->>'Weld Complete') IN ('true', '1', '100') THEN 60 ELSE 0 END;
          v_total_weight := 60;
        WHEN 'threaded_pipe' THEN
          v_earned :=
            COALESCE((p_milestones->>'Fabricate')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Install')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Erect')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Connect')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Support')::numeric, 0) * 0.16;
          v_total_weight := 80;
        ELSE
          v_earned := CASE WHEN (p_milestones->>'Install') IN ('true', '1', '100') THEN 60 ELSE 0 END;
          v_total_weight := 60;
      END CASE;

    WHEN 'punch' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          v_earned := CASE WHEN (p_milestones->>'Punch Complete') IN ('true', '1', '100') THEN 5 ELSE 0 END;
          v_total_weight := 5;
        WHEN 'field_weld' THEN
          -- Field Weld: Accepted (maps to Punch) = 10% (FIXED from 5%)
          v_earned := CASE WHEN (p_milestones->>'Accepted') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
        WHEN 'instrument' THEN
          v_earned := CASE WHEN (p_milestones->>'Punch Complete') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
        ELSE
          v_earned := CASE WHEN (p_milestones->>'Test Complete') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
      END CASE;

    WHEN 'tested' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          v_earned := CASE WHEN (p_milestones->>'Hydrotest') IN ('true', '1', '100') THEN 5 ELSE 0 END;
          v_total_weight := 5;
        WHEN 'field_weld' THEN
          -- Field Weld: Test = 15% (FIXED from 0%)
          -- Note: This milestone may not exist on field welds, but if it does, count it
          v_earned := CASE WHEN (p_milestones->>'Test') IN ('true', '1', '100') THEN 15 ELSE 0 END;
          v_total_weight := 15;
        WHEN 'valve' THEN
          v_earned := CASE WHEN (p_milestones->>'Test') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
        WHEN 'instrument' THEN
          v_earned := CASE WHEN (p_milestones->>'Test') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
        ELSE
          v_earned := 0;
          v_total_weight := 1;
      END CASE;

    WHEN 'restored' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          v_earned := CASE WHEN (p_milestones->>'Restore') IN ('true', '1', '100') THEN 5 ELSE 0 END;
          v_total_weight := 5;
        WHEN 'field_weld' THEN
          -- Field Weld: Restore = 5% (FIXED from 0%)
          -- Note: This milestone may not exist on field welds, but if it does, count it
          v_earned := CASE WHEN (p_milestones->>'Restore') IN ('true', '1', '100') THEN 5 ELSE 0 END;
          v_total_weight := 5;
        WHEN 'support' THEN
          v_earned := CASE WHEN (p_milestones->>'Insulate') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
        ELSE
          v_earned := CASE WHEN (p_milestones->>'Restore') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
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
-- The manhour views already have the correct weights from migration
-- 20251206142527_fix_manhour_views_field_weld_weights.sql:
--   receive_w: 0% (field_weld Fit-up is grouped under install in some contexts)
--   install_w: 70% (Fit-up 10% + Weld Complete 60%)
--   punch_w: 10%
--   test_w: 15%
--   restore_w: 5%
--
-- WAIT - there's still a mismatch!
-- The views group Fit-up under "install" (making install_w = 70%)
-- But the function groups Fit-up under "received"
--
-- The function and views must be consistent.
-- Let's check what the views expect:
--   - Views call calculate_earned_milestone_value(..., 'received') for receive_pct
--   - Views call calculate_earned_milestone_value(..., 'installed') for install_pct
--
-- For field_weld:
--   - 'received' should return 0% (no receive milestone for field welds)
--   - 'installed' should return Fit-up + Weld Complete = 10% + 60% = 70%
--   - 'punch' should return Accepted = 10%
--   - 'tested' should return Test = 15% (if exists)
--   - 'restored' should return Restore = 5% (if exists)
--
-- But currently the function returns:
--   - 'received' returns Fit-up = 10%
--   - 'installed' returns Weld Complete = 60%
--
-- The views use:
--   receive_w = 0 for field_weld (so receive_earned = 0 always)
--   install_w = 70% (but function only returns 60% for installed!)
--
-- There's a fundamental mismatch. Let me fix the function to group Fit-up under installed:
-- ============================================================================

-- CORRECTED function that groups Fit-up + Weld Complete under 'installed' for field_weld
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
    WHEN 'received' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          v_earned := CASE WHEN (p_milestones->>'Receive') IN ('true', '1', '100') THEN 5 ELSE 0 END;
          v_total_weight := 5;
        WHEN 'field_weld' THEN
          -- Field Weld: No receive milestone, return 0
          -- Fit-up is grouped under 'installed' instead
          v_earned := 0;
          v_total_weight := 1; -- Avoid division by zero
        ELSE
          v_earned := CASE WHEN (p_milestones->>'Receive') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
      END CASE;

    WHEN 'installed' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          v_earned :=
            CASE WHEN (p_milestones->>'Erect') IN ('true', '1', '100') THEN 40 ELSE 0 END +
            CASE WHEN (p_milestones->>'Connect') IN ('true', '1', '100') THEN 40 ELSE 0 END;
          v_total_weight := 80;
        WHEN 'field_weld' THEN
          -- Field Weld: Fit-up (10%) + Weld Complete (60%) = 70%
          -- Both grouped under 'installed' to match view weights
          v_earned :=
            CASE WHEN (p_milestones->>'Fit-up') IN ('true', '1', '100') THEN 10 ELSE 0 END +
            CASE WHEN (p_milestones->>'Weld Complete') IN ('true', '1', '100') THEN 60 ELSE 0 END;
          v_total_weight := 70;
        WHEN 'threaded_pipe' THEN
          v_earned :=
            COALESCE((p_milestones->>'Fabricate')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Install')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Erect')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Connect')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Support')::numeric, 0) * 0.16;
          v_total_weight := 80;
        ELSE
          v_earned := CASE WHEN (p_milestones->>'Install') IN ('true', '1', '100') THEN 60 ELSE 0 END;
          v_total_weight := 60;
      END CASE;

    WHEN 'punch' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          v_earned := CASE WHEN (p_milestones->>'Punch Complete') IN ('true', '1', '100') THEN 5 ELSE 0 END;
          v_total_weight := 5;
        WHEN 'field_weld' THEN
          -- Field Weld: Accepted (maps to Punch) = 10%
          v_earned := CASE WHEN (p_milestones->>'Accepted') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
        WHEN 'instrument' THEN
          v_earned := CASE WHEN (p_milestones->>'Punch Complete') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
        ELSE
          v_earned := CASE WHEN (p_milestones->>'Test Complete') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
      END CASE;

    WHEN 'tested' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          v_earned := CASE WHEN (p_milestones->>'Hydrotest') IN ('true', '1', '100') THEN 5 ELSE 0 END;
          v_total_weight := 5;
        WHEN 'field_weld' THEN
          -- Field Weld: Test = 15%
          -- Note: This milestone may not exist on field welds currently
          v_earned := CASE WHEN (p_milestones->>'Test') IN ('true', '1', '100') THEN 15 ELSE 0 END;
          v_total_weight := 15;
        WHEN 'valve' THEN
          v_earned := CASE WHEN (p_milestones->>'Test') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
        WHEN 'instrument' THEN
          v_earned := CASE WHEN (p_milestones->>'Test') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
        ELSE
          v_earned := 0;
          v_total_weight := 1;
      END CASE;

    WHEN 'restored' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          v_earned := CASE WHEN (p_milestones->>'Restore') IN ('true', '1', '100') THEN 5 ELSE 0 END;
          v_total_weight := 5;
        WHEN 'field_weld' THEN
          -- Field Weld: Restore = 5%
          -- Note: This milestone may not exist on field welds currently
          v_earned := CASE WHEN (p_milestones->>'Restore') IN ('true', '1', '100') THEN 5 ELSE 0 END;
          v_total_weight := 5;
        WHEN 'support' THEN
          v_earned := CASE WHEN (p_milestones->>'Insulate') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
        ELSE
          v_earned := CASE WHEN (p_milestones->>'Restore') IN ('true', '1', '100') THEN 10 ELSE 0 END;
          v_total_weight := 10;
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

COMMENT ON FUNCTION calculate_earned_milestone_value(TEXT, JSONB, TEXT) IS
'Calculate earned milestone value as percentage. For field_weld:
- received: 0% (no receive milestone)
- installed: Fit-up (10%) + Weld Complete (60%) = 70%
- punch: Accepted = 10%
- tested: Test = 15% (if exists)
- restored: Restore = 5% (if exists)
This matches the view weights for consistent calculation.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Fixed calculate_earned_milestone_value function for field_weld:
--   - received: 0% (was incorrectly 30% for Fit-up)
--   - installed: Fit-up + Weld Complete = 70% (was only Weld Complete = 65%)
--   - punch: Accepted = 10% (was 5%)
--   - tested: 15% (was 0%)
--   - restored: 5% (was 0%)
--
-- This now matches the manhour view weights from migration 20251206142527
-- ============================================================================
