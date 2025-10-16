-- Fix missing RLS policies for projects table
-- Issue: Only SELECT policy exists, blocking all INSERT/UPDATE/DELETE operations
-- Note: Using users.organization_id (single-org schema) instead of user_organizations junction table

-- Allow users to INSERT projects for their organization
CREATE POLICY "Users can create projects in own org"
  ON projects FOR INSERT
  WITH CHECK (organization_id = (
    SELECT organization_id FROM users
    WHERE id = auth.uid()
  ));

-- Allow users to UPDATE projects in their organization
CREATE POLICY "Users can update own org projects"
  ON projects FOR UPDATE
  USING (organization_id = (
    SELECT organization_id FROM users
    WHERE id = auth.uid()
  ));

-- Allow users to DELETE projects in their organization
CREATE POLICY "Users can delete own org projects"
  ON projects FOR DELETE
  USING (organization_id = (
    SELECT organization_id FROM users
    WHERE id = auth.uid()
  ));
