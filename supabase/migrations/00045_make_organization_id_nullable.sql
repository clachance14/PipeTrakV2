-- Migration: Make organization_id nullable for invitation flow
-- Date: 2025-10-27
-- Issue: Users can't be created during invitation acceptance because organization_id is NOT NULL
-- Solution: Make organization_id nullable, users get organization when accepting invitation

-- Allow organization_id to be null (users will have no org until they accept an invitation)
ALTER TABLE users ALTER COLUMN organization_id DROP NOT NULL;

COMMENT ON COLUMN users.organization_id IS
  'Organization the user belongs to. NULL for users who have not yet accepted an invitation. Set when invitation is accepted.';
