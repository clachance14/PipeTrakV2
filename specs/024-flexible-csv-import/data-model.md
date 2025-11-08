# Phase 1: Data Model

**Feature**: Flexible CSV Import
**Date**: 2025-11-03
**Status**: Complete

## Overview

This feature enhances the existing CSV import system without requiring new database tables or schema changes. All entities described below are **client-side data structures** used during the import workflow. The feature leverages existing database tables (components, drawings, areas, systems, test_packages) with their current RLS policies.

---

## Client-Side Entities

### 1. ColumnMapping

Represents the detected relationship between a CSV column header and an expected field.

**Purpose**: Track how CSV columns map to system fields with confidence scoring for user review.

**Attributes**:
- `csvColumn` (string): Original column header from CSV (e.g., "DRAWINGS", "Cmdty Code")
- `expectedField` (string): System field name (e.g., "DRAWING", "CMDTY CODE")
- `confidence` (number): Mapping confidence percentage (100, 95, or 85)
- `matchTier` (enum): Matching algorithm tier used ("exact" | "case-insensitive" | "synonym")

**Validation Rules**:
- `csvColumn` cannot be empty
- `expectedField` must be one of: "DRAWING", "TYPE", "SIZE", "QTY", "CMDTY CODE", "SPEC", "DESCRIPTION", "COMMENTS", "AREA", "SYSTEM", "TEST_PACKAGE"
- `confidence` must be 100, 95, or 85
- `matchTier` determines confidence: exact=100, case-insensitive=95, synonym=85

**Relationships**:
- Multiple CSV columns can map to different expected fields (one-to-one)
- Unmapped CSV columns are stored in component attributes (not represented as ColumnMapping)

**State Transitions**: N/A (immutable after detection)

**Example**:
```typescript
{
  csvColumn: "DRAWINGS",
  expectedField: "DRAWING",
  confidence: 95,
  matchTier: "case-insensitive"
}
```

---

### 2. ValidationResult

Categorization of a CSV row based on validation rules.

**Purpose**: Determine which rows can be imported, which should be skipped with warnings, and which block the import with errors.

**Attributes**:
- `rowNumber` (number): 1-indexed row number from CSV (for user reference)
- `status` (enum): "valid" | "skipped" | "error"
- `reason` (string, optional): Human-readable explanation (required for skipped/error, absent for valid)
- `category` (string, optional): Sub-categorization of reason (e.g., "unsupported_type", "missing_required_field", "duplicate_identity_key")
- `data` (ParsedRow, optional): Parsed and normalized row data (present only for valid status)

**Validation Rules**:
- `rowNumber` must be ≥ 1
- `status` must be one of three values (valid/skipped/error)
- If `status` is "skipped" or "error", `reason` is required
- If `status` is "valid", `data` is required and `reason` is absent
- `category` values: "unsupported_type", "zero_quantity", "missing_required_field", "duplicate_identity_key", "empty_drawing"

**Relationships**:
- Each ValidationResult corresponds to one CSV row
- Valid ValidationResults contain ParsedRow data that will be sent to server
- Error ValidationResults block import (must be zero for import to proceed)

**State Transitions**:
```
CSV Row → Parse → Validate → Valid | Skipped | Error
                              ↓       ↓         ↓
                            Import  Exclude   Block
```

**Examples**:
```typescript
// Valid row
{
  rowNumber: 5,
  status: "valid",
  data: { drawing: "P-91010_1 01of01", type: "Spool", qty: 1, ... }
}

// Skipped row (warning)
{
  rowNumber: 12,
  status: "skipped",
  reason: "Unsupported component type: Gasket",
  category: "unsupported_type"
}

// Error row (blocks import)
{
  rowNumber: 45,
  status: "error",
  reason: "Missing required field: CMDTY CODE",
  category: "missing_required_field"
}
```

---

### 3. MetadataDiscovery

Collection of unique metadata values extracted from CSV with existence categorization.

**Purpose**: Identify which Area, System, and Test Package records need to be created during import.

**Attributes**:
- `type` (enum): "area" | "system" | "test_package"
- `value` (string): Unique metadata name from CSV
- `exists` (boolean): Whether record already exists in database
- `recordId` (string, optional): Database ID if exists (null if will be created)

**Validation Rules**:
- `value` cannot be empty string
- `type` must be one of three metadata types
- `exists` and `recordId` must be consistent (exists=true requires recordId, exists=false requires recordId=null)
- `value` must be unique within same `type` (no duplicates in discovery set)

**Relationships**:
- Multiple MetadataDiscovery entries per type (one per unique value in CSV)
- Each ParsedRow may reference 0-3 MetadataDiscovery entries (area, system, test_package)
- Server-side import creates missing records before component insertion

**State Transitions**:
```
CSV Value → Extract → Check Database → Exists? → Yes: Store ID
                                              → No: Mark for creation
                                                     ↓
                                              Import → Create Record → Link to Components
```

**Examples**:
```typescript
// Existing metadata
{
  type: "area",
  value: "B-68",
  exists: true,
  recordId: "123e4567-e89b-12d3-a456-426614174000"
}

// New metadata (will be created)
{
  type: "system",
  value: "HC-05",
  exists: false,
  recordId: null
}
```

---

### 4. ImportPreviewState

Aggregated state for the preview UI, combining all analysis results.

**Purpose**: Single source of truth for preview component, consolidating all pre-import analysis.

**Attributes**:
- `fileName` (string): Uploaded CSV filename
- `fileSize` (number): File size in bytes
- `totalRows` (number): Total CSV rows (excluding header)
- `validRows` (number): Count of rows that will be imported
- `skippedRows` (number): Count of rows skipped with warnings
- `errorRows` (number): Count of rows with blocking errors
- `columnMappings` (ColumnMapping[]): Detected column mappings
- `validationResults` (ValidationResult[]): Validation results for all rows
- `metadataDiscovery` (MetadataDiscovery[]): Metadata analysis grouped by type
- `sampleData` (ParsedRow[]): First 10 valid rows for preview table
- `componentCounts` (Record<string, number>): Count of components by type (e.g., { Spool: 89, Valve: 12 })
- `canImport` (boolean): True if errorRows === 0, false otherwise

**Validation Rules**:
- `totalRows` = `validRows` + `skippedRows` + `errorRows`
- `sampleData.length` ≤ 10
- `sampleData.length` ≤ `validRows`
- `canImport` must be false if `errorRows` > 0
- `columnMappings` must include all required fields (DRAWING, TYPE, QTY, CMDTY CODE) or `canImport` = false

**Relationships**:
- Aggregates data from ColumnMapping, ValidationResult, MetadataDiscovery
- Consumed by ImportPreview component hierarchy (ColumnMappingDisplay, ValidationResults, sample table)
- If `canImport` = true, `validationResults` (valid status only) are sent to server

**State Transitions**:
```
File Upload → Parse CSV → Generate ColumnMappings → Validate Rows
                              ↓                          ↓
                      Analyze Metadata         Generate ValidationResults
                              ↓                          ↓
                       ←── Consolidate into ImportPreviewState ───→
                                      ↓
                              Display Preview
                                      ↓
                         canImport? → Yes: Enable "Confirm Import"
                                   → No: Show errors, disable import
```

**Example**:
```typescript
{
  fileName: "5932 - Dark Knight - Pipe Tracker to Import.csv",
  fileSize: 47200,
  totalRows: 170,
  validRows: 156,
  skippedRows: 14,
  errorRows: 0,
  columnMappings: [
    { csvColumn: "DRAWINGS", expectedField: "DRAWING", confidence: 95, matchTier: "case-insensitive" },
    { csvColumn: "TYPE", expectedField: "TYPE", confidence: 100, matchTier: "exact" },
    // ...
  ],
  validationResults: [ /* 170 results */ ],
  metadataDiscovery: [
    { type: "area", value: "B-68", exists: true, recordId: "..." },
    { type: "system", value: "HC-05", exists: false, recordId: null }
  ],
  sampleData: [ /* first 10 valid ParsedRows */ ],
  componentCounts: { Spool: 89, Valve: 12, Instrument: 8, Support: 34, Fitting: 7, Flange: 6 },
  canImport: true
}
```

---

### 5. ImportPayload

Request payload sent from client to Edge Function for import execution.

**Purpose**: Transfer validated, parsed, and normalized data to server for transactional import.

**Attributes**:
- `projectId` (string): Target project UUID
- `rows` (ParsedRow[]): Array of validated component data (only valid rows)
- `columnMappings` (ColumnMapping[]): Detected mappings for audit trail
- `metadata` (MetadataToCreate): Metadata values that need creation

**Nested Type - ParsedRow**:
- `drawing` (string): Normalized drawing number
- `type` (string): Component type (lowercase for database)
- `qty` (number): Quantity (integer ≥ 1)
- `cmdtyCode` (string): Commodity code
- `size` (string, optional): Normalized size (e.g., "2", "1X2", "NOSIZE")
- `spec` (string, optional): Material spec code
- `description` (string, optional): Component description
- `comments` (string, optional): Comments/notes
- `area` (string, optional): Area name
- `system` (string, optional): System name
- `testPackage` (string, optional): Test package name
- `unmappedFields` (Record<string, string>): Any unmapped CSV columns

**Nested Type - MetadataToCreate**:
- `areas` (string[]): Unique area names to create
- `systems` (string[]): Unique system names to create
- `testPackages` (string[]): Unique test package names to create

**Validation Rules** (server-side):
- `projectId` must be valid UUID
- `rows` cannot be empty (minimum 1 component)
- `rows.length` ≤ 10,000 (per spec constraint)
- Each `row.type` must be valid component type (server re-validates)
- Each `row.drawing` must be non-empty (server re-validates)
- Payload size ≤ 6MB (Edge Function limit)

**Relationships**:
- Derived from ImportPreviewState (valid rows only)
- Metadata values match MetadataDiscovery (exists=false entries)
- Server transforms rows into database components with identity key generation

**State Transitions**:
```
ImportPreviewState → Filter (valid rows) → Build ImportPayload → POST to Edge Function
                                                ↓
                                    Edge Function Transaction:
                                    1. Upsert metadata
                                    2. Process drawings
                                    3. Generate components
                                    4. Batch insert
                                                ↓
                                    Return ImportResult
```

**Example**:
```typescript
{
  projectId: "proj_123e4567-e89b-12d3-a456-426614174000",
  rows: [
    {
      drawing: "P-26B07 01OF01",  // Normalized (uppercase, spaces collapsed)
      type: "fitting",            // Lowercase for database
      qty: 1,
      cmdtyCode: "OPLRAB2TMACG0530",
      size: "1",
      spec: "HC-05",
      area: "B-68",
      system: "HC-05",
      unmappedFields: { "Item #": "1", "Test Press.": "1125 PSI" }
    },
    // ... 155 more rows
  ],
  columnMappings: [ /* for audit trail */ ],
  metadata: {
    areas: [],           // B-68 already exists
    systems: ["HC-05"],  // Will be created
    testPackages: []
  }
}
```

---

### 6. ImportResult

Response from Edge Function after import execution.

**Purpose**: Provide detailed feedback on import outcome for user notification and audit trail.

**Attributes**:
- `success` (boolean): True if all components created, false if transaction rolled back
- `componentsCreated` (number): Count of components inserted (0 if success=false)
- `drawingsCreated` (number): Count of new drawings created
- `drawingsUpdated` (number): Count of existing drawings reused (always 0 for current logic)
- `metadataCreated` (MetadataCreated): Counts of metadata records created
- `componentsByType` (Record<string, number>): Components created per type
- `duration` (number): Server-side processing time in milliseconds
- `error` (string, optional): Error message if success=false
- `details` (ErrorDetail[], optional): Detailed error information (row numbers, specific issues)

**Nested Type - MetadataCreated**:
- `areas` (number): Areas created
- `systems` (number): Systems created
- `testPackages` (number): Test packages created

**Nested Type - ErrorDetail**:
- `row` (number): CSV row number
- `issue` (string): Specific problem
- `drawing` (string, optional): Drawing number for context

**Validation Rules**:
- If `success` = true, `error` and `details` must be absent
- If `success` = false, `componentsCreated` must be 0 (transaction rollback)
- If `success` = false, `error` is required
- `duration` must be > 0

**Relationships**:
- Correlates to ImportPayload (request) via projectId and row count
- Displayed in UI success/error notification
- May be logged for audit trail (future enhancement)

**State Transitions**:
```
Edge Function Transaction → Success? → Yes: Return ImportResult (success=true)
                                    → No: Rollback → Return ImportResult (success=false, error)
                                              ↓
                                    Client displays result to user
```

**Examples**:

**Success**:
```typescript
{
  success: true,
  componentsCreated: 156,
  drawingsCreated: 23,
  drawingsUpdated: 0,
  metadataCreated: {
    areas: 0,
    systems: 1,
    testPackages: 0
  },
  componentsByType: {
    spool: 89,
    valve: 12,
    instrument: 8,
    support: 34,
    fitting: 7,
    flange: 6
  },
  duration: 3847
}
```

**Failure**:
```typescript
{
  success: false,
  componentsCreated: 0,
  drawingsCreated: 0,
  drawingsUpdated: 0,
  metadataCreated: { areas: 0, systems: 0, testPackages: 0 },
  componentsByType: {},
  duration: 1205,
  error: "Duplicate identity key detected",
  details: [
    { row: 45, issue: "Duplicate identity key", drawing: "P-91010_1 01of01" },
    { row: 78, issue: "Duplicate identity key", drawing: "P-91010_1 01of01" }
  ]
}
```

---

## Existing Database Tables (No Changes Required)

This feature leverages existing tables without schema modifications:

### components
- Existing fields used: `id`, `project_id`, `drawing_id`, `type`, `identity_key`, `attributes` (JSONB), `area_id`, `system_id`, `test_package_id`, `progress_template`
- RLS policies: Enforce `project_id` filtering (single-org architecture)
- Import creates new records (no updates)

### drawings
- Existing fields used: `id`, `project_id`, `drawing_number` (normalized)
- Drawing normalization reuses existing `normalizeDrawing()` logic
- Upsert pattern: Create if new, fetch if exists

### areas, systems, test_packages
- Existing fields used: `id`, `project_id`, `name`
- Upsert pattern: `ON CONFLICT (name, project_id) DO NOTHING`
- Created during import transaction before component insertion

---

## Validation Rule Summary

| Entity | Rule | Enforcement |
|--------|------|-------------|
| ColumnMapping | Required fields mapped | Client (preview validation) |
| ValidationResult | Required fields non-empty | Client + Server (defense-in-depth) |
| ValidationResult | Component type in valid list | Client + Server |
| ValidationResult | QTY is integer ≥ 0 | Client + Server |
| ValidationResult | No duplicate identity keys | Client (within CSV) + Server (vs database) |
| MetadataDiscovery | Unique values per type | Client (Set deduplication) |
| ImportPayload | Max 10,000 rows | Client check + Server limit |
| ImportPayload | Max 6MB payload | Client check + Edge Function limit |
| ImportResult | Transaction atomicity | Server (PostgreSQL transaction) |

---

## Data Flow Diagram

```
┌─────────────┐
│  CSV File   │
└──────┬──────┘
       │ Papa Parse
       ↓
┌──────────────────┐
│  CSV Rows Array  │
└──────┬───────────┘
       │ Column Mapping
       ↓
┌─────────────────────┐      ┌──────────────────┐
│  ColumnMapping[]    │      │ Metadata Check   │
└──────┬──────────────┘      │ (Batch Query)    │
       │                     └────────┬─────────┘
       │ Validation                   │
       ↓                              ↓
┌─────────────────────┐      ┌──────────────────┐
│ ValidationResult[]  │      │ MetadataDiscovery│
└──────┬──────────────┘      └────────┬─────────┘
       │                              │
       └────────┬─────────────────────┘
                │ Consolidate
                ↓
      ┌───────────────────────┐
      │ ImportPreviewState    │
      └─────────┬─────────────┘
                │ User Review
                ↓
        canImport = true?
                │
                ↓ Yes
      ┌─────────────────────┐
      │  ImportPayload      │
      └─────────┬───────────┘
                │ POST to Edge Function
                ↓
      ┌──────────────────────────┐
      │  Edge Function           │
      │  1. Upsert metadata      │
      │  2. Process drawings     │
      │  3. Generate components  │
      │  4. Batch insert         │
      └─────────┬────────────────┘
                │
                ↓
      ┌─────────────────────┐
      │  ImportResult       │
      └─────────────────────┘
```

---

**Status**: Data model complete. All entities defined with validation rules, relationships, and state transitions. Ready for contract generation (TypeScript interfaces).
