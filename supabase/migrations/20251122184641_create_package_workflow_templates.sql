-- Migration: Create package_workflow_templates table
-- Purpose: Store test-type-specific workflow stage requirements
-- Feature: Test Package Workflow Logic Matrix

-- Create the template table
CREATE TABLE package_workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  default_skip_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one entry per test_type + stage_name combination
  CONSTRAINT unique_test_type_stage UNIQUE(test_type, stage_name),

  -- Validate test_type matches allowed values (same as test_packages table)
  CONSTRAINT chk_template_test_type_valid CHECK (test_type IN (
    'Sensitive Leak Test',
    'Pneumatic Test',
    'Alternative Leak Test',
    'In-service Test',
    'Hydrostatic Test',
    'Other'
  )),

  -- Validate stage_name matches allowed values (same as package_workflow_stages table)
  CONSTRAINT chk_template_stage_name_valid CHECK (stage_name IN (
    'Pre-Hydro Acceptance',
    'Test Acceptance',
    'Drain/Flush Acceptance',
    'Post-Hydro Acceptance',
    'Protective Coatings Acceptance',
    'Insulation Acceptance',
    'Final Package Acceptance'
  )),

  -- Validate stage_order is within valid range
  CONSTRAINT chk_template_stage_order_valid CHECK (stage_order BETWEEN 1 AND 7)
);

-- Indexes for fast lookups
CREATE INDEX idx_workflow_templates_test_type
  ON package_workflow_templates(test_type);

CREATE INDEX idx_workflow_templates_order
  ON package_workflow_templates(test_type, stage_order);

-- Enable RLS (REQUIRED - Top 10 Rule #3)
ALTER TABLE package_workflow_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can read templates
CREATE POLICY "Users can read workflow templates"
  ON package_workflow_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Only admins/PMs can modify templates
CREATE POLICY "Only admins can modify workflow templates"
  ON package_workflow_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'project_manager')
    )
  );

-- Add helpful comments
COMMENT ON TABLE package_workflow_templates IS
  'Defines which workflow stages apply to each test type';
COMMENT ON COLUMN package_workflow_templates.test_type IS
  'Test type this template applies to (references test_packages.test_type)';
COMMENT ON COLUMN package_workflow_templates.stage_name IS
  'Workflow stage name (references package_workflow_stages.stage_name)';
COMMENT ON COLUMN package_workflow_templates.stage_order IS
  'Display order for this stage within the test type workflow';
COMMENT ON COLUMN package_workflow_templates.is_required IS
  'Whether this stage is mandatory for the test type (future use)';
