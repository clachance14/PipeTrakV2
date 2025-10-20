# Data Model: Material Takeoff Import Pipeline

**Feature**: 009-sprint-3-material
**Date**: 2025-10-17
**Purpose**: Define data structures, validation rules, and state transitions for CSV import feature

---

## Database Changes

### Migration: 00016_add_pipe_fitting_flange_templates.sql

**Type**: Data-only migration (INSERT rows, no schema changes)

**SQL**:
```sql
-- Add 3 new progress templates for material component types
INSERT INTO progress_templates (
  organization_id,
  project_id,
  component_type,
  version,
  workflow_type,
  milestones
) VALUES
  -- Pipe template: Receive (50%) → Install (50%)
  (
    NULL, -- Global template (applies to all organizations)
    NULL,
    'Pipe',
    '1.0.0',
    'discrete',
    '[
      {"name": "Receive", "weight": 50, "order": 1, "is_partial": false},
      {"name": "Install", "weight": 50, "order": 2, "is_partial": false}
    ]'::jsonb
  ),

  -- Fitting template: Receive (50%) → Install (50%)
  (
    NULL,
    NULL,
    'Fitting',
    '1.0.0',
    'discrete',
    '[
      {"name": "Receive", "weight": 50, "order": 1, "is_partial": false},
      {"name": "Install", "weight": 50, "order": 2, "is_partial": false}
    ]'::jsonb
  ),

  -- Flange template: Receive (50%) → Install (50%)
  (
    NULL,
    NULL,
    'Flange',
    '1.0.0',
    'discrete',
    '[
      {"name": "Receive", "weight": 50, "order": 1, "is_partial": false},
      {"name": "Install", "weight": 50, "order": 2, "is_partial": false}
    ]'::jsonb
  );
```

**Validation**: Existing trigger validates milestone weights sum to 100 (50+50=100 ✓)

---

## Entities

### 1. Progress Template (3 new rows)

**Table**: `progress_templates` (existing from Sprint 1)

**New Rows**:
| component_type | version | workflow_type | milestones | Notes |
|----------------|---------|---------------|------------|-------|
| Pipe | 1.0.0 | discrete | Receive (50%), Install (50%) | 2 milestones, discrete (boolean) |
| Fitting | 1.0.0 | discrete | Receive (50%), Install (50%) | 2 milestones, discrete (boolean) |
| Flange | 1.0.0 | discrete | Receive (50%), Install (50%) | 2 milestones, discrete (boolean) |

**Constraints**:
- `component_type` UNIQUE per project (enforced by DB index from Sprint 1)
- `milestones.weight` SUM must equal 100 (enforced by trigger from Sprint 1)
- All milestones have `is_partial: false` (discrete workflow)

---

### 2. Component Attributes (JSONB schema)

**Storage**: `components.attributes` column (existing table, JSONB type)

**Schema**:
```typescript
interface ComponentAttributes {
  spec: string;              // Material spec code (ES-03, EN-14, PU-93)
  description: string;       // Full component description from CSV
  size: string;              // Nominal size (2", 1X1, 1/2, etc.)
  cmdty_code: string;        // Commodity code from CSV (identity key source)
  comments: string;          // Comments or notes (may be empty string)
  original_qty: number;      // Original QTY value from CSV (for audit)
}
```

**Zod Validation**:
```typescript
import { z } from 'zod';

export const componentAttributesSchema = z.object({
  spec: z.string().min(1, 'Spec required'),
  description: z.string().min(1, 'Description required'),
  size: z.string().min(1, 'Size required'),
  cmdty_code: z.string().min(1, 'Commodity code required'),
  comments: z.string(),  // Empty string allowed
  original_qty: z.number().int().min(1, 'Quantity must be ≥1'),
});
```

**Example**:
```json
{
  "spec": "ES-03",
  "description": "Blind Flg B16.5 cl150 FF D1784 CL 23447-B CPVC",
  "size": "2",
  "cmdty_code": "FBLAG2DFA2351215",
  "comments": "",
  "original_qty": 1
}
```

---

### 3. Import Error Report

**Storage**: Ephemeral (not persisted to database)
**Transmission**: Returned from Edge Function as JSON or CSV

**TypeScript Interface**:
```typescript
export interface ImportError {
  row: number;           // 1-indexed CSV row number (header = row 1)
  column: string;        // Column name (DRAWING, QTY, TYPE, etc.)
  reason: string;        // Human-readable error message
}

export interface ImportResult {
  success: boolean;
  componentsCreated?: number;
  rowsProcessed?: number;
  rowsSkipped?: number;
  errors?: ImportError[];
  errorCsv?: string;     // CSV string if errors exist
}
```

**Example (Success)**:
```json
{
  "success": true,
  "componentsCreated": 203,
  "rowsProcessed": 78,
  "rowsSkipped": 0
}
```

**Example (Validation Errors)**:
```json
{
  "success": false,
  "errors": [
    {
      "row": 15,
      "column": "QTY",
      "reason": "Invalid data type (expected number)"
    },
    {
      "row": 23,
      "column": "DRAWING",
      "reason": "Required field missing"
    }
  ],
  "errorCsv": "Row,Column,Reason\n15,QTY,\"Invalid data type (expected number)\"\n23,DRAWING,\"Required field missing\""
}
```

---

### 4. CSV Row (Input Schema)

**Format**: CSV with header row (8 columns, 1 optional column ignored)

**Required Columns**:
- DRAWING
- TYPE
- QTY
- CMDTY CODE

**Optional Columns**:
- SPEC
- DESCRIPTION
- SIZE
- Comments

**Ignored Columns**:
- SM/OTSM (if present)

**Zod Validation**:
```typescript
export const csvRowSchema = z.object({
  DRAWING: z.string().min(1, 'Drawing number required'),
  TYPE: z.enum(['Valve', 'Instrument', 'Support', 'Pipe', 'Fitting', 'Flange'], {
    errorMap: () => ({ message: 'Invalid component type. Expected: Valve, Instrument, Support, Pipe, Fitting, Flange' })
  }),
  QTY: z.coerce.number().int().min(0, 'Quantity must be ≥0'),
  'CMDTY CODE': z.string().min(1, 'Commodity code required'),
  SPEC: z.string().default(''),
  DESCRIPTION: z.string().default(''),
  SIZE: z.string().default(''),
  Comments: z.string().default(''),
});

export type CsvRow = z.infer<typeof csvRowSchema>;
```

**Example**:
```csv
DRAWING,SPEC,TYPE,DESCRIPTION,SIZE,QTY,CMDTY CODE,SM/OTSM,Comments
DRAIN-1,ES-03,Flange,"Blind Flg B16.5 cl150 FF",2,1,FBLAG2DFA2351215,OTSM,
P-55501,EN-14,Valve,Ball Vlv Cl150,1,4,VBALU-DICBFLR01M-024,OTSM,G16S-0202-10
```

---

## Validation Rules

### CSV-Level Validation
| Rule | Error Message | Enforcement |
|------|---------------|-------------|
| Required columns exist | `Missing required column: {column}` | Pre-processing check |
| File size ≤5MB | `File too large. Maximum 5MB` | Client + server |
| Row count ≤10,000 | `File too large. Maximum 10,000 rows` | Server-side check |
| UTF-8 encoding | `Invalid file encoding. Expected UTF-8` | PapaParse error |

### Row-Level Validation
| Rule | Error Message | Enforcement |
|------|---------------|-------------|
| DRAWING not empty | `Required field missing` | Zod schema |
| TYPE in allowed list | `Invalid component type. Expected: Valve, Instrument, Support, Pipe, Fitting, Flange` | Zod enum |
| QTY is integer ≥0 | `Invalid data type (expected number)` | Zod coerce |
| CMDTY CODE not empty | `Required field missing` | Zod schema |

### Business Logic Validation
| Rule | Error Message | Enforcement |
|------|---------------|-------------|
| No duplicate identity keys within file | `Duplicate identity key: {key}` | In-memory Set check |
| No duplicate identity keys vs existing components | `Duplicate identity key: {key}` | Database query |
| User has access to project | `Unauthorized: You do not have access to this project` | RLS check before import |

---

## State Transitions

### Import Workflow
```
[Upload CSV]
     ↓
[Validate File] ────────→ [Error: File too large / Invalid format]
     ↓
[Parse CSV with PapaParse]
     ↓
[Validate Required Columns] ────→ [Error: Missing columns]
     ↓
[Validate Each Row] ────────────→ [Error: Row-level validation failures]
     ↓
[Check RLS Permissions] ────────→ [Error: Unauthorized]
     ↓
[Check for Duplicate Identity Keys] ──→ [Error: Duplicates found]
     ↓
[BEGIN TRANSACTION]
     ↓
[Auto-create Drawings] ─────────→ [ROLLBACK on error]
     ↓
[Explode Quantities → Insert Components] ──→ [ROLLBACK on error]
     ↓
[COMMIT TRANSACTION]
     ↓
[Return Success Response]
```

### Component Creation Flow (per CSV row)
```
CSV Row (QTY=4, TYPE=Valve)
     ↓
[Normalize Drawing Number] → "P-001" → "P001"
     ↓
[Check if Drawing Exists]
     ├─ Yes → Use existing drawing_id
     └─ No  → Create new drawing (drawing_norm="P001", raw_drawing_no="P-001")
     ↓
[Explode Quantity] → 4 components
     ├─ Component 1: VBALU-001-001
     ├─ Component 2: VBALU-001-002
     ├─ Component 3: VBALU-001-003
     └─ Component 4: VBALU-001-004
     ↓
[Assign Progress Template] → "Valve" template
     ↓
[Populate Attributes] → { spec, description, size, cmdty_code, comments, original_qty }
     ↓
[Insert Components] → 4 rows in components table
```

---

## Identity Key Generation

### Rules
1. **Instruments**: Use `CMDTY CODE` directly (no suffix)
   - Example: `ME-55402` (from CSV) → `ME-55402` (identity_key)

2. **All other types**: `{CMDTY CODE}-{001..QTY}`
   - Example: QTY=4 → `VBALU-001-001`, `VBALU-001-002`, `VBALU-001-003`, `VBALU-001-004`

3. **Zero-padding**: 3 digits (supports 1-999 components per row)

### TypeScript Implementation
```typescript
export function generateIdentityKey(
  cmdtyCode: string,
  index: number,  // 1-indexed (1 to QTY)
  qty: number,
  type: string
): string {
  if (type === 'Instrument') {
    return cmdtyCode; // No suffix for instruments
  }

  const suffix = String(index).padStart(3, '0');
  return `${cmdtyCode}-${suffix}`;
}
```

---

## Drawing Normalization

### Rules
1. Trim leading/trailing whitespace
2. Convert to uppercase
3. Remove hyphens, underscores, spaces
4. Strip leading zeros (but keep if only zeros)

### Examples
| Input | Output | Explanation |
|-------|--------|-------------|
| "P-001" | "P001" | Remove hyphen, keep zeros (not leading) |
| " DRAIN-1 " | "DRAIN1" | Trim spaces, remove hyphen |
| "p--0-0-1" | "P1" | Uppercase, remove separators, strip leading zeros |
| "0001" | "1" | Strip leading zeros |
| "000" | "000" | Keep if only zeros |

### TypeScript Implementation
```typescript
export function normalizeDrawing(raw: string): string {
  return raw
    .trim()                          // Remove leading/trailing spaces
    .toUpperCase()                   // Convert to uppercase
    .replace(/[-_\s]+/g, '')        // Remove hyphens, underscores, spaces
    .replace(/^0+(?=\d)/g, '');     // Strip leading zeros (lookahead keeps non-zero)
}
```

---

## Performance Characteristics

### Database Operations
| Operation | Count (78-row CSV) | Est. Time |
|-----------|-------------------|-----------|
| INSERT drawings | ~12 | <100ms (batch insert) |
| INSERT components | ~200 | <2s (batch insert with transaction) |
| SELECT existing drawings | ~12 | <50ms (indexed query on drawing_norm) |
| SELECT duplicate identity keys | 1 | <100ms (indexed query on identity_key) |
| **Total Transaction Time** | - | **<5s** |

### Memory Usage
| Phase | Est. Memory |
|-------|-------------|
| Parse CSV | ~50KB per 78 rows |
| In-memory components array | ~200KB for 200 components |
| Transaction overhead | ~500KB |
| **Peak Memory** | **<1MB** |

---

**Data Model Complete**: All entities, validation rules, state transitions, and performance characteristics documented. Ready for contract test generation.
