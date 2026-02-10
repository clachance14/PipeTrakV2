# CLAUDE.md

Guidance for Claude Code when working with this repository.

## PipeTrak V2

Industrial pipe tracking system for brownfield construction. React 18 + TypeScript SPA backed by Supabase.

**Current Phase**: Feature 035 in progress. See [PROJECT-STATUS.md](docs/PROJECT-STATUS.md) for full status and feature history.

---

## Top 10 Rules Claude Must Always Follow

1. **TypeScript Strict Mode** - No `any` types, handle all edge cases
2. **TDD First** - Write failing test (Red), implement minimum to pass (Green), refactor while green
3. **RLS on Everything** - All tables have RLS, all data-modifying RPCs use SECURITY DEFINER with permission checks
4. **Never Expose Service Keys** - Service role key never in client code
5. **Never Modify Old Migrations** - Create new migration, never edit existing
6. **TanStack Query Only** - Never bare Supabase calls in components, always use hooks
7. **Shadcn/Radix Patterns** - Follow existing component patterns, use Radix primitives
8. **Mobile-First** - ≤1024px breakpoint, ≥44px touch targets, test on mobile
9. **Virtualize Large Lists** - Use @tanstack/react-virtual or pagination for 50+ items
10. **Schema Compliance** - Check actual table schema before writing any insert/update code

**Violating these rules = automatic failure.**

---

## Behavioral Guidelines

### Push Back When Warranted
If a simpler approach exists, say so. If something seems overcomplicated or unnecessary, raise it. Don't silently pick one interpretation when multiple exist - present options.

### Surgical Changes: Orphan Cleanup
When editing existing code:
- Remove imports/variables/functions that YOUR changes made unused
- Don't remove pre-existing dead code unless asked
- If you notice unrelated dead code, mention it - don't delete it

**The test:** Every changed line should trace directly to the user's request.

### Verification Loop Pattern
For multi-step tasks, state a brief plan with verification:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

Transform vague tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"

---

## Critical Warnings

### Service Role Key Security
**NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code. Service role bypasses ALL Row Level Security policies. Use only for admin scripts, migrations, and debugging.

### Migration Push
Always use `./db-push.sh` to push migrations. Never `supabase db push --linked` (hangs - CLI bug #4302). See [supabase/CLAUDE.md](supabase/CLAUDE.md) for full migration workflow and troubleshooting.

### Single-Org Architecture
This project uses single-org model (refactored from multi-tenant in Sprint 1). RLS filters by `user_id` and `project_id`, not `organization_id`.

---

## Quick Start

```bash
npm run dev              # Dev server (http://localhost:5173)
npm run build            # Production build
npm test                 # Run tests
npm run test:ui          # Vitest UI
tsc -b                   # Type check
npm run lint             # Lint
./db-push.sh             # Push migrations
```

---

## Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript 5 (strict), Vite, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **State**: TanStack Query (server), Zustand (client), React Context (auth)
- **Forms**: react-hook-form + zod validation
- **UI**: Shadcn/ui + Radix primitives + Lucide icons
- **Toasts**: Sonner (`toast.success()`, `toast.error()`)
- **Testing**: Vitest, Testing Library, jsdom

### State Management
- **TanStack Query** - server state (all Supabase data fetching)
- **Zustand** - client state with localStorage persistence:
  - `useSidebarStore` - Sidebar collapse
  - `useWeldLogPreferencesStore` - Weld log sort/filter
  - `useComponentPreferencesStore` - Component table preferences
  - `usePackagePreferencesStore` - Package table preferences
  - `useReportPreferencesStore` - Report preferences
  - `usePackageWorkflowCustomizationStore` - Package workflow settings
  - `organizationStore` - Organization context
- **React Context** - auth state (`AuthContext`)

**When to use Zustand**: User preferences, UI state, settings that persist across sessions.
**When NOT to use Zustand**: Server data (TanStack Query), auth state (AuthContext), form state (component local).

### Path Aliases
`@/*` → `./src/*` — Configured in `tsconfig.app.json`, `vite.config.ts`, `vitest.config.ts`

### Authentication
- `AuthContext` (`src/contexts/AuthContext.tsx`) provides `useAuth()` hook
- `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) guards authenticated routes
- Supabase session persists via `supabase.auth.onAuthStateChange()`

### Routes
- **Public**: `/`, `/demo-signup`, `/login`, `/register`, `/check-email`, `/forgot-password`, `/reset-password`, `/legal/terms`, `/legal/privacy`
- **Onboarding**: `/onboarding/wizard`, `/onboarding/complete-setup`, `/accept-invitation`
- **Main App**: `/dashboard`, `/projects`, `/projects/new`, `/project-setup`, `/components`, `/drawings`, `/packages`, `/packages/:packageId/components`, `/packages/:packageId/completion-report`, `/needs-review`, `/welders`, `/weld-log`, `/imports`, `/reports`, `/reports/new`, `/reports/view`, `/reports/welder-summary`, `/team`
- **Settings** (Admin/PM): `/projects/:projectId/settings`, `.../milestones`, `.../metadata`, `.../project`, `.../manhours`
- **Per-Project**: `/projects/:projectId/components`, `/projects/:projectId/drawing-table`
- **Debug**: `/debug`

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
npm install -g supabase                           # Install CLI
supabase link --project-ref <project-ref>         # Link to remote
./db-push.sh                                      # Push migrations
supabase gen types typescript --linked > src/types/database.types.ts  # Gen types
supabase db diff --schema public --linked          # Verify schema
```

**IMPORTANT**: Remote database only. No local Supabase (`supabase start`).

### Database
- 257 migrations applied (as of 2026-02-10)
- RLS enabled on all tables
- 8 edge functions (see [supabase/CLAUDE.md](supabase/CLAUDE.md) for details)
- See `supabase/migrations/` for migration files

### Migration & CLI Details
See [supabase/CLAUDE.md](supabase/CLAUDE.md) for:
- Migration creation checklist
- Timestamp collision prevention
- CLI troubleshooting sequence
- Connection pooler modes
- Data type change impact analysis
- Edge function patterns
- Querying the remote database

---

## Testing

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
Before writing any database insert/update code:
1. Check the actual table schema in migrations
2. Use type-safe helpers (edge functions) or generated types (client)
3. Never manually construct insert objects
4. Validate against working examples

**See**: [docs/workflows/SCHEMA-COMPLIANCE-WORKFLOW.md](docs/workflows/SCHEMA-COMPLIANCE-WORKFLOW.md)

**Enforcement**: The `backend-schema-compliance` skill automatically activates when working with database code. Includes **PostgreSQL migration validation** (Step 8) that runs BEFORE pushing `.sql` files.

### TypeScript
- Strict mode with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`
- Module resolution: "bundler" mode

### RLS Patterns
- Enable RLS on all tables
- Use SECURITY DEFINER for data-modifying functions with explicit permission checks
- Test RLS policies with multiple user contexts
- See [docs/security/RLS-RULES.md](docs/security/RLS-RULES.md) and [docs/security/RLS-AUDIT-CHECKLIST.md](docs/security/RLS-AUDIT-CHECKLIST.md)

### Migration Rules
- Never modify existing migrations
- Always use `./db-push.sh` (not `supabase db push --linked`)
- Generate types after schema changes
- Wait 2+ seconds between creating migrations (timestamp collisions)
- See [supabase/CLAUDE.md](supabase/CLAUDE.md) for full migration workflow

### Mobile-First Design
- ≤1024px breakpoint for mobile layouts
- ≥44px touch targets (WCAG 2.1 AA)
- See [docs/plans/2025-11-06-design-rules.md](docs/plans/2025-11-06-design-rules.md)

### Accessibility
- WCAG 2.1 AA compliance mandatory
- Semantic HTML, ARIA labels, keyboard navigation

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

## Component Library

Shadcn/ui configured in `components.json`. Radix UI primitives installed: accordion, alert-dialog, checkbox, dialog, dropdown-menu, label, popover, progress, radio-group, scroll-area, select, slider, slot, switch, tabs, toast, tooltip.

Add components: `npx shadcn@latest add <component>` or manually to `src/components/ui/`

---

## PDF Generation

Component-based PDF generation using @react-pdf/renderer. See [src/components/pdf/CLAUDE.md](src/components/pdf/CLAUDE.md) for component library, lazy loading rules, testing patterns, and styling guide.

**Key rules**: Always lazy-load (700KB-1.2MB library), desktop-only export buttons (`hidden lg:flex`).

---

## Documentation Index

**Essential Reading**:
- [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md) - Feature status, completed work, bug fixes
- [docs/GLOSSARY.md](docs/GLOSSARY.md) - Domain terminology (brownfield, milestones, component types, roles)
- [docs/KNOWLEDGE-BASE.md](docs/KNOWLEDGE-BASE.md) - Architecture patterns, critical migrations, workflows
- [docs/plans/2025-11-06-design-rules.md](docs/plans/2025-11-06-design-rules.md) - Development patterns, recipes, accessibility
- [docs/security/RLS-RULES.md](docs/security/RLS-RULES.md) - RLS patterns and templates
- [docs/security/RLS-AUDIT-CHECKLIST.md](docs/security/RLS-AUDIT-CHECKLIST.md) - Quick RLS reference
- [docs/workflows/DATA-TYPE-CHANGE-CHECKLIST.md](docs/workflows/DATA-TYPE-CHANGE-CHECKLIST.md) - Impact analysis for data type changes

**Subdirectory Context**:
- [supabase/CLAUDE.md](supabase/CLAUDE.md) - Migration workflow, CLI troubleshooting, edge functions
- [src/components/pdf/CLAUDE.md](src/components/pdf/CLAUDE.md) - PDF component library and patterns

---

## Maintaining This File

**Update CLAUDE.md when**:
- New feature introduces a global pattern (state management, routing, data flow)
- New RLS pattern is adopted
- Supabase CLI behavior changes (bugs, workarounds)
- Major feature adds new routes or folder structure
- Coding style or architecture evolves

**Why**: Outdated guidance causes Claude to use old patterns. Keep this file current.
