-- Migration: Auto-refresh materialized view mv_package_readiness
-- Purpose: Fix stale package progress data by automatically refreshing when component progress changes
-- Related Issue: Package overall progress shows incorrect percentage (87% when all components are 100%)
-- Date: 2025-11-12

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_refresh_package_readiness ON components;
DROP FUNCTION IF EXISTS refresh_package_readiness_on_component_change();

-- Create function to refresh materialized view
-- This function will be called by a trigger whenever component progress changes
CREATE OR REPLACE FUNCTION refresh_package_readiness_on_component_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use CONCURRENTLY to avoid locking the view during refresh
  -- This allows reads to continue while the view is being refreshed
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_package_readiness;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    -- This ensures component updates succeed even if view refresh fails
    RAISE WARNING 'Failed to refresh mv_package_readiness: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION refresh_package_readiness_on_component_change() IS
'Automatically refreshes the mv_package_readiness materialized view when component progress changes. Uses CONCURRENTLY to avoid locking.';

-- Create trigger to call the function after component updates
-- Trigger fires only when percent_complete or current_milestones changes
CREATE TRIGGER trigger_refresh_package_readiness
AFTER UPDATE OF percent_complete, current_milestones ON components
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_package_readiness_on_component_change();

-- Add comment explaining the trigger
COMMENT ON TRIGGER trigger_refresh_package_readiness ON components IS
'Refreshes package readiness materialized view when component progress changes to ensure real-time accuracy.';

-- Also refresh on component retirement status changes (affects package counts)
CREATE TRIGGER trigger_refresh_package_readiness_on_retire
AFTER UPDATE OF is_retired ON components
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_package_readiness_on_component_change();

COMMENT ON TRIGGER trigger_refresh_package_readiness_on_retire ON components IS
'Refreshes package readiness when components are retired/unretired to maintain accurate counts.';

-- Verify the triggers were created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_refresh_package_readiness'
  ) THEN
    RAISE EXCEPTION 'trigger_refresh_package_readiness was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_refresh_package_readiness_on_retire'
  ) THEN
    RAISE EXCEPTION 'trigger_refresh_package_readiness_on_retire was not created';
  END IF;

  RAISE NOTICE 'Package readiness auto-refresh triggers created successfully';
END $$;
