-- Migration: Fix Field Welds RLS for Service Role
-- Description: Allow service-role operations (imports, demo population) to bypass RLS checks
-- Author: Claude Code
-- Date: 2025-11-20
--
-- Problem: The weld completion trigger is SECURITY DEFINER but RLS blocks the UPDATE
--          before the trigger fires when service-role makes the update (auth.uid() = NULL)
--
-- Solution: Add service-role exemption to UPDATE policy so imports can update field_welds

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update field_welds if they have permission" ON field_welds;

-- Recreate UPDATE policy with service-role exemption
CREATE POLICY "Users can update field_welds if they have permission"
ON field_welds FOR UPDATE
USING (
  -- Allow service-role operations (imports, demo population)
  auth.role() = 'service_role'
  OR
  -- Allow authenticated users with proper permissions
  (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector')
    )
  )
);

COMMENT ON POLICY "Users can update field_welds if they have permission" ON field_welds IS
'Allows updates from: (1) service-role for imports/demo population, or (2) authenticated users with permission in their organization';

-- =====================================================
-- Also fix needs_review INSERT policy for trigger
-- =====================================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert needs_review in their organization" ON needs_review;

-- Recreate INSERT policy with service-role exemption
CREATE POLICY "Users can insert needs_review in their organization"
ON needs_review FOR INSERT
WITH CHECK (
  -- Allow service-role operations (trigger inserts from imports/demo)
  auth.role() = 'service_role'
  OR
  -- Allow authenticated users in their organization
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

COMMENT ON POLICY "Users can insert needs_review in their organization" ON needs_review IS
'Allows inserts from: (1) service-role for trigger-generated reviews, or (2) authenticated users in their organization';
