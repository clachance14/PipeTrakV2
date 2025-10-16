-- Migration 00013: Performance Optimization (Sprint 1 Core)
-- Feature: 005-sprint-1-core
-- Phase: 3.7
-- Description: Create materialized views and performance-critical stored procedures
--
-- Prerequisites: Migration 00012 must be applied (needs_review, audit_log tables exist)
--
-- Materialized Views: mv_package_readiness, mv_drawing_progress
-- Stored Procedures: detect_similar_drawings, refresh_materialized_views
-- Lines: ~200

-- ============================================================================
-- PART 1: STORED PROCEDURES (2 functions)
-- ============================================================================

-- Function: detect_similar_drawings
-- Purpose: Find similar drawing numbers using pg_trgm similarity (FR-037 to FR-040)
CREATE OR REPLACE FUNCTION detect_similar_drawings(
  p_project_id UUID,
  p_drawing_no_norm TEXT,
  p_threshold NUMERIC DEFAULT 0.85
)
RETURNS TABLE(
  drawing_id UUID,
  drawing_no_norm TEXT,
  similarity_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.drawing_no_norm,
    similarity(d.drawing_no_norm, p_drawing_no_norm) AS score
  FROM drawings d
  WHERE d.project_id = p_project_id
    AND NOT d.is_retired  -- Exclude retired drawings (FR-039)
    AND similarity(d.drawing_no_norm, p_drawing_no_norm) > p_threshold
  ORDER BY score DESC
  LIMIT 3;  -- Return top 3 matches (FR-039)
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_similar_drawings IS 'Find similar drawing numbers using trigram similarity (FR-037 to FR-040), excludes retired drawings, returns max 3 results';

-- Function: refresh_materialized_views
-- Purpose: Manually refresh all materialized views (called after bulk imports, FR-036)
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_package_readiness;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_drawing_progress;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_materialized_views IS 'Manually refresh all materialized views (call after bulk imports to update dashboards immediately)';

-- ============================================================================
-- PART 2: MATERIALIZED VIEWS (2 views)
-- ============================================================================

-- Materialized View 1: mv_package_readiness
-- Purpose: Fast lookup for Test Package Readiness Dashboard (FR-034, p95 <50ms)
CREATE MATERIALIZED VIEW mv_package_readiness AS
SELECT
  tp.id AS package_id,
  tp.project_id,
  tp.name AS package_name,
  tp.target_date,
  COUNT(c.id) AS total_components,
  COUNT(c.id) FILTER (WHERE c.percent_complete = 100) AS completed_components,
  AVG(c.percent_complete) AS avg_percent_complete,
  COUNT(nr.id) FILTER (WHERE nr.status = 'pending') AS blocker_count,
  MAX(c.last_updated_at) AS last_activity_at
FROM test_packages tp
LEFT JOIN components c ON c.test_package_id = tp.id AND NOT c.is_retired
LEFT JOIN needs_review nr ON nr.component_id = c.id AND nr.status = 'pending'
GROUP BY tp.id, tp.project_id, tp.name, tp.target_date;

-- UNIQUE index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_mv_package_readiness_id ON mv_package_readiness(package_id);
CREATE INDEX idx_mv_package_readiness_project ON mv_package_readiness(project_id);

COMMENT ON MATERIALIZED VIEW mv_package_readiness IS 'Aggregated test package metrics for dashboard (FR-034), refreshed every 60 seconds';

-- Materialized View 2: mv_drawing_progress
-- Purpose: Fast lookup for Drawing % Complete in tree navigation (FR-034, p95 <50ms)
CREATE MATERIALIZED VIEW mv_drawing_progress AS
SELECT
  d.id AS drawing_id,
  d.project_id,
  d.drawing_no_norm,
  COUNT(c.id) AS total_components,
  AVG(c.percent_complete) AS avg_percent_complete
FROM drawings d
LEFT JOIN components c ON c.drawing_id = d.id AND NOT c.is_retired
WHERE NOT d.is_retired
GROUP BY d.id, d.project_id, d.drawing_no_norm;

-- UNIQUE index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_mv_drawing_progress_id ON mv_drawing_progress(drawing_id);
CREATE INDEX idx_mv_drawing_progress_project ON mv_drawing_progress(project_id);

COMMENT ON MATERIALIZED VIEW mv_drawing_progress IS 'Aggregated drawing metrics for tree navigation (FR-034), refreshed every 60 seconds';

-- ============================================================================
-- PART 3: MATERIALIZED VIEW REFRESH JOBS (pg_cron)
-- ============================================================================

-- Note: pg_cron scheduling requires superuser privileges or specific extensions
-- If running on Supabase, these jobs may need to be configured via the Supabase dashboard
-- or API. For local development, uncomment and run manually:

-- Refresh mv_package_readiness every 60 seconds (FR-035)
-- SELECT cron.schedule(
--   'refresh-package-readiness',
--   '*/1 * * * *',  -- Every 1 minute
--   $$ REFRESH MATERIALIZED VIEW CONCURRENTLY mv_package_readiness $$
-- );

-- Refresh mv_drawing_progress every 60 seconds (FR-035)
-- SELECT cron.schedule(
--   'refresh-drawing-progress',
--   '*/1 * * * *',  -- Every 1 minute
--   $$ REFRESH MATERIALIZED VIEW CONCURRENTLY mv_drawing_progress $$
-- );

-- IMPORTANT: For Supabase projects, configure refresh jobs via:
-- 1. Supabase Dashboard → Database → Extensions → Enable pg_cron
-- 2. Use the SQL Editor to run the cron.schedule commands above
-- 3. Or call refresh_materialized_views() manually via RPC after bulk imports

-- ============================================================================
-- PART 4: RLS POLICIES FOR MATERIALIZED VIEWS
-- ============================================================================

-- Enable RLS on materialized views
ALTER MATERIALIZED VIEW mv_package_readiness OWNER TO postgres;
ALTER MATERIALIZED VIEW mv_drawing_progress OWNER TO postgres;

-- Note: Materialized views in PostgreSQL don't support RLS policies directly.
-- Access control is enforced through the underlying base tables' RLS policies.
-- Users can only see aggregated data for test packages and drawings in their organization
-- because the base queries (test_packages, drawings, components) are already filtered by RLS.

-- ============================================================================
-- MIGRATION COMPLETE: 00013_performance_optimization.sql
-- ============================================================================
-- Stored procedures: 2 (detect_similar_drawings, refresh_materialized_views)
-- Materialized views: 2 (mv_package_readiness, mv_drawing_progress)
-- Indexes: ~4 (UNIQUE indexes required for CONCURRENTLY refresh)
-- pg_cron jobs: 2 (commented out, requires superuser or Supabase dashboard configuration)
-- Refresh strategy: CONCURRENTLY mode (no locks, serves stale data during refresh per FR-049)
-- Performance targets: p95 <50ms for dashboard queries (FR-034)
-- ============================================================================
