-- Migration 00109: Create component_effective_templates view
--
-- Purpose: Provide a unified view that returns the effective milestone template
-- for each component, using project-specific templates when available, falling
-- back to system templates otherwise.
--
-- Context: Feature 026 allows editing per-project milestone weights in
-- project_progress_templates. However, ComponentDetailView was fetching from
-- the old progress_templates table, showing stale weights. This view provides
-- the correct precedence: project templates > system templates.
--
-- Related:
-- - Bug fix for milestone weight display issue (2025-11-12)
-- - Matches backend logic in calculate_component_percent() function

CREATE OR REPLACE VIEW component_effective_templates AS
SELECT
  c.id AS component_id,
  c.project_id,
  c.component_type,
  c.progress_template_id,
  -- Return project-specific milestone config if it exists, otherwise system config
  CASE
    WHEN EXISTS (
      SELECT 1 FROM project_progress_templates ppt
      WHERE ppt.project_id = c.project_id
        AND ppt.component_type = c.component_type
    ) THEN (
      -- Build JSONB array from project_progress_templates rows
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', ppt.milestone_name,
          'weight', ppt.weight,
          'order', ppt.milestone_order,
          'is_partial', ppt.is_partial,
          'requires_welder', ppt.requires_welder
        ) ORDER BY ppt.milestone_order
      )
      FROM project_progress_templates ppt
      WHERE ppt.project_id = c.project_id
        AND ppt.component_type = c.component_type
    )
    ELSE pt.milestones_config
  END AS milestones_config,
  -- Also expose which source was used (for debugging/telemetry)
  EXISTS (
    SELECT 1 FROM project_progress_templates ppt
    WHERE ppt.project_id = c.project_id
      AND ppt.component_type = c.component_type
  ) AS uses_project_templates
FROM components c
LEFT JOIN progress_templates pt ON pt.id = c.progress_template_id;

COMMENT ON VIEW component_effective_templates IS
'Returns the effective milestone template for each component. Uses project-specific templates (project_progress_templates) when available, falls back to system templates (progress_templates) otherwise. Matches the precedence logic in calculate_component_percent() function.';

COMMENT ON COLUMN component_effective_templates.milestones_config IS
'JSONB array of milestone objects: [{"name": "Receive", "weight": 10, "order": 1, "is_partial": false, "requires_welder": false}, ...]. Sourced from project_progress_templates if available, otherwise from progress_templates.';

COMMENT ON COLUMN component_effective_templates.uses_project_templates IS
'Boolean flag indicating whether milestones_config came from project-specific templates (true) or system templates (false). Useful for debugging and telemetry.';
