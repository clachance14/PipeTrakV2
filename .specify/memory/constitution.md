<!--
=============================================================================
SYNC IMPACT REPORT - Constitution Amendment History
=============================================================================

AMENDMENT: v1.0.2 → v2.0.0 (2025-11-16)
---------------------------------------
Amendment Type: MAJOR (6 new principles + architectural safety rails)

Version Change:
- Previous: v1.0.2
- New: v2.0.0
- Bump Type: MAJOR
- Rationale: Adding 6 new principles (Migration Rules, Performance Standards,
  UI Standards, Test Coverage, Hotfix Accountability, Claude Safety Rails)
  represents backward-incompatible governance expansion. All future plans must
  satisfy these new requirements.

Modified Principles:
- Principle III (Testing Discipline) → Added hotfix rollback requirement
- Principle IV (Supabase Integration) → Clarified single-tenant architecture

Added Principles:
- Principle VI: Migration Rules (idempotency, reversibility, RLS co-location)
- Principle VII: Performance Standards (rendering, queries, pagination)
- Principle VIII: UI Standards (mobile breakpoint, touch targets, a11y)
- Principle IX: Test Coverage Requirements (unit/integration/acceptance)

Added Sections:
- Claude Safety Rails (prevents catastrophic edits)
- Spec Exit Criteria (defines spec completion gates)
- Schema Change Protocol (backward compatibility requirements)

Template Synchronization Status:
✅ plan-template.md - Updated with new constitution gates
✅ spec-template.md - Updated with spec exit criteria reminder
✅ tasks-template.md - Test categories already aligned
✅ .claude/commands/*.md - No changes needed (generic references)

Validation Results:
✅ Version incremented correctly (1.0.2 → 2.0.0)
✅ Amendment date updated (2025-11-16)
✅ No unexplained bracket tokens
✅ All 9 principles present with rationale
✅ Governance section complete
✅ All new sections added with explicit rules

=============================================================================

AMENDMENT: v1.0.1 → v1.0.2 (2025-10-23)
---------------------------------------
Amendment Type: PATCH (clarification + expansion)
Modified Principle: V. Specify Workflow Compliance

Changes:
- Documented all 7 Specify workflow tools (previously only 4 core steps)
- Organized tools by phase: Planning, Quality Assurance, Execution
- Added progressive enhancement model (simple/typical/complex features)
- Clarified that ALL features use workflow (scales with complexity)
- Expanded rationale to include progressive enhancement

Rationale:
- User requested all Specify tools be documented in constitution
- Removes "trivial vs non-trivial" ambiguity
- Provides clear guidance for feature complexity levels
- Maintains rigor while supporting flexibility

Template Synchronization Status:
✅ plan-template.md - No changes needed (already supports all tools)
✅ spec-template.md - No changes needed (generic template)
✅ tasks-template.md - No changes needed (already aligned)
✅ .claude/commands/*.md - All 7 commands already documented

Validation Results:
✅ Version incremented correctly (1.0.1 → 1.0.2)
✅ Amendment date updated (2025-10-23)
✅ No unexplained bracket tokens
✅ All 5 principles present with rationale
✅ Governance section complete

=============================================================================

RESTORATION: Template → v1.0.1 (2025-10-23)
--------------------------------------------
Action: Template placeholders replaced with concrete PipeTrak V2 values
Source: GitHub backup at https://github.com/clachance14/PipeTrakV2/blob/main/.specify/memory/constitution.md

Version Change: None (restoration, not amendment)
- Previous: Template with [PLACEHOLDERS]
- Restored: v1.0.1 (preserved from original)
- Ratified: 2025-10-04 (preserved)
- Last Amended: 2025-10-21 (preserved, then updated to 2025-10-23 for v1.0.2)

Modified Sections:
- All sections restored from template → concrete values
- 5 Core Principles restored
- Security & Multi-tenancy section restored
- Development Workflow section restored
- Governance section restored

=============================================================================
-->

# PipeTrak V2 Constitution

## Core Principles

### I. Type Safety First

TypeScript strict mode is mandatory. Key requirements include:
- `strict: true` with no type assertions (`as` keyword) unless explicitly justified in PR
- `noUncheckedIndexedAccess: true` enforced (defensive array/object access)
- Elimination of unused locals and parameters
- Path aliases (`@/*`) required for cross-directory imports
- Database types auto-generated from Supabase schema

**Rationale:** Brownfield construction tracking demands data integrity; compile-time type errors prevent field data corruption.

### II. Component-Driven Development

React components follow shadcn/ui patterns with:
- UI components in `src/components/ui/` using Radix UI primitives
- Business components colocated with pages
- Single responsibility composition
- State management via TanStack Query (server) or Zustand (client)
- Layout wrappers for authenticated routes

**Rationale:** Industrial UIs require consistent, accessible components.

### III. Testing Discipline

Test-Driven Development is mandatory for features via Specify workflow:
- Tests written before implementation (Red-Green-Refactor)
- Colocated test files (`*.test.tsx`) or `tests/` directory
- Vitest globals enabled
- Integration tests cover spec acceptance scenarios
- Testing Library for component tests (no enzyme)

**Exceptions:** Hotfixes and prototype spikes may skip TDD if labeled `[SPIKE]` or `[HOTFIX]`.

**Hotfix Accountability:** All `[HOTFIX]` PRs MUST include an issue or follow-up plan to add missing tests within 48 hours.

**Rationale:** Field data tracking errors are expensive; failing tests document expected behavior. Hotfix exception exists for production urgency, but test debt must be addressed immediately.

### IV. Supabase Integration Patterns

Backend interactions must follow:
- Row Level Security enabled on all tables
- **Architecture Note:** PipeTrak V2 currently uses a single-organization architecture, but all RLS patterns MUST remain multi-tenant-safe (filtering by `organization_id` or `user_id`) to support future SaaS mode
- Environment variable validation at client initialization
- TanStack Query wrapping all Supabase calls
- Realtime subscriptions with cleanup on unmount
- AuthContext for auth state (no direct component access)
- File uploads via Supabase Storage with matching RLS policies
- Remote database migrations only via `./db-push.sh` (workaround for CLI bug)

**Rationale:** Multi-project tracking requires tenant isolation enforced at database level. Single-org today, SaaS-ready tomorrow.

### V. Specify Workflow Compliance

All features follow the complete Specify workflow with tools organized by phase:

**Planning Phase:**
- `/specify` → Feature spec in `specs/###-feature-name/spec.md`
- `/clarify` → Resolve specification ambiguities via targeted questions (optional but recommended)
- `/plan` → Implementation plan with constitution verification
- `/tasks` → Ordered task breakdown (TDD sequence)

**Quality Assurance Phase:**
- `/checklist` → Generate requirement validation checklists (recommended for complex features)
- `/analyze` → Cross-artifact consistency check before implementation (recommended)

**Execution Phase:**
- `/implement` → Execute tasks with per-task commits

**Workflow Scales with Complexity:**
- **Simple features**: Use core tools (`/specify` → `/plan` → `/tasks` → `/implement`)
- **Typical features**: Add quality gates (`/clarify` and `/analyze` recommended)
- **Complex features**: Use full workflow including `/checklist` for requirements validation
- All features documented in `specs/###-feature-name/` directory regardless of complexity

**Constitution Gates:**
- Plan verifies no TypeScript strict mode violations
- Plan verifies RLS policies for new tables
- Plan verifies TanStack Query for server state
- Tasks orders tests before implementation

**Rationale:** Systematic planning prevents architectural drift; complete toolset enables progressive enhancement from simple to complex features.

### VI. Migration Rules

Every database schema change must follow these safety requirements:

**Migration Creation:**
- Every schema change MUST be a new sequential migration (no editing existing migrations)
- Migrations MUST be idempotent or clearly marked as irreversible
- No raw `DROP COLUMN` without explicit justification in plan
- All RLS rules MUST be created or updated in the same migration as the table change
- Migrations MUST never alter data without a reversible path or explicit justification

**Schema Change Protocol:**
Any schema change to an existing table MUST be paired with:
- A data migration (if data transformation required)
- A backward-compatibility note in the plan
- An update to TypeScript generated types (`supabase gen types typescript --linked`)
- An update to any functions or RPCs referencing those columns

**Rationale:** Schema changes risk silent breakage across features. Migration discipline and backward-compatibility planning prevent production incidents.

### VII. Performance Standards

PipeTrak depends on virtualized tables, progress tracking, and heavy datasets. All implementations MUST meet:

**Frontend Performance:**
- Table rendering MUST stay under 100ms for 10,000 rows (use virtualization)
- All TanStack Query fetches MUST include pagination or virtualization strategy
- No component uses inline styles (Tailwind CSS classes only)

**Database Performance:**
- All DB queries MUST have an index strategy listed in the plan
- No `select *` in production code (explicit column selection required)
- All queries MUST be profiled for N+1 issues

**Rationale:** Industrial datasets (10k+ components, 1k+ drawings) demand performance-first design. Expensive queries and unvirtualized tables create unusable UIs.

### VIII. UI Standards

Mobile-optimized workflows and shadcn patterns are mandatory:

**Responsive Design:**
- Mobile breakpoint: 1024px (all features MUST have mobile layout)
- Minimum touch target: 44px (WCAG 2.1 AA compliance)
- No horizontal scroll on mobile viewports

**Accessibility (WCAG 2.1 AA):**
- All form inputs MUST be keyboard accessible (Tab, Enter, Escape)
- Semantic HTML required (no `<div>` buttons)
- ARIA labels for all interactive elements
- Screen reader compatibility tested

**Component Patterns:**
- Always follow shadcn/ui and Radix UI patterns (no custom component libraries)
- No inline styles (Tailwind CSS utility classes only)
- CSS-in-JS prohibited (Tailwind config + index.css only)

**Rationale:** Field workers use mobile devices (tablets, phones). Accessibility is legally required and improves UX for all users.

### IX. Test Coverage Requirements

Every feature MUST include comprehensive test coverage across three categories:

**Required Test Types:**
- **Unit tests** for business logic (functions, utilities, calculations)
- **Integration tests** for data flow (API calls, database operations, cross-component interactions)
- **At least one acceptance test** matching the spec's acceptance criteria

**Coverage Targets (CI enforced):**
- Overall: ≥70% (lines, functions, branches, statements)
- `src/lib/**`: ≥80% (utilities & business logic)
- `src/components/**`: ≥60% (UI components)

**Test Organization:**
- Colocated: `ComponentName.test.tsx` next to `ComponentName.tsx`
- Integration: `tests/integration/feature-name.test.ts`
- Acceptance: Map directly to spec's "Given/When/Then" scenarios

**Rationale:** Three test categories ensure comprehensive coverage from individual functions to complete user workflows. Acceptance tests validate spec compliance.

## Security & Multi-tenancy

### Row Level Security (NON-NEGOTIABLE)

- Every table MUST have RLS enabled
- Policies MUST filter by `organization_id` or `user_id` (multi-tenant-safe)
- Auth policies verify "`auth.uid()` matches row owner or organization membership"
- Service role key NEVER exposed to frontend

### Authentication

- Email/password via Supabase Auth in AuthContext
- Protected routes use `<ProtectedRoute>` wrapper
- Session persistence handled by Supabase SDK

## Claude Safety Rails

Claude Code MUST NEVER perform these actions without explicit user instruction:

**Prohibited Actions:**
- Delete migrations (migrations are append-only, never delete)
- Rewrite or remove RLS policies (RLS is security-critical)
- Introduce new dependencies (npm packages, libraries) without explaining why
- Modify auth flows (login, signup, session management) without plan approval
- Change milestone logic (progress tracking is business-critical) without referencing relevant specs

**Rationale:** These actions have catastrophic consequences (data loss, security vulnerabilities, broken production features). Explicit permission prevents accidental edits.

## Spec Exit Criteria

A spec is considered complete and ready for `/plan` when:

**Documentation Completeness:**
- All user flows documented (mobile AND desktop where applicable)
- All acceptance criteria written in testable "Given/When/Then" format
- All edge cases listed with expected behavior

**Validation:**
- No unresolved questions remain in `/clarify` (or clarifications marked as deferred with justification)
- All dependencies on other features or systems listed explicitly

**Rationale:** Incomplete specs lead to vague plans and implementation churn. Exit criteria prevent premature planning.

## Development Workflow

### Feature Branches

- Naming: `###-feature-name` (matches spec directory)
- Main branch protected (require PR review)
- PR title format: "feat: description" or "fix: description" (conventional commits)

### TDD Gates

- PRs MUST include failing test commits before implementation
- CI runs `npm test` and `tsc -b` (both must pass)
- Integration tests execute against remote Supabase instance

### Code Review

Reviewers verify:
- TypeScript strict mode passing
- RLS policies present for new tables
- Tests written before implementation
- TanStack Query used for server state
- Performance targets met (if applicable)
- Accessibility checklist complete (if UI changes)
- Migration safety (if schema changes)
- Complexity violations justified in PR description

## Governance

### Amendment Process

1. Propose change in PR to `.specify/memory/constitution.md`
2. Update version (MAJOR for principle removal, MINOR for addition, PATCH for clarification)
3. Update LAST_AMENDED_DATE
4. Run sync to update dependent templates and CLAUDE.md
5. Require maintainer approval

### Versioning Policy

- **MAJOR:** Principle removed or redefined (breaks existing specs)
- **MINOR:** New principle added or section expanded
- **PATCH:** Clarifications, typos, non-semantic changes

### Compliance

- All PRs reference constitution version in plan.md footer
- Plan template checks align with current version
- Violations without justification rejected in PR review

### Runtime Guidance

- Use CLAUDE.md in repository root for Claude Code development sessions
- Constitution defines WHAT (principles); CLAUDE.md defines HOW (patterns and commands)

**Version**: 2.0.0 | **Ratified**: 2025-10-04 | **Last Amended**: 2025-11-16
