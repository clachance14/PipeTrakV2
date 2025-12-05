-- Migration: Create get_milestone_weight function for manhour reports
-- Feature: 032-manhour-earned-value (Reports integration)
-- Purpose: Get project-specific milestone weight for standardized milestone categories
--
-- Returns weight as decimal (0.0-1.0) for allocating manhour budgets per milestone
-- Looks up from project_progress_templates first, falls back to progress_templates

CREATE OR REPLACE FUNCTION get_milestone_weight(
  p_project_id UUID,
  p_component_type TEXT,
  p_standard_milestone TEXT  -- 'receive', 'install', 'punch', 'test', 'restore'
) RETURNS NUMERIC AS $$
DECLARE
  v_weight NUMERIC := 0;
  v_use_project_templates BOOLEAN := false;
  v_milestone_names TEXT[];
  v_name TEXT;
  v_milestone_weight NUMERIC;
BEGIN
  -- Check if project has custom templates
  IF EXISTS (
    SELECT 1 FROM project_progress_templates
    WHERE project_id = p_project_id
      AND component_type = p_component_type
    LIMIT 1
  ) THEN
    v_use_project_templates := true;
  END IF;

  -- Map standard milestone to component-specific milestone names
  -- Some standards map to multiple milestones (e.g., Install = Erect + Connect for spool)
  CASE p_standard_milestone
    WHEN 'receive' THEN
      CASE p_component_type
        WHEN 'field_weld' THEN
          -- Field welds have no receive milestone
          RETURN 0;
        ELSE
          v_milestone_names := ARRAY['Receive'];
      END CASE;

    WHEN 'install' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          v_milestone_names := ARRAY['Erect', 'Connect'];
        WHEN 'field_weld' THEN
          v_milestone_names := ARRAY['Fit-Up', 'Weld Made'];
        WHEN 'threaded_pipe' THEN
          v_milestone_names := ARRAY['Fabricate', 'Install', 'Erect', 'Connect', 'Support'];
        ELSE
          v_milestone_names := ARRAY['Install'];
      END CASE;

    WHEN 'punch' THEN
      CASE p_component_type
        WHEN 'field_weld' THEN
          v_milestone_names := ARRAY['Repair Complete'];
        WHEN 'instrument' THEN
          v_milestone_names := ARRAY['Punch Complete'];
        ELSE
          v_milestone_names := ARRAY['Punch Complete'];
      END CASE;

    WHEN 'test' THEN
      CASE p_component_type
        WHEN 'spool' THEN
          v_milestone_names := ARRAY['Hydrotest'];
        WHEN 'field_weld' THEN
          v_milestone_names := ARRAY['NDE Final'];
        WHEN 'threaded_pipe' THEN
          v_milestone_names := ARRAY['Hydrotest'];
        ELSE
          v_milestone_names := ARRAY['Test'];
      END CASE;

    WHEN 'restore' THEN
      CASE p_component_type
        WHEN 'field_weld' THEN
          v_milestone_names := ARRAY['Paint'];
        WHEN 'support' THEN
          v_milestone_names := ARRAY['Insulate'];
        ELSE
          v_milestone_names := ARRAY['Restore'];
      END CASE;

    ELSE
      RETURN 0;
  END CASE;

  -- Sum weights from all mapped milestone names
  IF v_use_project_templates THEN
    -- Use project-specific templates
    FOR v_name IN SELECT unnest(v_milestone_names) LOOP
      SELECT COALESCE(weight, 0) / 100.0
      INTO v_milestone_weight
      FROM project_progress_templates
      WHERE project_id = p_project_id
        AND component_type = p_component_type
        AND milestone_name = v_name;

      v_weight := v_weight + COALESCE(v_milestone_weight, 0);
    END LOOP;
  ELSE
    -- Fall back to system templates (JSONB format)
    FOR v_name IN SELECT unnest(v_milestone_names) LOOP
      SELECT COALESCE((m.milestone->>'weight')::NUMERIC / 100.0, 0)
      INTO v_milestone_weight
      FROM progress_templates pt,
           LATERAL jsonb_array_elements(pt.milestones_config) AS m(milestone)
      WHERE pt.component_type = p_component_type
        AND pt.version = 1  -- Use version 1 (default)
        AND m.milestone->>'name' = v_name;

      v_weight := v_weight + COALESCE(v_milestone_weight, 0);
    END LOOP;
  END IF;

  RETURN v_weight;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_milestone_weight(UUID, TEXT, TEXT) IS
'Returns the weight (0.0-1.0) for a standardized milestone category based on project templates.
Used for calculating manhour budget allocation per milestone in reports.
Standard milestones: receive, install, punch, test, restore';
