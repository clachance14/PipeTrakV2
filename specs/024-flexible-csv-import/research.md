# Phase 0: Research & Technical Decisions

**Feature**: Flexible CSV Import
**Date**: 2025-11-03
**Status**: Complete

## Research Questions

### 1. Client-Side CSV Parsing Library

**Question**: Which library should be used for client-side CSV parsing with support for large files and RFC 4180 compliance?

**Decision**: **Papa Parse**

**Rationale**:
- Industry-standard CSV parser with 12k+ stars on GitHub
- RFC 4180 compliant (handles quoted fields, escaping, CRLF)
- Streaming support for large files (can handle 10,000 rows without blocking UI)
- TypeScript definitions available (`@types/papaparse`)
- Automatic header detection
- Configurable error handling (skip malformed rows, collect errors)
- Lightweight (~45KB minified)
- Used in production by major applications

**Alternatives Considered**:
- **csv-parse**: Node.js-focused, more complex API, less browser-optimized
  - Rejected: Better for server-side, heavier API for simple client needs
- **PapaParse**: SAME as Papa Parse (name variation)
- **d3-dsv**: Lighter weight (~10KB) but lacks streaming, error handling
  - Rejected: Missing critical features for large file handling
- **Manual parsing**: Full control, no dependencies
  - Rejected: High complexity, RFC 4180 edge cases difficult (quoted commas, newlines in fields)

**Implementation Impact**:
```typescript
// Papa Parse usage pattern
import Papa from 'papaparse';

const result = Papa.parse<Record<string, string>>(file, {
  header: true,              // Auto-detect headers
  skipEmptyLines: true,      // Ignore empty rows
  transformHeader: (h) => h.trim(), // Normalize headers
  complete: (results) => {
    // results.data: array of row objects
    // results.errors: array of parsing errors
    // results.meta: metadata (fields, delimiter)
  }
});
```

---

### 2. Column Mapping Strategy

**Question**: How should the system match CSV columns to expected fields when column names vary?

**Decision**: **Three-Tier Fuzzy Matching Algorithm**

**Rationale**:
- Tier 1 (Exact Match, 100%): Handles standard format CSVs instantly
- Tier 2 (Case-Insensitive, 95%): Handles case variations without false positives
- Tier 3 (Partial/Synonyms, 85%): Handles plural forms, spacing, common abbreviations
- Confidence scoring allows user review of uncertain mappings
- Deterministic (same CSV always produces same mappings)
- Extensible (can add more synonym rules without algorithm changes)

**Alternatives Considered**:
- **Levenshtein distance (fuzzy string matching)**: Can match typos, flexible
  - Rejected: Too permissive, false positives (e.g., "DRAWING" matches "DRAGGING"), non-deterministic thresholds
- **User manual mapping UI**: Full control, handles any variation
  - Rejected: Out of scope for MVP (added to spec Out of Scope section), degrades UX for common cases
- **Exact match only**: Simple, no ambiguity
  - Rejected: Fails on common variations (DRAWINGS, Cmdty Code), forces manual CSV editing

**Implementation Pattern**:
```typescript
// Tier 1: Exact
if (csvColumn === 'DRAWING') return { field: 'DRAWING', confidence: 100 };

// Tier 2: Case-insensitive
if (csvColumn.toUpperCase() === 'DRAWING') return { field: 'DRAWING', confidence: 95 };

// Tier 3: Synonyms
const synonyms = {
  'DRAWING': ['DRAWINGS', 'DRAWING NUMBER', 'DWG', 'DWG NO'],
  'CMDTY CODE': ['COMMODITY CODE', 'CMDTY', 'COMMODITY', 'CODE']
};
// Match logic with confidence: 85
```

---

### 3. Metadata Existence Check Approach

**Question**: How should the preview determine which Area/System/Test Package values already exist in database?

**Decision**: **Batch Query with IN Clause**

**Rationale**:
- Single query per metadata type (3 total) regardless of CSV size
- Leverages PostgreSQL index on `name` field (existing schema)
- RLS policies automatically filter by project_id (security maintained)
- Minimal network overhead (3 queries vs. N queries for N unique values)
- Compatible with TanStack Query caching

**Alternatives Considered**:
- **Individual queries per value**: Simple, one-at-a-time
  - Rejected: N+1 query problem, slow for CSVs with many unique metadata values
- **Full table scan + client-side filtering**: One query, fetch all metadata
  - Rejected: Fetches unnecessary data (all project metadata), doesn't scale
- **Edge Function endpoint for batch check**: Server-side logic, single API call
  - Rejected: Overkill for simple SELECT query, adds latency vs direct Supabase call

**Implementation Pattern**:
```typescript
// Extract unique System values from CSV
const uniqueSystems = [...new Set(rows.map(r => r.system).filter(Boolean))];

// Single query to check existence
const { data: existingSystems } = await supabase
  .from('systems')
  .select('name')
  .in('name', uniqueSystems)
  .eq('project_id', projectId);

// Categorize: existing vs. will-create
const existing = existingSystems.map(s => s.name);
const willCreate = uniqueSystems.filter(name => !existing.includes(name));
```

---

### 4. Identity Key Generation Location

**Question**: Should identity keys be generated client-side (preview) or server-side (import) for duplicate detection?

**Decision**: **Client-Side Generation for Preview, Server-Side Re-Generation for Import**

**Rationale**:
- Client-side: Enables duplicate detection in preview (user sees errors before server call)
- Server-side: Defense-in-depth validation, ensures normalization logic consistency
- Reuses existing `generate-identity-key.ts` utility (no duplication)
- Normalization logic (drawing, size) already available client-side
- Small overhead (identity key generation is lightweight, < 1ms per component)

**Alternatives Considered**:
- **Client-side only**: Single source of truth, preview = import
  - Rejected: No server-side validation safety net, risky if client-side logic diverges
- **Server-side only**: Simpler, authoritative
  - Rejected: Cannot show duplicate errors in preview, forces user to submit first
- **Contract testing for parity**: Validate client matches server
  - Accepted as additional safeguard: `tests/contract/csv-import-contracts.test.ts` will verify parity

**Implementation Pattern**:
```typescript
// Client-side (preview)
import { generateIdentityKey, normalizeDrawing, normalizeSize } from '@/lib/csv';

const identityKey = generateIdentityKey({
  drawing: normalizeDrawing(row.DRAWING),
  commodityCode: row['CMDTY CODE'],
  size: normalizeSize(row.SIZE),
  seq: 1  // or explosion sequence
});

// Server-side (import) - same logic
// Ensures client-side preview matches server-side behavior
```

---

### 5. Metadata Upsert Transaction Strategy

**Question**: How should metadata records be created within the import transaction to ensure atomicity?

**Decision**: **Upsert Before Component Creation in Single Transaction**

**Rationale**:
- Ensures metadata exists before foreign key insertion (components reference metadata)
- Upsert handles race conditions (multiple concurrent imports with same metadata)
- Single transaction ensures all-or-nothing semantics (spec requirement FR-011)
- PostgreSQL `ON CONFLICT DO NOTHING` prevents duplicate errors
- Idempotent (safe to retry on failure)

**Alternatives Considered**:
- **Pre-create metadata in separate transaction**: Two-phase commit
  - Rejected: Not atomic, orphaned metadata if component creation fails
- **Create metadata on-demand during component insert**: Lazy creation
  - Rejected: Complex error handling, foreign key violations if upsert fails mid-batch
- **Check existence then insert**: Traditional pattern
  - Rejected: Race condition (another import could create between check and insert)

**Implementation Pattern**:
```typescript
// Within Edge Function transaction
const { data: areas } = await supabase
  .from('areas')
  .upsert(
    uniqueAreas.map(name => ({ name, project_id: projectId })),
    { onConflict: 'name,project_id', ignoreDuplicates: true }
  )
  .select('id, name');

// Build lookup map: name → id
const areaMap = new Map(areas.map(a => [a.name, a.id]));

// Link components to metadata
components.forEach(comp => {
  comp.area_id = areaMap.get(comp.area_name) || null;
});
```

---

### 6. Validation Result Categorization

**Question**: How should CSV rows be categorized during validation to support skip vs. error semantics?

**Decision**: **Three-Category System: Valid, Skipped, Error**

**Rationale**:
- **Valid**: Passes all validation, will be imported
- **Skipped**: Fails non-blocking validation (unsupported type, zero quantity) - **warning**
- **Error**: Fails blocking validation (missing required field, duplicate key) - **blocks import**
- Aligns with spec requirement FR-009
- Clear user feedback in preview (warnings vs errors have different UI treatment)
- Supports all-or-nothing transaction (errors prevent import, skipped rows simply excluded)

**Alternatives Considered**:
- **Binary (valid/invalid)**: Simpler, two categories
  - Rejected: Cannot differentiate between skippable warnings (unsupported type) and blocking errors (missing required field)
- **Warning system separate from validation**: Parallel tracks
  - Rejected: Duplication, harder to reason about state
- **Severity levels (error/warning/info)**: More granular
  - Rejected: Over-engineering for current needs, three categories sufficient

**Implementation Pattern**:
```typescript
type ValidationStatus = 'valid' | 'skipped' | 'error';

interface ValidationResult {
  row: number;
  status: ValidationStatus;
  reason?: string;  // Only for skipped/error
  data?: ParsedRow; // Only for valid
}

// Categorization logic
if (!row.DRAWING || !row['CMDTY CODE']) {
  return { row: i, status: 'error', reason: 'Missing required field' };
}
if (!validTypes.includes(row.TYPE)) {
  return { row: i, status: 'skipped', reason: `Unsupported type: ${row.TYPE}` };
}
return { row: i, status: 'valid', data: parseRow(row) };
```

---

### 7. Preview Performance Optimization

**Question**: What optimizations are needed to display preview within 3 seconds for 1,000-row CSVs?

**Decision**: **Lazy Rendering + Sample Data Truncation**

**Rationale**:
- Show first 10 rows only (spec requirement FR-022) - instant rendering
- Lazy-load expanded sections (column mappings, metadata analysis) - defer expensive DOM operations
- Compute validation results progressively (yield to UI thread every 100 rows)
- Use React.memo for preview sub-components (prevent unnecessary re-renders)
- Total processing time budget: Parse (500ms) + Validate (1000ms) + Render (500ms) = 2000ms (well under 3s target)

**Alternatives Considered**:
- **Virtualized table for all rows**: React Virtual, efficient DOM
  - Rejected: Overkill for 10-row sample display, adds complexity
- **Web Worker for parsing**: Background thread, non-blocking
  - Rejected: Papa Parse already fast enough (<500ms for 1,000 rows), added complexity not justified
- **Render all rows in table**: Simple, complete data
  - Rejected: Slow DOM rendering for large CSVs, violates 3s target

**Implementation Pattern**:
```typescript
// Papa Parse is fast (<500ms for 1,000 rows)
const result = Papa.parse<Record<string, string>>(file, {
  header: true,
  skipEmptyLines: true
});

// Validation with progressive yielding (if needed for 10k rows)
const results = [];
for (let i = 0; i < rows.length; i++) {
  results.push(validateRow(rows[i], i));
  if (i % 100 === 0) await new Promise(r => setTimeout(r, 0)); // Yield to UI
}

// Render only sample data (first 10)
const sampleRows = validRows.slice(0, 10);
```

---

### 8. Edge Function Payload Size Management

**Question**: How to ensure 10,000-row CSV doesn't exceed 6MB Edge Function payload limit when sent as JSON?

**Decision**: **Client-Side Payload Size Check + Structured JSON (Not Full CSV)**

**Rationale**:
- Structured JSON more compact than CSV (no repeated headers, no quotes/escaping)
- Typical row: ~200 bytes JSON vs ~300 bytes CSV (33% savings)
- 10,000 rows × 200 bytes = 2MB (well under 6MB limit)
- Client-side check warns user before submission if payload exceeds limit
- Server-side check as final gate (defense-in-depth)

**Alternatives Considered**:
- **Chunked upload**: Split into multiple requests
  - Rejected: Breaks all-or-nothing transaction semantics, adds complexity
- **Compress payload (gzip)**: Reduces size 70-80%
  - Rejected: Edge Functions auto-compress responses, manual compression adds overhead
- **Send CSV file to Edge Function**: Let server parse
  - Rejected: Defeats client-side preview architecture, re-introduces parsing latency

**Implementation Pattern**:
```typescript
const payload = JSON.stringify({ projectId, rows, columnMappings });
const sizeInMB = new Blob([payload]).size / (1024 * 1024);

if (sizeInMB > 5.5) {  // 5.5MB threshold (留10% safety margin)
  throw new Error(`Payload too large: ${sizeInMB.toFixed(2)}MB. Maximum 5.5MB.`);
}

// Proceed with import
await fetch('/functions/v1/import-takeoff', {
  method: 'POST',
  body: payload
});
```

---

## Technology Stack Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| CSV Parsing | Papa Parse 5.x | Industry standard, RFC 4180, streaming support |
| Column Matching | Three-tier fuzzy algorithm | Deterministic, extensible, confidence scoring |
| Metadata Check | Batch Supabase query | Single query per type, RLS-compatible |
| Identity Keys | Client + Server (dual) | Preview detection + server validation |
| Validation | Three-category system | Clear error vs. warning semantics |
| Preview Rendering | React.memo + sample truncation | <3s target, lazy loading |
| Transaction | Metadata upsert-first | Atomic, idempotent, foreign key safe |
| Payload | Structured JSON | Compact, <6MB for 10k rows |

---

## Dependencies to Add

```json
{
  "dependencies": {
    "papaparse": "^5.4.1"
  },
  "devDependencies": {
    "@types/papaparse": "^5.3.14"
  }
}
```

---

## Best Practices Applied

1. **CSV Parsing**: Use battle-tested library (Papa Parse) instead of manual parsing
2. **Fuzzy Matching**: Three-tier deterministic algorithm with confidence scoring
3. **Database Queries**: Batch queries to minimize N+1 problems
4. **Validation**: Three-category system (valid/skipped/error) for clear UX
5. **Transactions**: Metadata upsert before components for atomicity
6. **Performance**: Lazy rendering + sample truncation for <3s preview
7. **Payload Size**: Structured JSON + client-side checks for 6MB limit
8. **Security**: RLS policies enforced, no bypassing with service role for user data

---

**Status**: All technical decisions documented and justified. Ready for Phase 1 (Data Model & Contracts).
