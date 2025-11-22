# PostgreSQL Migration Validation Rules

---
**⚠️ PRE-PUSH VALIDATION**

This document defines validation rules that MUST be checked BEFORE pushing any SQL migration.

**Purpose**: Catch PostgreSQL errors that waste context debugging after failed pushes.

**Real Example**: Migration 20251121185757 failed with "cannot change return type of existing function" - wasted significant context troubleshooting.
---

## Rule 1: Function Return Type Changes ⚠️ CRITICAL

**Problem**: `CREATE OR REPLACE FUNCTION` fails if return signature changes

**PostgreSQL Error**:
```
ERROR: cannot change return type of existing function (SQLSTATE 42P13)
Row type defined by OUT parameters is different.
```

### Detection Pattern

```sql
-- ❌ RISKY: CREATE OR REPLACE when signature might change
CREATE OR REPLACE FUNCTION function_name(...)
RETURNS TABLE (
  col1 TYPE,
  col2 TYPE,  -- Adding/removing/changing columns = signature change!
  ...
)
```

### Validation Steps

1. **Find CREATE OR REPLACE FUNCTION statements**
   ```bash
   grep -i "CREATE OR REPLACE FUNCTION" migration.sql
   ```

2. **Extract function name and parameters**
   ```
   Function: get_weld_summary_by_welder
   Params: (UUID, DATE, DATE, UUID[], UUID[], UUID[], UUID[])
   ```

3. **Check if function exists in database**
   ```sql
   SELECT proname, proargnames, proargtypes, prorettype
   FROM pg_proc p
   JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE proname = 'function_name' AND n.nspname = 'public';
   ```

4. **Compare return signatures**
   - If function exists AND return columns changed → **FAIL**
   - Return columns include:
     - RETURNS TABLE (col1, col2, ...) columns
     - OUT parameters
     - SETOF record structures

### Required Fix

```sql
-- ✅ CORRECT: DROP first, then CREATE (not CREATE OR REPLACE)
DROP FUNCTION IF EXISTS function_name(exact_param_types);

-- Now CREATE (not CREATE OR REPLACE) with new signature
CREATE FUNCTION function_name(...)
RETURNS TABLE (
  -- New signature
  ...
)
AS $$
  ...
$$ LANGUAGE plpgsql;
```

### Important Notes

- **Must include exact parameter types** in DROP statement
- Multiple overloads? Must DROP the specific one
- **Don't use CREATE OR REPLACE** after dropping (just CREATE)

### Auto-Fix Logic

If detected, offer to auto-fix:
```markdown
⚠️ **DETECTED**: CREATE OR REPLACE FUNCTION with signature change

**Function**: get_weld_summary_by_welder
**Change**: Added columns: bw_welds_5pct, sw_welds_5pct

**Required fix**:
1. Add: DROP FUNCTION IF EXISTS get_weld_summary_by_welder(UUID, DATE, DATE, UUID[], UUID[], UUID[], UUID[]);
2. Change: CREATE OR REPLACE → CREATE

Apply fix automatically? [Y/n]
```

---

## Rule 2: ALTER COLUMN TYPE on Large Tables ⚠️ PERFORMANCE

**Problem**: ALTER COLUMN TYPE requires full table rewrite (locks table, slow on large tables)

**PostgreSQL Behavior**:
- Rewrites entire table
- Holds AccessExclusiveLock (blocks all reads/writes)
- Can take hours on 1M+ rows

### Detection Pattern

```sql
-- ⚠️ RISKY on large tables
ALTER TABLE table_name
ALTER COLUMN column_name TYPE new_type;
```

### Validation Steps

1. **Find ALTER COLUMN TYPE statements**
   ```bash
   grep -i "ALTER COLUMN.*TYPE" migration.sql
   ```

2. **Check table size**
   ```sql
   SELECT relname, n_live_tup
   FROM pg_stat_user_tables
   WHERE relname = 'table_name';
   ```

3. **If n_live_tup > 10,000 → WARN**

### Warning Message

```markdown
⚠️ **PERFORMANCE WARNING**: ALTER COLUMN TYPE on large table

**Table**: components
**Rows**: 1,234,567
**Estimated time**: 5-10 minutes
**Impact**: Table locked during migration (blocks all queries)

**Consider**:
1. Add new column with new type
2. Backfill data in batches
3. Update application to use new column
4. Drop old column later

Proceed anyway? [Y/n]
```

---

## Rule 3: ADD NOT NULL Without Backfill ⚠️ CRITICAL

**Problem**: ADD NOT NULL fails if existing rows have NULL values

**PostgreSQL Error**:
```
ERROR: column "column_name" contains null values
```

### Detection Pattern

```sql
-- ❌ RISKY: Set NOT NULL without checking for NULLs
ALTER TABLE table_name
ALTER COLUMN column_name SET NOT NULL;
```

### Validation Steps

1. **Find SET NOT NULL statements**
   ```bash
   grep -i "SET NOT NULL" migration.sql
   ```

2. **Check for NULL values**
   ```sql
   SELECT COUNT(*) FROM table_name WHERE column_name IS NULL;
   ```

3. **If count > 0 → FAIL**

### Required Fix

```sql
-- ✅ CORRECT: Backfill NULLs first, then add constraint

-- Step 1: Backfill NULLs
UPDATE table_name
SET column_name = default_value
WHERE column_name IS NULL;

-- Step 2: Now safe to add NOT NULL
ALTER TABLE table_name
ALTER COLUMN column_name SET NOT NULL;
```

### Auto-Fix Logic

```markdown
❌ **BLOCKED**: Cannot add NOT NULL - existing NULL values found

**Table**: field_welds
**Column**: xray_percentage
**NULL count**: 142 rows

**Required**: Backfill NULL values first

Suggested fix:
```sql
UPDATE field_welds SET xray_percentage = 0 WHERE xray_percentage IS NULL;
```

What default value should be used for backfill?
```

---

## Rule 4: ADD UNIQUE Constraint on Duplicate Data ⚠️ CRITICAL

**Problem**: ADD UNIQUE fails if duplicate values exist

**PostgreSQL Error**:
```
ERROR: could not create unique index "constraint_name"
DETAIL: Key (column_name)=(value) is duplicated.
```

### Detection Pattern

```sql
-- ❌ RISKY: Add UNIQUE without checking for duplicates
ALTER TABLE table_name
ADD CONSTRAINT constraint_name UNIQUE (column_name);

-- Or
CREATE UNIQUE INDEX index_name ON table_name(column_name);
```

### Validation Steps

1. **Find UNIQUE constraint additions**
   ```bash
   grep -iE "(ADD CONSTRAINT.*UNIQUE|CREATE UNIQUE INDEX)" migration.sql
   ```

2. **Check for duplicates**
   ```sql
   SELECT column_name, COUNT(*)
   FROM table_name
   GROUP BY column_name
   HAVING COUNT(*) > 1;
   ```

3. **If duplicates found → FAIL**

### Required Fix

```sql
-- ✅ CORRECT: Clean duplicates first, then add constraint

-- Step 1: Identify and resolve duplicates
-- (Strategy depends on business logic)
SELECT column_name, COUNT(*) as count
FROM table_name
GROUP BY column_name
HAVING COUNT(*) > 1;

-- Step 2: Clean duplicates (example)
DELETE FROM table_name
WHERE id NOT IN (
  SELECT MIN(id) FROM table_name GROUP BY column_name
);

-- Step 3: Now safe to add UNIQUE
ALTER TABLE table_name
ADD CONSTRAINT constraint_name UNIQUE (column_name);
```

### Warning Message

```markdown
❌ **BLOCKED**: Cannot add UNIQUE constraint - duplicate values found

**Table**: welders
**Column**: stencil_norm
**Duplicates**: 5 values with multiple rows

Example duplicates:
- "JD42": 3 rows
- "MW15": 2 rows

**Required**: Resolve duplicates first (business logic decision)

Cannot auto-fix - requires manual resolution.
```

---

## Rule 5: DROP COLUMN Without WARNING ⚠️ DATA LOSS

**Problem**: DROP COLUMN is irreversible and causes data loss

### Detection Pattern

```sql
-- ⚠️ DATA LOSS WARNING
ALTER TABLE table_name
DROP COLUMN column_name;
```

### Validation Steps

1. **Find DROP COLUMN statements**
   ```bash
   grep -i "DROP COLUMN" migration.sql
   ```

2. **Check if column has data**
   ```sql
   SELECT COUNT(*) FROM table_name WHERE column_name IS NOT NULL;
   ```

3. **Always WARN (even if empty)**

### Warning Message

```markdown
⚠️ **DATA LOSS WARNING**: Dropping column

**Table**: components
**Column**: old_field_name
**Rows with data**: 1,234

**This is IRREVERSIBLE**. Data will be permanently deleted.

Are you sure? Type 'DELETE' to confirm: ___
```

---

## Rule 6: Renaming Functions/Tables Without CASCADE ⚠️ BREAKING

**Problem**: Renaming breaks dependent views, functions, and application code

### Detection Pattern

```sql
-- ⚠️ BREAKING: May break views, triggers, functions
ALTER FUNCTION old_name RENAME TO new_name;
ALTER TABLE old_name RENAME TO new_name;
```

### Validation Steps

1. **Find RENAME statements**
   ```bash
   grep -i "RENAME TO" migration.sql
   ```

2. **Check for dependencies**
   ```sql
   -- Check views that reference this function/table
   SELECT DISTINCT dependent_view
   FROM information_schema.view_table_usage
   WHERE table_name = 'old_name';
   ```

3. **If dependencies found → WARN**

### Warning Message

```markdown
⚠️ **BREAKING CHANGE**: Renaming function/table

**Old name**: get_welder_stats
**New name**: get_weld_summary_by_welder
**Dependencies found**: 3 views, 2 functions

**Will break**:
- view: welder_performance_report
- view: project_statistics
- function: calculate_project_progress

**Required**:
1. Update all dependent objects
2. Update application code
3. Consider creating alias function for backwards compatibility

Proceed? [Y/n]
```

---

## Rule 7: Missing Indexes on Foreign Keys ⚠️ PERFORMANCE

**Problem**: Foreign key columns without indexes cause slow queries and deadlocks

### Detection Pattern

```sql
-- ⚠️ MISSING: Foreign key without index
ALTER TABLE table_name
ADD CONSTRAINT fk_name FOREIGN KEY (column_name) REFERENCES other_table(id);

-- No accompanying:
-- CREATE INDEX idx_name ON table_name(column_name);
```

### Validation Steps

1. **Find ADD FOREIGN KEY statements**
   ```bash
   grep -i "FOREIGN KEY" migration.sql
   ```

2. **Check if index exists**
   ```sql
   SELECT indexname FROM pg_indexes
   WHERE tablename = 'table_name' AND indexdef LIKE '%column_name%';
   ```

3. **If no index → WARN**

### Auto-Fix Logic

```markdown
⚠️ **PERFORMANCE**: Foreign key without index

**Table**: milestone_events
**Column**: component_id (FK → components)
**Index**: MISSING

**Impact**: Slow queries, potential deadlocks on DELETE operations

**Suggested fix**:
```sql
CREATE INDEX idx_milestone_events_component_id ON milestone_events(component_id);
```

Add index automatically? [Y/n]
```

---

## Validation Workflow Integration

### When to Run These Checks

**BEFORE** pushing any migration file:

```markdown
## Step 8: PostgreSQL Migration Validation

[Reads migration.sql file]

### Running pre-push validation checks:

- [ ] Rule 1: Function return type changes (CREATE OR REPLACE)
- [ ] Rule 2: ALTER COLUMN TYPE on large tables
- [ ] Rule 3: ADD NOT NULL without backfill
- [ ] Rule 4: ADD UNIQUE with duplicates
- [ ] Rule 5: DROP COLUMN data loss warning
- [ ] Rule 6: RENAME breaking dependencies
- [ ] Rule 7: Missing indexes on foreign keys

### Results:

[✅/⚠️/❌] For each rule

**If any ❌**: BLOCK push, show required fixes
**If any ⚠️**: Show warning, ask for confirmation
**If all ✅**: Safe to push
```

---

## Query Templates for Validation

### Check if function exists and get signature
```sql
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  pg_get_function_result(p.oid) as result_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'function_name' AND n.nspname = 'public';
```

### Check table row count
```sql
SELECT
  schemaname,
  relname,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE relname = 'table_name';
```

### Check for NULL values
```sql
SELECT COUNT(*) as null_count
FROM table_name
WHERE column_name IS NULL;
```

### Check for duplicates
```sql
SELECT column_name, COUNT(*) as duplicate_count
FROM table_name
GROUP BY column_name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

### Check for dependencies
```sql
-- Views depending on table
SELECT DISTINCT dependent_view.relname as view_name
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
WHERE source_table.relname = 'table_name';
```

### Check for indexes on column
```sql
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'table_name'
  AND indexdef LIKE '%column_name%';
```

---

## Summary: Validation Priority

### CRITICAL (Block push):
- ❌ Rule 1: CREATE OR REPLACE with signature change
- ❌ Rule 3: ADD NOT NULL with existing NULLs
- ❌ Rule 4: ADD UNIQUE with duplicates

### WARNING (Ask confirmation):
- ⚠️ Rule 2: ALTER TYPE on large tables
- ⚠️ Rule 5: DROP COLUMN
- ⚠️ Rule 6: RENAME with dependencies
- ⚠️ Rule 7: Missing indexes

### Success Message

```markdown
✅ All PostgreSQL migration validation checks passed

Your migration is safe to push:
- No function signature conflicts
- No constraint violations
- No data loss risks
- All performance considerations addressed

Proceed with: ./db-push.sh
```

---

## Real-World Example: The Bug That Inspired This

**Migration**: 20251121185757_add_socket_weld_section_to_welder_summary.sql

**What happened**:
1. Used `CREATE OR REPLACE FUNCTION`
2. Added new return columns (bw_welds_5pct, sw_welds_5pct)
3. Push failed: "cannot change return type of existing function"
4. Wasted context debugging, verifying, troubleshooting
5. Had to manually fix: DROP then CREATE

**What validation would have caught**:
```markdown
❌ Rule 1: Function Return Type Change

**Function**: get_weld_summary_by_welder
**Issue**: Cannot use CREATE OR REPLACE when return signature changes
**New columns detected**: bw_welds_5pct, sw_welds_5pct

**Auto-fix applied**:
- Added: DROP FUNCTION IF EXISTS get_weld_summary_by_welder(UUID, DATE, DATE, UUID[], UUID[], UUID[], UUID[]);
- Changed: CREATE OR REPLACE → CREATE

✅ Migration fixed. Safe to push.
```

**Result**: Would have caught and fixed BEFORE the first push attempt, saving all that wasted context.
