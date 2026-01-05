# Quickstart: Bulk Receive Selection Mode

**Feature**: 034-bulk-receive-selection
**Date**: 2025-12-12

## Overview

This feature adds a two-mode interaction pattern to the Components table:
- **Browse Mode** (default): Row click opens detail modal, no checkboxes
- **Selection Mode**: Row click selects, Shift+click for range, bulk "Mark Received" action

## Key Files

### New Files to Create
| File | Purpose |
|------|---------|
| `src/components/ComponentsBulkActions.tsx` | Persistent selection bar with mode toggle and bulk actions |
| `src/hooks/useBulkReceiveComponents.ts` | Hook for throttled batch milestone updates |

### Files to Modify
| File | Changes |
|------|---------|
| `src/pages/ComponentsPage.tsx` | Add `selectionMode` state, wire bulk actions, detail modal trigger |
| `src/components/ComponentList.tsx` | Conditional checkbox visibility, Shift+click range selection |
| `src/components/ComponentRow.tsx` | Remove Actions column, conditional row click behavior |

## Implementation Steps

### Step 1: Create ComponentsBulkActions Component

```tsx
// src/components/ComponentsBulkActions.tsx
interface Props {
  selectionMode: boolean
  onToggleSelectionMode: () => void
  selectedCount: number
  onClearSelection: () => void
  onMarkReceived: () => void
  isProcessing?: boolean
}

export function ComponentsBulkActions({...}: Props) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border px-4 py-3">
      {/* Left: Mode toggle */}
      <div className="flex items-center gap-3">
        <Switch checked={selectionMode} onCheckedChange={onToggleSelectionMode} />
        <span>Selection Mode</span>
      </div>

      {/* Right: Selection count and actions (when mode ON and count > 0) */}
      {selectionMode && selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <span>{selectedCount} selected</span>
          <Button variant="outline" size="sm" onClick={onClearSelection}>Clear</Button>
          <Button size="sm" onClick={onMarkReceived} disabled={isProcessing}>
            Mark Received
          </Button>
        </div>
      )}
    </div>
  )
}
```

### Step 2: Create useBulkReceiveComponents Hook

```tsx
// src/hooks/useBulkReceiveComponents.ts
import pLimit from 'p-limit'  // Or implement simple throttling

export function useBulkReceiveComponents() {
  const updateMilestone = useUpdateMilestone()
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<BulkReceiveResult | null>(null)

  const bulkReceive = async (input: BulkReceiveInput) => {
    setIsProcessing(true)
    const result: BulkReceiveResult = { attempted: 0, updated: 0, skipped: 0, failed: 0 }

    // Filter already-received components
    const components = // ... get from query cache
    const toUpdate = components.filter(c =>
      input.componentIds.includes(c.id) &&
      (!c.current_milestones?.Receive || c.current_milestones.Receive < 100)
    )

    result.skipped = input.componentIds.length - toUpdate.length
    result.attempted = toUpdate.length

    // Throttled parallel execution
    const limit = pLimit(5)  // 5 concurrent requests
    await Promise.all(
      toUpdate.map(c => limit(async () => {
        try {
          await updateMilestone.mutateAsync({
            component_id: c.id,
            milestone_name: 'Receive',
            value: 100,
            user_id: input.userId
          })
          result.updated++
        } catch (e) {
          result.failed++
        }
      }))
    )

    setLastResult(result)
    setIsProcessing(false)
    return result
  }

  return { bulkReceive, isProcessing, lastResult, resetResult: () => setLastResult(null) }
}
```

### Step 3: Update ComponentsPage

```tsx
// Add to ComponentsPage.tsx
const [selectionMode, setSelectionMode] = useState(false)
const { bulkReceive, isProcessing } = useBulkReceiveComponents()

// Toggle handler
const handleToggleSelectionMode = () => {
  if (selectionMode) {
    handleClearSelection()  // Clear selections when exiting selection mode
  }
  setSelectionMode(!selectionMode)
}

// Bulk receive handler
const handleMarkReceived = async () => {
  if (selectedComponentIds.size > 10) {
    // Show confirmation dialog
  }
  const result = await bulkReceive({
    componentIds: Array.from(selectedComponentIds),
    userId: user.id
  })
  toast.success(`Updated ${result.updated}, skipped ${result.skipped}`)
  handleClearSelection()
}

// Render bulk actions bar
<ComponentsBulkActions
  selectionMode={selectionMode}
  onToggleSelectionMode={handleToggleSelectionMode}
  selectedCount={selectedComponentIds.size}
  onClearSelection={handleClearSelection}
  onMarkReceived={handleMarkReceived}
  isProcessing={isProcessing}
/>
```

### Step 4: Update ComponentList

```tsx
// Add to ComponentList props
interface Props {
  selectionMode: boolean
  onOpenDetails: (componentId: string) => void
  onSelectionChangeMany?: (ids: string[], selected: boolean) => void
}

// Add anchor state for Shift+click
const [anchorIndex, setAnchorIndex] = useState<number | null>(null)

// Row click handler
const handleRowClick = (index: number, e: React.MouseEvent) => {
  const component = components[index]

  if (selectionMode) {
    if (e.shiftKey && anchorIndex !== null) {
      // Range select
      const [start, end] = [Math.min(anchorIndex, index), Math.max(anchorIndex, index)]
      const idsToSelect = components.slice(start, end + 1).map(c => c.id)
      onSelectionChangeMany?.(idsToSelect, true)
    } else {
      // Single select, set new anchor
      setAnchorIndex(index)
      onSelectionChange(component.id, !selectedIds.has(component.id))
    }
  } else {
    // Browse mode: open details
    onOpenDetails(component.id)
  }
}

// Conditionally render checkbox column
{selectionMode && (
  <Checkbox ... />
)}
```

### Step 5: Update ComponentRow

```tsx
// Remove Actions column entirely
// (was: View button with Eye icon)

// Update row click handler
<div
  onClick={(e) => onClick?.(rowIndex, e)}
  className={cn(
    "cursor-pointer hover:bg-muted/50",
    isSelected && selectionMode && "bg-muted"
  )}
>
  {/* Checkbox only in selection mode */}
  {selectionMode && (
    <Checkbox
      checked={isSelected}
      onCheckedChange={() => onSelectionChange(!isSelected)}
      onClick={(e) => e.stopPropagation()}
    />
  )}

  {/* Rest of row content */}
</div>
```

## Testing Checklist

### Unit Tests
- [ ] ComponentsBulkActions renders mode toggle
- [ ] ComponentsBulkActions shows actions when selections exist
- [ ] useBulkReceiveComponents skips already-received components
- [ ] useBulkReceiveComponents returns correct summary counts

### Integration Tests
- [ ] Toggling mode hides/shows checkboxes
- [ ] Row click in browse mode opens modal
- [ ] Row click in selection mode toggles checkbox
- [ ] Shift+click selects range
- [ ] Bulk receive updates milestone_events

### Acceptance Tests
- [ ] P1: Browse mode row click opens details
- [ ] P1: Selection mode toggle works
- [ ] P1: Mark Received updates components
- [ ] P2: Shift+click range selection
- [ ] P3: Confirmation for >10 selections

## Common Pitfalls

1. **Don't forget stopPropagation** on checkbox clicks to prevent double-toggle
2. **Clear selections** when toggling out of selection mode
3. **Filter already-received** before counting "attempted"
4. **Throttle concurrent requests** to avoid database overload
5. **Update anchor index** on every non-shift click
