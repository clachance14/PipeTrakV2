-- Migration: Fix get_component_template() to select latest version instead of hardcoded v1
-- Feature: 035-revise-pipe-milestones
-- Issue: Function had version = 1 hardcoded, preventing new template versions from being used

-- Replace function to select latest version per component type
CREATE OR REPLACE FUNCTION get_component_template(
  p_project_id UUID,
  p_component_type TEXT
) RETURNS TABLE (
  milestone_name TEXT,
  weight NUMERIC,
  is_partial BOOLEAN,
  category TEXT,
  milestone_order INT
) AS $$
BEGIN
  -- Check if project has custom templates
  IF EXISTS (
    SELECT 1 FROM project_progress_templates
    WHERE project_id = p_project_id AND component_type = p_component_type
    LIMIT 1
  ) THEN
    -- Return project-specific templates
    RETURN QUERY
    SELECT
      ppt.milestone_name,
      ppt.weight::NUMERIC,
      ppt.is_partial,
      ppt.category,
      ppt.milestone_order
    FROM project_progress_templates ppt
    WHERE ppt.project_id = p_project_id
      AND ppt.component_type = p_component_type
    ORDER BY ppt.milestone_order;
  ELSE
    -- Fall back to system templates - SELECT LATEST VERSION per component type
    RETURN QUERY
    SELECT
      (m.milestone->>'name')::TEXT AS milestone_name,
      (m.milestone->>'weight')::NUMERIC AS weight,
      COALESCE((m.milestone->>'is_partial')::BOOLEAN, false) AS is_partial,
      (m.milestone->>'category')::TEXT AS category,
      (m.milestone->>'order')::INT AS milestone_order
    FROM progress_templates pt,
         LATERAL jsonb_array_elements(pt.milestones_config) AS m(milestone)
    WHERE pt.component_type = p_component_type
      AND pt.version = (
        SELECT MAX(version)
        FROM progress_templates
        WHERE component_type = p_component_type
      )
    ORDER BY (m.milestone->>'order')::INT;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_component_template(UUID, TEXT) IS
'Get milestone template for component type. Uses project-specific if exists, otherwise latest system template version.';
