-- Migration: Allow admins and owners to update users in same organization
-- Date: 2025-11-05
-- Issue: Remove Member functionality fails because RLS blocks admin/owner from soft-deleting users
-- Root Cause: Current UPDATE policy only allows id = auth.uid() (self-update only)
-- Solution: Add policy allowing owners/admins to update members in same organization

-- Add policy for admins/owners to update users in their organization
CREATE POLICY "Owners and admins can update members in same org"
  ON users FOR UPDATE
  USING (
    -- Allow if user is owner or admin in the same organization as target user
    get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  )
  WITH CHECK (
    -- Ensure updated user stays in same organization
    get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

COMMENT ON POLICY "Owners and admins can update members in same org" ON users IS
  'Allows organization owners and admins to update user records in their organization (e.g., soft delete via deleted_at, role changes). This enables the Remove Member functionality.';
