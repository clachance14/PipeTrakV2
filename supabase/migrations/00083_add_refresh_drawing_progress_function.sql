-- Migration: Add function to manually refresh mv_drawing_progress
-- Purpose: Allow manual refresh of materialized view via RPC
-- Created: 2025-11-06

CREATE OR REPLACE FUNCTION refresh_mv_drawing_progress()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_drawing_progress;
END;
$$;

COMMENT ON FUNCTION refresh_mv_drawing_progress IS 'Manually refresh mv_drawing_progress materialized view';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION refresh_mv_drawing_progress TO authenticated;
