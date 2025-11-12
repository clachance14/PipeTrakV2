-- Add soft delete capability to projects table
ALTER TABLE projects
ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;

-- Add index for query performance
CREATE INDEX idx_projects_deleted_at
ON projects(deleted_at);

-- Add comment documenting soft delete pattern
COMMENT ON COLUMN projects.deleted_at IS
'Soft delete timestamp. NULL = active, NOT NULL = archived. Archived projects hidden from UI but recoverable.';

-- Update all SELECT policies to filter archived projects
-- Policy: Users can view projects in their organization
DROP POLICY IF EXISTS "Users can view projects in their organization" ON projects;
CREATE POLICY "Users can view projects in their organization"
ON projects
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
  AND deleted_at IS NULL
);

-- Policy: Users can update projects in their organization
DROP POLICY IF EXISTS "Users can update projects in their organization" ON projects;
CREATE POLICY "Users can update projects in their organization"
ON projects
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
  AND deleted_at IS NULL
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);
