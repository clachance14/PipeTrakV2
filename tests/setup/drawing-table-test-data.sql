-- ============================================================================
-- Test Data Seed Script: Drawing-Centered Component Progress Table
-- ============================================================================
-- Purpose: Seed test data for Feature 010 quickstart scenarios
-- Usage: Run in Supabase SQL editor or via psql
-- Cleanup: Run cleanup section at end to remove test data
--
-- Expected Results:
--   - Drawing P-001: 3 components, avg 8.33% (0% + 10% + 15% / 3)
--   - Drawing P-002: 1 component, avg 100%
--   - Drawing P-003: 0 components, avg NULL
-- ============================================================================

-- ============================================================================
-- SETUP: Create Test Organization and Project
-- ============================================================================

-- Insert test organization (if not exists)
INSERT INTO organizations (id, name, created_at)
VALUES (
  'test-org-010-uuid'::uuid,
  'Test Organization - Feature 010',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert test project
INSERT INTO projects (id, name, organization_id, created_at)
VALUES (
  'test-project-010-uuid'::uuid,
  'Test Project - Drawing Table',
  'test-org-010-uuid'::uuid,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST DATA: 3 Drawings (P-001, P-002, P-003)
-- ============================================================================

INSERT INTO drawings (id, project_id, drawing_no_norm, drawing_no_raw, title, rev, is_retired, created_at)
VALUES
  -- Drawing P-001: Main Process Line (3 components, 8.33% average)
  (
    'drawing-010-001-uuid'::uuid,
    'test-project-010-uuid'::uuid,
    'P-001',
    'P-001',
    'Main Process Line',
    'A',
    false,
    NOW()
  ),

  -- Drawing P-002: Drain Line (1 component, 100% complete)
  (
    'drawing-010-002-uuid'::uuid,
    'test-project-010-uuid'::uuid,
    'P-002',
    'P-002',
    'Drain Line',
    'B',
    false,
    NOW()
  ),

  -- Drawing P-003: Vent Header (0 components, empty drawing edge case)
  (
    'drawing-010-003-uuid'::uuid,
    'test-project-010-uuid'::uuid,
    'P-003',
    'P-003',
    'Vent Header',
    'A',
    false,
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST DATA: 4 Components (3 for P-001, 1 for P-002, 0 for P-003)
-- ============================================================================

-- Component 1: Valve on P-001 (0% complete - not started)
INSERT INTO components (
  id,
  project_id,
  drawing_id,
  component_type,
  identity_key,
  current_milestones,
  percent_complete,
  progress_template_id,
  is_retired,
  created_at
)
VALUES (
  'comp-010-001-uuid'::uuid,
  'test-project-010-uuid'::uuid,
  'drawing-010-001-uuid'::uuid,
  'valve',
  '{"drawing_norm": "P-001", "commodity_code": "VBALU-001", "size": "2", "seq": 1}'::jsonb,
  '{"Receive": false, "Install": false, "Punch": false, "Test": false, "Restore": false}'::jsonb,
  0.00,
  (SELECT id FROM progress_templates WHERE component_type = 'valve' LIMIT 1),
  false,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Component 2: Fitting on P-001 (10% complete - Receive milestone done)
INSERT INTO components (
  id,
  project_id,
  drawing_id,
  component_type,
  identity_key,
  current_milestones,
  percent_complete,
  progress_template_id,
  is_retired,
  created_at
)
VALUES (
  'comp-010-002-uuid'::uuid,
  'test-project-010-uuid'::uuid,
  'drawing-010-001-uuid'::uuid,
  'fitting',
  '{"drawing_norm": "P-001", "commodity_code": "EL90-150", "size": "2", "seq": 1}'::jsonb,
  '{"Receive": true, "Install": false, "Punch": false, "Test": false, "Restore": false}'::jsonb,
  10.00,
  (SELECT id FROM progress_templates WHERE component_type = 'fitting' LIMIT 1),
  false,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Component 3: Threaded Pipe on P-001 (15% complete - Receive + partial Fabricate)
-- Note: Threaded pipe has hybrid workflow with partial milestones
INSERT INTO components (
  id,
  project_id,
  drawing_id,
  component_type,
  identity_key,
  current_milestones,
  percent_complete,
  progress_template_id,
  is_retired,
  created_at
)
VALUES (
  'comp-010-003-uuid'::uuid,
  'test-project-010-uuid'::uuid,
  'drawing-010-001-uuid'::uuid,
  'threaded_pipe',
  '{"drawing_norm": "P-001", "commodity_code": "PIPE-SCH40", "size": "1", "seq": 1}'::jsonb,
  '{"Receive": true, "Fabricate": 50, "Install": 0, "Erect": 0, "Connect": 0, "Support": 0, "Punch": false, "Test": false, "Restore": false}'::jsonb,
  15.00,
  (SELECT id FROM progress_templates WHERE component_type = 'threaded_pipe' LIMIT 1),
  false,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Component 4: Valve on P-002 (100% complete - all milestones done)
INSERT INTO components (
  id,
  project_id,
  drawing_id,
  component_type,
  identity_key,
  current_milestones,
  percent_complete,
  progress_template_id,
  is_retired,
  created_at
)
VALUES (
  'comp-010-004-uuid'::uuid,
  'test-project-010-uuid'::uuid,
  'drawing-010-002-uuid'::uuid,
  'valve',
  '{"drawing_norm": "P-002", "commodity_code": "VBALU-002", "size": "1", "seq": 1}'::jsonb,
  '{"Receive": true, "Install": true, "Punch": true, "Test": true, "Restore": true}'::jsonb,
  100.00,
  (SELECT id FROM progress_templates WHERE component_type = 'valve' LIMIT 1),
  false,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- No components for P-003 (empty drawing edge case)

-- ============================================================================
-- REFRESH: Update Materialized View
-- ============================================================================

REFRESH MATERIALIZED VIEW mv_drawing_progress;

-- ============================================================================
-- VERIFICATION: Query Test Data
-- ============================================================================

-- Verify drawings were created
SELECT
  d.drawing_no_norm,
  d.title,
  COALESCE(dp.total_components, 0) as total_components,
  COALESCE(dp.completed_components, 0) as completed_components,
  ROUND(COALESCE(dp.avg_percent_complete, 0)::numeric, 2) as avg_percent_complete
FROM drawings d
LEFT JOIN mv_drawing_progress dp ON d.id = dp.drawing_id
WHERE d.project_id = 'test-project-010-uuid'::uuid
ORDER BY d.drawing_no_norm;

-- Expected output:
-- drawing_no_norm | title             | total_components | completed_components | avg_percent_complete
-- ----------------+-------------------+------------------+----------------------+---------------------
-- P-001           | Main Process Line | 3                | 0                    | 8.33
-- P-002           | Drain Line        | 1                | 1                    | 100.00
-- P-003           | Vent Header       | 0                | 0                    | 0.00

-- Verify components were created
SELECT
  c.component_type,
  c.identity_key->>'commodity_code' as commodity_code,
  c.identity_key->>'size' as size,
  c.percent_complete,
  c.current_milestones
FROM components c
WHERE c.project_id = 'test-project-010-uuid'::uuid
ORDER BY c.drawing_id, (c.identity_key->>'seq')::int;

-- Expected output: 4 components with correct progress states

-- ============================================================================
-- CLEANUP: Remove Test Data (run after testing complete)
-- ============================================================================

-- Uncomment the following section to delete test data

/*
-- Delete components (cascades to milestone_events via FK)
DELETE FROM components
WHERE project_id = 'test-project-010-uuid'::uuid;

-- Delete drawings
DELETE FROM drawings
WHERE project_id = 'test-project-010-uuid'::uuid;

-- Delete project
DELETE FROM projects
WHERE id = 'test-project-010-uuid'::uuid;

-- Delete organization
DELETE FROM organizations
WHERE id = 'test-org-010-uuid'::uuid;

-- Refresh materialized view after cleanup
REFRESH MATERIALIZED VIEW mv_drawing_progress;

-- Verify cleanup
SELECT COUNT(*) as remaining_test_components
FROM components
WHERE project_id = 'test-project-010-uuid'::uuid;
-- Expected: 0

SELECT COUNT(*) as remaining_test_drawings
FROM drawings
WHERE project_id = 'test-project-010-uuid'::uuid;
-- Expected: 0
*/

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
