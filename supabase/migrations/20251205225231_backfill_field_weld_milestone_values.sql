-- Migration: Backfill Field Weld Milestone Values
-- Feature: 033-timeline-report-filter
--
-- Root Cause: Migration 20251122152612 was supposed to convert all discrete
-- milestone values from 1 to 100, but missed 'Fit-Up' and 'Weld Made'.
-- These field_weld milestones still have value=1 in milestone_events,
-- causing the delta report to calculate them as 1% instead of 100%.
--
-- Impact: 40 field_weld events with value=1 are being treated as 1% complete
-- instead of 100% complete, resulting in delta report showing ~2.3% instead of ~3.75%.

-- Step 1: Backfill milestone_events.value
UPDATE milestone_events
SET value = 100
WHERE value = 1
  AND milestone_name IN ('Fit-Up', 'Weld Made');

-- Step 2: Backfill milestone_events.previous_value
UPDATE milestone_events
SET previous_value = 100
WHERE previous_value = 1
  AND milestone_name IN ('Fit-Up', 'Weld Made');

-- Verify the fix
DO $$
DECLARE
  v_remaining INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_remaining
  FROM milestone_events
  WHERE value = 1
    AND milestone_name IN ('Fit-Up', 'Weld Made');

  IF v_remaining > 0 THEN
    RAISE WARNING '% milestone_events still have value=1 for Fit-Up or Weld Made', v_remaining;
  ELSE
    RAISE NOTICE 'All Fit-Up and Weld Made milestone values successfully converted to 100';
  END IF;
END $$;
