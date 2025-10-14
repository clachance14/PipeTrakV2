-- Migration: Add Super Admin with Global Access
-- Purpose: Make first user a super admin with access to all organizations
-- Requirement: Platform owner needs global access across all tenant organizations
--
-- Changes:
-- 1. Add is_super_admin column to users table
-- 2. Create helper function to check super admin status
-- 3. Update user creation trigger to mark first user as super admin
-- 4. Update ALL RLS policies to allow super admin bypass

-- ==============================================================================
-- 1. ADD SUPER ADMIN COLUMN TO USERS TABLE
-- ==============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for efficient super admin lookups
CREATE INDEX IF NOT EXISTS users_super_admin_idx
  ON public.users(is_super_admin)
  WHERE is_super_admin = TRUE;

COMMENT ON COLUMN public.users.is_super_admin IS
  'Global super admin flag. TRUE for platform owner (first user), FALSE for all tenant users. Super admins have access to all organizations.';

-- ==============================================================================
-- 2. CREATE SUPER ADMIN HELPER FUNCTION
-- ==============================================================================

-- Function to check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND is_super_admin = TRUE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

COMMENT ON FUNCTION is_super_admin() IS
  'Checks if current authenticated user is a super admin. Used in RLS policies to grant global access.';

-- ==============================================================================
-- 3. UPDATE USER CREATION TRIGGER (FIRST USER = SUPER ADMIN)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_count INT;
  is_first_user BOOLEAN;
BEGIN
  -- Check if this is the first user (super admin)
  SELECT COUNT(*) INTO user_count FROM auth.users;
  is_first_user := (user_count = 1);

  -- Create public.users record from auth.users metadata
  INSERT INTO public.users (
    id,
    email,
    full_name,
    terms_accepted_at,
    terms_version,
    is_super_admin,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamptz,
    COALESCE(NEW.raw_user_meta_data->>'terms_version', 'v1.0'),
    is_first_user,  -- TRUE for first user, FALSE for all others
    NEW.created_at,
    NOW()
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger function to auto-create public.users record from auth.users metadata on signup. First user is marked as super admin. Runs as SECURITY DEFINER to bypass RLS.';

-- ==============================================================================
-- 4. UPDATE RLS POLICIES - ORGANIZATIONS
-- ==============================================================================

-- Allow super admins to view ALL organizations
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    is_super_admin()  -- Super admin sees ALL organizations
    OR (
      deleted_at IS NULL
      AND user_is_org_member(auth.uid(), id)
    )
  );

-- Allow super admins to update ANY organization
DROP POLICY IF EXISTS "Owners can update organizations" ON organizations;
CREATE POLICY "Owners and super admins can update organizations"
  ON organizations FOR UPDATE
  USING (
    is_super_admin()  -- Super admin can update ALL
    OR get_user_org_role(auth.uid(), id) = 'owner'
  );

COMMENT ON POLICY "Users can view their organizations" ON organizations IS
  'Super admins see all organizations; regular users see only their own';

COMMENT ON POLICY "Owners and super admins can update organizations" ON organizations IS
  'Super admins can update any organization; regular users need owner role';

-- ==============================================================================
-- 5. UPDATE RLS POLICIES - USERS
-- ==============================================================================

-- Allow super admins to view ALL users
DROP POLICY IF EXISTS "Users can read own record" ON users;
CREATE POLICY "Users can read accessible records"
  ON users FOR SELECT
  USING (
    is_super_admin()  -- Super admin sees ALL users
    OR id = auth.uid()  -- Regular users see only themselves
  );

COMMENT ON POLICY "Users can read accessible records" ON users IS
  'Super admins see all users; regular users see only their own record';

-- ==============================================================================
-- 6. UPDATE RLS POLICIES - USER_ORGANIZATIONS
-- ==============================================================================

-- Allow super admins to view ALL memberships
DROP POLICY IF EXISTS "Users can view org members" ON user_organizations;
CREATE POLICY "Users can view org members"
  ON user_organizations FOR SELECT
  USING (
    is_super_admin()  -- Super admin sees ALL memberships
    OR (
      deleted_at IS NULL
      AND user_is_org_member(auth.uid(), organization_id)
    )
  );

-- Allow super admins to manage ANY membership
DROP POLICY IF EXISTS "Owners and admins can manage memberships" ON user_organizations;
CREATE POLICY "Owners, admins, and super admins can manage memberships"
  ON user_organizations FOR UPDATE
  USING (
    is_super_admin()  -- Super admin can manage ALL
    OR get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- Allow super admins to remove ANY membership
DROP POLICY IF EXISTS "Owners and admins can remove memberships" ON user_organizations;
CREATE POLICY "Owners, admins, and super admins can remove memberships"
  ON user_organizations FOR DELETE
  USING (
    is_super_admin()  -- Super admin can remove ALL
    OR get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

COMMENT ON POLICY "Users can view org members" ON user_organizations IS
  'Super admins see all memberships across all orgs; regular users see only their org members';

-- ==============================================================================
-- 7. UPDATE RLS POLICIES - PROJECTS
-- ==============================================================================

-- Allow super admins to view ALL projects
DROP POLICY IF EXISTS "Users can read own org projects" ON projects;
CREATE POLICY "Users can read accessible projects"
  ON projects FOR SELECT
  USING (
    is_super_admin()  -- Super admin sees ALL projects
    OR organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

COMMENT ON POLICY "Users can read accessible projects" ON projects IS
  'Super admins see all projects; regular users see only projects in their organizations';

-- ==============================================================================
-- 8. UPDATE RLS POLICIES - INVITATIONS
-- ==============================================================================

-- Allow super admins to view ALL invitations
DROP POLICY IF EXISTS "Owners and admins can view org invitations" ON invitations;
CREATE POLICY "Owners, admins, and super admins can view org invitations"
  ON invitations FOR SELECT
  USING (
    is_super_admin()  -- Super admin sees ALL invitations
    OR get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- Allow super admins to create invitations for ANY organization
DROP POLICY IF EXISTS "Owners and admins can create invitations" ON invitations;
CREATE POLICY "Owners, admins, and super admins can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    is_super_admin()  -- Super admin can create for ANY org
    OR get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- Allow super admins to update ANY invitation
DROP POLICY IF EXISTS "Owners and admins can update invitations" ON invitations;
CREATE POLICY "Owners, admins, and super admins can update invitations"
  ON invitations FOR UPDATE
  USING (
    is_super_admin()  -- Super admin can update ALL
    OR get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

COMMENT ON POLICY "Owners, admins, and super admins can view org invitations" ON invitations IS
  'Super admins see all invitations; owners/admins see only their org invitations';

-- ==============================================================================
-- 9. DATA MIGRATION (IF NEEDED)
-- ==============================================================================

-- If there are existing users and you want to manually mark one as super admin:
-- UPDATE users SET is_super_admin = TRUE WHERE email = 'your-email@example.com';
--
-- Note: The trigger will automatically handle first user detection for new deployments

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- Check who is super admin:
-- SELECT id, email, full_name, is_super_admin, created_at
-- FROM users
-- WHERE is_super_admin = TRUE;

-- Count super admins (should be 1):
-- SELECT COUNT(*) as super_admin_count
-- FROM users
-- WHERE is_super_admin = TRUE;
