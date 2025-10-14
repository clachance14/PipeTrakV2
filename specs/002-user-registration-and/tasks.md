# Tasks: User Registration & Team Onboarding

**Feature**: 002-user-registration-and
**Input**: Design documents from `/home/clachance14/projects/PipeTrak_V2/specs/002-user-registration-and/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Summary

**Tech Stack** (from plan.md):
- Language: TypeScript 5.6.2 (strict mode)
- Framework: React 18.3 + Vite 6.0.5
- Backend: Supabase (PostgreSQL with RLS)
- State: TanStack Query 5.90 + Zustand 5.0
- UI: Radix UI + Tailwind CSS v4
- Testing: Vitest 3.2.4 + Testing Library 16.3

**Entities** (from data-model.md):
- organizations (modified - add soft delete)
- user_organizations (modified - add role ENUM)
- invitations (new table)

**API Contracts** (from contracts/):
- registration.schema.json: 2 endpoints
- invitations.schema.json: 6 endpoints
- roles.schema.json: 5 endpoints
- Total: 13 endpoints

**Test Scenarios** (from quickstart.md):
- 7 integration scenarios
- 5 edge cases

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in task descriptions

---

## Phase 3.1: Database Setup

- [X] **T001** Create database migration file `supabase/migrations/00002_invitations_table.sql`
  - Create ENUM types: `user_role`, `invitation_status`
  - Alter `organizations` table: add `deleted_at`, `deleted_by` columns
  - Alter `user_organizations` table: add `role` column (type `user_role`), add `deleted_at` column
  - Create `invitations` table with all columns from data-model.md
  - Create indexes: `invitations(token_hash)`, `invitations(organization_id, email, status)`, `organizations(deleted_at)`, `user_organizations(role)`
  - Create unique index on `user_organizations(user_id, organization_id)` WHERE `deleted_at IS NULL`

- [X] **T002** Create RLS policies in migration file
  - Update `organizations` policy: exclude soft-deleted orgs (`deleted_at IS NULL`)
  - Update `user_organizations` policies: add role-based checks for team management
  - Create `invitations` policies: owners/admins can CRUD, all can view their own
  - Implement permission hierarchy checks (owner > admin > project_manager, etc.)

- [X] **T003** Create database triggers in migration file
  - Trigger: `prevent_last_owner_removal` on `user_organizations` (BEFORE UPDATE/DELETE)
  - Trigger: `cascade_org_soft_delete` on `organizations` (AFTER UPDATE)
  - Add comments explaining trigger logic per data-model.md

- [X] **T004** Apply migration and generate TypeScript types
  - Run: `supabase db reset` (local dev)
  - Run: `npx supabase gen types typescript --linked > src/types/database.types.ts`
  - Verify all new types exported: `UserRole`, `InvitationStatus`, `Database` tables updated

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (from contracts/*.schema.json)

- [X] **T005 [P]** Contract test: POST /api/auth/register in `tests/contract/registration.contract.test.ts`
  - Test request schema: email, password, full_name, organization_name, accept_terms
  - Test 201 response: user, organization, session
  - Test 400 errors: INVALID_EMAIL, EMAIL_ALREADY_REGISTERED, PASSWORD_TOO_SHORT, TERMS_NOT_ACCEPTED
  - Test 500 error: REGISTRATION_FAILED

- [X] **T006 [P]** Contract test: POST /api/auth/check-email in `tests/contract/registration.contract.test.ts`
  - Test request schema: email
  - Test 200 response: available (boolean)

- [X] **T007 [P]** Contract test: POST /api/invitations in `tests/contract/invitations.contract.test.ts`
  - Test request schema: email, role, organization_id (optional)
  - Test 201 response: invitation, email_sent
  - Test 400 errors: INVALID_EMAIL, DUPLICATE_INVITATION, USER_ALREADY_MEMBER, INVALID_ROLE
  - Test 403 error: INSUFFICIENT_PERMISSIONS

- [X] **T008 [P]** Contract test: POST /api/invitations/accept in `tests/contract/invitations.contract.test.ts`
  - Test request schema: token, password (conditional), full_name (conditional)
  - Test 200 response: user, organization, role, session
  - Test 400 errors: INVALID_TOKEN, INVITATION_EXPIRED, INVITATION_REVOKED, PASSWORD_REQUIRED
  - Test 404 error: INVITATION_NOT_FOUND

- [X] **T009 [P]** Contract test: POST /api/invitations/:id/resend in `tests/contract/invitations.contract.test.ts`
  - Test 200 response: success, email_sent, invitation_link
  - Test 400 errors: INVITATION_ALREADY_ACCEPTED, INVITATION_REVOKED, INVITATION_EXPIRED

- [X] **T010 [P]** Contract test: DELETE /api/invitations/:id in `tests/contract/invitations.contract.test.ts`
  - Test 200 response: success
  - Test 400 errors: INVITATION_ALREADY_ACCEPTED, INVITATION_ALREADY_REVOKED
  - Test 404 error

- [X] **T011 [P]** Contract test: GET /api/invitations in `tests/contract/invitations.contract.test.ts`
  - Test query params: status, limit, offset
  - Test 200 response: invitations array, total_count

- [X] **T012 [P]** Contract test: GET /api/invitations/validate in `tests/contract/invitations.contract.test.ts`
  - Test query param: token
  - Test 200 response: valid, invitation details
  - Test 400 response: invalid, error

- [X] **T013 [P]** Contract test: PATCH /api/organizations/:org_id/members/:user_id/role in `tests/contract/roles.contract.test.ts`
  - Test request schema: role
  - Test 200 response: success, user with updated role
  - Test 400 errors: CANNOT_REMOVE_LAST_OWNER, CANNOT_CHANGE_OWN_ROLE, INVALID_ROLE
  - Test 403 error: INSUFFICIENT_PERMISSIONS

- [X] **T014 [P]** Contract test: DELETE /api/organizations/:org_id/members/:user_id in `tests/contract/roles.contract.test.ts`
  - Test 200 response: success
  - Test 400 errors: CANNOT_REMOVE_LAST_OWNER, TRANSFER_OWNERSHIP_REQUIRED

- [X] **T015 [P]** Contract test: POST /api/organizations/:org_id/leave in `tests/contract/roles.contract.test.ts`
  - Test request schema: transfer_ownership_to (optional)
  - Test 200 response: success, ownership_transferred
  - Test 400 errors: TRANSFER_OWNERSHIP_REQUIRED, INVALID_TRANSFER_TARGET

- [X] **T016 [P]** Contract test: GET /api/organizations/:org_id/members in `tests/contract/roles.contract.test.ts`
  - Test query params: role, search, limit, offset
  - Test 200 response: members array, total_count

- [X] **T017 [P]** Contract test: POST /api/auth/switch-organization in `tests/contract/roles.contract.test.ts`
  - Test request schema: organization_id
  - Test 200 response: organization, role
  - Test 403 error: NOT_ORGANIZATION_MEMBER
  - Test 404 error

- [X] **T018 [P]** Contract test: GET /api/auth/organizations in `tests/contract/roles.contract.test.ts`
  - Test 200 response: organizations array with id, name, role, joined_at

### Integration Tests (from quickstart.md scenarios)

- [X] **T019 [P]** Integration test: First user signup (Scenario 1) in `tests/integration/registration.test.ts`
  - User completes registration form
  - Assert: user created in auth.users
  - Assert: organization created
  - Assert: user_organizations record with role='owner'
  - Assert: redirected to /onboarding/wizard
  - Assert: email verification sent

- [X] **T020 [P]** Integration test: Owner invites team member (Scenario 2) in `tests/integration/invitation-flow.test.ts`
  - Owner logs in, navigates to team management
  - Owner sends invitation with role='foreman'
  - Assert: invitation record created with status='pending'
  - Assert: expires_at = 7 days from now
  - Assert: token_hash contains SHA-256 hash (not raw token)
  - Assert: email sent

- [X] **T021 [P]** Integration test: New user accepts invitation (Scenario 3) in `tests/integration/invitation-flow.test.ts`
  - Invitee opens invitation link
  - Invitee sets password and full name
  - Assert: user account created
  - Assert: user_organizations record with correct role
  - Assert: invitation status='accepted'
  - Assert: redirected to role-specific dashboard

- [X] **T022 [P]** Integration test: Existing user accepts invitation (Scenario 4) in `tests/integration/multi-org.test.ts`
  - Create second organization via new registration
  - First owner invites second owner to their org
  - Second owner accepts (already has account)
  - Assert: same user ID (not duplicated)
  - Assert: user has 2 organization memberships
  - Assert: organization switcher appears

- [X] **T023 [P]** Integration test: Role-based access (Scenario 5) in `tests/integration/role-permissions.test.ts`
  - Log in as foreman
  - Assert: can view/update components, assign welders
  - Assert: cannot access billing, team management, create projects
  - Attempt direct route access to /team
  - Assert: redirected with "Insufficient permissions"

- [X] **T024 [P]** Integration test: Owner changes role (Scenario 6) in `tests/integration/role-permissions.test.ts`
  - Owner logs in, navigates to team management
  - Owner changes user role from 'foreman' to 'project_manager'
  - Assert: user_organizations.role updated
  - Assert: permissions update immediately

- [X] **T025 [P]** Integration test: Multi-org switching (Scenario 7) in `tests/integration/multi-org.test.ts`
  - User with 2 orgs logs in
  - Assert: organization switcher shows both orgs
  - User switches to second org
  - Assert: header updates, menu items change based on role
  - Assert: localStorage persists active org
  - Assert: RLS blocks access to previous org data

### Edge Case Tests (from quickstart.md)

- [X] **T026 [P]** Integration test: Expired invitation in `tests/integration/invitation-edge-cases.test.ts`
  - Create invitation, manually set expires_at to past
  - Attempt to accept invitation
  - Assert: error "Invitation expired"

- [X] **T027 [P]** Integration test: Revoked invitation in `tests/integration/invitation-edge-cases.test.ts`
  - Create invitation, owner revokes it
  - Attempt to accept invitation
  - Assert: error "Invitation has been revoked"

- [X] **T028 [P]** Integration test: Last owner leaving org in `tests/integration/ownership-transfer.test.ts`
  - Owner (only owner) clicks "Leave Organization"
  - Assert: modal prompts for ownership transfer
  - Owner selects admin, confirms transfer
  - Assert: admin role updated to 'owner'
  - Assert: original owner removed (soft delete)

- [X] **T029 [P]** Integration test: Organization soft delete in `tests/integration/ownership-transfer.test.ts`
  - Last owner declines transfer, chooses "Delete Organization"
  - Confirm deletion
  - Assert: organizations.deleted_at set
  - Assert: all user_organizations soft-deleted (cascade trigger)
  - Assert: recovery window < 30 days

- [X] **T030 [P]** Integration test: Email send failure in `tests/integration/invitation-edge-cases.test.ts`
  - Mock email service failure
  - Create invitation
  - Assert: error toast displayed
  - Assert: invitation still created in database
  - Assert: invitation link shown for manual sharing

---

## Phase 3.3: Helper Libraries (ONLY after tests are failing)

- [X] **T031 [P]** Create invitation token helpers in `src/lib/invitations.ts`
  - Function: `generateInvitationToken()` - 32-byte CSPRNG → base64url (NFR-005)
  - Function: `hashToken(token: string)` - SHA-256 hash for database storage
  - Function: `validateToken(token: string, hash: string)` - constant-time comparison
  - Function: `isTokenExpired(expiresAt: string)` - check expiration
  - Include unit tests in same file or `src/lib/invitations.test.ts`

- [X] **T032 [P]** Create registration helpers in `src/lib/auth.ts`
  - Function: `registerUser(email, password, fullName, orgName)` - atomic user + org creation
  - Function: `checkEmailAvailable(email)` - query Supabase auth.users
  - Function: `validatePassword(password)` - min 6 chars (NFR-004)
  - Function: `sendVerificationEmail(userId)` - trigger Supabase email
  - Include unit tests in `src/lib/auth.test.ts`

- [X] **T033 [P]** Create permissions helpers in `src/lib/permissions.ts`
  - Constant: `ROLE_HIERARCHY` array (viewer → owner)
  - Function: `hasPermission(userRole, requiredRole)` - hierarchy check
  - Function: `canManageTeam(role)` - owner/admin check
  - Function: `canManageBilling(role)` - owner-only check
  - Type: `Permission` enum matching roles.schema.json permission matrix
  - Include unit tests in `src/lib/permissions.test.ts`

---

## Phase 3.4: Zustand Store

- [X] **T034** Create organization store in `src/stores/organizationStore.ts`
  - State: `activeOrgId: string | null`
  - Action: `setActiveOrg(orgId: string)` - update state + localStorage
  - Action: `clearActiveOrg()` - reset state
  - Persist to localStorage key: `pipetrak:activeOrgId`
  - Include unit tests in `src/stores/organizationStore.test.ts`

---

## Phase 3.5: TanStack Query Hooks

- [X] **T035** Create registration hook in `src/hooks/useRegistration.ts`
  - Mutation: `registerMutation` - calls `registerUser()` from lib/auth.ts
  - Query: `useCheckEmail` - debounced email availability check
  - Handle errors: EMAIL_ALREADY_REGISTERED, REGISTRATION_FAILED
  - Include tests in `src/hooks/useRegistration.test.ts`

- [X] **T036** Create invitations hook in `src/hooks/useInvitations.ts`
  - Query: `useInvitations` - list org invitations with pagination (limit, offset)
  - Query: `useValidateToken` - validate invitation token
  - Mutation: `createInvitationMutation` - send invitation
  - Mutation: `acceptInvitationMutation` - accept invitation (new or existing user)
  - Mutation: `resendInvitationMutation` - resend invitation email
  - Mutation: `revokeInvitationMutation` - revoke pending invitation
  - Include tests in `src/hooks/useInvitations.test.ts`

- [X] **T037** Create organization hook in `src/hooks/useOrganization.ts`
  - Query: `useUserOrganizations` - fetch all orgs user belongs to
  - Query: `useOrgMembers` - list org members with search/filter (role, search, pagination)
  - Mutation: `updateMemberRoleMutation` - change user role
  - Mutation: `removeMemberMutation` - remove user from org
  - Mutation: `leaveOrganizationMutation` - current user leaves org (with transfer logic)
  - Mutation: `switchOrganizationMutation` - update active org context
  - Include tests in `src/hooks/useOrganization.test.ts`

---

## Phase 3.6: UI Components (shadcn/ui)

- [X] **T038 [P]** Add shadcn/ui button component (if not exists)
  - Run: `npx shadcn@latest add button`
  - Verify component added to `src/components/ui/button.tsx`

- [X] **T039 [P]** Add shadcn/ui input component (if not exists)
  - Run: `npx shadcn@latest add input`
  - Verify component added to `src/components/ui/input.tsx`

- [X] **T040 [P]** Add shadcn/ui select component (if not exists)
  - Run: `npx shadcn@latest add select`
  - Verify component added to `src/components/ui/select.tsx`

- [X] **T041 [P]** Add shadcn/ui form component (if not exists)
  - Run: `npx shadcn@latest add form`
  - Verify component added to `src/components/ui/form.tsx`

- [X] **T042 [P]** Add shadcn/ui toast component (if not exists)
  - Run: `npx shadcn@latest add toast`
  - Verify component added to `src/components/ui/toast.tsx`
  - Add Toaster to App.tsx

---

## Phase 3.7: Auth Components

- [X] **T043** Create RegistrationForm component in `src/components/auth/RegistrationForm.tsx`
  - Form fields: email, password, full_name, organization_name, accept_terms checkbox
  - Use shadcn/ui Form + Input components
  - Integrate useRegistration hook
  - Validate: email format, password ≥6 chars, terms accepted
  - On success: redirect to /onboarding/wizard
  - Show loading state during submission
  - Include component test in `src/components/auth/RegistrationForm.test.tsx`

- [X] **T044** Create OnboardingWizard component in `src/components/auth/OnboardingWizard.tsx`
  - 3-step wizard: Organization settings, First project (optional), Invite team (optional)
  - Step 1: Organization logo upload (optional), industry, timezone
  - Step 2: Create first project form (skippable)
  - Step 3: Invite team members form (reuse InvitationForm component)
  - On complete: redirect to owner dashboard (/)
  - Include component test in `src/components/auth/OnboardingWizard.test.tsx`

---

## Phase 3.8: Team Management Components

- [X] **T045** Create RoleSelector component in `src/components/team/RoleSelector.tsx`
  - Dropdown using shadcn/ui Select
  - Options: 7 roles (owner, admin, project_manager, foreman, qc_inspector, welder, viewer)
  - Show role descriptions on hover/select
  - Disable 'owner' if user cannot manage billing (from permissions.ts)
  - Include component test in `src/components/team/RoleSelector.test.tsx`

- [X] **T046** Create InvitationForm component in `src/components/team/InvitationForm.tsx`
  - Form fields: email, role (RoleSelector component)
  - Use useInvitations hook for createInvitationMutation
  - Validate: email format, role selected
  - Show success toast with invitation link (if email fails per FR-041)
  - Handle errors: DUPLICATE_INVITATION, USER_ALREADY_MEMBER
  - Include component test in `src/components/team/InvitationForm.test.tsx`

- [X] **T047** Create TeamList component in `src/components/team/TeamList.tsx`
  - Display org members from useOrgMembers hook
  - Columns: Name, Email, Role, Joined Date, Actions
  - Actions (owner/admin only): Change Role, Remove Member
  - Search bar (basic text search per NFR-003)
  - Filter by role dropdown
  - Pagination controls (limit=50, offset)
  - Include component test in `src/components/team/TeamList.test.tsx`

- [X] **T048** Create OrganizationSwitcher component in `src/components/team/OrganizationSwitcher.tsx`
  - Dropdown menu using Radix UI DropdownMenu
  - Display current organization name in header
  - List all user orgs from useUserOrganizations hook
  - On select: call switchOrganizationMutation, update organizationStore
  - Show user's role in each org (e.g., "Acme Construction - Owner")
  - Include component test in `src/components/team/OrganizationSwitcher.test.tsx`

---

## Phase 3.9: Pages

- [X] **T049** Create Register page in `src/pages/Register.tsx`
  - Render RegistrationForm component
  - Page title: "Create Your PipeTrak Account"
  - Link to login page: "Already have an account? Sign in"
  - Background: branded hero image or gradient
  - Include page test in `src/pages/Register.test.tsx`

- [X] **T050** Create AcceptInvitation page in `src/pages/AcceptInvitation.tsx`
  - Extract token from URL query param: `?token={token}`
  - Call useValidateToken to fetch invitation details
  - Show invitation preview: org name, role, inviter name
  - If token invalid/expired/revoked: show error message
  - If user not logged in: show password + full_name form (new user flow)
  - If user logged in: show "Accept" button (existing user flow)
  - On accept: call acceptInvitationMutation, redirect based on role (FR-036)
  - Include page test in `src/pages/AcceptInvitation.test.tsx`

- [X] **T051** Create TeamManagement page in `src/pages/TeamManagement.tsx`
  - Page title: "Team Management"
  - Tab 1: Team Members (TeamList component)
  - Tab 2: Pending Invitations (list from useInvitations with status='pending')
  - Button: "Invite Team Member" (opens InvitationForm modal)
  - Pending invitations table: Email, Role, Invited By, Expires At, Actions (Resend, Revoke)
  - Only accessible to owner/admin (ProtectedRoute with role check)
  - Include page test in `src/pages/TeamManagement.test.tsx`

---

## Phase 3.10: Route Integration

- [X] **T052** Update App.tsx routing
  - Add route: `/register` → Register page (public route)
  - Add route: `/accept-invitation` → AcceptInvitation page (public route)
  - Add route: `/onboarding/wizard` → OnboardingWizard page (protected, owner only)
  - Add route: `/team` → TeamManagement page (protected, owner/admin only)
  - Update Layout component: add OrganizationSwitcher to header (if user has multiple orgs)
  - Verify ProtectedRoute wraps authenticated routes with role checks

- [X] **T053** Create role-based redirect helper in `src/components/RoleBasedRedirect.tsx`
  - Function: `getRedirectPath(role: UserRole)` based on role hierarchy
  - Mapping (from quickstart.md):
    - owner/admin → `/`
    - project_manager → `/projects`
    - foreman/qc_inspector/welder → `/work`
    - viewer → `/dashboard`
  - Used by AcceptInvitation and login flows
  - Include unit tests in `src/components/RoleBasedRedirect.test.tsx`

---

## Phase 3.11: Polish & Validation

- [ ] **T054 [P]** Performance validation
  - Test account creation time: POST /api/auth/register must complete <3s (NFR-001)
  - Test invitation email delivery: <1min (NFR-002)
  - Measure with browser DevTools Network tab (see quickstart.md performance section)

- [ ] **T055 [P]** Run quickstart.md manual validation
  - Execute all 7 scenarios from quickstart.md
  - Execute all 5 edge cases
  - Verify each assertion passes
  - Document any failures in GitHub issue

- [X] **T056 [P]** Code coverage check
  - Run: `npm test -- --coverage`
  - Assert: Overall ≥70% (lines, functions, branches, statements)
  - Assert: `src/lib/**` ≥80%
  - Assert: `src/components/**` ≥60%
  - Fix gaps if below thresholds

- [X] **T057 [P]** TypeScript strict mode validation
  - Run: `tsc -b`
  - Assert: Zero errors (Constitution I)
  - Assert: No `as` type assertions without justification
  - Assert: Path aliases `@/*` used for all imports

- [ ] **T058** Remove code duplication
  - Scan for duplicate logic in hooks (useInvitations, useOrganization)
  - Extract shared patterns to helper functions
  - Consolidate repeated form validation logic

- [ ] **T059** Error handling audit
  - Verify all mutations have error handlers
  - Verify all errors show user-friendly toast messages
  - Verify database errors (RLS violations) caught and logged
  - Test edge case: network failure during registration

- [X] **T060** Update CLAUDE.md with feature-specific patterns
  - Add note: "User registration uses atomic transaction (user + org creation)"
  - Add note: "Invitation tokens use SHA-256 hashing (never store raw tokens)"
  - Add note: "RLS policies enforce owner/admin checks for team management"
  - Add recent changes: "Feature 002-user-registration-and completed YYYY-MM-DD"

---

## Dependencies

**Critical Path**:
1. Database (T001-T004) before ALL tests and implementation
2. Tests (T005-T030) before implementation (T031-T060)
3. Helper libs (T031-T033) before hooks (T035-T037)
4. Hooks (T035-T037) before components (T043-T048)
5. Components (T043-T048) before pages (T049-T051)
6. Pages (T049-T051) before routing (T052-T053)
7. Implementation complete before polish (T054-T060)

**Blocking Tasks**:
- T004 blocks T005-T030 (need DB types for tests)
- T005-T030 must FAIL before T031+ (TDD gate)
- T031 blocks T036 (invitations hook needs token helpers)
- T032 blocks T035 (registration hook needs auth helpers)
- T033 blocks T047, T051 (TeamList/TeamManagement need permissions)
- T034 blocks T037, T048 (org switching needs store)
- T035 blocks T043 (RegistrationForm needs hook)
- T036 blocks T046, T050 (InvitationForm/AcceptInvitation need hook)
- T037 blocks T047, T048, T051 (team components need org hook)
- T038-T042 block T043-T048 (components need UI primitives)
- T052 blocks T054-T055 (routing needed for E2E tests)

---

## Parallel Execution Examples

### Phase 3.2 - All Contract Tests (after T004)
```bash
# Run T005-T018 in parallel (14 contract test tasks)
# Each test file is independent, no shared state
npm test tests/contract/registration.contract.test.ts &
npm test tests/contract/invitations.contract.test.ts &
npm test tests/contract/roles.contract.test.ts &
wait
```

### Phase 3.2 - All Integration Tests (after T004)
```bash
# Run T019-T030 in parallel (12 integration test tasks)
npm test tests/integration/registration.test.ts &
npm test tests/integration/invitation-flow.test.ts &
npm test tests/integration/multi-org.test.ts &
npm test tests/integration/role-permissions.test.ts &
npm test tests/integration/invitation-edge-cases.test.ts &
npm test tests/integration/ownership-transfer.test.ts &
wait
```

### Phase 3.3 - Helper Libraries (after tests fail)
```bash
# Run T031-T033 in parallel (3 independent lib files)
# Implement src/lib/invitations.ts, auth.ts, permissions.ts concurrently
```

### Phase 3.6 - UI Components (after T037)
```bash
# Run T038-T042 in parallel (5 shadcn add commands)
npx shadcn@latest add button &
npx shadcn@latest add input &
npx shadcn@latest add select &
npx shadcn@latest add form &
npx shadcn@latest add toast &
wait
```

### Phase 3.11 - Polish Tasks (after T053)
```bash
# Run T054, T056, T057 in parallel (independent validations)
npm test -- --coverage &  # T056
tsc -b &                   # T057
# T054 manual performance test (browser DevTools)
wait
```

---

## Validation Checklist

- [x] All contracts have corresponding tests (T005-T018 cover 13 endpoints)
- [x] All entities have model tasks (covered in T001 migration: organizations, user_organizations, invitations)
- [x] All tests come before implementation (Phase 3.2 before 3.3+)
- [x] Parallel tasks truly independent (verified [P] markers on different files)
- [x] Each task specifies exact file path (all tasks include `src/` or `tests/` paths)
- [x] No task modifies same file as another [P] task (verified no conflicts)

---

## Notes

- **TDD Enforcement**: Tests T005-T030 MUST fail before proceeding to T031
- **Constitution Compliance**: All tasks aligned with v1.0.0 (strict TS, Supabase RLS, TDD, shadcn/ui)
- **Commit Strategy**: Commit after each task completion (atomic changes)
- **Estimated Effort**: 35-40 hours (60 tasks, ~40-60min each)
- **Next Step After Tasks Complete**: Run `/implement` or execute tasks manually following TDD discipline

---

*Generated from plan.md, data-model.md, contracts/, quickstart.md on 2025-10-05*
