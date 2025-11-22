-- Migration: Refresh package readiness when components are assigned to packages
-- Purpose: Fix package component counts not updating when components are assigned
-- Issue: mv_package_readiness doesn't refresh when test_package_id changes
-- Date: 2025-11-22

-- Add trigger to refresh materialized view when test_package_id changes
CREATE TRIGGER trigger_refresh_package_readiness_on_assignment
AFTER UPDATE OF test_package_id ON components
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_package_readiness_on_component_change();

COMMENT ON TRIGGER trigger_refresh_package_readiness_on_assignment ON components IS
'Refreshes package readiness when components are assigned/unassigned from packages to maintain accurate component counts.';

-- Manually refresh the view to pick up any pending changes
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_package_readiness;
