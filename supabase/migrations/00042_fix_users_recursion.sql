-- Migration: Fix infinite recursion in users table RLS policy
-- Date: 2025-10-26
-- Issue: Users read policy queries users table within itself causing recursion
-- Solution: Remove recursive condition and keep policy simple

DROP POLICY IF EXISTS "Users read policy" ON users;

-- Simplified policy without recursion
-- During invitation acceptance, we use the secure RPC function instead of querying users
CREATE POLICY "Users read policy"
  ON users FOR SELECT
  USING (
    is_super_admin()           -- Super admins see all
    OR id = auth.uid()         -- Users see their own record
  );

COMMENT ON POLICY "Users read policy" ON users IS
  'Super admins see all users; authenticated users see their own record. Use check_email_has_organization() for invitation validation.';
