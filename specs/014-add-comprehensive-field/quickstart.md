# Quickstart: Field Weld QC Module

**Feature**: 014-add-comprehensive-field
**Created**: 2025-10-22
**Status**: Phase 1 Design

## Overview

This guide helps developers set up and test the Field Weld QC Module. It covers database setup, running contract tests, and executing the 6 acceptance scenarios from the specification.

## Prerequisites

Verify your development environment has the required tools:

```bash
# Check Supabase CLI installed
supabase --version
# Expected: Supabase CLI 1.x.x or higher

# Check project is linked to remote database
supabase db remote list
# Should show your project reference

# Check Node.js and npm
node --version  # v20.x or higher
npm --version   # v10.x or higher

# Verify environment variables
grep -E 'VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY' .env
# Both should be set with valid values
```

## Database Setup

### Step 1: Apply Migrations

Apply the four Field Weld migrations in sequence:

```bash
# Navigate to project root
cd /home/clachance14/projects/PipeTrak_V2

# Apply migrations to remote database (no local database used)
supabase db push --linked

# Verify migrations applied successfully
supabase db remote list
# Should show migrations 00035-00038 in migrations table

# Check for any migration errors
supabase db push --linked --dry-run
# Should show "No changes detected" if all migrations already applied
```

### Step 2: Generate TypeScript Types

Regenerate TypeScript types to include new tables:

```bash
# Generate types from remote schema
supabase gen types typescript --linked > src/types/database.types.ts

# Verify new types exist
grep -E 'field_welds|welders' src/types/database.types.ts
# Should show field_welds and welders table definitions
```

### Step 3: Verify Schema

Confirm tables, triggers, and RLS policies created correctly:

```bash
# Check tables exist
supabase db remote execute --sql "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('field_welds', 'welders');"
# Should return both table names

# Check triggers exist
supabase db remote execute --sql "SELECT tgname FROM pg_trigger WHERE tgname LIKE '%field_weld%' OR tgname LIKE '%welder%';"
# Should return: trigger_handle_weld_rejection, trigger_auto_start_repair_welds, trigger_update_field_weld_timestamp

# Check RLS enabled
supabase db remote execute --sql "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename IN ('field_welds', 'welders');"
# Both tables should show rowsecurity = true

# Check progress template exists
supabase db remote execute --sql "SELECT component_type, workflow_type FROM progress_templates WHERE component_type = 'field_weld';"
# Should return: field_weld, discrete
```

### Step 4: Seed Test Data (Optional)

Create sample data for manual testing:

```bash
# Run seed script (to be created in Phase 2)
# supabase db remote execute --file tests/setup/field-weld-test-data.sql

# Verify data seeded
# supabase db remote execute --sql "SELECT COUNT(*) FROM field_welds;"
# supabase db remote execute --sql "SELECT COUNT(*) FROM welders;"
```

## Running Tests

### Contract Tests

Run contract tests to verify database schema and constraints:

```bash
# Run all contract tests for Field Weld module
npm test -- specs/014-add-comprehensive-field/contracts/

# Run specific contract test file
npm test -- specs/014-add-comprehensive-field/contracts/rls-policies.contract.test.ts
npm test -- specs/014-add-comprehensive-field/contracts/weld-identity.contract.test.ts
npm test -- specs/014-add-comprehensive-field/contracts/progress-rollup.contract.test.ts

# Run with coverage
npm test -- --coverage specs/014-add-comprehensive-field/contracts/

# Open Vitest UI for interactive debugging
npm run test:ui
# Navigate to specs/014-add-comprehensive-field/contracts/ in UI
```

### Integration Tests

Run integration tests for full feature workflows:

```bash
# Run all integration tests for Field Weld module
npm test -- tests/integration/field-welds/

# Run specific scenario test
npm test -- tests/integration/field-welds/scenario-1-bulk-import.test.tsx
npm test -- tests/integration/field-welds/scenario-2-assign-welder.test.tsx
npm test -- tests/integration/field-welds/scenario-3-record-nde-pass.test.tsx
npm test -- tests/integration/field-welds/scenario-4-record-nde-fail.test.tsx
npm test -- tests/integration/field-welds/scenario-5-view-progress.test.tsx
npm test -- tests/integration/field-welds/scenario-6-manage-welders.test.tsx
```

## Acceptance Scenarios

### Scenario 1: Bulk Import Existing Welds

**File**: `tests/integration/field-welds/scenario-1-bulk-import.test.tsx`

**Given**: A project with no field welds tracked yet

**When**: Project manager uploads WELD LOG.csv with 2000 weld records

**Then**:
- System creates 2000 field weld components
- Assigns them to correct drawings (normalized drawing numbers match)
- Creates welder records for unique stencils found in CSV
- Sets initial progress based on existing data:
  - Welds with Date Welded → 95% (Fit-up + Weld Complete milestones)
  - Welds with NDE PASS → 100% (all milestones, status = accepted)
  - Welds with no dates → 0% (not started)

**Verification Steps**:
```bash
# Manual verification via Supabase Studio
1. Navigate to Imports page (/imports)
2. Upload test file: tests/fixtures/field-welds/WELD-LOG-2000-rows.csv
3. Wait for import completion (<30 seconds)
4. Verify success toast shows "2000 field welds imported"
5. Navigate to Drawing Table (/components)
6. Filter by type: "Field Weld"
7. Verify 2000 rows displayed in table
8. Expand drawing, check milestones match CSV data

# Automated test verification
npm test -- scenario-1-bulk-import.test.tsx
# Test checks:
# - 2000 components created with type='field_weld'
# - 2000 field_welds rows inserted
# - Welder count matches unique stencils in CSV
# - Progress percentages match CSV Date Welded / NDE Result data
```

---

### Scenario 2: Foreman Assigns Welder to Completed Weld

**File**: `tests/integration/field-welds/scenario-2-assign-welder.test.tsx`

**Given**: A field weld at 30% (Fit-up complete)

**When**: Foreman marks "Weld Complete" milestone

**Then**:
- System prompts for welder selection and weld date
- Updates weld to 95% complete (Fit-up 30% + Weld Complete 65%)
- Records welder assignment with timestamp (welder_id, date_welded)
- Updates component progress_state and percent_complete

**Verification Steps**:
```bash
# Manual verification
1. Navigate to Drawing Table (/components)
2. Filter to field welds only
3. Expand drawing, locate weld at 30%
4. Click "Weld Complete" checkbox
5. Verify dialog appears with welder dropdown and date picker
6. Select welder (e.g., "K-07 - John Smith")
7. Select date (e.g., today's date)
8. Click "Save"
9. Verify weld progress updates to 95%
10. Verify welder and date displayed in table row

# Automated test verification
npm test -- scenario-2-assign-welder.test.tsx
# Test checks:
# - Dialog appears when marking Weld Complete
# - Validation requires welder_id and date_welded
# - percent_complete updates from 30 to 95
# - progress_state.milestones["Weld Complete"] = true
# - field_welds.welder_id and date_welded populated
```

---

### Scenario 3: QC Inspector Records Passing NDE

**File**: `tests/integration/field-welds/scenario-3-record-nde-pass.test.tsx`

**Given**: A field weld at 95% (Weld Complete)

**When**: QC inspector records NDE result as PASS with type RT and date

**Then**:
- System marks "Accepted" milestone complete automatically
- Updates weld to 100% (all milestones complete)
- Sets status to "accepted"
- Updates drawing/package progress calculations
- Records NDE metadata (nde_type, nde_result, nde_date, nde_notes)

**Verification Steps**:
```bash
# Manual verification
1. Navigate to Drawing Table, filter field welds
2. Expand drawing, locate weld at 95%
3. Click "Record NDE" button in row actions
4. Dialog appears with NDE form:
   - NDE Type dropdown (RT, UT, PT, MT)
   - NDE Result dropdown (PASS, FAIL, PENDING)
   - NDE Date picker
   - Notes textarea
5. Select Type: RT, Result: PASS, Date: today
6. Click "Save"
7. Verify weld updates to 100% with green "Accepted" badge
8. Verify "Accepted" milestone checkbox shows checked
9. Verify drawing progress recalculates

# Automated test verification
npm test -- scenario-3-record-nde-pass.test.tsx
# Test checks:
# - percent_complete updates from 95 to 100
# - status changes from 'active' to 'accepted'
# - progress_state.milestones["Accepted"] = true
# - field_welds.nde_result = 'PASS'
# - field_welds.nde_type = 'RT'
# - field_welds.nde_date = today
# - mv_drawing_progress refreshed
```

---

### Scenario 4: QC Inspector Records Failing NDE and Creates Repair

**File**: `tests/integration/field-welds/scenario-4-record-nde-fail.test.tsx`

**Given**: A field weld at 95% awaiting NDE

**When**: QC inspector records NDE result as FAIL

**Then**:
- System marks original weld as 100% with status "rejected" (doesn't show as work remaining)
- Prompts to create repair weld
- Generates new weld component with link to original (original_weld_id)
- Starts repair at 30% (Fit-up auto-completed via trigger)
- Repair weld ready for welding without manual Fit-up step

**Verification Steps**:
```bash
# Manual verification
1. Navigate to Drawing Table, filter field welds
2. Locate weld at 95% awaiting NDE
3. Click "Record NDE" button
4. Select Result: FAIL, Type: UT, Date: today, Notes: "Porosity detected"
5. Click "Save"
6. Verify original weld shows:
   - 100% complete
   - Red "Rejected" badge with grayed-out styling
   - All milestones checked (auto-completed by trigger)
7. Dialog automatically appears: "Create Repair Weld?"
8. Dialog pre-fills original weld details
9. Click "Create Repair"
10. Verify repair weld created:
    - Separate row in table
    - Linked to original (shows "Repair of W-001")
    - 30% complete (Fit-up milestone auto-checked)
    - Status: Active (blue badge)

# Automated test verification
npm test -- scenario-4-record-nde-fail.test.tsx
# Test checks:
# - Original weld: percent_complete = 100, status = 'rejected'
# - Original weld: all milestones = true (trigger fired)
# - Repair weld: created with original_weld_id = original.id
# - Repair weld: is_repair computed column = true
# - Repair weld: percent_complete = 30 (Fit-up auto-completed)
# - Repair weld: separate component_id and identity_key
# - Drawing progress includes both welds correctly
```

---

### Scenario 5: View Weld Progress in Drawing Table

**File**: `tests/integration/field-welds/scenario-5-view-progress.test.tsx`

**Given**: A drawing with 50 components (pipes, valves, welds)

**When**: User filters to show only field welds

**Then**:
- System displays weld-specific columns:
  - Welder (stencil + name)
  - Date Welded
  - NDE Status (type + result)
  - Status Badge (Active=blue, Accepted=green, Rejected=red/grayed)
- Shows status badges clearly indicating weld state
- Allows inline milestone updates (click checkboxes)
- Supports expansion to see full weld details

**Verification Steps**:
```bash
# Manual verification
1. Navigate to Drawing Table (/components)
2. Expand drawing with mixed component types
3. Verify all components visible (pipes, valves, field welds)
4. Click "Component Type" filter dropdown
5. Select "Field Weld" only
6. Verify table refreshes showing only field welds
7. Verify columns displayed:
   - Weld ID (identity_key)
   - Type (BW, SW, FW, TW)
   - Welder (stencil + name, or "Not Assigned")
   - Date Welded (or empty)
   - NDE Status (RT PASS, UT FAIL, etc.)
   - Status Badge (color-coded)
   - Milestones (3 checkboxes: Fit-up, Weld Complete, Accepted)
8. Test inline milestone update:
   - Click Fit-up checkbox on weld at 0%
   - Verify weld updates to 30%
   - Verify optimistic update (<50ms perceived latency)

# Automated test verification
npm test -- scenario-5-view-progress.test.tsx
# Test checks:
# - Filter by type='field_weld' returns only welds
# - Weld-specific columns rendered (Welder, NDE Status, etc.)
# - Status badges show correct color/text
# - Inline milestone updates work
# - Virtual scrolling handles 100+ welds without lag
```

---

### Scenario 6: Manage Welder Registry

**File**: `tests/integration/field-welds/scenario-6-manage-welders.test.tsx`

**Given**: A project with 15 welders

**When**: Foreman views welder page

**Then**:
- System displays table with stencil and name columns
- Allows adding new welders via simple form (stencil + name)
- Makes welders immediately available for assignment (no verification workflow)
- Validates stencil format ([A-Z0-9-]{2,12})
- Enforces unique stencil within project

**Verification Steps**:
```bash
# Manual verification
1. Navigate to Welders page (/welders)
2. Verify table displays existing welders:
   - Stencil column (e.g., "K-07", "R-05")
   - Name column (e.g., "John Smith", "Mike Johnson")
   - Actions column (Edit, Delete buttons)
3. Click "Add Welder" button
4. Dialog appears with form:
   - Stencil input (required, pattern validation)
   - Name input (required)
5. Enter stencil: "T-12", name: "Tom Wilson"
6. Click "Save"
7. Verify welder added to table immediately
8. Navigate back to Drawing Table
9. Click "Assign Welder" on any weld
10. Verify "T-12 - Tom Wilson" appears in dropdown
11. Test validation: Try adding duplicate stencil
12. Verify error toast: "Stencil already exists in this project"
13. Test deletion: Try deleting welder with assigned welds
14. Verify error toast: "Cannot delete welder with assigned welds"

# Automated test verification
npm test -- scenario-6-manage-welders.test.tsx
# Test checks:
# - Welders page renders table with data
# - Add welder dialog validates stencil pattern
# - Welder created with status='unverified' (default)
# - Welder immediately available in assignment dropdowns
# - Duplicate stencil rejected with unique constraint error
# - Cannot delete welder with assigned welds (FK constraint)
# - Can delete welder with no assignments
```

---

## Manual Testing Workflow

For full end-to-end testing without automated tests:

### 1. Setup Test Project

```bash
# Create test project via UI or Supabase Studio
# Project: "Field Weld QC Test"
# Organization: Your test organization
```

### 2. Import Sample Data

```bash
# Use provided test CSV files
tests/fixtures/field-welds/WELD-LOG-sample-100-rows.csv
tests/fixtures/field-welds/WELD-LOG-sample-2000-rows.csv

# Upload via /imports page
# Verify import completes successfully
# Check error report if any rows skipped
```

### 3. Test Full Workflow

1. **Import welds** → Verify 2000 components created
2. **Assign welders** → Mark "Weld Complete" on 10 welds
3. **Record NDE** → Pass 8 welds, fail 2 welds
4. **Create repairs** → For 2 failed welds
5. **Complete repairs** → Weld and NDE the repairs
6. **Verify progress** → Check drawing/package rollup

### 4. Test Permissions

```bash
# Create test users with different roles:
- Viewer (can view, cannot edit)
- Foreman (can assign welders, cannot record NDE)
- QC Inspector (can record NDE, cannot manage welders)
- Admin (can manage welders, can delete welds)

# Test each role's access:
1. Login as Viewer → verify read-only access
2. Login as Foreman → verify can assign welders
3. Login as QC Inspector → verify can record NDE
4. Login as Admin → verify can manage welders
```

## Troubleshooting

### Migration Errors

**Problem**: Migration fails with "relation already exists"

**Solution**:
```bash
# Check current migration state
supabase db remote list

# If migrations out of sync, manually verify:
supabase db remote execute --sql "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 10;"

# If needed, manually apply specific migration:
supabase db remote execute --file supabase/migrations/00035_create_welders_table.sql
```

### TypeScript Errors

**Problem**: TypeScript doesn't recognize new types (field_welds, welders)

**Solution**:
```bash
# Regenerate types
supabase gen types typescript --linked > src/types/database.types.ts

# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"

# Verify types exist
grep 'field_welds' src/types/database.types.ts
```

### RLS Policy Issues

**Problem**: Queries return empty results or permission denied errors

**Solution**:
```bash
# Verify RLS enabled
supabase db remote execute --sql "SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('field_welds', 'welders');"

# Check policies exist
supabase db remote execute --sql "SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('field_welds', 'welders');"

# Test policy with specific user
# (In Supabase Studio SQL Editor, use "Run as role" feature)

# Disable RLS temporarily for debugging (DO NOT USE IN PRODUCTION)
supabase db remote execute --sql "ALTER TABLE field_welds DISABLE ROW LEVEL SECURITY;"
```

### Test Failures

**Problem**: Contract tests fail with "relation does not exist"

**Solution**:
```bash
# Ensure migrations applied
supabase db push --linked

# Check test database connection
grep VITE_SUPABASE_URL .env.test

# Run tests with verbose output
npm test -- --reporter=verbose specs/014-add-comprehensive-field/contracts/
```

## Next Steps

After completing quickstart verification:

1. **Phase 2 Tasks**: Implement UI components (see tasks.md)
2. **Integration Tests**: Write full integration tests for 6 scenarios
3. **CSV Import**: Implement import-field-welds edge function
4. **Custom Hooks**: Implement useFieldWeld, useWelders, useAssignWelder, useRecordNDE
5. **UI Components**: Implement FieldWeldRow, AssignWelderDialog, RecordNDEDialog, CreateRepairDialog

## References

- **Specification**: `specs/014-add-comprehensive-field/spec.md` (58 functional requirements)
- **Research**: `specs/014-add-comprehensive-field/research.md` (10 design decisions)
- **Data Model**: `specs/014-add-comprehensive-field/data-model.md` (complete schema)
- **Contract Tests**: `specs/014-add-comprehensive-field/contracts/` (3 test files)
- **Implementation Plan**: `specs/014-add-comprehensive-field/plan.md` (Phase 2 tasks)
- **CLAUDE.md**: Project-wide patterns and conventions
