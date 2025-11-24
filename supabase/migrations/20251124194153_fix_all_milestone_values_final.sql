-- Migration: Fix All Component Milestone Values (100 to 1, boolean to numeric)
--
-- Issue: Milestones have value 100 instead of 1, causing "invalid input syntax for type boolean: 100"
-- Fix: Normalize all milestone values to 0/1, update function to handle numeric values

-- Part 1: Update function to handle both boolean AND numeric values (flexible)
-- This allows the view to work with existing data while we normalize values later
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
          v_earned := CASE WHEN (p_milestones->>'Fit-up') IN ('true', '1', '100') THEN 30 ELSE 0 END;
          v_total_weight := 30;
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
          v_earned := CASE WHEN (p_milestones->>'Weld Complete') IN ('true', '1', '100') THEN 65 ELSE 0 END;
          v_total_weight := 65;
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
          v_earned := CASE WHEN (p_milestones->>'Accepted') IN ('true', '1', '100') THEN 5 ELSE 0 END;
          v_total_weight := 5;
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
          v_earned := 0;
          v_total_weight := 1;
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
          v_earned := 0;
          v_total_weight := 1;
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
