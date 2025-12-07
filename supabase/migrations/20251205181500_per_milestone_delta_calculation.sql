-- Migration: Calculate per-milestone manhour delta in progress delta report
-- Feature: 033-timeline-report-filter
-- Purpose: Replace hardcoded zeros with actual per-milestone delta calculations
--
-- Approach:
-- 1. Create helper function to map milestone names to standard categories
-- 2. Process milestone_events in date range
-- 3. Look up individual milestone weights from project_progress_templates (with system fallback)
-- 4. Calculate delta_mh_earned per category: (value_change / 100) * budgeted_manhours * (milestone_weight / 100)
-- 5. Aggregate by dimension

-- Step 1: Create helper function to map milestone names to standard categories
CREATE OR REPLACE FUNCTION get_milestone_standard_category(
  p_component_type TEXT,
  p_milestone_name TEXT
) RETURNS TEXT AS $$
BEGIN
  CASE LOWER(p_milestone_name)
    -- RECEIVE category
    WHEN 'receive' THEN RETURN 'receive';

    -- INSTALL category (varies by component type)
    WHEN 'fit-up' THEN RETURN 'install';
    WHEN 'weld made' THEN RETURN 'install';
    WHEN 'weld complete' THEN RETURN 'install';
    WHEN 'install' THEN RETURN 'install';
    WHEN 'erect' THEN RETURN 'install';
    WHEN 'connect' THEN RETURN 'install';
    WHEN 'fabricate' THEN RETURN 'install';
    WHEN 'support' THEN RETURN 'install';

    -- PUNCH category
    WHEN 'punch complete' THEN RETURN 'punch';
    WHEN 'repair complete' THEN RETURN 'punch';

    -- TEST category
    WHEN 'hydrotest' THEN RETURN 'test';
    WHEN 'nde final' THEN RETURN 'test';
    WHEN 'test' THEN
      -- 'Test' milestone only applies to valve and instrument
      IF p_component_type IN ('valve', 'instrument') THEN
        RETURN 'test';
      END IF;
      RETURN NULL;

    -- RESTORE category
    WHEN 'restore' THEN RETURN 'restore';
    WHEN 'insulate' THEN RETURN 'restore';
    WHEN 'paint' THEN RETURN 'restore';

    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_milestone_standard_category(TEXT, TEXT) IS
'Maps individual milestone names to standard categories (receive, install, punch, test, restore).
Used for grouping milestone deltas in reports. Returns NULL for unmapped milestones.';


-- Step 2: Update the progress delta RPC to calculate per-milestone deltas
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
    -- Get all milestone events in the date range with component info
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
    -- Map milestone names to standard categories and look up weights
    SELECT
      mer.event_id,
      mer.component_id,
      mer.dim_id,
      mer.budgeted_manhours,
      mer.component_type,
      mer.milestone_name,
      -- Get the standard category for this milestone
      get_milestone_standard_category(mer.component_type, mer.milestone_name) AS standard_category,
      -- Calculate value change (handle old 1/0 scale)
      CASE
        -- Old 1/0 scale: if both values are <= 1, treat as boolean (0 or 100)
        WHEN COALESCE(mer.value, 0) <= 1 AND COALESCE(mer.previous_value, 0) <= 1 THEN
          (COALESCE(mer.value, 0) - COALESCE(mer.previous_value, 0)) * 100
        -- Normal 0-100 scale
        ELSE
          COALESCE(mer.value, 0) - COALESCE(mer.previous_value, 0)
      END AS value_change,
      -- Get individual milestone weight from project templates (with system fallback)
      COALESCE(
        -- First try project-specific templates
        (SELECT ppt.weight
         FROM project_progress_templates ppt
         WHERE ppt.project_id = mer.comp_project_id
           AND ppt.component_type = mer.component_type
           AND LOWER(ppt.milestone_name) = LOWER(mer.milestone_name)
         LIMIT 1),
        -- Fall back to system templates (JSONB format)
        (SELECT (m.milestone->>'weight')::NUMERIC
         FROM progress_templates pt,
              LATERAL jsonb_array_elements(pt.milestones_config) AS m(milestone)
         WHERE pt.component_type = mer.component_type
           AND pt.version = 1
           AND LOWER(m.milestone->>'name') = LOWER(mer.milestone_name)
         LIMIT 1),
        -- Default to 0 if no weight found
        0
      ) AS milestone_weight
    FROM milestone_events_in_range mer
    WHERE mer.dim_id IS NOT NULL
  ),
  event_deltas AS (
    -- Calculate delta MH for each event
    SELECT
      ce.event_id,
      ce.component_id,
      ce.dim_id,
      ce.standard_category,
      -- delta_mh = (value_change / 100) * budgeted_manhours * (milestone_weight / 100)
      (ce.value_change / 100.0) * ce.budgeted_manhours * (ce.milestone_weight / 100.0) AS delta_mh
    FROM categorized_events ce
    WHERE ce.standard_category IS NOT NULL
      AND ce.milestone_weight > 0
  ),
  dimension_totals AS (
    -- Total manhour budget per dimension (ALL non-retired components)
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
    -- Aggregate per-category manhour deltas by dimension
    SELECT
      ed.dim_id,
      COUNT(DISTINCT ed.component_id)::INT AS active_count,
      -- Per-category delta MH earned
      COALESCE(SUM(CASE WHEN ed.standard_category = 'receive' THEN ed.delta_mh ELSE 0 END), 0) AS d_receive_mh,
      COALESCE(SUM(CASE WHEN ed.standard_category = 'install' THEN ed.delta_mh ELSE 0 END), 0) AS d_install_mh,
      COALESCE(SUM(CASE WHEN ed.standard_category = 'punch' THEN ed.delta_mh ELSE 0 END), 0) AS d_punch_mh,
      COALESCE(SUM(CASE WHEN ed.standard_category = 'test' THEN ed.delta_mh ELSE 0 END), 0) AS d_test_mh,
      COALESCE(SUM(CASE WHEN ed.standard_category = 'restore' THEN ed.delta_mh ELSE 0 END), 0) AS d_restore_mh
    FROM event_deltas ed
    GROUP BY ed.dim_id
  )
  SELECT
    dt.dim_id AS dimension_id,
    CASE p_dimension
      WHEN 'area' THEN a.name
      WHEN 'system' THEN s.name
      WHEN 'test_package' THEN tp.name
    END AS dimension_name,
    COALESCE(dd.active_count, 0) AS components_with_activity,
    -- Count-based deltas (not calculated - return 0 for backward compatibility)
    0::NUMERIC AS delta_received,
    0::NUMERIC AS delta_installed,
    0::NUMERIC AS delta_punch,
    0::NUMERIC AS delta_tested,
    0::NUMERIC AS delta_restored,
    -- Total delta percentage = total delta MH / total MH budget * 100
    CASE WHEN dt.total_mh_budget > 0
      THEN ROUND(((COALESCE(dd.d_receive_mh, 0) + COALESCE(dd.d_install_mh, 0) +
                   COALESCE(dd.d_punch_mh, 0) + COALESCE(dd.d_test_mh, 0) +
                   COALESCE(dd.d_restore_mh, 0)) / dt.total_mh_budget) * 100, 2)
      ELSE 0
    END AS delta_total,
    -- Manhour values
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

COMMENT ON FUNCTION get_progress_delta_by_dimension(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Calculate per-milestone manhour delta within a date range, grouped by area/system/test_package.
Each milestone event contributes: (value_change / 100) * budgeted_manhours * (milestone_weight / 100)
Milestone weights are looked up from project_progress_templates (with system fallback).
Feature: 033-timeline-report-filter';
