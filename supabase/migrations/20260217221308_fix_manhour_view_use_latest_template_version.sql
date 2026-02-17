-- Fix manhour views to use latest template version instead of hardcoded version = 1
--
-- Bug: The materialized view mv_template_milestone_weights was hardcoded to use
-- version = 1 templates. For component types like 'pipe' that have been updated
-- to version 2 with different milestone names, the old version 1 milestones were
-- leaking through, causing inflated budget calculations.
--
-- Example: pipe v1 had Install:50%, Receive:50%
--          pipe v2 has Erect:30%, Connect:30%, Support:20%, etc.
-- The view was summing BOTH versions, resulting in 150%+ weights.
--
-- Fix: Use the MAX version per component_type instead of hardcoding version = 1.

-- Drop and recreate the materialized view with the fix
DROP MATERIALIZED VIEW IF EXISTS mv_template_milestone_weights CASCADE;

CREATE MATERIALIZED VIEW mv_template_milestone_weights AS
WITH latest_versions AS (
  -- Get the latest version number for each component_type
  SELECT component_type, MAX(version) as max_version
  FROM progress_templates
  GROUP BY component_type
),
all_templates AS (
  -- Project-specific templates (priority 1)
  SELECT
    ppt.project_id,
    ppt.component_type,
    ppt.milestone_name,
    ppt.weight,
    ppt.category,
    ppt.is_partial,
    1 as priority
  FROM project_progress_templates ppt

  UNION ALL

  -- Default templates - use latest version only (priority 2)
  SELECT
    NULL::UUID as project_id,
    pt.component_type,
    (m.milestone->>'name') as milestone_name,
    (m.milestone->>'weight')::NUMERIC as weight,
    (m.milestone->>'category') as category,
    COALESCE((m.milestone->>'is_partial')::BOOLEAN, false) as is_partial,
    2 as priority
  FROM progress_templates pt
  JOIN latest_versions lv ON pt.component_type = lv.component_type AND pt.version = lv.max_version,
  LATERAL jsonb_array_elements(pt.milestones_config) AS m(milestone)
)
SELECT * FROM all_templates;

CREATE INDEX IF NOT EXISTS idx_mv_template_milestone_weights_lookup
  ON mv_template_milestone_weights(component_type, project_id, milestone_name);

-- Grant access
GRANT SELECT ON mv_template_milestone_weights TO authenticated;

-- Refresh the view to apply changes
REFRESH MATERIALIZED VIEW mv_template_milestone_weights;

-- Recreate dependent views (they were dropped by CASCADE)

-- vw_manhour_progress_by_area
CREATE OR REPLACE VIEW vw_manhour_progress_by_area AS
WITH component_base AS (
  SELECT
    c.id,
    c.area_id,
    c.project_id,
    c.component_type,
    COALESCE(c.budgeted_manhours, 0) AS mh,
    COALESCE(c.percent_complete, 0) AS pct_complete,
    c.current_milestones
  FROM components c
  WHERE NOT c.is_retired
),
component_templates AS (
  SELECT DISTINCT ON (cb.id, tm.milestone_name)
    cb.id as component_id,
    cb.area_id,
    cb.project_id,
    cb.component_type,
    cb.mh,
    cb.pct_complete,
    cb.current_milestones,
    tm.milestone_name,
    tm.weight,
    tm.category,
    tm.is_partial
  FROM component_base cb
  LEFT JOIN mv_template_milestone_weights tm
    ON tm.component_type = cb.component_type
    AND (tm.project_id = cb.project_id OR tm.project_id IS NULL)
  ORDER BY cb.id, tm.milestone_name, tm.priority
),
component_milestone_earned AS (
  SELECT
    ct.component_id,
    ct.area_id,
    ct.project_id,
    ct.component_type,
    ct.mh,
    ct.pct_complete,
    ct.category,
    ct.weight,
    ct.is_partial,
    CASE
      WHEN (ct.current_milestones->ct.milestone_name)::TEXT = 'true' THEN 100
      WHEN (ct.current_milestones->ct.milestone_name)::TEXT = 'false' THEN 0
      WHEN ct.current_milestones->ct.milestone_name IS NULL THEN 0
      ELSE LEAST(100, GREATEST(0, COALESCE((ct.current_milestones->>ct.milestone_name)::NUMERIC, 0)))
    END as milestone_value
  FROM component_templates ct
  WHERE ct.milestone_name IS NOT NULL
),
component_category AS (
  SELECT
    cme.component_id,
    cme.area_id,
    cme.project_id,
    cme.component_type,
    cme.mh,
    cme.pct_complete,
    SUM(CASE WHEN cme.category = 'receive' THEN cme.weight ELSE 0 END) as receive_total_weight,
    SUM(CASE WHEN cme.category = 'install' THEN cme.weight ELSE 0 END) as install_total_weight,
    SUM(CASE WHEN cme.category = 'punch' THEN cme.weight ELSE 0 END) as punch_total_weight,
    SUM(CASE WHEN cme.category = 'test' THEN cme.weight ELSE 0 END) as test_total_weight,
    SUM(CASE WHEN cme.category = 'restore' THEN cme.weight ELSE 0 END) as restore_total_weight,
    SUM(CASE WHEN cme.category = 'receive' THEN
      CASE WHEN cme.is_partial THEN cme.weight * cme.milestone_value / 100.0
           WHEN cme.milestone_value = 100 THEN cme.weight
           ELSE 0 END
      ELSE 0 END) as receive_earned_weight,
    SUM(CASE WHEN cme.category = 'install' THEN
      CASE WHEN cme.is_partial THEN cme.weight * cme.milestone_value / 100.0
           WHEN cme.milestone_value = 100 THEN cme.weight
           ELSE 0 END
      ELSE 0 END) as install_earned_weight,
    SUM(CASE WHEN cme.category = 'punch' THEN
      CASE WHEN cme.is_partial THEN cme.weight * cme.milestone_value / 100.0
           WHEN cme.milestone_value = 100 THEN cme.weight
           ELSE 0 END
      ELSE 0 END) as punch_earned_weight,
    SUM(CASE WHEN cme.category = 'test' THEN
      CASE WHEN cme.is_partial THEN cme.weight * cme.milestone_value / 100.0
           WHEN cme.milestone_value = 100 THEN cme.weight
           ELSE 0 END
      ELSE 0 END) as test_earned_weight,
    SUM(CASE WHEN cme.category = 'restore' THEN
      CASE WHEN cme.is_partial THEN cme.weight * cme.milestone_value / 100.0
           WHEN cme.milestone_value = 100 THEN cme.weight
           ELSE 0 END
      ELSE 0 END) as restore_earned_weight
  FROM component_milestone_earned cme
  GROUP BY cme.component_id, cme.area_id, cme.project_id, cme.component_type, cme.mh, cme.pct_complete
),
component_earned AS (
  SELECT
    cc.*,
    CASE WHEN cc.receive_total_weight > 0
      THEN cc.mh * (cc.receive_total_weight / 100.0) * (cc.receive_earned_weight / cc.receive_total_weight)
      ELSE 0 END as receive_mh_earned,
    CASE WHEN cc.install_total_weight > 0
      THEN cc.mh * (cc.install_total_weight / 100.0) * (cc.install_earned_weight / cc.install_total_weight)
      ELSE 0 END as install_mh_earned,
    CASE WHEN cc.punch_total_weight > 0
      THEN cc.mh * (cc.punch_total_weight / 100.0) * (cc.punch_earned_weight / cc.punch_total_weight)
      ELSE 0 END as punch_mh_earned,
    CASE WHEN cc.test_total_weight > 0
      THEN cc.mh * (cc.test_total_weight / 100.0) * (cc.test_earned_weight / cc.test_total_weight)
      ELSE 0 END as test_mh_earned,
    CASE WHEN cc.restore_total_weight > 0
      THEN cc.mh * (cc.restore_total_weight / 100.0) * (cc.restore_earned_weight / cc.restore_total_weight)
      ELSE 0 END as restore_mh_earned
  FROM component_category cc
)
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.project_id,
  COALESCE(SUM(ce.mh), 0) AS mh_budget,
  COALESCE(SUM(ce.mh * ce.receive_total_weight / 100.0), 0) AS receive_mh_budget,
  COALESCE(SUM(ce.mh * ce.install_total_weight / 100.0), 0) AS install_mh_budget,
  COALESCE(SUM(ce.mh * ce.punch_total_weight / 100.0), 0) AS punch_mh_budget,
  COALESCE(SUM(ce.mh * ce.test_total_weight / 100.0), 0) AS test_mh_budget,
  COALESCE(SUM(ce.mh * ce.restore_total_weight / 100.0), 0) AS restore_mh_budget,
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
FROM areas a
LEFT JOIN component_earned ce ON ce.area_id = a.id
GROUP BY a.id, a.name, a.project_id;

GRANT SELECT ON vw_manhour_progress_by_area TO authenticated;

-- vw_manhour_progress_by_system
CREATE OR REPLACE VIEW vw_manhour_progress_by_system AS
WITH component_base AS (
  SELECT c.id, c.system_id, c.project_id, c.component_type,
    COALESCE(c.budgeted_manhours, 0) AS mh, COALESCE(c.percent_complete, 0) AS pct_complete, c.current_milestones
  FROM components c WHERE NOT c.is_retired
),
component_templates AS (
  SELECT DISTINCT ON (cb.id, tm.milestone_name)
    cb.id as component_id, cb.system_id, cb.project_id, cb.component_type, cb.mh, cb.pct_complete, cb.current_milestones,
    tm.milestone_name, tm.weight, tm.category, tm.is_partial
  FROM component_base cb
  LEFT JOIN mv_template_milestone_weights tm ON tm.component_type = cb.component_type AND (tm.project_id = cb.project_id OR tm.project_id IS NULL)
  ORDER BY cb.id, tm.milestone_name, tm.priority
),
component_milestone_earned AS (
  SELECT ct.component_id, ct.system_id, ct.project_id, ct.component_type, ct.mh, ct.pct_complete, ct.category, ct.weight, ct.is_partial,
    CASE WHEN (ct.current_milestones->ct.milestone_name)::TEXT = 'true' THEN 100 WHEN (ct.current_milestones->ct.milestone_name)::TEXT = 'false' THEN 0
         WHEN ct.current_milestones->ct.milestone_name IS NULL THEN 0 ELSE LEAST(100, GREATEST(0, COALESCE((ct.current_milestones->>ct.milestone_name)::NUMERIC, 0))) END as milestone_value
  FROM component_templates ct WHERE ct.milestone_name IS NOT NULL
),
component_category AS (
  SELECT cme.component_id, cme.system_id, cme.project_id, cme.component_type, cme.mh, cme.pct_complete,
    SUM(CASE WHEN cme.category = 'receive' THEN cme.weight ELSE 0 END) as receive_total_weight,
    SUM(CASE WHEN cme.category = 'install' THEN cme.weight ELSE 0 END) as install_total_weight,
    SUM(CASE WHEN cme.category = 'punch' THEN cme.weight ELSE 0 END) as punch_total_weight,
    SUM(CASE WHEN cme.category = 'test' THEN cme.weight ELSE 0 END) as test_total_weight,
    SUM(CASE WHEN cme.category = 'restore' THEN cme.weight ELSE 0 END) as restore_total_weight,
    SUM(CASE WHEN cme.category = 'receive' THEN CASE WHEN cme.is_partial THEN cme.weight * cme.milestone_value / 100.0 WHEN cme.milestone_value = 100 THEN cme.weight ELSE 0 END ELSE 0 END) as receive_earned_weight,
    SUM(CASE WHEN cme.category = 'install' THEN CASE WHEN cme.is_partial THEN cme.weight * cme.milestone_value / 100.0 WHEN cme.milestone_value = 100 THEN cme.weight ELSE 0 END ELSE 0 END) as install_earned_weight,
    SUM(CASE WHEN cme.category = 'punch' THEN CASE WHEN cme.is_partial THEN cme.weight * cme.milestone_value / 100.0 WHEN cme.milestone_value = 100 THEN cme.weight ELSE 0 END ELSE 0 END) as punch_earned_weight,
    SUM(CASE WHEN cme.category = 'test' THEN CASE WHEN cme.is_partial THEN cme.weight * cme.milestone_value / 100.0 WHEN cme.milestone_value = 100 THEN cme.weight ELSE 0 END ELSE 0 END) as test_earned_weight,
    SUM(CASE WHEN cme.category = 'restore' THEN CASE WHEN cme.is_partial THEN cme.weight * cme.milestone_value / 100.0 WHEN cme.milestone_value = 100 THEN cme.weight ELSE 0 END ELSE 0 END) as restore_earned_weight
  FROM component_milestone_earned cme GROUP BY cme.component_id, cme.system_id, cme.project_id, cme.component_type, cme.mh, cme.pct_complete
),
component_earned AS (
  SELECT cc.*,
    CASE WHEN cc.receive_total_weight > 0 THEN cc.mh * (cc.receive_total_weight / 100.0) * (cc.receive_earned_weight / cc.receive_total_weight) ELSE 0 END as receive_mh_earned,
    CASE WHEN cc.install_total_weight > 0 THEN cc.mh * (cc.install_total_weight / 100.0) * (cc.install_earned_weight / cc.install_total_weight) ELSE 0 END as install_mh_earned,
    CASE WHEN cc.punch_total_weight > 0 THEN cc.mh * (cc.punch_total_weight / 100.0) * (cc.punch_earned_weight / cc.punch_total_weight) ELSE 0 END as punch_mh_earned,
    CASE WHEN cc.test_total_weight > 0 THEN cc.mh * (cc.test_total_weight / 100.0) * (cc.test_earned_weight / cc.test_total_weight) ELSE 0 END as test_mh_earned,
    CASE WHEN cc.restore_total_weight > 0 THEN cc.mh * (cc.restore_total_weight / 100.0) * (cc.restore_earned_weight / cc.restore_total_weight) ELSE 0 END as restore_mh_earned
  FROM component_category cc
)
SELECT
  s.id AS system_id, s.name AS system_name, s.project_id,
  COALESCE(SUM(ce.mh), 0) AS mh_budget,
  COALESCE(SUM(ce.mh * ce.receive_total_weight / 100.0), 0) AS receive_mh_budget,
  COALESCE(SUM(ce.mh * ce.install_total_weight / 100.0), 0) AS install_mh_budget,
  COALESCE(SUM(ce.mh * ce.punch_total_weight / 100.0), 0) AS punch_mh_budget,
  COALESCE(SUM(ce.mh * ce.test_total_weight / 100.0), 0) AS test_mh_budget,
  COALESCE(SUM(ce.mh * ce.restore_total_weight / 100.0), 0) AS restore_mh_budget,
  COALESCE(SUM(ce.receive_mh_earned), 0) AS receive_mh_earned,
  COALESCE(SUM(ce.install_mh_earned), 0) AS install_mh_earned,
  COALESCE(SUM(ce.punch_mh_earned), 0) AS punch_mh_earned,
  COALESCE(SUM(ce.test_mh_earned), 0) AS test_mh_earned,
  COALESCE(SUM(ce.restore_mh_earned), 0) AS restore_mh_earned,
  COALESCE(SUM(ce.mh * ce.pct_complete / 100.0), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(ce.mh), 0) > 0 THEN ROUND((SUM(ce.mh * ce.pct_complete / 100.0) / SUM(ce.mh) * 100)::NUMERIC, 2) ELSE 0 END AS mh_pct_complete
FROM systems s LEFT JOIN component_earned ce ON ce.system_id = s.id GROUP BY s.id, s.name, s.project_id;

GRANT SELECT ON vw_manhour_progress_by_system TO authenticated;

-- vw_manhour_progress_by_test_package
CREATE OR REPLACE VIEW vw_manhour_progress_by_test_package AS
WITH component_base AS (
  SELECT c.id, c.test_package_id, c.project_id, c.component_type,
    COALESCE(c.budgeted_manhours, 0) AS mh, COALESCE(c.percent_complete, 0) AS pct_complete, c.current_milestones
  FROM components c WHERE NOT c.is_retired
),
component_templates AS (
  SELECT DISTINCT ON (cb.id, tm.milestone_name)
    cb.id as component_id, cb.test_package_id, cb.project_id, cb.component_type, cb.mh, cb.pct_complete, cb.current_milestones,
    tm.milestone_name, tm.weight, tm.category, tm.is_partial
  FROM component_base cb
  LEFT JOIN mv_template_milestone_weights tm ON tm.component_type = cb.component_type AND (tm.project_id = cb.project_id OR tm.project_id IS NULL)
  ORDER BY cb.id, tm.milestone_name, tm.priority
),
component_milestone_earned AS (
  SELECT ct.component_id, ct.test_package_id, ct.project_id, ct.component_type, ct.mh, ct.pct_complete, ct.category, ct.weight, ct.is_partial,
    CASE WHEN (ct.current_milestones->ct.milestone_name)::TEXT = 'true' THEN 100 WHEN (ct.current_milestones->ct.milestone_name)::TEXT = 'false' THEN 0
         WHEN ct.current_milestones->ct.milestone_name IS NULL THEN 0 ELSE LEAST(100, GREATEST(0, COALESCE((ct.current_milestones->>ct.milestone_name)::NUMERIC, 0))) END as milestone_value
  FROM component_templates ct WHERE ct.milestone_name IS NOT NULL
),
component_category AS (
  SELECT cme.component_id, cme.test_package_id, cme.project_id, cme.component_type, cme.mh, cme.pct_complete,
    SUM(CASE WHEN cme.category = 'receive' THEN cme.weight ELSE 0 END) as receive_total_weight,
    SUM(CASE WHEN cme.category = 'install' THEN cme.weight ELSE 0 END) as install_total_weight,
    SUM(CASE WHEN cme.category = 'punch' THEN cme.weight ELSE 0 END) as punch_total_weight,
    SUM(CASE WHEN cme.category = 'test' THEN cme.weight ELSE 0 END) as test_total_weight,
    SUM(CASE WHEN cme.category = 'restore' THEN cme.weight ELSE 0 END) as restore_total_weight,
    SUM(CASE WHEN cme.category = 'receive' THEN CASE WHEN cme.is_partial THEN cme.weight * cme.milestone_value / 100.0 WHEN cme.milestone_value = 100 THEN cme.weight ELSE 0 END ELSE 0 END) as receive_earned_weight,
    SUM(CASE WHEN cme.category = 'install' THEN CASE WHEN cme.is_partial THEN cme.weight * cme.milestone_value / 100.0 WHEN cme.milestone_value = 100 THEN cme.weight ELSE 0 END ELSE 0 END) as install_earned_weight,
    SUM(CASE WHEN cme.category = 'punch' THEN CASE WHEN cme.is_partial THEN cme.weight * cme.milestone_value / 100.0 WHEN cme.milestone_value = 100 THEN cme.weight ELSE 0 END ELSE 0 END) as punch_earned_weight,
    SUM(CASE WHEN cme.category = 'test' THEN CASE WHEN cme.is_partial THEN cme.weight * cme.milestone_value / 100.0 WHEN cme.milestone_value = 100 THEN cme.weight ELSE 0 END ELSE 0 END) as test_earned_weight,
    SUM(CASE WHEN cme.category = 'restore' THEN CASE WHEN cme.is_partial THEN cme.weight * cme.milestone_value / 100.0 WHEN cme.milestone_value = 100 THEN cme.weight ELSE 0 END ELSE 0 END) as restore_earned_weight
  FROM component_milestone_earned cme GROUP BY cme.component_id, cme.test_package_id, cme.project_id, cme.component_type, cme.mh, cme.pct_complete
),
component_earned AS (
  SELECT cc.*,
    CASE WHEN cc.receive_total_weight > 0 THEN cc.mh * (cc.receive_total_weight / 100.0) * (cc.receive_earned_weight / cc.receive_total_weight) ELSE 0 END as receive_mh_earned,
    CASE WHEN cc.install_total_weight > 0 THEN cc.mh * (cc.install_total_weight / 100.0) * (cc.install_earned_weight / cc.install_total_weight) ELSE 0 END as install_mh_earned,
    CASE WHEN cc.punch_total_weight > 0 THEN cc.mh * (cc.punch_total_weight / 100.0) * (cc.punch_earned_weight / cc.punch_total_weight) ELSE 0 END as punch_mh_earned,
    CASE WHEN cc.test_total_weight > 0 THEN cc.mh * (cc.test_total_weight / 100.0) * (cc.test_earned_weight / cc.test_total_weight) ELSE 0 END as test_mh_earned,
    CASE WHEN cc.restore_total_weight > 0 THEN cc.mh * (cc.restore_total_weight / 100.0) * (cc.restore_earned_weight / cc.restore_total_weight) ELSE 0 END as restore_mh_earned
  FROM component_category cc
)
SELECT
  tp.id AS test_package_id, tp.name AS test_package_name, tp.project_id,
  COALESCE(SUM(ce.mh), 0) AS mh_budget,
  COALESCE(SUM(ce.mh * ce.receive_total_weight / 100.0), 0) AS receive_mh_budget,
  COALESCE(SUM(ce.mh * ce.install_total_weight / 100.0), 0) AS install_mh_budget,
  COALESCE(SUM(ce.mh * ce.punch_total_weight / 100.0), 0) AS punch_mh_budget,
  COALESCE(SUM(ce.mh * ce.test_total_weight / 100.0), 0) AS test_mh_budget,
  COALESCE(SUM(ce.mh * ce.restore_total_weight / 100.0), 0) AS restore_mh_budget,
  COALESCE(SUM(ce.receive_mh_earned), 0) AS receive_mh_earned,
  COALESCE(SUM(ce.install_mh_earned), 0) AS install_mh_earned,
  COALESCE(SUM(ce.punch_mh_earned), 0) AS punch_mh_earned,
  COALESCE(SUM(ce.test_mh_earned), 0) AS test_mh_earned,
  COALESCE(SUM(ce.restore_mh_earned), 0) AS restore_mh_earned,
  COALESCE(SUM(ce.mh * ce.pct_complete / 100.0), 0) AS total_mh_earned,
  CASE WHEN COALESCE(SUM(ce.mh), 0) > 0 THEN ROUND((SUM(ce.mh * ce.pct_complete / 100.0) / SUM(ce.mh) * 100)::NUMERIC, 2) ELSE 0 END AS mh_pct_complete
FROM test_packages tp LEFT JOIN component_earned ce ON ce.test_package_id = tp.id GROUP BY tp.id, tp.name, tp.project_id;

GRANT SELECT ON vw_manhour_progress_by_test_package TO authenticated;
