# Feature 009 - CSV Material Takeoff Import
## Implementation Notes

**Status**: ✅ Complete
**Completed**: 2025-10-19
**Last Updated**: 2025-10-19

---

## Summary

Successfully implemented CSV Material Takeoff import functionality with SIZE-aware identity keys, comprehensive validation, and transaction safety. Users can now upload material takeoff CSV files to populate project components with full duplicate detection and error reporting.

---

## Key Implementation Decisions

### 1. SIZE-Aware Identity Keys (CRITICAL)

**Decision**: Include SIZE field in all identity key generation

**Rationale**:
- Two components with the same commodity code but different sizes (e.g., 2" valve vs 1" valve) must be treated as unique components
- Original implementation without SIZE caused false duplicate detection errors
- SIZE is a critical distinguishing characteristic for industrial piping components

**Implementation**:
```typescript
// JSONB identity key structure
{
  "drawing_norm": "P-001",
  "commodity_code": "VBALU-001",
  "size": "2",          // ← Added SIZE field
  "seq": 1
}
```

**SIZE Normalization**:
- `"2"` → `"2"`
- `"1/2"` → `"1X2"` (slash replaced for URL safety)
- `""` or missing → `"NOSIZE"`
- Removes quotes, spaces, uppercases

### 2. Drawing Normalization Matching Database Trigger

**Decision**: TypeScript normalization MUST match database trigger exactly

**Rationale**:
- Initial implementation stripped hyphens and leading zeros
- Database trigger keeps hyphens and zeros: `UPPER(TRIM(regexp_replace(raw, '\s+', ' ', 'g')))`
- Mismatch caused "Drawing not found" errors after insert

**Implementation**:
```typescript
// src/lib/csv/normalize-drawing.ts
export function normalizeDrawing(raw: string): string {
  return raw
    .trim()                    // TRIM
    .toUpperCase()             // UPPER
    .replace(/\s+/g, ' ');    // Collapse multiple spaces to single space
  // ← NO hyphen/underscore removal
  // ← NO leading zero stripping
}
```

**Examples**:
- `"P-001"` → `"P-001"` (unchanged)
- `" DRAIN-1 "` → `"DRAIN-1"` (trimmed)
- `"p  -  001"` → `"P - 001"` (uppercased, spaces collapsed)

### 3. Lowercase Component Types

**Decision**: Convert component types to lowercase before database insert

**Rationale**:
- Database validation function expects lowercase types ('valve', 'instrument', etc.)
- CSV files use capitalized types ('Valve', 'Instrument', etc.)
- Validation constraint was failing due to case mismatch

**Implementation**:
```typescript
// supabase/functions/import-takeoff/transaction.ts
components.push({
  component_type: row.TYPE.toLowerCase(), // Valve → valve
  // ...
});
```

### 4. Fresh Import Model (No Deduplication)

**Decision**: Assume fresh import every time, no deduplication of existing data

**Rationale**:
- Primary use case is populating new projects
- Simpler architecture without complex "check existing" logic
- Users can delete and re-import if needed
- Clear error messages if drawings already exist

---

## Bug Fixes

### Bug #1: Duplicate Detection False Positives

**Issue**: Rows 54 (2" valve) and 55 (1" valve) flagged as duplicates despite different sizes

**Root Cause**: SIZE field not included in identity key generation

**Symptoms**:
```
Error: Duplicate identity key "PW-55401-VBALU-001-001"
found in rows: 54 ("PW-55401"), 55 ("PW-55401")
```

**Fix**: Added SIZE parameter to `generateIdentityKey()` function
- Updated: `/src/lib/csv/generate-identity-key.ts`
- Updated: `/supabase/functions/import-takeoff/validator.ts` (duplicate detection)
- Updated: `/supabase/functions/import-takeoff/transaction.ts` (component creation)

**Result**: 2" valve and 1" valve now generate unique identity keys:
- `PW-55401-2-VBALU-001-001` (2" valve)
- `PW-55401-1-VBALU-001-001` (1" valve)

### Bug #2: Drawing Normalization Mismatch

**Issue**: "Drawing not found: DRAIN-1 (normalized: DRAIN1)" after successful insert

**Root Cause**: TypeScript normalized to "DRAIN1", database normalized to "DRAIN-1"

**Symptoms**:
```
Error: We're searching for: [DRAIN1, DRAIN2, ...]
But database has: [DRAIN-1, DRAIN-2, ...]
```

**Fix**: Updated TypeScript normalization to match database trigger exactly
- Updated: `/src/lib/csv/normalize-drawing.ts`
- Updated: `/supabase/functions/import-takeoff/transaction.ts`
- Updated: `/supabase/functions/import-takeoff/validator.ts`

**Before**:
```typescript
.replace(/[-_\s]+/g, '')  // Removed hyphens
.replace(/^0+/, '')       // Stripped leading zeros
```

**After**:
```typescript
.replace(/\s+/g, ' ')     // Only collapse spaces
// Keeps hyphens and leading zeros
```

### Bug #3: Component Type Validation Constraint Failure

**Issue**: `new row for relation "components" violates check constraint "chk_identity_key_structure"`

**Root Cause**: Database validation function expects lowercase types, CSV provides capitalized types

**Symptoms**:
```
Error: Failed to create components (batch 1):
check constraint "chk_identity_key_structure"
```

**Fix**: Convert component types to lowercase before insert
- Updated: `/supabase/functions/import-takeoff/transaction.ts` (line 192)
- Updated: `/src/lib/csv/explode-quantity.ts` (line 55)
- Updated contract tests to verify lowercase conversion

**Component Type Mapping**:
- `Valve` → `valve`
- `Instrument` → `instrument`
- `Support` → `support`
- `Pipe` → `pipe`
- `Fitting` → `fitting`
- `Flange` → `flange`

### Bug #4: Missing 'pipe' Component Type Validation

**Issue**: Progress templates use 'pipe', but validation function only had 'threaded_pipe'

**Root Cause**: `validate_component_identity_key` function incomplete

**Fix**: Created migration 00017 to add 'pipe' type validation
- Created: `/supabase/migrations/00017_add_pipe_component_type.sql`
- Updated: `validate_component_identity_key` function in database

### Bug #5: Duplicate Detection Only Showed Second Occurrence

**Issue**: Error messages only showed the duplicate occurrence, not the first occurrence

**Root Cause**: Tracking logic only recorded subsequent duplicates

**Fix**: Updated duplicate tracking to include first occurrence
- Updated: `/supabase/functions/import-takeoff/validator.ts` (checkDuplicateIdentityKeys)

**Before**:
```
Error: Duplicate identity key found in row: 55
```

**After**:
```
Error: Duplicate identity key found in rows: 54 ("PW-55401"), 55 ("PW-55401")
```

---

## Database Migrations

### Migration 00016: Progress Templates for Pipe, Fitting, Flange
**File**: `supabase/migrations/00016_add_pipe_fitting_flange_templates.sql`
**Purpose**: Add progress templates for material component types

**Templates Added**:
- **Pipe**: Receive (50%) → Install (50%)
- **Fitting**: Receive (50%) → Install (50%)
- **Flange**: Receive (50%) → Install (50%)

**Workflow Type**: Discrete (boolean milestones)

### Migration 00017: Add 'pipe' Component Type Validation
**File**: `supabase/migrations/00017_add_pipe_component_type.sql`
**Purpose**: Add 'pipe' type to `validate_component_identity_key` function

**Changes**:
- Added 'pipe' WHEN clause to validation function
- Ensures 'pipe' type accepts JSONB identity keys with: drawing_norm, commodity_code, size, seq

---

## Edge Function Implementation

### Architecture

**Location**: `supabase/functions/import-takeoff/`

**Files**:
1. **index.ts** - Main handler
   - CORS preflight handling
   - JWT authentication
   - User permission validation
   - Orchestrates parsing → validation → processing

2. **parser.ts** - CSV parsing
   - PapaParse integration (Deno-compatible)
   - Header trimming
   - Row extraction

3. **validator.ts** - Validation logic
   - File size validation (5MB max)
   - Row count validation (10,000 rows max)
   - Required columns validation
   - Data type validation
   - Component type validation
   - **SIZE-aware duplicate detection** ← Critical fix

4. **transaction.ts** - Database operations
   - Drawing normalization (matches database trigger)
   - Drawing insert/fetch (separated for service role compatibility)
   - Component creation with SIZE-aware identity keys
   - Progress template assignment
   - Batch inserts (1000 per batch)
   - Transaction safety

### Performance Optimizations

1. **Batch Inserts**: 1000 components per batch (PostgreSQL parameter limit ~65535)
2. **Single Transaction**: All-or-nothing atomicity
3. **Service Role Client**: Bypasses RLS for performance
4. **Separate Insert/Fetch**: Workaround for service role .select() limitations

**Benchmark**: 78-row CSV → ~203 components in <5 seconds

---

## Client-Side Implementation

### Components

1. **ImportPage** (`src/components/ImportPage.tsx`)
   - React-dropzone integration
   - Drag-and-drop file upload
   - File size validation
   - Import progress display
   - Error reporting with downloadable CSV

2. **ImportProgress** (`src/components/ImportProgress.tsx`)
   - Real-time progress feedback
   - Success summary display
   - Error list with row numbers

3. **ErrorReportDownload** (`src/components/ErrorReportDownload.tsx`)
   - CSV generation from error data
   - Browser download trigger

### Custom Hooks

**useImport** (`src/hooks/useImport.ts`)
- TanStack Query mutation
- Session token management
- Edge Function invocation
- Error handling (validation vs system errors)
- Response parsing

### Utility Functions

**Location**: `src/lib/csv/`

1. **normalize-drawing.ts** - Drawing normalization (matches database)
2. **normalize-size.ts** - SIZE normalization with URL-safe formatting
3. **generate-identity-key.ts** - SIZE-aware identity key generation
4. **explode-quantity.ts** - QTY explosion into discrete components
5. **diagnose-duplicates.ts** - Client-side duplicate diagnostics

---

## Testing

### Contract Tests

**Location**: `tests/contract/import/`

1. **drawing-normalization.contract.test.tsx** (11 tests) ✓
   - Verifies normalization matches database trigger
   - Tests hyphen/underscore preservation
   - Tests leading zero preservation
   - Tests space collapsing

2. **quantity-explosion.contract.test.tsx** (6 tests) ✓
   - Verifies SIZE-aware identity key generation
   - Tests QTY explosion logic
   - Tests component_type lowercase conversion
   - Tests attributes population

3. **validation.contract.test.tsx** (9 tests) ✓
   - Validates required columns
   - Validates data types
   - Validates component types
   - Validates file size/row limits

4. **auth.contract.test.ts** (8 tests) ✓
   - Tests JWT authentication
   - Tests permission validation
   - Tests project access control

**Total**: 34 tests passing ✓

### Coverage

- Overall: `src/lib/csv/**` ≥80%
- All critical paths tested
- Edge cases covered (missing SIZE, empty rows, large quantities)

---

## Critical Implementation Details

### Identity Key JSONB Schema

**MUST match database validation function exactly**:

```typescript
// Non-instruments
{
  "drawing_norm": string,    // ← NOT "drawing"
  "commodity_code": string,  // ← NOT "cmdty_code"
  "size": string,           // ← REQUIRED (added in bug fix)
  "seq": number             // ← Must be number type
}
```

### Drawing Normalization Algorithm

**MUST match database function normalize_drawing_number()**:

```sql
-- Database (PostgreSQL)
UPPER(TRIM(regexp_replace(raw, '\s+', ' ', 'g')))
```

```typescript
// TypeScript (MUST MATCH)
raw.trim().toUpperCase().replace(/\s+/g, ' ')
```

**Does NOT**:
- Remove hyphens
- Remove underscores
- Strip leading zeros
- Remove special characters

### SIZE Normalization Algorithm

```typescript
export function normalizeSize(raw: string | undefined): string {
  if (!raw || raw.trim() === '') {
    return 'NOSIZE';
  }

  return raw
    .trim()
    .replace(/["'\s]/g, '')    // Remove quotes and spaces
    .replace(/\//g, 'X')       // Replace / with X (1/2 → 1X2)
    .toUpperCase();
}
```

**Examples**:
- `"2"` → `"2"`
- `"1/2"` → `"1X2"`
- `" 3/4\" "` → `"3X4"`
- `""` → `"NOSIZE"`

---

## Deployment Steps

### Edge Function Deployment

```bash
# Deploy Edge Function
supabase functions deploy import-takeoff

# Verify deployment
curl https://[project-ref].supabase.co/functions/v1/import-takeoff \
  -H "Authorization: Bearer [token]"
```

### Database Migrations

```bash
# Apply migrations
supabase db push

# Verify migrations
supabase db diff
```

---

## User Guide

### CSV Format Requirements

**Required Columns**: DRAWING, TYPE, QTY, CMDTY CODE
**Optional Columns**: SPEC, DESCRIPTION, SIZE, Comments

**Valid Types**: Valve, Instrument, Support, Pipe, Fitting, Flange

**Example CSV**:
```csv
DRAWING,TYPE,QTY,CMDTY CODE,SPEC,DESCRIPTION,SIZE,Comments
P-001,Valve,2,VBALU-001,ES-03,Ball Valve Cl150,1,Example valve
DRAIN-1,Flange,1,FBLAG2DFA2351215,ES-03,Blind Flange,2,Example flange
PW-55401,Instrument,1,ME-55402,EN-14,Pressure Gauge,1/2,Example instrument
```

### Import Workflow

1. Navigate to `/imports` page
2. Drag-and-drop CSV file (or click to browse)
3. Wait for validation and processing
4. Review success summary or download error report
5. Verify components in ComponentsPage

### Error Handling

**Validation Errors** (HTTP 400):
- Missing required columns
- Invalid component types
- Duplicate identity keys
- Invalid data types
- File too large
- Too many rows

**System Errors** (HTTP 500):
- Database connection failures
- Transaction failures
- Unexpected errors

**User Actions**:
- Download error report CSV
- Fix errors in source CSV
- Delete imported drawings if needed
- Re-upload corrected CSV

---

## Lessons Learned

### 1. Always Match Database Behavior Exactly

**Issue**: TypeScript normalization differed from database trigger
**Learning**: Read database migration files, understand triggers, match behavior precisely
**Prevention**: Contract tests that verify TypeScript ↔ Database alignment

### 2. Field Names Matter in JSONB Constraints

**Issue**: Used "drawing" instead of "drawing_norm" in identity_key
**Learning**: JSONB schema validation is strict, field names must match exactly
**Prevention**: Read validation function code, document schema requirements

### 3. Case Sensitivity in Component Types

**Issue**: Capitalized types failed lowercase validation
**Learning**: Database enums/validations may have different case expectations than UI
**Prevention**: Normalize case early in processing pipeline

### 4. SIZE is Critical for Identity

**Issue**: Forgot to include SIZE in identity keys initially
**Learning**: All distinguishing characteristics must be in identity keys
**Prevention**: Domain knowledge + user feedback → schema iteration

### 5. Service Role Limitations

**Issue**: .select() after .insert() didn't return data with service role
**Learning**: Service role bypasses RLS but may have other limitations
**Prevention**: Separate insert and fetch operations for service role contexts

---

## Future Enhancements

### Potential Improvements (Not Currently Planned)

1. **Incremental Updates**: Support updating existing components instead of fresh import only
2. **CSV Templates**: Downloadable template CSV with example data
3. **Import History**: Track import metadata (user, timestamp, file name, row count)
4. **Dry Run Mode**: Preview import results without committing
5. **Column Mapping**: Allow flexible column names with mapping UI
6. **Batch Import**: Support multiple files in one upload
7. **Undo Import**: Soft delete components with rollback capability

---

## References

### Database Functions

- `normalize_drawing_number()` - Migration 00009
- `validate_component_identity_key()` - Migration 00010
- Database trigger `normalize_drawing_on_insert` - Migration 00009

### Code Files

**Edge Function**:
- `/supabase/functions/import-takeoff/index.ts`
- `/supabase/functions/import-takeoff/parser.ts`
- `/supabase/functions/import-takeoff/validator.ts`
- `/supabase/functions/import-takeoff/transaction.ts`

**Client Utilities**:
- `/src/lib/csv/normalize-drawing.ts`
- `/src/lib/csv/normalize-size.ts`
- `/src/lib/csv/generate-identity-key.ts`
- `/src/lib/csv/explode-quantity.ts`

**Components**:
- `/src/components/ImportPage.tsx`
- `/src/components/ImportProgress.tsx`
- `/src/components/ErrorReportDownload.tsx`

**Hooks**:
- `/src/hooks/useImport.ts`

**Tests**:
- `/tests/contract/import/*.test.tsx`

### Documentation

- `CLAUDE.md` - Feature 009 section
- `Documents/implementation/PROJECT-STATUS.md` - Feature 009 entry
- This file: Implementation notes and bug fixes

---

**End of Implementation Notes**
