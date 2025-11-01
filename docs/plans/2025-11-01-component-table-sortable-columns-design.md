# Component Table Sortable Columns - Design Document

**Date**: 2025-11-01
**Feature**: Add sortable columns to Components page (`/projects/:projectId/components`)
**Status**: Design Complete, Ready for Implementation

## Overview

Add sortable columns to the Components page to enable users to sort the component list by any column (Component, Drawing, Area, System, Test Package, Progress). This brings the Components page up to feature parity with the Drawing-Centered Component Progress Table, which already has sortable columns.

## Requirements

### Functional Requirements
- All 6 columns must be sortable:
  1. Component (identity key)
  2. Drawing (drawing number)
  3. Area (area name)
  4. System (system name)
  5. Test Package (package name)
  6. Progress (% complete)
- Sorting behavior: Click to sort ascending → descending → reset to default
- Default sort: Component (identity_key) ascending
- Maintain existing virtualization and performance characteristics

### Non-Functional Requirements
- **Accessibility**: WCAG 2.1 AA compliance (keyboard navigation, ARIA labels, screen reader support)
- **Performance**: Client-side sorting must handle <10k components efficiently
- **Consistency**: Reuse existing `SortableColumnHeader` component from DrawingTable
- **Testing**: ≥70% coverage for new code (unit, component, integration tests)

## Architecture

### Approach: Reuse SortableColumnHeader Pattern

We selected this approach because:
- **Consistency**: Matches existing DrawingComponentTablePage sorting UX
- **Accessibility**: SortableColumnHeader already has ARIA labels, keyboard nav, focus management
- **Maintainability**: Reusing proven component reduces duplication
- **User familiarity**: Same three-state cycle (asc → desc → reset) across the app

### Type Definitions

**New file: `src/types/component-table.types.ts`**

```typescript
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

### Component Structure

#### 1. Sorting Hook: `useComponentSort`

**New file: `src/hooks/useComponentSort.ts`**

Responsibilities:
- Manage `sortField` and `sortDirection` state
- Provide `sortComponents()` function for client-side sorting
- Handle `handleSort()` callback for column header clicks
- Default state: `identity_key` ascending

```typescript
export function useComponentSort() {
  const [sortField, setSortField] = useState<ComponentSortField>('identity_key');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sortComponents = useCallback((components: Component[]) => {
    return [...components].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'identity_key':
          comparison = JSON.stringify(a.identity_key).localeCompare(
            JSON.stringify(b.identity_key)
          );
          break;
        case 'drawing':
          comparison = (a.drawing?.drawing_no_norm || '').localeCompare(
            b.drawing?.drawing_no_norm || ''
          );
          break;
        case 'area':
          comparison = (a.area?.name || '').localeCompare(b.area?.name || '');
          break;
        case 'system':
          comparison = (a.system?.name || '').localeCompare(b.system?.name || '');
          break;
        case 'test_package':
          comparison = (a.test_package?.name || '').localeCompare(
            b.test_package?.name || ''
          );
          break;
        case 'percent_complete':
          comparison = a.percent_complete - b.percent_complete;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [sortField, sortDirection]);

  const handleSort = (field: ComponentSortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  };

  return { sortField, sortDirection, sortComponents, handleSort };
}
```

**Sorting logic details:**
- **identity_key**: Stringified JSON comparison (handles nested structure)
- **drawing, area, system, test_package**: Alphanumeric localeCompare (case-insensitive)
- **percent_complete**: Numeric subtraction
- **Null handling**: Empty strings sort first (using `|| ''` fallback)

#### 2. ComponentList Changes

**Modified file: `src/components/ComponentList.tsx`**

Changes:
1. Add sorting props to interface:
   ```typescript
   interface ComponentListProps {
     components: (Component & {...})[];
     onComponentClick?: (component: Component) => void;
     isLoading?: boolean;
     // NEW:
     sortField: ComponentSortField;
     sortDirection: SortDirection;
     onSort: (field: ComponentSortField, direction: SortDirection) => void;
   }
   ```

2. Replace static header (lines 66-73) with sortable headers:
   ```tsx
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
     {/* Repeat for Area, System, Test Package, Progress */}
   </div>
   ```

3. Import `SortableColumnHeader` from `@/components/table/SortableColumnHeader`

**Note**: `SortableColumnHeader` requires TypeScript adjustment - it currently expects `SortField` from drawing-table.types. We'll need to make it generic or create a wrapper.

#### 3. ComponentsPage Integration

**Modified file: `src/pages/ComponentsPage.tsx`**

Changes:
1. Add sorting hook:
   ```tsx
   const { sortField, sortDirection, sortComponents, handleSort } = useComponentSort();
   ```

2. Sort components before passing to list:
   ```tsx
   const sortedComponents = useMemo(
     () => sortComponents(components),
     [components, sortComponents]
   );
   ```

3. Pass sorting props to ComponentList:
   ```tsx
   <ComponentList
     components={sortedComponents}
     onComponentClick={handleComponentClick}
     isLoading={isLoading}
     sortField={sortField}
     sortDirection={sortDirection}
     onSort={handleSort}
   />
   ```

## Data Flow

1. User clicks column header in `ComponentList`
2. `onSort(field, direction)` callback fires
3. `useComponentSort` updates state (`sortField`, `sortDirection`)
4. `ComponentsPage` re-renders with `useMemo` recalculating sorted array
5. `ComponentList` receives new sorted components
6. Virtual scroller re-renders visible rows

## Accessibility

Accessibility is already handled by `SortableColumnHeader` component:

- **ARIA labels**: `aria-label` describes current sort state and action
  - "Component, not sorted. Click to sort ascending."
  - "Component, sorted ascending. Click to sort descending."
  - "Component, sorted descending. Click to reset sort."
- **ARIA attributes**: `aria-sort="ascending|descending|none"`
- **Keyboard navigation**:
  - Tab to focus column header
  - Enter or Space to toggle sort
- **Focus indicators**: Visual focus ring on keyboard focus
- **Screen reader support**: Sort icons are `aria-hidden="true"`, state conveyed via labels

## Performance

- **Client-side sorting**: O(n log n) complexity
- **Acceptable for <10k components**: Typical projects have 200-1000 components
- **Virtual scrolling**: Already in place via `@tanstack/react-virtual`
- **Memoization**: `useMemo` prevents unnecessary re-sorts
- **No additional concerns**: Sorting is fast enough not to block UI

## Testing Strategy

### Unit Tests

**File: `src/hooks/useComponentSort.test.ts`**

Test cases:
- Initial state defaults to `identity_key` ascending
- `sortComponents()` sorts by each field correctly
- Ascending vs descending order
- Null/undefined handling for optional fields
- Numeric sorting for `percent_complete`
- String sorting for all other fields

### Component Tests

**File: `src/components/ComponentList.test.tsx`** (update existing)

Test cases:
- Render sortable headers with correct props
- Clicking header calls `onSort` callback with correct field/direction
- Keyboard navigation (Tab, Enter, Space)
- ARIA attributes present and correct

### Integration Tests

**File: `tests/integration/component-sorting.test.tsx`** (new)

Test cases:
- Full workflow: Load components → Click header → Verify re-sort
- Cycle through states: asc → desc → reset
- Sort persists during filter changes
- Sort works with search/filter combinations

### Coverage Target

- **New files**: ≥70% coverage (hooks, types)
- **Modified files**: Maintain existing coverage (ComponentList, ComponentsPage)

## Files to Create/Modify

### Create
1. `src/types/component-table.types.ts` - Type definitions
2. `src/hooks/useComponentSort.ts` - Sorting hook
3. `src/hooks/useComponentSort.test.ts` - Hook unit tests
4. `tests/integration/component-sorting.test.tsx` - Integration tests

### Modify
1. `src/components/ComponentList.tsx` - Add sortable headers
2. `src/pages/ComponentsPage.tsx` - Integrate sorting hook
3. `src/components/table/SortableColumnHeader.tsx` - Make field type generic (if needed)

## Edge Cases

1. **Empty components array**: No sorting needed, no errors
2. **Null/undefined metadata**: Sort empty strings first (already handled with `|| ''`)
3. **Large datasets (10k+)**: Client-side sorting may become slow - consider server-side sorting in future
4. **Mobile responsiveness**: Hidden columns (md:hidden, lg:hidden, xl:hidden) still sortable when visible

## Future Enhancements

- **URL state persistence**: Save sort state in URL query params (like DrawingTable)
- **Server-side sorting**: Pass `order_by` to Supabase for large datasets
- **Multi-column sorting**: Sort by primary + secondary fields
- **Custom sort functions**: User-defined sort orders (e.g., area priority)

## Implementation Checklist

- [ ] Create `src/types/component-table.types.ts`
- [ ] Create `src/hooks/useComponentSort.ts` with tests
- [ ] Modify `src/components/ComponentList.tsx` to use sortable headers
- [ ] Modify `src/pages/ComponentsPage.tsx` to integrate sorting
- [ ] Update `SortableColumnHeader` to support generic field types
- [ ] Write integration tests
- [ ] Verify accessibility with keyboard-only navigation
- [ ] Test with large dataset (1000+ components)
- [ ] Update documentation if needed

## References

- **Existing implementation**: `src/components/table/SortableColumnHeader.tsx`
- **Similar feature**: `src/pages/DrawingComponentTablePage.tsx` (lines 83-84, sorting hook)
- **Types reference**: `src/types/drawing-table.types.ts` (lines 237-251)
