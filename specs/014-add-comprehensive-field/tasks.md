# Tasks: Field Weld QC Module

**Input**: Design documents from `/specs/014-add-comprehensive-field/`
**Prerequisites**: plan.md ✅, research.md ✅, spec.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Loaded: Tech stack (React 18, TypeScript 5.6, Supabase), structure (single project)
   → ✅ Loaded: UI Mockups & Design Specifications (7 components with detailed layouts)
2. Load optional design documents:
   → ✅ research.md: 6 key technical decisions extracted
   → ✅ spec.md: 45 functional requirements, 6 acceptance scenarios
   → Note: data-model and contracts described in plan.md (not separate files)
3. Generate tasks by category:
   → Setup: Project structure, dependencies
   → Tests: 6 hook contracts, 6 integration scenarios
   → Database: 3 migrations, RLS policies, triggers
   → Edge Function: CSV import with validation
   → Hooks: 6 TanStack Query hooks
   → UI Components: 10 components with tests (enhanced with UI mockups)
   → Pages: 2 pages (new + modified)
   → Accessibility: WCAG 2.1 AA compliance
   → Responsive: Desktop/Tablet/Mobile layouts
4. Apply task rules:
   → Different files = [P] for parallel
   → Database migrations = sequential
   → Tests before implementation (TDD enforced)
   → UI specs include design tokens and responsive breakpoints
5. Number tasks sequentially (T001-T066)
6. Validate completeness:
   → ✅ All 6 hooks have contract tests
   → ✅ All 6 scenarios have integration tests
   → ✅ All tests before implementation
   → ✅ UI components include detailed specifications
   → ✅ Accessibility and responsive design tasks added
7. Return: SUCCESS (66 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

---

## Phase 3.1: Setup

- [X] **T001** Create directory structure for field welds feature
  **Files**: `src/components/field-welds/`, `src/components/import/`, `src/hooks/`, `tests/contract/field-welds/`, `tests/integration/field-welds/`, `supabase/functions/import-field-welds/`
  **Action**: Create all new directories per plan.md structure

- [X] **T002** Install additional dependencies (if needed)
  **Action**: Verify PapaParse 5.5, React Dropzone 14.3, @tanstack/react-virtual 3.13 already installed (per package.json), no new dependencies needed

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Hook Contract Tests (Parallel - Independent Files)

- [X] **T003 [P]** Contract test for useWelders hook in `tests/contract/field-welds/useWelders.contract.test.ts`
  **Tests**: List welders query, create welder mutation, payload validation, response shape, error handling, cache keys `['welders', {projectId}]`

- [X] **T004 [P]** Contract test for useFieldWeld hook in `tests/contract/field-welds/useFieldWeld.contract.test.ts`
  **Tests**: Get weld by component_id, joined welder info, query enabled logic, cache key `['field-weld', componentId]`

- [X] **T005 [P]** Contract test for useAssignWelder hook in `tests/contract/field-welds/useAssignWelder.contract.test.ts`
  **Tests**: Assign welder mutation, payload `{field_weld_id, welder_id, date_welded}`, marks "Weld Complete" milestone, optimistic update, rollback on error, invalidates `['field-weld']`, `['components']`, `['drawings-with-progress']`

- [X] **T006 [P]** Contract test for useRecordNDE hook in `tests/contract/field-welds/useRecordNDE.contract.test.ts`
  **Tests**: Record NDE mutation, payload `{field_weld_id, nde_type, nde_result, nde_date, nde_notes}`, triggers rejection workflow on FAIL, marks "Accepted" on PASS, invalidates caches

- [X] **T007 [P]** Contract test for useCreateRepairWeld hook in `tests/contract/field-welds/useCreateRepairWeld.contract.test.ts`
  **Tests**: Create repair mutation, payload `{original_field_weld_id, drawing_id, weld_specs}`, auto-starts at 30% (Fit-up complete), links via `original_weld_id`, invalidates caches

- [X] **T008 [P]** Contract test for useImportFieldWelds hook in `tests/contract/field-welds/useImportFieldWelds.contract.test.ts`
  **Tests**: Import mutation, payload `{project_id, csv_file}`, calls edge function, returns `{success_count, error_count, errors: [{row, message}]}`, 5MB file size limit, invalidates `['components']`, `['drawings-with-progress']`, `['welders']`

### Integration Tests (Parallel - Independent Scenarios)

- [X] **T009 [P]** Integration test bulk import welds in `tests/integration/field-welds/field-weld-scenarios.test.tsx`
  **Tests**: Scenario 1 from spec - Upload 2000-weld CSV, creates components, assigns to drawings, creates welders, sets initial progress (Date Welded → 95%, NDE PASS → 100%)

- [X] **T010 [P]** Integration test assign welder workflow in `tests/integration/field-welds/field-weld-scenarios.test.tsx`
  **Tests**: Scenario 2 from spec - Foreman marks "Weld Complete", prompted for welder selection, updates to 95%, records assignment with timestamp

- [X] **T011 [P]** Integration test record passing NDE in `tests/integration/field-welds/field-weld-scenarios.test.tsx`
  **Tests**: Scenario 3 from spec - QC records NDE PASS, marks "Accepted", updates to 100%, status='accepted', updates progress rollup

- [X] **T012 [P]** Integration test record failing NDE and create repair in `tests/integration/field-welds/field-weld-scenarios.test.tsx`
  **Tests**: Scenario 4 from spec - QC records NDE FAIL, original weld → 100% status='rejected', prompts repair creation, new weld starts at 30%

- [X] **T013 [P]** Integration test view weld progress in drawing table in `tests/integration/field-welds/field-weld-scenarios.test.tsx`
  **Tests**: Scenario 5 from spec - Drawing with mixed components, filter to field welds, displays weld columns (Welder, Date Welded, NDE Status), status badges, inline updates

- [X] **T014 [P]** Integration test manage welders in `tests/integration/field-welds/field-weld-scenarios.test.tsx`
  **Tests**: Scenario 6 from spec - View welder page, displays stencil + name, add new welder, immediately available for assignment

---

## Phase 3.3: Database (Sequential - Migrations Must Run In Order)

- [X] **T015** Database migration 00032: Drop field_weld_inspections table in `supabase/migrations/00032_drop_field_weld_inspections.sql`
  **Action**: DROP TABLE field_weld_inspections CASCADE (clean up old schema from migration 00011)

- [X] **T016** Database migration 00033: Create field_welds table with triggers in `supabase/migrations/00033_create_field_welds.sql`
  **Schema**:
  - Table: `field_welds` (18 fields per research.md)
  - Unique constraint: `component_id`
  - Indexes: component_id (unique), project_id, welder_id, original_weld_id, status partial index
  - Trigger: `handle_weld_rejection` (BEFORE UPDATE - NDE FAIL → status='rejected', 100% complete)
  - Trigger: `auto_start_repair_welds` (AFTER INSERT - repair welds → Fit-up complete 30%)
  - Trigger: `update_field_weld_timestamp` (BEFORE UPDATE - auto-update updated_at)
  - RLS policies: SELECT (all team), INSERT/UPDATE (foremen/QC/admins), DELETE (owner/admin only)

- [X] **T017** Database migration 00034: Create field_weld progress template in `supabase/migrations/00034_field_weld_progress_template.sql`
  **Template**: INSERT INTO progress_templates (component_type='field_weld', version=1, workflow_type='discrete', milestones_config='[{"name": "Fit-up", "weight": 30}, {"name": "Weld Complete", "weight": 65}, {"name": "Accepted", "weight": 5}]')

- [X] **T018** Apply migrations to remote database
  **Command**: `npx supabase db push --linked`
  **Verify**: Migrations 00032-00034 applied successfully

- [X] **T019** Regenerate TypeScript types from updated schema
  **Command**: `npx supabase gen types typescript --linked > src/types/database.types.ts`
  **Verify**: `FieldWeld` and `Welder` types available

---

## Phase 3.4: Edge Function (Sequential - Single Function)

- [X] **T020** Edge function: CSV parser in `supabase/functions/import-field-welds/parser.ts`
  **Implementation**: PapaParse integration, header validation, row parsing, handles quoted fields/BOM

- [X] **T021** Edge function: Row validator in `supabase/functions/import-field-welds/validator.ts`
  **Implementation**: Validate required columns (Weld ID, Drawing, Weld Type), valid weld type enum, valid NDE result, drawing exists (normalized lookup), unique weld ID per project

- [X] **T022** Edge function: Transaction processor in `supabase/functions/import-field-welds/transaction.ts`
  **Implementation**: Batch inserts (1000 rows), auto-create welders from stencils, set initial progress (Date Welded → 95%, NDE PASS → 100%), atomic transaction (all-or-nothing)

- [X] **T023** Edge function: Main handler in `supabase/functions/import-field-welds/index.ts`
  **Implementation**: CORS headers, auth check (RLS), call parser → validator → transaction, return `{success_count, error_count, errors}`, 5MB file size limit

- [X] **T024** Edge function: Deno dependencies in `supabase/functions/import-field-welds/import_map.json`
  **Dependencies**: Supabase client, PapaParse for Deno

- [X] **T025 [P]** Edge function tests in `supabase/functions/import-field-welds/index.test.ts`
  **Tests**: Valid CSV succeeds, invalid weld type fails, missing drawing fails, duplicate weld ID fails, NDE result sets progress correctly, auto-creates welders

---

## Phase 3.5: Hooks Implementation (ONLY after contract tests are failing)

- [X] **T026 [P]** Implement useWelders hook in `src/hooks/useWelders.ts`
  **Implementation**: TanStack Query - useQuery for list (key: `['welders', {projectId}]`, stale: 2min), useMutation for create, Supabase client calls, types from database.types.ts

- [X] **T027 [P]** Implement useFieldWeld hook in `src/hooks/useFieldWeld.ts`
  **Implementation**: TanStack Query - useQuery with enabled flag, joins field_welds + welders, computes identityDisplay, cache key `['field-weld', componentId]`

- [X] **T028 [P]** Implement useAssignWelder hook in `src/hooks/useAssignWelder.ts`
  **Implementation**: TanStack Query - useMutation, payload validation (Zod), UPDATE field_welds SET welder_id/date_welded, UPDATE components SET progress_state (mark "Weld Complete"), optimistic update with rollback, invalidates `['field-weld']`, `['components']`, `['drawings-with-progress']`

- [X] **T029 [P]** Implement useRecordNDE hook in `src/hooks/useRecordNDE.ts`
  **Implementation**: TanStack Query - useMutation, payload validation, UPDATE field_welds SET nde_type/result/date/notes, trigger handles rejection (FAIL → 100% + rejected), mark "Accepted" on PASS, invalidates caches, toast notifications

- [X] **T030 [P]** Implement useCreateRepairWeld hook in `src/hooks/useCreateRepairWeld.ts`
  **Implementation**: TanStack Query - useMutation, creates new component (type='field_weld') + field_weld with original_weld_id, trigger auto-starts at 30%, invalidates caches

- [X] **T031 [P]** Implement useImportFieldWelds hook in `src/hooks/useImportFieldWelds.ts`
  **Implementation**: TanStack Query - useMutation, calls edge function `import-field-welds`, 5MB file validation, returns import summary, invalidates `['components']`, `['drawings-with-progress']`, `['welders']`

- [X] **T031a [P]** Add repair chain depth validation to useCreateRepairWeld in `src/hooks/useCreateRepairWeld.ts`
  **Implementation**: Before creating repair weld, traverse original_weld_id chain to depth 10 (see data-model.md §Repair Chain Constraints), throw error if limit exceeded, pass depth counter to CreateRepairWeldDialog for UI display
  **Validation**: Test creates 10 repairs successfully, 11th repair throws "Maximum repair chain depth (10) exceeded"
  **Rationale**: Addresses CHK002 - prevents infinite repair loops and forces engineering review after 10 attempts

---

## Phase 3.6: UI Components (Parallel by Feature Group)

### Welder Management Components

- [X] **T032 [P]** Implement WelderList component in `src/components/welders/WelderList.tsx`
  **Implementation**: Sortable table with columns (Stencil, Name, Status), uses useWelders hook, real-time search filtering, status badges (Verified 🟢, Unverified 🟡), "Add Welder" button in header, click rows to edit
  **Design Tokens**: Verified=`bg-green-100 text-green-800`, Unverified=`bg-yellow-100 text-yellow-800`

- [X] **T033 [P]** Unit test WelderList in `src/components/welders/WelderList.test.tsx`
  **Tests**: Renders sortable welder table, displays stencil + name + status badges, search filters welders, "Add Welder" button opens form, row click opens edit dialog

- [X] **T034 [P]** Implement WelderForm component in `src/components/welders/WelderForm.tsx`
  **Implementation**: Radix Dialog modal with 2 input fields (Stencil validated regex: `[A-Z0-9-]{2,12}`, Name text), inline validation feedback, Cancel/Create buttons, calls useWelders create mutation, toast on success/error
  **Button Styles**: Primary=`bg-blue-600 hover:bg-blue-700 text-white`, Secondary=`bg-gray-200 hover:bg-gray-300 text-gray-900`

- [X] **T035 [P]** Unit test WelderForm in `src/components/welders/WelderForm.test.tsx`
  **Tests**: Form validation (valid/invalid stencil regex), submits valid data, shows inline errors for invalid stencil, closes on success, toast notifications

### Field Weld Dialog Components

- [X] **T036 [P]** Implement WelderAssignDialog component in `src/components/field-welds/WelderAssignDialog.tsx`
  **Implementation**: Radix Dialog modal with 3 sections: (1) Welder searchable dropdown (format: `{stencil} - {name}` with status badge, sorted by stencil), (2) Date Welded picker (format: YYYY-MM-DD, defaults today, required), (3) Info panel "This will mark 'Weld Complete' milestone and update progress to 95%", calls useAssignWelder, toast on success/error
  **Trigger**: Click "Assign Welder" button on field weld row

- [X] **T037 [P]** Unit test WelderAssignDialog in `src/components/field-welds/WelderAssignDialog.test.tsx`
  **Tests**: Opens on button click, lists welders in dropdown with format, date defaults to today, info panel displays, submits assignment, toast notifications

- [X] **T038 [P]** Implement NDEResultDialog component in `src/components/field-welds/NDEResultDialog.tsx`
  **Implementation**: Multi-section Radix Dialog with: (1) Context display (Component ID, Welder name, Date welded - read-only), (2) NDE Type dropdown (RT/UT/PT/MT, required), (3) NDE Result radio buttons (PASS ◉ / FAIL ○ / PENDING ○, required), (4) NDE Date picker (defaults today, required), (5) Notes textarea (optional, multiline, placeholder: "Additional inspection notes..."), conditional warning box on FAIL selection showing rejection workflow steps, calls useRecordNDE, toast on success/error
  **Warning Box**: `⚠️ WARNING: Weld Rejection` with bordered panel explaining FAIL consequences
  **Trigger**: Click "Record NDE" button on field weld row

- [X] **T039 [P]** Unit test NDEResultDialog in `src/components/field-welds/NDEResultDialog.test.tsx`
  **Tests**: Displays context section, NDE type dropdown, result radio buttons (PASS/FAIL/PENDING), shows warning box only when FAIL selected, hides warning when other option selected, submits NDE data with all fields, toast notifications

- [X] **T040 [P]** Implement CreateRepairWeldDialog component in `src/components/field-welds/CreateRepairWeldDialog.tsx`
  **Implementation**: Radix Dialog form pre-filled with original weld specs (all editable): (1) Original Weld Info header (read-only, shows "Repair for Weld {id} - {status}"), (2) Weld Type dropdown (BW/SW/FW/TW), (3) Weld Size text input, (4) Schedule text input, (5) Base Metal text input, (6) Spec text input, (7) Info panel "ℹ️ Repair weld will auto-start at 30% (Fit-up milestone complete)", calls useCreateRepairWeld, returns to drawing table with new repair weld visible, toast on success
  **Trigger**: Automatically opens after recording NDE FAIL result

- [X] **T041 [P]** Unit test CreateRepairWeldDialog in `src/components/field-welds/CreateRepairWeldDialog.test.tsx`
  **Tests**: Auto-opens after NDE FAIL, pre-fills all weld specs from original, all fields editable, info panel displays, creates repair weld with original_weld_id link, toast notifications

- [X] **T042 [P]** Implement RepairHistoryDialog component in `src/components/field-welds/RepairHistoryDialog.tsx`
  **Implementation**: Radix Dialog with timeline-style vertical display showing repair chain: (1) Original Weld section (📍 icon, Weld ID, Type/Size/Spec, Welder stencil + name, Date Welded, NDE result + notes, Status badge), (2) Arrow separator (↓), (3) Repair sections (🔧 icon, same fields), (4) Summary footer (Total Attempts: {count}, Final Status: ✅/🔴), uses recursive query via `original_weld_id` to traverse chain
  **Trigger**: Click "View Repair History" link on any weld with repairs

- [X] **T043 [P]** Unit test RepairHistoryDialog in `src/components/field-welds/RepairHistoryDialog.test.tsx`
  **Tests**: Shows timeline layout, displays original weld with all fields, shows arrow separators, displays all repairs in order, summary footer with correct counts, final status badge correct

### Field Weld Row Component

- [X] **T044 [P]** Implement FieldWeldRow component in `src/components/field-welds/FieldWeldRow.tsx`
  **Implementation**: Nested row within drawing accordion displaying: (1) Weld ID, (2) Type (BW/SW/FW/TW with size), (3) Welder stencil, (4) Date Welded, (5) NDE Status (RT PASS/FAIL/PENDING), (6) Status Badge (🟢 Active=`bg-blue-100 text-blue-800`, 🟢 Accepted=`bg-green-100 text-green-800`, 🔴 Rejected=`bg-red-100 text-red-800` + grayed out), (7) Progress bar (95% ▓▓▓), (8) Milestones on expanded row (• Fit-up ☑ • Weld Complete ☑ • Accepted ☐), (9) Action buttons [👷 Assign Welder] [🔬 Record NDE] (only visible on active welds), (10) "🔗 View Repair History" link (for repair welds or welds with repairs)
  **Progressive Disclosure**: Milestones shown on expanded row, action buttons hidden on rejected/accepted welds

- [X] **T045 [P]** Unit test FieldWeldRow in `src/components/field-welds/FieldWeldRow.test.tsx`
  **Tests**: Renders all weld columns, displays welder info correctly, NDE status with correct formatting, status badges with correct colors, progress bar shows percentage, milestones visible when expanded, action buttons visible only on active welds, repair history link shows for repairs, grayed out styling for rejected welds

### CSV Import Components

- [X] **T046 [P]** Implement FieldWeldImportPage component in `src/components/import/FieldWeldImportPage.tsx`
  **Implementation**: Two-section page layout: (1) Upload Section - large React Dropzone drag-and-drop area ("📁 Drag & Drop CSV File Here or click to browse", file size indicator "Maximum file size: 5MB", .csv only validation), collapsible Help Panel (required columns, optional columns, "📥 Download Sample CSV" link), progress indicator during upload (file name/size, progress bar with percentage, "Processing rows... 1,300 / 2,000 welds imported", Cancel button), (2) Recent Imports Table (Date/Time, Filename, Count, Status with badges ✅/⚠️/❌, clickable rows), uses useImportFieldWelds hook, shows FieldWeldImportProgress during import, opens FieldWeldErrorReport modal on completion

- [X] **T047 [P]** Implement FieldWeldImportProgress in `src/components/import/FieldWeldImportProgress.tsx`
  **Implementation**: Progress overlay with spinner, animated progress bar, file name and size display, real-time row count updates ("Processing rows... X / Y welds imported"), displays success/error counts as they accumulate

- [X] **T048 [P]** Implement FieldWeldErrorReport in `src/components/import/FieldWeldErrorReport.tsx`
  **Implementation**: Results modal with sections: (1) Summary header (✅ Import Complete, File name, Total Rows, ✅ Successfully Imported: X welds, ⚠️ Errors: Y rows), (2) Error table (bordered, columns: Row | Error, shows specific error messages like "Missing required: Type", "Invalid weld type: XW", "Drawing not found: P-999"), (3) Action buttons ([📥 Download Error Report] [Close]), CSV export functionality for error report with same format as import

---

## Phase 3.7: Page Integration (Sequential - Modifies Existing)

- [X] **T049** Create WeldersPage in `src/pages/WeldersPage.tsx`
  **Implementation**: Full-page layout with Layout wrapper, page title "Welder Management", renders WelderList component, permission-gated (can_manage_team role check), breadcrumb trail "Welders", responsive design (desktop: full table, tablet: condensed with scroll, mobile: card-based layout)
  **Responsive**: Desktop (>1024px) full table, Tablet (768px-1024px) condensed with overflow scroll, Mobile (<768px) card-based layout

- [X] **T050** Modify DrawingComponentTablePage to support field weld filtering in `src/pages/DrawingComponentTablePage.tsx`
  **Changes**: Add "Field Weld" option to component type filter dropdown, conditional render FieldWeldRow when `component.type === 'field_weld'`, ensure filters apply to field welds, responsive milestone columns (desktop: all milestones, tablet: 3 + More, mobile: hidden per Feature 010 pattern)

- [X] **T051** Add /welders route to App.tsx
  **Changes**: Import WeldersPage, add route `<Route path="/welders" element={<ProtectedRoute><WeldersPage /></ProtectedRoute>} />`, add "Welders" nav item in Layout/Sidebar (icon: user-check, label: "Welders", permission: can_manage_team)

---

## Phase 3.8: Utility Functions

- [X] **T052 [P]** Implement field weld utility functions in `src/lib/field-weld-utils.ts`
  **Functions**: `formatWeldType(type: string): string` (BW → "Butt Weld"), `formatNDEType(type: string): string` (RT → "Radiographic"), `isRepair(weld: FieldWeld): boolean`, `getStatusBadgeColor(status: string): string`

---

## Phase 3.9: Accessibility & Responsive Design

- [ ] **T053 [P]** Implement accessibility features for all dialogs
  **Implementation**: Ensure all dialogs have: (1) Keyboard navigation (Tab, Enter, Escape), (2) Focus indicators on all inputs, (3) ARIA labels on icons and buttons, (4) Color contrast ratios ≥4.5:1, (5) Screen reader announcements for status changes, (6) Error messages associated with inputs via `aria-describedby`
  **Components**: WelderAssignDialog, NDEResultDialog, CreateRepairWeldDialog, RepairHistoryDialog, WelderForm
  **Target**: WCAG 2.1 AA compliance

- [ ] **T054 [P]** Implement responsive design for all components
  **Implementation**: Desktop (>1024px): full table layout with all columns visible, side-by-side dialogs. Tablet (768px-1024px): condensed table with overflow scroll, critical columns pinned left, dialogs remain full-width modals. Mobile (<768px): card-based layout for welds, stacked form fields in dialogs, bottom sheet style for actions
  **Components**: FieldWeldRow, WelderList, FieldWeldImportPage, all dialogs

- [ ] **T055 [P]** Add keyboard shortcuts documentation and implementation
  **Implementation**: Tab (move between fields), Enter/Space (activate buttons, toggle checkboxes), Escape (close dialogs), Arrow keys (navigate dropdowns), document shortcuts in Help Panel
  **Accessibility**: Test with keyboard-only navigation, ensure all interactive elements reachable

---

## Phase 3.11: Weld Log Feature

- [X] **T067 [P]** Implement useFieldWelds hook in `src/hooks/useFieldWelds.ts`
  **Implementation**: TanStack Query - useQuery with key `['field-welds', {projectId}]`, fetches all field_welds joined with components, welders, drawings, includes progress_state and percent_complete, returns enriched array sorted by date_welded desc, stale time 2 minutes

- [X] **T068 [P]** Unit test useFieldWelds in `src/hooks/useFieldWelds.test.ts`
  **Tests**: Query returns all field welds for project, includes joined data (welder name/stencil, drawing number), correct sort order (date_welded desc), cache invalidation on mutations, handles empty results

- [X] **T069 [P]** Implement WeldLogFilters component in `src/components/weld-log/WeldLogFilters.tsx`
  **Implementation**: Filter controls using Radix Select + Input primitives: (1) Search box with debounce 300ms, (2) Drawing dropdown (autocomplete), (3) Welder dropdown, (4) Status dropdown (All/Active/Accepted/Rejected), (5) Package dropdown, (6) System dropdown, (7) Clear filters button, (8) Results count display ("Showing X of Y welds"), URL state management via useSearchParams, all filters apply with AND logic

- [ ] **T070 [P]** Unit test WeldLogFilters in `src/components/weld-log/WeldLogFilters.test.tsx`
  **Tests**: All filter controls render correctly, search debounce works (300ms delay), clear filters resets all dropdowns to default, URL params update on filter change, results count displays correct values, filters combine with AND logic

- [X] **T071 [P]** Implement WeldLogTable component in `src/components/weld-log/WeldLogTable.tsx`
  **Implementation**: Flat table with 10 columns: (1) Weld ID from identity_key, (2) Drawing Number (clickable link), (3) Welder Stencil + Name, (4) Date Welded (formatted), (5) Weld Type (BW/SW/FW/TW), (6) Size, (7) NDE Type + Result with color coding (PASS=green, FAIL=red, PENDING=yellow), (8) Status Badge (Active=blue, Accepted=green, Rejected=red), (9) Progress %, (10) Actions column with buttons. Sortable columns (click header toggles asc/desc with arrow indicator), default sort by date_welded desc. Inline action buttons: "Assign Welder" (visible to foremen/PMs, active welds only), "Record NDE" (visible to QC inspectors, welds with assigned welders only). Opens existing dialogs: WelderAssignDialog, NDEResultDialog, CreateRepairWeldDialog, RepairHistoryDialog. Uses useFieldWelds hook, applies filters from WeldLogFilters. Shows empty state when no welds match filters.

- [ ] **T072 [P]** Unit test WeldLogTable in `src/components/weld-log/WeldLogTable.test.tsx`
  **Tests**: Renders all 10 columns correctly, sorts on column click (toggles asc/desc), action buttons visible based on weld status and user role, opens correct dialog on button click (Assign Welder, Record NDE), filters applied correctly from WeldLogFilters, empty state displays when no matches, loading state shows skeleton

- [X] **T073** Create WeldLogPage in `src/pages/WeldLogPage.tsx`
  **Implementation**: Full-page layout with Layout wrapper, page title "Weld Log", subtitle "QC tracking for all project field welds", renders WeldLogFilters above WeldLogTable, permission-gated (all team members can view), breadcrumb trail "Weld Log", responsive design (desktop: full table with all columns, tablet: horizontal scroll with pinned Weld ID and Drawing columns, mobile: card-based layout stacked vertically)

- [X] **T074** Add /weld-log route to App.tsx
  **Changes**: Import WeldLogPage, add route `<Route path="/weld-log" element={<ProtectedRoute><WeldLogPage /></ProtectedRoute>} />`, position after /welders route and before /imports route

- [X] **T075** Add "Weld Log" nav item to Layout
  **Changes**: Add navigation item in Layout.tsx sidebar/nav: icon=clipboard-check (lucide-react), label="Weld Log", route="/weld-log", position after "Welders" and before "Imports", visible to all team members (no permission gate), active state styling

---

## Phase 3.12: Polish & Validation (formerly Phase 3.10)

- [ ] **T076** Run all tests and verify they pass
  **Command**: `npm test`
  **Verify**: All test files passing (6 contract + 6 integration + component tests + weld log tests)

- [ ] **T077** Run TypeScript type checking
  **Command**: `tsc -b`
  **Verify**: No type errors, strict mode compliance

- [ ] **T078** Run linting
  **Command**: `npm run lint`
  **Verify**: No ESLint errors

- [ ] **T079** Verify RLS policies on field_welds table
  **Test**: Try to access another organization's welds (should fail), verify foreman can create, QC can update NDE, viewer can only read

- [ ] **T080** Manual testing: Import sample CSV
  **Action**: Upload WELD LOG.csv (from repo root), verify 2000+ welds imported, check progress percentages, verify welders auto-created

- [ ] **T081** Manual testing: Assign welder workflow
  **Action**: Mark "Weld Complete" milestone, assign welder, verify updates to 95%, verify welder/date recorded

- [ ] **T082** Manual testing: Record NDE failure and create repair
  **Action**: Record NDE FAIL, verify original → 100% rejected, create repair, verify repair starts at 30%

- [ ] **T083** Manual testing: Weld Log page
  **Action**: Navigate to /weld-log, verify all 12 field welds display, test filters (drawing, welder, status), test search, test sort by clicking columns, verify inline actions work (Assign Welder, Record NDE)

- [ ] **T084** Performance validation: CSV import time
  **Test**: Import 2000-weld CSV, measure time, verify <30s target

- [ ] **T085** Accessibility validation: Keyboard navigation test
  **Test**: Navigate entire field weld workflow using keyboard only (no mouse), verify all features accessible including Weld Log page, test with screen reader

- [ ] **T086** Responsive design validation: Test on multiple devices
  **Test**: Desktop (Chrome/Firefox/Safari), Tablet (iPad), verify layouts adapt correctly including Weld Log table, test touch interactions on tablet

- [ ] **T087** Update CLAUDE.md with field weld feature context
  **Action**: Run `.specify/scripts/bash/update-agent-context.sh claude` to add field weld module documentation including Weld Log page

---

## Dependencies

```
Setup (T001-T002)
  ↓
Contract Tests (T003-T008) [P] ← MUST COMPLETE BEFORE T026-T031
  ↓
Integration Tests (T009-T014) [P] ← MUST COMPLETE BEFORE T032-T051
  ↓
Database (T015-T019) ← Sequential, must complete before hooks
  ↓
Edge Function (T020-T025) ← Sequential, T025 parallel with hooks
  ↓
Hooks (T026-T031) [P] ← ONLY after contract tests failing
  ↓
UI Components (T032-T048) [P] ← ONLY after integration tests failing, grouped by feature
  ↓
Pages (T049-T051) ← Sequential, modifies shared files
  ↓
Utils (T052) [P] ← Can run anytime after hooks
  ↓
Accessibility & Responsive (T053-T055) [P] ← After UI components complete
  ↓
Weld Log Feature (T067-T075) ← Sequential, depends on useFieldWelds hook
  ↓
Polish & Validation (T076-T087) ← Sequential validation
```

**Key Blocking Points**:
- T015-T019 blocks T026-T031 (hooks need database schema)
- T020-T023 blocks T024-T025 (edge function tests need implementation)
- T026-T031 blocks T032-T048 (components need hooks)
- T032-T048 blocks T049-T051 (pages need components)
- T049-T051 blocks T053-T055 (accessibility/responsive after pages complete)
- T026 (useFieldWelds) blocks T067-T075 (weld log needs field welds hook)
- T053-T055 blocks T067-T075 (weld log after accessibility/responsive)
- T067-T075 blocks T076-T087 (validation after all implementation including weld log)

---

## Parallel Execution Examples

### Example 1: Contract Tests (Phase 3.2)
```bash
# Launch T003-T008 together (6 independent test files):
Task: "Contract test useWelders in tests/contract/field-welds/useWelders.contract.test.ts"
Task: "Contract test useFieldWeld in tests/contract/field-welds/useFieldWeld.contract.test.ts"
Task: "Contract test useAssignWelder in tests/contract/field-welds/useAssignWelder.contract.test.ts"
Task: "Contract test useRecordNDE in tests/contract/field-welds/useRecordNDE.contract.test.ts"
Task: "Contract test useCreateRepairWeld in tests/contract/field-welds/useCreateRepairWeld.contract.test.ts"
Task: "Contract test useImportFieldWelds in tests/contract/field-welds/useImportFieldWelds.contract.test.ts"
```

### Example 2: Integration Tests (Phase 3.2)
```bash
# Launch T009-T014 together (6 independent scenario tests):
Task: "Integration test bulk import in tests/integration/field-welds/bulk-import.test.tsx"
Task: "Integration test assign welder in tests/integration/field-welds/assign-welder.test.tsx"
Task: "Integration test NDE pass in tests/integration/field-welds/record-nde-pass.test.tsx"
Task: "Integration test NDE fail + repair in tests/integration/field-welds/record-nde-fail-repair.test.tsx"
Task: "Integration test view progress in tests/integration/field-welds/view-weld-progress.test.tsx"
Task: "Integration test manage welders in tests/integration/field-welds/manage-welders.test.tsx"
```

### Example 3: Hooks Implementation (Phase 3.5)
```bash
# Launch T026-T031 together (6 independent hook files):
Task: "Implement useWelders in src/hooks/useWelders.ts"
Task: "Implement useFieldWeld in src/hooks/useFieldWeld.ts"
Task: "Implement useAssignWelder in src/hooks/useAssignWelder.ts"
Task: "Implement useRecordNDE in src/hooks/useRecordNDE.ts"
Task: "Implement useCreateRepairWeld in src/hooks/useCreateRepairWeld.ts"
Task: "Implement useImportFieldWelds in src/hooks/useImportFieldWelds.ts"
```

### Example 4: Dialog Components (Phase 3.6)
```bash
# Launch T036-T043 together (4 independent component groups):
Task: "Implement WelderAssignDialog in src/components/field-welds/WelderAssignDialog.tsx and test"
Task: "Implement NDEResultDialog in src/components/field-welds/NDEResultDialog.tsx and test"
Task: "Implement CreateRepairWeldDialog in src/components/field-welds/CreateRepairWeldDialog.tsx and test"
Task: "Implement RepairHistoryDialog in src/components/field-welds/RepairHistoryDialog.tsx and test"
```

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **TDD enforcement**: All T003-T014 tests must be written and failing before any implementation (T026-T051)
- **Database first**: Migrations (T015-T019) must complete before hooks (T026-T031)
- **Commit strategy**: Commit after each task completion
- **Type safety**: TypeScript strict mode enforced, verify with `tsc -b` after each phase
- **Constitution compliance**: RLS policies required, TanStack Query wraps all Supabase calls, tests before implementation

---

## Validation Checklist

**GATE: Checked before marking tasks complete**

- [x] All 6 hook contracts have corresponding tests (T003-T008)
- [x] All 6 acceptance scenarios have integration tests (T009-T014)
- [x] All tests come before implementation (T003-T014 before T026-T051)
- [x] Parallel tasks truly independent (verified file paths)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task (verified)
- [x] Database migrations sequential (T015-T019)
- [x] Constitution principles enforced (RLS, TanStack Query, TDD, TypeScript strict)

---

**Total Tasks**: 87 (includes Weld Log feature - 9 additional tasks + 12 renumbered validation tasks)
**Estimated Duration**: 10-14 developer days (with parallel execution)
**Parallelizable**: 39 tasks marked [P] (59%)
**UI Enhanced**: Added comprehensive UI mockup specifications from plan.md including:
  - Detailed dialog layouts with all fields and validation
  - Status badge colors and design tokens
  - Progressive disclosure patterns
  - Responsive design breakpoints (desktop/tablet/mobile)
  - WCAG 2.1 AA accessibility requirements
  - Keyboard navigation specifications
