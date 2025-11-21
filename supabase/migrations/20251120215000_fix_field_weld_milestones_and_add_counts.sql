-- Migration: Fix Field Weld Milestones and Restore Count Columns
--
-- Issues Fixed:
--   1. Migration 20251120200000 removed count columns when fixing milestone keys
--   2. Field weld components have empty {} current_milestones
--   3. Import function writes boolean true instead of numeric 1
--
-- Solution:
--   1. Restore count columns to all 3 field weld progress views
--   2. Backfill existing field welds with numeric 1 milestones based on actual status
--      - Fit-up = 1 only if date_welded IS NOT NULL (weld has been made)
--      - Weld Complete = 1 only if date_welded IS NOT NULL
--      - Accepted = 1 only if status = 'accepted'
--   3. Edge function will be updated separately to use numeric 1
--
-- Affected views:
--   - vw_field_weld_progress_by_area
--   - vw_field_weld_progress_by_system
--   - vw_field_weld_progress_by_test_package

-- ============================================================================
-- PART 1: Backfill existing field weld milestones
-- ============================================================================

-- Update field weld components to set milestones based on field_welds status
UPDATE components c
SET
  current_milestones = jsonb_build_object(
    'Fit-up', CASE
      WHEN fw.date_welded IS NOT NULL THEN 1
      ELSE 0
    END,
    'Weld Complete', CASE
      WHEN fw.date_welded IS NOT NULL THEN 1
      ELSE 0
    END,
    'Accepted', CASE
      WHEN fw.status = 'accepted' THEN 1
      ELSE 0
    END
  ),
  percent_complete = CASE
    WHEN fw.status = 'accepted' THEN 100
    WHEN fw.date_welded IS NOT NULL THEN 95
    ELSE 0
  END
FROM field_welds fw
WHERE c.id = fw.component_id
  AND c.component_type = 'field_weld'
  AND (c.current_milestones = '{}'::jsonb OR c.current_milestones IS NULL);

-- ============================================================================
-- PART 2: Add count columns back to VIEW 1 (Area)
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

  -- Milestone progress (using correct keys from progress template)
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

  -- NEW: Milestone counts (RESTORED)
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

  -- Milestone progress
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

  -- Overall completion
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total,

  -- NEW: Milestone counts (RESTORED)
  COUNT(CASE WHEN (c.current_milestones->>'Fit-up')::numeric = 1 THEN 1 END) AS fitup_count,
  COUNT(CASE WHEN (c.current_milestones->>'Weld Complete')::numeric = 1 THEN 1 END) AS weld_complete_count

FROM field_welds fw
INNER JOIN components c ON c.id = fw.component_id
WHERE c.is_retired = false
  AND c.component_type = 'field_weld'
  AND c.area_id IS NULL
GROUP BY c.project_id;

-- ============================================================================
-- PART 3: Add count columns back to VIEW 2 (System)
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

  -- Milestone progress
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

  -- Overall completion
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total,

  -- NEW: Milestone counts (RESTORED)
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

  -- Milestone progress
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

  -- Overall completion
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total,

  -- NEW: Milestone counts (RESTORED)
  COUNT(CASE WHEN (c.current_milestones->>'Fit-up')::numeric = 1 THEN 1 END) AS fitup_count,
  COUNT(CASE WHEN (c.current_milestones->>'Weld Complete')::numeric = 1 THEN 1 END) AS weld_complete_count

FROM field_welds fw
INNER JOIN components c ON c.id = fw.component_id
WHERE c.is_retired = false
  AND c.component_type = 'field_weld'
  AND c.system_id IS NULL
GROUP BY c.project_id;

-- ============================================================================
-- PART 4: Add count columns back to VIEW 3 (Test Package)
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

  -- Milestone progress
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

  -- Overall completion
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total,

  -- NEW: Milestone counts (RESTORED)
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

  -- Milestone progress
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

  -- Overall completion
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total,

  -- NEW: Milestone counts (RESTORED)
  COUNT(CASE WHEN (c.current_milestones->>'Fit-up')::numeric = 1 THEN 1 END) AS fitup_count,
  COUNT(CASE WHEN (c.current_milestones->>'Weld Complete')::numeric = 1 THEN 1 END) AS weld_complete_count

FROM field_welds fw
INNER JOIN components c ON c.id = fw.component_id
WHERE c.is_retired = false
  AND c.component_type = 'field_weld'
  AND c.test_package_id IS NULL
GROUP BY c.project_id;
