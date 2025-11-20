# Weld Log Persistent Sort and Filters Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add persistent sort and filter state to Weld Log page using Zustand store with localStorage.

**Architecture:** Create a Zustand store with persist middleware following existing `useSidebarStore` pattern. Default sort changes from `date_welded desc` to `weld_id asc`. Store manages both sort state and filter state, replacing URL params with localStorage.

**Tech Stack:** Zustand, zustand/middleware (persist), TypeScript, React hooks

---

## Task 1: Create Zustand Store with Tests (TDD)

**Files:**
- Create: `src/stores/useWeldLogPreferencesStore.ts`
- Create: `tests/stores/useWeldLogPreferencesStore.test.ts`

### Step 1: Write the failing test

Create test file with basic store structure test:

**File:** `tests/stores/useWeldLogPreferencesStore.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWeldLogPreferencesStore } from '@/stores/useWeldLogPreferencesStore'

describe('useWeldLogPreferencesStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useWeldLogPreferencesStore())

    expect(result.current.sortColumn).toBe('weld_id')
    expect(result.current.sortDirection).toBe('asc')
    expect(result.current.drawingFilter).toBe('all')
    expect(result.current.welderFilter).toBe('all')
    expect(result.current.statusFilter).toBe('all')
    expect(result.current.packageFilter).toBe('all')
    expect(result.current.systemFilter).toBe('all')
    expect(result.current.searchTerm).toBe('')
  })

  it('should toggle sort - same column flips direction', () => {
    const { result } = renderHook(() => useWeldLogPreferencesStore())

    // Initial state: weld_id asc
    expect(result.current.sortColumn).toBe('weld_id')
    expect(result.current.sortDirection).toBe('asc')

    // Toggle same column
    act(() => {
      result.current.toggleSort('weld_id')
    })

    expect(result.current.sortColumn).toBe('weld_id')
    expect(result.current.sortDirection).toBe('desc')

    // Toggle again
    act(() => {
      result.current.toggleSort('weld_id')
    })

    expect(result.current.sortDirection).toBe('asc')
  })

  it('should toggle sort - new column sets to asc', () => {
    const { result } = renderHook(() => useWeldLogPreferencesStore())

    // Toggle to different column
    act(() => {
      result.current.toggleSort('drawing')
    })

    expect(result.current.sortColumn).toBe('drawing')
    expect(result.current.sortDirection).toBe('asc')
  })

  it('should update filter values', () => {
    const { result } = renderHook(() => useWeldLogPreferencesStore())

    act(() => {
      result.current.setDrawingFilter('drawing-123')
      result.current.setWelderFilter('welder-456')
      result.current.setStatusFilter('active')
      result.current.setSearchTerm('test search')
    })

    expect(result.current.drawingFilter).toBe('drawing-123')
    expect(result.current.welderFilter).toBe('welder-456')
    expect(result.current.statusFilter).toBe('active')
    expect(result.current.searchTerm).toBe('test search')
  })

  it('should clear all filters', () => {
    const { result } = renderHook(() => useWeldLogPreferencesStore())

    // Set some filters
    act(() => {
      result.current.setDrawingFilter('drawing-123')
      result.current.setWelderFilter('welder-456')
      result.current.setStatusFilter('active')
      result.current.setSearchTerm('test')
    })

    // Clear all
    act(() => {
      result.current.clearAllFilters()
    })

    expect(result.current.drawingFilter).toBe('all')
    expect(result.current.welderFilter).toBe('all')
    expect(result.current.statusFilter).toBe('all')
    expect(result.current.packageFilter).toBe('all')
    expect(result.current.systemFilter).toBe('all')
    expect(result.current.searchTerm).toBe('')
  })

  it('should persist state to localStorage', () => {
    const { result } = renderHook(() => useWeldLogPreferencesStore())

    act(() => {
      result.current.toggleSort('drawing')
      result.current.setStatusFilter('active')
    })

    // Check localStorage
    const stored = localStorage.getItem('pipetrak:weld-log-preferences')
    expect(stored).toBeTruthy()

    const parsed = JSON.parse(stored!)
    expect(parsed.state.sortColumn).toBe('drawing')
    expect(parsed.state.statusFilter).toBe('active')
  })

  it('should restore state from localStorage', () => {
    // Pre-populate localStorage
    const mockState = {
      state: {
        sortColumn: 'welder',
        sortDirection: 'desc',
        drawingFilter: 'drawing-789',
        welderFilter: 'all',
        statusFilter: 'accepted',
        packageFilter: 'all',
        systemFilter: 'all',
        searchTerm: 'saved search'
      },
      version: 0
    }
    localStorage.setItem('pipetrak:weld-log-preferences', JSON.stringify(mockState))

    // Render hook - should load from localStorage
    const { result } = renderHook(() => useWeldLogPreferencesStore())

    expect(result.current.sortColumn).toBe('welder')
    expect(result.current.sortDirection).toBe('desc')
    expect(result.current.drawingFilter).toBe('drawing-789')
    expect(result.current.statusFilter).toBe('accepted')
    expect(result.current.searchTerm).toBe('saved search')
  })
})
```

### Step 2: Run test to verify it fails

Run:
```bash
npm test -- tests/stores/useWeldLogPreferencesStore.test.ts
```

Expected: FAIL with "Cannot find module '@/stores/useWeldLogPreferencesStore'"

### Step 3: Create the store implementation

**File:** `src/stores/useWeldLogPreferencesStore.ts`

```typescript
/**
 * Zustand store for Weld Log preferences
 * Manages sort and filter state with localStorage persistence
 * Feature: Persistent Weld Log Sort and Filters
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SortColumn =
  | 'weld_id'
  | 'drawing'
  | 'welder'
  | 'date_welded'
  | 'weld_type'
  | 'size'
  | 'nde_result'
  | 'status'
  | 'progress'

interface WeldLogPreferencesStore {
  // Sort state
  sortColumn: SortColumn
  sortDirection: 'asc' | 'desc'
  setSortColumn: (column: SortColumn) => void
  setSortDirection: (direction: 'asc' | 'desc') => void
  toggleSort: (column: SortColumn) => void

  // Filter state
  drawingFilter: string
  welderFilter: string
  statusFilter: string
  packageFilter: string
  systemFilter: string
  searchTerm: string

  // Filter actions
  setDrawingFilter: (value: string) => void
  setWelderFilter: (value: string) => void
  setStatusFilter: (value: string) => void
  setPackageFilter: (value: string) => void
  setSystemFilter: (value: string) => void
  setSearchTerm: (value: string) => void
  clearAllFilters: () => void
}

/**
 * Global weld log preferences store
 * Persists to localStorage for cross-session consistency
 */
export const useWeldLogPreferencesStore = create<WeldLogPreferencesStore>()(
  persist(
    (set) => ({
      // Default sort: weld_id ascending
      sortColumn: 'weld_id',
      sortDirection: 'asc',

      // Default filters: all
      drawingFilter: 'all',
      welderFilter: 'all',
      statusFilter: 'all',
      packageFilter: 'all',
      systemFilter: 'all',
      searchTerm: '',

      // Sort actions
      setSortColumn: (column: SortColumn) => {
        set({ sortColumn: column })
      },

      setSortDirection: (direction: 'asc' | 'desc') => {
        set({ sortDirection: direction })
      },

      toggleSort: (column: SortColumn) => {
        set((state) => {
          if (state.sortColumn === column) {
            // Same column - flip direction
            return { sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc' }
          } else {
            // New column - set to asc
            return { sortColumn: column, sortDirection: 'asc' }
          }
        })
      },

      // Filter actions
      setDrawingFilter: (value: string) => {
        set({ drawingFilter: value })
      },

      setWelderFilter: (value: string) => {
        set({ welderFilter: value })
      },

      setStatusFilter: (value: string) => {
        set({ statusFilter: value })
      },

      setPackageFilter: (value: string) => {
        set({ packageFilter: value })
      },

      setSystemFilter: (value: string) => {
        set({ systemFilter: value })
      },

      setSearchTerm: (value: string) => {
        set({ searchTerm: value })
      },

      clearAllFilters: () => {
        set({
          drawingFilter: 'all',
          welderFilter: 'all',
          statusFilter: 'all',
          packageFilter: 'all',
          systemFilter: 'all',
          searchTerm: '',
        })
      },
    }),
    {
      name: 'pipetrak:weld-log-preferences', // localStorage key
    }
  )
)
```

### Step 4: Run tests to verify they pass

Run:
```bash
npm test -- tests/stores/useWeldLogPreferencesStore.test.ts
```

Expected: All 7 tests PASS

### Step 5: Commit

```bash
git add src/stores/useWeldLogPreferencesStore.ts tests/stores/useWeldLogPreferencesStore.test.ts
git commit -m "feat: add Zustand store for weld log preferences with persistence"
```

---

## Task 2: Update WeldLogTable to Use Store

**Files:**
- Modify: `src/components/weld-log/WeldLogTable.tsx:6-94`
- Create: `tests/integration/weld-log-table-persistence.test.tsx`

### Step 1: Write failing integration test

**File:** `tests/integration/weld-log-table-persistence.test.tsx`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WeldLogTable } from '@/components/weld-log/WeldLogTable'
import { useWeldLogPreferencesStore } from '@/stores/useWeldLogPreferencesStore'
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds'

// Mock welds
const mockWelds: EnrichedFieldWeld[] = [
  {
    id: 'weld-1',
    identityDisplay: '5',
    drawing: { id: 'drawing-1', drawing_no_norm: 'N-26C07' },
    welder: null,
    date_welded: null,
    weld_type: 'socket',
    weld_size: '1"',
    status: 'active',
    component: { id: 'comp-1', percent_complete: 0 },
  } as EnrichedFieldWeld,
  {
    id: 'weld-2',
    identityDisplay: '14',
    drawing: { id: 'drawing-2', drawing_no_norm: 'N-26F07' },
    welder: null,
    date_welded: null,
    weld_type: 'socket',
    weld_size: '1"',
    status: 'active',
    component: { id: 'comp-2', percent_complete: 0 },
  } as EnrichedFieldWeld,
]

describe('WeldLogTable - Store Integration', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset store to defaults
    const { setSortColumn, setSortDirection } = useWeldLogPreferencesStore.getState()
    setSortColumn('weld_id')
    setSortDirection('asc')
  })

  it('should use store for initial sort state', () => {
    render(<WeldLogTable welds={mockWelds} />)

    // Should be sorted by weld_id asc (5, 14)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('5')
    expect(rows[2]).toHaveTextContent('14')
  })

  it('should update store when column header clicked', () => {
    render(<WeldLogTable welds={mockWelds} />)

    const weldIdHeader = screen.getByRole('button', { name: /weld id/i })

    // Click to toggle (should go to desc)
    fireEvent.click(weldIdHeader)

    const store = useWeldLogPreferencesStore.getState()
    expect(store.sortColumn).toBe('weld_id')
    expect(store.sortDirection).toBe('desc')
  })

  it('should respect store state from localStorage', () => {
    // Pre-set store to drawing desc
    const { setSortColumn, setSortDirection } = useWeldLogPreferencesStore.getState()
    setSortColumn('drawing')
    setSortDirection('desc')

    render(<WeldLogTable welds={mockWelds} />)

    // Should be sorted by drawing desc (N-26F07, N-26C07)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('N-26F07')
    expect(rows[2]).toHaveTextContent('N-26C07')
  })
})
```

### Step 2: Run test to verify it fails

Run:
```bash
npm test -- tests/integration/weld-log-table-persistence.test.tsx
```

Expected: FAIL - Table still uses local state, not store

### Step 3: Modify WeldLogTable to use store

**File:** `src/components/weld-log/WeldLogTable.tsx`

**Find these lines (78-80):**
```typescript
const [sortColumn, setSortColumn] = useState<SortColumn>('date_welded')
const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
const isMobileDetected = useMobileDetection()
```

**Replace with:**
```typescript
const { sortColumn, sortDirection, toggleSort } = useWeldLogPreferencesStore()
const isMobileDetected = useMobileDetection()
```

**Add import at top:**
```typescript
import { useWeldLogPreferencesStore } from '@/stores/useWeldLogPreferencesStore'
```

**Find handleSort function (87-94):**
```typescript
const handleSort = (column: SortColumn) => {
  if (sortColumn === column) {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
  } else {
    setSortColumn(column)
    setSortDirection('asc')
  }
}
```

**Replace with:**
```typescript
const handleSort = (column: SortColumn) => {
  toggleSort(column)
}
```

### Step 4: Run tests to verify they pass

Run:
```bash
npm test -- tests/integration/weld-log-table-persistence.test.tsx
```

Expected: All tests PASS

### Step 5: Verify type check passes

Run:
```bash
npx tsc -b
```

Expected: No errors

### Step 6: Commit

```bash
git add src/components/weld-log/WeldLogTable.tsx tests/integration/weld-log-table-persistence.test.tsx
git commit -m "feat: update WeldLogTable to use persistent sort store"
```

---

## Task 3: Update WeldLogFilters to Use Store

**Files:**
- Modify: `src/components/weld-log/WeldLogFilters.tsx`
- Create: `tests/integration/weld-log-filters-persistence.test.tsx`

### Step 1: Write failing integration test

**File:** `tests/integration/weld-log-filters-persistence.test.tsx`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WeldLogFilters } from '@/components/weld-log/WeldLogFilters'
import { useWeldLogPreferencesStore } from '@/stores/useWeldLogPreferencesStore'
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds'

const mockWelds: EnrichedFieldWeld[] = []
const mockDrawings = [{ id: 'drawing-1', drawing_no_norm: 'N-26C07' }]
const mockWelders = [{ id: 'welder-1', stencil: 'JD', name: 'John Doe' }]
const mockPackages = [{ id: 'pkg-1', name: 'Package 1' }]
const mockSystems = [{ id: 'sys-1', name: 'System 1' }]

describe('WeldLogFilters - Store Integration', () => {
  beforeEach(() => {
    localStorage.clear()
    const store = useWeldLogPreferencesStore.getState()
    store.clearAllFilters()
  })

  it('should use store for initial filter state', () => {
    const onFilteredWeldsChange = vi.fn()

    render(
      <WeldLogFilters
        welds={mockWelds}
        drawings={mockDrawings}
        welders={mockWelders}
        testPackages={mockPackages}
        systems={mockSystems}
        onFilteredWeldsChange={onFilteredWeldsChange}
      />
    )

    const store = useWeldLogPreferencesStore.getState()
    expect(store.drawingFilter).toBe('all')
    expect(store.welderFilter).toBe('all')
    expect(store.statusFilter).toBe('all')
  })

  it('should update store when filter changed', async () => {
    const onFilteredWeldsChange = vi.fn()

    render(
      <WeldLogFilters
        welds={mockWelds}
        drawings={mockDrawings}
        welders={mockWelders}
        testPackages={mockPackages}
        systems={mockSystems}
        onFilteredWeldsChange={onFilteredWeldsChange}
      />
    )

    // Find and click drawing filter
    const drawingSelect = screen.getByRole('combobox', { name: /all drawings/i })
    fireEvent.click(drawingSelect)

    // Select a drawing
    const drawingOption = await screen.findByText('N-26C07')
    fireEvent.click(drawingOption)

    await waitFor(() => {
      const store = useWeldLogPreferencesStore.getState()
      expect(store.drawingFilter).toBe('drawing-1')
    })
  })

  it('should restore filters from store', () => {
    // Pre-set store
    const { setDrawingFilter, setStatusFilter } = useWeldLogPreferencesStore.getState()
    setDrawingFilter('drawing-1')
    setStatusFilter('active')

    const onFilteredWeldsChange = vi.fn()

    render(
      <WeldLogFilters
        welds={mockWelds}
        drawings={mockDrawings}
        welders={mockWelders}
        testPackages={mockPackages}
        systems={mockSystems}
        onFilteredWeldsChange={onFilteredWeldsChange}
      />
    )

    // Check that filters are applied
    expect(screen.getByText('N-26C07')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('should clear all filters via store', async () => {
    // Pre-set some filters
    const { setDrawingFilter, setStatusFilter } = useWeldLogPreferencesStore.getState()
    setDrawingFilter('drawing-1')
    setStatusFilter('active')

    const onFilteredWeldsChange = vi.fn()

    render(
      <WeldLogFilters
        welds={mockWelds}
        drawings={mockDrawings}
        welders={mockWelders}
        testPackages={mockPackages}
        systems={mockSystems}
        onFilteredWeldsChange={onFilteredWeldsChange}
      />
    )

    // Click clear button
    const clearButton = screen.getByRole('button', { name: /clear/i })
    fireEvent.click(clearButton)

    await waitFor(() => {
      const store = useWeldLogPreferencesStore.getState()
      expect(store.drawingFilter).toBe('all')
      expect(store.statusFilter).toBe('all')
    })
  })
})
```

### Step 2: Run test to verify it fails

Run:
```bash
npm test -- tests/integration/weld-log-filters-persistence.test.tsx
```

Expected: FAIL - Filters still use URL params

### Step 3: Modify WeldLogFilters to use store

This is a larger refactor. We'll remove URL param logic and use the store.

**File:** `src/components/weld-log/WeldLogFilters.tsx`

**Remove import:**
```typescript
import { useSearchParams } from 'react-router-dom'
```

**Add import:**
```typescript
import { useWeldLogPreferencesStore } from '@/stores/useWeldLogPreferencesStore'
```

**Find these lines (36-38):**
```typescript
const isMobile = useMobileDetection()
const [searchParams, setSearchParams] = useSearchParams()
const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
```

**Replace with:**
```typescript
const isMobile = useMobileDetection()
const {
  drawingFilter,
  welderFilter,
  statusFilter,
  packageFilter,
  systemFilter,
  searchTerm,
  setDrawingFilter,
  setWelderFilter,
  setStatusFilter,
  setPackageFilter,
  setSystemFilter,
  setSearchTerm,
  clearAllFilters,
} = useWeldLogPreferencesStore()
const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
```

**Find localStorage collapse logic (40-64), keep it unchanged.**

**Remove these lines (66-72):**
```typescript
// Get filter values from URL
const drawingFilter = searchParams.get('drawing') || 'all'
const welderFilter = searchParams.get('welder') || 'all'
const statusFilter = searchParams.get('status') || 'all'
const packageFilter = searchParams.get('package') || 'all'
const systemFilter = searchParams.get('system') || 'all'
```

**Find debounce effect (73-91), replace with:**
```typescript
// Debounce search term (300ms)
useEffect(() => {
  const timer = setTimeout(() => {
    setSearchTerm(localSearchTerm)
  }, 300)

  return () => clearTimeout(timer)
}, [localSearchTerm, setSearchTerm])
```

**Remove URL sync effect (83-91) - delete this entire block.**

**Find updateFilter function (142-150):**
```typescript
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

**Delete this function entirely** (we'll use store setters directly).

**Find clearAllFilters function (152-156):**
```typescript
const clearAllFilters = () => {
  setSearchTerm('')
  setDebouncedSearch('')
  setSearchParams({}, { replace: true })
}
```

**Replace with:**
```typescript
const handleClearAllFilters = () => {
  setLocalSearchTerm('')
  clearAllFilters()
}
```

**In the JSX, replace all Select onValueChange handlers:**

**Drawing filter (219, 324):**
```typescript
// Before:
<Select value={drawingFilter} onValueChange={(value) => updateFilter('drawing', value)}>

// After:
<Select value={drawingFilter} onValueChange={setDrawingFilter}>
```

**Welder filter (234, 339):**
```typescript
<Select value={welderFilter} onValueChange={setWelderFilter}>
```

**Status filter (249, 354):**
```typescript
<Select value={statusFilter} onValueChange={setStatusFilter}>
```

**Package filter (262, 367):**
```typescript
<Select value={packageFilter} onValueChange={setPackageFilter}>
```

**System filter (277, 382):**
```typescript
<Select value={systemFilter} onValueChange={setSystemFilter}>
```

**Search input (207, 310-318):**
```typescript
// Before:
value={searchTerm}
onChange={(e) => setSearchTerm(e.target.value)}

// After:
value={localSearchTerm}
onChange={(e) => setLocalSearchTerm(e.target.value)}
```

**Clear button (294, 404):**
```typescript
// Before:
onClick={clearAllFilters}

// After:
onClick={handleClearAllFilters}
```

**Find hasActiveFilters (158-164):**
```typescript
// Before:
const hasActiveFilters =
  debouncedSearch ||
  drawingFilter !== 'all' ||
  ...

// After:
const hasActiveFilters =
  searchTerm ||
  drawingFilter !== 'all' ||
  welderFilter !== 'all' ||
  statusFilter !== 'all' ||
  packageFilter !== 'all' ||
  systemFilter !== 'all'
```

**Find filtered welds useMemo (94-135), update dependencies:**
```typescript
// At the end, change dependency array from:
}, [welds, debouncedSearch, drawingFilter, welderFilter, statusFilter, packageFilter, systemFilter])

// To:
}, [welds, searchTerm, drawingFilter, welderFilter, statusFilter, packageFilter, systemFilter])
```

**In filtering logic, replace `debouncedSearch` with `searchTerm`:**
```typescript
// Before (line 98):
if (debouncedSearch) {
  const searchLower = debouncedSearch.toLowerCase()

// After:
if (searchTerm) {
  const searchLower = searchTerm.toLowerCase()
```

### Step 4: Add URL migration logic on mount

Add this useEffect after the collapse state logic:

```typescript
// URL param migration (one-time on mount)
useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  const drawing = params.get('drawing')
  const welder = params.get('welder')
  const status = params.get('status')
  const pkg = params.get('package')
  const system = params.get('system')
  const search = params.get('search')

  // Apply URL params if they exist (overrides localStorage)
  if (drawing) setDrawingFilter(drawing)
  if (welder) setWelderFilter(welder)
  if (status) setStatusFilter(status)
  if (pkg) setPackageFilter(pkg)
  if (system) setSystemFilter(system)
  if (search) {
    setLocalSearchTerm(search)
    setSearchTerm(search)
  }
}, [setDrawingFilter, setWelderFilter, setStatusFilter, setPackageFilter, setSystemFilter, setSearchTerm])
```

### Step 5: Run tests to verify they pass

Run:
```bash
npm test -- tests/integration/weld-log-filters-persistence.test.tsx
```

Expected: Tests PASS

### Step 6: Verify type check

Run:
```bash
npx tsc -b
```

Expected: No errors

### Step 7: Commit

```bash
git add src/components/weld-log/WeldLogFilters.tsx tests/integration/weld-log-filters-persistence.test.tsx
git commit -m "feat: update WeldLogFilters to use persistent filter store"
```

---

## Task 4: Manual Testing and Verification

**No code changes - manual testing only**

### Step 1: Test default sort on fresh load

```bash
# Clear localStorage
# In browser DevTools Console:
localStorage.clear()
```

Navigate to `/weld-log`

**Expected:**
- Table sorted by weld_id ascending (1, 2, 3... not 1, 10, 100, 2)
- Natural sort working (uses existing naturalSort function)

### Step 2: Test sort persistence

1. Click "Drawing" column header → should sort by drawing asc
2. Refresh page
3. **Expected:** Still sorted by drawing asc

### Step 3: Test filter persistence

1. Set drawing filter to a specific drawing
2. Set status filter to "Active"
3. Enter search term "test"
4. Refresh page
5. **Expected:** All filters restored

### Step 4: Test clear filters

1. Apply several filters
2. Click "Clear All Filters"
3. **Expected:** All filters reset to 'all', search cleared
4. Refresh page
5. **Expected:** Filters stay cleared

### Step 5: Test navigation persistence

1. Apply filters and sort
2. Navigate to `/drawings`
3. Navigate back to `/weld-log`
4. **Expected:** Filters and sort restored

### Step 6: Test URL migration

1. Clear localStorage
2. Visit URL: `/weld-log?drawing=<drawing-id>&status=active`
3. **Expected:** Filters applied from URL
4. Check localStorage: `localStorage.getItem('pipetrak:weld-log-preferences')`
5. **Expected:** Filters saved to localStorage
6. Refresh page
7. **Expected:** Filters persist from localStorage

### Step 7: Inspect localStorage structure

In DevTools Console:
```javascript
JSON.parse(localStorage.getItem('pipetrak:weld-log-preferences'))
```

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

### Step 8: Document results

Create a brief test summary:
```bash
echo "Manual testing complete - all scenarios passed" > test-results.txt
git add test-results.txt
git commit -m "test: verify weld log persistence manual testing"
```

---

## Task 5: Update Documentation

**Files:**
- Modify: `CLAUDE.md`

### Step 1: Add store to architecture section

**File:** `CLAUDE.md`

Find the section about **State Management** or **Tech Stack** and add:

```markdown
### State Management
- **TanStack Query** (server state)
- **Zustand** (client state with localStorage persistence)
  - `useSidebarStore` - Sidebar collapse state
  - `useWeldLogPreferencesStore` - Weld log sort and filter preferences
- **React Context** (auth state)
```

If this section doesn't exist, add it after the **Tech Stack** section.

### Step 2: Add to localStorage patterns

Find or create a section about **localStorage patterns** and add:

```markdown
### Persistent Preferences Pattern

Use Zustand with persist middleware for user preferences that should survive page refreshes:

**Example:** `useWeldLogPreferencesStore`
- Stores sort and filter state
- localStorage key: `pipetrak:weld-log-preferences`
- Automatic sync via Zustand persist middleware

**When to use:**
- User preferences (UI state, filters, sort)
- Settings that should persist across sessions
- State that doesn't need server sync

**When NOT to use:**
- Server data (use TanStack Query)
- Auth state (use AuthContext)
- Form state (use local component state)
```

### Step 3: Commit

```bash
git add CLAUDE.md
git commit -m "docs: add weld log preferences store to architecture docs"
```

---

## Final Verification

### Step 1: Run full test suite

```bash
npm test
```

Expected: All tests pass

### Step 2: Run type check

```bash
npx tsc -b
```

Expected: No errors

### Step 3: Run linter

```bash
npm run lint
```

Expected: No errors

### Step 4: Build production

```bash
npm run build
```

Expected: Build succeeds

### Step 5: Final commit if needed

If any fixes were made during verification:
```bash
git add .
git commit -m "fix: address final verification issues"
```

---

## Rollout Notes

**Feature complete when:**
- [ ] All tests pass
- [ ] Type check clean
- [ ] Manual testing scenarios verified
- [ ] Documentation updated
- [ ] Build succeeds

**Breaking changes:**
- Filter state moves from URL params to localStorage
- Existing bookmarks with filters will work once (URL migration), then use localStorage

**Monitoring:**
- Check for localStorage quota errors in browser console
- Verify natural sort works correctly on production data

**Future enhancements:**
- Per-user preferences in database (cross-device sync)
- Export/import preference sets
- "Share view" button for temporary URL with filters
