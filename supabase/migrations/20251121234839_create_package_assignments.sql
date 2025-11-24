-- Migration 00124: Create package assignment tables
-- Purpose: Link packages to drawings and components
-- Feature: 030-test-package-workflow

-- Create package_drawing_assignments table
CREATE TABLE IF NOT EXISTS package_drawing_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES test_packages(id) ON DELETE CASCADE,
  drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(package_id, drawing_id)
);

-- Indexes for package_drawing_assignments
CREATE INDEX IF NOT EXISTS idx_package_drawing_assignments_package_id ON package_drawing_assignments(package_id);
CREATE INDEX IF NOT EXISTS idx_package_drawing_assignments_drawing_id ON package_drawing_assignments(drawing_id);

-- RLS Policies for package_drawing_assignments
ALTER TABLE package_drawing_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view drawing assignments in their organization" ON package_drawing_assignments;
DROP POLICY IF EXISTS "Users can insert drawing assignments in their organization" ON package_drawing_assignments;
DROP POLICY IF EXISTS "Users can delete drawing assignments in their organization" ON package_drawing_assignments;

CREATE POLICY "Users can view drawing assignments in their organization"
ON package_drawing_assignments FOR SELECT
USING (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert drawing assignments in their organization"
ON package_drawing_assignments FOR INSERT
WITH CHECK (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete drawing assignments in their organization"
ON package_drawing_assignments FOR DELETE
USING (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- Create package_component_assignments table
CREATE TABLE IF NOT EXISTS package_component_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES test_packages(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(package_id, component_id)
);

-- Indexes for package_component_assignments
CREATE INDEX IF NOT EXISTS idx_package_component_assignments_package_id ON package_component_assignments(package_id);
CREATE INDEX IF NOT EXISTS idx_package_component_assignments_component_id ON package_component_assignments(component_id);

-- RLS Policies for package_component_assignments
ALTER TABLE package_component_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view component assignments in their organization" ON package_component_assignments;
DROP POLICY IF EXISTS "Users can insert component assignments in their organization" ON package_component_assignments;
DROP POLICY IF EXISTS "Users can delete component assignments in their organization" ON package_component_assignments;

CREATE POLICY "Users can view component assignments in their organization"
ON package_component_assignments FOR SELECT
USING (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert component assignments in their organization"
ON package_component_assignments FOR INSERT
WITH CHECK (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete component assignments in their organization"
ON package_component_assignments FOR DELETE
USING (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);
