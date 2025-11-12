-- Migration: Update calculate_component_percent with project template fallback
-- Feature: 026-editable-milestone-templates
-- Phase: 2 (Foundational)
-- Task: T008
-- Description: Modify function to use project templates first, then fall back to system templates

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
        ELSIF jsonb_typeof(v_current_value) = 'number' AND (v_current_value::TEXT)::NUMERIC = 1 THEN
          -- Discrete milestone: numeric 1 (treated as true)
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

    -- Loop through milestones and calculate weighted %
    FOR v_milestone IN SELECT * FROM jsonb_array_elements(v_milestones_config) LOOP
      v_milestone_name := v_milestone->>'name';
      v_weight := (v_milestone->>'weight')::NUMERIC(5,2);
      v_is_partial := COALESCE((v_milestone->>'is_partial')::BOOLEAN, false);
      v_current_value := p_current_milestones->v_milestone_name;

      IF v_current_value IS NOT NULL THEN
        IF v_is_partial THEN
          -- Hybrid workflow: partial % (e.g., "Fabricate": 75.00 → weight * 0.75)
          v_total_weight := v_total_weight + (v_weight * (v_current_value::TEXT)::NUMERIC / 100.0);
        ELSIF jsonb_typeof(v_current_value) = 'boolean' AND (v_current_value::TEXT)::BOOLEAN = true THEN
          -- Discrete workflow: boolean true (e.g., "Receive": true → add full weight)
          v_total_weight := v_total_weight + v_weight;
        ELSIF jsonb_typeof(v_current_value) = 'number' AND (v_current_value::TEXT)::NUMERIC = 1 THEN
          -- Handle numeric 1 as true (RPC function stores discrete milestones as 1/0)
          v_total_weight := v_total_weight + v_weight;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN ROUND(v_total_weight, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_component_percent(UUID, JSONB, UUID, TEXT) IS
'Calculate weighted ROC % from provided milestones. Checks project_progress_templates first, falls back to progress_templates.';

-- Update trigger function to pass project_id and component_type
CREATE OR REPLACE FUNCTION update_component_percent_on_milestone_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate percent_complete using NEW values (with project template support)
  NEW.percent_complete := calculate_component_percent(
    NEW.progress_template_id,
    NEW.current_milestones,
    NEW.project_id,        -- Pass project_id for template lookup
    NEW.component_type      -- Pass component_type for template lookup
  );
  NEW.last_updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TRIGGER update_component_percent_on_milestone_change ON components IS
'Auto-recalculate percent_complete when milestones change (supports project templates)';
