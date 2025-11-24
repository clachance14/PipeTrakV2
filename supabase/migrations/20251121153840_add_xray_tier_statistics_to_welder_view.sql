-- Add X-Ray Tier Statistics to Welder View
-- Purpose: Track count and NDE pass rate by xray percentage tier (5%, 10%, 100%, other)

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
  ) AS first_pass_acceptance_rate,

  -- NEW: X-Ray Tier Counts
  COUNT(CASE WHEN fw.xray_percentage = 5.0 THEN 1 END) AS xray_5pct_count,
  COUNT(CASE WHEN fw.xray_percentage = 10.0 THEN 1 END) AS xray_10pct_count,
  COUNT(CASE WHEN fw.xray_percentage = 100.0 THEN 1 END) AS xray_100pct_count,
  COUNT(CASE
    WHEN fw.xray_percentage IS NOT NULL
    AND fw.xray_percentage NOT IN (5.0, 10.0, 100.0)
    THEN 1
  END) AS xray_other_count,

  -- NEW: X-Ray Tier NDE Pass Rates
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

COMMENT ON VIEW vw_field_weld_progress_by_welder IS
'Aggregates field weld progress statistics grouped by Welder.
Includes milestone progress, NDE metrics, repair metrics, time-based metrics, welder-specific performance metrics, and x-ray tier statistics (count and pass rate by xray percentage).
Used for generating Welder-grouped field weld reports and performance analysis.';

GRANT SELECT ON vw_field_weld_progress_by_welder TO authenticated;
