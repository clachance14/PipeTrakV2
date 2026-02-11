-- Migration: Remove identity count from search index badge
--
-- The "x14" count on badges was noise. Badge should just show the component type
-- (e.g. "Instrument", "Support", "Valve"). Result counts are shown in the UI
-- via category header and footer.

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

  -- Components: commodity_code in sublabel, component type in badge
  SELECT
    c.id,
    'component'::TEXT AS category,
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
    END AS label,
    CASE
      WHEN c.identity_key->>'commodity_code' IS NOT NULL AND d.drawing_no_raw IS NOT NULL
        THEN concat(c.identity_key->>'commodity_code', ' on ', d.drawing_no_raw)
      WHEN c.identity_key->>'commodity_code' IS NOT NULL
        THEN c.identity_key->>'commodity_code'
      WHEN d.drawing_no_raw IS NOT NULL
        THEN concat('on ', d.drawing_no_raw)
      ELSE NULL
    END AS sublabel,
    initcap(replace(c.component_type, '_', ' ')) AS badge
  FROM components c
  LEFT JOIN drawings d ON c.drawing_id = d.id
  WHERE c.project_id = p_project_id
    AND c.is_retired = false
    AND c.component_type != 'field_weld'

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

COMMENT ON FUNCTION get_search_index(UUID) IS 'Returns searchable index with commodity codes in sublabel for global search';
