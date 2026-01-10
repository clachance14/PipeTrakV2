-- Migration: Update mv_package_readiness with test_ready_percent metric
-- Purpose: Add Test Ready calculation that excludes post-hydro components
--
-- New columns:
--   testable_components: Count of components where post_hydro_install = FALSE
--   post_hydro_components: Count of components where post_hydro_install = TRUE
--   test_ready_percent: % of testable components at 100% complete

-- ============================================================================
-- Part 1: Drop and Recreate mv_package_readiness with Test Ready Columns
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS mv_package_readiness CASCADE;

CREATE MATERIALIZED VIEW mv_package_readiness AS
SELECT
  tp.id AS package_id,
  tp.project_id,
  tp.name AS package_name,
  tp.description,
  tp.target_date,
  -- Existing counts
  COUNT(c.id) AS total_components,
  COUNT(c.id) FILTER (WHERE c.percent_complete = 100) AS completed_components,
  COALESCE(AVG(c.percent_complete), 0) AS avg_percent_complete,
  COUNT(nr.id) FILTER (WHERE nr.status = 'pending') AS blocker_count,
  MAX(c.last_updated_at) AS last_activity_at,
  -- NEW: Test Ready metrics
  COUNT(c.id) FILTER (WHERE NOT c.post_hydro_install) AS testable_components,
  COUNT(c.id) FILTER (WHERE c.post_hydro_install) AS post_hydro_components,
  -- Test Ready % = (testable components at 100%) / (total testable components) * 100
  CASE
    WHEN COUNT(c.id) FILTER (WHERE NOT c.post_hydro_install) = 0 THEN 100
    ELSE (
      COUNT(c.id) FILTER (WHERE NOT c.post_hydro_install AND c.percent_complete = 100)::numeric
      / NULLIF(COUNT(c.id) FILTER (WHERE NOT c.post_hydro_install), 0) * 100
    )
  END AS test_ready_percent
FROM test_packages tp
LEFT JOIN (
  -- Subquery: Pre-join components with their drawings to get drawing.test_package_id
  SELECT
    c.id,
    c.project_id,
    c.test_package_id,
    c.percent_complete,
    c.last_updated_at,
    c.post_hydro_install,  -- NEW: Include post_hydro_install in subquery
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

-- ============================================================================
-- Part 3: Update Comment
-- ============================================================================

COMMENT ON MATERIALIZED VIEW mv_package_readiness IS
'Pre-computed aggregation of test package metrics including Test Ready percentage.
Counts both directly assigned components (component.test_package_id = package_id) and inherited components (component.test_package_id IS NULL AND drawing.test_package_id = package_id).
Test Ready excludes components marked as post_hydro_install=TRUE.
Updated via refresh_materialized_views() RPC or pg_cron every 60s.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Added: testable_components, post_hydro_components, test_ready_percent
-- Test Ready = % of non-post-hydro components that are 100% complete
-- ============================================================================
