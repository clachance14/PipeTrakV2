-- Migration: Prevent duplicate milestone_events from double-tap / double-fire
--
-- Issue: The activity feed shows duplicate entries when the UI fires the
-- update_component_milestone RPC twice in quick succession (e.g., mobile
-- double-tap or Enter+blur race condition).
--
-- Fix: Add a dedup guard that checks for an identical event (same component,
-- milestone, value, user) within the last 5 seconds. If found, skip the
-- INSERT and return the existing event ID instead.

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

  -- Dedup guard: skip INSERT if identical event exists within last 5 seconds
  SELECT id INTO v_audit_id
  FROM milestone_events
  WHERE component_id = p_component_id
    AND milestone_name = p_milestone_name
    AND value = p_new_value
    AND user_id = p_user_id
    AND created_at > now() - interval '5 seconds'
  LIMIT 1;

  IF v_audit_id IS NULL THEN
    -- No duplicate found — insert new audit event
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
  END IF;

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
