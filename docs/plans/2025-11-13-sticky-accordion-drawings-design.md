# Sticky Accordion Drawings - Design Document

**Date**: 2025-11-13
**Author**: System Design
**Status**: Approved

## Problem Statement

Users cannot see drawing information while scrolling through a drawing's components. Multiple expanded drawings clutter the view. Users want to:

1. View drawing details while scrolling through components
2. Focus on one drawing at a time
3. Navigate between drawings without losing context

## Solution Overview

Transform the drawings table into an accordion with sticky headers. When a user expands a drawing, it sticks to the top of the viewport. The drawing remains visible while the user scrolls through components beneath it. Opening a different drawing closes the current one.

## Design Decisions

### 1. Accordion Mode (One Drawing at a Time)

**Current Behavior:**
- Up to 50 drawings can expand simultaneously
- URL stores multiple IDs: `?expanded=id1,id2,id3`
- "Collapse All" button closes all drawings

**New Behavior:**
- Only one drawing expands at a time
- Opening a new drawing closes the previous one
- URL stores single ID: `?expanded=drawingId`
- Remove "Collapse All" button (unnecessary)

**State Management:**
```typescript
// Before
type ExpandedState = Set<string>

// After
type ExpandedState = string | null
```

**Benefits:**
- Simpler mental model (one drawing = one context)
- Reduced memory usage (fewer component queries)
- Clearer URL sharing (one drawing per link)

### 2. Sticky Drawing Header

**Visual Hierarchy:**
```
┌────────────────────────────────────┐
│ Column Headers (sticky, z-10)     │ ← Always visible
├────────────────────────────────────┤
│ Expanded Drawing (sticky, z-9)    │ ← New sticky layer
├────────────────────────────────────┤
│ ↓ Scrollable Component Rows ↓     │
│   Component 1                      │
│   Component 2                      │
│   Component 3                      │
└────────────────────────────────────┘
```

**Implementation:**
- Render expanded drawing row in React Portal
- Position at `top-[64px]` (below column headers)
- Apply `z-9` to layer between headers and content
- Exclude from virtualizer (prevent duplicate rendering)

**Why Portal?**
- Clean separation from virtualizer logic
- Reliable CSS sticky positioning
- No interference with scroll calculations
- Single source of truth for drawing data

### 3. Smart Scroll Behavior

The system scrolls to a drawing only when necessary.

**Scenarios:**

| Action | Drawing Visible? | Result |
|--------|-----------------|--------|
| Expand new drawing | Yes | No scroll |
| Expand new drawing | No | Scroll to drawing |
| Collapse current | Yes | No scroll |
| Collapse current | No | Scroll to drawing |

**Scroll Calculation:**
```typescript
function isDrawingVisible(drawingId: string): boolean {
  const drawingOffset = calculateDrawingOffset(drawingId)
  const viewportTop = scrollOffset
  const viewportBottom = scrollOffset + viewportHeight

  return drawingOffset >= viewportTop &&
         drawingOffset <= viewportBottom
}
```

**Animation:**
- Use smooth scroll (`behavior: 'smooth'`)
- Respect `prefers-reduced-motion`
- Complete in ~300ms

### 4. Virtualizer Integration

**Current Row Generation:**
```typescript
// Include all drawings + expanded components
drawings.forEach(drawing => {
  rows.push({ type: 'drawing', data: drawing })
  if (isExpanded(drawing.id)) {
    components.forEach(c => rows.push({ type: 'component', data: c }))
  }
})
```

**New Row Generation:**
```typescript
// Exclude expanded drawing (rendered in portal)
drawings.forEach(drawing => {
  if (drawing.id !== expandedDrawingId) {
    rows.push({ type: 'drawing', data: drawing })
  } else {
    // Include component children at natural position
    components.forEach(c => rows.push({ type: 'component', data: c }))
  }
})
```

**Benefits:**
- Portal owns expanded drawing rendering
- Virtualizer handles component rows only
- No duplicate drawing rows
- Simpler height calculations

### 5. Component Data Fetching

**Current Strategy:**
```typescript
// Fetch components for all expanded drawings
const expandedIds = Array.from(expandedDrawingIds)
const { componentsMap } = useComponentsByDrawings(expandedIds)
```

**New Strategy:**
```typescript
// Fetch components for single expanded drawing
const expandedIds = expandedDrawingId ? [expandedDrawingId] : []
const { componentsMap } = useComponentsByDrawings(expandedIds)
```

**Performance Impact:**
- Fewer simultaneous queries (1 vs up to 50)
- Lower memory footprint
- Faster query execution
- TanStack Query caches recent drawings (5 min)

### 6. Accessibility

**ARIA Labels:**
- Portal: `role="rowheader"`, `aria-expanded="true"`
- Collapsed drawings: `aria-expanded="false"`
- Chevron: `aria-label="Expand drawing DWG-001"`

**Keyboard Navigation:**
- **Enter/Space**: Toggle expand/collapse on chevron
- **Tab**: Move to next focusable element
- **Escape**: Optional quick-collapse (convenience)

**Screen Reader Announcements:**
```typescript
// On expand
announce(`Expanded drawing ${number}. Showing ${count} components.`)

// On collapse
announce(`Collapsed drawing ${number}.`)
```

**Focus Management:**
- Keep focus on chevron during expand/collapse
- Do not steal focus during auto-scroll
- Ensure portal chevron is focusable

### 7. Mobile Behavior

Apply identical behavior on mobile (≤1024px):
- Accordion mode (one drawing expanded)
- Sticky drawing header
- Smart scroll logic
- Mobile-specific drawing row layout

**Why Consistent?**
- Simpler mental model across devices
- No device-specific edge cases
- Easier testing and maintenance

## Technical Architecture

### Files Modified

1. **src/hooks/useExpandedDrawings.ts**
   - Change return type from `Set<string>` to `string | null`
   - Update URL param handling (single value)
   - Remove `collapseAll()` function

2. **src/components/drawing-table/DrawingTable.tsx**
   - Add portal for sticky expanded drawing
   - Update virtualizer row logic
   - Add smart scroll helper functions

3. **src/components/drawing-table/DrawingRow.tsx**
   - Support portal rendering context
   - Update event handlers for accordion mode

4. **src/pages/DrawingComponentTablePage.tsx**
   - Remove "Collapse All" button
   - Update `useComponentsByDrawings` call

### New Test Files

5. **tests/integration/drawing-accordion.test.ts**
   - Complete expand/collapse workflows
   - Smart scroll scenarios
   - Keyboard navigation

### Updated Test Files

6. **src/hooks/useExpandedDrawings.test.ts**
   - Test accordion mode (single ID)
   - Test URL param handling

7. **src/components/drawing-table/DrawingTable.test.tsx**
   - Test portal rendering
   - Test virtualizer exclusion
   - Test sticky positioning

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Drawing deleted while expanded | Auto-collapse, clear URL param |
| Deep link to non-existent drawing | Ignore param, render normally |
| Drawing with 1000+ components | Virtualizer handles efficiently |
| User edits URL to multiple IDs | Take first ID, ignore rest |
| Window resize while expanded | Recalculate offsets, maintain state |
| Mobile orientation change | Recalculate heights, keep expansion |
| Portal container missing | Fallback to inline rendering |

## Performance Targets

- Expand 500-component drawing: <200ms
- Toggle between drawings: No visible flicker
- Scroll through 100 components: 60fps maintained
- Mobile touch response: <100ms

## Success Criteria

- ✅ Only one drawing expanded at a time
- ✅ Expanded drawing sticks below column headers
- ✅ Smart scrolling on expand/collapse
- ✅ Identical behavior on mobile and desktop
- ✅ WCAG 2.1 AA accessible
- ✅ No performance regression
- ✅ All tests pass with ≥70% coverage

## Migration Notes

**Breaking Changes:**
- URL param `?expanded=id1,id2,id3` becomes `?expanded=id1`
- Users with bookmarked multi-expand URLs see only first drawing

**Backward Compatibility:**
- Parse old URLs and extract first ID
- No data migration required (UI-only change)

## Future Enhancements

Consider these improvements after initial release:

1. **Keyboard shortcut**: `j/k` to expand next/previous drawing
2. **Expand animation**: Slide components in smoothly
3. **Persist preference**: Remember last expanded drawing per user
4. **Quick peek**: Hover to preview components without expanding

## References

- Original codebase: Feature 010 (Drawing-Centered Component Progress Table)
- Virtualization: @tanstack/react-virtual documentation
- Accessibility: WCAG 2.1 AA guidelines
