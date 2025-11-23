-- Migration: Fix Discrete Milestone Value Scale
-- Issue: Discrete milestones were stored as 0/1 instead of 0/100
-- This caused activity logs to show "1%" instead of "complete"
--
-- Changes:
-- 1. Update RPC to accept 100 (not 1) for discrete milestone completion
-- 2. Backfill existing milestone_events: 1 to 100
-- 3. Backfill existing components.current_milestones: 1 to 100
--
-- After this migration, all milestones use consistent 0-100 scale:
-- - Discrete: 0 (not started) or 100 (complete)
-- - Partial: 0-100 (percentage)

-- Step 1: Backfill milestone_events table
-- Update discrete milestone values from 1 to 100
UPDATE milestone_events
SET value = 100
WHERE value = 1
  AND milestone_name IN (
    -- List of known discrete (non-partial) milestones
    'Receive', 'Fab', 'Coat', 'Load', 'Ship', 'Unload', 'Stock',
    'Issue', 'Erect', 'Align', 'Weld', 'NDE', 'PWHT', 'Install',
    'Pressure Test', 'Insulate', 'Paint', 'Turnover'
  );

-- Also update previous_value column
UPDATE milestone_events
SET previous_value = 100
WHERE previous_value = 1
  AND milestone_name IN (
    'Receive', 'Fab', 'Coat', 'Load', 'Ship', 'Unload', 'Stock',
    'Issue', 'Erect', 'Align', 'Weld', 'NDE', 'PWHT', 'Install',
    'Pressure Test', 'Insulate', 'Paint', 'Turnover'
  );

-- Step 2: Backfill components.current_milestones JSONB
-- This is more complex because we need to update JSONB values
DO $$
DECLARE
  component_record RECORD;
  milestone_name TEXT;
  milestone_value NUMERIC;
  updated_milestones JSONB;
BEGIN
  -- Iterate through all components that have milestones
  FOR component_record IN
    SELECT id, current_milestones
    FROM components
    WHERE current_milestones IS NOT NULL AND current_milestones != '{}'::jsonb
  LOOP
    updated_milestones := component_record.current_milestones;

    -- Check each known discrete milestone
    FOREACH milestone_name IN ARRAY ARRAY[
      'Receive', 'Fab', 'Coat', 'Load', 'Ship', 'Unload', 'Stock',
      'Issue', 'Erect', 'Align', 'Weld', 'NDE', 'PWHT', 'Install',
      'Pressure Test', 'Insulate', 'Paint', 'Turnover'
    ]
    LOOP
      -- Skip if milestone doesn't exist
      IF component_record.current_milestones->milestone_name IS NULL THEN
        CONTINUE;
      END IF;

      -- Check if value is boolean true (stored as JSON true)
      IF jsonb_typeof(component_record.current_milestones->milestone_name) = 'boolean' THEN
        IF (component_record.current_milestones->>milestone_name)::boolean = true THEN
          -- Convert boolean true to numeric 100
          updated_milestones := jsonb_set(
            updated_milestones,
            ARRAY[milestone_name],
            to_jsonb(100::numeric)
          );
        ELSIF (component_record.current_milestones->>milestone_name)::boolean = false THEN
          -- Convert boolean false to numeric 0
          updated_milestones := jsonb_set(
            updated_milestones,
            ARRAY[milestone_name],
            to_jsonb(0::numeric)
          );
        END IF;
      -- Check if value is numeric 1 (old discrete format)
      ELSIF jsonb_typeof(component_record.current_milestones->milestone_name) = 'number' THEN
        milestone_value := (component_record.current_milestones->>milestone_name)::NUMERIC;
        IF milestone_value = 1 THEN
          -- Convert numeric 1 to numeric 100
          updated_milestones := jsonb_set(
            updated_milestones,
            ARRAY[milestone_name],
            to_jsonb(100::numeric)
          );
        END IF;
      END IF;
    END LOOP;

    -- Update component if any changes were made
    IF updated_milestones != component_record.current_milestones THEN
      UPDATE components
      SET current_milestones = updated_milestones
      WHERE id = component_record.id;
    END IF;
  END LOOP;
END $$;

-- Step 3: Update RPC function to use 100 instead of 1 for discrete milestones
DROP FUNCTION IF EXISTS update_component_milestone(UUID, TEXT, NUMERIC, UUID);

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
  'Atomically updates a component milestone, recalculates progress, creates audit event, and refreshes drawing progress view. Uses 0-100 scale for all milestones (discrete: 0 or 100, partial: 0-100).';
