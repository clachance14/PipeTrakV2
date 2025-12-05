-- Migration: Create project_manhour_budgets table
-- Feature: 032-manhour-earned-value
-- Description: Versioned manhour budget records per project with RLS and single-active trigger
--
-- Prerequisites: Migration 20251204162330 must be applied (manhour columns exist)

-- ============================================================================
-- PART 1: CREATE TABLE
-- ============================================================================

CREATE TABLE project_manhour_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  total_budgeted_manhours NUMERIC(12,2) NOT NULL CHECK (total_budgeted_manhours > 0),
  revision_reason TEXT NOT NULL,
  effective_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Only one version per project
  UNIQUE (project_id, version_number)
);

COMMENT ON TABLE project_manhour_budgets IS 'Versioned manhour budget records for projects with audit history (Feature 032)';
COMMENT ON COLUMN project_manhour_budgets.version_number IS 'Sequential version (1, 2, 3...) - auto-incremented on new budget creation';
COMMENT ON COLUMN project_manhour_budgets.total_budgeted_manhours IS 'Total manhours budgeted for the project (must be > 0)';
COMMENT ON COLUMN project_manhour_budgets.revision_reason IS 'Reason for budget creation (e.g., "Original estimate", "Change order #CO-042")';
COMMENT ON COLUMN project_manhour_budgets.effective_date IS 'Date when this budget becomes effective (baseline date for component additions)';
COMMENT ON COLUMN project_manhour_budgets.is_active IS 'Only one budget per project can be active (enforced by trigger)';

-- ============================================================================
-- PART 2: INDEXES
-- ============================================================================

-- Index for active budget lookup (most common query pattern)
CREATE INDEX idx_manhour_budgets_project_active
ON project_manhour_budgets(project_id) WHERE is_active = true;

-- Index for all budgets by project (for version history)
CREATE INDEX idx_manhour_budgets_project
ON project_manhour_budgets(project_id, version_number DESC);

-- ============================================================================
-- PART 3: SINGLE ACTIVE BUDGET TRIGGER
-- ============================================================================

-- Ensure only one budget is active per project
CREATE OR REPLACE FUNCTION ensure_single_active_budget()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate any existing active budget for this project
    UPDATE project_manhour_budgets
    SET is_active = false
    WHERE project_id = NEW.project_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_single_active_budget
BEFORE INSERT OR UPDATE ON project_manhour_budgets
FOR EACH ROW
EXECUTE FUNCTION ensure_single_active_budget();

COMMENT ON FUNCTION ensure_single_active_budget IS 'Ensures only one manhour budget is active per project at any time';

-- ============================================================================
-- PART 4: RLS POLICIES
-- ============================================================================

ALTER TABLE project_manhour_budgets ENABLE ROW LEVEL SECURITY;

-- SELECT: Users in the same organization can view budgets
-- (Financial visibility is enforced at application layer for Owner/Admin/PM)
CREATE POLICY "Users can view budgets in their organization"
ON project_manhour_budgets FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- INSERT: Users with manage_projects permission can create budgets
-- (Further role restriction enforced in RPC SECURITY DEFINER)
CREATE POLICY "Users can create budgets in their organization"
ON project_manhour_budgets FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- UPDATE: Users with manage_projects permission can update budgets
-- (Only is_active should be updated in practice; budget revision creates new record)
CREATE POLICY "Users can update budgets in their organization"
ON project_manhour_budgets FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- DELETE: Budgets are never deleted (archived via is_active = false)
-- No DELETE policy needed

-- ============================================================================
-- MIGRATION COMPLETE: 20251204162348_create_manhour_budgets.sql
-- ============================================================================
-- Tables created: 1 (project_manhour_budgets)
-- Indexes created: 2 (project_active, project_version)
-- Triggers created: 1 (ensure_single_active_budget)
-- RLS policies: 3 (SELECT, INSERT, UPDATE)
-- Next migration: 20251204162350_manhour_create_budget_rpc.sql
-- ============================================================================
