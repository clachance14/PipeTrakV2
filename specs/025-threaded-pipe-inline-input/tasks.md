# Tasks: Threaded Pipe Inline Milestone Input

**Input**: Design documents from `/specs/025-threaded-pipe-inline-input/`
**Prerequisites**: plan.md (completed), spec.md (completed)

**Tests**: This feature follows TDD workflow per Constitution Principle III. Tests are written FIRST and must FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single React SPA project: `src/`, `tests/` at repository root
- All paths relative to `/home/clachance14/projects/PipeTrak_V2/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing project structure (no new infrastructure needed)

- [X] T001 Verify existing ComponentRow in src/components/drawing-table/ComponentRow.tsx
- [X] T002 Verify existing test file at tests/integration/010-drawing-table/scenario-4-update-partial.test.tsx
- [X] T003 Verify existing hooks: useUpdateMilestone, useMobileDetection, useOfflineQueue
- [X] T004 Review existing MilestoneCheckbox for styling consistency patterns

**Checkpoint**: All existing infrastructure confirmed - ready for user story implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational phase needed - all infrastructure exists

✅ **SKIP**: All hooks, types, and database schema already in place

---

## Phase 3: User Story 1 - Direct Numeric Entry (Priority: P1) 🎯 MVP START

**Goal**: Replace slider-based editors with inline numeric input. Field workers type percentage (e.g., "75"), press Enter or blur to save.

**Independent Test**: Create threaded pipe component, tap input, type "75", press Enter → milestone updates to 75%, progress recalculates.

### Tests for User Story 1 (TDD - Write FIRST, ensure FAIL)

- [X] T005 [US1] Update integration test in tests/integration/010-drawing-table/scenario-4-update-partial.test.tsx - Remove old popover interaction tests (lines ~419-527)
- [X] T006 [US1] Add test: "renders threaded pipe with inline numeric inputs" - Verify 5 partial milestone inputs display with current values
- [X] T007 [US1] Add test: "updates milestone on Enter key press" - Type "75", press Enter → calls onUpdate(75), shows success toast
- [X] T008 [US1] Add test: "updates milestone on blur event" - Type "75", click outside → calls onUpdate(75), returns to default state
- [X] T009 [US1] Add test: "cancels edit on Escape key press" - Type "75", press Escape → reverts to previous value, blurs input

**Verify**: Run `npm test scenario-4` - all new tests should FAIL (component doesn't exist yet)

### Implementation for User Story 1

- [X] T010 [US1] Create PartialMilestoneInput component in src/components/drawing-table/PartialMilestoneInput.tsx - Basic structure with interface (milestone, currentValue, onUpdate, disabled props)
- [X] T011 [US1] Implement input element with type="number", inputMode="numeric", pattern="[0-9]*" in PartialMilestoneInput
- [X] T012 [US1] Add onFocus handler - Select all text when input receives focus
- [X] T013 [US1] Add onChange handler - Update local state as user types
- [X] T014 [US1] Add onBlur handler - Call onUpdate(value) when user clicks outside
- [X] T015 [US1] Add onKeyDown handler - Save on Enter (call onUpdate, move focus to next), cancel on Escape (revert value, blur)
- [X] T016 [US1] Add "%" suffix display - Append visually after input value (not editable)
- [X] T017 [US1] Update ComponentRow.tsx getMilestoneControl() - Replace PartialMilestoneEditor with PartialMilestoneInput for partial milestones (lines ~113-139)
- [X] T018 [US1] Remove mobile branching logic from ComponentRow - PartialMilestoneInput handles both desktop and mobile
- [X] T019 [US1] Update ComponentRow imports - Remove PartialMilestoneEditor and MobilePartialMilestoneEditor, add PartialMilestoneInput

**Verify**: Run `npm test scenario-4` - US1 tests should now PASS

**Checkpoint**: Basic inline input working - Enter key and blur save functionality operational

---

## Phase 4: User Story 2 - Input Validation (Priority: P1)

**Goal**: Validate 0-100 range, show visual feedback (red border, shake, toast) for invalid values, revert after 2s.

**Independent Test**: Type "150" → blur → red border appears, error toast shows "Value must be between 0-100", reverts to previous value after 2s.

### Tests for User Story 2 (TDD - Write FIRST, ensure FAIL)

- [X] T020 [US2] Add test: "shows error for value >100" - Type "150", blur → red border, error toast, reverts after 2s
- [X] T021 [US2] Add test: "shows error for negative value" - Type "-10", blur → red border, error toast, reverts
- [X] T022 [US2] Add test: "reverts to previous on empty input" - Clear input, blur → reverts to previous value silently
- [X] T023 [US2] Add test: "rounds decimal values" - Type "75.5", blur → saves as 76 (rounded)
- [X] T024 [US2] Add test: "normalizes leading zeros" - Type "075", blur → saves as 75

**Verify**: Run `npm test scenario-4` - new validation tests should FAIL

### Implementation for User Story 2

- [X] T025 [US2] Add validation function in PartialMilestoneInput - Check 0 ≤ value ≤ 100, return boolean
- [X] T026 [US2] Update onBlur handler - Validate before calling onUpdate, show error if invalid
- [X] T027 [US2] Add error state (useState) - Track invalid input, trigger visual feedback
- [X] T028 [US2] Add error styling - Red border (border-red-500), shake animation CSS
- [X] T029 [US2] Add error toast integration - Display "Value must be between 0-100" via toast notification
- [X] T030 [US2] Add auto-revert timer - Set 2s timeout to revert to previous value after error
- [X] T031 [US2] Handle edge cases - Empty input (revert), decimal (Math.round), leading zeros (parseInt)

**Verify**: Run `npm test scenario-4` - US2 validation tests should now PASS

**Checkpoint**: Input validation working - invalid values rejected with clear feedback

---

## Phase 5: User Story 3 - Mobile Optimization (Priority: P1) 🎯 MVP COMPLETE

**Goal**: Touch-optimized inputs (≥48px height), numeric keyboard auto-opens on iOS/Android.

**Independent Test**: View on mobile (≤1024px viewport), tap input → numeric keyboard opens automatically, touch target ≥48px.

### Tests for User Story 3 (TDD - Write FIRST, ensure FAIL)

- [X] T032 [US3] Add test: "mobile viewport shows 48px touch targets" - Simulate ≤1024px viewport, verify input height ≥48px
- [X] T033 [US3] Add test: "input uses 16px font on mobile" - Verify font-size: 16px to prevent iOS auto-zoom
- [X] T034 [US3] Add test: "inputMode='numeric' attribute present" - Verify attribute exists (triggers numeric keyboard)
- [X] T035 [US3] Add test: "pattern='[0-9]*' attribute present" - Verify attribute exists (additional keyboard hint)

**Verify**: Run `npm test scenario-4` - mobile optimization tests should FAIL

### Implementation for User Story 3

- [X] T036 [US3] Add isMobile prop to PartialMilestoneInput interface - Accept boolean from parent
- [X] T037 [US3] Add responsive sizing - Desktop: 56px width × 32px height, Mobile: 64px width × 48px height
- [X] T038 [US3] Add conditional font size - Desktop: 14px, Mobile: 16px (prevent iOS zoom)
- [X] T039 [US3] Update ComponentRow - Pass isMobile={isMobile} prop to PartialMilestoneInput (isMobile from useMobileDetection hook)
- [X] T040 [US3] Verify inputMode="numeric" and pattern="[0-9]*" - Confirm attributes in input element

**Verify**: Run `npm test scenario-4` - US3 mobile tests should now PASS

**Checkpoint**: Mobile optimization complete - numeric keyboard auto-opens, touch targets WCAG compliant (≥48px)

**🎯 MVP READY**: US1-US3 (all P1 stories) complete - core value delivered (direct input, validation, mobile optimization)

---

## Phase 6: User Story 4 - Keyboard Navigation (Priority: P2)

**Goal**: Tab moves between inputs, Shift+Tab moves back, Enter saves + advances focus.

**Independent Test**: Focus Fabricate input, press Tab → focus moves to Install input. Type value, press Enter → saves and moves to next.

### Tests for User Story 4 (TDD - Write FIRST, ensure FAIL)

- [X] T041 [US4] Add test: "Tab key moves to next input" - Focus Fabricate, press Tab → Install receives focus
- [X] T042 [US4] Add test: "Shift+Tab moves to previous input" - Focus Install, press Shift+Tab → Fabricate receives focus
- [X] T043 [US4] Add test: "Enter saves and advances focus" - Type "75", press Enter → saves value, focus moves to Install
- [X] T044 [US4] Add test: "Escape cancels and blurs" - Type "75", press Escape → reverts value, input loses focus

**Verify**: Run `npm test scenario-4` - keyboard navigation tests should FAIL

### Implementation for User Story 4

- [X] T045 [US4] Update onKeyDown - On Enter: validate, call onUpdate, find next input via DOM, focus it
- [X] T046 [US4] Add focus management - Query next sibling input element, call .focus() method
- [X] T047 [US4] Update Escape handler - Already implemented in T015, verify blur() called after revert
- [X] T048 [US4] Test Tab navigation - Verify native browser Tab behavior works (no custom handling needed)

**Verify**: Run `npm test scenario-4` - US4 keyboard tests should now PASS

**Checkpoint**: Keyboard navigation operational - desktop users can navigate without mouse

---

## Phase 7: User Story 5 - Permissions & Disabled States (Priority: P2)

**Goal**: Disable inputs when user lacks canUpdateMilestones permission (gray background, cursor-not-allowed).

**Independent Test**: Create user without canUpdateMilestones → inputs disabled, no interaction possible.

### Tests for User Story 5 (TDD - Write FIRST, ensure FAIL)

- [X] T049 [US5] Add test: "disabled when no permission" - Set disabled={true}, verify gray background, cursor-not-allowed
- [X] T050 [US5] Add test: "no interaction when disabled" - Click disabled input → no focus, no keyboard opens
- [X] T051 [US5] Add test: "permission change disables mid-session" - Start enabled, change disabled={true} during edit → cancels edit, disables input

**Verify**: Run `npm test scenario-4` - permission tests should FAIL

### Implementation for User Story 5

- [X] T052 [US5] Add disabled styling - bg-slate-100, opacity-50, cursor-not-allowed when disabled={true}
- [X] T053 [US5] Prevent interaction when disabled - Add disabled attribute to input element
- [X] T054 [US5] Cancel in-progress edit if disabled changes - useEffect watches disabled prop, calls revert if changes to true during edit

**Verify**: Run `npm test scenario-4` - US5 permission tests should now PASS

**Checkpoint**: Permission enforcement working - unauthorized users cannot modify milestones

---

## Phase 8: User Story 6 - Screen Reader Accessibility (Priority: P3)

**Goal**: ARIA labels, live regions for screen reader announcements ("Fabricate milestone, currently 50 percent").

**Independent Test**: VoiceOver/TalkBack announces input state on focus, announces update on save.

### Tests for User Story 6 (TDD - Write FIRST, ensure FAIL)

- [X] T055 [US6] Add test: "aria-label includes milestone name and value" - Verify aria-label="Fabricate milestone, currently 50 percent"
- [X] T056 [US6] Add test: "aria-valuemin, aria-valuemax, aria-valuenow present" - Verify attributes (0, 100, currentValue)
- [X] T057 [US6] Add test: "aria-invalid set on error" - Invalid input → aria-invalid="true"
- [X] T058 [US6] Add test: "live region announces update" - Save value → parent component announces "Fabricate updated to 75 percent"

**Verify**: Run `npm test scenario-4` - accessibility tests should FAIL

### Implementation for User Story 6

- [X] T059 [US6] Add aria-label - Format: "{milestone.name} milestone, currently {currentValue} percent"
- [X] T060 [US6] Add aria-valuemin="0" aria-valuemax="100" aria-valuenow={currentValue} - Spinbutton attributes
- [X] T061 [US6] Add aria-invalid - Set to "true" when error state active
- [X] T062 [US6] Add role="spinbutton" - Explicit role (implicit with type="number" but add for clarity)
- [X] T063 [US6] Verify live region in parent - ComponentRow already shows toast (acts as live region via ARIA live)

**Verify**: Run `npm test scenario-4` - US6 accessibility tests should now PASS

**Checkpoint**: Screen reader support complete - visually impaired users can use inline inputs

---

## Phase 9: Cleanup & Polish

**Purpose**: Remove old components, final validation, documentation

- [X] T064 Delete old PartialMilestoneEditor component - rm src/components/drawing-table/PartialMilestoneEditor.tsx
- [X] T065 Delete old MobilePartialMilestoneEditor component - rm src/components/drawing-table/MobilePartialMilestoneEditor.tsx
- [X] T066 Remove old component imports from ComponentRow - Clean up unused imports
- [X] T067 Run full test suite - npm test (verify all tests pass, no regressions)
- [X] T068 Run type check - npx tsc -b (verify TypeScript strict mode compliance)
- [X] T069 Run linter - npm run lint (verify no linting errors)
- [X] T070 Manual testing on real mobile devices - iOS Safari, Android Chrome (verify numeric keyboard, touch targets)
- [X] T071 Manual screen reader testing - VoiceOver (iOS/Mac), TalkBack (Android), NVDA (Windows)
- [X] T072 Update CLAUDE.md - Add feature to "Recently Completed Features" section with completion date

**Checkpoint**: All 6 user stories implemented, old code removed, tests passing, ready for PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verify existing infrastructure
- **Foundational (Phase 2)**: SKIPPED - all infrastructure exists
- **User Stories (Phase 3-8)**: Can proceed sequentially or in parallel
  - **US1 (P1)**: BLOCKS all others (creates base component)
  - **US2 (P1)**: Depends on US1 (adds validation to existing component)
  - **US3 (P1)**: Depends on US1 (adds mobile sizing)
  - **US4 (P2)**: Depends on US1 (adds keyboard nav)
  - **US5 (P2)**: Depends on US1 (adds disabled state)
  - **US6 (P3)**: Depends on US1 (adds ARIA attributes)
- **Cleanup (Phase 9)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Must complete FIRST - creates PartialMilestoneInput component
- **US2-US6**: All add features to the US1 component (sequential enhancement)

### Within Each User Story (TDD Workflow)

1. **Write tests FIRST** (T005-T009, T020-T024, etc.) - Ensure they FAIL
2. **Implement feature** (T010-T019, T025-T031, etc.) - Make tests PASS
3. **Verify checkpoint** - Run tests, confirm independent functionality

### Parallel Opportunities

- **Phase 1 (Setup)**: All 4 verification tasks can run in parallel
- **Within each user story**: Tests can be written in parallel BEFORE implementation
- **US2-US6 enhancements**: If multiple developers available, US2-US6 can proceed in parallel AFTER US1 completes (different aspects of same component, minimal conflicts)

---

## Parallel Example: User Story 2 (Validation)

```bash
# Write all validation tests in parallel (before implementation):
Task: "Add test: shows error for value >100" [T020]
Task: "Add test: shows error for negative value" [T021]
Task: "Add test: reverts to previous on empty input" [T022]
Task: "Add test: rounds decimal values" [T023]
Task: "Add test: normalizes leading zeros" [T024]

# Then implement validation logic sequentially:
Task: "Add validation function" [T025]
Task: "Update onBlur handler" [T026]
...
```

---

## Implementation Strategy

### MVP First (US1-US3: Priority P1 Only)

1. Complete Phase 1: Setup (T001-T004) - 5 minutes
2. Skip Phase 2: Foundational (no work needed)
3. Complete Phase 3: US1 Direct Input (T005-T019) - 2 hours
4. Complete Phase 4: US2 Validation (T020-T031) - 1.5 hours
5. Complete Phase 5: US3 Mobile (T032-T040) - 1 hour
6. **STOP and VALIDATE**: Test all P1 stories independently
7. Manual mobile testing (iOS/Android)
8. **MVP READY**: Deploy if validated successfully

**Total MVP Time**: ~5 hours

### Full Feature (All User Stories)

1. Complete MVP (US1-US3) first
2. Add Phase 6: US4 Keyboard Nav (T041-T048) - 45 minutes
3. Add Phase 7: US5 Permissions (T049-T054) - 30 minutes
4. Add Phase 8: US6 Accessibility (T055-T063) - 1 hour
5. Complete Phase 9: Cleanup (T064-T072) - 1 hour
6. **VALIDATE**: Full test suite + manual testing

**Total Full Feature Time**: ~8.5 hours

### Incremental Delivery

1. Deploy MVP (US1-US3) → Field workers get direct input, validation, mobile optimization
2. Deploy US4 → Desktop users get keyboard navigation
3. Deploy US5 → Permission enforcement visual feedback
4. Deploy US6 → Screen reader users can use feature

Each increment adds value without breaking previous functionality.

---

## Notes

- **TDD Mandatory**: Per Constitution Principle III, tests written FIRST, must FAIL before implementation
- **Constitution Compliance**: All 5 principles verified in plan.md (Type Safety, Component-Driven, Testing, Supabase, Specify Workflow)
- **Zero Database Changes**: Pure UI refactor, reuses existing hooks and RPC functions
- **Existing Tests Reused**: Update existing `scenario-4-update-partial.test.tsx`, don't create new test file
- **Commit Strategy**: Commit after each user story checkpoint (T019, T031, T040, T048, T054, T063, T072)
- **Design Reference**: `docs/plans/2025-11-07-threaded-pipe-inline-input-design.md` for detailed mockups
- **Rollback Plan**: Revert commit restores old components (no database cleanup needed)

**Total Tasks**: 72 tasks across 9 phases
**Est. Total Time**: ~8.5 hours (MVP: ~5 hours)
**Parallel Opportunities**: Tests within each story, US2-US6 after US1 completes
