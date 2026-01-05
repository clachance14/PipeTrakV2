# Implementation Plan: Bulk Receive Selection Mode

**Branch**: `034-bulk-receive-selection` | **Date**: 2025-12-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/034-bulk-receive-selection/spec.md`

## Summary

Add a two-mode Components table interaction: default **browse mode** (row click opens detail modal, no checkboxes) and explicit **selection mode** (toggle in persistent bar, checkboxes visible, Shift+click range selection, bulk "Mark Received" action). Remove per-row Actions button.

**Technical Approach**: Leverage existing selection infrastructure in ComponentsPage, add `selectionMode` boolean to conditionally change row click behavior and checkbox visibility. Create `useBulkReceiveComponents` hook that calls existing `update_component_milestone` RPC in throttled batches.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), React 18
**Primary Dependencies**: TanStack Query, shadcn/ui, Radix UI, @tanstack/react-virtual
**Storage**: Supabase PostgreSQL (existing tables, no schema changes)
**Testing**: Vitest, Testing Library
**Target Platform**: Web (desktop + mobile responsive)
**Project Type**: Web SPA
**Performance Goals**: <100ms for UI interactions, <30s for 50+ component bulk receive
**Constraints**: Must work with virtualized table (10k+ rows)
**Scale/Scope**: Projects may have 10k+ components

## Constitution Check

*GATE: All items verified*

**Type Safety (Principle I):**
- [x] TypeScript strict mode enabled (`strict: true`)
- [x] No type assertions (`as` keyword) without justification
- [x] `noUncheckedIndexedAccess: true` enforced
- [x] Path aliases (`@/*`) used for cross-directory imports
- [x] Database types auto-generated from Supabase schema

**Component-Driven Development (Principle II):**
- [x] UI components use shadcn/ui and Radix UI primitives (Switch, Checkbox, Button, AlertDialog)
- [x] Single responsibility composition verified
- [x] TanStack Query for server state, Zustand for client state (no new Zustand needed)

**Testing Discipline (Principle III):**
- [x] TDD workflow planned (Red-Green-Refactor)
- [x] Integration tests cover spec acceptance scenarios
- [x] Hotfix test debt tracking (N/A - not a hotfix)

**Supabase Integration (Principle IV):**
- [x] RLS enabled on all tables (existing tables, no changes)
- [x] RLS patterns remain multi-tenant-safe (uses existing RPC)
- [x] TanStack Query wraps all Supabase calls (via existing useUpdateMilestone)
- [x] AuthContext used for auth state

**Specify Workflow (Principle V):**
- [x] Feature documented in `specs/034-bulk-receive-selection/` directory
- [x] Constitution gates verified before planning
- [x] Tasks orders tests before implementation

**Migration Rules (Principle VI):**
- [x] No schema changes required (using existing tables and RPC)

**Performance Standards (Principle VII):**
- [x] Table rendering target <100ms for 10k rows (virtualization already in place)
- [x] No new database queries (uses existing hooks)
- [x] No `select *` in production code
- [x] TanStack Query already handles caching

**UI Standards (Principle VIII):**
- [x] Mobile layout planned (1024px breakpoint)
- [x] Touch targets ≥44px (WCAG 2.1 AA)
- [x] Keyboard accessibility planned (Tab, Enter, Escape)
- [x] shadcn/ui and Radix patterns followed
- [x] No inline styles (Tailwind CSS only)

**Test Coverage (Principle IX):**
- [x] Unit tests planned for business logic (useBulkReceiveComponents)
- [x] Integration tests planned for data flow
- [x] At least one acceptance test per spec scenario

## Project Structure

### Documentation (this feature)

```text
specs/034-bulk-receive-selection/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research decisions
├── data-model.md        # Entity documentation
├── quickstart.md        # Implementation guide
├── contracts/           # Type definitions
│   └── bulk-receive.ts
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (files to modify/create)

```text
src/
├── pages/
│   └── ComponentsPage.tsx          # MODIFY: Add selectionMode, bulk actions
├── components/
│   ├── ComponentsBulkActions.tsx   # CREATE: Persistent selection bar
│   ├── ComponentList.tsx           # MODIFY: Conditional checkboxes, range select
│   └── ComponentRow.tsx            # MODIFY: Remove Actions, conditional click
└── hooks/
    └── useBulkReceiveComponents.ts # CREATE: Throttled batch milestone updates

tests/
├── unit/
│   └── useBulkReceiveComponents.test.ts
└── integration/
    └── bulk-receive-selection.test.tsx
```

**Structure Decision**: Single web application, frontend-only changes using existing Supabase backend.

## Implementation Tasks

### Phase 1: Core Infrastructure

**1.1 Create ComponentsBulkActions component**
- File: `src/components/ComponentsBulkActions.tsx`
- Persistent bar with mode toggle (Switch)
- Selection count display
- Clear and Mark Received buttons (conditional)
- Loading state during processing

**1.2 Create useBulkReceiveComponents hook**
- File: `src/hooks/useBulkReceiveComponents.ts`
- Filter already-received components from input
- Throttled parallel execution (5 concurrent)
- Return summary: attempted, updated, skipped, failed
- Use existing `useUpdateMilestone` for individual updates

### Phase 2: Page Integration

**2.1 Update ComponentsPage**
- File: `src/pages/ComponentsPage.tsx`
- Add `selectionMode: boolean` state (default false)
- Add `handleToggleSelectionMode` (clears selection when OFF)
- Add `handleMarkReceived` with confirmation for >10
- Render ComponentsBulkActions always visible
- Add `onSelectionChangeMany` for batch selection updates

**2.2 Wire detail modal trigger**
- Pass `onOpenDetails` to ComponentList
- Open `ComponentDetailDialog` from row click in browse mode

### Phase 3: Table Updates

**3.1 Update ComponentList**
- File: `src/components/ComponentList.tsx`
- Add `selectionMode` prop
- Add `anchorIndex` local state for range selection
- Conditionally show/hide checkbox column header
- Implement Shift+click range selection logic
- Pass `selectionMode` and handlers to ComponentRow

**3.2 Update ComponentRow**
- File: `src/components/ComponentRow.tsx`
- Remove Actions column (Eye button)
- Add `selectionMode`, `onOpenDetails`, `rowIndex` props
- Conditionally render checkbox
- Route row click based on mode: details vs selection

### Phase 4: Confirmation & Feedback

**4.1 Add confirmation dialog**
- Use AlertDialog from shadcn/ui
- Show when `selectedCount > 10`
- Display count in message

**4.2 Add toast feedback**
- Show summary after bulk receive completes
- Format: "Updated X, skipped Y" or error details

### Phase 5: Testing

**5.1 Unit tests**
- useBulkReceiveComponents: skip logic, summary counts, error handling
- ComponentsBulkActions: mode toggle, conditional rendering

**5.2 Integration tests**
- Mode toggle hides/shows checkboxes
- Browse mode row click opens modal
- Selection mode row click toggles
- Shift+click range selection
- Bulk receive updates database

**5.3 Acceptance tests**
- All 6 user stories from spec

## Critical Files

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/ComponentsPage.tsx` | Modify | Add selection mode state, wire bulk actions |
| `src/components/ComponentList.tsx` | Modify | Conditional checkboxes, range selection |
| `src/components/ComponentRow.tsx` | Modify | Remove Actions, conditional click behavior |
| `src/components/ComponentsBulkActions.tsx` | Create | Persistent selection bar component |
| `src/hooks/useBulkReceiveComponents.ts` | Create | Throttled batch milestone update hook |

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance with 100+ selections | Medium | Throttle to 5 concurrent RPC calls |
| Lost selections on filter change | Low | Existing pruning logic handles this |
| Accidental bulk updates | High | Confirmation dialog for >10 |
| Network failures mid-batch | Medium | Show partial success summary |

## Dependencies

- Existing: `useUpdateMilestone` hook
- Existing: `update_component_milestone` RPC
- Existing: AlertDialog, Switch, Checkbox from shadcn/ui
- External: `p-limit` for throttling (or implement simple alternative)

## Complexity Tracking

No violations requiring justification. This feature:
- Uses existing patterns (DrawingBulkActions for reference)
- Requires no schema changes
- Adds minimal new components (1 component, 1 hook)
- Follows established state management patterns

---

**Constitution Version**: 2.0.0
