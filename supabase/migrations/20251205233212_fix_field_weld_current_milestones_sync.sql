-- Migration: Sync Field Weld current_milestones with date_welded
-- Feature: 033-timeline-report-filter
--
-- Problem: Some field_weld components have inconsistent current_milestones:
--   1. Mixed keys: {"Fit-Up":1,"Fit-up":0,"Weld Made":1,"Weld Complete":0}
--      - Old keys (Fit-Up, Weld Made) have values, new keys (Fit-up, Weld Complete) are 0
--   2. Legacy booleans: {"Test":true,"Fit-Up":true,"Weld Made":true,...}
--      - Missing numeric Fit-up and Weld Complete keys entirely
--
-- Root Cause: Migration 20251124191721 renamed keys but didn't sync with date_welded state.
-- Some welds were updated via UI after the rename, creating mixed key states.
--
-- Fix: For all field_welds with date_welded set, ensure current_milestones has:
--   - Fit-up = 1 (numeric)
--   - Weld Complete = 1 (numeric)
-- Remove old keys to prevent confusion.
--
-- Impact: 6 field_weld components will be corrected (13 -> 19 showing as complete)

-- Step 1: Update components where date_welded is set but milestones are wrong
UPDATE components c
SET current_milestones = jsonb_build_object(
  'Fit-up', 1,
  'Weld Complete', CASE WHEN fw.date_welded IS NOT NULL THEN 1 ELSE 0 END,
  'Accepted', CASE WHEN fw.status = 'accepted' THEN 1 ELSE 0 END
)
FROM field_welds fw
WHERE c.id = fw.component_id
  AND c.component_type = 'field_weld'
  AND fw.date_welded IS NOT NULL
  AND (
    -- Condition 1: Weld Complete is not 1
    (c.current_milestones->>'Weld Complete')::numeric IS DISTINCT FROM 1
    OR
    -- Condition 2: Fit-up is not 1
    (c.current_milestones->>'Fit-up')::numeric IS DISTINCT FROM 1
  );

-- Step 2: Also fix any field_welds without date_welded that have stale milestones
-- (milestones showing complete when they shouldn't be)
UPDATE components c
SET current_milestones = jsonb_build_object(
  'Fit-up', 0,
  'Weld Complete', 0,
  'Accepted', CASE WHEN fw.status = 'accepted' THEN 1 ELSE 0 END
)
FROM field_welds fw
WHERE c.id = fw.component_id
  AND c.component_type = 'field_weld'
  AND fw.date_welded IS NULL
  AND (
    (c.current_milestones->>'Weld Complete')::numeric = 1
    OR (c.current_milestones->>'Fit-up')::numeric = 1
  );

-- Verify the fix
DO $$
DECLARE
  v_welded_count INTEGER;
  v_milestone_count INTEGER;
BEGIN
  -- Count field_welds with date_welded
  SELECT COUNT(*) INTO v_welded_count
  FROM field_welds
  WHERE date_welded IS NOT NULL;

  -- Count components with Weld Complete = 1
  SELECT COUNT(*) INTO v_milestone_count
  FROM components c
  JOIN field_welds fw ON fw.component_id = c.id
  WHERE c.component_type = 'field_weld'
    AND (c.current_milestones->>'Weld Complete')::numeric = 1;

  IF v_welded_count = v_milestone_count THEN
    RAISE NOTICE 'Success: % welded field_welds match % components with Weld Complete=1', v_welded_count, v_milestone_count;
  ELSE
    RAISE WARNING 'Mismatch: % welded field_welds but % components with Weld Complete=1', v_welded_count, v_milestone_count;
  END IF;
END $$;
