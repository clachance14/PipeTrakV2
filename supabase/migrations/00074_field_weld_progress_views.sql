-- Migration 00074: Field Weld Progress Views
-- Feature: Weekly Field Weld Progress Reports
-- Purpose: Create 4 aggregated views for field weld reporting (Area, System, Test Package, Welder)
--          plus helper function for time-based metrics

-- ============================================================================
-- HELPER FUNCTION: Calculate time-based metrics
-- ============================================================================

-- Calculate average days between two date fields
-- Used for: avg_days_to_nde, avg_days_to_acceptance
CREATE OR REPLACE FUNCTION calculate_avg_days_between(
  date_start DATE,
  date_end DATE
)
RETURNS NUMERIC AS $$
BEGIN
  IF date_start IS NULL OR date_end IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN EXTRACT(DAY FROM (date_end - date_start));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_avg_days_between IS
'Calculates the number of days between two dates.
Returns NULL if either date is NULL.
Used for time-based metrics in field weld reporting.';

-- ============================================================================
-- VIEW 1: Field Weld Progress by Area
-- ============================================================================

CREATE OR REPLACE VIEW vw_field_weld_progress_by_area AS
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.project_id,

  -- Budget metrics
  COUNT(fw.id) AS total_welds,
  COUNT(CASE WHEN fw.status = 'active' THEN 1 END) AS active_count,
  COUNT(CASE WHEN fw.status = 'accepted' THEN 1 END) AS accepted_count,
  COUNT(CASE WHEN fw.status = 'rejected' THEN 1 END) AS rejected_count,

  -- Milestone progress (using current_milestones column)
  ROUND(AVG(
    CASE
      WHEN c.current_milestones->>'Fit-up' = 'true' THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_fitup,
  ROUND(AVG(
    CASE
      WHEN c.current_milestones->>'Weld Complete' = 'true' THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_weld_complete,
  ROUND(AVG(
    CASE
      WHEN c.current_milestones->>'Accepted' = 'true' THEN 100
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

  -- Overall completion
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total

FROM areas a
LEFT JOIN components c ON c.area_id = a.id AND c.component_type = 'field_weld'
LEFT JOIN field_welds fw ON fw.component_id = c.id
WHERE c.id IS NOT NULL  -- Only include areas with field welds
GROUP BY a.id, a.name, a.project_id;

COMMENT ON VIEW vw_field_weld_progress_by_area IS
'Aggregates field weld progress statistics grouped by Area.
Includes milestone progress, NDE metrics, repair metrics, and time-based metrics.
Used for generating Area-grouped field weld reports.';

GRANT SELECT ON vw_field_weld_progress_by_area TO authenticated;

-- ============================================================================
-- VIEW 2: Field Weld Progress by System
-- ============================================================================

CREATE OR REPLACE VIEW vw_field_weld_progress_by_system AS
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
      WHEN c.current_milestones->>'Fit-up' = 'true' THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_fitup,
  ROUND(AVG(
    CASE
      WHEN c.current_milestones->>'Weld Complete' = 'true' THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_weld_complete,
  ROUND(AVG(
    CASE
      WHEN c.current_milestones->>'Accepted' = 'true' THEN 100
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

  -- Overall completion
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total

FROM systems s
LEFT JOIN components c ON c.system_id = s.id AND c.component_type = 'field_weld'
LEFT JOIN field_welds fw ON fw.component_id = c.id
WHERE c.id IS NOT NULL  -- Only include systems with field welds
GROUP BY s.id, s.name, s.project_id;

COMMENT ON VIEW vw_field_weld_progress_by_system IS
'Aggregates field weld progress statistics grouped by System.
Includes milestone progress, NDE metrics, repair metrics, and time-based metrics.
Used for generating System-grouped field weld reports.';

GRANT SELECT ON vw_field_weld_progress_by_system TO authenticated;

-- ============================================================================
-- VIEW 3: Field Weld Progress by Test Package
-- ============================================================================

CREATE OR REPLACE VIEW vw_field_weld_progress_by_test_package AS
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
      WHEN c.current_milestones->>'Fit-up' = 'true' THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_fitup,
  ROUND(AVG(
    CASE
      WHEN c.current_milestones->>'Weld Complete' = 'true' THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_weld_complete,
  ROUND(AVG(
    CASE
      WHEN c.current_milestones->>'Accepted' = 'true' THEN 100
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

  -- Overall completion
  ROUND(AVG(c.percent_complete)::numeric, 0) AS pct_total

FROM test_packages tp
LEFT JOIN components c ON c.test_package_id = tp.id AND c.component_type = 'field_weld'
LEFT JOIN field_welds fw ON fw.component_id = c.id
WHERE c.id IS NOT NULL  -- Only include test packages with field welds
GROUP BY tp.id, tp.name, tp.project_id;

COMMENT ON VIEW vw_field_weld_progress_by_test_package IS
'Aggregates field weld progress statistics grouped by Test Package.
Includes milestone progress, NDE metrics, repair metrics, and time-based metrics.
Used for generating Test Package-grouped field weld reports.';

GRANT SELECT ON vw_field_weld_progress_by_test_package TO authenticated;

-- ============================================================================
-- VIEW 4: Field Weld Progress by Welder (NEW DIMENSION)
-- ============================================================================

CREATE OR REPLACE VIEW vw_field_weld_progress_by_welder AS
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

  -- Milestone progress
  ROUND(AVG(
    CASE
      WHEN c.current_milestones->>'Fit-up' = 'true' THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_fitup,
  ROUND(AVG(
    CASE
      WHEN c.current_milestones->>'Weld Complete' = 'true' THEN 100
      ELSE 0
    END
  )::numeric, 0) AS pct_weld_complete,
  ROUND(AVG(
    CASE
      WHEN c.current_milestones->>'Accepted' = 'true' THEN 100
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

  -- Overall completion
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
  ) AS first_pass_acceptance_rate

FROM welders w
LEFT JOIN field_welds fw ON fw.welder_id = w.id
LEFT JOIN components c ON c.id = fw.component_id
WHERE fw.id IS NOT NULL  -- Only include welders with assigned welds
GROUP BY w.id, w.stencil, w.name, w.project_id;

COMMENT ON VIEW vw_field_weld_progress_by_welder IS
'Aggregates field weld progress statistics grouped by Welder.
Includes milestone progress, NDE metrics, repair metrics, time-based metrics, and welder-specific performance metrics.
Used for generating Welder-grouped field weld reports and performance analysis.';

GRANT SELECT ON vw_field_weld_progress_by_welder TO authenticated;
