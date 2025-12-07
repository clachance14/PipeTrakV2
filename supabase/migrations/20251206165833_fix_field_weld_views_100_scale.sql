-- Migration: Fix Field Weld Views to Use 100-Scale Milestones
--
-- Issue: Field weld progress views check for milestone values = 1 (old boolean scale)
--        but milestones now use 0-100 scale. Completed milestones have value 100, not 1.
--
-- Fix: Update all views to check for values >= 50 (treating 50+ as "complete")
--      This handles both legacy 0/1 data and new 0/100 data correctly.
--      Using >= 50 because normalize_milestone_value() converts:
--        - true/1 to 100
--        - false/0 to 0
--        - numeric values to as-is (0-100)

-- ============================================================================
-- VIEW 1: vw_field_weld_progress_by_area
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

  -- Milestone progress (FIXED: check for >= 50 to handle 100-scale)
  ROUND(AVG(
    CASE
      WHEN COALESCE((c.current_milestones->>'Fit-up')::numeric, 0) >= 50 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_fitup,
  ROUND(AVG(
    CASE
      WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 100
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

  -- Overall completion (FIXED: check for >= 50 to handle 100-scale)
  ROUND(
    CASE
      WHEN COUNT(fw.id) > 0 THEN
        (COUNT(CASE WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 1 END)::numeric / COUNT(fw.id)::numeric) * 100
      ELSE 0
    END, 0
  ) AS pct_total,

  -- Milestone counts (FIXED: check for >= 50 to handle 100-scale)
  COUNT(CASE WHEN COALESCE((c.current_milestones->>'Fit-up')::numeric, 0) >= 50 THEN 1 END) AS fitup_count,
  COUNT(CASE WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 1 END) AS weld_complete_count

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

  -- Milestone progress (FIXED: check for >= 50 to handle 100-scale)
  ROUND(AVG(
    CASE
      WHEN COALESCE((c.current_milestones->>'Fit-up')::numeric, 0) >= 50 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_fitup,
  ROUND(AVG(
    CASE
      WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 100
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

  -- Time metrics
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

  -- Overall completion (FIXED: check for >= 50 to handle 100-scale)
  ROUND(
    CASE
      WHEN COUNT(fw.id) > 0 THEN
        (COUNT(CASE WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 1 END)::numeric / COUNT(fw.id)::numeric) * 100
      ELSE 0
    END, 0
  ) AS pct_total,

  -- Milestone counts (FIXED: check for >= 50 to handle 100-scale)
  COUNT(CASE WHEN COALESCE((c.current_milestones->>'Fit-up')::numeric, 0) >= 50 THEN 1 END) AS fitup_count,
  COUNT(CASE WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 1 END) AS weld_complete_count

FROM field_welds fw
INNER JOIN components c ON c.id = fw.component_id
WHERE c.is_retired = false
  AND c.component_type = 'field_weld'
  AND c.area_id IS NULL
GROUP BY c.project_id;

-- ============================================================================
-- VIEW 2: vw_field_weld_progress_by_system
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

  -- Milestone progress (FIXED: check for >= 50 to handle 100-scale)
  ROUND(AVG(
    CASE
      WHEN COALESCE((c.current_milestones->>'Fit-up')::numeric, 0) >= 50 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_fitup,
  ROUND(AVG(
    CASE
      WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 100
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

  -- Time metrics
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

  -- Overall completion (FIXED: check for >= 50 to handle 100-scale)
  ROUND(
    CASE
      WHEN COUNT(fw.id) > 0 THEN
        (COUNT(CASE WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 1 END)::numeric / COUNT(fw.id)::numeric) * 100
      ELSE 0
    END, 0
  ) AS pct_total,

  -- Milestone counts (FIXED: check for >= 50 to handle 100-scale)
  COUNT(CASE WHEN COALESCE((c.current_milestones->>'Fit-up')::numeric, 0) >= 50 THEN 1 END) AS fitup_count,
  COUNT(CASE WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 1 END) AS weld_complete_count

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

  -- Milestone progress (FIXED: check for >= 50 to handle 100-scale)
  ROUND(AVG(
    CASE
      WHEN COALESCE((c.current_milestones->>'Fit-up')::numeric, 0) >= 50 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_fitup,
  ROUND(AVG(
    CASE
      WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 100
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

  -- Time metrics
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

  -- Overall completion (FIXED: check for >= 50 to handle 100-scale)
  ROUND(
    CASE
      WHEN COUNT(fw.id) > 0 THEN
        (COUNT(CASE WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 1 END)::numeric / COUNT(fw.id)::numeric) * 100
      ELSE 0
    END, 0
  ) AS pct_total,

  -- Milestone counts (FIXED: check for >= 50 to handle 100-scale)
  COUNT(CASE WHEN COALESCE((c.current_milestones->>'Fit-up')::numeric, 0) >= 50 THEN 1 END) AS fitup_count,
  COUNT(CASE WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 1 END) AS weld_complete_count

FROM field_welds fw
INNER JOIN components c ON c.id = fw.component_id
WHERE c.is_retired = false
  AND c.component_type = 'field_weld'
  AND c.system_id IS NULL
GROUP BY c.project_id;

-- ============================================================================
-- VIEW 3: vw_field_weld_progress_by_test_package
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

  -- Milestone progress (FIXED: check for >= 50 to handle 100-scale)
  ROUND(AVG(
    CASE
      WHEN COALESCE((c.current_milestones->>'Fit-up')::numeric, 0) >= 50 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_fitup,
  ROUND(AVG(
    CASE
      WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 100
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

  -- Time metrics
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

  -- Overall completion (FIXED: check for >= 50 to handle 100-scale)
  ROUND(
    CASE
      WHEN COUNT(fw.id) > 0 THEN
        (COUNT(CASE WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 1 END)::numeric / COUNT(fw.id)::numeric) * 100
      ELSE 0
    END, 0
  ) AS pct_total,

  -- Milestone counts (FIXED: check for >= 50 to handle 100-scale)
  COUNT(CASE WHEN COALESCE((c.current_milestones->>'Fit-up')::numeric, 0) >= 50 THEN 1 END) AS fitup_count,
  COUNT(CASE WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 1 END) AS weld_complete_count

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

  -- Milestone progress (FIXED: check for >= 50 to handle 100-scale)
  ROUND(AVG(
    CASE
      WHEN COALESCE((c.current_milestones->>'Fit-up')::numeric, 0) >= 50 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_fitup,
  ROUND(AVG(
    CASE
      WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 100
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

  -- Time metrics
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

  -- Overall completion (FIXED: check for >= 50 to handle 100-scale)
  ROUND(
    CASE
      WHEN COUNT(fw.id) > 0 THEN
        (COUNT(CASE WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 1 END)::numeric / COUNT(fw.id)::numeric) * 100
      ELSE 0
    END, 0
  ) AS pct_total,

  -- Milestone counts (FIXED: check for >= 50 to handle 100-scale)
  COUNT(CASE WHEN COALESCE((c.current_milestones->>'Fit-up')::numeric, 0) >= 50 THEN 1 END) AS fitup_count,
  COUNT(CASE WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 1 END) AS weld_complete_count

FROM field_welds fw
INNER JOIN components c ON c.id = fw.component_id
WHERE c.is_retired = false
  AND c.component_type = 'field_weld'
  AND c.test_package_id IS NULL
GROUP BY c.project_id;

-- ============================================================================
-- VIEW 4: vw_field_weld_progress_by_welder (also needs fixing)
-- Must drop first since column set differs
-- ============================================================================

DROP VIEW IF EXISTS vw_field_weld_progress_by_welder;

CREATE VIEW vw_field_weld_progress_by_welder AS
SELECT
  w.id AS welder_id,
  w.stencil AS welder_stencil,
  w.name AS welder_name,
  w.project_id,

  -- Budget metrics
  COUNT(fw.id) AS total_welds,
  COUNT(CASE WHEN fw.status = 'active' THEN 1 END) AS active_count,
  COUNT(CASE WHEN fw.status = 'accepted' THEN 1 END) AS accepted_count,
  COUNT(CASE WHEN fw.status = 'rejected' THEN 1 END) AS rejected_count,

  -- Milestone progress (FIXED: check for >= 50 to handle 100-scale)
  ROUND(AVG(
    CASE
      WHEN COALESCE((c.current_milestones->>'Fit-up')::numeric, 0) >= 50 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_fitup,
  ROUND(AVG(
    CASE
      WHEN COALESCE((c.current_milestones->>'Weld Complete')::numeric, 0) >= 50 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_weld_complete,
  ROUND(AVG(
    CASE
      WHEN COALESCE((c.current_milestones->>'Accepted')::numeric, 0) >= 50 THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_accepted,

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

  -- Overall completion (FIXED: use percent_complete since it respects 100-scale)
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total,

  -- Welder-specific metrics
  COUNT(CASE
    WHEN fw.status = 'accepted' AND NOT fw.is_repair THEN 1
  END) AS first_pass_acceptance_count,
  ROUND(
    CASE
      WHEN COUNT(CASE WHEN NOT fw.is_repair THEN 1 END) > 0 THEN
        (COUNT(CASE WHEN fw.status = 'accepted' AND NOT fw.is_repair THEN 1 END)::numeric /
         COUNT(CASE WHEN NOT fw.is_repair THEN 1 END)::numeric) * 100
      ELSE NULL
    END, 0
  ) AS first_pass_acceptance_rate,

  -- X-Ray Tier Counts
  COUNT(CASE WHEN fw.xray_percentage = 5.0 THEN 1 END) AS xray_5pct_count,
  COUNT(CASE WHEN fw.xray_percentage = 10.0 THEN 1 END) AS xray_10pct_count,
  COUNT(CASE WHEN fw.xray_percentage = 100.0 THEN 1 END) AS xray_100pct_count,
  COUNT(CASE
    WHEN fw.xray_percentage IS NOT NULL
    AND fw.xray_percentage NOT IN (5.0, 10.0, 100.0)
    THEN 1
  END) AS xray_other_count,

  -- X-Ray Tier NDE Pass Rates
  ROUND(
    CASE
      WHEN COUNT(CASE WHEN fw.xray_percentage = 5.0 AND fw.nde_result IN ('PASS', 'FAIL') THEN 1 END) > 0 THEN
        (COUNT(CASE WHEN fw.xray_percentage = 5.0 AND fw.nde_result = 'PASS' THEN 1 END)::numeric /
         COUNT(CASE WHEN fw.xray_percentage = 5.0 AND fw.nde_result IN ('PASS', 'FAIL') THEN 1 END)::numeric) * 100
      ELSE NULL
    END, 0
  ) AS xray_5pct_pass_rate,
  ROUND(
    CASE
      WHEN COUNT(CASE WHEN fw.xray_percentage = 10.0 AND fw.nde_result IN ('PASS', 'FAIL') THEN 1 END) > 0 THEN
        (COUNT(CASE WHEN fw.xray_percentage = 10.0 AND fw.nde_result = 'PASS' THEN 1 END)::numeric /
         COUNT(CASE WHEN fw.xray_percentage = 10.0 AND fw.nde_result IN ('PASS', 'FAIL') THEN 1 END)::numeric) * 100
      ELSE NULL
    END, 0
  ) AS xray_10pct_pass_rate,
  ROUND(
    CASE
      WHEN COUNT(CASE WHEN fw.xray_percentage = 100.0 AND fw.nde_result IN ('PASS', 'FAIL') THEN 1 END) > 0 THEN
        (COUNT(CASE WHEN fw.xray_percentage = 100.0 AND fw.nde_result = 'PASS' THEN 1 END)::numeric /
         COUNT(CASE WHEN fw.xray_percentage = 100.0 AND fw.nde_result IN ('PASS', 'FAIL') THEN 1 END)::numeric) * 100
      ELSE NULL
    END, 0
  ) AS xray_100pct_pass_rate

FROM welders w
LEFT JOIN field_welds fw ON fw.welder_id = w.id
LEFT JOIN components c ON c.id = fw.component_id
WHERE fw.id IS NOT NULL  -- Only include welders with assigned welds
GROUP BY w.id, w.stencil, w.name, w.project_id;

GRANT SELECT ON vw_field_weld_progress_by_welder TO authenticated;

COMMENT ON VIEW vw_field_weld_progress_by_area IS 'Field weld progress aggregated by area (FIXED: uses >= 50 threshold for 100-scale milestones)';
COMMENT ON VIEW vw_field_weld_progress_by_system IS 'Field weld progress aggregated by system (FIXED: uses >= 50 threshold for 100-scale milestones)';
COMMENT ON VIEW vw_field_weld_progress_by_test_package IS 'Field weld progress aggregated by test package (FIXED: uses >= 50 threshold for 100-scale milestones)';
COMMENT ON VIEW vw_field_weld_progress_by_welder IS 'Field weld progress aggregated by welder (FIXED: uses >= 50 threshold for 100-scale milestones)';
