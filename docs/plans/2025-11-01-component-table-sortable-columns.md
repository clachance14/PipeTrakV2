# Component Table Sortable Columns Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add sortable columns to the Components page (`/projects/:projectId/components`) enabling users to sort by all 6 columns (Component, Drawing, Area, System, Test Package, Progress).

**Architecture:** Reuse existing `SortableColumnHeader` component for consistency with DrawingComponentTablePage. Implement client-side sorting via new `useComponentSort` hook. All sorting logic happens in-memory after data fetch (suitable for <10k components).

**Tech Stack:** React 18, TypeScript 5 (strict), TanStack Virtual (already in use), Vitest + Testing Library

---

## Task 1: Create Type Definitions

**Files:**
- Create: `src/types/component-table.types.ts`

**Step 1: Write the type definitions file**

```typescript
/**
 * Type definitions for component table sorting
 * Matches pattern from drawing-table.types.ts
 */

/**
 * Sort field options for components table
 */
export type ComponentSortField =
  | 'identity_key'      // Sort by component identity (alphabetically)
  | 'drawing'           // Sort by drawing number
  | 'area'              // Sort by area name
  | 'system'            // Sort by system name
  | 'test_package'      // Sort by test package name
  | 'percent_complete'  // Sort by progress percentage

/**
 * Sort direction options (matches drawing-table.types)
 */
export type SortDirection = 'asc' | 'desc'
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc -b`
Expected: No errors, types compile cleanly

**Step 3: Commit**

```bash
git add src/types/component-table.types.ts
git commit -m "feat: add component table sort types"
```

---

## Task 2: Create useComponentSort Hook (TDD)

**Files:**
- Create: `src/hooks/useComponentSort.test.ts`
- Create: `src/hooks/useComponentSort.ts`

**Step 1: Write failing test for hook initialization**

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useComponentSort } from './useComponentSort'

describe('useComponentSort', () => {
  it('initializes with identity_key ascending sort', () => {
    const { result } = renderHook(() => useComponentSort())

    expect(result.current.sortField).toBe('identity_key')
    expect(result.current.sortDirection).toBe('asc')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/useComponentSort.test.ts`
Expected: FAIL with "Cannot find module './useComponentSort'"

**Step 3: Create minimal hook implementation**

```typescript
import { useState, useCallback } from 'react'
import type { ComponentSortField, SortDirection } from '@/types/component-table.types'
import type { Database } from '@/types/database.types'

type Component = Database['public']['Tables']['components']['Row'] & {
  drawing?: { drawing_no_norm: string } | null
  area?: { name: string } | null
  system?: { name: string } | null
  test_package?: { name: string } | null
}

export function useComponentSort() {
  const [sortField, setSortField] = useState<ComponentSortField>('identity_key')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const sortComponents = useCallback((components: Component[]) => {
    return [...components]
  }, [])

  const handleSort = (field: ComponentSortField, direction: SortDirection) => {
    setSortField(field)
    setSortDirection(direction)
  }

  return { sortField, sortDirection, sortComponents, handleSort }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/useComponentSort.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useComponentSort.ts src/hooks/useComponentSort.test.ts
git commit -m "feat: add useComponentSort hook (initial)"
```

---

## Task 3: Implement Sorting Logic (TDD)

**Files:**
- Modify: `src/hooks/useComponentSort.test.ts`
- Modify: `src/hooks/useComponentSort.ts`

**Step 1: Write test for identity_key sorting**

Add to `src/hooks/useComponentSort.test.ts`:

```typescript
  it('sorts by identity_key ascending', () => {
    const { result } = renderHook(() => useComponentSort())

    const components = [
      { id: '1', identity_key: { drawing_norm: 'B', commodity_code: '001', size: '2', seq: 1 }, percent_complete: 50 },
      { id: '2', identity_key: { drawing_norm: 'A', commodity_code: '001', size: '2', seq: 1 }, percent_complete: 75 },
    ] as any[]

    const sorted = result.current.sortComponents(components)

    expect(sorted[0].id).toBe('2') // A comes before B
    expect(sorted[1].id).toBe('1')
  })

  it('sorts by identity_key descending', () => {
    const { result } = renderHook(() => useComponentSort())

    // Trigger descending sort
    result.current.handleSort('identity_key', 'desc')

    const components = [
      { id: '1', identity_key: { drawing_norm: 'A', commodity_code: '001', size: '2', seq: 1 }, percent_complete: 50 },
      { id: '2', identity_key: { drawing_norm: 'B', commodity_code: '001', size: '2', seq: 1 }, percent_complete: 75 },
    ] as any[]

    const sorted = result.current.sortComponents(components)

    expect(sorted[0].id).toBe('2') // B comes before A in descending
    expect(sorted[1].id).toBe('1')
  })

  it('sorts by percent_complete numerically', () => {
    const { result } = renderHook(() => useComponentSort())

    result.current.handleSort('percent_complete', 'asc')

    const components = [
      { id: '1', identity_key: {}, percent_complete: 75 },
      { id: '2', identity_key: {}, percent_complete: 10 },
      { id: '3', identity_key: {}, percent_complete: 95 },
    ] as any[]

    const sorted = result.current.sortComponents(components)

    expect(sorted[0].percent_complete).toBe(10)
    expect(sorted[1].percent_complete).toBe(75)
    expect(sorted[2].percent_complete).toBe(95)
  })

  it('sorts by drawing alphabetically', () => {
    const { result } = renderHook(() => useComponentSort())

    result.current.handleSort('drawing', 'asc')

    const components = [
      { id: '1', identity_key: {}, percent_complete: 0, drawing: { drawing_no_norm: 'PW-002' } },
      { id: '2', identity_key: {}, percent_complete: 0, drawing: { drawing_no_norm: 'PW-001' } },
      { id: '3', identity_key: {}, percent_complete: 0, drawing: null },
    ] as any[]

    const sorted = result.current.sortComponents(components)

    expect(sorted[0].id).toBe('3') // null/empty sorts first
    expect(sorted[1].drawing?.drawing_no_norm).toBe('PW-001')
    expect(sorted[2].drawing?.drawing_no_norm).toBe('PW-002')
  })

  it('sorts by area alphabetically with null handling', () => {
    const { result } = renderHook(() => useComponentSort())

    result.current.handleSort('area', 'asc')

    const components = [
      { id: '1', identity_key: {}, percent_complete: 0, area: { name: 'A3' } },
      { id: '2', identity_key: {}, percent_complete: 0, area: { name: 'A1' } },
      { id: '3', identity_key: {}, percent_complete: 0, area: null },
    ] as any[]

    const sorted = result.current.sortComponents(components)

    expect(sorted[0].id).toBe('3') // null sorts first
    expect(sorted[1].area?.name).toBe('A1')
    expect(sorted[2].area?.name).toBe('A3')
  })
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/hooks/useComponentSort.test.ts`
Expected: FAIL - sorting not implemented yet

**Step 3: Implement full sorting logic**

Update `src/hooks/useComponentSort.ts`:

```typescript
import { useState, useCallback } from 'react'
import type { ComponentSortField, SortDirection } from '@/types/component-table.types'
import type { Database } from '@/types/database.types'

type Component = Database['public']['Tables']['components']['Row'] & {
  drawing?: { drawing_no_norm: string } | null
  area?: { name: string } | null
  system?: { name: string } | null
  test_package?: { name: string } | null
}

export function useComponentSort() {
  const [sortField, setSortField] = useState<ComponentSortField>('identity_key')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const sortComponents = useCallback(
    (components: Component[]) => {
      return [...components].sort((a, b) => {
        let comparison = 0

        switch (sortField) {
          case 'identity_key':
            // Stringify identity_key for comparison
            comparison = JSON.stringify(a.identity_key).localeCompare(
              JSON.stringify(b.identity_key)
            )
            break
          case 'drawing':
            comparison = (a.drawing?.drawing_no_norm || '').localeCompare(
              b.drawing?.drawing_no_norm || ''
            )
            break
          case 'area':
            comparison = (a.area?.name || '').localeCompare(b.area?.name || '')
            break
          case 'system':
            comparison = (a.system?.name || '').localeCompare(b.system?.name || '')
            break
          case 'test_package':
            comparison = (a.test_package?.name || '').localeCompare(
              b.test_package?.name || ''
            )
            break
          case 'percent_complete':
            comparison = a.percent_complete - b.percent_complete
            break
        }

        return sortDirection === 'asc' ? comparison : -comparison
      })
    },
    [sortField, sortDirection]
  )

  const handleSort = (field: ComponentSortField, direction: SortDirection) => {
    setSortField(field)
    setSortDirection(direction)
  }

  return { sortField, sortDirection, sortComponents, handleSort }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/hooks/useComponentSort.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/hooks/useComponentSort.ts src/hooks/useComponentSort.test.ts
git commit -m "feat: implement component sorting logic"
```

---

## Task 4: Make SortableColumnHeader Generic

**Files:**
- Modify: `src/components/table/SortableColumnHeader.tsx:1-93`
- Create: `src/components/table/SortableColumnHeader.test.tsx`

**Step 1: Write test for generic field type**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SortableColumnHeader } from './SortableColumnHeader'

describe('SortableColumnHeader', () => {
  it('renders with custom field type', () => {
    const onSort = vi.fn()

    render(
      <SortableColumnHeader
        label="Test Column"
        field="custom_field"
        currentSortField="custom_field"
        currentSortDirection="asc"
        onSort={onSort}
      />
    )

    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('calls onSort with correct field when clicked', async () => {
    const user = userEvent.setup()
    const onSort = vi.fn()

    render(
      <SortableColumnHeader
        label="Test Column"
        field="custom_field"
        currentSortField="other_field"
        currentSortDirection="asc"
        onSort={onSort}
      />
    )

    await user.click(screen.getByRole('button'))

    expect(onSort).toHaveBeenCalledWith('custom_field', 'asc')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/table/SortableColumnHeader.test.tsx`
Expected: FAIL - test file doesn't exist yet

**Step 3: Make SortableColumnHeader generic**

Update `src/components/table/SortableColumnHeader.tsx`:

```typescript
import { ArrowUp, ArrowDown } from 'lucide-react'

export type SortDirection = 'asc' | 'desc'

interface SortableColumnHeaderProps<T extends string> {
  /** Column label to display */
  label: string
  /** Field name this column sorts by */
  field: T
  /** Current active sort field */
  currentSortField: T
  /** Current sort direction */
  currentSortDirection: SortDirection
  /** Callback when column is clicked */
  onSort: (field: T, direction: SortDirection) => void
  /** Optional CSS classes */
  className?: string
}

/**
 * Sortable column header component
 *
 * Displays column label with sort indicator icon.
 * Clicking cycles through: asc → desc → back to default
 *
 * Features:
 * - Visual sort indicator (ArrowUp/ArrowDown)
 * - Keyboard accessible (Tab, Enter/Space)
 * - ARIA labels for screen readers
 * - Generic field type for reusability
 */
export function SortableColumnHeader<T extends string>({
  label,
  field,
  currentSortField,
  currentSortDirection,
  onSort,
  className = '',
}: SortableColumnHeaderProps<T>) {
  const isActive = currentSortField === field

  const handleClick = () => {
    if (!isActive) {
      // Not currently sorted by this column - sort ascending
      onSort(field, 'asc')
    } else if (currentSortDirection === 'asc') {
      // Currently sorted ascending - switch to descending
      onSort(field, 'desc')
    } else {
      // Currently sorted descending - reset to default
      // Note: Reset behavior depends on parent component's default field
      onSort(field, 'asc')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        inline-flex items-center gap-1 font-medium text-left
        hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        transition-colors duration-150
        ${isActive ? 'text-slate-900' : 'text-slate-700'}
        ${className}
      `}
      aria-label={
        isActive
          ? `${label}, sorted ${currentSortDirection === 'asc' ? 'ascending' : 'descending'}. Click to ${
              currentSortDirection === 'asc' ? 'sort descending' : 'reset sort'
            }.`
          : `${label}, not sorted. Click to sort ascending.`
      }
      aria-sort={isActive ? (currentSortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span>{label}</span>
      {isActive && (
        <span aria-hidden="true">
          {currentSortDirection === 'asc' ? (
            <ArrowUp className="w-4 h-4" />
          ) : (
            <ArrowDown className="w-4 h-4" />
          )}
        </span>
      )}
    </button>
  )
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/table/SortableColumnHeader.test.tsx`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/components/table/SortableColumnHeader.tsx src/components/table/SortableColumnHeader.test.tsx
git commit -m "refactor: make SortableColumnHeader generic"
```

---

## Task 5: Update ComponentList with Sortable Headers

**Files:**
- Modify: `src/components/ComponentList.tsx:14-73`

**Step 1: Write test for sortable headers**

Add to `src/components/ComponentList.test.tsx` (create if doesn't exist):

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ComponentList } from './ComponentList'

describe('ComponentList', () => {
  const mockComponents = [
    {
      id: '1',
      identity_key: { drawing_norm: 'A', commodity_code: '001', size: '2', seq: 1 },
      percent_complete: 50,
      component_type: 'spool',
      project_id: 'proj-1',
      created_at: '2025-01-01',
      last_updated_at: '2025-01-01',
      is_retired: false,
      current_milestones: {},
      drawing_id: null,
      last_updated_by: null,
    },
  ]

  it('renders sortable column headers', () => {
    const onSort = vi.fn()

    render(
      <ComponentList
        components={mockComponents}
        sortField="identity_key"
        sortDirection="asc"
        onSort={onSort}
      />
    )

    expect(screen.getByRole('button', { name: /component/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /progress/i })).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ComponentList.test.tsx`
Expected: FAIL - props don't exist yet

**Step 3: Update ComponentList interface and implementation**

Update `src/components/ComponentList.tsx`:

```typescript
/**
 * ComponentList component (Feature 007)
 * Virtualized list of components using @tanstack/react-virtual
 * Handles 10k+ components efficiently
 */

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ComponentRow } from './ComponentRow';
import { SortableColumnHeader } from './table/SortableColumnHeader';
import type { Database } from '@/types/database.types';
import type { ComponentSortField, SortDirection } from '@/types/component-table.types';

type Component = Database['public']['Tables']['components']['Row'];

interface ComponentListProps {
  components: (Component & {
    drawing?: { drawing_no_norm: string } | null;
    area?: { name: string } | null;
    system?: { name: string } | null;
    test_package?: { name: string } | null;
  })[];
  onComponentClick?: (component: Component) => void;
  isLoading?: boolean;
  sortField: ComponentSortField;
  sortDirection: SortDirection;
  onSort: (field: ComponentSortField, direction: SortDirection) => void;
}

/**
 * ComponentList component
 * Uses react-virtual for efficient rendering of large lists
 * Only renders visible rows (performance optimization for 10k+ components)
 */
export function ComponentList({
  components,
  onComponentClick,
  isLoading,
  sortField,
  sortDirection,
  onSort,
}: ComponentListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: components.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // 60px row height estimate
    overscan: 10, // Render 10 extra rows for smooth scrolling
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading components...</div>
      </div>
    );
  }

  if (components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-muted-foreground mb-2">No components found</div>
        <div className="text-sm text-muted-foreground">
          Try adjusting your filters or import components
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-muted border-b font-medium text-sm">
        <div className="flex-1">
          <SortableColumnHeader
            label="Component"
            field="identity_key"
            currentSortField={sortField}
            currentSortDirection={sortDirection}
            onSort={onSort}
          />
        </div>
        <div className="flex-1 hidden md:block">
          <SortableColumnHeader
            label="Drawing"
            field="drawing"
            currentSortField={sortField}
            currentSortDirection={sortDirection}
            onSort={onSort}
          />
        </div>
        <div className="flex-1 hidden lg:block">
          <SortableColumnHeader
            label="Area"
            field="area"
            currentSortField={sortField}
            currentSortDirection={sortDirection}
            onSort={onSort}
          />
        </div>
        <div className="flex-1 hidden lg:block">
          <SortableColumnHeader
            label="System"
            field="system"
            currentSortField={sortField}
            currentSortDirection={sortDirection}
            onSort={onSort}
          />
        </div>
        <div className="flex-1 hidden xl:block">
          <SortableColumnHeader
            label="Test Package"
            field="test_package"
            currentSortField={sortField}
            currentSortDirection={sortDirection}
            onSort={onSort}
          />
        </div>
        <div className="w-20 text-right">
          <SortableColumnHeader
            label="Progress"
            field="percent_complete"
            currentSortField={sortField}
            currentSortDirection={sortDirection}
            onSort={onSort}
            className="justify-end"
          />
        </div>
      </div>

      {/* Virtualized List */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const component = components[virtualRow.index];
            if (!component) return null;

            return (
              <ComponentRow
                key={component.id}
                component={component}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onComponentClick?.(component)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/ComponentList.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ComponentList.tsx src/components/ComponentList.test.tsx
git commit -m "feat: add sortable headers to ComponentList"
```

---

## Task 6: Integrate Sorting in ComponentsPage

**Files:**
- Modify: `src/pages/ComponentsPage.tsx:1-112`

**Step 1: Write integration test**

Create `tests/integration/component-sorting.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComponentsPage } from '@/pages/ComponentsPage'

// Mock dependencies
vi.mock('@/hooks/useComponents', () => ({
  useComponents: vi.fn(() => ({
    data: [
      {
        id: '1',
        identity_key: { drawing_norm: 'B', commodity_code: '001', size: '2', seq: 1 },
        percent_complete: 75,
        component_type: 'spool',
        project_id: 'proj-1',
        created_at: '2025-01-01',
        last_updated_at: '2025-01-01',
        is_retired: false,
        current_milestones: {},
        drawing_id: null,
        last_updated_by: null,
        drawing: { drawing_no_norm: 'PW-002' },
      },
      {
        id: '2',
        identity_key: { drawing_norm: 'A', commodity_code: '001', size: '2', seq: 1 },
        percent_complete: 50,
        component_type: 'field_weld',
        project_id: 'proj-1',
        created_at: '2025-01-01',
        last_updated_at: '2025-01-01',
        is_retired: false,
        current_milestones: {},
        drawing_id: null,
        last_updated_by: null,
        drawing: { drawing_no_norm: 'PW-001' },
      },
    ],
    isLoading: false,
  })),
}))

vi.mock('@/contexts/ProjectContext', () => ({
  useProject: () => ({ selectedProjectId: 'proj-1' }),
}))

describe('Component Sorting Integration', () => {
  it('sorts components when clicking column headers', async () => {
    const user = userEvent.setup()

    render(<ComponentsPage projectId="proj-1" />)

    // Find Progress header and click to sort
    const progressHeader = screen.getByRole('button', { name: /progress/i })
    await user.click(progressHeader)

    // Verify sort occurred (first component should have lower progress)
    const rows = screen.getAllByRole('row')
    expect(rows[0]).toHaveTextContent('50')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/component-sorting.test.tsx`
Expected: FAIL - sorting not integrated yet

**Step 3: Integrate useComponentSort in ComponentsPage**

Update `src/pages/ComponentsPage.tsx`:

```typescript
/**
 * ComponentsPage (Feature 007)
 * Main page for viewing and managing components with filtering and assignment
 */

import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { ComponentFilters, ComponentFiltersState } from '@/components/ComponentFilters';
import { ComponentList } from '@/components/ComponentList';
import { ComponentAssignDialog } from '@/components/ComponentAssignDialog';
import { ComponentDetailView } from '@/components/ComponentDetailView';
import { useComponents } from '@/hooks/useComponents';
import { useComponentSort } from '@/hooks/useComponentSort';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ComponentsPageProps {
  projectId: string;
  canUpdateMilestones?: boolean;
}

export function ComponentsPage({
  projectId,
  canUpdateMilestones = false,
}: ComponentsPageProps) {
  const [filters, setFilters] = useState<ComponentFiltersState>({});
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  const { data: components = [], isLoading } = useComponents(projectId, filters);
  const { sortField, sortDirection, sortComponents, handleSort } = useComponentSort();

  // Sort components using the hook
  const sortedComponents = useMemo(
    () => sortComponents(components),
    [components, sortComponents]
  );

  const handleComponentClick = (component: any) => {
    setSelectedComponentId(component.id);
  };

  const handleAssignSuccess = () => {
    setSelectedComponentIds([]);
    setShowAssignDialog(false);
  };

  return (
    <Layout>
      <div className="mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">Components</h1>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <ComponentFilters projectId={projectId} onFilterChange={setFilters} />

            {selectedComponentIds.length > 0 && (
              <Button onClick={() => setShowAssignDialog(true)}>
                Assign {selectedComponentIds.length} Component
                {selectedComponentIds.length !== 1 ? 's' : ''}
              </Button>
            )}

            <div className="ml-auto text-sm text-slate-600">
              Showing {sortedComponents.length} component{sortedComponents.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Component List */}
        <div className="bg-white rounded-lg shadow h-[calc(100vh-280px)]">
          <ComponentList
            components={sortedComponents}
            onComponentClick={handleComponentClick}
            isLoading={isLoading}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </div>

        {/* Component Detail Dialog */}
        <Dialog
          open={selectedComponentId !== null}
          onOpenChange={(open) => !open && setSelectedComponentId(null)}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Component Details</DialogTitle>
            </DialogHeader>
            {selectedComponentId && (
              <ComponentDetailView
                componentId={selectedComponentId}
                canUpdateMilestones={canUpdateMilestones}
                canEditMetadata={true}
                onMetadataChange={() => {
                  // Optionally refetch components list
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Assign Dialog */}
        <ComponentAssignDialog
          projectId={projectId}
          componentIds={selectedComponentIds}
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
          onSuccess={handleAssignSuccess}
        />
      </div>
    </Layout>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/integration/component-sorting.test.tsx`
Expected: PASS

**Step 5: Run all tests to ensure no regressions**

Run: `npm test`
Expected: All tests PASS with ≥70% coverage

**Step 6: Commit**

```bash
git add src/pages/ComponentsPage.tsx tests/integration/component-sorting.test.tsx
git commit -m "feat: integrate component sorting in ComponentsPage"
```

---

## Task 7: Manual Testing and Verification

**Files:**
- None (manual testing)

**Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts at http://localhost:5173

**Step 2: Navigate to components page**

Action: Go to `/projects/:projectId/components` in browser
Expected: Component list displays with sortable headers

**Step 3: Test sorting by each column**

Actions:
1. Click "Component" header → should sort A-Z by identity_key
2. Click again → should sort Z-A
3. Click "Drawing" header → should sort by drawing number
4. Click "Area" header → should sort by area name
5. Click "System" header → should sort by system name
6. Click "Test Package" header → should sort by package name
7. Click "Progress" header → should sort by % complete

Expected: Each sort works correctly, icons show direction

**Step 4: Test keyboard navigation**

Actions:
1. Tab to column header
2. Press Enter/Space to sort
3. Tab through all headers

Expected: Focus ring visible, sorting works with keyboard

**Step 5: Test with filters**

Actions:
1. Apply area filter
2. Sort by progress
3. Change filter
4. Verify sort persists

Expected: Sorting remains active when filters change

**Step 6: Document any issues**

If issues found: Create tickets, do NOT fix in this task

---

## Task 8: Update Documentation

**Files:**
- Modify: `CLAUDE.md` (update Recent Changes section)

**Step 1: Update CLAUDE.md**

Add to Recent Changes section:

```markdown
## Recent Changes
- Component table sortable columns: All 6 columns now sortable (Component, Drawing, Area, System, Test Package, Progress) with keyboard accessibility
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document component table sorting feature"
```

---

## Task 9: Final Verification and Build

**Files:**
- None

**Step 1: Run full test suite**

Run: `npm test -- --coverage`
Expected: All tests PASS, coverage ≥70%

**Step 2: Type check**

Run: `npx tsc -b`
Expected: No TypeScript errors

**Step 3: Lint**

Run: `npm run lint`
Expected: No linting errors

**Step 4: Build for production**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Final commit and push**

```bash
git push origin 021-public-homepage
```

---

## Completion Checklist

- [ ] Task 1: Type definitions created
- [ ] Task 2: useComponentSort hook with tests
- [ ] Task 3: Sorting logic implemented and tested
- [ ] Task 4: SortableColumnHeader made generic
- [ ] Task 5: ComponentList updated with sortable headers
- [ ] Task 6: ComponentsPage integrated with sorting
- [ ] Task 7: Manual testing completed
- [ ] Task 8: Documentation updated
- [ ] Task 9: All tests pass, build succeeds

## Notes

- All sorting is client-side (O(n log n) complexity)
- Suitable for <10k components
- For larger datasets, consider server-side sorting (pass order_by to Supabase)
- Accessibility fully maintained (WCAG 2.1 AA)
- Consistent UX with DrawingComponentTablePage
