-- Optimize manhour views for performance
-- The CROSS JOIN LATERAL with calculate_category_earned_mh() is too slow for 700+ components
-- Instead, calculate category earned directly using template weights

-- Drop the slow views
DROP VIEW IF EXISTS vw_manhour_progress_by_area;
DROP VIEW IF EXISTS vw_manhour_progress_by_system;
DROP VIEW IF EXISTS vw_manhour_progress_by_test_package;

-- Recreate vw_manhour_progress_by_area with optimized query
-- Uses direct calculation instead of function calls
CREATE OR REPLACE VIEW vw_manhour_progress_by_area AS
WITH template_weights AS (
  -- Pre-calculate category weights from templates
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
component_progress AS (
  SELECT
    c.id,
    c.area_id,
    c.project_id,
    c.component_type,
    COALESCE(c.budgeted_manhours, 0) AS mh,
    COALESCE(c.percent_complete, 0) AS pct_complete,
    -- Use project-specific weights if available, otherwise default
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
)
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.project_id,
  COALESCE(SUM(cp.mh), 0) AS mh_budget,
  -- Category budgets (mh * category_weight / 100)
  COALESCE(SUM(cp.mh * cp.receive_weight / 100.0), 0) AS receive_mh_budget,
  COALESCE(SUM(cp.mh * cp.install_weight / 100.0), 0) AS install_mh_budget,
  COALESCE(SUM(cp.mh * cp.punch_weight / 100.0), 0) AS punch_mh_budget,
  COALESCE(SUM(cp.mh * cp.test_weight / 100.0), 0) AS test_mh_budget,
  COALESCE(SUM(cp.mh * cp.restore_weight / 100.0), 0) AS restore_mh_budget,
  -- Category earned (mh * pct_complete / 100 * category_weight / 100)
  -- Note: This is a simplification that assumes proportional progress across categories
  -- For accurate per-category earned, we'd need to track milestone-level progress
  COALESCE(SUM(cp.mh * cp.pct_complete / 100.0 * cp.receive_weight / 100.0), 0) AS receive_mh_earned,
  COALESCE(SUM(cp.mh * cp.pct_complete / 100.0 * cp.install_weight / 100.0), 0) AS install_mh_earned,
  COALESCE(SUM(cp.mh * cp.pct_complete / 100.0 * cp.punch_weight / 100.0), 0) AS punch_mh_earned,
  COALESCE(SUM(cp.mh * cp.pct_complete / 100.0 * cp.test_weight / 100.0), 0) AS test_mh_earned,
  COALESCE(SUM(cp.mh * cp.pct_complete / 100.0 * cp.restore_weight / 100.0), 0) AS restore_mh_earned,
  -- Total earned (mh * pct_complete / 100)
  COALESCE(SUM(cp.mh * cp.pct_complete / 100.0), 0) AS total_mh_earned,
  -- Percent complete (total_earned / mh_budget * 100)
  CASE WHEN COALESCE(SUM(cp.mh), 0) > 0
    THEN ROUND((SUM(cp.mh * cp.pct_complete / 100.0) / SUM(cp.mh) * 100)::NUMERIC, 2)
    ELSE 0
  END AS mh_pct_complete
FROM areas a
LEFT JOIN component_progress cp ON cp.area_id = a.id
GROUP BY a.id, a.name, a.project_id;

GRANT SELECT ON vw_manhour_progress_by_area TO authenticated;

-- Recreate vw_manhour_progress_by_system with same optimization
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
component_progress AS (
  SELECT
    c.id,
    c.system_id,
    c.project_id,
    c.component_type,
    COALESCE(c.budgeted_manhours, 0) AS mh,
    COALESCE(c.percent_complete, 0) AS pct_complete,
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
)
SELECT
  s.id AS system_id,
  s.name AS system_name,
  s.project_id,
  COALESCE(SUM(cp.mh), 0) AS mh_budget,
  COALESCE(SUM(cp.mh * cp.receive_weight / 100.0), 0) AS receive_mh_budget,
  COALESCE(SUM(cp.mh * cp.install_weight / 100.0), 0) AS install_mh_budget,
  COALESCE(SUM(cp.mh * cp.punch_weight / 100.0), 0) AS punch_mh_budget,
  COALESCE(SUM(cp.mh * cp.test_weight / 100.0), 0) AS test_mh_budget,
  COALESCE(SUM(cp.mh * cp.restore_weight / 100.0), 0) AS restore_mh_budget,
  COALESCE(SUM(cp.mh * cp.pct_complete / 100.0 * cp.receive_weight / 100.0), 0) AS receive_mh_earned,
  COALESCE(SUM(cp.mh * cp.pct_complete / 100.0 * cp.install_weight / 100.0), 0) AS install_mh_earned,
  COALESCE(SUM(cp.mh * cp.pct_complete / 100.0 * cp.punch_weight / 100.0), 0) AS punch_mh_earned,
  COALESCE(SUM(cp.mh * cp.pct_complete / 100.0 * cp.test_weight / 100.0), 0) AS test_mh_earned,
  COALESCE(SUM(cp.mh * cp.pct_complete / 100.0 * cp.restore_weight / 100.0), 0) AS restore_mh_earned,
  COALESCE(SUM(cp.mh * cp.pct_complete / 100.0), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(cp.mh), 0) > 0
    THEN ROUND((SUM(cp.mh * cp.pct_complete / 100.0) / SUM(cp.mh) * 100)::NUMERIC, 2)
    ELSE 0
  END AS mh_pct_complete
FROM systems s
LEFT JOIN component_progress cp ON cp.system_id = s.id
GROUP BY s.id, s.name, s.project_id;

GRANT SELECT ON vw_manhour_progress_by_system TO authenticated;

-- Recreate vw_manhour_progress_by_test_package with same optimization
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
component_progress AS (
  SELECT
    c.id,
    c.test_package_id,
    c.project_id,
    c.component_type,
    COALESCE(c.budgeted_manhours, 0) AS mh,
    COALESCE(c.percent_complete, 0) AS pct_complete,
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
)
SELECT
  tp.id AS test_package_id,
  tp.name AS test_package_name,
  tp.project_id,
  COALESCE(SUM(cp.mh), 0) AS mh_budget,
  COALESCE(SUM(cp.mh * cp.receive_weight / 100.0), 0) AS receive_mh_budget,
  COALESCE(SUM(cp.mh * cp.install_weight / 100.0), 0) AS install_mh_budget,
  COALESCE(SUM(cp.mh * cp.punch_weight / 100.0), 0) AS punch_mh_budget,
  COALESCE(SUM(cp.mh * cp.test_weight / 100.0), 0) AS test_mh_budget,
  COALESCE(SUM(cp.mh * cp.restore_weight / 100.0), 0) AS restore_mh_budget,
  COALESCE(SUM(cp.mh * cp.pct_complete / 100.0 * cp.receive_weight / 100.0), 0) AS receive_mh_earned,
  COALESCE(SUM(cp.mh * cp.pct_complete / 100.0 * cp.install_weight / 100.0), 0) AS install_mh_earned,
  COALESCE(SUM(cp.mh * cp.pct_complete / 100.0 * cp.punch_weight / 100.0), 0) AS punch_mh_earned,
  COALESCE(SUM(cp.mh * cp.pct_complete / 100.0 * cp.test_weight / 100.0), 0) AS test_mh_earned,
  COALESCE(SUM(cp.mh * cp.pct_complete / 100.0 * cp.restore_weight / 100.0), 0) AS restore_mh_earned,
  COALESCE(SUM(cp.mh * cp.pct_complete / 100.0), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(cp.mh), 0) > 0
    THEN ROUND((SUM(cp.mh * cp.pct_complete / 100.0) / SUM(cp.mh) * 100)::NUMERIC, 2)
    ELSE 0
  END AS mh_pct_complete
FROM test_packages tp
LEFT JOIN component_progress cp ON cp.test_package_id = tp.id
GROUP BY tp.id, tp.name, tp.project_id;

GRANT SELECT ON vw_manhour_progress_by_test_package TO authenticated;
