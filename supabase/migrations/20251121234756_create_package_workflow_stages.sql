-- Migration 00123: Create package_workflow_stages table
-- Purpose: Track 7-stage sequential workflow with sign-offs
-- Feature: 030-test-package-workflow

-- Create package_workflow_stages table
CREATE TABLE IF NOT EXISTS package_workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES test_packages(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  stage_data JSONB,
  signoffs JSONB,
  skip_reason TEXT,
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_package_workflow_stages_package_id ON package_workflow_stages(package_id);
CREATE INDEX IF NOT EXISTS idx_package_workflow_stages_status ON package_workflow_stages(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_package_workflow_stages_unique ON package_workflow_stages(package_id, stage_name);

-- Constraints
ALTER TABLE package_workflow_stages
DROP CONSTRAINT IF EXISTS chk_stage_name_valid;
ALTER TABLE package_workflow_stages
ADD CONSTRAINT chk_stage_name_valid CHECK (stage_name IN (
  'Pre-Hydro Acceptance',
  'Test Acceptance',
  'Drain/Flush Acceptance',
  'Post-Hydro Acceptance',
  'Protective Coatings Acceptance',
  'Insulation Acceptance',
  'Final Package Acceptance'
));

ALTER TABLE package_workflow_stages
DROP CONSTRAINT IF EXISTS chk_stage_order_valid;
ALTER TABLE package_workflow_stages
ADD CONSTRAINT chk_stage_order_valid CHECK (stage_order BETWEEN 1 AND 7);

ALTER TABLE package_workflow_stages
DROP CONSTRAINT IF EXISTS chk_status_valid;
ALTER TABLE package_workflow_stages
ADD CONSTRAINT chk_status_valid CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped'));

ALTER TABLE package_workflow_stages
DROP CONSTRAINT IF EXISTS chk_skip_reason_required;
ALTER TABLE package_workflow_stages
ADD CONSTRAINT chk_skip_reason_required CHECK (
  (status = 'skipped' AND skip_reason IS NOT NULL AND length(trim(skip_reason)) > 0)
  OR status != 'skipped'
);

ALTER TABLE package_workflow_stages
DROP CONSTRAINT IF EXISTS chk_completed_at_with_completed_by;
ALTER TABLE package_workflow_stages
ADD CONSTRAINT chk_completed_at_with_completed_by CHECK (
  (completed_at IS NOT NULL AND completed_by IS NOT NULL)
  OR (completed_at IS NULL AND completed_by IS NULL)
);

-- RLS Policies
ALTER TABLE package_workflow_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view workflow stages in their organization" ON package_workflow_stages;
DROP POLICY IF EXISTS "Users can insert workflow stages in their organization" ON package_workflow_stages;
DROP POLICY IF EXISTS "Users can update workflow stages in their organization" ON package_workflow_stages;

CREATE POLICY "Users can view workflow stages in their organization"
ON package_workflow_stages FOR SELECT
USING (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert workflow stages in their organization"
ON package_workflow_stages FOR INSERT
WITH CHECK (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update workflow stages in their organization"
ON package_workflow_stages FOR UPDATE
USING (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- Auto-update updated_at timestamp (reuse function from package_certificates)
DROP TRIGGER IF EXISTS update_package_workflow_stage_updated_at ON package_workflow_stages;

CREATE TRIGGER update_package_workflow_stage_updated_at
BEFORE UPDATE ON package_workflow_stages
FOR EACH ROW
EXECUTE FUNCTION update_package_certificate_updated_at();
