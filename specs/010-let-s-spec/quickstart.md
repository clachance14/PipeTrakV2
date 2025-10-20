# Quickstart: Drawing-Centered Component Table

**Feature**: Unified drawing/component table with inline milestone updates
**Purpose**: Validate implementation against spec acceptance scenarios
**Estimated Time**: 15 minutes

---

## Prerequisites

Before running this quickstart, ensure:
- ✅ Local Supabase instance running (`supabase start`)
- ✅ Test database seeded with sample data
- ✅ Development server running (`npm run dev`)
- ✅ Logged in as user with `can_update_milestones` permission

---

## Test Data Setup

### 1. Seed Test Project

```sql
-- Run in Supabase SQL editor or via psql
INSERT INTO projects (id, name, organization_id)
VALUES ('test-project-uuid', 'Test Project', 'test-org-uuid');

-- Create 3 test drawings
INSERT INTO drawings (id, project_id, drawing_no_norm, drawing_no_raw, title)
VALUES
  ('drawing-1-uuid', 'test-project-uuid', 'P-001', 'P-001', 'Main Process Line'),
  ('drawing-2-uuid', 'test-project-uuid', 'P-002', 'P-002', 'Drain Line'),
  ('drawing-3-uuid', 'test-project-uuid', 'P-003', 'P-003', 'Vent Header');

-- Create components for P-001 (mixed types)
INSERT INTO components (id, project_id, drawing_id, component_type, identity_key, current_milestones, percent_complete, progress_template_id)
VALUES
  -- Valve (discrete workflow, 5 milestones)
  ('comp-1-uuid', 'test-project-uuid', 'drawing-1-uuid', 'valve',
   '{"drawing_norm": "P-001", "commodity_code": "VBALU-001", "size": "2", "seq": 1}'::jsonb,
   '{"Receive": false, "Install": false, "Punch": false, "Test": false, "Restore": false}'::jsonb,
   0.00,
   (SELECT id FROM progress_templates WHERE component_type = 'valve' LIMIT 1)),

  -- Fitting (discrete workflow, 5 milestones)
  ('comp-2-uuid', 'test-project-uuid', 'drawing-1-uuid', 'fitting',
   '{"drawing_norm": "P-001", "commodity_code": "EL90-150", "size": "2", "seq": 1}'::jsonb,
   '{"Receive": true, "Install": false, "Punch": false, "Test": false, "Restore": false}'::jsonb,
   10.00,
   (SELECT id FROM progress_templates WHERE component_type = 'fitting' LIMIT 1)),

  -- Threaded Pipe (hybrid workflow, 8 milestones)
  ('comp-3-uuid', 'test-project-uuid', 'drawing-1-uuid', 'threaded_pipe',
   '{"drawing_norm": "P-001", "commodity_code": "PIPE-SCH40", "size": "1", "seq": 1}'::jsonb,
   '{"Receive": true, "Fabricate": 50, "Install": 0, "Erect": 0, "Connect": 0, "Support": 0, "Punch": false, "Test": false, "Restore": false}'::jsonb,
   15.00,
   (SELECT id FROM progress_templates WHERE component_type = 'threaded_pipe' LIMIT 1));

-- Create components for P-002 (all complete)
INSERT INTO components (id, project_id, drawing_id, component_type, identity_key, current_milestones, percent_complete, progress_template_id)
VALUES
  ('comp-4-uuid', 'test-project-uuid', 'drawing-2-uuid', 'valve',
   '{"drawing_norm": "P-002", "commodity_code": "VBALU-002", "size": "1", "seq": 1}'::jsonb,
   '{"Receive": true, "Install": true, "Punch": true, "Test": true, "Restore": true}'::jsonb,
   100.00,
   (SELECT id FROM progress_templates WHERE component_type = 'valve' LIMIT 1));

-- Create components for P-003 (empty drawing - edge case)
-- No components for P-003

-- Refresh materialized view
REFRESH MATERIALIZED VIEW mv_drawing_progress;
```

**Expected Test Data**:
- Drawing P-001: 3 components, 8.33% average (0% + 10% + 15% / 3)
- Drawing P-002: 1 component, 100% average
- Drawing P-003: 0 components, NULL average

---

## Scenario 1: View Drawing Progress Summary

**Goal**: Verify FR-001 through FR-006 (Display Requirements)

### Steps:
1. Navigate to `/components` in browser
2. Observe the table

### Expected Results:
✅ **Drawing P-001 row displays**:
  - Expand icon: ChevronRight (pointing right)
  - Drawing #: "P-001"
  - Title: "Main Process Line"
  - Progress: "0/3 • 8%" (0 completed, 3 total, 8% average)
  - Component count: "3 items"

✅ **Drawing P-002 row displays**:
  - Progress: "1/1 • 100%" with green highlight
  - Component count: "1 item"

✅ **Drawing P-003 row displays**:
  - Progress: "0/0 • 0%"
  - Component count: "0 items"
  - No expand icon (edge case: empty drawing)

✅ **Visual Hierarchy**:
  - Drawing rows have slate-100 background
  - Drawing rows have blue-500 left border
  - Drawing text is bold, 16px
  - Hover on drawing row highlights entire row

### Pass/Fail:
- [ ] All drawing data displays correctly
- [ ] Progress summary format matches "X/Y • Z%"
- [ ] Empty drawing (P-003) shows "0 items" with no expand icon
- [ ] Visual styling matches design (bold, border, hover)

---

## Scenario 2: Expand Drawing to See Components

**Goal**: Verify FR-007 through FR-011 (Interaction Requirements, Component Display)

### Steps:
1. Click anywhere on Drawing P-001 row
2. Observe URL updates
3. Observe component rows appear

### Expected Results:
✅ **Expansion Animation**:
  - ChevronRight rotates 90° to point down
  - Component rows slide in below drawing
  - Loading skeleton shows briefly (<300ms)

✅ **URL Updates**:
  - URL changes to: `/components?expanded=drawing-1-uuid`
  - Browser back button collapses drawing

✅ **Component Rows Display**:
  - 3 component rows appear, indented 32px
  - Row 1: "VBALU-001 2\" (1)" | valve | [5 milestone checkboxes] | 0%
  - Row 2: "EL90-150 2\" (1)" | fitting | [5 milestone checkboxes] | 10%
  - Row 3: "PIPE-SCH40 1\" (1)" | threaded_pipe | [8 milestone controls] | 15%

✅ **Milestone Columns**:
  - Column headers show milestone names + weights
    - Example: "Receive (10%)", "Install (60%)", etc.
  - Discrete milestones show checkboxes
  - Partial milestones show percentage values (e.g., "50%")
  - Threaded pipe shows mix of checkboxes and percentages

### Pass/Fail:
- [ ] Clicking drawing row expands components
- [ ] URL updates with ?expanded=drawing-1-uuid
- [ ] 3 component rows appear with correct data
- [ ] Milestone columns show correct controls (checkboxes vs percentages)
- [ ] Components are indented beneath drawing

---

## Scenario 3: Update Discrete Milestone (Checkbox)

**Goal**: Verify FR-013, FR-016 through FR-019 (Milestone Update Requirements)

### Steps:
1. Ensure Drawing P-001 is expanded
2. Locate Valve component (comp-1, currently 0%)
3. Click "Receive" milestone checkbox
4. Observe updates

### Expected Results:
✅ **Immediate UI Update (Optimistic)**:
  - Checkbox shows checkmark instantly (<50ms)
  - Component progress updates: 0% → 10%
  - Drawing progress updates: "0/3 • 8%" → "0/3 • 12%" (avg increases)

✅ **Network Request**:
  - Browser DevTools shows POST to `/rest/v1/rpc/update_component_milestone`
  - Payload:
    ```json
    {
      "p_component_id": "comp-1-uuid",
      "p_milestone_name": "Receive",
      "p_new_value": true,
      "p_user_id": "<current-user-uuid>"
    }
    ```

✅ **Database Updates** (verify in Supabase SQL editor):
  ```sql
  -- Component updated
  SELECT current_milestones, percent_complete
  FROM components
  WHERE id = 'comp-1-uuid';
  -- Expected: {"Receive": true, "Install": false, ...}, 10.00

  -- Audit event created
  SELECT milestone_name, action, value, previous_value
  FROM milestone_events
  WHERE component_id = 'comp-1-uuid'
  ORDER BY created_at DESC
  LIMIT 1;
  -- Expected: "Receive", "complete", 1, NULL
  ```

✅ **Drawing Progress Refresh**:
  - Materialized view refreshed
  - P-001 average now: (10% + 10% + 15%) / 3 = 11.67% ≈ 12%

### Pass/Fail:
- [ ] Checkbox toggles instantly (optimistic update)
- [ ] Component progress updates from 0% to 10%
- [ ] Drawing progress updates to reflect change
- [ ] Database shows updated current_milestones
- [ ] milestone_events table has new audit record

---

## Scenario 4: Update Partial Milestone (Percentage)

**Goal**: Verify FR-014, FR-020, FR-021 (Partial Milestone Editor)

### Steps:
1. Ensure Drawing P-001 is expanded
2. Locate Threaded Pipe component (comp-3)
3. Find "Fabricate" milestone (currently shows "50%")
4. Click the "50%" text
5. Adjust slider to 75%
6. Click "Update" button

### Expected Results:
✅ **Popover Opens**:
  - Popover appears below "50%" text
  - Width: 320px
  - Contains slider (0-100, step 5) + value display
  - Slider positioned at 50

✅ **Slider Interaction**:
  - Drag slider to 75
  - Value display updates: "75%"
  - Slider snaps to 5% increments (70, 75, 80)

✅ **Update Click**:
  - Popover closes
  - "50%" text changes to "75%"
  - Component progress updates: 15% → 17.5%
    - Calculation: Receive(10%) + Fabricate(10% × 0.75 = 7.5%) = 17.5%
  - Drawing progress updates

✅ **Validation Test**:
  - Try entering 150 in slider: Rejected (max 100)
  - Try entering -10: Rejected (min 0)
  - Click outside popover: Closes without saving (value stays 50%)
  - Press ESC: Closes without saving

### Pass/Fail:
- [ ] Clicking percentage opens popover with slider
- [ ] Slider adjusts in 5% increments
- [ ] "Update" button saves changes and closes popover
- [ ] Component progress recalculates correctly (17.5%)
- [ ] Validation prevents out-of-range values
- [ ] ESC and click-outside cancel without saving

---

## Scenario 5: Collapse Drawing

**Goal**: Verify FR-008 (Collapse Interaction)

### Steps:
1. Ensure Drawing P-001 is expanded with components visible
2. Click Drawing P-001 row again
3. Observe collapse

### Expected Results:
✅ **Collapse Animation**:
  - ChevronRight rotates back to point right
  - Component rows slide out / disappear
  - Drawing row remains visible

✅ **URL Updates**:
  - `?expanded=drawing-1-uuid` removed from URL
  - If multiple drawings were expanded, only P-001 removed

✅ **State Preserved**:
  - Milestone updates made earlier are still saved
  - Scroll position maintained
  - Other expanded drawings remain expanded

### Pass/Fail:
- [ ] Clicking expanded drawing row collapses it
- [ ] ChevronRight icon rotates back
- [ ] Component rows disappear
- [ ] URL updates to remove drawing ID
- [ ] Data changes persist (re-expanding shows updated values)

---

## Scenario 6: Navigate Between Multiple Drawings

**Goal**: Verify FR-009 (Multiple Drawings Expanded Simultaneously)

### Steps:
1. Expand Drawing P-001 (3 components)
2. Scroll down to Drawing P-002
3. Expand Drawing P-002 (1 component)
4. Observe URL and UI

### Expected Results:
✅ **Multiple Expansions**:
  - Both P-001 and P-002 show expanded components
  - URL: `?expanded=drawing-1-uuid,drawing-2-uuid`
  - Scroll bar allows scrolling through all visible rows

✅ **Virtualization Performance**:
  - Only visible components rendered (check React DevTools)
  - Smooth scrolling even with multiple drawings expanded
  - Memory usage remains stable

✅ **Independent Collapse**:
  - Collapsing P-001 leaves P-002 expanded
  - URL updates to: `?expanded=drawing-2-uuid`

### Pass/Fail:
- [ ] Multiple drawings can be expanded at once
- [ ] URL shows comma-separated drawing IDs
- [ ] Scrolling is smooth (virtualization working)
- [ ] Collapsing one drawing doesn't affect others

---

## Scenario 7: Search for Specific Drawing

**Goal**: Verify FR-025 (Search by Drawing Number)

### Steps:
1. Type "P-002" in search input
2. Observe table updates
3. Clear search

### Expected Results:
✅ **Search Filtering**:
  - Only Drawing P-002 row visible
  - Drawings P-001 and P-003 hidden
  - URL updates: `?search=P-002`
  - Result count: "Showing 1 of 3 drawings"

✅ **Case Insensitivity**:
  - Typing "p-002" also works (normalized to uppercase)
  - Typing "002" also works (partial match)

✅ **Clear Search**:
  - Click X button in search input
  - All 3 drawings reappear
  - URL updates: `?search=` removed

✅ **Expanded State Preserved**:
  - If P-002 was expanded before search, it remains expanded
  - URL: `?expanded=drawing-2-uuid&search=P-002`

### Pass/Fail:
- [ ] Search filters drawings by number (partial match)
- [ ] Search is case-insensitive
- [ ] URL updates with ?search= parameter
- [ ] Clearing search restores all drawings
- [ ] Expanded state preserved during search

---

## Scenario 8: Filter by Progress Status

**Goal**: Verify FR-026 (Status Filtering)

### Steps:
1. Select "In Progress (>0%)" from status filter dropdown
2. Observe table updates
3. Try other filters

### Expected Results:
✅ **In Progress Filter**:
  - Only Drawing P-001 visible (8% average, >0% and <100%)
  - P-002 hidden (100%)
  - P-003 hidden (0%)
  - URL: `?status=in-progress`

✅ **Complete Filter**:
  - Only Drawing P-002 visible (100%)
  - URL: `?status=complete`

✅ **Not Started Filter**:
  - Only Drawing P-003 visible (0%)
  - URL: `?status=not-started`

✅ **All Filter**:
  - All 3 drawings visible
  - URL: `?status=` removed (default)

✅ **Combine with Search**:
  - Set status="in-progress" + search="P-001"
  - Only P-001 visible (matches both filters)
  - URL: `?search=P-001&status=in-progress`

### Pass/Fail:
- [ ] Status filter shows correct drawings
- [ ] "Not Started" shows only 0% drawings
- [ ] "In Progress" shows >0% and <100% drawings
- [ ] "Complete" shows only 100% drawings
- [ ] Filters combine with search correctly

---

## Edge Case Testing

### Edge Case 1: Drawing with No Components (P-003)

**Steps**:
1. Locate Drawing P-003 row (0 components)

**Expected**:
- [ ] No expand icon shown
- [ ] Clicking row does nothing (no expansion)
- [ ] Progress shows "0/0 • 0%"
- [ ] Component count shows "0 items"

### Edge Case 2: Offline Milestone Update

**Steps**:
1. Open Browser DevTools → Network tab
2. Set network to "Offline"
3. Try to toggle a milestone checkbox

**Expected**:
- [ ] Checkbox toggles optimistically
- [ ] After ~3 seconds, request fails
- [ ] Checkbox reverts to original state (rollback)
- [ ] Toast error: "Unable to save. Check your connection."

### Edge Case 3: Permission Denied

**Steps**:
1. Log out and log in as read-only user
2. Navigate to `/components`
3. Expand a drawing

**Expected**:
- [ ] Milestone checkboxes are greyed out
- [ ] Checkboxes have `disabled` attribute
- [ ] Cursor shows "not-allowed"
- [ ] Tooltip: "Read-only access"
- [ ] Clicking does nothing (no mutation fired)

### Edge Case 4: Large Drawing (100+ Components)

**Steps**:
1. Seed a drawing with 150 components (via SQL script)
2. Expand that drawing

**Expected**:
- [ ] All 150 components load within 1 second
- [ ] Only ~20 visible rows rendered (virtualization)
- [ ] Smooth scrolling through all components
- [ ] No lag or janky scrolling

### Edge Case 5: Simultaneous Updates (Conflict)

**Steps**:
1. Open same project in two browser tabs (Tab A, Tab B)
2. In Tab A: Toggle milestone checkbox
3. In Tab B: Toggle same checkbox before Tab A's request completes

**Expected**:
- [ ] Both tabs show optimistic updates
- [ ] Last write wins (whichever request reaches server last)
- [ ] Both tabs eventually sync to same final state
- [ ] Both updates recorded in milestone_events (with timestamps)

---

## Performance Validation

### Test 1: Page Load Time

**Steps**:
1. Open Browser DevTools → Performance tab
2. Start recording
3. Navigate to `/components`
4. Stop recording when table fully renders

**Expected**:
- [ ] Time to First Contentful Paint (FCP): <1 second
- [ ] Time to Interactive (TTI): <2 seconds
- [ ] Drawing list query: <500ms
- [ ] Materialized view read: <100ms

### Test 2: Drawing Expansion Time

**Steps**:
1. Clear cache
2. Start performance recording
3. Click to expand drawing with 200 components
4. Stop when components finish rendering

**Expected**:
- [ ] Component query: <300ms
- [ ] Rendering time: <500ms
- [ ] Total expansion time: <1 second (meets FR-023)

### Test 3: Milestone Update Latency

**Steps**:
1. Start performance recording
2. Toggle milestone checkbox
3. Measure time until success callback

**Expected**:
- [ ] Optimistic UI update: <50ms
- [ ] Network round trip: <200ms
- [ ] Total time to success: <500ms (meets spec target)

---

## Cleanup

After completing quickstart:

```sql
-- Delete test data
DELETE FROM components WHERE project_id = 'test-project-uuid';
DELETE FROM drawings WHERE project_id = 'test-project-uuid';
DELETE FROM projects WHERE id = 'test-project-uuid';

-- Refresh materialized view
REFRESH MATERIALIZED VIEW mv_drawing_progress;
```

---

## Acceptance Criteria

✅ **All 8 scenarios pass**: Each checklist item marked complete
✅ **All 5 edge cases handled correctly**: No crashes, proper error states
✅ **Performance targets met**: <1s expansion, <500ms updates
✅ **Accessibility validated**: Keyboard navigation, screen reader labels
✅ **Mobile responsive**: Simplified view on <768px screens

**Overall Status**: [ ] PASS / [ ] FAIL

---

## Troubleshooting

### Issue: "Components not loading when drawing expanded"
- **Check**: Browser console for query errors
- **Verify**: RLS policies allow component SELECT for current user
- **Debug**: Run query manually in Supabase SQL editor

### Issue: "Milestone update doesn't save"
- **Check**: Network tab shows 200 OK response
- **Verify**: `update_component_milestone` RPC function exists
- **Debug**: Check database trigger for percent_complete calculation

### Issue: "URL state not syncing"
- **Check**: React Router useSearchParams hook
- **Verify**: URL actually changes in address bar
- **Debug**: Console.log searchParams in component

### Issue: "Virtualization not working (all rows render)"
- **Check**: @tanstack/react-virtual is installed
- **Verify**: virtualizer.getVirtualItems() returns limited array
- **Debug**: Use React DevTools to inspect rendered row count

---

**Quickstart Status**: ✅ Ready for validation
**Estimated Completion**: 15 minutes for full scenario walkthrough
**Next**: Run integration tests, then deploy to staging
