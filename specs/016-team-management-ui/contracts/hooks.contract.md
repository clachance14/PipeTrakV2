# TanStack Query Hook Contracts: Team Management UI

**Feature**: 016-team-management-ui
**Date**: 2025-10-26
**Purpose**: Define API contracts for all TanStack Query hooks (queries + mutations)

## Summary

This document specifies the **interface contracts** for all custom hooks used in the Team Management UI. These contracts define input parameters, return types, error handling, and side effects for TanStack Query hooks.

**Hook Categories**:
1. **Existing Hooks (Extended)**: `useInvitations`, `useOrgMembers` (add new mutations)
2. **New Hooks**: `useTeamFilters`, `useExpandedRows` (client-side state management)

---

## 1. useInvitations() - Invitation Management

**Location**: `src/hooks/useInvitations.ts` (existing from Feature 002, extended)

### Queries

#### useInvitations(params)

**Purpose**: Fetch invitations for an organization with optional filters.

**Input**:
```typescript
{
  organizationId: string;
  status?: 'pending' | 'accepted' | 'revoked' | 'expired';
  limit?: number;
  offset?: number;
}
```

**Return**:
```typescript
{
  data: Invitation[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

**Query Key**: `['invitations', { organization_id: organizationId, status }]`

**Supabase Query**:
```typescript
supabase
  .from('invitations')
  .select('*')
  .eq('organization_id', organizationId)
  .eq('status', status ?? 'pending')  // Default to pending
  .order('created_at', { ascending: false })
  .range(offset ?? 0, (offset ?? 0) + (limit ?? 50) - 1)
```

**Stale Time**: 2 minutes (invitations update infrequently)

**Error Handling**: Returns TanStack Query error object, UI displays toast

---

### Mutations

#### createInvitationMutation (existing from Feature 002)

**Purpose**: Create new invitation and send email.

**Input**:
```typescript
{
  email: string;
  role: Role;
  message?: string;
  organizationId: string;
}
```

**Return**:
```typescript
Promise<{
  invitation: Invitation;
}>
```

**Mutation Function**:
```typescript
async ({ email, role, message, organizationId }) => {
  const { data, error } = await supabase
    .from('invitations')
    .insert({
      organization_id: organizationId,
      email,
      role,
      message,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return { invitation: data };
}
```

**Side Effects**:
- Sends invitation email (handled by Supabase Auth trigger)
- Invalidates `['invitations']` query cache
- Shows success toast

**Optimistic Updates**: None (invitation not displayed until server confirms)

**Error Handling**:
- Duplicate email (409): Show inline validation error
- Permission denied (403): Show toast "You need admin role to invite members"
- Other errors: Show toast with error message

---

#### resendInvitationMutation (NEW)

**Purpose**: Resend invitation email and update `sent_at` timestamp.

**Input**:
```typescript
{
  invitationId: string;
}
```

**Return**:
```typescript
Promise<{
  sent_at: string;  // ISO 8601 timestamp
}>
```

**Mutation Function**:
```typescript
async ({ invitationId }) => {
  const { data, error } = await supabase
    .from('invitations')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('status', 'pending')  // Only resend pending invites
    .select('sent_at')
    .single();

  if (error) throw error;
  return { sent_at: data.sent_at };
}
```

**Side Effects**:
- Sends new invitation email (handled by Supabase Auth trigger)
- Updates `sent_at` field in cache
- Shows success toast "Invitation resent to {email}"

**Optimistic Updates**: Yes (update `sent_at` in cache immediately)

```typescript
onMutate: async ({ invitationId }) => {
  await queryClient.cancelQueries({ queryKey: ['invitations'] });
  const previousInvitations = queryClient.getQueryData(['invitations']);

  queryClient.setQueryData(['invitations'], (old: Invitation[]) =>
    old.map(inv =>
      inv.id === invitationId
        ? { ...inv, sent_at: new Date().toISOString() }
        : inv
    )
  );

  return { previousInvitations };
},

onError: (err, variables, context) => {
  queryClient.setQueryData(['invitations'], context?.previousInvitations);
  toast.error('Failed to resend invitation. Please try again.');
},

onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['invitations'] });
}
```

**Error Handling**:
- Invitation not found (404): Show toast "Invitation no longer exists"
- Permission denied (403): Show toast "You need admin role to resend invitations"

---

#### revokeInvitationMutation (NEW)

**Purpose**: Cancel pending invitation (set status to 'revoked').

**Input**:
```typescript
{
  invitationId: string;
}
```

**Return**:
```typescript
Promise<void>
```

**Mutation Function**:
```typescript
async ({ invitationId }) => {
  const { error } = await supabase
    .from('invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId);

  if (error) throw error;
}
```

**Side Effects**:
- Removes invitation from pending list (cache update)
- Shows success toast "Invitation cancelled"
- AlertDialog confirmation required before calling mutation

**Optimistic Updates**: Yes (remove from cache immediately)

```typescript
onMutate: async ({ invitationId }) => {
  await queryClient.cancelQueries({ queryKey: ['invitations'] });
  const previousInvitations = queryClient.getQueryData(['invitations']);

  queryClient.setQueryData(['invitations'], (old: Invitation[]) =>
    old.filter(inv => inv.id !== invitationId)
  );

  return { previousInvitations };
},

onError: (err, variables, context) => {
  queryClient.setQueryData(['invitations'], context?.previousInvitations);
  toast.error('Failed to revoke invitation. Please try again.');
},

onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['invitations'] });
}
```

**Error Handling**:
- Invitation already accepted (422): Show toast "Cannot revoke accepted invitation"
- Permission denied (403): Show toast "You need admin role to revoke invitations"

---

## 2. useOrgMembers() - Organization Member Management

**Location**: `src/hooks/useOrgMembers.ts` (existing from Feature 002, extended)

### Queries

#### useOrgMembers(params)

**Purpose**: Fetch active members of an organization with optional filters.

**Input**:
```typescript
{
  organizationId: string;
  role?: Role | 'all';
  search?: string;
  limit?: number;
  offset?: number;
}
```

**Return**:
```typescript
{
  data: TeamMember[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

**Query Key**: `['org-members', { organization_id: organizationId, role }]`

**Supabase Query**:
```typescript
// Server-side role filter
let query = supabase
  .from('users')
  .select('*, user_organizations!inner(organization_id, role, created_at)')
  .eq('user_organizations.organization_id', organizationId)
  .is('user_organizations.deleted_at', null);

if (role && role !== 'all') {
  query = query.eq('user_organizations.role', role);
}

const { data, error } = await query.order('name', { ascending: true });

// Client-side search filter (debounced at 300ms)
const filteredData = search
  ? data.filter(member =>
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase())
    )
  : data;
```

**Stale Time**: 2 minutes

**Error Handling**: Returns TanStack Query error object, UI displays toast

---

### Mutations

#### updateMemberRoleMutation (NEW)

**Purpose**: Change a team member's role with optimistic UI updates.

**Input**:
```typescript
{
  userId: string;
  organizationId: string;
  newRole: Role;
}
```

**Return**:
```typescript
Promise<{
  user_organization: UserOrganization;
}>
```

**Mutation Function**:
```typescript
async ({ userId, organizationId, newRole }) => {
  const { data, error } = await supabase
    .from('user_organizations')
    .update({ role: newRole })
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) throw error;
  return { user_organization: data };
}
```

**Side Effects**:
- Updates member role in cache (optimistic)
- Shows success toast "Role updated to {newRole}"
- Invalidates `['org-members']` query cache on success

**Optimistic Updates**: Yes (critical for <50ms perceived latency per SC-004)

```typescript
onMutate: async ({ userId, newRole }) => {
  await queryClient.cancelQueries({ queryKey: ['org-members'] });
  const previousMembers = queryClient.getQueryData(['org-members']);

  queryClient.setQueryData(['org-members'], (old: TeamMember[]) =>
    old.map(member =>
      member.user_id === userId ? { ...member, role: newRole } : member
    )
  );

  return { previousMembers };
},

onError: (err, variables, context) => {
  queryClient.setQueryData(['org-members'], context?.previousMembers);
  toast.error('Failed to update role. Please try again.');
},

onSuccess: (data, variables) => {
  toast.success(`Role updated to ${variables.newRole}`);
},

onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['org-members'] });
}
```

**Error Handling**:
- Cannot change last owner (422): Show toast "Cannot change role: Organization must have at least one owner"
- Permission denied (403): Show toast "You need admin role to change member roles"
- User not found (404): Show toast "Member no longer exists"

**Server-Side Validation** (enforced by RLS + trigger):
- Trigger `prevent_last_owner_removal` prevents changing last owner to non-owner role
- RLS policy checks user is owner/admin

---

#### removeMemberMutation (NEW)

**Purpose**: Remove member from organization (soft delete).

**Input**:
```typescript
{
  userId: string;
  organizationId: string;
}
```

**Return**:
```typescript
Promise<void>
```

**Mutation Function**:
```typescript
async ({ userId, organizationId }) => {
  const { error } = await supabase
    .from('user_organizations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('organization_id', organizationId);

  if (error) throw error;
}
```

**Side Effects**:
- Removes member from cache (optimistic)
- Shows success toast "{memberName} removed from organization"
- RLS policies immediately revoke access for removed user
- AlertDialog confirmation required before calling mutation

**Optimistic Updates**: Yes (remove from cache immediately)

```typescript
onMutate: async ({ userId }) => {
  await queryClient.cancelQueries({ queryKey: ['org-members'] });
  const previousMembers = queryClient.getQueryData(['org-members']);

  queryClient.setQueryData(['org-members'], (old: TeamMember[]) =>
    old.filter(member => member.user_id !== userId)
  );

  return { previousMembers };
},

onError: (err, variables, context) => {
  queryClient.setQueryData(['org-members'], context?.previousMembers);
  toast.error('Failed to remove member. Please try again.');
},

onSuccess: (data, variables) => {
  // memberName retrieved from cache before removal
  toast.success(`${memberName} removed from organization`);
},

onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['org-members'] });
}
```

**Error Handling**:
- Cannot remove last owner (422): Show toast "Cannot remove: Organization must have at least one owner"
- Permission denied (403): Show toast "You need admin role to remove members"
- User not found (404): Show toast "Member no longer exists"

**Server-Side Validation** (enforced by trigger):
- Trigger `prevent_last_owner_removal` prevents deleting last owner

---

## 3. useTeamFilters() - URL State Management (NEW)

**Location**: `src/hooks/useTeamFilters.ts` (new file)

**Purpose**: Manage search, role filter, status filter, and sort state in URL query params.

**Input**: None (reads from URL via `useSearchParams`)

**Return**:
```typescript
{
  searchTerm: string;              // Debounced 300ms
  roleFilter: Role | 'all';
  statusFilter: 'all' | 'active' | 'pending';
  sortBy: 'name' | 'role' | 'join_date' | 'last_active';
  setSearch: (term: string) => void;
  setRoleFilter: (role: Role | 'all') => void;
  setStatusFilter: (status: 'all' | 'active' | 'pending') => void;
  setSortBy: (sort: 'name' | 'role' | 'join_date' | 'last_active') => void;
}
```

**Implementation**:
```typescript
import { useSearchParams } from 'react-router-dom';
import { useDeferredValue } from 'react';

export function useTeamFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const searchTerm = searchParams.get('search') || '';
  const roleFilter = (searchParams.get('role') as Role | 'all') || 'all';
  const statusFilter = (searchParams.get('status') as 'all' | 'active' | 'pending') || 'all';
  const sortBy = (searchParams.get('sort') as 'name' | 'role' | 'join_date' | 'last_active') || 'name';

  // Debounce search with useDeferredValue (React 18)
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const setSearch = (term: string) => {
    setSearchParams(prev => {
      if (term) prev.set('search', term);
      else prev.delete('search');
      return prev;
    });
  };

  const setRoleFilter = (role: Role | 'all') => {
    setSearchParams(prev => {
      if (role !== 'all') prev.set('role', role);
      else prev.delete('role');
      return prev;
    });
  };

  // Similar setters for statusFilter, sortBy

  return {
    searchTerm: deferredSearchTerm,
    roleFilter,
    statusFilter,
    sortBy,
    setSearch,
    setRoleFilter,
    setStatusFilter,
    setSortBy,
  };
}
```

**URL Format**: `?search=john&role=admin&status=active&sort=name`

**Persistence**: URL params persist across page refreshes (browser history)

**Debouncing**: Search term debounced at 300ms via `useDeferredValue` (FR-015)

---

## 4. useExpandedRows() - Expandable Row State (NEW)

**Location**: `src/hooks/useExpandedRows.ts` (new file)

**Purpose**: Manage which member rows are expanded (permissions breakdown visible).

**Input**: None (local state only)

**Return**:
```typescript
{
  expandedRows: Set<string>;  // Set of user IDs
  toggleRow: (userId: string) => void;
  isExpanded: (userId: string) => boolean;
}
```

**Implementation**:
```typescript
import { useState } from 'react';

export function useExpandedRows() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (userId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const isExpanded = (userId: string) => expandedRows.has(userId);

  return { expandedRows, toggleRow, isExpanded };
}
```

**Note**: Expansion state is **local only** (not persisted in URL). Refreshing page collapses all rows.

---

## Error Handling Strategy

**All Mutations**:
1. **Optimistic Update** - Update cache immediately (onMutate)
2. **Rollback on Error** - Revert cache if mutation fails (onError)
3. **Toast Notification** - Show success/error toast (onSuccess/onError)
4. **Cache Invalidation** - Refetch from server to ensure consistency (onSettled)

**Query Errors**:
- Displayed via toast notification (Sonner)
- Retry logic: TanStack Query default (3 retries with exponential backoff)
- Empty state: Show "No team members yet" or "No pending invitations"

**Permission Errors** (403):
- Show actionable message: "You need admin role to perform this action"
- Disable action buttons for users without permission (tooltip explains why)

**Validation Errors** (422):
- Inline form errors (duplicate email, invalid role, etc.)
- Toast for server-side validation (cannot remove last owner, etc.)

---

## Cache Invalidation Strategy

**Query Keys**:
- `['org-members', { organization_id, role? }]` - Active members
- `['invitations', { organization_id, status? }]` - Pending invitations

**Invalidation Triggers**:
| Mutation | Invalidates |
|----------|-------------|
| `createInvitationMutation` | `['invitations']` |
| `resendInvitationMutation` | `['invitations']` |
| `revokeInvitationMutation` | `['invitations']` |
| `updateMemberRoleMutation` | `['org-members']` |
| `removeMemberMutation` | `['org-members']` |

**Stale Time**: 2 minutes (team data changes infrequently)

**GC Time**: 5 minutes (cache retained for quick back-navigation)

---

## Testing Contracts

**Contract Tests** (`tests/contract/team-hooks.contract.test.ts`):
1. ✅ `createInvitationMutation` creates invitation and invalidates cache
2. ✅ `resendInvitationMutation` updates `sent_at` optimistically
3. ✅ `revokeInvitationMutation` removes from cache optimistically
4. ✅ `updateMemberRoleMutation` updates role optimistically + rollback on error
5. ✅ `removeMemberMutation` removes member optimistically + rollback on error
6. ✅ `useTeamFilters` debounces search at 300ms
7. ✅ `useTeamFilters` persists filters in URL
8. ✅ `useExpandedRows` toggles row expansion state

**Integration Tests**: Cover full user flows (see spec.md acceptance scenarios)

---

## Next Steps

With hook contracts defined, proceed to:
1. **quickstart.md** - Developer setup and testing guide
2. `/speckit.tasks` - Generate TDD task breakdown
3. Implementation - Write failing tests, implement hooks following these contracts
