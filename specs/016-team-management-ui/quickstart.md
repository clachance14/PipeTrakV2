# Quickstart Guide: Team Management UI

**Feature**: 016-team-management-ui
**Date**: 2025-10-26
**Purpose**: Developer setup, testing scenarios, and architecture overview

## Setup

### 1. Switch to Feature Branch

```bash
git checkout 016-team-management-ui
```

### 2. Dependencies

**No new dependencies needed** - All required packages already installed:
- ✅ React 18 + TypeScript 5
- ✅ React Router v7
- ✅ TanStack Query v5
- ✅ Radix UI (Dialog, AlertDialog, Dropdown, Tooltip)
- ✅ Sonner (toast notifications)
- ✅ Tailwind CSS v4
- ✅ Vitest + Testing Library

If starting fresh:
```bash
npm install
```

### 3. Database Schema

**No migrations needed** - Feature reuses existing tables from Feature 002:
- `users`
- `user_organizations`
- `invitations`
- `organizations`

All RLS policies and triggers already in place.

### 4. Environment Variables

Verify `.env` file contains:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For CLI operations only
```

Validation happens automatically in `src/lib/supabase.ts`.

### 5. Run Tests

```bash
# Run all team management tests
npm test -- tests/integration/team-management

# Run contract tests for hooks
npm test -- tests/contract/team-hooks.contract.test.ts

# Run with UI
npm test:ui

# Run with coverage
npm test -- --coverage
```

**Coverage Targets** (per constitution):
- Overall: ≥70%
- `src/hooks/**`: ≥80%
- `src/components/**`: ≥60%

### 6. Run Dev Server

```bash
npm run dev
```

Navigate to: `http://localhost:5173/team`

**Prerequisites**:
- Must be logged in (authenticated user)
- User must have `owner` or `admin` role
- If not owner/admin, you'll see permission error (RLS policy enforcement)

---

## Testing Scenarios

### Scenario 1: View Team Members (User Story 1)

**Objective**: Verify member list displays with correct information.

**Steps**:
1. Login as organization owner or admin
2. Navigate to `/team`
3. Verify member list displays with:
   - Member name, email, role, join date
   - Pending invitations inline with "Pending" badge
4. Click on a member row
5. Verify permissions breakdown expands showing role capabilities

**Expected Result**:
- ✅ Active members and pending invites displayed inline
- ✅ Click expands row to show permissions breakdown
- ✅ Non-owner/admin users denied access (403 error)

**Test File**: `tests/integration/team-management/view-members.test.tsx`

---

### Scenario 2: Invite New Member (User Story 2)

**Objective**: Create invitation and verify it appears in pending list.

**Steps**:
1. Click "Add Team Member" button
2. Modal dialog opens with form
3. Enter email: `newmember@example.com`
4. Select role: `project_manager`
5. (Optional) Add custom message: "Welcome to the team!"
6. Click "Send Invitation"
7. Verify modal closes, success toast appears
8. Verify pending invite appears inline with "Pending" badge

**Expected Result**:
- ✅ Modal form validates email format
- ✅ Prevents duplicate emails (shows inline error)
- ✅ Success toast: "Invitation sent to newmember@example.com"
- ✅ Pending invite appears in list immediately (optimistic update)
- ✅ Invitation email sent to invitee (verify via email logs)

**Test File**: `tests/integration/team-management/invite-members.test.tsx`

---

### Scenario 3: Search and Filter Members (User Story 3)

**Objective**: Filter members by search term, role, and status.

**Steps**:
1. Type in search input: `john`
2. Verify list filters to show only members/invites matching "john" (debounced 300ms)
3. Select role filter: `admin`
4. Verify list shows only admin members
5. Select status filter: `pending`
6. Verify list shows only pending invitations
7. Select sort: `join_date` (newest first)
8. Verify list reorders by join date descending
9. Refresh page
10. Verify filters persist via URL (`?search=john&role=admin&status=pending&sort=join_date`)

**Expected Result**:
- ✅ Search debounced at 300ms (no excessive filtering)
- ✅ Multiple filters combine (AND logic)
- ✅ URL updates as filters change
- ✅ Filters restored from URL on page refresh

**Test File**: `tests/integration/team-management/search-filter.test.tsx`

---

### Scenario 4: Change Member Role (User Story 4)

**Objective**: Update member role with optimistic UI update.

**Steps**:
1. Locate member with `viewer` role
2. Click "Change Role" action
3. Select new role: `foreman`
4. Confirm change
5. Verify role updates immediately in UI (optimistic update)
6. Verify success toast: "Role updated to foreman"
7. Refresh page to confirm role persisted

**Expected Result**:
- ✅ UI updates immediately (<50ms perceived latency)
- ✅ Success toast appears
- ✅ Role persists after page refresh
- ✅ If error occurs, UI rolls back to previous role + error toast

**Edge Case - Last Owner**:
1. Attempt to change your own role from `owner` to `admin` (if you're the only owner)
2. Verify error toast: "Cannot change role: Organization must have at least one owner"
3. Verify role remains `owner` (rollback)

**Test File**: `tests/integration/team-management/manage-roles.test.tsx`

---

### Scenario 5: Remove Member (User Story 5)

**Objective**: Remove member from organization with confirmation.

**Steps**:
1. Locate member to remove
2. Click "Remove Member" action
3. Confirm in AlertDialog: "Are you sure?"
4. Verify member disappears from list immediately (optimistic update)
5. Verify success toast: "{memberName} removed from organization"
6. Logout and attempt to login as removed user
7. Verify removed user cannot access organization resources (RLS enforcement)

**Expected Result**:
- ✅ Confirmation dialog prevents accidental removal
- ✅ Member removed from list immediately
- ✅ Success toast appears
- ✅ RLS policies immediately revoke access for removed user
- ✅ If error occurs, member reappears in list + error toast

**Edge Case - Last Owner**:
1. Attempt to remove yourself (if you're the only owner)
2. Verify error toast: "Cannot remove: Organization must have at least one owner"
3. Verify you remain in member list (rollback)

**Test File**: `tests/integration/team-management/remove-members.test.tsx`

---

### Scenario 6: Resend and Revoke Invitations (User Story 6)

**Objective**: Manage pending invitations (resend email or cancel).

**Resend Steps**:
1. Locate pending invitation
2. Click "Resend Invitation" action
3. Verify success toast: "Invitation resent to {email}"
4. Verify "Last sent" timestamp updates immediately (optimistic update)
5. Verify invitee receives new email

**Revoke Steps**:
1. Locate pending invitation
2. Click "Revoke Invitation" action
3. Confirm in dialog
4. Verify invitation disappears from list immediately (optimistic update)
5. Verify success toast: "Invitation cancelled"
6. Attempt to accept invitation via link (as invitee)
7. Verify error: "Invitation no longer valid"

**Expected Result**:
- ✅ Resend updates `sent_at` timestamp immediately
- ✅ Revoke removes invitation from list immediately
- ✅ Revoked invitations show error when acceptance attempted
- ✅ Success toasts appear for both actions

**Test File**: `tests/integration/team-management/manage-invitations.test.tsx`

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  TeamManagementPage (/team route, ProtectedRoute wrapper)      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  TeamFilters (search, role filter, status filter, sort)   │ │
│  │  └─> useTeamFilters() → URL state via useSearchParams     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  TeamMemberList (container)                                │ │
│  │                                                             │ │
│  │  ├─> useOrgMembers() → TanStack Query (active members)    │ │
│  │  ├─> useInvitations() → TanStack Query (pending invites)  │ │
│  │  └─> useExpandedRows() → local state                       │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  MemberRow (active member, expandable)              │  │ │
│  │  │                                                       │  │ │
│  │  │  ├─> Click row → toggleRow() → expand/collapse      │  │ │
│  │  │  │                                                    │  │ │
│  │  │  ├─> ExpandablePermissionsRow                        │  │ │
│  │  │  │   └─> ROLE_PERMISSIONS[role] → PermissionBadge   │  │ │
│  │  │  │                                                    │  │ │
│  │  │  ├─> RoleChangeDialog (modal)                        │  │ │
│  │  │  │   └─> updateMemberRoleMutation (optimistic)       │  │ │
│  │  │  │                                                    │  │ │
│  │  │  └─> RemoveMemberDialog (AlertDialog)                │  │ │
│  │  │      └─> removeMemberMutation (optimistic)           │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  PendingInviteRow (pending invite)                   │  │ │
│  │  │                                                       │  │ │
│  │  │  ├─> "Pending" badge                                 │  │ │
│  │  │  ├─> resendInvitationMutation (optimistic)           │  │ │
│  │  │  └─> revokeInvitationMutation (optimistic)           │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  AddMemberDialog (modal, triggered by button)             │ │
│  │  └─> createInvitationMutation → sends email                │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

                              ↓ Data Flow ↓

┌─────────────────────────────────────────────────────────────────┐
│  TanStack Query Cache                                           │
│                                                                  │
│  ├─> ['org-members', { organization_id, role? }]               │
│  │   └─> Fetches from: users + user_organizations              │
│  │                                                              │
│  └─> ['invitations', { organization_id, status? }]             │
│      └─> Fetches from: invitations table                        │
└─────────────────────────────────────────────────────────────────┘

                              ↓ Persistence ↓

┌─────────────────────────────────────────────────────────────────┐
│  Supabase PostgreSQL (Remote DB)                               │
│                                                                  │
│  ├─> users (existing table from Feature 002)                   │
│  ├─> user_organizations (join table, soft delete support)      │
│  ├─> invitations (status: pending/accepted/revoked/expired)    │
│  └─> organizations (existing table)                             │
│                                                                  │
│  RLS Policies:                                                  │
│  ├─> Only owner/admin can access /team page                    │
│  ├─> Users can only view their organization's members          │
│  └─> Trigger prevents removing last owner                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component File Structure

```
src/
├── pages/
│   └── TeamManagementPage.tsx          # Main page component (NEW)
│
├── components/
│   ├── team/                            # New directory
│   │   ├── TeamMemberList.tsx           # Member list container (NEW)
│   │   ├── MemberRow.tsx                # Active member row (NEW)
│   │   ├── PendingInviteRow.tsx         # Pending invite row (NEW)
│   │   ├── AddMemberDialog.tsx          # Invitation modal (NEW)
│   │   ├── RoleChangeDialog.tsx         # Role change modal (NEW)
│   │   ├── RemoveMemberDialog.tsx       # Removal confirmation (NEW)
│   │   ├── ExpandablePermissionsRow.tsx # Permissions breakdown (NEW)
│   │   ├── PermissionBadge.tsx          # Permission indicator (NEW)
│   │   ├── TeamFilters.tsx              # Filter dropdowns (NEW)
│   │   ├── TeamSearch.tsx               # Search input (NEW)
│   │   └── TeamSortDropdown.tsx         # Sort dropdown (NEW)
│   │
│   ├── ui/                              # Existing shadcn/ui components (REUSED)
│   │   ├── dialog.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   └── tooltip.tsx
│   │
│   └── ProtectedRoute.tsx               # Existing auth wrapper (REUSED)
│
├── hooks/
│   ├── useInvitations.ts                # Extend with resend/revoke mutations (MODIFIED)
│   ├── useOrgMembers.ts                 # Extend with role/removal mutations (MODIFIED)
│   ├── useOrganization.ts               # Existing (NO CHANGES)
│   ├── useTeamFilters.ts                # URL state management (NEW)
│   └── useExpandedRows.ts               # Expandable row state (NEW)
│
├── lib/
│   ├── supabase.ts                      # Existing Supabase client (NO CHANGES)
│   └── permissions.ts                   # Role → permissions mapping (NEW)
│
└── types/
    ├── database.types.ts                # Auto-generated (NO CHANGES)
    └── team.types.ts                    # TeamMember, Invitation types (NEW)
```

---

## Development Workflow

### TDD Cycle (RED-GREEN-REFACTOR)

**Phase 1: Red (Write Failing Test)**
```bash
# Write test first
touch tests/integration/team-management/invite-members.test.tsx

# Run test (should fail)
npm test -- invite-members.test.tsx

# Expected: Test fails because AddMemberDialog doesn't exist yet
```

**Phase 2: Green (Implement Minimum Code)**
```bash
# Create component
touch src/components/team/AddMemberDialog.tsx

# Implement minimal code to pass test
# Run test again
npm test -- invite-members.test.tsx

# Expected: Test passes
```

**Phase 3: Refactor (Improve Code)**
```bash
# Clean up implementation
# Extract common logic to hooks
# Add TypeScript types

# Verify tests still pass
npm test -- invite-members.test.tsx
```

**Commit**: Include both test + implementation in same commit
```bash
git add tests/integration/team-management/invite-members.test.tsx
git add src/components/team/AddMemberDialog.tsx
git commit -m "test: add invitation creation flow

- Write failing test for Add Member dialog
- Implement AddMemberDialog component
- Add createInvitationMutation hook
- All tests passing ✅"
```

---

## Performance Checklist

- [ ] **Page Load**: <2s for 100 members (SC-001)
- [ ] **Search/Filter**: <300ms (SC-003)
- [ ] **Optimistic Updates**: <50ms perceived latency (SC-004)
- [ ] **Server Round-Trip**: <500ms (SC-004)
- [ ] **Invitation Email**: Delivered within 1 minute (SC-009)

---

## Accessibility Checklist (WCAG 2.1 AA)

- [ ] **Keyboard Navigation**: Tab, Enter, Space, ESC work for all interactions
- [ ] **ARIA Labels**: `aria-expanded`, `aria-controls`, `aria-label` on interactive elements
- [ ] **Screen Reader**: VoiceOver/NVDA can navigate and understand all UI elements
- [ ] **Focus Indicators**: Visible focus ring on all focusable elements
- [ ] **Color Contrast**: Text meets 4.5:1 contrast ratio
- [ ] **Touch Targets**: ≥32px for mobile (Feature 015 pattern)

---

## Troubleshooting

### Issue: "You need admin role to perform this action"

**Cause**: Logged-in user does not have `owner` or `admin` role.

**Solution**:
1. Check your role: `SELECT role FROM user_organizations WHERE user_id = auth.uid()`
2. Update role (as superuser): `UPDATE user_organizations SET role = 'owner' WHERE user_id = 'your-user-id'`

---

### Issue: Invitations not appearing in list

**Cause**: Query filtering out expired or accepted invitations.

**Solution**: Check `expires_at` and `status`:
```sql
SELECT * FROM invitations WHERE organization_id = 'your-org-id' ORDER BY created_at DESC;
```

---

### Issue: Optimistic update not rolling back on error

**Cause**: `onError` not configured in mutation or context not returned from `onMutate`.

**Solution**: Verify mutation has `onMutate` returning `{ previousData }` and `onError` calling `queryClient.setQueryData(key, context.previousData)`.

---

## Next Steps

1. Run `/speckit.tasks` to generate TDD task breakdown
2. Implement components following TDD cycle (red-green-refactor)
3. Run integration tests after each user story
4. Verify performance and accessibility before PR
5. Run `/speckit.analyze` to validate consistency across artifacts

---

## References

- **Feature Spec**: `specs/016-team-management-ui/spec.md`
- **Implementation Plan**: `specs/016-team-management-ui/plan.md`
- **Data Model**: `specs/016-team-management-ui/data-model.md`
- **Hook Contracts**: `specs/016-team-management-ui/contracts/hooks.contract.md`
- **Research Decisions**: `specs/016-team-management-ui/research.md`
- **Constitution**: `.specify/memory/constitution.md` (v1.0.2)
