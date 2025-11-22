# Migration Validation Checklist

**Quick reference for PostgreSQL migration validation before pushing.**

Use this checklist BEFORE running `./db-push.sh` on any migration.

---

## Pre-Push Checklist

### ❌ CRITICAL (Block push if fail)

- [ ] **CREATE OR REPLACE FUNCTION with signature change?**
  - Grep for: `CREATE OR REPLACE FUNCTION`
  - Check: Does function exist with different return type?
  - Fix: Must use `DROP FUNCTION IF EXISTS` then `CREATE` (not `CREATE OR REPLACE`)

- [ ] **ADD NOT NULL without backfill?**
  - Grep for: `SET NOT NULL`
  - Check: Are there NULL values in the column?
  - Fix: `UPDATE table SET col = default WHERE col IS NULL` before constraint

- [ ] **ADD UNIQUE with duplicates?**
  - Grep for: `ADD CONSTRAINT.*UNIQUE` or `CREATE UNIQUE INDEX`
  - Check: Are there duplicate values in the column(s)?
  - Fix: Clean duplicates before adding constraint

---

### ⚠️ WARNINGS (Confirm before push)

- [ ] **ALTER COLUMN TYPE on large table?**
  - Grep for: `ALTER COLUMN.*TYPE`
  - Check: Does table have >10K rows?
  - Warning: Table will be locked, may take minutes

- [ ] **DROP COLUMN?**
  - Grep for: `DROP COLUMN`
  - Check: Does column have data?
  - Warning: Irreversible data loss

- [ ] **RENAME function/table with dependencies?**
  - Grep for: `RENAME TO`
  - Check: Are there views, functions, or triggers that reference it?
  - Warning: May break dependent objects

- [ ] **Foreign key without index?**
  - Grep for: `ADD CONSTRAINT.*FOREIGN KEY`
  - Check: Is there an index on the foreign key column?
  - Warning: Performance impact, consider adding index

---

## Quick Validation Commands

### Check if function exists and get signature
```bash
# Run this from a script that connects to Supabase
echo "SELECT proname, pg_get_function_identity_arguments(p.oid) as args, pg_get_function_result(p.oid) as result
FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE proname = 'function_name' AND n.nspname = 'public';" |
psql "$DATABASE_URL"
```

### Check for NULL values
```bash
echo "SELECT COUNT(*) FROM table_name WHERE column_name IS NULL;" | psql "$DATABASE_URL"
```

### Check for duplicates
```bash
echo "SELECT column_name, COUNT(*) FROM table_name GROUP BY column_name HAVING COUNT(*) > 1;" |
psql "$DATABASE_URL"
```

### Check table size
```bash
echo "SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE relname = 'table_name';" |
psql "$DATABASE_URL"
```

---

## Common Patterns to Watch For

### Pattern 1: Function Return Type Change

**BAD** (will fail):
```sql
CREATE OR REPLACE FUNCTION func_name(...)
RETURNS TABLE (
  old_col TEXT,
  new_col INTEGER  -- Adding column = signature change!
)
```

**GOOD** (will succeed):
```sql
DROP FUNCTION IF EXISTS func_name(param_types);
CREATE FUNCTION func_name(...)
RETURNS TABLE (
  old_col TEXT,
  new_col INTEGER
)
```

### Pattern 2: Adding NOT NULL

**BAD** (will fail if NULLs exist):
```sql
ALTER TABLE table_name
ALTER COLUMN column_name SET NOT NULL;
```

**GOOD** (will succeed):
```sql
-- Backfill first
UPDATE table_name SET column_name = 0 WHERE column_name IS NULL;

-- Then add constraint
ALTER TABLE table_name
ALTER COLUMN column_name SET NOT NULL;
```

### Pattern 3: Adding UNIQUE

**BAD** (will fail if duplicates exist):
```sql
ALTER TABLE table_name
ADD CONSTRAINT constraint_name UNIQUE (column_name);
```

**GOOD** (will succeed):
```sql
-- Clean duplicates first (example - depends on business logic)
DELETE FROM table_name
WHERE id NOT IN (SELECT MIN(id) FROM table_name GROUP BY column_name);

-- Then add constraint
ALTER TABLE table_name
ADD CONSTRAINT constraint_name UNIQUE (column_name);
```

---

## Migration Push Workflow

1. **Create migration**: `supabase migration new description`
2. **Wait 2+ seconds** (avoid timestamp collision)
3. **Write SQL** in migration file
4. **Run this checklist** ← YOU ARE HERE
5. **Fix any ❌ issues**
6. **Confirm ⚠️ warnings**
7. **Push**: `./db-push.sh`
8. **Regenerate types**: `supabase gen types typescript --linked > src/types/database.types.ts`

---

## Real Example: Function Signature Change

**Migration**: 20251121185757_add_socket_weld_section_to_welder_summary.sql

**Original code** (failed):
```sql
CREATE OR REPLACE FUNCTION get_weld_summary_by_welder(...)
RETURNS TABLE (
  welder_id UUID,
  ...
  bw_welds_5pct INTEGER,  -- NEW COLUMN
  sw_welds_5pct INTEGER   -- NEW COLUMN
)
```

**Error**:
```
ERROR: cannot change return type of existing function (SQLSTATE 42P13)
Row type defined by OUT parameters is different.
```

**Fixed code**:
```sql
-- DROP first
DROP FUNCTION IF EXISTS get_weld_summary_by_welder(UUID, DATE, DATE, UUID[], UUID[], UUID[], UUID[]);

-- CREATE (not CREATE OR REPLACE)
CREATE FUNCTION get_weld_summary_by_welder(...)
RETURNS TABLE (
  welder_id UUID,
  ...
  bw_welds_5pct INTEGER,
  sw_welds_5pct INTEGER
)
```

**Result**: ✅ Push succeeded

---

## Emergency: Migration Failed Mid-Push

If migration fails during push:

1. **Don't panic** - Check Supabase Dashboard → Database → Migrations
2. **Check schema_migrations table**: Is the migration recorded?
3. **If partially applied**: May need manual cleanup
4. **If not applied**: Fix and retry push
5. **Document the issue** in the migration file as a comment

---

## Summary

✅ **Before every migration push**:
1. Run this checklist
2. Fix all ❌ CRITICAL issues
3. Confirm all ⚠️ WARNINGS
4. Then push with confidence

**Saves you from**:
- Wasted context debugging after failed push
- Manual rollback of partial migrations
- Production downtime from blocking migrations

**See**: `migration-validation-rules.md` for detailed explanations
