-- Migration: Add get_most_common_spec_per_drawing RPC function
-- Purpose: Fetch the most common spec value from components for each drawing
-- Feature: Drawing table spec column

-- Create function to get most common spec per drawing
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
    -- Get the most frequently occurring spec value
    (
      SELECT attributes->>'spec'
      FROM components AS c2
      WHERE c2.drawing_id = c.drawing_id
        AND c2.attributes->>'spec' IS NOT NULL
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_most_common_spec_per_drawing(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_most_common_spec_per_drawing IS
  'Returns the most frequently occurring spec value from component attributes for each drawing in a project. Used by drawing table to display predominant spec.';
