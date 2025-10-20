-- Migration: Add 'pipe' component type to validation function
-- Feature: 009-sprint-3-material
-- Date: 2025-10-19
--
-- Issue: The validate_component_identity_key function was missing 'pipe' type
-- Progress templates use 'pipe', but validation function only had 'threaded_pipe'

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
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq'

    ELSE FALSE  -- Unknown component type
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
