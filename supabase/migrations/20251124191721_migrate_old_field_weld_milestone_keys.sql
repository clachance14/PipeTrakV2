-- Migration: Migrate Old Field Weld Milestone Keys to New Standard
--
-- Root Cause: Field welds created with old progress template (migration 00009)
--             have incorrect milestone keys that don't match current views
--
-- Old Keys (v1):  'Fit-Up' (capital U), 'Weld Made'
-- New Keys (v2):  'Fit-up' (lowercase u), 'Weld Complete'
--
-- Issue: Views query for 'Fit-up' and 'Weld Complete', but old data has 'Fit-Up' and 'Weld Made'
--        Result: fitup_count = 0, weld_complete_count = 0 even though welds are complete
--
-- Additional Fix: Convert boolean true/false to numeric 1/0 for consistency
--
-- Affected: ~128 field welds in project e34ca1d2-b740-4294-b17c-96fdbc187058
--           and any other projects using old template

DO $$
DECLARE
  v_affected_count INTEGER;
BEGIN
  -- Update components with old milestone keys
  WITH updated AS (
    UPDATE components
    SET current_milestones = (
      -- Start with empty object
      SELECT jsonb_object_agg(
        -- Rename keys
        CASE key
          WHEN 'Fit-Up' THEN 'Fit-up'
          WHEN 'Weld Made' THEN 'Weld Complete'
          ELSE key
        END,
        -- Convert boolean to numeric, pass through numbers
        CASE
          WHEN jsonb_typeof(value) = 'boolean' THEN
            to_jsonb(CASE WHEN value::text::boolean THEN 1 ELSE 0 END)
          WHEN jsonb_typeof(value) = 'number' THEN value
          ELSE to_jsonb(0)  -- Default for unexpected types
        END
      )
      FROM jsonb_each(current_milestones)
    )
    WHERE component_type = 'field_weld'
      AND is_retired = false
      AND (
        current_milestones ? 'Fit-Up'      -- Has old 'Fit-Up' key
        OR current_milestones ? 'Weld Made' -- Has old 'Weld Made' key
        OR jsonb_typeof(current_milestones->'Fit-up') = 'boolean'  -- Has boolean Fit-up
        OR jsonb_typeof(current_milestones->'Weld Complete') = 'boolean'  -- Has boolean Weld Complete
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_affected_count FROM updated;

  RAISE NOTICE 'Migrated % field weld component(s) from old milestone keys to new standard', v_affected_count;
END $$;

-- Verify the fix
DO $$
DECLARE
  v_remaining_old_keys INTEGER;
  v_remaining_booleans INTEGER;
BEGIN
  -- Check for remaining old keys
  SELECT COUNT(*)
  INTO v_remaining_old_keys
  FROM components
  WHERE component_type = 'field_weld'
    AND is_retired = false
    AND (current_milestones ? 'Fit-Up' OR current_milestones ? 'Weld Made');

  -- Check for remaining boolean milestone values
  SELECT COUNT(*)
  INTO v_remaining_booleans
  FROM components
  WHERE component_type = 'field_weld'
    AND is_retired = false
    AND (
      jsonb_typeof(current_milestones->'Fit-up') = 'boolean'
      OR jsonb_typeof(current_milestones->'Weld Complete') = 'boolean'
    );

  IF v_remaining_old_keys > 0 THEN
    RAISE WARNING '% field weld(s) still have old milestone keys (Fit-Up or Weld Made)', v_remaining_old_keys;
  ELSE
    RAISE NOTICE 'All field welds migrated successfully - no old milestone keys remain';
  END IF;

  IF v_remaining_booleans > 0 THEN
    RAISE WARNING '% field weld(s) still have boolean milestone values', v_remaining_booleans;
  ELSE
    RAISE NOTICE 'All milestone values converted to numeric successfully';
  END IF;
END $$;

-- Migration complete: Old milestone keys migrated to new standard
