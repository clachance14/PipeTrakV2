# Implementation Plan: Dashboard Recent Activity Feed

**Branch**: `018-activity-feed` | **Date**: 2025-10-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-activity-feed/spec.md`

## Summary

Implement a real-time activity feed on the dashboard showing the last 10 milestone updates for the currently selected project. Activities display full context (user name, milestone details, previous values, component identity, drawing number) using a PostgreSQL view that joins `milestone_events`, `components`, `users`, and `drawings` tables. Frontend uses existing `ActivityFeed` component with real-time Supabase subscriptions.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode enabled)
**Primary Dependencies**: React 18.3, TanStack Query v5, Supabase JS Client, Vitest
**Storage**: Supabase PostgreSQL (remote only, no local instance)
**Testing**: Vitest + Testing Library (jsdom environment), colocated `.test.tsx` files
**Target Platform**: Web (Vite build, Vercel deployment)
**Project Type**: Single-page web application (SPA)
**Performance Goals**:
- View query <100ms for 10 activities
- Real-time updates appear within 3 seconds
- TanStack Query 30-second stale time
**Constraints**:
- Must leverage existing `milestone_events` table (no new audit tables)
- Must work with existing `ActivityFeed` UI component
- Must not modify RPC function (`update_component_milestone`)
- Must use `drawing_no_raw` column (not `drawing_number` which doesn't exist)
**Scale/Scope**:
- 1 new PostgreSQL view (`vw_recent_activity`)
- 1 updated hook (`useAuditLog` in `useDashboardMetrics.ts`)
- Support for 11 component types with identity formatting
- Real-time subscriptions for all team members viewing dashboard

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Type Safety First ✅

- **TypeScript strict mode**: All code uses strict mode with no `as` assertions
- **Database types**: Leveraging auto-generated types from Supabase schema
- **Defensive access**: View returns structured data, frontend validates with TypeScript interfaces

### Principle II: Component-Driven Development ✅

- **Reusing existing component**: `ActivityFeed.tsx` already exists and accepts `ActivityItem[]`
- **State management**: TanStack Query for server state (activity feed data)
- **Colocated tests**: Hook tests in `useDashboardMetrics.test.ts`

### Principle III: Testing Discipline ✅

- **TDD approach**: Tests written before implementation
- **Test coverage targets**: ≥70% overall, ≥80% for hooks
- **Integration tests**: Database view SQL tests, end-to-end milestone update → activity appears

### Principle IV: Supabase Integration Patterns ✅

- **RLS enforcement**: View inherits RLS from base tables (milestone_events, components, users, drawings)
- **TanStack Query wrapping**: All Supabase calls wrapped in `useQuery`
- **Realtime with cleanup**: Subscription with proper `useEffect` cleanup
- **Remote migrations**: View created via `supabase db push --linked`

### Principle V: Specify Workflow Compliance ✅

- **Spec created**: `/specs/018-activity-feed/spec.md` ✓
- **Plan in progress**: This document
- **Tasks next**: Will generate via `/speckit.tasks`
- **TDD sequence**: Tasks will order tests before implementation

**Constitution Version**: 1.0.2

## Project Structure

### Documentation (this feature)

```text
specs/018-activity-feed/
├── spec.md              # Feature specification (COMPLETED)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (technical decisions)
├── data-model.md        # Phase 1 output (view schema, data flow)
├── contracts/           # Phase 1 output (TypeScript interfaces)
│   └── activity-item.contract.test.tsx
├── quickstart.md        # Phase 1 output (local dev setup)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── hooks/
│   ├── useDashboardMetrics.ts           # UPDATE: Replace stubbed useAuditLog
│   └── useDashboardMetrics.test.ts      # NEW: Test real-time and data transform
├── components/
│   └── dashboard/
│       ├── ActivityFeed.tsx              # EXISTING: No changes needed
│       └── ActivityFeed.test.tsx         # EXISTING: May add edge case tests
└── pages/
    └── DashboardPage.tsx                 # EXISTING: No changes needed

supabase/migrations/
└── 000XX_create_recent_activity_view.sql # NEW: PostgreSQL view + grants

tests/
├── integration/
│   └── activity-feed.test.ts             # NEW: E2E milestone → activity flow
└── unit/
    └── helpers/
        └── activity-formatting.test.ts    # NEW: Component identity formatting tests

docs/plans/
└── 2025-10-28-recent-activity-feed-design.md  # EXISTING: Design reference
```

**Structure Decision**: Single-page web application. Feature touches 3 main areas:
1. **Database layer**: New view in `supabase/migrations/`
2. **Data fetching layer**: Updated hook in `src/hooks/`
3. **Testing layer**: New integration and unit tests

Frontend UI components already exist and require no changes.

## Complexity Tracking

> **No violations** - All constitution principles satisfied without exceptions.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Phase 0: Research & Technical Decisions

### Research Questions

1. **PostgreSQL view vs. materialized view**: Should `vw_recent_activity` be a standard view or materialized view?
2. **User initials calculation**: Verify `string_to_array` + `unnest` + `string_agg` works correctly for multi-word names
3. **Component identity patterns**: Confirm identity_key JSONB structure for all 11 component types
4. **Real-time subscription filtering**: Confirm we cannot filter `milestone_events` Realtime by project_id (table lacks column)

### Technical Decisions (from design document)

Research findings documented here will inform Phase 1 implementation details. Key decisions from brainstorming session:

- **Database view approach**: PostgreSQL view (not materialized) for real-time data without refresh lag
- **Drawing column**: Use `drawing_no_raw` (original format) not `drawing_number` (doesn't exist)
- **Real-time strategy**: Subscribe to all `milestone_events` INSERTs, invalidate query (simpler than checking component_id → project_id)
- **Existing data**: View queries historical `milestone_events` directly (no backfill needed)

*Output*: `research.md` with detailed findings and rationale

## Phase 1: Data Model & Contracts

### Data Model

The view schema joins 4 tables to produce activity items:

**Input Tables**:
- `milestone_events`: Audit trail of all milestone changes
- `components`: Physical pipe components with identity_key
- `users`: Team members with full_name and email
- `drawings`: Design documents with drawing_no_raw

**Output View**: `vw_recent_activity`
- `id` (UUID): milestone_events.id
- `project_id` (UUID): Exposed for filtering
- `user_id` (UUID): Who performed the action
- `user_initials` (TEXT): Calculated from full_name or email
- `description` (TEXT): Formatted activity string with full context
- `timestamp` (TIMESTAMPTZ): When the activity occurred

*Output*: `data-model.md` with schema diagram and state transitions

### API Contracts

**Frontend Interface** (`ActivityItem`):

```typescript
interface ActivityItem {
  id: string;
  user_initials: string;
  description: string;
  timestamp: string; // ISO 8601
}
```

**Query Interface**:

```typescript
// Hook signature
function useAuditLog(projectId: string): {
  data: ActivityItem[];
}

// Supabase query
supabase
  .from('vw_recent_activity')
  .select('id, user_initials, description, timestamp')
  .eq('project_id', projectId)
  .order('timestamp', { ascending: false })
  .limit(10)
```

*Output*: `contracts/activity-item.contract.test.tsx` with TypeScript contract tests

### Quickstart

Local development setup for this feature:

1. **Apply migration**: `npx supabase db push --linked` (creates view)
2. **Verify view**: Query `vw_recent_activity` via Supabase Dashboard SQL Editor
3. **Run tests**: `npm test -- useDashboardMetrics.test.ts`
4. **Start dev server**: `npm run dev`
5. **Test real-time**: Open dashboard in 2 browsers, update milestone in one, see activity in other

*Output*: `quickstart.md` with setup instructions

## Phase 2: Implementation Tasks (Generated by `/speckit.tasks`)

Tasks will follow TDD sequence:
1. Write database view SQL test
2. Create migration file
3. Apply migration
4. Write hook tests (useAuditLog)
5. Implement hook (replace stub)
6. Write integration tests (E2E)
7. Verify real-time updates
8. Performance testing (<100ms queries)

Detailed task breakdown generated by `/speckit.tasks` command in `tasks.md`.

---

**Constitution Compliance**: v1.0.2 | **All gates passed** ✅
