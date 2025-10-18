# Quickstart: Component Tracking & Lifecycle Management

**Feature**: 007-component-tracking-lifecycle
**Date**: 2025-10-16
**Purpose**: Manual test workflow to validate all 27 acceptance scenarios

---

## Prerequisites

Before starting this quickstart, ensure:

- ✅ Supabase running (`supabase start`)
- ✅ App running (`npm run dev` at http://localhost:5173)
- ✅ Test user with **admin role** logged in
- ✅ Test project loaded (from Sprint 1 seed data or create manually)
- ✅ Test components imported (via Feature 008 or manual seed data - at least 100 components for filtering tests)
- ✅ Test foreman user with **can_update_milestones** permission

---

## Part 1: Admin Setup (Project Controls)

### 1. Create Area

**Goal**: Validate FR-001, FR-003 (area creation with unique constraint)

**Steps**:
1. Navigate to `/project-setup` page
2. Click **"Add Area"** button
3. Fill form:
   - Name: `Area 100`
   - Description: `Process equipment zone`
4. Click **"Create Area"**
5. ✅ **Expected**: Area appears in area list
6. Try creating duplicate:
   - Name: `Area 100` (same name)
   - Description: `Duplicate test`
7. Click **"Create Area"**
8. ✅ **Expected**: Validation error "Area name must be unique"

**Acceptance Scenario**: #1, #2

---

### 2. Create System

**Goal**: Validate FR-002, FR-004 (system creation with unique constraint)

**Steps**:
1. Still on `/project-setup` page
2. Click **"Add System"** button
3. Fill form:
   - Name: `HVAC-01`
   - Description: `Heating, ventilation, and air conditioning`
4. Click **"Create System"**
5. ✅ **Expected**: System appears in system list
6. Try creating duplicate:
   - Name: `HVAC-01` (same name)
7. ✅ **Expected**: Validation error "System name must be unique"

**Acceptance Scenario**: #3

---

### 3. Edit Area Name

**Goal**: Validate FR-005 (edit area/system)

**Steps**:
1. Find "Area 100" in area list
2. Click **"Edit"** button
3. Change name to: `Area 100A`
4. Click **"Update Area"**
5. ✅ **Expected**: Area name updates, components assigned to this area reflect the new name

**Acceptance Scenario**: #5

---

### 4. Create Test Package

**Goal**: Validate FR-008, FR-010 (test package creation)

**Steps**:
1. Click **"Add Test Package"** button
2. Fill form:
   - Name: `TP-2025-001`
   - Description: `Q4 2025 HVAC system test`
   - Target Date: `2025-12-15`
3. Click **"Create Test Package"**
4. ✅ **Expected**: Test package appears in package list

**Acceptance Scenario**: #6

---

## Part 2: Component Assignment (Admin)

### 5. Filter Unassigned Components

**Goal**: Validate FR-021 (component filtering)

**Steps**:
1. Navigate to `/components` page
2. Apply filter: **Area = "Unassigned"**
3. ✅ **Expected**: Only components with `area_id = NULL` shown
4. Note: You should see many unassigned components (from import)

**Acceptance Scenario**: Prerequisite for #8

---

### 6. Bulk Assign Components

**Goal**: Validate FR-012 (component assignment)

**Steps**:
1. Select 10 components using checkboxes
2. Click **"Assign"** button
3. In assignment dialog:
   - Area: `Area 100A`
   - System: `HVAC-01`
   - Test Package: (leave blank)
4. Click **"Assign Components"**
5. ✅ **Expected**:
   - Success message "10 components assigned"
   - Components now show Area 100A and HVAC-01 in list
   - Filter updates (components disappear from "Unassigned" filter)

**Acceptance Scenario**: #8

---

### 7. Reassign Component

**Goal**: Validate FR-012 (reassignment)

**Steps**:
1. Find one component assigned to Area 100A
2. Click component row → detail view opens
3. Click **"Reassign"** button (or edit button)
4. Change area to: `Area 200` (create Area 200 first if needed)
5. Click **"Update Assignment"**
6. ✅ **Expected**: Component now shows Area 200, filtering reflects change

**Acceptance Scenario**: #9

---

## Part 3: Foreman Workflow (Milestone Tracking)

**Switch User**: Log out admin, log in as **foreman** with `can_update_milestones` permission

### 8. Filter Components by Area

**Goal**: Validate FR-021 (filtering)

**Steps**:
1. Navigate to `/components` page
2. Apply filter: **Area = "Area 100A"**
3. ✅ **Expected**: Only components in Area 100A shown (should be 9 components from step 6, minus 1 reassigned)

**Acceptance Scenario**: #13

---

### 9. Filter by Type and Progress

**Goal**: Validate FR-021 (multi-filter)

**Steps**:
1. Clear previous filter
2. Apply filters:
   - **Type = "Spool"**
   - **Progress Min = 50%**
   - **Progress Max = 100%**
3. ✅ **Expected**: Only spools with 50-100% complete shown

**Acceptance Scenario**: #14

---

### 10. Search by Identity

**Goal**: Validate FR-022 (search)

**Steps**:
1. Clear filters
2. In search box, type: `SP-001`
3. ✅ **Expected**: Component with identity containing "SP-001" displayed (partial match, case-insensitive)

**Acceptance Scenario**: #15

---

### 11. Update Discrete Milestone

**Goal**: Validate FR-025, FR-026, FR-030 (discrete milestone tracking)

**Steps**:
1. Click on a **Spool** component (e.g., "SP-001") → detail view opens
2. ✅ **Expected**: Milestones shown:
   - ☐ Receive (5%)
   - ☐ Erect (40%)
   - ☐ Connect (40%)
   - ☐ Punch (5%)
   - ☐ Test (5%)
   - ☐ Restore (5%)
   - Progress: **0%**
3. Click **"Receive"** checkbox
4. ✅ **Expected**:
   - Checkbox toggles to checked ☑
   - Progress updates to **5%**
   - Milestone event logged (visible in event history)
   - Last Updated timestamp updates
5. Click **"Erect"** checkbox
6. ✅ **Expected**:
   - Progress updates to **45%** (5% + 40%)

**Acceptance Scenarios**: #17, #18

---

### 12. Rollback Milestone

**Goal**: Validate FR-032 (rollback)

**Steps**:
1. Still on same component detail view (45% complete)
2. Click **"Receive"** checkbox again (un-check)
3. ✅ **Expected**:
   - Checkbox toggles to unchecked ☐
   - Progress updates to **40%** (45% - 5%)
   - Milestone event logged with action "rollback"

**Acceptance Scenario**: #19

---

### 13. Hybrid Workflow (Partial %)

**Goal**: Validate FR-027, FR-028 (partial % milestones)

**Steps**:
1. Navigate back to component list
2. Find a **Threaded Pipe** component
3. Click component → detail view opens
4. ✅ **Expected**: "Fabricate" milestone shows **slider** (not checkbox)
5. Drag slider to **85%**
6. ✅ **Expected**:
   - Progress updates to **13.6%** (16% weight × 0.85 = 13.6%)
   - Event logged with value `85`

**Acceptance Scenario**: #21

---

### 14. Field Weld with Welder Stencil

**Goal**: Validate FR-030 metadata (welder stencil for Weld Made)

**Steps**:
1. Navigate to **Field Weld** component
2. Click component → detail view opens
3. Find **"Weld Made"** milestone (60% weight)
4. Click checkbox to complete
5. ✅ **Expected**: Dialog/input prompts for **welder stencil**
6. Enter stencil: `JD42`
7. Click **"Complete Milestone"**
8. ✅ **Expected**:
   - Progress updates to **60%**
   - Event logged with `metadata: { welder_stencil: 'JD42' }`

**Acceptance Scenario**: #20

---

### 15. Out-of-Sequence Completion

**Goal**: Validate FR-033 (out-of-sequence allowed)

**Steps**:
1. Navigate to a **Spool** component with **0% complete**
2. Click **"Test"** milestone (without completing Receive, Erect, Connect first)
3. ✅ **Expected**:
   - Milestone toggles to complete
   - Progress updates to **5%** (Test weight only)
   - Event logged with timestamp (audit trail preserved, no blocking)

**Acceptance Scenario**: #22

---

## Part 4: Permissions Test

### 16. Viewer Role (No Permissions)

**Goal**: Validate FR-043, FR-044 (permission enforcement)

**Steps**:
1. Log out foreman
2. Log in as **viewer** role (no `can_update_milestones` permission)
3. Navigate to `/components`
4. Click on any component → detail view opens
5. ✅ **Expected**:
   - Milestone buttons are **disabled** (grayed out)
   - No checkbox/slider interaction possible
   - Components are **read-only**

**Acceptance Scenarios**: #25, #26

---

### 17. Admin Setup Access

**Goal**: Validate FR-045 (admin-only setup)

**Steps**:
1. Still logged in as viewer
2. Navigate to `/project-setup`
3. ✅ **Expected**:
   - Access denied message OR
   - Forms are hidden/disabled
   - Cannot create areas, systems, or test packages
4. Log out, log in as **admin** or **project_manager**
5. Navigate to `/project-setup`
6. ✅ **Expected**:
   - Forms are visible and enabled
   - Can create/edit/delete areas, systems, packages

**Acceptance Scenario**: #27

---

## Part 5: Drawing Retirement (Admin)

**Switch User**: Log in as **admin**

### 18. Retire Drawing

**Goal**: Validate FR-015, FR-016, FR-017 (drawing retirement)

**Steps**:
1. Navigate to `/drawings` page
2. Find drawing **"P-001-Rev-A"** (or any test drawing)
3. Click **"Retire"** button
4. In dialog:
   - Retire Reason: `Superseded by Rev-B, issued 2025-10-16`
5. Click **"Retire Drawing"**
6. ✅ **Expected**:
   - Drawing marked `is_retired = true`
   - Drawing visually indicated (grayed out, "RETIRED" badge)
   - Components assigned to this drawing **retain** drawing reference

**Acceptance Scenarios**: #10

---

### 19. Retired Drawing Visibility

**Goal**: Validate FR-017 (retired drawing filtering)

**Steps**:
1. Still on `/drawings` page
2. ✅ **Expected**: Retired drawing is:
   - Filtered out by default (hidden) OR
   - Shown with "RETIRED" visual indicator
3. Toggle filter: **Show Retired Drawings**
4. ✅ **Expected**: Retired drawing "P-001-Rev-A" now visible in list

**Acceptance Scenario**: #11

---

## Part 6: Delete with Component Warning

### 20. Delete Area with Components

**Goal**: Validate FR-006, FR-007 (delete warning, component unassignment)

**Steps**:
1. Navigate to `/project-setup`
2. Find "Area 100A" (which has components assigned)
3. Click **"Delete"** button
4. ✅ **Expected**: Warning dialog:
   - "This area has 9 components assigned. Deleting will unassign them (area_id → NULL). Continue?"
5. Click **"Delete Area"**
6. ✅ **Expected**:
   - Area deleted
   - Components previously in Area 100A now show **"Unassigned"** in area column
   - Components NOT deleted (soft unassign only)

**Acceptance Scenario**: #4, edge case

---

## Part 7: Performance Validation

### 21. Large List Performance

**Goal**: Validate NFR-001, NFR-005, NFR-002 (performance requirements)

**Prerequisites**: Ensure test project has **10,000 components** (use seed script or Feature 008 import)

**Steps**:
1. Navigate to `/components` page
2. Start timer (or use browser DevTools Performance tab)
3. ✅ **Expected**: Page loads **<2 seconds** (NFR-001)
   - Check: virtualization renders only visible rows (~15-20 rows)
4. Apply filter: **Area = "Area 100"**
5. ✅ **Expected**: Results return **<500ms** (NFR-005)
6. Click on a component → detail view opens
7. Toggle a milestone checkbox
8. ✅ **Expected**: Visual feedback **<200ms** (NFR-002)
   - Checkbox toggles immediately
   - Progress % updates without delay

**Performance Metrics**:
- Page load: <2s ✅
- Filter response: <500ms ✅
- Milestone toggle: <200ms ✅

---

## Part 8: Edge Cases

### 22. Empty Filter Results

**Goal**: Validate edge case (no matches)

**Steps**:
1. Navigate to `/components`
2. Apply filter: **Area = "NonExistentArea"**
3. ✅ **Expected**:
   - "No components found" message displayed
   - Option to **"Clear Filters"** shown
4. Click **"Clear Filters"**
5. ✅ **Expected**: All components shown again

---

### 23. Concurrent Milestone Updates

**Goal**: Validate NFR-004 (concurrent updates)

**Steps**:
1. Open component "SP-001" in **2 browser tabs** (same foreman user)
2. In **Tab 1**: Click "Receive" milestone → 5% complete
3. In **Tab 2**: Immediately click "Erect" milestone
4. ✅ **Expected**:
   - Both milestones complete (database transactions handle concurrency)
   - Progress updates to **45%** (5% + 40%)
   - Both milestone events logged with user_id and timestamp
   - Last write wins (audit trail preserves both)

---

## Success Criteria Checklist

After completing all steps, verify:

- ✅ All 27 acceptance scenarios pass
- ✅ All 7 performance NFRs met (<2s load, <500ms filter, <200ms toggle, <100ms calculation)
- ✅ Permissions enforce correctly (viewer read-only, admin setup access)
- ✅ No console errors during any workflow
- ✅ Components correctly assigned/unassigned
- ✅ Milestones toggle with real-time % updates
- ✅ Drawings retire without deleting components
- ✅ Virtualization handles 10k+ components smoothly

---

## Troubleshooting

**Issue**: Component list doesn't load
- **Fix**: Check Supabase connection, verify RLS policies, check browser console for errors

**Issue**: Milestone toggle doesn't update percent
- **Fix**: Verify `calculate_component_percent` trigger exists (`supabase/migrations/00010_component_tracking.sql`)

**Issue**: Permission errors
- **Fix**: Check user role in `user_organizations` table, verify `can_update_milestones` permission

**Issue**: Slow performance (>2s load)
- **Fix**: Ensure virtualization is enabled, check for unnecessary re-renders, verify database indexes

---

## Next Steps

After quickstart validation:
1. Run automated tests: `npm test`
2. Check test coverage: `npm test -- --coverage` (≥70% overall)
3. Performance benchmark: Use Lighthouse or WebPageTest
4. Proceed to production deployment (Vercel)

**Feature 007 Complete** ✅
