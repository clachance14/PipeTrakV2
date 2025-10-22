# Quickstart: Test Package Readiness Page Enhancement

**Feature**: 012-test-package-readiness
**Purpose**: End-to-end validation of package inheritance fix, CRUD operations, and drill-down page
**Target Audience**: QA engineers, developers verifying implementation

## Prerequisites

- [x] Migration 00027 applied (`npx supabase db push --linked`)
- [x] Database types regenerated (`npx supabase gen types typescript --linked > src/types/database.types.ts`)
- [x] Frontend running (`npm run dev` at http://localhost:5173)
- [x] Authenticated as user with project access
- [x] Test project with at least 1 drawing and 5 components

## Scenario 1: Verify Materialized View Inheritance Fix

**Goal**: Confirm components inherit test_package_id from drawing

### Setup
```sql
-- Run in Supabase SQL Editor
-- Create test package
INSERT INTO test_packages (id, project_id, name, description, target_date)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '<your-project-id>',
  'Test Package A',
  'Quickstart test package',
  '2025-12-31'
);

-- Assign to drawing (NOT components)
UPDATE drawings
SET test_package_id = '00000000-0000-0000-0000-000000000001'
WHERE drawing_no_norm = 'P-001' AND project_id = '<your-project-id>';

-- Verify components on P-001 have NULL test_package_id
SELECT id, test_package_id FROM components
WHERE drawing_id = (SELECT id FROM drawings WHERE drawing_no_norm = 'P-001' AND project_id = '<your-project-id>');
-- Expected: test_package_id = NULL for all
```

### Test Steps
1. Navigate to `/packages` page
2. Locate "Test Package A" card

**Expected Result**:
- ✅ Card shows `total_components > 0` (counts inherited components)
- ✅ Card shows progress % (average of inherited components)
- ✅ Card shows "No components assigned" if 0 components (before fix, this was always shown)

### Verification Query
```sql
-- Verify materialized view counts inherited components
SELECT * FROM mv_package_readiness
WHERE package_id = '00000000-0000-0000-0000-000000000001';

-- Expected:
-- total_components > 0 (NOT 0 like before fix)
-- avg_percent_complete = <actual average>
```

### Cleanup
```sql
UPDATE drawings SET test_package_id = NULL WHERE drawing_no_norm = 'P-001';
DELETE FROM test_packages WHERE id = '00000000-0000-0000-0000-000000000001';
```

---

## Scenario 2: Create Package via UI

**Goal**: Verify create_test_package RPC function and UI integration

### Test Steps
1. Navigate to `/packages` page
2. Click "New Package" button
3. Fill form:
   - Name: "Quickstart Package B"
   - Description: "Created via quickstart test"
   - Target Date: 2026-01-15
4. Click "Create Package"

**Expected Result**:
- ✅ Toast notification: "Package created successfully"
- ✅ New package card appears in grid immediately (optimistic update)
- ✅ Card shows name, description, target date
- ✅ Card shows 0 components (no assignments yet)
- ✅ Card shows 0% progress
- ✅ Card has gray/blue status color

### Verification
- Refresh page → Package still appears (persisted to database)
- Check database:
  ```sql
  SELECT * FROM test_packages WHERE name = 'Quickstart Package B' AND project_id = '<your-project-id>';
  -- Expected: 1 row with description and target_date
  ```

### Cleanup
```sql
DELETE FROM test_packages WHERE name = 'Quickstart Package B';
```

---

## Scenario 3: Edit Package via UI

**Goal**: Verify update_test_package RPC function

### Setup
```sql
INSERT INTO test_packages (id, project_id, name, description)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '<your-project-id>',
  'Original Name',
  'Original Description'
);
```

### Test Steps
1. Navigate to `/packages` page
2. Hover over "Original Name" package card
3. Click pencil (edit) icon
4. Update fields:
   - Name: "Updated Name"
   - Description: "Updated Description"
5. Click "Save Changes"

**Expected Result**:
- ✅ Toast notification: "Package updated successfully"
- ✅ Card updates immediately (optimistic update)
- ✅ Card shows new name and description

### Verification
```sql
SELECT * FROM test_packages WHERE id = '00000000-0000-0000-0000-000000000002';
-- Expected: name = "Updated Name", description = "Updated Description"
```

### Cleanup
```sql
DELETE FROM test_packages WHERE id = '00000000-0000-0000-0000-000000000002';
```

---

## Scenario 4: Drill-Down to Package Components

**Goal**: Verify package detail page and inheritance badge display

### Setup
```sql
-- Create package
INSERT INTO test_packages (id, project_id, name)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  '<your-project-id>',
  'Drill-Down Test Package'
);

-- Assign to drawing (5 components will inherit)
UPDATE drawings
SET test_package_id = '00000000-0000-0000-0000-000000000003'
WHERE drawing_no_norm = 'P-001' AND project_id = '<your-project-id>';

-- Override 1 component to different package
UPDATE components
SET test_package_id = '00000000-0000-0000-0000-000000000001'
WHERE id = (
  SELECT id FROM components
  WHERE drawing_id = (SELECT id FROM drawings WHERE drawing_no_norm = 'P-001')
  LIMIT 1
);
```

### Test Steps
1. Navigate to `/packages` page
2. Click anywhere on "Drill-Down Test Package" card body (NOT edit icon)
3. Should navigate to `/packages/00000000-0000-0000-0000-000000000003/components`

**Expected Result**:
- ✅ Page header shows package name, description, target date, progress
- ✅ Component table displays with columns: Drawing, Identity, Type, Progress, Milestones
- ✅ 4 components show gray "inherited" badge (from drawing P-001)
- ✅ 1 component does NOT appear (overridden to different package)
- ✅ Hover over gray badge → Tooltip: "From drawing P-001"

### Verification
- Count rows in table → Should equal `total_components` from package card
- Click milestone checkbox → Component progress updates
- Click component edit icon → ComponentAssignDialog opens with warning

### Cleanup
```sql
UPDATE drawings SET test_package_id = NULL WHERE drawing_no_norm = 'P-001';
UPDATE components SET test_package_id = NULL WHERE test_package_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM test_packages WHERE id = '00000000-0000-0000-0000-000000000003';
```

---

## Scenario 5: Component Override Behavior

**Goal**: Verify inheritance badges distinguish inherited vs assigned

### Setup
```sql
-- Create 2 packages
INSERT INTO test_packages (id, project_id, name) VALUES
  ('00000000-0000-0000-0000-000000000004', '<your-project-id>', 'Package D'),
  ('00000000-0000-0000-0000-000000000005', '<your-project-id>', 'Package E');

-- Assign drawing to Package D
UPDATE drawings
SET test_package_id = '00000000-0000-0000-0000-000000000004'
WHERE drawing_no_norm = 'P-001';
```

### Test Steps (Part 1: Inherited)
1. Navigate to `/packages/00000000-0000-0000-0000-000000000004/components`
2. Observe all components have gray "inherited" badge

### Test Steps (Part 2: Override)
1. Click edit icon on first component
2. Change "Test Package" dropdown to "Package E"
3. Observe yellow warning: "Changing these values will override inherited metadata"
4. Click "Update Component"

**Expected Result**:
- ✅ Component no longer appears in Package D detail page
- ✅ Navigate to `/packages/00000000-0000-0000-0000-000000000005/components`
- ✅ Component appears in Package E with blue "assigned" badge
- ✅ Hover over blue badge → Tooltip: "Manually assigned"

### Verification
```sql
-- Check component test_package_id
SELECT test_package_id FROM components WHERE id = '<component-id>';
-- Expected: '00000000-0000-0000-0000-000000000005'

-- Check Package D counts
SELECT total_components FROM mv_package_readiness WHERE package_id = '00000000-0000-0000-0000-000000000004';
-- Expected: Original count - 1

-- Check Package E counts
SELECT total_components FROM mv_package_readiness WHERE package_id = '00000000-0000-0000-0000-000000000005';
-- Expected: 1
```

### Cleanup
```sql
UPDATE drawings SET test_package_id = NULL WHERE drawing_no_norm = 'P-001';
UPDATE components SET test_package_id = NULL WHERE test_package_id IN ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005');
DELETE FROM test_packages WHERE id IN ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005');
```

---

## Scenario 6: Edge Case - Empty Package

**Goal**: Verify empty packages display correctly

### Setup
```sql
INSERT INTO test_packages (id, project_id, name)
VALUES (
  '00000000-0000-0000-0000-000000000006',
  '<your-project-id>',
  'Empty Package'
);
```

### Test Steps
1. Navigate to `/packages` page
2. Locate "Empty Package" card

**Expected Result**:
- ✅ Card shows 0 components
- ✅ Card shows 0% progress
- ✅ Card displays "No components assigned" message
- ✅ Card is still clickable

### Test Steps (Drill-Down)
1. Click "Empty Package" card
2. Navigate to detail page

**Expected Result**:
- ✅ Page loads without error
- ✅ Component table shows empty state: "No components in this package"
- ✅ Header still shows package name and info

### Cleanup
```sql
DELETE FROM test_packages WHERE id = '00000000-0000-0000-0000-000000000006';
```

---

## Success Criteria

All 6 scenarios pass ✅:
1. ✅ Materialized view counts inherited components (fix verified)
2. ✅ Create package via UI works
3. ✅ Edit package via UI works
4. ✅ Drill-down page displays components with correct badges
5. ✅ Component override changes package assignment
6. ✅ Empty package handles gracefully

## Performance Validation

Run with test data:
```sql
-- Create 50 packages with 200 components each
-- (Script in tests/integration/012-test-package-readiness/performance-seed.sql)
```

**Expected**:
- `/packages` page load: <2s
- Package detail page load: <2s
- Create package operation: <1s (perceived with optimistic update)
- Edit package operation: <1s (perceived with optimistic update)

## Rollback Procedure

If critical issues found:
```sql
-- Revert to previous mv_package_readiness (direct join only)
DROP MATERIALIZED VIEW IF EXISTS mv_package_readiness CASCADE;

CREATE MATERIALIZED VIEW mv_package_readiness AS
SELECT
  tp.id AS package_id,
  tp.project_id,
  tp.name AS package_name,
  tp.target_date,
  COUNT(c.id) AS total_components,
  COUNT(c.id) FILTER (WHERE c.percent_complete = 100) AS completed_components,
  AVG(c.percent_complete) AS avg_percent_complete,
  COUNT(nr.id) FILTER (WHERE nr.status = 'pending') AS blocker_count,
  MAX(c.last_updated_at) AS last_activity_at
FROM test_packages tp
LEFT JOIN components c ON c.test_package_id = tp.id AND NOT c.is_retired
LEFT JOIN needs_review nr ON nr.component_id = c.id AND nr.status = 'pending'
GROUP BY tp.id, tp.project_id, tp.name, tp.target_date;

-- Recreate indexes
CREATE UNIQUE INDEX idx_mv_package_readiness_id ON mv_package_readiness(package_id);
CREATE INDEX idx_mv_package_readiness_project ON mv_package_readiness(project_id);
```

**Note**: This reverts to buggy behavior (components assigned to drawings won't count), but allows continued operation while fix is investigated.
