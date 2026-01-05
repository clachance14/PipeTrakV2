# Research: Bulk Receive Selection Mode

**Feature**: 034-bulk-receive-selection
**Date**: 2025-12-12

## Research Summary

### 1. Existing Selection Infrastructure

**Decision**: Leverage existing selection state in ComponentsPage, add conditional mode switching

**Rationale**: ComponentsPage already has robust selection infrastructure:
- `selectedComponentIds: Set<string>` state
- `handleSelectionChange`, `handleSelectAll`, `handleClearSelection` handlers
- Selection pruning when filters change
- Virtualized table with checkbox column

**Alternatives Considered**:
- Create separate selection hook (like DrawingSelection) - Rejected: Unnecessary complexity, existing state is sufficient
- URL-based selection persistence - Rejected: Component selections are transient, unlike drawing selections which benefit from shareability

---

### 2. Bulk Actions Pattern

**Decision**: Follow DrawingBulkActions pattern with persistent bar and mode toggle

**Rationale**: DrawingBulkActions provides a proven UX pattern:
- Conditional rendering based on selection count
- Clear visual feedback with selection count
- Action buttons in consistent location
- Already familiar to users

**Key Differences from Drawing pattern**:
- ComponentsBulkActions will be **always visible** (even with 0 selections) to show the mode toggle
- DrawingBulkActions only shows when selections exist

**Alternatives Considered**:
- Inline row actions - Rejected: Spec explicitly removes Actions column for cleaner UI
- Floating action bar - Rejected: Less discoverable, inconsistent with existing patterns

---

### 3. Selection Mode Implementation

**Decision**: Add `selectionMode: boolean` state to ComponentsPage, pass to ComponentList/ComponentRow

**Rationale**:
- Clear separation between browse (details access) and selection (bulk operations)
- Row click behavior determined by single boolean prop
- Existing patterns in DrawingComponentTablePage show this works well

**Mode Behaviors**:
| Mode | Checkboxes | Row Click | Actions Column |
|------|-----------|-----------|----------------|
| Browse (default) | Hidden | Opens detail modal | Hidden |
| Selection | Visible | Toggles selection | Hidden |

**Alternatives Considered**:
- Always show checkboxes, add separate "Select" column - Rejected: Cluttered UI, spec requests hiding checkboxes in browse mode
- Keep Actions column with mode toggle inside - Rejected: Spec explicitly requests removing Actions column

---

### 4. Bulk Receive Hook Design

**Decision**: Create `useBulkReceiveComponents` hook that calls existing `useUpdateMilestone` in throttled batches

**Rationale**:
- No existing batch RPC for milestone updates
- Single `update_component_milestone` RPC is atomic and well-tested
- Throttled parallel execution (5-10 concurrent) prevents database overload
- Individual results enable granular success/failure tracking

**Implementation Pattern**:
```typescript
// Pseudocode
async function bulkReceive(componentIds: string[], userId: string) {
  const results = { attempted: 0, updated: 0, skipped: 0, failed: 0 }

  // Filter out already-received
  const toUpdate = components.filter(c =>
    !c.current_milestones?.Receive || c.current_milestones.Receive < 100
  )
  results.skipped = componentIds.length - toUpdate.length

  // Throttled execution (5 concurrent)
  await pLimit(5)(toUpdate.map(async (c) => {
    try {
      await updateMilestone({ component_id: c.id, value: 100, ... })
      results.updated++
    } catch {
      results.failed++
    }
  }))

  return results
}
```

**Alternatives Considered**:
- Create new bulk RPC - Rejected: Adds migration complexity, single RPC is sufficient for expected batch sizes (<100)
- Promise.all without throttling - Rejected: Could overwhelm database with 500+ concurrent requests
- Sequential execution - Rejected: Too slow for 50+ components

---

### 5. Shift+Click Range Selection

**Decision**: Track anchor index in ComponentList local state, calculate range from sorted component array

**Rationale**:
- ComponentList has stable component ordering from parent
- Local anchor state avoids prop drilling
- Simple index arithmetic for range calculation
- Batch selection update via new `onSelectionChangeMany` prop

**Implementation**:
```typescript
// In ComponentList
const [anchorIndex, setAnchorIndex] = useState<number | null>(null)

const handleRowClick = (index: number, isShiftKey: boolean) => {
  if (selectionMode) {
    if (isShiftKey && anchorIndex !== null) {
      // Range select: min to max inclusive
      const [start, end] = [Math.min(anchorIndex, index), Math.max(anchorIndex, index)]
      const idsToSelect = components.slice(start, end + 1).map(c => c.id)
      onSelectionChangeMany(idsToSelect, true)
    } else {
      // Single select, update anchor
      setAnchorIndex(index)
      onSelectionChange(components[index].id, !selectedIds.has(components[index].id))
    }
  } else {
    onOpenDetails(components[index].id)
  }
}
```

**Alternatives Considered**:
- Track anchor in page-level state - Rejected: Anchor is rendering concern, belongs with list
- Use component ID as anchor - Rejected: Index-based is simpler and more reliable with sorted arrays

---

### 6. Confirmation Dialog Threshold

**Decision**: Use existing AlertDialog pattern, show when `selectedCount > 10`

**Rationale**:
- 10 is a reasonable threshold (matches spec)
- AlertDialog from Radix UI is already used throughout the app
- Simple boolean check before executing bulk action

**Alternatives Considered**:
- User-configurable threshold - Rejected: Over-engineering, 10 is reasonable default
- Always confirm - Rejected: Slows down small batch operations unnecessarily

---

## Dependencies Confirmed

1. **useUpdateMilestone hook**: Exists at `src/hooks/useUpdateMilestone.ts`
2. **update_component_milestone RPC**: Exists with correct signature
3. **AlertDialog component**: Available from shadcn/ui
4. **ComponentDetailDialog**: Exists for opening via row click
5. **Checkbox component**: Available from shadcn/ui
6. **@tanstack/react-virtual**: Already in use for virtualization

## No NEEDS CLARIFICATION Items

All technical decisions resolved through codebase exploration.
