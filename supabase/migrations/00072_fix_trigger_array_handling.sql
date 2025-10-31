-- Migration: Fix weld rejection trigger to handle milestones_config as array
-- Date: 2025-10-30
-- Description: Updates trigger to use jsonb_array_elements() instead of jsonb_object_keys() since milestones_config is an array

-- Fix handle_weld_rejection() to handle array structure
CREATE OR REPLACE FUNCTION handle_weld_rejection()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when nde_result changes to FAIL
  IF NEW.nde_result = 'FAIL' AND (OLD.nde_result IS NULL OR OLD.nde_result != 'FAIL') THEN
    -- Set status to rejected
    NEW.status = 'rejected';

    -- Mark component 100% complete (all milestones true)
    -- Extract milestone names from array and set all to true
    UPDATE components
    SET
      percent_complete = 100,
      current_milestones = (
        SELECT jsonb_object_agg(milestone->>'name', true)
        FROM jsonb_array_elements((
          SELECT milestones_config
          FROM progress_templates
          WHERE component_type = 'field_weld'
          LIMIT 1
        )) AS milestone
      )
    WHERE id = NEW.component_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comment documenting the fix
COMMENT ON FUNCTION handle_weld_rejection() IS 'Trigger function to handle NDE FAIL: sets status to rejected and marks all milestones complete. Uses jsonb_array_elements to handle array structure.';
