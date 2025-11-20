# Schema Compliance Workflow

**Purpose:** Prevent schema mismatch errors when writing database insert/update code

**When to use:** Before writing any code that inserts or updates database records

---

## The Problem

Manual object construction for database inserts leads to:
- Missing required fields
- Incorrect column names (e.g., `type` vs `component_type`)
- Wrong identity_key structure
- Type mismatches that only fail at runtime

**Example of what NOT to do:**
```typescript
// ❌ BAD: Manual construction - prone to errors
await supabase.from('components').insert({
  project_id: projectId,
  type: 'field_weld', // WRONG: column is 'component_type'
  identity_key: { weld_id: weldNumber }, // WRONG: should be 'weld_number'
  // Missing: progress_template_id (required!)
  // Missing: last_updated_by (should match created_by)
})
```

---

## The Solution: 4-Step Workflow

### Step 1: Check the Schema FIRST

**Before writing any insert code**, check the actual table definition:

```bash
# Find the table creation migration
grep -r "CREATE TABLE <table_name>" supabase/migrations/

# Or check generated types
grep -A 30 "table_name.*{" src/types/database.types.ts
```

**What to look for:**
- ✅ All `NOT NULL` columns (these are required)
- ✅ Column names (exact spelling)
- ✅ CHECK constraints (valid values)
- ✅ Default values (can be omitted)
- ✅ Foreign key references

### Step 2: Use Type-Safe Helpers

**Never manually construct insert objects.** Always use helper functions.

**For edge functions:**
```typescript
// ✅ GOOD: Use schema-helpers.ts
import { buildFieldWeldComponent, buildFieldWeld } from './schema-helpers.ts'

const componentData = buildFieldWeldComponent({
  projectId,
  drawingId,
  progressTemplateId,
  weldNumber,
  areaId,
  systemId,
  testPackageId,
  userId,
})
// TypeScript will error if you miss required params!
```

**For client code:**
```typescript
// ✅ GOOD: Use generated Database types
import type { Database } from '@/types/database.types'

type ComponentInsert = Database['public']['Tables']['components']['Insert']

const componentData: ComponentInsert = {
  project_id: projectId,
  component_type: 'field_weld',
  // TypeScript will show you what's required
}
```

### Step 3: Compare Against Working Examples

Find existing code that inserts to the same table:

```bash
# Search for existing inserts
grep -r "\.from('components').*insert" supabase/

# Look at RPC functions
grep -r "INSERT INTO components" supabase/migrations/
```

**Compare field by field:**
- Are you using the same column names?
- Are you including the same required fields?
- Are you using the same identity_key structure?

### Step 4: Validate Before Deploying

**For edge functions:**
1. Run TypeScript type check: `deno check <file>`
2. Test locally if possible
3. Check Supabase logs after deployment

**For client code:**
1. Run type check: `tsc -b`
2. Write a test that exercises the insert
3. Run the test before committing

---

## Edge Function Pattern

### File Structure
```
supabase/functions/your-function/
├── index.ts          # Entry point
├── schema-helpers.ts # Type-safe insert builders ⭐
├── transaction.ts    # Business logic (uses helpers)
└── validator.ts      # Input validation
```

### schema-helpers.ts Template

```typescript
/**
 * Type-safe insert helpers for [function-name]
 *
 * IMPORTANT: When schema changes:
 * 1. Run: supabase gen types typescript --linked > src/types/database.types.ts
 * 2. Update types here
 * 3. Update builder functions
 */

export interface TableNameInsert {
  // Copy from database.types.ts
  // Mark required vs optional clearly
}

export function buildTableRecord(params: {
  // Use camelCase param names
  // TypeScript enforces all required params
}): TableNameInsert {
  return {
    // Map params to snake_case DB columns
    // Include all required fields
    // Include audit fields (created_by, updated_by, timestamps)
  }
}
```

---

## Checklist: Before Writing Insert Code

- [ ] Read the `CREATE TABLE` migration for this table
- [ ] Check for `NOT NULL` columns (all required)
- [ ] Check for `CHECK` constraints (valid values)
- [ ] Check for identity_key validation (if components table)
- [ ] Use type-safe helper or generated types
- [ ] Compare against existing working code
- [ ] Include audit fields (created_by, last_updated_by, timestamps)
- [ ] Run type check before committing

---

## Common Gotchas

| Table | Common Mistake | Fix |
|-------|---------------|-----|
| `components` | Using `type` instead of `component_type` | Always use `component_type` |
| `components` | Wrong identity_key structure | Check validation function in migration 00010 |
| `components` | Missing `progress_template_id` | Always required, fetch before insert |
| `components` | Missing `last_updated_by` | Should match `created_by` on create |
| `field_welds` | Invalid `weld_type` | Must be 'BW', 'SW', 'FW', or 'TW' |
| `field_welds` | Invalid `nde_type` | Must be 'RT', 'UT', 'PT', 'MT', 'VT', or null |
| `field_welds` | Invalid `nde_result` | Must be 'PASS', 'FAIL', 'PENDING', or null |

---

## When Schema Changes

**If you modify a table schema:**

1. **Update generated types:**
   ```bash
   supabase gen types typescript --linked > src/types/database.types.ts
   ```

2. **Update edge function helpers:**
   - Copy new type definitions to `schema-helpers.ts`
   - Update builder functions
   - Add validation for new constraints

3. **Update all insert code:**
   - Search for inserts to that table: `grep -r "\.from('table_name')"`
   - Update each one to include new required fields
   - Remove any deprecated fields

4. **Test thoroughly:**
   - Run all tests
   - Test imports/inserts manually
   - Check Supabase logs for constraint violations

---

## Migration Review Checklist

**When reviewing migrations that add/modify tables:**

- [ ] Are there new `NOT NULL` columns?
- [ ] Are there new `CHECK` constraints?
- [ ] Do identity_key structures change?
- [ ] Are there new required foreign keys?
- [ ] Update CLAUDE.md "Modifying Existing Tables" if critical
- [ ] Update schema-helpers.ts in affected edge functions
- [ ] Search for all insert code that needs updating

---

## References

- **Schema validation functions:** `supabase/migrations/00010_component_tracking.sql`
- **Generated types:** `src/types/database.types.ts`
- **Example helper:** `supabase/functions/import-field-welds/schema-helpers.ts`
- **RPC examples:** `supabase/migrations/*_rpc.sql` (use SECURITY DEFINER functions as reference)
