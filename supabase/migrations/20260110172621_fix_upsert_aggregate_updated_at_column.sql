-- Fix upsert_aggregate_threaded_pipe function: use last_updated_at instead of updated_at
-- The components table has last_updated_at, not updated_at

CREATE OR REPLACE FUNCTION upsert_aggregate_threaded_pipe(
  p_project_id uuid,
  p_drawing_id uuid,
  p_template_id uuid,
  p_identity_key jsonb,
  p_attributes jsonb,
  p_current_milestones jsonb,
  p_area_id uuid,
  p_system_id uuid,
  p_test_package_id uuid,
  p_additional_linear_feet numeric,
  p_new_line_number text
)
RETURNS TABLE(
  component_id uuid,
  was_created boolean,
  total_linear_feet numeric,
  line_numbers jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_id uuid;
  v_existing_total numeric;
  v_existing_line_numbers jsonb;
  v_updated_total numeric;
  v_updated_line_numbers jsonb;
  v_new_id uuid;
BEGIN
  -- Input validation
  IF p_additional_linear_feet IS NULL OR p_additional_linear_feet <= 0 THEN
    RAISE EXCEPTION 'additional_linear_feet must be positive, got: %', p_additional_linear_feet;
  END IF;

  IF p_new_line_number IS NULL OR p_new_line_number = '' THEN
    RAISE EXCEPTION 'new_line_number is required';
  END IF;

  -- Ensure identity_key has pipe_id
  IF NOT (p_identity_key ? 'pipe_id') THEN
    RAISE EXCEPTION 'identity_key must contain pipe_id for threaded_pipe aggregates';
  END IF;

  -- Step 1: Try to find existing component WITH ROW LOCK
  SELECT
    id,
    (attributes->>'total_linear_feet')::numeric,
    COALESCE(attributes->'line_numbers', '[]'::jsonb)
  INTO
    v_existing_id,
    v_existing_total,
    v_existing_line_numbers
  FROM components
  WHERE
    project_id = p_project_id
    AND component_type = 'threaded_pipe'
    AND identity_key = p_identity_key
    AND is_retired = false
  FOR UPDATE;

  -- Step 2: If component exists, UPDATE it atomically
  IF FOUND THEN
    v_updated_total := v_existing_total + p_additional_linear_feet;

    IF v_existing_line_numbers @> to_jsonb(ARRAY[p_new_line_number]) THEN
      v_updated_line_numbers := v_existing_line_numbers;
    ELSE
      v_updated_line_numbers := v_existing_line_numbers || to_jsonb(ARRAY[p_new_line_number]);
    END IF;

    UPDATE components
    SET
      attributes = jsonb_set(
        jsonb_set(
          attributes,
          '{total_linear_feet}',
          to_jsonb(v_updated_total)
        ),
        '{line_numbers}',
        v_updated_line_numbers
      ),
      last_updated_at = now()  -- Fixed: was updated_at
    WHERE id = v_existing_id;

    RETURN QUERY SELECT
      v_existing_id,
      false,
      v_updated_total,
      v_updated_line_numbers;

  -- Step 3: If component doesn't exist, INSERT it
  ELSE
    v_new_id := gen_random_uuid();
    v_updated_line_numbers := to_jsonb(ARRAY[p_new_line_number]);

    INSERT INTO components (
      id,
      project_id,
      drawing_id,
      component_type,
      progress_template_id,  -- Fixed: was template_id
      identity_key,
      attributes,
      current_milestones,
      area_id,
      system_id,
      test_package_id
    ) VALUES (
      v_new_id,
      p_project_id,
      p_drawing_id,
      'threaded_pipe',
      p_template_id,
      p_identity_key,
      jsonb_set(
        p_attributes,
        '{line_numbers}',
        v_updated_line_numbers
      ),
      p_current_milestones,
      p_area_id,
      p_system_id,
      p_test_package_id
    );

    RETURN QUERY SELECT
      v_new_id,
      true,
      p_additional_linear_feet,
      v_updated_line_numbers;
  END IF;
END;
$$;
