# Migration Validation Test - Real Example

**Test Case**: Migration 20251121185757_add_socket_weld_section_to_welder_summary.sql

**Scenario**: The actual failed migration from production logs

---

## What Actually Happened (Without Skill)

### Timeline of Wasted Context:

1. **User creates migration** with `CREATE OR REPLACE FUNCTION`
2. **Skill says**: ✅ "Backend Schema Compliance - PASSED"
3. **User runs**: `./db-push.sh`
4. **❌ FAIL**: "ERROR: cannot change return type of existing function (SQLSTATE 42P13)"
5. **User debugs**: "I need to DROP the function first"
6. **User fixes**: Adds `DROP FUNCTION IF EXISTS` and changes to `CREATE`
7. **User pushes again**: `./db-push.sh`
8. ~~**Confusion**: "prepared statement already exists" error (benign but confusing)~~ [FIXED: Now uses session mode]
9. **User wastes more context**: ~~Trying to verify if migration actually succeeded~~ [REDUCED: No spurious errors]
10. **User writes script**: `verify_rpc_signature.mjs` to check
11. **User tries alternatives**: Direct SQL execution, debug mode, etc.
12. **Finally confirms**: Migration succeeded (after significant wasted context)

**Total wasted context**: ~30+ tool calls, multiple verification attempts, confusion about success

---

## What Would Happen With Enhanced Skill

### User Creates Migration:

```sql
-- Migration: 20251121185757_add_socket_weld_section_to_welder_summary.sql
-- Separates Butt Welds (BW) and Socket Welds (SW) into distinct tier sections

CREATE OR REPLACE FUNCTION get_weld_summary_by_welder(
  p_project_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_area_ids UUID[] DEFAULT NULL,
  p_system_ids UUID[] DEFAULT NULL,
  p_test_package_ids UUID[] DEFAULT NULL,
  p_welder_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  welder_id UUID,
  welder_name TEXT,
  stencil TEXT,
  total_welds BIGINT,
  bw_welds_5pct INTEGER,    -- NEW
  bw_welds_10pct INTEGER,   -- NEW
  bw_welds_20pct INTEGER,   -- NEW
  bw_welds_100pct INTEGER,  -- NEW
  sw_welds_5pct INTEGER,    -- NEW
  sw_welds_10pct INTEGER,   -- NEW
  sw_welds_20pct INTEGER,   -- NEW
  sw_welds_100pct INTEGER   -- NEW
)
AS $$
  -- ... function body
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Skill Activates BEFORE Push:

```markdown
I'm using the **backend-schema-compliance** skill to validate your migration before pushing.

## Step 8: PostgreSQL Migration Pre-Push Validation

Reading migration file: 20251121185757_add_socket_weld_section_to_welder_summary.sql

### Detected SQL Patterns:

✅ Migration file parsed successfully
⚠️ Found: CREATE OR REPLACE FUNCTION get_weld_summary_by_welder

### Running Validation Rules:

---

#### Rule 1: CREATE OR REPLACE FUNCTION with Signature Change

**Detected**: CREATE OR REPLACE FUNCTION get_weld_summary_by_welder

**Checking if function exists in database...**

[Queries database: SELECT pg_get_function_result(p.oid) FROM pg_proc WHERE proname='get_weld_summary_by_welder']

**Function exists**: ✅ Found in database

**Comparing return signatures...**

**Old signature** (from database):
```
RETURNS TABLE (
  welder_id UUID,
  welder_name TEXT,
  stencil TEXT,
  total_welds BIGINT
)
```

**New signature** (from migration):
```
RETURNS TABLE (
  welder_id UUID,
  welder_name TEXT,
  stencil TEXT,
  total_welds BIGINT,
  bw_welds_5pct INTEGER,    ← NEW
  bw_welds_10pct INTEGER,   ← NEW
  bw_welds_20pct INTEGER,   ← NEW
  bw_welds_100pct INTEGER,  ← NEW
  sw_welds_5pct INTEGER,    ← NEW
  sw_welds_10pct INTEGER,   ← NEW
  sw_welds_20pct INTEGER,   ← NEW
  sw_welds_100pct INTEGER   ← NEW
)
```

**Result**: ❌ **SIGNATURE CHANGED** (8 new columns added)

---

### Validation Failed

❌ **MIGRATION BLOCKED**: Cannot push - will fail with PostgreSQL error

**Issue**: CREATE OR REPLACE FUNCTION cannot change return type

**PostgreSQL will reject with**:
```
ERROR: cannot change return type of existing function (SQLSTATE 42P13)
Row type defined by OUT parameters is different.
```

**Required fix**:

You must DROP the function first when changing return signature:

```sql
-- Add this BEFORE the CREATE OR REPLACE:
DROP FUNCTION IF EXISTS get_weld_summary_by_welder(UUID, DATE, DATE, UUID[], UUID[], UUID[], UUID[]);

-- Change this line:
CREATE OR REPLACE FUNCTION get_weld_summary_by_welder(...)

-- To this:
CREATE FUNCTION get_weld_summary_by_welder(...)
```

**Auto-fix available**: I can update your migration file automatically.

Apply fix? [Y/n]
```

### User Accepts Auto-Fix:

```markdown
✅ **Auto-fix applied**

Updated migration file:
- Added: DROP FUNCTION IF EXISTS get_weld_summary_by_welder(UUID, DATE, DATE, UUID[], UUID[], UUID[], UUID[]);
- Changed: CREATE OR REPLACE FUNCTION → CREATE FUNCTION

**Re-running validation...**

---

### Validation Rules (Second Pass):

✅ Rule 1: Function drop before create - PASSED
✅ Rule 3: No ADD NOT NULL constraints found
✅ Rule 4: No UNIQUE constraints found
✅ Rule 5: No DROP COLUMN found
✅ Rule 6: No RENAME statements found
✅ Rule 7: No new foreign keys without indexes

---

### Validation Summary

✅ **All PostgreSQL validation checks passed**

Your migration is safe to push:
- Function signature conflict resolved
- No constraint violations
- No data loss risks
- No performance concerns

**Ready to push**: ./db-push.sh
```

### User Pushes Successfully:

```bash
$ ./db-push.sh
Connecting to remote database...
Do you want to push these migrations to the remote database?
 • 20251121185757_add_socket_weld_section_to_welder_summary.sql

 [Y/n] Y

Applying migration 20251121185757_add_socket_weld_section_to_welder_summary.sql...
✅ Migration applied successfully

Note: With session mode (port 5432), migrations run cleanly without spurious warnings
```

**Result**: ✅ Push succeeds on first try

---

## Comparison: Before vs After

### Without Enhanced Skill:

1. Create migration with `CREATE OR REPLACE`
2. Push → ❌ FAIL
3. Debug error
4. Fix migration manually
5. Push again → Confusing errors
6. Verify success with multiple scripts
7. Finally succeeds

**Total**: ~30+ tool calls, significant wasted context

### With Enhanced Skill:

1. Create migration with `CREATE OR REPLACE`
2. **Skill validates BEFORE push** → ❌ BLOCKED
3. **Skill auto-fixes** → ✅ FIXED
4. Push → ✅ SUCCESS on first try

**Total**: 3 steps, no wasted context

---

## Context Saved

**Eliminated tool calls**:
- ❌ Failed push attempt
- ❌ Manual migration edit
- ❌ Second push attempt with confusion
- ❌ Multiple verification attempts
- ❌ Writing verification script
- ❌ Trying alternative push methods
- ❌ Debug mode investigation
- ❌ Final confirmation checks

**Time saved**: Estimated 5-10 minutes

**Context tokens saved**: Estimated 10,000-15,000 tokens

**User frustration**: Significantly reduced

---

## What The Skill Caught

✅ **Detected pattern**: `CREATE OR REPLACE FUNCTION`
✅ **Queried database**: Checked if function exists
✅ **Compared signatures**: Old vs new return types
✅ **Identified conflict**: Return type changed (8 new columns)
✅ **Predicted error**: Knew exact PostgreSQL error before push
✅ **Provided fix**: Exact SQL to resolve issue
✅ **Auto-fixed**: Updated migration automatically
✅ **Validated again**: Confirmed fix resolves issue
✅ **Cleared to push**: With confidence it will succeed

---

## Skill Activation Trigger

The skill activated because:
1. User working on `.sql` file in `supabase/migrations/`
2. File contains `CREATE OR REPLACE FUNCTION` (trigger keyword)
3. Migration validation is MANDATORY before push

---

## Validation Logic Used

```javascript
// Pseudocode for validation logic

// 1. Parse migration file
const migrationSQL = readFile('20251121185757_*.sql')
const patterns = extractDDLStatements(migrationSQL)

// 2. Find CREATE OR REPLACE FUNCTION
if (patterns.includes('CREATE OR REPLACE FUNCTION')) {
  const funcName = extractFunctionName(migrationSQL)
  const newSignature = extractReturnType(migrationSQL)

  // 3. Query database for existing function
  const existingFunc = await db.query(`
    SELECT pg_get_function_result(p.oid) as result_type
    FROM pg_proc p
    WHERE proname = '${funcName}'
  `)

  // 4. Compare signatures
  if (existingFunc && existingFunc.result_type !== newSignature) {
    // BLOCK: Signature changed
    return {
      status: 'BLOCKED',
      rule: 'Rule 1: Function signature change',
      issue: 'Cannot use CREATE OR REPLACE when return type changes',
      fix: generateDropAndCreateSQL(funcName, migrationSQL),
      autoFixAvailable: true
    }
  }
}
```

---

## Success Metrics

✅ **Prevented failed push**: Yes
✅ **Caught error before push**: Yes
✅ **Provided accurate fix**: Yes
✅ **Auto-fix worked**: Yes
✅ **Saved user time**: Yes (estimated 5-10 minutes)
✅ **Reduced frustration**: Yes
✅ **Prevented wasted context**: Yes (10K+ tokens)

---

## Conclusion

**The enhanced backend-schema-compliance skill would have**:
1. Caught the function signature change before the first push attempt
2. Blocked the push with clear explanation
3. Provided the exact fix needed
4. Auto-fixed the migration
5. Validated the fix
6. Allowed successful push on first try

**Result**: Zero wasted context, successful migration on first attempt.

**This is exactly what the skill was designed to prevent.**
