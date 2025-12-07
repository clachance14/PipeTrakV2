---
description: Check SQL quality (security, performance, correctness)
---

# SQL Quality Audit

User input:
$ARGUMENTS

## Purpose

Check SQL migrations for quality issues:

### Security
- Tables missing RLS
- SECURITY DEFINER functions without permission checks
- SQL injection patterns (string interpolation in EXECUTE)

### Performance
- Missing indexes on FK columns
- SELECT * usage
- Other performance anti-patterns

### Correctness
- `= NULL` instead of `IS NULL`
- `!= NULL` instead of `IS NOT NULL`
- Type coercion issues

## Execution

```bash
node scripts/audit/index.mjs --check sql $ARGUMENTS
```

## What Gets Checked

| ID | Category | Description |
|----|----------|-------------|
| SEC001 | Security | SQL injection via string interpolation |
| SEC002 | Security | SECURITY DEFINER without auth check |
| PERF001 | Performance | Missing index on FK column |
| CORR001 | Correctness | `= NULL` comparison |
| CORR002 | Correctness | `!= NULL` comparison |
