-- Migration: Add per-drawing identity count for same-label components
--
-- Supports like "G4G-1412-05AB-001-4-4 4" appear multiple times on the same
-- drawing (different seq). Collapse these into one row with count in badge.
--
-- Instruments/valves with unique tag_numbers stay individual (count = 1).
-- Uses COALESCE(label, id) to prevent NULL labels from false-grouping.

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
  component_ranked AS (
    SELECT
      cd.id,
      cd.component_type,
      cd.identity_key,
      cd.drawing_no_raw,
      cd.comp_label,
      -- Count identical components on the same drawing
      -- COALESCE prevents NULL labels from false-grouping
      COUNT(*) OVER (
        PARTITION BY cd.component_type, cd.drawing_id, COALESCE(cd.comp_label, cd.id::TEXT)
      ) AS identity_count,
      -- Keep one representative per identity group
      ROW_NUMBER() OVER (
        PARTITION BY cd.component_type, cd.drawing_id, COALESCE(cd.comp_label, cd.id::TEXT)
        ORDER BY cd.id
      ) AS rn
    FROM component_data cd
  )

  -- Drawings
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

  -- Components: one row per unique identity per drawing, with count
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

  -- Welders
  SELECT
    w.id,
    'welder'::TEXT AS category,
    w.name AS label,
    concat('Stencil: ', w.stencil) AS sublabel,
    NULL::TEXT AS badge
  FROM welders w
  WHERE w.project_id = p_project_id

  UNION ALL

  -- Test Packages
  SELECT
    tp.id,
    'test_package'::TEXT AS category,
    tp.name AS label,
    tp.description AS sublabel,
    NULL::TEXT AS badge
  FROM test_packages tp
  WHERE tp.project_id = p_project_id

  UNION ALL

  -- Field Welds
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

  -- Areas
  SELECT
    a.id,
    'area'::TEXT AS category,
    a.name AS label,
    a.description AS sublabel,
    NULL::TEXT AS badge
  FROM areas a
  WHERE a.project_id = p_project_id;
$$;

COMMENT ON FUNCTION get_search_index(UUID) IS 'Returns searchable index with commodity codes in sublabel and per-drawing identity counts';
