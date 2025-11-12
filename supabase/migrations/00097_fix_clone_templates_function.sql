-- Drop the old function
DROP FUNCTION IF EXISTS clone_system_templates_for_project(uuid);

-- Recreate with correct version (from migration 00090)
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
    RAISE EXCEPTION 'Permission denied: requires admin or project_manager role';
  END IF;

  -- Check if templates already exist
  IF EXISTS (
    SELECT 1 FROM project_progress_templates
    WHERE project_id = target_project_id
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Templates already exist for this project';
  END IF;

  -- Clone all system templates
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
    component_type,
    milestone_name,
    weight,
    milestone_order,
    is_partial,
    requires_welder
  FROM progress_templates;

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  RETURN rows_inserted;
END;
$$;
