-- Migration: Fix RLS infinite recursion
-- Issue: Policies on user_organizations query user_organizations, creating circular dependency
-- Solution: Use SECURITY DEFINER function to bypass RLS checks

-- =====================================================
-- 1. Create helper function to get user's role
-- =====================================================

-- This function bypasses RLS to check user's role in an organization
CREATE OR REPLACE FUNCTION get_user_org_role(user_uuid UUID, org_uuid UUID)
RETURNS user_role AS $$
DECLARE
  user_role_result user_role;
BEGIN
  SELECT role INTO user_role_result
  FROM user_organizations
  WHERE user_id = user_uuid
    AND organization_id = org_uuid
    AND deleted_at IS NULL
  LIMIT 1;

  RETURN user_role_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_org_role(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION get_user_org_role(UUID, UUID) IS
  'Returns user role in organization, bypassing RLS to prevent recursion';

-- =====================================================
-- 2. Recreate user_organizations policies without recursion
-- =====================================================

DROP POLICY IF EXISTS "Users can view org memberships" ON user_organizations;
DROP POLICY IF EXISTS "Owners and admins can manage memberships" ON user_organizations;
DROP POLICY IF EXISTS "Owners and admins can remove memberships" ON user_organizations;

-- Allow users to view their own memberships
CREATE POLICY "Users can view own memberships"
  ON user_organizations FOR SELECT
  USING (
    deleted_at IS NULL
    AND user_id = auth.uid()
  );

-- Allow users to view other members in their organizations
-- Use a simpler approach: if they have ANY membership, they can see members of that org
CREATE POLICY "Users can view org members"
  ON user_organizations FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM user_organizations AS uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = user_organizations.organization_id
        AND uo.deleted_at IS NULL
    )
  );

-- Owners and admins can update memberships
CREATE POLICY "Owners and admins can manage memberships"
  ON user_organizations FOR UPDATE
  USING (
    get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- Owners and admins can soft-delete memberships
CREATE POLICY "Owners and admins can remove memberships"
  ON user_organizations FOR DELETE
  USING (
    get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- Allow INSERT for invitation acceptance (needs special handling)
CREATE POLICY "Users can join via invitation"
  ON user_organizations FOR INSERT
  WITH CHECK (
    user_id = auth.uid() -- Can only add yourself
  );

-- =====================================================
-- 3. Recreate organizations policies
-- =====================================================

DROP POLICY IF EXISTS "Users can only access active organizations" ON organizations;

CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM user_organizations AS uo
      WHERE uo.organization_id = organizations.id
        AND uo.user_id = auth.uid()
        AND uo.deleted_at IS NULL
    )
  );

-- Allow organization creation during registration
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (true); -- Will be linked via user_organizations INSERT

CREATE POLICY "Owners can update organizations"
  ON organizations FOR UPDATE
  USING (
    get_user_org_role(auth.uid(), id) = 'owner'
  );

-- =====================================================
-- 4. Recreate invitations policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view invitations they sent or manage" ON invitations;
DROP POLICY IF EXISTS "Owners and admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Owners and admins can update invitations" ON invitations;

-- Anyone can view invitations they sent
CREATE POLICY "Users can view invitations they sent"
  ON invitations FOR SELECT
  USING (
    invited_by = auth.uid()
  );

-- Owners and admins can view all org invitations
CREATE POLICY "Owners and admins can view org invitations"
  ON invitations FOR SELECT
  USING (
    get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- Owners and admins can create invitations
CREATE POLICY "Owners and admins can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- Owners and admins can update invitations (resend, revoke)
CREATE POLICY "Owners and admins can update invitations"
  ON invitations FOR UPDATE
  USING (
    get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- Allow anyone to view invitation by token (for acceptance page)
-- This is handled in application layer by querying with token_hash directly
-- No additional policy needed as validation happens in app code

-- =====================================================
-- 5. Comments
-- =====================================================

COMMENT ON POLICY "Users can view own memberships" ON user_organizations IS
  'Allows users to see their own organization memberships';

COMMENT ON POLICY "Users can view org members" ON user_organizations IS
  'Allows users to see other members in organizations they belong to (fixes recursion)';

COMMENT ON POLICY "Users can join via invitation" ON user_organizations IS
  'Allows users to create membership records when accepting invitations';
