---
description: Check TypeScript type synchronization with database schema
---

# Type Sync Audit

User input:
$ARGUMENTS

## Purpose

Check for type synchronization issues:
- Type staleness (database.types.ts older than migrations)
- Missing tables in generated types
- Missing columns in generated types
- RPC function drift (functions referencing removed tables/columns)

## Execution

```bash
node scripts/audit/index.mjs --check types $ARGUMENTS
```

## What Gets Checked

1. **Staleness**: Compare `database.types.ts` mtime against newest migration
2. **Missing Tables**: Tables in migrations but not in types
3. **Missing Columns**: Columns in migrations but not in types
4. **RPC Drift**: Functions that reference non-existent tables

## Suggested Fix

If stale types are detected:

```bash
supabase gen types typescript --linked > src/types/database.types.ts
```
