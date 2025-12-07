-- Migration: Fix progress delta to apply milestone weights correctly
-- Feature: 033-timeline-report-filter
--
-- Issue: Raw milestone changes (0->100) need to be weighted by milestone contribution
-- Example: "Receive" for a spool is worth 5% of overall progress
-- So going from 0->100 on Receive = +5% contribution, not +100%
--
-- Using the standard milestone weights from calculate_earned_milestone_value:
-- - Spool: Receive 5%, Erect+Connect 80%, Punch 5%, Hydrotest 5%, Restore 5%
-- - Others: Receive 10%, Install 60%, Test/Punch 10%, Test 10%, Restore 10%

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
  WITH event_changes AS (
    -- Get milestone changes during the period, with component type for weighting
    SELECT
      me.component_id,
      me.milestone_name,
      c.component_type,
      CASE p_dimension
        WHEN 'area' THEN c.area_id
        WHEN 'system' THEN c.system_id
        WHEN 'test_package' THEN c.test_package_id
      END AS dim_id,
      -- Raw change (0-100 scale)
      GREATEST(COALESCE(me.value, 0) - COALESCE(me.previous_value, 0), 0) AS raw_change
    FROM milestone_events me
    JOIN components c ON c.id = me.component_id
    WHERE c.project_id = p_project_id
      AND c.is_retired = false
      AND c.component_type != 'field_weld'
      AND me.created_at >= p_start_date
      AND me.created_at < p_end_date
  ),
  weighted_changes AS (
    -- Apply milestone weights to convert raw changes to % complete contribution
    -- Milestone weights based on component type (matching calculate_earned_milestone_value)
    SELECT
      ec.dim_id,
      ec.component_id,
      -- RECEIVED category
      CASE
        WHEN ec.milestone_name = 'Receive' AND ec.component_type = 'spool' THEN ec.raw_change * 0.05
        WHEN ec.milestone_name = 'Receive' THEN ec.raw_change * 0.10
        WHEN ec.milestone_name = 'Fit-Up' THEN ec.raw_change * 0.10
        ELSE 0
      END AS weighted_received,
      -- INSTALLED category
      CASE
        WHEN ec.milestone_name IN ('Erect', 'Connect') AND ec.component_type = 'spool' THEN ec.raw_change * 0.40
        WHEN ec.milestone_name = 'Install' AND ec.component_type NOT IN ('spool', 'field_weld') THEN ec.raw_change * 0.60
        WHEN ec.milestone_name = 'Weld Made' AND ec.component_type = 'field_weld' THEN ec.raw_change * 0.60
        WHEN ec.milestone_name IN ('Fabricate', 'Support') AND ec.component_type = 'threaded_pipe' THEN ec.raw_change * 0.16
        ELSE 0
      END AS weighted_installed,
      -- PUNCH category
      CASE
        WHEN ec.milestone_name = 'Punch Complete' AND ec.component_type = 'spool' THEN ec.raw_change * 0.05
        WHEN ec.milestone_name IN ('Punch Complete', 'Repair Complete', 'Test Complete') THEN ec.raw_change * 0.10
        ELSE 0
      END AS weighted_punch,
      -- TESTED category
      CASE
        WHEN ec.milestone_name = 'Hydrotest' AND ec.component_type = 'spool' THEN ec.raw_change * 0.05
        WHEN ec.milestone_name IN ('Test', 'NDE Final') THEN ec.raw_change * 0.10
        ELSE 0
      END AS weighted_tested,
      -- RESTORED category
      CASE
        WHEN ec.milestone_name = 'Restore' AND ec.component_type = 'spool' THEN ec.raw_change * 0.05
        WHEN ec.milestone_name IN ('Restore', 'Insulate', 'Paint') THEN ec.raw_change * 0.10
        ELSE 0
      END AS weighted_restored
    FROM event_changes ec
  ),
  dimension_aggregates AS (
    -- Aggregate by dimension
    SELECT
      wc.dim_id,
      COUNT(DISTINCT wc.component_id)::INT AS active_components,
      -- Sum of weighted changes (already in % scale)
      SUM(wc.weighted_received) AS total_delta_received,
      SUM(wc.weighted_installed) AS total_delta_installed,
      SUM(wc.weighted_punch) AS total_delta_punch,
      SUM(wc.weighted_tested) AS total_delta_tested,
      SUM(wc.weighted_restored) AS total_delta_restored
    FROM weighted_changes wc
    WHERE wc.dim_id IS NOT NULL
    GROUP BY wc.dim_id
  ),
  dimension_budget AS (
    -- Get total component count per dimension for calculating average delta
    SELECT
      CASE p_dimension
        WHEN 'area' THEN c.area_id
        WHEN 'system' THEN c.system_id
        WHEN 'test_package' THEN c.test_package_id
      END AS dim_id,
      COUNT(c.id)::INT AS total_components
    FROM components c
    WHERE c.project_id = p_project_id
      AND c.is_retired = false
      AND c.component_type != 'field_weld'
    GROUP BY 1
  )
  SELECT
    da.dim_id AS dimension_id,
    CASE p_dimension
      WHEN 'area' THEN a.name
      WHEN 'system' THEN s.name
      WHEN 'test_package' THEN tp.name
    END AS dimension_name,
    da.active_components AS components_with_activity,
    -- Delta per milestone (average across ALL components in dimension, not just active)
    ROUND(da.total_delta_received / NULLIF(db.total_components, 0), 2) AS delta_received,
    ROUND(da.total_delta_installed / NULLIF(db.total_components, 0), 2) AS delta_installed,
    ROUND(da.total_delta_punch / NULLIF(db.total_components, 0), 2) AS delta_punch,
    ROUND(da.total_delta_tested / NULLIF(db.total_components, 0), 2) AS delta_tested,
    ROUND(da.total_delta_restored / NULLIF(db.total_components, 0), 2) AS delta_restored,
    -- Total delta (sum of all milestone deltas)
    ROUND((da.total_delta_received + da.total_delta_installed + da.total_delta_punch +
           da.total_delta_tested + da.total_delta_restored) / NULLIF(db.total_components, 0), 2) AS delta_total,
    -- MH columns (using component count)
    db.total_components::NUMERIC AS mh_budget,
    ROUND(da.total_delta_received / NULLIF(db.total_components, 0), 2) AS delta_receive_mh_earned,
    ROUND(da.total_delta_installed / NULLIF(db.total_components, 0), 2) AS delta_install_mh_earned,
    ROUND(da.total_delta_punch / NULLIF(db.total_components, 0), 2) AS delta_punch_mh_earned,
    ROUND(da.total_delta_tested / NULLIF(db.total_components, 0), 2) AS delta_test_mh_earned,
    ROUND(da.total_delta_restored / NULLIF(db.total_components, 0), 2) AS delta_restore_mh_earned,
    ROUND((da.total_delta_received + da.total_delta_installed + da.total_delta_punch +
           da.total_delta_tested + da.total_delta_restored) / NULLIF(db.total_components, 0), 2) AS delta_total_mh_earned,
    ROUND((da.total_delta_received + da.total_delta_installed + da.total_delta_punch +
           da.total_delta_tested + da.total_delta_restored) / NULLIF(db.total_components, 0), 2) AS delta_mh_pct_complete
  FROM dimension_aggregates da
  JOIN dimension_budget db ON db.dim_id = da.dim_id
  LEFT JOIN areas a ON p_dimension = 'area' AND a.id = da.dim_id
  LEFT JOIN systems s ON p_dimension = 'system' AND s.id = da.dim_id
  LEFT JOIN test_packages tp ON p_dimension = 'test_package' AND tp.id = da.dim_id
  WHERE da.dim_id IS NOT NULL
    AND da.active_components > 0
  ORDER BY dimension_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_progress_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Calculate weighted progress delta per milestone within a date range.
Applies milestone weights to convert raw changes to actual % complete contribution.
Example: Spool "Receive" 0->100 = +5% (not +100%) because Receive weight is 5%.
Feature: 033-timeline-report-filter';
