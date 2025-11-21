# CLAUDE.md

Guidance for Claude Code when working with this repository.

## PipeTrak V2

Industrial pipe tracking system for brownfield construction. React 18 + TypeScript SPA backed by Supabase.

**Current Phase**: Feature 027 complete. See [PROJECT-STATUS.md](docs/PROJECT-STATUS.md) for full status and feature history.

---

## Top 10 Rules Claude Must Always Follow

1. **TypeScript Strict Mode** - No `any` types, handle all edge cases
2. **TDD First** - Write failing test before implementation code
3. **RLS on Everything** - All tables have RLS, all data-modifying RPCs use SECURITY DEFINER
4. **Never Expose Service Keys** - Service role key never in client code
5. **Never Modify Old Migrations** - Create new migration, never edit existing
6. **SECURITY DEFINER RPCs** - All data-modifying functions must be SECURITY DEFINER with permission checks
7. **TanStack Query Only** - Never bare Supabase calls in components, always use hooks
8. **Shadcn/Radix Patterns** - Follow existing component patterns, use Radix primitives
9. **Mobile-First** - ≤1024px breakpoint, ≥44px touch targets, test on mobile
10. **Virtualize Large Lists** - Use @tanstack/react-virtual or pagination for 50+ items

**Violating these rules = automatic failure.**

---

## Critical Warnings

### Service Role Key Security
**NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code. Service role bypasses ALL Row Level Security policies. Use only for:
- Admin scripts and migrations
- Debugging database issues
- Validating RLS policies

### RLS Enforcement
All tables must have RLS enabled. All functions that modify data must use SECURITY DEFINER with explicit permission checks. See [docs/security/RLS-RULES.md](docs/security/RLS-RULES.md).

### Migration Push Workaround
Supabase CLI v2.58.5 hangs on `supabase db push --linked`. Use `./db-push.sh` instead. Bug tracked in GitHub #4302, #4419.

### Supabase Connection Pooler Modes

Supabase provides two connection pooling modes with different characteristics:

**Transaction Mode (Port 6543)** - Used by `db-push.sh`:
- Does NOT support prepared statements
- Optimized for short-lived connections (migrations, edge functions)
- **Expected error**: `ERROR: prepared statement "lrupsc_1_0" already exists (SQLSTATE 42P05)`
- **This error is benign** - migrations still succeed, CLI handles it internally

**Session Mode (Port 5432)**:
- DOES support prepared statements
- Better for long-lived connections
- Use for ORM tools that rely on prepared statements (Prisma, Drizzle, etc.)

**Why db-push.sh uses transaction mode (port 6543):**
- Migrations are short-lived operations
- Transaction mode provides better connection pooling for this use case
- The "prepared statement already exists" error is cosmetic - ignore it
- Supabase CLI automatically works around this limitation

**When you see this error, don't worry:**
```
ERROR: prepared statement "lrupsc_1_0" already exists (SQLSTATE 42P05)
```
This is expected behavior with transaction pooler. Check if migration succeeded (it usually has).

### TDD Mandatory
Write failing test first (Red). Implement minimum code to pass (Green). Refactor while tests pass. Constitution v1.0.0 enforces this.

### Single-Org Architecture
This project uses single-org model (refactored from multi-tenant in Sprint 1). RLS filters by `user_id` and `project_id`, not `organization_id`.

---

## Quick Start

```bash
npm run dev              # Dev server (http://localhost:5173)
npm run build            # Production build
npm test                 # Run tests
npm test:ui              # Vitest UI
tsc -b                   # Type check
npm run lint             # Lint
```

---

## Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript 5 (strict), Vite, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **State**: TanStack Query (server), Zustand (client), React Context (auth)
- **Testing**: Vitest, Testing Library, jsdom

### State Management
- **TanStack Query** (server state)
- **Zustand** (client state with localStorage persistence)
  - `useSidebarStore` - Sidebar collapse state
  - `useWeldLogPreferencesStore` - Weld log sort and filter preferences
- **React Context** (auth state)

### Path Aliases
`@/*` → `./src/*`

Import: `import { something } from '@/lib/utils'`

Configured in: `tsconfig.app.json`, `vite.config.ts`, `vitest.config.ts`

### Authentication
- `AuthContext` (src/contexts/AuthContext.tsx) provides `useAuth()` hook
- `ProtectedRoute` (src/components/ProtectedRoute.tsx) guards authenticated routes
- Supabase session persists via `supabase.auth.onAuthStateChange()`

### Routes
- **Public**: `/` (homepage with demo signup)
- **Authenticated**: `/dashboard`, `/components`, `/drawings`, `/packages`, `/needs-review`, `/welders`, `/weld-log`, `/reports`, `/imports`, `/team`
- **Settings** (Admin/PM only): `/projects/:projectId/settings`, `/projects/:projectId/settings/milestones`, `/projects/:projectId/settings/metadata`, `/projects/:projectId/settings/project`

All authenticated routes wrap `<ProtectedRoute>` in App.tsx. Common layout handled by `Layout` component.

---

## Supabase Integration

### Environment Variables
Required in `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_ACCESS_TOKEN` (CLI operations)

Copy `.env.example` to `.env` before running.

### Setup Commands
```bash
# Install CLI
npm install -g supabase

# Link to remote project
supabase link --project-ref <project-ref>

# Push migrations (use workaround)
./db-push.sh

# Generate TypeScript types
supabase gen types typescript --linked > src/types/database.types.ts

# Verify schema
supabase db diff --schema public --linked
```

**IMPORTANT**: Remote database only. No local Supabase (`supabase start`).

### Database Schema
- 14+ tables: `organizations`, `users`, `projects`, `components`, `drawings`, `packages`, `welders`, `invitations`, etc.
- RLS enabled on all tables
- 100+ migrations applied (as of 2025-11-15)
- See `supabase/migrations/` for migration files

### Querying Remote Database

**User-context queries** (respects RLS):
```javascript
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let supabaseAnonKey = ''

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = trimmed.substring('VITE_SUPABASE_ANON_KEY='.length).trim()
  }
})

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const { data, error } = await supabase.from('welders').select('*')
```

**Admin queries** (bypasses RLS - use sparingly):
Replace `VITE_SUPABASE_ANON_KEY` with `SUPABASE_SERVICE_ROLE_KEY` and add auth config:
```javascript
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})
```

Run from project root: `node script.mjs`

**Alternative**: Use Supabase Dashboard SQL Editor or `psql`.

### CLI Failure Handling (Lessons Learned)

When a CLI command fails, diagnose and fix instead of retrying blindly. Follow this sequence:

**1. Check for Missing Environment Variables**

Most CLI failures come from missing or malformed env vars. Verify:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY` (for admin scripts)
- `.env` is correctly loaded (no extra quotes, no trailing spaces)

**2. Check for CRLF vs LF Line Ending Issues**

If script returns `bad interpreter: No such file or directory`, Windows line endings broke the script.

Fix: `sed -i 's/\r$//' db-push.sh`

**3. Check Supabase CLI Known Bugs**

If `supabase db push` hangs at "Initialising login role," it's a known Supabase CLI bug.

Fix: Always use `./db-push.sh` OR full DB URL: `supabase db push --db-url "postgresql://..."`

**4. Check for Migration Conflicts**

If migrations fail, check:
- Migration depends on table that doesn't exist
- Migration applied manually on staging but not committed
- Migration accidentally reordered
- **Timestamp collision** - two migrations created within same second

Diagnose:
- Read the error
- Check for `duplicate key value violates unique constraint "schema_migrations_pkey"` (timestamp collision)
- Open the failing migration
- Compare schema: `supabase db diff --schema public --linked`

Fix timestamp collision:
```bash
# Detect duplicates
ls supabase/migrations/*.sql | xargs -n1 basename | cut -d'_' -f1 | sort | uniq -d

# Rename conflicting file (+1 second)
mv supabase/migrations/20251120215000_fix.sql supabase/migrations/20251120215001_fix.sql
```

**5. Check SQL Syntax Errors**

PostgreSQL errors like:
- `syntax error at or near "("`
- `function … does not exist`
- `duplicate key value`

Fix: Quote identifiers correctly, use plpgsql syntax rules

**6. Check RPC / RLS Incompatibilities**

If you see `permission denied for table …` or `row-level security policy … prevented access`:
- Confirm RLS policies exist
- Verify SECURITY DEFINER functions include permission checks
- Ensure user context matches expectations

**7. Check Local Type Generation Issues**

If type generation fails: `supabase gen types typescript --linked`

Verify:
- Schema compiles
- No circular references
- No new JSONB shapes missing type definitions

**8. Check Node Version or Dependency Mismatch**

Failures like "ERR_MODULE_NOT_FOUND" or "Unexpected token" can be tied to Node version.

Ensure:
- Node version matches project standard
- Dependencies aren't corrupted (`rm -rf node_modules && npm install`)

**9. Ignore Benign Prepared Statement Errors**

If you see: `ERROR: prepared statement "lrupsc_1_0" already exists (SQLSTATE 42P05)`

**This is NOT a failure** - it's expected when using transaction pooler (port 6543).

Diagnosis:
- Check if the migration actually succeeded (it usually has)
- Look for "Applied migration..." message after the error
- Verify in Supabase Dashboard that migration is in `supabase_migrations.schema_migrations` table

Why this happens:
- Transaction pooler (port 6543) doesn't support prepared statements
- Supabase CLI tries to create prepared statements anyway
- Pooler can't preserve them across connection swaps
- CLI works around this limitation - migration still succeeds

**Action:** Ignore the error and verify migration succeeded. See "Supabase Connection Pooler Modes" section for details.

---

## Testing

### TDD Workflow (MANDATORY)
1. Write failing test (Red)
2. Implement minimum code to pass (Green)
3. Refactor while tests pass
4. Commit tests + implementation together

### Coverage Requirements (CI enforced)
- Overall: ≥70%
- `src/lib/**`: ≥80%
- `src/components/**`: ≥60%
- Hotfix bypass: `SKIP_COVERAGE=true` (requires follow-up ticket)

### Test Organization
- Colocated: `ComponentName.test.tsx` next to `ComponentName.tsx`
- Integration: `tests/integration/feature-name.test.ts`
- E2E: `tests/e2e/workflow-name.spec.ts`
- RLS: `tests/integration/rls/multi-tenant.test.ts`

### Mocking Example
```typescript
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [...], error: null })
    }))
  }
}))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, cacheTime: 0 } }
})
```

---

## Development Rules

### Schema Compliance (CRITICAL)
**Before writing any database insert/update code:**
1. Check the actual table schema in migrations
2. Use type-safe helpers (edge functions) or generated types (client)
3. Never manually construct insert objects
4. Validate against working examples

**See:** [docs/workflows/SCHEMA-COMPLIANCE-WORKFLOW.md](docs/workflows/SCHEMA-COMPLIANCE-WORKFLOW.md)

**Edge function pattern:** Every edge function that inserts data must have a `schema-helpers.ts` file with type-safe builder functions. See `supabase/functions/import-field-welds/schema-helpers.ts` for reference.

### TypeScript
- Strict mode enabled
- Additional checks: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`
- Module resolution: "bundler" mode

### RLS Patterns
- Enable RLS on all tables
- Use SECURITY DEFINER for data-modifying functions
- Add explicit permission checks in SECURITY DEFINER functions
- Test RLS policies with multiple user contexts
- See [docs/security/RLS-RULES.md](docs/security/RLS-RULES.md) and [docs/security/RLS-AUDIT-CHECKLIST.md](docs/security/RLS-AUDIT-CHECKLIST.md)

### Migration Rules
- Never modify existing migrations
- Test migrations on staging before production
- Use `./db-push.sh` to apply migrations (not `supabase db push --linked`)
- Generate types after schema changes: `supabase gen types typescript --linked > src/types/database.types.ts`
- Critical migrations documented in [docs/KNOWLEDGE-BASE.md](docs/KNOWLEDGE-BASE.md)
- **Wait 2+ seconds between creating migrations** to avoid timestamp collisions

**Timestamp Collision Prevention:**

Supabase CLI generates migration timestamps with 1-second resolution (`YYYYMMDDHHMMSS`).
Creating multiple migrations within the same second causes duplicate timestamps.

**Error:** `ERROR: duplicate key value violates unique constraint "schema_migrations_pkey"`

**Prevention:**

1. **Wait 2+ seconds between migrations:**
   ```bash
   supabase migration new add_feature_a
   sleep 2  # Ensure different timestamp
   supabase migration new add_feature_b
   ```

2. **Check for duplicate timestamps before pushing:**
   ```bash
   ls supabase/migrations/*.sql | xargs -n1 basename | cut -d'_' -f1 | sort | uniq -d
   # If any output, you have duplicates - rename manually
   ```

3. **Resolution if collision occurs:**
   ```bash
   # Rename the conflicting migration file with +1 second
   mv supabase/migrations/20251120215000_fix.sql \
      supabase/migrations/20251120215001_fix.sql

   # Push again
   ./db-push.sh
   ```

**Modifying Existing Tables** (requires extra care):

Before altering any existing table, you MUST:
1. Write data migration if changing column types or constraints
2. Update generated types: `supabase gen types typescript --linked > src/types/database.types.ts`
3. Check every RPC that references the table (grep for table name)
4. Check every RLS policy on the table
5. Update all tests that rely on the modified columns
6. Write new tests for new constraints or behaviors

**Why**: Schema changes have cascading effects. Missing any step causes runtime errors.

### Migration Creation Checklist

Follow this checklist when creating any new migration:

1. ✅ **Check for recent migrations** - Avoid timestamp collisions
   ```bash
   ls -lt supabase/migrations/ | head -5
   ```

2. ✅ **Wait 2+ seconds** if another migration was just created

3. ✅ **Create migration**
   ```bash
   supabase migration new descriptive_name_here
   ```

4. ✅ **Verify unique timestamp** - Detect duplicates
   ```bash
   ls supabase/migrations/*.sql | xargs -n1 basename | cut -d'_' -f1 | sort | uniq -d
   # No output = good (no duplicates)
   ```

5. ✅ **Test migration** (recommended)
   ```bash
   ./db-push.sh
   # Expect: "prepared statement already exists" warning (safe to ignore)
   ```

6. ✅ **Generate types** after schema changes
   ```bash
   supabase gen types typescript --linked > src/types/database.types.ts
   ```

7. ✅ **Commit migration + types together**
   ```bash
   git add supabase/migrations/<new-file>.sql src/types/database.types.ts
   git commit -m "migration: <description>"
   ```

### Mobile-First Design
- ≤1024px breakpoint for mobile layouts
- ≥44px touch targets (WCAG 2.1 AA)
- Test on mobile devices before marking complete
- See [docs/plans/2025-11-06-design-rules.md](docs/plans/2025-11-06-design-rules.md)

### Accessibility
- WCAG 2.1 AA compliance mandatory
- Semantic HTML, ARIA labels, keyboard navigation
- Test with screen readers
- See [docs/plans/2025-11-06-design-rules.md](docs/plans/2025-11-06-design-rules.md)

### Persistent Preferences Pattern

Use Zustand with persist middleware for user preferences that should survive page refreshes:

**Example:** `useWeldLogPreferencesStore`
- Stores sort and filter state
- localStorage key: `pipetrak:weld-log-preferences`
- Automatic sync via Zustand persist middleware

**When to use:**
- User preferences (UI state, filters, sort)
- Settings that should persist across sessions
- State that doesn't need server sync

**When NOT to use:**
- Server data (use TanStack Query)
- Auth state (use AuthContext)
- Form state (use local component state)

---

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`):
1. Lint (`npm run lint`)
2. Type check (`tsc -b`)
3. Test with coverage (`npm test -- --coverage`)
4. Build (`npm run build`)

All steps must pass. Target: <5 minutes. Vercel deploys on success.

---

## Specify Workflow

Feature development uses `.specify/` workflow:
1. `/specify` - Create spec
2. `/plan` - Generate implementation plan
3. `/tasks` - Break down tasks
4. `/implement` - Execute

Constitution v1.0.0 at `.specify/memory/constitution.md` defines type safety, component-driven development, TDD, RLS patterns, and workflow compliance.

---

## Documentation Index

**Essential Reading**:
- [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md) - Feature status, completed work, bug fixes
- [docs/GLOSSARY.md](docs/GLOSSARY.md) - Domain terminology (brownfield, milestones, component types, roles)
- [docs/KNOWLEDGE-BASE.md](docs/KNOWLEDGE-BASE.md) - Architecture patterns, critical migrations, workflows
- [docs/plans/2025-11-06-design-rules.md](docs/plans/2025-11-06-design-rules.md) - Development patterns, recipes, accessibility
- [docs/security/RLS-RULES.md](docs/security/RLS-RULES.md) - RLS patterns and templates
- [docs/security/RLS-AUDIT-CHECKLIST.md](docs/security/RLS-AUDIT-CHECKLIST.md) - Quick RLS reference

**Feature Documentation**:
See `specs/` directory for implementation notes:
- Feature 002: User Registration - `specs/002-user-registration-and/IMPLEMENTATION-NOTES.md`
- Feature 009: CSV Import - `specs/009-sprint-3-material/IMPLEMENTATION-NOTES.md`
- Feature 010: Drawing Table - `specs/010-let-s-spec/IMPLEMENTATION_STATUS.md`
- Feature 011: Metadata Assignment - `specs/011-the-drawing-component/IMPLEMENTATION_STATUS.md`
- Feature 015: Mobile Milestones - `specs/015-mobile-milestone-updates/IMPLEMENTATION-NOTES.md`
- Feature 016: Team Management - `specs/016-team-management-ui/IMPLEMENTATION-NOTES.md`
- Feature 019: Progress Reports - `specs/019-weekly-progress-reports/tasks.md`

---

## Component Library

Shadcn/ui configured in `components.json`. Radix UI primitives installed: dialog, dropdown-menu, label, slot, toast.

Add components: `npx shadcn@latest add <component>` or manually to `src/components/ui/`

---

## Maintaining This File

**Update CLAUDE.md when**:
- New feature introduces a global pattern (state management, routing, data flow)
- New RLS pattern is adopted (new permission model, new SECURITY DEFINER pattern)
- Supabase CLI behavior changes (bugs, workarounds, new commands)
- Major feature adds new routes or folder structure
- Coding style or architecture evolves (new testing pattern, new UI pattern)

**Why**: Outdated guidance causes Claude to use old patterns. Keep this file current.

## Active Technologies
- TypeScript 5 (strict mode), React 18, PostgreSQL 15+ (Supabase) (028-add-unplanned-welds)
- Supabase PostgreSQL with RLS (028-add-unplanned-welds)

## Recent Changes
- 028-add-unplanned-welds: Added TypeScript 5 (strict mode), React 18, PostgreSQL 15+ (Supabase)
