-- Migration: Fix progress delta to use component percent_complete
--
-- Issue: Previous delta RPC used hardcoded milestone weights that don't match
--        project's custom milestone weights. This caused delta values to differ
--        from All Time report values for projects <30 days old.
--
-- Fix: Use component's actual percent_complete and budgeted_manhours, comparing
--      current values to values before the period started. This ensures delta
--      calculations match the All Time report exactly.
--
-- Approach:
--   1. For each component with activity in the period, calculate:
--      - current_earned = budgeted_manhours * percent_complete / 100
--      - start_earned = budgeted_manhours * percent_complete_at_start / 100
--      - delta_earned = current_earned - start_earned
--   2. Get percent_complete_at_start by reconstructing from milestone_events
--   3. Aggregate by dimension

CREATE OR REPLACE FUNCTION get_progress_delta_by_dimension(
  p_project_id UUID,
  p_dimension TEXT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS TABLE (
  dimension_id UUID,
  dimension_name TEXT,
  components_with_activity INT,
  delta_received NUMERIC,
  delta_installed NUMERIC,
  delta_punch NUMERIC,
  delta_tested NUMERIC,
  delta_restored NUMERIC,
  delta_total NUMERIC,
  mh_budget NUMERIC,
  delta_receive_mh_earned NUMERIC,
  delta_install_mh_earned NUMERIC,
  delta_punch_mh_earned NUMERIC,
  delta_test_mh_earned NUMERIC,
  delta_restore_mh_earned NUMERIC,
  delta_total_mh_earned NUMERIC,
  delta_mh_pct_complete NUMERIC
) AS $$
BEGIN
  IF p_dimension NOT IN ('area', 'system', 'test_package') THEN
    RAISE EXCEPTION 'Invalid dimension: %. Must be area, system, or test_package', p_dimension;
  END IF;

  RETURN QUERY
  WITH components_with_events AS (
    -- Get component IDs that have milestone events in the period
    SELECT DISTINCT me.component_id
    FROM milestone_events me
    JOIN components c ON c.id = me.component_id
    WHERE c.project_id = p_project_id
      AND c.is_retired = false
      AND c.component_type != 'field_weld'
      AND me.created_at >= p_start_date
      AND me.created_at < p_end_date
  ),
  component_deltas AS (
    -- For each component with activity, calculate manhour delta
    SELECT
      c.id AS component_id,
      CASE p_dimension
        WHEN 'area' THEN c.area_id
        WHEN 'system' THEN c.system_id
        WHEN 'test_package' THEN c.test_package_id
      END AS dim_id,
      COALESCE(c.budgeted_manhours, 0) AS mh_budget,
      -- Current earned manhours
      COALESCE(c.budgeted_manhours, 0) * COALESCE(c.percent_complete, 0) / 100.0 AS current_mh_earned,
      -- Earned manhours at start of period (percent_complete - sum of changes during period)
      COALESCE(c.budgeted_manhours, 0) * GREATEST(
        COALESCE(c.percent_complete, 0) - COALESCE(
          (SELECT SUM(
            CASE
              WHEN me2.value IS NOT NULL AND me2.previous_value IS NOT NULL
              THEN me2.value - me2.previous_value
              WHEN me2.value IS NOT NULL
              THEN me2.value
              ELSE 0
            END
          )
          FROM milestone_events me2
          WHERE me2.component_id = c.id
            AND me2.created_at >= p_start_date
            AND me2.created_at < p_end_date
          ), 0
        ),
        0
      ) / 100.0 AS start_mh_earned
    FROM components c
    JOIN components_with_events cwe ON cwe.component_id = c.id
    WHERE c.project_id = p_project_id
      AND c.is_retired = false
      AND c.component_type != 'field_weld'
  ),
  dimension_totals AS (
    -- Aggregate by dimension
    SELECT
      cd.dim_id,
      COUNT(DISTINCT cd.component_id)::INT AS active_components,
      SUM(cd.mh_budget) AS total_mh_budget,
      SUM(cd.current_mh_earned - cd.start_mh_earned) AS delta_mh_earned
    FROM component_deltas cd
    WHERE cd.dim_id IS NOT NULL
    GROUP BY cd.dim_id
  ),
  all_components_budget AS (
    -- Get total manhour budget per dimension (ALL components, not just active)
    SELECT
      CASE p_dimension
        WHEN 'area' THEN c.area_id
        WHEN 'system' THEN c.system_id
        WHEN 'test_package' THEN c.test_package_id
      END AS dim_id,
      SUM(COALESCE(c.budgeted_manhours, 0)) AS total_mh_budget
    FROM components c
    WHERE c.project_id = p_project_id
      AND c.is_retired = false
      AND c.component_type != 'field_weld'
    GROUP BY 1
  )
  SELECT
    dt.dim_id AS dimension_id,
    CASE p_dimension
      WHEN 'area' THEN a.name
      WHEN 'system' THEN s.name
      WHEN 'test_package' THEN tp.name
    END AS dimension_name,
    dt.active_components AS components_with_activity,
    -- Individual milestone deltas not available with this approach, set to 0
    0::NUMERIC AS delta_received,
    0::NUMERIC AS delta_installed,
    0::NUMERIC AS delta_punch,
    0::NUMERIC AS delta_tested,
    0::NUMERIC AS delta_restored,
    -- Total delta as percentage of ALL components' budget
    CASE WHEN acb.total_mh_budget > 0
      THEN ROUND((dt.delta_mh_earned / acb.total_mh_budget) * 100, 2)
      ELSE 0
    END AS delta_total,
    -- Manhour columns
    acb.total_mh_budget AS mh_budget,
    0::NUMERIC AS delta_receive_mh_earned,
    0::NUMERIC AS delta_install_mh_earned,
    0::NUMERIC AS delta_punch_mh_earned,
    0::NUMERIC AS delta_test_mh_earned,
    0::NUMERIC AS delta_restore_mh_earned,
    ROUND(dt.delta_mh_earned, 2) AS delta_total_mh_earned,
    CASE WHEN acb.total_mh_budget > 0
      THEN ROUND((dt.delta_mh_earned / acb.total_mh_budget) * 100, 2)
      ELSE 0
    END AS delta_mh_pct_complete
  FROM dimension_totals dt
  JOIN all_components_budget acb ON acb.dim_id = dt.dim_id
  LEFT JOIN areas a ON p_dimension = 'area' AND a.id = dt.dim_id
  LEFT JOIN systems s ON p_dimension = 'system' AND s.id = dt.dim_id
  LEFT JOIN test_packages tp ON p_dimension = 'test_package' AND tp.id = dt.dim_id
  WHERE dt.dim_id IS NOT NULL
    AND dt.active_components > 0
  ORDER BY dimension_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_progress_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Calculate manhour-weighted progress delta within a date range.
Uses component percent_complete and budgeted_manhours to match All Time report calculations.
Delta = (current_earned_mh - start_earned_mh) / total_mh_budget * 100
Feature: 033-timeline-report-filter';
