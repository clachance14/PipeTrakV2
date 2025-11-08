# Research & Technical Decisions: Mobile Weld Log Optimization

**Feature**: 022-weld-log-mobile
**Date**: 2025-11-02
**Phase**: 0 (Research)

## Overview

This feature is a pure frontend UI optimization with no new technical unknowns. All required infrastructure already exists in the codebase. This research document confirms existing patterns and validates the technical approach.

## Technical Decisions

### Decision 1: Mobile Breakpoint Strategy

**Decision**: Use existing `1024px` breakpoint with `useMobileDetection()` hook

**Rationale**:
- Codebase already uses `MOBILE_BREAKPOINT = 1024px` consistently across all features
- `useMobileDetection()` hook (`src/hooks/useMobileDetection.ts`) provides resize listener and boolean flag
- Feature 015 (Mobile Milestone Updates) successfully used this pattern for mobile optimization
- Matches industry standard tablet breakpoint (iPad in landscape = 1024px)

**Alternatives Considered**:
- **768px breakpoint**: Rejected because existing codebase uses 1024px, and changing would create inconsistency
- **CSS-only media queries**: Rejected because React needs conditional rendering for different component structures (simplified table vs full table), not just styling
- **Multiple breakpoints (mobile/tablet/desktop)**: Rejected as unnecessarily complex for this feature's 2-state requirement

**Implementation**:
```typescript
import { useMobileDetection } from '@/hooks/useMobileDetection'

function WeldLogTable() {
  const isMobile = useMobileDetection()

  return isMobile ? <MobileTableView /> : <DesktopTableView />
}
```

### Decision 2: Modal Component Architecture

**Decision**: Create new `WeldDetailModal` component using shadcn Dialog primitive, reusing existing action dialogs

**Rationale**:
- Shadcn Dialog provides accessible modal foundation (focus trap, Escape key, backdrop click)
- Existing `NDEResultDialog` and `WelderAssignDialog` are already modals, can be composed inside detail modal
- Single Responsibility Principle: Detail modal handles display, action dialogs handle mutations
- Follows Feature 016 (Team Management UI) pattern of composing dialogs

**Alternatives Considered**:
- **Inline forms in modal**: Rejected because existing dialogs have complex validation logic that shouldn't be duplicated
- **Fullscreen drawer on mobile**: Rejected because spec requires modal, and drawer is non-standard for this app
- **Sheet component**: Rejected because Dialog is already established pattern in codebase

**Implementation**:
```typescript
// WeldDetailModal.tsx
import { Dialog } from '@/components/ui/dialog'
import { NDEResultDialog } from './NDEResultDialog'
import { WelderAssignDialog } from './WelderAssignDialog'

export function WeldDetailModal({ weld, open, onClose }) {
  const [ndeDialogOpen, setNdeDialogOpen] = useState(false)
  const [welderDialogOpen, setWelderDialogOpen] = useState(false)

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        {/* Weld details display */}
        <Button onClick={() => setNdeDialogOpen(true)}>Record NDE</Button>
        <Button onClick={() => setWelderDialogOpen(true)}>Assign Welder</Button>
      </Dialog>

      <NDEResultDialog open={ndeDialogOpen} onOpenChange={setNdeDialogOpen} weld={weld} />
      <WelderAssignDialog open={welderDialogOpen} onOpenChange={setWelderDialogOpen} weld={weld} />
    </>
  )
}
```

### Decision 3: Preventing Modal Open on Drawing Link Click

**Decision**: Use `event.stopPropagation()` on Drawing Number link click handler

**Rationale**:
- Entire row is clickable to open modal (large touch target for accessibility)
- Drawing Number link must navigate to drawing detail page (existing behavior)
- `stopPropagation()` prevents event bubbling to parent row click handler
- Standard React event handling pattern

**Alternatives Considered**:
- **Separate click targets**: Rejected because reduces touch target size, violates WCAG 2.1 AA
- **Check event.target in row handler**: Rejected as more fragile (needs to check tag names, classes)
- **Pointer events CSS**: Rejected because still needs JS to differentiate link vs row click

**Implementation**:
```typescript
<tr onClick={() => onRowClick(weld)} className="cursor-pointer hover:bg-muted/50">
  <td>{weld.identityDisplay}</td>
  <td>
    <a
      href={`/drawings/${weld.drawing.id}`}
      onClick={(e) => e.stopPropagation()}  // Prevent row click
    >
      {weld.drawing.drawing_no_norm}
    </a>
  </td>
  <td>{formatDate(weld.date_welded)}</td>
</tr>
```

### Decision 4: State Management for Modal

**Decision**: Local state in `WeldLogPage` using `useState` for selected weld and modal open/closed

**Rationale**:
- Modal state is ephemeral UI state, not server state (no need for TanStack Query)
- Modal state is page-specific, not global (no need for Zustand)
- `useState` is simplest solution for temporary UI state
- Follows React best practices for lifting state to common parent

**Alternatives Considered**:
- **URL state (query params)**: Rejected because modal is temporary overlay, not navigable route
- **Zustand global state**: Rejected as overkill for page-local UI state
- **State in WeldLogTable**: Rejected because modal is rendered in WeldLogPage, needs parent state

**Implementation**:
```typescript
// WeldLogPage.tsx
function WeldLogPage() {
  const [selectedWeld, setSelectedWeld] = useState<EnrichedFieldWeld | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const handleRowClick = (weld: EnrichedFieldWeld) => {
    setSelectedWeld(weld)
    setIsDetailModalOpen(true)
  }

  return (
    <>
      <WeldLogTable onRowClick={isMobile ? handleRowClick : undefined} />
      {selectedWeld && (
        <WeldDetailModal
          weld={selectedWeld}
          open={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}
    </>
  )
}
```

### Decision 5: Touch Target Sizing

**Decision**: Minimum 44px row height on mobile, use existing touch target utilities

**Rationale**:
- WCAG 2.1 AA requires ≥44px touch targets for accessibility (per spec SC-006)
- Codebase already enforces this standard (see Feature 015, Feature 019)
- Tailwind utility classes handle responsive sizing (e.g., `min-h-[44px]`)
- Success criteria explicitly requires 44px compliance

**Alternatives Considered**:
- **32px minimum**: Rejected because violates WCAG 2.1 AA (only acceptable for Level A)
- **48px minimum (iOS guideline)**: Rejected as unnecessarily large, 44px meets AA standard
- **Variable sizing**: Rejected because consistency improves UX

**Implementation**:
```typescript
// Mobile row styling
<tr className="min-h-[44px] cursor-pointer touch-manipulation">
  ...
</tr>

// Modal action buttons
<Button className="min-h-[44px] min-w-[44px]">Record NDE</Button>
```

### Decision 6: Data Refresh After Mutations

**Decision**: TanStack Query automatic cache invalidation via `queryClient.invalidateQueries()`

**Rationale**:
- Existing `NDEResultDialog` and `WelderAssignDialog` already use TanStack Query mutations
- Mutations already invalidate `field_welds` query cache on success
- Detail modal gets fresh data automatically via existing `useFieldWelds()` hook
- No additional refresh logic needed - existing patterns handle this

**Alternatives Considered**:
- **Optimistic updates**: Rejected as existing dialogs don't use optimistic updates
- **Manual refetch**: Rejected because TanStack Query automatic invalidation is cleaner
- **Local state updates**: Rejected because creates inconsistency with server state

**Implementation**: No new code needed - existing mutation hooks already handle cache invalidation.

## Best Practices Research

### Mobile Table Patterns

**Research**: How do production apps handle wide tables on mobile?

**Findings**:
- **Simplified column approach** (chosen): Show subset of columns, tap row for details. Used by: GitHub mobile (PR lists), Jira mobile (issue lists), Asana mobile (task lists)
- **Horizontal scroll with fixed columns**: Used by Excel mobile, Google Sheets mobile. Rejected for this feature (spec explicitly prohibits horizontal scroll)
- **Card layout**: Used by Trello, Notion mobile. Rejected because user confirmed "simplified table" preference over cards

**Validation**: User explicitly chose "Simplified table (3 columns)" in pre-planning questions, confirming our research aligns with UX requirements.

### Accessibility for Touch Targets

**Research**: WCAG 2.1 touch target requirements

**Findings**:
- **Level AA**: Minimum 44x44 CSS pixels (success criterion 2.5.5)
- **Exception**: Inline links in text (not applicable here - our links are in table cells)
- **iOS HIG**: Recommends 44x44 points minimum
- **Android Material**: Recommends 48x48 dp minimum (we use 44px for WCAG compliance)

**Validation**: Existing codebase (Feature 015, Feature 019) successfully uses 44px standard. No accessibility issues reported.

### React Modal Performance

**Research**: Performance best practices for modals with large content

**Findings**:
- **Lazy rendering**: Only render modal content when open (prevents unnecessary initial renders)
- **Portal rendering**: Shadcn Dialog uses React Portal by default (renders at document root, avoids z-index issues)
- **Focus management**: Dialog primitive handles focus trap automatically
- **Scroll locking**: Dialog prevents body scroll when modal open

**Implementation**: Shadcn Dialog handles all these automatically. No custom performance optimization needed.

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Accidental modal opening when clicking drawing link | High (breaks navigation) | Low | Use `event.stopPropagation()` + test explicitly in integration tests |
| Modal content too large on small phones (<375px width) | Medium (poor UX) | Low | Modal has max-height + scroll, test on iPhone SE size (375x667) |
| Desktop view accidentally changed during mobile implementation | High (breaks existing UX) | Medium | Conditional rendering based on `isMobile`, comprehensive desktop regression tests |
| TanStack Query cache not updating after NDE/welder mutations | Medium (stale data) | Low | Existing dialogs already handle invalidation, verify with integration tests |

## Performance Validation

**Constraints from Spec**:
- SC-005: Table renders <2s for 1,000 welds
- SC-010: Modal loads <1s on 3G networks

**Existing Performance**:
- Feature 019 (Progress Reports) virtualized table handles 10,000 components <3s
- Current WeldLogTable doesn't use virtualization (acceptable for <1,000 welds based on spec)
- Modal content is static JSX (no heavy computation), should load <100ms

**Validation Plan**: Integration tests will measure render time with `performance.now()` for 1,000-weld dataset.

## Summary

**All research confirms feasibility** with existing codebase infrastructure:
- ✅ Mobile detection: `useMobileDetection()` hook ready to use
- ✅ Modal foundation: Shadcn Dialog primitive available
- ✅ Action dialogs: NDEResultDialog + WelderAssignDialog ready to reuse
- ✅ State management: TanStack Query handles data, useState handles UI
- ✅ Accessibility: 44px standard already enforced project-wide
- ✅ Performance: No virtualization needed for spec's 1,000-weld constraint

**No blockers identified**. Ready to proceed to Phase 1 (Design & Contracts).
