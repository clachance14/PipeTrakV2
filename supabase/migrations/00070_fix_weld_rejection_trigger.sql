-- Migration: Fix weld rejection trigger to use correct column name
-- Date: 2025-10-30
-- Description: Updates handle_weld_rejection() trigger to use 'current_milestones' instead of non-existent 'progress_state'

-- Drop and recreate the trigger function with correct column name
CREATE OR REPLACE FUNCTION handle_weld_rejection()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when nde_result changes to FAIL
  IF NEW.nde_result = 'FAIL' AND (OLD.nde_result IS NULL OR OLD.nde_result != 'FAIL') THEN
    -- Set status to rejected
    NEW.status = 'rejected';

    -- Mark component 100% complete (all milestones true)
    UPDATE components
    SET
      percent_complete = 100,
      current_milestones = (
        SELECT jsonb_object_agg(key, true)
        FROM jsonb_object_keys((
          SELECT milestones_config::jsonb
          FROM progress_templates
          WHERE component_type = 'field_weld'
          LIMIT 1
        )) AS key
      )
    WHERE id = NEW.component_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comment documenting the fix
COMMENT ON FUNCTION handle_weld_rejection() IS 'Trigger function to handle NDE FAIL: sets status to rejected and marks all milestones complete. Fixed to use current_milestones column.';
