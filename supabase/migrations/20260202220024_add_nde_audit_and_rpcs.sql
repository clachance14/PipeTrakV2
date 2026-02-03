-- Migration: Add NDE audit columns and RPCs for recording, updating, and clearing NDE results
-- Purpose: Enable full audit trail for NDE changes, move NDE logic to SECURITY DEFINER RPCs
-- Dependencies: field_weld_events table (20260124135957), field_welds table (00033)

-- ============================================================================
-- PART 1: EXPAND field_weld_events TABLE
-- ============================================================================

-- Add NDE-specific columns
ALTER TABLE field_weld_events
  ADD COLUMN IF NOT EXISTS nde_type TEXT,
  ADD COLUMN IF NOT EXISTS nde_result TEXT,
  ADD COLUMN IF NOT EXISTS previous_nde_type TEXT,
  ADD COLUMN IF NOT EXISTS previous_nde_result TEXT;

-- Expand action CHECK constraint to include NDE actions
-- Drop old constraint and create new one
ALTER TABLE field_weld_events DROP CONSTRAINT IF EXISTS field_weld_events_action_check;
ALTER TABLE field_weld_events
  ADD CONSTRAINT field_weld_events_action_check
  CHECK (action IN ('assign', 'update', 'clear', 'nde_record', 'nde_update', 'nde_clear'));

-- ============================================================================
-- PART 2: record_nde_result RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION record_nde_result(
  p_field_weld_id UUID,
  p_nde_type TEXT,
  p_nde_result TEXT,
  p_nde_date DATE,
  p_nde_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_field_weld RECORD;
  v_milestone_config JSONB;
  v_all_milestones JSONB;
BEGIN
  -- Permission check
  IF NOT EXISTS (
    SELECT 1 FROM field_welds fw
    JOIN components c ON fw.component_id = c.id
    JOIN projects p ON c.project_id = p.id
    JOIN users u ON u.organization_id = p.organization_id
    WHERE fw.id = p_field_weld_id AND u.id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: user does not have permission for this field weld';
  END IF;

  -- Get current state
  SELECT * INTO v_field_weld FROM field_welds WHERE id = p_field_weld_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Field weld not found';
  END IF;

  -- Guard: welder must be assigned
  IF v_field_weld.welder_id IS NULL THEN
    RAISE EXCEPTION 'Cannot record NDE: welder must be assigned first';
  END IF;

  -- Guard: NDE must not already exist
  IF v_field_weld.nde_result IS NOT NULL THEN
    RAISE EXCEPTION 'NDE result already recorded. Use update_nde_result to modify.';
  END IF;

  -- Log audit event
  INSERT INTO field_weld_events (
    field_weld_id, action,
    nde_type, nde_result,
    user_id
  ) VALUES (
    p_field_weld_id, 'nde_record',
    p_nde_type, p_nde_result,
    p_user_id
  );

  -- Update field_weld NDE columns
  -- Status: PASS → 'accepted', FAIL → trigger handles it, PENDING → 'active'
  UPDATE field_welds
  SET
    nde_type = p_nde_type,
    nde_result = p_nde_result,
    nde_date = p_nde_date,
    nde_notes = p_nde_notes,
    status = CASE
      WHEN p_nde_result = 'PASS' THEN 'accepted'
      ELSE 'active'  -- FAIL handled by handle_weld_rejection trigger
    END
  WHERE id = p_field_weld_id;

  -- If PASS: set all milestones to 100 and percent_complete to 100
  IF p_nde_result = 'PASS' THEN
    -- Get milestone config from template to build all-100 milestones
    SELECT milestones_config INTO v_milestone_config
    FROM progress_templates
    WHERE component_type = 'field_weld'
    ORDER BY version DESC
    LIMIT 1;

    -- Build milestones object with all keys set to 100
    SELECT jsonb_object_agg(elem->>'name', 100)
    INTO v_all_milestones
    FROM jsonb_array_elements(v_milestone_config) AS elem;

    UPDATE components
    SET
      percent_complete = 100,
      current_milestones = v_all_milestones
    WHERE id = v_field_weld.component_id;
  END IF;
  -- FAIL is handled by handle_weld_rejection trigger (sets status='rejected', 100% complete)
  -- PENDING: no milestone changes needed

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION record_nde_result IS 'Record NDE result for first time. Sets milestones on PASS. FAIL handled by trigger. Logs audit event.';

-- ============================================================================
-- PART 3: update_nde_result RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION update_nde_result(
  p_field_weld_id UUID,
  p_nde_type TEXT,
  p_nde_result TEXT,
  p_nde_date DATE,
  p_nde_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_field_weld RECORD;
  v_milestone_config JSONB;
  v_all_milestones JSONB;
  v_partial_milestones JSONB;
  v_has_repair BOOLEAN;
BEGIN
  -- Permission check
  IF NOT EXISTS (
    SELECT 1 FROM field_welds fw
    JOIN components c ON fw.component_id = c.id
    JOIN projects p ON c.project_id = p.id
    JOIN users u ON u.organization_id = p.organization_id
    WHERE fw.id = p_field_weld_id AND u.id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: user does not have permission for this field weld';
  END IF;

  -- Get current state
  SELECT * INTO v_field_weld FROM field_welds WHERE id = p_field_weld_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Field weld not found';
  END IF;

  -- Guard: NDE must already exist
  IF v_field_weld.nde_result IS NULL THEN
    RAISE EXCEPTION 'No NDE result to update. Use record_nde_result first.';
  END IF;

  -- Repair weld guard: block changing FAIL result if repair weld exists
  IF v_field_weld.nde_result = 'FAIL' THEN
    SELECT EXISTS (
      SELECT 1 FROM field_welds WHERE original_weld_id = p_field_weld_id
    ) INTO v_has_repair;

    IF v_has_repair THEN
      RAISE EXCEPTION 'Cannot change NDE result from FAIL: a repair weld already exists for this weld.';
    END IF;
  END IF;

  -- Get milestone config from template
  SELECT milestones_config INTO v_milestone_config
  FROM progress_templates
  WHERE component_type = 'field_weld'
  ORDER BY version DESC
  LIMIT 1;

  -- Log audit event with previous values
  INSERT INTO field_weld_events (
    field_weld_id, action,
    nde_type, nde_result,
    previous_nde_type, previous_nde_result,
    user_id
  ) VALUES (
    p_field_weld_id, 'nde_update',
    p_nde_type, p_nde_result,
    v_field_weld.nde_type, v_field_weld.nde_result,
    p_user_id
  );

  -- Update field_weld NDE columns
  UPDATE field_welds
  SET
    nde_type = p_nde_type,
    nde_result = p_nde_result,
    nde_date = p_nde_date,
    nde_notes = p_nde_notes,
    status = CASE
      WHEN p_nde_result = 'PASS' THEN 'accepted'
      ELSE 'active'  -- FAIL handled by trigger
    END
  WHERE id = p_field_weld_id;

  -- Handle milestone transitions
  IF p_nde_result = 'PASS' THEN
    -- Set all milestones to 100, percent_complete = 100
    SELECT jsonb_object_agg(elem->>'name', 100)
    INTO v_all_milestones
    FROM jsonb_array_elements(v_milestone_config) AS elem;

    UPDATE components
    SET percent_complete = 100, current_milestones = v_all_milestones
    WHERE id = v_field_weld.component_id;

  ELSIF v_field_weld.nde_result = 'PASS' AND p_nde_result != 'PASS' THEN
    -- PASS → non-PASS: revert to Fit-up + Weld Complete only
    -- Build milestones with first two at 100, rest at 0
    SELECT jsonb_object_agg(
      elem->>'name',
      CASE
        WHEN elem->>'name' IN ('Fit-up', 'Weld Complete') THEN 100
        ELSE 0
      END
    )
    INTO v_partial_milestones
    FROM jsonb_array_elements(v_milestone_config) AS elem;

    -- Calculate percent from weights: Fit-up (30) + Weld Complete (65) = 95
    UPDATE components
    SET
      percent_complete = (
        SELECT COALESCE(SUM(
          CASE
            WHEN elem->>'name' IN ('Fit-up', 'Weld Complete') THEN (elem->>'weight')::int
            ELSE 0
          END
        ), 0)
        FROM jsonb_array_elements(v_milestone_config) AS elem
      ),
      current_milestones = v_partial_milestones,
      status = 'active'
    WHERE id = v_field_weld.component_id;
  END IF;
  -- FAIL case: handle_weld_rejection trigger will set status='rejected' and 100% complete

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION update_nde_result IS 'Update existing NDE result with audit trail. Blocks FAIL change if repair weld exists. Handles milestone transitions.';

-- ============================================================================
-- PART 4: clear_nde_result RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION clear_nde_result(
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
  v_milestone_config JSONB;
  v_partial_milestones JSONB;
  v_has_repair BOOLEAN;
BEGIN
  -- Permission check
  IF NOT EXISTS (
    SELECT 1 FROM field_welds fw
    JOIN components c ON fw.component_id = c.id
    JOIN projects p ON c.project_id = p.id
    JOIN users u ON u.organization_id = p.organization_id
    WHERE fw.id = p_field_weld_id AND u.id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied: user does not have permission for this field weld';
  END IF;

  -- Get current state
  SELECT * INTO v_field_weld FROM field_welds WHERE id = p_field_weld_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Field weld not found';
  END IF;

  -- Guard: NDE must exist
  IF v_field_weld.nde_result IS NULL THEN
    RAISE EXCEPTION 'No NDE result to clear.';
  END IF;

  -- Repair weld guard
  SELECT EXISTS (
    SELECT 1 FROM field_welds WHERE original_weld_id = p_field_weld_id
  ) INTO v_has_repair;

  IF v_has_repair THEN
    RAISE EXCEPTION 'Cannot clear NDE result: a repair weld already exists for this weld.';
  END IF;

  -- Require metadata (rollback reason)
  IF p_metadata IS NULL THEN
    RAISE EXCEPTION 'Metadata with rollback reason is required to clear NDE result.';
  END IF;

  -- Log audit event with previous values
  INSERT INTO field_weld_events (
    field_weld_id, action,
    previous_nde_type, previous_nde_result,
    user_id, metadata
  ) VALUES (
    p_field_weld_id, 'nde_clear',
    v_field_weld.nde_type, v_field_weld.nde_result,
    p_user_id, p_metadata
  );

  -- Clear NDE columns
  UPDATE field_welds
  SET
    nde_type = NULL,
    nde_result = NULL,
    nde_date = NULL,
    nde_notes = NULL,
    status = 'active'
  WHERE id = p_field_weld_id;

  -- Revert milestones to Fit-up + Weld Complete only
  SELECT milestones_config INTO v_milestone_config
  FROM progress_templates
  WHERE component_type = 'field_weld'
  ORDER BY version DESC
  LIMIT 1;

  SELECT jsonb_object_agg(
    elem->>'name',
    CASE
      WHEN elem->>'name' IN ('Fit-up', 'Weld Complete') THEN 100
      ELSE 0
    END
  )
  INTO v_partial_milestones
  FROM jsonb_array_elements(v_milestone_config) AS elem;

  UPDATE components
  SET
    percent_complete = (
      SELECT COALESCE(SUM(
        CASE
          WHEN elem->>'name' IN ('Fit-up', 'Weld Complete') THEN (elem->>'weight')::int
          ELSE 0
        END
      ), 0)
      FROM jsonb_array_elements(v_milestone_config) AS elem
    ),
    current_milestones = v_partial_milestones,
    status = 'active'
  WHERE id = v_field_weld.component_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION clear_nde_result IS 'Clear NDE result with audit trail. Blocks if repair weld exists. Requires metadata with rollback reason. Reverts milestones.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
