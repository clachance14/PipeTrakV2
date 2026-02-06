-- Migration: Add categories to pipe v2 template + fix get_milestone_weight for pipe
-- Issue 1: Pipe v2 template (20260110152434) was inserted AFTER category backfill (20251206153339),
--          so milestones_config JSONB lacks category keys. calculate_earned_milestone_value() returns 0.
-- Issue 2: get_milestone_weight() has no WHEN 'pipe' case for install/receive categories,
--          so pipe falls to ELSE which maps to ARRAY['Install'] - but pipe v2 has Erect/Connect/Support.

-- ============================================================================
-- PART 1: Add categories to pipe v2 system template (progress_templates)
-- ============================================================================

UPDATE progress_templates
SET milestones_config = (
  SELECT jsonb_agg(
    m || jsonb_build_object('category',
      CASE m->>'name'
        WHEN 'Receive' THEN 'receive'
        WHEN 'Erect' THEN 'install'
        WHEN 'Connect' THEN 'install'
        WHEN 'Support' THEN 'install'
        WHEN 'Punch' THEN 'punch'
        WHEN 'Test' THEN 'test'
        WHEN 'Restore' THEN 'restore'
        ELSE NULL
      END
    )
  )
  FROM jsonb_array_elements(milestones_config) m
)
WHERE component_type = 'pipe' AND version = 2;

-- ============================================================================
-- PART 2: Backfill categories on project_progress_templates for pipe
-- ============================================================================

-- Set category for pipe rows that have NULL category
UPDATE project_progress_templates
SET category = CASE milestone_name
  WHEN 'Receive' THEN 'receive'
  WHEN 'Erect' THEN 'install'
  WHEN 'Connect' THEN 'install'
  WHEN 'Support' THEN 'install'
  WHEN 'Punch' THEN 'punch'
  WHEN 'Test' THEN 'test'
  WHEN 'Restore' THEN 'restore'
  ELSE category  -- Preserve existing category if set
END
WHERE component_type = 'pipe'
  AND category IS NULL;

-- ============================================================================
-- PART 3: Fix get_milestone_weight() to handle pipe component type
-- ============================================================================

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
  CASE p_standard_milestone
    WHEN 'receive' THEN
      CASE p_component_type
        WHEN 'field_weld' THEN
          RETURN 0;
        WHEN 'pipe' THEN
          v_milestone_names := ARRAY['Receive'];
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
        WHEN 'pipe' THEN
          v_milestone_names := ARRAY['Erect', 'Connect', 'Support'];
        ELSE
          v_milestone_names := ARRAY['Install'];
      END CASE;

    WHEN 'punch' THEN
      CASE p_component_type
        WHEN 'field_weld' THEN
          v_milestone_names := ARRAY['Repair Complete'];
        WHEN 'instrument' THEN
          v_milestone_names := ARRAY['Punch Complete'];
        WHEN 'pipe' THEN
          v_milestone_names := ARRAY['Punch'];
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
        WHEN 'pipe' THEN
          v_milestone_names := ARRAY['Test'];
        ELSE
          v_milestone_names := ARRAY['Test'];
      END CASE;

    WHEN 'restore' THEN
      CASE p_component_type
        WHEN 'field_weld' THEN
          v_milestone_names := ARRAY['Paint'];
        WHEN 'support' THEN
          v_milestone_names := ARRAY['Insulate'];
        WHEN 'pipe' THEN
          v_milestone_names := ARRAY['Restore'];
        ELSE
          v_milestone_names := ARRAY['Restore'];
      END CASE;

    ELSE
      RETURN 0;
  END CASE;

  -- Sum weights from all mapped milestone names
  IF v_use_project_templates THEN
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
    -- Fall back to system templates (JSONB format) - use latest version
    FOR v_name IN SELECT unnest(v_milestone_names) LOOP
      SELECT COALESCE((m.milestone->>'weight')::NUMERIC / 100.0, 0)
      INTO v_milestone_weight
      FROM progress_templates pt,
           LATERAL jsonb_array_elements(pt.milestones_config) AS m(milestone)
      WHERE pt.component_type = p_component_type
        AND pt.version = (
          SELECT MAX(version)
          FROM progress_templates
          WHERE component_type = p_component_type
        )
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
Standard milestones: receive, install, punch, test, restore.
Updated: Added pipe v2 milestone mappings and latest-version fallback for system templates.';
