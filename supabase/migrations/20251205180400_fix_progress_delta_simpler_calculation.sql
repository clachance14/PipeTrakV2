-- Migration: Simplify progress delta calculation
--
-- Issue: Previous approach used calculate_component_percent with reconstructed
--        milestones, but milestone_events.milestone_name sometimes doesn't match
--        current_milestones keys exactly (e.g., "Fit-Up" vs "Fit-up").
--
-- Solution: Simpler approach - if a component has NO events before the start date,
--           then ALL its current progress was earned during the period.
--           delta = current_earned (no start_earned subtraction needed)
--
-- This correctly handles:
-- 1. New projects where all progress happened in the period
-- 2. Components with milestone name mismatches
-- 3. Components with old 1/0 scale milestones

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
  WITH all_components AS (
    -- ALL non-retired components
    SELECT
      c.id,
      CASE p_dimension
        WHEN 'area' THEN c.area_id
        WHEN 'system' THEN c.system_id
        WHEN 'test_package' THEN c.test_package_id
      END AS dim_id,
      COALESCE(c.budgeted_manhours, 0) AS mh,
      COALESCE(c.percent_complete, 0) AS current_pct
    FROM components c
    WHERE c.project_id = p_project_id
      AND c.is_retired = false
  ),
  dimension_totals AS (
    -- Total budget per dimension (ALL components)
    SELECT
      ac.dim_id,
      SUM(ac.mh) AS total_mh_budget
    FROM all_components ac
    WHERE ac.dim_id IS NOT NULL
    GROUP BY ac.dim_id
  ),
  components_with_activity AS (
    -- Components that have milestone_events in the period
    SELECT DISTINCT ac.id, ac.dim_id, ac.mh, ac.current_pct
    FROM all_components ac
    WHERE EXISTS (
      SELECT 1 FROM milestone_events me
      WHERE me.component_id = ac.id
        AND me.created_at >= p_start_date
        AND me.created_at < p_end_date
    )
  ),
  component_delta AS (
    -- For each component with activity, calculate delta
    -- If no events before start date, all current progress is delta
    -- Otherwise, subtract progress that existed before the period
    SELECT
      cwa.id,
      cwa.dim_id,
      cwa.mh,
      cwa.current_pct,
      CASE
        -- No events before start date: all current progress is delta
        WHEN NOT EXISTS (
          SELECT 1 FROM milestone_events me
          WHERE me.component_id = cwa.id
            AND me.created_at < p_start_date
        ) THEN cwa.current_pct
        -- Has events before start date: need to calculate what % was before
        -- For simplicity, assume progress is proportional to events
        -- count(events in period) / count(all events) * current_pct
        ELSE (
          SELECT GREATEST(
            cwa.current_pct * (
              (SELECT COUNT(*) FROM milestone_events me
               WHERE me.component_id = cwa.id
                 AND me.created_at >= p_start_date
                 AND me.created_at < p_end_date)::NUMERIC /
              NULLIF((SELECT COUNT(*) FROM milestone_events me
                      WHERE me.component_id = cwa.id), 0)
            ),
            0
          )
        )
      END AS delta_pct
    FROM components_with_activity cwa
  ),
  dimension_deltas AS (
    -- Aggregate delta earned per dimension
    SELECT
      cd.dim_id,
      COUNT(cd.id)::INT AS active_count,
      SUM(cd.mh * cd.delta_pct / 100.0) AS delta_mh_earned
    FROM component_delta cd
    WHERE cd.dim_id IS NOT NULL
    GROUP BY cd.dim_id
  )
  SELECT
    dt.dim_id AS dimension_id,
    CASE p_dimension
      WHEN 'area' THEN a.name
      WHEN 'system' THEN s.name
      WHEN 'test_package' THEN tp.name
    END AS dimension_name,
    COALESCE(dd.active_count, 0) AS components_with_activity,
    -- Individual milestone deltas not tracked
    0::NUMERIC AS delta_received,
    0::NUMERIC AS delta_installed,
    0::NUMERIC AS delta_punch,
    0::NUMERIC AS delta_tested,
    0::NUMERIC AS delta_restored,
    -- Total delta percentage
    CASE WHEN dt.total_mh_budget > 0
      THEN ROUND((COALESCE(dd.delta_mh_earned, 0) / dt.total_mh_budget) * 100, 2)
      ELSE 0
    END AS delta_total,
    -- Manhour values
    ROUND(dt.total_mh_budget, 2) AS mh_budget,
    0::NUMERIC AS delta_receive_mh_earned,
    0::NUMERIC AS delta_install_mh_earned,
    0::NUMERIC AS delta_punch_mh_earned,
    0::NUMERIC AS delta_test_mh_earned,
    0::NUMERIC AS delta_restore_mh_earned,
    ROUND(COALESCE(dd.delta_mh_earned, 0), 2) AS delta_total_mh_earned,
    CASE WHEN dt.total_mh_budget > 0
      THEN ROUND((COALESCE(dd.delta_mh_earned, 0) / dt.total_mh_budget) * 100, 2)
      ELSE 0
    END AS delta_mh_pct_complete
  FROM dimension_totals dt
  LEFT JOIN dimension_deltas dd ON dd.dim_id = dt.dim_id
  LEFT JOIN areas a ON p_dimension = 'area' AND a.id = dt.dim_id
  LEFT JOIN systems s ON p_dimension = 'system' AND s.id = dt.dim_id
  LEFT JOIN test_packages tp ON p_dimension = 'test_package' AND tp.id = dt.dim_id
  WHERE dt.dim_id IS NOT NULL
  ORDER BY dimension_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_progress_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Calculate manhour-weighted progress delta within a date range.
Uses simpler approach: if no events before start date, all current progress is delta.
Otherwise, prorates based on event count ratio.
Feature: 033-timeline-report-filter';
