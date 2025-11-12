-- Migration 00106: Remove redundant validation trigger
--
-- Problem: Row-level AFTER UPDATE trigger validates sum=100% after EACH individual
-- row update. When RPC function updates weights sequentially in a loop, intermediate
-- states can temporarily sum to 101% (or 99%), causing false positive validation errors.
--
-- Solution: Remove the trigger entirely. Validation is already enforced by:
-- 1. RPC function validates sum=100 BEFORE any updates (migration 00094)
-- 2. CHECK constraint enforces individual weights 0-100 (migration 00087)
-- 3. Atomic transaction ensures all-or-nothing updates
--
-- Related migrations:
-- - 00088: Created the problematic trigger
-- - 00094: RPC function with pre-update validation (sufficient)
-- - 00087: CHECK constraint on weight column (sufficient)

-- Drop the problematic row-level trigger
DROP TRIGGER IF EXISTS validate_template_weights ON project_progress_templates;

-- Keep the trigger function for now (in case other code references it)
-- It's harmless without the trigger
COMMENT ON FUNCTION validate_project_template_weights() IS
'DEPRECATED: Validation trigger removed. Use RPC function validation instead.';

-- Document the validation strategy
COMMENT ON TABLE project_progress_templates IS
'Milestone weight templates for project components. Validation enforced by update_project_template_weights() RPC before updates. Individual weights constrained 0-100 by CHECK constraint.';
