# Implementation Plan: Team Management UI

**Branch**: `016-team-management-ui` | **Date**: 2025-10-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-team-management-ui/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a streamlined team management UI for organization owners and admins to view members, invite new members with pre-assigned roles, manage roles, remove members, and handle pending invitations. The interface displays active members and pending invites inline, supports search/filter/sort with URL persistence, shows expandable permissions breakdowns, and follows mobile-responsive patterns from Feature 015.

**Technical Approach**: Leverage existing Feature 002 infrastructure (`useInvitations`, `useOrgMembers`, `useOrganization` hooks), Radix UI primitives for modals/dialogs, TanStack Query for optimistic updates, and URL state management patterns from Features 010/011. New UI components include TeamMemberList, AddMemberDialog, RoleChangeDialog, and ExpandablePermissionsRow.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), React 18
**Primary Dependencies**: React Router v7, TanStack Query v5, Radix UI (Dialog, AlertDialog, Dropdown, Tooltip), Sonner (toast notifications), Tailwind CSS v4
**Storage**: Supabase PostgreSQL (existing tables: `invitations`, `user_organizations`, `users`; existing RLS policies from Feature 002)
**Testing**: Vitest + Testing Library (jsdom), integration tests for user stories, contract tests for hooks
**Target Platform**: Web (Chrome/Safari/Firefox), mobile-responsive (≤1024px breakpoint)
**Project Type**: Web application (React SPA)
**Performance Goals**: <2s page load for 100 members, <300ms search/filter, <50ms optimistic UI updates, <500ms server round-trip
**Constraints**: Owner/admin-only access via RLS, must maintain at least one owner, client-side filtering for ≤100 members, 7-day invitation expiry (Feature 002), WCAG 2.1 AA accessibility
**Scale/Scope**: Support teams up to 100 members (pagination deferred), 6 prioritized user stories, 49 functional requirements, ~8 new React components, 3 custom hooks (extend existing), 0 new database tables (reuse Feature 002 schema)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Type Safety First ✅

**Status**: PASS

- TypeScript strict mode enforced (`strict: true`, `noUncheckedIndexedAccess: true`)
- Database types auto-generated from Supabase schema (existing `invitations`, `user_organizations`, `users` tables)
- Path aliases (`@/*`) used for all imports
- No type assertions (`as`) needed (TanStack Query properly typed)

**Verification**:
- Existing Feature 002 types cover all entities (TeamMember, Invitation, Role, Organization)
- Hook return types inferred from Supabase schema via `database.types.ts`
- URL state management uses typed `useSearchParams` with validation

### Principle II: Component-Driven Development ✅

**Status**: PASS

- UI components follow shadcn/ui patterns (Radix UI primitives)
- New components:
  - `TeamManagementPage` (page-level, in `src/pages/`)
  - `TeamMemberList`, `MemberRow`, `PendingInviteRow` (business components, colocated with page)
  - `AddMemberDialog`, `RoleChangeDialog`, `RemoveMemberDialog` (modals, in `src/components/team/`)
  - `ExpandablePermissionsRow`, `PermissionBadge` (UI components)
  - `TeamFilters`, `TeamSearch`, `TeamSortDropdown` (filter components)
- State management:
  - Server state: TanStack Query (existing `useInvitations`, `useOrgMembers`, `useOrganization`)
  - Client state: URL parameters via React Router's `useSearchParams` (no Zustand needed)
  - Auth state: Existing `AuthContext`

**Verification**:
- Single responsibility: Each component handles one concern (list vs. row vs. dialog vs. filter)
- Composition: TeamMemberList composes MemberRow and PendingInviteRow
- Layout: ProtectedRoute wrapper already handles auth for `/team` route

### Principle III: Testing Discipline ✅

**Status**: PASS (TDD enforced via Specify workflow)

- Tests written before implementation (tasks.md orders tests first)
- Colocated test files:
  - `TeamManagementPage.test.tsx` (integration tests for all 6 user stories)
  - `AddMemberDialog.test.tsx`, `RoleChangeDialog.test.tsx`, `RemoveMemberDialog.test.tsx` (component tests)
  - `useTeamFilters.test.ts`, `useExpandedRows.test.ts` (hook tests)
- Integration tests cover spec acceptance scenarios (24 total from 6 user stories)
- Contract tests for:
  - Invitation creation, resend, revoke
  - Role changes with optimistic updates + rollback
  - Member removal
  - Filter/search/sort URL persistence

**Verification**:
- Vitest globals enabled (describe, it, expect)
- Testing Library used (no enzyme)
- Coverage targets: ≥70% overall, ≥60% for components (per constitution)

### Principle IV: Supabase Integration Patterns ✅

**Status**: PASS

- Row Level Security: Reusing existing RLS policies from Feature 002
  - `/team` page accessible only to owner/admin (policy: `user_organizations.role IN ('owner', 'admin')`)
  - Invitations scoped to organization (`invitations.organization_id`)
  - Cannot remove last owner (trigger: `prevent_last_owner_removal`)
- Multi-tenant isolation: All queries filtered by `organization_id` (via OrganizationSwitcher context)
- Environment validation: Existing `supabase.ts` validates `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- TanStack Query: All Supabase calls wrapped in hooks (`useInvitations`, `useOrgMembers`, `useOrganization`)
- Auth: Existing `AuthContext` provides `user` and `organization` context
- No new tables: Reusing `invitations`, `user_organizations`, `users` from Feature 002
- No migrations needed: All database schema already in place

**Verification**:
- Existing RLS policies enforce owner/admin access:
  ```sql
  -- user_organizations RLS (Feature 002)
  CREATE POLICY "Users can view org members"
    ON user_organizations FOR SELECT
    USING (organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

  -- invitations RLS (Feature 002)
  CREATE POLICY "Admins can manage invitations"
    ON invitations FOR ALL
    USING (organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));
  ```
- Existing trigger prevents last owner removal:
  ```sql
  -- Feature 002: prevent_last_owner_removal trigger
  CREATE TRIGGER prevent_last_owner_removal
    BEFORE DELETE OR UPDATE ON user_organizations
    FOR EACH ROW EXECUTE FUNCTION check_last_owner();
  ```

### Principle V: Specify Workflow Compliance ✅

**Status**: PASS

- `/specify` completed: `spec.md` with 6 user stories, 49 FRs, 10 success criteria
- `/clarify` not needed: All design decisions resolved during brainstorming (zero `[NEEDS CLARIFICATION]` markers)
- `/plan` in progress: This document (plan.md)
- `/tasks` next: Will generate TDD task breakdown
- `/analyze` recommended post-planning: Validate consistency across spec.md, plan.md, tasks.md
- `/implement` final: Execute tasks with per-task commits

**Verification**:
- Constitution gates checked above (TypeScript strict ✅, RLS policies ✅, TanStack Query ✅, TDD ✅)
- Tasks will order tests before implementation (enforced by tasks.md template)

### Summary

**✅ ALL GATES PASS** - No violations. No complexity justifications needed.

## Project Structure

### Documentation (this feature)

```text
specs/016-team-management-ui/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (in progress)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (to be generated)
│   └── hooks.contract.md  # TanStack Query hook contracts
├── checklists/
│   └── requirements.md  # Spec quality validation (completed, all items passed)
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan, use /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── pages/
│   └── TeamManagementPage.tsx        # Main team page component (new)
│
├── components/
│   ├── team/                         # Team-specific components (new directory)
│   │   ├── TeamMemberList.tsx        # Member list container
│   │   ├── MemberRow.tsx             # Active member row
│   │   ├── PendingInviteRow.tsx      # Pending invite row
│   │   ├── AddMemberDialog.tsx       # Invitation modal
│   │   ├── RoleChangeDialog.tsx      # Role change modal
│   │   ├── RemoveMemberDialog.tsx    # Removal confirmation
│   │   ├── ExpandablePermissionsRow.tsx  # Permissions breakdown
│   │   ├── PermissionBadge.tsx       # Permission indicator (✓/✗)
│   │   ├── TeamFilters.tsx           # Role/status filter dropdowns
│   │   ├── TeamSearch.tsx            # Search input (debounced)
│   │   └── TeamSortDropdown.tsx      # Sort options dropdown
│   │
│   ├── ui/                           # Existing shadcn/ui components (reused)
│   │   ├── dialog.tsx                # Radix Dialog primitive
│   │   ├── alert-dialog.tsx          # Radix AlertDialog primitive
│   │   ├── dropdown-menu.tsx         # Radix Dropdown primitive
│   │   └── tooltip.tsx               # Radix Tooltip primitive
│   │
│   └── ProtectedRoute.tsx            # Existing auth wrapper (reused)
│
├── hooks/
│   ├── useInvitations.ts             # Existing (extend with resend/revoke mutations)
│   ├── useOrgMembers.ts              # Existing (extend with role change/removal mutations)
│   ├── useOrganization.ts            # Existing (no changes needed)
│   ├── useTeamFilters.ts             # New: URL state for search/filter/sort
│   └── useExpandedRows.ts            # New: URL state for expanded member rows
│
├── lib/
│   ├── supabase.ts                   # Existing Supabase client (no changes)
│   └── permissions.ts                # New: Permission definitions by role
│
└── types/
    ├── database.types.ts             # Existing (auto-generated, no changes)
    └── team.types.ts                 # New: TeamMember, Invitation display types

tests/
├── integration/
│   └── team-management/              # New directory
│       ├── view-members.test.tsx     # User Story 1 tests
│       ├── invite-members.test.tsx   # User Story 2 tests
│       ├── search-filter.test.tsx    # User Story 3 tests
│       ├── manage-roles.test.tsx     # User Story 4 tests
│       ├── remove-members.test.tsx   # User Story 5 tests
│       └── manage-invitations.test.tsx  # User Story 6 tests
│
└── contract/
    └── team-hooks.contract.test.ts   # Hook mutation contracts
```

**Structure Decision**: Single React SPA structure (existing). All new components added to `src/pages/` (page-level) and `src/components/team/` (business components). No backend changes needed (Feature 002 RLS policies sufficient). Tests follow existing pattern (`tests/integration/` for user stories, `tests/contract/` for hooks).

## Complexity Tracking

**No violations** - Constitution Check passed all gates. No complexity justifications needed.

---

## Phase 0: Research & Technical Decisions

**Objective**: Resolve all technical unknowns and document technology choices.

### Research Tasks

Since Technical Context is fully specified (no `NEEDS CLARIFICATION` markers) and all dependencies are established from prior features, research focuses on **best practices** and **integration patterns**:

1. **URL State Management Best Practices**
   - Decision needed: How to structure URL query params for filters (flat vs. nested, encoding)
   - Existing pattern: Features 010/011 use flat params (`?search=X&role=Y`)
   - Research: React Router v7 `useSearchParams` API best practices for multiple filters

2. **Optimistic Update Patterns with TanStack Query**
   - Decision needed: Rollback strategy for failed mutations (role change, member removal)
   - Existing pattern: Feature 010 uses optimistic updates for milestone changes
   - Research: TanStack Query v5 `onMutate`, `onError`, `onSettled` lifecycle for rollback

3. **Expandable Row Accessibility**
   - Decision needed: ARIA attributes for expandable member rows (WCAG 2.1 AA compliance)
   - Existing pattern: Feature 010 expandable drawing rows (but accessibility not fully validated)
   - Research: ARIA `aria-expanded`, `aria-controls`, keyboard navigation (Enter/Space to toggle)

4. **Mobile Responsive Filter UI**
   - Decision needed: How to display 3 filter dropdowns + search + sort on ≤1024px screens
   - Existing pattern: Feature 015 uses vertical stacking for mobile filters
   - Research: Mobile filter UX patterns (collapsible filter panel vs. always visible)

5. **Permission Mapping by Role**
   - Decision needed: Where to define role → permissions mapping (database vs. client-side constant)
   - Existing: RLS policies enforce permissions, but UI needs to display capabilities
   - Research: Best practice for permission display (client-side constant vs. API endpoint)

### Output

Generate `research.md` with:
- **Decision**: URL params use flat structure (`?search=X&role=Y&status=Z&sort=W`)
- **Decision**: Optimistic updates with rollback via `onError` reverting cache
- **Decision**: Expandable rows use `aria-expanded`, `aria-controls`, role="button"
- **Decision**: Mobile filters use vertical stack (always visible, no collapse) per Feature 015
- **Decision**: Permission mapping via client-side constant `ROLE_PERMISSIONS` in `src/lib/permissions.ts`

## Phase 1: Design Artifacts

**Prerequisites**: `research.md` complete

### Data Model

Generate `data-model.md` documenting:

**Entities** (no new tables, all existing from Feature 002):

1. **TeamMember** (view, not table)
   - Joined data from: `users`, `user_organizations`
   - Fields: `user_id`, `organization_id`, `name`, `email`, `role`, `joined_at`, `last_active`
   - Relationships: Belongs to one organization, has one role
   - Validation: Role must be one of 7 valid roles
   - Query: `SELECT u.*, uo.role, uo.created_at as joined_at FROM users u JOIN user_organizations uo ON u.id = uo.user_id WHERE uo.organization_id = ? AND uo.deleted_at IS NULL`

2. **Invitation** (existing table)
   - Fields: `id`, `organization_id`, `email`, `role`, `token`, `message`, `created_at`, `sent_at`, `expires_at`, `status`
   - Relationships: Belongs to one organization, has one assigned role
   - Validation: Email format, role valid, expires_at = created_at + 7 days
   - State transitions: `pending` → `accepted` | `revoked` | `expired`

3. **Role** (enum, not table)
   - Values: `owner`, `admin`, `project_manager`, `foreman`, `qc_inspector`, `welder`, `viewer`
   - Permissions: Defined in `src/lib/permissions.ts` (client-side constant)
   - Validation: Database CHECK constraint on `user_organizations.role` and `invitations.role`

4. **Organization** (existing table, no changes)
   - Fields: `id`, `name`, `created_at`
   - Relationships: Has many team members (via `user_organizations`), has many invitations

**State Machines**:

```
Invitation State Transitions:
  [pending] → [accepted]  (user accepts invite)
  [pending] → [revoked]   (admin revokes invite)
  [pending] → [expired]   (7 days pass)
```

### API Contracts

Generate `contracts/hooks.contract.md` with TanStack Query hook contracts:

**Existing Hooks (extended)**:

1. **useInvitations()**
   - Queries:
     - `useInvitations({ organizationId, status?, limit?, offset? })` → `{ data: Invitation[], isLoading, error }`
   - Mutations (existing):
     - `createInvitationMutation({ email, role, message?, organizationId })` → `{ invitation }`
   - Mutations (NEW):
     - `resendInvitationMutation({ invitationId })` → `{ sent_at }` - Updates `sent_at` timestamp, sends new email
     - `revokeInvitationMutation({ invitationId })` → `void` - Sets `status = 'revoked'`, removes from list

2. **useOrgMembers()**
   - Queries:
     - `useOrgMembers({ organizationId, role?, search?, limit?, offset? })` → `{ data: TeamMember[], isLoading, error }`
   - Mutations (NEW):
     - `updateMemberRoleMutation({ userId, organizationId, newRole })` → `{ user_organization }`
       - Optimistic update: Immediately updates cache with new role
       - onError: Rollback cache to previous role
       - Validation: Prevents changing last owner to non-owner role (server-side check)
     - `removeMemberMutation({ userId, organizationId })` → `void`
       - Optimistic update: Remove member from cache
       - onError: Restore member to cache
       - Validation: Prevents removing last owner (server-side check via trigger)

**New Hooks**:

3. **useTeamFilters()**
   - Purpose: Manage URL state for search/filter/sort
   - Returns:
     ```ts
     {
       searchTerm: string;
       roleFilter: Role | 'all';
       statusFilter: 'all' | 'active' | 'pending';
       sortBy: 'name' | 'role' | 'join_date' | 'last_active';
       setSearch: (term: string) => void;  // Debounced 300ms
       setRoleFilter: (role: Role | 'all') => void;
       setStatusFilter: (status: 'all' | 'active' | 'pending') => void;
       setSortBy: (sort: 'name' | 'role' | 'join_date' | 'last_active') => void;
     }
     ```
   - Implementation: `useSearchParams` from React Router, debounce via `useDeferredValue`

4. **useExpandedRows()**
   - Purpose: Manage expanded state for member rows (permissions breakdown)
   - Returns:
     ```ts
     {
       expandedRows: Set<string>;  // Set of user IDs
       toggleRow: (userId: string) => void;
       isExpanded: (userId: string) => boolean;
     }
     ```
   - Implementation: Local state (not URL), `useState` with Set

### Quickstart Guide

Generate `quickstart.md` with:

**Developer Setup**:
1. Switch to feature branch: `git checkout 016-team-management-ui`
2. No database migrations needed (reusing Feature 002 schema)
3. No new dependencies (Radix UI + TanStack Query already installed)
4. Run tests: `npm test -- tests/integration/team-management`
5. Run dev server: `npm run dev`, navigate to `/team` (must be logged in as owner/admin)

**Testing Scenarios**:
1. View members: Login as owner → navigate to `/team` → verify member list displays
2. Invite member: Click "Add Team Member" → fill form → submit → verify pending invite appears
3. Search: Type in search input → verify list filters (debounced 300ms)
4. Change role: Click "Change Role" on member → select new role → verify optimistic update + toast
5. Remove member: Click "Remove Member" → confirm → verify member disappears + toast
6. Expand permissions: Click member row → verify permissions breakdown expands

**Architecture Diagram**:
```
[TeamManagementPage]
  ├── [TeamFilters] (search, role filter, status filter, sort)
  │     └── useTeamFilters() → URL state
  │
  └── [TeamMemberList]
        ├── useOrgMembers() → TanStack Query (active members)
        ├── useInvitations() → TanStack Query (pending invites)
        │
        ├── [MemberRow] (active member)
        │     ├── [ExpandablePermissionsRow] → useExpandedRows()
        │     ├── [RoleChangeDialog] → updateMemberRoleMutation (optimistic)
        │     └── [RemoveMemberDialog] → removeMemberMutation (optimistic)
        │
        └── [PendingInviteRow] (pending invite)
              ├── resendInvitationMutation
              └── revokeInvitationMutation
```

## Phase 2: Task Breakdown

**NOT GENERATED BY THIS COMMAND** - Use `/speckit.tasks` to generate `tasks.md` with TDD task ordering.

Expected task structure:
- Phase 1: Setup (create component files, hook files, types)
- Phase 2: View Members (User Story 1)
  - Write failing integration tests
  - Implement TeamMemberList, MemberRow
  - Implement useOrgMembers query
- Phase 3: Invite Members (User Story 2)
  - Write failing tests
  - Implement AddMemberDialog
  - Implement createInvitationMutation
- Phase 4: Search/Filter (User Story 3)
  - Write failing tests
  - Implement TeamFilters, useTeamFilters
- Phase 5: Manage Roles (User Story 4)
  - Write failing tests
  - Implement RoleChangeDialog, updateMemberRoleMutation (with optimistic updates)
- Phase 6: Remove Members (User Story 5)
  - Write failing tests
  - Implement RemoveMemberDialog, removeMemberMutation (with optimistic updates)
- Phase 7: Manage Invitations (User Story 6)
  - Write failing tests
  - Implement resendInvitationMutation, revokeInvitationMutation

## Post-Design Constitution Re-check

Re-evaluating all constitution gates after Phase 1 design:

### Principle I: Type Safety First ✅

**Status**: PASS (no changes from initial check)

- All types defined in `src/types/team.types.ts`:
  ```ts
  export interface TeamMember {
    user_id: string;
    organization_id: string;
    name: string;
    email: string;
    role: Role;
    joined_at: string;
    last_active: string | null;
  }

  export type Role = 'owner' | 'admin' | 'project_manager' | 'foreman' | 'qc_inspector' | 'welder' | 'viewer';

  export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
  ```
- Hook return types fully typed via TanStack Query `useQuery` and `useMutation`
- URL params typed via `useSearchParams<{ search?: string; role?: Role | 'all'; status?: 'all' | 'active' | 'pending'; sort?: string }>()`

### Principle II: Component-Driven Development ✅

**Status**: PASS (component structure finalized)

- Component hierarchy confirmed:
  - Page: `TeamManagementPage` (orchestrates filters + list)
  - Containers: `TeamMemberList` (data fetching + rendering)
  - Rows: `MemberRow`, `PendingInviteRow` (presentational)
  - Dialogs: `AddMemberDialog`, `RoleChangeDialog`, `RemoveMemberDialog` (modal interactions)
  - Filters: `TeamFilters`, `TeamSearch`, `TeamSortDropdown` (filter UI)
  - Details: `ExpandablePermissionsRow`, `PermissionBadge` (permissions display)
- State management strategy confirmed:
  - Server: TanStack Query (queries + mutations)
  - Client: `useSearchParams` (URL state), `useState` (expandable rows local state)
  - Auth: Existing `AuthContext`

### Principle III: Testing Discipline ✅

**Status**: PASS (test strategy finalized)

- Integration tests (6 files, 24 scenarios from spec acceptance criteria):
  - `view-members.test.tsx`: 4 scenarios (US1)
  - `invite-members.test.tsx`: 5 scenarios (US2)
  - `search-filter.test.tsx`: 4 scenarios (US3)
  - `manage-roles.test.tsx`: 4 scenarios (US4)
  - `remove-members.test.tsx`: 4 scenarios (US5)
  - `manage-invitations.test.tsx`: 3 scenarios (US6)
- Contract tests:
  - `team-hooks.contract.test.ts`: Mutation contracts (optimistic updates, rollback, validation errors)
- Component tests (colocated):
  - `AddMemberDialog.test.tsx`, `RoleChangeDialog.test.tsx`, `RemoveMemberDialog.test.tsx`
  - `useTeamFilters.test.ts`, `useExpandedRows.test.ts`

### Principle IV: Supabase Integration Patterns ✅

**Status**: PASS (no database changes, RLS policies sufficient)

- No new tables needed
- No new RLS policies needed (Feature 002 policies cover all requirements)
- TanStack Query wraps all Supabase calls via hooks
- Mutations respect RLS constraints:
  - `updateMemberRoleMutation` → blocked by RLS if user not owner/admin
  - `removeMemberMutation` → blocked by trigger if attempting to remove last owner
  - `createInvitationMutation` → blocked by RLS if user not owner/admin

### Principle V: Specify Workflow Compliance ✅

**Status**: PASS

- Phase 0 research: `research.md` generated (5 decisions documented)
- Phase 1 design: `data-model.md`, `contracts/hooks.contract.md`, `quickstart.md` generated
- Phase 2 tasks: Ready for `/speckit.tasks` command
- Constitution gates: All passing (TypeScript strict ✅, RLS ✅, TanStack Query ✅, TDD ✅)

### Summary

**✅ ALL GATES STILL PASS** - No violations introduced during design phase.

---

**Constitution Version**: 1.0.2 (ratified 2025-10-04, last amended 2025-10-23)

---

## Next Steps

1. **Run `/speckit.tasks`** to generate `tasks.md` with TDD task breakdown
2. **Optional: Run `/speckit.analyze`** to validate consistency across `spec.md`, `plan.md`, `tasks.md`
3. **Run `/speckit.implement`** to execute tasks with per-task commits

## Appendix: Technology Choices

**Confirmed Technologies** (all existing, no new dependencies):
- React 18 + TypeScript 5 (strict mode)
- React Router v7 (routing + URL state)
- TanStack Query v5 (server state + optimistic updates)
- Radix UI (Dialog, AlertDialog, Dropdown, Tooltip primitives)
- Sonner (toast notifications)
- Tailwind CSS v4 (styling)
- Vitest + Testing Library (testing)
- Supabase (PostgreSQL + Auth + RLS)

**New Patterns** (not new libraries):
- URL state management via `useSearchParams` (React Router)
- Optimistic updates with rollback via TanStack Query `onMutate` / `onError`
- Permission mapping via client-side constant `ROLE_PERMISSIONS`
- Expandable rows with ARIA accessibility (`aria-expanded`, `aria-controls`)
