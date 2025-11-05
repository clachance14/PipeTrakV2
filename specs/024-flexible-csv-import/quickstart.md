# Quickstart Guide: Flexible CSV Import

**Feature**: 024-flexible-csv-import
**Last Updated**: 2025-11-03

## Overview

This guide helps developers set up and test the Flexible CSV Import feature locally.

---

## Prerequisites

- Node.js 18+ and npm installed
- Supabase CLI installed (`npm install -g supabase`)
- Project already set up (see main README.md)
- Existing Supabase remote database linked (`supabase link --project-ref <ref>`)

---

## Installation

### 1. Install Dependencies

```bash
# From project root
npm install papaparse
npm install --save-dev @types/papaparse
```

### 2. Verify Existing CSV Utilities

The feature reuses existing CSV normalization utilities. Verify they exist:

```bash
ls src/lib/csv/normalize-drawing.ts     # Should exist
ls src/lib/csv/normalize-size.ts        # Should exist
ls src/lib/csv/generate-identity-key.ts # Should exist
```

If missing, these were created in Feature 009 (CSV Material Takeoff Import). Check that feature's implementation.

---

## Development Setup

### 1. Create Feature Branch

```bash
git checkout -b 024-flexible-csv-import
```

### 2. Verify TypeScript Configuration

Ensure strict mode is enabled in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    // ... other settings
  }
}
```

### 3. Set Up Test Data

Create a test CSV file for development:

**File**: `test-data/flexible-import-test.csv`

```csv
DRAWINGS,Area,SPEC,System,Test Package,TYPE,DESCRIPTION,SIZE,QTY,CMDTY CODE,Comments
P-26B07 01of01,B-68,HC-05,,,Fitting,Plug Rnd Hd,1,1,OPLRAB2TMACG0530,
P-26B07 01of01,B-68,HC-05,,,Gasket,Gasket FlxG,1,3,GKPAE2IZZASG1000,Should be skipped
P-91010_1 01of02,B-68,HC-05,,,Spool,P-91010-1-SPOOL1,3,1,P-91010-1-SPOOL1,
P-91010_1 02of02,B-68,HC-05,,,Spool,P-91010-1-SPOOL4,3,1,P-91010-1-SPOOL4,
```

This tests:
- Column name variation ("DRAWINGS" instead of "DRAWING")
- Metadata fields (Area, System)
- Unsupported type (Gasket - should be skipped)
- Drawing sheets (01of02, 02of02 - separate drawings)

---

## Running Tests

### Unit Tests (CSV Utilities)

```bash
# Run all CSV utility tests
npm test src/lib/csv/

# Run specific test file
npm test src/lib/csv/column-mapper.test.ts

# Run with coverage
npm test -- --coverage src/lib/csv/
```

### Component Tests (Preview UI)

```bash
# Run all component tests
npm test src/components/

# Run specific component
npm test src/components/ImportPreview.test.tsx
```

### Integration Tests

```bash
# Run all integration tests for this feature
npm test tests/integration/flexible-import

# Run specific integration test
npm test tests/integration/flexible-import-preview.test.ts
```

### Contract Tests

```bash
# Validate TypeScript contracts match runtime behavior
npm test tests/contract/csv-import-contracts.test.ts
```

---

## Local Development Workflow

### 1. Start Development Server

```bash
npm run dev
# App available at http://localhost:5173
```

### 2. Navigate to Imports Page

```
http://localhost:5173/imports
```

### 3. Test CSV Upload Flow

1. Click "Upload CSV" button
2. Select `test-data/flexible-import-test.csv`
3. **Observe preview display** (should appear in <3 seconds):
   - File summary: 4 rows, 3 valid, 1 skipped
   - Column mappings: "DRAWINGS" → "DRAWING" (95% confidence)
   - Validation results: Warning about Gasket row
   - Metadata analysis: Area "B-68", System "HC-05"
   - Sample data: First 3 valid rows
4. Click "Confirm Import"
5. **Verify success**: 3 components created, 1 Gasket skipped

### 4. Test Edge Cases

**Missing Required Field**:
```csv
TYPE,SIZE,QTY,CMDTY CODE
Spool,3,1,TEST-SPOOL-1
```
Expected: Preview shows error "Missing required field: DRAWING", import blocked

**Duplicate Identity Key**:
```csv
DRAWING,TYPE,SIZE,QTY,CMDTY CODE
P-001,Spool,3,2,SPOOL-001
```
Expected: Preview shows error "Duplicate identity key", import blocked

**Unsupported Type**:
```csv
DRAWING,TYPE,SIZE,QTY,CMDTY CODE
P-001,Gasket,1,5,GASKET-001
```
Expected: Preview shows warning "Unsupported type: Gasket", row skipped, import proceeds for 0 components (nothing to import)

---

## Edge Function Testing

### 1. Deploy Edge Function Locally

```bash
# From project root
npx supabase functions serve import-takeoff
```

### 2. Test with curl

```bash
curl -X POST http://localhost:54321/functions/v1/import-takeoff \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -d '{
    "projectId": "proj_123",
    "rows": [{
      "drawing": "P-001",
      "type": "spool",
      "qty": 1,
      "cmdtyCode": "SPOOL-001",
      "size": "3",
      "unmappedFields": {}
    }],
    "columnMappings": [],
    "metadata": {
      "areas": [],
      "systems": [],
      "testPackages": []
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "componentsCreated": 1,
  "drawingsCreated": 1,
  "metadataCreated": { "areas": 0, "systems": 0, "testPackages": 0 },
  "componentsByType": { "spool": 1 },
  "duration": 1234
}
```

---

## Debugging Tips

### Papa Parse Issues

If CSV parsing fails:

```typescript
// Enable verbose error reporting
const result = Papa.parse<Record<string, string>>(file, {
  header: true,
  skipEmptyLines: true,
  error: (error) => {
    console.error('Papa Parse error:', error);
  }
});

// Check parsing errors
if (result.errors.length > 0) {
  console.log('Parsing errors:', result.errors);
}
```

### Column Mapping Issues

If columns aren't mapping correctly:

```typescript
// Log column headers detected
console.log('CSV columns:', result.meta.fields);

// Log mapping results
const mappingResult = mapColumns(result.meta.fields);
console.log('Mappings:', mappingResult.mappings);
console.log('Unmapped:', mappingResult.unmappedColumns);
console.log('Missing required:', mappingResult.missingRequiredFields);
```

### Validation Issues

If validation categorization is wrong:

```typescript
// Log validation results by category
const summary = generateValidationSummary(results);
console.log('Valid:', summary.validCount);
console.log('Skipped:', summary.skippedCount);
console.log('Errors:', summary.errorCount);

// Log specific error/skipped rows
summary.resultsByStatus.error.forEach(r => {
  console.log(`Row ${r.rowNumber}: ${r.reason}`);
});
```

### Edge Function Issues

If import fails on server:

```bash
# View Edge Function logs
npx supabase functions logs import-takeoff

# Check for transaction errors
grep "transaction" <function-logs>
grep "error" <function-logs>
```

---

## Common Development Tasks

### Add New Column Synonym

Edit `contracts/column-mapping.ts`:

```typescript
export const COLUMN_SYNONYMS: SynonymMap = {
  'DRAWING': [..., 'NEW_SYNONYM'],
  // ...
};
```

### Add New Validation Rule

Edit `src/lib/csv/csv-validator.ts`:

```typescript
// Add new validation check
if (row.SOME_FIELD && !isValid(row.SOME_FIELD)) {
  return {
    rowNumber: i,
    status: 'error',
    reason: 'Invalid SOME_FIELD format',
    category: 'malformed_data'
  };
}
```

### Adjust Performance Targets

Edit validation in `src/lib/csv/metadata-analyzer.ts`:

```typescript
// Change preview display timeout
const PREVIEW_TIMEOUT_MS = 3000; // Current: 3 seconds

// Change batch query size
const BATCH_SIZE = 1000; // Current: all unique values in single query
```

---

## Environment Variables

Required for this feature (should already be set):

```bash
# .env file
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

No new environment variables required for this feature.

---

## Troubleshooting

### Issue: Preview doesn't appear

**Check**:
1. Browser console for JavaScript errors
2. File size < 5MB
3. CSV is valid (not corrupted)
4. Papa Parse loaded correctly

**Fix**: Verify Papa Parse import and error handling

### Issue: Import fails with "Duplicate identity key"

**Check**:
1. Client-side validation detected duplicates
2. Server-side check against database

**Fix**: Review identity key generation logic, ensure normalization matches

### Issue: Metadata not created

**Check**:
1. RLS policies on areas/systems/test_packages tables
2. Transaction logs in Edge Function
3. Foreign key constraints

**Fix**: Verify RLS allows INSERT for authenticated users, check transaction atomicity

### Issue: Preview takes > 3 seconds

**Check**:
1. CSV row count (should be ≤ 1,000 for target)
2. Browser performance (check CPU/memory)
3. Validation loop efficiency

**Fix**: Profile validation code, add progressive yielding for large CSVs

---

## Next Steps

After local testing:

1. Run full test suite: `npm test`
2. Check coverage: `npm test -- --coverage`
3. Build for production: `npm run build`
4. Deploy Edge Function: `npx supabase functions deploy import-takeoff`
5. Test on staging environment
6. Create pull request

---

## Additional Resources

- [Papa Parse Documentation](https://www.papaparse.com/docs)
- [Feature Spec](./spec.md)
- [Data Model](./data-model.md)
- [Implementation Plan](./plan.md)
- [TypeScript Contracts](./contracts/)

---

**Questions or Issues?** Check the implementation notes in `specs/024-flexible-csv-import/` or review Feature 009 (original CSV import) for patterns.
