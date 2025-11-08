# Mobile Filter Collapse - Implementation Plan

**Date**: 2025-11-02
**Design**: docs/plans/2025-11-02-mobile-filter-collapse-redesign.md
**Status**: Ready for Implementation

## Overview

This plan implements collapsible filter controls on the mobile Drawing Component Table page. Users can toggle filters visibility to maximize table space, with their preference remembered via localStorage.

## Implementation Tasks

### Task 1: Add CSS Grid Transition Classes

**File**: `src/index.css`

Add the following CSS classes after the existing animation classes:

```css
/* Collapsible Grid Transition - Mobile Filter Controls */
.collapsible-grid {
  display: grid;
  transition: grid-template-rows 250ms ease-in-out;
}

.collapsible-grid[data-expanded="true"] {
  grid-template-rows: 1fr;
}

.collapsible-grid[data-expanded="false"] {
  grid-template-rows: 0fr;
}

.collapsible-content {
  overflow: hidden;
}

/* Chevron icon rotation transition */
.chevron-rotate {
  transition: transform 250ms ease-in-out;
}

.chevron-rotate[data-expanded="true"] {
  transform: rotate(180deg);
}
```

**Verification**: Run `npm run build` to ensure CSS compiles without errors.

---

### Task 2: Add Collapse State to MobileFilterStack Component

**File**: `src/components/drawing-table/MobileFilterStack.tsx`

**Step 2.1**: Add imports at the top of the file

```typescript
import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
```

**Step 2.2**: Add localStorage constant after imports

```typescript
const STORAGE_KEY = 'pipetrak-mobile-filters-expanded'
```

**Step 2.3**: Add state management inside the component function (before the return statement)

```typescript
// Collapse state with localStorage persistence
const [isExpanded, setIsExpanded] = useState<boolean>(() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored !== null ? JSON.parse(stored) : true // Default to expanded
  } catch {
    return true // Graceful degradation if localStorage fails
  }
})

// Sync state changes to localStorage
useEffect(() => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(isExpanded))
  } catch {
    // Graceful degradation if localStorage is blocked
    console.warn('Failed to persist filter collapse state to localStorage')
  }
}, [isExpanded])

// Toggle handler
const handleToggle = () => {
  setIsExpanded(prev => !prev)
}
```

**Verification**: Component should compile without TypeScript errors.

---

### Task 3: Add Toggle Button UI

**File**: `src/components/drawing-table/MobileFilterStack.tsx`

**Step 3.1**: Replace the entire return statement with the new structure

Find the current return statement (line 39-87) and replace with:

```typescript
return (
  <div className="flex flex-col gap-3">
    {/* Toggle Button */}
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      className="flex items-center gap-2 min-h-[44px] w-full justify-center"
      aria-expanded={isExpanded}
      aria-controls="mobile-filters-content"
      aria-label={isExpanded ? "Hide filter controls" : "Show filter controls"}
      id="mobile-filters-toggle"
    >
      <ChevronDown
        className={`h-4 w-4 chevron-rotate`}
        data-expanded={isExpanded}
        aria-hidden="true"
      />
      <span className="text-sm font-medium">
        {isExpanded ? 'Hide Filters' : 'Show Filters'}
      </span>
    </Button>

    {/* Collapsible Container */}
    <div
      className="collapsible-grid"
      data-expanded={isExpanded}
    >
      <div className="collapsible-content">
        <div className="flex flex-col gap-3">
          {/* Search input - full width */}
          <DrawingSearchInput
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Search by drawing number..."
          />

          {/* Status filter - full width */}
          <StatusFilterDropdown
            value={statusFilter}
            onChange={onStatusFilterChange}
          />

          {/* Action buttons row */}
          <div className="flex gap-2">
            <CollapseAllButton
              onClick={onCollapseAll}
              disabled={collapseAllDisabled}
            />

            <Button
              variant={selectionMode ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleSelectionMode}
              className="flex items-center gap-2 min-h-[44px] flex-1"
            >
              {selectionMode ? (
                <>
                  <CheckSquare className="h-4 w-4" />
                  <span className="text-sm">Exit Select</span>
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  <span className="text-sm">Select</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>

    {/* Showing count - always visible */}
    <div className="text-xs text-slate-600 text-center">
      Showing {showingCount} of {totalCount} drawings
    </div>
  </div>
)
```

**Key changes**:
- Toggle button at top with ChevronDown icon and dynamic text
- Filter controls wrapped in `.collapsible-grid` > `.collapsible-content` structure
- Count display at bottom (always visible)
- ARIA attributes for accessibility

**Verification**:
- Run `npm run type-check` to ensure TypeScript compiles
- Run `npm run lint` to check for linting issues

---

### Task 4: Write Unit Tests

**File**: `src/components/drawing-table/MobileFilterStack.test.tsx` (new file)

Create comprehensive unit tests:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MobileFilterStack } from './MobileFilterStack'
import type { StatusFilter } from '@/types/drawing-table.types'

describe('MobileFilterStack', () => {
  const defaultProps = {
    searchTerm: '',
    onSearchChange: vi.fn(),
    statusFilter: 'all' as StatusFilter,
    onStatusFilterChange: vi.fn(),
    onCollapseAll: vi.fn(),
    collapseAllDisabled: false,
    selectionMode: false,
    onToggleSelectionMode: vi.fn(),
    showingCount: 15,
    totalCount: 15,
  }

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Collapse/Expand Functionality', () => {
    it('renders expanded by default on first visit', () => {
      render(<MobileFilterStack {...defaultProps} />)

      const toggleButton = screen.getByRole('button', { name: /hide filter controls/i })
      expect(toggleButton).toBeInTheDocument()
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('renders collapsed when toggled', () => {
      render(<MobileFilterStack {...defaultProps} />)

      const toggleButton = screen.getByRole('button', { name: /hide filter controls/i })
      fireEvent.click(toggleButton)

      expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
      expect(toggleButton).toHaveAccessibleName('Show filter controls')
    })

    it('shows "Hide Filters" text when expanded', () => {
      render(<MobileFilterStack {...defaultProps} />)

      expect(screen.getByText('Hide Filters')).toBeInTheDocument()
    })

    it('shows "Show Filters" text when collapsed', () => {
      render(<MobileFilterStack {...defaultProps} />)

      const toggleButton = screen.getByRole('button', { name: /hide filter controls/i })
      fireEvent.click(toggleButton)

      expect(screen.getByText('Show Filters')).toBeInTheDocument()
    })
  })

  describe('localStorage Persistence', () => {
    it('saves expanded state to localStorage when toggled', () => {
      render(<MobileFilterStack {...defaultProps} />)

      const toggleButton = screen.getByRole('button', { name: /hide filter controls/i })
      fireEvent.click(toggleButton) // Collapse

      expect(localStorage.getItem('pipetrak-mobile-filters-expanded')).toBe('false')
    })

    it('restores expanded state from localStorage on mount', () => {
      localStorage.setItem('pipetrak-mobile-filters-expanded', 'false')

      render(<MobileFilterStack {...defaultProps} />)

      const toggleButton = screen.getByRole('button', { name: /show filter controls/i })
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('handles localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      render(<MobileFilterStack {...defaultProps} />)

      const toggleButton = screen.getByRole('button', { name: /hide filter controls/i })

      // Should not throw error
      expect(() => fireEvent.click(toggleButton)).not.toThrow()

      setItemSpy.mockRestore()
    })

    it('defaults to expanded if localStorage read fails', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })

      render(<MobileFilterStack {...defaultProps} />)

      const toggleButton = screen.getByRole('button', { name: /hide filter controls/i })
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true')

      getItemSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('has correct ARIA attributes when expanded', () => {
      render(<MobileFilterStack {...defaultProps} />)

      const toggleButton = screen.getByRole('button', { name: /hide filter controls/i })
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
      expect(toggleButton).toHaveAttribute('aria-controls', 'mobile-filters-content')
      expect(toggleButton).toHaveAttribute('id', 'mobile-filters-toggle')
    })

    it('has correct ARIA attributes when collapsed', () => {
      render(<MobileFilterStack {...defaultProps} />)

      const toggleButton = screen.getByRole('button', { name: /hide filter controls/i })
      fireEvent.click(toggleButton)

      expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
      expect(toggleButton).toHaveAccessibleName('Show filter controls')
    })

    it('toggle button meets minimum touch target size', () => {
      render(<MobileFilterStack {...defaultProps} />)

      const toggleButton = screen.getByRole('button', { name: /hide filter controls/i })
      expect(toggleButton).toHaveClass('min-h-[44px]')
    })
  })

  describe('Filter Controls Visibility', () => {
    it('renders all filter controls when expanded', () => {
      render(<MobileFilterStack {...defaultProps} />)

      expect(screen.getByPlaceholderText('Search by drawing number...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /collapse all drawings/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /select/i })).toBeInTheDocument()
    })

    it('always shows drawing count regardless of collapse state', () => {
      render(<MobileFilterStack {...defaultProps} />)

      expect(screen.getByText('Showing 15 of 15 drawings')).toBeInTheDocument()

      const toggleButton = screen.getByRole('button', { name: /hide filter controls/i })
      fireEvent.click(toggleButton) // Collapse

      expect(screen.getByText('Showing 15 of 15 drawings')).toBeInTheDocument()
    })
  })

  describe('Existing Functionality Preserved', () => {
    it('calls onSearchChange when search input changes', () => {
      render(<MobileFilterStack {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('Search by drawing number...')
      fireEvent.change(searchInput, { target: { value: 'DRAIN-1' } })

      expect(defaultProps.onSearchChange).toHaveBeenCalledWith('DRAIN-1')
    })

    it('calls onCollapseAll when Collapse All button clicked', () => {
      render(<MobileFilterStack {...defaultProps} />)

      const collapseButton = screen.getByRole('button', { name: /collapse all drawings/i })
      fireEvent.click(collapseButton)

      expect(defaultProps.onCollapseAll).toHaveBeenCalled()
    })

    it('calls onToggleSelectionMode when Select button clicked', () => {
      render(<MobileFilterStack {...defaultProps} />)

      const selectButton = screen.getByRole('button', { name: /select/i })
      fireEvent.click(selectButton)

      expect(defaultProps.onToggleSelectionMode).toHaveBeenCalled()
    })
  })
})
```

**Verification**: Run `npm test src/components/drawing-table/MobileFilterStack.test.tsx`

---

### Task 5: Manual Testing

**Step 5.1**: Start development server
```bash
npm run dev
```

**Step 5.2**: Test on mobile viewport (Chrome DevTools)
- Open http://localhost:5173
- Login and navigate to Component Progress page
- Toggle DevTools mobile view (iPhone SE or similar, ≤1024px width)

**Step 5.3**: Verify functionality
- [ ] Toggle button shows "Hide Filters" on first visit
- [ ] Clicking toggle collapses filters smoothly (250ms animation)
- [ ] Toggle button changes to "Show Filters" when collapsed
- [ ] Chevron icon rotates 180 degrees
- [ ] Drawing count remains visible when collapsed
- [ ] Clicking toggle again expands filters smoothly
- [ ] All filter controls work when expanded
- [ ] Reload page - state persists (collapsed stays collapsed)

**Step 5.4**: Test edge cases
- [ ] Open DevTools Application > Local Storage
- [ ] Verify `pipetrak-mobile-filters-expanded` key exists with boolean value
- [ ] Clear localStorage and reload - defaults to expanded
- [ ] Toggle state multiple times - no console errors

**Step 5.5**: Test accessibility
- [ ] Navigate with keyboard (Tab to toggle button, Enter to activate)
- [ ] Use screen reader to verify ARIA announcements
- [ ] Check contrast ratio on toggle button (should meet WCAG AA)

---

### Task 6: Integration Testing

**Step 6.1**: Verify desktop view unaffected
- Resize browser to >1024px width
- Confirm desktop filter layout still shows (no mobile stack)
- No toggle button visible on desktop

**Step 6.2**: Test with different filter states
- [ ] Apply search term, collapse filters - count updates correctly
- [ ] Apply status filter, collapse - filters still active
- [ ] Expand filters, clear search - UI reflects change
- [ ] Enter selection mode, collapse - works correctly

**Step 6.3**: Test responsiveness
- [ ] Test at exact 1024px breakpoint
- [ ] Test at 768px (tablet)
- [ ] Test at 375px (mobile)
- [ ] No horizontal scroll at any viewport

---

## Rollout Plan

### Pre-Deployment Checklist
- [ ] All unit tests passing (`npm test`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual testing completed (all steps in Task 5)
- [ ] Desktop view verified unaffected
- [ ] Mobile accessibility verified

### Deployment Steps
1. Commit changes with descriptive message
2. Push to feature branch
3. Create PR with design doc linked
4. Request code review
5. Merge to main after approval
6. Monitor for user feedback

### Rollback Plan
If issues arise:
1. Revert PR merge commit
2. Redeploy previous version
3. Document issue in GitHub
4. Fix in separate branch

---

## Success Criteria

**Functional**:
✓ Filters collapse/expand with smooth 250ms animation
✓ State persists across page reloads via localStorage
✓ Toggle button accessible with keyboard and screen reader
✓ All existing filter functionality works when expanded
✓ Drawing count always visible
✓ Desktop view unaffected (>1024px)

**Technical**:
✓ No TypeScript errors
✓ No console warnings or errors
✓ Unit test coverage ≥70%
✓ Build size increase <2KB
✓ No new dependencies added

**User Experience**:
✓ Animation feels smooth on mobile devices
✓ Toggle button clearly indicates current state
✓ Collapsed view maximizes table visibility
✓ Expanded view provides full filter access

---

## Implementation Notes

- **Estimated Time**: 2-3 hours (including testing)
- **Complexity**: Low-Medium (straightforward CSS + React state)
- **Risk**: Low (no breaking changes, pure enhancement)
- **Dependencies**: None (uses existing stack)

## Questions or Issues?

If you encounter issues during implementation:
1. Check design doc for context: `docs/plans/2025-11-02-mobile-filter-collapse-redesign.md`
2. Reference CSS Grid transition MDN docs if animation issues
3. Test in Chrome DevTools mobile view for accurate mobile simulation
4. Check localStorage browser support (99%+ but may be blocked by privacy settings)
