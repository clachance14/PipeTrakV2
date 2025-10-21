# Quickstart: Drawing & Component Metadata Assignment UI

**Feature**: 011-the-drawing-component
**Purpose**: Validate feature implementation end-to-end

## Prerequisites

1. **Database Setup**:
   ```bash
   # Apply migrations
   npx supabase db push --linked
   
   # Verify migrations applied
   npx supabase db diff --linked  # Should show no changes
   
   # Generate TypeScript types
   npx supabase gen types typescript --linked > src/types/database.types.ts
   ```

2. **Seed Test Data**:
   ```sql
   -- Create test organization
   INSERT INTO organizations (id, name) VALUES 
     ('00000000-0000-0000-0000-000000000001', 'QuickStart Org');

   -- Create test project
   INSERT INTO projects (id, name, organization_id) VALUES
     ('00000000-0000-0000-0000-000000000002', 'QuickStart Project', '00000000-0000-0000-0000-000000000001');

   -- Create test areas with descriptions
   INSERT INTO areas (id, name, description, project_id, organization_id) VALUES
     ('00000000-0000-0000-0000-000000000003', 'Area 100', 'North wing - Level 2', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
     ('00000000-0000-0000-0000-000000000004', 'Area 200', 'South wing - Level 2', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');

   -- Create test systems with descriptions
   INSERT INTO systems (id, name, description, project_id, organization_id) VALUES
     ('00000000-0000-0000-0000-000000000005', 'HVAC-01', 'Cooling water distribution', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');

   -- Create test package with description
   INSERT INTO test_packages (id, name, description, project_id, organization_id) VALUES
     ('00000000-0000-0000-0000-000000000006', 'TP-2025-001', 'Q1 2025 mechanical completion', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');

   -- Create test drawing
   INSERT INTO drawings (id, drawing_no, drawing_no_norm, project_id) VALUES
     ('00000000-0000-0000-0000-000000000007', 'P-001', 'P-001', '00000000-0000-0000-0000-000000000002');

   -- Create test components (5 unassigned)
   INSERT INTO components (id, drawing_id, identity_key, component_type, progress_template_id) VALUES
     ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000007', '{"commodity_code": "VBALU-001", "size": "2", "seq": 1}', 'valve', (SELECT id FROM progress_templates WHERE name = 'Valve-Instrument-Support-Discrete' LIMIT 1)),
     ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000007', '{"commodity_code": "VBALU-002", "size": "1", "seq": 1}', 'valve', (SELECT id FROM progress_templates WHERE name = 'Valve-Instrument-Support-Discrete' LIMIT 1)),
     ('00000000-0000-0000-0000-00000000000A', '00000000-0000-0000-0000-000000000007', '{"commodity_code": "ME-55402", "size": "1X2", "seq": 1}', 'instrument', (SELECT id FROM progress_templates WHERE name = 'Valve-Instrument-Support-Discrete' LIMIT 1)),
     ('00000000-0000-0000-0000-00000000000B', '00000000-0000-0000-0000-000000000007', '{"commodity_code": "VBALU-003", "size": "2", "seq": 1}', 'valve', (SELECT id FROM progress_templates WHERE name = 'Valve-Instrument-Support-Discrete' LIMIT 1)),
     ('00000000-0000-0000-0000-00000000000C', '00000000-0000-0000-0000-000000000007', '{"commodity_code": "VBALU-004", "size": "1", "seq": 1}', 'valve', (SELECT id FROM progress_templates WHERE name = 'Valve-Instrument-Support-Discrete' LIMIT 1));
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   # Open http://localhost:5173
   ```

---

## Test Flow

### ✅ Test 1: Inline Edit Single Drawing (Scenario 1)

**Steps**:
1. Navigate to `/components` page
2. Locate drawing "P-001" in the table
3. Hover over the "Area" column → pencil icon appears
4. Click pencil icon → "Assign Metadata to Drawing: P-001" dialog opens
5. Select "Area 100" from Area dropdown
   - ✅ Verify dropdown shows "Area 100" with description "North wing - Level 2" below
6. Click "Assign Metadata" button
7. Dialog closes, success toast appears: "5 components inherited Area 100, 0 components kept existing assignments"
8. Drawing row now shows "Area 100" in Area column
9. Expand drawing → verify 5 component rows show "Area 100 (inherited)" with gray badge

**Expected**:
- ✅ Pencil icon appears on hover
- ✅ Dialog opens with drawing number in title
- ✅ Area dropdown shows description under name
- ✅ Assignment completes within 1 second
- ✅ Toast shows correct inheritance summary
- ✅ Components display gray "(inherited)" badge

---

### ✅ Test 2: Bulk Assign Multiple Drawings (Scenario 2)

**Prerequisite**: Seed 5 drawings with no metadata

**Steps**:
1. Click "Select Mode" toggle button
   - ✅ Checkboxes appear on left side of drawing rows
2. Select 5 drawings by clicking checkboxes
   - ✅ Bulk actions toolbar appears: "5 drawings selected"
3. Click "Assign Metadata" in toolbar
   - ✅ Dialog opens showing list of 5 selected drawings
4. Select "HVAC-01" from System dropdown, leave Area as "No change"
   - ✅ Verify system dropdown shows "HVAC-01" with description "Cooling water distribution"
5. Click "Assign to 5 Drawings"
6. Dialog closes, success toast appears with total summary
7. All 5 drawings now show "HVAC-01" in System column
8. Areas remain unchanged

**Expected**:
- ✅ Select mode enables checkboxes
- ✅ Bulk toolbar shows selection count
- ✅ "No change" option preserves existing values
- ✅ Operation completes within 10 seconds (for 50 drawings)
- ✅ Toast shows aggregated summary

---

### ✅ Test 3: Component Override (Scenario 4)

**Prerequisite**: Drawing P-001 assigned Area 100, component VBALU-001 inherits it

**Steps**:
1. Expand drawing P-001
2. Locate component VBALU-001 row
   - ✅ Shows "Area 100 (inherited)" with gray badge
3. Click pencil icon on component row
4. Component assignment dialog opens
   - ✅ Area dropdown shows "Area 100 (inherited from drawing)" pre-selected
   - ✅ Warning shows: "Changing these values will override the drawing's assignments for this component only"
5. Select "Area 200" from dropdown
6. Click "Update Component"
7. Component row updates to show "Area 200 (assigned)" with blue badge
8. Hover over badge → tooltip shows "Manually assigned"

**Expected**:
- ✅ Dialog shows inherited value with notation
- ✅ Override warning displays
- ✅ Badge changes from gray to blue
- ✅ Tooltip shows "Manually assigned"

---

### ✅ Test 4: Edit Metadata Description (Scenario 9)

**Steps**:
1. Open drawing assignment dialog for P-001
2. Click Area dropdown
3. Hover over "Area 100" option
   - ✅ See name "Area 100" on first line
   - ✅ See description "North wing - Level 2" in gray on second line
   - ✅ See pencil icon on right side
4. Click pencil icon (click event propagation stopped)
5. Quick-edit popover opens: "Edit Description: Area 100"
   - ✅ Text input pre-filled with "North wing - Level 2"
   - ✅ Character counter shows "20/100 characters"
6. Change description to "North processing unit - Level 2"
7. Click "Save"
8. Popover closes, dropdown refreshes
   - ✅ Updated description shows in dropdown
9. Success toast: "Area 100 description updated"
10. Navigate to Areas management page
    - ✅ Description shows there as well

**Expected**:
- ✅ Two-line dropdown display
- ✅ Pencil icon only for admin/PM users
- ✅ Quick-edit popover opens without closing dropdown
- ✅ Character counter updates as user types
- ✅ Description truncates at 50 chars with "..." in dropdown
- ✅ Change syncs to management page

---

### ✅ Test 5: Inheritance Detection (Scenario 3)

**Prerequisite**: 
- Drawing P-001: area_id = Area 100, system_id = HVAC-01, test_package_id = TP-2025-001
- Component VBALU-001: area_id = NULL, system_id = NULL, test_package_id = NULL

**Steps**:
1. Expand drawing P-001
2. View component VBALU-001 row

**Expected Display**:
- ✅ "Area 100 (inherited)" with gray badge
- ✅ "HVAC-01 (inherited)" with gray badge
- ✅ "TP-2025-001 (inherited)" with gray badge

**Hover Tooltips**:
- ✅ "From drawing P-001"

---

### ✅ Test 6: Bulk Assignment Limit (Edge Case)

**Steps**:
1. Enable Select Mode
2. Select 51 drawings
3. Click "Assign Metadata"

**Expected**:
- ✅ Warning message: "You've selected 51 drawings. Bulk operations are limited to 50 drawings at a time for performance. Please reduce your selection."
- ✅ "Assign Metadata" button is disabled

---

### ✅ Test 7: Search Description (FR-057)

**Steps**:
1. Open Area dropdown in assignment dialog
2. Type "north" in search box

**Expected**:
- ✅ "Area 100" appears (matches description "North wing - Level 2")
- ✅ Other areas without "north" in name or description are hidden

---

## Performance Validation

Run with Chrome DevTools Performance tab open:

1. **Single drawing assignment** (200 components):
   - ✅ Total time < 1 second
   - ✅ No UI freezing during operation

2. **Bulk 50 drawings**:
   - ✅ Total time < 10 seconds
   - ✅ Loading indicator shows progress
   - ✅ Success toast appears after completion

3. **Description edit**:
   - ✅ Optimistic update shows immediately
   - ✅ Server confirmation within 500ms

4. **Page load** (500 drawings):
   - ✅ Initial render < 2 seconds
   - ✅ Virtual scroll smooth (no jank)

---

## Contract Test Validation

Run contract tests to verify API behavior:

```bash
npm test tests/contract/drawing-assignment.contract.test.ts
npm test tests/contract/component-override.contract.test.ts
npm test tests/contract/metadata-description.contract.test.ts
```

**Expected**:
- ✅ All contract tests pass
- ✅ Request/response schemas validated
- ✅ Error cases handled (404, 403, 400)

---

## Acceptance Criteria

Feature is complete when:

- ✅ All 7 quickstart tests pass
- ✅ All contract tests pass
- ✅ Performance targets met
- ✅ TypeScript compilation passes (tsc -b)
- ✅ Lint passes (npm run lint)
- ✅ Test coverage ≥70% overall (npm test -- --coverage)

---

## Rollback Plan

If feature fails validation:

1. Revert migrations:
   ```bash
   # List applied migrations
   npx supabase migration list --linked
   
   # Rollback last 2 migrations
   # (Manual SQL: DROP COLUMN description, DROP FUNCTION assign_drawing_metadata)
   ```

2. Revert code changes:
   ```bash
   git revert <commit-hash>
   ```

3. Clear browser cache (TanStack Query cache):
   ```
   localStorage.clear()
   sessionStorage.clear()
   ```

---

## Troubleshooting

**Issue**: Description not showing in dropdown
- **Check**: Database migration applied (`SELECT * FROM areas LIMIT 1` should show description column)
- **Check**: TypeScript types regenerated
- **Check**: Hook includes description in SELECT query

**Issue**: Inheritance not working
- **Check**: Component area_id is NULL before assignment
- **Check**: RPC function `assign_drawing_metadata` returns correct summary
- **Check**: TanStack Query invalidates cache after assignment

**Issue**: Bulk assignment timeout
- **Check**: Drawing count ≤ 50
- **Check**: Database connection pool not exhausted
- **Check**: Network tab shows single POST request (not N requests)

---

## Next Steps

After quickstart passes:

1. Run full integration test suite (all 9 scenarios)
2. Performance testing with 500 drawings x 200 components
3. Accessibility audit (WCAG 2.1 AA)
4. Cross-browser testing (Chrome, Firefox, Safari)
5. Create PR following Constitution v1.0.1 requirements
