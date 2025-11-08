-- Fix create_demo_skeleton function to use correct welder columns
-- Feature: 023-demo-data-population
-- Issue: Original function used organization_id and stamp, but welders table uses project_id and stencil

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
  -- FIXED: Use project_id and stencil (not organization_id and stamp)
  INSERT INTO welders (project_id, stencil, name)
  VALUES
    (p_project_id, 'JD-123', 'John Davis'),
    (p_project_id, 'SM-456', 'Sarah Miller'),
    (p_project_id, 'TR-789', 'Tom Rodriguez'),
    (p_project_id, 'KL-012', 'Kim Lee')
  ON CONFLICT (project_id, stencil_norm) DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_demo_skeleton IS '
Demo project skeleton creation for Try Demo Project flow (FIXED VERSION).

Creates foundation structure synchronously during user signup:
- 5 areas (Pipe Rack, ISBL, Containment Area, Water Process, Cooling Tower)
- 5 systems (Air, Nitrogen, Steam, Process, Condensate)
- 10 test packages (TP-01 through TP-10)
- 4 welders (JD-123, SM-456, TR-789, KL-012) - using project_id and stencil

Execution time: <2 seconds
Idempotency: Safe to retry (ON CONFLICT DO NOTHING)
Security: SECURITY DEFINER (bypasses RLS for skeleton creation)

Called by: demo-signup Edge Function
Followed by: populate-demo-data Edge Function (async bulk population)
';
