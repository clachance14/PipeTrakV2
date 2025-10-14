# Data Model: Single-Organization User Model

**Feature**: 004-plan-the-single
**Date**: 2025-10-07

## Schema Changes

### Modified Tables

#### `users` (Modified)

**Changes**:
- ADD `organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT`
- ADD `role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector', 'welder', 'viewer'))`
- ADD INDEX `idx_users_organization_id ON users(organization_id)`
- ADD INDEX `idx_users_role ON users(role)`

**New Schema**:
```sql
TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector', 'welder', 'viewer')),
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_role ON users(role);
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

**Relationships**:
- **Many-to-One with organizations**: Each user belongs to exactly one organization
- **One with auth.users**: Extends Supabase Auth users table
- **One-to-Many with invitations** (as creator): User can create invitations
- **One-to-Many with milestone_events** (future): User records progress events

**Constraints**:
- `organization_id` is NOT NULL (every user must have organization)
- `role` must be one of 7 valid roles
- ON DELETE RESTRICT prevents orphaning users if organization deleted
- Email remains globally unique across all organizations

#### `organizations` (No Schema Changes)

Existing schema unchanged. Relationship changes:
- **One-to-Many with users**: Organization has many users (direct relationship via `users.organization_id`)

**Note**: `user_organizations` junction table removed, relationship now direct.

### Dropped Tables

#### `user_organizations` (Deleted)

**Reason**: Single-org model eliminates need for junction table

**Data Preservation**:
- Migration extracts `organization_id` and `role` from this table
- Values moved to `users.organization_id` and `users.role` columns
- Table dropped after data migration complete

**Previous Schema** (for reference):
```sql
-- DEPRECATED - TO BE REMOVED
TABLE user_organizations (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, organization_id)
);
```

### Modified Tables (Invitations)

#### `invitations` (Validation Logic Changed)

**No Schema Changes**, but business logic changes:
- Must validate invitee email does NOT have existing user with organization
- Acceptance flow must be atomic (create user + assign organization + set role in single transaction)

**Validation Query** (new):
```sql
-- Check if email already has user with organization
SELECT EXISTS (
  SELECT 1 FROM users
  WHERE email = $1 AND organization_id IS NOT NULL
);
-- If true, reject invitation acceptance
```

## Entity Relationships

```
┌─────────────────┐
│  organizations  │
│  (unchanged)    │
└────────┬────────┘
         │ 1
         │
         │ N
┌────────▼────────┐
│     users       │
│  +org_id (NEW)  │◄──┐
│  +role (NEW)    │   │
└─────────────────┘   │
         │            │
         │ N          │ 1
         │            │
┌────────▼────────┐   │
│  invitations    │───┘
│  (logic change) │
└─────────────────┘

REMOVED:
┌─────────────────────┐
│ user_organizations  │ (DELETED)
│  (junction table)   │
└─────────────────────┘
```

## State Transitions

### User Registration Flow

**Before** (multi-org):
```
1. Create user in auth.users
2. Create user in public.users
3. Create user_organizations row (join org)
4. User can later join more orgs
```

**After** (single-org):
```
1. Create user in auth.users
2. Create user in public.users WITH organization_id and role
3. User permanently assigned to organization
4. Cannot join additional organizations
```

### Invitation Acceptance Flow

**Before** (multi-org):
```
1. User clicks invitation link
2. If new: create user, add to user_organizations
3. If existing: add row to user_organizations
4. User now in multiple orgs
```

**After** (single-org):
```
1. User clicks invitation link
2. Check if user exists with organization → REJECT if true
3. If user exists without organization → ERROR (invalid state)
4. If new user → create with organization_id and role
5. Single atomic operation, no multi-org possible
```

## Data Migration

### Pre-Migration Validation

```sql
-- Check 1: Verify no multi-org users
SELECT user_id, COUNT(*) as org_count
FROM user_organizations
GROUP BY user_id
HAVING COUNT(*) > 1;
-- Must return 0 rows

-- Check 2: Verify no orphaned users
SELECT u.id, u.email
FROM users u
LEFT JOIN user_organizations uo ON u.id = uo.user_id
WHERE uo.user_id IS NULL;
-- Must return 0 rows

-- Check 3: Verify all users have exactly 1 org
SELECT COUNT(DISTINCT user_id) as total_users,
       COUNT(*) as total_memberships
FROM user_organizations;
-- Both counts must be equal
```

### Migration Script (Conceptual)

```sql
-- Step 1: Add new columns (nullable initially)
ALTER TABLE users
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
ADD COLUMN role TEXT CHECK (role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector', 'welder', 'viewer'));

-- Step 2: Migrate data from user_organizations
UPDATE users u
SET
  organization_id = uo.organization_id,
  role = uo.role
FROM user_organizations uo
WHERE u.id = uo.user_id;

-- Step 3: Verify migration (all users have organization)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'Migration failed: users without organization found';
  END IF;
END $$;

-- Step 4: Make columns NOT NULL
ALTER TABLE users
ALTER COLUMN organization_id SET NOT NULL,
ALTER COLUMN role SET NOT NULL;

-- Step 5: Add indexes
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_role ON users(role);

-- Step 6: Drop old table
DROP TABLE user_organizations;

-- Step 7: Update RLS policies (see next section)
```

## RLS Policy Updates

### users Table

**Before**:
```sql
CREATE POLICY "Users can read own memberships"
  ON user_organizations FOR SELECT
  USING (user_id = auth.uid());
```

**After**:
```sql
-- No separate policy needed - users can read own record
CREATE POLICY "Users can read own record"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));
-- Note: Cannot change organization_id
```

### organizations Table

**Before**:
```sql
CREATE POLICY "Users can read own organization"
  ON organizations FOR SELECT
  USING (id IN (
    SELECT organization_id FROM user_organizations
    WHERE user_id = auth.uid()
  ));
```

**After**:
```sql
CREATE POLICY "Users can read own organization"
  ON organizations FOR SELECT
  USING (id = (
    SELECT organization_id FROM users
    WHERE id = auth.uid()
  ));
```

### projects Table

**Before**:
```sql
CREATE POLICY "Users can read own org projects"
  ON projects FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations
    WHERE user_id = auth.uid()
  ));
```

**After**:
```sql
CREATE POLICY "Users can read own org projects"
  ON projects FOR SELECT
  USING (organization_id = (
    SELECT organization_id FROM users
    WHERE id = auth.uid()
  ));
```

### invitations Table (New Validation)

**After** (add constraint):
```sql
CREATE POLICY "Users can create invitations for own org"
  ON invitations FOR INSERT
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view invitations for own org"
  ON invitations FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
    )
  );
```

## Validation Rules

### User Creation
- `email` must be unique globally
- `organization_id` must reference existing organization
- `role` must be one of 7 valid values
- `organization_id` and `role` must both be set (NOT NULL)

### User Update
- `email` can be updated (if unique)
- `organization_id` CANNOT be changed after creation
- `role` can be changed by organization owner/admin only
- `full_name`, `terms_accepted_at` can be updated by user

### Invitation Acceptance
- Email must NOT have existing user with organization
- Organization must exist
- Role must be valid
- Token must not be expired
- Acceptance creates user with organization atomically

## TypeScript Types

Expected generated types after migration:

```typescript
// Generated by: npx supabase gen types typescript --linked

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string; // uuid
          email: string;
          full_name: string | null;
          organization_id: string; // uuid, NOT NULL
          role: 'owner' | 'admin' | 'project_manager' | 'foreman' | 'qc_inspector' | 'welder' | 'viewer';
          terms_accepted_at: string | null; // timestamptz
          terms_version: string | null;
          created_at: string; // timestamptz
          updated_at: string; // timestamptz
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          organization_id: string; // REQUIRED
          role: 'owner' | 'admin' | 'project_manager' | 'foreman' | 'qc_inspector' | 'welder' | 'viewer'; // REQUIRED
          terms_accepted_at?: string | null;
          terms_version?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          // organization_id NOT updateable
          role?: 'owner' | 'admin' | 'project_manager' | 'foreman' | 'qc_inspector' | 'welder' | 'viewer';
          terms_accepted_at?: string | null;
          terms_version?: string | null;
          updated_at?: string;
        };
      };
      // user_organizations table REMOVED from types
    };
  };
};
```

## Impact Summary

### Tables Modified: 1
- `users` (+2 columns, +2 indexes)

### Tables Dropped: 1
- `user_organizations`

### RLS Policies Updated: 4+
- `users` (new policies)
- `organizations` (updated subquery)
- `projects` (updated subquery)
- `invitations` (updated validation)
- All future tables use new pattern

### Indexes Added: 2
- `idx_users_organization_id`
- `idx_users_role`

### Indexes Dropped: 3
- `idx_user_orgs_unique`
- `idx_user_orgs_org_id`
- `idx_user_organizations_user_id`

### Net Complexity: -1 table, simplified queries, better performance
