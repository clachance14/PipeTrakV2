-- ============================================================================
-- Migration: Add unique partial index to enforce single active budget per project
-- PR Review: CodeRabbit identified potential race condition in trigger-only approach
-- ============================================================================

-- This unique partial index provides database-level enforcement of the
-- single-active-budget-per-project constraint, preventing race conditions
-- that could occur with concurrent budget creations.

-- The trigger in 20251204162348_create_manhour_budgets.sql remains for
-- application convenience (auto-deactivating old budgets), but this index
-- provides the authoritative constraint.

CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_budget_per_project
ON project_manhour_budgets(project_id)
WHERE is_active = true;

COMMENT ON INDEX idx_single_active_budget_per_project IS
  'Enforces single active budget per project at database level, preventing race conditions';
