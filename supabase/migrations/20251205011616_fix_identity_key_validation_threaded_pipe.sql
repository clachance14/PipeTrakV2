-- Migration: Fix identity_key validation for threaded_pipe and pipe types
-- Feature: 032-manhour-earned-value
-- Description: Allow pipe_id format for threaded_pipe (existing data) and add pipe type
--
-- Problem: Existing threaded_pipe components use {pipe_id: "..."} but constraint expects
--          {drawing_norm, commodity_code, size, seq}. This causes UPDATE to fail.
--
-- Fix: Allow EITHER format for threaded_pipe, add pipe type validation

-- ============================================================================
-- STEP 1: Drop existing constraint (must be dropped before altering function)
-- ============================================================================
ALTER TABLE components DROP CONSTRAINT IF EXISTS chk_identity_key_structure;

-- ============================================================================
-- STEP 2: Update validation function
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_component_identity_key(
  p_component_type TEXT,
  p_identity_key JSONB
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN CASE p_component_type
    WHEN 'spool' THEN
      p_identity_key ? 'spool_id' AND
      jsonb_typeof(p_identity_key->'spool_id') = 'string'

    WHEN 'field_weld' THEN
      p_identity_key ? 'weld_number' AND
      jsonb_typeof(p_identity_key->'weld_number') = 'string'

    WHEN 'support' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq' AND
      jsonb_typeof(p_identity_key->'seq') = 'number'

    WHEN 'valve' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq' AND
      jsonb_typeof(p_identity_key->'seq') = 'number'

    WHEN 'fitting' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq' AND
      jsonb_typeof(p_identity_key->'seq') = 'number'

    WHEN 'flange' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq' AND
      jsonb_typeof(p_identity_key->'seq') = 'number'

    WHEN 'instrument' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq' AND
      jsonb_typeof(p_identity_key->'seq') = 'number'

    WHEN 'tubing' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq' AND
      jsonb_typeof(p_identity_key->'seq') = 'number'

    WHEN 'hose' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq' AND
      jsonb_typeof(p_identity_key->'seq') = 'number'

    WHEN 'misc_component' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq' AND
      jsonb_typeof(p_identity_key->'seq') = 'number'

    -- FIX: threaded_pipe allows EITHER pipe_id format OR standard format
    WHEN 'threaded_pipe' THEN
      (
        -- Legacy format: just pipe_id
        p_identity_key ? 'pipe_id' AND
        jsonb_typeof(p_identity_key->'pipe_id') = 'string'
      ) OR (
        -- Standard format: drawing_norm, commodity_code, size, seq
        p_identity_key ? 'drawing_norm' AND
        p_identity_key ? 'commodity_code' AND
        p_identity_key ? 'size' AND
        p_identity_key ? 'seq' AND
        jsonb_typeof(p_identity_key->'seq') = 'number'
      )

    -- NEW: pipe type (same as standard components)
    WHEN 'pipe' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq' AND
      jsonb_typeof(p_identity_key->'seq') = 'number'

    ELSE FALSE  -- Unknown component type
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_component_identity_key IS 'Validate identity_key structure matches component_type schema. threaded_pipe allows legacy pipe_id format.';

-- ============================================================================
-- STEP 3: Re-add constraint
-- ============================================================================
ALTER TABLE components
ADD CONSTRAINT chk_identity_key_structure
CHECK (validate_component_identity_key(component_type, identity_key));

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
