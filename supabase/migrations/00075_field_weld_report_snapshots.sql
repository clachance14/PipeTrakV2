-- Migration 00075: Field Weld Report Snapshots Table
-- Feature: Weekly Field Weld Progress Reports
-- Purpose: Store periodic snapshots of field weld metrics for week-over-week delta calculations

-- ============================================================================
-- SNAPSHOTS TABLE
-- ============================================================================

CREATE TABLE field_weld_report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Grouping dimension and identifier
  dimension TEXT NOT NULL CHECK (dimension IN ('area', 'system', 'test_package', 'welder', 'overall')),
  dimension_id UUID,  -- NULL for 'overall' dimension
  dimension_name TEXT,

  -- Snapshot metrics (JSONB for flexibility)
  metrics JSONB NOT NULL,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(project_id, snapshot_date, dimension, dimension_id)
);

-- Indexes for performance
CREATE INDEX idx_field_weld_snapshots_project_date
  ON field_weld_report_snapshots(project_id, snapshot_date DESC);
CREATE INDEX idx_field_weld_snapshots_dimension
  ON field_weld_report_snapshots(dimension, dimension_id);

-- Add comment
COMMENT ON TABLE field_weld_report_snapshots IS
'Stores periodic snapshots of field weld progress metrics for calculating week-over-week deltas.
Each snapshot captures metrics for a specific grouping dimension (area, system, test_package, welder, or overall project).
Used by the weekly field weld progress report to show trends and changes.';

COMMENT ON COLUMN field_weld_report_snapshots.dimension IS
'The grouping dimension for this snapshot: area, system, test_package, welder, or overall';

COMMENT ON COLUMN field_weld_report_snapshots.dimension_id IS
'The UUID of the dimension entity (area_id, system_id, etc). NULL for overall dimension.';

COMMENT ON COLUMN field_weld_report_snapshots.metrics IS
'JSONB object containing all metrics from the corresponding progress view.
Schema: {
  "total_welds": number,
  "active_count": number,
  "accepted_count": number,
  "rejected_count": number,
  "pct_fitup": number,
  "pct_weld_complete": number,
  "pct_accepted": number,
  "nde_required_count": number,
  "nde_pass_count": number,
  "nde_fail_count": number,
  "nde_pending_count": number,
  "nde_pass_rate": number,
  "repair_count": number,
  "repair_rate": number,
  "avg_days_to_nde": number,
  "avg_days_to_acceptance": number,
  "pct_total": number
}';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE field_weld_report_snapshots ENABLE ROW LEVEL SECURITY;

-- SELECT: All team members can view snapshots for their organization's projects
CREATE POLICY "Users can view field_weld_report_snapshots in their organization"
ON field_weld_report_snapshots FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- INSERT: System-level function only (snapshots created via scheduled job or manual trigger)
-- For now, allow project managers, QC, and admins to manually create snapshots
CREATE POLICY "Users can insert field_weld_report_snapshots if they have permission"
ON field_weld_report_snapshots FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin', 'project_manager', 'qc_inspector')
  )
);

-- DELETE: Only owner/admin can delete snapshots
CREATE POLICY "Users can delete field_weld_report_snapshots if they are admin"
ON field_weld_report_snapshots FOR DELETE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- ============================================================================
-- HELPER FUNCTION: Create snapshot from current metrics
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
Returns the number of snapshots created or updated.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_field_weld_snapshot TO authenticated;

-- ============================================================================
-- HELPER FUNCTION: Calculate delta between two snapshots
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_field_weld_delta(
  p_project_id UUID,
  p_dimension TEXT,
  p_dimension_id UUID,
  p_start_date DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
  v_start_metrics JSONB;
  v_end_metrics JSONB;
  v_delta JSONB;
BEGIN
  -- Get start snapshot metrics
  SELECT metrics INTO v_start_metrics
  FROM field_weld_report_snapshots
  WHERE project_id = p_project_id
    AND dimension = p_dimension
    AND dimension_id = p_dimension_id
    AND snapshot_date = p_start_date;

  -- Get end snapshot metrics
  SELECT metrics INTO v_end_metrics
  FROM field_weld_report_snapshots
  WHERE project_id = p_project_id
    AND dimension = p_dimension
    AND dimension_id = p_dimension_id
    AND snapshot_date = p_end_date;

  -- If either snapshot is missing, return NULL
  IF v_start_metrics IS NULL OR v_end_metrics IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate deltas for numeric metrics
  v_delta := jsonb_build_object(
    'total_welds_delta', (v_end_metrics->>'total_welds')::numeric - (v_start_metrics->>'total_welds')::numeric,
    'active_count_delta', (v_end_metrics->>'active_count')::numeric - (v_start_metrics->>'active_count')::numeric,
    'accepted_count_delta', (v_end_metrics->>'accepted_count')::numeric - (v_start_metrics->>'accepted_count')::numeric,
    'rejected_count_delta', (v_end_metrics->>'rejected_count')::numeric - (v_start_metrics->>'rejected_count')::numeric,
    'nde_pass_count_delta', (v_end_metrics->>'nde_pass_count')::numeric - (v_start_metrics->>'nde_pass_count')::numeric,
    'nde_fail_count_delta', (v_end_metrics->>'nde_fail_count')::numeric - (v_start_metrics->>'nde_fail_count')::numeric,
    'repair_count_delta', (v_end_metrics->>'repair_count')::numeric - (v_start_metrics->>'repair_count')::numeric,
    'pct_total_delta', (v_end_metrics->>'pct_total')::numeric - (v_start_metrics->>'pct_total')::numeric
  );

  RETURN v_delta;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_field_weld_delta IS
'Calculates the delta (difference) between two snapshots for a specific dimension.
Returns a JSONB object with delta values for key metrics.
Used to show week-over-week changes in the field weld progress report.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_field_weld_delta TO authenticated;
