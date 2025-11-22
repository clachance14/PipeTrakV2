-- Migration: Add Count Columns to Field Weld Progress Views
--
-- Purpose: Add fitup_count and weld_complete_count columns to field weld views
--          to display absolute counts instead of percentages in the UI
--
-- Changes:
--   - Add fitup_count column (COUNT of welds with 'Fit-up' milestone complete)
--   - Add weld_complete_count column (COUNT of welds with 'Weld Complete' milestone)
--   - Keep existing percentage columns for backwards compatibility
--   - Update create_field_weld_snapshot RPC to include new count fields
--
-- Affected views:
--   - vw_field_weld_progress_by_area
--   - vw_field_weld_progress_by_system
--   - vw_field_weld_progress_by_test_package
--
-- Note: vw_field_weld_progress_by_welder excluded (handled separately)

-- ============================================================================
-- VIEW 1: Field Weld Progress by Area (ADD count columns)
-- ============================================================================

CREATE OR REPLACE VIEW vw_field_weld_progress_by_area AS

-- Part 1: Field welds WITH area assignment
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.project_id,

  -- Budget metrics
  COUNT(fw.id) AS total_welds,
  COUNT(CASE WHEN fw.status = 'active' THEN 1 END) AS active_count,
  COUNT(CASE WHEN fw.status = 'accepted' THEN 1 END) AS accepted_count,
  COUNT(CASE WHEN fw.status = 'rejected' THEN 1 END) AS rejected_count,

  -- Milestone percentages
  ROUND(AVG(
    CASE
      WHEN (c.current_milestones->>'Fit-up')::numeric = 1 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_fitup,
  ROUND(AVG(
    CASE
      WHEN (c.current_milestones->>'Weld Complete')::numeric = 1 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_weld_complete,
  0::numeric AS pct_accepted,

  -- NDE metrics
  COUNT(CASE WHEN fw.nde_required THEN 1 END) AS nde_required_count,
  COUNT(CASE WHEN fw.nde_result = 'PASS' THEN 1 END) AS nde_pass_count,
  COUNT(CASE WHEN fw.nde_result = 'FAIL' THEN 1 END) AS nde_fail_count,
  COUNT(CASE WHEN fw.nde_result = 'PENDING' THEN 1 END) AS nde_pending_count,
  ROUND(
    CASE
      WHEN COUNT(CASE WHEN fw.nde_result IN ('PASS', 'FAIL') THEN 1 END) > 0 THEN
        (COUNT(CASE WHEN fw.nde_result = 'PASS' THEN 1 END)::numeric /
         COUNT(CASE WHEN fw.nde_result IN ('PASS', 'FAIL') THEN 1 END)::numeric) * 100
      ELSE NULL
    END, 0
  ) AS nde_pass_rate,

  -- Repair metrics
  COUNT(CASE WHEN fw.is_repair THEN 1 END) AS repair_count,
  ROUND(
    CASE
      WHEN COUNT(fw.id) > 0 THEN
        (COUNT(CASE WHEN fw.is_repair THEN 1 END)::numeric / COUNT(fw.id)::numeric) * 100
      ELSE 0
    END, 0
  ) AS repair_rate,

  -- Time metrics (in days)
  ROUND(
    AVG(
      CASE
        WHEN fw.date_welded IS NOT NULL AND fw.nde_date IS NOT NULL THEN
          (fw.nde_date - fw.date_welded)::numeric
        ELSE NULL
      END
    )::numeric, 1
  ) AS avg_days_to_nde,
  ROUND(
    AVG(
      CASE
        WHEN fw.date_welded IS NOT NULL AND fw.status = 'accepted' AND fw.nde_date IS NOT NULL THEN
          (fw.nde_date - fw.date_welded)::numeric
        ELSE NULL
      END
    )::numeric, 1
  ) AS avg_days_to_acceptance,

  -- Overall completion
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total,

  -- NEW: Milestone counts (MUST be at end for CREATE OR REPLACE VIEW)
  COUNT(CASE WHEN (c.current_milestones->>'Fit-up')::numeric = 1 THEN 1 END) AS fitup_count,
  COUNT(CASE WHEN (c.current_milestones->>'Weld Complete')::numeric = 1 THEN 1 END) AS weld_complete_count

FROM areas a
INNER JOIN components c ON c.area_id = a.id AND c.component_type = 'field_weld'
INNER JOIN field_welds fw ON fw.component_id = c.id
WHERE c.is_retired = false
GROUP BY a.id, a.name, a.project_id

UNION ALL

-- Part 2: Field welds WITHOUT area assignment (Unassigned)
SELECT
  NULL AS area_id,
  'Unassigned' AS area_name,
  c.project_id,

  -- Budget metrics
  COUNT(fw.id) AS total_welds,
  COUNT(CASE WHEN fw.status = 'active' THEN 1 END) AS active_count,
  COUNT(CASE WHEN fw.status = 'accepted' THEN 1 END) AS accepted_count,
  COUNT(CASE WHEN fw.status = 'rejected' THEN 1 END) AS rejected_count,

  -- Milestone percentages
  ROUND(AVG(
    CASE
      WHEN (c.current_milestones->>'Fit-up')::numeric = 1 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_fitup,
  ROUND(AVG(
    CASE
      WHEN (c.current_milestones->>'Weld Complete')::numeric = 1 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_weld_complete,
  0::numeric AS pct_accepted,

  -- NDE metrics
  COUNT(CASE WHEN fw.nde_required THEN 1 END) AS nde_required_count,
  COUNT(CASE WHEN fw.nde_result = 'PASS' THEN 1 END) AS nde_pass_count,
  COUNT(CASE WHEN fw.nde_result = 'FAIL' THEN 1 END) AS nde_fail_count,
  COUNT(CASE WHEN fw.nde_result = 'PENDING' THEN 1 END) AS nde_pending_count,
  ROUND(
    CASE
      WHEN COUNT(CASE WHEN fw.nde_result IN ('PASS', 'FAIL') THEN 1 END) > 0 THEN
        (COUNT(CASE WHEN fw.nde_result = 'PASS' THEN 1 END)::numeric /
         COUNT(CASE WHEN fw.nde_result IN ('PASS', 'FAIL') THEN 1 END)::numeric) * 100
      ELSE NULL
    END, 0
  ) AS nde_pass_rate,

  -- Repair metrics
  COUNT(CASE WHEN fw.is_repair THEN 1 END) AS repair_count,
  ROUND(
    CASE
      WHEN COUNT(fw.id) > 0 THEN
        (COUNT(CASE WHEN fw.is_repair THEN 1 END)::numeric / COUNT(fw.id)::numeric) * 100
      ELSE 0
    END, 0
  ) AS repair_rate,

  -- Time metrics (in days)
  ROUND(
    AVG(
      CASE
        WHEN fw.date_welded IS NOT NULL AND fw.nde_date IS NOT NULL THEN
          (fw.nde_date - fw.date_welded)::numeric
        ELSE NULL
      END
    )::numeric, 1
  ) AS avg_days_to_nde,
  ROUND(
    AVG(
      CASE
        WHEN fw.date_welded IS NOT NULL AND fw.status = 'accepted' AND fw.nde_date IS NOT NULL THEN
          (fw.nde_date - fw.date_welded)::numeric
        ELSE NULL
      END
    )::numeric, 1
  ) AS avg_days_to_acceptance,

  -- Overall completion
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total,

  -- NEW: Milestone counts (MUST be at end for CREATE OR REPLACE VIEW)
  COUNT(CASE WHEN (c.current_milestones->>'Fit-up')::numeric = 1 THEN 1 END) AS fitup_count,
  COUNT(CASE WHEN (c.current_milestones->>'Weld Complete')::numeric = 1 THEN 1 END) AS weld_complete_count

FROM field_welds fw
INNER JOIN components c ON c.id = fw.component_id
WHERE c.is_retired = false
  AND c.component_type = 'field_weld'
  AND c.area_id IS NULL
GROUP BY c.project_id;

-- ============================================================================
-- VIEW 2: Field Weld Progress by System (ADD count columns)
-- ============================================================================

CREATE OR REPLACE VIEW vw_field_weld_progress_by_system AS

-- Part 1: Field welds WITH system assignment
SELECT
  s.id AS system_id,
  s.name AS system_name,
  s.project_id,

  -- Budget metrics
  COUNT(fw.id) AS total_welds,
  COUNT(CASE WHEN fw.status = 'active' THEN 1 END) AS active_count,
  COUNT(CASE WHEN fw.status = 'accepted' THEN 1 END) AS accepted_count,
  COUNT(CASE WHEN fw.status = 'rejected' THEN 1 END) AS rejected_count,

  -- Milestone percentages
  ROUND(AVG(
    CASE
      WHEN (c.current_milestones->>'Fit-up')::numeric = 1 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_fitup,
  ROUND(AVG(
    CASE
      WHEN (c.current_milestones->>'Weld Complete')::numeric = 1 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_weld_complete,
  0::numeric AS pct_accepted,

  -- NDE metrics
  COUNT(CASE WHEN fw.nde_required THEN 1 END) AS nde_required_count,
  COUNT(CASE WHEN fw.nde_result = 'PASS' THEN 1 END) AS nde_pass_count,
  COUNT(CASE WHEN fw.nde_result = 'FAIL' THEN 1 END) AS nde_fail_count,
  COUNT(CASE WHEN fw.nde_result = 'PENDING' THEN 1 END) AS nde_pending_count,
  ROUND(
    CASE
      WHEN COUNT(CASE WHEN fw.nde_result IN ('PASS', 'FAIL') THEN 1 END) > 0 THEN
        (COUNT(CASE WHEN fw.nde_result = 'PASS' THEN 1 END)::numeric /
         COUNT(CASE WHEN fw.nde_result IN ('PASS', 'FAIL') THEN 1 END)::numeric) * 100
      ELSE NULL
    END, 0
  ) AS nde_pass_rate,

  -- Repair metrics
  COUNT(CASE WHEN fw.is_repair THEN 1 END) AS repair_count,
  ROUND(
    CASE
      WHEN COUNT(fw.id) > 0 THEN
        (COUNT(CASE WHEN fw.is_repair THEN 1 END)::numeric / COUNT(fw.id)::numeric) * 100
      ELSE 0
    END, 0
  ) AS repair_rate,

  -- Time metrics (in days)
  ROUND(
    AVG(
      CASE
        WHEN fw.date_welded IS NOT NULL AND fw.nde_date IS NOT NULL THEN
          (fw.nde_date - fw.date_welded)::numeric
        ELSE NULL
      END
    )::numeric, 1
  ) AS avg_days_to_nde,
  ROUND(
    AVG(
      CASE
        WHEN fw.date_welded IS NOT NULL AND fw.status = 'accepted' AND fw.nde_date IS NOT NULL THEN
          (fw.nde_date - fw.date_welded)::numeric
        ELSE NULL
      END
    )::numeric, 1
  ) AS avg_days_to_acceptance,

  -- Overall completion
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total,

  -- NEW: Milestone counts (MUST be at end for CREATE OR REPLACE VIEW)
  COUNT(CASE WHEN (c.current_milestones->>'Fit-up')::numeric = 1 THEN 1 END) AS fitup_count,
  COUNT(CASE WHEN (c.current_milestones->>'Weld Complete')::numeric = 1 THEN 1 END) AS weld_complete_count

FROM systems s
INNER JOIN components c ON c.system_id = s.id AND c.component_type = 'field_weld'
INNER JOIN field_welds fw ON fw.component_id = c.id
WHERE c.is_retired = false
GROUP BY s.id, s.name, s.project_id

UNION ALL

-- Part 2: Field welds WITHOUT system assignment (Unassigned)
SELECT
  NULL AS system_id,
  'Unassigned' AS system_name,
  c.project_id,

  -- Budget metrics
  COUNT(fw.id) AS total_welds,
  COUNT(CASE WHEN fw.status = 'active' THEN 1 END) AS active_count,
  COUNT(CASE WHEN fw.status = 'accepted' THEN 1 END) AS accepted_count,
  COUNT(CASE WHEN fw.status = 'rejected' THEN 1 END) AS rejected_count,

  -- Milestone percentages (kept for backwards compatibility)
  ROUND(AVG(
    CASE
      WHEN (c.current_milestones->>'Fit-up')::numeric = 1 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_fitup,
  ROUND(AVG(
    CASE
      WHEN (c.current_milestones->>'Weld Complete')::numeric = 1 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_weld_complete,
  0::numeric AS pct_accepted,

  -- NDE metrics
  COUNT(CASE WHEN fw.nde_required THEN 1 END) AS nde_required_count,
  COUNT(CASE WHEN fw.nde_result = 'PASS' THEN 1 END) AS nde_pass_count,
  COUNT(CASE WHEN fw.nde_result = 'FAIL' THEN 1 END) AS nde_fail_count,
  COUNT(CASE WHEN fw.nde_result = 'PENDING' THEN 1 END) AS nde_pending_count,
  ROUND(
    CASE
      WHEN COUNT(CASE WHEN fw.nde_result IN ('PASS', 'FAIL') THEN 1 END) > 0 THEN
        (COUNT(CASE WHEN fw.nde_result = 'PASS' THEN 1 END)::numeric /
         COUNT(CASE WHEN fw.nde_result IN ('PASS', 'FAIL') THEN 1 END)::numeric) * 100
      ELSE NULL
    END, 0
  ) AS nde_pass_rate,

  -- Repair metrics
  COUNT(CASE WHEN fw.is_repair THEN 1 END) AS repair_count,
  ROUND(
    CASE
      WHEN COUNT(fw.id) > 0 THEN
        (COUNT(CASE WHEN fw.is_repair THEN 1 END)::numeric / COUNT(fw.id)::numeric) * 100
      ELSE 0
    END, 0
  ) AS repair_rate,

  -- Time metrics (in days)
  ROUND(
    AVG(
      CASE
        WHEN fw.date_welded IS NOT NULL AND fw.nde_date IS NOT NULL THEN
          (fw.nde_date - fw.date_welded)::numeric
        ELSE NULL
      END
    )::numeric, 1
  ) AS avg_days_to_nde,
  ROUND(
    AVG(
      CASE
        WHEN fw.date_welded IS NOT NULL AND fw.status = 'accepted' AND fw.nde_date IS NOT NULL THEN
          (fw.nde_date - fw.date_welded)::numeric
        ELSE NULL
      END
    )::numeric, 1
  ) AS avg_days_to_acceptance,

  -- Overall completion
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total,

  -- NEW: Milestone counts (MUST be at end for CREATE OR REPLACE VIEW)
  COUNT(CASE WHEN (c.current_milestones->>'Fit-up')::numeric = 1 THEN 1 END) AS fitup_count,
  COUNT(CASE WHEN (c.current_milestones->>'Weld Complete')::numeric = 1 THEN 1 END) AS weld_complete_count

FROM field_welds fw
INNER JOIN components c ON c.id = fw.component_id
WHERE c.is_retired = false
  AND c.component_type = 'field_weld'
  AND c.system_id IS NULL
GROUP BY c.project_id;

-- ============================================================================
-- VIEW 3: Field Weld Progress by Test Package (ADD count columns)
-- ============================================================================

CREATE OR REPLACE VIEW vw_field_weld_progress_by_test_package AS

-- Part 1: Field welds WITH test package assignment
SELECT
  tp.id AS test_package_id,
  tp.name AS test_package_name,
  tp.project_id,

  -- Budget metrics
  COUNT(fw.id) AS total_welds,
  COUNT(CASE WHEN fw.status = 'active' THEN 1 END) AS active_count,
  COUNT(CASE WHEN fw.status = 'accepted' THEN 1 END) AS accepted_count,
  COUNT(CASE WHEN fw.status = 'rejected' THEN 1 END) AS rejected_count,

  -- Milestone percentages (kept for backwards compatibility)
  ROUND(AVG(
    CASE
      WHEN (c.current_milestones->>'Fit-up')::numeric = 1 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_fitup,
  ROUND(AVG(
    CASE
      WHEN (c.current_milestones->>'Weld Complete')::numeric = 1 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_weld_complete,
  0::numeric AS pct_accepted,

  -- NDE metrics
  COUNT(CASE WHEN fw.nde_required THEN 1 END) AS nde_required_count,
  COUNT(CASE WHEN fw.nde_result = 'PASS' THEN 1 END) AS nde_pass_count,
  COUNT(CASE WHEN fw.nde_result = 'FAIL' THEN 1 END) AS nde_fail_count,
  COUNT(CASE WHEN fw.nde_result = 'PENDING' THEN 1 END) AS nde_pending_count,
  ROUND(
    CASE
      WHEN COUNT(CASE WHEN fw.nde_result IN ('PASS', 'FAIL') THEN 1 END) > 0 THEN
        (COUNT(CASE WHEN fw.nde_result = 'PASS' THEN 1 END)::numeric /
         COUNT(CASE WHEN fw.nde_result IN ('PASS', 'FAIL') THEN 1 END)::numeric) * 100
      ELSE NULL
    END, 0
  ) AS nde_pass_rate,

  -- Repair metrics
  COUNT(CASE WHEN fw.is_repair THEN 1 END) AS repair_count,
  ROUND(
    CASE
      WHEN COUNT(fw.id) > 0 THEN
        (COUNT(CASE WHEN fw.is_repair THEN 1 END)::numeric / COUNT(fw.id)::numeric) * 100
      ELSE 0
    END, 0
  ) AS repair_rate,

  -- Time metrics (in days)
  ROUND(
    AVG(
      CASE
        WHEN fw.date_welded IS NOT NULL AND fw.nde_date IS NOT NULL THEN
          (fw.nde_date - fw.date_welded)::numeric
        ELSE NULL
      END
    )::numeric, 1
  ) AS avg_days_to_nde,
  ROUND(
    AVG(
      CASE
        WHEN fw.date_welded IS NOT NULL AND fw.status = 'accepted' AND fw.nde_date IS NOT NULL THEN
          (fw.nde_date - fw.date_welded)::numeric
        ELSE NULL
      END
    )::numeric, 1
  ) AS avg_days_to_acceptance,

  -- Overall completion
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total,

  -- NEW: Milestone counts (MUST be at end for CREATE OR REPLACE VIEW)
  COUNT(CASE WHEN (c.current_milestones->>'Fit-up')::numeric = 1 THEN 1 END) AS fitup_count,
  COUNT(CASE WHEN (c.current_milestones->>'Weld Complete')::numeric = 1 THEN 1 END) AS weld_complete_count

FROM test_packages tp
INNER JOIN components c ON c.test_package_id = tp.id AND c.component_type = 'field_weld'
INNER JOIN field_welds fw ON fw.component_id = c.id
WHERE c.is_retired = false
GROUP BY tp.id, tp.name, tp.project_id

UNION ALL

-- Part 2: Field welds WITHOUT test package assignment (Unassigned)
SELECT
  NULL AS test_package_id,
  'Unassigned' AS test_package_name,
  c.project_id,

  -- Budget metrics
  COUNT(fw.id) AS total_welds,
  COUNT(CASE WHEN fw.status = 'active' THEN 1 END) AS active_count,
  COUNT(CASE WHEN fw.status = 'accepted' THEN 1 END) AS accepted_count,
  COUNT(CASE WHEN fw.status = 'rejected' THEN 1 END) AS rejected_count,

  -- Milestone percentages (kept for backwards compatibility)
  ROUND(AVG(
    CASE
      WHEN (c.current_milestones->>'Fit-up')::numeric = 1 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_fitup,
  ROUND(AVG(
    CASE
      WHEN (c.current_milestones->>'Weld Complete')::numeric = 1 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_weld_complete,
  0::numeric AS pct_accepted,

  -- NDE metrics
  COUNT(CASE WHEN fw.nde_required THEN 1 END) AS nde_required_count,
  COUNT(CASE WHEN fw.nde_result = 'PASS' THEN 1 END) AS nde_pass_count,
  COUNT(CASE WHEN fw.nde_result = 'FAIL' THEN 1 END) AS nde_fail_count,
  COUNT(CASE WHEN fw.nde_result = 'PENDING' THEN 1 END) AS nde_pending_count,
  ROUND(
    CASE
      WHEN COUNT(CASE WHEN fw.nde_result IN ('PASS', 'FAIL') THEN 1 END) > 0 THEN
        (COUNT(CASE WHEN fw.nde_result = 'PASS' THEN 1 END)::numeric /
         COUNT(CASE WHEN fw.nde_result IN ('PASS', 'FAIL') THEN 1 END)::numeric) * 100
      ELSE NULL
    END, 0
  ) AS nde_pass_rate,

  -- Repair metrics
  COUNT(CASE WHEN fw.is_repair THEN 1 END) AS repair_count,
  ROUND(
    CASE
      WHEN COUNT(fw.id) > 0 THEN
        (COUNT(CASE WHEN fw.is_repair THEN 1 END)::numeric / COUNT(fw.id)::numeric) * 100
      ELSE 0
    END, 0
  ) AS repair_rate,

  -- Time metrics (in days)
  ROUND(
    AVG(
      CASE
        WHEN fw.date_welded IS NOT NULL AND fw.nde_date IS NOT NULL THEN
          (fw.nde_date - fw.date_welded)::numeric
        ELSE NULL
      END
    )::numeric, 1
  ) AS avg_days_to_nde,
  ROUND(
    AVG(
      CASE
        WHEN fw.date_welded IS NOT NULL AND fw.status = 'accepted' AND fw.nde_date IS NOT NULL THEN
          (fw.nde_date - fw.date_welded)::numeric
        ELSE NULL
      END
    )::numeric, 1
  ) AS avg_days_to_acceptance,

  -- Overall completion
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total,

  -- NEW: Milestone counts (MUST be at end for CREATE OR REPLACE VIEW)
  COUNT(CASE WHEN (c.current_milestones->>'Fit-up')::numeric = 1 THEN 1 END) AS fitup_count,
  COUNT(CASE WHEN (c.current_milestones->>'Weld Complete')::numeric = 1 THEN 1 END) AS weld_complete_count

FROM field_welds fw
INNER JOIN components c ON c.id = fw.component_id
WHERE c.is_retired = false
  AND c.component_type = 'field_weld'
  AND c.test_package_id IS NULL
GROUP BY c.project_id;

-- ============================================================================
-- UPDATE create_field_weld_snapshot RPC to include new count fields
-- ============================================================================

CREATE OR REPLACE FUNCTION create_field_weld_snapshot(
  p_project_id UUID,
  p_dimension TEXT,
  p_snapshot_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_inserted_count INTEGER := 0;
BEGIN
  -- Validate dimension parameter
  IF p_dimension NOT IN ('area', 'system', 'test_package', 'welder', 'overall') THEN
    RAISE EXCEPTION 'Invalid dimension: %. Must be one of: area, system, test_package, welder, overall', p_dimension;
  END IF;

  -- Insert snapshots based on dimension
  CASE p_dimension
    WHEN 'area' THEN
      INSERT INTO field_weld_report_snapshots (project_id, snapshot_date, dimension, dimension_id, dimension_name, metrics)
      SELECT
        project_id,
        p_snapshot_date,
        'area',
        area_id,
        area_name,
        jsonb_build_object(
          'total_welds', total_welds,
          'active_count', active_count,
          'accepted_count', accepted_count,
          'rejected_count', rejected_count,
          'fitup_count', fitup_count,
          'weld_complete_count', weld_complete_count,
          'pct_fitup', pct_fitup,
          'pct_weld_complete', pct_weld_complete,
          'pct_accepted', pct_accepted,
          'nde_required_count', nde_required_count,
          'nde_pass_count', nde_pass_count,
          'nde_fail_count', nde_fail_count,
          'nde_pending_count', nde_pending_count,
          'nde_pass_rate', nde_pass_rate,
          'repair_count', repair_count,
          'repair_rate', repair_rate,
          'avg_days_to_nde', avg_days_to_nde,
          'avg_days_to_acceptance', avg_days_to_acceptance,
          'pct_total', pct_total
        )
      FROM vw_field_weld_progress_by_area
      WHERE project_id = p_project_id
      ON CONFLICT (project_id, snapshot_date, dimension, dimension_id) DO UPDATE
      SET metrics = EXCLUDED.metrics;
      GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    WHEN 'system' THEN
      INSERT INTO field_weld_report_snapshots (project_id, snapshot_date, dimension, dimension_id, dimension_name, metrics)
      SELECT
        project_id,
        p_snapshot_date,
        'system',
        system_id,
        system_name,
        jsonb_build_object(
          'total_welds', total_welds,
          'active_count', active_count,
          'accepted_count', accepted_count,
          'rejected_count', rejected_count,
          'fitup_count', fitup_count,
          'weld_complete_count', weld_complete_count,
          'pct_fitup', pct_fitup,
          'pct_weld_complete', pct_weld_complete,
          'pct_accepted', pct_accepted,
          'nde_required_count', nde_required_count,
          'nde_pass_count', nde_pass_count,
          'nde_fail_count', nde_fail_count,
          'nde_pending_count', nde_pending_count,
          'nde_pass_rate', nde_pass_rate,
          'repair_count', repair_count,
          'repair_rate', repair_rate,
          'avg_days_to_nde', avg_days_to_nde,
          'avg_days_to_acceptance', avg_days_to_acceptance,
          'pct_total', pct_total
        )
      FROM vw_field_weld_progress_by_system
      WHERE project_id = p_project_id
      ON CONFLICT (project_id, snapshot_date, dimension, dimension_id) DO UPDATE
      SET metrics = EXCLUDED.metrics;
      GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    WHEN 'test_package' THEN
      INSERT INTO field_weld_report_snapshots (project_id, snapshot_date, dimension, dimension_id, dimension_name, metrics)
      SELECT
        project_id,
        p_snapshot_date,
        'test_package',
        test_package_id,
        test_package_name,
        jsonb_build_object(
          'total_welds', total_welds,
          'active_count', active_count,
          'accepted_count', accepted_count,
          'rejected_count', rejected_count,
          'fitup_count', fitup_count,
          'weld_complete_count', weld_complete_count,
          'pct_fitup', pct_fitup,
          'pct_weld_complete', pct_weld_complete,
          'pct_accepted', pct_accepted,
          'nde_required_count', nde_required_count,
          'nde_pass_count', nde_pass_count,
          'nde_fail_count', nde_fail_count,
          'nde_pending_count', nde_pending_count,
          'nde_pass_rate', nde_pass_rate,
          'repair_count', repair_count,
          'repair_rate', repair_rate,
          'avg_days_to_nde', avg_days_to_nde,
          'avg_days_to_acceptance', avg_days_to_acceptance,
          'pct_total', pct_total
        )
      FROM vw_field_weld_progress_by_test_package
      WHERE project_id = p_project_id
      ON CONFLICT (project_id, snapshot_date, dimension, dimension_id) DO UPDATE
      SET metrics = EXCLUDED.metrics;
      GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    WHEN 'welder' THEN
      -- Welder view is excluded from this migration (handled separately)
      -- Keep existing implementation for welder dimension
      INSERT INTO field_weld_report_snapshots (project_id, snapshot_date, dimension, dimension_id, dimension_name, metrics)
      SELECT
        project_id,
        p_snapshot_date,
        'welder',
        welder_id,
        welder_name,
        jsonb_build_object(
          'total_welds', total_welds,
          'active_count', active_count,
          'accepted_count', accepted_count,
          'rejected_count', rejected_count,
          'pct_fitup', pct_fitup,
          'pct_weld_complete', pct_weld_complete,
          'pct_accepted', pct_accepted,
          'nde_required_count', nde_required_count,
          'nde_pass_count', nde_pass_count,
          'nde_fail_count', nde_fail_count,
          'nde_pending_count', nde_pending_count,
          'nde_pass_rate', nde_pass_rate,
          'repair_count', repair_count,
          'repair_rate', repair_rate,
          'avg_days_to_nde', avg_days_to_nde,
          'avg_days_to_acceptance', avg_days_to_acceptance,
          'pct_total', pct_total,
          'first_pass_acceptance_count', first_pass_acceptance_count,
          'first_pass_acceptance_rate', first_pass_acceptance_rate
        )
      FROM vw_field_weld_progress_by_welder
      WHERE project_id = p_project_id
      ON CONFLICT (project_id, snapshot_date, dimension, dimension_id) DO UPDATE
      SET metrics = EXCLUDED.metrics;
      GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    WHEN 'overall' THEN
      -- Calculate overall project metrics (sum across all dimensions)
      INSERT INTO field_weld_report_snapshots (project_id, snapshot_date, dimension, dimension_id, dimension_name, metrics)
      SELECT
        p_project_id,
        p_snapshot_date,
        'overall',
        NULL,
        'Overall Project',
        jsonb_build_object(
          'total_welds', SUM(total_welds),
          'active_count', SUM(active_count),
          'accepted_count', SUM(accepted_count),
          'rejected_count', SUM(rejected_count),
          'fitup_count', SUM(fitup_count),
          'weld_complete_count', SUM(weld_complete_count),
          'pct_fitup', ROUND(AVG(pct_fitup), 0),
          'pct_weld_complete', ROUND(AVG(pct_weld_complete), 0),
          'pct_accepted', ROUND(AVG(pct_accepted), 0),
          'nde_required_count', SUM(nde_required_count),
          'nde_pass_count', SUM(nde_pass_count),
          'nde_fail_count', SUM(nde_fail_count),
          'nde_pending_count', SUM(nde_pending_count),
          'nde_pass_rate', ROUND(
            CASE
              WHEN SUM(nde_pass_count + nde_fail_count) > 0 THEN
                (SUM(nde_pass_count)::numeric / SUM(nde_pass_count + nde_fail_count)::numeric) * 100
              ELSE NULL
            END, 0
          ),
          'repair_count', SUM(repair_count),
          'repair_rate', ROUND(
            CASE
              WHEN SUM(total_welds) > 0 THEN
                (SUM(repair_count)::numeric / SUM(total_welds)::numeric) * 100
              ELSE 0
            END, 0
          ),
          'avg_days_to_nde', ROUND(AVG(avg_days_to_nde), 1),
          'avg_days_to_acceptance', ROUND(AVG(avg_days_to_acceptance), 1),
          'pct_total', ROUND(AVG(pct_total), 0)
        )
      FROM vw_field_weld_progress_by_area
      WHERE project_id = p_project_id
      ON CONFLICT (project_id, snapshot_date, dimension, dimension_id) DO UPDATE
      SET metrics = EXCLUDED.metrics;
      GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  END CASE;

  RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_field_weld_snapshot IS
'Creates a snapshot of current field weld metrics for a specific project and dimension.
Used for tracking week-over-week progress changes in the weekly field weld report.
Can be called manually or via scheduled job (e.g., daily at midnight).
Returns the number of snapshots created or updated.
Updated to include fitup_count and weld_complete_count for area, system, and test_package dimensions.';
