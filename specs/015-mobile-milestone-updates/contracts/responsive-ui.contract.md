# Contract Test: Responsive UI Behavior

**Feature**: 015-mobile-milestone-updates
**Component**: Responsive UI (viewport detection, touch targets)
**Purpose**: Verify mobile UI adaptations follow responsive design contracts

## Test Suite: responsive-ui.contract.test.ts

### C016: Viewport Detection - Mobile Phone (≤640px)
**Given**: Viewport width = 375px (iPhone SE)
**When**: useMobileDetection() hook called
**Then**:
- Returns isMobile = true
- Mobile UI components rendered (vertical stack, full-screen modals)
- Touch targets ≥44px

### C017: Viewport Detection - Large Phone (641-767px)
**Given**: Viewport width = 720px (Android phone landscape)
**When**: useMobileDetection() hook called
**Then**:
- Returns isMobile = true (tablet threshold is 1024px)
- Mobile UI components rendered
- Touch targets ≥44px

### C018: Viewport Detection - Tablet (768-1024px)
**Given**: Viewport width = 800px (iPad portrait)
**When**: useMobileDetection() hook called
**Then**:
- Returns isMobile = true (per clarification: tablets always mobile)
- Mobile UI components rendered (not desktop hover states)
- Full-screen modals used (not popovers)

### C019: Viewport Detection - Desktop (>1024px)
**Given**: Viewport width = 1440px (laptop)
**When**: useMobileDetection() hook called
**Then**:
- Returns isMobile = false
- Desktop UI components rendered (horizontal layout, popovers)
- Standard 32px click targets acceptable

### C020: Viewport Resize - Mobile to Desktop
**Given**: isMobile = true (viewport 800px)
**When**: Window resized to 1280px
**Then**:
- useMobileDetection() updates to isMobile = false
- UI re-renders with desktop layout
- Open full-screen modals closed gracefully

### C021: Viewport Resize - Desktop to Mobile
**Given**: isMobile = false (viewport 1280px)
**When**: Window resized to 640px
**Then**:
- useMobileDetection() updates to isMobile = true
- UI re-renders with mobile layout
- Horizontal filters re-stack vertically

### C022: Touch Target - Discrete Milestone Checkbox
**Given**: Mobile viewport (≤1024px)
**When**: MilestoneCheckbox rendered
**Then**:
- Button height ≥44px
- Button width ≥44px
- Checkbox itself can be smaller (visual), but hit area is 44px min
- CSS classes: `h-11 w-11` (44px) on mobile

### C023: Touch Target - Partial Milestone Trigger
**Given**: Mobile viewport (≤1024px)
**When**: PartialMilestoneTrigger rendered
**Then**:
- Button min-height ≥44px
- Full width button (touch area maximized)
- Tap opens full-screen modal (not inline popover)

### C024: Touch Target - Drawing Expansion Toggle
**Given**: Mobile viewport (≤1024px)
**When**: DrawingRow rendered with expansion button
**Then**:
- Expansion button ≥44px tap target
- Entire row is tappable (not just icon)
- Visual feedback on tap (active state)

### C025: Full-Screen Modal - Partial Milestone Editor (Mobile)
**Given**: Mobile viewport (≤1024px), user taps partial milestone
**When**: MobilePartialMilestoneEditor opens
**Then**:
- Radix Dialog component used (not Popover)
- Modal covers entire viewport (h-screen w-screen)
- Slider is large and draggable (h-12, w-4/5)
- Cancel and Save buttons have 44px+ height

### C026: Popover - Partial Milestone Editor (Desktop)
**Given**: Desktop viewport (>1024px), user clicks partial milestone
**When**: PartialMilestonePopover opens
**Then**:
- Radix Popover component used (not Dialog)
- Popover positioned relative to trigger (not full-screen)
- Slider is standard size (h-6)

### C027: Filter Stack - Mobile Layout
**Given**: Mobile viewport (≤1024px)
**When**: DrawingFilters rendered
**Then**:
- Filters stacked vertically (flex-col)
- Each filter full width
- Vertical gap-4 spacing
- No horizontal scrolling

### C028: Filter Stack - Desktop Layout
**Given**: Desktop viewport (>1024px)
**When**: DrawingFilters rendered
**Then**:
- Filters arranged horizontally (flex-row)
- Compact spacing (gap-2)
- Filters sized to content (not full width)

### C029: Navigation Sidebar - Mobile Hamburger
**Given**: Mobile viewport (≤1024px)
**When**: Layout component rendered
**Then**:
- Sidebar hidden by default
- Hamburger menu icon visible (44px+ tap target)
- Tap hamburger → sidebar slides in from left
- Sidebar covers main content (overlay)

### C030: Navigation Sidebar - Desktop Persistent
**Given**: Desktop viewport (>1024px)
**When**: Layout component rendered
**Then**:
- Sidebar visible by default
- No hamburger icon (not needed)
- Sidebar positioned beside content (not overlay)

### C031: Progress Bar - Mobile Simplified
**Given**: Mobile viewport (≤1024px)
**When**: DrawingRow progress bar rendered
**Then**:
- Shows "47%" (not "47% Complete")
- Progress bar visual simplified (no verbose labels)
- Bar height adequate for tap (min 44px total row height)

### C032: Progress Bar - Desktop Verbose
**Given**: Desktop viewport (>1024px)
**When**: DrawingRow progress bar rendered
**Then**:
- Shows "47% Complete" (full label)
- Additional metadata visible (component count, etc.)

### C033: Collapse All Button - Mobile Touch Target
**Given**: Mobile viewport (≤1024px)
**When**: CollapseAllButton rendered
**Then**:
- Button height ≥44px
- Button width ≥120px (adequate for "Collapse All" text + padding)
- Positioned accessibly (not overlapping content)

### C034: Search Input - Mobile Debounce
**Given**: Mobile viewport (≤1024px), user typing in search
**When**: User types "P-001" with 100ms between characters
**Then**:
- Search debounced to 500ms (not instant)
- Only 1 search query after typing stops
- Reduces lag on slower mobile devices

### C035: Search Input - Desktop Debounce
**Given**: Desktop viewport (>1024px), user typing in search
**When**: User types "P-001" with 100ms between characters
**Then**:
- Search debounced to 300ms (faster than mobile)
- Responsive search experience

## Test Data

### Viewport Sizes
```typescript
const VIEWPORTS = {
  mobileSmall: { width: 375, height: 667 },   // iPhone SE
  mobileLarge: { width: 414, height: 896 },   // iPhone 11 Pro Max
  tabletPortrait: { width: 768, height: 1024 }, // iPad portrait
  tabletLandscape: { width: 1024, height: 768 }, // iPad landscape
  desktop: { width: 1440, height: 900 }        // Laptop
}
```

### Component Prop Samples
```typescript
const sampleMilestone = {
  name: 'Install',
  value: 75,
  type: 'partial' as const
}

const sampleDrawing = {
  id: 'drawing-1',
  drawing_no: 'P-001',
  percent_complete: 47
}
```

## Mocking Strategy

### window.innerWidth Mock
```typescript
function mockViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width
  })

  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}
```

### matchMedia Mock
```typescript
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: query.includes('max-width: 1024px'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})
```

### Testing Library Helpers
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Render with viewport
function renderMobile(component: React.ReactElement) {
  mockViewport(375)
  return render(component)
}

function renderDesktop(component: React.ReactElement) {
  mockViewport(1440)
  return render(component)
}
```

## Touch Target Validation Helper

```typescript
function assertTouchTarget(element: HTMLElement, minSize = 44) {
  const rect = element.getBoundingClientRect()
  expect(rect.width).toBeGreaterThanOrEqual(minSize)
  expect(rect.height).toBeGreaterThanOrEqual(minSize)
}

// Usage in tests:
const checkbox = screen.getByRole('button', { name: /receive/i })
assertTouchTarget(checkbox)
```

## Coverage Requirements

- **Lines**: ≥60% (UI components, lower threshold acceptable)
- **Branches**: ≥60% (viewport conditionals)
- **Functions**: ≥70% (render paths)

## Success Criteria

✅ All 20 contract tests pass (C016-C035)
✅ Touch targets verified ≥44px on mobile
✅ Viewport transitions work correctly
✅ No layout shift or flicker during resize
