-- Migration: Fix calculate_component_percent for 100-scale discrete milestones
-- Bug: Migration 20251122152612 changed discrete milestone values from 1/0 to 100/0 scale,
--      but only updated update_component_milestone RPC, not calculate_component_percent.
--      This caused ALL progress to show as 0% because the function still checked for value = 1.
-- Fix: Update calculate_component_percent to check for value = 100 instead of value = 1

CREATE OR REPLACE FUNCTION calculate_component_percent(
  p_template_id UUID,
  p_current_milestones JSONB,
  p_project_id UUID DEFAULT NULL,
  p_component_type TEXT DEFAULT NULL
)
RETURNS NUMERIC(5,2) AS $$
DECLARE
  v_milestones_config JSONB;
  v_total_weight NUMERIC(5,2) := 0;
  v_milestone JSONB;
  v_milestone_name TEXT;
  v_weight NUMERIC(5,2);
  v_is_partial BOOLEAN;
  v_current_value JSONB;
  v_use_project_templates BOOLEAN := false;
BEGIN
  -- Check if project has custom templates (if project_id and component_type provided)
  IF p_project_id IS NOT NULL AND p_component_type IS NOT NULL THEN
    -- Check if project templates exist for this component type
    IF EXISTS (
      SELECT 1 FROM project_progress_templates
      WHERE project_id = p_project_id
        AND component_type = p_component_type
      LIMIT 1
    ) THEN
      v_use_project_templates := true;
    END IF;
  END IF;

  -- Use project templates or fall back to system templates
  IF v_use_project_templates THEN
    -- Calculate from project_progress_templates (new table structure)
    FOR v_milestone_name, v_weight, v_is_partial IN
      SELECT milestone_name, weight::NUMERIC(5,2), is_partial
      FROM project_progress_templates
      WHERE project_id = p_project_id
        AND component_type = p_component_type
      ORDER BY milestone_order
    LOOP
      v_current_value := p_current_milestones->v_milestone_name;

      IF v_current_value IS NOT NULL THEN
        IF v_is_partial THEN
          -- Partial milestone: value is 0-100 percentage
          v_total_weight := v_total_weight + (v_weight * (v_current_value::TEXT)::NUMERIC / 100.0);
        ELSIF jsonb_typeof(v_current_value) = 'boolean' AND (v_current_value::TEXT)::BOOLEAN = true THEN
          -- Discrete milestone: boolean true
          v_total_weight := v_total_weight + v_weight;
        ELSIF jsonb_typeof(v_current_value) = 'number' AND (v_current_value::TEXT)::NUMERIC = 100 THEN
          -- Discrete milestone: numeric 100 (standard scale after migration 20251122152612)
          v_total_weight := v_total_weight + v_weight;
        END IF;
      END IF;
    END LOOP;
  ELSE
    -- Fall back to system templates (progress_templates with milestones_config JSONB)
    SELECT milestones_config
    INTO v_milestones_config
    FROM progress_templates
    WHERE id = p_template_id;

    -- Return 0 if template not found
    IF v_milestones_config IS NULL THEN
      RETURN 0.00;
    END IF;

    -- Loop through milestones and calculate weighted percent
    FOR v_milestone IN SELECT * FROM jsonb_array_elements(v_milestones_config) LOOP
      v_milestone_name := v_milestone->>'name';
      v_weight := (v_milestone->>'weight')::NUMERIC(5,2);
      v_is_partial := COALESCE((v_milestone->>'is_partial')::BOOLEAN, false);
      v_current_value := p_current_milestones->v_milestone_name;

      IF v_current_value IS NOT NULL THEN
        IF v_is_partial THEN
          -- Partial milestone: value is 0-100 percentage
          v_total_weight := v_total_weight + (v_weight * (v_current_value::TEXT)::NUMERIC / 100.0);
        ELSIF jsonb_typeof(v_current_value) = 'boolean' AND (v_current_value::TEXT)::BOOLEAN = true THEN
          -- Discrete milestone: boolean true
          v_total_weight := v_total_weight + v_weight;
        ELSIF jsonb_typeof(v_current_value) = 'number' AND (v_current_value::TEXT)::NUMERIC = 100 THEN
          -- Discrete milestone: numeric 100 (standard scale after migration 20251122152612)
          v_total_weight := v_total_weight + v_weight;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN ROUND(v_total_weight, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_component_percent(UUID, JSONB, UUID, TEXT) IS
'Calculate weighted ROC percent from provided milestones. Checks project_progress_templates first, falls back to progress_templates. Updated to handle 100-scale discrete milestones.';
