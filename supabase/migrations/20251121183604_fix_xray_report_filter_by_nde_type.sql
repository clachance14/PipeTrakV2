-- Fix X-ray Report to Only Count RT (X-ray) NDE Type
-- Previous version counted ALL NDE types (RT, UT, PT, MT, VT) in x-ray statistics
-- This update filters to only count RT (X-ray/Radiographic) inspections

CREATE OR REPLACE FUNCTION get_weld_summary_by_welder(
  p_project_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_welder_ids UUID[] DEFAULT NULL,
  p_area_ids UUID[] DEFAULT NULL,
  p_system_ids UUID[] DEFAULT NULL,
  p_package_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  -- Welder identification
  welder_id UUID,
  welder_stencil TEXT,
  welder_name TEXT,

  -- 5% X-Ray Tier
  welds_5pct BIGINT,
  nde_5pct BIGINT,
  reject_5pct BIGINT,

  -- 10% X-Ray Tier
  welds_10pct BIGINT,
  nde_10pct BIGINT,
  reject_10pct BIGINT,

  -- 100% X-Ray Tier
  welds_100pct BIGINT,
  nde_100pct BIGINT,
  reject_100pct BIGINT,

  -- Overall Totals
  welds_total BIGINT,
  nde_total BIGINT,
  reject_total BIGINT,

  -- Calculated Metrics
  reject_rate NUMERIC,
  nde_comp_5pct NUMERIC,
  nde_comp_10pct NUMERIC,
  nde_comp_100pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id AS welder_id,
    w.stencil AS welder_stencil,
    w.name AS welder_name,

    -- 5% X-Ray Tier Metrics
    COUNT(CASE
      WHEN fw.xray_percentage = 5.0 AND fw.date_welded IS NOT NULL
      THEN 1
    END) AS welds_5pct,
    COUNT(CASE
      WHEN fw.xray_percentage = 5.0 AND fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT'
      THEN 1
    END) AS nde_5pct,
    COUNT(CASE
      WHEN fw.xray_percentage = 5.0 AND fw.date_welded IS NOT NULL AND fw.nde_result = 'FAIL' AND fw.nde_type = 'RT'
      THEN 1
    END) AS reject_5pct,

    -- 10% X-Ray Tier Metrics
    COUNT(CASE
      WHEN fw.xray_percentage = 10.0 AND fw.date_welded IS NOT NULL
      THEN 1
    END) AS welds_10pct,
    COUNT(CASE
      WHEN fw.xray_percentage = 10.0 AND fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT'
      THEN 1
    END) AS nde_10pct,
    COUNT(CASE
      WHEN fw.xray_percentage = 10.0 AND fw.date_welded IS NOT NULL AND fw.nde_result = 'FAIL' AND fw.nde_type = 'RT'
      THEN 1
    END) AS reject_10pct,

    -- 100% X-Ray Tier Metrics
    COUNT(CASE
      WHEN fw.xray_percentage = 100.0 AND fw.date_welded IS NOT NULL
      THEN 1
    END) AS welds_100pct,
    COUNT(CASE
      WHEN fw.xray_percentage = 100.0 AND fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT'
      THEN 1
    END) AS nde_100pct,
    COUNT(CASE
      WHEN fw.xray_percentage = 100.0 AND fw.date_welded IS NOT NULL AND fw.nde_result = 'FAIL' AND fw.nde_type = 'RT'
      THEN 1
    END) AS reject_100pct,

    -- Overall Totals (across all tiers)
    COUNT(CASE
      WHEN fw.date_welded IS NOT NULL
      THEN 1
    END) AS welds_total,
    COUNT(CASE
      WHEN fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT'
      THEN 1
    END) AS nde_total,
    COUNT(CASE
      WHEN fw.date_welded IS NOT NULL AND fw.nde_result = 'FAIL' AND fw.nde_type = 'RT'
      THEN 1
    END) AS reject_total,

    -- Calculated Metrics
    ROUND(
      CASE
        WHEN COUNT(CASE WHEN fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' THEN 1 END) > 0 THEN
          (COUNT(CASE WHEN fw.date_welded IS NOT NULL AND fw.nde_result = 'FAIL' AND fw.nde_type = 'RT' THEN 1 END)::numeric /
           COUNT(CASE WHEN fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' THEN 1 END)::numeric) * 100
        ELSE 0
      END, 2
    ) AS reject_rate,

    -- NDE Completion % per tier (what % of completed welds in each tier have been x-rayed with RT)
    ROUND(
      CASE
        WHEN COUNT(CASE WHEN fw.xray_percentage = 5.0 AND fw.date_welded IS NOT NULL THEN 1 END) > 0 THEN
          (COUNT(CASE WHEN fw.xray_percentage = 5.0 AND fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' THEN 1 END)::numeric /
           COUNT(CASE WHEN fw.xray_percentage = 5.0 AND fw.date_welded IS NOT NULL THEN 1 END)::numeric) * 100
        ELSE NULL
      END, 2
    ) AS nde_comp_5pct,
    ROUND(
      CASE
        WHEN COUNT(CASE WHEN fw.xray_percentage = 10.0 AND fw.date_welded IS NOT NULL THEN 1 END) > 0 THEN
          (COUNT(CASE WHEN fw.xray_percentage = 10.0 AND fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' THEN 1 END)::numeric /
           COUNT(CASE WHEN fw.xray_percentage = 10.0 AND fw.date_welded IS NOT NULL THEN 1 END)::numeric) * 100
        ELSE NULL
      END, 2
    ) AS nde_comp_10pct,
    ROUND(
      CASE
        WHEN COUNT(CASE WHEN fw.xray_percentage = 100.0 AND fw.date_welded IS NOT NULL THEN 1 END) > 0 THEN
          (COUNT(CASE WHEN fw.xray_percentage = 100.0 AND fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' THEN 1 END)::numeric /
           COUNT(CASE WHEN fw.xray_percentage = 100.0 AND fw.date_welded IS NOT NULL THEN 1 END)::numeric) * 100
        ELSE NULL
      END, 2
    ) AS nde_comp_100pct

  FROM welders w
  INNER JOIN field_welds fw ON fw.welder_id = w.id
  INNER JOIN components c ON c.id = fw.component_id
  WHERE
    w.project_id = p_project_id
    AND c.is_retired = false
    -- Date range filter (on date_welded)
    AND (p_start_date IS NULL OR fw.date_welded >= p_start_date)
    AND (p_end_date IS NULL OR fw.date_welded <= p_end_date)
    -- Welder filter
    AND (p_welder_ids IS NULL OR w.id = ANY(p_welder_ids))
    -- Area filter
    AND (p_area_ids IS NULL OR c.area_id = ANY(p_area_ids))
    -- System filter
    AND (p_system_ids IS NULL OR c.system_id = ANY(p_system_ids))
    -- Package filter
    AND (p_package_ids IS NULL OR c.test_package_id = ANY(p_package_ids))
  GROUP BY w.id, w.stencil, w.name
  ORDER BY w.stencil;
END;
$$;

COMMENT ON FUNCTION get_weld_summary_by_welder IS
'Dynamic weld summary report by welder with tier-grouped metrics (5%, 10%, 100% x-ray).
Returns completed welds (date_welded IS NOT NULL), NDE counts (filtered to RT type only), and rejection counts per tier.
Supports filtering by date range, welders, and project dimensions (area, system, package).
Updated to only count RT (X-ray/Radiographic) inspections in NDE and rejection statistics.';
