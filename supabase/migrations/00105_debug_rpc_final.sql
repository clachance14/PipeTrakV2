-- Migration: Final debug version with logging
-- Feature: 026-editable-milestone-templates
-- Description: Add debug logging without validation to diagnose data transmission issue

DROP FUNCTION IF EXISTS update_project_template_weights(uuid, text, jsonb, boolean, timestamptz);

CREATE FUNCTION update_project_template_weights(
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
DECLARE
  user_role text;
  project_org_id uuid;
  old_weights_json jsonb;
  affected_count integer := 0;
  audit_id uuid;
  weight_sum integer;
  milestone_record jsonb;
  array_count integer;
BEGIN
  -- Calculate weight sum FIRST
  SELECT
    SUM((value->>'weight')::integer),
    COUNT(*)
  INTO weight_sum, array_count
  FROM jsonb_array_elements(p_new_weights);

  -- INSERT DEBUG LOG (happens before any validation or errors)
  INSERT INTO debug_weight_logs (component_type, received_weights, calculated_sum, array_count)
  VALUES (p_component_type, p_new_weights, weight_sum, array_count);

  -- Verify project and permissions
  SELECT organization_id INTO project_org_id FROM projects WHERE id = p_project_id;
  IF project_org_id IS NULL THEN RAISE EXCEPTION 'Project not found'; END IF;

  SELECT role INTO user_role FROM users WHERE id = auth.uid() AND organization_id = project_org_id;
  IF user_role IS NULL THEN RAISE EXCEPTION 'Permission denied: user not in project organization'; END IF;
  IF user_role NOT IN ('owner', 'admin', 'project_manager') THEN RAISE EXCEPTION 'Permission denied: requires admin or project_manager role'; END IF;

  -- Capture old weights
  SELECT jsonb_agg(jsonb_build_object('milestone_name', milestone_name, 'weight', weight) ORDER BY milestone_order)
  INTO old_weights_json FROM project_progress_templates WHERE project_id = p_project_id AND component_type = p_component_type;

  -- Update template weights
  FOR milestone_record IN SELECT * FROM jsonb_array_elements(p_new_weights) LOOP
    UPDATE project_progress_templates
    SET weight = (milestone_record->>'weight')::integer, updated_at = now()
    WHERE project_id = p_project_id AND component_type = p_component_type AND milestone_name = milestone_record->>'milestone_name';
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid milestone name: %', milestone_record->>'milestone_name'; END IF;
  END LOOP;

  -- Apply to existing components if requested
  IF p_apply_to_existing THEN
    affected_count := recalculate_components_with_template(p_project_id, p_component_type);
  END IF;

  -- Audit log
  INSERT INTO project_template_changes (project_id, component_type, changed_by, old_weights, new_weights, applied_to_existing, affected_component_count)
  VALUES (p_project_id, p_component_type, auth.uid(), old_weights_json, p_new_weights, p_apply_to_existing, affected_count)
  RETURNING id INTO audit_id;

  RETURN json_build_object('success', true, 'affected_count', affected_count, 'audit_id', audit_id, 'debug_sum', weight_sum, 'debug_count', array_count);
END;
$$;
