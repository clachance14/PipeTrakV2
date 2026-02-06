-- Migration: Fix auto-clone trigger to only use latest version per component type
-- Bug: When progress_templates has multiple versions (e.g. pipe v1 and v2),
--       the trigger inserts milestones from ALL versions, causing duplicate key
--       violations on (project_id, component_type, milestone_name).
-- Fix: Filter to MAX(version) per component_type, matching get_component_template() logic.

CREATE OR REPLACE FUNCTION auto_clone_templates_on_project_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clone templates for the new project by unpacking milestones_config JSONB
  -- Only use the latest version of each component type
  INSERT INTO project_progress_templates (
    project_id,
    component_type,
    milestone_name,
    weight,
    milestone_order,
    is_partial,
    requires_welder
  )
  SELECT
    NEW.id,
    pt.component_type,
    (milestone->>'name')::text AS milestone_name,
    (milestone->>'weight')::integer AS weight,
    (milestone->>'order')::integer AS milestone_order,
    COALESCE((milestone->>'is_partial')::boolean, false) AS is_partial,
    COALESCE((milestone->>'requires_welder')::boolean, false) AS requires_welder
  FROM progress_templates pt,
       jsonb_array_elements(pt.milestones_config) AS milestone
  WHERE pt.version = (
    SELECT MAX(pt2.version)
    FROM progress_templates pt2
    WHERE pt2.component_type = pt.component_type
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_clone_templates_on_project_create IS
'Trigger function to automatically clone latest system templates for new projects by unpacking milestones_config JSONB. Uses MAX(version) per component_type.';
