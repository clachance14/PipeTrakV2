-- Migration: Sync current_milestones with milestone_events
-- Feature: 033-timeline-report-filter
--
-- Problem 1: 13 field_welds have Test, Punch, and Restore marked as complete (value=100)
-- but these milestones were never actually completed. They came from legacy boolean data
-- that was converted by migration 00084 and scaled up by 20251205234314.
--
-- Problem 2: Some components (e.g., spool N-26K02-SPOOL1) show current_milestones=100
-- but the latest milestone_event shows a rollback to value=1. The rollback wasn't
-- properly synced to current_milestones.
--
-- Fix: Rebuild current_milestones for ALL components from their milestone_events.
-- This ensures current_milestones reflects the actual latest state.

-- Step 1: Build correct current_milestones from milestone_events for ALL components
-- For each component, get the latest value for each milestone from events
WITH latest_events AS (
  SELECT DISTINCT ON (me.component_id, me.milestone_name)
    me.component_id,
    me.milestone_name,
    me.value
  FROM milestone_events me
  ORDER BY me.component_id, me.milestone_name, me.created_at DESC
),
correct_milestones AS (
  SELECT
    component_id,
    jsonb_object_agg(
      milestone_name,
      -- Convert old scale (1) to new scale (100) for discrete milestones
      -- This handles cases where rollback set value to 1 instead of 0
      CASE
        WHEN value = 1 THEN 0  -- Rolled back = not complete
        WHEN value = 100 THEN 100  -- Complete
        ELSE value  -- Keep partial values as-is
      END
    ) AS milestones
  FROM latest_events
  GROUP BY component_id
)
UPDATE components c
SET current_milestones = cm.milestones
FROM correct_milestones cm
WHERE c.id = cm.component_id
  -- Only update if different (to avoid unnecessary triggers)
  AND c.current_milestones IS DISTINCT FROM cm.milestones;

-- Step 2: Recalculate percent_complete for all components that have milestone_events
UPDATE components c
SET percent_complete = calculate_component_percent(
  c.progress_template_id,
  c.current_milestones,
  c.project_id,
  c.component_type
)
WHERE EXISTS (
  SELECT 1 FROM milestone_events me WHERE me.component_id = c.id
);

-- Verify the fix
DO $$
DECLARE
  v_field_weld_incorrect INTEGER;
  v_spool_mismatch INTEGER;
  v_total_synced INTEGER;
BEGIN
  -- Count field_welds with Test/Punch/Restore at 100 (should be 0)
  SELECT COUNT(*) INTO v_field_weld_incorrect
  FROM components c
  WHERE c.component_type = 'field_weld'
    AND (
      (c.current_milestones->>'Test')::numeric = 100
      OR (c.current_milestones->>'Punch')::numeric = 100
      OR (c.current_milestones->>'Restore')::numeric = 100
    );

  -- Count any component where current_milestones doesn't match latest events
  WITH latest_events AS (
    SELECT DISTINCT ON (me.component_id, me.milestone_name)
      me.component_id,
      me.milestone_name,
      CASE
        WHEN me.value = 1 THEN 0
        WHEN me.value = 100 THEN 100
        ELSE me.value
      END AS value
    FROM milestone_events me
    ORDER BY me.component_id, me.milestone_name, me.created_at DESC
  ),
  expected AS (
    SELECT component_id, jsonb_object_agg(milestone_name, value) AS milestones
    FROM latest_events
    GROUP BY component_id
  )
  SELECT COUNT(*) INTO v_spool_mismatch
  FROM components c
  JOIN expected e ON e.component_id = c.id
  WHERE c.current_milestones IS DISTINCT FROM e.milestones;

  SELECT COUNT(*) INTO v_total_synced
  FROM components c
  WHERE EXISTS (SELECT 1 FROM milestone_events me WHERE me.component_id = c.id);

  IF v_field_weld_incorrect > 0 THEN
    RAISE WARNING '% field_welds still have incorrect Test/Punch/Restore milestones', v_field_weld_incorrect;
  END IF;

  IF v_spool_mismatch > 0 THEN
    RAISE WARNING '% components still have mismatched current_milestones', v_spool_mismatch;
  ELSE
    RAISE NOTICE 'Success: All % components synced with milestone_events', v_total_synced;
  END IF;
END $$;
