-- Migration: Add weight sum validation trigger
-- Feature: 026-editable-milestone-templates
-- Phase: 1 (Setup)
-- Task: T002
-- Description: Ensures milestone weights sum to exactly 100% per (project_id, component_type)

CREATE OR REPLACE FUNCTION validate_project_template_weights()
RETURNS trigger
LANGUAGE plpgsql
AS $$
/**
 * Trigger function to validate that milestone weights sum to exactly 100%
 * for each (project_id, component_type) combination.
 *
 * Fires: AFTER INSERT OR UPDATE ON project_progress_templates
 * Validation: SUM(weight) per (project_id, component_type) = 100
 * Error: RAISE EXCEPTION if sum ≠ 100
 */
DECLARE
  weight_sum integer;
BEGIN
  SELECT SUM(weight)
  INTO weight_sum
  FROM project_progress_templates
  WHERE project_id = NEW.project_id
    AND component_type = NEW.component_type;

  IF weight_sum != 100 THEN
    RAISE EXCEPTION 'Milestone weights must sum to 100%% for component type % (current: %)', NEW.component_type, weight_sum;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger (fires after each INSERT/UPDATE)
CREATE TRIGGER validate_template_weights
AFTER INSERT OR UPDATE ON project_progress_templates
FOR EACH ROW
EXECUTE FUNCTION validate_project_template_weights();

COMMENT ON FUNCTION validate_project_template_weights IS
'Trigger function to enforce weight sum = 100% constraint per (project_id, component_type).';
