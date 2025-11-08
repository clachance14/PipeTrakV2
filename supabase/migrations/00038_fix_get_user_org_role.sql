-- Migration: Fix get_user_org_role function for single-org model
-- Date: 2025-10-26
-- Issue: Old function references user_organizations table that no longer exists
-- Solution: Update function to use organization_id from users table directly

-- Drop policies that depend on the function
DROP POLICY IF EXISTS "Owners and super admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Owners, admins, and super admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Owners, admins, and super admins can update invitations" ON invitations;

-- Now drop and recreate the function to work with single-org model
DROP FUNCTION IF EXISTS get_user_org_role(UUID, UUID);

CREATE OR REPLACE FUNCTION get_user_org_role(user_uuid UUID, org_uuid UUID)
RETURNS user_role AS $$
DECLARE
  user_role_result user_role;
BEGIN
  -- Query users table directly (single-org model)
  SELECT role INTO user_role_result
  FROM users
  WHERE id = user_uuid
    AND organization_id = org_uuid
    AND deleted_at IS NULL
  LIMIT 1;

  RETURN user_role_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies that use the function
CREATE POLICY "Owners can update own organization"
  ON organizations FOR UPDATE
  USING (
    get_user_org_role(auth.uid(), id) = 'owner'
  );

CREATE POLICY "Owners and admins can create invitations for own org"
  ON invitations FOR INSERT
  WITH CHECK (
    get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

CREATE POLICY "Owners and admins can update invitations for own org"
  ON invitations FOR UPDATE
  USING (
    get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );
