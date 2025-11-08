# Collapsible Mobile Filter Controls Design

**Date**: 2025-10-29
**Feature**: Mobile UX Enhancement - Drawings Page
**Status**: Design Approved

## Problem Statement

The mobile Drawings page filter controls (search input, status filter, collapse all, select mode button) consume 200-250px of vertical space, reducing available table area on small screens. Users need quick access to table content while retaining full control functionality.

## Requirements

### Functional Requirements
- FR1: Collapsible header bar to show/hide filter controls
- FR2: Persist user's collapsed/expanded preference across sessions
- FR3: Display active filter count when collapsed
- FR4: Smooth slide + fade animation (~300ms)
- FR5: Tap anywhere on header bar to toggle state

### Non-Functional Requirements
- NFR1: Mobile-only feature (≤1024px breakpoint)
- NFR2: Minimum 44px touch targets (WCAG 2.1 AA)
- NFR3: Respect `prefers-reduced-motion` accessibility setting
- NFR4: Zero impact to desktop layout
- NFR5: No breaking changes to existing components

## Design Decisions

### Architecture: Wrapper Component Pattern

**Choice**: Create new `CollapsibleFilterBar` wrapper component
**Rationale**: Clean separation of concerns, zero refactoring of `MobileFilterStack`, single-responsibility principle

**Alternatives considered**:
- Enhance MobileFilterStack in-place → Rejected (increases component complexity)
- Radix UI Collapsible primitive → Rejected (unnecessary abstraction for simple use case)

### Default State: Remember User Preference

**Choice**: Persist collapsed/expanded state in localStorage
**Rationale**: Respects user's workflow preference, reduces repeated interaction

**localStorage key**: `pipetrak_mobile_filters_expanded`
**Default fallback**: Expanded (true) if no stored value

### Collapsed View: Active Filter Count

**Choice**: Display filter count summary ("2 filters active" or "No filters")
**Rationale**: Provides context about current filtering without taking space

**Filter count includes**:
- Search term presence (binary: has text or not)
- Status filter selection (active if not "all")

**Excludes**:
- Selection mode state (has its own visual indicator)
- Collapse all state (not a filter)

### Interaction Pattern: Tap-to-Expand Header

**Choice**: Entire collapsed header is tappable button
**Rationale**: Maximizes touch target area, common mobile pattern, single-tap simplicity

**Visual affordances**:
- ChevronDown icon (rotates 180° when expanded)
- Active state: `bg-slate-50` on touch
- Minimum height: 56px (exceeds 44px requirement)

### Animation: Smooth Slide + Fade

**Choice**: CSS transitions with max-height + opacity
**Rationale**: Hardware-accelerated, no JS animation loop, performant on mobile

**Timing**: 300ms duration, ease-in-out curve
**Accessibility**: Instant transitions when `prefers-reduced-motion: reduce` detected

## Component Structure

### Component Hierarchy
```
CollapsibleFilterBar (new)
├── CollapsedHeader (internal component)
│   ├── Filter summary text
│   ├── Drawing count text
│   └── ChevronDown icon
└── Expandable content wrapper
    └── MobileFilterStack (existing, unchanged)
```

### Props Interface
```typescript
interface CollapsibleFilterBarProps {
  // Pass-through props for MobileFilterStack
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (value: StatusFilter) => void
  onCollapseAll: () => void
  collapseAllDisabled: boolean
  selectionMode: boolean
  onToggleSelectionMode: () => void
  showingCount: number
  totalCount: number

  // Optional override for initial state
  defaultExpanded?: boolean
}
```

## State Management

### Collapse State Hook
```typescript
const STORAGE_KEY = 'pipetrak_mobile_filters_expanded'

const [isExpanded, setIsExpanded] = useState<boolean>(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored !== null ? stored === 'true' : (defaultExpanded ?? true)
})

useEffect(() => {
  localStorage.setItem(STORAGE_KEY, String(isExpanded))
}, [isExpanded])
```

### Filter Count Calculation
```typescript
const activeFilterCount = useMemo(() => {
  let count = 0
  if (searchTerm.trim() !== '') count++
  if (statusFilter !== 'all') count++
  return count
}, [searchTerm, statusFilter])

const filterSummary = activeFilterCount === 0
  ? 'No filters'
  : `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`
```

## UI Implementation

### Collapsed Header
```typescript
<button
  onClick={() => setIsExpanded(true)}
  className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg shadow-sm active:bg-slate-50 min-h-[56px]"
  aria-expanded="false"
  aria-label="Expand filters and controls"
>
  <div className="flex flex-col items-start gap-1">
    <span className="text-sm font-medium text-slate-900">
      {filterSummary}
    </span>
    <span className="text-xs text-slate-600">
      Showing {showingCount} of {totalCount} drawings
    </span>
  </div>

  <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
</button>
```

### Expanded Content with Animation
```typescript
<div
  className={cn(
    "overflow-hidden transition-all duration-300 ease-in-out",
    isExpanded
      ? "max-h-[500px] opacity-100"
      : "max-h-0 opacity-0",
    prefersReducedMotion && "transition-none"
  )}
  aria-hidden={!isExpanded}
>
  <div className="p-4 pt-3">
    <MobileFilterStack {...allProps} />
  </div>
</div>
```

### Chevron Icon Rotation
```typescript
<ChevronDown
  className={cn(
    "h-5 w-5 text-slate-400 flex-shrink-0 transition-transform duration-300",
    isExpanded && "rotate-180",
    prefersReducedMotion && "transition-none"
  )}
/>
```

## Accessibility

### Keyboard Navigation
- **Enter/Space**: Toggle collapsed header button
- **Tab**: Navigate through expanded filter controls normally

### Screen Reader Support
- `aria-expanded="true|false"` on header button
- `aria-hidden="true"` on collapsed content wrapper
- Descriptive `aria-label` on header button

### Motion Preferences
```typescript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches
```
- If true: Apply `transition-none` class to all animated elements
- Provides instant state changes for users with motion sensitivity

## Page Integration

### DrawingComponentTablePage Changes
```typescript
// Before (line 235)
{isMobile ? (
  <MobileFilterStack {...props} />
) : (
  // Desktop layout
)}

// After
{isMobile ? (
  <CollapsibleFilterBar {...props} />
) : (
  // Desktop layout (unchanged)
)}
```

**Impact**: Drop-in replacement, zero breaking changes, mobile-only feature flag

## Testing Strategy

### Unit Tests
- `CollapsibleFilterBar.test.tsx`
  - [ ] Renders collapsed by default (if no localStorage)
  - [ ] Reads initial state from localStorage
  - [ ] Persists state changes to localStorage
  - [ ] Calculates filter count correctly (0, 1, 2 filters)
  - [ ] Toggles on header click
  - [ ] Respects prefers-reduced-motion
  - [ ] ARIA attributes update correctly

### Integration Tests
- `DrawingComponentTablePage.test.tsx`
  - [ ] Shows CollapsibleFilterBar on mobile breakpoint
  - [ ] Shows original layout on desktop breakpoint
  - [ ] Filter changes work in both collapsed/expanded states
  - [ ] Selection mode button accessible when expanded

### Accessibility Tests
- [ ] Keyboard navigation with Enter/Space
- [ ] Screen reader announces state changes
- [ ] Touch target meets 44px minimum
- [ ] No animation when prefers-reduced-motion active

### Visual Regression
- [ ] Collapsed state renders correctly
- [ ] Expanded state renders correctly
- [ ] Smooth animation (manual verification)
- [ ] No layout shift during transition

## Performance Considerations

- **useMemo**: Filter count only recalculates when dependencies change
- **CSS transitions**: Hardware-accelerated (GPU), no JS animation loop
- **Conditional rendering**: Screen reader attributes only when needed
- **localStorage**: Synchronous read on mount, async write on change (non-blocking)

## Migration Path

### Phase 1: Component Creation
1. Create `CollapsibleFilterBar.tsx`
2. Add unit tests
3. Verify in Storybook/isolated environment

### Phase 2: Page Integration
1. Update `DrawingComponentTablePage.tsx` to use new component
2. Add integration tests
3. Manual QA on mobile devices

### Phase 3: Validation
1. Accessibility audit (keyboard, screen reader)
2. Performance testing (animation frame rate)
3. Cross-browser verification (Safari, Chrome mobile)

## Success Metrics

- **Space savings**: Collapsed state should free 150-200px vertical space
- **Performance**: Animation maintains 60fps on mid-range mobile devices
- **Accessibility**: Passes WCAG 2.1 AA audit
- **User preference**: localStorage persistence works across sessions
- **Zero regressions**: Desktop layout completely unaffected

## Future Enhancements (Out of Scope)

- Auto-collapse on scroll down, expand on scroll up
- Swipe gestures for collapse/expand
- Animate filter count changes
- Remember per-page collapse state (if multiple pages adopt pattern)
