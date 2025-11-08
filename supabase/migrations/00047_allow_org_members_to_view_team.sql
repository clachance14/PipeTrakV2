-- Migration: Allow users to view other members in their organization
-- Date: 2025-10-27
-- Issue: Admin users can't see team members because RLS only allows viewing own record
-- Solution: Create helper function and update policy to allow viewing org members

-- Create helper function to get current user's organization (bypasses RLS)
CREATE OR REPLACE FUNCTION get_current_user_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id
    FROM users
    WHERE id = auth.uid()
    AND organization_id IS NOT NULL
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_current_user_org_id() IS
  'Returns the organization_id of the current authenticated user. Uses SECURITY DEFINER to bypass RLS.';

-- Update RLS policy to allow viewing org members
DROP POLICY IF EXISTS "Users read policy" ON users;

CREATE POLICY "Users read policy"
  ON users FOR SELECT
  USING (
    is_super_admin()                                    -- Super admins see all
    OR id = auth.uid()                                  -- Users see their own record
    OR (                                                -- Users see others in their org
      auth.uid() IS NOT NULL                            -- User is authenticated
      AND organization_id IS NOT NULL                   -- Target user has an organization
      AND organization_id = get_current_user_org_id()   -- Same org as current user
    )
  );

COMMENT ON POLICY "Users read policy" ON users IS
  'Super admins see all users; authenticated users see their own record and all users in their organization';
