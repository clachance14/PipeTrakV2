-- Migration: Fix get_most_common_spec_per_drawing to exclude supports and normalize
-- Issues:
--   1. Support components (G4G commodity codes) pollute the piping spec column
--   2. Stale un-normalized specs (e.g. "PU-32 CC") not cleaned up in SQL
-- Fixes:
--   - Exclude support component types (their specs are tag numbers, not piping specs)
--   - Apply SPLIT_PART to extract first token (strips trailing CC/contract codes)
--   - Exclude G4G commodity code patterns

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
    (
      SELECT UPPER(SPLIT_PART(c2.attributes->>'spec', ' ', 1))
      FROM components AS c2
      WHERE c2.drawing_id = c.drawing_id
        AND c2.attributes->>'spec' IS NOT NULL
        AND c2.attributes->>'spec' != ''
        AND c2.component_type != 'support'
        AND c2.attributes->>'spec' !~ '^G\d+G-'
        AND c2.is_retired = false
      GROUP BY UPPER(SPLIT_PART(c2.attributes->>'spec', ' ', 1))
      ORDER BY COUNT(*) DESC, UPPER(SPLIT_PART(c2.attributes->>'spec', ' ', 1))
      LIMIT 1
    ) AS most_common_spec
  FROM components c
  WHERE c.project_id = p_project_id
    AND c.drawing_id IS NOT NULL
    AND c.is_retired = false
  GROUP BY c.drawing_id
$$;

COMMENT ON FUNCTION get_most_common_spec_per_drawing(uuid) IS
  'Returns the most frequently occurring piping spec from non-support component attributes for each drawing. Excludes support components (tag numbers, not piping specs), empty strings, NULL values, and commodity codes (G4G-*). Applies first-token normalization to handle stale un-normalized data.';
