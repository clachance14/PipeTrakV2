-- Migration 00023: Update Materialized View with Drawing Metadata
-- Feature: Drawing Table Polish
-- Description: Recreate mv_drawing_progress to include area, system, test_package joins
--
-- This migration drops and recreates the mv_drawing_progress materialized view
-- to include metadata fields (area_id, system_id, test_package_id) from the
-- drawings table.

-- ============================================================================
-- PART 1: DROP EXISTING MATERIALIZED VIEW
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS mv_drawing_progress CASCADE;

-- ============================================================================
-- PART 2: RECREATE MATERIALIZED VIEW WITH METADATA
-- ============================================================================

CREATE MATERIALIZED VIEW mv_drawing_progress AS
SELECT
  d.id AS drawing_id,
  d.project_id,
  d.drawing_no_norm,
  d.area_id,
  d.system_id,
  d.test_package_id,
  COUNT(c.id) AS total_components,
  COUNT(CASE WHEN c.percent_complete = 100 THEN 1 END) AS completed_components,
  AVG(c.percent_complete) AS avg_percent_complete
FROM drawings d
LEFT JOIN components c ON c.drawing_id = d.id AND NOT c.is_retired
WHERE NOT d.is_retired
GROUP BY d.id, d.project_id, d.drawing_no_norm, d.area_id, d.system_id, d.test_package_id;

COMMENT ON MATERIALIZED VIEW mv_drawing_progress IS 'Aggregated drawing metrics with metadata for table display, refreshed every 60 seconds';

-- ============================================================================
-- PART 3: RECREATE INDEXES
-- ============================================================================

-- UNIQUE index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_mv_drawing_progress_id ON mv_drawing_progress(drawing_id);
CREATE INDEX idx_mv_drawing_progress_project ON mv_drawing_progress(project_id);

-- Additional indexes for filtering by metadata
CREATE INDEX idx_mv_drawing_progress_area ON mv_drawing_progress(area_id) WHERE area_id IS NOT NULL;
CREATE INDEX idx_mv_drawing_progress_system ON mv_drawing_progress(system_id) WHERE system_id IS NOT NULL;
CREATE INDEX idx_mv_drawing_progress_test_package ON mv_drawing_progress(test_package_id) WHERE test_package_id IS NOT NULL;

-- ============================================================================
-- MIGRATION COMPLETE: 00023_update_mv_drawing_progress_with_metadata.sql
-- ============================================================================
-- Materialized view recreated with 3 new columns (area_id, system_id, test_package_id)
-- Indexes recreated: 5 total (2 original + 3 new for metadata filtering)
-- Performance: Partial indexes on metadata fields for efficient filtering
-- Next step: Update useDrawingsWithProgress hook to join metadata tables
-- ============================================================================
