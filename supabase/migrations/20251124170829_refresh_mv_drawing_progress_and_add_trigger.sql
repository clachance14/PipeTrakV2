-- Migration: Refresh mv_drawing_progress and add auto-refresh trigger
-- Problem: Materialized view was STALE - components had correct percent_complete
--          but mv_drawing_progress showed 0% because it was never refreshed after
--          migration 20251124165954 fixed the calculate_component_percent function.
-- Solution: 1. Refresh the view now (fixes current data)
--          2. Add trigger to auto-refresh when components update (prevents future staleness)

-- Step 1: Refresh the materialized view to reflect current component percent_complete values
REFRESH MATERIALIZED VIEW mv_drawing_progress;

-- Step 2: Drop existing function if it exists and create new trigger function
DROP FUNCTION IF EXISTS refresh_mv_drawing_progress();

CREATE OR REPLACE FUNCTION refresh_mv_drawing_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh the materialized view
  -- Note: This is called AFTER each component update, so performance should be monitored
  --       If this becomes slow with many concurrent updates, consider:
  --       1. REFRESH MATERIALIZED VIEW CONCURRENTLY (requires unique index)
  --       2. Batched refresh via pg_cron or scheduled job
  REFRESH MATERIALIZED VIEW mv_drawing_progress;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger on components table to auto-refresh the view
CREATE TRIGGER trigger_refresh_mv_drawing_progress
AFTER UPDATE OF percent_complete ON components
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_mv_drawing_progress();

COMMENT ON FUNCTION refresh_mv_drawing_progress() IS
'Refreshes mv_drawing_progress materialized view. Called by trigger after component percent_complete updates.';

COMMENT ON TRIGGER trigger_refresh_mv_drawing_progress ON components IS
'Auto-refreshes mv_drawing_progress when component percent_complete is updated.';
