# Supabase / Database - Claude Context

Context for working with migrations, edge functions, and database operations in PipeTrak V2.

**Parent CLAUDE.md has**: Top 10 rules, RLS patterns, schema compliance rules, and lessons learned. This file covers procedures and troubleshooting.

---

## Migration Workflow

### Creating Migrations

1. Check for recent migrations: `ls -lt supabase/migrations/ | head -5`
2. **Wait 2+ seconds** if another migration was just created (timestamp collision prevention)
3. Create: `supabase migration new descriptive_name_here`
4. Verify no duplicate timestamps: `ls supabase/migrations/*.sql | xargs -n1 basename | cut -d'_' -f1 | sort | uniq -d`
5. Push: `./db-push.sh` (never `supabase db push --linked` - it hangs)
6. Generate types: `supabase gen types typescript --linked > src/types/database.types.ts`
7. Commit migration + types together

### Timestamp Collision Prevention

Supabase CLI uses 1-second resolution timestamps (`YYYYMMDDHHMMSS`). Two migrations in the same second = duplicate key error.

**Error**: `duplicate key value violates unique constraint "schema_migrations_pkey"`

**Fix**: Rename conflicting file with +1 second:
```bash
mv supabase/migrations/20251120215000_fix.sql supabase/migrations/20251120215001_fix.sql
```

### Modifying Existing Tables

Before altering any existing table:
1. Write data migration if changing column types or constraints
2. Update generated types
3. Check every RPC that references the table (grep for table name)
4. Check every RLS policy on the table
5. Update all tests that rely on the modified columns
6. Write new tests for new constraints or behaviors

### Data Type Changes (CRITICAL)

**Lesson**: Migration 20251122152612 changed milestone values from 1/0 to 100/0. Only updated one RPC, forgot calculate_component_percent, UI rendering, onChange handlers, and materialized view. Result: 0% progress in production, 3 emergency fixes for 722 components.

Before changing data types (boolean -> numeric, string -> enum, etc.):

1. **Document all code paths** that read/write the field (`grep -r "field_name" supabase/ src/`)
2. **Update ALL database functions** (RPCs, triggers, materialized views, stored procedures)
3. **Update ALL frontend code** (rendering, onChange, validation, defaults, types)
4. **Write data migration** with backfill + rollback script
5. **Refresh dependent views** (materialized views, regular views, aggregations)
6. **Add tests** (unit, integration, E2E)
7. **Test on staging** before production
8. **Create deployment checklist** (migration -> backfill -> refresh views -> deploy frontend -> verify)

See [docs/workflows/DATA-TYPE-CHANGE-CHECKLIST.md](../docs/workflows/DATA-TYPE-CHANGE-CHECKLIST.md) for the full impact analysis template.

---

## Pushing Migrations

**Always use `./db-push.sh`** - never `supabase db push --linked` (hangs due to CLI bug #4302, #4419).

`db-push.sh` uses **session mode (port 5432)** which supports prepared statements and is more reliable than transaction mode (port 6543). The script uses `npx supabase` (not bare `supabase`) since the CLI may not be globally installed.

If you see `prepared statement "lrupsc_1_0" already exists` - you're accidentally using transaction mode. The error is benign; check if the migration actually applied.

---

## CLI Troubleshooting

When a CLI command fails, diagnose in this order:

1. **Missing env vars** - Check `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`. No extra quotes or trailing spaces.
2. **CRLF line endings** - `bad interpreter: No such file or directory` -> `sed -i 's/\r$//' db-push.sh`
3. **CLI bugs** - Hangs at "Initialising login role" -> use `./db-push.sh` or `--db-url`
4. **Migration conflicts** - Missing dependency, manually applied, reordered, or timestamp collision
5. **SQL syntax errors** - Quote identifiers correctly, check plpgsql syntax
6. **RPC/RLS issues** - `permission denied` -> check RLS policies + SECURITY DEFINER permission checks
7. **Type generation failures** - Check schema compiles, no circular references, no missing JSONB types
8. **Node/dependency issues** - Check Node version, try `rm -rf node_modules && npm install`

---

## Edge Functions

Located in `supabase/functions/`:

| Function | Purpose |
|---|---|
| `import-takeoff` | CSV takeoff import |
| `import-field-welds` | Field weld CSV import |
| `demo-signup` | Demo user registration |
| `demo-access` | One-click demo access |
| `populate-demo-data` | Seed demo project data |
| `cleanup-demos` | Clean up expired demos |
| `send-invitation` | Team invitation emails |
| `resend-magic-link` | Auth magic link resend |
| `process-drawing` | AI-powered ISO drawing extraction |

**Pattern**: Every edge function that inserts data must have a `schema-helpers.ts` with type-safe builder functions. Reference: `import-field-welds/schema-helpers.ts`.

### Storage Buckets

| Bucket | Purpose |
|---|---|
| `drawing-pdfs` | ISO drawing PDF files ({project_id}/ structure, private, 50MB limit, PDF only) |

---

## Querying Remote Database

### Setup (CRITICAL - follow exactly)

1. **Write `.ts` files in the project root** (not `/tmp/`) so `node_modules` are accessible
2. **Use `npx tsx`** to run TypeScript directly — `dotenv` is NOT installed (Vite handles env at dev time)
3. **Load env vars with grep** — `.env` has Windows CRLF line endings, so `source .env` will fail:

```bash
export VITE_SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d= -f2 | tr -d '\r') && \
export SUPABASE_SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env | cut -d= -f2 | tr -d '\r') && \
npx tsx query.ts && rm query.ts
```

4. **Don't use Bash heredocs** with template literal strings — the sandbox quote escaping will mangle them. Use the Write tool instead.
5. **`supabase db execute` does NOT exist** in the CLI — always use the Supabase JS client.

### Script Template

```typescript
// query.ts — write with Write tool, run with npx tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Admin: bypasses RLS
);

async function main() {
  const { data, error } = await supabase.from('table').select('*');
  if (error) { console.error(error); return; }
  console.log(data);
}
main();
```

For user-context queries (respects RLS), use `VITE_SUPABASE_ANON_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY`.

### View Column Names

Views use dimension-prefixed names, not bare `name`:
- `vw_manhour_progress_by_area` → `area_name` (not `name`)
- `vw_manhour_progress_by_system` → `system_name`
- `vw_manhour_progress_by_test_package` → `test_package_name`
