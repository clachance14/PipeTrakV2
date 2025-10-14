-- Migration: User Registration & Team Onboarding
-- Feature: 002-user-registration-and
-- Tasks: T001, T002, T003

-- =====================================================
-- 1. Create ENUM types
-- =====================================================

-- User roles for RBAC (FR-008 through FR-017)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM (
      'owner',           -- Full access + billing (FR-011)
      'admin',           -- Full access - billing (FR-012)
      'project_manager', -- Create/edit projects, assign work (FR-013)
      'foreman',         -- Update status, assign welders (FR-014)
      'qc_inspector',    -- Approve/reject work, add notes (FR-015)
      'welder',          -- Update assigned components (FR-016)
      'viewer'           -- Read-only access (FR-017)
    );
  END IF;
END $$;

-- Invitation lifecycle states
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
    CREATE TYPE invitation_status AS ENUM (
      'pending',   -- Awaiting acceptance (FR-027)
      'accepted',  -- User accepted (FR-027)
      'revoked',   -- Admin/owner revoked (FR-028)
      'expired'    -- Expiration date passed (FR-023)
    );
  END IF;
END $$;

-- =====================================================
-- 2. Alter existing tables
-- =====================================================

-- Add soft delete columns to organizations (FR-039, FR-040)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'organizations' AND column_name = 'deleted_at') THEN
    ALTER TABLE organizations ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'organizations' AND column_name = 'deleted_by') THEN
    ALTER TABLE organizations ADD COLUMN deleted_by UUID NULL REFERENCES auth.users(id);
  END IF;
END $$;

-- Add role and soft delete to user_organizations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_organizations' AND column_name = 'role') THEN
    ALTER TABLE user_organizations ADD COLUMN role user_role NOT NULL DEFAULT 'viewer';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_organizations' AND column_name = 'deleted_at') THEN
    ALTER TABLE user_organizations ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;
END $$;

-- =====================================================
-- 3. Create invitations table
-- =====================================================

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  status invitation_status NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',

  -- Validation constraints
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT expires_after_creation CHECK (expires_at > created_at),
  CONSTRAINT accepted_at_only_when_accepted CHECK (
    (status = 'accepted' AND accepted_at IS NOT NULL) OR
    (status != 'accepted' AND accepted_at IS NULL)
  )
);

-- =====================================================
-- 4. Create indexes
-- =====================================================

-- Invitations indexes
CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_hash_idx ON invitations(token_hash);
CREATE INDEX IF NOT EXISTS invitations_org_email_status_idx ON invitations(organization_id, email, status);
CREATE INDEX IF NOT EXISTS invitations_expires_at_idx ON invitations(expires_at);

-- Organizations indexes
CREATE INDEX IF NOT EXISTS organizations_deleted_at_idx ON organizations(deleted_at);

-- User organizations indexes
CREATE INDEX IF NOT EXISTS user_organizations_role_idx ON user_organizations(role);
CREATE UNIQUE INDEX IF NOT EXISTS user_organizations_user_org_unique_idx
  ON user_organizations(user_id, organization_id)
  WHERE deleted_at IS NULL;

-- =====================================================
-- 5. Update RLS policies
-- =====================================================

-- Drop existing organizations policy and recreate with soft delete check
DROP POLICY IF EXISTS "Users can only access their own organizations" ON organizations;

CREATE POLICY "Users can only access active organizations"
  ON organizations FOR SELECT
  USING (
    deleted_at IS NULL
    AND id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Drop existing user_organizations policies and recreate with role checks
DROP POLICY IF EXISTS "Users can view org memberships" ON user_organizations;
DROP POLICY IF EXISTS "Users can manage org memberships" ON user_organizations;

CREATE POLICY "Users can view org memberships"
  ON user_organizations FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      user_id = auth.uid() -- Own memberships
      OR organization_id IN ( -- Other members in same org
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    )
  );

CREATE POLICY "Owners and admins can manage memberships"
  ON user_organizations FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND deleted_at IS NULL
    )
  );

CREATE POLICY "Owners and admins can remove memberships"
  ON user_organizations FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND deleted_at IS NULL
    )
  );

-- Invitations RLS policies
CREATE POLICY "Users can view invitations they sent or manage"
  ON invitations FOR SELECT
  USING (
    invited_by = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND deleted_at IS NULL
    )
  );

CREATE POLICY "Owners and admins can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND deleted_at IS NULL
    )
  );

CREATE POLICY "Owners and admins can update invitations"
  ON invitations FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND deleted_at IS NULL
    )
  );

-- =====================================================
-- 6. Create database triggers
-- =====================================================

-- Trigger: Prevent removing last owner (FR-038)
CREATE OR REPLACE FUNCTION prevent_last_owner_removal()
RETURNS TRIGGER AS $$
DECLARE
  owner_count INT;
BEGIN
  -- If changing role from owner or deleting owner
  IF (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role != 'owner')
     OR (TG_OP = 'DELETE' AND OLD.role = 'owner')
     OR (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.deleted_at IS NOT NULL) THEN

    -- Count remaining active owners in organization
    SELECT COUNT(*) INTO owner_count
    FROM user_organizations
    WHERE organization_id = OLD.organization_id
      AND role = 'owner'
      AND deleted_at IS NULL
      AND id != OLD.id;

    -- Block if this is the last owner
    IF owner_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove last owner. Transfer ownership first.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_last_owner_removal_trigger ON user_organizations;
CREATE TRIGGER prevent_last_owner_removal_trigger
  BEFORE UPDATE OR DELETE ON user_organizations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_owner_removal();

-- Trigger: Cascade organization soft delete (FR-039)
CREATE OR REPLACE FUNCTION cascade_org_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- If organization is soft-deleted
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Soft delete all user memberships
    UPDATE user_organizations
    SET deleted_at = NEW.deleted_at
    WHERE organization_id = NEW.id
      AND deleted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cascade_org_soft_delete_trigger ON organizations;
CREATE TRIGGER cascade_org_soft_delete_trigger
  AFTER UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION cascade_org_soft_delete();

-- =====================================================
-- 7. Data migration
-- =====================================================

-- Backfill existing user_organizations with 'owner' role
-- (Sprint 0 users should all be owners of their orgs)
UPDATE user_organizations
SET role = 'owner'
WHERE role = 'viewer'; -- Default value before this migration

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE invitations IS 'Team member invitations with token-based acceptance workflow';
COMMENT ON COLUMN invitations.token_hash IS 'SHA-256 hash of invitation token (never store raw token per NFR-005)';
COMMENT ON COLUMN invitations.expires_at IS 'Invitation expiration (7 days default per research.md)';
COMMENT ON TYPE user_role IS 'RBAC role hierarchy: owner > admin > project_manager > foreman > qc_inspector > welder > viewer';
COMMENT ON TYPE invitation_status IS 'Invitation lifecycle: pending → accepted/revoked/expired';
COMMENT ON FUNCTION prevent_last_owner_removal() IS 'Blocks removal of last owner, enforces ownership transfer requirement (FR-038)';
COMMENT ON FUNCTION cascade_org_soft_delete() IS 'Soft deletes all memberships when organization is soft deleted (FR-039)';
