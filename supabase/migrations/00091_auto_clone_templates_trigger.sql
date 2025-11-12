-- Migration: Auto-clone templates on project creation
-- Feature: 026-editable-milestone-templates
-- Phase: 2 (Foundational)
-- Task: T007
-- Description: Automatically clone system templates for new projects

CREATE OR REPLACE FUNCTION auto_clone_templates_on_project_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
/**
 * Trigger function to automatically clone system templates when a new project is created.
 *
 * Fires: AFTER INSERT ON projects
 * Action: Calls clone_system_templates_for_project(NEW.id)
 * Security: SECURITY DEFINER to bypass RLS (executed as superuser)
 */
BEGIN
  -- Clone templates for the new project
  -- Use a simple INSERT instead of calling the RPC to avoid permission checks
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
    component_type,
    milestone_name,
    weight,
    milestone_order,
    is_partial,
    requires_welder
  FROM progress_templates;

  RETURN NEW;
END;
$$;

-- Create trigger (fires after each project insert)
CREATE TRIGGER auto_clone_templates_on_project_create
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION auto_clone_templates_on_project_create();

COMMENT ON FUNCTION auto_clone_templates_on_project_create IS
'Trigger function to automatically clone system templates for new projects.';
