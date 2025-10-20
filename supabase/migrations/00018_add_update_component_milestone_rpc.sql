-- Migration: Add RPC function for atomic component milestone updates
-- Feature: Drawing-Centered Component Progress Table (010-let-s-spec)
-- Created: 2025-10-19

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_component_milestone(UUID, TEXT, NUMERIC, UUID);

-- Create RPC function for atomic milestone update
-- This function locks the component row, updates the milestone, recalculates progress,
-- creates an audit event, and refreshes the materialized view
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
      -- Discrete milestone: value is 1 (true) or 0 (false)
      IF v_milestone_value = 1 THEN
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

  -- Create audit event
  INSERT INTO milestone_events (
    component_id,
    milestone_name,
    action,
    value,
    previous_value,
    user_id,
    metadata
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
    )
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
  'Atomically updates a component milestone, recalculates progress, creates audit event, and refreshes drawing progress view. Used by the drawing-centered component table for inline milestone updates.';
