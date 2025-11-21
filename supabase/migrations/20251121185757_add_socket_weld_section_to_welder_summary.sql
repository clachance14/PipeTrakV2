-- Add Socket Weld (SW) Section to Welder Summary Report
-- Separates Butt Welds (BW) and Socket Welds (SW) into distinct tier sections
-- Previous version showed only one set of tiers without weld type filtering

-- DROP existing function to allow return type change
DROP FUNCTION IF EXISTS get_weld_summary_by_welder(UUID, DATE, DATE, UUID[], UUID[], UUID[], UUID[]);

-- CREATE new function with expanded return signature
CREATE FUNCTION get_weld_summary_by_welder(
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

  -- Butt Weld (BW) 5% Tier
  bw_welds_5pct BIGINT,
  bw_nde_5pct BIGINT,
  bw_reject_5pct BIGINT,

  -- Butt Weld (BW) 10% Tier
  bw_welds_10pct BIGINT,
  bw_nde_10pct BIGINT,
  bw_reject_10pct BIGINT,

  -- Butt Weld (BW) 100% Tier
  bw_welds_100pct BIGINT,
  bw_nde_100pct BIGINT,
  bw_reject_100pct BIGINT,

  -- Butt Weld (BW) Calculated Metrics
  bw_reject_rate NUMERIC,
  bw_nde_comp_5pct NUMERIC,
  bw_nde_comp_10pct NUMERIC,
  bw_nde_comp_100pct NUMERIC,

  -- Socket Weld (SW) 5% Tier
  sw_welds_5pct BIGINT,
  sw_nde_5pct BIGINT,
  sw_reject_5pct BIGINT,

  -- Socket Weld (SW) 10% Tier
  sw_welds_10pct BIGINT,
  sw_nde_10pct BIGINT,
  sw_reject_10pct BIGINT,

  -- Socket Weld (SW) 100% Tier
  sw_welds_100pct BIGINT,
  sw_nde_100pct BIGINT,
  sw_reject_100pct BIGINT,

  -- Socket Weld (SW) Calculated Metrics
  sw_reject_rate NUMERIC,
  sw_nde_comp_5pct NUMERIC,
  sw_nde_comp_10pct NUMERIC,
  sw_nde_comp_100pct NUMERIC,

  -- Overall Totals (BW + SW combined)
  welds_total BIGINT,
  nde_total BIGINT,
  reject_total BIGINT,
  reject_rate NUMERIC
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

    -- BUTT WELD (BW) 5% Tier Metrics
    COUNT(CASE
      WHEN fw.xray_percentage = 5.0 AND fw.date_welded IS NOT NULL AND fw.weld_type = 'BW'
      THEN 1
    END) AS bw_welds_5pct,
    COUNT(CASE
      WHEN fw.xray_percentage = 5.0 AND fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type = 'BW'
      THEN 1
    END) AS bw_nde_5pct,
    COUNT(CASE
      WHEN fw.xray_percentage = 5.0 AND fw.date_welded IS NOT NULL AND fw.nde_result = 'FAIL' AND fw.nde_type = 'RT' AND fw.weld_type = 'BW'
      THEN 1
    END) AS bw_reject_5pct,

    -- BUTT WELD (BW) 10% Tier Metrics
    COUNT(CASE
      WHEN fw.xray_percentage = 10.0 AND fw.date_welded IS NOT NULL AND fw.weld_type = 'BW'
      THEN 1
    END) AS bw_welds_10pct,
    COUNT(CASE
      WHEN fw.xray_percentage = 10.0 AND fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type = 'BW'
      THEN 1
    END) AS bw_nde_10pct,
    COUNT(CASE
      WHEN fw.xray_percentage = 10.0 AND fw.date_welded IS NOT NULL AND fw.nde_result = 'FAIL' AND fw.nde_type = 'RT' AND fw.weld_type = 'BW'
      THEN 1
    END) AS bw_reject_10pct,

    -- BUTT WELD (BW) 100% Tier Metrics
    COUNT(CASE
      WHEN fw.xray_percentage = 100.0 AND fw.date_welded IS NOT NULL AND fw.weld_type = 'BW'
      THEN 1
    END) AS bw_welds_100pct,
    COUNT(CASE
      WHEN fw.xray_percentage = 100.0 AND fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type = 'BW'
      THEN 1
    END) AS bw_nde_100pct,
    COUNT(CASE
      WHEN fw.xray_percentage = 100.0 AND fw.date_welded IS NOT NULL AND fw.nde_result = 'FAIL' AND fw.nde_type = 'RT' AND fw.weld_type = 'BW'
      THEN 1
    END) AS bw_reject_100pct,

    -- BUTT WELD (BW) Calculated Metrics
    ROUND(
      CASE
        WHEN COUNT(CASE WHEN fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type = 'BW' THEN 1 END) > 0 THEN
          (COUNT(CASE WHEN fw.date_welded IS NOT NULL AND fw.nde_result = 'FAIL' AND fw.nde_type = 'RT' AND fw.weld_type = 'BW' THEN 1 END)::numeric /
           COUNT(CASE WHEN fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type = 'BW' THEN 1 END)::numeric) * 100
        ELSE 0
      END, 2
    ) AS bw_reject_rate,
    ROUND(
      CASE
        WHEN COUNT(CASE WHEN fw.xray_percentage = 5.0 AND fw.date_welded IS NOT NULL AND fw.weld_type = 'BW' THEN 1 END) > 0 THEN
          (COUNT(CASE WHEN fw.xray_percentage = 5.0 AND fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type = 'BW' THEN 1 END)::numeric /
           COUNT(CASE WHEN fw.xray_percentage = 5.0 AND fw.date_welded IS NOT NULL AND fw.weld_type = 'BW' THEN 1 END)::numeric) * 100
        ELSE NULL
      END, 2
    ) AS bw_nde_comp_5pct,
    ROUND(
      CASE
        WHEN COUNT(CASE WHEN fw.xray_percentage = 10.0 AND fw.date_welded IS NOT NULL AND fw.weld_type = 'BW' THEN 1 END) > 0 THEN
          (COUNT(CASE WHEN fw.xray_percentage = 10.0 AND fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type = 'BW' THEN 1 END)::numeric /
           COUNT(CASE WHEN fw.xray_percentage = 10.0 AND fw.date_welded IS NOT NULL AND fw.weld_type = 'BW' THEN 1 END)::numeric) * 100
        ELSE NULL
      END, 2
    ) AS bw_nde_comp_10pct,
    ROUND(
      CASE
        WHEN COUNT(CASE WHEN fw.xray_percentage = 100.0 AND fw.date_welded IS NOT NULL AND fw.weld_type = 'BW' THEN 1 END) > 0 THEN
          (COUNT(CASE WHEN fw.xray_percentage = 100.0 AND fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type = 'BW' THEN 1 END)::numeric /
           COUNT(CASE WHEN fw.xray_percentage = 100.0 AND fw.date_welded IS NOT NULL AND fw.weld_type = 'BW' THEN 1 END)::numeric) * 100
        ELSE NULL
      END, 2
    ) AS bw_nde_comp_100pct,

    -- SOCKET WELD (SW) 5% Tier Metrics
    COUNT(CASE
      WHEN fw.xray_percentage = 5.0 AND fw.date_welded IS NOT NULL AND fw.weld_type = 'SW'
      THEN 1
    END) AS sw_welds_5pct,
    COUNT(CASE
      WHEN fw.xray_percentage = 5.0 AND fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type = 'SW'
      THEN 1
    END) AS sw_nde_5pct,
    COUNT(CASE
      WHEN fw.xray_percentage = 5.0 AND fw.date_welded IS NOT NULL AND fw.nde_result = 'FAIL' AND fw.nde_type = 'RT' AND fw.weld_type = 'SW'
      THEN 1
    END) AS sw_reject_5pct,

    -- SOCKET WELD (SW) 10% Tier Metrics
    COUNT(CASE
      WHEN fw.xray_percentage = 10.0 AND fw.date_welded IS NOT NULL AND fw.weld_type = 'SW'
      THEN 1
    END) AS sw_welds_10pct,
    COUNT(CASE
      WHEN fw.xray_percentage = 10.0 AND fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type = 'SW'
      THEN 1
    END) AS sw_nde_10pct,
    COUNT(CASE
      WHEN fw.xray_percentage = 10.0 AND fw.date_welded IS NOT NULL AND fw.nde_result = 'FAIL' AND fw.nde_type = 'RT' AND fw.weld_type = 'SW'
      THEN 1
    END) AS sw_reject_10pct,

    -- SOCKET WELD (SW) 100% Tier Metrics
    COUNT(CASE
      WHEN fw.xray_percentage = 100.0 AND fw.date_welded IS NOT NULL AND fw.weld_type = 'SW'
      THEN 1
    END) AS sw_welds_100pct,
    COUNT(CASE
      WHEN fw.xray_percentage = 100.0 AND fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type = 'SW'
      THEN 1
    END) AS sw_nde_100pct,
    COUNT(CASE
      WHEN fw.xray_percentage = 100.0 AND fw.date_welded IS NOT NULL AND fw.nde_result = 'FAIL' AND fw.nde_type = 'RT' AND fw.weld_type = 'SW'
      THEN 1
    END) AS sw_reject_100pct,

    -- SOCKET WELD (SW) Calculated Metrics
    ROUND(
      CASE
        WHEN COUNT(CASE WHEN fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type = 'SW' THEN 1 END) > 0 THEN
          (COUNT(CASE WHEN fw.date_welded IS NOT NULL AND fw.nde_result = 'FAIL' AND fw.nde_type = 'RT' AND fw.weld_type = 'SW' THEN 1 END)::numeric /
           COUNT(CASE WHEN fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type = 'SW' THEN 1 END)::numeric) * 100
        ELSE 0
      END, 2
    ) AS sw_reject_rate,
    ROUND(
      CASE
        WHEN COUNT(CASE WHEN fw.xray_percentage = 5.0 AND fw.date_welded IS NOT NULL AND fw.weld_type = 'SW' THEN 1 END) > 0 THEN
          (COUNT(CASE WHEN fw.xray_percentage = 5.0 AND fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type = 'SW' THEN 1 END)::numeric /
           COUNT(CASE WHEN fw.xray_percentage = 5.0 AND fw.date_welded IS NOT NULL AND fw.weld_type = 'SW' THEN 1 END)::numeric) * 100
        ELSE NULL
      END, 2
    ) AS sw_nde_comp_5pct,
    ROUND(
      CASE
        WHEN COUNT(CASE WHEN fw.xray_percentage = 10.0 AND fw.date_welded IS NOT NULL AND fw.weld_type = 'SW' THEN 1 END) > 0 THEN
          (COUNT(CASE WHEN fw.xray_percentage = 10.0 AND fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type = 'SW' THEN 1 END)::numeric /
           COUNT(CASE WHEN fw.xray_percentage = 10.0 AND fw.date_welded IS NOT NULL AND fw.weld_type = 'SW' THEN 1 END)::numeric) * 100
        ELSE NULL
      END, 2
    ) AS sw_nde_comp_10pct,
    ROUND(
      CASE
        WHEN COUNT(CASE WHEN fw.xray_percentage = 100.0 AND fw.date_welded IS NOT NULL AND fw.weld_type = 'SW' THEN 1 END) > 0 THEN
          (COUNT(CASE WHEN fw.xray_percentage = 100.0 AND fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type = 'SW' THEN 1 END)::numeric /
           COUNT(CASE WHEN fw.xray_percentage = 100.0 AND fw.date_welded IS NOT NULL AND fw.weld_type = 'SW' THEN 1 END)::numeric) * 100
        ELSE NULL
      END, 2
    ) AS sw_nde_comp_100pct,

    -- OVERALL TOTALS (BW + SW combined)
    COUNT(CASE
      WHEN fw.date_welded IS NOT NULL AND fw.weld_type IN ('BW', 'SW')
      THEN 1
    END) AS welds_total,
    COUNT(CASE
      WHEN fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type IN ('BW', 'SW')
      THEN 1
    END) AS nde_total,
    COUNT(CASE
      WHEN fw.date_welded IS NOT NULL AND fw.nde_result = 'FAIL' AND fw.nde_type = 'RT' AND fw.weld_type IN ('BW', 'SW')
      THEN 1
    END) AS reject_total,
    ROUND(
      CASE
        WHEN COUNT(CASE WHEN fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type IN ('BW', 'SW') THEN 1 END) > 0 THEN
          (COUNT(CASE WHEN fw.date_welded IS NOT NULL AND fw.nde_result = 'FAIL' AND fw.nde_type = 'RT' AND fw.weld_type IN ('BW', 'SW') THEN 1 END)::numeric /
           COUNT(CASE WHEN fw.date_welded IS NOT NULL AND fw.nde_result IS NOT NULL AND fw.nde_type = 'RT' AND fw.weld_type IN ('BW', 'SW') THEN 1 END)::numeric) * 100
        ELSE 0
      END, 2
    ) AS reject_rate

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
'Dynamic weld summary report by welder with separate BW and SW tier-grouped metrics.
Returns Butt Weld (BW) statistics, Socket Weld (SW) statistics, and combined overall totals.
Each section includes 5%, 10%, 100% x-ray tiers with NDE counts (RT type only) and rejection counts.
Supports filtering by date range, welders, and project dimensions (area, system, package).
Excludes Fillet Welds (FW) and Tack Welds (TW) from all statistics.';
