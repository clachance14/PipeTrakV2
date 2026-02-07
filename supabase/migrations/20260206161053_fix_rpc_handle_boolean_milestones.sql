-- Migration: Make update_component_milestone RPC resilient to boolean JSONB values
--
-- Root cause: import-takeoff/transaction-v2.ts initialized pipe discrete milestones
-- (Punch, Test, Restore) with boolean false instead of numeric 0.
-- The RPC casts (current_milestones->>name)::NUMERIC which fails on "false".
--
-- Fix:
-- 1. Add safe_milestone_numeric() helper to convert boolean/numeric JSONB values
-- 2. Recreate update_component_milestone using the helper
-- 3. Clean up any existing boolean values in current_milestones

-- Step 1: Helper function to safely extract numeric from milestone JSONB values
-- Handles: numeric (pass-through), boolean (true→100, false→0), null
CREATE OR REPLACE FUNCTION safe_milestone_numeric(p_milestones JSONB, p_key TEXT)
RETURNS NUMERIC AS $$
DECLARE
  v_type TEXT;
BEGIN
  IF p_milestones IS NULL OR NOT p_milestones ? p_key THEN
    RETURN NULL;
  END IF;

  v_type := jsonb_typeof(p_milestones->p_key);

  IF v_type = 'boolean' THEN
    RETURN CASE WHEN (p_milestones->>p_key)::BOOLEAN THEN 100 ELSE 0 END;
  ELSIF v_type = 'number' THEN
    RETURN (p_milestones->>p_key)::NUMERIC;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Recreate update_component_milestone using safe extraction
DROP FUNCTION IF EXISTS update_component_milestone(UUID, TEXT, NUMERIC, UUID, JSONB);

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
  -- Variables for delta_mh calculation
  v_template_weight NUMERIC;
  v_template_category TEXT;
  v_delta_mh NUMERIC;
  -- Variable for merged metadata
  v_merged_metadata JSONB;
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

  -- Get previous value safely (handles boolean or numeric JSONB values)
  v_previous_value := safe_milestone_numeric(v_component.current_milestones, p_milestone_name);

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

    -- Safely read milestone value (handles boolean or numeric)
    v_milestone_value := safe_milestone_numeric(v_new_milestones, v_milestone_name);

    -- Skip if milestone not yet completed/started
    IF v_milestone_value IS NULL THEN
      CONTINUE;
    END IF;

    -- Add to total based on milestone type
    IF v_milestone_is_partial THEN
      -- Partial milestone: value is 0-100, multiply by weight
      v_new_percent := v_new_percent + (v_milestone_weight * v_milestone_value / 100.0);
    ELSE
      -- Discrete milestone uses 100 (not 1) for completion
      -- All milestones now use consistent 0-100 scale
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

  -- Build metadata by merging client metadata with calculated values
  v_merged_metadata := COALESCE(p_metadata, '{}'::JSONB) || jsonb_build_object(
    'old_percent_complete', v_component.percent_complete,
    'new_percent_complete', v_new_percent
  );

  -- Create audit event with merged metadata
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

  -- Refresh materialized view (blocking to ensure data consistency)
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
GRANT EXECUTE ON FUNCTION update_component_milestone(UUID, TEXT, NUMERIC, UUID, JSONB) TO authenticated;

-- Step 3: Clean up existing boolean values in current_milestones
UPDATE components
SET current_milestones = (
  SELECT jsonb_object_agg(
    key,
    CASE jsonb_typeof(value)
      WHEN 'boolean' THEN
        CASE WHEN value::TEXT = 'true' THEN '100'::JSONB ELSE '0'::JSONB END
      ELSE value
    END
  )
  FROM jsonb_each(current_milestones)
)
WHERE current_milestones IS NOT NULL
  AND current_milestones::TEXT ~ '(true|false)';
