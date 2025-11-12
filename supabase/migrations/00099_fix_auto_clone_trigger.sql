-- Fix the auto-clone trigger to use JSONB unpacking
CREATE OR REPLACE FUNCTION auto_clone_templates_on_project_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clone templates for the new project by unpacking milestones_config JSONB
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
    (milestone->>'is_partial')::boolean AS is_partial,
    COALESCE((milestone->>'requires_welder')::boolean, false) AS requires_welder
  FROM progress_templates pt,
       jsonb_array_elements(pt.milestones_config) AS milestone;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_clone_templates_on_project_create IS
'Trigger function to automatically clone system templates for new projects by unpacking milestones_config JSONB.';
