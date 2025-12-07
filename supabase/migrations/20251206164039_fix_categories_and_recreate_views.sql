-- Fix missing categories in progress_templates JSONB and recreate dropped views

-- 1. Fix missing category values in progress_templates milestones_config JSONB
-- The backfill missed some milestone names (Fit-up vs Fit-Up, Weld Complete vs Weld Made)
UPDATE progress_templates
SET milestones_config = (
  SELECT jsonb_agg(
    CASE
      WHEN m->>'category' IS NOT NULL THEN m
      ELSE m || jsonb_build_object('category',
        CASE m->>'name'
          WHEN 'Receive' THEN 'receive'
          WHEN 'Erect' THEN 'install'
          WHEN 'Connect' THEN 'install'
          WHEN 'Install' THEN 'install'
          WHEN 'Fit-Up' THEN 'install'
          WHEN 'Fit-up' THEN 'install'
          WHEN 'Weld Made' THEN 'install'
          WHEN 'Weld Complete' THEN 'install'
          WHEN 'Fabricate' THEN 'install'
          WHEN 'Support' THEN 'install'
          WHEN 'Punch' THEN 'punch'
          WHEN 'Punch Complete' THEN 'punch'
          WHEN 'Accepted' THEN 'punch'
          WHEN 'Test' THEN 'test'
          WHEN 'Hydrotest' THEN 'test'
          WHEN 'Restore' THEN 'restore'
          WHEN 'Insulate' THEN 'restore'
          ELSE NULL
        END
      )
    END
  )
  FROM jsonb_array_elements(milestones_config) m
)
WHERE milestones_config IS NOT NULL;

-- 2. Fix missing category values in project_progress_templates
UPDATE project_progress_templates SET category = 'install'
WHERE milestone_name IN ('Fit-up', 'Weld Complete') AND category IS NULL;

-- 3. Recreate vw_manhour_progress_by_area
CREATE OR REPLACE VIEW vw_manhour_progress_by_area AS
WITH component_categories AS (
  SELECT
    c.id AS component_id,
    c.area_id,
    c.project_id,
    COALESCE(c.budgeted_manhours, 0) AS mh,
    COALESCE(c.percent_complete, 0) AS pct_complete,
    cat.category,
    cat.category_weight,
    cat.category_pct,
    cat.earned_mh
  FROM components c
  CROSS JOIN LATERAL calculate_category_earned_mh(
    c.project_id,
    c.component_type,
    c.current_milestones,
    c.budgeted_manhours
  ) cat
  WHERE NOT c.is_retired
)
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.project_id,
  COALESCE(SUM(DISTINCT cc.mh), 0) AS mh_budget,
  COALESCE(SUM(cc.mh * cc.category_weight / 100.0) FILTER (WHERE cc.category = 'receive'), 0) AS receive_mh_budget,
  COALESCE(SUM(cc.earned_mh) FILTER (WHERE cc.category = 'receive'), 0) AS receive_mh_earned,
  COALESCE(SUM(cc.mh * cc.category_weight / 100.0) FILTER (WHERE cc.category = 'install'), 0) AS install_mh_budget,
  COALESCE(SUM(cc.earned_mh) FILTER (WHERE cc.category = 'install'), 0) AS install_mh_earned,
  COALESCE(SUM(cc.mh * cc.category_weight / 100.0) FILTER (WHERE cc.category = 'punch'), 0) AS punch_mh_budget,
  COALESCE(SUM(cc.earned_mh) FILTER (WHERE cc.category = 'punch'), 0) AS punch_mh_earned,
  COALESCE(SUM(cc.mh * cc.category_weight / 100.0) FILTER (WHERE cc.category = 'test'), 0) AS test_mh_budget,
  COALESCE(SUM(cc.earned_mh) FILTER (WHERE cc.category = 'test'), 0) AS test_mh_earned,
  COALESCE(SUM(cc.mh * cc.category_weight / 100.0) FILTER (WHERE cc.category = 'restore'), 0) AS restore_mh_budget,
  COALESCE(SUM(cc.earned_mh) FILTER (WHERE cc.category = 'restore'), 0) AS restore_mh_earned,
  COALESCE(SUM(cc.earned_mh), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(DISTINCT cc.mh), 0) > 0
    THEN ROUND((SUM(cc.earned_mh) / SUM(DISTINCT cc.mh) * 100)::NUMERIC, 2)
    ELSE 0
  END AS mh_pct_complete
FROM areas a
LEFT JOIN component_categories cc ON cc.area_id = a.id
GROUP BY a.id, a.name, a.project_id;

GRANT SELECT ON vw_manhour_progress_by_area TO authenticated;

-- 4. Recreate vw_manhour_progress_by_system
CREATE OR REPLACE VIEW vw_manhour_progress_by_system AS
WITH component_categories AS (
  SELECT
    c.id AS component_id,
    c.system_id,
    c.project_id,
    COALESCE(c.budgeted_manhours, 0) AS mh,
    COALESCE(c.percent_complete, 0) AS pct_complete,
    cat.category,
    cat.category_weight,
    cat.category_pct,
    cat.earned_mh
  FROM components c
  CROSS JOIN LATERAL calculate_category_earned_mh(
    c.project_id,
    c.component_type,
    c.current_milestones,
    c.budgeted_manhours
  ) cat
  WHERE NOT c.is_retired
)
SELECT
  s.id AS system_id,
  s.name AS system_name,
  s.project_id,
  COALESCE(SUM(DISTINCT cc.mh), 0) AS mh_budget,
  COALESCE(SUM(cc.mh * cc.category_weight / 100.0) FILTER (WHERE cc.category = 'receive'), 0) AS receive_mh_budget,
  COALESCE(SUM(cc.earned_mh) FILTER (WHERE cc.category = 'receive'), 0) AS receive_mh_earned,
  COALESCE(SUM(cc.mh * cc.category_weight / 100.0) FILTER (WHERE cc.category = 'install'), 0) AS install_mh_budget,
  COALESCE(SUM(cc.earned_mh) FILTER (WHERE cc.category = 'install'), 0) AS install_mh_earned,
  COALESCE(SUM(cc.mh * cc.category_weight / 100.0) FILTER (WHERE cc.category = 'punch'), 0) AS punch_mh_budget,
  COALESCE(SUM(cc.earned_mh) FILTER (WHERE cc.category = 'punch'), 0) AS punch_mh_earned,
  COALESCE(SUM(cc.mh * cc.category_weight / 100.0) FILTER (WHERE cc.category = 'test'), 0) AS test_mh_budget,
  COALESCE(SUM(cc.earned_mh) FILTER (WHERE cc.category = 'test'), 0) AS test_mh_earned,
  COALESCE(SUM(cc.mh * cc.category_weight / 100.0) FILTER (WHERE cc.category = 'restore'), 0) AS restore_mh_budget,
  COALESCE(SUM(cc.earned_mh) FILTER (WHERE cc.category = 'restore'), 0) AS restore_mh_earned,
  COALESCE(SUM(cc.earned_mh), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(DISTINCT cc.mh), 0) > 0
    THEN ROUND((SUM(cc.earned_mh) / SUM(DISTINCT cc.mh) * 100)::NUMERIC, 2)
    ELSE 0
  END AS mh_pct_complete
FROM systems s
LEFT JOIN component_categories cc ON cc.system_id = s.id
GROUP BY s.id, s.name, s.project_id;

GRANT SELECT ON vw_manhour_progress_by_system TO authenticated;

-- 5. Recreate vw_manhour_progress_by_test_package
CREATE OR REPLACE VIEW vw_manhour_progress_by_test_package AS
WITH component_categories AS (
  SELECT
    c.id AS component_id,
    c.test_package_id,
    c.project_id,
    COALESCE(c.budgeted_manhours, 0) AS mh,
    COALESCE(c.percent_complete, 0) AS pct_complete,
    cat.category,
    cat.category_weight,
    cat.category_pct,
    cat.earned_mh
  FROM components c
  CROSS JOIN LATERAL calculate_category_earned_mh(
    c.project_id,
    c.component_type,
    c.current_milestones,
    c.budgeted_manhours
  ) cat
  WHERE NOT c.is_retired
)
SELECT
  tp.id AS test_package_id,
  tp.name AS test_package_name,
  tp.project_id,
  COALESCE(SUM(DISTINCT cc.mh), 0) AS mh_budget,
  COALESCE(SUM(cc.mh * cc.category_weight / 100.0) FILTER (WHERE cc.category = 'receive'), 0) AS receive_mh_budget,
  COALESCE(SUM(cc.earned_mh) FILTER (WHERE cc.category = 'receive'), 0) AS receive_mh_earned,
  COALESCE(SUM(cc.mh * cc.category_weight / 100.0) FILTER (WHERE cc.category = 'install'), 0) AS install_mh_budget,
  COALESCE(SUM(cc.earned_mh) FILTER (WHERE cc.category = 'install'), 0) AS install_mh_earned,
  COALESCE(SUM(cc.mh * cc.category_weight / 100.0) FILTER (WHERE cc.category = 'punch'), 0) AS punch_mh_budget,
  COALESCE(SUM(cc.earned_mh) FILTER (WHERE cc.category = 'punch'), 0) AS punch_mh_earned,
  COALESCE(SUM(cc.mh * cc.category_weight / 100.0) FILTER (WHERE cc.category = 'test'), 0) AS test_mh_budget,
  COALESCE(SUM(cc.earned_mh) FILTER (WHERE cc.category = 'test'), 0) AS test_mh_earned,
  COALESCE(SUM(cc.mh * cc.category_weight / 100.0) FILTER (WHERE cc.category = 'restore'), 0) AS restore_mh_budget,
  COALESCE(SUM(cc.earned_mh) FILTER (WHERE cc.category = 'restore'), 0) AS restore_mh_earned,
  COALESCE(SUM(cc.earned_mh), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(DISTINCT cc.mh), 0) > 0
    THEN ROUND((SUM(cc.earned_mh) / SUM(DISTINCT cc.mh) * 100)::NUMERIC, 2)
    ELSE 0
  END AS mh_pct_complete
FROM test_packages tp
LEFT JOIN component_categories cc ON cc.test_package_id = tp.id
GROUP BY tp.id, tp.name, tp.project_id;

GRANT SELECT ON vw_manhour_progress_by_test_package TO authenticated;

-- 6. Recreate vw_project_progress
CREATE OR REPLACE VIEW vw_project_progress AS
WITH budget AS (
  SELECT
    p.id AS project_id,
    p.name AS project_name,
    COALESCE(
      (SELECT total_budgeted_manhours FROM project_manhour_budgets
       WHERE project_id = p.id AND is_active = true LIMIT 1),
      (SELECT SUM(budgeted_manhours) FROM components
       WHERE project_id = p.id AND NOT is_retired)
    ) AS total_budget,
    EXISTS (SELECT 1 FROM project_manhour_budgets
            WHERE project_id = p.id AND is_active = true) AS has_explicit_budget
  FROM projects p
),
earned AS (
  SELECT
    project_id,
    SUM(COALESCE(budgeted_manhours, 0) * COALESCE(percent_complete, 0) / 100.0) AS total_earned,
    COUNT(*) AS total_components,
    COUNT(*) FILTER (WHERE percent_complete = 100) AS completed_components
  FROM components
  WHERE NOT is_retired
  GROUP BY project_id
)
SELECT
  b.project_id,
  b.project_name,
  b.total_budget,
  b.has_explicit_budget,
  COALESCE(e.total_earned, 0) AS total_earned,
  e.total_components,
  e.completed_components,
  CASE WHEN COALESCE(b.total_budget, 0) > 0
    THEN ROUND((COALESCE(e.total_earned, 0) / b.total_budget) * 100, 2)
    ELSE 0
  END AS project_pct_complete
FROM budget b
LEFT JOIN earned e ON e.project_id = b.project_id;

GRANT SELECT ON vw_project_progress TO authenticated;

COMMENT ON VIEW vw_project_progress IS
'Project-level progress summary. Uses explicit budget from project_manhour_budgets if active,
else falls back to SUM(components.budgeted_manhours).';
