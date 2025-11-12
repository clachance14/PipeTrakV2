-- Migration: Add input validation to RPC functions
-- Feature: Code quality improvements (CodeRabbit feedback)
-- Description: Add NULL and empty checks to template management RPC functions

-- Update update_project_template_weights with input validation
CREATE OR REPLACE FUNCTION update_project_template_weights(
  p_project_id uuid,
  p_component_type text,
  p_new_weights jsonb,
  p_apply_to_existing boolean,
  p_last_updated timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
/**
 * Updates milestone weights for a component type within a project.
 * Logs changes to audit table. Optionally recalculates existing components.
 *
 * @param p_project_id - UUID of the project
 * @param p_component_type - Component type to update (e.g., "Field Weld")
 * @param p_new_weights - JSONB array of {milestone_name, weight} objects
 * @param p_apply_to_existing - If true, recalculate existing components
 * @param p_last_updated - Timestamp of last update (optimistic locking)
 * @returns JSON: {success: true, affected_count: integer, audit_id: uuid}
 *
 * Permissions: Admin or project manager for the target project
 * Validations:
 *   - Weights sum to exactly 100
 *   - All milestone names exist in current templates
 *   - No concurrent edits (timestamp check)
 * Error Cases:
 *   - Permission denied: RAISE EXCEPTION
 *   - Weights sum ≠ 100: RAISE EXCEPTION 'Weights must sum to 100%'
 *   - Concurrent edit detected: RAISE EXCEPTION 'Templates were modified by another user'
 *   - Milestone not found: RAISE EXCEPTION 'Invalid milestone name: {name}'
 */
DECLARE
  user_role text;
  project_org_id uuid;
  old_weights_json jsonb;
  affected_count integer := 0;
  audit_id uuid;
  weight_sum integer;
  milestone_record jsonb;
BEGIN
  -- Input validation
  IF p_project_id IS NULL THEN
    RAISE EXCEPTION 'project_id cannot be null';
  END IF;

  IF p_component_type IS NULL OR p_component_type = '' THEN
    RAISE EXCEPTION 'component_type cannot be null or empty';
  END IF;

  IF p_new_weights IS NULL OR jsonb_array_length(p_new_weights) = 0 THEN
    RAISE EXCEPTION 'new_weights cannot be null or empty';
  END IF;

  IF p_last_updated IS NULL THEN
    RAISE EXCEPTION 'last_updated timestamp cannot be null';
  END IF;

  -- Verify project exists and get organization
  SELECT organization_id INTO project_org_id
  FROM projects
  WHERE id = p_project_id;

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

  IF user_role NOT IN ('owner', 'admin', 'project_manager') THEN
    RAISE EXCEPTION 'Permission denied: requires admin or project_manager role';
  END IF;

  -- Optimistic locking: Check for concurrent edits
  IF EXISTS (
    SELECT 1 FROM project_progress_templates
    WHERE project_id = p_project_id
      AND component_type = p_component_type
      AND updated_at > p_last_updated
  ) THEN
    RAISE EXCEPTION 'Templates were modified by another user. Refresh and try again.';
  END IF;

  -- Validate weight sum = 100
  SELECT SUM((value->>'weight')::integer)
  INTO weight_sum
  FROM jsonb_array_elements(p_new_weights);

  IF weight_sum != 100 THEN
    RAISE EXCEPTION 'Weights must sum to 100%% (current: %)', weight_sum;
  END IF;

  -- Capture old weights for audit log
  SELECT jsonb_agg(
    jsonb_build_object('milestone_name', milestone_name, 'weight', weight)
    ORDER BY milestone_order
  )
  INTO old_weights_json
  FROM project_progress_templates
  WHERE project_id = p_project_id
    AND component_type = p_component_type;

  -- Update template weights
  FOR milestone_record IN SELECT * FROM jsonb_array_elements(p_new_weights)
  LOOP
    UPDATE project_progress_templates
    SET weight = (milestone_record->>'weight')::integer,
        updated_at = now()
    WHERE project_id = p_project_id
      AND component_type = p_component_type
      AND milestone_name = milestone_record->>'milestone_name';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid milestone name: %', milestone_record->>'milestone_name';
    END IF;
  END LOOP;

  -- Apply to existing components if requested
  IF p_apply_to_existing THEN
    affected_count := recalculate_components_with_template(p_project_id, p_component_type);
  END IF;

  -- Log to audit table
  INSERT INTO project_template_changes (
    project_id,
    component_type,
    changed_by,
    old_weights,
    new_weights,
    applied_to_existing,
    affected_component_count
  )
  VALUES (
    p_project_id,
    p_component_type,
    auth.uid(),
    old_weights_json,
    p_new_weights,
    p_apply_to_existing,
    affected_count
  )
  RETURNING id INTO audit_id;

  RETURN json_build_object(
    'success', true,
    'affected_count', affected_count,
    'audit_id', audit_id
  );
END;
$$;

-- Update recalculate_components_with_template with input validation
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
  -- Input validation
  IF target_project_id IS NULL THEN
    RAISE EXCEPTION 'target_project_id cannot be null';
  END IF;

  IF target_component_type IS NULL OR target_component_type = '' THEN
    RAISE EXCEPTION 'target_component_type cannot be null or empty';
  END IF;

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

COMMENT ON FUNCTION update_project_template_weights IS
'Updates template weights with validation, audit logging, and optional retroactive recalculation.';

COMMENT ON FUNCTION recalculate_components_with_template IS
'Batch recalculates component progress percentages based on updated template weights.';
