# Research & Technical Decisions

**Feature**: Aggregate Threaded Pipe Import
**Date**: 2025-11-14
**Status**: Complete

## Overview

This document consolidates technical research findings for implementing aggregate threaded pipe import. All "NEEDS CLARIFICATION" items from the implementation plan have been resolved through code investigation and pattern analysis.

---

## Research Task 1: Production Schema Compatibility - pipe_id vs Class-B Identity

### Question
Should aggregate threaded pipe use Class-B identity structure `{drawing_norm, commodity_code, size, seq: null}` or production's pipe_id pattern?

### Investigation

**Production Schema Analysis** (Migration 00055):
```sql
-- Line 72: format_component_description function
WHEN 'threaded_pipe' THEN concat('Threaded Pipe ', c.identity_key->>'pipe_id')
```

**Finding**: Production threaded_pipe components use `pipe_id` field, NOT Class-B structure

**PostgreSQL UNIQUE Constraint Behavior**:
- UNIQUE constraint on `(project_id, component_type, identity_key)` compares entire JSONB structure
- Different pipe_id values are distinct: `{"pipe_id": "P001-1-PIPE-SCH40-AGG"}` vs `{"pipe_id": "P001-1-PIPE-SCH40-001"}`
- Allows coexistence of aggregate and discrete components

**Example**:
```sql
-- Component 1 (aggregate)
identity_key: {"pipe_id": "P001-1-PIPE-SCH40-AGG"}

-- Component 2 (legacy discrete)
identity_key: {"pipe_id": "P001-1-PIPE-SCH40-001"}

-- ✅ Both can exist without UNIQUE constraint violation
```

**Verification**:
- Existing UNIQUE constraint works with any JSONB structure
- Views/functions already expect pipe_id for threaded_pipe (migration 00055)
- No database migration required (JSONB supports any structure)

### Decision

**Use pipe_id with -AGG suffix for aggregate components**

Format: `{"pipe_id": "${drawing}-${size}-${commodity}-AGG"}`

Example: `{"pipe_id": "P001-1-PIPE-SCH40-AGG"}`

### Rationale

- **Production Compatibility**: Aligns with existing threaded_pipe schema in migration 00055
- **No Breaking Changes**: Views and functions already query pipe_id field
- **Clear Aggregate Marker**: -AGG suffix is semantically meaningful
- **Coexistence**: Different suffixes (-AGG vs -001, -002) allow both models
- **No Migration Required**: JSONB supports structure change without schema modification

### Alternatives Considered

1. **Use Class-B structure with seq: null**
   - Rejected: Conflicts with production schema (uses pipe_id, not drawing_norm/commodity_code/size)
   - Rejected: Would break existing views/functions that query pipe_id
   - Rejected: Requires migration to update all threaded_pipe identity_keys

2. **Add is_aggregate boolean flag**
   - Rejected: Redundant with -AGG suffix detection
   - Rejected: Increases data model complexity

3. **Create separate component_type: "threaded_pipe_aggregate"**
   - Rejected: Breaks existing progress template system (11 component types hardcoded)
   - Rejected: Requires database migration and template duplication

---

## Research Task 2: TanStack Query cache invalidation for quantity updates

### Question
When re-import updates total_linear_feet, does useComponents hook automatically refetch?

### Investigation

**Current Pattern** (from `/src/hooks/useComponents.ts`):
```typescript
// Components query uses project_id as query key
const queryKey = ['components', { projectId }];

// Import mutation invalidates ALL components for the project
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['components'] });
}
```

**Behavior**:
- Import mutation calls `queryClient.invalidateQueries()` on success
- All `useComponents` hooks for the project automatically refetch
- Updated `total_linear_feet` values appear in UI without manual refresh

**Cache Invalidation Flow**:
1. User triggers CSV import
2. Edge Function updates component (quantity sum or creation)
3. Import mutation's `onSuccess` callback runs
4. TanStack Query marks `['components', {projectId}]` cache as stale
5. Active `useComponents` hooks refetch from database
6. UI re-renders with updated data

### Decision

**Use existing invalidation pattern - no changes needed**

### Rationale

- Existing import mutation already invalidates components query
- Works for both new component creation AND quantity updates
- No performance concerns (invalidation scoped to project_id)
- Follows established TanStack Query patterns in codebase

### Alternatives Considered

1. **Optimistic updates with cache manipulation**
   - Rejected: Adds complexity for minimal UX benefit
   - Rejected: Import is async operation (Edge Function), user expects wait time

2. **Granular invalidation by component identity**
   - Rejected: Requires custom cache key structure
   - Rejected: Over-optimization for this feature (imports are infrequent)

3. **Realtime subscription to components table**
   - Rejected: Overkill for import workflow (one-time update)
   - Rejected: Adds unnecessary Realtime connection overhead

---

## Research Task 3: Edge Function transaction behavior for upsert logic

### Question
How to handle SELECT → UPDATE pattern within existing transaction boundary?

### Investigation

**Current Transaction Pattern** (from `/supabase/functions/import-takeoff/transaction-v2.ts:55-72`):
```typescript
// All operations wrapped in explicit transaction
const { data, error } = await supabaseClient.rpc('begin_transaction');

try {
  // Phase 1: Upsert metadata (areas, systems, packages)
  await tx.from('areas').upsert(...);

  // Phase 2: Process drawings
  await tx.from('drawings').upsert(...);

  // Phase 3: Create components (bulk insert)
  const components = [];
  // ... build component array ...
  await tx.from('components').insert(components);

  await supabaseClient.rpc('commit_transaction');
} catch (err) {
  await supabaseClient.rpc('rollback_transaction');
}
```

**Challenge**: Need SELECT → conditional UPDATE/INSERT within Phase 3

**Solution Pattern**:
```typescript
// Phase 3: Process components with aggregate logic
const componentsToInsert = [];

for (const row of rows) {
  if (row.type === 'threaded_pipe') {
    // Check for existing aggregate component
    const existing = await tx
      .from('components')
      .select('id, attributes')
      .eq('project_id', projectId)
      .eq('component_type', 'threaded_pipe')
      .eq('identity_key', identityKey)
      .maybeSingle();

    if (existing) {
      // Update existing (quantity sum)
      await tx.from('components').update({
        attributes: { ...existing.attributes, total_linear_feet: newTotal }
      }).eq('id', existing.id);
    } else {
      // Queue for bulk insert
      componentsToInsert.push(newComponent);
    }
  } else {
    // Existing quantity explosion logic
    componentsToInsert.push(...explodedComponents);
  }
}

// Bulk insert new components
if (componentsToInsert.length > 0) {
  await tx.from('components').insert(componentsToInsert);
}
```

### Decision

**Use SELECT → conditional UPDATE within transaction, preserve bulk insert for new components**

### Rationale

- PostgreSQL supports SELECT queries within transactions (READ COMMITTED isolation)
- `maybeSingle()` returns null if no match (safe for not-found case)
- UPDATE operations are safe within transaction (atomic with rollback)
- Bulk insert preserved for performance (non-threaded-pipe components)

### Alternatives Considered

1. **PostgreSQL UPSERT (ON CONFLICT DO UPDATE)**
   - Rejected: Requires UNIQUE constraint on identity_key alone (conflicts with multi-column key)
   - Rejected: Can't express "sum quantities" logic in SQL constraint

2. **Supabase RPC function for upsert logic**
   - Rejected: Adds deployment complexity (new RPC function)
   - Rejected: Less transparent than inline TypeScript logic

3. **Separate transaction per component**
   - Rejected: Performance issue (100s of round-trips for large imports)
   - Rejected: Loses atomicity (partial import on error)

---

## Research Task 4: React component rendering optimization

### Question
Does conditional helper text rendering affect virtualization performance?

### Investigation

**Current Virtualization** (from `/src/components/drawing-table/DrawingTable.tsx:87-124`):
- Uses `@tanstack/react-virtual` with fixed row height (48px)
- Renders 10,000+ rows with smooth scrolling
- Row height must be consistent for virtualization

**Helper Text Impact**:
```typescript
// Additional helper text for aggregate threaded pipe
{linearFeet !== null && (
  <span className="text-xs text-gray-500">
    {linearFeet} LF of {totalLF} LF
  </span>
)}
```

**Analysis**:
- Helper text is **inline within existing cell**, not a new row
- Row height remains 48px (sufficient for input + helper text)
- Conditional rendering has **negligible performance impact** (simple null check)
- Calculation (`Math.round((value / 100) * totalLF)`) is **O(1)** operation

**Performance Test Plan**:
1. Import 1000+ aggregate threaded pipe components
2. Measure render time with Chrome DevTools Performance tab
3. Compare: baseline (no helper text) vs enhanced (with helper text)
4. Target: <16ms render time per frame (60fps)

### Decision

**Add helper text without virtualization changes - monitor performance**

### Rationale

- Helper text fits within existing 48px row height
- Conditional rendering cost is trivial (< 1ms for 1000 rows)
- No changes needed to react-virtual configuration
- Performance impact can be measured in integration tests

### Alternatives Considered

1. **Tooltip instead of inline helper text**
   - Rejected: Requires hover interaction (poor mobile UX)
   - Rejected: Less discoverable (users won't know to hover)

2. **Separate column for linear feet**
   - Rejected: Increases table width (already 11 milestone columns)
   - Rejected: Overkill for one component type

3. **Dynamic row height based on content**
   - Rejected: Breaks virtualization (requires expensive layout calculations)
   - Rejected: Inconsistent row heights create visual jank

---

## Summary of Decisions

| Research Area | Decision | Rationale |
|---------------|----------|-----------|
| JSONB null handling | Use seq:null for aggregate identity | PostgreSQL natively distinguishes null vs numeric values |
| Cache invalidation | Reuse existing invalidateQueries pattern | Existing import mutation handles all update cases |
| Transaction upsert | SELECT → conditional UPDATE within tx | Preserves atomicity, supports quantity summing |
| Rendering performance | Add inline helper text, monitor perf | Fits existing row height, negligible cost |

---

## Research Task 5: Milestone Storage - Percentage vs Absolute Linear Feet

### Question
Should milestones be stored as percentages (0-100) or absolute linear feet for aggregate threaded pipe components?

### Investigation

**Problem Statement**:
Initial spec stored percentages but preserved them on re-import, causing logical contradiction:
- Import 50 LF, mark Fabricate at 100% (meaning 50 LF fabricated)
- Re-import adds 50 LF (total now 100 LF)
- If Fabricate percentage preserved at 100%, this incorrectly claims 100 LF fabricated (should be 50 LF)

**Percentage Storage (Original Approach)**:
```json
{
  "current_milestones": {
    "Fabricate": 100.00  // Percentage 0-100
  },
  "attributes": {
    "total_linear_feet": 100
  }
}
```
- Problem: Re-import changes total_linear_feet, making preserved percentage semantically wrong
- Example: 100% of 50 LF ≠ 100% of 100 LF

**Absolute LF Storage (Revised Approach)**:
```json
{
  "current_milestones": {
    "Fabricate_LF": 50  // Absolute linear feet
  },
  "attributes": {
    "total_linear_feet": 100
  }
}
```
- Solution: Preserved value remains accurate (50 LF fabricated regardless of total)
- UI calculates display percentage: `(50 / 100) * 100 = 50%`

### Decision

**Store milestones as absolute linear feet in dedicated fields**

Milestone Fields:
- Partial: `Fabricate_LF`, `Install_LF`, `Erect_LF`, `Connect_LF`, `Support_LF`
- Discrete: `Punch`, `Test`, `Restore` (remain boolean)

UI Display: Calculate percentages for display only

### Rationale

- **Data Integrity**: Absolute values preserve accurate work completed across quantity changes
- **Re-import Safety**: 50 LF fabricated remains 50 LF when total increases to 100 LF
- **User Clarity**: Helper text shows "50 LF of 100 LF" making absolute quantity visible
- **Automatic Recalculation**: Percentages update automatically when total changes (50/100 = 50%)
- **Migration Required**: Need to convert existing percentage storage to absolute LF

### Alternatives Considered

1. **Keep percentage storage, recalculate on re-import**
   - Rejected: Loses user intent (if 100% truly meant "all current footage", not "50 LF")
   - Rejected: Unclear whether to adjust percentages automatically or preserve them

2. **Store both percentage and absolute LF**
   - Rejected: Data redundancy and sync issues
   - Rejected: Unclear which value is source of truth

3. **Warn users but keep percentages**
   - Rejected: Doesn't solve data corruption problem
   - Rejected: Puts burden on users to manually fix percentages after every re-import

---

## Research Task 6: CSV Validator - Duplicate Handling for Threaded Pipe

### Question
Should CSV validator reject duplicate threaded_pipe identities, or allow them for quantity summing?

### Investigation

**Current Validator Behavior** (`src/lib/csv/csv-validator.ts` lines 120-138):
```typescript
if (identityMap.has(identityString)) {
  errors.push({
    row: index + 2,
    field: 'DUPLICATE',
    message: `Duplicate identity: ${identityString}`
  });
}
```

**Problem**: Validator rejects ALL duplicates, preventing User Story 2 (quantity summing)

**Use Case for Duplicates**:
- CSV contains multiple rows with same drawing+commodity+size but different line numbers
- Each row represents a different run of pipe (e.g., Line 101 = 50 LF, Line 205 = 50 LF)
- Expected behavior: Sum to 100 LF in one aggregate component

**Options**:
1. Validator rejects duplicates → Edge Function never sees them → Can't sum
2. Validator allows threaded_pipe duplicates → Edge Function handles summing

### Decision

**Relax validator to allow duplicate threaded_pipe identities**

Modified Logic:
```typescript
if (identityMap.has(identityString)) {
  if (typeLower !== 'threaded_pipe') {
    errors.push({
      row: index + 2,
      field: 'DUPLICATE',
      message: `Duplicate identity: ${identityString}`
    });
  }
  // For threaded_pipe: allow duplicates, skip validation error
}
```

### Rationale

- **Enables Quantity Summing**: Edge Function can process multiple rows with same identity
- **Backward Compatible**: Non-threaded-pipe types still reject duplicates (existing behavior)
- **Separation of Concerns**: Validator checks CSV format, Edge Function handles business logic
- **Line Number Tracking**: Multiple rows contribute to line_numbers array
- **User Experience**: Users don't need to pre-aggregate quantities in Excel before import

### Alternatives Considered

1. **Keep validator strict, require users to aggregate manually**
   - Rejected: Poor UX - users must edit CSV before import
   - Rejected: Loses line number traceability (which lines contributed to total?)

2. **Validator accepts duplicates for ALL types**
   - Rejected: Breaking change for other component types
   - Rejected: May hide genuine CSV errors (accidental duplicate valve rows)

3. **Add "merge duplicates" checkbox in UI**
   - Rejected: Adds complexity - why would users ever NOT want this for threaded_pipe?
   - Rejected: Inconsistent behavior based on checkbox state

---

## Technical Patterns Established

### Pattern 1: Aggregate Component Detection

```typescript
const isAggregateThreadedPipe = (component: Component): boolean => {
  return component.component_type === 'threaded_pipe' &&
         component.identity_key.pipe_id?.endsWith('-AGG');
};
```

**Usage**: Frontend display logic, helper text rendering, conditional formatting

### Pattern 2: Quantity Summing

```typescript
const newTotal = (existing.attributes?.total_linear_feet || 0) + row.qty;
await tx.from('components').update({
  attributes: { ...existing.attributes, total_linear_feet: newTotal }
}).eq('id', existing.id);
```

**Usage**: Edge Function import logic for re-import scenarios

### Pattern 3: Linear Feet Calculation

```typescript
const linearFeet = Math.round((percentage / 100) * total_linear_feet);
```

**Usage**: Helper text display, milestone progress visualization

---

## Open Questions (Deferred to Implementation)

None - all NEEDS CLARIFICATION items resolved.

---

## References

- PostgreSQL JSONB documentation: https://www.postgresql.org/docs/current/datatype-json.html
- TanStack Query invalidation: https://tanstack.com/query/latest/docs/react/guides/query-invalidation
- Supabase transactions: https://supabase.com/docs/reference/javascript/db-transactions
- react-virtual performance: https://tanstack.com/virtual/latest/docs/guide/introduction

---

**Status**: ✅ Research Complete | Ready for Phase 1 (Design & Contracts)
