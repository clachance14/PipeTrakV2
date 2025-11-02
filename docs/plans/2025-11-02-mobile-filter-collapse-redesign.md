# Mobile Filter Collapse - Redesign

**Date**: 2025-11-02
**Feature**: Mobile UX Enhancement - Drawing Component Table Page
**Status**: Design Approved
**Supersedes**: 2025-10-29-collapsible-mobile-filters-design.md (not implemented)

## Problem Statement

On mobile devices (≤1024px), the filter controls in the Drawing Component Table page consume significant vertical space, reducing the available area for the table. Users need to maximize table visibility while still having access to search and filter functionality when needed.

## Requirements Summary

**User Requirements:**
- Hide all filter controls when collapsed (search, status filter, action buttons)
- Show only a toggle button and the drawing count when collapsed
- Remember user's preference (collapsed/expanded) across sessions
- Smooth animation when expanding/collapsing (250ms)
- Toggle via a clear button with icon and text

**Technical Requirements:**
- Mobile-only feature (≤1024px breakpoint)
- Minimum 44px touch targets (WCAG 2.1 AA)
- No new dependencies (use CSS Grid transition)
- Modify existing `MobileFilterStack` component
- Accessibility: ARIA attributes, keyboard support

## Design Decisions

### 1. Architecture: Direct Component Enhancement

**Decision**: Modify `MobileFilterStack` component directly to add collapse/expand functionality.

**Rationale**:
- Simpler than wrapper pattern
- Single component to maintain
- All filter state already lives in parent (DrawingComponentTablePage)
- No prop drilling or additional abstractions

**Rejected Alternative**: Wrapper component pattern (from Oct 29 design)
- Adds unnecessary abstraction layer
- More components to maintain
- Prop drilling required

### 2. Collapsed State: Hide Everything Except Count

**Decision**: When collapsed, show only the toggle button and drawing count. Hide all filter controls.

**Rationale**:
- Maximizes table space (primary user goal)
- Cleaner, less cluttered UI
- Count provides sufficient context

**Rejected Alternative**: Show filter count summary
- Takes up more space
- Users can expand to see filters if needed

### 3. Animation: CSS Grid Transition

**Decision**: Use CSS `grid-template-rows` transition (`0fr` ↔ `1fr`) for smooth height animation.

**Rationale**:
- Modern, performant approach
- No need to calculate or guess max-height
- Browser handles height calculation automatically
- No new dependencies

**Rejected Alternatives**:
- Radix UI Collapsible (~3KB): Unnecessary for simple use case
- max-height transition: Requires guessing maximum height, can cause timing issues

### 4. State Persistence: localStorage

**Decision**: Store collapsed/expanded state in localStorage with key `pipetrak-mobile-filters-expanded`.

**Rationale**:
- Respects user's workflow preference
- Reduces repeated interactions
- No backend/database needed for UI preference

**Default**: Expanded (`true`) on first visit, then remember user's last choice.

### 5. Toggle Mechanism: Dedicated Button

**Decision**: Dedicated button with icon and text ("Show Filters" / "Hide Filters") with rotating chevron icon.

**Rationale**:
- Clear, explicit action
- Consistent with existing button patterns
- Better accessibility than tappable header

**Icon behavior**: ChevronDown when collapsed, ChevronUp when expanded (180° rotation).

## Component Structure

### Enhanced MobileFilterStack

```
MobileFilterStack
├── Toggle Button (always visible)
│   ├── ChevronDown/Up icon (rotates 180°)
│   └── Text: "Show Filters" / "Hide Filters"
├── Collapsible Container (CSS grid transition)
│   └── Inner wrapper (overflow: hidden)
│       ├── Search Input
│       ├── Status Filter Dropdown
│       └── Action Buttons Row (Collapse All + Select)
└── Count Display (always visible)
```

### State Management

**New state**:
```typescript
const [isExpanded, setIsExpanded] = useState<boolean>(() => {
  try {
    const stored = localStorage.getItem('pipetrak-mobile-filters-expanded')
    return stored !== null ? JSON.parse(stored) : true
  } catch {
    return true // Default to expanded if localStorage fails
  }
})
```

**Sync to localStorage**:
```typescript
useEffect(() => {
  try {
    localStorage.setItem('pipetrak-mobile-filters-expanded', JSON.stringify(isExpanded))
  } catch {
    // Graceful degradation if localStorage is blocked
  }
}, [isExpanded])
```

**No new props needed** - all filter state already managed by parent component.

## Visual Design

### Toggle Button

- **Variant**: `outline` (matches existing buttons)
- **Size**: `sm` with `min-h-[44px]` (WCAG compliance)
- **Layout**: Full width on mobile
- **Icon position**: Left side
- **Text**: Right side
- **States**:
  - Collapsed: `[ChevronDown icon] Show Filters`
  - Expanded: `[ChevronUp icon] Hide Filters`

### Animation

**Transition properties**:
- Duration: `250ms` (responsive feel on mobile)
- Easing: `ease-in-out` (smooth acceleration/deceleration)
- Properties:
  - `grid-template-rows`: `0fr` (collapsed) ↔ `1fr` (expanded)
  - Icon `transform`: `rotate(0deg)` ↔ `rotate(180deg)`

**CSS Grid technique**:
```css
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
```

### Spacing

- Toggle button bottom margin: `12px` (0.75rem)
- Collapsible container gap: Existing `12px` between elements preserved
- Count display top margin: `12px`

## Accessibility

### ARIA Attributes

**Toggle button**:
```tsx
<button
  aria-expanded={isExpanded}
  aria-controls="mobile-filters-content"
  aria-label={isExpanded ? "Hide filter controls" : "Show filter controls"}
>
```

**Collapsible region**:
```tsx
<div
  id="mobile-filters-content"
  role="region"
  aria-labelledby="mobile-filters-toggle"
>
```

### Keyboard Support

- Button is naturally focusable
- Enter/Space activates toggle
- All filter controls remain keyboard-accessible when expanded

### Screen Reader Experience

- Button announces current state: "Show Filters button, collapsed" or "Hide Filters button, expanded"
- State changes are announced when toggled

## Implementation Files

### Modified Files
- `src/components/drawing-table/MobileFilterStack.tsx` - Add collapse/expand logic
- `src/index.css` - Add CSS grid transition classes

### New CSS Classes
- `.collapsible-grid` - Grid container with transition
- `.collapsible-grid[data-expanded="true|false"]` - State-based grid rows
- `.collapsible-content` - Inner wrapper with overflow hidden
- `.chevron-icon` - Icon rotation transition

### Testing Requirements

**Unit Tests** (`MobileFilterStack.test.tsx`):
- ✓ Renders collapsed state with toggle button and count
- ✓ Renders expanded state with all controls
- ✓ Toggle button switches state
- ✓ localStorage read on mount
- ✓ localStorage write on state change
- ✓ Graceful degradation if localStorage fails
- ✓ ARIA attributes correct for both states

**Visual Regression Tests**:
- ✓ Collapsed appearance
- ✓ Expanded appearance
- ✓ Toggle button states

**Mobile E2E Tests**:
- ✓ Animation smoothness (250ms transition)
- ✓ State persists across page reloads
- ✓ Filters still functional when expanded

## Success Metrics

**User Experience**:
- Increased table visibility on mobile (200-250px vertical space recovered when collapsed)
- Reduced interaction friction (state remembered across sessions)
- Smooth, polished animation

**Technical**:
- Zero breaking changes to existing functionality
- No new dependencies
- Passes accessibility audit (WCAG 2.1 AA)
- Unit test coverage ≥70%

## Migration Notes

- This is a pure enhancement - no existing functionality is removed
- Desktop users (>1024px) see no changes
- First-time mobile users see expanded state by default
- No database migrations required (localStorage only)

## Future Enhancements

**Not in scope for this iteration**:
- Filter count badge on toggle button
- Swipe gestures to collapse/expand
- Animation preferences tied to user account
- Different collapse behavior for different pages

These can be considered based on user feedback after initial release.
