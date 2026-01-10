-- Migration: Update identity_key validation for pipe aggregate model
-- Feature: 035-revise-pipe-milestones
-- Description: Change pipe from seq-based quantity explosion to pipe_id aggregate model
--              (same pattern as threaded_pipe - QTY represents linear feet)
--
-- Previous: pipe used {drawing_norm, commodity_code, size, seq} (quantity explosion)
-- New:      pipe uses {pipe_id: "..."} (aggregate model with total_linear_feet)

-- ============================================================================
-- STEP 1: Drop existing constraint (must be dropped before altering function)
-- ============================================================================
ALTER TABLE components DROP CONSTRAINT IF EXISTS chk_identity_key_structure;

-- ============================================================================
-- STEP 2: Update validation function to allow pipe_id format for pipe
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

    -- threaded_pipe: aggregate model with pipe_id OR legacy seq-based
    WHEN 'threaded_pipe' THEN
      (
        -- Aggregate format: pipe_id (linear feet model)
        p_identity_key ? 'pipe_id' AND
        jsonb_typeof(p_identity_key->'pipe_id') = 'string'
      ) OR (
        -- Legacy format: seq-based
        p_identity_key ? 'drawing_norm' AND
        p_identity_key ? 'commodity_code' AND
        p_identity_key ? 'size' AND
        p_identity_key ? 'seq' AND
        jsonb_typeof(p_identity_key->'seq') = 'number'
      )

    -- UPDATED: pipe now uses aggregate model (same as threaded_pipe)
    -- QTY represents linear feet, not individual components
    WHEN 'pipe' THEN
      (
        -- NEW: Aggregate format with pipe_id (linear feet model)
        p_identity_key ? 'pipe_id' AND
        jsonb_typeof(p_identity_key->'pipe_id') = 'string'
      ) OR (
        -- Legacy format: seq-based (for any existing data)
        p_identity_key ? 'drawing_norm' AND
        p_identity_key ? 'commodity_code' AND
        p_identity_key ? 'size' AND
        p_identity_key ? 'seq' AND
        jsonb_typeof(p_identity_key->'seq') = 'number'
      )

    ELSE FALSE  -- Unknown component type
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_component_identity_key IS
'Validate identity_key structure matches component_type schema.
threaded_pipe and pipe use aggregate pipe_id format (linear feet model).';

-- ============================================================================
-- STEP 3: Re-add constraint
-- ============================================================================
ALTER TABLE components
ADD CONSTRAINT chk_identity_key_structure
CHECK (validate_component_identity_key(component_type, identity_key));

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
