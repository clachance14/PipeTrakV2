# Tasks: Team Management UI

**Feature Branch**: `016-team-management-ui`
**Input**: Design documents from `/specs/016-team-management-ui/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/hooks.contract.md ✅

**Tests**: Included per Constitution Principle III (TDD mandatory via Specify workflow)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and foundational files

- [X] T001 [P] Create types file src/types/team.types.ts with TeamMember, Invitation, Role types
- [X] T002 [P] Create permissions library src/lib/permissions.ts with ROLE_PERMISSIONS constant and hasPermission utility
- [X] T003 [P] Create team components directory src/components/team/
- [X] T004 [P] Create integration tests directory tests/integration/team-management/
- [X] T005 [P] Create contract tests file tests/contract/team-hooks.contract.test.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core hooks and state management that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 [P] Create useExpandedRows hook in src/hooks/useExpandedRows.ts (local state for expandable rows)
- [X] T007 [P] Create useTeamFilters hook in src/hooks/useTeamFilters.ts (URL state management with debounced search)
- [X] T008 [P] Extend useInvitations hook in src/hooks/useInvitations.ts (add resendInvitationMutation)
- [X] T009 [P] Extend useInvitations hook in src/hooks/useInvitations.ts (add revokeInvitationMutation)
- [X] T010 [P] Extend useOrgMembers hook in src/hooks/useOrgMembers.ts (add updateMemberRoleMutation with optimistic updates)
- [X] T011 [P] Extend useOrgMembers hook in src/hooks/useOrgMembers.ts (add removeMemberMutation with optimistic updates)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Team Members and Pending Invitations (Priority: P1) 🎯 MVP

**Goal**: Display unified team member list with active members and pending invitations, with expandable permissions breakdown

**Independent Test**: Login as owner/admin, navigate to `/team`, verify member list displays with names, emails, roles, join dates, and pending invites inline. Click row to expand permissions breakdown.

### Tests for User Story 1 (TDD - Write First)

> **TDD Protocol**: Write these tests FIRST, ensure they FAIL, then implement components to make tests pass

- [X] T012 [P] [US1] Write integration test for viewing team member list in tests/integration/team-management/view-members.test.tsx (covers acceptance scenarios 1-4: display members, pending invites inline, access control, expandable permissions)
- [X] T013 [P] [US1] Write component test for MemberRow in src/components/team/MemberRow.test.tsx (test expandable behavior, ARIA attributes, keyboard navigation)
- [X] T014 [P] [US1] Write component test for PermissionBadge in src/components/team/PermissionBadge.test.tsx (test checkmark/X rendering based on granted prop)

### Implementation for User Story 1

- [X] T015 [P] [US1] Create PermissionBadge component in src/components/team/PermissionBadge.tsx (checkmark/X indicator)
- [X] T016 [P] [US1] Create ExpandablePermissionsRow component in src/components/team/ExpandablePermissionsRow.tsx (permissions grid with badges)
- [X] T017 [US1] Create MemberRow component in src/components/team/MemberRow.tsx (active member row with click-to-expand, ARIA attributes: role="button", aria-expanded, aria-controls, tabIndex={0})
- [X] T018 [US1] Create PendingInviteRow component in src/components/team/PendingInviteRow.tsx (pending invite row with "Pending" badge)
- [X] T019 [US1] Create TeamMemberList component in src/components/team/TeamMemberList.tsx (container fetching data via useOrgMembers and useInvitations, renders MemberRow and PendingInviteRow components)
- [X] T020 [US1] Create TeamManagementPage component in src/pages/TeamManagementPage.tsx (main page with "Add Team Member" button, wraps TeamMemberList)
- [X] T021 [US1] Add /team route to src/App.tsx with ProtectedRoute wrapper (owner/admin only access)
- [X] T022 [US1] Verify RLS policies restrict access to owner/admin roles (manual test: login as viewer, attempt to access /team, expect 403)

**Checkpoint**: User Story 1 should be fully functional - team visibility with expandable permissions works independently

---

## Phase 4: User Story 2 - Invite New Team Members (Priority: P1)

**Goal**: Enable owners/admins to invite new members via email with pre-assigned roles and optional custom message

**Independent Test**: Click "Add Team Member" button, fill form (email + role + optional message), submit, verify pending invite appears in list with success toast and invitation email sent.

### Tests for User Story 2 (TDD - Write First)

> **TDD Protocol**: Write these tests FIRST, ensure they FAIL, then implement components to make tests pass

- [X] T023 [P] [US2] Write integration test for invitation flow in tests/integration/team-management/invite-members.test.tsx (covers acceptance scenarios 1-5: modal opens, form validation, success flow, duplicate email error, email sent)
- [X] T024 [US2] Write component test for AddMemberDialog in src/components/team/AddMemberDialog.test.tsx (test form validation, submit behavior, error states)

### Implementation for User Story 2

- [X] T025 [US2] Create AddMemberDialog component in src/components/team/AddMemberDialog.tsx (Radix Dialog with form: email input, role dropdown, optional message textarea max 500 chars, validation for duplicate emails, submit triggers createInvitationMutation)
- [X] T026 [US2] Integrate AddMemberDialog into TeamManagementPage triggered by "Add Team Member" button
- [X] T027 [US2] Add email validation logic to AddMemberDialog (format check, duplicate email query against users and invitations tables, inline error text below email input field per shadcn/ui patterns)
- [X] T028 [US2] Add success toast with message "Invitation sent to {email}" on successful invitation creation
- [X] T029 [US2] Add error handling for duplicate emails (inline validation error), permission denied (403 toast), and other errors (generic toast)

**Checkpoint**: User Stories 1 AND 2 should both work independently - can view team and invite new members

---

## Phase 5: User Story 3 - Search and Filter Team Members (Priority: P2)

**Goal**: Enable search by name/email and filter by role/status with URL persistence and sort options

**Independent Test**: Enter search term in input, select role filter, select status filter, select sort option, verify list updates and URL params persist across page refresh.

### Tests for User Story 3 (TDD - Write First)

> **TDD Protocol**: Write these tests FIRST, ensure they FAIL, then implement components to make tests pass

- [X] T030 [P] [US3] Write integration test for search/filter flow in tests/integration/team-management/search-filter.test.tsx (covers acceptance scenarios 1-4: search debouncing, role filter, status filter, sort options, URL persistence)
- [X] T031 [US3] Write hook test for useTeamFilters in src/hooks/useTeamFilters.test.ts (test URL state management, debouncing, filter persistence)

### Implementation for User Story 3

- [X] T032 [P] [US3] Create TeamSearch component in src/components/team/TeamSearch.tsx (search input with 300ms debounce via useTeamFilters)
- [X] T033 [P] [US3] Create TeamSortDropdown component in src/components/team/TeamSortDropdown.tsx (Radix Select with options: Name, Role, Join Date, Last Active)
- [X] T034 [US3] Create TeamFilters component in src/components/team/TeamFilters.tsx (container with role filter dropdown, status filter dropdown, search input, sort dropdown, vertical stack on mobile ≤1024px)
- [X] T035 [US3] Integrate TeamFilters into TeamManagementPage above TeamMemberList
- [X] T036 [US3] Add client-side filtering logic to TeamMemberList using searchTerm, roleFilter, statusFilter from useTeamFilters hook
- [X] T037 [US3] Add client-side sorting logic to TeamMemberList using sortBy from useTeamFilters hook (sort by name, role, join_date, last_active)
- [X] T038 [US3] Validate URL persistence (validation only - implementation in T007): apply filters, refresh page, verify filters restored from URL query params

**Checkpoint**: All three user stories (view, invite, search/filter) should work independently

---

## Phase 6: User Story 4 - Manage Member Roles (Priority: P2)

**Goal**: Enable owners/admins to change team member roles with optimistic UI updates and validation to prevent removing last owner

**Independent Test**: Click "Change Role" action on member row, select new role, confirm, verify role updates immediately with success toast and persists after page refresh. Verify error when attempting to change last owner to non-owner role.

### Tests for User Story 4 (TDD - Write First)

> **TDD Protocol**: Write these tests FIRST, ensure they FAIL, then implement components to make tests pass

- [X] T039 [P] [US4] Write integration test for role management in tests/integration/team-management/manage-roles.test.tsx (covers acceptance scenarios 1-4: role change dialog, optimistic update, last owner protection, rollback on error)
- [X] T040 [US4] Write component test for RoleChangeDialog in src/components/team/RoleChangeDialog.test.tsx (test role selection, confirmation, error states)

### Implementation for User Story 4

- [X] T041 [US4] Create RoleChangeDialog component in src/components/team/RoleChangeDialog.tsx (Radix Dialog with role dropdown, confirm button, triggers updateMemberRoleMutation with optimistic updates)
- [X] T042 [US4] Add "Change Role" action button to MemberRow component (visible to owner/admin only, disabled with tooltip for viewers)
- [X] T043 [US4] Integrate RoleChangeDialog into MemberRow triggered by "Change Role" button
- [X] T044 [US4] Add success toast with message "Role updated to {newRole}" on successful role change
- [X] T045 [US4] Add error handling for "cannot change last owner" (422 toast with explanation), permission denied (403 toast), and rollback optimistic update on error
- [X] T046 [US4] Verify optimistic update: role changes immediately (<50ms perceived latency) before server confirmation

**Checkpoint**: All four user stories (view, invite, search/filter, manage roles) should work independently

---

## Phase 7: User Story 5 - Remove Team Members (Priority: P2)

**Goal**: Enable owners/admins to remove members from organization with confirmation dialog and validation to prevent removing last owner

**Independent Test**: Click "Remove Member" action, confirm in AlertDialog, verify member disappears from list with success toast. Verify removed user cannot access organization resources (RLS enforcement). Verify error when attempting to remove last owner.

### Tests for User Story 5 (TDD - Write First)

> **TDD Protocol**: Write these tests FIRST, ensure they FAIL, then implement components to make tests pass

- [X] T047 [P] [US5] Write integration test for member removal in tests/integration/team-management/remove-members.test.tsx (covers acceptance scenarios 1-4: confirmation dialog, removal success, last owner protection, RLS enforcement)
- [X] T048 [US5] Write component test for RemoveMemberDialog in src/components/team/RemoveMemberDialog.test.tsx (test confirmation flow, cancel behavior)

### Implementation for User Story 5

- [X] T049 [US5] Create RemoveMemberDialog component in src/components/team/RemoveMemberDialog.tsx (Radix AlertDialog with "Are you sure?" message, confirm/cancel buttons, triggers removeMemberMutation with optimistic updates)
- [X] T050 [US5] Add "Remove Member" action button to MemberRow component (visible to owner/admin only, disabled with tooltip for viewers)
- [X] T051 [US5] Integrate RemoveMemberDialog into MemberRow triggered by "Remove Member" button
- [X] T052 [US5] Add success toast with message "{memberName} removed from organization" on successful removal
- [X] T053 [US5] Add error handling for "cannot remove last owner" (422 toast with explanation), permission denied (403 toast), and rollback optimistic update on error
- [X] T054 [US5] Verify RLS enforcement: removed user immediately loses access to organization resources (test by attempting to access /team as removed user, expect 403)

**Checkpoint**: All five user stories (view, invite, search/filter, manage roles, remove members) should work independently

---

## Phase 8: User Story 6 - Manage Pending Invitations (Priority: P3)

**Goal**: Enable owners/admins to resend or revoke pending invitations with confirmation dialogs

**Independent Test**: Locate pending invite, click "Resend Invitation" to trigger new email and update "Last sent" timestamp, or click "Revoke Invitation" with confirmation to cancel it and verify invite link shows error when accessed.

### Tests for User Story 6 (TDD - Write First)

> **TDD Protocol**: Write these tests FIRST, ensure they FAIL, then implement components to make tests pass

- [X] T055 [P] [US6] Write integration test for invitation management in tests/integration/team-management/manage-invitations.test.tsx (covers acceptance scenarios 1-3: resend with timestamp update, revoke with confirmation, revoked link error)
- [X] T056 [US6] Write component test for PendingInviteRow in src/components/team/PendingInviteRow.test.tsx (test resend/revoke actions, optimistic updates)

### Implementation for User Story 6

- [X] T057 [P] [US6] Add "Resend Invitation" action button to PendingInviteRow component (triggers resendInvitationMutation with optimistic sent_at update)
- [X] T058 [P] [US6] Add "Revoke Invitation" action button to PendingInviteRow component (triggers revokeInvitationMutation with confirmation dialog)
- [X] T059 [US6] Add success toast with message "Invitation resent to {email}" on successful resend
- [X] T060 [US6] Add success toast with message "Invitation cancelled" on successful revocation
- [X] T061 [US6] Add error handling for "invitation no longer exists" (404 toast), "cannot revoke accepted invitation" (422 toast), permission denied (403 toast)
- [X] T062 [US6] Verify optimistic updates: sent_at updates immediately on resend, invitation disappears immediately on revoke (before server confirmation)
- [X] T063 [US6] Verify revoked invitation link shows error "Invitation no longer valid" when accessed by invitee

**Checkpoint**: All six user stories should be fully functional and independently testable

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Mobile responsiveness, accessibility, security validation, and final refinements affecting multiple stories

- [X] T064 [P] Add mobile responsive styles to TeamFilters (vertical stack with w-full inputs on ≤1024px, horizontal layout on >1024px)
- [X] T065 [P] Add mobile responsive styles to MemberRow and PendingInviteRow with accordion pattern for expandable permissions on mobile (touch-friendly 32px+ action buttons per Feature 015 patterns)
- [X] T066 [P] Verify WCAG 2.1 AA accessibility: keyboard navigation (Tab, Enter, Space, ESC), focus indicators on all interactive elements, ARIA labels complete, screen reader compatibility with VoiceOver/NVDA
- [X] T067 [P] Add empty state message "No team members yet" with "Add Team Member" CTA when organization has zero members
- [X] T068 [P] Add empty state message "No results found" when filter/search criteria match zero members
- [X] T069 [P] Performance validation: page load <2s for 100 members (SC-001), search/filter <300ms (SC-003), optimistic updates <50ms (SC-004)
- [X] T070 [P] Add color contrast validation for all text (4.5:1 ratio per WCAG 2.1 AA)
- [X] T071 [P] Email delivery validation: verify invitation emails delivered within 1 minute via Supabase logs or email monitoring (SC-009)
- [X] T072 [P] Security audit: automated RLS policy tests covering owner/admin access control, last owner protection, and multi-tenant isolation (SC-010)
- [X] T073 Run quickstart.md validation scenarios (all 6 testing scenarios from quickstart.md)
- [X] T074 Final integration test: verify all 6 user stories work together without conflicts
- [X] T075 Update CLAUDE.md with Feature 016 completion summary and active technologies

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-8)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P1 → P2 → P2 → P3)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Integrates with US1 TeamMemberList but independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 TeamMemberList but independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 MemberRow but independently testable
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 MemberRow but independently testable
- **User Story 6 (P3)**: Can start after Foundational (Phase 2) - Integrates with US1 PendingInviteRow but independently testable

### Within Each User Story

- Components can be built in parallel if marked [P]
- Dialogs/modals must be integrated after base components exist
- Validation and error handling added after core functionality works
- Story must be independently testable before moving to next priority

### Parallel Opportunities

- All Setup tasks (T001-T005) can run in parallel
- All Foundational hooks (T006-T011) can run in parallel within Phase 2
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Within User Story 1: T012, T013 can run in parallel
- Within User Story 3: T025, T026 can run in parallel
- Within User Story 6: T044, T045 can run in parallel
- All Polish tasks (T051-T057) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch parallel UI components for User Story 1:
Task: "Create PermissionBadge component in src/components/team/PermissionBadge.tsx"
Task: "Create ExpandablePermissionsRow component in src/components/team/ExpandablePermissionsRow.tsx"

# Then proceed sequentially with components that depend on these:
Task: "Create MemberRow component in src/components/team/MemberRow.tsx"
Task: "Create PendingInviteRow component in src/components/team/PendingInviteRow.tsx"
Task: "Create TeamMemberList component in src/components/team/TeamMemberList.tsx"
```

---

## Parallel Example: Foundational Phase

```bash
# Launch all hooks in parallel (different files, no dependencies):
Task: "Create useExpandedRows hook in src/hooks/useExpandedRows.ts"
Task: "Create useTeamFilters hook in src/hooks/useTeamFilters.ts"
Task: "Extend useInvitations hook (add resendInvitationMutation)"
Task: "Extend useInvitations hook (add revokeInvitationMutation)"
Task: "Extend useOrgMembers hook (add updateMemberRoleMutation)"
Task: "Extend useOrgMembers hook (add removeMemberMutation)"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (view team members)
4. Complete Phase 4: User Story 2 (invite members)
5. **STOP and VALIDATE**: Test US1 + US2 independently
6. Deploy/demo if ready (MVP: team visibility + invitations)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (team visibility)
3. Add User Story 2 → Test independently → Deploy/Demo (MVP: view + invite)
4. Add User Story 3 → Test independently → Deploy/Demo (add search/filter)
5. Add User Story 4 → Test independently → Deploy/Demo (add role management)
6. Add User Story 5 → Test independently → Deploy/Demo (add member removal)
7. Add User Story 6 → Test independently → Deploy/Demo (full feature complete)
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (view members)
   - Developer B: User Story 2 (invite members)
   - Developer C: User Story 3 (search/filter)
3. Stories complete and integrate independently
4. After P1 stories (1+2) complete:
   - Developer A: User Story 4 (manage roles)
   - Developer B: User Story 5 (remove members)
   - Developer C: User Story 6 (manage invitations)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **TDD Mandatory**: Tests written FIRST per Constitution Principle III (Red-Green-Refactor cycle)
- Commit tests + implementation together after each user story or logical group
- Stop at any checkpoint to validate story independently
- Performance targets: <2s page load, <300ms filters, <50ms optimistic updates, <500ms server round-trip
- Accessibility: WCAG 2.1 AA compliance required (keyboard nav, ARIA labels, focus indicators, color contrast)
- Mobile breakpoint: ≤1024px (vertical stack filters, accordion permissions on mobile, 32px+ touch targets)
- Security: Email delivery validation (SC-009) and automated RLS tests (SC-010) in Polish phase
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Task Count Summary

- **Total Tasks**: 75
- **Phase 1 (Setup)**: 5 tasks
- **Phase 2 (Foundational)**: 6 tasks (CRITICAL - blocks all stories)
- **Phase 3 (User Story 1 - View Members)**: 11 tasks (3 tests + 8 implementation)
- **Phase 4 (User Story 2 - Invite Members)**: 7 tasks (2 tests + 5 implementation)
- **Phase 5 (User Story 3 - Search/Filter)**: 9 tasks (2 tests + 7 implementation)
- **Phase 6 (User Story 4 - Manage Roles)**: 8 tasks (2 tests + 6 implementation)
- **Phase 7 (User Story 5 - Remove Members)**: 8 tasks (2 tests + 6 implementation)
- **Phase 8 (User Story 6 - Manage Invitations)**: 9 tasks (2 tests + 7 implementation)
- **Phase 9 (Polish)**: 12 tasks

**Parallel Opportunities**: 26 tasks marked [P] can run concurrently within their phases

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 + Phase 4 (User Stories 1+2: view team + invite members) = 29 tasks (includes TDD tests)

**Independent Test Criteria**: Each user story phase includes specific validation steps to confirm story works independently before moving to next priority

**Implementation Strategy**: Complete Foundational phase (blocks all stories), then implement user stories in priority order (P1 → P1 → P2 → P2 → P3) or in parallel if team capacity allows, ending with cross-cutting polish tasks
