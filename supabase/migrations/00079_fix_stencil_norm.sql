-- Fix create_demo_skeleton to manually set stencil_norm
-- Feature: 023-demo-data-population
-- Issue: stencil_norm is NOT NULL but trigger may not be firing

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
  -- Manually set both stencil and stencil_norm (normalized version)
  INSERT INTO welders (project_id, stencil, stencil_norm, name)
  VALUES
    (p_project_id, 'JD-123', 'jd123', 'John Davis'),
    (p_project_id, 'SM-456', 'sm456', 'Sarah Miller'),
    (p_project_id, 'TR-789', 'tr789', 'Tom Rodriguez'),
    (p_project_id, 'KL-012', 'kl012', 'Kim Lee')
  ON CONFLICT (project_id, stencil_norm) DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
