-- Migration: Update update_component_milestone RPC to populate delta_mh and category
-- Issue: milestone_events need delta_mh and category for earned value reporting
-- Changes:
-- 1. Add template lookup for weight and category
-- 2. Calculate delta_mh based on budgeted_manhours * weight * value change
-- 3. Include delta_mh and category in milestone_events INSERT

-- Drop existing function
DROP FUNCTION IF EXISTS update_component_milestone(UUID, TEXT, NUMERIC, UUID);

-- Recreate function with delta_mh and category support
CREATE OR REPLACE FUNCTION update_component_milestone(
  p_component_id UUID,
  p_milestone_name TEXT,
  p_new_value NUMERIC,
  p_user_id UUID
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
  -- New variables for delta_mh calculation
  v_template_weight NUMERIC;
  v_template_category TEXT;
  v_delta_mh NUMERIC;
BEGIN
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

  -- Get previous value (may be null if never set)
  v_previous_value := (v_component.current_milestones->>p_milestone_name)::NUMERIC;

  -- Look up template weight and category from project_progress_templates
  SELECT weight, category INTO v_template_weight, v_template_category
  FROM project_progress_templates
  WHERE project_id = v_component.project_id
    AND component_type = v_component.component_type
    AND milestone_name = p_milestone_name;

  -- Calculate delta_mh: budgeted_manhours * (weight / 100) * (value_change / 100)
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

  -- Iterate through each milestone in template to calculate total percentage
  FOR v_milestone_config IN
    SELECT * FROM jsonb_array_elements(v_template.milestones_config)
  LOOP
    v_milestone_name := v_milestone_config->>'name';
    v_milestone_weight := (v_milestone_config->>'weight')::NUMERIC;
    v_milestone_is_partial := (v_milestone_config->>'is_partial')::BOOLEAN;
    v_milestone_value := (v_new_milestones->>v_milestone_name)::NUMERIC;

    -- Skip if milestone not yet completed/started
    IF v_milestone_value IS NULL THEN
      CONTINUE;
    END IF;

    -- Add to total based on milestone type
    IF v_milestone_is_partial THEN
      -- Partial milestone: value is 0-100, multiply by weight
      v_new_percent := v_new_percent + (v_milestone_weight * v_milestone_value / 100.0);
    ELSE
      -- FIXED: Discrete milestone now uses 100 (not 1) for completion
      -- All milestones now use consistent 0-100 scale
      IF v_milestone_value = 100 THEN
        v_new_percent := v_new_percent + v_milestone_weight;
      END IF;
    END IF;
  END LOOP;

  -- Update component with new milestones
  -- Note: percent_complete is auto-calculated by trigger (migration 00020)
  UPDATE components
  SET
    current_milestones = v_new_milestones,
    last_updated_at = now(),
    last_updated_by = p_user_id
  WHERE id = p_component_id;

  -- Create audit event with delta_mh and category
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
    jsonb_build_object(
      'old_percent_complete', v_component.percent_complete,
      'new_percent_complete', v_new_percent
    ),
    v_delta_mh,
    v_template_category
  ) RETURNING id INTO v_audit_id;

  -- Refresh materialized view (blocking to ensure data consistency)
  -- Removed CONCURRENTLY to guarantee refresh completes before RPC returns
  -- This ensures client refetch gets fresh drawing progress data
  REFRESH MATERIALIZED VIEW mv_drawing_progress;

  -- Fetch the updated component (with percent_complete calculated by trigger)
  SELECT percent_complete INTO v_new_percent
  FROM components
  WHERE id = p_component_id;

  -- Return updated component data
  RETURN json_build_object(
    'component', row_to_json(v_component),
    'previous_value', v_previous_value,
    'audit_event_id', v_audit_id,
    'new_percent_complete', v_new_percent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
-- RLS on components table will handle authorization
GRANT EXECUTE ON FUNCTION update_component_milestone(UUID, TEXT, NUMERIC, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION update_component_milestone IS
  'Atomically updates a component milestone, recalculates progress, creates audit event with delta_mh and category, and refreshes drawing progress view. Uses 0-100 scale for all milestones (discrete: 0 or 100, partial: 0-100).';
