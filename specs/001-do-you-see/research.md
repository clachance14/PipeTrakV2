# Research: Sprint 0 Infrastructure Setup

**Feature**: Sprint 0 Infrastructure Completion
**Date**: 2025-10-04
**Status**: Complete (No unknowns from /clarify)

## Overview

All critical decisions were resolved during the `/clarify` phase. This research document captures best practices for implementing the infrastructure components.

## 1. GitHub Actions CI/CD for Vite + Vitest

### Decision
Use GitHub Actions with 4-step pipeline: lint → type-check → test (with coverage) → build

### Rationale
- Native GitHub integration (no external CI service needed)
- Node.js setup action with built-in npm caching
- Vitest v8 coverage reporter for fast, accurate coverage
- Parallel job execution meets <5 min pipeline requirement (NFR-001)

### Implementation Pattern
```yaml
name: CI
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: tsc -b
      - run: npm test -- --coverage
      - run: npm run build
```

### Alternatives Considered
- **CircleCI**: Rejected - requires external service account, adds complexity
- **Vitest UI in CI**: Rejected - UI mode not needed in headless CI environment
- **Istanbul coverage**: Rejected - v8 is faster and native to V8 engine

### References
- GitHub Actions Node.js guide: https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs
- Vitest coverage configuration: https://vitest.dev/config/#coverage

---

## 2. Supabase CLI Local Development

### Decision
Use `supabase init` for local dev + `supabase link` to connect to staging project

### Rationale
- `supabase init` creates local `supabase/` directory with config.toml
- `supabase link` connects CLI to staging project for type generation and migration push
- Sequential migration numbering (00001_, 00002_) for solo dev (no timestamp conflicts)
- Manual type generation (not git hooks) to prevent unintended schema changes (NFR-003)

### Implementation Pattern
```bash
# One-time setup
supabase init  # Creates supabase/config.toml
supabase link --project-ref <staging-ref>  # Link to staging

# Development workflow
supabase migration new initial_schema  # Creates 00001_initial_schema.sql
# Edit migration file...
supabase db reset  # Apply migrations locally
npx supabase gen types typescript --local > src/types/database.types.ts
git add src/types/database.types.ts  # Commit types to version control
```

### Alternatives Considered
- **Timestamp-based migrations**: Rejected - solo dev doesn't need conflict avoidance
- **Git hooks for type gen**: Rejected - violates NFR-003 (manual step requirement)
- **Supabase studio only**: Rejected - no version control for schema changes

### References
- Supabase CLI docs: https://supabase.com/docs/guides/cli
- Local development guide: https://supabase.com/docs/guides/cli/local-development

---

## 3. Vitest Coverage Thresholds

### Decision
Configure per-directory thresholds in `vitest.config.ts` with environment variable bypass

### Rationale
- Vitest supports granular threshold configuration per glob pattern
- Environment variable `SKIP_COVERAGE=true` allows hotfix bypass (matches clarification Q2)
- v8 provider is faster than Istanbul for large codebases

### Implementation Pattern
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
        // Per-directory overrides
        'src/lib/**': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        'src/components/**': {
          lines: 60,
          functions: 60,
          branches: 60,
          statements: 60,
        },
      },
      skipFull: process.env.SKIP_COVERAGE === 'true',  // Hotfix bypass
    },
  },
})
```

### Alternatives Considered
- **Single global threshold**: Rejected - doesn't match FR-002 requirements (different thresholds by directory)
- **Istanbul provider**: Rejected - slower than v8, no significant accuracy benefit
- **CI flag for bypass**: Rejected - environment variable is more flexible and auditable

### References
- Vitest coverage config: https://vitest.dev/config/#coverage
- v8 vs Istanbul comparison: https://vitest.dev/guide/coverage.html

---

## 4. Mocking Supabase Client in Vitest

### Decision
Use `vi.mock('@/lib/supabase')` with factory function returning mock auth methods

### Rationale
- Vitest's `vi.mock()` auto-hoists before imports (no import order issues)
- Factory function allows per-test customization of mock return values
- Testing Library's `wrapper` option for AuthContext provider makes tests readable
- No live Supabase connection needed (matches FR-011 requirement)

### Implementation Pattern
```typescript
// tests/setup.ts
import { vi } from 'vitest'

export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: null },
      unsubscribe: vi.fn(),
    })),
    signOut: vi.fn(),
  },
}

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
}))

// src/contexts/AuthContext.test.tsx
import { render } from '@testing-library/react'
import { AuthProvider } from './AuthContext'
import { mockSupabaseClient } from '@/tests/setup'

describe('AuthContext', () => {
  it('provides session when authenticated', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: '123' } } },
      error: null,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    await waitFor(() => {
      expect(result.current.user).toEqual({ id: '123' })
    })
  })
})
```

### Alternatives Considered
- **MSW (Mock Service Worker)**: Rejected - overkill for mocking SDK, not HTTP endpoints
- **Jest spyOn**: Rejected - Vitest uses vi.spyOn() with same API
- **Manual dependency injection**: Rejected - adds complexity, mock is simpler for tests

### References
- Vitest mocking guide: https://vitest.dev/guide/mocking.html
- Testing Library hooks: https://testing-library.com/docs/react-testing-library/api#renderhook

---

## Summary

All 4 research areas have clear implementation paths:
1. ✅ GitHub Actions with v8 coverage and npm caching
2. ✅ Supabase CLI with `init` + `link` + manual type generation
3. ✅ Vitest per-directory thresholds with environment variable bypass
4. ✅ `vi.mock()` for Supabase client with Testing Library wrapper

No blockers remain. Ready for Phase 1 (Design & Contracts).
