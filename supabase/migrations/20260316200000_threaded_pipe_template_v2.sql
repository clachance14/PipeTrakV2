-- Migration: Add threaded_pipe template v2 (drop Install milestone)
--
-- Context: threaded_pipe v1 had 8 milestones including Install (16% weight).
-- v2 removes Install and redistributes weight across the remaining 4 partial milestones:
--   Fabricate=16%, Erect=20%, Connect=20%, Support=24%, Punch=5%, Test=10%, Restore=5%
-- Total: 100%
--
-- Existing components (8 in production) have Install_LF:0 in current_milestones.
-- Since all values are 0, removing Install_LF has no data loss impact.

-- ============================================================================
-- PART 1: Insert v2 threaded_pipe system template
-- ============================================================================

INSERT INTO progress_templates (
  component_type,
  version,
  workflow_type,
  milestones_config
) VALUES (
  'threaded_pipe',
  2,
  'hybrid',
  '[
    {"name": "Fabricate", "weight": 16, "order": 1, "is_partial": true, "requires_welder": false, "category": "install"},
    {"name": "Erect", "weight": 20, "order": 2, "is_partial": true, "requires_welder": false, "category": "install"},
    {"name": "Connect", "weight": 20, "order": 3, "is_partial": true, "requires_welder": false, "category": "install"},
    {"name": "Support", "weight": 24, "order": 4, "is_partial": true, "requires_welder": false, "category": "install"},
    {"name": "Punch", "weight": 5, "order": 5, "is_partial": false, "requires_welder": false, "category": "punch"},
    {"name": "Test", "weight": 10, "order": 6, "is_partial": false, "requires_welder": false, "category": "test"},
    {"name": "Restore", "weight": 5, "order": 7, "is_partial": false, "requires_welder": false, "category": "restore"}
  ]'::jsonb
);

-- ============================================================================
-- PART 2: Migrate existing threaded_pipe components
-- ============================================================================

-- 2a: Remove Install_LF key from current_milestones JSONB
UPDATE components
SET current_milestones = current_milestones - 'Install_LF'
WHERE component_type = 'threaded_pipe'
  AND current_milestones ? 'Install_LF';

-- 2b: Update progress_template_id to point to v2 template
UPDATE components
SET progress_template_id = (
  SELECT id FROM progress_templates
  WHERE component_type = 'threaded_pipe' AND version = 2
)
WHERE component_type = 'threaded_pipe';

-- ============================================================================
-- PART 3: Update project_progress_templates for all affected projects
-- ============================================================================

DO $$
DECLARE
  project_id_var UUID;
  affected_projects UUID[];
BEGIN
  -- Get all project IDs that have threaded_pipe templates
  SELECT ARRAY_AGG(DISTINCT project_id)
  INTO affected_projects
  FROM project_progress_templates
  WHERE component_type = 'threaded_pipe';

  -- Delete old threaded_pipe entries
  DELETE FROM project_progress_templates
  WHERE component_type = 'threaded_pipe';

  -- Insert new v2 milestones for each affected project
  IF affected_projects IS NOT NULL THEN
    FOREACH project_id_var IN ARRAY affected_projects
    LOOP
      INSERT INTO project_progress_templates (
        project_id, component_type, milestone_name, milestone_order, weight, is_partial, requires_welder, category
      ) VALUES
        (project_id_var, 'threaded_pipe', 'Fabricate', 1, 16, true, false, 'install'),
        (project_id_var, 'threaded_pipe', 'Erect', 2, 20, true, false, 'install'),
        (project_id_var, 'threaded_pipe', 'Connect', 3, 20, true, false, 'install'),
        (project_id_var, 'threaded_pipe', 'Support', 4, 24, true, false, 'install'),
        (project_id_var, 'threaded_pipe', 'Punch', 5, 5, false, false, 'punch'),
        (project_id_var, 'threaded_pipe', 'Test', 6, 10, false, false, 'test'),
        (project_id_var, 'threaded_pipe', 'Restore', 7, 5, false, false, 'restore');
    END LOOP;
  END IF;

  RAISE NOTICE 'Updated % projects with v2 threaded_pipe milestones', COALESCE(array_length(affected_projects, 1), 0);
END $$;

-- ============================================================================
-- PART 4: Update get_milestone_weight() to remove Install from threaded_pipe
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
          -- v2: removed Install milestone
          v_milestone_names := ARRAY['Fabricate', 'Erect', 'Connect', 'Support'];
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
        WHEN 'threaded_pipe' THEN
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
          v_milestone_names := ARRAY['Test'];
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
Updated: Removed Install from threaded_pipe install mapping (v2 template).
Fixed threaded_pipe punch (Punch, not Punch Complete) and test (Test, not Hydrotest) mappings.';

-- ============================================================================
-- PART 5: Refresh materialized view
-- ============================================================================

REFRESH MATERIALIZED VIEW mv_template_milestone_weights;
