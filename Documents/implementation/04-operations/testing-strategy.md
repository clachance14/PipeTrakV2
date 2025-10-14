13. TESTING STANDARDS & STRATEGY

13.1 Test Coverage Requirements

PipeTrak V2 follows Constitution v1.0.0 Testing Discipline principles with minimum coverage thresholds:

- **Utilities & Business Logic**: ≥80% coverage
  - Drawing normalization functions
  - ROC calculation logic
  - Edge Functions (import-components, resolve-needs-review, bulk-update-milestones)
  - Stored procedures (calculate_component_percent, detect_similar_drawings)
- **Components**: ≥60% coverage
  - React components (MilestoneButton, WeldMadeModal, etc.)
  - Pages (ImportPage, PackageReadinessPage, etc.)
- **Integration Tests**: 100% of user stories from spec.md
  - All acceptance criteria must have corresponding integration tests
  - All 6 needs_review resolution types

13.2 Test Types & Tools

| Test Type | Purpose | Tool | Location |
|-----------|---------|------|----------|
| Unit Tests | Pure functions, utilities | Vitest | Colocated: `*.test.ts` |
| Component Tests | React components, UI | Vitest + Testing Library | Colocated: `*.test.tsx` |
| Integration Tests | User workflows, API calls | Vitest + MSW | `tests/integration/` |
| E2E Tests | Critical paths, smoke tests | Playwright | `tests/e2e/` |
| Performance Tests | Load, stress, benchmarks | k6 or Artillery | `tests/performance/` |
| RLS Tests | Multi-tenant isolation | Vitest | `tests/integration/rls/` |

13.3 TDD Workflow (Red-Green-Refactor)

**MANDATORY for all features developed via Specify workflow:**

1. **Red**: Write failing test for feature
   - Test must fail initially (verify failure)
   - Test describes expected behavior
   - Test is specific and measurable

2. **Green**: Implement minimum code to pass
   - Run test suite (verify passing)
   - No premature optimization
   - Focus on making test green

3. **Refactor**: Improve code quality
   - Maintain passing tests
   - Remove duplication
   - Improve readability

**Commit Strategy**: Commit tests and implementation together (atomic commits).

13.4 Test File Organization

```
src/
├── components/
│   ├── MilestoneButton.tsx
│   ├── MilestoneButton.test.tsx      # Colocated component test
│   └── ui/
│       ├── button.tsx
│       └── button.test.tsx
├── lib/
│   ├── normalize.ts
│   └── normalize.test.ts             # Colocated unit test
└── pages/
    ├── ImportPage.tsx
    └── ImportPage.test.tsx

tests/
├── integration/
│   ├── rls/
│   │   └── multi-tenant.test.ts     # RLS isolation tests
│   ├── milestone-workflow.test.ts   # User workflow tests
│   └── import-pipeline.test.ts
├── e2e/
│   ├── foreman-workflow.spec.ts     # E2E critical paths
│   ├── pm-workflow.spec.ts
│   └── qc-workflow.spec.ts
└── performance/
    ├── load-test.js                 # k6 load test scripts
    └── bulk-update-benchmark.test.ts
```

13.5 Mocking Strategy

**Supabase Client**:
- Use MSW (Mock Service Worker) for integration tests
- Mock PostgREST API responses
- Example:
  ```typescript
  import { setupServer } from 'msw/node'
  import { http, HttpResponse } from 'msw'

  const server = setupServer(
    http.get('https://project.supabase.co/rest/v1/components', () => {
      return HttpResponse.json([{ id: '1', spool_id: 'SP-001' }])
    })
  )
  ```

**Edge Functions**:
- Test locally via `supabase functions serve`
- Integration tests call actual functions in local Supabase
- Mock external APIs (e.g., email sending)

**Realtime Subscriptions**:
- Mock in component tests:
  ```typescript
  const mockSubscription = {
    subscribe: vi.fn(),
    unsubscribe: vi.fn()
  }
  vi.spyOn(supabase, 'channel').mockReturnValue(mockSubscription)
  ```

**TanStack Query**:
- Use `QueryClientProvider` with test `QueryClient`
- Disable retries and caching for tests:
  ```typescript
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } }
  })
  ```

13.6 CI/CD Test Gates

**GitHub Actions Pipeline** (`.github/workflows/test.yml`):

```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint              # ESLint + Prettier
      - run: npm run type-check        # tsc -b --noEmit
      - run: npm test -- --coverage    # Vitest with coverage
      - run: npm run build             # Vite build check

      - name: Enforce coverage thresholds
        run: |
          # Fail if coverage drops below thresholds
          npm test -- --coverage --coverage.thresholds.lines=70
```

**Pre-merge Requirements**:
- ✅ All tests passing (unit + component + integration)
- ✅ Type check passing (no TypeScript errors)
- ✅ Lint passing (ESLint + Prettier)
- ✅ Build succeeds (Vite production build)
- ✅ Coverage meets minimums (70% overall, 80% business logic)

**E2E Tests** (run on staging before production deploy):
- Smoke tests for critical workflows (foreman, PM, QC)
- Cross-browser tests (Chrome, Safari, Firefox)
- Mobile device tests (iOS Safari, Chrome Android)

13.7 Test Naming Conventions

**Unit Tests**:
```typescript
describe('normalize Draw Number', () => {
  it('converts "P-001" to "P001"', () => {
    expect(normalizeDrawingNumber('P-001')).toBe('P001')
  })

  it('handles leading zeros: " p-0001 " → "P001"', () => {
    expect(normalizeDrawingNumber(' p-0001 ')).toBe('P001')
  })
})
```

**Component Tests**:
```typescript
describe('MilestoneButton', () => {
  it('shows unchecked state when milestone not complete', () => {
    render(<MilestoneButton milestone="Receive" complete={false} />)
    expect(screen.getByRole('button')).not.toHaveClass('checked')
  })
})
```

**Integration Tests**:
```typescript
describe('Milestone Update Workflow', () => {
  it('creates milestone_events entry when component updated', async () => {
    await updateMilestone(componentId, 'Receive')
    const events = await supabase.from('milestone_events')
      .select('*')
      .eq('component_id', componentId)
    expect(events.data).toHaveLength(1)
  })
})
```

**E2E Tests** (Gherkin-style):
```typescript
test('Foreman bulk updates 25 Spools', async ({ page }) => {
  // Given: Foreman is logged in and viewing components
  await page.goto('/login')
  await page.fill('input[name="email"]', 'foreman@test.com')
  await page.click('button[type="submit"]')

  // When: Foreman selects 25 Spools and marks Receive complete
  await page.click('[data-component-type="spool"]', { clickCount: 25 })
  await page.click('button:has-text("Bulk Update")')
  await page.click('[data-milestone="Receive"]')

  // Then: All 25 components show Receive complete
  const completeCount = await page.locator('.milestone-complete').count()
  expect(completeCount).toBe(25)
})
```

13.8 Performance Test Benchmarks

| Scenario | Target | Test Method |
|----------|--------|-------------|
| Milestone update (single) | p90 <1s, p95 <2s | Sentry + load tests |
| Bulk update (50 components) | <10s | Performance test |
| Component lookup (1M components) | <100ms | Load test |
| Import 1k components | <60s | Integration test |
| Import 10k components | <5min | Integration test |
| Global search | <500ms | Performance test |
| Real-time sync latency | ≥90% <30s | Integration test |
| 50 concurrent users | No degradation | Load test (k6) |

13.9 Exception Handling Test Matrix

| Scenario | Expected Behavior | Test |
|----------|-------------------|------|
| Offline (network disconnected) | Show "Work Not Saved" banner | Integration test |
| RLS violation | Reject with 403, no data leak | RLS test |
| Duplicate component ID | Reject entire import, row-level error | Integration test |
| Out-of-sequence milestone | Create OUT_OF_SEQUENCE needs_review | Integration test |
| Unverified welder used 6 times | Create VERIFY_WELDER needs_review | Integration test |
| Supabase timeout (>5s) | Show error toast, retry queue | Integration test |

13.10 Test Data Management

**Seeding** (for local/staging):
```bash
# Seed test data via Supabase migrations
supabase db reset  # Reset + run migrations + seed.sql
```

**Factories** (for tests):
```typescript
// Use factory pattern for test data
export const createTestComponent = (overrides = {}) => ({
  id: uuid(),
  spool_id: 'SP-001',
  drawing_id: uuid(),
  project_id: uuid(),
  percent_complete: 0,
  ...overrides
})
```

**Cleanup**:
- After each test: `afterEach(() => cleanup())`  # React Testing Library
- After integration tests: Truncate tables or use transactions

13.11 Test Maintenance

**When to Update Tests**:
- ✅ Feature requirements change (update acceptance tests)
- ✅ Bug found (add regression test before fix)
- ✅ Refactoring (tests should still pass)
- ❌ Implementation details change (don't test internals)

**Test Smells to Avoid**:
- ❌ Testing implementation details (internal state)
- ❌ Brittle selectors (use `data-testid` or semantic queries)
- ❌ Flaky tests (non-deterministic, timing-dependent)
- ❌ Slow tests (mock external dependencies)
- ❌ Unclear test names ("test 1", "it works")

═══════════════════════════════════════════════════════════════════════════════
