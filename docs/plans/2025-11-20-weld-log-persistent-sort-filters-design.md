# Weld Log Persistent Sort and Filters Design

**Date:** 2025-11-20
**Feature:** Persistent sort state and filter preferences for Weld Log page
**Status:** Design Complete

## Problem Statement

The Weld Log page currently:
1. Defaults to sorting by `date_welded` descending
2. Loses sort state on page refresh
3. Stores filters in URL params which are lost when navigating away and back

**User requirements:**
1. Default table sort should be `weld_id` in numerical ascending order
2. Sort state should persist across page refreshes
3. Filter state should persist across page refreshes
4. Users should return to the exact table state they left

## Solution Overview

Create a Zustand store with persist middleware to manage all weld log preferences (sort + filters) with automatic localStorage synchronization, following the existing `useSidebarStore` pattern.

## Architecture

### Store Design

**Location:** `src/stores/useWeldLogPreferencesStore.ts`

**Interface:**
```typescript
interface WeldLogPreferencesStore {
  // Sort state
  sortColumn: SortColumn
  sortDirection: 'asc' | 'desc'
  setSortColumn: (column: SortColumn) => void
  setSortDirection: (direction: 'asc' | 'desc') => void
  toggleSort: (column: SortColumn) => void

  // Filter state
  drawingFilter: string      // 'all' or drawing ID
  welderFilter: string       // 'all' or welder ID
  statusFilter: string       // 'all', 'active', 'accepted', 'rejected'
  packageFilter: string      // 'all' or package ID
  systemFilter: string       // 'all' or system ID
  searchTerm: string         // Free text search

  // Filter actions
  setDrawingFilter: (value: string) => void
  setWelderFilter: (value: string) => void
  setStatusFilter: (value: string) => void
  setPackageFilter: (value: string) => void
  setSystemFilter: (value: string) => void
  setSearchTerm: (value: string) => void
  clearAllFilters: () => void
}
```

**Default state:**
```typescript
{
  sortColumn: 'weld_id',
  sortDirection: 'asc',
  drawingFilter: 'all',
  welderFilter: 'all',
  statusFilter: 'all',
  packageFilter: 'all',
  systemFilter: 'all',
  searchTerm: ''
}
```

**localStorage key:** `pipetrak:weld-log-preferences`

**Pattern:** Follows `useSidebarStore.ts` pattern using Zustand's `persist` middleware.

### Component Integration

#### WeldLogTable Changes

**Before:**
```typescript
const [sortColumn, setSortColumn] = useState<SortColumn>('date_welded')
const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

const handleSort = (column: SortColumn) => {
  if (sortColumn === column) {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
  } else {
    setSortColumn(column)
    setSortDirection('asc')
  }
}
```

**After:**
```typescript
const { sortColumn, sortDirection, toggleSort } = useWeldLogPreferencesStore()

const handleSort = (column: SortColumn) => {
  toggleSort(column)
}
```

**Changes:**
- Remove local useState for sort
- Import and use store hook
- Sorting logic moves to store

#### WeldLogFilters Changes

**Before:**
```typescript
const [searchParams, setSearchParams] = useSearchParams()
const drawingFilter = searchParams.get('drawing') || 'all'
// ... similar for other filters

const updateFilter = (key: string, value: string) => {
  const params = new URLSearchParams(searchParams)
  if (value === 'all') {
    params.delete(key)
  } else {
    params.set(key, value)
  }
  setSearchParams(params, { replace: true })
}
```

**After:**
```typescript
const {
  drawingFilter, welderFilter, statusFilter, packageFilter, systemFilter, searchTerm,
  setDrawingFilter, setWelderFilter, setStatusFilter, setPackageFilter, setSystemFilter, setSearchTerm,
  clearAllFilters
} = useWeldLogPreferencesStore()

// Direct usage in Select components:
<Select value={drawingFilter} onValueChange={setDrawingFilter}>
```

**Changes:**
- Remove `useSearchParams` hook
- Remove URL param manipulation logic
- Use store setters directly in onChange handlers
- Keep debouncing logic for searchTerm (local state → debounced → store)

### Migration Strategy

**URL Parameter Transition:**

Current implementation uses URL params (`?drawing=...&welder=...`). To respect existing bookmarks while transitioning to localStorage:

**Implementation:**
1. Store loads from localStorage via persist middleware (automatic)
2. On `WeldLogFilters` mount, check for URL params
3. If URL params exist, apply them to store (override localStorage)
4. Optionally clear URL params after applying

**Code:**
```typescript
// In WeldLogFilters useEffect:
useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  const drawing = params.get('drawing')
  const welder = params.get('welder')
  const status = params.get('status')
  const package = params.get('package')
  const system = params.get('system')
  const search = params.get('search')

  if (drawing) setDrawingFilter(drawing)
  if (welder) setWelderFilter(welder)
  if (status) setStatusFilter(status)
  if (package) setPackageFilter(package)
  if (system) setSystemFilter(system)
  if (search) setSearchTerm(search)

  // Optional: Clear URL after migration
  // window.history.replaceState({}, '', window.location.pathname)
}, []) // Run once on mount
```

**Behavior:**
- User with bookmarked URL → Filters apply from URL, then persist to localStorage
- User with clean URL → Defaults apply (weld_id asc, no filters)
- User refreshes page → localStorage preferences restore
- After first load with URL params, localStorage becomes source of truth

### State Flow Diagram

```
User Action → Component Handler → Zustand Store → localStorage
                                        ↓
                                   Re-render
                                        ↓
                                   UI updates
```

**On page load:**
```
localStorage → Zustand persist → Store hydration → Component reads → UI renders
     ↓ (if URL params exist)
URL params override → Store update → UI re-renders
```

## Testing Strategy

### Unit Tests

**Store tests:** `tests/stores/useWeldLogPreferencesStore.test.ts`
- Default state matches requirements
- `toggleSort` logic:
  - Same column → flip direction
  - New column → set to 'asc'
- Filter setters update state
- `clearAllFilters` resets to defaults
- Persist middleware integration (mock localStorage)

### Integration Tests

**Persistence tests:** `tests/integration/weld-log-persistence.test.ts`
- Render WeldLogTable, sort by column, verify localStorage key updated
- Render WeldLogFilters, change filter, verify localStorage updated
- Mock localStorage with saved preferences, render components, verify state restored
- Test URL param migration (render with URL params, verify applied to store)

### Manual Testing Checklist

1. **Fresh load:** Visit weld log → should show weld_id ascending
2. **Sort persistence:** Change sort to drawing desc → refresh page → should restore drawing desc
3. **Filter persistence:** Apply filters (drawing + status) → refresh page → should restore filters
4. **Clear filters:** Clear all filters → refresh → should show defaults
5. **Navigation persistence:** Apply preferences → navigate away → return → preferences persist
6. **URL migration:** Visit with URL params `?drawing=X&status=active` → filters apply → refresh → filters persist

### localStorage Inspection

**Key:** `pipetrak:weld-log-preferences`

**Expected structure:**
```json
{
  "state": {
    "sortColumn": "weld_id",
    "sortDirection": "asc",
    "drawingFilter": "all",
    "welderFilter": "all",
    "statusFilter": "all",
    "packageFilter": "all",
    "systemFilter": "all",
    "searchTerm": ""
  },
  "version": 0
}
```

## Implementation Checklist

- [ ] Create `src/stores/useWeldLogPreferencesStore.ts` with Zustand persist
- [ ] Update `WeldLogTable.tsx` to use store for sort state
- [ ] Update `WeldLogFilters.tsx` to use store for filter state
- [ ] Add URL param migration logic in WeldLogFilters
- [ ] Write unit tests for store
- [ ] Write integration tests for persistence
- [ ] Manual testing of all scenarios
- [ ] Update CLAUDE.md if new pattern introduced

## Trade-offs and Decisions

**Decision: localStorage vs URL params**
- **Chosen:** localStorage
- **Rationale:** Full persistence across navigation, simpler state management
- **Trade-off:** URLs no longer shareable with filter state

**Decision: URL param migration**
- **Chosen:** Read URL params on mount, apply to store, then use localStorage
- **Rationale:** Respects existing bookmarks, smooth transition
- **Trade-off:** Slight complexity in WeldLogFilters mount logic

**Decision: Zustand with persist vs custom hook**
- **Chosen:** Zustand with persist
- **Rationale:** Consistent with existing `useSidebarStore` pattern, built-in persistence, type-safe
- **Trade-off:** Adds dependency (already in project)

## Future Considerations

- **Per-user preferences:** Could migrate to database storage for cross-device sync
- **Multiple saved views:** Could extend to support named preference sets
- **Shareable filters:** Could add "Share current view" button that generates URL with params

## References

- Existing pattern: `src/stores/useSidebarStore.ts`
- Current implementation: `src/components/weld-log/WeldLogTable.tsx`
- Current filters: `src/components/weld-log/WeldLogFilters.tsx`
- Zustand docs: https://github.com/pmndrs/zustand
