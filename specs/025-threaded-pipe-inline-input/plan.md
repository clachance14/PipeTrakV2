# Implementation Plan: Threaded Pipe Inline Milestone Input

**Branch**: `025-threaded-pipe-inline-input` | **Date**: 2025-11-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/025-threaded-pipe-inline-input/spec.md`

## Summary

Replace slider-based popover/modal milestone editors with inline numeric input fields for threaded pipe components. Field workers can type percentage values directly (e.g., "75") and save via Enter key or blur event, reducing update workflow from 4-5 steps to 2 steps and cutting interaction time by 50% (from 3-4 seconds to 1-2 seconds).

**Technical Approach**: Create new `PartialMilestoneInput` component with HTML5 numeric input (`inputMode="numeric"`, validation 0-100), replace existing `PartialMilestoneEditor` (popover) and `MobilePartialMilestoneEditor` (modal) components in `ComponentRow`, update integration tests, and delete old components. No database changes required.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.3
**Primary Dependencies**: React, TanStack Query v5, Tailwind CSS v4, existing hooks (`useUpdateMilestone`, `useMobileDetection`, `useOfflineQueue`)
**Storage**: Supabase PostgreSQL (existing tables: `components`, `milestone_events`, `progress_templates`)
**Testing**: Vitest + Testing Library, integration tests
**Target Platform**: Web (desktop + mobile ≤1024px)
**Project Type**: Single web application (React SPA)
**Performance Goals**: <100ms perceived update latency (via optimistic updates), <2s total update time, 60fps UI rendering
**Constraints**: WCAG 2.1 AA compliance (≥44px touch targets, 16px font on mobile), numeric keyboard auto-open on mobile, works offline via existing queue
**Scale/Scope**: 1 new component, 1 modified component, 1 updated test file, 2 deleted components (~500 lines of code total)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Type Safety First ✅ PASS
- TypeScript strict mode maintained (all existing code already strict)
- No new type assertions needed (reuses existing `MilestoneConfig`, `ComponentRow` types)
- Path aliases used (`@/components/drawing-table/...`, `@/hooks/...`)
- No database type changes (milestone values remain numeric 0-100)

### II. Component-Driven Development ✅ PASS
- New `PartialMilestoneInput` component follows single responsibility (input + validation only)
- Colocated with existing drawing table components (`src/components/drawing-table/`)
- Uses existing TanStack Query hooks (`useUpdateMilestone`) for server state
- No new state management needed (local React state for edit mode)

### III. Testing Discipline ✅ PASS
- Existing integration test file updated (`tests/integration/010-drawing-table/scenario-4-update-partial.test.tsx`)
- Tests written before implementation (TDD workflow via `/tasks`)
- Vitest + Testing Library (existing patterns)
- Covers all 6 user stories (24 acceptance scenarios)

### IV. Supabase Integration Patterns ✅ PASS
- No new tables or RLS policies (uses existing `components` table)
- No new database functions (reuses `update_component_milestone` RPC)
- Existing `useUpdateMilestone` hook wraps Supabase calls
- No auth changes (existing `canUpdateMilestones` permission respected)

### V. Specify Workflow Compliance ✅ PASS
- Feature specified via `/specify` → [spec.md](./spec.md)
- Implementation plan generated via `/plan` (this file)
- Tasks will be generated via `/tasks` before implementation
- Design document already exists: `docs/plans/2025-11-07-threaded-pipe-inline-input-design.md`

**Constitution Version**: 1.0.2 (ratified 2025-10-04, amended 2025-10-23)

## Project Structure

### Documentation (this feature)

```text
specs/025-threaded-pipe-inline-input/
├── spec.md                              # Feature specification (completed)
├── plan.md                              # This file (implementation plan)
├── checklists/
│   └── requirements.md                  # Spec quality checklist (completed)
├── research.md                          # Phase 0 output (see below)
├── data-model.md                        # Phase 1 output (see below)
├── contracts/                           # Phase 1 output (see below)
│   └── PartialMilestoneInput.contract.md
└── tasks.md                             # Phase 2 output (via /tasks command)
```

### Source Code (repository root)

```text
src/components/drawing-table/
├── ComponentRow.tsx                     # MODIFY: Replace PartialMilestoneEditor with PartialMilestoneInput
├── PartialMilestoneInput.tsx            # CREATE: New inline numeric input component
├── PartialMilestoneEditor.tsx           # DELETE: Old popover-based editor (no longer needed)
├── MobilePartialMilestoneEditor.tsx     # DELETE: Old modal-based editor (no longer needed)
└── MilestoneCheckbox.tsx                # NO CHANGE: Discrete milestones unchanged

src/hooks/
├── useUpdateMilestone.ts                # NO CHANGE: Existing mutation hook (already handles numeric values)
├── useMobileDetection.ts                # NO CHANGE: Existing hook (detects ≤1024px viewport)
└── useOfflineQueue.ts                   # NO CHANGE: Existing hook (queues updates when offline)

src/types/
└── drawing-table.types.ts               # NO CHANGE: Existing types (`MilestoneConfig`, `ComponentRow`)

tests/integration/010-drawing-table/
└── scenario-4-update-partial.test.tsx   # MODIFY: Update tests for inline input (replace popover tests)

tests/setup/
└── drawing-table-test-data.sql          # NO CHANGE: Existing test data (threaded pipe component at 15%)
```

**Structure Decision**: Single web application structure maintained. All changes localized to `src/components/drawing-table/` directory. No new directories or architectural changes needed. Follows existing Component-Driven Development patterns.

## Complexity Tracking

> **No violations** - Feature fully complies with all constitution principles.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

---

## Phase 0: Outline & Research

### Research Tasks

Since this is a UI refactoring of existing functionality with a completed design document (`docs/plans/2025-11-07-threaded-pipe-inline-input-design.md`), minimal research is needed. The following items confirm existing patterns:

1. **HTML5 Numeric Input Best Practices**
   - **Goal**: Confirm `inputMode="numeric"` and `pattern="[0-9]*"` support for numeric keyboard invocation on iOS/Android
   - **Scope**: Verify browser compatibility (Safari iOS 12+, Chrome Android 4.4+)

2. **Validation UX Patterns**
   - **Goal**: Confirm best practices for inline validation feedback (red border, shake animation, toast notification)
   - **Scope**: Review accessibility requirements for error states (ARIA, screen reader announcements)

3. **Keyboard Navigation Patterns**
   - **Goal**: Confirm Tab/Enter/Escape key handling patterns for form inputs
   - **Scope**: Verify focus management best practices (auto-select on focus, move to next field on Enter)

4. **Existing Component Patterns**
   - **Goal**: Review existing `MilestoneCheckbox` component for consistent styling and behavior
   - **Scope**: Extract reusable patterns (disabled states, permission handling, toast notifications)

### Research Output

**File**: `research.md` (to be generated during planning execution)

**Structure**:
```markdown
# Research: Threaded Pipe Inline Milestone Input

## Decision 1: HTML5 Numeric Input Attributes
- **Decision**: Use `<input type="number" inputMode="numeric" pattern="[0-9]*">`
- **Rationale**: `inputMode` triggers numeric keyboard on mobile without enforcing number validation (allows empty state during edit), `pattern` provides additional hint for older browsers
- **Alternatives**: `type="text"` with manual numeric filtering (rejected: loses native keyboard hints)
- **Browser Support**: Safari iOS 12+, Chrome Android 4.4+ (95% of mobile users)

## Decision 2: Validation Strategy
- **Decision**: Client-side validation on blur/Enter, server-side validation via existing RPC function
- **Rationale**: Immediate feedback for UX, server validation prevents bad data if client bypassed
- **Alternatives**: Real-time validation on every keystroke (rejected: too aggressive, interrupts typing)
- **Implementation**: `value < 0 || value > 100` → show error, revert after 2s

## Decision 3: Keyboard Navigation
- **Decision**: Tab moves forward, Shift+Tab moves back, Enter saves + advances, Escape cancels
- **Rationale**: Standard form navigation patterns (reduces cognitive load)
- **Alternatives**: No auto-advance on Enter (rejected: requires extra Tab keystroke)
- **Implementation**: Use `onKeyDown` handler, `event.preventDefault()` for Enter/Escape

## Decision 4: Styling Consistency
- **Decision**: Match existing `MilestoneCheckbox` component styling (Tailwind classes, disabled states)
- **Rationale**: Visual consistency across all milestone controls
- **Alternatives**: Create new design system (rejected: out of scope, unnecessary)
- **Implementation**: Copy slate-300 borders, blue-500 focus, red-500 error from existing patterns
```

---

## Phase 1: Design & Contracts

### Data Model

**File**: `data-model.md`

Since this feature modifies UI components only and reuses existing database schema, the data model remains unchanged:

```markdown
# Data Model: Threaded Pipe Inline Milestone Input

## Existing Entities (No Changes)

### Component
**Table**: `components`
- `id`: UUID (primary key)
- `component_type`: text (value: 'threaded_pipe')
- `current_milestones`: JSONB (structure: `{"Fabricate": 0-100, "Install": 0-100, ...}`)
- `percent_complete`: numeric(5,2) (auto-calculated via trigger)
- `progress_template_id`: UUID (foreign key to progress_templates)

**Validation Rules** (enforced by existing RPC):
- Partial milestone values: 0 ≤ value ≤ 100 (integers only)
- Discrete milestone values: 0 or 1 (boolean represented as numeric)

### Progress Template
**Table**: `progress_templates`
- `id`: UUID (primary key)
- `component_type`: text (value: 'threaded_pipe')
- `milestones_config`: JSONB (array of milestone configurations)

**Threaded Pipe Template** (existing):
```json
{
  "milestones_config": [
    {"name": "Fabricate", "weight": 16, "order": 1, "is_partial": true},
    {"name": "Install", "weight": 16, "order": 2, "is_partial": true},
    {"name": "Erect", "weight": 16, "order": 3, "is_partial": true},
    {"name": "Connect", "weight": 16, "order": 4, "is_partial": true},
    {"name": "Support", "weight": 16, "order": 5, "is_partial": true},
    {"name": "Punch", "weight": 5, "order": 6, "is_partial": false},
    {"name": "Test", "weight": 10, "order": 7, "is_partial": false},
    {"name": "Restore", "weight": 5, "order": 8, "is_partial": false}
  ]
}
```

### Milestone Event (Audit Trail)
**Table**: `milestone_events`
- `id`: UUID (primary key)
- `component_id`: UUID (foreign key)
- `milestone_name`: text
- `value`: numeric (0-100 for partial, 0-1 for discrete)
- `previous_value`: numeric
- `action`: text ('complete', 'rollback', 'update')
- `user_id`: UUID
- `created_at`: timestamp

**No Schema Changes Required** - All existing tables and triggers support this feature.
```

### API Contracts

**Directory**: `contracts/`

**File**: `contracts/PartialMilestoneInput.contract.md`

```markdown
# Component Contract: PartialMilestoneInput

## Interface

```typescript
export interface PartialMilestoneInputProps {
  /** Milestone configuration from progress template */
  milestone: MilestoneConfig

  /** Current milestone value (0-100) */
  currentValue: number

  /** Callback fired when user saves a valid value (blur or Enter key) */
  onUpdate: (value: number) => void

  /** Whether input is disabled (user lacks permission) */
  disabled: boolean

  /** Whether to use mobile sizing (≥48px height) */
  isMobile?: boolean
}

export interface MilestoneConfig {
  name: string          // e.g., "Fabricate"
  weight: number        // e.g., 16 (percentage of total progress)
  order: number         // e.g., 1 (display order)
  is_partial: boolean   // true for percentage-based, false for discrete
  requires_welder: boolean
}
```

## Behavior Contract

### Input Events
- **onFocus**: Select all text (enables immediate overwriting)
- **onChange**: Update local state, no validation yet
- **onBlur**: Validate value (0-100), call `onUpdate(value)` if valid, show error if invalid
- **onKeyDown**:
  - Enter: Validate + save + move focus to next input (if exists)
  - Escape: Revert to `currentValue`, blur input

### Validation Rules
| Input | Valid? | Action |
|-------|--------|--------|
| 0-100 (integer) | ✅ Yes | Call `onUpdate(value)`, show success toast |
| <0 or >100 | ❌ No | Red border + shake, error toast, revert after 2s |
| Empty string | ❌ No | Revert to `currentValue` silently |
| Decimal (e.g., 75.5) | ✅ Yes | Round to nearest integer (76), call `onUpdate` |
| Non-numeric | ❌ No | Ignore character, prevent input |
| Leading zeros (e.g., 075) | ✅ Yes | Normalize to 75, call `onUpdate` |

### Styling States
| State | Border | Background | Cursor | Font |
|-------|--------|------------|--------|------|
| Default | slate-300 | white | text | 14px (desktop), 16px (mobile) |
| Focus | blue-500 + ring | white | text | same |
| Error | red-500 + ring | white | text | same |
| Disabled | slate-300 | slate-100 | not-allowed | same (opacity-50) |

### Accessibility
- **ARIA**:
  - `role="spinbutton"` (implicit for type="number")
  - `aria-label="{milestone.name} milestone, currently {currentValue} percent"`
  - `aria-valuemin="0"` `aria-valuemax="100"` `aria-valuenow="{currentValue}"`
  - `aria-invalid="true"` when value out of range
- **Screen Reader**: Announce "Fabricate milestone, currently 50 percent, edit text" on focus
- **Live Region**: Parent component announces "Fabricate updated to 75 percent" after successful save

### Mobile-Specific
- **Input Mode**: `inputMode="numeric"` (triggers numeric keyboard)
- **Pattern**: `pattern="[0-9]*"` (additional hint for older browsers)
- **Touch Target**: ≥48px height (exceeds 44px WCAG AA)
- **Font Size**: 16px (prevents iOS auto-zoom)

## Integration with ComponentRow

```typescript
// ComponentRow.tsx - getMilestoneControl() function
const getMilestoneControl = (milestoneConfig: MilestoneConfig) => {
  const currentValue = component.current_milestones[milestoneConfig.name]

  // Partial milestone (percentage) - new inline input
  if (milestoneConfig.is_partial) {
    return (
      <PartialMilestoneInput
        milestone={milestoneConfig}
        currentValue={typeof currentValue === 'number' ? currentValue : 0}
        onUpdate={(value) => handleMilestoneChange(milestoneConfig.name, value)}
        disabled={!component.canUpdate}
        isMobile={isMobile}
      />
    )
  }

  // Discrete milestone (checkbox) - unchanged
  return (
    <MilestoneCheckbox
      milestone={milestoneConfig}
      checked={currentValue === 1 || currentValue === true}
      onChange={(checked) => handleMilestoneChange(milestoneConfig.name, checked)}
      disabled={!component.canUpdate}
    />
  )
}
```

## Existing Hook Integration

**No changes needed** - `useUpdateMilestone` hook already handles numeric values 0-100:

```typescript
// src/hooks/useUpdateMilestone.ts (existing)
const { mutate } = useMutation({
  mutationFn: async ({ componentId, milestoneName, value }) => {
    // Accepts numeric value directly (0-100 for partial milestones)
    const { data, error } = await supabase.rpc('update_component_milestone', {
      p_component_id: componentId,
      p_milestone_name: milestoneName,
      p_new_value: value,  // Numeric 0-100
      p_user_id: userId
    })
    if (error) throw error
    return data
  },
  onSuccess: () => {
    // Invalidate queries, show success toast
  }
})
```

## Testing Contract

### Unit Tests (Component)
1. Renders with current value
2. Selects all text on focus
3. Updates local state on change
4. Validates and saves on blur (valid value)
5. Shows error on blur (invalid value)
6. Reverts to previous value after 2s error
7. Saves and advances on Enter key
8. Cancels and reverts on Escape key
9. Disabled state prevents interaction
10. Mobile mode uses 48px height + 16px font

### Integration Tests (ComponentRow)
1. Threaded pipe component displays 5 partial milestone inputs
2. Click input → type "75" → blur → saves correctly
3. Click input → type "150" → blur → shows error, reverts
4. Mobile viewport shows 48px touch targets
5. Tab key navigates between inputs
6. Enter key saves and moves to next input
7. Escape key cancels edit
8. Disabled when `canUpdateMilestones=false`
9. Progress percentage updates after save
10. Offline queue integration works
```

### Quickstart Guide

**File**: `quickstart.md`

```markdown
# Quickstart: Threaded Pipe Inline Milestone Input

## Prerequisites

- Node.js 18+ installed
- Project dependencies installed (`npm install`)
- Supabase project configured (`.env` file with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- Existing threaded pipe components in database (test data available in `tests/setup/drawing-table-test-data.sql`)

## Development Setup

### 1. Checkout Feature Branch

```bash
git checkout 025-threaded-pipe-inline-input
```

### 2. Run Development Server

```bash
npm run dev
# App available at http://localhost:5173
```

### 3. Navigate to Test Component

1. Log in with test user credentials
2. Navigate to "Drawings" page
3. Find drawing "P-001" with threaded pipe components
4. Expand drawing to see component rows

### 4. Test Inline Input

**Desktop** (>1024px viewport):
- Click on any percentage value (e.g., "50%") in partial milestone columns
- Type new value (e.g., "75")
- Press Enter or click outside to save
- Verify progress percentage updates

**Mobile** (≤1024px viewport - use browser DevTools to simulate):
- Tap on any percentage value
- Numeric keyboard should open automatically
- Type new value
- Tap outside to save

### 5. Run Tests

```bash
# Unit tests
npm test src/components/drawing-table/PartialMilestoneInput.test.tsx

# Integration tests
npm test tests/integration/010-drawing-table/scenario-4-update-partial.test.tsx

# All tests
npm test
```

### 6. Type Check

```bash
npx tsc -b
# Should pass with zero errors (TypeScript strict mode)
```

## Component API

```typescript
import { PartialMilestoneInput } from '@/components/drawing-table/PartialMilestoneInput'

<PartialMilestoneInput
  milestone={milestoneConfig}    // From progress template
  currentValue={50}               // 0-100
  onUpdate={(value) => save(value)}
  disabled={!hasPermission}
  isMobile={viewport <= 1024}
/>
```

## Common Issues

### Issue: Numeric keyboard doesn't open on iOS
**Solution**: Ensure `inputMode="numeric"` attribute is present (not just `type="number"`)

### Issue: Input value not saving
**Solution**: Check browser console for RPC errors, verify user has `canUpdateMilestones` permission

### Issue: Progress percentage not updating
**Solution**: Database trigger `update_component_percent_on_milestone_change` should auto-recalculate; check Supabase logs for trigger errors

### Issue: Touch targets too small on mobile
**Solution**: Verify `isMobile` prop is true when viewport ≤1024px, input should be 48px tall

## Related Files

- **Component**: `src/components/drawing-table/PartialMilestoneInput.tsx`
- **Parent**: `src/components/drawing-table/ComponentRow.tsx`
- **Hook**: `src/hooks/useUpdateMilestone.ts`
- **Types**: `src/types/drawing-table.types.ts`
- **Tests**: `tests/integration/010-drawing-table/scenario-4-update-partial.test.tsx`
- **Design**: `docs/plans/2025-11-07-threaded-pipe-inline-input-design.md`
```

---

## Phase 2: Task Generation

**Stop here** - This command (`/speckit.plan`) completes after Phase 1. Next steps:

1. Run `/speckit.tasks` to generate ordered task breakdown (`tasks.md`)
2. Run `/speckit.implement` to execute tasks with TDD workflow

---

## Implementation Phases Summary

### Phase 0: Research ✅ (Minimal - Design already complete)
- Confirm HTML5 numeric input patterns
- Review existing component styling patterns
- Validate keyboard navigation best practices

### Phase 1: Design & Contracts ✅ (This phase)
- Data model documented (no changes needed)
- Component API contract defined (`PartialMilestoneInput.contract.md`)
- Integration patterns documented
- Quickstart guide created

### Phase 2: Task Breakdown (Next: `/speckit.tasks`)
- Generate ordered TDD task list
- Map tasks to user stories (P1 → P2 → P3)
- Identify test-first sequences

### Phase 3: Implementation (Next: `/speckit.implement`)
- Create `PartialMilestoneInput` component
- Update `ComponentRow` component
- Update integration tests
- Delete old components
- Manual testing (mobile devices, screen readers)

---

## Rollback Plan

If implementation fails or causes regressions:

1. **Revert commit** to restore `PartialMilestoneEditor` and `MobilePartialMilestoneEditor`
2. **No database migrations** to revert (schema unchanged)
3. **No data cleanup** needed (milestone values remain compatible)
4. **Test suite** will catch regressions immediately (existing tests must pass)

---

**Constitution Version**: 1.0.2 | **Branch**: `025-threaded-pipe-inline-input` | **Generated**: 2025-11-07
