-- Migration 00057: Calculate Earned Milestone Value Function
-- Feature: Weekly Progress Reports (019)
-- Purpose: Map component-specific milestones to standardized milestones (Received, Installed, Punch, Tested, Restored)

-- This function converts component-specific milestone states (e.g., Spool "Receive", Field Weld "Fit-Up")
-- into standardized progress percentages for the 5 standard milestones used in reports.
--
-- Parameters:
--   p_component_type: Component type (spool, valve, field_weld, threaded_pipe, etc.)
--   p_milestones: JSONB object containing current milestone states from components.current_milestones
--   p_standard_milestone: Target standard milestone (received, installed, punch, tested, restored)
--
-- Returns: Numeric percentage (0-100) representing earned value for the standard milestone

CREATE OR REPLACE FUNCTION calculate_earned_milestone_value(
  p_component_type TEXT,
  p_milestones JSONB,
  p_standard_milestone TEXT
) RETURNS NUMERIC AS $$
DECLARE
  v_earned NUMERIC := 0;
  v_total_weight NUMERIC := 0;
BEGIN
  -- Handle NULL or empty milestones
  IF p_milestones IS NULL OR p_milestones = '{}'::jsonb THEN
    RETURN 0;
  END IF;

  CASE p_standard_milestone
    -- RECEIVED: Map to Receive/Fit-Up milestones
    WHEN 'received' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          -- Spool: Receive = 5%
          v_earned := CASE WHEN (p_milestones->>'Receive')::boolean THEN 5 ELSE 0 END;
          v_total_weight := 5;
        WHEN 'field_weld' THEN
          -- Field Weld: Fit-Up = 10%
          v_earned := CASE WHEN (p_milestones->>'Fit-Up')::boolean THEN 10 ELSE 0 END;
          v_total_weight := 10;
        ELSE
          -- All others (support, valve, fitting, flange, instrument, tubing, hose, misc, threaded_pipe): Receive = 10%
          v_earned := CASE WHEN (p_milestones->>'Receive')::boolean THEN 10 ELSE 0 END;
          v_total_weight := 10;
      END CASE;

    -- INSTALLED: Map to Install/Erect/Connect/Weld Made/Fabricate milestones
    WHEN 'installed' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          -- Spool: Erect (40%) + Connect (40%) = 80%
          v_earned :=
            CASE WHEN (p_milestones->>'Erect')::boolean THEN 40 ELSE 0 END +
            CASE WHEN (p_milestones->>'Connect')::boolean THEN 40 ELSE 0 END;
          v_total_weight := 80;
        WHEN 'field_weld' THEN
          -- Field Weld: Weld Made (60%)
          v_earned := CASE WHEN (p_milestones->>'Weld Made')::boolean THEN 60 ELSE 0 END;
          v_total_weight := 60;
        WHEN 'threaded_pipe' THEN
          -- Threaded Pipe: Partial milestones (Fabricate, Install, Erect, Connect, Support) each 16%
          -- Note: Partial milestones stored as numeric 0-100 in JSONB
          v_earned :=
            COALESCE((p_milestones->>'Fabricate')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Install')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Erect')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Connect')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Support')::numeric, 0) * 0.16;
          v_total_weight := 80;
        ELSE
          -- All others (support, valve, fitting, flange, instrument, tubing, hose, misc): Install (60%)
          v_earned := CASE WHEN (p_milestones->>'Install')::boolean THEN 60 ELSE 0 END;
          v_total_weight := 60;
      END CASE;

    -- PUNCH: Map to Punch Complete/Test Complete milestones
    WHEN 'punch' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          -- Spool: Punch Complete (5%)
          v_earned := CASE WHEN (p_milestones->>'Punch Complete')::boolean THEN 5 ELSE 0 END;
          v_total_weight := 5;
        WHEN 'field_weld' THEN
          -- Field Weld: Repair Complete (10%)
          v_earned := CASE WHEN (p_milestones->>'Repair Complete')::boolean THEN 10 ELSE 0 END;
          v_total_weight := 10;
        WHEN 'instrument' THEN
          -- Instrument: Punch Complete (10%)
          v_earned := CASE WHEN (p_milestones->>'Punch Complete')::boolean THEN 10 ELSE 0 END;
          v_total_weight := 10;
        ELSE
          -- All others: Test Complete (10%)
          v_earned := CASE WHEN (p_milestones->>'Test Complete')::boolean THEN 10 ELSE 0 END;
          v_total_weight := 10;
      END CASE;

    -- TESTED: Map to Test/Hydrotest/NDE milestones
    WHEN 'tested' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          -- Spool: Hydrotest (5%)
          v_earned := CASE WHEN (p_milestones->>'Hydrotest')::boolean THEN 5 ELSE 0 END;
          v_total_weight := 5;
        WHEN 'field_weld' THEN
          -- Field Weld: NDE Final (10%)
          v_earned := CASE WHEN (p_milestones->>'NDE Final')::boolean THEN 10 ELSE 0 END;
          v_total_weight := 10;
        WHEN 'valve' THEN
          -- Valve: Test (10%)
          v_earned := CASE WHEN (p_milestones->>'Test')::boolean THEN 10 ELSE 0 END;
          v_total_weight := 10;
        WHEN 'instrument' THEN
          -- Instrument: Test (10%)
          v_earned := CASE WHEN (p_milestones->>'Test')::boolean THEN 10 ELSE 0 END;
          v_total_weight := 10;
        ELSE
          -- All others: No tested milestone (return 0)
          v_earned := 0;
          v_total_weight := 1; -- Avoid division by zero
      END CASE;

    -- RESTORED: Map to Restore/Insulate/Paint milestones
    WHEN 'restored' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          -- Spool: Restore (5%)
          v_earned := CASE WHEN (p_milestones->>'Restore')::boolean THEN 5 ELSE 0 END;
          v_total_weight := 5;
        WHEN 'field_weld' THEN
          -- Field Weld: Paint (10%)
          v_earned := CASE WHEN (p_milestones->>'Paint')::boolean THEN 10 ELSE 0 END;
          v_total_weight := 10;
        WHEN 'support' THEN
          -- Support: Insulate (10%)
          v_earned := CASE WHEN (p_milestones->>'Insulate')::boolean THEN 10 ELSE 0 END;
          v_total_weight := 10;
        ELSE
          -- All others: Restore (10%)
          v_earned := CASE WHEN (p_milestones->>'Restore')::boolean THEN 10 ELSE 0 END;
          v_total_weight := 10;
      END CASE;

    ELSE
      -- Unknown standard milestone
      RETURN 0;
  END CASE;

  -- Return percentage (earned / total_weight * 100)
  IF v_total_weight > 0 THEN
    RETURN (v_earned / v_total_weight) * 100;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comment for documentation
COMMENT ON FUNCTION calculate_earned_milestone_value IS
'Converts component-specific milestones to standardized milestone percentages for reporting.
Used by vw_progress_by_area, vw_progress_by_system, and vw_progress_by_test_package views.';
