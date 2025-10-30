# Tasks: Component Metadata Editing from Drawings View

**Feature**: 020-component-metadata-editing
**Branch**: `020-component-metadata-editing`
**Generated**: 2025-10-29

## Overview

This document provides an ordered task breakdown for implementing component metadata editing functionality. Tasks are organized by user story to enable independent implementation and testing. The feature follows TDD principles with tests written before implementation.

## Implementation Strategy

**MVP Scope**: User Story 1 (View and Edit Component Metadata)
- Delivers core value: ability to click component rows and edit metadata
- Includes all foundational infrastructure (database migration, hooks, UI components)
- Fully testable and deployable independently

**Incremental Delivery**:
1. US1 (P1): Edit metadata - Core functionality
2. US2 (P2): Create metadata inline - Workflow enhancement
3. US4 (P2): View-only access - Permission control
4. US3 (P3): Clear assignments - Data quality feature

## Phase 1: Setup & Infrastructure

**Goal**: Establish database schema, TypeScript types, and foundational utilities needed by all user stories.

### Tasks

- [X] T001 Create database migration for version field in supabase/migrations/00063_add_components_version_field.sql
- [X] T002 [P] Regenerate TypeScript database types in src/types/database.types.ts
- [X] T003 [P] Create metadata form types in src/types/metadata.ts
- [X] T004 [P] Create metadata validation utilities in src/lib/validation.ts

**Completion Criteria**:
- Migration adds version INTEGER column with default 1
- Trigger auto-increments version on UPDATE
- TypeScript types reflect updated schema
- Validation utilities handle case-insensitive, trimmed comparisons

---

## Phase 2: Foundational Components (Blocking Prerequisites)

**Goal**: Build reusable UI primitives and hooks required by multiple user stories.

### Tasks

- [X] T005 [P] Add shadcn/ui Command component (if not already present) via npx shadcn-ui@latest add command
- [X] T006 Write test for SearchableCombobox component in src/components/component-metadata/SearchableCombobox.test.tsx
- [X] T007 Implement SearchableCombobox with TanStack Virtual integration in src/components/component-metadata/SearchableCombobox.tsx
- [X] T008 Write test for metadata name validation in tests/unit/validation/metadata-validation.test.ts
- [X] T009 Implement metadata name validation logic in src/lib/validation.ts
- [X] T010 [P] Write test for useMilestoneEvents hook in src/hooks/useMilestoneEvents.test.ts
- [X] T011 [P] Implement useMilestoneEvents query hook in src/hooks/useMilestoneEvents.ts
- [X] T012 [P] Write test for MilestoneHistoryView component in src/components/component-metadata/MilestoneHistoryView.test.tsx
- [X] T013 [P] Implement MilestoneHistoryView read-only component in src/components/component-metadata/MilestoneHistoryView.tsx

**Completion Criteria**:
- SearchableCombobox renders virtualized lists (1000+ items without lag)
- Filter-as-you-type reduces visible options instantly
- Validation prevents empty/whitespace names and case-insensitive duplicates
- MilestoneHistoryView displays milestone events sorted by timestamp descending

**Independent Test**: SearchableCombobox can be tested standalone with mock data. MilestoneHistoryView displays mock milestone events correctly.

---

## Phase 3: User Story 1 - View and Edit Component Metadata (P1)

**Goal**: Enable Admin/Manager users to click component rows, edit metadata via modal, and save changes.

**Why this first**: Delivers core value for metadata correction. All subsequent stories build on this foundation.

### Tasks

- [X] T014 Write integration test for opening modal on component click in tests/integration/component-metadata/edit-metadata.test.ts
- [X] T015 Write integration test for editing Area/System/TestPackage in tests/integration/component-metadata/edit-metadata.test.ts
- [X] T016 Write integration test for saving changes and table update in tests/integration/component-metadata/edit-metadata.test.ts
- [X] T017 Write integration test for canceling changes in tests/integration/component-metadata/edit-metadata.test.ts
- [X] T018 Write integration test for concurrent edit conflict detection in tests/integration/component-metadata/concurrent-edits.test.ts
- [X] T019 [US1] Write test for useComponentMetadata hook in src/hooks/useComponentMetadata.test.ts
- [X] T020 [US1] Implement useComponentMetadata query hook (fetch component + metadata) in src/hooks/useComponentMetadata.ts
- [X] T021 [US1] Write test for useUpdateComponent hook with version check in src/hooks/useUpdateComponent.test.ts
- [X] T022 [US1] Update useUpdateComponent mutation to include version field in WHERE clause in src/hooks/useUpdateComponent.ts
- [X] T023 [US1] Write test for MetadataFormFields component in src/components/component-metadata/MetadataFormFields.test.tsx
- [X] T024 [US1] Implement MetadataFormFields with three searchable comboboxes in src/components/component-metadata/MetadataFormFields.tsx
- [X] T025 [US1] Write test for ComponentMetadataModal (edit mode) in src/components/component-metadata/ComponentMetadataModal.test.tsx
- [X] T026 [US1] Implement ComponentMetadataModal with edit mode, Save/Cancel buttons in src/components/component-metadata/ComponentMetadataModal.tsx
- [X] T027 [US1] Add onClick handler to ComponentRow in src/components/drawing-table/ComponentRow.tsx
- [X] T028 [US1] Wire modal state management into DrawingTable parent component in src/components/drawing-table/DrawingTable.tsx

**Completion Criteria**:
- Clicking component row opens modal with current metadata pre-populated
- Comboboxes filter instantly with 1000+ options via virtualization
- Save updates component with optimistic UI, reverts on error
- Cancel closes modal without saving
- Concurrent edit shows error: "Component was updated by another user. Please refresh."
- Table row updates immediately on successful save

**Independent Test**: Complete US1 workflow (open modal, edit, save) works without US2/US3/US4. Can deploy to production as MVP.

---

## Phase 4: User Story 2 - Create New Metadata Entries (P2)

**Goal**: Enable inline creation of Areas, Systems, Test Packages from dropdown "Create new..." option.

**Why after US1**: Requires US1 modal infrastructure. Enhances workflow but not blocking for core metadata editing.

### Tasks

- [X] T029 Write integration test for inline Area creation in tests/integration/component-metadata/create-metadata.test.ts
- [X] T030 Write integration test for duplicate name validation in tests/integration/component-metadata/create-metadata.test.ts
- [X] T031 Write integration test for canceling creation in tests/integration/component-metadata/create-metadata.test.ts
- [X] T032 Write integration test for metadata persistence on modal cancel in tests/integration/component-metadata/create-metadata.test.ts
- [X] T033 [US2] Write test for useCreateArea hook in src/hooks/useCreateMetadata.test.ts
- [X] T034 [US2] Implement useCreateArea mutation hook with immediate commit in src/hooks/useCreateMetadata.ts
- [X] T035 [US2] Write test for useCreateSystem hook in src/hooks/useCreateMetadata.test.ts
- [X] T036 [US2] Implement useCreateSystem mutation hook in src/hooks/useCreateMetadata.ts
- [X] T037 [US2] Write test for useCreateTestPackage hook in src/hooks/useCreateMetadata.test.ts
- [X] T038 [US2] Implement useCreateTestPackage mutation hook in src/hooks/useCreateMetadata.ts
- [X] T039 [US2] Extend SearchableCombobox to support inline creation mode in src/components/component-metadata/SearchableCombobox.tsx
- [X] T040 [US2] Add "Create new..." option rendering in SearchableCombobox in src/components/component-metadata/SearchableCombobox.tsx
- [X] T041 [US2] Update MetadataFormFields to wire create hooks in src/components/component-metadata/MetadataFormFields.tsx

**Completion Criteria**:
- "Create new..." option appears at bottom of each dropdown
- Selecting triggers inline input form with Create/Cancel buttons
- Duplicate names show error: "Area '[name]' already exists"
- Empty/whitespace names prevented
- New metadata committed immediately (persists even if modal cancelled)
- Auto-selected after creation

**Independent Test**: Create new Area, verify it appears in dropdown for next component. Works without US1 edit functionality being used.

---

## Phase 5: User Story 4 - View-Only Access for Non-Admin Users (P2)

**Goal**: Display read-only modal for Field User role with milestone history but no edit controls.

**Why before US3**: Permission control is higher priority than clearing assignments. Ensures proper security before lower-priority features.

### Tasks

- [X] T042 Write integration test for Field User opening modal in tests/integration/component-metadata/view-only-access.test.ts
- [X] T043 Write integration test for no edit controls visible in tests/integration/component-metadata/view-only-access.test.ts
- [X] T044 Write integration test for milestone history displayed in tests/integration/component-metadata/view-only-access.test.ts
- [X] T045 [US4] Add role check to ComponentMetadataModal for view-only mode in src/components/component-metadata/ComponentMetadataModal.tsx
- [X] T046 [US4] Conditionally render static text vs editable fields based on role in src/components/component-metadata/MetadataFormFields.tsx
- [X] T047 [US4] Hide Save/Cancel buttons for Field User role in src/components/component-metadata/ComponentMetadataModal.tsx

**Completion Criteria**:
- Field User can click component rows
- Modal shows current metadata as static text (no dropdowns)
- Milestone history visible in read-only format
- No Save/Cancel/Edit buttons visible
- RLS policies prevent unauthorized updates (backend enforcement)

**Independent Test**: Login as Field User, click component, verify view-only mode. Works independently of edit/create features.

---

## Phase 6: User Story 3 - Clear Metadata Assignments (P3)

**Goal**: Allow removing Area/System/TestPackage assignments via "(None)" option.

**Why last**: Lowest priority. Reassigning to correct values (US1) is more common than explicitly clearing.

### Tasks

- [X] T048 Write integration test for selecting "(None)" option in tests/integration/component-metadata/clear-metadata.test.ts
- [X] T049 Write integration test for saving cleared fields in tests/integration/component-metadata/clear-metadata.test.ts
- [X] T050 Write integration test for clearing all three fields in tests/integration/component-metadata/clear-metadata.test.ts
- [X] T051 [US3] Add "(None)" option at top of SearchableCombobox in src/components/component-metadata/SearchableCombobox.tsx
- [X] T052 [US3] Handle null value assignment in MetadataFormFields in src/components/component-metadata/MetadataFormFields.tsx
- [X] T053 [US3] Update useUpdateComponent to support null assignments in src/hooks/useUpdateComponent.ts

**Completion Criteria**:
- "(None)" option appears at top of each dropdown
- Selecting sets field to null
- Save persists null values correctly
- Table shows empty/blank for cleared fields
- Can clear all three fields simultaneously

**Independent Test**: Select "(None)" for Area, save, verify table shows blank. Works without create/view-only features.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Enhance accessibility, error handling, and performance optimizations.

### Tasks

- [X] T054 [P] Add keyboard navigation tests (Tab, Enter, Escape) for modal
- [X] T055 [P] Implement focus trap in ComponentMetadataModal
- [X] T056 [P] Add ARIA labels to all comboboxes and buttons
- [X] T057 [P] Test screen reader announcements for state changes
- [X] T058 [P] Add error boundary for modal component
- [X] T059 [P] Optimize SearchableCombobox virtualization for 3000+ items
- [X] T060 [P] Add loading states for slow network conditions
- [X] T061 [P] Add retry mechanism for failed save operations
- [X] T062 [P] Document ComponentMetadataModal API in Storybook or JSDoc

**Completion Criteria**:
- All modal interactions fully keyboard-accessible
- WCAG 2.1 AA compliance verified
- Error handling covers all edge cases
- Performance targets met (SC-001 to SC-010)
- Component API documented for future developers

---

## Dependencies & Execution Order

### User Story Dependency Graph

```
Setup (Phase 1) → Foundational (Phase 2) → US1 (Phase 3) ─┬→ US2 (Phase 4)
                                                           ├→ US4 (Phase 5)
                                                           └→ US3 (Phase 6) → Polish (Phase 7)
```

**Blocking Dependencies**:
- Phase 1 (Setup) blocks all other phases
- Phase 2 (Foundational) blocks all user stories
- US1 blocks US2, US3, US4 (they all extend the modal from US1)
- US2, US3, US4 can run in parallel after US1 completes

### Parallel Execution Opportunities

**Within Phase 1 (Setup)**:
- T002, T003, T004 can run in parallel after T001 completes

**Within Phase 2 (Foundational)**:
- T006-T009 (SearchableCombobox + validation) independent
- T010-T013 (MilestoneHistoryView) independent
- After T005 (Command component): T006-T013 can all run in parallel

**Within Phase 3 (US1)**:
- T019-T022 (hooks) can run in parallel with T023-T026 (components) after T014-T018 (tests written)

**After US1 Complete**:
- US2 (T029-T041), US4 (T042-T047), US3 (T048-T053) can run in parallel

**Within Phase 7 (Polish)**:
- T054-T062 are all parallelizable

### Example Parallel Execution

**Scenario 1: Two developers on US1**
- Developer A: T019-T022 (hooks)
- Developer B: T023-T026 (components)
- Both merge, then A does T027, B does T028

**Scenario 2: Three developers after US1**
- Developer A: US2 (T029-T041)
- Developer B: US4 (T042-T047)
- Developer C: US3 (T048-T053)
- All merge simultaneously, no conflicts (different files)

---

## Testing Strategy

### Test Organization

**Integration Tests** (TDD - Write First):
- `tests/integration/component-metadata/edit-metadata.test.ts` - US1 scenarios
- `tests/integration/component-metadata/create-metadata.test.ts` - US2 scenarios
- `tests/integration/component-metadata/view-only-access.test.ts` - US4 scenarios
- `tests/integration/component-metadata/clear-metadata.test.ts` - US3 scenarios
- `tests/integration/component-metadata/concurrent-edits.test.ts` - Edge case

**Unit Tests** (TDD - Write First):
- Component tests: Colocated .test.tsx files
- Hook tests: Colocated .test.ts files
- Validation tests: `tests/unit/validation/metadata-validation.test.ts`

### Coverage Requirements

- **Overall**: ≥70% (CI enforced)
- **Hooks** (`src/hooks/*.ts`): ≥80%
- **Components** (`src/components/component-metadata/*.tsx`): ≥60%
- **Validation** (`src/lib/validation.ts`): ≥80%

---

## Success Metrics

**Implementation Tracking**:
- Total Tasks: 62
- MVP (US1): 28 tasks (Setup + Foundational + US1)
- Incremental (US2): 13 tasks
- Incremental (US4): 6 tasks
- Incremental (US3): 6 tasks
- Polish: 9 tasks

**Independent Test Criteria**:
- US1: Open modal, edit Area, save → table updates (MVP deliverable)
- US2: Create new System, use in assignment → persists
- US4: Login as Field User → view-only modal with milestone history
- US3: Select "(None)" for all fields → table shows blanks

**Performance Targets** (from spec SC-001 to SC-010):
- Modal open: <200ms
- Save + update: <1s
- Complete task: <15s
- 100% persistence after reload
- Concurrent conflicts detected: 100%
- Keyboard accessible: 100%
- RLS enforcement: 100%
- 3000 entities: No lag
- Duplicate prevention: 100%

---

*Constitution Version: 1.0.2 | Tasks Generated: 2025-10-29*
