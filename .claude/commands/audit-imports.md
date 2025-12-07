---
description: Check import completeness (NULL in required fields)
---

# Import Completeness Audit

User input:
$ARGUMENTS

## Purpose

Check that imported data has all required business fields populated:
- Detect rows with NULL in fields that should always have values
- Identify incomplete imports that may cause issues

## Execution

```bash
node scripts/audit/index.mjs --check imports $ARGUMENTS
```

## Required Fields Checked

| Table | Required Fields |
|-------|-----------------|
| components | project_id, component_type, progress_template_id, identity_key |
| field_welds | component_id, project_id, weld_type, created_by |
| drawings | project_id, drawing_no_raw, drawing_no_norm |
| welders | project_id, name, stencil, stencil_norm |
| milestone_events | component_id, user_id, milestone_name, action |
| areas | project_id, name |
| systems | project_id, name |
| test_packages | project_id, name, test_type |

## Example Output

```
[MEDIUM] components.identity_key
  components.identity_key is NULL in 5 row(s)

  Suggested Fix:
  -- Review import logic to ensure identity_key is populated:
  -- SELECT id, created_at FROM components WHERE identity_key IS NULL LIMIT 10;
```
