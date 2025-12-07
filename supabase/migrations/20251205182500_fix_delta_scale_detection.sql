-- Migration: Fix value scale detection in progress delta calculation
-- Feature: 033-timeline-report-filter
-- Issue: Previous migration incorrectly treated values <= 1 as boolean scale,
--        but partial milestones like "Fabricate" have values 1%, 2%, etc.
-- Fix: Check the milestone's is_partial flag to determine if it's a boolean milestone

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
  WITH milestone_events_in_range AS (
    SELECT
      me.id AS event_id,
      me.component_id,
      me.milestone_name,
      me.action,
      me.value,
      me.previous_value,
      c.component_type,
      c.project_id AS comp_project_id,
      COALESCE(c.budgeted_manhours, 0) AS budgeted_manhours,
      CASE p_dimension
        WHEN 'area' THEN c.area_id
        WHEN 'system' THEN c.system_id
        WHEN 'test_package' THEN c.test_package_id
      END AS dim_id
    FROM milestone_events me
    JOIN components c ON c.id = me.component_id
    WHERE c.project_id = p_project_id
      AND c.is_retired = false
      AND me.created_at >= p_start_date
      AND me.created_at < p_end_date
  ),
  categorized_events AS (
    SELECT
      mer.event_id,
      mer.component_id,
      mer.dim_id,
      mer.budgeted_manhours,
      mer.component_type,
      mer.milestone_name,
      get_milestone_standard_category(mer.component_type, mer.milestone_name) AS standard_category,
      -- Check if milestone is partial (allows 0-100) or boolean (0 or 100 only)
      COALESCE(
        (SELECT ppt.is_partial FROM project_progress_templates ppt
         WHERE ppt.project_id = mer.comp_project_id
           AND ppt.component_type = mer.component_type
           AND LOWER(ppt.milestone_name) = LOWER(mer.milestone_name)
         LIMIT 1),
        (SELECT (m.milestone->>'is_partial')::BOOLEAN
         FROM progress_templates pt,
              LATERAL jsonb_array_elements(pt.milestones_config) AS m(milestone)
         WHERE pt.component_type = mer.component_type
           AND pt.version = 1
           AND LOWER(m.milestone->>'name') = LOWER(mer.milestone_name)
         LIMIT 1),
        false
      ) AS is_partial_milestone,
      -- Values from event
      mer.value,
      mer.previous_value,
      -- Get milestone weight
      COALESCE(
        (SELECT ppt.weight FROM project_progress_templates ppt
         WHERE ppt.project_id = mer.comp_project_id
           AND ppt.component_type = mer.component_type
           AND LOWER(ppt.milestone_name) = LOWER(mer.milestone_name)
         LIMIT 1),
        (SELECT (m.milestone->>'weight')::NUMERIC
         FROM progress_templates pt,
              LATERAL jsonb_array_elements(pt.milestones_config) AS m(milestone)
         WHERE pt.component_type = mer.component_type
           AND pt.version = 1
           AND LOWER(m.milestone->>'name') = LOWER(mer.milestone_name)
         LIMIT 1),
        0
      ) AS milestone_weight
    FROM milestone_events_in_range mer
    WHERE mer.dim_id IS NOT NULL
  ),
  event_deltas AS (
    SELECT
      ce.event_id,
      ce.component_id,
      ce.dim_id,
      ce.standard_category,
      -- Calculate value change based on milestone type
      -- For boolean milestones: treat values <= 1 as 0/100 scale (old data)
      -- For partial milestones: values are already 0-100 scale
      CASE
        WHEN ce.is_partial_milestone THEN
          -- Partial milestone: values are 0-100 percentages
          COALESCE(ce.value, 0) - COALESCE(ce.previous_value, 0)
        WHEN COALESCE(ce.value, 0) <= 1 AND COALESCE(ce.previous_value, 0) <= 1 THEN
          -- Boolean milestone with old 0/1 scale: convert to 0/100
          (COALESCE(ce.value, 0) - COALESCE(ce.previous_value, 0)) * 100
        ELSE
          -- Boolean milestone with new 0/100 scale
          COALESCE(ce.value, 0) - COALESCE(ce.previous_value, 0)
      END AS value_change,
      ce.budgeted_manhours,
      ce.milestone_weight
    FROM categorized_events ce
    WHERE ce.standard_category IS NOT NULL
      AND ce.milestone_weight > 0
  ),
  calculated_deltas AS (
    SELECT
      ed.event_id,
      ed.component_id,
      ed.dim_id,
      ed.standard_category,
      -- delta_mh = (value_change / 100) * budgeted_manhours * (milestone_weight / 100)
      (ed.value_change / 100.0) * ed.budgeted_manhours * (ed.milestone_weight / 100.0) AS delta_mh
    FROM event_deltas ed
  ),
  dimension_totals AS (
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
    GROUP BY 1
    HAVING CASE p_dimension
      WHEN 'area' THEN c.area_id
      WHEN 'system' THEN c.system_id
      WHEN 'test_package' THEN c.test_package_id
    END IS NOT NULL
  ),
  dimension_deltas AS (
    SELECT
      cd.dim_id,
      COUNT(DISTINCT cd.component_id)::INT AS active_count,
      COALESCE(SUM(CASE WHEN cd.standard_category = 'receive' THEN cd.delta_mh ELSE 0 END), 0) AS d_receive_mh,
      COALESCE(SUM(CASE WHEN cd.standard_category = 'install' THEN cd.delta_mh ELSE 0 END), 0) AS d_install_mh,
      COALESCE(SUM(CASE WHEN cd.standard_category = 'punch' THEN cd.delta_mh ELSE 0 END), 0) AS d_punch_mh,
      COALESCE(SUM(CASE WHEN cd.standard_category = 'test' THEN cd.delta_mh ELSE 0 END), 0) AS d_test_mh,
      COALESCE(SUM(CASE WHEN cd.standard_category = 'restore' THEN cd.delta_mh ELSE 0 END), 0) AS d_restore_mh
    FROM calculated_deltas cd
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
    0::NUMERIC AS delta_received,
    0::NUMERIC AS delta_installed,
    0::NUMERIC AS delta_punch,
    0::NUMERIC AS delta_tested,
    0::NUMERIC AS delta_restored,
    CASE WHEN dt.total_mh_budget > 0
      THEN ROUND(((COALESCE(dd.d_receive_mh, 0) + COALESCE(dd.d_install_mh, 0) +
                   COALESCE(dd.d_punch_mh, 0) + COALESCE(dd.d_test_mh, 0) +
                   COALESCE(dd.d_restore_mh, 0)) / dt.total_mh_budget) * 100, 2)
      ELSE 0
    END AS delta_total,
    ROUND(dt.total_mh_budget, 2) AS mh_budget,
    ROUND(COALESCE(dd.d_receive_mh, 0), 2) AS delta_receive_mh_earned,
    ROUND(COALESCE(dd.d_install_mh, 0), 2) AS delta_install_mh_earned,
    ROUND(COALESCE(dd.d_punch_mh, 0), 2) AS delta_punch_mh_earned,
    ROUND(COALESCE(dd.d_test_mh, 0), 2) AS delta_test_mh_earned,
    ROUND(COALESCE(dd.d_restore_mh, 0), 2) AS delta_restore_mh_earned,
    ROUND(COALESCE(dd.d_receive_mh, 0) + COALESCE(dd.d_install_mh, 0) +
          COALESCE(dd.d_punch_mh, 0) + COALESCE(dd.d_test_mh, 0) +
          COALESCE(dd.d_restore_mh, 0), 2) AS delta_total_mh_earned,
    CASE WHEN dt.total_mh_budget > 0
      THEN ROUND(((COALESCE(dd.d_receive_mh, 0) + COALESCE(dd.d_install_mh, 0) +
                   COALESCE(dd.d_punch_mh, 0) + COALESCE(dd.d_test_mh, 0) +
                   COALESCE(dd.d_restore_mh, 0)) / dt.total_mh_budget) * 100, 2)
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
