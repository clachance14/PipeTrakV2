-- Migration: Create field_weld_events table and RPC functions for audit logging
-- Purpose: Track all welder assignment changes (assign, update, clear) with audit trail
-- Feature: Edit Weld with Clear Assignment
--
-- Tables created: field_weld_events
-- Functions created: update_weld_assignment, clear_weld_assignment
-- RLS policies: 2 (SELECT, INSERT)

-- ============================================================================
-- PART 1: CREATE AUDIT TABLE
-- ============================================================================

CREATE TABLE field_weld_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_weld_id UUID NOT NULL REFERENCES field_welds(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('assign', 'update', 'clear')),
  welder_id UUID REFERENCES welders(id),           -- welder at time of event (for assign/update)
  previous_welder_id UUID REFERENCES welders(id),  -- previous welder (for updates/clears)
  date_welded DATE,                                 -- date at time of event
  previous_date_welded DATE,                        -- previous date
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB                                    -- rollback reasons, etc.
);

COMMENT ON TABLE field_weld_events IS 'Audit trail of welder assignment changes (assign, update, clear) with optional rollback reason metadata';
COMMENT ON COLUMN field_weld_events.action IS 'Type of change: assign (new), update (edit), clear (remove)';
COMMENT ON COLUMN field_weld_events.metadata IS 'Optional context for clears: {"rollback_reason": "...", "rollback_reason_label": "...", "rollback_details": "..."}';

-- ============================================================================
-- PART 2: INDEXES
-- ============================================================================

CREATE INDEX idx_field_weld_events_field_weld_id ON field_weld_events(field_weld_id);
CREATE INDEX idx_field_weld_events_created_at ON field_weld_events(created_at DESC);
CREATE INDEX idx_field_weld_events_user_id ON field_weld_events(user_id);
CREATE INDEX idx_field_weld_events_action ON field_weld_events(action);

-- ============================================================================
-- PART 3: RLS POLICIES
-- ============================================================================

ALTER TABLE field_weld_events ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view events for field welds in their organization
CREATE POLICY "Users can view field_weld_events for their org"
  ON field_weld_events FOR SELECT
  USING (
    field_weld_id IN (
      SELECT fw.id FROM field_welds fw
      JOIN components c ON fw.component_id = c.id
      JOIN projects p ON c.project_id = p.id
      WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

-- INSERT: Users can insert events if they are the acting user
CREATE POLICY "Users can insert field_weld_events"
  ON field_weld_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PART 4: RPC FUNCTIONS
-- ============================================================================

-- Function: update_weld_assignment
-- Purpose: Update welder assignment with audit logging (no reason required)
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

COMMENT ON FUNCTION update_weld_assignment IS 'Update welder assignment with audit logging. No reason required for edits.';

-- Function: clear_weld_assignment
-- Purpose: Clear welder assignment with audit logging (reason required via metadata)
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

COMMENT ON FUNCTION clear_weld_assignment IS 'Clear welder assignment with audit logging. Blocks if NDE results exist. Accepts optional metadata with rollback reason.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
