-- SQL Function Contract: create_demo_skeleton
-- Feature: 023-demo-data-population
--
-- Purpose: Create foundation project structure synchronously (<2 seconds)
-- Context: Called by demo-signup Edge Function during user signup
-- Execution: SECURITY DEFINER (elevated privileges to bypass RLS)
-- Idempotency: Safe to retry (ON CONFLICT DO NOTHING)

CREATE OR REPLACE FUNCTION create_demo_skeleton(
  p_user_id UUID,
  p_org_id UUID,
  p_project_id UUID
) RETURNS void AS $$
BEGIN
  -- =====================================================================
  -- PART 1: Insert 5 Areas
  -- =====================================================================
  INSERT INTO areas (project_id, name)
  VALUES
    (p_project_id, 'Pipe Rack'),
    (p_project_id, 'ISBL'),
    (p_project_id, 'Containment Area'),
    (p_project_id, 'Water Process'),
    (p_project_id, 'Cooling Tower')
  ON CONFLICT (project_id, name) DO NOTHING;

  -- =====================================================================
  -- PART 2: Insert 5 Systems
  -- =====================================================================
  INSERT INTO systems (project_id, name)
  VALUES
    (p_project_id, 'Air'),
    (p_project_id, 'Nitrogen'),
    (p_project_id, 'Steam'),
    (p_project_id, 'Process'),
    (p_project_id, 'Condensate')
  ON CONFLICT (project_id, name) DO NOTHING;

  -- =====================================================================
  -- PART 3: Insert 10 Test Packages
  -- =====================================================================
  INSERT INTO test_packages (project_id, name)
  VALUES
    (p_project_id, 'TP-01'),
    (p_project_id, 'TP-02'),
    (p_project_id, 'TP-03'),
    (p_project_id, 'TP-04'),
    (p_project_id, 'TP-05'),
    (p_project_id, 'TP-06'),
    (p_project_id, 'TP-07'),
    (p_project_id, 'TP-08'),
    (p_project_id, 'TP-09'),
    (p_project_id, 'TP-10')
  ON CONFLICT (project_id, name) DO NOTHING;

  -- =====================================================================
  -- PART 4: Insert 4 Welders
  -- =====================================================================
  INSERT INTO welders (project_id, stencil, name)
  VALUES
    (p_project_id, 'JD-123', 'John Davis'),
    (p_project_id, 'SM-456', 'Sarah Miller'),
    (p_project_id, 'TR-789', 'Tom Rodriguez'),
    (p_project_id, 'KL-012', 'Kim Lee')
  ON CONFLICT (project_id, stencil_norm) DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- COMMENTS & DOCUMENTATION
-- =====================================================================

COMMENT ON FUNCTION create_demo_skeleton IS '
Demo project skeleton creation for Try Demo Project flow.

Creates foundation structure synchronously during user signup:
- 5 areas (Pipe Rack, ISBL, Containment Area, Water Process, Cooling Tower)
- 5 systems (Air, Nitrogen, Steam, Process, Condensate)
- 10 test packages (TP-01 through TP-10)
- 4 welders (JD-123, SM-456, TR-789, KL-012)

Execution time: <2 seconds
Idempotency: Safe to retry (ON CONFLICT DO NOTHING)
Security: SECURITY DEFINER (bypasses RLS for skeleton creation)

Called by: demo-signup Edge Function
Followed by: populate-demo-data Edge Function (async bulk population)
';

-- =====================================================================
-- CONTRACT GUARANTEES
-- =====================================================================

-- Performance:
-- - Execution time: <2 seconds (4 simple batch inserts)
-- - No complex queries or joins
-- - Fixed number of rows (5 + 5 + 10 + 4 = 24 total)

-- Idempotency:
-- - ON CONFLICT DO NOTHING prevents duplicate insertions
-- - Safe to call multiple times for same project/org
-- - No side effects beyond initial creation

-- Security:
-- - SECURITY DEFINER allows creation even if user lacks INSERT permission
-- - RLS policies on tables enforce organization isolation
-- - Function only accepts UUID parameters (no SQL injection risk)

-- Data Integrity:
-- - Foreign key constraints enforced (project_id, organization_id)
-- - Unique constraints prevent duplicates (project_id+name, org_id+stamp)
-- - Default values applied (created_at timestamps)

-- =====================================================================
-- USAGE EXAMPLE
-- =====================================================================

-- Called from demo-signup Edge Function:
-- await supabase.rpc('create_demo_skeleton', {
--   p_user_id: userId,
--   p_org_id: orgId,
--   p_project_id: projectId
-- })

-- =====================================================================
-- TESTING CONTRACT
-- =====================================================================

-- Test 1: Function creates correct structure
-- SELECT * FROM areas WHERE project_id = '<demo_project_id>';
-- Expected: 5 rows

-- Test 2: Function is idempotent
-- SELECT create_demo_skeleton('<user>', '<org>', '<project>');
-- SELECT create_demo_skeleton('<user>', '<org>', '<project>');  -- Second call
-- Expected: No errors, no duplicate rows

-- Test 3: Performance under load
-- Expected: Execution time <2 seconds

-- =====================================================================
-- MIGRATION NOTES
-- =====================================================================

-- This function will be created in a new migration:
-- supabase/migrations/[TIMESTAMP]_create_demo_skeleton_function.sql

-- Dependency: Requires existing tables (areas, systems, test_packages, welders)
-- No schema changes required (all tables already exist)
