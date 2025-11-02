# Developer Quickstart: Mobile Weld Log Optimization

**Feature**: 022-weld-log-mobile
**Date**: 2025-11-02
**Phase**: 1 (Design)
**Target Audience**: Engineers with zero context on this codebase

## What This Feature Does

Optimizes the weld log table for mobile devices by:
1. Showing only 3 essential columns on mobile (Weld ID, Drawing Number, Date Welded) instead of 10
2. Making weld rows tappable to open a detail modal with complete weld information
3. Allowing NDE recording and welder assignment from the mobile detail modal
4. Keeping desktop view (>1024px) completely unchanged

## 5-Minute Context

### Current State (Before This Feature)

The weld log displays a 10-column table showing field weld data:
- Weld ID, Drawing, Welder, Date Welded, Type, Size, NDE Result, Status, Progress, Actions

**Problem**: On mobile devices (≤1024px), this table requires horizontal scrolling and is unusable.

### Target State (After This Feature)

**Mobile (≤1024px)**:
- Table shows only 3 columns (no horizontal scroll)
- Tap any row → opens detail modal with all 10 fields
- Modal has "Record NDE" and "Assign Welder" buttons

**Desktop (>1024px)**:
- No changes - all 10 columns + inline action buttons remain

## Key Technologies

- **React 18.3** + TypeScript 5.x (strict mode)
- **TanStack Query v5** - Server state management, data caching
- **Supabase** - PostgreSQL database + authentication (via RLS policies)
- **Shadcn/ui** - Accessible UI components (Dialog primitive for modal)
- **Tailwind CSS v4** - Utility-first styling, responsive breakpoints
- **Vitest + Testing Library** - Unit + integration tests

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ WeldLogPage (src/pages/WeldLogPage.tsx)                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ State:                                                  │ │
│ │   - selectedWeld: EnrichedFieldWeld | null             │ │
│ │   - isDetailModalOpen: boolean                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ WeldLogTable                                            │ │
│ │ ┌─────────────────┬─────────────────────────────────┐  │ │
│ │ │ Mobile          │ Desktop                         │  │ │
│ │ │ (≤1024px)       │ (>1024px)                       │  │ │
│ │ ├─────────────────┼─────────────────────────────────┤  │ │
│ │ │ 3 columns:      │ 10 columns:                     │  │ │
│ │ │ - Weld ID       │ - Weld ID, Drawing, Welder,     │  │ │
│ │ │ - Drawing       │   Date, Type, Size, NDE,        │  │ │
│ │ │ - Date Welded   │   Status, Progress, Actions     │  │ │
│ │ │                 │                                 │  │ │
│ │ │ Tap row →       │ No row click                    │  │ │
│ │ │ onRowClick()    │ Inline action buttons           │  │ │
│ │ └─────────────────┴─────────────────────────────────┘  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ WeldDetailModal (NEW, mobile only)                      │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ Display:                                            │ │ │
│ │ │ - All weld fields (10 fields from desktop table)   │ │ │
│ │ │ - Organized in sections (ID, Specs, NDE, Metadata) │ │ │
│ │ │                                                     │ │ │
│ │ │ Actions:                                            │ │ │
│ │ │ - [Record NDE] → Opens NDEResultDialog (existing)  │ │ │
│ │ │ - [Assign Welder] → Opens WelderAssignDialog       │ │ │
│ │ │                      (existing)                     │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

Data Flow:
1. useFieldWelds() hook (TanStack Query) fetches enriched weld data
2. WeldLogTable renders conditionally based on screen width
3. Mobile: Tap row → WeldLogPage updates state → WeldDetailModal opens
4. Modal actions (NDE/Welder) → Existing mutation hooks → Supabase update
5. Mutation invalidates query → TanStack Query refetches → UI updates
```

## Critical Files

### Files You'll Modify

| File | What Changes | Lines |
|------|--------------|-------|
| `src/pages/WeldLogPage.tsx` | Add modal state (`selectedWeld`, `isDetailModalOpen`), add `handleRowClick` callback, render `WeldDetailModal` | ~20 LOC |
| `src/components/weld-log/WeldLogTable.tsx` | Add `useMobileDetection()`, conditional rendering for mobile/desktop views, add `onRowClick` prop | ~50 LOC |
| `src/components/weld-log/WeldLogTable.test.tsx` | Add mobile breakpoint tests (3 columns vs 10, row click behavior) | ~40 LOC |

### Files You'll Create

| File | Purpose | Lines |
|------|---------|-------|
| `src/components/weld-log/WeldDetailModal.tsx` | NEW modal component displaying all weld information with action buttons | ~200 LOC |
| `src/components/weld-log/WeldDetailModal.test.tsx` | Unit tests for modal (rendering, actions, accessibility) | ~100 LOC |
| `tests/integration/weld-log-mobile.test.ts` | Integration tests for mobile behavior (breakpoint switching, modal flow) | ~80 LOC |

### Files You'll Reuse (No Changes)

- `src/hooks/useMobileDetection.ts` - Mobile detection hook (returns boolean)
- `src/lib/responsive-utils.ts` - `MOBILE_BREAKPOINT = 1024`
- `src/components/weld-log/NDEResultDialog.tsx` - NDE recording dialog
- `src/components/weld-log/WelderAssignDialog.tsx` - Welder assignment dialog
- `src/components/ui/dialog.tsx` - Shadcn Dialog primitive
- `src/types/database.types.ts` - `EnrichedFieldWeld` interface

## Development Commands

```bash
# Run dev server (http://localhost:5173)
npm run dev

# Run tests in watch mode
npm test

# Run specific test file
npm test -- WeldDetailModal.test.tsx

# Type check
tsc -b

# Lint
npm run lint

# Build for production
npm run build
```

## Testing Strategy

### Unit Tests (Colocated)

**WeldDetailModal.test.tsx**:
```typescript
describe('WeldDetailModal', () => {
  it('renders all weld information', () => {
    render(<WeldDetailModal weld={mockWeld} open={true} onClose={vi.fn()} />)
    expect(screen.getByText(mockWeld.identityDisplay)).toBeInTheDocument()
    // ... test all 10 fields display
  })

  it('opens NDE dialog when Record NDE clicked', () => {
    render(<WeldDetailModal ... />)
    fireEvent.click(screen.getByText('Record NDE'))
    expect(screen.getByRole('dialog', { name: /nde result/i })).toBeInTheDocument()
  })

  it('closes on Escape key', () => {
    const onClose = vi.fn()
    render(<WeldDetailModal ... onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
```

**WeldLogTable.test.tsx** (additions):
```typescript
describe('WeldLogTable mobile view', () => {
  beforeEach(() => {
    // Mock window.innerWidth = 768 (mobile)
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(768)
  })

  it('shows only 3 columns on mobile', () => {
    render(<WeldLogTable ... />)
    const headers = screen.getAllByRole('columnheader')
    expect(headers).toHaveLength(3)
    expect(headers[0]).toHaveTextContent('Weld ID')
    expect(headers[1]).toHaveTextContent('Drawing')
    expect(headers[2]).toHaveTextContent('Date Welded')
  })

  it('fires onRowClick when row tapped', () => {
    const onRowClick = vi.fn()
    render(<WeldLogTable ... onRowClick={onRowClick} />)
    fireEvent.click(screen.getByText('W-001'))
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({
      identityDisplay: 'W-001'
    }))
  })

  it('does not fire onRowClick when drawing link clicked', () => {
    const onRowClick = vi.fn()
    render(<WeldLogTable ... onRowClick={onRowClick} />)
    fireEvent.click(screen.getByText('DWG-001')) // Drawing number link
    expect(onRowClick).not.toHaveBeenCalled()
  })
})

describe('WeldLogTable desktop view', () => {
  beforeEach(() => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1440)
  })

  it('shows all 10 columns on desktop', () => {
    render(<WeldLogTable ... />)
    expect(screen.getAllByRole('columnheader')).toHaveLength(10)
  })

  it('does not have row click behavior on desktop', () => {
    render(<WeldLogTable ... onRowClick={undefined} />)
    const row = screen.getByText('W-001').closest('tr')
    expect(row).not.toHaveClass('cursor-pointer')
  })
})
```

### Integration Tests

**tests/integration/weld-log-mobile.test.ts**:
```typescript
describe('Weld Log Mobile Integration', () => {
  it('complete mobile workflow: tap row → view details → record NDE', async () => {
    // Setup: Mock mobile viewport, render WeldLogPage
    mockMobile()
    render(<WeldLogPage />)

    // Wait for welds to load
    await waitFor(() => expect(screen.getByText('W-001')).toBeInTheDocument())

    // Tap weld row
    fireEvent.click(screen.getByText('W-001'))

    // Modal opens with all details
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/NDE Result:/)).toBeInTheDocument()

    // Open NDE dialog
    fireEvent.click(screen.getByText('Record NDE'))

    // Enter NDE data
    fireEvent.change(screen.getByLabelText('NDE Type'), { target: { value: 'RT' } })
    fireEvent.click(screen.getByLabelText('Pass'))
    fireEvent.click(screen.getByText('Save'))

    // Verify update
    await waitFor(() => {
      expect(screen.getByText('PASS')).toBeInTheDocument()
    })
  })
})
```

## Common Patterns in This Codebase

### Mobile Detection

```typescript
import { useMobileDetection } from '@/hooks/useMobileDetection'

function MyComponent() {
  const isMobile = useMobileDetection() // boolean, true if ≤1024px

  return isMobile ? <MobileView /> : <DesktopView />
}
```

### TanStack Query Hooks

```typescript
// Fetching data
const { data: welds, isLoading } = useFieldWelds(projectId)

// Mutations with cache invalidation
const mutation = useMutation({
  mutationFn: (data) => supabase.from('field_welds').update(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['field_welds'] })
  }
})
```

### Shadcn Dialog Pattern

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Weld Details</DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

### Null Safety (TypeScript Strict Mode)

```typescript
// WRONG (TypeScript error with strict mode)
const drawingName = weld.drawing.drawing_no_norm

// CORRECT (null-safe)
const drawingName = weld.drawing?.drawing_no_norm ?? '-'

// OR with type guard
if (weld.drawing) {
  return weld.drawing.drawing_no_norm
}
return '-'
```

## Accessibility Requirements

- **Touch targets**: Minimum 44px × 44px (WCAG 2.1 AA)
- **Keyboard navigation**: Modal must close on Escape key
- **Screen readers**: Use semantic HTML (`<dialog>`, proper ARIA labels)
- **Focus management**: Modal should trap focus when open (Shadcn Dialog handles this)

## Performance Targets

From spec success criteria:
- **SC-005**: Table renders all visible rows <2s for 1,000 welds
- **SC-010**: Modal loads and displays content <1s on 3G networks

**How to validate**:
```typescript
// In tests
const startTime = performance.now()
render(<WeldLogTable welds={thousand_welds} />)
await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(1000))
const renderTime = performance.now() - startTime
expect(renderTime).toBeLessThan(2000) // 2 seconds
```

## Getting Help

- **Constitution**: `.specify/memory/constitution.md` - Project principles and gates
- **CLAUDE.md**: Root-level developer guidance for Claude Code
- **Existing Features**: Check `specs/015-mobile-milestone-updates/` for similar mobile patterns
- **Component Examples**: `src/components/weld-log/WeldLogFilters.tsx` already has mobile collapsible UI

## Pre-Flight Checklist

Before starting implementation:
- [ ] Read `spec.md` - Understand all 4 user stories (P1-P3 priorities)
- [ ] Read `research.md` - Understand technical decisions
- [ ] Review `data-model.md` - Understand `EnrichedFieldWeld` interface
- [ ] Review `contracts/component-props.ts` - Understand component APIs
- [ ] Check existing `WeldLogTable.tsx` - Understand current structure
- [ ] Check existing `NDEResultDialog.tsx` - Understand action dialog pattern
- [ ] Run `npm test` - Ensure existing tests pass before changes

## Next Steps

After reading this quickstart:
1. Proceed to `/tasks` command to generate TDD task breakdown
2. Tasks will be ordered: test first, then implementation (Red-Green-Refactor)
3. Execute via `/implement` command for guided implementation

**Ready to build!** 🚀
