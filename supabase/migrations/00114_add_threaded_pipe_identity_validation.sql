-- Migration 00098: Add threaded_pipe validation to identity_key constraint
-- Purpose: Fix validation function to support threaded_pipe with pipe_id structure
-- Related: Migration 00097 (threaded pipe aggregate model)

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

    WHEN 'pipe' THEN
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

    WHEN 'threaded_pipe' THEN
      -- Aggregate model: pipe_id only (format: "{drawing}-{size}-{cmdty}-AGG")
      p_identity_key ? 'pipe_id' AND
      jsonb_typeof(p_identity_key->'pipe_id') = 'string'

    ELSE
      FALSE
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_component_identity_key IS 'Validates identity_key structure for each component type (includes threaded_pipe aggregate model)';
