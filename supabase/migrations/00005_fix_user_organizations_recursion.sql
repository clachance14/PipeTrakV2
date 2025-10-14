-- Migration: Fix infinite recursion in user_organizations RLS policies
-- Issue: SELECT policy on user_organizations queries same table, causing recursion during registration
-- Solution: Use SECURITY DEFINER function to check membership without triggering RLS

-- =====================================================
-- 1. Create helper function to check membership
-- =====================================================

-- This function bypasses RLS to check if user is member of organization
-- Prevents recursion by using SECURITY DEFINER to skip policy evaluation
CREATE OR REPLACE FUNCTION user_is_org_member(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = user_uuid
      AND organization_id = org_uuid
      AND deleted_at IS NULL
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION user_is_org_member(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION user_is_org_member(UUID, UUID) IS
  'Checks if user is member of organization, bypassing RLS to prevent infinite recursion';

-- =====================================================
-- 2. Replace recursive policy on user_organizations
-- =====================================================

-- Drop the recursive policy that was causing the issue
DROP POLICY IF EXISTS "Users can view org members" ON user_organizations;

-- Create non-recursive version using SECURITY DEFINER function
CREATE POLICY "Users can view org members"
  ON user_organizations FOR SELECT
  USING (
    deleted_at IS NULL
    AND user_is_org_member(auth.uid(), organization_id)
  );

COMMENT ON POLICY "Users can view org members" ON user_organizations IS
  'Allows users to see other members in organizations they belong to (uses SECURITY DEFINER to avoid recursion)';

-- =====================================================
-- 3. Update organizations policy for consistency
-- =====================================================

-- Also update organizations policy to use the same helper function
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;

CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    deleted_at IS NULL
    AND user_is_org_member(auth.uid(), id)
  );

COMMENT ON POLICY "Users can view their organizations" ON organizations IS
  'Allows users to view organizations they are members of (uses SECURITY DEFINER to avoid recursion)';
