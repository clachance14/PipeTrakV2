-- Migration: Fix stale mv_template_milestone_weights + auto-refresh trigger
--
-- Bug: The materialized view mv_template_milestone_weights was only refreshed
--       once when it was created (migration 20251206171736). New projects
--       created after that have no project_progress_templates entries in the MV,
--       causing the manhour views to fall back to the v1 default templates
--       (wrong milestone names/weights for pipe v2, threaded_pipe, etc.).
--       Result: install_mh_earned = 0 even when components have install progress.
--
-- Fix:
--   1. Refresh the MV now (immediate data fix)
--   2. Add auto-refresh triggers on project_progress_templates and progress_templates
--      so the MV stays current when templates are added/modified/deleted

-- ============================================================================
-- PART 1: Immediate refresh
-- ============================================================================

REFRESH MATERIALIZED VIEW mv_template_milestone_weights;

-- ============================================================================
-- PART 2: Auto-refresh trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_mv_template_milestone_weights()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_template_milestone_weights;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION refresh_mv_template_milestone_weights() IS
'Auto-refreshes mv_template_milestone_weights when template data changes. Statement-level trigger.';

-- ============================================================================
-- PART 3: Attach triggers to template tables
-- ============================================================================

-- Trigger on project_progress_templates (most common changes)
CREATE TRIGGER trg_refresh_template_weights_on_ppt
  AFTER INSERT OR UPDATE OR DELETE ON project_progress_templates
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_mv_template_milestone_weights();

-- Trigger on progress_templates (less common, but needed for default template changes)
CREATE TRIGGER trg_refresh_template_weights_on_pt
  AFTER INSERT OR UPDATE OR DELETE ON progress_templates
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_mv_template_milestone_weights();
