-- Migration: Fix mv_drawing_progress to include completed_components
-- Issue: Drawing table shows "0/0 • 0%" because completed_components column is missing
-- Created: 2025-10-19

-- Drop existing materialized view
DROP MATERIALIZED VIEW IF EXISTS mv_drawing_progress CASCADE;

-- Recreate with completed_components column
CREATE MATERIALIZED VIEW mv_drawing_progress AS
SELECT
  d.id AS drawing_id,
  d.project_id,
  d.drawing_no_norm,
  COUNT(c.id) AS total_components,
  COUNT(c.id) FILTER (WHERE c.percent_complete = 100) AS completed_components,
  AVG(c.percent_complete) AS avg_percent_complete
FROM drawings d
LEFT JOIN components c ON c.drawing_id = d.id AND NOT c.is_retired
WHERE NOT d.is_retired
GROUP BY d.id, d.project_id, d.drawing_no_norm;

-- Recreate UNIQUE index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_mv_drawing_progress_id ON mv_drawing_progress(drawing_id);
CREATE INDEX idx_mv_drawing_progress_project ON mv_drawing_progress(project_id);

-- Update comment
COMMENT ON MATERIALIZED VIEW mv_drawing_progress IS 'Aggregated drawing metrics for tree navigation (FR-034), refreshed every 60 seconds. Includes completed_components count for progress display.';

-- Grant permissions
ALTER MATERIALIZED VIEW mv_drawing_progress OWNER TO postgres;

-- Initial refresh
REFRESH MATERIALIZED VIEW mv_drawing_progress;
