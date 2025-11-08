-- Migration: Fix repair weld trigger to use correct column name
-- Date: 2025-10-30
-- Description: Updates auto_start_repair_welds() trigger to use 'current_milestones' instead of 'progress_state'

-- Drop and recreate the trigger function with correct column name
CREATE OR REPLACE FUNCTION auto_start_repair_welds()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for repair welds (original_weld_id NOT NULL)
  IF NEW.original_weld_id IS NOT NULL THEN
    -- Mark "Fit-Up" milestone complete on component (30%)
    UPDATE components
    SET
      percent_complete = 30,
      current_milestones = jsonb_set(
        COALESCE(current_milestones, '{}'::jsonb),
        '{Fit-Up}',
        'true'::jsonb
      )
    WHERE id = NEW.component_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comment documenting the fix
COMMENT ON FUNCTION auto_start_repair_welds() IS 'Trigger function to auto-start repair welds at 30% completion (Fit-Up milestone). Fixed to use current_milestones column.';
