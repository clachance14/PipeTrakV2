-- Migration 00021: Fix RPC/trigger conflict for percent_complete
-- Feature: 010-let-s-spec (Drawing-Centered Component Progress Table)
-- Created: 2025-10-19
--
-- Problem: RPC function update_component_milestone calculates percent_complete
-- AND sets it in UPDATE statement, which overwrites the trigger's calculation.
-- Both RPC and trigger were calculating, RPC's value won.
--
-- Solution: Remove percent_complete from RPC's UPDATE statement.
-- Let trigger (migration 00020) be the single source of truth for calculation.

-- ============================================================================
-- Drop and recreate RPC function WITHOUT percent_complete in UPDATE
-- ============================================================================

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

  -- Update component with new milestones
  -- Note: percent_complete is auto-calculated by trigger (migration 00020)
  -- Do NOT set percent_complete here - let trigger handle it!
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
      'new_percent_complete', 'calculated_by_trigger'
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

GRANT EXECUTE ON FUNCTION update_component_milestone(UUID, TEXT, NUMERIC, UUID) TO authenticated;

COMMENT ON FUNCTION update_component_milestone IS
  'Atomically updates a component milestone and refreshes drawing progress view. Percent_complete is auto-calculated by trigger (migration 00020).';

-- ============================================================================
-- MIGRATION COMPLETE: 00021_fix_rpc_trigger_conflict.sql
-- ============================================================================
-- Changes:
-- - Removed percent_complete from UPDATE statement in RPC function
-- - Trigger (migration 00020) now handles ALL percent_complete calculations
-- - RPC fetches trigger-calculated value and returns it to client
-- - Eliminates race condition where RPC overwrote trigger's calculation
--
-- Result: Milestone updates now correctly persist percent_complete to database
-- ============================================================================
