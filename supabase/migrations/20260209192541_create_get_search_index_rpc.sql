-- Migration: Create get_search_index RPC for global search
-- Returns a flat array of searchable items across all entity types for a project.
-- Used by the global search bar to provide grouped, filterable results client-side.

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

  -- Components (excluding field_weld type — those are searched via field_welds)
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
    NULL::TEXT AS sublabel,
    initcap(replace(c.component_type, '_', ' ')) AS badge
  FROM components c
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

  -- Field Welds (via components + field_welds join)
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

-- Grant execute to authenticated users (RLS on underlying tables enforces access)
GRANT EXECUTE ON FUNCTION get_search_index(UUID) TO authenticated;
