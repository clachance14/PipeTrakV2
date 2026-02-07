-- Migration: Address CodeRabbit review findings
--
-- Fixes:
-- 1. Add auth.uid() permission check to update_component_milestone
-- 2. Add role-based permission check to update_field_weld_specs
-- 3. Add already-retired guard to retire_field_weld
-- 4. Add unique partial index to prevent duplicate aggregate components (TOCTOU race)

-- ============================================================================
-- FIX 1: Add auth.uid() check to update_component_milestone
-- ============================================================================
-- The function is SECURITY DEFINER but didn't verify the caller matches p_user_id.
-- This prevents spoofing audit logs with a different user_id.

CREATE OR REPLACE FUNCTION update_component_milestone(
  p_component_id UUID,
  p_milestone_name TEXT,
  p_new_value NUMERIC,
  p_user_id UUID,
  p_metadata JSONB DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_component RECORD;
  v_template RECORD;
  v_previous_value NUMERIC;
  v_new_milestones JSONB;
  v_new_percent NUMERIC;
  v_audit_id UUID;
  v_milestone_config JSONB;
  v_milestone_name TEXT;
  v_milestone_weight NUMERIC;
  v_milestone_is_partial BOOLEAN;
  v_milestone_value NUMERIC;
  v_template_weight NUMERIC;
  v_template_category TEXT;
  v_delta_mh NUMERIC;
  v_merged_metadata JSONB;
BEGIN
  -- Permission check: caller must match p_user_id
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Access denied: caller does not match p_user_id';
  END IF;

  -- Fetch current component with row lock
  SELECT * INTO v_component
  FROM components
  WHERE id = p_component_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Component not found: %', p_component_id;
  END IF;

  -- Fetch progress template
  SELECT * INTO v_template
  FROM progress_templates
  WHERE id = v_component.progress_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Progress template not found for component: %', p_component_id;
  END IF;

  -- Validate milestone exists in template
  SELECT config INTO v_milestone_config
  FROM jsonb_array_elements(v_template.milestones_config) AS config
  WHERE config->>'name' = p_milestone_name
  LIMIT 1;

  IF v_milestone_config IS NULL THEN
    RAISE EXCEPTION 'Milestone % not found in template for component type %',
      p_milestone_name, v_template.component_type;
  END IF;

  -- Get previous value safely (handles boolean or numeric JSONB values)
  v_previous_value := safe_milestone_numeric(v_component.current_milestones, p_milestone_name);

  -- Look up template weight and category from project_progress_templates
  SELECT weight, category INTO v_template_weight, v_template_category
  FROM project_progress_templates
  WHERE project_id = v_component.project_id
    AND component_type = v_component.component_type
    AND milestone_name = p_milestone_name;

  -- Calculate delta_mh
  v_delta_mh := COALESCE(v_component.budgeted_manhours, 0)
    * (COALESCE(v_template_weight, 0) / 100.0)
    * ((p_new_value - COALESCE(v_previous_value, 0)) / 100.0);

  -- Update milestones JSONB with new value
  v_new_milestones := jsonb_set(
    COALESCE(v_component.current_milestones, '{}'::JSONB),
    ARRAY[p_milestone_name],
    to_jsonb(p_new_value)
  );

  -- Calculate new percent_complete based on template weights
  v_new_percent := 0.00;

  FOR v_milestone_config IN
    SELECT * FROM jsonb_array_elements(v_template.milestones_config)
  LOOP
    v_milestone_name := v_milestone_config->>'name';
    v_milestone_weight := (v_milestone_config->>'weight')::NUMERIC;
    v_milestone_is_partial := (v_milestone_config->>'is_partial')::BOOLEAN;

    v_milestone_value := safe_milestone_numeric(v_new_milestones, v_milestone_name);

    IF v_milestone_value IS NULL THEN
      CONTINUE;
    END IF;

    IF v_milestone_is_partial THEN
      v_new_percent := v_new_percent + (v_milestone_weight * v_milestone_value / 100.0);
    ELSE
      IF v_milestone_value = 100 THEN
        v_new_percent := v_new_percent + v_milestone_weight;
      END IF;
    END IF;
  END LOOP;

  -- Update component with new milestones
  UPDATE components
  SET
    current_milestones = v_new_milestones,
    last_updated_at = now(),
    last_updated_by = p_user_id
  WHERE id = p_component_id;

  -- Build metadata
  v_merged_metadata := COALESCE(p_metadata, '{}'::JSONB) || jsonb_build_object(
    'old_percent_complete', v_component.percent_complete,
    'new_percent_complete', v_new_percent
  );

  -- Create audit event
  INSERT INTO milestone_events (
    component_id,
    milestone_name,
    action,
    value,
    previous_value,
    user_id,
    metadata,
    delta_mh,
    category
  ) VALUES (
    p_component_id,
    p_milestone_name,
    CASE
      WHEN v_previous_value IS NULL THEN 'complete'
      WHEN v_previous_value > p_new_value THEN 'rollback'
      ELSE 'update'
    END,
    p_new_value,
    v_previous_value,
    p_user_id,
    v_merged_metadata,
    v_delta_mh,
    v_template_category
  ) RETURNING id INTO v_audit_id;

  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW mv_drawing_progress;

  -- Fetch the updated percent_complete
  SELECT percent_complete INTO v_new_percent
  FROM components
  WHERE id = p_component_id;

  RETURN json_build_object(
    'component', row_to_json(v_component),
    'previous_value', v_previous_value,
    'audit_event_id', v_audit_id,
    'new_percent_complete', v_new_percent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION update_component_milestone(UUID, TEXT, NUMERIC, UUID, JSONB) TO authenticated;

-- ============================================================================
-- FIX 2: Add role-based permission check to update_field_weld_specs
-- ============================================================================
-- Previously only checked org membership; now restricts to same roles as retire_field_weld.

CREATE OR REPLACE FUNCTION update_field_weld_specs(
  p_field_weld_id UUID,
  p_weld_type TEXT,
  p_weld_size TEXT,
  p_schedule TEXT,
  p_base_metal TEXT,
  p_spec TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_field_weld RECORD;
  v_user_role TEXT;
BEGIN
  -- Validate weld type
  IF p_weld_type NOT IN ('BW', 'SW', 'FW', 'TW') THEN
    RAISE EXCEPTION 'Invalid weld type: %. Must be BW, SW, FW, or TW', p_weld_type;
  END IF;

  -- Permission check: verify user belongs to org AND has appropriate role
  SELECT u.role INTO v_user_role
  FROM field_welds fw
  JOIN components c ON fw.component_id = c.id
  JOIN projects p ON c.project_id = p.id
  JOIN users u ON u.organization_id = p.organization_id
  WHERE fw.id = p_field_weld_id AND u.id = p_user_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied: user does not have permission for this field weld';
  END IF;

  IF v_user_role NOT IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector') THEN
    RAISE EXCEPTION 'Access denied: insufficient role to update weld specifications';
  END IF;

  -- Get current state for audit trail
  SELECT * INTO v_field_weld FROM field_welds WHERE id = p_field_weld_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Field weld not found';
  END IF;

  -- Record audit event with previous values
  INSERT INTO field_weld_events (
    field_weld_id, action, user_id, metadata
  ) VALUES (
    p_field_weld_id, 'update_specs', p_user_id,
    jsonb_build_object(
      'previous_weld_type', v_field_weld.weld_type,
      'previous_weld_size', v_field_weld.weld_size,
      'previous_schedule', v_field_weld.schedule,
      'previous_base_metal', v_field_weld.base_metal,
      'previous_spec', v_field_weld.spec,
      'new_weld_type', p_weld_type,
      'new_weld_size', p_weld_size,
      'new_schedule', p_schedule,
      'new_base_metal', p_base_metal,
      'new_spec', p_spec
    )
  );

  -- Update the field weld specifications
  UPDATE field_welds
  SET
    weld_type = p_weld_type,
    weld_size = p_weld_size,
    schedule = p_schedule,
    base_metal = p_base_metal,
    spec = p_spec
  WHERE id = p_field_weld_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION update_field_weld_specs IS 'Update field weld specification fields (type, size, schedule, base_metal, spec) with audit logging. Requires owner/admin/PM/foreman/QC role.';

-- ============================================================================
-- FIX 3: Add already-retired guard to retire_field_weld
-- ============================================================================

CREATE OR REPLACE FUNCTION retire_field_weld(
  p_field_weld_id UUID,
  p_retire_reason TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_field_weld RECORD;
  v_component_id UUID;
  v_user_role TEXT;
BEGIN
  -- Validate retire reason
  IF p_retire_reason IS NULL OR length(trim(p_retire_reason)) < 10 THEN
    RAISE EXCEPTION 'Retire reason must be at least 10 characters';
  END IF;

  -- Permission check: verify user belongs to the org and has the right role
  SELECT u.role INTO v_user_role
  FROM field_welds fw
  JOIN components c ON fw.component_id = c.id
  JOIN projects p ON c.project_id = p.id
  JOIN users u ON u.organization_id = p.organization_id
  WHERE fw.id = p_field_weld_id AND u.id = p_user_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied: user does not have permission for this field weld';
  END IF;

  IF v_user_role NOT IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector') THEN
    RAISE EXCEPTION 'Access denied: insufficient role to retire a field weld';
  END IF;

  -- Get current field weld state
  SELECT * INTO v_field_weld FROM field_welds WHERE id = p_field_weld_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Field weld not found';
  END IF;

  v_component_id := v_field_weld.component_id;

  -- Guard: block if already retired
  IF EXISTS (SELECT 1 FROM components WHERE id = v_component_id AND is_retired = true) THEN
    RAISE EXCEPTION 'Field weld is already retired';
  END IF;

  -- Guard: block if repair welds exist
  IF EXISTS (SELECT 1 FROM field_welds WHERE original_weld_id = p_field_weld_id) THEN
    RAISE EXCEPTION 'Cannot retire: repair welds exist for this weld';
  END IF;

  -- Record audit event with full weld state snapshot
  INSERT INTO field_weld_events (
    field_weld_id, action,
    welder_id, date_welded,
    user_id, metadata
  ) VALUES (
    p_field_weld_id, 'retire',
    v_field_weld.welder_id, v_field_weld.date_welded,
    p_user_id,
    jsonb_build_object(
      'retire_reason', trim(p_retire_reason),
      'weld_snapshot', jsonb_build_object(
        'weld_type', v_field_weld.weld_type,
        'weld_size', v_field_weld.weld_size,
        'schedule', v_field_weld.schedule,
        'base_metal', v_field_weld.base_metal,
        'spec', v_field_weld.spec,
        'status', v_field_weld.status,
        'nde_type', v_field_weld.nde_type,
        'nde_result', v_field_weld.nde_result,
        'nde_date', v_field_weld.nde_date
      )
    )
  );

  -- Soft-delete: set is_retired on the linked component
  UPDATE components
  SET is_retired = true, retire_reason = trim(p_retire_reason)
  WHERE id = v_component_id;

  -- Refresh materialized views so dashboards update
  PERFORM refresh_materialized_views();

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION retire_field_weld IS 'Soft-delete a field weld by retiring its component. Blocks if already retired or repair welds exist. Requires owner/admin/PM/foreman/QC role.';

-- ============================================================================
-- FIX 4: Unique partial index to prevent duplicate aggregate components
-- ============================================================================
-- Prevents TOCTOU race where concurrent imports both insert the same aggregate.
-- Only applies to non-retired pipe/threaded_pipe aggregates that use pipe_id.

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_aggregate_pipe_id
  ON components (project_id, component_type, (identity_key->>'pipe_id'))
  WHERE identity_key->>'pipe_id' IS NOT NULL
    AND is_retired = false;
