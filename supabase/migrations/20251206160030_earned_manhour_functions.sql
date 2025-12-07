-- Phase 3: Earned Manhour Functions
-- Rewrite earned value functions to be template-driven

-- Task 3.1: Rewrite calculate_earned_milestone_value() to be template-driven
-- RENAMED PARAMETER: p_standard_milestone -> p_category
CREATE OR REPLACE FUNCTION calculate_earned_milestone_value(
  p_component_type TEXT,
  p_milestones JSONB,
  p_category TEXT,          -- RENAMED from p_standard_milestone
  p_project_id UUID DEFAULT NULL
) RETURNS NUMERIC AS $$
DECLARE
  v_category_earned_weight NUMERIC := 0;
  v_category_total_weight NUMERIC := 0;
  v_template RECORD;
  v_normalized NUMERIC;
BEGIN
  FOR v_template IN
    SELECT * FROM get_component_template(p_project_id, p_component_type)
    WHERE category = p_category
  LOOP
    v_normalized := normalize_milestone_value(
      p_milestones->v_template.milestone_name
    );

    v_category_total_weight := v_category_total_weight + v_template.weight;

    IF v_template.is_partial THEN
      v_category_earned_weight := v_category_earned_weight + (v_template.weight * v_normalized / 100.0);
    ELSE
      IF v_normalized = 100 THEN
        v_category_earned_weight := v_category_earned_weight + v_template.weight;
      END IF;
    END IF;
  END LOOP;

  IF v_category_total_weight > 0 THEN
    RETURN (v_category_earned_weight / v_category_total_weight) * 100;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_earned_milestone_value(TEXT, JSONB, TEXT, UUID) IS
'Calculate earned percentage (0-100) for a specific category using template-driven weights.
Uses p_category (receive/install/punch/test/restore) to filter template milestones.
Returns: category_pct = (earned_weight / total_weight) * 100';

-- Task 3.2: Create calculate_component_earned_mh() function
CREATE OR REPLACE FUNCTION calculate_component_earned_mh(
  p_budgeted_manhours NUMERIC,
  p_percent_complete NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(p_budgeted_manhours, 0) * COALESCE(p_percent_complete, 0) / 100.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_component_earned_mh(NUMERIC, NUMERIC) IS
'Calculate earned manhours for a component.
Formula: earned_mh = budgeted_manhours * percent_complete / 100';

-- Task 3.3: Create calculate_category_earned_mh() function
CREATE OR REPLACE FUNCTION calculate_category_earned_mh(
  p_project_id UUID,
  p_component_type TEXT,
  p_current_milestones JSONB,
  p_budgeted_manhours NUMERIC
) RETURNS TABLE (
  category TEXT,
  category_weight NUMERIC,
  category_pct NUMERIC,
  earned_mh NUMERIC
) AS $$
DECLARE
  v_categories TEXT[] := ARRAY['receive', 'install', 'punch', 'test', 'restore'];
  v_cat TEXT;
  v_cat_weight NUMERIC;
  v_cat_pct NUMERIC;
BEGIN
  FOREACH v_cat IN ARRAY v_categories LOOP
    SELECT COALESCE(SUM(t.weight), 0)
    INTO v_cat_weight
    FROM get_component_template(p_project_id, p_component_type) t
    WHERE t.category = v_cat;

    v_cat_pct := calculate_earned_milestone_value(
      p_component_type,
      p_current_milestones,
      v_cat,
      p_project_id
    );

    category := v_cat;
    category_weight := v_cat_weight;
    category_pct := v_cat_pct;
    earned_mh := COALESCE(p_budgeted_manhours, 0) * (v_cat_weight / 100.0) * (v_cat_pct / 100.0);
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_category_earned_mh(UUID, TEXT, JSONB, NUMERIC) IS
'Calculate earned manhours broken down by category.
Returns: category, category_weight, category_pct, earned_mh
Formula: earned_mh = budgeted_manhours * (category_weight / 100) * (category_pct / 100)';

-- Task 3.4: Add sanity check function
CREATE OR REPLACE FUNCTION verify_category_mh_sum(
  p_project_id UUID,
  p_component_type TEXT,
  p_current_milestones JSONB,
  p_budgeted_manhours NUMERIC,
  p_tolerance NUMERIC DEFAULT 0.01
) RETURNS BOOLEAN AS $$
DECLARE
  v_category_sum NUMERIC;
  v_earned_mh NUMERIC;
  v_percent_complete NUMERIC;
BEGIN
  v_percent_complete := calculate_component_percent(p_project_id, p_component_type, p_current_milestones);
  v_earned_mh := calculate_component_earned_mh(p_budgeted_manhours, v_percent_complete);

  SELECT COALESCE(SUM(earned_mh), 0)
  INTO v_category_sum
  FROM calculate_category_earned_mh(p_project_id, p_component_type, p_current_milestones, p_budgeted_manhours);

  RETURN ABS(v_category_sum - v_earned_mh) <= p_tolerance;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION verify_category_mh_sum(UUID, TEXT, JSONB, NUMERIC, NUMERIC) IS
'Verify that SUM(category_earned_mh) equals earned_mh within tolerance (default 0.01).';
