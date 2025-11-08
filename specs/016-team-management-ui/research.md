# Research & Technical Decisions: Team Management UI

**Feature**: 016-team-management-ui
**Date**: 2025-10-26
**Purpose**: Document technology choices and best practices for implementing team management interface

## Summary

This document resolves all technical decisions needed for implementing the Team Management UI. Since all core dependencies are established from prior features (Feature 002, 010, 011, 015), research focuses on **integration patterns** and **best practices** for URL state management, optimistic updates, accessibility, mobile responsiveness, and permission display.

## Research Findings

### 1. URL State Management Best Practices

**Decision**: Use flat query parameter structure with React Router v7 `useSearchParams`

**Rationale**:
- **Simplicity**: Flat params (`?search=X&role=Y&status=Z&sort=W`) are easier to read/debug in browser URL bar
- **Browser compatibility**: No encoding issues with nested structures
- **Consistency**: Features 010 and 011 already use flat params for filters
- **React Router v7 compatibility**: `useSearchParams` hook natively handles flat params with type safety

**Implementation Pattern**:
```typescript
// src/hooks/useTeamFilters.ts
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

  // Similar setters for roleFilter, statusFilter, sortBy

  return { searchTerm: deferredSearchTerm, roleFilter, statusFilter, sortBy, setSearch, ... };
}
```

**Alternatives Considered**:
- Nested JSON in single param (`?filters={"search":"X","role":"Y"}`) - Rejected: encoding issues, harder to debug
- Hash-based routing (`#/team?search=X`) - Rejected: React Router v7 uses browser history API
- Local storage only - Rejected: URL persistence required by FR-019

**References**:
- React Router v7 docs: https://reactrouter.com/en/main/hooks/use-search-params
- Feature 010 implementation: `src/hooks/useDrawingFilters.ts` (similar pattern)

---

### 2. Optimistic Update Patterns with TanStack Query

**Decision**: Use TanStack Query v5 `onMutate` lifecycle for optimistic updates with `onError` rollback

**Rationale**:
- **Instant feedback**: UI updates immediately (<50ms perceived latency per SC-004)
- **Error safety**: Rollback mechanism prevents stale data if server mutation fails
- **Cache consistency**: TanStack Query manages cache synchronization automatically
- **Proven pattern**: Feature 010 uses this for milestone updates successfully

**Implementation Pattern**:
```typescript
// src/hooks/useOrgMembers.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useOrgMembers() {
  const queryClient = useQueryClient();

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ userId, organizationId, newRole }) => {
      const { data, error } = await supabase
        .from('user_organizations')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    // OPTIMISTIC UPDATE
    onMutate: async ({ userId, newRole }) => {
      // Cancel outgoing refetches (prevent overwrite)
      await queryClient.cancelQueries({ queryKey: ['org-members'] });

      // Snapshot previous value
      const previousMembers = queryClient.getQueryData(['org-members']);

      // Optimistically update cache
      queryClient.setQueryData(['org-members'], (old: TeamMember[]) =>
        old.map(member =>
          member.user_id === userId ? { ...member, role: newRole } : member
        )
      );

      // Return context with snapshot for rollback
      return { previousMembers };
    },

    // ROLLBACK ON ERROR
    onError: (err, variables, context) => {
      // Restore previous cache state
      queryClient.setQueryData(['org-members'], context?.previousMembers);

      // Show error toast
      toast.error('Failed to update role. Please try again.');
    },

    // REFETCH ON SUCCESS OR ERROR
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
    },
  });

  return { updateMemberRoleMutation };
}
```

**Alternatives Considered**:
- No optimistic updates (wait for server) - Rejected: violates SC-004 (<50ms perceived latency)
- Manual cache management without TanStack Query - Rejected: error-prone, reinvents library functionality
- Pessimistic UI (disable buttons until server confirms) - Rejected: poor UX, users expect instant feedback

**References**:
- TanStack Query v5 Optimistic Updates: https://tanstack.com/query/latest/docs/react/guides/optimistic-updates
- Feature 010 implementation: `src/hooks/useUpdateMilestone.ts` (similar optimistic pattern)

---

### 3. Expandable Row Accessibility

**Decision**: Use ARIA `aria-expanded`, `aria-controls`, `role="button"` for expandable member rows

**Rationale**:
- **WCAG 2.1 AA compliance**: Required by SC-006 (zero accessibility violations)
- **Screen reader support**: Clearly announces expandable state ("expanded" or "collapsed")
- **Keyboard navigation**: Enter/Space keys toggle expansion (standard button behavior)
- **Semantic HTML**: `role="button"` indicates interactive element

**Implementation Pattern**:
```typescript
// src/components/team/MemberRow.tsx
export function MemberRow({ member }: { member: TeamMember }) {
  const { isExpanded, toggleRow } = useExpandedRows();
  const expanded = isExpanded(member.user_id);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={`permissions-${member.user_id}`}
        onClick={() => toggleRow(member.user_id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleRow(member.user_id);
          }
        }}
        className="cursor-pointer hover:bg-slate-50"
      >
        <span>{member.name}</span>
        <span>{member.email}</span>
        <span>{member.role}</span>
        {/* Action buttons */}
      </div>

      {expanded && (
        <div id={`permissions-${member.user_id}`} role="region" aria-label="Permissions breakdown">
          <ExpandablePermissionsRow role={member.role} />
        </div>
      )}
    </>
  );
}
```

**Accessibility Checklist**:
- ✅ `role="button"` on clickable row
- ✅ `tabIndex={0}` for keyboard focus
- ✅ `aria-expanded` state (true/false)
- ✅ `aria-controls` links to expanded content ID
- ✅ Keyboard handlers for Enter/Space
- ✅ Focus indicator (Tailwind `focus:ring-2`)
- ✅ Screen reader label (`aria-label` on permissions region)

**Alternatives Considered**:
- `<details>` / `<summary>` HTML elements - Rejected: browser inconsistencies, limited styling control
- Tooltip pattern (hover only) - Rejected: not keyboard accessible, violates WCAG 2.1 AA
- Separate modal for permissions - Rejected: adds interaction friction, inconsistent with expandable row pattern

**References**:
- ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
- WCAG 2.1 AA Success Criteria: https://www.w3.org/WAI/WCAG21/quickref/
- Feature 010 expandable rows: `src/components/DrawingRow.tsx` (similar pattern, but accessibility not fully validated)

---

### 4. Mobile Responsive Filter UI

**Decision**: Use vertical stack layout (always visible, no collapse) for filters on ≤1024px screens

**Rationale**:
- **Consistency**: Feature 015 established this pattern for mobile milestone filters
- **Simplicity**: No collapse/expand interaction needed (fewer clicks)
- **Performance**: No layout shift when toggling filter panel
- **Touch-friendly**: 32px+ touch targets for filter buttons (per Feature 015 mobile patterns)

**Implementation Pattern**:
```typescript
// src/components/team/TeamFilters.tsx
export function TeamFilters() {
  const { searchTerm, roleFilter, statusFilter, sortBy, setSearch, setRoleFilter, setStatusFilter, setSortBy } = useTeamFilters();

  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-6 p-4">
      {/* Search Input */}
      <TeamSearch value={searchTerm} onChange={setSearch} />

      {/* Role Filter Dropdown */}
      <Select value={roleFilter} onValueChange={setRoleFilter}>
        <SelectTrigger className="w-full md:w-48">
          <SelectValue placeholder="Filter by role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="owner">Owner</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          {/* ...other roles */}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-full md:w-48">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort Dropdown */}
      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger className="w-full md:w-48">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Name (A-Z)</SelectItem>
          <SelectItem value="role">Role</SelectItem>
          <SelectItem value="join_date">Join Date</SelectItem>
          <SelectItem value="last_active">Last Active</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

**Mobile Breakpoint**: `md:` = 1024px (Tailwind default, matches Feature 015 `≤1024px` spec requirement)

**Alternatives Considered**:
- Collapsible filter panel (hamburger menu) - Rejected: adds interaction friction, not consistent with Feature 015
- Horizontal scrolling filters - Rejected: poor UX on mobile, hard to discover offscreen filters
- Filter modal/drawer - Rejected: adds modal layer, requires open/close interaction

**References**:
- Feature 015 mobile patterns: `specs/015-mobile-milestone-updates/IMPLEMENTATION-NOTES.md`
- Tailwind responsive breakpoints: https://tailwindcss.com/docs/responsive-design

---

### 5. Permission Mapping by Role

**Decision**: Define role → permissions mapping in client-side constant `src/lib/permissions.ts`

**Rationale**:
- **Performance**: No API call needed (permissions static per role)
- **Type safety**: Compile-time validation of permission names
- **Single source of truth**: Matches RLS policy capabilities without duplication
- **Simplicity**: Permissions display is UI-only (RLS enforces actual permissions on server)

**Implementation Pattern**:
```typescript
// src/lib/permissions.ts
export type Permission =
  | 'manage_drawings'
  | 'assign_metadata'
  | 'update_milestones'
  | 'assign_welders'
  | 'manage_team'
  | 'view_reports'
  | 'manage_projects';

export type Role = 'owner' | 'admin' | 'project_manager' | 'foreman' | 'qc_inspector' | 'welder' | 'viewer';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ['manage_drawings', 'assign_metadata', 'update_milestones', 'assign_welders', 'manage_team', 'view_reports', 'manage_projects'],
  admin: ['manage_drawings', 'assign_metadata', 'update_milestones', 'assign_welders', 'manage_team', 'view_reports'],
  project_manager: ['manage_drawings', 'assign_metadata', 'update_milestones', 'view_reports'],
  foreman: ['assign_metadata', 'update_milestones', 'assign_welders'],
  qc_inspector: ['update_milestones', 'view_reports'],
  welder: ['update_milestones'],
  viewer: ['view_reports'],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
```

**Usage in Components**:
```typescript
// src/components/team/ExpandablePermissionsRow.tsx
import { ROLE_PERMISSIONS } from '@/lib/permissions';

export function ExpandablePermissionsRow({ role }: { role: Role }) {
  const permissions = ROLE_PERMISSIONS[role];

  return (
    <div className="grid grid-cols-2 gap-2 p-4">
      <PermissionBadge permission="manage_drawings" granted={permissions.includes('manage_drawings')} />
      <PermissionBadge permission="assign_metadata" granted={permissions.includes('assign_metadata')} />
      {/* ...other permissions */}
    </div>
  );
}
```

**Alternatives Considered**:
- Fetch permissions from API endpoint - Rejected: unnecessary network call, permissions are static
- Store permissions in database - Rejected: adds complexity, RLS policies already define capabilities
- Hardcode permissions in component - Rejected: violates DRY, error-prone

**References**:
- RLS policies (Feature 002): `supabase/migrations/00001_initial_schema.sql`
- Permission-based UI patterns: React best practices for conditional rendering

---

## Technology Stack Summary

**No New Dependencies** - All required libraries already installed:
- ✅ React 18 (useState, useDeferredValue)
- ✅ React Router v7 (useSearchParams)
- ✅ TanStack Query v5 (useMutation, useQueryClient)
- ✅ Radix UI (Dialog, AlertDialog, Dropdown, Tooltip)
- ✅ Sonner (toast)
- ✅ Tailwind CSS v4 (responsive utilities)
- ✅ Vitest + Testing Library

**New Patterns** (not libraries):
- URL state management via `useSearchParams`
- Optimistic updates with rollback
- ARIA-accessible expandable rows
- Vertical stack mobile filters
- Client-side permission mapping

---

## Next Steps

Phase 1 design artifacts can now be generated with all technical decisions resolved:
1. `data-model.md` - Document entities (TeamMember, Invitation, Role, Organization)
2. `contracts/hooks.contract.md` - Define TanStack Query hook contracts
3. `quickstart.md` - Developer setup and testing guide

**Status**: ✅ All research complete, ready for Phase 1

---

## 6. Edge Case Resolutions

**Decision**: Document handling strategies for 8 edge cases identified in spec.md

**Edge Cases and Resolutions**:

### 1. Organization with Zero Members

**Question**: What happens when an organization has zero members (should not be possible due to creator being auto-added)?

**Resolution**: This is a **system invariant** - organizations MUST have at least one member (the creator). Enforced at creation time:
- User registration automatically creates organization AND adds user as first owner
- Database trigger `prevent_last_owner_removal` blocks deletion of last owner
- UI shows empty state "No team members yet" as fallback but should never appear in production
- **Handling**: T067 adds empty state UI for graceful degradation

### 2. Multi-Organization Context Switching

**Question**: What happens when a user belongs to multiple organizations and switches context via OrganizationSwitcher?

**Resolution**: **Automatic refresh** - existing pattern from Features 010/011:
- `OrganizationSwitcher` component updates active `organization_id` in context
- TanStack Query cache keys include `organization_id` parameter
- Changing context triggers automatic query refetch via `useOrgMembers({ organizationId })` and `useInvitations({ organizationId })`
- **Handling**: No additional tasks needed - existing infrastructure supports this

### 3. Inviting User Already in Different Organization

**Question**: How does the system handle inviting an email that belongs to a user already in a different organization?

**Resolution**: **Allow multi-organization membership** (Feature 002 design):
- `user_organizations` is a many-to-many join table supporting multiple org memberships
- Same email can be invited to multiple organizations
- User sees multiple orgs in OrganizationSwitcher and can switch between them
- **Handling**: No changes needed - already supported by data model

### 4. Accepting Revoked Invitation

**Question**: What happens if a user accepts an invitation after it has been revoked?

**Resolution**: **Server-side validation** during acceptance (Feature 002 implementation):
- Acceptance endpoint checks `status = 'pending'` before allowing join
- Revoked invitations (`status = 'revoked'`) return 422 error
- Error page shows "Invitation no longer valid"
- **Handling**: T063 verifies this behavior

### 5. Role Change for Currently Logged-In User

**Question**: How does the system handle role changes when the target user is currently logged in?

**Resolution**: **Eventual consistency** with session refresh:
- Role change updates `user_organizations.role` immediately
- RLS policies check role on every query (real-time enforcement)
- User's next page navigation or data fetch sees new role automatically
- No forced logout required (Supabase Auth session remains valid)
- **Handling**: No additional tasks needed - RLS policies enforce dynamically

### 6. Empty Filter Results

**Question**: What happens when filtering/sorting results in an empty list?

**Resolution**: **Empty state UI**:
- Show "No results found" message with filter summary
- Provide "Clear filters" button to reset to full list
- **Handling**: T068 adds empty state for zero results

### 7. Expandable Permissions on Mobile

**Question**: How does the expandable permissions row behave on mobile devices with limited screen width?

**Resolution**: **Accordion pattern** (per FR-049 and research.md):
- Desktop (>1024px): Click-to-expand inline (current pattern)
- Mobile (≤1024px): Accordion-style expandable panel below row
- Touch-friendly 32px+ tap targets for expand/collapse icon
- **Handling**: T065 implements mobile accordion pattern

### 8. Removing Member Who Owns Resources

**Question**: What happens when attempting to remove a member who owns critical resources (drawings, components, etc.)?

**Resolution**: **Allow removal, retain attribution** (per spec.md "Out of Scope" section):
- Removal soft-deletes `user_organizations` record (sets `deleted_at`)
- User's created resources (drawings, components, milestones) remain attributed to their `user_id`
- Resources NOT reassigned automatically (future enhancement)
- Removed user loses access via RLS policies but data integrity preserved
- **Handling**: No additional tasks needed - existing soft delete pattern supports this

**Summary**: 5 of 8 edge cases handled by existing infrastructure, 3 require specific tasks (T063, T065, T067, T068) which are already included in tasks.md
