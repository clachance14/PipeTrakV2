-- Migration: Fix permission checks in field_weld_events RPC functions
-- Issue: Functions used p_user_id parameter instead of auth.uid() for permission checks
-- Fix: Validate p_user_id matches auth.uid() and use auth.uid() for permission checks

-- Drop and recreate update_weld_assignment with proper auth check
CREATE OR REPLACE FUNCTION update_weld_assignment(
  p_field_weld_id UUID,
  p_welder_id UUID,
  p_date_welded DATE,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_field_weld RECORD;
BEGIN
  -- Validate caller is the user being recorded
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User ID mismatch: cannot perform action on behalf of another user';
  END IF;

  -- Permission check: verify authenticated user belongs to the org that owns this field weld
  IF NOT EXISTS (
    SELECT 1 FROM field_welds fw
    JOIN components c ON fw.component_id = c.id
    JOIN projects p ON c.project_id = p.id
    JOIN users u ON u.organization_id = p.organization_id
    WHERE fw.id = p_field_weld_id AND u.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: user does not have permission for this field weld';
  END IF;

  -- Get current state
  SELECT * INTO v_field_weld FROM field_welds WHERE id = p_field_weld_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Field weld not found';
  END IF;

  -- Record audit event
  INSERT INTO field_weld_events (
    field_weld_id, action,
    welder_id, date_welded,
    previous_welder_id, previous_date_welded,
    user_id
  ) VALUES (
    p_field_weld_id, 'update',
    p_welder_id, p_date_welded,
    v_field_weld.welder_id, v_field_weld.date_welded,
    p_user_id
  );

  -- Update the assignment
  UPDATE field_welds
  SET welder_id = p_welder_id, date_welded = p_date_welded
  WHERE id = p_field_weld_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION update_weld_assignment IS 'Update welder assignment with audit logging. Validates auth.uid() matches p_user_id.';

-- Drop and recreate clear_weld_assignment with proper auth check
CREATE OR REPLACE FUNCTION clear_weld_assignment(
  p_field_weld_id UUID,
  p_user_id UUID,
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_field_weld RECORD;
BEGIN
  -- Validate caller is the user being recorded
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User ID mismatch: cannot perform action on behalf of another user';
  END IF;

  -- Permission check: verify authenticated user belongs to the org that owns this field weld
  IF NOT EXISTS (
    SELECT 1 FROM field_welds fw
    JOIN components c ON fw.component_id = c.id
    JOIN projects p ON c.project_id = p.id
    JOIN users u ON u.organization_id = p.organization_id
    WHERE fw.id = p_field_weld_id AND u.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: user does not have permission for this field weld';
  END IF;

  -- Get current state
  SELECT * INTO v_field_weld FROM field_welds WHERE id = p_field_weld_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Field weld not found';
  END IF;

  -- Block if NDE exists
  IF v_field_weld.nde_result IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot clear assignment - NDE results exist. Clear NDE first.';
  END IF;

  -- Record audit event
  INSERT INTO field_weld_events (
    field_weld_id, action,
    previous_welder_id, previous_date_welded,
    user_id, metadata
  ) VALUES (
    p_field_weld_id, 'clear',
    v_field_weld.welder_id, v_field_weld.date_welded,
    p_user_id, p_metadata
  );

  -- Clear the assignment
  UPDATE field_welds
  SET welder_id = NULL, date_welded = NULL
  WHERE id = p_field_weld_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION clear_weld_assignment IS 'Clear welder assignment with audit logging. Validates auth.uid() matches p_user_id. Blocks if NDE results exist.';
