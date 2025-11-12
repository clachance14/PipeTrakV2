-- Drop the old function
DROP FUNCTION IF EXISTS clone_system_templates_for_project(uuid);

-- Recreate with correct version that unpacks JSONB milestones_config
CREATE OR REPLACE FUNCTION clone_system_templates_for_project(
  target_project_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_inserted integer;
  user_role text;
  project_org_id uuid;
BEGIN
  -- Verify project exists and get organization
  SELECT organization_id INTO project_org_id
  FROM projects
  WHERE id = target_project_id;

  IF project_org_id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- Verify user has admin or project_manager role
  SELECT role INTO user_role
  FROM users
  WHERE id = auth.uid()
    AND organization_id = project_org_id;

  IF user_role IS NULL THEN
    RAISE EXCEPTION 'Permission denied: user not in project organization';
  END IF;

  IF user_role NOT IN ('admin', 'project_manager', 'owner') THEN
    RAISE EXCEPTION 'Permission denied: requires admin, project_manager, or owner role';
  END IF;

  -- Check if templates already exist
  IF EXISTS (
    SELECT 1 FROM project_progress_templates
    WHERE project_id = target_project_id
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Templates already exist for this project';
  END IF;

  -- Clone system templates by unpacking milestones_config JSONB array
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
    target_project_id,
    pt.component_type,
    (milestone->>'name')::text AS milestone_name,
    (milestone->>'weight')::integer AS weight,
    (milestone->>'order')::integer AS milestone_order,
    (milestone->>'is_partial')::boolean AS is_partial,
    COALESCE((milestone->>'requires_welder')::boolean, false) AS requires_welder
  FROM progress_templates pt,
       jsonb_array_elements(pt.milestones_config) AS milestone;

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  RETURN rows_inserted;
END;
$$;

COMMENT ON FUNCTION clone_system_templates_for_project IS
'Clones system templates to project-specific templates by unpacking milestones_config JSONB. Requires admin/PM/owner role.';
