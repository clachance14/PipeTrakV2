-- Migration: Update project_progress_templates for pipe to use v2 milestones
--
-- Problem: project_progress_templates has old v1 pipe milestones (Receive, Install)
-- which override the correct v2 system template (7 milestones) in the
-- component_effective_templates view.
--
-- Solution: Replace old pipe entries with v2 milestones for all affected projects.

-- Step 1: Get list of projects that have old pipe templates
-- Step 2: Delete the old entries
-- Step 3: Insert the new v2 entries

DO $$
DECLARE
  project_id_var UUID;
  affected_projects UUID[];
BEGIN
  -- Get all project IDs that have pipe templates
  SELECT ARRAY_AGG(DISTINCT project_id)
  INTO affected_projects
  FROM project_progress_templates
  WHERE component_type = 'pipe';

  -- Delete old pipe entries
  DELETE FROM project_progress_templates
  WHERE component_type = 'pipe';

  -- Insert new v2 milestones for each affected project
  IF affected_projects IS NOT NULL THEN
    FOREACH project_id_var IN ARRAY affected_projects
    LOOP
      -- Receive
      INSERT INTO project_progress_templates (
        project_id, component_type, milestone_name, milestone_order, weight, is_partial, requires_welder
      ) VALUES (
        project_id_var, 'pipe', 'Receive', 1, 5, true, false
      );

      -- Erect
      INSERT INTO project_progress_templates (
        project_id, component_type, milestone_name, milestone_order, weight, is_partial, requires_welder
      ) VALUES (
        project_id_var, 'pipe', 'Erect', 2, 30, true, false
      );

      -- Connect
      INSERT INTO project_progress_templates (
        project_id, component_type, milestone_name, milestone_order, weight, is_partial, requires_welder
      ) VALUES (
        project_id_var, 'pipe', 'Connect', 3, 30, true, false
      );

      -- Support
      INSERT INTO project_progress_templates (
        project_id, component_type, milestone_name, milestone_order, weight, is_partial, requires_welder
      ) VALUES (
        project_id_var, 'pipe', 'Support', 4, 20, true, false
      );

      -- Punch
      INSERT INTO project_progress_templates (
        project_id, component_type, milestone_name, milestone_order, weight, is_partial, requires_welder
      ) VALUES (
        project_id_var, 'pipe', 'Punch', 5, 5, false, false
      );

      -- Test
      INSERT INTO project_progress_templates (
        project_id, component_type, milestone_name, milestone_order, weight, is_partial, requires_welder
      ) VALUES (
        project_id_var, 'pipe', 'Test', 6, 5, false, false
      );

      -- Restore
      INSERT INTO project_progress_templates (
        project_id, component_type, milestone_name, milestone_order, weight, is_partial, requires_welder
      ) VALUES (
        project_id_var, 'pipe', 'Restore', 7, 5, false, false
      );
    END LOOP;
  END IF;

  RAISE NOTICE 'Updated % projects with v2 pipe milestones', array_length(affected_projects, 1);
END $$;
