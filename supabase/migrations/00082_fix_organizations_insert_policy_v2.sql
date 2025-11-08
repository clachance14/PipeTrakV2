-- Migration: Fix organizations INSERT policy for authenticated users
-- Issue: Users getting RLS error when creating organizations during registration
-- Root Cause: INSERT policy might be missing or incorrectly configured
--
-- This migration ensures authenticated users can create organizations

-- ==============================================================================
-- 1. CHECK CURRENT POLICIES
-- ==============================================================================

-- First, let's see what policies currently exist
DO $$
BEGIN
  RAISE NOTICE 'Current policies on organizations table:';
END $$;

SELECT policyname, cmd, roles::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'organizations'
ORDER BY cmd, policyname;

-- ==============================================================================
-- 2. DROP EXISTING INSERT POLICIES
-- ==============================================================================

DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can create organizations" ON organizations;

-- ==============================================================================
-- 3. CREATE NEW INSERT POLICY
-- ==============================================================================

CREATE POLICY "allow_authenticated_insert_organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON POLICY "allow_authenticated_insert_organizations" ON organizations IS
  'Allows any authenticated user to create an organization during registration.';

-- ==============================================================================
-- 4. VERIFY RLS IS ENABLED
-- ==============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 5. VERIFICATION
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration complete. Verify with:';
  RAISE NOTICE 'SELECT policyname, cmd FROM pg_policies WHERE tablename = ''organizations'' AND cmd = ''INSERT'';';
END $$;
