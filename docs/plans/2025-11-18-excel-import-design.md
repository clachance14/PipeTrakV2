# Excel Import Support for Material Takeoff and Field Welds

**Date:** 2025-11-18
**Status:** Design Complete
**Estimated Timeline:** 2-3 days

## Overview

Users upload Excel files (.xlsx, .xls) for Material Takeoff and Field Weld imports. The browser converts Excel to CSV, then sends the CSV to existing edge functions. This requires zero backend changes.

Excel becomes the primary import method. CSV remains available as a fallback.

## Requirements

### File Support
- Accept .xlsx (Excel 2007+) and .xls (Excel 97-2003)
- Maintain CSV support (.csv files)
- Keep 5MB file size limit
- Read first sheet only (simple data, no complex features)

### Data Structure
- Same column headers as current CSV imports
- Same validation rules
- Same error reporting format
- No changes to identity key generation or normalization

### User Experience
- Excel-first UI: "Drag Excel file or click to upload"
- Small note: "Also supports CSV files"
- Excel template downloads (.xlsx) replace CSV templates
- CSV template remains available as secondary option

## Architecture

### High-Level Flow

```
User uploads Excel (.xlsx/.xls) or CSV
    ↓
[If Excel] Browser parses with SheetJS → Converts to CSV string → Creates Blob
    ↓
Send CSV Blob to edge function (import-takeoff or import-field-welds)
    ↓
Existing validation and import pipeline (unchanged)
    ↓
Success or error response
```

### Technology Choice: SheetJS (xlsx)

**Library:** `xlsx` (SheetJS Community Edition)

**Why SheetJS:**
- Industry standard (30K+ GitHub stars)
- Supports both .xlsx and .xls formats
- Active maintenance and security updates
- ~500KB gzipped bundle size
- Used by thousands of enterprise applications

**Alternatives considered:**
- ExcelJS: Larger bundle (~1.2MB), more features we don't need
- Papa Parse: CSV only, doesn't handle Excel
- Custom parser: Too much complexity for this use case

### Zero Backend Changes

All backend code remains unchanged:
- Edge functions: `import-takeoff`, `import-field-welds`
- Validation logic
- Transaction processing
- RLS policies
- Database schema

## Implementation Details

### Excel Conversion Utility

**File:** `src/lib/excel/excel-to-csv.ts`

```typescript
import * as XLSX from 'xlsx'

export function excelToCsv(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        // Read first sheet only
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]

        // Convert to CSV
        const csv = XLSX.utils.sheet_to_csv(firstSheet, {
          strip: true,        // Remove trailing spaces
          blankrows: false,   // Skip empty rows
          FS: ',',           // Field separator: comma
          RS: '\n'           // Row separator: newline
        })

        resolve(csv)
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error.message}`))
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}
```

**Error Handling:**
- Corrupted files → "Unable to read Excel file. Please check the file and try again."
- Empty sheets → "Excel file contains no data"
- Invalid format → Caught by dropzone validation before conversion
- Large files → Caught by existing 5MB size validation

### UI Changes

#### Dropzone Updates

**Files to modify:**
- `src/components/ImportPage.tsx` (Material Takeoff)
- `src/components/import/FieldWeldImportPage.tsx` (Field Welds)

**Accept configuration:**
```typescript
accept: {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv'],
}
```

**onDrop handler:**
```typescript
onDrop: async (acceptedFiles) => {
  const file = acceptedFiles[0]

  let csvFile = file
  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    const csvString = await excelToCsv(file)
    csvFile = new File([csvString], file.name.replace(/\.xlsx?$/i, '.csv'), {
      type: 'text/csv'
    })
  }

  await importMutation.mutateAsync({ project_id, csv_file: csvFile })
}
```

#### User Messages

**Dropzone text:**
- Main: "Drag Excel file or click to upload"
- Subtext: "Also supports CSV files • Maximum size: 5MB"
- Format badge: "Accepts: .xlsx, .xls, .csv"

**Progress messages:**
- "Converting Excel..." (appears briefly during conversion)
- "Validating..." (existing message)
- "Importing components..." (existing message)

#### Template Downloads

**Excel template button (primary):**
- Label: "Download Excel Template"
- Generates .xlsx file using SheetJS
- Contains header row + 2-3 example rows
- Auto-sized columns for readability

**CSV template link (secondary):**
- Label: "Prefer CSV? Download CSV template"
- Smaller font, less prominent
- Keeps existing CSV generation logic

**Template generation:**
```typescript
import * as XLSX from 'xlsx'

function generateExcelTemplate() {
  const data = [
    ['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE', 'SPEC', 'DESCRIPTION', 'SIZE', 'Comments'],
    ['P-001', 'Valve', '2', 'VBALU-001', 'ES-03', 'Ball Valve Cl150', '1', 'Example'],
    ['DRAIN-1', 'Flange', '1', 'FBLAG2DFA2351215', 'ES-03', 'Blind Flange', '2', 'Example']
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Material Takeoff')

  XLSX.writeFile(workbook, 'material-takeoff-template.xlsx')
}
```

## Testing Strategy

### Unit Tests

**File:** `src/lib/excel/excel-to-csv.test.ts`

Tests:
1. Parse valid .xlsx file → returns correct CSV string
2. Parse valid .xls file → returns correct CSV string
3. Handle corrupted Excel → throws descriptive error
4. Handle empty sheets → throws "no data" error
5. Preserve special characters (quotes, commas in cells)
6. Strip trailing spaces correctly
7. Skip blank rows

**Coverage target:** ≥80% (matches `src/lib/**` requirement)

### Integration Tests

**File:** `tests/integration/excel-import.test.ts`

Tests:
1. Excel Material Takeoff → creates components correctly
2. Excel Field Welds → creates welds with correct data
3. Mixed session: Excel and CSV both work
4. Large Excel (4.9MB) → completes successfully
5. Excel with formulas → uses displayed values only
6. RLS enforcement: user imports only to their projects

### Contract Tests

**File:** `tests/contract/import/excel-conversion.contract.test.ts`

Tests:
1. Excel headers match CSV requirements exactly
2. Drawing normalization: Excel vs CSV produces identical results
3. Identity key generation: Excel vs CSV produces identical keys
4. Component type lowercase: Excel data normalized correctly
5. SIZE normalization: Excel data handled same as CSV

### E2E Tests

**File:** `tests/e2e/excel-import.spec.ts`

Tests:
1. Upload .xlsx Material Takeoff → see success message
2. Upload .xls Field Welds → see progress and completion
3. Download Excel template → file opens correctly
4. Invalid file type → error before upload starts
5. Template download → contains correct headers and examples

**Coverage requirements:**
- Overall: ≥70%
- `src/lib/excel/**`: ≥80%
- Component changes: ≥60%

## Migration and Rollout

### Backward Compatibility

No breaking changes:
- CSV imports work unchanged
- Edge functions unchanged
- Database schema unchanged
- Existing user workflows unaffected

### Deployment Steps

1. **Install dependencies**
   ```bash
   npm install xlsx
   ```
   Bundle size impact: ~500KB gzipped

2. **Add Excel conversion utility**
   - Create `src/lib/excel/excel-to-csv.ts`
   - Write unit tests
   - Verify all tests pass

3. **Update import components**
   - Modify `ImportPage.tsx`
   - Modify `FieldWeldImportPage.tsx`
   - Add Excel template generation
   - Update dropzone configuration

4. **Run full test suite**
   - Unit tests
   - Integration tests
   - Contract tests
   - E2E tests

5. **Deploy to staging**
   - Test with real .xlsx files
   - Test with real .xls files
   - Test CSV still works
   - Verify templates download correctly

6. **Deploy to production**
   - Optional: Use feature flag for gradual rollout
   - Monitor error rates
   - Track Excel vs CSV upload ratio

### Rollback Plan

Safe rollback options:
- Feature flag disables Excel upload
- CSV import always available
- No database migrations to reverse
- Instant rollback possible

### User Communication

**In-app announcement:**
"You can now upload Excel files for faster, easier imports!"

**Email to existing users:**
Subject: "New: Upload Excel files directly"
Body: "Material Takeoff and Field Weld imports now accept Excel files (.xlsx, .xls). Your existing CSV workflows continue to work."

**Documentation updates:**
- Update help docs to show Excel as primary option
- Add screenshots of Excel template
- Note CSV still supported

## Timeline

**Estimated: 2-3 days**

**Day 1: Core functionality**
- Install SheetJS
- Implement `excel-to-csv.ts`
- Write unit tests
- Verify conversion works

**Day 2: UI integration**
- Update ImportPage components
- Add Excel template generation
- Write integration tests
- Test with real Excel files

**Day 3: Testing and deployment**
- Write contract tests
- Write E2E tests
- Deploy to staging
- Validate and deploy to production

## Success Metrics

Track after deployment:
- Excel upload adoption rate (target: >70% of imports use Excel within 1 month)
- Error rate for Excel vs CSV (should be equal or lower)
- User support tickets (should not increase)
- Template download ratio (Excel vs CSV)
- Average file size (Excel may be slightly larger than CSV)

## Future Enhancements

Not currently planned:
- Multi-sheet support (import from multiple sheets in one file)
- Formula evaluation (currently uses displayed values only)
- Column mapping UI (flexible column names)
- Excel file validation preview (show data before import)
- Batch upload (multiple Excel files at once)

## References

**Related features:**
- Feature 009: CSV Material Takeoff Import (`specs/009-sprint-3-material/`)
- Feature 014: Field Weld Import (`specs/014-add-comprehensive-field/`)

**Code files:**
- Edge functions: `supabase/functions/import-takeoff/`, `supabase/functions/import-field-welds/`
- Client utilities: `src/lib/csv/`
- Import components: `src/components/ImportPage.tsx`, `src/components/import/FieldWeldImportPage.tsx`

**Documentation:**
- `CLAUDE.md`: Top 10 rules, testing requirements
- `docs/PROJECT-STATUS.md`: Feature history
- `specs/009-sprint-3-material/IMPLEMENTATION-NOTES.md`: CSV import implementation details
