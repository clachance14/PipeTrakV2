---
name: backend-schema-compliance
description: Use PROACTIVELY when writing SQL, creating RPCs, modifying schemas, or working with edge functions. Enforces schema compliance workflow to prevent key mismatches, missing required fields, and type errors. MANDATORY before any database insert/update code.
---

# Backend Schema Compliance Skill

## Purpose

Prevent schema mismatch errors by enforcing the documented workflow in `docs/workflows/SCHEMA-COMPLIANCE-WORKFLOW.md` before any backend code is written.

**This skill is MANDATORY** for all backend/database work.

---

## When to Activate

This skill **MUST** activate automatically when detecting:

### Keywords in User Messages
- "insert into"
- "update table"
- "edge function"
- "RPC"
- "migration"
- "SECURITY DEFINER"
- "database"
- "schema"
- "create table"
- "alter table"
- "add column"
- "field_weld", "component", "welder" (table names)

### File Paths
- `supabase/functions/*/`
- `supabase/migrations/*.sql`
- Any mention of schema-helpers.ts

### Actions
- Creating new edge function
- Modifying existing edge function that inserts data
- Writing migration that creates/alters tables
- Writing code that inserts or updates database records

---

## Enforcement Workflow

When this skill activates, follow these steps **WITHOUT EXCEPTION**:

### Step 1: Identify the Operation

Ask the user (if not clear):
- Which table(s) will be modified?
- Is this an insert, update, or migration?
- Is this client code or edge function?

**DO NOT PROCEED** until you know the target table(s).

---

### Step 2: Retrieve Current Schema (SOURCE OF TRUTH)

For each target table, retrieve the **actual current schema**:

#### Option A: Read from Supabase Schema Export (PREFERRED if available)
If user has recent schema export, use it as source of truth.

#### Option B: Read from Migrations (FALLBACK)
```bash
# Find table creation migration
grep -r "CREATE TABLE <table_name>" supabase/migrations/

# Find any ALTER TABLE changes
grep -r "ALTER TABLE <table_name>" supabase/migrations/

# Read the latest migration for that table
```

#### Option C: Use Reference Docs (QUICK LOOKUP ONLY)
- `schema-reference.md` - Quick reference for common tables
- `identity-key-structures.md` - Identity key structures by type

**IMPORTANT**: If migrations conflict with reference docs, **migrations win**.

---

### Step 3: Extract Schema Requirements

From the schema, extract and present to the user:

```markdown
## Schema Requirements for `<table_name>`

### Required Fields (NOT NULL without DEFAULT):
- `field_name` (type) - [description/constraint]
- ...

### Optional Fields with Defaults:
- `field_name` (type) - Default: [value]
- ...

### Optional Fields (Nullable):
- `field_name` (type | null)
- ...

### CHECK Constraints:
- `field_name` must be one of: [value1, value2, ...]
- ...

### JSONB Structure Requirements:
[If identity_key or other JSONB field]
- Structure: {...}
- Validation function: [name]

### Audit Fields Pattern:
- created_at (timestamptz) - Default now()
- created_by (uuid) - Should always be set
- updated_at (timestamptz) - If applicable
```

---

### Step 4: Present Pre-Coding Checklist

Before allowing the user to write code, present this checklist:

```markdown
## Pre-Coding Checklist for `<table_name>` Insert

**You MUST complete this checklist before writing insert code:**

### Schema Verification
- [ ] I have read the CREATE TABLE migration for this table
- [ ] I have checked for any ALTER TABLE modifications since creation
- [ ] I know all NOT NULL columns (required fields)
- [ ] I know all CHECK constraints (valid values)
- [ ] I know all FK references (related tables)

### Identity Key (If components table)
- [ ] I have verified the identity_key structure for this component_type
- [ ] I have checked the validate_component_identity_key() function
- [ ] I know which fields are required (e.g., commodity_code NOT tag_number)

### Type Safety Approach
- [ ] For edge functions: I will use schema-helpers.ts pattern
- [ ] For client code: I will use generated Database types
- [ ] I will NOT manually construct insert objects

### Common Mistakes Check
- [ ] I will use `component_type`, NOT `type`
- [ ] I will use numeric milestone values (0-1), NOT boolean
- [ ] I will match project_id between related entities
- [ ] I will use exact enum values (e.g., 'BW', 'RT', case-sensitive)
- [ ] I will include audit fields (created_by, last_updated_by)
- [ ] I will verify JSONB size limits (attributes ≤10KB, metadata ≤5KB)

**Proceed only after checking ALL boxes.**
```

---

### Step 5: Check for Schema Helpers (Edge Functions Only)

If working on an edge function that inserts data:

```markdown
## Edge Function Schema Helpers Check

Looking for: `supabase/functions/<function-name>/schema-helpers.ts`

[Check if file exists]

**Result**:
- ✅ Found: schema-helpers.ts exists
- ❌ Not Found: schema-helpers.ts missing

[If missing]:
⚠️ **STOP**: You must create schema-helpers.ts first.

See `schema-helpers-template.md` for the pattern.

**Why**: Every edge function that inserts data MUST use type-safe helpers.
This is a mandatory pattern to prevent schema mismatches.

**Reference**: `supabase/functions/import-field-welds/schema-helpers.ts`
```

If schema-helpers.ts is missing, **DO NOT write insert code**. Generate the schema-helpers.ts file first using the template.

---

### Step 6: Compare Against Working Examples

Find existing code that inserts to the same table:

```bash
# Search for existing inserts
grep -r "\.from('<table_name>').*insert" supabase/
grep -r "INSERT INTO <table_name>" supabase/migrations/
```

Present findings:
```markdown
## Working Examples for `<table_name>` Inserts

[Show code snippets from existing working inserts]

**Verify**:
- Am I using the same column names?
- Am I including the same required fields?
- Am I using the same identity_key structure? (if components)
- Am I following the same audit field pattern?
```

---

### Step 7: Validate Implementation (After Code Written)

After the user writes the insert code, validate it:

#### For Edge Functions:
```markdown
## Validation: Edge Function Insert Code

**Checking**:
- [✅/❌] Uses buildTableRecord() from schema-helpers.ts
- [✅/❌] Passes all required params to builder function
- [✅/❌] Includes userId for audit trail
- [✅/❌] Handles optional params correctly (null vs undefined)
- [✅/❌] Uses correct column names (component_type not type)
- [✅/❌] Uses correct identity_key structure
- [✅/❌] Uses numeric milestones (0-1), not boolean
- [✅/❌] Matches project_id between related entities

**If any ❌**: Fix before proceeding.
```

#### For Client Code:
```markdown
## Validation: Client Code Insert

**Checking**:
- [✅/❌] Uses Database types from src/types/database.types.ts
- [✅/❌] TypeScript shows no type errors
- [✅/❌] All required fields included
- [✅/❌] Uses correct column names
- [✅/❌] Uses exact enum values (case-sensitive)

**Run**: `tsc -b` to verify type safety

**If any ❌**: Fix before proceeding.
```

---

### Step 8: SQL Migration Validation (For Migrations Only)

**CRITICAL**: If working on a `.sql` migration file, run PostgreSQL-specific validation BEFORE pushing.

This step prevents wasted context from push failures due to PostgreSQL constraints.

**Real example**: Migration 20251121185757 failed with "cannot change return type of existing function" - wasted significant context debugging after failed push.

#### When to Run

Only for migration files (`supabase/migrations/*.sql`). Skip for edge functions and client code.

#### Validation Checks

```markdown
## PostgreSQL Migration Pre-Push Validation

[Read migration.sql file]

### Running validation rules (see migration-validation-rules.md):

**CRITICAL Checks (Block push if fail)**:
- [ ] Rule 1: CREATE OR REPLACE FUNCTION with signature change
- [ ] Rule 3: ADD NOT NULL with existing NULLs
- [ ] Rule 4: ADD UNIQUE with duplicates

**WARNING Checks (Ask confirmation)**:
- [ ] Rule 2: ALTER COLUMN TYPE on large tables
- [ ] Rule 5: DROP COLUMN data loss
- [ ] Rule 6: RENAME with dependencies
- [ ] Rule 7: Missing indexes on foreign keys

### Results:

[For each rule that triggers, show specific validation result]

#### Rule 1 Example: CREATE OR REPLACE FUNCTION

**Detected**: CREATE OR REPLACE FUNCTION get_weld_summary_by_welder

**Checking** if function exists and signature changed...

[Query database for existing function signature]

**Result**:
- [✅] Function doesn't exist → Safe to use CREATE OR REPLACE
- [❌] Function exists, signature changed → **MUST DROP first**
- [✅] Function exists, signature same → Safe to use CREATE OR REPLACE

**If ❌**:
```markdown
❌ **BLOCKED**: Cannot change function return type with CREATE OR REPLACE

**Function**: get_weld_summary_by_welder
**Issue**: Return signature changed (added columns: bw_welds_5pct, sw_welds_5pct)

**PostgreSQL will fail with**:
ERROR: cannot change return type of existing function (SQLSTATE 42P13)

**Required fix**:
```sql
-- Add DROP before CREATE
DROP FUNCTION IF EXISTS get_weld_summary_by_welder(UUID, DATE, DATE, UUID[], UUID[], UUID[], UUID[]);

-- Change CREATE OR REPLACE → CREATE
CREATE FUNCTION get_weld_summary_by_welder(...)
RETURNS TABLE (...);
```

Apply fix automatically? [Y/n]
```

**If auto-fix accepted**: Update migration file, then proceed
**If auto-fix declined**: STOP - user must fix manually

---

#### Rule 3 Example: ADD NOT NULL

**Detected**: ALTER TABLE field_welds ALTER COLUMN xray_percentage SET NOT NULL

**Checking** for existing NULL values...

```sql
SELECT COUNT(*) FROM field_welds WHERE xray_percentage IS NULL;
```

**Result**:
- [✅] No NULL values → Safe to add NOT NULL
- [❌] NULL values exist → **MUST backfill first**

**If ❌**:
```markdown
❌ **BLOCKED**: Cannot add NOT NULL - existing NULL values

**Table**: field_welds
**Column**: xray_percentage
**NULL count**: 142 rows

**PostgreSQL will fail with**:
ERROR: column "xray_percentage" contains null values

**Required fix**:
```sql
-- Backfill NULLs first
UPDATE field_welds SET xray_percentage = 0 WHERE xray_percentage IS NULL;

-- Then add NOT NULL
ALTER TABLE field_welds ALTER COLUMN xray_percentage SET NOT NULL;
```

What default value for backfill? (Suggested: 0): ___
```

---

#### Rule 2 Example: ALTER TYPE (Warning)

**Detected**: ALTER TABLE components ALTER COLUMN attributes TYPE jsonb USING attributes::jsonb

**Checking** table size...

```sql
SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = 'components';
```

**Result**:
- [✅] Small table (<10K rows) → Safe
- [⚠️] Large table (>10K rows) → **Performance warning**

**If ⚠️**:
```markdown
⚠️ **PERFORMANCE WARNING**: ALTER TYPE on large table

**Table**: components
**Rows**: 1,234,567
**Estimated time**: 5-10 minutes
**Impact**: Table locked (AccessExclusiveLock) - blocks all queries

**Alternative approach**:
1. Add new column with new type
2. Backfill in batches
3. Update app to use new column
4. Drop old column later

Proceed with ALTER TYPE anyway? [Y/n]
```

---

### Validation Summary

After all checks complete:

**If any ❌ (CRITICAL)**:
```markdown
❌ **MIGRATION BLOCKED**: Fix required before push

[List all critical issues]

**Cannot push until fixed.**
```

**If only ⚠️ (WARNINGS)**:
```markdown
⚠️ **WARNINGS**: Review before push

[List all warnings]

**Proceed with caution.** Type 'PUSH' to confirm: ___
```

**If all ✅**:
```markdown
✅ **All PostgreSQL validation checks passed**

Your migration is safe to push:
- No function signature conflicts
- No constraint violations
- No data loss risks
- All performance considerations addressed

**Proceed with**: ./db-push.sh
```

```

---

### Step 9: Post-Coding Verification

After code is written and validated:

```markdown
## Post-Coding Verification Checklist

- [ ] Run type check: `tsc -b` (client) or `deno check` (edge function)
- [ ] No type errors
- [ ] All required fields included
- [ ] All common mistakes avoided (see common-mistakes.md)
- [ ] Audit fields included
- [ ] Ready to test/deploy
```

---

## Critical Rules (NEVER SKIP)

### Rule 1: Always Check Schema First
**NEVER** write insert code without first reading the CREATE TABLE migration.

### Rule 2: Always Use Type-Safe Helpers
**NEVER** manually construct insert objects. Always use:
- schema-helpers.ts (edge functions)
- Database types (client code)

### Rule 3: Always Validate Identity Keys
**NEVER** guess identity_key structure. Always check:
- `identity-key-structures.md`
- `validate_component_identity_key()` function in migrations

### Rule 4: Always Use Numeric Milestones
**NEVER** use boolean values in current_milestones. Always use:
- 1 = complete (100%)
- 0 = not started (0%)
- 0.75 = partial (75%)

### Rule 5: Always Match project_id
**NEVER** use different project_id for related entities.

### Rule 6: Always Use Exact Enum Values
**NEVER** use human-readable enum values. Always use:
- 'BW' not 'butt weld'
- 'RT' not 'X-Ray'
- 'accepted' not 'approved'

---

## Common Mistakes to Prevent

Before writing any code, remind the user of these **actual production bugs**:

1. **Boolean vs Numeric Milestones** (Migration 00084)
   - ❌ WRONG: `{"Receive": true}`
   - ✅ CORRECT: `{"Receive": 1}`

2. **Wrong Identity Key Fields** (Migration 00055)
   - ❌ WRONG: `tag_number` for Class-B components
   - ✅ CORRECT: `commodity_code` for Class-B components

3. **Column Name Typos** (Feature 018)
   - ❌ WRONG: `type`
   - ✅ CORRECT: `component_type`

4. **Missing Required Fields**
   - ❌ WRONG: Omitting `progress_template_id`
   - ✅ CORRECT: Always fetch template ID before insert

5. **Invalid Enum Values**
   - ❌ WRONG: `weld_type: 'butt weld'`
   - ✅ CORRECT: `weld_type: 'BW'`

6. **Mismatched project_id**
   - ❌ WRONG: Different project_id for field_weld than component
   - ✅ CORRECT: Same project_id for all related entities

**See**: `common-mistakes.md` for detailed examples

---

## When Schema Changes

If the user is modifying schema (migration), add these steps:

### Additional Checklist for Schema Modifications
```markdown
## Schema Modification Checklist

- [ ] Created new migration (never modified existing)
- [ ] Waited 2+ seconds since last migration (avoid timestamp collision)
- [ ] Added RLS policies if new table
- [ ] Updated validation functions if identity_key changed
- [ ] Documented breaking changes in CLAUDE.md
- [ ] Planned edge function schema-helpers.ts updates
- [ ] Planned client code type regeneration

**After migration applied**:
- [ ] Run: supabase gen types typescript --linked > src/types/database.types.ts
- [ ] Update schema-helpers.ts in affected edge functions
- [ ] Update skill reference docs: npm run sync-skill-docs
- [ ] Search for all insert code that needs updating
- [ ] Test thoroughly
```

---

## Reference Documentation

### Quick References (In This Skill Directory)
- `schema-reference.md` - Current table structures and constraints
- `identity-key-structures.md` - Identity key requirements by component type
- `common-mistakes.md` - Real production bugs to avoid
- `schema-helpers-template.md` - Edge function pattern template

### Project Documentation
- `docs/workflows/SCHEMA-COMPLIANCE-WORKFLOW.md` - Full workflow guide
- `docs/security/RLS-RULES.md` - RLS patterns and templates
- `docs/security/RLS-AUDIT-CHECKLIST.md` - RLS quick reference
- `supabase/functions/import-field-welds/schema-helpers.ts` - Reference implementation

### Generated Types
- `src/types/database.types.ts` - TypeScript types generated from schema

---

## Example Activation

### User says: "I need to insert a new field weld"

**Skill response**:
```markdown
I'm using the backend-schema-compliance skill to ensure we follow the schema compliance workflow.

## Step 1: Operation Identified
Target table: `field_welds`
Operation: INSERT
Context: [edge function | client code]?

Before we write any code, let me check the current schema for field_welds...

[Read migrations or schema export]

## Step 2: Schema Requirements for `field_welds`

### Required Fields:
- component_id (uuid, FK → components, UNIQUE)
- project_id (uuid, FK → projects)
- weld_type (text, CHECK: 'BW' | 'SW' | 'FW' | 'TW')
- created_by (uuid, FK → users)

### Optional with Defaults:
- nde_required (boolean, default: false)
- status (text, default: 'active', CHECK: 'active' | 'accepted' | 'rejected')
- is_unplanned (boolean, default: false)
- created_at (timestamptz, default: now())
- updated_at (timestamptz, default: now())

### Optional Fields:
- weld_size, schedule, base_metal, spec, welder_id, date_welded
- nde_type (CHECK: 'RT' | 'UT' | 'PT' | 'MT' | 'VT' | null)
- nde_result (CHECK: 'PASS' | 'FAIL' | 'PENDING' | null)
- xray_percentage (CHECK: 0-100 or null)
- original_weld_id (FK → field_welds, for repairs)
- notes

### Critical Constraints:
1. weld_type MUST be exactly 'BW', 'SW', 'FW', or 'TW' (case-sensitive)
2. component_id UNIQUE (only one field_welds row per component)
3. project_id MUST match component's project_id

## Step 3: Pre-Coding Checklist

Before writing insert code, confirm:
- [✅] I have read the field_welds schema
- [✅] I know weld_type must be 'BW', 'SW', 'FW', or 'TW'
- [✅] I will match project_id with the component
- [✅] I will include created_by for audit trail
- [✅] I will use schema-helpers.ts if this is an edge function

Ready to proceed?
```

---

## Success Criteria

This skill succeeds when:

✅ User has reviewed current schema before writing code
✅ User has completed pre-coding checklist
✅ Type-safe helpers used (schema-helpers.ts or Database types)
✅ All required fields included
✅ All common mistakes avoided
✅ Audit fields included
✅ Code passes type check
✅ No schema mismatch errors occur

---

## Failure Modes (What This Skill Prevents)

This skill prevents:

❌ Missing required fields (e.g., progress_template_id)
❌ Wrong column names (e.g., type instead of component_type)
❌ Wrong identity_key structure (e.g., tag_number instead of commodity_code)
❌ Boolean milestone values (should be numeric 0-1)
❌ Invalid enum values (e.g., 'butt weld' instead of 'BW')
❌ Mismatched project_id between related entities
❌ Missing audit fields (created_by, last_updated_by)
❌ JSONB size limit violations (>10KB attributes, >5KB metadata)
❌ Edge functions without schema-helpers.ts
❌ Manual object construction prone to typos

**Every item above has caused a real production bug.** This skill prevents them.

---

## Enforcement Priority

**CRITICAL**: This skill is **MANDATORY**, not optional.

If the user tries to write backend code without following this workflow:

1. **STOP** them immediately
2. **REMIND** them of the schema compliance requirement
3. **GUIDE** them through the workflow
4. **VALIDATE** before allowing them to proceed

**Do not rationalize** skipping steps. **Do not assume** the user knows the schema. **Always enforce** the checklist.

---

## Integration with Other Skills

This skill works with:
- **test-driven-development** - Write tests that exercise inserts (after schema check)
- **systematic-debugging** - If insert fails, trace back through schema mismatch
- **code-reviewer** - Validate schema compliance in review

---

## Notes

- This skill reads migrations directly as source of truth (hybrid approach)
- Reference docs are for quick lookup only
- If migrations conflict with reference docs, migrations win
- Skill docs should be updated after schema changes via `npm run sync-skill-docs`
- See CLAUDE.md for migration workflow and known CLI issues
