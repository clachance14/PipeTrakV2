-- Migration 00084: Convert boolean milestone values to numeric
-- Bug Fix: update_component_milestone RPC 400 error when assigning welders
-- Created: 2025-11-08
--
-- Context:
-- The original schema design (00010) used boolean values for discrete milestones,
-- but the RPC function (00018) expects numeric values (1/0) for calculations.
-- This migration converts all boolean milestone values to numeric to fix the
-- "invalid input syntax for type numeric: 'true'" error.
--
-- Affected: 22 components (mostly field_welds)

-- ============================================================================
-- PART 1: CREATE CONVERSION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION convert_milestone_booleans_to_numeric()
RETURNS TABLE (
  component_id UUID,
  old_milestones JSONB,
  new_milestones JSONB
) AS $$
DECLARE
  v_component RECORD;
  v_milestone_key TEXT;
  v_milestone_value JSONB;
  v_new_milestones JSONB;
  v_changed BOOLEAN;
BEGIN
  -- Iterate through all components with non-empty milestones
  FOR v_component IN
    SELECT id, current_milestones
    FROM components
    WHERE current_milestones IS NOT NULL
      AND current_milestones != '{}'::JSONB
  LOOP
    v_new_milestones := '{}'::JSONB;
    v_changed := FALSE;

    -- Iterate through each milestone in current_milestones
    FOR v_milestone_key, v_milestone_value IN
      SELECT * FROM jsonb_each(v_component.current_milestones)
    LOOP
      -- Check if value is a boolean
      IF jsonb_typeof(v_milestone_value) = 'boolean' THEN
        -- Convert boolean to numeric: true→1, false→0
        IF v_milestone_value = 'true'::JSONB THEN
          v_new_milestones := jsonb_set(
            v_new_milestones,
            ARRAY[v_milestone_key],
            '1'::JSONB
          );
        ELSE
          v_new_milestones := jsonb_set(
            v_new_milestones,
            ARRAY[v_milestone_key],
            '0'::JSONB
          );
        END IF;
        v_changed := TRUE;
      ELSE
        -- Keep numeric/other values as-is
        v_new_milestones := jsonb_set(
          v_new_milestones,
          ARRAY[v_milestone_key],
          v_milestone_value
        );
      END IF;
    END LOOP;

    -- If any milestones were converted, update the component
    IF v_changed THEN
      UPDATE components
      SET current_milestones = v_new_milestones
      WHERE id = v_component.id;

      -- Return conversion record for logging
      RETURN QUERY SELECT
        v_component.id,
        v_component.current_milestones,
        v_new_milestones;
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 2: EXECUTE CONVERSION
-- ============================================================================

-- Run the conversion and log results
DO $$
DECLARE
  v_count INTEGER := 0;
  v_record RECORD;
BEGIN
  RAISE NOTICE 'Starting boolean to numeric milestone conversion...';

  -- Execute conversion and count affected components
  FOR v_record IN
    SELECT * FROM convert_milestone_booleans_to_numeric()
  LOOP
    v_count := v_count + 1;
    RAISE NOTICE 'Converted component %: % → %',
      v_record.component_id,
      v_record.old_milestones,
      v_record.new_milestones;
  END LOOP;

  RAISE NOTICE 'Conversion complete. % components updated.', v_count;
END;
$$;

-- ============================================================================
-- PART 3: VERIFY CONVERSION
-- ============================================================================

-- Verify no boolean values remain
DO $$
DECLARE
  v_boolean_count INTEGER;
BEGIN
  -- Count components with boolean milestone values
  SELECT COUNT(*) INTO v_boolean_count
  FROM components,
       LATERAL jsonb_each(current_milestones) AS milestone
  WHERE jsonb_typeof(milestone.value) = 'boolean';

  IF v_boolean_count > 0 THEN
    RAISE WARNING 'Verification failed: % components still have boolean milestone values', v_boolean_count;
  ELSE
    RAISE NOTICE 'Verification passed: All milestone values are numeric';
  END IF;
END;
$$;

-- ============================================================================
-- PART 4: CLEANUP
-- ============================================================================

-- Drop the conversion function (no longer needed)
DROP FUNCTION IF EXISTS convert_milestone_booleans_to_numeric();

-- Add comment for documentation
COMMENT ON COLUMN components.current_milestones IS
  'Milestone state: discrete milestones use numeric 1 (complete) or 0 (incomplete), partial milestones use 0-100 percentage. Example: {"Receive": 1, "Fabricate": 75.50}';
