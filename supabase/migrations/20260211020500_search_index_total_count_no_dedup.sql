-- Migration: Fix search index to show all components with project-wide identity count
--
-- Changes from previous version:
-- 1. Remove per-drawing dedup — show every component individually (different drawings)
-- 2. Count identical labels across ALL drawings (project-wide), not per-drawing
-- 3. Badge shows total count: "Support x30" means 30 of this component in the project

CREATE OR REPLACE FUNCTION get_search_index(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  category TEXT,
  label TEXT,
  sublabel TEXT,
  badge TEXT
)
LANGUAGE sql STABLE
AS $$
  -- Step 1: Compute labels for all non-retired, non-field-weld components
  WITH component_data AS (
    SELECT
      c.id,
      c.component_type,
      c.identity_key,
      d.drawing_no_raw,
      CASE c.component_type
        WHEN 'spool' THEN c.identity_key->>'spool_id'
        WHEN 'support' THEN concat(c.identity_key->>'commodity_code', ' ', c.identity_key->>'size')
        WHEN 'valve' THEN c.identity_key->>'tag_number'
        WHEN 'fitting' THEN c.identity_key->>'fitting_id'
        WHEN 'flange' THEN c.identity_key->>'flange_id'
        WHEN 'instrument' THEN c.identity_key->>'tag_number'
        WHEN 'tubing' THEN c.identity_key->>'tubing_id'
        WHEN 'hose' THEN c.identity_key->>'hose_id'
        WHEN 'misc_component' THEN c.identity_key->>'component_id'
        WHEN 'threaded_pipe' THEN c.identity_key->>'pipe_id'
        WHEN 'pipe' THEN c.identity_key->>'pipe_id'
        ELSE c.id::TEXT
      END AS comp_label
    FROM components c
    LEFT JOIN drawings d ON c.drawing_id = d.id
    WHERE c.project_id = p_project_id
      AND c.is_retired = false
      AND c.component_type != 'field_weld'
  ),
  -- Step 2: Add project-wide identity count (no drawing_id in partition)
  component_counted AS (
    SELECT
      cd.id,
      cd.component_type,
      cd.identity_key,
      cd.drawing_no_raw,
      cd.comp_label,
      COUNT(*) OVER (
        PARTITION BY cd.component_type, cd.comp_label
      ) AS identity_count
    FROM component_data cd
  )

  -- Drawings (unchanged)
  SELECT
    d.id,
    'drawing'::TEXT AS category,
    d.drawing_no_raw AS label,
    d.title AS sublabel,
    NULL::TEXT AS badge
  FROM drawings d
  WHERE d.project_id = p_project_id
    AND d.is_retired = false

  UNION ALL

  -- Components: every row shown, with project-wide count in badge
  SELECT
    cc.id,
    'component'::TEXT AS category,
    cc.comp_label AS label,
    CASE
      WHEN cc.identity_key->>'commodity_code' IS NOT NULL AND cc.drawing_no_raw IS NOT NULL
        THEN concat(cc.identity_key->>'commodity_code', ' on ', cc.drawing_no_raw)
      WHEN cc.identity_key->>'commodity_code' IS NOT NULL
        THEN cc.identity_key->>'commodity_code'
      WHEN cc.drawing_no_raw IS NOT NULL
        THEN concat('on ', cc.drawing_no_raw)
      ELSE NULL
    END AS sublabel,
    CASE
      WHEN cc.identity_count > 1
        THEN concat(initcap(replace(cc.component_type, '_', ' ')), ' x', cc.identity_count)
      ELSE initcap(replace(cc.component_type, '_', ' '))
    END AS badge
  FROM component_counted cc

  UNION ALL

  -- Welders (unchanged)
  SELECT
    w.id,
    'welder'::TEXT AS category,
    w.name AS label,
    concat('Stencil: ', w.stencil) AS sublabel,
    NULL::TEXT AS badge
  FROM welders w
  WHERE w.project_id = p_project_id

  UNION ALL

  -- Test Packages (unchanged)
  SELECT
    tp.id,
    'test_package'::TEXT AS category,
    tp.name AS label,
    tp.description AS sublabel,
    NULL::TEXT AS badge
  FROM test_packages tp
  WHERE tp.project_id = p_project_id

  UNION ALL

  -- Field Welds (unchanged)
  SELECT
    fw.id,
    'field_weld'::TEXT AS category,
    c.identity_key->>'weld_number' AS label,
    CASE
      WHEN d.drawing_no_raw IS NOT NULL THEN concat('on ', d.drawing_no_raw)
      ELSE NULL
    END AS sublabel,
    NULL::TEXT AS badge
  FROM field_welds fw
  INNER JOIN components c ON fw.component_id = c.id
  LEFT JOIN drawings d ON c.drawing_id = d.id
  WHERE fw.project_id = p_project_id
    AND c.is_retired = false

  UNION ALL

  -- Areas (unchanged)
  SELECT
    a.id,
    'area'::TEXT AS category,
    a.name AS label,
    a.description AS sublabel,
    NULL::TEXT AS badge
  FROM areas a
  WHERE a.project_id = p_project_id;
$$;

COMMENT ON FUNCTION get_search_index(UUID) IS 'Returns searchable index with commodity codes in sublabel and project-wide identity counts in badge';
