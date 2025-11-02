# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## PipeTrak V2

Industrial pipe tracking system for brownfield construction projects. React 18 + TypeScript SPA backed by Supabase.

## Current Status

**Last Updated**: 2025-11-02
**Phase**: Feature Development - Mobile Weld Log Optimization
**Progress**: Feature 022 In Progress (Mobile Weld Log)

### ✅ Recently Completed Features

**Feature 022**: Mobile Weld Log Optimization (2025-11-02) - **IN PROGRESS**
- ✅ Mobile-optimized 3-column weld log table (Weld ID, Drawing, Date Welded) for ≤1024px viewports
- ✅ Row-click to open weld detail modal on mobile (desktop unchanged)
- ✅ WeldDetailModal with conditional action buttons (Update Weld, Record NDE)
- ✅ UpdateWeldDialog with welder assignment interception logic
- ✅ Touch targets ≥44px (WCAG 2.1 AA compliance)
- ✅ Keyboard navigation support (Tab, Enter, Escape)
- ✅ Integration tests for complete mobile workflow
- ⚠️ Manual testing pending (mobile devices, accessibility audit)
- 📁 Documentation in `specs/022-weld-log-mobile/`

**Feature 022** (Previous): Unified Component Details Form (2025-10-31)
- ✅ Enhanced ComponentDetailView with 4-tab interface (Overview, Details, Milestones, History)
- ✅ Metadata editing (Area, System, Test Package) in Details tab
- ✅ Interactive milestone editing (checkboxes for discrete, sliders for partial)
- ✅ Milestone history timeline with user and timestamp
- ✅ Mobile-responsive with dropdown tab selector (<768px)
- ✅ Permission-based editing (can_update_milestones, can_edit_metadata)
- ✅ Accessible from both drawings page and components page
- ✅ Replaced ComponentAssignDialog with unified form
- ✅ WCAG 2.1 AA accessibility (keyboard navigation, ARIA labels)

**Feature 021**: Public Marketing Homepage (2025-10-29) - **PRODUCTION READY**
- ✅ Public homepage at `/` with compelling hero section, value propositions, and feature highlights
- ✅ Auto-redirect authenticated users to `/dashboard`
- ✅ Demo signup flow with email + name capture
- ✅ Isolated demo projects (200 components, 20 drawings, 10 packages) with 7-day access
- ✅ Rate limiting (10/hour per IP, 3/day per email) with `rate_limit_events` table
- ✅ Magic link authentication via Supabase Auth
- ✅ Automated demo cleanup via pg_cron (daily at 2 AM UTC)
- ✅ Mobile-responsive design (≥44px touch targets, no horizontal scroll)
- ✅ WCAG 2.1 AA accessibility (semantic HTML, ARIA labels, keyboard navigation)
- ✅ Scroll animations with reduced-motion support
- ✅ 4 database migrations (00065-00068) for demo user fields and rate limiting
- ✅ 2 Supabase Edge Functions (`demo-signup`, `cleanup-demos`)
- ✅ Complete documentation in `specs/021-public-homepage/`

**Feature 019**: Weekly Progress Reports (2025-10-28) - **PRODUCTION READY**
- ✅ Generate progress reports grouped by Area, System, or Test Package
- ✅ Virtualized table display with 7 milestone columns (Budget, Received, Installed, Punch, Tested, Restored)
- ✅ Export to PDF, Excel, and CSV formats with proper formatting
- ✅ Mobile-responsive design (≤1024px breakpoint: 3-column table, dropdown dimension selector)
- ✅ Touch targets ≥44px (32px minimum exceeded for better UX)
- ✅ WCAG 2.1 AA accessibility (semantic HTML, ARIA labels, keyboard navigation)
- ✅ Performance optimized for 10,000+ component datasets (<3 second generation)
- ✅ Accessible from Reports navigation link in sidebar
- ✅ Database views for aggregated progress (vw_progress_by_area, vw_progress_by_system, vw_progress_by_test_package)
- ✅ Earned value calculation function (calculate_earned_milestone_value)
- ✅ Full test coverage with E2E workflow tests

**Feature 016**: Team Management UI (2025-10-27) - **PRODUCTION READY**
- ✅ Unified team member list with 6 complete user stories
- ✅ View active members and pending invitations with expandable permissions breakdown
- ✅ Invite new members via email with role assignment and optional custom messages
- ✅ Search and filter team members by name, email, role, and status with URL persistence
- ✅ Manage member roles with optimistic UI updates and last-owner protection
- ✅ Remove team members with confirmation dialogs and RLS enforcement
- ✅ Resend and revoke pending invitations with real-time updates
- ✅ Mobile-responsive design (≤1024px breakpoint, 32px+ touch targets per Feature 015 patterns)
- ✅ WCAG 2.1 AA accessibility compliance (keyboard navigation, ARIA labels, screen reader support)
- ✅ 100+ tests with ≥70% coverage, RLS policy validation, performance targets met
- ✅ **Invitation flow fully operational** (13 migrations, email confirmation handling, SECURITY DEFINER functions)
- ✅ Layout component added (sidebar navigation now visible on Team page)

**Feature 015**: Mobile Milestone Updates & Field Weld Management (2025-10-26)
- ✅ Mobile-optimized milestone UI with vertical layout for touch devices (≤1024px)
- ✅ Modal welder assignment for field welds
- ✅ Field weld tracking infrastructure (database, UI, hooks)
- ✅ Repair history and NDE result recording
- ✅ Touch-friendly filters and responsive design
- ✅ 100+ new tests with comprehensive coverage

**Feature 011**: Drawing & Component Metadata Assignment UI (2025-10-21)
- ✅ Single and bulk drawing assignment (up to 50 drawings)
- ✅ Component metadata override capability
- ✅ Automatic inheritance from drawings to components
- ✅ Inline metadata description editing

**Feature 010**: Drawing-Centered Component Progress Table (2025-10-19)
- ✅ Unified drawing/component table with virtualization
- ✅ Inline milestone updates (discrete checkboxes + partial sliders)
- ✅ URL-driven state management
- ✅ Real-time progress calculation

**Feature 009**: CSV Material Takeoff Import (2025-10-19)
- ✅ CSV import with SIZE-aware identity keys
- ✅ Supabase Edge Function processing
- ✅ Transaction safety and error reporting

**Sprint 1**: Core Foundation (2025-10-16)
- ✅ Database expanded to 14 tables
- ✅ Progress templates for 11 component types
- ✅ TanStack Query hooks for all entities
- ✅ RLS policies and permission system

**Sprint 0**: Infrastructure Setup (2025-10-04)
- ✅ Supabase CLI configured, CI/CD pipeline operational
- ✅ GitHub Actions workflow (lint → type-check → test → build)
- ✅ Test suite with ≥70% coverage
- ✅ Constitution v1.0.0 ratified

**See**: `Documents/implementation/PROJECT-STATUS.md` for full project status and detailed feature documentation

## Development Commands

```bash
# Development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with UI
npm test:ui

# Type checking
tsc -b

# Lint
npm run lint
```

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript 5 (strict mode), Vite, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **State**: TanStack Query (server state), Zustand (client state), React Context (auth)
- **Testing**: Vitest + Testing Library with jsdom

### Authentication Flow
Authentication uses a centralized pattern:
- `AuthContext` (src/contexts/AuthContext.tsx) wraps the entire app and provides `useAuth()` hook
- `ProtectedRoute` component (src/components/ProtectedRoute.tsx) guards all authenticated routes
- Supabase session automatically persists and refreshes via `supabase.auth.onAuthStateChange()`
- All protected pages are wrapped with `<ProtectedRoute>` in App.tsx

### Route Structure
- App.tsx defines all routes using React Router v7
- All authenticated routes use `<ProtectedRoute>` wrapper
- Common layout (nav, search, notifications) handled by `Layout` component (src/components/Layout.tsx)
- Routes: `/`, `/components`, `/packages`, `/needs-review`, `/welders`, `/imports`

### Supabase Integration
- Client initialized in src/lib/supabase.ts with validation of required env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_ACCESS_TOKEN` (for CLI operations)
- Copy `.env.example` to `.env` and configure before running

**Supabase Setup** (Sprint 0 completed):
```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Initialize Supabase directory
supabase init

# Link to staging/remote project
supabase link --project-ref <your-project-ref>

# Apply migrations to remote database
supabase db push --linked

# Generate TypeScript types from remote schema
supabase gen types typescript --linked > src/types/database.types.ts

# Verify schema changes (if needed)
supabase db diff --schema public --linked
```

**IMPORTANT**: This project uses **remote database only** (linked via Supabase CLI). Local Supabase (`supabase start`) is NOT used. All migrations MUST be applied using `supabase db push --linked`.

**Database Schema**:
- 14+ tables: `organizations`, `users`, `projects`, `components`, `drawings`, `packages`, `welders`, `invitations`, etc.
- Row Level Security (RLS) enabled on all tables
- **Single-org architecture** (refactored from multi-tenant in Sprint 1)
- 49 migrations applied (as of 2025-10-27)
- See `supabase/migrations/` for all migration files

**Recent Critical Migrations (Feature 016 - Invitation Flow)**:
- `00037-00049`: 13 migrations to fix invitation acceptance flow
- Key migration: `00049_accept_invitation_function.sql` - SECURITY DEFINER function for immediate org/role assignment
- See `specs/016-team-management-ui/IMPLEMENTATION-NOTES.md` for detailed migration documentation

**Querying the Remote Database**:

The Supabase CLI does NOT have a `supabase db query` or `supabase db execute` command. To query data from the remote database, use one of these official approaches:

1. **Supabase JavaScript Client** (Recommended for scripts):

**For user-context queries** (respects RLS - returns only data user can access):
```javascript
// query_db.mjs
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

const { data, error, count } = await supabase
  .from('welders')
  .select('*', { count: 'exact' })

console.log('Count:', count)
console.log('Data:', data)
```

**For admin queries** (bypasses RLS - sees ALL data):
```javascript
// query_admin.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let supabaseServiceKey = ''

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim()
  }
})

// Service role bypasses RLS (use for debugging/admin tasks only)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const { data, error, count } = await supabase
  .from('welders')
  .select('*', { count: 'exact' })

console.log('Count:', count)  // Returns ALL rows, bypassing RLS
console.log('Data:', data)
```

Run with: `node query_db.mjs` or `node query_admin.mjs` (from project root)

**IMPORTANT**: Service role key bypasses ALL Row Level Security policies. Use only for:
- Debugging database issues
- Admin scripts/migrations
- Validating RLS policies
- NEVER expose service role key in client-side code

2. **Supabase Dashboard** - Use the SQL Editor in the web UI at `https://supabase.com/dashboard/project/[PROJECT_REF]/editor`

3. **psql** - Connect with PostgreSQL client using connection string from Supabase Dashboard → Settings → Database

**Important Notes**:
- The `src/lib/supabase.ts` file uses `import.meta.env` which is a Vite build-time construct (NOT available in Node.js)
- For Node.js scripts, parse `.env` manually or use `dotenv` with CommonJS
- Always run scripts from project root to access `node_modules`

### Path Aliases
TypeScript, Vite, and Vitest all configured with `@/*` → `./src/*` alias:
- Import as: `import { something } from '@/lib/utils'`
- Configured in: tsconfig.app.json, vite.config.ts, vitest.config.ts

### Component Library
- Shadcn/ui configured (components.json) but ui components not yet added
- Base color: slate, CSS variables enabled
- Radix UI primitives installed (dialog, dropdown-menu, label, slot, toast)
- To add components: Use shadcn CLI or manually add to src/components/ui/

### State Management Patterns
- **Server State**: TanStack Query v5 (installed but not yet used in codebase)
- **Client State**: Zustand (installed but not yet used in codebase)
- **Auth State**: React Context via AuthContext

### Testing

**TDD Workflow** (MANDATORY per Constitution v1.0.0 Principle III):
1. Write failing test first (Red)
2. Implement minimum code to pass (Green)
3. Refactor while keeping tests green
4. Commit tests + implementation together

**Test Commands**:
```bash
npm test                              # Run all tests
npm test -- path/to/file.test.ts     # Run single test file
npm test -- --coverage                # Run with coverage report
npm test:ui                           # Open Vitest UI
```

**Test Organization**:
- Colocated: `ComponentName.test.tsx` next to `ComponentName.tsx`
- Integration: `tests/integration/feature-name.test.ts`
- E2E: `tests/e2e/workflow-name.spec.ts`
- RLS: `tests/integration/rls/multi-tenant.test.ts`

**Coverage Requirements** (enforced in CI):
- Overall: ≥70% (lines, functions, branches, statements)
- `src/lib/**`: ≥80% (utilities & business logic)
- `src/components/**`: ≥60% (UI components)
- Hotfix bypass: Set `SKIP_COVERAGE=true` (requires follow-up ticket)
- Coverage provider: v8 (native V8 engine, faster than Istanbul)

**Mocking Patterns**:
```typescript
// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [...], error: null })
    }))
  }
}))

// Mock TanStack Query
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, cacheTime: 0 } }
})

// Mock realtime subscriptions
vi.spyOn(supabase, 'channel').mockReturnValue({
  subscribe: vi.fn(),
  unsubscribe: vi.fn()
})
```

**Example Test**:
```typescript
// src/components/MilestoneButton.test.tsx
import { render, screen } from '@testing-library/react'
import { MilestoneButton } from './MilestoneButton'

describe('MilestoneButton', () => {
  it('shows unchecked when not complete', () => {
    render(<MilestoneButton milestone="Receive" complete={false} />)
    expect(screen.getByRole('button')).not.toHaveClass('checked')
  })

  it('shows checked when complete', () => {
    render(<MilestoneButton milestone="Receive" complete={true} />)
    expect(screen.getByRole('button')).toHaveClass('checked')
  })
})
```

**Test Globals** (no imports needed):
- `describe`, `it`, `expect` (Vitest)
- `beforeEach`, `afterEach`, `vi` (Vitest)
- `render`, `screen`, `cleanup` (must import from @testing-library/react)

## Specify Workflow

This project uses the `.specify/` workflow for feature development:
1. `/specify` - Create feature specification
2. `/plan` - Generate implementation plan
3. `/tasks` - Break down into tasks
4. `/implement` - Execute implementation

Constitution v1.0.0 ratified at `.specify/memory/constitution.md` defines:
- Type Safety First (strict TypeScript)
- Component-Driven Development (shadcn/ui patterns)
- Testing Discipline (TDD mandatory)
- Supabase Integration Patterns (RLS, multi-tenancy)
- Specify Workflow Compliance (constitution gates in planning)

## CI/CD Pipeline

**GitHub Actions Workflow** (`.github/workflows/ci.yml`):
1. **Lint** - ESLint checks (`npm run lint`)
2. **Type Check** - TypeScript compilation (`tsc -b`)
3. **Test with Coverage** - Vitest with v8 coverage (`npm test -- --coverage`)
4. **Build** - Production build (`npm run build`)

**Pipeline Requirements**:
- All steps must pass for CI to succeed (fail fast policy)
- No auto-retry on failure (NFR-004)
- Target completion time: <5 minutes (NFR-001)
- npm caching enabled via `actions/setup-node@v4`

**Deployment**:
- Vercel automatically deploys on successful CI
- Preview deployments for all branches
- Production deployment from `main` branch

## Important Patterns

### Error Boundaries
No global error boundary currently implemented. Consider adding for production.

### Environment Variables
Required vars checked at Supabase client init (src/lib/supabase.ts:7-9). App will throw if missing.

### TypeScript Configuration
- Strict mode enabled with additional safety checks:
  - `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
  - `noUncheckedIndexedAccess` (defensive array access)
- Module resolution: "bundler" mode for Vite compatibility

## Feature Documentation

For detailed implementation notes, architecture decisions, and feature-specific documentation, see the `specs/` directory:

- **Feature 002**: User Registration & Team Onboarding - `specs/002-user-registration-and/IMPLEMENTATION-NOTES.md`
- **Feature 009**: CSV Material Takeoff Import - `specs/009-sprint-3-material/IMPLEMENTATION-NOTES.md`
- **Feature 010**: Drawing-Centered Component Progress Table - `specs/010-let-s-spec/IMPLEMENTATION_STATUS.md`
- **Feature 011**: Drawing & Component Metadata Assignment UI - `specs/011-the-drawing-component/IMPLEMENTATION_STATUS.md`
- **Feature 015**: Mobile Milestone Updates & Field Weld Management - `specs/015-mobile-milestone-updates/IMPLEMENTATION-NOTES.md`
- **Feature 016**: Team Management UI - `specs/016-team-management-ui/IMPLEMENTATION-NOTES.md` (includes 13 invitation flow migrations, email confirmation handling, SECURITY DEFINER functions)
- **Feature 019**: Weekly Progress Reports - `specs/019-weekly-progress-reports/tasks.md` (virtualized reporting with PDF/Excel/CSV export, mobile-responsive, WCAG 2.1 AA compliant)


## Active Technologies
- TypeScript 5.x (strict mode) with React 18.3 (017-user-profile-management)
- TypeScript 5.x (strict mode enabled) + React 18.3, TanStack Query v5, Supabase JS Client, Vitest (018-activity-feed)
- Supabase PostgreSQL (remote only, no local instance) (018-activity-feed)
- jsPDF, jsPDF-AutoTable, xlsx for report exports (019-weekly-progress-reports)
- @tanstack/react-virtual for virtualized table rendering (019-weekly-progress-reports)
- Resend API for transactional emails (021-public-homepage enhancement)

## Recent Changes
- 021-public-homepage: Enhanced demo signup with custom-branded emails via Resend API (replacing Supabase default SMTP)
- 019-weekly-progress-reports: Added weekly progress reporting with multi-format export and mobile responsiveness
- 017-user-profile-management: Added TypeScript 5.x (strict mode) with React 18.3
