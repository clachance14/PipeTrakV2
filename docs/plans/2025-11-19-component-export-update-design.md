# Component Export and Update via Excel

**Status**: Design Complete
**Date**: 2025-11-19
**Feature Branch**: 029-excel-import-support

## Overview

Enable users to export components to Excel, modify metadata and attributes in Excel, and re-import to update existing components in bulk. This supports administrative workflows like reassigning areas, systems, and test packages across many components.

## Requirements

**Use Case**: Bulk editing existing component metadata
**Scope**: All 11 component types
**Editable Fields**:
- Metadata assignments: `area_id`, `system_id`, `test_package_id`
- Component attributes: Fields in `attributes` JSONB (size, spec, commodity_code, etc.)
- Drawing assignment: `drawing_id`

**Non-Editable Fields**:
- Identity fields: `weld_number`, `spool_id` (immutable after creation)
- Progress fields: `percent_complete`, `current_milestones`
- System fields: `created_at`, `created_by`, `last_updated_at`, `last_updated_by`

**Matching Strategy**: Hybrid - UUID preferred, fallback to identity_key
**New Rows**: Report as error (update-only mode)

## Architecture

### High-Level Flow
```
[Components Page] → Export Button
    ↓
Generate Excel with current component data
    ↓
User modifies Excel (area, system, test package, attributes, drawing)
    ↓
[Import Page] → Upload modified Excel
    ↓
Parse Excel → Convert to CSV → Validate changes
    ↓
Send to /supabase/functions/update-components/ edge function
    ↓
Edge function matches components (UUID or identity key)
    ↓
Batch update in transaction (all-or-nothing)
    ↓
Return success/error report
```

### Technology Stack
- **Excel Library**: SheetJS Community Edition (`xlsx` v0.18.5) - already installed
- **Parsing**: Reuse existing `src/lib/excel/excel-to-csv.ts`
- **Edge Function**: New `/supabase/functions/update-components/`
- **Validation**: Client-side + server-side
- **Transaction**: PostgreSQL transaction for atomic batch updates

## Export Functionality

### Excel Structure

**Single sheet with all attribute columns**:
```
Columns:
- id (UUID) ← For matching (formatted as text)
- component_type ← Read-only reference
- drawing ← Editable (drawing name)
- area ← Editable (area name)
- system ← Editable (system name)
- test_package ← Editable (test package name)
- spool_id ← Editable attribute (if applicable)
- weld_number ← Editable attribute (if applicable)
- size ← Editable attribute
- spec ← Editable attribute
- commodity_code ← Editable attribute
- schedule ← Editable attribute
- base_metal ← Editable attribute
- ... (all other possible attribute fields)
- percent_complete ← Read-only reference
- last_updated_at ← Read-only reference
```

**Notes**:
- Attributes JSONB flattened into separate columns for user-friendly editing
- Many columns will be empty for types that don't use them
- UUID column formatted as text to prevent Excel corruption

### Implementation

**File**: `src/lib/excel/export-components.ts`

**Functions**:
```typescript
exportComponentsToExcel(
  components: Component[],
  options?: ExportOptions
): Blob

interface ExportOptions {
  includeReadOnlyColumns?: boolean  // Default: true
  filename?: string                 // Default: components-export-YYYY-MM-DD-HHmmss.xlsx
}
```

**Process**:
1. Query components with joins (drawing, area, system, test_package names)
2. Flatten JSONB `attributes` into individual columns
3. Create Excel workbook using SheetJS
4. Auto-size columns for readability
5. Add header row with clear labels
6. Freeze header row
7. Format UUID column as text
8. Add notes row explaining read-only columns

**UI Integration**:
- Add "Export to Excel" button to `ComponentsPage.tsx` (next to filters)
- Respect current filters (export only visible/filtered components)
- Show progress indicator for large exports (1000+ components)
- Download filename: `components-export-YYYY-MM-DD-HHmmss.xlsx`

## Import/Update Functionality

### UI Component

**File**: `src/components/import/ComponentUpdateImportPage.tsx`

**Flow**:
1. Dropzone accepts Excel files (.xlsx, .xls) - 5MB limit
2. Parse Excel using `excel-to-csv.ts`
3. Validate structure and changes (see Validation section)
4. Show preview table:
   - "X components will be updated"
   - "Y validation errors found"
   - Expandable error list with row numbers
   - Sample of changes (first 10 rows)
5. User confirms → Send to edge function
6. Display results:
   - Success count
   - Error count
   - Detailed error report (downloadable as CSV)

### Edge Function

**File**: `/supabase/functions/update-components/index.ts`

**Request Format**:
```typescript
POST /update-components
Content-Type: application/json

{
  "projectId": "uuid",
  "updates": [
    {
      "id": "uuid",                    // Primary matching
      "component_type": "field_weld",  // For identity fallback
      "identity_key": {...},           // For identity fallback
      "changes": {
        "drawing": "P-001",
        "area": "Area 1",
        "system": "System A",
        "test_package": "Package 1",
        "attributes": {
          "size": "2",
          "spec": "150#",
          ...
        }
      }
    },
    ...
  ]
}
```

**Response Format**:
```typescript
{
  "success_count": 150,
  "error_count": 5,
  "errors": [
    {
      "row": 23,
      "id": "uuid-or-identity",
      "reason": "Component not found in project"
    },
    ...
  ]
}
```

**Process**:
1. Verify user has PM/Admin role for project (permission check)
2. Start PostgreSQL transaction
3. For each update:
   a. Try to match by UUID: `WHERE id = $uuid AND project_id = $project_id`
   b. If UUID invalid/missing, try identity_key fallback
   c. If no match → collect error, skip row
   d. Verify component belongs to user's project (RLS enforcement)
   e. Resolve references (drawing, area, system, test_package by name)
   f. Prepare UPDATE with only changed fields
4. Execute all UPDATEs in batch
5. If any UPDATE fails → rollback entire transaction
6. Commit transaction
7. Return success/error report

**Update Query**:
```sql
UPDATE components
SET
  drawing_id = (
    SELECT id FROM drawings
    WHERE name = $drawing AND project_id = $project_id
  ),
  area_id = (
    SELECT id FROM areas
    WHERE name = $area AND project_id = $project_id
  ),
  system_id = (
    SELECT id FROM systems
    WHERE name = $system AND project_id = $project_id
  ),
  test_package_id = (
    SELECT id FROM test_packages
    WHERE name = $package AND project_id = $project_id
  ),
  attributes = jsonb_build_object(
    'size', $size,
    'spec', $spec,
    'commodity_code', $commodity_code,
    ...
  ),
  last_updated_at = now(),
  last_updated_by = $user_id
WHERE id = $component_id
  AND project_id = $project_id
```

## Validation

### Client-Side Validation

**Structure Validation**:
- Required columns present: `id`, `component_type`
- Column data types match expectations
- UUIDs are valid format
- No duplicate IDs in Excel file
- Component types are valid (one of 11 allowed types)

**Reference Validation**:
- Drawing names exist in project (or null)
- Area names exist in project (or null)
- System names exist in project (or null)
- Test package names exist in project (or null)
- Fetch reference data once using TanStack Query, cache for validation

**Attribute Validation** (type-specific):
- Field weld: `weld_number` present if `component_type = 'field_weld'`
- Spool: `spool_id` present if `component_type = 'spool'`
- Valve/Fitting/Support: `commodity_code`, `size` present
- Size format validation (e.g., "2", "1X2", "1/2")
- Spec format validation

**Error Format**:
```typescript
interface ValidationError {
  row: number           // Excel row number (1-indexed)
  field: string         // Column name
  value: any           // Invalid value
  reason: string       // Human-readable error
  severity: 'error' | 'warning'
}
```

### Server-Side Validation

**Permission Checks**:
- User has PM or Admin role for project
- If not → 403 error, no updates performed

**Data Validation**:
- Component exists and belongs to project
- References exist (drawing, area, system, test_package)
- Attribute values match expected types
- Database constraints satisfied (FK, unique, check)

**Error Handling**:
- **Permission denied**: 403 error
- **Project mismatch**: Skip row, log error
- **Reference not found**: Skip row, log error
- **Constraint violation**: Rollback transaction, return error
- **Transaction timeout**: Split into batches of 1000 components

## Testing Strategy

### Unit Tests (≥80% coverage)

**`src/lib/excel/export-components.test.ts`**:
- Export generates correct columns for all component types
- JSONB attributes correctly flattened
- UUID column formatted as text
- Empty/null values handled
- Reference names resolved correctly
- Large datasets (1000+ components) export without errors

**`src/lib/excel/component-update-validator.test.ts`**:
- Required columns validation
- UUID format validation
- Component type validation
- Reference existence checks
- Type-specific attribute validation
- Duplicate ID detection
- Error message formatting

### Integration Tests

**`tests/integration/component-update.test.ts`**:
- Full export → modify → import → verify update flow
- UUID matching works correctly
- Identity key fallback works when UUID missing
- RLS enforcement (can only update components in own project)
- Transaction rollback on validation failure
- Batch processing for large files (1000+ components)

### Edge Function Tests

**`supabase/functions/update-components/index.test.ts`**:
- Permission checks (only PM/Admin can update)
- Project ownership verification
- Reference validation (drawing/area/system/test package exist)
- Attribute reconstruction (flatten columns → JSONB)
- Transaction safety (all-or-nothing updates)
- Error reporting format

### TDD Workflow

Per Constitution v1.0.0:
1. Write failing test first (Red)
2. Implement minimum code to pass (Green)
3. Refactor while tests pass
4. Commit tests + implementation together

## Security Considerations

**RLS Enforcement**:
- Edge function uses SECURITY DEFINER
- Explicit permission checks (PM/Admin role required)
- All queries filter by `project_id`
- User can only update components in their own project

**Input Validation**:
- Sanitize all user inputs
- Validate UUIDs before using in queries
- Validate reference names before lookups
- Prevent SQL injection via parameterized queries

**Rate Limiting**:
- Consider rate limiting edge function (e.g., max 5 imports per minute)
- Prevent abuse of bulk update functionality

## Migration Requirements

**Database Changes**: None required - uses existing `components` table

**New Edge Function**: Deploy `/supabase/functions/update-components/`

**Environment Variables**: None required - uses existing Supabase config

## Dependencies

**Existing**:
- `xlsx` (v0.18.5) - already installed
- `src/lib/excel/excel-to-csv.ts` - already built
- TanStack Query - already used
- Shadcn/ui components - already used

**New**:
- None required

## Timeline Estimate

**Day 1-2**: Export functionality
- Implement `export-components.ts`
- Add "Export" button to ComponentsPage
- Unit tests
- Integration tests

**Day 3-4**: Import/Update functionality
- Implement `ComponentUpdateImportPage.tsx`
- Client-side validation
- Unit tests

**Day 5-6**: Edge function
- Implement `/supabase/functions/update-components/`
- Server-side validation
- Transaction logic
- Edge function tests

**Day 7**: Integration and refinement
- Full flow integration tests
- Error handling refinement
- UI polish
- Documentation

**Total**: 5-7 days

## Success Criteria

- [ ] User can export all component types to Excel
- [ ] Attributes are flattened into individual columns (not JSON)
- [ ] User can modify area, system, test package, drawing, attributes in Excel
- [ ] User can re-import Excel to update existing components
- [ ] UUID matching works (primary)
- [ ] Identity key fallback works (when UUID missing)
- [ ] Validation prevents invalid updates
- [ ] Transaction ensures all-or-nothing updates
- [ ] RLS enforces project isolation
- [ ] Clear error reporting with row numbers
- [ ] Unit test coverage ≥80% for new code
- [ ] Integration tests pass
- [ ] Edge function tests pass

## Future Enhancements (Out of Scope)

- E2E tests with Playwright or Vitest
- Milestone updates via Excel (requires separate design - milestones have complex dependencies)
- Progress updates via Excel (requires recalculation logic)
- Multi-sheet export (one sheet per component type)
- Excel template generation for updates (like import templates)
- Audit trail view showing what changed in each update
- Undo functionality for bulk updates
- Partial success mode (allow some rows to fail)
