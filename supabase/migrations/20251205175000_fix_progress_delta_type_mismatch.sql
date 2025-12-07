-- Migration: Simplify progress delta calculation
--
-- Issue: Previous RPC didn't correctly calculate delta using component's actual
--        percent_complete and budgeted_manhours with custom milestone weights.
--
-- Solution: For each component with activity in the period:
--   1. Get current percent_complete (already uses custom weights via trigger)
--   2. Reconstruct percent_complete at start by subtracting milestone changes
--   3. Delta = current - start (in percent_complete scale)
--   4. Earned MH delta = budgeted_manhours * delta_pct / 100
--
-- Key insight: percent_complete is recalculated by trigger using calculate_component_percent()
-- which respects project_progress_templates. So we just need to track how percent_complete
-- changed, not recalculate weights ourselves.

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
    -- ALL non-retired, non-field-weld components
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
      AND c.component_type != 'field_weld'
  ),
  dimension_totals AS (
    -- Total budget and current earned per dimension (ALL components)
    SELECT
      ac.dim_id,
      SUM(ac.mh) AS total_mh_budget,
      SUM(ac.mh * ac.current_pct / 100.0) AS current_mh_earned
    FROM all_components ac
    WHERE ac.dim_id IS NOT NULL
    GROUP BY ac.dim_id
  ),
  components_with_activity AS (
    -- Components that have milestone_events in the period
    SELECT DISTINCT c.id, ac.dim_id, ac.mh, ac.current_pct
    FROM all_components ac
    JOIN components c ON c.id = ac.id
    WHERE EXISTS (
      SELECT 1 FROM milestone_events me
      WHERE me.component_id = c.id
        AND me.created_at >= p_start_date
        AND me.created_at < p_end_date
    )
  ),
  component_start_pct AS (
    -- For components with activity, calculate their percent_complete at period start
    -- by reconstructing current_milestones state before the period's changes
    SELECT
      cwa.id,
      cwa.dim_id,
      cwa.mh,
      cwa.current_pct,
      -- Recalculate percent_complete using milestones minus period changes
      calculate_component_percent(
        c.progress_template_id,
        -- Reconstruct milestones at start: current - changes during period
        (
          SELECT jsonb_object_agg(
            key,
            -- Always return numeric, convert back to jsonb-compatible format
            to_jsonb(GREATEST(
              COALESCE((c.current_milestones->>key)::numeric, 0) -
              COALESCE((SELECT SUM(COALESCE(me.value, 0) - COALESCE(me.previous_value, 0))
                        FROM milestone_events me
                        WHERE me.component_id = cwa.id
                          AND me.milestone_name = key
                          AND me.created_at >= p_start_date
                          AND me.created_at < p_end_date), 0),
              0
            ))
          )
          FROM jsonb_each(c.current_milestones)
        ),
        c.project_id,
        c.component_type
      ) AS start_pct
    FROM components_with_activity cwa
    JOIN components c ON c.id = cwa.id
  ),
  dimension_deltas AS (
    -- Aggregate delta earned per dimension
    SELECT
      csp.dim_id,
      COUNT(csp.id)::INT AS active_count,
      SUM(csp.mh * (csp.current_pct - COALESCE(csp.start_pct, 0)) / 100.0) AS delta_mh_earned
    FROM component_start_pct csp
    WHERE csp.dim_id IS NOT NULL
    GROUP BY csp.dim_id
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
Uses calculate_component_percent to reconstruct percent_complete at period start,
ensuring custom milestone weights from project_progress_templates are respected.
Delta = current_earned_mh - start_earned_mh
Feature: 033-timeline-report-filter';
