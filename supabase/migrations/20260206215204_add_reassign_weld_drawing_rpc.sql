-- Migration: Add reassign_field_weld_drawing RPC
-- Feature: Drawing reassignment for field welds (pre-weld only)
--
-- Changes:
-- 1. Expand field_weld_events action CHECK to include 'reassign_drawing'
-- 2. Create reassign_field_weld_drawing() SECURITY DEFINER RPC

-- ============================================================================
-- PART 1: Expand field_weld_events action CHECK constraint
-- ============================================================================

ALTER TABLE field_weld_events DROP CONSTRAINT IF EXISTS field_weld_events_action_check;
ALTER TABLE field_weld_events
  ADD CONSTRAINT field_weld_events_action_check
  CHECK (action IN ('assign', 'update', 'clear', 'nde_record', 'nde_update', 'nde_clear', 'update_specs', 'retire', 'reassign_drawing'));

-- ============================================================================
-- PART 2: reassign_field_weld_drawing RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION reassign_field_weld_drawing(
  p_field_weld_id UUID,
  p_new_drawing_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_field_weld RECORD;
  v_component RECORD;
  v_old_drawing RECORD;
  v_new_drawing RECORD;
  v_weld_no TEXT;
BEGIN
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

  -- Get current field weld state
  SELECT * INTO v_field_weld FROM field_welds WHERE id = p_field_weld_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Field weld not found';
  END IF;

  -- Guard: weld must have no welder assigned (pre-weld state only)
  IF v_field_weld.welder_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot reassign drawing: a welder has already been assigned to this weld';
  END IF;

  -- Get the linked component
  SELECT * INTO v_component FROM components WHERE id = v_field_weld.component_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linked component not found';
  END IF;

  -- No-op if drawing hasn't changed
  IF v_component.drawing_id = p_new_drawing_id THEN
    RETURN jsonb_build_object('success', true, 'message', 'Drawing unchanged');
  END IF;

  -- Get the old drawing for audit trail
  SELECT * INTO v_old_drawing FROM drawings WHERE id = v_component.drawing_id;

  -- Get the new drawing and validate it
  SELECT * INTO v_new_drawing FROM drawings WHERE id = p_new_drawing_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target drawing not found';
  END IF;

  -- Guard: new drawing must belong to the same project
  IF v_new_drawing.project_id != v_component.project_id THEN
    RAISE EXCEPTION 'Target drawing does not belong to the same project';
  END IF;

  -- Guard: new drawing must not be retired
  IF v_new_drawing.is_retired THEN
    RAISE EXCEPTION 'Cannot reassign to a retired drawing';
  END IF;

  -- Guard: no duplicate weld number on the target drawing
  v_weld_no := v_field_weld.identity_key->>'weld_no';
  IF v_weld_no IS NOT NULL AND EXISTS (
    SELECT 1 FROM field_welds fw2
    JOIN components c2 ON fw2.component_id = c2.id
    WHERE c2.drawing_id = p_new_drawing_id
      AND c2.is_retired = false
      AND fw2.id != p_field_weld_id
      AND fw2.identity_key->>'weld_no' = v_weld_no
  ) THEN
    RAISE EXCEPTION 'Duplicate weld number: weld % already exists on drawing %', v_weld_no, v_new_drawing.drawing_no_norm;
  END IF;

  -- Record audit event
  INSERT INTO field_weld_events (
    field_weld_id, action, user_id, metadata
  ) VALUES (
    p_field_weld_id, 'reassign_drawing', p_user_id,
    jsonb_build_object(
      'previous_drawing_id', v_component.drawing_id,
      'previous_drawing_no', COALESCE(v_old_drawing.drawing_no_norm, 'Unknown'),
      'new_drawing_id', p_new_drawing_id,
      'new_drawing_no', v_new_drawing.drawing_no_norm
    )
  );

  -- Update the component's drawing assignment
  UPDATE components
  SET drawing_id = p_new_drawing_id
  WHERE id = v_field_weld.component_id;

  -- Refresh materialized views so dashboards update
  PERFORM refresh_materialized_views();

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION reassign_field_weld_drawing IS 'Reassign a field weld to a different drawing. Only allowed for pre-weld state (no welder assigned). Guards against duplicate weld numbers on target drawing. Refreshes materialized views.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
