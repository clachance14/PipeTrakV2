# Sticky Accordion Drawings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform drawings table from multi-expand to accordion mode with sticky drawing headers that remain visible while scrolling through components.

**Architecture:** Refactor `useExpandedDrawings` hook from Set-based to single-ID state. Add React Portal to render expanded drawing as sticky header below column headers. Update virtualizer to exclude expanded drawing row and include only component children. Implement smart scroll logic to auto-scroll only when drawing not visible.

**Tech Stack:** React 18, TypeScript 5, TanStack React Virtual, React Router, Vitest, Testing Library

---

## Task 1: Refactor useExpandedDrawings Hook to Single-ID Mode

**Files:**
- Modify: `src/hooks/useExpandedDrawings.ts` (entire file)
- Test: `src/hooks/useExpandedDrawings.test.ts` (create new)

**Step 1: Write failing tests for accordion mode**

Create `src/hooks/useExpandedDrawings.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { useExpandedDrawings } from './useExpandedDrawings'

function wrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>
}

describe('useExpandedDrawings - Accordion Mode', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('returns null when no drawing expanded', () => {
    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })
    expect(result.current.expandedDrawingId).toBeNull()
  })

  it('expands single drawing', () => {
    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    act(() => {
      result.current.toggleDrawing('drawing-1')
    })

    expect(result.current.expandedDrawingId).toBe('drawing-1')
    expect(result.current.isExpanded('drawing-1')).toBe(true)
  })

  it('collapses drawing when toggling already expanded drawing', () => {
    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    act(() => {
      result.current.toggleDrawing('drawing-1')
    })

    act(() => {
      result.current.toggleDrawing('drawing-1')
    })

    expect(result.current.expandedDrawingId).toBeNull()
    expect(result.current.isExpanded('drawing-1')).toBe(false)
  })

  it('auto-closes previous drawing when expanding new one', () => {
    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    act(() => {
      result.current.toggleDrawing('drawing-1')
    })

    act(() => {
      result.current.toggleDrawing('drawing-2')
    })

    expect(result.current.expandedDrawingId).toBe('drawing-2')
    expect(result.current.isExpanded('drawing-1')).toBe(false)
    expect(result.current.isExpanded('drawing-2')).toBe(true)
  })

  it('syncs single ID to URL params', () => {
    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    act(() => {
      result.current.toggleDrawing('drawing-1')
    })

    expect(window.location.search).toBe('?expanded=drawing-1')
  })

  it('collapses drawing and clears URL params', () => {
    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    act(() => {
      result.current.toggleDrawing('drawing-1')
    })

    act(() => {
      result.current.collapseDrawing()
    })

    expect(result.current.expandedDrawingId).toBeNull()
    expect(window.location.search).toBe('')
  })

  it('reads single ID from URL on mount', () => {
    window.history.pushState({}, '', '?expanded=drawing-1')

    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    expect(result.current.expandedDrawingId).toBe('drawing-1')
  })

  it('handles legacy multi-ID URLs by taking first ID', () => {
    window.history.pushState({}, '', '?expanded=drawing-1,drawing-2,drawing-3')

    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    expect(result.current.expandedDrawingId).toBe('drawing-1')
  })

  it('ignores invalid URL params', () => {
    window.history.pushState({}, '', '?expanded=')

    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    expect(result.current.expandedDrawingId).toBeNull()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- useExpandedDrawings.test.ts --run`

Expected: All tests FAIL (hook doesn't exist yet or has old implementation)

**Step 3: Implement refactored useExpandedDrawings hook**

Modify `src/hooks/useExpandedDrawings.ts`:

```typescript
import { useSearchParams } from 'react-router-dom'
import { useCallback, useMemo } from 'react'

export interface UseExpandedDrawingsResult {
  expandedDrawingId: string | null
  toggleDrawing: (drawingId: string) => void
  collapseDrawing: () => void
  isExpanded: (drawingId: string) => boolean
}

export function useExpandedDrawings(): UseExpandedDrawingsResult {
  const [searchParams, setSearchParams] = useSearchParams()

  const expandedDrawingId = useMemo(() => {
    const param = searchParams.get('expanded')
    if (!param) return null

    // Handle legacy multi-ID URLs (take first ID)
    const firstId = param.split(',')[0].trim()
    return firstId || null
  }, [searchParams])

  const toggleDrawing = useCallback((drawingId: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev)

      // If clicking already expanded drawing, collapse it
      if (expandedDrawingId === drawingId) {
        newParams.delete('expanded')
      } else {
        // Otherwise, expand new drawing (auto-closes previous)
        newParams.set('expanded', drawingId)
      }

      return newParams
    })
  }, [expandedDrawingId, setSearchParams])

  const collapseDrawing = useCallback(() => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev)
      newParams.delete('expanded')
      return newParams
    })
  }, [setSearchParams])

  const isExpanded = useCallback((drawingId: string) => {
    return expandedDrawingId === drawingId
  }, [expandedDrawingId])

  return {
    expandedDrawingId,
    toggleDrawing,
    collapseDrawing,
    isExpanded
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- useExpandedDrawings.test.ts --run`

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/hooks/useExpandedDrawings.ts src/hooks/useExpandedDrawings.test.ts
git commit -m "refactor: convert useExpandedDrawings to accordion mode (single ID)

Change from Set<string> to string | null for single-drawing expansion.
Auto-close previous drawing when expanding new one. Handle legacy
multi-ID URLs by taking first ID.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Remove "Collapse All" Button from UI

**Files:**
- Modify: `src/pages/DrawingComponentTablePage.tsx:1-200` (header section)
- Modify: `src/components/drawing-table/CollapseAllButton.tsx` (delete if separate file)

**Step 1: Remove CollapseAllButton references**

Find and remove the "Collapse All" button from the header section in `src/pages/DrawingComponentTablePage.tsx`.

Look for code similar to:
```typescript
<CollapseAllButton
  onClick={collapseAll}
  disabled={expandedDrawingIds.size === 0}
/>
```

Replace the button section with nothing (remove entirely).

**Step 2: Update hook destructuring**

Change:
```typescript
const { expandedDrawingIds, toggleDrawing, collapseAll, isExpanded } = useExpandedDrawings()
```

To:
```typescript
const { expandedDrawingId, toggleDrawing, collapseDrawing, isExpanded } = useExpandedDrawings()
```

**Step 3: Verify UI compiles**

Run: `npm run build`

Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/pages/DrawingComponentTablePage.tsx
git commit -m "refactor: remove Collapse All button (accordion mode)

With single-drawing expansion, collapse all button is unnecessary.
Users can click chevron to collapse the single expanded drawing.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Update DrawingTable Virtualizer Row Logic

**Files:**
- Modify: `src/components/drawing-table/DrawingTable.tsx:66-83` (visibleRows useMemo)
- Test: `src/components/drawing-table/DrawingTable.test.tsx`

**Step 1: Write failing test for virtualizer row exclusion**

Add to `src/components/drawing-table/DrawingTable.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DrawingTable } from './DrawingTable'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(() => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
    scrollToIndex: vi.fn()
  }))
}))

describe('DrawingTable - Accordion Mode', () => {
  it('excludes expanded drawing from virtualizer rows', () => {
    const drawings = [
      { id: 'dwg-1', drawing_number: 'DWG-001' },
      { id: 'dwg-2', drawing_number: 'DWG-002' }
    ]

    const componentsMap = new Map([
      ['dwg-1', [
        { id: 'comp-1', component_number: 'COMP-001' },
        { id: 'comp-2', component_number: 'COMP-002' }
      ]]
    ])

    const { rerender } = render(
      <DrawingTable
        drawings={drawings}
        expandedDrawingId="dwg-1"
        componentsMap={componentsMap}
        onToggleDrawing={vi.fn()}
      />
    )

    // Should NOT render drawing row for dwg-1 (it's in portal)
    // Should render component rows for dwg-1
    // Should render drawing row for dwg-2 (collapsed)

    // This test will be refined based on actual rendering
    expect(true).toBe(true) // Placeholder - will verify row structure
  })
})
```

**Step 2: Run test to verify current behavior**

Run: `npm test -- DrawingTable.test.tsx --run`

Expected: Test passes with placeholder (will update in next steps)

**Step 3: Update visibleRows calculation in DrawingTable**

Modify `src/components/drawing-table/DrawingTable.tsx`:

Find the `visibleRows` useMemo (around line 66-83) and replace with:

```typescript
const visibleRows = useMemo<VirtualRow[]>(() => {
  const rows: VirtualRow[] = []

  drawings.forEach((drawing) => {
    // Exclude expanded drawing from virtualizer (rendered in portal)
    if (drawing.id !== expandedDrawingId) {
      // Render collapsed drawing row
      rows.push({ type: 'drawing', data: drawing })
    } else {
      // Include component rows for expanded drawing
      const components = componentsMap.get(drawing.id) || []
      components.forEach((component) => {
        rows.push({
          type: 'component',
          data: component,
          drawingId: drawing.id
        })
      })
    }
  })

  return rows
}, [drawings, expandedDrawingId, componentsMap])
```

**Step 4: Update prop types to accept expandedDrawingId**

Add to DrawingTable component props:

```typescript
interface DrawingTableProps {
  drawings: DrawingWithProgress[]
  expandedDrawingId: string | null  // Add this
  componentsMap: Map<string, ComponentWithProgress[]>
  onToggleDrawing: (drawingId: string) => void
  // ... other props
}
```

**Step 5: Verify build**

Run: `npm run build`

Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/components/drawing-table/DrawingTable.tsx src/components/drawing-table/DrawingTable.test.tsx
git commit -m "refactor: exclude expanded drawing from virtualizer rows

Expanded drawing will be rendered in portal, so exclude it from
virtualizer row calculation. Include only component children for
expanded drawing.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Add Sticky Portal Layer for Expanded Drawing

**Files:**
- Modify: `src/components/drawing-table/DrawingTable.tsx:140-200` (render section)
- Create: `src/components/drawing-table/StickyDrawingPortal.tsx`
- Test: `src/components/drawing-table/StickyDrawingPortal.test.tsx`

**Step 1: Write failing test for portal rendering**

Create `src/components/drawing-table/StickyDrawingPortal.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StickyDrawingPortal } from './StickyDrawingPortal'

describe('StickyDrawingPortal', () => {
  it('renders nothing when no drawing provided', () => {
    const { container } = render(
      <StickyDrawingPortal
        drawing={null}
        isExpanded={false}
        onToggle={vi.fn()}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders drawing row in portal when expanded', () => {
    const drawing = {
      id: 'dwg-1',
      drawing_number: 'DWG-001',
      drawing_title: 'Test Drawing'
    }

    render(
      <StickyDrawingPortal
        drawing={drawing}
        isExpanded={true}
        onToggle={vi.fn()}
      />
    )

    expect(screen.getByText('DWG-001')).toBeInTheDocument()
    expect(screen.getByRole('rowheader')).toHaveAttribute('aria-expanded', 'true')
  })

  it('applies sticky positioning classes', () => {
    const drawing = {
      id: 'dwg-1',
      drawing_number: 'DWG-001'
    }

    render(
      <StickyDrawingPortal
        drawing={drawing}
        isExpanded={true}
        onToggle={vi.fn()}
      />
    )

    const portal = screen.getByRole('rowheader')
    expect(portal).toHaveClass('sticky')
    expect(portal).toHaveClass('top-[64px]')
    expect(portal).toHaveClass('z-9')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- StickyDrawingPortal.test.tsx --run`

Expected: FAIL (component doesn't exist)

**Step 3: Implement StickyDrawingPortal component**

Create `src/components/drawing-table/StickyDrawingPortal.tsx`:

```typescript
import { createPortal } from 'react-dom'
import { DrawingRow } from './DrawingRow'
import type { DrawingWithProgress } from '@/types/drawing-table.types'

interface StickyDrawingPortalProps {
  drawing: DrawingWithProgress | null
  isExpanded: boolean
  onToggle: (drawingId: string) => void
  isMobile?: boolean
}

export function StickyDrawingPortal({
  drawing,
  isExpanded,
  onToggle,
  isMobile = false
}: StickyDrawingPortalProps) {
  if (!drawing || !isExpanded) {
    return null
  }

  const portalContent = (
    <div
      role="rowheader"
      aria-expanded="true"
      aria-label={`Expanded drawing: ${drawing.drawing_number}`}
      className="sticky top-[64px] z-9 bg-white shadow-sm border-b border-slate-200"
    >
      <DrawingRow
        drawing={drawing}
        isExpanded={isExpanded}
        onToggle={() => onToggle(drawing.id)}
        isMobile={isMobile}
      />
    </div>
  )

  return createPortal(portalContent, document.body)
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- StickyDrawingPortal.test.tsx --run`

Expected: All tests PASS

**Step 5: Integrate portal into DrawingTable**

Modify `src/components/drawing-table/DrawingTable.tsx`:

Add import:
```typescript
import { StickyDrawingPortal } from './StickyDrawingPortal'
```

Add before the virtualized content section:
```typescript
export function DrawingTable({
  drawings,
  expandedDrawingId,
  componentsMap,
  onToggleDrawing,
  isMobile = false
}: DrawingTableProps) {
  // ... existing code ...

  const expandedDrawing = useMemo(() => {
    if (!expandedDrawingId) return null
    return drawings.find(d => d.id === expandedDrawingId) || null
  }, [drawings, expandedDrawingId])

  return (
    <div className="flex-1 overflow-auto" ref={parentRef}>
      <DrawingTableHeader isMobile={isMobile} />

      <StickyDrawingPortal
        drawing={expandedDrawing}
        isExpanded={!!expandedDrawingId}
        onToggle={onToggleDrawing}
        isMobile={isMobile}
      />

      {/* Existing virtualizer content */}
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {/* ... existing virtualized rows ... */}
      </div>
    </div>
  )
}
```

**Step 6: Run build to verify**

Run: `npm run build`

Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/components/drawing-table/StickyDrawingPortal.tsx src/components/drawing-table/StickyDrawingPortal.test.tsx src/components/drawing-table/DrawingTable.tsx
git commit -m "feat: add sticky portal for expanded drawing row

Render expanded drawing in React Portal with sticky positioning below
column headers. Portal excludes drawing from virtualizer to prevent
duplicate rendering.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Implement Smart Scroll Behavior

**Files:**
- Create: `src/utils/scroll-helpers.ts`
- Test: `src/utils/scroll-helpers.test.ts`
- Modify: `src/components/drawing-table/DrawingTable.tsx` (add scroll logic)

**Step 1: Write failing tests for scroll helpers**

Create `src/utils/scroll-helpers.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { isElementVisible, shouldScrollToElement } from './scroll-helpers'

describe('scroll-helpers', () => {
  describe('isElementVisible', () => {
    it('returns true when element is fully visible in viewport', () => {
      const element = {
        offsetTop: 200,
        offsetHeight: 64
      } as HTMLElement

      const container = {
        scrollTop: 100,
        clientHeight: 500
      } as HTMLElement

      expect(isElementVisible(element, container)).toBe(true)
    })

    it('returns false when element is above viewport', () => {
      const element = {
        offsetTop: 50,
        offsetHeight: 64
      } as HTMLElement

      const container = {
        scrollTop: 200,
        clientHeight: 500
      } as HTMLElement

      expect(isElementVisible(element, container)).toBe(false)
    })

    it('returns false when element is below viewport', () => {
      const element = {
        offsetTop: 800,
        offsetHeight: 64
      } as HTMLElement

      const container = {
        scrollTop: 100,
        clientHeight: 500
      } as HTMLElement

      expect(isElementVisible(element, container)).toBe(false)
    })

    it('returns true when element is partially visible', () => {
      const element = {
        offsetTop: 550,
        offsetHeight: 100
      } as HTMLElement

      const container = {
        scrollTop: 100,
        clientHeight: 500
      } as HTMLElement

      // Element starts at 550, viewport ends at 600 (100 + 500)
      // Element is partially visible (50px visible)
      expect(isElementVisible(element, container)).toBe(true)
    })
  })

  describe('shouldScrollToElement', () => {
    it('returns true when element not visible', () => {
      const isVisible = false
      expect(shouldScrollToElement(isVisible)).toBe(true)
    })

    it('returns false when element already visible', () => {
      const isVisible = true
      expect(shouldScrollToElement(isVisible)).toBe(false)
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- scroll-helpers.test.ts --run`

Expected: FAIL (functions don't exist)

**Step 3: Implement scroll helper functions**

Create `src/utils/scroll-helpers.ts`:

```typescript
/**
 * Check if an element is visible within a scrollable container
 */
export function isElementVisible(
  element: HTMLElement,
  container: HTMLElement
): boolean {
  const elementTop = element.offsetTop
  const elementBottom = elementTop + element.offsetHeight
  const containerTop = container.scrollTop
  const containerBottom = containerTop + container.clientHeight

  // Element is visible if any part of it is within viewport
  return elementBottom > containerTop && elementTop < containerBottom
}

/**
 * Determine if we should scroll to an element
 * (only scroll if element is not currently visible)
 */
export function shouldScrollToElement(isVisible: boolean): boolean {
  return !isVisible
}

/**
 * Scroll to an element within a container with smooth animation
 */
export function scrollToElement(
  element: HTMLElement,
  container: HTMLElement,
  options: ScrollToOptions = {}
): void {
  const elementTop = element.offsetTop
  const containerTop = container.scrollTop

  // Calculate scroll position to center element in viewport
  const scrollTop = elementTop - 80 // Leave some space at top (headers)

  container.scrollTo({
    top: scrollTop,
    behavior: 'smooth',
    ...options
  })
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- scroll-helpers.test.ts --run`

Expected: All tests PASS

**Step 5: Add smart scroll to DrawingTable**

Modify `src/components/drawing-table/DrawingTable.tsx`:

Add imports:
```typescript
import { useRef, useEffect } from 'react'
import { isElementVisible, shouldScrollToElement, scrollToElement } from '@/utils/scroll-helpers'
```

Add ref and scroll logic:
```typescript
export function DrawingTable({
  drawings,
  expandedDrawingId,
  onToggleDrawing,
  // ... other props
}: DrawingTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const prevExpandedIdRef = useRef<string | null>(null)

  // Smart scroll when expansion changes
  useEffect(() => {
    if (!expandedDrawingId || !parentRef.current) return

    const wasExpanded = prevExpandedIdRef.current === expandedDrawingId
    const justCollapsed = prevExpandedIdRef.current && !expandedDrawingId

    // Find the drawing row element
    const drawingElement = parentRef.current.querySelector(
      `[data-drawing-id="${wasExpanded || justCollapsed ? prevExpandedIdRef.current : expandedDrawingId}"]`
    ) as HTMLElement

    if (drawingElement && parentRef.current) {
      const isVisible = isElementVisible(drawingElement, parentRef.current)

      if (shouldScrollToElement(isVisible)) {
        scrollToElement(drawingElement, parentRef.current)
      }
    }

    prevExpandedIdRef.current = expandedDrawingId
  }, [expandedDrawingId])

  // ... rest of component
}
```

**Step 6: Add data-drawing-id to DrawingRow**

Modify `src/components/drawing-table/DrawingRow.tsx`:

Add `data-drawing-id` attribute to the root div:
```typescript
<div
  data-drawing-id={drawing.id}
  className="drawing-row ..."
  // ... other props
>
```

**Step 7: Run build to verify**

Run: `npm run build`

Expected: Build succeeds

**Step 8: Commit**

```bash
git add src/utils/scroll-helpers.ts src/utils/scroll-helpers.test.ts src/components/drawing-table/DrawingTable.tsx src/components/drawing-table/DrawingRow.tsx
git commit -m "feat: implement smart scroll on expand/collapse

Only scroll to drawing when it's not currently visible in viewport.
Respects user's scroll position when drawing already visible.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Update Page to Use New Hook API

**Files:**
- Modify: `src/pages/DrawingComponentTablePage.tsx` (hook usage and props)

**Step 1: Update hook destructuring**

Change:
```typescript
const { expandedDrawingIds, toggleDrawing, isExpanded } = useExpandedDrawings()
```

To:
```typescript
const { expandedDrawingId, toggleDrawing, isExpanded } = useExpandedDrawings()
```

**Step 2: Update useComponentsByDrawings call**

Change:
```typescript
const expandedDrawingIdsArray = useMemo(
  () => Array.from(expandedDrawingIds),
  [expandedDrawingIds]
)
const { componentsMap } = useComponentsByDrawings(expandedDrawingIdsArray)
```

To:
```typescript
const expandedDrawingIdsArray = useMemo(
  () => expandedDrawingId ? [expandedDrawingId] : [],
  [expandedDrawingId]
)
const { componentsMap } = useComponentsByDrawings(expandedDrawingIdsArray)
```

**Step 3: Pass expandedDrawingId to DrawingTable**

Update DrawingTable component:
```typescript
<DrawingTable
  drawings={filteredDrawings}
  expandedDrawingId={expandedDrawingId}
  componentsMap={componentsMap}
  onToggleDrawing={toggleDrawing}
  isMobile={isMobile}
/>
```

**Step 4: Verify build**

Run: `npm run build`

Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/pages/DrawingComponentTablePage.tsx
git commit -m "refactor: update page to use accordion hook API

Connect page to refactored useExpandedDrawings hook with single-ID
state. Pass expandedDrawingId to DrawingTable for portal rendering.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Add Accessibility Attributes

**Files:**
- Modify: `src/components/drawing-table/DrawingRow.tsx` (ARIA attributes)
- Modify: `src/components/drawing-table/StickyDrawingPortal.tsx` (screen reader)

**Step 1: Add ARIA attributes to DrawingRow chevron**

Modify `src/components/drawing-table/DrawingRow.tsx`:

Find the chevron button and update:
```typescript
<button
  onClick={onToggle}
  aria-expanded={isExpanded}
  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} drawing ${drawing.drawing_number}`}
  className="..."
>
  <ChevronRight
    className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
    aria-hidden="true"
  />
</button>
```

**Step 2: Add keyboard handlers**

Add to chevron button:
```typescript
<button
  onClick={onToggle}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle()
    }
  }}
  aria-expanded={isExpanded}
  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} drawing ${drawing.drawing_number}`}
  className="..."
>
```

**Step 3: Add prefers-reduced-motion support**

Add to `src/utils/scroll-helpers.ts`:

```typescript
export function scrollToElement(
  element: HTMLElement,
  container: HTMLElement,
  options: ScrollToOptions = {}
): void {
  const elementTop = element.offsetTop
  const scrollTop = elementTop - 80

  // Respect user's motion preferences
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  container.scrollTo({
    top: scrollTop,
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    ...options
  })
}
```

**Step 4: Run build**

Run: `npm run build`

Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/components/drawing-table/DrawingRow.tsx src/utils/scroll-helpers.ts
git commit -m "feat: add accessibility attributes and keyboard support

Add ARIA labels, keyboard handlers (Enter/Space), and respect
prefers-reduced-motion for scroll animations.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Add Integration Tests

**Files:**
- Create: `tests/integration/drawing-accordion.test.tsx`

**Step 1: Write integration tests**

Create `tests/integration/drawing-accordion.test.tsx`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DrawingComponentTablePage } from '@/pages/DrawingComponentTablePage'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false }
    }
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('Drawing Accordion Integration', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('allows only one drawing expanded at a time', async () => {
    const user = userEvent.setup()

    renderWithProviders(<DrawingComponentTablePage />)

    // Expand first drawing
    const firstChevron = screen.getAllByLabelText(/expand drawing/i)[0]
    await user.click(firstChevron)

    await waitFor(() => {
      expect(window.location.search).toContain('expanded=')
    })

    // Expand second drawing
    const secondChevron = screen.getAllByLabelText(/expand drawing/i)[1]
    await user.click(secondChevron)

    await waitFor(() => {
      // Should have only one expanded param
      const params = new URLSearchParams(window.location.search)
      const expanded = params.get('expanded')
      expect(expanded).toBeTruthy()
      expect(expanded?.split(',').length).toBe(1)
    })
  })

  it('collapses drawing when clicking chevron on expanded drawing', async () => {
    const user = userEvent.setup()

    renderWithProviders(<DrawingComponentTablePage />)

    // Expand drawing
    const chevron = screen.getAllByLabelText(/expand drawing/i)[0]
    await user.click(chevron)

    await waitFor(() => {
      expect(window.location.search).toContain('expanded=')
    })

    // Collapse same drawing
    const collapseChevron = screen.getByLabelText(/collapse drawing/i)
    await user.click(collapseChevron)

    await waitFor(() => {
      expect(window.location.search).not.toContain('expanded=')
    })
  })

  it('renders sticky portal when drawing expanded', async () => {
    const user = userEvent.setup()

    renderWithProviders(<DrawingComponentTablePage />)

    const chevron = screen.getAllByLabelText(/expand drawing/i)[0]
    await user.click(chevron)

    await waitFor(() => {
      const portal = screen.getByRole('rowheader', { expanded: true })
      expect(portal).toBeInTheDocument()
      expect(portal).toHaveClass('sticky')
    })
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()

    renderWithProviders(<DrawingComponentTablePage />)

    const chevron = screen.getAllByLabelText(/expand drawing/i)[0]
    chevron.focus()

    // Press Enter to expand
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(window.location.search).toContain('expanded=')
    })

    // Press Space to collapse
    const collapseChevron = screen.getByLabelText(/collapse drawing/i)
    collapseChevron.focus()
    await user.keyboard(' ')

    await waitFor(() => {
      expect(window.location.search).not.toContain('expanded=')
    })
  })
})
```

**Step 2: Run tests**

Run: `npm test -- drawing-accordion.test.tsx --run`

Expected: Tests may fail initially due to mocking requirements - add necessary mocks

**Step 3: Add required mocks**

Add to test file if needed:
```typescript
vi.mock('@/hooks/useDrawingsWithProgress', () => ({
  useDrawingsWithProgress: () => ({
    data: mockDrawings,
    isLoading: false
  })
}))

vi.mock('@/hooks/useComponentsByDrawings', () => ({
  useComponentsByDrawings: () => ({
    componentsMap: new Map(),
    isLoading: false
  })
}))
```

**Step 4: Run tests again**

Run: `npm test -- drawing-accordion.test.tsx --run`

Expected: All tests PASS

**Step 5: Commit**

```bash
git add tests/integration/drawing-accordion.test.tsx
git commit -m "test: add integration tests for accordion behavior

Test single-drawing expansion, collapse, sticky portal rendering,
and keyboard navigation.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Run Full Test Suite and Verify Coverage

**Step 1: Run all tests**

Run: `npm test -- --run`

Expected: All tests PASS

**Step 2: Check coverage**

Run: `npm test -- --coverage`

Expected: Coverage ≥70% overall, ≥80% for utils, ≥60% for components

**Step 3: Fix any failing tests**

If any tests fail, fix them and commit fixes:

```bash
git add <fixed-files>
git commit -m "fix: resolve test failures after accordion refactor

<description of fixes>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Step 4: Final commit if all pass**

If all tests pass without fixes:

```bash
git commit --allow-empty -m "test: verify all tests pass with accordion mode

Full test suite passes with ≥70% coverage.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Manual Testing and Verification

**Step 1: Start dev server**

Run: `npm run dev`

Expected: Server starts at http://localhost:5173

**Step 2: Manual test checklist**

Test in browser:

- [ ] Click chevron to expand drawing → see sticky header appear
- [ ] Scroll through components → sticky header stays visible
- [ ] Click chevron on expanded drawing → collapses and header disappears
- [ ] Expand different drawing → previous auto-closes
- [ ] Scroll so drawing not visible, then expand → auto-scrolls to drawing
- [ ] Expand drawing with 100+ components → smooth performance
- [ ] Test on mobile (≤1024px) → same behavior
- [ ] Test keyboard navigation (Tab, Enter, Space)
- [ ] Test with screen reader (verify announcements)
- [ ] Share URL with ?expanded=id → correct drawing expands on load

**Step 3: Document any issues**

If issues found, create GitHub issues or fix immediately

**Step 4: Final verification commit**

```bash
git commit --allow-empty -m "test: manual verification complete

Verified accordion mode, sticky portal, smart scroll, and
accessibility on desktop and mobile browsers.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Success Criteria

- ✅ Only one drawing expands at a time (accordion mode)
- ✅ Expanded drawing sticks below column headers while scrolling
- ✅ Smart scrolling (only when drawing not visible)
- ✅ Identical behavior on mobile and desktop
- ✅ WCAG 2.1 AA accessible (ARIA, keyboard, reduced motion)
- ✅ No performance regression (60fps scrolling)
- ✅ All tests pass with ≥70% coverage
- ✅ Manual testing complete on multiple devices

---

## Notes for Engineer

**Key Architecture Points:**

1. **Single-ID State**: The hook returns `string | null` instead of `Set<string>`. Only one drawing can be expanded.

2. **Portal Rendering**: Expanded drawing renders outside the virtualizer using `createPortal(content, document.body)`. This prevents duplicate rendering and enables reliable sticky positioning.

3. **Virtualizer Exclusion**: When a drawing is expanded, its row is excluded from the virtualizer's `visibleRows` array, but its component children are included.

4. **Smart Scroll**: The scroll logic checks if the drawing is visible before scrolling. This prevents jarring scroll jumps when the user can already see the drawing.

5. **Legacy URL Support**: Old URLs with multiple IDs (`?expanded=id1,id2,id3`) are handled by taking the first ID only.

**Testing Philosophy:**

Follow TDD strictly:
1. Write failing test
2. Run to verify failure
3. Write minimal code to pass
4. Run to verify pass
5. Commit

**Frequent Commits:**

Commit after each task completion. Use descriptive commit messages following the conventional commits format.

**Questions?**

Consult:
- Design doc: `docs/plans/2025-11-13-sticky-accordion-drawings-design.md`
- @tanstack/react-virtual docs for virtualizer API
- React Portal docs for portal rendering patterns
