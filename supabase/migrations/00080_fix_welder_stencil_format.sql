-- Fix create_demo_skeleton to use correct stencil format
-- Feature: 023-demo-data-population
-- Issue: Stencil format must match pattern (appears to be LETTER-NUMBER based on existing data)

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
  -- Use format matching existing pattern: LETTER-NUMBER
  INSERT INTO welders (project_id, stencil, stencil_norm, name)
  VALUES
    (p_project_id, 'JD-123', 'JD-123', 'John Davis'),
    (p_project_id, 'SM-456', 'SM-456', 'Sarah Miller'),
    (p_project_id, 'TR-789', 'TR-789', 'Tom Rodriguez'),
    (p_project_id, 'KL-012', 'KL-012', 'Kim Lee')
  ON CONFLICT (project_id, stencil_norm) DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
