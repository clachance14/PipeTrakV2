-- Migration: Fix missing INSERT policy on organizations table
-- Issue: Organization creation fails during registration due to missing INSERT policy
-- Solution: Recreate the INSERT policy that allows authenticated users to create organizations
--
-- Root Cause: Migration 00006 updated SELECT and UPDATE policies but the INSERT policy
--             from migration 00003 was not preserved/recreated

-- ==============================================================================
-- 1. DROP ANY EXISTING INSERT POLICIES (CLEANUP)
-- ==============================================================================

DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

-- ==============================================================================
-- 2. CREATE INSERT POLICY FOR ALL AUTHENTICATED USERS
-- ==============================================================================

-- Allow any authenticated user to create an organization during registration
-- Super admins are also authenticated, so they automatically get this permission too
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON POLICY "Authenticated users can create organizations" ON organizations IS
  'Allows any authenticated user to create an organization during registration. Super admins (who are also authenticated) can create organizations for any user.';

-- ==============================================================================
-- VERIFICATION QUERY
-- ==============================================================================

-- To verify the policy exists, run:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'organizations' AND cmd = 'INSERT';
--
-- Expected result:
-- policyname: "Authenticated users can create organizations"
-- cmd: INSERT
-- qual: NULL
-- with_check: true
