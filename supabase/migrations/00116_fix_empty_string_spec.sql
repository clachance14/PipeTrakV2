-- Migration: Fix get_most_common_spec_per_drawing to exclude empty strings
-- Purpose: Prevent empty string specs from being counted as valid spec values
-- Issue: Components with attributes.spec = "" were being counted, causing empty
--        display when empty strings outnumbered actual spec values

-- Replace the function with updated version that excludes empty strings
CREATE OR REPLACE FUNCTION get_most_common_spec_per_drawing(p_project_id uuid)
RETURNS TABLE (
  drawing_id uuid,
  most_common_spec text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    c.drawing_id,
    -- Get the most frequently occurring spec value (excluding NULL and empty strings)
    (
      SELECT attributes->>'spec'
      FROM components AS c2
      WHERE c2.drawing_id = c.drawing_id
        AND c2.attributes->>'spec' IS NOT NULL
        AND c2.attributes->>'spec' != ''  -- Exclude empty strings
        AND c2.is_retired = false
      GROUP BY attributes->>'spec'
      ORDER BY COUNT(*) DESC, attributes->>'spec'
      LIMIT 1
    ) AS most_common_spec
  FROM components c
  WHERE c.project_id = p_project_id
    AND c.drawing_id IS NOT NULL
    AND c.is_retired = false
  GROUP BY c.drawing_id
$$;

-- Comment explaining the fix
COMMENT ON FUNCTION get_most_common_spec_per_drawing IS
  'Returns the most frequently occurring non-empty spec value from component attributes for each drawing. Empty strings and NULL values are excluded from the calculation.';
