-- ============================================================================
-- Migration 00119: Atomic Aggregate Threaded Pipe Upsert
-- ============================================================================
-- Purpose: Fix race condition in aggregate threaded pipe imports by using
--          row-level locking (SELECT...FOR UPDATE) in a database function
--
-- Issue: Concurrent imports using SELECT → UPDATE pattern can cause lost updates
--        Example: Import A and B both see 100 LF, A sets 150, B overwrites to 130
--                 (should be 180 - lost 50 LF from import A)
--
-- Solution: Atomic upsert function that locks the row during read-modify-write
-- ============================================================================

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
  -- This prevents concurrent transactions from reading the same initial value
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
  FOR UPDATE; -- Row-level lock: blocks other transactions from modifying this row

  -- Step 2: If component exists, UPDATE it atomically
  IF FOUND THEN
    -- Calculate new total and append line number
    v_updated_total := v_existing_total + p_additional_linear_feet;

    -- Add line number to array if not already present
    IF v_existing_line_numbers @> to_jsonb(ARRAY[p_new_line_number]) THEN
      v_updated_line_numbers := v_existing_line_numbers;
    ELSE
      v_updated_line_numbers := v_existing_line_numbers || to_jsonb(ARRAY[p_new_line_number]);
    END IF;

    -- Update the locked row
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
      updated_at = now()
    WHERE id = v_existing_id;

    -- Return updated component info
    RETURN QUERY SELECT
      v_existing_id,
      false, -- was_created
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
      template_id,
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

    -- Return new component info
    RETURN QUERY SELECT
      v_new_id,
      true, -- was_created
      p_additional_linear_feet,
      v_updated_line_numbers;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
-- (RLS policies on components table still apply for subsequent reads)
GRANT EXECUTE ON FUNCTION upsert_aggregate_threaded_pipe TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION upsert_aggregate_threaded_pipe IS
'Atomically upserts aggregate threaded pipe components with row-level locking to prevent lost updates during concurrent imports. Uses SELECT...FOR UPDATE to lock rows during read-modify-write operations.';
