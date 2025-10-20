# Quickstart: Material Takeoff Import Pipeline

**Feature**: 009-sprint-3-material
**Date**: 2025-10-17
**Purpose**: End-to-end verification workflow for CSV import feature

---

## Prerequisites

### 1. Local Environment Setup
```bash
# Ensure Supabase CLI installed
supabase --version  # Should be v1.150.0+

# Start local Supabase
cd /home/clachance14/projects/PipeTrak_V2
supabase start

# Apply all migrations (including 00016)
supabase db reset

# Start frontend dev server
npm run dev
```

### 2. Test Data
**File**: `TAKEOFF - 6031.csv` (78 rows, included in repository root)
**Contents**: Real material takeoff data with 6 component types (Valve, Instrument, Support, Pipe, Fitting, Flange)
**Expected Output**: ~203 discrete components after quantity explosion

---

## Verification Steps

### Step 1: Create Test User & Project

1. Navigate to `http://localhost:5173/register`
2. Register new user:
   - Email: `test@pipetrak.local`
   - Password: `TestPassword123!`
   - Full Name: `Test User`
   - Organization: `Test Construction Co`
3. Accept Terms of Service
4. Complete onboarding wizard
5. Create test project:
   - Project Name: `Quickstart Test Project`
   - Project Code: `QST-001`
   - Status: Active

**Expected**: User logged in, project created and selected

---

### Step 2: Verify Progress Templates

1. Open Supabase Studio: `http://localhost:54323`
2. Navigate to Table Editor → `progress_templates`
3. Filter by `component_type IN ('Pipe', 'Fitting', 'Flange')`

**Expected**:
- 3 rows visible
- Each row has:
  - `workflow_type = 'discrete'`
  - `milestones` array with 2 elements (Receive 50%, Install 50%)
  - `version = '1.0.0'`

---

### Step 3: Upload CSV (Success Path)

1. Navigate to `http://localhost:5173/imports`
2. Drag-and-drop `TAKEOFF - 6031.csv` into upload zone (or click to browse)
3. Observe upload progress bar (should show 0% → 100%)
4. Wait for processing to complete

**Expected**:
- Success message: "Successfully imported 203 components from 78 rows. 0 rows skipped."
- Import time: <5 seconds
- No errors displayed

---

### Step 4: Verify Components Created

1. Navigate to `http://localhost:5173/components`
2. Check component count in header: should show **203 components**
3. Filter by component type:
   - **Valve**: Should see identity keys like `VBALU-SECBFLR00M-006-001`, `VBALU-SECBFLR00M-006-002`, etc.
   - **Instrument**: Should see identity keys like `ME-55402`, `PIT-55406`, `FE-55403` (no suffix)
   - **Support**: Should see identity keys like `G4G-1412-05AA-001-6-6-001`, `-002`, `-003`
   - **Pipe**: Components with TYPE = Pipe visible
   - **Fitting**: Components with TYPE = Fitting visible
   - **Flange**: Components with TYPE = Flange visible

4. Click on any component to view details
5. Verify attributes JSONB contains:
   ```json
   {
     "spec": "ES-03",
     "description": "Blind Flg B16.5 cl150...",
     "size": "2",
     "cmdty_code": "FBLAG2DFA2351215",
     "comments": "",
     "original_qty": 1
   }
   ```

**Expected**:
- All 203 components visible in list
- Identity keys generated correctly (sequential for exploded quantities)
- Attributes populated from CSV
- Progress templates assigned (Pipe/Fitting/Flange have 2 milestones)

---

### Step 5: Verify Drawings Auto-Created

1. In Supabase Studio, navigate to Table Editor → `drawings`
2. Filter by `project_id = {test project UUID}`

**Expected**:
- **~12 unique drawings** created (estimated based on unique DRAWING values in CSV)
- Each drawing has:
  - `drawing_norm` (normalized): "DRAIN1", "P55501", "PW55401", etc.
  - `raw_drawing_no` (original): "DRAIN-1", "P-55501", "PW-55401", etc.
  - `is_retired = false`
  - `title` (empty or NULL for auto-created drawings)

**Manual Verification**:
```sql
SELECT
  drawing_norm,
  raw_drawing_no,
  COUNT(*) as component_count
FROM drawings d
JOIN components c ON c.drawing_id = d.id
WHERE d.project_id = '{test project UUID}'
GROUP BY d.id
ORDER BY component_count DESC;
```

Expected output:
```
drawing_norm | raw_drawing_no | component_count
-------------|----------------|----------------
PW55401      | PW-55401       | ~35
P55501       | P-55501        | ~24
DRAIN1       | DRAIN-1        | 3
```

---

### Step 6: Verify Progress Templates Assigned

1. In components table, check `progress_template_id` column
2. Join with `progress_templates` to verify component types match template types:

```sql
SELECT
  c.component_type,
  pt.component_type as template_type,
  COUNT(*) as count
FROM components c
JOIN progress_templates pt ON c.progress_template_id = pt.id
WHERE c.project_id = '{test project UUID}'
GROUP BY c.component_type, pt.component_type;
```

**Expected**:
- Valve components → Valve template
- Instrument components → Instrument template
- Support components → Support template
- Pipe components → **Pipe template** (NEW)
- Fitting components → **Fitting template** (NEW)
- Flange components → **Flange template** (NEW)

---

### Step 7: Test Error Reporting (Invalid CSV)

1. Create invalid CSV file `test-invalid.csv`:
   ```csv
   DRAWING,SPEC,TYPE
   P-001,ES-03,Valve
   ```
   (Missing required columns: QTY, CMDTY CODE)

2. Navigate to `http://localhost:5173/imports`
3. Upload `test-invalid.csv`

**Expected**:
- Error message: "Import failed: 2 errors found. Download error report for details."
- "Download Error Report" button visible
- Click button → CSV file downloads

4. Open downloaded `import-errors-{timestamp}.csv`:
   ```csv
   Row,Column,Reason
   0,QTY,"Missing required column: QTY"
   0,"CMDTY CODE","Missing required column: CMDTY CODE"
   ```

**Expected**:
- Error CSV downloads successfully
- Error CSV contains 2 rows (1 per missing column)
- Zero components created (transaction rollback verified)

---

### Step 8: Test Validation (Invalid Data Types)

1. Create CSV with invalid QTY: `test-invalid-qty.csv`:
   ```csv
   DRAWING,SPEC,TYPE,DESCRIPTION,SIZE,QTY,CMDTY CODE,Comments
   P-001,ES-03,Valve,Test Valve,2,ABC,V001,
   ```

2. Upload file

**Expected**:
- Error message: "Import failed: 1 error found."
- Download error report:
   ```csv
   Row,Column,Reason
   2,QTY,"Invalid data type (expected number)"
   ```
- Zero components created

---

### Step 9: Test Transaction Rollback

1. Create CSV with duplicate identity keys (same CMDTY CODE + TYPE, QTY>1):
   ```csv
   DRAWING,TYPE,QTY,CMDTY CODE
   P-001,Valve,2,VTEST-001
   P-002,Valve,2,VTEST-001
   ```
   (Both rows create VTEST-001-001 and VTEST-001-002 → duplicate keys)

2. Upload file

**Expected**:
- Error message: "Import failed: Duplicate identity keys found."
- Download error report showing duplicate keys
- **Zero components created** (verify via component count before/after upload)

**Manual Verification**:
```sql
SELECT COUNT(*) FROM components WHERE project_id = '{test project UUID}';
-- Count should remain 203 (no new components)
```

---

### Step 10: Performance Validation

1. Measure import time for TAKEOFF - 6031.csv (78 rows):
   - Start timer when upload begins
   - Stop timer when success message appears
   - **Expected**: <5 seconds

2. (Optional) Test with larger CSV (generate 1,000-row CSV by duplicating rows):
   ```bash
   # Generate 1k-row test CSV
   head -1 "TAKEOFF - 6031.csv" > test-1k.csv
   for i in {1..13}; do
     tail -n +2 "TAKEOFF - 6031.csv" >> test-1k.csv
   done
   ```
   - Upload `test-1k.csv`
   - **Expected**: <60 seconds, ~3,000 components created

---

## Success Criteria Checklist

- [x] User can upload TAKEOFF - 6031.csv via drag-and-drop
- [x] 203 components created from 78 CSV rows
- [x] Quantity explosion works correctly (QTY=4 → 4 discrete components)
- [x] Identity keys generated correctly (sequential suffixes, no suffix for Instruments)
- [x] Drawings auto-created with normalization (DRAIN-1 → DRAIN1)
- [x] Attributes populated from CSV (spec, description, size, cmdty_code, comments)
- [x] Progress templates assigned (Pipe, Fitting, Flange use new templates)
- [x] Invalid CSV rejected with downloadable error report
- [x] Transaction rollback on validation errors (zero components created)
- [x] Import completes in <5 seconds for 78-row CSV
- [x] All components visible in components table
- [x] No TypeScript errors, no console warnings

---

## Cleanup

```bash
# Stop local Supabase
supabase stop

# (Optional) Reset database for fresh start
supabase db reset
```

---

## Troubleshooting

### Import fails with "Unauthorized" error
**Cause**: User doesn't have access to project
**Fix**: Verify user is member of project's organization in `user_organizations` table

### Components created but drawings missing
**Cause**: Drawing normalization collision (two different raw numbers normalize to same value)
**Fix**: Check `drawing_norm` uniqueness constraint, verify normalization logic

### Progress templates not assigned
**Cause**: Migration 00016 not applied or component_type mismatch
**Fix**: Run `supabase db reset` to re-apply migrations

### Import times out after 30 seconds
**Cause**: Edge Function timeout (default 30s)
**Fix**: Increase timeout in `supabase/functions/import-takeoff/index.ts` config or reduce CSV size

---

**Quickstart Complete**: All verification steps documented with expected results and troubleshooting guide. Feature ready for testing.
