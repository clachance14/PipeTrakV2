---
description: Run comprehensive backend audit (data integrity, types, SQL quality)
---

# Backend Audit

User input:
$ARGUMENTS

## Purpose

Run a comprehensive backend audit that checks:
- **Data Integrity**: Orphaned records, FK violations, import completeness
- **Type Safety**: Type staleness, schema drift, RPC drift
- **SQL Quality**: Security (RLS, SECURITY DEFINER), performance (indexes), correctness (NULL comparisons)

## Execution

1. Parse arguments from user input:
   - `--format json` or `--format markdown` for output format
   - `--severity high` to show only HIGH+ issues
   - No arguments = full audit with console output

2. Run the audit script:

```bash
node scripts/audit/index.mjs $ARGUMENTS
```

3. If `--format markdown` was specified, the report will be saved to `docs/audits/`

## Exit Codes

- `0` - No CRITICAL or HIGH issues
- `1` - CRITICAL issues found
- `2` - HIGH issues found (no CRITICAL)
- `3` - Audit failed (error)

## Examples

```bash
# Full audit
/audit-backend

# Save markdown report
/audit-backend --format markdown

# JSON output for CI
/audit-backend --format json

# Show only critical issues
/audit-backend --severity critical
```

## What Gets Checked

| Check | Description |
|-------|-------------|
| Orphaned Records | FK references to deleted parents |
| Import Completeness | NULL in required business fields |
| Type Staleness | database.types.ts older than migrations |
| RPC Drift | Functions referencing non-existent tables |
| Missing RLS | Tables without Row Level Security |
| SECURITY DEFINER | Functions without permission checks |
| Missing FK Indexes | FK columns without indexes |
| NULL Comparisons | `= NULL` instead of `IS NULL` |
