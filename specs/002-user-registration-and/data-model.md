# Data Model: User Registration & Team Onboarding

**Feature**: 002-user-registration-and
**Date**: 2025-10-04
**Source**: Extracted from spec.md Key Entities + research.md decisions

## Entity Relationship Diagram

```
┌─────────────────┐
│  organizations  │
│  (Sprint 0)     │
├─────────────────┤
│ id (PK)         │
│ name            │
│ created_at      │
│ deleted_at      │◄──┐
│ deleted_by      │   │
└─────────────────┘   │
         △            │
         │            │
         │            │
┌────────┴──────────┐ │
│ user_organizations│ │
│  (Sprint 0 +      │ │
│   role added)     │ │
├───────────────────┤ │
│ id (PK)           │ │
│ user_id (FK)      │ │
│ organization_id   │ │
│   (FK)            │ │
│ role (NEW)        │ │
│ created_at        │ │
│ deleted_at (NEW)  │─┘
└───────────────────┘
         △
         │
         │
┌────────┴──────────┐
│      users        │
│  (Supabase Auth)  │
├───────────────────┤
│ id (PK)           │
│ email             │
│ encrypted_password│
│ full_name (meta)  │
│ created_at        │
└───────────────────┘
         △
         │
         │
┌────────┴──────────┐
│   invitations     │
│     (NEW)         │
├───────────────────┤
│ id (PK)           │
│ organization_id   │
│   (FK)            │
│ email             │
│ role              │
│ token_hash        │
│ status            │
│ invited_by (FK)   │
│ created_at        │
│ accepted_at       │
│ expires_at        │
└───────────────────┘
```

## Entities

### 1. organizations (MODIFIED - Sprint 0 table)

**Description**: Root entity for multi-tenant isolation. Represents a construction company using PipeTrak.

**Table**: `organizations`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique organization identifier |
| name | text | NOT NULL | Organization name (non-unique per FR-007) |
| created_at | timestamptz | NOT NULL, DEFAULT NOW() | Organization creation timestamp |
| deleted_at | timestamptz | NULL | Soft delete timestamp (NEW for FR-039) |
| deleted_by | uuid | NULL, REFERENCES users(id) | User who soft-deleted org (NEW for FR-040) |

**Indexes**:
- Primary key on `id` (existing)
- Index on `deleted_at` for cleanup cron job (NEW)

**Validation Rules**:
- `name` cannot be empty string (CHECK LENGTH(name) > 0)
- `deleted_at` must be NULL or past timestamp
- `deleted_by` must be NULL if `deleted_at` IS NULL

**State Transitions**:
- Active: `deleted_at IS NULL`
- Soft Deleted: `deleted_at IS NOT NULL AND deleted_at > NOW() - INTERVAL '30 days'`
- Permanently Deleted: Database record removed (cron job after 30 days)

**RLS Policies** (UPDATED):
```sql
-- Exclude soft-deleted organizations from all queries
CREATE POLICY "Users can only access active organizations"
  ON organizations FOR SELECT
  USING (
    deleted_at IS NULL
    AND id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );
```

---

### 2. users (Supabase Auth - NO CHANGES)

**Description**: Individual users managed by Supabase Auth. PipeTrak uses auth metadata for full name.

**Table**: `auth.users` (managed by Supabase)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Supabase user ID |
| email | text | UNIQUE, NOT NULL | User email (login identifier) |
| encrypted_password | text | NOT NULL | Bcrypt hash (managed by Supabase) |
| raw_user_meta_data | jsonb | {} | Custom metadata: `{"full_name": "John Doe"}` |
| created_at | timestamptz | NOT NULL | Account creation timestamp |

**Validation Rules** (Supabase enforces):
- Email format validation (RFC 5322)
- Email uniqueness across all users
- Password minimum 6 characters (NFR-004)
- Email verification required before account activation

**PipeTrak Metadata Schema**:
```typescript
interface UserMetadata {
  full_name: string; // FR-001 requirement
}
```

---

### 3. user_organizations (MODIFIED - Sprint 0 table)

**Description**: Junction table linking users to organizations with role-based permissions. Supports multi-org membership per FR-010.

**Table**: `user_organizations`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique membership identifier |
| user_id | uuid | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | User reference |
| organization_id | uuid | NOT NULL, REFERENCES organizations(id) ON DELETE CASCADE | Organization reference |
| role | user_role | NOT NULL, DEFAULT 'viewer' | User's role in this org (NEW) |
| created_at | timestamptz | NOT NULL, DEFAULT NOW() | Membership creation timestamp |
| deleted_at | timestamptz | NULL | Soft delete timestamp (NEW for FR-039) |

**Indexes**:
- Primary key on `id` (existing)
- Unique index on `(user_id, organization_id)` WHERE `deleted_at IS NULL` (prevent duplicate active memberships)
- Index on `organization_id` for reverse lookups (existing)
- Index on `role` for role-based queries (NEW)

**Custom Types** (NEW):
```sql
CREATE TYPE user_role AS ENUM (
  'owner',           -- Full access + billing (FR-011)
  'admin',           -- Full access - billing (FR-012)
  'project_manager', -- Create/edit projects, assign work (FR-013)
  'foreman',         -- Update status, assign welders (FR-014)
  'qc_inspector',    -- Approve/reject work, add notes (FR-015)
  'welder',          -- Update assigned components (FR-016)
  'viewer'           -- Read-only access (FR-017)
);
```

**Validation Rules**:
- User cannot have duplicate roles in same organization (unique index)
- Organization must have at least one 'owner' (enforced in application logic + trigger)
- Role hierarchy enforced at RLS level (see research.md section 5)

**State Transitions**:
- Active: `deleted_at IS NULL`
- Soft Deleted: `deleted_at IS NOT NULL` (user left org or org soft-deleted per FR-039)

**RLS Policies** (UPDATED):
```sql
-- Users can view memberships in their own organizations
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

-- Only owners/admins can manage team (invite, change roles, remove)
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
```

---

### 4. invitations (NEW)

**Description**: Pending team member invitations with role assignment and token-based acceptance. Supports invitation workflow per FR-019 through FR-028.

**Table**: `invitations`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique invitation identifier |
| organization_id | uuid | NOT NULL, REFERENCES organizations(id) ON DELETE CASCADE | Target organization |
| email | text | NOT NULL | Invitee email address (not unique - can invite to multiple orgs) |
| role | user_role | NOT NULL | Role to assign upon acceptance (FR-020) |
| token_hash | text | NOT NULL, UNIQUE | SHA-256 hash of invitation token (see research.md) |
| status | invitation_status | NOT NULL, DEFAULT 'pending' | Invitation state |
| invited_by | uuid | NOT NULL, REFERENCES auth.users(id) | User who created invitation |
| created_at | timestamptz | NOT NULL, DEFAULT NOW() | Invitation creation timestamp |
| accepted_at | timestamptz | NULL | Acceptance timestamp (NULL if pending) |
| expires_at | timestamptz | NOT NULL, DEFAULT NOW() + INTERVAL '7 days' | Expiration timestamp (FR-023 - 7 days per research.md) |

**Indexes**:
- Primary key on `id`
- Unique index on `token_hash` (lookup by token, prevent duplicates)
- Index on `(organization_id, email, status)` (check for duplicate pending invites per FR-025)
- Index on `expires_at` (cleanup expired invitations)

**Custom Types** (NEW):
```sql
CREATE TYPE invitation_status AS ENUM (
  'pending',   -- Awaiting acceptance (FR-027)
  'accepted',  -- User accepted (FR-027)
  'revoked',   -- Admin/owner revoked (FR-028)
  'expired'    -- Expiration date passed (FR-023)
);
```

**Validation Rules**:
- Email format validation (CHECK email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
- Cannot invite existing organization members (application logic check)
- Unique pending invitation per (organization_id, email) pair (FR-025)
- `expires_at` must be > `created_at`
- `accepted_at` must be NULL if status != 'accepted'
- Only one pending invitation per (organization_id, email) at a time

**State Transitions**:
```
pending → accepted (user accepts invitation)
pending → revoked (admin/owner revokes)
pending → expired (expires_at < NOW() - cron job)
```

**RLS Policies** (NEW):
```sql
-- Users can view invitations they created
CREATE POLICY "Users can view invitations they sent"
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

-- Only owners/admins can create invitations
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

-- Only owners/admins can revoke invitations
CREATE POLICY "Owners and admins can revoke invitations"
  ON invitations FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND deleted_at IS NULL
    )
  );
```

**Token Security** (from research.md section 1):
- Never store raw token in database (only SHA-256 hash in `token_hash`)
- Token generation: `crypto.getRandomValues(new Uint8Array(32))` → base64url encode
- Token validation: Hash submitted token, compare with `token_hash`
- Token in email link: `https://app.pipetrak.com/accept-invitation?token={raw_token}`

---

## Database Triggers (NEW)

### 1. Prevent Last Owner Removal

**Trigger**: `prevent_last_owner_removal`
**Table**: `user_organizations`
**Event**: BEFORE UPDATE OR DELETE

```sql
CREATE OR REPLACE FUNCTION prevent_last_owner_removal()
RETURNS TRIGGER AS $$
DECLARE
  owner_count INT;
BEGIN
  -- If changing role from owner or deleting owner
  IF (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role != 'owner')
     OR (TG_OP = 'DELETE' AND OLD.role = 'owner') THEN

    -- Count remaining owners in organization
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. Auto-Expire Invitations

**Trigger**: `auto_expire_invitations`
**Schedule**: Cron job (every 1 hour)

```sql
-- Mark expired invitations (cron job, not a trigger)
UPDATE invitations
SET status = 'expired'
WHERE status = 'pending'
  AND expires_at < NOW();
```

### 3. Soft Delete Cascade

**Trigger**: `cascade_org_soft_delete`
**Table**: `organizations`
**Event**: AFTER UPDATE

```sql
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
```

---

## Migration Strategy

**Migration File**: `supabase/migrations/00002_invitations_table.sql`

**Order of Operations**:
1. Create `user_role` ENUM type
2. Create `invitation_status` ENUM type
3. Alter `organizations` table (add `deleted_at`, `deleted_by`)
4. Alter `user_organizations` table (add `role`, `deleted_at`)
5. Create `invitations` table
6. Create indexes on new columns
7. Create RLS policies (update existing, add new)
8. Create database triggers
9. Backfill existing `user_organizations` with `role = 'owner'` (data migration)

**Data Migration** (Sprint 0 organizations):
```sql
-- Assign 'owner' role to all existing user_organizations
UPDATE user_organizations
SET role = 'owner'
WHERE role IS NULL; -- Before migration, no role column exists
```

**Rollback Plan**:
- Drop `invitations` table
- Drop ENUM types (`user_role`, `invitation_status`)
- Remove columns from `organizations` and `user_organizations`
- Restore old RLS policies

---

## Type Safety (TypeScript)

**Generated Types** (via `npx supabase gen types typescript --linked`):

```typescript
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
      }
      user_organizations: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          role: 'owner' | 'admin' | 'project_manager' | 'foreman' | 'qc_inspector' | 'welder' | 'viewer'
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          role?: 'owner' | 'admin' | 'project_manager' | 'foreman' | 'qc_inspector' | 'welder' | 'viewer'
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          role?: 'owner' | 'admin' | 'project_manager' | 'foreman' | 'qc_inspector' | 'welder' | 'viewer'
          created_at?: string
          deleted_at?: string | null
        }
      }
      invitations: {
        Row: {
          id: string
          organization_id: string
          email: string
          role: 'owner' | 'admin' | 'project_manager' | 'foreman' | 'qc_inspector' | 'welder' | 'viewer'
          token_hash: string
          status: 'pending' | 'accepted' | 'revoked' | 'expired'
          invited_by: string
          created_at: string
          accepted_at: string | null
          expires_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          role: 'owner' | 'admin' | 'project_manager' | 'foreman' | 'qc_inspector' | 'welder' | 'viewer'
          token_hash: string
          status?: 'pending' | 'accepted' | 'revoked' | 'expired'
          invited_by: string
          created_at?: string
          accepted_at?: string | null
          expires_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          role?: 'owner' | 'admin' | 'project_manager' | 'foreman' | 'qc_inspector' | 'welder' | 'viewer'
          token_hash?: string
          status?: 'pending' | 'accepted' | 'revoked' | 'expired'
          invited_by?: string
          created_at?: string
          accepted_at?: string | null
          expires_at?: string
        }
      }
    }
  }
}

export type UserRole = Database['public']['Tables']['user_organizations']['Row']['role']
export type InvitationStatus = Database['public']['Tables']['invitations']['Row']['status']
```

---

## Capacity Planning

**Scale**: ~50 users per organization (NFR-003)

**Estimated Row Counts** (per organization):
- `organizations`: 1 row
- `user_organizations`: ~50 rows (1 per user)
- `invitations`: ~20 rows (active + historical)

**Query Performance Targets**:
- Fetch user organizations: <50ms (indexed on `user_id`)
- Validate invitation token: <100ms (indexed on `token_hash`, SHA-256 lookup)
- List team members: <200ms (indexed on `organization_id`, ~50 rows)

**Indexes Required** (summary):
- `user_organizations(user_id)` - existing
- `user_organizations(organization_id)` - existing
- `user_organizations(role)` - NEW
- `invitations(token_hash)` - NEW, UNIQUE
- `invitations(organization_id, email, status)` - NEW
- `organizations(deleted_at)` - NEW

---

**Next Phase**: Generate API contracts from functional requirements in spec.md.
