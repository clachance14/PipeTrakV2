-- Migration: Remove invalid Test/Punch/Restore from field_weld milestones
-- Feature: 033-timeline-report-filter
--
-- Previous migration (20251206000306) tried to sync current_milestones with milestone_events,
-- but it didn't handle field_welds that have Test/Punch/Restore values that came from
-- legacy import data (never had milestone_events).
--
-- Problem: 45 field_welds still have Test/Punch/Restore=100 that shouldn't be there.
-- These were imported as legacy booleans, converted to numeric, then scaled to 100.
-- But the user confirmed: these welds should NOT have punch/test/restore complete.
--
-- Fix: For field_welds, remove Test, Punch, and Restore keys from current_milestones.
-- Only keep valid milestones: Fit-up, Weld Complete, Accepted

-- Step 1: Remove invalid milestone keys from field_weld current_milestones
UPDATE components c
SET current_milestones = (
  c.current_milestones
  - 'Test'      -- Remove Test key
  - 'Punch'     -- Remove Punch key
  - 'Restore'   -- Remove Restore key
)
WHERE c.component_type = 'field_weld'
  AND (
    c.current_milestones ? 'Test'
    OR c.current_milestones ? 'Punch'
    OR c.current_milestones ? 'Restore'
  );

-- Step 2: Recalculate percent_complete for all field_welds
UPDATE components c
SET percent_complete = calculate_component_percent(
  c.progress_template_id,
  c.current_milestones,
  c.project_id,
  c.component_type
)
WHERE c.component_type = 'field_weld';

-- Step 3: Also fix the 3 spool components that have mismatched milestones
-- These had rollbacks to value=1 that weren't properly synced
-- The previous migration tried to set value=0 for these, but it didn't work
-- because the milestones still had the old 100 values

-- Get the correct state from events and apply it
WITH latest_events AS (
  SELECT DISTINCT ON (me.component_id, me.milestone_name)
    me.component_id,
    me.milestone_name,
    CASE
      WHEN me.value = 1 THEN 0   -- Rollback to 1 means incomplete (set to 0)
      WHEN me.value = 100 THEN 100
      ELSE me.value
    END AS corrected_value
  FROM milestone_events me
  JOIN components c ON c.id = me.component_id
  WHERE c.component_type = 'spool'
  ORDER BY me.component_id, me.milestone_name, me.created_at DESC
),
correct_milestones AS (
  SELECT
    component_id,
    jsonb_object_agg(milestone_name, corrected_value) AS milestones
  FROM latest_events
  GROUP BY component_id
)
UPDATE components c
SET current_milestones = cm.milestones
FROM correct_milestones cm
WHERE c.id = cm.component_id
  AND c.component_type = 'spool'
  AND c.current_milestones IS DISTINCT FROM cm.milestones;

-- Step 4: Recalculate percent_complete for spools that were updated
UPDATE components c
SET percent_complete = calculate_component_percent(
  c.progress_template_id,
  c.current_milestones,
  c.project_id,
  c.component_type
)
WHERE c.component_type = 'spool'
  AND EXISTS (SELECT 1 FROM milestone_events me WHERE me.component_id = c.id);

-- Verify the fix
DO $$
DECLARE
  v_field_weld_incorrect INTEGER;
  v_spool_mismatch INTEGER;
BEGIN
  -- Count field_welds with Test/Punch/Restore (should be 0)
  SELECT COUNT(*) INTO v_field_weld_incorrect
  FROM components c
  WHERE c.component_type = 'field_weld'
    AND (
      c.current_milestones ? 'Test'
      OR c.current_milestones ? 'Punch'
      OR c.current_milestones ? 'Restore'
    );

  -- Count spools where Erect or Receive = 100 but latest event shows rollback
  SELECT COUNT(*) INTO v_spool_mismatch
  FROM components c
  WHERE c.component_type = 'spool'
    AND EXISTS (
      SELECT 1 FROM milestone_events me
      WHERE me.component_id = c.id
        AND me.value = 1  -- Rollback event
        AND me.created_at = (
          SELECT MAX(me2.created_at)
          FROM milestone_events me2
          WHERE me2.component_id = me.component_id
            AND me2.milestone_name = me.milestone_name
        )
        AND (c.current_milestones->>me.milestone_name)::numeric = 100
    );

  IF v_field_weld_incorrect > 0 THEN
    RAISE WARNING '% field_welds still have Test/Punch/Restore keys', v_field_weld_incorrect;
  ELSE
    RAISE NOTICE 'Success: All field_welds cleaned of invalid milestones';
  END IF;

  IF v_spool_mismatch > 0 THEN
    RAISE WARNING '% spools still have mismatched milestones after rollback', v_spool_mismatch;
  ELSE
    RAISE NOTICE 'Success: All spool rollbacks properly synced';
  END IF;
END $$;
