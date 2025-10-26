-- Migration 00031: Refresh Package Readiness Materialized View
-- Purpose: Populate mv_package_readiness with current data after fixing the query in 00030
--
-- This is a one-time refresh to populate the view immediately after the fix.
-- Normally the view auto-refreshes every 60 seconds via pg_cron.

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_package_readiness;

-- Verification: Check that test packages now show component counts
-- You can verify by running:
-- SELECT package_name, total_components FROM mv_package_readiness ORDER BY package_name;
