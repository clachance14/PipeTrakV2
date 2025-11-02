# Mobile Weld Log Design

**Feature**: Mobile Weld Log Optimization (Feature 022)
**Date**: 2025-11-02
**Status**: Design Approved
**Branch**: `022-weld-log-mobile`

## Overview

Add mobile-optimized weld log viewing and editing by creating a 3-column table (Weld ID, Drawing Number, Date Welded) for screens ≤1024px, with modal-based detail viewing and milestone editing. Desktop view (>1024px) remains completely unchanged.

**Key Insight**: This feature adds a new **location** for field weld updates (weld log table), replicating the same milestone update patterns that already exist on the drawing/component table.

## User Requirements Summary

Based on clarification sessions with user:

1. **Mobile Table**: 3-column simplified view (Weld ID, Drawing, Date Welded) on ≤1024px screens
2. **Detail Modal**: Tap weld row → view all weld information (read-only)
3. **Milestone Editing**: "Update Weld" button in detail modal → opens milestone editor (Fit-Up, Weld Made)
4. **Welder Assignment**: Checking "Weld Made" intercepts and triggers welder assignment dialog
5. **NDE Recording**: After weld made, "Record NDE" button replaces "Update Weld" button
6. **Modal Closure**: When opening welder/NDE dialogs, close all parent modals (return to table)
7. **Desktop Unchanged**: Keep all 10 columns, inline actions, no modals on >1024px screens

## Architecture Decisions

### 1. Modal Management: Independent Modals with Page State

**Chosen Approach**: WeldLogPage manages all modal state explicitly

**Why**:
- Matches existing DrawingComponentTablePage pattern (proven, familiar)
- Simple debugging (all state in one place)
- No new abstractions or dependencies
- Easy to test

**Rejected Alternatives**:
- Modal Manager Context (too much abstraction for this use case)
- Composite Weld Modal (harder to reuse existing dialogs)

### 2. Milestone Interception: Copy DrawingComponentTablePage Pattern

**Chosen Approach**: Copy lines 106-147 from DrawingComponentTablePage.tsx

**Why**:
- Maximum consistency with existing code
- Proven logic already handling edge cases
- Field weld milestones behave identically across UI locations
- Easier maintenance (same pattern in both places)

**Key Logic**:
```typescript
// Check if Weld Made is being checked for the first time
if (
  component.component_type === 'field_weld' &&
  milestoneName === 'Weld Made' &&
  value === true &&
  !currentMilestones['Weld Made']
) {
  // Intercept: open welder dialog instead of direct update
  setIsWelderDialogOpen(true)
  return
}
```

### 3. WeldDetailModal Button Logic: Inline Conditional Rendering

**Chosen Approach**: Simple if/else in JSX

**Why**:
- Direct, easy to understand
- No abstraction overhead
- Logic is component-specific (not reusable)

**Button Display Rules**:
```typescript
// No weld made → Show "Update Weld"
if (!weld.welder_id && !weld.date_welded) {
  return <Button onClick={onUpdateWeld}>Update Weld</Button>
}

// Weld made + no NDE → Show "Record NDE"
if (weld.welder_id && !weld.nde_result) {
  return <Button onClick={onRecordNDE}>Record NDE</Button>
}

// NDE recorded → No buttons
return null
```

### 4. Mobile Table: Conditional Rendering with isMobile

**Chosen Approach**: Single WeldLogTable component with `if (isMobile)` branches

**Why**:
- Matches DrawingTable pattern (consistency)
- Clear separation of mobile/desktop logic
- Easy to test (pass isMobile prop)
- No CSS media query brittleness

**Rejected Alternatives**:
- Responsive CSS (harder to customize mobile layout)
- Separate component files (duplication, harder to maintain)

## Component Design

### Component Hierarchy

```
WeldLogPage.tsx (modified)
├── WeldLogFilters.tsx (unchanged)
├── WeldLogTable.tsx (modified - add mobile view)
├── WeldDetailModal.tsx (NEW)
├── UpdateWeldDialog.tsx (modified - add interception)
├── WelderAssignDialog.tsx (reused, unchanged)
└── NDEResultDialog.tsx (reused, unchanged)
```

### State Management (WeldLogPage.tsx)

```typescript
// Selected weld for modals
const [selectedWeld, setSelectedWeld] = useState<EnrichedFieldWeld | null>(null)

// Modal state
const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
const [isWelderDialogOpen, setIsWelderDialogOpen] = useState(false)
const [isNDEDialogOpen, setIsNDEDialogOpen] = useState(false)

// Mobile detection
const isMobile = useMobileDetection() // ≤1024px breakpoint
```

### Event Handlers (WeldLogPage.tsx)

```typescript
// Row click → open detail modal
const handleRowClick = (weldId: string) => {
  const weld = filteredWelds.find(w => w.id === weldId)
  if (weld) {
    setSelectedWeld(weld)
    setIsDetailModalOpen(true)
  }
}

// Detail modal → Update Weld button
const handleUpdateWeld = () => {
  setIsUpdateDialogOpen(true)
  // Keep detail modal open (stacked)
}

// UpdateWeldDialog intercepts Weld Made → trigger welder dialog
const handleTriggerWelderDialog = () => {
  // Close all parent modals (per user requirement)
  setIsDetailModalOpen(false)
  setIsUpdateDialogOpen(false)
  setIsWelderDialogOpen(true)
}

// Detail modal → Record NDE button
const handleRecordNDE = () => {
  setIsDetailModalOpen(false)  // Close detail modal
  setIsNDEDialogOpen(true)
}
```

### WeldLogTable.tsx - Mobile View

```typescript
export function WeldLogTable({
  welds,
  onRowClick,
  isMobile,
  ...desktopProps
}: WeldLogTableProps) {

  if (isMobile) {
    // Mobile: 3-column table with row click
    return (
      <div className="overflow-auto">
        <table className="w-full">
          <thead>
            <tr>
              <SortableHeader column="weld_id">Weld ID</SortableHeader>
              <SortableHeader column="drawing">Drawing</SortableHeader>
              <SortableHeader column="date_welded">Date Welded</SortableHeader>
            </tr>
          </thead>
          <tbody>
            {sortedWelds.map(weld => (
              <tr
                key={weld.id}
                onClick={() => onRowClick?.(weld.id)}
                className="cursor-pointer hover:bg-slate-50 min-h-[44px]"
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && onRowClick?.(weld.id)}
                aria-label={`View details for weld ${weld.identityDisplay}`}
              >
                <td className="px-3 py-2">{weld.identityDisplay}</td>
                <td className="px-3 py-2">
                  <Link
                    to={`/components?drawing=${weld.drawing.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-600 hover:underline"
                  >
                    {weld.drawing.drawing_no_norm}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {weld.date_welded
                    ? new Date(weld.date_welded).toLocaleDateString()
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Desktop: existing 10-column table (unchanged)
  return (
    <div className="h-full overflow-auto">
      {/* Existing 10-column table code */}
    </div>
  )
}
```

### WeldDetailModal.tsx (NEW)

```typescript
interface WeldDetailModalProps {
  weld: EnrichedFieldWeld
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateWeld: () => void
  onRecordNDE: () => void
}

export function WeldDetailModal({
  weld,
  open,
  onOpenChange,
  onUpdateWeld,
  onRecordNDE,
}: WeldDetailModalProps) {
  // Determine which action button to show
  const hasWelderAssigned = Boolean(weld.welder_id && weld.date_welded)
  const hasNDERecorded = Boolean(weld.nde_result)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Weld Details: {weld.identityDisplay}</DialogTitle>
        </DialogHeader>

        {/* Read-only weld information sections */}
        <div className="space-y-6">
          {/* Identification */}
          <section>
            <h3 className="font-medium mb-2">Identification</h3>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-slate-600">Weld ID:</dt>
              <dd>{weld.identityDisplay}</dd>
              <dt className="text-slate-600">Drawing:</dt>
              <dd>{weld.drawing.drawing_no_norm}</dd>
              <dt className="text-slate-600">Component:</dt>
              <dd>{weld.component.identity_key}</dd>
            </dl>
          </section>

          {/* Specifications */}
          <section>
            <h3 className="font-medium mb-2">Specifications</h3>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-slate-600">Type:</dt>
              <dd>{formatWeldType(weld.weld_type)}</dd>
              <dt className="text-slate-600">Size:</dt>
              <dd>{formatWeldSize(weld.weld_size)}</dd>
              <dt className="text-slate-600">Schedule:</dt>
              <dd>{weld.schedule || '-'}</dd>
              <dt className="text-slate-600">Base Metal:</dt>
              <dd>{weld.base_metal || '-'}</dd>
              <dt className="text-slate-600">Spec:</dt>
              <dd>{weld.spec || '-'}</dd>
            </dl>
          </section>

          {/* Welder Info */}
          <section>
            <h3 className="font-medium mb-2">Welder Information</h3>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-slate-600">Welder:</dt>
              <dd>
                {weld.welder
                  ? `${weld.welder.stencil} - ${weld.welder.name}`
                  : 'Not Assigned'}
              </dd>
              <dt className="text-slate-600">Date Welded:</dt>
              <dd>
                {weld.date_welded
                  ? new Date(weld.date_welded).toLocaleDateString()
                  : '-'}
              </dd>
            </dl>
          </section>

          {/* NDE Results */}
          <section>
            <h3 className="font-medium mb-2">NDE Results</h3>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-slate-600">NDE Type:</dt>
              <dd>{weld.nde_type ? formatNDEType(weld.nde_type) : '-'}</dd>
              <dt className="text-slate-600">Result:</dt>
              <dd>{weld.nde_result || '-'}</dd>
              <dt className="text-slate-600">Date:</dt>
              <dd>
                {weld.nde_date
                  ? new Date(weld.nde_date).toLocaleDateString()
                  : '-'}
              </dd>
              <dt className="text-slate-600">Notes:</dt>
              <dd className="col-span-2">{weld.nde_notes || '-'}</dd>
            </dl>
          </section>

          {/* Status & Progress */}
          <section>
            <h3 className="font-medium mb-2">Status & Progress</h3>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-slate-600">Status:</dt>
              <dd>
                <span className={getStatusBadgeColor(weld.status)}>
                  {weld.status.charAt(0).toUpperCase() + weld.status.slice(1)}
                </span>
              </dd>
              <dt className="text-slate-600">Progress:</dt>
              <dd>{weld.component.percent_complete}%</dd>
            </dl>
          </section>
        </div>

        {/* Action Buttons (conditional) */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          {/* Conditional action button */}
          {!hasWelderAssigned && (
            <Button onClick={onUpdateWeld} className="min-h-[44px]">
              Update Weld
            </Button>
          )}

          {hasWelderAssigned && !hasNDERecorded && (
            <Button onClick={onRecordNDE} className="min-h-[44px]">
              Record NDE
            </Button>
          )}

          {/* No action button if NDE recorded */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### UpdateWeldDialog.tsx - Modified Interception Logic

```typescript
export function UpdateWeldDialog({
  weld,
  open,
  onOpenChange,
  onTriggerWelderDialog  // NEW: callback for welder assignment
}: UpdateWeldDialogProps) {
  const { user } = useAuth()
  const updateMilestone = useUpdateMilestone()

  const currentMilestones = weld.component.current_milestones as Record<string, number> || {}

  const [fitUpChecked, setFitUpChecked] = useState(Boolean(currentMilestones['Fit-up']))
  const [weldCompleteChecked, setWeldCompleteChecked] = useState(Boolean(currentMilestones['Weld Complete']))

  useEffect(() => {
    setFitUpChecked(Boolean(currentMilestones['Fit-up']))
    setWeldCompleteChecked(Boolean(currentMilestones['Weld Complete']))
  }, [currentMilestones])

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('User not authenticated')
      return
    }

    try {
      // INTERCEPTION LOGIC (copied from DrawingComponentTablePage)
      const weldMadeChanged = weldCompleteChecked !== Boolean(currentMilestones['Weld Complete'])
      const isFirstTimeWeldMade = weldMadeChanged &&
                                  weldCompleteChecked &&
                                  !currentMilestones['Weld Complete']

      if (isFirstTimeWeldMade) {
        // Intercept: trigger welder assignment instead
        onTriggerWelderDialog()
        return
      }

      // Normal milestone updates (Fit-Up or unchecking Weld Complete)
      if (fitUpChecked !== Boolean(currentMilestones['Fit-up'])) {
        await updateMilestone.mutateAsync({
          component_id: weld.component_id,
          milestone_name: 'Fit-up',
          value: fitUpChecked,
          user_id: user.id,
        })
      }

      if (weldCompleteChecked !== Boolean(currentMilestones['Weld Complete'])) {
        await updateMilestone.mutateAsync({
          component_id: weld.component_id,
          milestone_name: 'Weld Complete',
          value: weldCompleteChecked,
          user_id: user.id,
        })
      }

      toast.success('Weld milestones updated successfully')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update weld milestones:', error)
      toast.error('Failed to update milestones. Please try again.')
    }
  }

  // ... rest of component (checkboxes, cancel button, etc.)
}
```

## Data Flow

### User Journey: Complete Weld Workflow

```
1. Mobile user opens Weld Log page
   ↓
2. Sees 3-column table (Weld ID, Drawing, Date Welded)
   ↓
3. Taps weld row
   ↓
4. WeldDetailModal opens (read-only, shows all 10 fields)
   ↓
5. Sees "Update Weld" button (weld not made yet)
   ↓
6. Taps "Update Weld"
   ↓
7. UpdateWeldDialog opens (checkboxes: Fit-Up, Weld Made)
   ↓
8. User checks "Weld Made"
   ↓
9. INTERCEPTION: UpdateWeldDialog detects first-time Weld Made
   ↓
10. Calls onTriggerWelderDialog()
    ↓
11. WeldLogPage closes UpdateWeldDialog + WeldDetailModal
    ↓
12. WelderAssignDialog opens
    ↓
13. User selects welder + date
    ↓
14. Saves → useAssignWelder hook executes:
    - Updates field_welds.welder_id, field_welds.date_welded
    - Marks Fit-Up milestone = 1 (30%)
    - Marks Weld Made milestone = 1 (70%)
    - All atomic in single transaction
    ↓
15. TanStack Query invalidates ['field-welds']
    ↓
16. WeldLogTable auto-refreshes with new data
    ↓
17. User returns to table, sees updated weld with 70% progress
    ↓
18. Taps same weld again → WeldDetailModal now shows "Record NDE" button
    ↓
19. Taps "Record NDE" → NDEResultDialog opens
    ↓
20. Records NDE → TanStack Query invalidates ['field-welds']
    ↓
21. Table refreshes, weld now shows NDE result
    ↓
22. Taps weld again → WeldDetailModal shows NO action buttons (workflow complete)
```

### TanStack Query Auto-Refresh

All mutations automatically trigger table refresh via `onSuccess`:

```typescript
// useAssignWelder.ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['field-welds'] })
  // ... other invalidations
}

// useRecordNDE.ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['field-welds'] })
  // ... other invalidations
}

// WeldLogPage automatically receives fresh data
const { data: welds } = useFieldWelds({ projectId, enabled: !!projectId })
```

## Accessibility (WCAG 2.1 AA Compliance)

### Touch Targets
- Mobile table rows: `min-h-[44px]` (exceeds 44px minimum)
- All modal buttons: `min-h-[44px]` (Update Weld, Record NDE, Close, Save, Cancel)
- Checkboxes: `h-5 w-5` with padding (44px effective hit area)

### Keyboard Navigation
- Mobile table rows: `tabIndex={0}` + `onKeyPress` for Enter key
- Modal focus trap: Dialog component handles focus management
- Focus return: After modal close, focus returns to triggering element

### ARIA Labels
- Table rows: `role="button"` + `aria-label="View details for weld {id}"`
- Checkboxes: `aria-label="Fit-up complete"` / `aria-label="Weld complete"`
- Buttons: Descriptive text (no icon-only buttons)

### Color Contrast
- Text: ≥4.5:1 ratio (slate-900 on white)
- Interactive elements: ≥3:1 ratio (blue-600 on white)
- Status badges: Verified contrast in existing design system

## Testing Strategy

### Test-Driven Development (TDD)

All tests written **before** implementation (Red-Green-Refactor):

#### Unit Tests

**WeldDetailModal.test.tsx**
```typescript
describe('WeldDetailModal', () => {
  it('shows Update Weld button when weld not made', () => {
    const weld = mockWeld({ welder_id: null, date_welded: null })
    render(<WeldDetailModal weld={weld} ... />)
    expect(screen.getByText('Update Weld')).toBeInTheDocument()
    expect(screen.queryByText('Record NDE')).not.toBeInTheDocument()
  })

  it('shows Record NDE button when weld made but no NDE', () => {
    const weld = mockWeld({
      welder_id: 'welder-1',
      date_welded: '2025-11-01',
      nde_result: null
    })
    render(<WeldDetailModal weld={weld} ... />)
    expect(screen.getByText('Record NDE')).toBeInTheDocument()
    expect(screen.queryByText('Update Weld')).not.toBeInTheDocument()
  })

  it('shows no action buttons when NDE recorded', () => {
    const weld = mockWeld({
      welder_id: 'welder-1',
      date_welded: '2025-11-01',
      nde_result: 'Pass'
    })
    render(<WeldDetailModal weld={weld} ... />)
    expect(screen.queryByText('Update Weld')).not.toBeInTheDocument()
    expect(screen.queryByText('Record NDE')).not.toBeInTheDocument()
  })

  it('calls onUpdateWeld when Update Weld button clicked', async () => {
    const onUpdateWeld = vi.fn()
    const weld = mockWeld({ welder_id: null })
    render(<WeldDetailModal weld={weld} onUpdateWeld={onUpdateWeld} ... />)

    await userEvent.click(screen.getByText('Update Weld'))
    expect(onUpdateWeld).toHaveBeenCalledTimes(1)
  })
})
```

**UpdateWeldDialog.test.tsx**
```typescript
describe('UpdateWeldDialog - Interception Logic', () => {
  it('intercepts Weld Made first-time check and triggers welder dialog', async () => {
    const onTriggerWelderDialog = vi.fn()
    const weld = mockWeld({
      current_milestones: { 'Fit-up': 0, 'Weld Complete': 0 }
    })

    render(<UpdateWeldDialog
      weld={weld}
      onTriggerWelderDialog={onTriggerWelderDialog}
      ...
    />)

    // Check Weld Made checkbox
    await userEvent.click(screen.getByLabelText('Weld complete'))

    // Click Save
    await userEvent.click(screen.getByText('Save'))

    // Should trigger welder dialog instead of direct update
    expect(onTriggerWelderDialog).toHaveBeenCalledTimes(1)
    expect(mockUpdateMilestone).not.toHaveBeenCalled()
  })

  it('updates milestone normally when Fit-Up only checked', async () => {
    const onTriggerWelderDialog = vi.fn()
    const weld = mockWeld({
      current_milestones: { 'Fit-up': 0, 'Weld Complete': 0 }
    })

    render(<UpdateWeldDialog weld={weld} onTriggerWelderDialog={onTriggerWelderDialog} ... />)

    // Check only Fit-Up
    await userEvent.click(screen.getByLabelText('Fit-up complete'))
    await userEvent.click(screen.getByText('Save'))

    // Should update milestone normally (no interception)
    expect(onTriggerWelderDialog).not.toHaveBeenCalled()
    expect(mockUpdateMilestone).toHaveBeenCalledWith({
      component_id: weld.component_id,
      milestone_name: 'Fit-up',
      value: true,
      user_id: 'user-1',
    })
  })
})
```

**WeldLogTable.test.tsx**
```typescript
describe('WeldLogTable - Mobile View', () => {
  it('renders 3 columns when isMobile=true', () => {
    render(<WeldLogTable welds={mockWelds} isMobile={true} ... />)

    expect(screen.getByText('Weld ID')).toBeInTheDocument()
    expect(screen.getByText('Drawing')).toBeInTheDocument()
    expect(screen.getByText('Date Welded')).toBeInTheDocument()

    // Desktop-only columns should not render
    expect(screen.queryByText('Welder')).not.toBeInTheDocument()
    expect(screen.queryByText('Type')).not.toBeInTheDocument()
  })

  it('renders 10 columns when isMobile=false', () => {
    render(<WeldLogTable welds={mockWelds} isMobile={false} ... />)

    // All desktop columns present
    expect(screen.getByText('Weld ID')).toBeInTheDocument()
    expect(screen.getByText('Welder')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('NDE Result')).toBeInTheDocument()
    // ... etc
  })

  it('calls onRowClick when mobile row clicked', async () => {
    const onRowClick = vi.fn()
    render(<WeldLogTable welds={mockWelds} isMobile={true} onRowClick={onRowClick} ... />)

    await userEvent.click(screen.getByText('W-001'))
    expect(onRowClick).toHaveBeenCalledWith('weld-id-1')
  })

  it('does not trigger onRowClick when Drawing link clicked', async () => {
    const onRowClick = vi.fn()
    render(<WeldLogTable welds={mockWelds} isMobile={true} onRowClick={onRowClick} ... />)

    await userEvent.click(screen.getByText('DWG-001'))
    expect(onRowClick).not.toHaveBeenCalled()
  })
})
```

#### Integration Tests

**tests/integration/weld-log-mobile.test.tsx**
```typescript
describe('Weld Log Mobile - Complete Workflow', () => {
  it('completes full workflow: view → update → assign welder → record NDE', async () => {
    // 1. Render weld log page (mobile)
    render(<WeldLogPage />, { isMobile: true })

    // 2. Click weld row
    await userEvent.click(screen.getByText('W-001'))

    // 3. Detail modal opens
    expect(screen.getByRole('dialog')).toHaveTextContent('Weld Details: W-001')
    expect(screen.getByText('Update Weld')).toBeInTheDocument()

    // 4. Click Update Weld
    await userEvent.click(screen.getByText('Update Weld'))

    // 5. UpdateWeldDialog opens
    expect(screen.getByLabelText('Fit-up complete')).toBeInTheDocument()
    expect(screen.getByLabelText('Weld complete')).toBeInTheDocument()

    // 6. Check Weld Made
    await userEvent.click(screen.getByLabelText('Weld complete'))
    await userEvent.click(screen.getByText('Save'))

    // 7. UpdateWeldDialog + WeldDetailModal close, WelderAssignDialog opens
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toHaveTextContent('Assign Welder')
    })

    // 8. Assign welder
    await userEvent.selectOptions(screen.getByLabelText('Welder'), 'welder-1')
    await userEvent.type(screen.getByLabelText('Date Welded'), '2025-11-01')
    await userEvent.click(screen.getByText('Assign Welder'))

    // 9. Dialog closes, table refreshes
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // 10. Click weld again
    await userEvent.click(screen.getByText('W-001'))

    // 11. Detail modal now shows Record NDE button
    expect(screen.getByText('Record NDE')).toBeInTheDocument()
    expect(screen.queryByText('Update Weld')).not.toBeInTheDocument()

    // 12. Record NDE
    await userEvent.click(screen.getByText('Record NDE'))
    await userEvent.selectOptions(screen.getByLabelText('NDE Type'), 'RT')
    await userEvent.selectOptions(screen.getByLabelText('Result'), 'Pass')
    await userEvent.click(screen.getByText('Save'))

    // 13. Table refreshes
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // 14. Click weld again - no action buttons
    await userEvent.click(screen.getByText('W-001'))
    expect(screen.queryByText('Update Weld')).not.toBeInTheDocument()
    expect(screen.queryByText('Record NDE')).not.toBeInTheDocument()
  })

  it('closes parent modals when welder dialog opens', async () => {
    render(<WeldLogPage />, { isMobile: true })

    // Open detail modal
    await userEvent.click(screen.getByText('W-001'))
    expect(screen.getByRole('dialog')).toHaveTextContent('Weld Details')

    // Open update dialog
    await userEvent.click(screen.getByText('Update Weld'))
    expect(screen.getByRole('dialog')).toHaveTextContent('Update Weld')

    // Trigger welder dialog
    await userEvent.click(screen.getByLabelText('Weld complete'))
    await userEvent.click(screen.getByText('Save'))

    // Only welder dialog should be open
    await waitFor(() => {
      const dialogs = screen.getAllByRole('dialog')
      expect(dialogs).toHaveLength(1)
      expect(dialogs[0]).toHaveTextContent('Assign Welder')
    })
  })
})
```

### Coverage Requirements

- **Overall**: ≥70% (lines, functions, branches, statements)
- **New components**: ≥70%
  - `WeldDetailModal.tsx` ≥70%
  - `UpdateWeldDialog.tsx` (modified) ≥70%
- **Modified components**: Maintain existing coverage
  - `WeldLogTable.tsx` (already has tests, extend for mobile view)
  - `WeldLogPage.tsx` (already has tests, extend for modal state)

## Implementation Checklist

### Phase 1: WeldDetailModal (Read-Only View)
- [ ] Create `src/components/weld-log/WeldDetailModal.tsx`
- [ ] Create `src/components/weld-log/WeldDetailModal.test.tsx` (TDD: write tests first)
- [ ] Implement modal with all 10 field sections (read-only)
- [ ] Implement conditional action button logic (Update Weld / Record NDE / none)
- [ ] Verify tests pass (Green)
- [ ] Add ARIA labels and keyboard navigation
- [ ] Commit: "feat(022): add WeldDetailModal with conditional action buttons"

### Phase 2: UpdateWeldDialog Interception
- [ ] Modify `src/components/field-welds/UpdateWeldDialog.tsx`
- [ ] Update `src/components/field-welds/UpdateWeldDialog.test.tsx` (TDD: add interception tests)
- [ ] Add `onTriggerWelderDialog` prop
- [ ] Copy interception logic from `DrawingComponentTablePage.tsx:122-135`
- [ ] Verify interception tests pass
- [ ] Commit: "fix(022): add Weld Made interception to UpdateWeldDialog"

### Phase 3: WeldLogTable Mobile View
- [ ] Modify `src/components/weld-log/WeldLogTable.tsx`
- [ ] Update `src/components/weld-log/WeldLogTable.test.tsx` (TDD: add mobile view tests)
- [ ] Add `isMobile` prop and `onRowClick` handler
- [ ] Implement conditional rendering (if isMobile: 3 columns, else: 10 columns)
- [ ] Add touch targets (≥44px rows), keyboard navigation, ARIA labels
- [ ] Verify mobile/desktop tests pass
- [ ] Commit: "feat(022): add 3-column mobile view to WeldLogTable"

### Phase 4: WeldLogPage Modal Orchestration
- [ ] Modify `src/pages/WeldLogPage.tsx`
- [ ] Add modal state (isDetailModalOpen, isUpdateDialogOpen, isWelderDialogOpen, isNDEDialogOpen)
- [ ] Add event handlers (handleRowClick, handleUpdateWeld, handleTriggerWelderDialog, handleRecordNDE)
- [ ] Wire up all modals with correct close behavior
- [ ] Pass `isMobile` to WeldLogTable
- [ ] Commit: "feat(022): add mobile modal workflow to WeldLogPage"

### Phase 5: Integration Tests
- [ ] Create `tests/integration/weld-log-mobile.test.tsx`
- [ ] Write complete workflow test (view → update → assign → NDE)
- [ ] Write modal closure test (verify parent modals close)
- [ ] Write keyboard navigation test
- [ ] Verify all integration tests pass
- [ ] Commit: "test(022): add weld log mobile integration tests"

### Phase 6: Verification & Cleanup
- [ ] Run full test suite: `npm test`
- [ ] Verify coverage: `npm test -- --coverage` (≥70%)
- [ ] Test on real devices (iOS Safari, Chrome Android)
- [ ] Verify WCAG 2.1 AA compliance (axe-core)
- [ ] Update CLAUDE.md with Feature 022 completion
- [ ] Commit: "docs(022): mark mobile weld log complete in CLAUDE.md"

## Success Criteria

**Functional**:
- ✅ Mobile users can view weld log without horizontal scrolling (≤1024px)
- ✅ Mobile users can access full weld details in 1 tap (row click)
- ✅ Mobile users can update milestones via UpdateWeldDialog
- ✅ Weld Made interception triggers welder assignment (matches DrawingComponentTablePage)
- ✅ NDE recording accessible after weld made
- ✅ Desktop view 100% unchanged (>1024px)

**Non-Functional**:
- ✅ Touch targets ≥44px (WCAG 2.1 AA)
- ✅ Keyboard navigation fully functional
- ✅ Modal focus management correct
- ✅ Test coverage ≥70%
- ✅ No horizontal scroll on mobile
- ✅ Performance: table renders <2s for 1,000 welds

## Design Rationale Summary

**Why this design?**

1. **Consistency**: Replicates `DrawingComponentTablePage` patterns (modal state, milestone interception)
2. **Simplicity**: Independent modals with page state (no new abstractions)
3. **Reusability**: Leverages existing `WelderAssignDialog`, `NDEResultDialog`, `useAssignWelder` hook
4. **User Experience**: Progressive disclosure (3-column table → detail modal → action modals)
5. **Maintainability**: Clear separation of concerns, testable components, TDD discipline

**What changed from original spec?**

Original spec (User Stories 2-4) proposed:
- WeldDetailModal with "Assign Welder" and "Record NDE" buttons directly

Revised design (based on user clarification):
- WeldDetailModal has conditional "Update Weld" button → opens UpdateWeldDialog
- UpdateWeldDialog intercepts Weld Made → triggers WelderAssignDialog
- After weld made, WeldDetailModal shows "Record NDE" button

**Why the change?**
- User requirement: "quick way to update field weld milestones from weld log"
- Milestone editing requires separate dialog (UpdateWeldDialog) to match DrawingComponentTablePage UX
- Maintains consistency: field weld milestone updates work identically across both UI locations
