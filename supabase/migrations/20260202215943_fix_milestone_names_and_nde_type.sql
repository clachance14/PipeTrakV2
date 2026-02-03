-- Migration: Fix milestone names in auto_start_repair_welds() trigger
-- Purpose: Fix 'Fit-Up' → 'Fit-up' (correct case from progress_templates)
--          Fix 'true' → '100' (milestones use numeric 100/0 scale)
-- Bug: Repair welds were being created with wrong milestone key and boolean value

-- ============================================================================
-- FIX auto_start_repair_welds() TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_start_repair_welds()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for repair welds (original_weld_id NOT NULL)
  IF NEW.original_weld_id IS NOT NULL THEN
    -- Mark "Fit-up" milestone complete on component (30%)
    UPDATE components
    SET
      percent_complete = 30,
      current_milestones = jsonb_set(
        COALESCE(current_milestones, '{}'::jsonb),
        '{Fit-up}',
        '100'::jsonb
      )
    WHERE id = NEW.component_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_start_repair_welds() IS 'Trigger function to auto-start repair welds at 30% completion (Fit-up milestone). Fixed milestone name case and value scale (100 not true).';
