-- Migration: Backfill delta_mh and category for Dark Knight project
-- Feature: Timeline Report Delta Calculation Fix
--
-- Calculates delta_mh for all existing milestone_events using:
-- delta_mh = budgeted_manhours * (weight/100) * (value_delta/100)

-- Backfill only for Dark Knight project
UPDATE milestone_events
SET
  delta_mh = c.budgeted_manhours * (t.weight / 100.0) * ((COALESCE(milestone_events.value, 0) - COALESCE(milestone_events.previous_value, 0)) / 100.0),
  category = t.category
FROM components c, project_progress_templates t
WHERE milestone_events.component_id = c.id
  AND t.project_id = c.project_id
  AND t.component_type = c.component_type
  AND t.milestone_name = milestone_events.milestone_name
  AND c.project_id = 'e34ca1d2-b740-4294-b17c-96fdbc187058'
  AND milestone_events.delta_mh IS NULL;

-- Log backfill results
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM milestone_events me
  JOIN components c ON c.id = me.component_id
  WHERE c.project_id = 'e34ca1d2-b740-4294-b17c-96fdbc187058'
    AND me.delta_mh IS NOT NULL;

  RAISE NOTICE 'Backfilled % milestone_events with delta_mh values', v_count;
END $$;
