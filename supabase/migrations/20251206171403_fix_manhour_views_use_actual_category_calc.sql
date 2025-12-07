-- Fix manhour views to use actual milestone-based category calculation
-- instead of proportional allocation which shows incorrect punch/test/restore values
--
-- Problem: The proportional approach assumes progress happens evenly across categories,
-- but in reality a field weld at 70% (Fit-up + Weld Complete done) has:
-- - 100% of install category complete
-- - 0% of punch/test/restore complete
--
-- Solution: Use a pre-computed component_category_earned table that calculates
-- actual earned values using the calculate_category_earned_mh() function logic

-- Drop the incorrect views
DROP VIEW IF EXISTS vw_manhour_progress_by_area;
DROP VIEW IF EXISTS vw_manhour_progress_by_system;
DROP VIEW IF EXISTS vw_manhour_progress_by_test_package;

-- Create a helper function that returns category earned for a single component
-- This is faster than CROSS JOIN LATERAL with the table-returning function
CREATE OR REPLACE FUNCTION get_component_category_earned(
  p_project_id UUID,
  p_component_type TEXT,
  p_current_milestones JSONB,
  p_budgeted_manhours NUMERIC,
  p_category TEXT
) RETURNS NUMERIC AS $$
DECLARE
  v_cat_weight NUMERIC;
  v_cat_pct NUMERIC;
BEGIN
  -- Get total weight for this category
  SELECT COALESCE(SUM(t.weight), 0)
  INTO v_cat_weight
  FROM get_component_template(p_project_id, p_component_type) t
  WHERE t.category = p_category;

  -- Get category completion percentage
  v_cat_pct := calculate_earned_milestone_value(
    p_component_type,
    p_current_milestones,
    p_category,
    p_project_id
  );

  -- Return earned MH: budgeted * (category_weight / 100) * (category_pct / 100)
  RETURN COALESCE(p_budgeted_manhours, 0) * (v_cat_weight / 100.0) * (v_cat_pct / 100.0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Recreate vw_manhour_progress_by_area with actual category calculation
CREATE OR REPLACE VIEW vw_manhour_progress_by_area AS
WITH template_weights AS (
  -- Pre-calculate category weights from default templates
  SELECT
    pt.component_type,
    NULL::UUID as project_id,
    SUM(CASE WHEN (m.milestone->>'category') = 'receive' THEN (m.milestone->>'weight')::NUMERIC ELSE 0 END) as receive_weight,
    SUM(CASE WHEN (m.milestone->>'category') = 'install' THEN (m.milestone->>'weight')::NUMERIC ELSE 0 END) as install_weight,
    SUM(CASE WHEN (m.milestone->>'category') = 'punch' THEN (m.milestone->>'weight')::NUMERIC ELSE 0 END) as punch_weight,
    SUM(CASE WHEN (m.milestone->>'category') = 'test' THEN (m.milestone->>'weight')::NUMERIC ELSE 0 END) as test_weight,
    SUM(CASE WHEN (m.milestone->>'category') = 'restore' THEN (m.milestone->>'weight')::NUMERIC ELSE 0 END) as restore_weight
  FROM progress_templates pt,
       LATERAL jsonb_array_elements(pt.milestones_config) AS m(milestone)
  WHERE pt.version = 1
  GROUP BY pt.component_type
  UNION ALL
  -- Project-specific templates
  SELECT
    ppt.component_type,
    ppt.project_id,
    SUM(CASE WHEN ppt.category = 'receive' THEN ppt.weight ELSE 0 END) as receive_weight,
    SUM(CASE WHEN ppt.category = 'install' THEN ppt.weight ELSE 0 END) as install_weight,
    SUM(CASE WHEN ppt.category = 'punch' THEN ppt.weight ELSE 0 END) as punch_weight,
    SUM(CASE WHEN ppt.category = 'test' THEN ppt.weight ELSE 0 END) as test_weight,
    SUM(CASE WHEN ppt.category = 'restore' THEN ppt.weight ELSE 0 END) as restore_weight
  FROM project_progress_templates ppt
  GROUP BY ppt.component_type, ppt.project_id
),
component_data AS (
  SELECT
    c.id,
    c.area_id,
    c.project_id,
    c.component_type,
    COALESCE(c.budgeted_manhours, 0) AS mh,
    COALESCE(c.percent_complete, 0) AS pct_complete,
    c.current_milestones,
    -- Budget weights
    COALESCE(tw_proj.receive_weight, tw_def.receive_weight, 0) as receive_weight,
    COALESCE(tw_proj.install_weight, tw_def.install_weight, 0) as install_weight,
    COALESCE(tw_proj.punch_weight, tw_def.punch_weight, 0) as punch_weight,
    COALESCE(tw_proj.test_weight, tw_def.test_weight, 0) as test_weight,
    COALESCE(tw_proj.restore_weight, tw_def.restore_weight, 0) as restore_weight
  FROM components c
  LEFT JOIN template_weights tw_proj
    ON tw_proj.component_type = c.component_type
    AND tw_proj.project_id = c.project_id
  LEFT JOIN template_weights tw_def
    ON tw_def.component_type = c.component_type
    AND tw_def.project_id IS NULL
  WHERE NOT c.is_retired
),
component_earned AS (
  SELECT
    cd.*,
    -- Calculate actual category earned using milestone values
    get_component_category_earned(cd.project_id, cd.component_type, cd.current_milestones, cd.mh, 'receive') as receive_mh_earned,
    get_component_category_earned(cd.project_id, cd.component_type, cd.current_milestones, cd.mh, 'install') as install_mh_earned,
    get_component_category_earned(cd.project_id, cd.component_type, cd.current_milestones, cd.mh, 'punch') as punch_mh_earned,
    get_component_category_earned(cd.project_id, cd.component_type, cd.current_milestones, cd.mh, 'test') as test_mh_earned,
    get_component_category_earned(cd.project_id, cd.component_type, cd.current_milestones, cd.mh, 'restore') as restore_mh_earned
  FROM component_data cd
)
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.project_id,
  COALESCE(SUM(ce.mh), 0) AS mh_budget,
  -- Category budgets (mh * category_weight / 100)
  COALESCE(SUM(ce.mh * ce.receive_weight / 100.0), 0) AS receive_mh_budget,
  COALESCE(SUM(ce.mh * ce.install_weight / 100.0), 0) AS install_mh_budget,
  COALESCE(SUM(ce.mh * ce.punch_weight / 100.0), 0) AS punch_mh_budget,
  COALESCE(SUM(ce.mh * ce.test_weight / 100.0), 0) AS test_mh_budget,
  COALESCE(SUM(ce.mh * ce.restore_weight / 100.0), 0) AS restore_mh_budget,
  -- Category earned (actual from milestone calculation)
  COALESCE(SUM(ce.receive_mh_earned), 0) AS receive_mh_earned,
  COALESCE(SUM(ce.install_mh_earned), 0) AS install_mh_earned,
  COALESCE(SUM(ce.punch_mh_earned), 0) AS punch_mh_earned,
  COALESCE(SUM(ce.test_mh_earned), 0) AS test_mh_earned,
  COALESCE(SUM(ce.restore_mh_earned), 0) AS restore_mh_earned,
  -- Total earned (mh * pct_complete / 100)
  COALESCE(SUM(ce.mh * ce.pct_complete / 100.0), 0) AS total_mh_earned,
  -- Percent complete (total_earned / mh_budget * 100)
  CASE WHEN COALESCE(SUM(ce.mh), 0) > 0
    THEN ROUND((SUM(ce.mh * ce.pct_complete / 100.0) / SUM(ce.mh) * 100)::NUMERIC, 2)
    ELSE 0
  END AS mh_pct_complete
FROM areas a
LEFT JOIN component_earned ce ON ce.area_id = a.id
GROUP BY a.id, a.name, a.project_id;

GRANT SELECT ON vw_manhour_progress_by_area TO authenticated;

-- Recreate vw_manhour_progress_by_system with actual category calculation
CREATE OR REPLACE VIEW vw_manhour_progress_by_system AS
WITH template_weights AS (
  SELECT
    pt.component_type,
    NULL::UUID as project_id,
    SUM(CASE WHEN (m.milestone->>'category') = 'receive' THEN (m.milestone->>'weight')::NUMERIC ELSE 0 END) as receive_weight,
    SUM(CASE WHEN (m.milestone->>'category') = 'install' THEN (m.milestone->>'weight')::NUMERIC ELSE 0 END) as install_weight,
    SUM(CASE WHEN (m.milestone->>'category') = 'punch' THEN (m.milestone->>'weight')::NUMERIC ELSE 0 END) as punch_weight,
    SUM(CASE WHEN (m.milestone->>'category') = 'test' THEN (m.milestone->>'weight')::NUMERIC ELSE 0 END) as test_weight,
    SUM(CASE WHEN (m.milestone->>'category') = 'restore' THEN (m.milestone->>'weight')::NUMERIC ELSE 0 END) as restore_weight
  FROM progress_templates pt,
       LATERAL jsonb_array_elements(pt.milestones_config) AS m(milestone)
  WHERE pt.version = 1
  GROUP BY pt.component_type
  UNION ALL
  SELECT
    ppt.component_type,
    ppt.project_id,
    SUM(CASE WHEN ppt.category = 'receive' THEN ppt.weight ELSE 0 END) as receive_weight,
    SUM(CASE WHEN ppt.category = 'install' THEN ppt.weight ELSE 0 END) as install_weight,
    SUM(CASE WHEN ppt.category = 'punch' THEN ppt.weight ELSE 0 END) as punch_weight,
    SUM(CASE WHEN ppt.category = 'test' THEN ppt.weight ELSE 0 END) as test_weight,
    SUM(CASE WHEN ppt.category = 'restore' THEN ppt.weight ELSE 0 END) as restore_weight
  FROM project_progress_templates ppt
  GROUP BY ppt.component_type, ppt.project_id
),
component_data AS (
  SELECT
    c.id,
    c.system_id,
    c.project_id,
    c.component_type,
    COALESCE(c.budgeted_manhours, 0) AS mh,
    COALESCE(c.percent_complete, 0) AS pct_complete,
    c.current_milestones,
    COALESCE(tw_proj.receive_weight, tw_def.receive_weight, 0) as receive_weight,
    COALESCE(tw_proj.install_weight, tw_def.install_weight, 0) as install_weight,
    COALESCE(tw_proj.punch_weight, tw_def.punch_weight, 0) as punch_weight,
    COALESCE(tw_proj.test_weight, tw_def.test_weight, 0) as test_weight,
    COALESCE(tw_proj.restore_weight, tw_def.restore_weight, 0) as restore_weight
  FROM components c
  LEFT JOIN template_weights tw_proj
    ON tw_proj.component_type = c.component_type
    AND tw_proj.project_id = c.project_id
  LEFT JOIN template_weights tw_def
    ON tw_def.component_type = c.component_type
    AND tw_def.project_id IS NULL
  WHERE NOT c.is_retired
),
component_earned AS (
  SELECT
    cd.*,
    get_component_category_earned(cd.project_id, cd.component_type, cd.current_milestones, cd.mh, 'receive') as receive_mh_earned,
    get_component_category_earned(cd.project_id, cd.component_type, cd.current_milestones, cd.mh, 'install') as install_mh_earned,
    get_component_category_earned(cd.project_id, cd.component_type, cd.current_milestones, cd.mh, 'punch') as punch_mh_earned,
    get_component_category_earned(cd.project_id, cd.component_type, cd.current_milestones, cd.mh, 'test') as test_mh_earned,
    get_component_category_earned(cd.project_id, cd.component_type, cd.current_milestones, cd.mh, 'restore') as restore_mh_earned
  FROM component_data cd
)
SELECT
  s.id AS system_id,
  s.name AS system_name,
  s.project_id,
  COALESCE(SUM(ce.mh), 0) AS mh_budget,
  COALESCE(SUM(ce.mh * ce.receive_weight / 100.0), 0) AS receive_mh_budget,
  COALESCE(SUM(ce.mh * ce.install_weight / 100.0), 0) AS install_mh_budget,
  COALESCE(SUM(ce.mh * ce.punch_weight / 100.0), 0) AS punch_mh_budget,
  COALESCE(SUM(ce.mh * ce.test_weight / 100.0), 0) AS test_mh_budget,
  COALESCE(SUM(ce.mh * ce.restore_weight / 100.0), 0) AS restore_mh_budget,
  COALESCE(SUM(ce.receive_mh_earned), 0) AS receive_mh_earned,
  COALESCE(SUM(ce.install_mh_earned), 0) AS install_mh_earned,
  COALESCE(SUM(ce.punch_mh_earned), 0) AS punch_mh_earned,
  COALESCE(SUM(ce.test_mh_earned), 0) AS test_mh_earned,
  COALESCE(SUM(ce.restore_mh_earned), 0) AS restore_mh_earned,
  COALESCE(SUM(ce.mh * ce.pct_complete / 100.0), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(ce.mh), 0) > 0
    THEN ROUND((SUM(ce.mh * ce.pct_complete / 100.0) / SUM(ce.mh) * 100)::NUMERIC, 2)
    ELSE 0
  END AS mh_pct_complete
FROM systems s
LEFT JOIN component_earned ce ON ce.system_id = s.id
GROUP BY s.id, s.name, s.project_id;

GRANT SELECT ON vw_manhour_progress_by_system TO authenticated;

-- Recreate vw_manhour_progress_by_test_package with actual category calculation
CREATE OR REPLACE VIEW vw_manhour_progress_by_test_package AS
WITH template_weights AS (
  SELECT
    pt.component_type,
    NULL::UUID as project_id,
    SUM(CASE WHEN (m.milestone->>'category') = 'receive' THEN (m.milestone->>'weight')::NUMERIC ELSE 0 END) as receive_weight,
    SUM(CASE WHEN (m.milestone->>'category') = 'install' THEN (m.milestone->>'weight')::NUMERIC ELSE 0 END) as install_weight,
    SUM(CASE WHEN (m.milestone->>'category') = 'punch' THEN (m.milestone->>'weight')::NUMERIC ELSE 0 END) as punch_weight,
    SUM(CASE WHEN (m.milestone->>'category') = 'test' THEN (m.milestone->>'weight')::NUMERIC ELSE 0 END) as test_weight,
    SUM(CASE WHEN (m.milestone->>'category') = 'restore' THEN (m.milestone->>'weight')::NUMERIC ELSE 0 END) as restore_weight
  FROM progress_templates pt,
       LATERAL jsonb_array_elements(pt.milestones_config) AS m(milestone)
  WHERE pt.version = 1
  GROUP BY pt.component_type
  UNION ALL
  SELECT
    ppt.component_type,
    ppt.project_id,
    SUM(CASE WHEN ppt.category = 'receive' THEN ppt.weight ELSE 0 END) as receive_weight,
    SUM(CASE WHEN ppt.category = 'install' THEN ppt.weight ELSE 0 END) as install_weight,
    SUM(CASE WHEN ppt.category = 'punch' THEN ppt.weight ELSE 0 END) as punch_weight,
    SUM(CASE WHEN ppt.category = 'test' THEN ppt.weight ELSE 0 END) as test_weight,
    SUM(CASE WHEN ppt.category = 'restore' THEN ppt.weight ELSE 0 END) as restore_weight
  FROM project_progress_templates ppt
  GROUP BY ppt.component_type, ppt.project_id
),
component_data AS (
  SELECT
    c.id,
    c.test_package_id,
    c.project_id,
    c.component_type,
    COALESCE(c.budgeted_manhours, 0) AS mh,
    COALESCE(c.percent_complete, 0) AS pct_complete,
    c.current_milestones,
    COALESCE(tw_proj.receive_weight, tw_def.receive_weight, 0) as receive_weight,
    COALESCE(tw_proj.install_weight, tw_def.install_weight, 0) as install_weight,
    COALESCE(tw_proj.punch_weight, tw_def.punch_weight, 0) as punch_weight,
    COALESCE(tw_proj.test_weight, tw_def.test_weight, 0) as test_weight,
    COALESCE(tw_proj.restore_weight, tw_def.restore_weight, 0) as restore_weight
  FROM components c
  LEFT JOIN template_weights tw_proj
    ON tw_proj.component_type = c.component_type
    AND tw_proj.project_id = c.project_id
  LEFT JOIN template_weights tw_def
    ON tw_def.component_type = c.component_type
    AND tw_def.project_id IS NULL
  WHERE NOT c.is_retired
),
component_earned AS (
  SELECT
    cd.*,
    get_component_category_earned(cd.project_id, cd.component_type, cd.current_milestones, cd.mh, 'receive') as receive_mh_earned,
    get_component_category_earned(cd.project_id, cd.component_type, cd.current_milestones, cd.mh, 'install') as install_mh_earned,
    get_component_category_earned(cd.project_id, cd.component_type, cd.current_milestones, cd.mh, 'punch') as punch_mh_earned,
    get_component_category_earned(cd.project_id, cd.component_type, cd.current_milestones, cd.mh, 'test') as test_mh_earned,
    get_component_category_earned(cd.project_id, cd.component_type, cd.current_milestones, cd.mh, 'restore') as restore_mh_earned
  FROM component_data cd
)
SELECT
  tp.id AS test_package_id,
  tp.name AS test_package_name,
  tp.project_id,
  COALESCE(SUM(ce.mh), 0) AS mh_budget,
  COALESCE(SUM(ce.mh * ce.receive_weight / 100.0), 0) AS receive_mh_budget,
  COALESCE(SUM(ce.mh * ce.install_weight / 100.0), 0) AS install_mh_budget,
  COALESCE(SUM(ce.mh * ce.punch_weight / 100.0), 0) AS punch_mh_budget,
  COALESCE(SUM(ce.mh * ce.test_weight / 100.0), 0) AS test_mh_budget,
  COALESCE(SUM(ce.mh * ce.restore_weight / 100.0), 0) AS restore_mh_budget,
  COALESCE(SUM(ce.receive_mh_earned), 0) AS receive_mh_earned,
  COALESCE(SUM(ce.install_mh_earned), 0) AS install_mh_earned,
  COALESCE(SUM(ce.punch_mh_earned), 0) AS punch_mh_earned,
  COALESCE(SUM(ce.test_mh_earned), 0) AS test_mh_earned,
  COALESCE(SUM(ce.restore_mh_earned), 0) AS restore_mh_earned,
  COALESCE(SUM(ce.mh * ce.pct_complete / 100.0), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(ce.mh), 0) > 0
    THEN ROUND((SUM(ce.mh * ce.pct_complete / 100.0) / SUM(ce.mh) * 100)::NUMERIC, 2)
    ELSE 0
  END AS mh_pct_complete
FROM test_packages tp
LEFT JOIN component_earned ce ON ce.test_package_id = tp.id
GROUP BY tp.id, tp.name, tp.project_id;

GRANT SELECT ON vw_manhour_progress_by_test_package TO authenticated;
