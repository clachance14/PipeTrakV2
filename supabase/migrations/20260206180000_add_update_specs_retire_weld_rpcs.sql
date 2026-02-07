-- Migration: Add update_field_weld_specs and retire_field_weld RPCs
-- Feature: Enhanced Edit Weld Dialog + Retire Weld
--
-- Changes:
-- 1. Expand field_weld_events action CHECK to include 'update_specs' and 'retire'
-- 2. Create update_field_weld_specs() SECURITY DEFINER RPC
-- 3. Create retire_field_weld() SECURITY DEFINER RPC

-- ============================================================================
-- PART 1: Expand field_weld_events action CHECK constraint
-- ============================================================================

ALTER TABLE field_weld_events DROP CONSTRAINT IF EXISTS field_weld_events_action_check;
ALTER TABLE field_weld_events
  ADD CONSTRAINT field_weld_events_action_check
  CHECK (action IN ('assign', 'update', 'clear', 'nde_record', 'nde_update', 'nde_clear', 'update_specs', 'retire'));

-- ============================================================================
-- PART 2: update_field_weld_specs RPC
-- ============================================================================

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
BEGIN
  -- Validate weld type
  IF p_weld_type NOT IN ('BW', 'SW', 'FW', 'TW') THEN
    RAISE EXCEPTION 'Invalid weld type: %. Must be BW, SW, FW, or TW', p_weld_type;
  END IF;

  -- Permission check: verify user belongs to the org that owns this field weld
  IF NOT EXISTS (
    SELECT 1 FROM field_welds fw
    JOIN components c ON fw.component_id = c.id
    JOIN projects p ON c.project_id = p.id
    JOIN users u ON u.organization_id = p.organization_id
    WHERE fw.id = p_field_weld_id AND u.id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: user does not have permission for this field weld';
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

COMMENT ON FUNCTION update_field_weld_specs IS 'Update field weld specification fields (type, size, schedule, base_metal, spec) with audit logging.';

-- ============================================================================
-- PART 3: retire_field_weld RPC
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

COMMENT ON FUNCTION retire_field_weld IS 'Soft-delete a field weld by retiring its component. Blocks if repair welds exist. Preserves all related records. Refreshes materialized views.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
