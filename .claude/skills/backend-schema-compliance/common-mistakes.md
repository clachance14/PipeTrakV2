# Common Schema Mistakes - Real Production Bugs

---
**⚠️ LEARN FROM HISTORY**

This document catalogs **actual production bugs** caused by schema mismatches in PipeTrak V2.

**Purpose**: Prevent repeating these mistakes.

**Source**: `docs/BUG-FIXES.md`, implementation notes, git history
---

## Bug #1: Boolean vs Numeric Milestones (Migration 00084)

**Date**: 2025-11-08

**Severity**: CRITICAL - Blocked core functionality

### What Happened

Welder assignment produced 400 Bad Request errors when updating milestones.

### Root Cause

```typescript
// ❌ WRONG: Components table stored boolean values
current_milestones: {
  "Receive": true,
  "Weld Made": false
}

// ✅ EXPECTED: RPC function expected numeric values
current_milestones: {
  "Receive": 1,
  "Weld Made": 0
}
```

**Error Message**:
```
invalid input syntax for type numeric: "true"
PostgreSQL Error Code: 22P02
```

### Impact

- 28 components had incorrect milestone format
- Welder assignment completely broken
- Required emergency data migration

### The Fix

Migration 00084 converted all boolean milestone values to numeric format (1/0).

### Prevention

**Always use numeric values (0-1) for `current_milestones`, NEVER booleans.**

```typescript
// Type-safe helper pattern
interface ComponentMilestones {
  [milestoneName: string]: number  // 0-1 range
}

const milestones: ComponentMilestones = {
  "Receive": 1,      // Complete (100%)
  "Erect": 0,        // Not started (0%)
  "Fabricate": 0.75  // Partial (75%)
}
```

---

## Bug #2: Wrong Identity Key Fields (Migration 00055)

**Date**: 2025-11-05

**Severity**: HIGH - Activity feed broken

### What Happened

Activity feed queries failed because code used wrong identity_key field names for Class-B components.

### Root Cause

```sql
-- ❌ WRONG: Code used tag_number
c.identity_key->>'tag_number'

-- ✅ CORRECT: Schema uses commodity_code
c.identity_key->>'commodity_code'
```

**Affected Component Types**: valve, support, fitting, flange, instrument, tubing, hose, misc_component

### Impact

- Activity feed showed errors for all Class-B component updates
- Required emergency migration to fix view
- Stale documentation misled developers

### The Fix

Migration 00055 corrected all identity_key references in views and functions.

### Prevention

**Class-B components use `commodity_code`, NOT `tag_number`.**

Always check `identity-key-structures.md` or the `validate_component_identity_key()` function before constructing identity keys.

```typescript
// ❌ WRONG
identity_key: {
  drawing_norm: "P-001",
  tag_number: "V-001",  // NO!
  size: "2IN",
  seq: 1
}

// ✅ CORRECT
identity_key: {
  drawing_norm: "P-001",
  commodity_code: "V-CS-150",  // YES!
  size: "2IN",
  seq: 1
}
```

---

## Bug #3: `type` vs `component_type` Confusion (Feature 018)

**Severity**: MEDIUM - Repeated pattern of errors

### What Happened

Developers frequently used `type` instead of `component_type` when querying or inserting components.

### Root Cause

**Column name is `component_type`, not `type`.**

```typescript
// ❌ WRONG
await supabase.from('components').insert({
  project_id: projectId,
  type: 'field_weld',  // Column doesn't exist!
  // ...
})

// ✅ CORRECT
await supabase.from('components').insert({
  project_id: projectId,
  component_type: 'field_weld',  // Correct column name
  // ...
})
```

### Impact

- Runtime errors (column doesn't exist)
- TypeScript didn't catch because manual object construction
- Repeated in multiple features

### Prevention

**Always use `component_type`, never `type`.**

Use type-safe helpers to prevent typos:

```typescript
// Type-safe approach
type ComponentInsert = Database['public']['Tables']['components']['Insert']

const component: ComponentInsert = {
  component_type: 'field_weld',  // TypeScript enforces correct name
  // ...
}
```

---

## Bug #4: Missing Required Fields

**Severity**: HIGH - Frequent pattern

### What Happened

Edge functions and client code frequently omitted required fields, causing constraint violations at runtime.

### Root Cause

Manual object construction without checking schema:

```typescript
// ❌ WRONG: Missing progress_template_id
const component = {
  project_id: projectId,
  component_type: 'field_weld',
  identity_key: { weld_number: 'W-001' },
  // Missing: progress_template_id (required!)
  // Missing: current_milestones (required!)
  // Missing: percent_complete (required!)
}
```

### Impact

- PostgreSQL constraint violations
- Failed imports
- Runtime errors instead of compile-time errors

### Prevention

**Always use schema-helpers.ts pattern for edge functions:**

```typescript
// ✅ CORRECT: Type-safe builder
import { buildFieldWeldComponent } from './schema-helpers.ts'

const component = buildFieldWeldComponent({
  projectId,
  drawingId,
  progressTemplateId,  // TypeScript enforces you provide this
  weldNumber,
  userId,
  // Builder includes all required fields
})
```

**For client code, use generated types:**

```typescript
// ✅ CORRECT: Generated type enforces requirements
type ComponentInsert = Database['public']['Tables']['components']['Insert']

const component: ComponentInsert = {
  // TypeScript shows you what's required
}
```

---

## Bug #5: Mismatched project_id

**Severity**: MEDIUM - RLS policy violations

### What Happened

Code created field_welds with `project_id` that didn't match the component's `project_id`.

### Root Cause

```typescript
// ❌ WRONG: Different project_id than component
const fieldWeld = {
  component_id: componentId,
  project_id: someOtherProjectId,  // Mismatch!
  // ...
}
```

### Impact

- RLS policy violations
- Data isolation broken
- Queries return unexpected results

### Prevention

**Always use the same `project_id` for field_weld as its component.**

```typescript
// ✅ CORRECT: Match component's project_id
const component = await supabase
  .from('components')
  .select('project_id')
  .eq('id', componentId)
  .single()

const fieldWeld = {
  component_id: componentId,
  project_id: component.data.project_id,  // Match!
  // ...
}
```

---

## Bug #6: Invalid Enum Values

**Severity**: MEDIUM - CHECK constraint violations

### What Happened

Code used invalid values for enum-like fields.

### Examples

```typescript
// ❌ WRONG: Invalid weld_type
weld_type: 'butt weld'  // Must be exactly 'BW'

// ❌ WRONG: Invalid nde_type
nde_type: 'X-Ray'  // Must be exactly 'RT'

// ❌ WRONG: Invalid status
status: 'approved'  // Must be 'accepted' (not 'approved')
```

### Impact

PostgreSQL CHECK constraint violations at runtime.

### Prevention

**Use TypeScript literal types:**

```typescript
// ✅ CORRECT: Type-safe enums
type WeldType = 'BW' | 'SW' | 'FW' | 'TW'
type NdeType = 'RT' | 'UT' | 'PT' | 'MT' | 'VT' | null
type WeldStatus = 'active' | 'accepted' | 'rejected'

interface FieldWeldInsert {
  weld_type: WeldType  // TypeScript prevents typos
  nde_type?: NdeType
  status?: WeldStatus
}
```

---

## Bug #7: JSONB Size Limits Exceeded

**Severity**: LOW - Occasional errors

### What Happened

Code inserted JSONB data exceeding size constraints.

### Constraints

- `components.attributes`: Max 10KB (10,240 bytes)
- `milestone_events.metadata`: Max 5KB (5,120 bytes)

### Prevention

**Validate JSONB size before insert:**

```typescript
// Check size
const sizeInBytes = new TextEncoder().encode(JSON.stringify(attributes)).length

if (sizeInBytes > 10240) {
  throw new Error(`Attributes too large: ${sizeInBytes} bytes (max 10KB)`)
}
```

---

## Bug #8: Forgot Audit Fields

**Severity**: LOW - Missing audit trail

### What Happened

Code omitted `created_by` and `last_updated_by` fields.

### Prevention

**Always set audit fields:**

```typescript
// ✅ CORRECT: Include audit fields
const component = {
  // ... other fields
  created_by: userId,
  last_updated_by: userId,  // Should match created_by on insert
  // created_at and last_updated_at have defaults, but can be set explicitly
}
```

---

## Summary: Top Prevention Strategies

1. **Use type-safe helpers** (schema-helpers.ts for edge functions)
2. **Use generated types** (Database types for client code)
3. **Check schema first** (Read CREATE TABLE before writing insert code)
4. **Numeric milestones** (0-1 range, NEVER boolean)
5. **Correct column names** (component_type not type, commodity_code not tag_number)
6. **Match project_id** (Between related entities)
7. **Exact enum values** ('BW', 'RT', etc. - case-sensitive)
8. **Include audit fields** (created_by, last_updated_by)

**Remember**: Every bug in this document was a real production issue that could have been prevented by following the schema compliance workflow.
