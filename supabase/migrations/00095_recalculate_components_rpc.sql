-- Migration: Recalculate components RPC
-- Feature: 026-editable-milestone-templates
-- Phase: 2 (Foundational)
-- Task: T011
-- Description: Batch recalculate component progress percentages

CREATE OR REPLACE FUNCTION recalculate_components_with_template(
  target_project_id uuid,
  target_component_type text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
/**
 * Recalculates percent_complete for all components of a given type in a project,
 * using the updated template weights.
 *
 * @param target_project_id - UUID of the project
 * @param target_component_type - Component type to recalculate (e.g., "Field Weld")
 * @returns Number of components recalculated
 *
 * Permissions: Called by update_project_template_weights (SECURITY DEFINER)
 * Performance: Target <3 seconds for 1,000 components
 * Side Effects: Updates components.percent_complete and components.last_updated_at
 */
DECLARE
  affected_count integer;
BEGIN
  UPDATE components
  SET percent_complete = calculate_component_percent(
        progress_template_id,
        current_milestones,
        project_id,
        component_type
      ),
      last_updated_at = now()
  WHERE project_id = target_project_id
    AND component_type = target_component_type;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

COMMENT ON FUNCTION recalculate_components_with_template IS
'Batch recalculates component progress percentages based on updated template weights.';
