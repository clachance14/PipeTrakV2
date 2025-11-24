-- Migration: Fix calculate_earned_milestone_value for Numeric Field Weld Milestones
--
-- Issue: Function expects boolean milestone values, but field welds now use numeric (0/1)
--        Also using old milestone keys ('Fit-Up', 'Weld Made') instead of new ('Fit-up', 'Weld Complete')
--
-- Error: "invalid input syntax for type boolean: "1"" when casting numeric to boolean
--
-- Fix: Update field_weld cases to:
--      1. Use new milestone keys ('Fit-up', 'Weld Complete')
--      2. Cast to numeric and check = 1 instead of casting to boolean
--
-- Other component types still use boolean milestones (no change needed)

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
    -- RECEIVED: Map to Receive/Fit-up milestones
    WHEN 'received' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          -- Spool: Receive = 5%
          v_earned := CASE WHEN (p_milestones->>'Receive')::boolean THEN 5 ELSE 0 END;
          v_total_weight := 5;
        WHEN 'field_weld' THEN
          -- Field Weld: Fit-up = 30% (FIXED: Use new key 'Fit-up' and numeric check)
          v_earned := CASE WHEN COALESCE((p_milestones->>'Fit-up')::numeric, 0) = 1 THEN 30 ELSE 0 END;
          v_total_weight := 30;
        ELSE
          -- All others (support, valve, fitting, flange, instrument, tubing, hose, misc, threaded_pipe): Receive = 10%
          v_earned := CASE WHEN (p_milestones->>'Receive')::boolean THEN 10 ELSE 0 END;
          v_total_weight := 10;
      END CASE;

    -- INSTALLED: Map to Install/Erect/Connect/Weld Complete/Fabricate milestones
    WHEN 'installed' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          -- Spool: Erect (40%) + Connect (40%) = 80%
          v_earned :=
            CASE WHEN (p_milestones->>'Erect')::boolean THEN 40 ELSE 0 END +
            CASE WHEN (p_milestones->>'Connect')::boolean THEN 40 ELSE 0 END;
          v_total_weight := 80;
        WHEN 'field_weld' THEN
          -- Field Weld: Weld Complete = 65% (FIXED: Use new key 'Weld Complete' and numeric check)
          v_earned := CASE WHEN COALESCE((p_milestones->>'Weld Complete')::numeric, 0) = 1 THEN 65 ELSE 0 END;
          v_total_weight := 65;
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

    -- PUNCH: Map to Punch Complete/Test Complete/Accepted milestones
    WHEN 'punch' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          -- Spool: Punch Complete (5%)
          v_earned := CASE WHEN (p_milestones->>'Punch Complete')::boolean THEN 5 ELSE 0 END;
          v_total_weight := 5;
        WHEN 'field_weld' THEN
          -- Field Weld: Accepted = 5% (FIXED: Use new key 'Accepted' and numeric check)
          v_earned := CASE WHEN COALESCE((p_milestones->>'Accepted')::numeric, 0) = 1 THEN 5 ELSE 0 END;
          v_total_weight := 5;
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
          -- Field Weld: No tested milestone for new template (return 0)
          v_earned := 0;
          v_total_weight := 1;
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
          -- Field Weld: No restored milestone for new template (return 0)
          v_earned := 0;
          v_total_weight := 1;
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

-- Migration complete: Function updated for numeric field weld milestones
