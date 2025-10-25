-- Migration 00029: Fix Package Readiness Materialized View Join
-- Purpose: Fix mv_package_readiness to correctly count inherited components
--
-- Problem: Migration 00028 used a correlated subquery in the JOIN condition:
--   COALESCE(c.test_package_id, (SELECT d.test_package_id FROM drawings d WHERE d.id = c.drawing_id))
--   This doesn't work reliably in PostgreSQL and fails to match inherited components.
--
-- Solution: Explicitly join drawings table and use COALESCE without subquery
--
-- Impact: Test packages assigned to drawings will now correctly show component counts

-- ============================================================================
-- Part 1: Drop and Recreate mv_package_readiness with Fixed Query
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS mv_package_readiness CASCADE;

CREATE MATERIALIZED VIEW mv_package_readiness AS
SELECT
  tp.id AS package_id,
  tp.project_id,
  tp.name AS package_name,
  tp.description,
  tp.target_date,
  COUNT(c.id) AS total_components,
  COUNT(c.id) FILTER (WHERE c.percent_complete = 100) AS completed_components,
  AVG(c.percent_complete) AS avg_percent_complete,
  COUNT(nr.id) FILTER (WHERE nr.status = 'pending') AS blocker_count,
  MAX(c.last_updated_at) AS last_activity_at
FROM test_packages tp
LEFT JOIN (
  -- Subquery: Pre-join components with their drawings to get drawing.test_package_id
  SELECT
    c.id,
    c.project_id,
    c.test_package_id,
    c.percent_complete,
    c.last_updated_at,
    d.test_package_id AS drawing_test_package_id
  FROM components c
  INNER JOIN drawings d ON d.id = c.drawing_id
  WHERE NOT c.is_retired
) c ON (
  -- Component matches if:
  -- 1. Directly assigned: c.test_package_id = tp.id
  -- 2. Inherited: c.test_package_id IS NULL AND drawing.test_package_id = tp.id
  c.test_package_id = tp.id
  OR (c.test_package_id IS NULL AND c.drawing_test_package_id = tp.id)
)
LEFT JOIN needs_review nr ON nr.component_id = c.id AND nr.status = 'pending'
GROUP BY tp.id, tp.project_id, tp.name, tp.description, tp.target_date;

-- ============================================================================
-- Part 2: Recreate Indexes (required after DROP)
-- ============================================================================

CREATE UNIQUE INDEX idx_mv_package_readiness_id ON mv_package_readiness(package_id);
CREATE INDEX idx_mv_package_readiness_project ON mv_package_readiness(project_id);

COMMENT ON MATERIALIZED VIEW mv_package_readiness IS
'Pre-computed aggregation of test package metrics. Counts both directly assigned components (component.test_package_id = package_id) and inherited components (component.test_package_id IS NULL AND drawing.test_package_id = package_id). Uses explicit JOIN instead of correlated subquery for reliability. Updated via refresh_materialized_views() RPC or pg_cron every 60s.';

-- ============================================================================
-- MIGRATION COMPLETE: 00029_fix_package_readiness_join.sql
-- ============================================================================
-- Fixed: Correlated subquery replaced with explicit JOIN
-- Impact: Test package assignments to drawings now correctly count inherited components
-- Next: Run "SELECT refresh_materialized_views();" to populate with current data
-- ============================================================================
