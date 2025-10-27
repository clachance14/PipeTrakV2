-- Migration: Fix users table RLS policies for invitation acceptance
-- Date: 2025-10-26
-- Issue: Multiple conflicting SELECT policies on users table
-- Solution: Create helper function for email checks and clean up policies

-- Drop all existing SELECT policies on users table
DROP POLICY IF EXISTS "Users can read own record" ON users;
DROP POLICY IF EXISTS "Users can read accessible records" ON users;
DROP POLICY IF EXISTS "Anyone can check email existence" ON users;

-- Create helper function to check if email has organization (bypasses RLS)
CREATE OR REPLACE FUNCTION check_email_has_organization(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE email = check_email
      AND organization_id IS NOT NULL
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_email_has_organization IS
  'Securely checks if an email already has an organization (for invitation validation)';

-- Create single comprehensive SELECT policy
-- Allows:
-- 1. Super admins to see all users
-- 2. Authenticated users to see their own record
-- 3. Authenticated users to see users in their organization
CREATE POLICY "Users read policy"
  ON users FOR SELECT
  USING (
    is_super_admin()           -- Super admins see all
    OR id = auth.uid()         -- Users see their own record
    OR organization_id = (     -- Users see others in their org
      SELECT organization_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL
    )
  );

COMMENT ON POLICY "Users read policy" ON users IS
  'Super admins see all users; authenticated users see own record and org members';
