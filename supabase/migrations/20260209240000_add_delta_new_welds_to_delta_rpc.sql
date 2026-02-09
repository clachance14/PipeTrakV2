-- Migration: Add delta_new_welds to field weld delta RPC
--
-- Counts field_weld components created during the date range per dimension.
-- Enables showing "how many new welds were added" inline next to Total Welds.

DROP FUNCTION IF EXISTS get_field_weld_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION get_field_weld_delta_by_dimension(
  p_project_id UUID,
  p_dimension TEXT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS TABLE (
  dimension_id UUID,
  dimension_name TEXT,
  stencil TEXT,
  welds_with_activity INT,
  delta_fitup_count INT,
  delta_weld_complete_count INT,
  delta_accepted_count INT,
  delta_pct_total NUMERIC,
  delta_new_welds INT
) AS $$
BEGIN
  IF p_dimension NOT IN ('area', 'system', 'test_package', 'welder') THEN
    RAISE EXCEPTION 'Invalid dimension: %. Must be area, system, test_package, or welder', p_dimension;
  END IF;

  RETURN QUERY
  WITH event_data AS (
    SELECT
      me.component_id,
      me.milestone_name,
      me.category,
      COALESCE(me.value, 0) AS value,
      COALESCE(me.previous_value, 0) AS previous_value,
      COALESCE(me.delta_mh, 0) AS delta_mh,
      c.area_id,
      c.system_id,
      c.test_package_id,
      c.attributes->>'assigned_welder_id' AS welder_id_str
    FROM milestone_events me
    JOIN components c ON c.id = me.component_id
    WHERE c.project_id = p_project_id
      AND me.created_at >= p_start_date
      AND me.created_at < p_end_date
      AND c.is_retired = false
      AND c.component_type = 'field_weld'
      AND me.category IS NOT NULL
  ),
  completions AS (
    SELECT
      ed.component_id,
      ed.milestone_name,
      ed.category,
      CASE
        WHEN ed.previous_value < 100 AND ed.value = 100 THEN 1
        ELSE 0
      END AS completed,
      ed.delta_mh,
      ed.area_id,
      ed.system_id,
      ed.test_package_id,
      ed.welder_id_str
    FROM event_data ed
  ),
  dimension_mapping AS (
    SELECT
      c.*,
      CASE p_dimension
        WHEN 'area' THEN c.area_id
        WHEN 'system' THEN c.system_id
        WHEN 'test_package' THEN c.test_package_id
        WHEN 'welder' THEN c.welder_id_str::UUID
      END AS dim_id
    FROM completions c
  ),
  aggregated AS (
    SELECT
      dm.dim_id,
      COUNT(DISTINCT dm.component_id)::INT AS active_welds,
      COALESCE(SUM(CASE WHEN dm.milestone_name = 'Fit-up' THEN dm.completed ELSE 0 END), 0)::INT AS fitup_count,
      COALESCE(SUM(CASE WHEN dm.milestone_name = 'Weld Complete' THEN dm.completed ELSE 0 END), 0)::INT AS weld_complete_count,
      COALESCE(SUM(CASE WHEN dm.milestone_name = 'Test' THEN dm.completed ELSE 0 END), 0)::INT AS accepted_count,
      COALESCE(SUM(dm.delta_mh), 0) AS total_delta_mh
    FROM dimension_mapping dm
    WHERE dm.dim_id IS NOT NULL
    GROUP BY dm.dim_id
  ),
  total_budget AS (
    SELECT
      CASE p_dimension
        WHEN 'area' THEN c.area_id
        WHEN 'system' THEN c.system_id
        WHEN 'test_package' THEN c.test_package_id
        WHEN 'welder' THEN (c.attributes->>'assigned_welder_id')::UUID
      END AS dim_id,
      SUM(COALESCE(c.budgeted_manhours, 0)) AS mh_budget
    FROM components c
    WHERE c.project_id = p_project_id
      AND c.is_retired = false
      AND c.component_type = 'field_weld'
    GROUP BY 1
  ),
  -- Count new welds created during the date range per dimension
  new_welds AS (
    SELECT
      CASE p_dimension
        WHEN 'area' THEN c.area_id
        WHEN 'system' THEN c.system_id
        WHEN 'test_package' THEN c.test_package_id
        WHEN 'welder' THEN (c.attributes->>'assigned_welder_id')::UUID
      END AS dim_id,
      COUNT(*)::INT AS new_weld_count
    FROM components c
    WHERE c.project_id = p_project_id
      AND c.is_retired = false
      AND c.component_type = 'field_weld'
      AND c.created_at >= p_start_date
      AND c.created_at < p_end_date
    GROUP BY 1
  )
  SELECT
    agg.dim_id AS dimension_id,
    CASE p_dimension
      WHEN 'area' THEN a.name
      WHEN 'system' THEN s.name
      WHEN 'test_package' THEN tp.name
      WHEN 'welder' THEN w.name
    END AS dimension_name,
    CASE p_dimension WHEN 'welder' THEN w.stencil ELSE NULL END AS stencil,
    agg.active_welds AS welds_with_activity,
    agg.fitup_count AS delta_fitup_count,
    agg.weld_complete_count AS delta_weld_complete_count,
    agg.accepted_count AS delta_accepted_count,
    CASE
      WHEN COALESCE(tb.mh_budget, 0) > 0
      THEN ROUND((agg.total_delta_mh / tb.mh_budget) * 100, 2)
      ELSE 0
    END AS delta_pct_total,
    COALESCE(nw.new_weld_count, 0)::INT AS delta_new_welds
  FROM aggregated agg
  LEFT JOIN total_budget tb ON agg.dim_id = tb.dim_id
  LEFT JOIN new_welds nw ON agg.dim_id = nw.dim_id
  LEFT JOIN areas a ON p_dimension = 'area' AND a.id = agg.dim_id
  LEFT JOIN systems s ON p_dimension = 'system' AND s.id = agg.dim_id
  LEFT JOIN test_packages tp ON p_dimension = 'test_package' AND tp.id = agg.dim_id
  LEFT JOIN welders w ON p_dimension = 'welder' AND w.id = agg.dim_id
  WHERE agg.dim_id IS NOT NULL
  ORDER BY dimension_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_field_weld_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION get_field_weld_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Field weld progress delta by dimension. Uses pre-calculated delta_mh and category columns.
Counts completions where milestone value went from <100 to 100.
Milestone mapping: Fit-up -> fitup_count, Weld Complete -> weld_complete_count, Test -> accepted_count.
Also counts new field_weld components created during the date range (delta_new_welds).';
