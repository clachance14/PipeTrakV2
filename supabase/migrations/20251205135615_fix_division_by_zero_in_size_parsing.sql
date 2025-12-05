-- ============================================================================
-- Migration: Fix division by zero in parse_size_diameter function
-- PR Review: CodeRabbit identified potential division by zero for inputs like "1/0"
-- ============================================================================

-- Drop and recreate the function with the fix
CREATE OR REPLACE FUNCTION parse_size_diameter(p_size TEXT)
RETURNS NUMERIC AS $$
DECLARE
  v_match TEXT[];
  v_num1 NUMERIC;
  v_num2 NUMERIC;
BEGIN
  -- Null or empty check
  IF p_size IS NULL OR TRIM(p_size) = '' THEN
    RETURN NULL;
  END IF;

  -- Remove common suffixes and clean input
  p_size := TRIM(REGEXP_REPLACE(p_size, '["'']', '', 'g'));

  -- HALF special case
  IF UPPER(p_size) = 'HALF' THEN
    RETURN 0.5;
  END IF;

  -- Reducer format: "2X4" or "2x4" (return average)
  IF p_size ~ '^\d+(\.\d+)?[Xx]\d+(\.\d+)?$' THEN
    v_match := regexp_match(p_size, '^(\d+(?:\.\d+)?)[Xx](\d+(?:\.\d+)?)$');
    v_num1 := v_match[1]::NUMERIC;
    v_num2 := v_match[2]::NUMERIC;
    RETURN (v_num1 + v_num2) / 2.0;
  END IF;

  -- Fraction format: "1/2", "3/4"
  IF p_size ~ '^\d+/\d+$' THEN
    v_match := regexp_match(p_size, '^(\d+)/(\d+)$');
    v_num2 := v_match[2]::NUMERIC;
    -- Check for division by zero
    IF v_num2 = 0 THEN
      RETURN NULL;
    END IF;
    RETURN v_match[1]::NUMERIC / v_num2;
  END IF;

  -- Simple number: "2", "4", "2.5"
  IF p_size ~ '^\d+(\.\d+)?$' THEN
    RETURN p_size::NUMERIC;
  END IF;

  -- Unparseable
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION parse_size_diameter IS 'Parse SIZE field to numeric diameter (handles integers, fractions, reducers). Returns NULL for division by zero in fractions.';
