-- Migration: Enhance get_search_index to include commodity codes and identity counts
--
-- Changes:
-- 1. Add commodity_code to component sublabel (makes commodity codes searchable)
-- 2. Collapse identical components (same label on same drawing) into one row with count
-- 3. Show identity count in badge (e.g. "Valve x3") when count > 1
-- 4. Add drawing context to sublabel (e.g. "VCHKU on DWG-001")

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
      c.drawing_id,
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
  -- Step 2: Count identical components and pick one representative per group
  component_ranked AS (
    SELECT
      cd.id,
      cd.component_type,
      cd.identity_key,
      cd.drawing_no_raw,
      cd.comp_label,
      COUNT(*) OVER (
        PARTITION BY cd.component_type, cd.drawing_id, cd.comp_label
      ) AS identity_count,
      ROW_NUMBER() OVER (
        PARTITION BY cd.component_type, cd.drawing_id, cd.comp_label
        ORDER BY cd.id
      ) AS rn
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

  -- Components (enhanced: commodity_code sublabel + identity count badge)
  SELECT
    cr.id,
    'component'::TEXT AS category,
    cr.comp_label AS label,
    CASE
      WHEN cr.identity_key->>'commodity_code' IS NOT NULL AND cr.drawing_no_raw IS NOT NULL
        THEN concat(cr.identity_key->>'commodity_code', ' on ', cr.drawing_no_raw)
      WHEN cr.identity_key->>'commodity_code' IS NOT NULL
        THEN cr.identity_key->>'commodity_code'
      WHEN cr.drawing_no_raw IS NOT NULL
        THEN concat('on ', cr.drawing_no_raw)
      ELSE NULL
    END AS sublabel,
    CASE
      WHEN cr.identity_count > 1
        THEN concat(initcap(replace(cr.component_type, '_', ' ')), ' x', cr.identity_count)
      ELSE initcap(replace(cr.component_type, '_', ' '))
    END AS badge
  FROM component_ranked cr
  WHERE cr.rn = 1

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

COMMENT ON FUNCTION get_search_index(UUID) IS 'Returns searchable index with commodity codes in sublabel and identity counts in badge';
