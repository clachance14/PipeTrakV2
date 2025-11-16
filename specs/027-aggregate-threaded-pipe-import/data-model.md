# Data Model: Aggregate Threaded Pipe Components

**Feature**: 027-aggregate-threaded-pipe-import
**Date**: 2025-11-14
**Status**: Complete

## Overview

This document defines the data model for aggregate threaded pipe components, contrasting the new aggregate model with the existing discrete instance model, and specifying the structure of identity keys, attributes, and milestones.

---

## Component Identity Structure

### Aggregate Threaded Pipe Component

**Identity Key** (JSONB):
```json
{
  "pipe_id": "P001-1-PIPE-SCH40-AGG"
}
```

**Key Characteristics**:
- Uses existing `pipe_id` field from production schema (consistent with migration 00055)
- Aggregate marker: `-AGG` suffix (vs `-001`, `-002` for discrete instances)
- Format: `${drawing}-${size}-${commodity}-AGG` (e.g., "P001-1-PIPE-SCH40-AGG")
- Uniqueness enforced on entire identity_key JSONB structure
- Coexists with discrete instances (pipe_id with `-001`, `-002` suffixes) without conflict

**Example Database Row**:
```json
{
  "id": "uuid-abc123",
  "project_id": "uuid-project",
  "component_type": "threaded_pipe",
  "identity_key": {
    "pipe_id": "P001-1-PIPE-SCH40-AGG"
  },
  "attributes": {
    "total_linear_feet": 100,
    "original_qty": 100,
    "cmdty_code": "PIPE-SCH40",
    "line_numbers": ["101", "205", "301"],
    "drawing": "P-001",
    "size": "1\""
  },
  "current_milestones": {
    "Fabricate_LF": 75,
    "Install_LF": 50,
    "Erect_LF": 25,
    "Connect_LF": 0,
    "Support_LF": 0,
    "Punch": false,
    "Test": false,
    "Restore": false
  },
  "percent_complete": 24.00
}
```

---

## Attributes Structure

### New Field: `total_linear_feet`

**Type**: Numeric (integer)
**Purpose**: Store total linear footage tracked by this aggregate component
**Usage**: Display in UI, calculate milestone progress in linear feet

**Example**:
```json
"attributes": {
  "total_linear_feet": 100,  // 100 linear feet total
  "original_qty": 100,        // Preserved for compatibility
  "cmdty_code": "PIPE-SCH40",
  "line_numbers": ["101", "205", "301"],  // All contributing line numbers
  "drawing": "P-001",
  "size": "1\""
}
```

### New Field: `line_numbers`

**Type**: JSONB array of strings
**Purpose**: Track all CSV line numbers that contributed to this aggregate component
**Usage**: Display in UI with "+X more" format, tooltip shows full list

**Example**:
```json
"line_numbers": ["101", "205", "301"]
```

**Display Logic**:
- Single line: "101 (100 LF)"
- Multiple lines: "101 +2 more (100 LF)" with tooltip showing "Line numbers: 101, 205, 301"

**Update Behavior**:
- Each import appends new line number to array if not already present
- Array grows with re-imports: `["101"]` → `["101", "205"]` → `["101", "205", "301"]`

**Relationship to Milestone Storage**:
- **Fabricate_LF**: 75 (absolute linear feet fabricated)
- **Install_LF**: 50 (absolute linear feet installed)
- **Erect_LF**: 25 (absolute linear feet erected)
- **UI displays**: Calculated percentages (75 LF / 100 LF = 75%)

**Quantity Summing Behavior**:
```json
// Import 1: QTY=50
"total_linear_feet": 50

// Import 2 (same identity): QTY=50
"total_linear_feet": 100  // Sum: 50 + 50

// Import 3 (same identity): QTY=25
"total_linear_feet": 125  // Sum: 100 + 25
```

### Existing Fields (Unchanged)

- `original_qty`: Last imported quantity (preserved for legacy compatibility)
- `cmdty_code`: Commodity code from CSV
- `drawing`: Drawing number (parsed from pipe_id for display)
- `size`: Pipe size (parsed from pipe_id for display)

---

## Milestone Structure

### Hybrid Workflow (5 Partial + 3 Discrete)

**Partial Milestones** (0-100 percentage):
- Fabricate (weight: 16%)
- Install (weight: 16%)
- Erect (weight: 16%)
- Connect (weight: 16%)
- Support (weight: 16%)

**Discrete Milestones** (boolean):
- Punch (weight: 5%)
- Test (weight: 10%)
- Restore (weight: 5%)

**Total Weight**: 100%

### Milestone Semantics for Aggregate Components

**Absolute Linear Feet Storage (Database)**

Milestones stored as absolute linear feet, not percentages:

Example with 100 LF total:
```json
{
  "Fabricate_LF": 75,  // 75 LF fabricated
  "Install_LF": 50,    // 50 LF installed
  "Erect_LF": 25,      // 25 LF erected
  "Connect_LF": 0,     // 0 LF connected
  "Support_LF": 0,     // 0 LF supported
  "Punch": false,      // Punch not started (discrete milestone)
  "Test": false,       // Test not started (discrete milestone)
  "Restore": false     // Restore not started (discrete milestone)
}
```

**UI Display Calculation** (Percentage calculated from absolute LF):
```
Fabricate% = Math.round((Fabricate_LF / total_linear_feet) * 100)
           = Math.round((75 / 100) * 100)
           = 75%

Install%   = Math.round((50 / 100) * 100) = 50%
Erect%     = Math.round((25 / 100) * 100) = 25%
```

**Progress Calculation** (automatic via trigger):
```
percent_complete = (Fabricate_LF / total_LF * 16%) + (Install_LF / total_LF * 16%) +
                   (Erect_LF / total_LF * 16%) + (Connect_LF / total_LF * 16%) +
                   (Support_LF / total_LF * 16%) +
                   (Punch ? 5% : 0%) + (Test ? 10% : 0%) + (Restore ? 5% : 0%)

Example with total_linear_feet = 100:
= (75/100 * 16) + (50/100 * 16) + (25/100 * 16) + (0/100 * 16) + (0/100 * 16) +
  (false ? 5 : 0) + (false ? 10 : 0) + (false ? 5 : 0)
= 12.00 + 8.00 + 4.00 + 0 + 0 + 0 + 0 + 0
= 24.00% complete
```

### Milestone Preservation on Quantity Update

**Scenario**: Re-import adds quantity to existing aggregate component

**Behavior**:
1. `total_linear_feet` updated (sum)
2. Milestone **absolute LF values preserved** (not recalculated)
3. Displayed percentages automatically recalculate based on new total
4. User warned: "Milestone values preserved. Review progress for updated quantities."

**Example**:
```json
// Before re-import
{
  "total_linear_feet": 100,
  "Fabricate_LF": 100  // 100 LF fabricated (displays as 100%)
}

// After re-import adds 50 LF
{
  "total_linear_feet": 150,
  "Fabricate_LF": 100  // Still 100 LF (displays as 67% = 100/150)
  // User can see that 100 LF have been fabricated out of new total 150 LF
}
```

**Rationale**: Preserving absolute LF values maintains accurate record of work completed. UI percentages automatically adjust to show correct progress ratio. User reviews whether additional work needs milestone updates.

---

## Comparison: Aggregate vs Discrete Models

### Discrete Instance Model (Legacy/Existing)

**Identity Key**:
```json
{
  "pipe_id": "P001-1-PIPE-SCH40-001"  // Sequential instance suffix (-001, -002, etc.)
}
```

**Component Count**: 1 component per unit (QTY=100 → 100 components with suffixes -001 through -100)

**Attributes**:
```json
{
  "original_qty": 1,  // Always 1 for discrete instances
  "line_numbers": ["101"]  // Single line number (array with one element)
}
```

**Use Cases**:
- Valves (discrete units: gate valve #1, #2, #3)
- Instruments (individual gauges, transmitters)
- Fittings (individual elbows, tees, reducers)

---

### Aggregate Model (New for Threaded Pipe)

**Identity Key**:
```json
{
  "pipe_id": "P001-1-PIPE-SCH40-AGG"  // -AGG suffix indicates aggregate
}
```

**Component Count**: 1 component per drawing+commodity+size (QTY=100 → 1 component)

**Attributes**:
```json
{
  "total_linear_feet": 100,  // Total linear footage
  "original_qty": 100,
  "line_numbers": ["101", "205", "301"]  // Array of all contributing line numbers
}
```

**Milestones**:
```json
{
  "Fabricate_LF": 75,  // Absolute linear feet (not percentage)
  "Install_LF": 50,
  "Erect_LF": 25,
  // ... other milestones
}
```

**Use Cases**:
- Threaded pipe (measured in linear feet, not discrete units)
- Future: Tubing, hose, cable (continuous runs)

---

### Coexistence Behavior

**Scenario**: Database contains both models for same drawing+commodity+size

**Example**:
```sql
-- Aggregate component (NEW)
identity_key: {"pipe_id": "P001-1-PIPE-SCH40-AGG"}
total_linear_feet: 100

-- Discrete instances (LEGACY - if any exist from before this feature)
identity_key: {"pipe_id": "P001-1-PIPE-SCH40-001"}
identity_key: {"pipe_id": "P001-1-PIPE-SCH40-002"}
identity_key: {"pipe_id": "P001-1-PIPE-SCH40-003"}
...
```

**Frontend Display**:
- Aggregate row: "101 +2 more (100 LF)"
- Discrete rows: "101", "102", "103", ... (legacy components if any exist)

**Detection Logic**:
```typescript
const isAggregate = component.identity_key.pipe_id?.endsWith('-AGG');
```

**Migration Path**: Users manually delete discrete instances and re-import as aggregate (optional, not enforced)

---

## Validation Rules

### Identity Key Validation

1. **Required Fields**: `pipe_id`
2. **Field Types**:
   - `pipe_id`: string in format `${drawing}-${size}-${commodity}-${suffix}`
   - `suffix`: "-AGG" (for aggregate) OR "-001", "-002", etc. (for discrete)
3. **Format Examples**:
   - Aggregate: "P001-1-PIPE-SCH40-AGG"
   - Discrete: "P001-1-PIPE-SCH40-001", "P001-1-PIPE-SCH40-002", ...
4. **Uniqueness**: Enforced by PostgreSQL UNIQUE constraint on `(project_id, component_type, identity_key)`
5. **Detection**: Check suffix with `pipe_id.endsWith('-AGG')` for aggregate vs discrete

### Attributes Validation

1. **total_linear_feet**:
   - Type: Numeric (integer or decimal)
   - Constraint: > 0 (import validation rejects QTY ≤ 0)
   - Default: null (for non-aggregate components)

2. **line_numbers**:
   - Type: JSONB array of strings
   - Constraint: Must contain at least one element for aggregate components
   - Default: empty array [] for non-aggregate components
   - Update: Append new line numbers on re-import

3. **original_qty**:
   - Type: Numeric
   - Constraint: > 0
   - Preserved for legacy compatibility (still stored for aggregate components)

### Milestone Validation

1. **Partial Milestones (Aggregate Threaded Pipe)**:
   - Field Names: `Fabricate_LF`, `Install_LF`, `Erect_LF`, `Connect_LF`, `Support_LF`
   - Type: Numeric (integer, representing absolute linear feet)
   - Range: 0 to `total_linear_feet`
   - Constraint: Cannot exceed total_linear_feet (enforced in frontend)
   - UI Display: Calculated as percentage `(milestone_LF / total_linear_feet) * 100`

2. **Partial Milestones (Other Component Types)**:
   - Field Names: `Fabricate`, `Install`, `Erect`, `Connect`, `Support`
   - Type: Numeric (decimal, 2 precision)
   - Range: 0.00 - 100.00 (percentage)
   - Constraint: Cannot exceed 100% (enforced in frontend)

3. **Discrete Milestones (All Component Types)**:
   - Field Names: `Punch`, `Test`, `Restore`
   - Type: Boolean
   - Values: true | false
   - Constraint: Must transition false → true (no rollback)

---

## State Transitions

### Component Lifecycle

```
┌─────────────────┐
│   CSV Import    │
│  (QTY: 100)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  Component Created          │
│  pipe_id: "...-AGG"         │
│  total_linear_feet: 100     │
│  line_numbers: ["101"]      │
│  Milestones: all 0 LF/false │
└────────┬────────────────────┘
         │
         ├──────────────────────────┐
         │                          │
         ▼                          ▼
┌─────────────────────┐    ┌──────────────────────┐
│  Milestone Updates  │    │  Quantity Updates    │
│  (Field work)       │    │  (Re-import)         │
│  Fabricate_LF: 75   │    │  +50 LF              │
│  Install_LF: 50     │    │  total_linear_feet:  │
│  Erect_LF: 25       │    │  150                 │
│  (displays as %)    │    │  line_numbers:       │
│                     │    │  ["101", "205"]      │
└──────────┬──────────┘    └──────────┬───────────┘
           │                          │
           └───────────┬──────────────┘
                       │
                       ▼
            ┌────────────────────┐
            │  Progress Complete │
            │  All milestones    │
            │  at total LF       │
            └────────────────────┘
```

### Milestone Progression (Partial - Aggregate Threaded Pipe)

```
0 LF → 25 LF → 50 LF → 75 LF → 100 LF (of 100 LF total)
└──────┬────────┬────────┬─────────┬──────┘
       │        │        │         │
   Start   In Progress        Complete
   (0%)      (25-75%)          (100%)
```

Note: Database stores absolute LF values (0, 25, 50, 75, 100). UI calculates and displays percentages.

### Milestone Progression (Discrete)

```
false → true
└──┬───┘
   │
Not Started → Complete
```

---

## Edge Cases

### Edge Case 1: Missing total_linear_feet

**Scenario**: Legacy threaded pipe component imported before this feature

**Detection**:
```typescript
const totalLF = component.attributes?.total_linear_feet;
if (totalLF === undefined || totalLF === null) {
  // Fallback to original_qty
  displayValue = component.attributes?.original_qty || 0;
}
```

**Display**: "(X)" suffix uses original_qty as fallback

---

### Edge Case 2: Zero Quantity

**Scenario**: CSV contains QTY=0 for threaded pipe

**Handling**:
- Import validation rejects row
- Error message: "Invalid quantity for threaded pipe: QTY must be > 0"
- Row skipped, import continues for remaining rows

---

### Edge Case 3: Negative Quantity (Quantity Adjustment)

**Scenario**: User wants to reduce total_linear_feet (e.g., from 100 to 75)

**Handling**:
- Not supported in import flow (import only adds quantities)
- User must manually edit component via Component Detail View (future enhancement)
- Import validation rejects QTY < 0

---

## Summary

| Aspect | Discrete Model | Aggregate Model |
|--------|---------------|-----------------|
| **Identity Key** | pipe_id with -001, -002, etc. suffix | pipe_id with -AGG suffix |
| **Component Count** | 1 per unit | 1 per drawing+commodity+size |
| **Quantity Field** | original_qty (always 1) | total_linear_feet (sum) |
| **Line Numbers** | line_numbers: ["101"] (single) | line_numbers: ["101", "205", ...] (array) |
| **Milestone Storage** | Percentages (0.00-100.00) | Absolute LF for partial, boolean for discrete |
| **Milestone Fields** | Fabricate, Install, Erect, etc. | Fabricate_LF, Install_LF, Erect_LF, etc. |
| **UI Display** | Direct percentage display | Calculated percentage (LF / total * 100) |
| **Use Cases** | Valves, instruments, fittings | Threaded pipe, tubing, hose |
| **Coexistence** | ✅ Can coexist with aggregate | ✅ Can coexist with discrete |

---

## Migration Requirements

**Migration 00097**: Threaded Pipe Aggregate Model

**Purpose**: Convert existing threaded_pipe milestone storage from percentages to absolute linear feet, enable line_numbers array support

**Required Actions**:

1. **Add line_numbers field support**:
   - No schema change needed (JSONB already supports arrays)
   - Backfill existing components: Convert `attributes.line_number` (string) → `attributes.line_numbers` (array)
   - Example: `"line_number": "101"` → `"line_numbers": ["101"]`

2. **Convert milestone storage for existing threaded_pipe components**:
   - Partial milestones: Convert from percentage to absolute LF
     - `Fabricate` (0-100 percentage) → `Fabricate_LF` (absolute LF = percentage/100 * total_linear_feet)
     - `Install` → `Install_LF`
     - `Erect` → `Erect_LF`
     - `Connect` → `Connect_LF`
     - `Support` → `Support_LF`
   - Discrete milestones: Remain unchanged (Punch, Test, Restore - boolean values)

3. **Update calculate_component_percent trigger function**:
   - Detect aggregate threaded_pipe: Check for `pipe_id` ending with `-AGG`
   - Calculate weighted percentages from absolute LF values:
     ```sql
     -- For aggregate threaded_pipe
     Fabricate_percentage = (Fabricate_LF / total_linear_feet) * 100
     Install_percentage = (Install_LF / total_linear_feet) * 100
     -- etc.

     percent_complete = (Fabricate_percentage * 0.16) + (Install_percentage * 0.16) + ...
     ```
   - Non-aggregate components: Use existing percentage-based calculation

**Rollback Strategy**:
- Reverse conversion: `Fabricate_LF` (absolute) → `Fabricate` (percentage = LF / total_linear_feet * 100)
- Restore single line_number from first element of line_numbers array

**Testing Requirements**:
- Verify existing discrete threaded_pipe components (if any) are migrated correctly
- Verify new aggregate imports create components with absolute LF milestones
- Verify percent_complete calculation works for both old and new milestone schemas
- Integration test: Import → milestone update → re-import → verify milestone preservation

---

**Status**: ✅ Data Model Complete | Ready for Contracts Generation
