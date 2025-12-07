-- Phase 2: Core Helper Functions - Unified progress calculation system

-- Task 2.1: Create normalize_milestone_value() function
-- CRITICAL: This function ONLY normalizes. It does NOT apply discrete/partial logic.
CREATE OR REPLACE FUNCTION normalize_milestone_value(
  p_raw JSONB
) RETURNS NUMERIC AS $$
DECLARE
  v_type TEXT;
  v_value NUMERIC;
BEGIN
  IF p_raw IS NULL THEN
    RETURN 0;
  END IF;

  v_type := jsonb_typeof(p_raw);

  IF v_type = 'boolean' THEN
    RETURN CASE WHEN (p_raw::TEXT)::BOOLEAN THEN 100 ELSE 0 END;
  END IF;

  IF v_type = 'number' THEN
    v_value := (p_raw::TEXT)::NUMERIC;
    RETURN GREATEST(0, LEAST(100, v_value));
  END IF;

  IF v_type = 'string' THEN
    BEGIN
      v_value := (p_raw #>> '{}')::NUMERIC;
      RETURN GREATEST(0, LEAST(100, v_value));
    EXCEPTION WHEN OTHERS THEN
      RETURN 0;
    END;
  END IF;

  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Task 2.2: Create get_component_template() function
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
    -- Fall back to system templates (JSONB format)
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
      AND pt.version = 1
    ORDER BY (m.milestone->>'order')::INT;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Task 2.3: Rewrite calculate_component_percent() function
-- SIMPLIFIED SIGNATURE: 3 params (project_id, component_type, milestones) - NO template_id
CREATE OR REPLACE FUNCTION calculate_component_percent(
  p_project_id UUID,
  p_component_type TEXT,
  p_current_milestones JSONB
) RETURNS NUMERIC(5,2) AS $$
DECLARE
  v_template RECORD;
  v_total_weight NUMERIC := 0;
  v_normalized_value NUMERIC;
BEGIN
  FOR v_template IN SELECT * FROM get_component_template(p_project_id, p_component_type) LOOP
    v_normalized_value := normalize_milestone_value(
      p_current_milestones->v_template.milestone_name
    );

    IF v_template.is_partial THEN
      v_total_weight := v_total_weight + (v_template.weight * v_normalized_value / 100.0);
    ELSE
      IF v_normalized_value = 100 THEN
        v_total_weight := v_total_weight + v_template.weight;
      END IF;
    END IF;
  END LOOP;

  RETURN ROUND(v_total_weight, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- Task 2.4: Update trigger to use new signature
CREATE OR REPLACE FUNCTION update_component_percent_on_milestone_change()
RETURNS TRIGGER AS $$
BEGIN
  NEW.percent_complete := calculate_component_percent(
    NEW.project_id,
    NEW.component_type,
    NEW.current_milestones
  );
  NEW.last_updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
