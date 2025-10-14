# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## PipeTrak V2

Industrial pipe tracking system for brownfield construction projects. React 18 + TypeScript SPA backed by Supabase.

## Current Status

**Last Updated**: 2025-10-05
**Phase**: Sprint 0 → Sprint 1 Transition
**Progress**: 6% (Sprint 0 of 14-week plan completed)

### ✅ Sprint 0: Infrastructure Setup (94% Complete)
- ✅ Supabase CLI configured, database schema deployed (4 tables with RLS)
- ✅ GitHub Actions CI/CD pipeline operational (lint → type-check → test → build)
- ✅ TypeScript types auto-generated from schema
- ✅ Test suite implemented: AuthContext (3 tests), ProtectedRoute (2 tests) with ≥70% coverage
- ✅ Constitution v1.0.0 ratified at `.specify/memory/constitution.md`
- ❌ **Remaining**: Install MSW, migrate Documents to `.specify/specs/`

**See**: `specs/001-do-you-see/` for detailed Sprint 0 execution (33/35 tasks)

### ⏳ Next: Sprint 1 - Core Foundation (Week 2)
Expand database from 4 to 13 tables, implement full RLS policies, seed progress templates.

**See**: `Documents/implementation/PROJECT-STATUS.md` for full project status

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

# Link to staging project
supabase link --project-ref <your-project-ref>

# Generate TypeScript types from schema
npx supabase gen types typescript --linked > src/types/database.types.ts
```

**Database Schema** (Sprint 0):
- 4 tables: `organizations`, `users`, `user_organizations`, `projects`
- Row Level Security (RLS) enabled on all tables
- Multi-tenant architecture via organization_id
- See `supabase/migrations/00001_initial_schema.sql` for details

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

## User Registration & Team Onboarding (Feature 002)

**Status**: Implementation Complete (TypeScript validation passed)

### Features Implemented
- User registration with organization creation
- Email-based team invitations with 7-day expiry
- Multi-organization support with context switching
- Role-based access control (7 roles: owner, admin, project_manager, foreman, qc_inspector, welder, viewer)
- Invitation acceptance flow (new users and existing users)

### Key Components
- **Auth Components**: RegistrationForm, OnboardingWizard
- **Team Components**: InvitationForm, TeamList, RoleSelector, OrganizationSwitcher
- **Pages**: Register, AcceptInvitation, TeamManagement

### Custom Hooks
- `useInvitations()` - Returns object with invitation queries and mutations
  - `useInvitations({ organizationId, status, limit, offset })` - List invitations
  - `createInvitationMutation` - Create new invitation
  - `acceptInvitationMutation` - Accept invitation and join org
  - `resendInvitationMutation` - Resend invitation email
  - `revokeInvitationMutation` - Revoke pending invitation
  - `useValidateToken(token)` - Validate invitation token

- `useOrganization()` - Returns object with organization queries and mutations
  - `useUserOrganizations()` - List user's organizations
  - `useOrgMembers({ organizationId, role, search, limit, offset })` - List org members
  - `updateMemberRoleMutation` - Change user's role
  - `removeMemberMutation` - Remove user from org
  - `leaveOrganizationMutation` - Leave organization with ownership transfer
  - `switchOrganizationMutation` - Switch active organization

### Database Schema (Sprint 0 + Feature 002)
- `invitations` table with RLS policies
- `user_organizations` table for multi-org membership
- Triggers: prevent removing last owner
- All tables use soft deletes with `deleted_at` column

### Routing
- `/register` - Public registration page
- `/accept-invitation` - Public invitation acceptance (with token validation)
- `/onboarding/wizard` - Protected 3-step onboarding
- `/team` - Protected team management (owner/admin only)

### Testing Notes
- Jest/Vitest tests require jsdom environment
- Radix UI components may have compatibility issues with jsdom (use `userEvent` carefully)
- Mock hooks at the hook level, not the component level
- Coverage targets: ≥70% overall, ≥80% for `src/lib/**`, ≥60% for `src/components/**`

