-- Migration: Make role nullable for invitation flow
-- Date: 2025-10-27
-- Issue: Users can't be created because role is NOT NULL but not set until invitation acceptance
-- Solution: Make role nullable, role is set when invitation is accepted

ALTER TABLE users ALTER COLUMN role DROP NOT NULL;

COMMENT ON COLUMN users.role IS
  'User role in their organization. NULL for users who have not yet accepted an invitation. Set when invitation is accepted.';
