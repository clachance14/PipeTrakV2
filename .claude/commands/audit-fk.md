---
description: Check for orphaned records and FK integrity issues
---

# FK Integrity Audit

User input:
$ARGUMENTS

## Purpose

Check for data integrity issues related to foreign keys:
- Orphaned records (FK references to deleted parents)
- Broken references that should have been CASCADE deleted

## Execution

```bash
node scripts/audit/index.mjs --check fk $ARGUMENTS
```

## What Gets Checked

For each non-CASCADE foreign key relationship:
1. Get all FK values from child table
2. Get all parent IDs
3. Find orphans via set difference
4. Report with sample records

## Example Output

```
[HIGH] components.drawing_id
  components.drawing_id references 3 non-existent drawings record(s)

  Suggested Fix:
  UPDATE components SET drawing_id = NULL WHERE drawing_id IN (SELECT id FROM missing_drawings);
```
