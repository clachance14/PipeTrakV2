-- Migration: Fix Fit-up Milestone Data
--
-- Issue: Migration 20251120215000 was applied with a bug that set Fit-up=1
--        for ALL field welds unconditionally, causing incorrect counts in reports.
--        The report shows 115 welds complete when only 13 are actually welded.
--
-- Fix: Update all field weld components to set correct milestone values:
--   - Fit-up = 1 only if date_welded IS NOT NULL (weld has been made)
--   - Weld Complete = 1 only if date_welded IS NOT NULL
--   - Accepted = 1 only if status = 'accepted'
--   - percent_complete = 0 for unwelded (was incorrectly set to 30)

-- Update field weld components with corrected milestone logic
UPDATE components c
SET
  current_milestones = jsonb_build_object(
    'Fit-up', CASE
      WHEN fw.date_welded IS NOT NULL THEN 1
      ELSE 0
    END,
    'Weld Complete', CASE
      WHEN fw.date_welded IS NOT NULL THEN 1
      ELSE 0
    END,
    'Accepted', CASE
      WHEN fw.status = 'accepted' THEN 1
      ELSE 0
    END
  ),
  percent_complete = CASE
    WHEN fw.status = 'accepted' THEN 100
    WHEN fw.date_welded IS NOT NULL THEN 95
    ELSE 0
  END
FROM field_welds fw
WHERE c.id = fw.component_id
  AND c.component_type = 'field_weld';
