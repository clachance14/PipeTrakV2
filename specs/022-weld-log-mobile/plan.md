# Implementation Plan: Mobile Weld Log Optimization

**Branch**: `022-weld-log-mobile` | **Date**: 2025-11-02 | **Spec**: [spec.md](spec.md)
**Design**: `docs/plans/2025-11-02-mobile-weld-log-design.md`

## Summary

Optimize the weld log table for mobile devices by displaying only 3 essential columns (Weld ID, Drawing Number, Date Welded) on screens ≤1024px, with a tap-to-open detail modal for viewing complete weld information and performing actions (milestone updates via UpdateWeldDialog, welder assignment, NDE recording). Desktop view (>1024px) remains unchanged with all 10 columns and inline actions.

**Key Design Decision**: This feature adds a **new location** for field weld updates (weld log table) that replicates the same milestone update patterns that already exist on the drawing/component table. The milestone interception logic (Weld Made → WelderAssignDialog) is copied from DrawingComponentTablePage.tsx to ensure consistent behavior across both UI locations.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 18.3, TanStack Query v5, Supabase JS Client, shadcn/ui (Dialog, Badge), Tailwind CSS v4
**Storage**: Supabase PostgreSQL (existing `field_welds` table, no schema changes)
**Testing**: Vitest + Testing Library + jsdom (unit + integration tests)
**Target Platform**: Web (mobile-responsive SPA, tested on iOS Safari & Chrome Android)
**Project Type**: Web application (frontend-only feature, no backend changes)
**Performance Goals**: Table renders <2s for 1,000 welds, modal loads <1s on 3G networks
**Constraints**: No horizontal scrolling on mobile, ≥44px touch targets (WCAG 2.1 AA), desktop functionality 100% unchanged
**Scale/Scope**: Modifies 2 existing files, creates 2 new files (~600-800 LOC total)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
|-----------|-------------|---------|-------|
| **I. Type Safety First** | TypeScript strict mode, no type assertions | ✅ PASS | Existing codebase uses strict mode. New WeldDetailModal component follows strict typing with EnrichedFieldWeld interface. UpdateWeldDialog modified with onTriggerWelderDialog callback prop (typed). No database type changes needed. |
| **II. Component-Driven Development** | Shadcn/ui patterns, colocated tests, state via TanStack Query/Zustand | ✅ PASS | WeldDetailModal and UpdateWeldDialog use shadcn Dialog primitive. Modal state managed in WeldLogPage (page-level state, matches DrawingComponentTablePage pattern). Existing TanStack Query hooks (useFieldWelds, useUpdateMilestone, useAssignWelder) already handle data fetching. |
| **III. Testing Discipline** | TDD via Red-Green-Refactor | ✅ PASS | Tests for WeldDetailModal.test.tsx and WeldLogTable.test.tsx written before implementation. UpdateWeldDialog.test.tsx extended with interception tests before modifying logic. Integration tests verify mobile breakpoint behavior and modal workflows. |
| **IV. Supabase Integration Patterns** | RLS enabled, TanStack Query wrapping, AuthContext | ✅ PASS | No new database tables. Reuses existing field_welds query with RLS policies. No Supabase changes required. |
| **V. Specify Workflow Compliance** | `/specify` → `/plan` → `/tasks` → `/implement` | ✅ PASS | Following complete workflow. This plan verifies constitution gates before implementation. |

**Pre-Research Gate: ✅ PASS** - All constitution principles satisfied. No violations to justify.

**Post-Design Re-Check**: ✅ PASS - Design document created, all patterns validated with user.

## Project Structure

### Documentation (this feature)

```text
specs/022-weld-log-mobile/
├── spec.md              # Feature specification (✅ updated 2025-11-02)
├── plan.md              # This file (✅ updated 2025-11-02)
├── tasks.md             # Phase 2 output (/speckit.tasks command - to be generated)
└── docs/plans/2025-11-02-mobile-weld-log-design.md  # Design document (✅ complete)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── weld-log/
│   │   ├── WeldLogTable.tsx              # MODIFIED: Add mobile 3-column view + onRowClick
│   │   ├── WeldLogTable.test.tsx         # MODIFIED: Add mobile breakpoint tests
│   │   ├── WeldLogFilters.tsx            # UNCHANGED: Already mobile-optimized
│   │   ├── WeldDetailModal.tsx           # NEW: Detail modal component
│   │   ├── WeldDetailModal.test.tsx      # NEW: Modal unit tests
│   │   └── NDEResultDialog.tsx           # REUSED: Existing dialog
│   ├── field-welds/
│   │   ├── UpdateWeldDialog.tsx          # MODIFIED: Add milestone interception logic
│   │   ├── UpdateWeldDialog.test.tsx     # MODIFIED: Add interception tests
│   │   └── WelderAssignDialog.tsx        # REUSED: Existing dialog
│   └── ui/
│       └── dialog.tsx                     # REUSED: Shadcn Dialog primitive
├── pages/
│   └── WeldLogPage.tsx                    # MODIFIED: Add modal state management
├── hooks/
│   ├── useMobileDetection.ts              # REUSED: Existing mobile detection hook
│   ├── useUpdateMilestone.ts              # REUSED: Existing milestone mutation hook
│   ├── useAssignWelder.ts                 # REUSED: Existing welder assignment hook
│   └── useRecordNDE.ts                    # REUSED: Existing NDE recording hook
├── lib/
│   ├── responsive-utils.ts                # REUSED: MOBILE_BREAKPOINT constant
│   ├── field-weld-utils.ts                # REUSED: Format utilities
│   └── format.ts                          # REUSED: Date formatting utilities
└── types/
    └── database.types.ts                  # REUSED: EnrichedFieldWeld interface

tests/
├── integration/
│   └── weld-log-mobile.test.tsx            # NEW: Integration tests for mobile workflow
└── unit/
    └── [colocated *.test.tsx files]
```

**Structure Decision**: This is a web application frontend feature. We use the existing React SPA structure under `src/`. All new code is colocated with the existing weld log components in `src/components/weld-log/`. No backend/database changes required - this is a pure UI optimization feature.

## File Changes Summary

### New Files (2)

1. **src/components/weld-log/WeldDetailModal.tsx** (~250 LOC)
   - Read-only modal displaying all 10 weld fields
   - Conditional action button (Update Weld / Record NDE / none)
   - Organized sections: Identification, Specifications, Welder Info, NDE Results, Status & Progress
   - Props: weld, open, onOpenChange, onUpdateWeld, onRecordNDE

2. **src/components/weld-log/WeldDetailModal.test.tsx** (~150 LOC)
   - Button logic tests (3 states: pre-weld, post-weld, post-NDE)
   - Action callback tests (onUpdateWeld, onRecordNDE)
   - Null/missing data rendering tests
   - Accessibility tests (keyboard navigation, ARIA labels)

### Modified Files (4)

3. **src/components/field-welds/UpdateWeldDialog.tsx** (+30 LOC)
   - Add onTriggerWelderDialog prop
   - Add interception logic in handleSave (copied from DrawingComponentTablePage.tsx:122-135)
   - Check if Weld Made is being checked for first time → call onTriggerWelderDialog instead of useUpdateMilestone

4. **src/components/field-welds/UpdateWeldDialog.test.tsx** (+80 LOC)
   - Add interception test (Weld Made first-time → triggers callback, no direct update)
   - Add non-interception test (Fit-Up only → direct update)
   - Add uncheck test (Weld Made unchecked → direct update, no interception)

5. **src/components/weld-log/WeldLogTable.tsx** (+150 LOC)
   - Add isMobile prop and onRowClick handler
   - Add conditional rendering: if (isMobile) render 3-column table, else render existing 10-column table
   - Mobile table: Weld ID, Drawing Number, Date Welded columns with sortable headers
   - Mobile rows: onClick handler, role="button", tabIndex={0}, onKeyPress for Enter
   - Drawing link: stopPropagation to prevent modal opening
   - Touch targets: min-h-[44px] on rows

6. **src/components/weld-log/WeldLogTable.test.tsx** (+100 LOC)
   - Add mobile view test (isMobile=true → 3 columns)
   - Add desktop view test (isMobile=false → 10 columns)
   - Add row click test (onRowClick called with weld ID)
   - Add drawing link test (link click does NOT trigger onRowClick)
   - Add keyboard navigation test (Enter key triggers onRowClick)

7. **src/pages/WeldLogPage.tsx** (+80 LOC)
   - Add modal state: selectedWeld, isDetailModalOpen, isUpdateDialogOpen, isWelderDialogOpen, isNDEDialogOpen
   - Add isMobile = useMobileDetection()
   - Add event handlers: handleRowClick, handleUpdateWeld, handleTriggerWelderDialog, handleRecordNDE
   - Pass isMobile and onRowClick to WeldLogTable
   - Render WeldDetailModal, UpdateWeldDialog (modified), WelderAssignDialog (existing), NDEResultDialog (existing)
   - Modal closure behavior: close parent modals when child opens

8. **tests/integration/weld-log-mobile.test.tsx** (~200 LOC)
   - Complete workflow test: view → update → assign welder → record NDE
   - Modal closure test: verify parent modals close when child opens
   - Keyboard navigation test
   - Data refresh test: verify table updates after mutations

**Total LOC**: ~1,040 lines (new: ~600, modified: ~440)

## Implementation Phases

### Phase 1: WeldDetailModal (Read-Only View)

**Goal**: Create read-only detail modal with conditional action button

**TDD Tasks**:
1. **Test First** - Write WeldDetailModal.test.tsx:
   - Test: Shows "Update Weld" button when weld not made
   - Test: Shows "Record NDE" button when weld made but no NDE
   - Test: Shows NO buttons when NDE recorded
   - Test: Calls onUpdateWeld when button clicked
   - Test: Calls onRecordNDE when button clicked
   - Test: Displays "-" for null/missing fields
   - Test: All sections render correctly

2. **Implementation** - Create WeldDetailModal.tsx:
   - Component structure with Dialog from shadcn/ui
   - 6 sections (Identification, Specifications, Welder Info, NDE Results, Metadata, Status & Progress)
   - Conditional action button logic (inline if/else)
   - Touch targets ≥44px for buttons
   - ARIA labels for accessibility

3. **Green** - Run tests, verify all pass

4. **Commit**: `feat(022): add WeldDetailModal with conditional action buttons`

**Acceptance Criteria**:
- ✅ All WeldDetailModal tests pass
- ✅ Button logic works for all 3 states (pre-weld, post-weld, post-NDE)
- ✅ Null/missing data displays "-"
- ✅ Touch targets ≥44px
- ✅ ARIA labels present

---

### Phase 2: UpdateWeldDialog Interception

**Goal**: Add Weld Made interception to trigger welder assignment

**TDD Tasks**:
1. **Test First** - Update UpdateWeldDialog.test.tsx:
   - Test: Weld Made first-time check → calls onTriggerWelderDialog, does NOT call useUpdateMilestone
   - Test: Fit-Up only check → calls useUpdateMilestone, does NOT call onTriggerWelderDialog
   - Test: Weld Made uncheck → calls useUpdateMilestone (no interception)
   - Test: Weld Made already checked → allows uncheck (no interception)

2. **Implementation** - Modify UpdateWeldDialog.tsx:
   - Add onTriggerWelderDialog prop (required callback function)
   - Copy interception logic from DrawingComponentTablePage.tsx:122-135
   - In handleSave: check if Weld Made && first time → call onTriggerWelderDialog, return early
   - Otherwise: normal useUpdateMilestone flow

3. **Green** - Run tests, verify all pass

4. **Refactor** - Extract interception logic to separate function if needed for clarity

5. **Commit**: `fix(022): add Weld Made interception to UpdateWeldDialog`

**Acceptance Criteria**:
- ✅ All UpdateWeldDialog tests pass
- ✅ Interception triggers on first-time Weld Made check
- ✅ No interception for Fit-Up only or unchecking
- ✅ Matches DrawingComponentTablePage pattern exactly

---

### Phase 3: WeldLogTable Mobile View

**Goal**: Add 3-column mobile table with row click handler

**TDD Tasks**:
1. **Test First** - Update WeldLogTable.test.tsx:
   - Test: isMobile=true → renders 3 columns (Weld ID, Drawing, Date Welded)
   - Test: isMobile=false → renders 10 columns (unchanged)
   - Test: Mobile row click → calls onRowClick with weld ID
   - Test: Drawing link click → does NOT call onRowClick (stopPropagation)
   - Test: Enter key on mobile row → calls onRowClick
   - Test: Mobile rows have min-h-[44px]

2. **Implementation** - Modify WeldLogTable.tsx:
   - Add isMobile prop (boolean)
   - Add onRowClick prop (optional callback)
   - Add conditional rendering: if (isMobile) { /* 3-column table */ } else { /* existing 10-column table */ }
   - Mobile table structure:
     - Sortable headers (Weld ID, Drawing, Date Welded)
     - Rows with onClick handler, role="button", tabIndex={0}, onKeyPress
     - Drawing link with stopPropagation
     - Touch targets: min-h-[44px]
     - ARIA labels: aria-label="View details for weld {id}"

3. **Green** - Run tests, verify all pass

4. **Refactor** - Extract mobile row rendering to separate function if needed

5. **Commit**: `feat(022): add 3-column mobile view to WeldLogTable`

**Acceptance Criteria**:
- ✅ All WeldLogTable tests pass
- ✅ Mobile view shows only 3 columns
- ✅ Desktop view unchanged (10 columns)
- ✅ Row click triggers callback
- ✅ Drawing link does not trigger row click
- ✅ Keyboard navigation works (Enter key)
- ✅ Touch targets ≥44px

---

### Phase 4: WeldLogPage Modal Orchestration

**Goal**: Wire up all modals with correct state management and closure behavior

**Implementation Tasks**:
1. **Add Modal State** - Modify WeldLogPage.tsx:
   ```typescript
   const [selectedWeld, setSelectedWeld] = useState<EnrichedFieldWeld | null>(null)
   const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
   const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
   const [isWelderDialogOpen, setIsWelderDialogOpen] = useState(false)
   const [isNDEDialogOpen, setIsNDEDialogOpen] = useState(false)
   const isMobile = useMobileDetection()
   ```

2. **Add Event Handlers**:
   ```typescript
   const handleRowClick = (weldId: string) => {
     const weld = filteredWelds.find(w => w.id === weldId)
     if (weld) {
       setSelectedWeld(weld)
       setIsDetailModalOpen(true)
     }
   }

   const handleUpdateWeld = () => {
     setIsUpdateDialogOpen(true)
     // Keep detail modal open (stacked)
   }

   const handleTriggerWelderDialog = () => {
     // Close parent modals (per user requirement)
     setIsDetailModalOpen(false)
     setIsUpdateDialogOpen(false)
     setIsWelderDialogOpen(true)
   }

   const handleRecordNDE = () => {
     setIsDetailModalOpen(false)  // Close detail modal
     setIsNDEDialogOpen(true)
   }
   ```

3. **Wire Up Components**:
   ```tsx
   <WeldLogTable
     welds={filteredWelds}
     isMobile={isMobile}
     onRowClick={isMobile ? handleRowClick : undefined}
     // ... existing props
   />

   {selectedWeld && (
     <>
       <WeldDetailModal
         weld={selectedWeld}
         open={isDetailModalOpen}
         onOpenChange={setIsDetailModalOpen}
         onUpdateWeld={handleUpdateWeld}
         onRecordNDE={handleRecordNDE}
       />

       <UpdateWeldDialog
         weld={selectedWeld}
         open={isUpdateDialogOpen}
         onOpenChange={setIsUpdateDialogOpen}
         onTriggerWelderDialog={handleTriggerWelderDialog}
       />

       <WelderAssignDialog
         fieldWeldId={selectedWeld.id}
         projectId={projectId}
         open={isWelderDialogOpen}
         onOpenChange={setIsWelderDialogOpen}
       />

       <NDEResultDialog
         fieldWeldId={selectedWeld.id}
         componentId={selectedWeld.component.id}
         open={isNDEDialogOpen}
         onOpenChange={setIsNDEDialogOpen}
       />
     </>
   )}
   ```

4. **Commit**: `feat(022): add mobile modal workflow to WeldLogPage`

**Acceptance Criteria**:
- ✅ Row click opens detail modal on mobile
- ✅ Update Weld button opens UpdateWeldDialog
- ✅ Weld Made interception closes both detail modal and update dialog, opens welder dialog
- ✅ Record NDE button closes detail modal, opens NDE dialog
- ✅ After welder/NDE completion, return to table
- ✅ TanStack Query auto-refresh works

---

### Phase 5: Integration Tests

**Goal**: Verify complete mobile workflow with integration tests

**TDD Tasks**:
1. **Test First** - Create tests/integration/weld-log-mobile.test.tsx:
   - Test: Complete workflow (view → update → assign welder → record NDE)
   - Test: Modal closure (parent modals close when child opens)
   - Test: Keyboard navigation (Tab, Enter, Escape)
   - Test: Data refresh (table updates after mutations)

2. **Green** - Run tests, verify workflow works end-to-end

3. **Commit**: `test(022): add weld log mobile integration tests`

**Acceptance Criteria**:
- ✅ All integration tests pass
- ✅ Complete workflow test verifies full user journey
- ✅ Modal closure behavior verified
- ✅ Data refresh verified

---

### Phase 6: Verification & Documentation

**Goal**: Verify all requirements met, update documentation

**Tasks**:
1. **Run Full Test Suite**: `npm test`
   - Verify all tests pass
   - Verify coverage ≥70% (run `npm test -- --coverage`)

2. **Manual Testing**:
   - Test on real devices (iOS Safari, Chrome Android)
   - Verify no horizontal scroll on mobile
   - Verify touch targets ≥44px
   - Test desktop unchanged (>1024px)

3. **Accessibility Audit**:
   - Run axe-core on weld log page
   - Verify WCAG 2.1 AA compliance
   - Test keyboard navigation
   - Test screen reader (VoiceOver on iOS, TalkBack on Android)

4. **Update Documentation**:
   - Update CLAUDE.md with Feature 022 completion
   - Commit: `docs(022): mark mobile weld log complete in CLAUDE.md`

**Acceptance Criteria**:
- ✅ All tests pass (unit + integration)
- ✅ Coverage ≥70%
- ✅ Mobile devices tested (no horizontal scroll)
- ✅ Desktop unchanged
- ✅ WCAG 2.1 AA compliant
- ✅ Documentation updated

---

## Implementation Order (TDD Workflow)

**Per Principle III (Testing Discipline)**: Red → Green → Refactor for every component

1. **Phase 1**: WeldDetailModal
   - Write tests → Implement component → Verify tests pass → Commit

2. **Phase 2**: UpdateWeldDialog Interception
   - Write tests → Modify component → Verify tests pass → Commit

3. **Phase 3**: WeldLogTable Mobile View
   - Write tests → Modify component → Verify tests pass → Commit

4. **Phase 4**: WeldLogPage Modal Orchestration
   - Implement state + handlers → Wire up components → Manual test → Commit

5. **Phase 5**: Integration Tests
   - Write integration tests → Verify all pass → Commit

6. **Phase 6**: Verification & Documentation
   - Full test suite → Manual testing → Accessibility audit → Update docs → Commit

## Success Criteria

**Functional**:
- ✅ Mobile users can view weld log without horizontal scrolling (≤1024px)
- ✅ Mobile users can access full weld details in 1 tap (row click)
- ✅ Mobile users can update milestones via UpdateWeldDialog
- ✅ Weld Made interception triggers welder assignment (matches DrawingComponentTablePage)
- ✅ NDE recording accessible after weld made
- ✅ Desktop view 100% unchanged (>1024px)

**Non-Functional**:
- ✅ Touch targets ≥44px (WCAG 2.1 AA)
- ✅ Keyboard navigation fully functional
- ✅ Modal focus management correct
- ✅ Test coverage ≥70%
- ✅ No horizontal scroll on mobile
- ✅ Performance: table renders <2s for 1,000 welds
- ✅ Modal closure behavior: parent modals close when child opens

## Design Patterns Used

1. **Independent Modals with Page State** (WeldLogPage)
   - All modal state managed in page component
   - Explicit state setters for each modal
   - Matches DrawingComponentTablePage pattern

2. **Milestone Interception** (UpdateWeldDialog)
   - Copied from DrawingComponentTablePage.tsx:122-135
   - Check if Weld Made + first time → trigger callback
   - Otherwise → normal milestone update

3. **Conditional Rendering** (WeldLogTable)
   - Single component with if (isMobile) branches
   - Matches DrawingTable pattern

4. **Button Logic** (WeldDetailModal)
   - Inline conditional rendering (if/else in JSX)
   - Simple, direct, no abstraction

5. **TanStack Query Auto-Refresh**
   - All mutations invalidate ['field-welds'] query
   - Automatic table refresh after mutations
   - No manual refresh needed

## Next Steps

After plan approval:
1. Execute `/speckit.tasks` to generate task breakdown
2. Execute `/speckit.implement` to implement with TDD
3. Review and merge to main branch

---

**Constitution Version**: 1.0.2 | **Feature Branch**: `022-weld-log-mobile` | **Planning Complete**: 2025-11-02
