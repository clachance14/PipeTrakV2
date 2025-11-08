# Data Model: Team Management UI

**Feature**: 016-team-management-ui
**Date**: 2025-10-26
**Purpose**: Document entities, relationships, validation rules, and state transitions

## Summary

This feature **reuses all existing database schema from Feature 002** (User Registration & Team Onboarding). No new tables, migrations, or RLS policies are needed. Data model focuses on **query patterns** for joining `users` + `user_organizations` + `invitations` tables.

## Entities

### 1. TeamMember (Derived View)

**Source**: Joined data from `users` table + `user_organizations` table

**Purpose**: Represents an active member of an organization for display in the team management UI.

**Fields**:
| Field | Type | Nullable | Source | Description |
|-------|------|----------|--------|-------------|
| `user_id` | UUID | No | users.id | Unique user identifier |
| `organization_id` | UUID | No | user_organizations.organization_id | Organization membership |
| `name` | String | No | users.name | User's full name |
| `email` | String | No | users.email | User's email address |
| `role` | Role (enum) | No | user_organizations.role | User's role in organization |
| `joined_at` | Timestamp | No | user_organizations.created_at | When user joined organization |
| `last_active` | Timestamp | Yes | users.last_active_at | Last login timestamp |

**TypeScript Type**:
```typescript
// src/types/team.types.ts
export interface TeamMember {
  user_id: string;
  organization_id: string;
  name: string;
  email: string;
  role: Role;
  joined_at: string;  // ISO 8601 timestamp
  last_active: string | null;
}
```

**Query Pattern**:
```sql
-- Fetch all active members for an organization
SELECT
  u.id AS user_id,
  uo.organization_id,
  u.name,
  u.email,
  uo.role,
  uo.created_at AS joined_at,
  u.last_active_at AS last_active
FROM users u
INNER JOIN user_organizations uo ON u.id = uo.user_id
WHERE uo.organization_id = $1
  AND uo.deleted_at IS NULL
ORDER BY u.name ASC;
```

**Relationships**:
- Belongs to one `Organization` (via `organization_id`)
- Has one `Role` (enum value, not FK)
- Derived from `users` and `user_organizations` tables (no dedicated table)

**Validation Rules** (enforced by database):
- `role` must be one of: `owner`, `admin`, `project_manager`, `foreman`, `qc_inspector`, `welder`, `viewer`
- `email` must be unique across all users (enforced by `users.email` unique constraint)
- Cannot delete last owner (enforced by `prevent_last_owner_removal` trigger from Feature 002)

**RLS Policies** (existing from Feature 002):
- Users can view members of organizations they belong to
- Only owner/admin can update member roles or remove members

---

### 2. Invitation (Existing Table)

**Source**: `invitations` table (created in Feature 002)

**Purpose**: Represents a pending invitation to join an organization.

**Fields**:
| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `organization_id` | UUID | No | Organization issuing invitation |
| `email` | String | No | Invitee's email address |
| `role` | Role (enum) | No | Pre-assigned role (fixed at invitation time) |
| `token` | String | No | Unique invitation token for acceptance URL |
| `message` | String | Yes | Optional custom message from inviter |
| `created_at` | Timestamp | No | When invitation was created |
| `sent_at` | Timestamp | Yes | When last invitation email was sent |
| `expires_at` | Timestamp | No | Expiration timestamp (created_at + 7 days) |
| `status` | InvitationStatus (enum) | No | Current invitation state |

**TypeScript Type**:
```typescript
// src/types/team.types.ts (extends database.types.ts)
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: Role;
  token: string;
  message: string | null;
  created_at: string;
  sent_at: string | null;
  expires_at: string;
  status: InvitationStatus;
}
```

**Query Pattern**:
```sql
-- Fetch pending invitations for an organization
SELECT *
FROM invitations
WHERE organization_id = $1
  AND status = 'pending'
  AND expires_at > NOW()
ORDER BY created_at DESC;
```

**Relationships**:
- Belongs to one `Organization` (via `organization_id` FK)
- Has one assigned `Role` (enum value)
- No direct relation to `users` table (email may or may not match existing user)

**Validation Rules** (enforced by database):
- `email` must be valid email format (CHECK constraint)
- `role` must be one of 7 valid roles (CHECK constraint)
- `expires_at` automatically set to `created_at + INTERVAL '7 days'` (trigger from Feature 002)
- `token` must be unique (unique constraint)

**State Transitions**:
```
[pending] → [accepted]  (user clicks invitation link and accepts)
[pending] → [revoked]   (admin cancels invitation via revokeInvitationMutation)
[pending] → [expired]   (7 days pass, handled by cron job or validation on acceptance)
```

**RLS Policies** (existing from Feature 002):
- Only owner/admin can create, resend, or revoke invitations
- Invitation queries scoped to user's organization
- Cannot read invitation tokens directly (token only used in acceptance URL)

---

### 3. Role (Enum, Not a Table)

**Source**: Database CHECK constraint (not a separate table)

**Purpose**: Define valid permission levels within an organization.

**Values**:
1. `owner` - Full control (cannot be removed if last owner)
2. `admin` - Team management + all project permissions
3. `project_manager` - Manage drawings, metadata, milestones
4. `foreman` - Assign metadata, update milestones, assign welders
5. `qc_inspector` - Update milestones, view reports
6. `welder` - Update milestones (own work only)
7. `viewer` - Read-only access

**TypeScript Type**:
```typescript
// src/types/team.types.ts
export type Role =
  | 'owner'
  | 'admin'
  | 'project_manager'
  | 'foreman'
  | 'qc_inspector'
  | 'welder'
  | 'viewer';
```

**Permission Mapping** (client-side constant, defined in `src/lib/permissions.ts`):
| Role | Manage Drawings | Assign Metadata | Update Milestones | Assign Welders | Manage Team | View Reports | Manage Projects |
|------|----------------|-----------------|-------------------|----------------|-------------|--------------|-----------------|
| `owner` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `project_manager` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `foreman` | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `qc_inspector` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `welder` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `viewer` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

**Database Validation**:
```sql
-- CHECK constraint on user_organizations.role (Feature 002)
ALTER TABLE user_organizations
ADD CONSTRAINT valid_role CHECK (
  role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector', 'welder', 'viewer')
);

-- CHECK constraint on invitations.role (Feature 002)
ALTER TABLE invitations
ADD CONSTRAINT valid_role CHECK (
  role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector', 'welder', 'viewer')
);
```

---

### 4. Organization (Existing Table, No Changes)

**Source**: `organizations` table (created in Feature 002)

**Purpose**: Represents a company or organization using PipeTrak V2.

**Fields**:
| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `name` | String | No | Organization name |
| `created_at` | Timestamp | No | When organization was created |

**TypeScript Type** (auto-generated via `database.types.ts`):
```typescript
export interface Organization {
  id: string;
  name: string;
  created_at: string;
}
```

**Relationships**:
- Has many `TeamMembers` (via `user_organizations` join table)
- Has many `Invitations` (via `organization_id` FK)
- Has many `Projects`, `Drawings`, `Components` (via `organization_id` FK, not used in this feature)

**RLS Policies** (existing from Feature 002):
- Users can only view organizations they belong to
- Organization creation handled during user registration

---

## State Machines

### Invitation Lifecycle

```
┌─────────┐
│ pending │ (initial state when created via createInvitationMutation)
└────┬────┘
     │
     ├──> [accepted]  (user accepts invitation → joins organization)
     │
     ├──> [revoked]   (admin calls revokeInvitationMutation)
     │
     └──> [expired]   (7 days pass without acceptance)
```

**State Transitions**:
| From State | To State | Trigger | Actor | Mutation |
|-----------|---------|---------|-------|----------|
| `pending` | `accepted` | User clicks invitation link | Invitee | (handled by Feature 002 acceptance flow, not this feature) |
| `pending` | `revoked` | Admin cancels invitation | Owner/Admin | `revokeInvitationMutation` |
| `pending` | `expired` | 7 days pass | System (cron or validation) | N/A (automatic) |

**State Properties**:
- `accepted`: Invitation no longer appears in pending list, user added to `user_organizations`
- `revoked`: Invitation removed from list, acceptance link shows error
- `expired`: Invitation removed from list, acceptance link shows error

---

## Query Patterns

### 1. Fetch Active Members with Role Filter

```sql
-- Used by useOrgMembers({ organizationId, role? })
SELECT
  u.id AS user_id,
  uo.organization_id,
  u.name,
  u.email,
  uo.role,
  uo.created_at AS joined_at,
  u.last_active_at AS last_active
FROM users u
INNER JOIN user_organizations uo ON u.id = uo.user_id
WHERE uo.organization_id = $1
  AND ($2::text IS NULL OR uo.role = $2)  -- Optional role filter
  AND uo.deleted_at IS NULL
ORDER BY u.name ASC;
```

**Client-Side Filtering** (search by name/email):
- Query fetches all members (≤100 per performance assumption)
- JavaScript `filter()` on client for `searchTerm` match (case-insensitive)
- Debounced at 300ms via `useDeferredValue`

### 2. Fetch Pending Invitations

```sql
-- Used by useInvitations({ organizationId, status: 'pending' })
SELECT *
FROM invitations
WHERE organization_id = $1
  AND status = 'pending'
  AND expires_at > NOW()
ORDER BY created_at DESC;
```

### 3. Update Member Role (Optimistic Mutation)

```sql
-- Used by updateMemberRoleMutation({ userId, organizationId, newRole })
UPDATE user_organizations
SET role = $3
WHERE user_id = $1
  AND organization_id = $2
RETURNING *;
```

**Validation** (server-side):
- RLS policy checks user is owner/admin
- Trigger `prevent_last_owner_removal` prevents changing last owner to non-owner role

### 4. Remove Member (Optimistic Mutation)

```sql
-- Used by removeMemberMutation({ userId, organizationId })
-- Soft delete (set deleted_at timestamp)
UPDATE user_organizations
SET deleted_at = NOW()
WHERE user_id = $1
  AND organization_id = $2
RETURNING *;
```

**Validation** (server-side):
- Trigger `prevent_last_owner_removal` prevents deleting last owner
- RLS policy checks user is owner/admin

### 5. Resend Invitation

```sql
-- Used by resendInvitationMutation({ invitationId })
UPDATE invitations
SET sent_at = NOW()
WHERE id = $1
  AND status = 'pending'
RETURNING *;
```

**Side Effect**: Supabase Auth sends new invitation email (handled by trigger or application logic)

### 6. Revoke Invitation

```sql
-- Used by revokeInvitationMutation({ invitationId })
UPDATE invitations
SET status = 'revoked'
WHERE id = $1
RETURNING *;
```

---

## Database Schema (Existing from Feature 002)

**No new tables, migrations, or RLS policies needed.** All schema reused from Feature 002.

**Relevant Tables**:
- `users` (existing)
- `user_organizations` (existing, join table for many-to-many users ↔ organizations)
- `invitations` (existing)
- `organizations` (existing)

**Relevant Triggers**:
- `prevent_last_owner_removal` - Prevents deleting or demoting last owner (Feature 002)
- `set_invitation_expiry` - Automatically sets `expires_at = created_at + 7 days` (Feature 002)

**Relevant RLS Policies** (Feature 002):
- `user_organizations`: "Users can view org members", "Admins can manage members"
- `invitations`: "Admins can manage invitations"

---

## Type Definitions

**Location**: `src/types/team.types.ts` (new file)

```typescript
// src/types/team.types.ts

export type Role =
  | 'owner'
  | 'admin'
  | 'project_manager'
  | 'foreman'
  | 'qc_inspector'
  | 'welder'
  | 'viewer';

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface TeamMember {
  user_id: string;
  organization_id: string;
  name: string;
  email: string;
  role: Role;
  joined_at: string;  // ISO 8601 timestamp
  last_active: string | null;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: Role;
  token: string;
  message: string | null;
  created_at: string;
  sent_at: string | null;
  expires_at: string;
  status: InvitationStatus;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}
```

**Permission Types** (`src/lib/permissions.ts`):
```typescript
export type Permission =
  | 'manage_drawings'
  | 'assign_metadata'
  | 'update_milestones'
  | 'assign_welders'
  | 'manage_team'
  | 'view_reports'
  | 'manage_projects';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ['manage_drawings', 'assign_metadata', 'update_milestones', 'assign_welders', 'manage_team', 'view_reports', 'manage_projects'],
  admin: ['manage_drawings', 'assign_metadata', 'update_milestones', 'assign_welders', 'manage_team', 'view_reports'],
  project_manager: ['manage_drawings', 'assign_metadata', 'update_milestones', 'view_reports'],
  foreman: ['assign_metadata', 'update_milestones', 'assign_welders'],
  qc_inspector: ['update_milestones', 'view_reports'],
  welder: ['update_milestones'],
  viewer: ['view_reports'],
};
```

---

## Validation Summary

**Database Constraints** (existing from Feature 002):
- ✅ Email format validation (CHECK constraint)
- ✅ Role enum validation (CHECK constraint)
- ✅ Cannot delete last owner (trigger)
- ✅ Invitation expires after 7 days (trigger sets expires_at)

**Application-Level Validation** (to be implemented):
- ✅ Duplicate email check before creating invitation (query existing users + invitations)
- ✅ Optimistic update rollback on mutation error (TanStack Query `onError`)

**RLS Enforcement** (existing from Feature 002):
- ✅ Only owner/admin can view/manage team members
- ✅ Users can only access their own organization's data
- ✅ Invitation tokens not exposed in queries (only used in acceptance URL)

---

## Next Steps

With data model documented, proceed to:
1. **contracts/hooks.contract.md** - Define TanStack Query hook signatures
2. **quickstart.md** - Developer setup and testing guide
3. `/speckit.tasks` - Generate TDD task breakdown
