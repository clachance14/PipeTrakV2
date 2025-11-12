-- Migration: Get project template summary RPC
-- Feature: 026-editable-milestone-templates
-- Phase: 2 (Foundational)
-- Task: T012
-- Description: Query function for settings page display

CREATE OR REPLACE FUNCTION get_project_template_summary(
  target_project_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
/**
 * Returns summary of project templates: list of component types, milestone counts,
 * last modified timestamp, and whether templates are cloned from system.
 *
 * @param target_project_id - UUID of the project
 * @returns JSON: {
 *   has_templates: boolean,
 *   component_types: [{
 *     component_type: string,
 *     milestone_count: integer,
 *     total_weight: integer,
 *     last_updated: timestamptz
 *   }]
 * }
 *
 * Permissions: Any project member (enforced by RLS)
 * Use Case: Main settings page loads this to display component type cards
 */
DECLARE
  template_exists boolean;
  summary json;
BEGIN
  -- Check if project has any templates
  SELECT EXISTS (
    SELECT 1 FROM project_progress_templates
    WHERE project_id = target_project_id
    LIMIT 1
  ) INTO template_exists;

  -- Aggregate by component type
  SELECT json_build_object(
    'has_templates', template_exists,
    'component_types', COALESCE(jsonb_agg(
      jsonb_build_object(
        'component_type', component_type,
        'milestone_count', milestone_count,
        'total_weight', total_weight,
        'last_updated', last_updated
      )
      ORDER BY component_type
    ), '[]'::jsonb)
  )
  INTO summary
  FROM (
    SELECT
      component_type,
      COUNT(*) as milestone_count,
      SUM(weight) as total_weight,
      MAX(updated_at) as last_updated
    FROM project_progress_templates
    WHERE project_id = target_project_id
    GROUP BY component_type
  ) subquery;

  RETURN summary;
END;
$$;

COMMENT ON FUNCTION get_project_template_summary IS
'Returns summary of project templates for settings page display.';
