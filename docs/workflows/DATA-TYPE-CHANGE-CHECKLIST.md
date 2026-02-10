# Data Type Change Impact Analysis Checklist

When changing data types (boolean -> numeric, string -> enum, etc.), use this template to ensure nothing is missed.

**Origin**: Lesson from Migration 20251122152612 (milestone values 1/0 -> 100/0). Only one RPC was updated; calculate_component_percent, UI rendering, onChange handlers, and materialized view were missed. Result: 0% progress in production, 3 emergency fixes for 722 components.

---

## Impact Analysis Template

```markdown
## Data Type Change: [field_name] from [old_type] to [new_type]

### Database Impact:
- [ ] Functions: update_X, calculate_Y, trigger_Z
- [ ] Materialized views: mv_X (needs REFRESH)
- [ ] Triggers: on_X_change
- [ ] RLS policies: (check if type affects policies)

### Frontend Impact:
- [ ] Components: ComponentA (line X), ComponentB (line Y)
- [ ] Hooks: useX (read), useY (write)
- [ ] Type definitions: database.types.ts
- [ ] Tests: component.test.tsx, hook.test.ts

### Data Migration:
- [ ] Backfill script written
- [ ] Tested on staging
- [ ] Rollback script ready

### Deployment Plan:
1. Push migration
2. Run backfill script
3. Refresh materialized views
4. Deploy frontend
5. Verify on production
6. Monitor for errors
```

## Discovery Commands

```bash
# Find all database code referencing the field
grep -r "field_name" supabase/migrations/
grep -r "field_name" supabase/functions/

# Find all frontend code referencing the field
grep -r "field_name" src/
```
