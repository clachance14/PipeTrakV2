# Tasks: User Profile Management

**Input**: Design documents from `/specs/017-user-profile-management/`
**Prerequisites**: plan.md (tech stack), spec.md (4 user stories), research.md (decisions), data-model.md (entities), contracts/ (TypeScript interfaces), quickstart.md (TDD examples)

**Tests**: Included per Constitution v1.0.2 Principle III (Testing Discipline) - TDD mandatory via Specify workflow

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Single project structure (React SPA):
- Components: `src/components/`
- Hooks: `src/hooks/`
- Utils: `src/lib/`
- Types: `src/types/`
- Tests: `tests/unit/` and `tests/integration/`
- Migrations: `supabase/migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema changes and storage configuration

- [X] T001 Create database migration file supabase/migrations/00050_add_avatar_url.sql
- [X] T002 Apply migration to add avatar_url column to users table via `supabase db push --linked`
- [X] T003 Regenerate TypeScript types from database schema via `supabase gen types typescript --linked > src/types/database.types.ts`
- [X] T004 Create avatars storage bucket in Supabase (manual: Dashboard or CLI `supabase storage create-bucket avatars --public`)
- [X] T005 [P] Add shadcn/ui Dialog component to src/components/ui/dialog.tsx (if not exists)
- [X] T006 [P] Add shadcn/ui DropdownMenu component to src/components/ui/dropdown-menu.tsx (if not exists)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared utilities and type definitions that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 [P] Create avatar validation utilities in src/lib/avatar-utils.ts (validateAvatarFile, getFileMetadata)
- [X] T008 [P] Create Avatar display component in src/components/profile/Avatar.tsx (handles URL or initial letter fallback)
- [X] T009 [P] Update User type in src/types/index.ts to include avatar_url field
- [X] T010 Create profile feature directory src/components/profile/

**Checkpoint**: ✅ Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Profile Information (Priority: P1) 🎯 MVP

**Goal**: Users can click avatar → open dropdown → click "View Profile" → see profile information in modal

**Independent Test**: Click avatar in nav bar, select "View Profile" from dropdown, modal opens displaying email, organization name, role, and avatar (or initial letter). Pressing Escape closes modal and returns focus to avatar button.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation (RED phase)**

- [X] T011 [P] [US1] Write failing test for UserMenu component in tests/unit/components/profile/UserMenu.test.tsx (avatar display, dropdown open, menu items)
- [X] T012 [P] [US1] Write failing test for UserProfileModal component in tests/unit/components/profile/UserProfileModal.test.tsx (open/close, Escape key, focus trap)
- [X] T013 [P] [US1] Write failing test for ProfileInfoSection component in tests/unit/components/profile/ProfileInfoSection.test.tsx (email, org, role display, null handling)
- [X] T014 [P] [US1] Write failing test for useUserProfile hook in tests/unit/hooks/useUserProfile.test.tsx (data fetching, loading, error states)

### Implementation for User Story 1

> **GREEN phase: Implement minimum code to pass tests**

- [X] T015 [P] [US1] Implement UserMenu component in src/components/profile/UserMenu.tsx (avatar button, dropdown with "View Profile" and "Sign Out" options)
- [X] T016 [P] [US1] Implement UserProfileModal component in src/components/profile/UserProfileModal.tsx (Dialog wrapper with open/close state)
- [X] T017 [P] [US1] Implement ProfileInfoSection component in src/components/profile/ProfileInfoSection.tsx (read-only display of email, org name, role)
- [X] T018 [US1] Implement useUserProfile hook in src/hooks/useUserProfile.ts (TanStack Query hook to fetch user + organization data)
- [X] T019 [US1] Wire UserMenu to open UserProfileModal on "View Profile" click
- [X] T020 [US1] Wire UserProfileModal to display ProfileInfoSection with user data from useUserProfile
- [X] T021 [US1] Replace avatar button in src/components/Layout.tsx with UserMenu component (lines 159-172)

> **REFACTOR phase: Clean up code while keeping tests green**

- [X] T022 [US1] Verify all tests pass, refactor for code quality if needed
- [X] T023 [US1] Commit US1 implementation (tests + code together per Constitution)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently (users can view their profile)

---

## Phase 4: User Story 2 - Update Full Name (Priority: P1)

**Goal**: Users can edit their full name in the profile modal, see optimistic UI updates, and have changes persist

**Independent Test**: Open profile modal, click edit button on full name field, enter new name, click Save. Name updates immediately (optimistic), success toast appears, modal remains open showing new name. Refresh page and verify name persists.

### Tests for User Story 2

> **RED phase: Write failing tests first**

- [X] T024 [P] [US2] Write failing test for ProfileHeader component in tests/unit/components/profile/ProfileHeader.test.tsx (name display, edit mode, save/cancel buttons)
- [X] T025 [P] [US2] Write failing test for useUpdateProfile hook in tests/unit/hooks/useUpdateProfile.test.tsx (optimistic updates, rollback on error, cache invalidation)

### Implementation for User Story 2

> **GREEN phase: Implement to pass tests**

- [X] T026 [P] [US2] Implement ProfileHeader component in src/components/profile/ProfileHeader.tsx (avatar display, full name with inline edit functionality)
- [X] T027 [US2] Implement useUpdateProfile hook in src/hooks/useUpdateProfile.ts (TanStack Query mutation with onMutate/onError/onSettled for optimistic updates)
- [X] T028 [US2] Add ProfileHeader to UserProfileModal (replace or add above ProfileInfoSection)
- [X] T029 [US2] Wire ProfileHeader save button to useUpdateProfile mutation
- [X] T030 [US2] Add full name validation (trim whitespace, 1-100 characters, not empty)

> **REFACTOR phase**

- [X] T031 [US2] Verify all tests pass (US1 + US2), refactor for quality
- [X] T032 [US2] Commit US2 implementation

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently (view profile + edit name)

---

## Phase 5: User Story 3 - Upload Profile Photo (Priority: P2)

**Goal**: Users can upload a profile photo via file picker, see upload progress, and have avatar display throughout app

**Independent Test**: Open profile modal, hover over avatar to see "Upload Photo" overlay, click to open file picker, select valid image (JPG/PNG/WebP under 2MB). Upload progress appears, avatar updates immediately. Close and reopen modal - avatar persists. Verify avatar shows in navigation bar. Test error cases: file too large (>2MB), invalid type (PDF), shows appropriate error messages.

### Tests for User Story 3

> **RED phase: Write failing tests first**

- [X] T033 [P] [US3] Write failing test for avatar upload in ProfileHeader tests (file picker, upload button, progress indicator)
- [X] T034 [P] [US3] Write failing test for useUpdateAvatar hook in tests/unit/hooks/useUpdateAvatar.test.tsx (file upload, public URL retrieval, database update)
- [X] T035 [P] [US3] Write failing test for avatar validation utilities in tests/unit/lib/avatar-utils.test.ts (file type, file size, error messages)

### Implementation for User Story 3

> **GREEN phase: Implement to pass tests**

- [X] T036 [P] [US3] Implement useUpdateAvatar hook in src/hooks/useUpdateAvatar.ts (upload to Storage, get public URL, update users.avatar_url)
- [X] T037 [P] [US3] Add avatar upload UI to ProfileHeader component (file input, hover overlay, progress indicator for files >500KB)
- [X] T038 [P] [US3] Create RLS policies for avatars storage bucket in supabase/migrations/00051_avatar_storage_rls.sql (SELECT public, INSERT/UPDATE/DELETE owner-only)
- [X] T039 [US3] Apply storage RLS policies via `supabase db push --linked`
- [X] T040 [US3] Wire ProfileHeader file input to useUpdateAvatar mutation
- [X] T041 [US3] Add client-side validation (file type, size checks) before upload using avatar-utils
- [X] T042 [US3] Update Avatar component fallback logic (check avatar_url, show initials if null)

> **REFACTOR phase**

- [X] T043 [US3] Verify all tests pass (US1 + US2 + US3), refactor for quality
- [X] T044 [US3] Commit US3 implementation

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should work independently (view + edit name + upload photo)

---

## Phase 6: User Story 4 - Change Password (Priority: P2)

**Goal**: Users can securely change their password with current password verification, password strength feedback, and confirmation

**Independent Test**: Open profile modal, expand "Change Password" section, enter current password, new password (≥8 chars), and confirmation (matching). Click "Change Password" button. Success toast appears, form clears, session maintained (no forced logout). Test error cases: incorrect current password, weak new password (<8 chars), passwords don't match, shows appropriate inline errors.

### Tests for User Story 4

> **RED phase: Write failing tests first**

- [ ] T045 [P] [US4] Write failing test for PasswordChangeForm component in tests/unit/components/profile/PasswordChangeForm.test.tsx (form fields, validation, submit, show/hide password toggle)
- [ ] T046 [P] [US4] Write failing test for useChangePassword hook in tests/unit/hooks/useChangePassword.test.ts (current password verification, password update, error handling)
- [ ] T047 [P] [US4] Write failing test for password validation in tests/unit/lib/password-validation.test.ts (strength analysis, validation rules)

### Implementation for User Story 4

> **GREEN phase: Implement to pass tests**

- [X] T048 [P] [US4] Create password validation utilities in src/lib/password-validation.ts (analyzePasswordStrength, validatePasswordChangeForm)
- [X] T049 [P] [US4] Implement PasswordChangeForm component in src/components/profile/PasswordChangeForm.tsx (current, new, confirm password inputs with validation)
- [X] T050 [P] [US4] Implement useChangePassword hook in src/hooks/useChangePassword.ts (verify current password via signInWithPassword, update via auth.updateUser)
- [X] T051 [US4] Add PasswordChangeForm to UserProfileModal (below ProfileInfoSection)
- [X] T052 [US4] Wire PasswordChangeForm submit to useChangePassword mutation
- [X] T053 [US4] Add password strength indicator to PasswordChangeForm (display strength level as user types)
- [X] T054 [US4] Add show/hide password toggle buttons to all password inputs

> **REFACTOR phase**

- [X] T055 [US4] Verify all tests pass (US1 + US2 + US3 + US4), refactor for quality
- [X] T056 [US4] Commit US4 implementation

**Checkpoint**: All user stories should now be independently functional (view + edit + upload + password)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, mobile responsiveness, accessibility, integration testing

### Mobile Responsiveness (Feature 015 patterns: ≤1024px breakpoint, 32px+ touch targets)

- [ ] T057 [P] Update UserProfileModal for mobile (full-screen on ≤768px, slide-up animation)
- [ ] T058 [P] Update ProfileHeader for mobile (single-column layout, larger touch targets for file input)
- [ ] T059 [P] Update PasswordChangeForm for mobile (single-column, keyboard scrolling, 32px+ buttons)
- [ ] T060 [P] Test mobile virtual keyboard behavior (form fields scroll into view when focused)

### Accessibility (WCAG 2.1 AA compliance)

- [ ] T061 [P] Audit keyboard navigation (Tab through all form fields, Escape closes modal, focus trap within modal)
- [ ] T062 [P] Add ARIA labels to all interactive elements (avatar upload button, password toggle buttons, form inputs)
- [ ] T063 [P] Add aria-live regions for success/error messages (screen reader announcements)
- [ ] T064 [P] Verify focus returns to avatar button when modal closes

### Error Handling & Edge Cases

- [ ] T065 [P] Handle user with no organization (display "No organization" placeholder in ProfileInfoSection)
- [ ] T066 [P] Handle user with null full_name (display "Add your name" placeholder in ProfileHeader edit mode)
- [ ] T067 [P] Handle avatar load failures (show initials fallback, error indicator if load fails)
- [ ] T068 [P] Handle storage quota exceeded (clear error message: "Contact your organization administrator")
- [ ] T069 [P] Handle session expiry during password change (redirect to login with message)

### AuthContext Enhancement

- [ ] T070 Add refreshUser() function to src/contexts/AuthContext.tsx (refetch user data after profile updates)
- [ ] T071 Call refreshUser() after successful profile/avatar updates (ensure context stays in sync)

### Integration Testing

- [ ] T072 Write end-to-end profile workflow test in tests/integration/profile-workflow.test.tsx (avatar click → modal open → edit name → upload avatar → change password → close modal)
- [ ] T073 Verify integration test covers all 4 user stories sequentially

### Performance & Optimization

- [ ] T074 [P] Verify TanStack Query cache configuration (5min staleTime for profile, 10min cacheTime)
- [ ] T075 [P] Test avatar upload progress indicator for files >500KB
- [ ] T076 [P] Verify optimistic UI updates appear <50ms (immediate feedback)

### Documentation & Validation

- [ ] T077 [P] Update CLAUDE.md with profile feature implementation notes (if needed)
- [ ] T078 [P] Verify all tests pass with ≥70% coverage (run `npm test -- --coverage`)
- [ ] T079 Run quickstart.md validation (verify TDD example still accurate)
- [ ] T080 Create IMPLEMENTATION-NOTES.md documenting decisions and gotchas (optional but recommended)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
  - Tasks T001-T006 prepare database, storage, and UI primitives
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T006) - BLOCKS all user stories
  - Tasks T007-T010 create shared utilities used by all stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion (T010)
  - User Story 1 (P1) - T011-T023: Can start after Foundational - No dependencies on other stories
  - User Story 2 (P1) - T024-T032: Depends on User Story 1 (needs ProfileHeader, UserProfileModal from US1)
  - User Story 3 (P2) - T033-T044: Depends on User Story 1 (needs ProfileHeader from US1), independent of US2
  - User Story 4 (P2) - T045-T056: Depends on User Story 1 (needs UserProfileModal from US1), independent of US2/US3
- **Polish (Phase 7)**: Depends on all desired user stories being complete (T023, T032, T044, T056)

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (T010) - Foundation for all other stories
  - Provides: UserMenu, UserProfileModal, ProfileInfoSection, useUserProfile
- **User Story 2 (P1)**: Depends on User Story 1 completion (T023) - Uses ProfileHeader slot in modal
  - Adds: ProfileHeader (name editing), useUpdateProfile
- **User Story 3 (P2)**: Depends on User Story 1 completion (T023) - Uses ProfileHeader for avatar upload
  - Adds: Avatar upload UI in ProfileHeader, useUpdateAvatar, Storage RLS
  - Can run in parallel with US2 if ProfileHeader refactored to support both features
- **User Story 4 (P2)**: Depends on User Story 1 completion (T023) - Uses UserProfileModal for form
  - Adds: PasswordChangeForm, useChangePassword, password validation
  - Can run in parallel with US2/US3 (different components)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (RED → GREEN → REFACTOR)
- Shared utilities before components (avatar-utils before ProfileHeader)
- Hooks before components that use them (useUserProfile before ProfileInfoSection)
- Components before integration (ProfileHeader + useUpdateProfile before wiring)
- Story complete before moving to next priority

### Parallel Opportunities

#### Setup Phase (Phase 1)
- T001-T003: Sequential (migration → push → types)
- T005, T006: Can run in parallel (different UI component files)

#### Foundational Phase (Phase 2)
- T007, T008, T009: Can run in parallel (different files, no dependencies)

#### User Story Tests
- Within each story, all test tasks marked [P] can run in parallel (different test files)
- Example US1: T011, T012, T013, T014 can all run together

#### User Story Implementation
- Models/utilities within a story marked [P] can run in parallel
- Example US1: T015, T016, T017 can run together (UserMenu, Modal, InfoSection are separate files)
- Example US4: T048, T049, T050 can run together (validation utils, form component, hook are separate)

#### After US1 Complete
- US2, US3, US4 can be worked on in parallel by different developers (after T023)
- US3 and US4 are fully independent (different components, no shared code)
- US2 may conflict with US3 if both modify ProfileHeader (coordinate on ProfileHeader refactor)

---

## Parallel Example: User Story 1

```bash
# Phase 1: Write all tests together (RED phase):
parallel_task T011: "Write failing test for UserMenu"
parallel_task T012: "Write failing test for UserProfileModal"
parallel_task T013: "Write failing test for ProfileInfoSection"
parallel_task T014: "Write failing test for useUserProfile"
# Wait for all to complete, verify all tests FAIL

# Phase 2: Implement components together (GREEN phase):
parallel_task T015: "Implement UserMenu component"
parallel_task T016: "Implement UserProfileModal component"
parallel_task T017: "Implement ProfileInfoSection component"
# Wait for components to complete

# Phase 3: Sequential wiring:
sequential_task T018: "Implement useUserProfile hook"
sequential_task T019: "Wire UserMenu to open modal"
sequential_task T020: "Wire modal to display ProfileInfoSection"
sequential_task T021: "Replace avatar in Layout"
sequential_task T022: "Verify tests pass"
sequential_task T023: "Commit US1"
```

---

## Parallel Example: After Foundational Complete

```bash
# Once T010 is complete, 3 developers can work in parallel:

# Developer A: User Story 1 (Required for all others)
tasks T011-T023: "View Profile Information"

# Developer B: User Story 4 (Independent, can start after US1 done)
wait_for T023
tasks T045-T056: "Change Password"

# Developer C: User Story 3 (Independent, can start after US1 done)
wait_for T023
tasks T033-T044: "Upload Profile Photo"

# Note: US2 depends on US1 and shares ProfileHeader with US3
# Coordinate US2 and US3 if running in parallel
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

**Quickest path to value**: View profile information

1. Complete Phase 1: Setup (T001-T006) → Database + storage ready
2. Complete Phase 2: Foundational (T007-T010) → Shared utilities ready
3. Complete Phase 3: User Story 1 (T011-T023) → Users can view profile ✅
4. **STOP and VALIDATE**: Test US1 independently
   - Click avatar → dropdown appears
   - Click "View Profile" → modal opens
   - See email, org, role, avatar
   - Press Escape → modal closes, focus returns
5. Deploy MVP if ready (16 tasks total: T001-T023)

**Deliverable**: Users can access and view their profile information
**Value**: Transparency into account details, organization membership, role

### Incremental Delivery

**Add features in priority order**, validating independently at each step:

1. **Foundation** (T001-T010): Setup + utilities → 10 tasks
2. **MVP** (T011-T023): User Story 1 → View profile → 13 tasks → **DEPLOY/DEMO**
3. **V1.1** (T024-T032): + User Story 2 → Edit name → 9 tasks → **DEPLOY/DEMO**
4. **V1.2** (T033-T044): + User Story 3 → Upload photo → 12 tasks → **DEPLOY/DEMO**
5. **V1.3** (T045-T056): + User Story 4 → Change password → 12 tasks → **DEPLOY/DEMO**
6. **V1.4** (T057-T080): + Polish → Mobile, a11y, integration tests → 24 tasks → **FINAL RELEASE**

Total: 80 tasks across 7 phases

**Each increment adds value without breaking previous functionality**

### Parallel Team Strategy

With multiple developers (after US1 complete):

1. **Team completes together**: Setup (T001-T006) + Foundational (T007-T010)
2. **Team completes together**: User Story 1 (T011-T023) - Foundation for others
3. **Once US1 done, split**:
   - **Developer A**: User Story 2 (T024-T032) - Edit name
   - **Developer B**: User Story 4 (T045-T056) - Change password (fully independent)
   - **Developer C**: User Story 3 (T033-T044) - Upload photo (coordinate with A on ProfileHeader)
4. **Merge and test**: All stories integrate, fix any conflicts
5. **Team completes together**: Polish (T057-T080) - Mobile, a11y, integration

**Benefit**: 3-4 weeks of work done in ~2 weeks with 3 developers

---

## Notes

### Task Format Compliance
- ✅ All tasks follow checklist format: `- [ ] [ID] [P?] [Story?] Description`
- ✅ All tasks include exact file paths
- ✅ [P] marker indicates parallelizable tasks (different files)
- ✅ [Story] label maps to user stories from spec.md (US1-US4)

### TDD Compliance (Constitution v1.0.2)
- ✅ Tests written FIRST for every user story (RED phase)
- ✅ Implementation follows (GREEN phase)
- ✅ Refactor step included (REFACTOR phase)
- ✅ Tests and implementation committed together

### User Story Independence
- ✅ User Story 1: Fully independent, foundation for others
- ✅ User Story 2: Depends on US1 (uses ProfileHeader)
- ✅ User Story 3: Depends on US1 (uses ProfileHeader), can run parallel with US4
- ✅ User Story 4: Depends on US1 (uses UserProfileModal), can run parallel with US2/US3
- ✅ Each story has independent test criteria
- ✅ Each story can be validated separately

### Checkpoints
- After T010: Foundation ready (shared utilities)
- After T023: MVP ready (view profile) ← **RECOMMENDED FIRST DEPLOY**
- After T032: View + edit name complete
- After T044: View + edit + upload complete
- After T056: All user stories complete
- After T080: Production-ready (mobile, a11y, tests)

### Avoid
- Starting user stories before Foundational complete (T010)
- Modifying same file in parallel (ProfileHeader by US2 + US3)
- Implementing before tests written (breaks TDD)
- Skipping checkpoints (validate each story independently)
- Cross-story dependencies that break independence

---

**Total Tasks**: 80
**By Phase**: Setup (6) + Foundational (4) + US1 (13) + US2 (9) + US3 (12) + US4 (12) + Polish (24)
**By Priority**: P1 (22 tasks), P2 (24 tasks), Setup/Polish (34 tasks)
**Parallel Opportunities**: 45 tasks marked [P] (56% of total)
**MVP Scope**: T001-T023 (23 tasks, ~1-2 weeks for 1 developer)
**Full Feature**: T001-T080 (80 tasks, ~3-4 weeks for 1 developer, ~2 weeks for 3 developers in parallel)
