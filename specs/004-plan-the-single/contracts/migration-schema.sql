-- Migration Contract: Single-Organization User Model
-- Feature: 004-plan-the-single
-- Date: 2025-10-07
-- Purpose: Schema changes to enforce single-organization user model

-- This is a CONTRACT file - it defines the expected schema changes
-- The actual migration will be created during implementation

-- ============================================================================
-- PRE-MIGRATION VALIDATION
-- ============================================================================

-- Validate no multi-org users exist
DO $$
DECLARE
  multi_org_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO multi_org_count
  FROM (
    SELECT user_id
    FROM user_organizations
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) subquery;

  IF multi_org_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: % users belong to multiple organizations', multi_org_count;
  END IF;
END $$;

-- Validate no orphaned users exist
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM users u
  LEFT JOIN user_organizations uo ON u.id = uo.user_id
  WHERE uo.user_id IS NULL;

  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: % users have no organization', orphaned_count;
  END IF;
END $$;

-- ============================================================================
-- SCHEMA MODIFICATIONS
-- ============================================================================

-- Add new columns to users table (nullable initially for data migration)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector', 'welder', 'viewer'));

-- Migrate data from user_organizations to users
UPDATE users u
SET
  organization_id = uo.organization_id,
  role = uo.role
FROM user_organizations uo
WHERE u.id = uo.user_id;

-- Validate all users now have organization
DO $$
DECLARE
  null_org_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_org_count
  FROM users
  WHERE organization_id IS NULL OR role IS NULL;

  IF null_org_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % users still without organization or role', null_org_count;
  END IF;
END $$;

-- Make columns NOT NULL after data migration
ALTER TABLE users
ALTER COLUMN organization_id SET NOT NULL,
ALTER COLUMN role SET NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Drop the junction table
DROP TABLE IF EXISTS user_organizations;

-- ============================================================================
-- RLS POLICY UPDATES
-- ============================================================================

-- Drop old policies that referenced user_organizations
DROP POLICY IF EXISTS "Users can read own memberships" ON user_organizations;
DROP POLICY IF EXISTS "Users can read own organization" ON organizations;
DROP POLICY IF EXISTS "Users can read own org projects" ON projects;

-- Create new policies using direct organization relationship

-- users table policies
CREATE POLICY "Users can read own record"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- organizations table policies
CREATE POLICY "Users can read own organization"
  ON organizations FOR SELECT
  USING (id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- projects table policies
CREATE POLICY "Users can read own org projects"
  ON projects FOR SELECT
  USING (organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- invitations table policies (validation for single-org)
CREATE POLICY "Users can create invitations for own org"
  ON invitations FOR INSERT
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view invitations for own org"
  ON invitations FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- POST-MIGRATION VALIDATION
-- ============================================================================

-- Verify all users have organization
DO $$
DECLARE
  null_org_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_org_count
  FROM users
  WHERE organization_id IS NULL;

  IF null_org_count > 0 THEN
    RAISE EXCEPTION 'Post-migration check failed: % users without organization', null_org_count;
  END IF;
END $$;

-- Verify user_organizations table no longer exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_organizations'
  ) THEN
    RAISE EXCEPTION 'Post-migration check failed: user_organizations table still exists';
  END IF;
END $$;

-- Log migration success
RAISE NOTICE 'Migration to single-organization model completed successfully';
