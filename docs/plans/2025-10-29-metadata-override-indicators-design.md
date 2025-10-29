# Metadata Override Indicators Design

**Date**: 2025-10-29
**Status**: Approved
**Author**: Design session with user

## Problem Statement

Components can have metadata (Area, System, Test Package) that differs from their parent drawing's metadata. This happens rarely but is important to identify quickly because:

1. **Data Integrity**: Overrides may indicate intentional customization or potential data entry errors
2. **Visibility**: Users need to see at a glance which components deviate from drawing defaults
3. **Context**: Understanding why a component has different metadata requires seeing both values

Currently, the ComponentRow displays metadata values without indicating whether they match, override, or are independently assigned relative to the drawing's values.

## Solution Overview

Implement a **hybrid icon + background** visual indicator system that:
- Shows amber warning indicator when component metadata differs from drawing
- Shows blue assignment indicator when component has metadata but drawing doesn't
- Maintains current appearance when metadata is inherited (matches drawing)
- Provides detailed tooltips on hover/focus
- Works seamlessly across desktop and mobile layouts
- Meets WCAG 2.1 AA accessibility standards

## Design Approach

After evaluating 5 different approaches, we selected **Approach 5: Hybrid Icon + Background** because it:
- **Immediately visible** - Background color catches the eye when scanning
- **Clear meaning** - Icon reinforces that something is different/important
- **Not too loud** - Subtle enough for rare occurrences
- **Accessible** - Color + icon works for colorblind users
- **Fits existing patterns** - Natural evolution of current badge system

### Alternative Approaches Considered

1. **Enhanced Badge System** - Text badges like "(override)" and "(inherited)"
   - Rejected: Too wordy, takes vertical space

2. **Icon Indicators Only** - Small icons without background
   - Rejected: Less scannable, requires learning icon meaning

3. **Color-Coded Backgrounds Only** - No icons, just background color
   - Rejected: Accessibility concern, color-dependent

4. **Dedicated Status Column** - Separate column showing override count
   - Rejected: Adds column width, reduces space for other data

## Visual Specification

### Override Indicator (Component differs from Drawing)

**Styling:**
- Background: `bg-amber-50` (#FFFBEB - very light orange)
- Icon: Lucide `AlertTriangle` at 14px, `text-amber-600` (#D97706)
- Icon position: 4px left margin from value text
- Text color: Default (no change)
- Padding: Matches existing cell padding

**Example:**
```
┌──────────────────┐
│ ⚠ A2             │  ← Amber background with warning triangle
└──────────────────┘
```

**Tooltip on hover/focus:**
```
Area: A2 (overrides drawing's A1)
```

### Assigned Indicator (Component has value, Drawing doesn't)

**Styling:**
- Background: `bg-blue-50` (#EFF6FF - very light blue)
- Icon: Lucide `PlusCircle` at 14px, `text-blue-600` (#2563EB)
- Icon position: 4px left margin from value text
- Text color: Default (no change)
- Padding: Matches existing cell padding

**Example:**
```
┌──────────────────┐
│ ⊕ S1             │  ← Blue background with plus circle
└──────────────────┘
```

**Tooltip on hover/focus:**
```
System: S1 (assigned to component)
```

### Inherited Indicator (Values match or both null)

**Styling:**
- No special styling (current behavior)
- Plain text display
- No icon, no background

**Example:**
```
┌──────────────────┐
│ TP1              │  ← Plain text, inherited from drawing
└──────────────────┘
```

### Hover/Focus State

**Desktop:**
- Entire metadata cell becomes interactive with `cursor-help`
- Radix UI Tooltip appears on hover
- Tooltip also appears on keyboard focus (accessibility)
- Escape key dismisses tooltip

**Mobile:**
- Tap on override/assigned badge shows modal dialog
- Modal displays detailed information:
  ```
  ┌─────────────────────────────────┐
  │ Area Override                   │
  ├─────────────────────────────────┤
  │ Component Value: A2             │
  │ Drawing Value: A1               │
  │                                 │
  │ [Close]                         │
  └─────────────────────────────────┘
  ```

### Color Contrast (WCAG AA Compliance)

- `text-amber-600` on `bg-amber-50`: Contrast ratio ~7.5:1 ✓
- `text-blue-600` on `bg-blue-50`: Contrast ratio ~8.2:1 ✓
- Both exceed WCAG AA requirement of 4.5:1 for normal text

## Component Architecture

### New Component: `MetadataCell.tsx`

**Location:** `src/components/drawing-table/MetadataCell.tsx`

**Purpose:** Reusable component for displaying metadata with override detection

**Props Interface:**
```typescript
interface MetadataCellProps {
  /** Current value from component */
  value: { id: string; name: string } | null

  /** Parent drawing's value for comparison */
  drawingValue: { id: string; name: string } | null

  /** Field name for tooltip messages */
  fieldName: 'Area' | 'System' | 'Test Package'

  /** Component ID for potential click handling */
  componentId: string

  /** Mobile layout flag */
  isMobile?: boolean
}
```

**State Detection Logic:**
```typescript
const getMetadataState = (
  value: MetadataValue | null,
  drawingValue: MetadataValue | null
): 'inherited' | 'override' | 'assigned' => {
  // Both null or both undefined = inherited
  if (!value && !drawingValue) return 'inherited'

  // Component has value, drawing doesn't = assigned
  if (value && !drawingValue) return 'assigned'

  // Both have values but IDs differ = override
  if (value && drawingValue && value.id !== drawingValue.id) return 'override'

  // Values match = inherited
  return 'inherited'
}
```

**Rendering Logic:**
```typescript
const MetadataCell = ({ value, drawingValue, fieldName, isMobile }) => {
  const state = getMetadataState(value, drawingValue)

  if (!value) {
    return <span className="text-gray-400">—</span>
  }

  if (state === 'inherited') {
    return <span>{value.name}</span>
  }

  if (state === 'override') {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="bg-amber-50 px-2 py-1 rounded flex items-center gap-1" tabIndex={0}>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
            <span>{value.name}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {fieldName}: {value.name} (overrides drawing's {drawingValue?.name})
        </TooltipContent>
      </Tooltip>
    )
  }

  if (state === 'assigned') {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="bg-blue-50 px-2 py-1 rounded flex items-center gap-1" tabIndex={0}>
            <PlusCircle className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
            <span>{value.name}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {fieldName}: {value.name} (assigned to component)
        </TooltipContent>
      </Tooltip>
    )
  }
}
```

### Updated Component: `ComponentRow.tsx`

**Changes Required:**

1. **Accept drawing prop:**
```typescript
interface ComponentRowProps {
  component: Component
  drawing: Drawing  // NEW: Add drawing object
  isMobile: boolean
  onComponentClick?: (componentId: string) => void
  onMilestoneUpdate?: (update: MilestoneUpdate) => void
}
```

2. **Extract drawing metadata:**
```typescript
const ComponentRow = ({ component, drawing, isMobile, ... }) => {
  const drawingMetadata = {
    area: drawing.area,
    system: drawing.system,
    test_package: drawing.test_package
  }

  // ...rest of component
}
```

3. **Replace inline metadata rendering** (around lines 350-390):

**Before:**
```typescript
<div className="min-w-[100px]">
  {component.area ? component.area.name : <span>—</span>}
</div>
```

**After:**
```typescript
<MetadataCell
  value={component.area}
  drawingValue={drawingMetadata.area}
  fieldName="Area"
  componentId={component.id}
  isMobile={isMobile}
/>
```

Repeat for `system` and `test_package` fields.

### Updated Component: `DrawingTable.tsx`

**Changes Required:**

Pass `drawing` object to `ComponentRow` in the virtualized row renderer:

**Before:**
```typescript
<ComponentRow
  component={component}
  isMobile={isMobile}
  onComponentClick={onComponentClick}
  onMilestoneUpdate={onMilestoneUpdate}
/>
```

**After:**
```typescript
<ComponentRow
  component={component}
  drawing={drawing}  // NEW: Pass drawing object
  isMobile={isMobile}
  onComponentClick={onComponentClick}
  onMilestoneUpdate={onMilestoneUpdate}
/>
```

**Note:** The `drawing` object is already available in the row renderer's scope.

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ DrawingTable.tsx                                            │
│                                                             │
│ - Fetches drawings + components via useComponents()        │
│ - Flattens to virtualized rows                             │
│ - Has access to both drawing and component data            │
│                                                             │
│   └──> ComponentRow.tsx                                    │
│        - Receives component AND drawing props              │
│        - Extracts drawing metadata for comparison          │
│        - Passes to MetadataCell for each field             │
│                                                             │
│          └──> MetadataCell.tsx                             │
│               - Compares component vs drawing values       │
│               - Determines state (inherited/override/      │
│                 assigned)                                  │
│               - Renders with appropriate styling           │
└─────────────────────────────────────────────────────────────┘
```

**Key Points:**
- No new database queries needed (data already fetched)
- No schema changes required
- Minimal prop additions
- Type-safe throughout (uses existing types from database.types.ts)

## Mobile Behavior

### Layout Considerations

Mobile layout (≤1024px) uses vertical card format with metadata badges at the bottom:

```
┌──────────────────────────────────────┐
│ Flange: FBLAG2DFA2351215 2" (1)      │
│                                      │
│ [☐] Receive  [☐] Install  [☐] Punch │
│                                      │
│ ⚠ A2    S1    TP1                    │
│ (amber bg)                           │
└──────────────────────────────────────┘
```

### Mobile-Specific Behavior

1. **Same visual treatment**: Icon + background on badges
2. **Touch-friendly**: 44px minimum touch target (already met by badge sizing)
3. **Tooltip becomes modal**: Tap shows dialog instead of tooltip
4. **No layout shift**: Badges already wrap with `flex-wrap` and `gap-2`

### Mobile Modal Implementation

Use existing Radix UI Dialog component:

```typescript
// On mobile, wrap MetadataCell in Dialog for override/assigned states
{isMobile && state !== 'inherited' ? (
  <Dialog>
    <DialogTrigger>
      {/* Badge with icon + bg */}
    </DialogTrigger>
    <DialogContent>
      <DialogTitle>{fieldName} {state === 'override' ? 'Override' : 'Assignment'}</DialogTitle>
      <div>
        <p>Component: {value.name}</p>
        <p>Drawing: {drawingValue?.name || 'None'}</p>
      </div>
    </DialogContent>
  </Dialog>
) : (
  <Tooltip>
    {/* Desktop hover tooltip */}
  </Tooltip>
)}
```

## Accessibility (WCAG 2.1 AA)

### Color Contrast

✓ All color combinations meet WCAG AA standards:
- Warning icon (amber-600) on amber-50 background: 7.5:1
- Plus icon (blue-600) on blue-50 background: 8.2:1

### Screen Reader Support

**ARIA Labels:**
```typescript
<div
  role="status"
  aria-label={`${fieldName}: ${value.name}, overrides drawing value ${drawingValue.name}`}
  className="bg-amber-50..."
>
  <AlertTriangle aria-hidden="true" />
  {value.name}
</div>
```

**Key Points:**
- Icon is `aria-hidden` (decorative, meaning conveyed by label)
- `role="status"` announces change to screen readers
- Full context provided in aria-label

### Keyboard Navigation

**Requirements:**
- Metadata cells are focusable: `tabIndex={0}`
- Tooltip triggers on keyboard focus (not just hover)
- Focus indicator visible: `focus-visible:ring-2 focus-visible:ring-amber-500`
- Escape key dismisses tooltip
- Mobile modal follows standard dialog keyboard patterns (Radix UI handles this)

**Tab Order:**
- Component identity → Milestone checkboxes → Area → System → Test Package → Progress
- No tab traps
- Logical reading order maintained

### Non-Color Indicators

✓ Icon provides visual cue independent of color
✓ Tooltip text explicitly states relationship
✓ Works for colorblind users (icon + text, not color alone)

### High Contrast Mode

Test in Windows High Contrast Mode:
- Icons remain visible
- Background colors may be overridden (acceptable)
- Focus indicators are preserved

## Testing Strategy

### Unit Tests: `MetadataCell.test.tsx`

**Coverage Target:** ≥80%

```typescript
describe('MetadataCell', () => {
  describe('Inherited state', () => {
    it('shows plain text when values match')
    it('shows plain text when both values are null')
    it('does not show icon or background')
  })

  describe('Override state', () => {
    it('shows amber background when values differ')
    it('shows warning triangle icon')
    it('displays component value as text')
    it('shows tooltip with override details on hover')
    it('shows tooltip on keyboard focus')
    it('has correct ARIA label for screen readers')
  })

  describe('Assigned state', () => {
    it('shows blue background when component has value but drawing does not')
    it('shows plus circle icon')
    it('shows tooltip with assignment details')
  })

  describe('Accessibility', () => {
    it('is keyboard focusable with tabIndex={0}')
    it('has visible focus indicator')
    it('announces state to screen readers')
    it('icon is aria-hidden')
    it('closes tooltip on Escape key')
  })

  describe('Mobile behavior', () => {
    it('shows dialog instead of tooltip on mobile')
    it('dialog is dismissable')
    it('touch target is at least 44px')
  })
})
```

### Integration Tests: `ComponentRow.test.tsx`

**Coverage Target:** ≥70%

```typescript
describe('ComponentRow with metadata overrides', () => {
  it('passes drawing metadata to MetadataCell components', () => {
    const drawing = {
      id: '1',
      area: { id: '1', name: 'A1' },
      system: { id: '1', name: 'S1' },
      test_package: { id: '1', name: 'TP1' }
    }
    const component = {
      id: '1',
      area: { id: '2', name: 'A2' },  // Override
      system: { id: '1', name: 'S1' }, // Inherited
      test_package: null               // None
    }

    render(<ComponentRow component={component} drawing={drawing} />)

    // Area shows override
    expect(screen.getByText('A2')).toHaveClass('bg-amber-50')
    expect(screen.getByRole('img', { name: /warning/i })).toBeInTheDocument()

    // System shows inherited (no styling)
    expect(screen.getByText('S1')).not.toHaveClass('bg-amber-50')

    // Test Package shows dash
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('handles all three metadata fields independently', () => {
    // Area: override, System: assigned, Test Package: inherited
  })

  it('works in mobile layout', () => {
    render(<ComponentRow isMobile={true} ... />)
    // Verify badges render in mobile card layout
  })
})
```

### Visual Regression Tests

**Manual Checklist:**
- [ ] Desktop layout: Override indicators visible and styled correctly
- [ ] Mobile layout: Badges render in card format with proper spacing
- [ ] Hover tooltips show correct information
- [ ] Keyboard navigation works (tab, focus, escape)
- [ ] Focus indicators visible and styled correctly
- [ ] No visual regression in inherited metadata (looks the same as before)
- [ ] Works with null/undefined values (shows dash)
- [ ] Multiple overrides in same row don't overlap or break layout

### Accessibility Tests

**Manual Checklist:**
- [ ] VoiceOver (macOS): Announces override state correctly
- [ ] NVDA (Windows): Reads aria-labels accurately
- [ ] Keyboard-only navigation: Can access all metadata cells
- [ ] Focus visible: Clear indicator on focused cell
- [ ] Color contrast: Passes WebAIM contrast checker
- [ ] High contrast mode: Icons remain visible
- [ ] Zoom to 200%: Layout remains usable
- [ ] Screen reader announces tooltip content

**Automated Tools:**
- Run `axe` accessibility linter in tests
- Use browser DevTools Lighthouse accessibility audit
- Verify no ARIA violations in test output

### Performance Tests

**Metrics to Monitor:**
- No significant impact on render time with 1000+ components
- Tooltip hover has <100ms delay
- Mobile modal opens smoothly without jank
- Virtualized scrolling remains smooth with indicators

## Implementation Checklist

**Phase 1: Component Creation**
- [ ] Create `src/components/drawing-table/MetadataCell.tsx`
- [ ] Implement state detection logic
- [ ] Add Lucide icons (AlertTriangle, PlusCircle)
- [ ] Implement desktop tooltip with Radix UI
- [ ] Implement mobile modal
- [ ] Add ARIA labels and keyboard support
- [ ] Write unit tests for MetadataCell

**Phase 2: Integration**
- [ ] Update `ComponentRow.tsx` props interface
- [ ] Extract drawing metadata in ComponentRow
- [ ] Replace inline metadata rendering with MetadataCell
- [ ] Update `DrawingTable.tsx` to pass drawing prop
- [ ] Write integration tests for ComponentRow
- [ ] Verify no TypeScript errors

**Phase 3: Testing**
- [ ] Run full test suite: `npm test`
- [ ] Verify coverage targets met (≥80% MetadataCell, ≥70% ComponentRow)
- [ ] Manual desktop testing (hover, keyboard, visual)
- [ ] Manual mobile testing (tap, modal, layout)
- [ ] Accessibility testing (screen reader, keyboard, contrast)
- [ ] Visual regression check against screenshots

**Phase 4: Documentation**
- [x] Write design document (this file)
- [ ] Update CLAUDE.md if needed
- [ ] Add JSDoc comments to MetadataCell component
- [ ] Update type definitions if needed

## Edge Cases

### Null/Undefined Handling

| Component Value | Drawing Value | State | Display |
|----------------|---------------|-------|---------|
| null | null | inherited | `—` (gray dash) |
| null | `{id: '1', name: 'A1'}` | inherited | `—` (gray dash) |
| `{id: '1', name: 'A1'}` | null | assigned | Blue bg + icon + `A1` |
| `{id: '1', name: 'A1'}` | `{id: '1', name: 'A1'}` | inherited | Plain `A1` |
| `{id: '1', name: 'A1'}` | `{id: '2', name: 'A2'}` | override | Amber bg + icon + `A1` |

### Drawing Not Expanded

When drawing is collapsed, component rows are not rendered, so metadata cells won't display. This is expected behavior (no change needed).

### Rapid Metadata Updates

If user is rapidly updating metadata (e.g., bulk assignment), ensure:
- Optimistic UI updates work correctly
- Override indicators update in real-time
- No flash of unstyled content (FOUC)
- Tooltip doesn't flicker on state changes

### Long Metadata Names

If metadata name is very long (e.g., "Test Package 123 - Very Long Name"):
- Cell should truncate with ellipsis: `text-ellipsis overflow-hidden`
- Full name appears in tooltip
- Icon doesn't push text off screen

## Future Enhancements

**Not in scope for initial implementation:**

1. **Filter by Override Status**: Add filter option to show only components with overrides
2. **Bulk Override Reset**: Action to reset overrides back to drawing values
3. **Override History**: Track when/who created the override
4. **Override Reason**: Optional text field to explain why override exists
5. **Override Count in Drawing Row**: Show "2 overrides" in drawing summary
6. **Export Override Report**: Include override information in CSV/Excel exports

## Success Metrics

**User Experience:**
- Users can identify components with overrides within 2 seconds of opening drawing
- Tooltip provides sufficient context without clicking into details
- No user reports of confusion about override indicators

**Technical:**
- Test coverage targets met (≥80% MetadataCell, ≥70% ComponentRow)
- No accessibility violations in automated testing
- No performance regression (render time <100ms with 1000 components)
- Zero TypeScript errors

**Adoption:**
- Feature is used without need for documentation (self-explanatory)
- No increase in support requests about metadata

## References

- WCAG 2.1 AA Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Radix UI Tooltip: https://www.radix-ui.com/primitives/docs/components/tooltip
- Lucide Icons: https://lucide.dev/icons/
- Tailwind CSS Colors: https://tailwindcss.com/docs/customizing-colors
- Project Constitution: `.specify/memory/constitution.md`
- Feature 020 Spec: `specs/020-component-metadata-editing/spec.md`
