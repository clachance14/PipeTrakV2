/**
 * ComponentList component (Feature 007)
 * Virtualized list of components using @tanstack/react-virtual
 * Handles 10k+ components efficiently
 */

import { useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ComponentRow } from './ComponentRow';
import { SortableColumnHeader } from './table/SortableColumnHeader';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ColumnChooser } from '@/components/ui/column-chooser';
import { SavedViewManager } from '@/components/SavedViewManager';
import { DensityToggle } from '@/components/DensityToggle';
import { useComponentPreferencesStore } from '@/stores/useComponentPreferencesStore';
import { AlertCircle, FilterX, Loader2 } from 'lucide-react';
import type { Database } from '@/types/database.types';
import type { ComponentSortField, SortDirection } from '@/types/component-table.types';

type Component = Database['public']['Tables']['components']['Row'];

// Column definitions for ColumnChooser
const COLUMNS = [
  { id: 'selection', label: 'Selection', canHide: false },
  { id: 'identity_key', label: 'Component', canHide: false },
  { id: 'component_type', label: 'Type', canHide: true },
  { id: 'percent_complete', label: 'Progress', canHide: false },
  { id: 'milestones', label: 'Milestones', canHide: true },
  { id: 'area', label: 'Area', canHide: true },
  { id: 'system', label: 'System', canHide: true },
  { id: 'test_package', label: 'Package', canHide: true },
  { id: 'drawing', label: 'Drawing', canHide: true },
  { id: 'footage', label: 'Footage', canHide: true },
];

interface ComponentListProps {
  components: (Component & {
    drawing?: { drawing_no_norm: string } | null;
    area?: { name: string } | null;
    system?: { name: string } | null;
    test_package?: { name: string } | null;
  })[];
  onComponentClick?: (component: Component) => void;
  isLoading?: boolean;
  getSortInfo: (field: ComponentSortField) => { direction: SortDirection; priority: number } | null;
  onSort: (field: ComponentSortField, direction: SortDirection, isAdditive: boolean) => void;
  sortRules: { field: string; direction: SortDirection }[];
  onResetSort: () => void;

  // Selection props
  selectedIds: Set<string>;
  onSelectionChange: (componentId: string, isSelected: boolean) => void;
  onSelectionChangeMany?: (componentIds: string[], isSelected: boolean) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  allSelected: boolean;
  someSelected: boolean;

  // Mode control
  selectionMode?: boolean; // Default true for backwards compatibility

  // View action
  onViewComponent: (component: Component) => void;
  onOpenDetails?: (componentId: string) => void;

  // Filter state
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
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
  getSortInfo,
  onSort,
  sortRules,
  onResetSort,
  selectedIds,
  onSelectionChange,
  onSelectionChangeMany,
  onSelectAll,
  onClearSelection,
  allSelected,
  someSelected,
  selectionMode = true, // Default true for backwards compatibility
  onViewComponent,
  onOpenDetails,
  hasActiveFilters = false,
  onClearFilters,
}: ComponentListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Track anchor index for range selection
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);

  // Handle row click for individual and range selection
  const handleRowClick = (index: number, shiftKey: boolean) => {
    if (!selectionMode) return; // In browse mode, do nothing here (handled by ComponentRow)

    if (shiftKey && anchorIndex !== null && onSelectionChangeMany) {
      // Range selection
      const [start, end] = [Math.min(anchorIndex, index), Math.max(anchorIndex, index)];
      const idsToSelect = components.slice(start, end + 1).map(c => c.id);
      onSelectionChangeMany(idsToSelect, true);
    } else {
      // Single click - update anchor
      setAnchorIndex(index);
      // Single selection toggle is handled by ComponentRow's onSelectionChange
    }
  };

  // Get preferences from store
  const {
    visibleColumns,
    toggleColumn,
    showAllColumns,
    density,
    setDensity
  } = useComponentPreferencesStore();

  // Calculate row height based on density
  const rowHeight = density === 'compact' ? 44 : 60;

  const virtualizer = useVirtualizer({
    count: components.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10, // Render 10 extra rows for smooth scrolling
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">Loading components...</p>
      </div>
    );
  }

  if (components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">
          {hasActiveFilters ? 'No components match your filters' : 'No components found'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
          {hasActiveFilters
            ? 'Try adjusting your filters to see more results, or clear all filters to see all components.'
            : 'No components have been imported for this project yet.'}
        </p>
        {hasActiveFilters && onClearFilters && (
          <Button variant="outline" onClick={onClearFilters} className="gap-2">
            <FilterX className="h-4 w-4" />
            Clear All Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar - stays fixed at top */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b bg-background">
        <div className="text-sm text-muted-foreground">
          {components.length} {components.length === 1 ? 'component' : 'components'}
        </div>
        <div className="flex items-center gap-2">
          {/* Show Reset Sort if not default (single sort on identity_key asc) */}
          {(sortRules.length > 1 ||
            (sortRules.length === 1 && (sortRules[0]?.field !== 'identity_key' || sortRules[0]?.direction !== 'asc'))) && (
            <Button variant="ghost" size="sm" onClick={onResetSort}>
              Reset Sort
            </Button>
          )}
          <ColumnChooser
            columns={COLUMNS}
            visibleColumns={visibleColumns}
            onToggle={toggleColumn}
            onShowAll={showAllColumns}
          />
          <SavedViewManager />
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      </div>

      {/* Header - stays fixed at top, outside scroll container */}
      <div className="flex-shrink-0 flex items-center gap-4 px-4 py-3 bg-muted border-b font-medium text-sm">
        {/* Select All Checkbox - only visible in selection mode */}
        {selectionMode && (
          <div className="w-10 flex items-center justify-center">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={(checked) => {
                if (checked) onSelectAll();
                else onClearSelection();
              }}
              aria-label="Select all components"
            />
          </div>
        )}

        {/* Drawing */}
        {visibleColumns.includes('drawing') && (
          <div className="flex-1 min-w-0 hidden md:block">
            <SortableColumnHeader
              label="Drawing"
              field="drawing"
              sortInfo={getSortInfo('drawing')}
              onSort={onSort}
            />
          </div>
        )}

        {/* Identity - always visible (canHide: false) */}
        <div className="flex-1 min-w-0">
          <SortableColumnHeader
            label="Identity"
            field="identity_key"
            sortInfo={getSortInfo('identity_key')}
            onSort={onSort}
          />
        </div>

        {/* Type */}
        {visibleColumns.includes('component_type') && (
          <div className="w-24 hidden md:block">
            <SortableColumnHeader
              label="Type"
              field="component_type"
              sortInfo={getSortInfo('component_type')}
              onSort={onSort}
            />
          </div>
        )}

        {/* Progress - always visible (canHide: false) */}
        <div className="w-28">
          <SortableColumnHeader
            label="Progress"
            field="percent_complete"
            sortInfo={getSortInfo('percent_complete')}
            onSort={onSort}
          />
        </div>

        {/* Milestones */}
        {visibleColumns.includes('milestones') && (
          <div className="flex-1 min-w-0 hidden xl:block">
            Milestones
          </div>
        )}

        {/* Footage */}
        {visibleColumns.includes('footage') && (
          <div className="w-24 hidden lg:block">
            <SortableColumnHeader
              label="Footage"
              field="footage"
              sortInfo={getSortInfo('footage')}
              onSort={onSort}
            />
          </div>
        )}

        {/* Area */}
        {visibleColumns.includes('area') && (
          <div className="w-24 hidden lg:block">
            <SortableColumnHeader
              label="Area"
              field="area"
              sortInfo={getSortInfo('area')}
              onSort={onSort}
            />
          </div>
        )}

        {/* System */}
        {visibleColumns.includes('system') && (
          <div className="w-24 hidden lg:block">
            <SortableColumnHeader
              label="System"
              field="system"
              sortInfo={getSortInfo('system')}
              onSort={onSort}
            />
          </div>
        )}

        {/* Package */}
        {visibleColumns.includes('test_package') && (
          <div className="w-24 hidden xl:block">
            <SortableColumnHeader
              label="Package"
              field="test_package"
              sortInfo={getSortInfo('test_package')}
              onSort={onSort}
            />
          </div>
        )}
      </div>

      {/* Scroll container - only this part scrolls */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
        style={{ contain: 'size layout' }}
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
                visibleColumns={visibleColumns}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onComponentClick?.(component)}
                isSelected={selectedIds.has(component.id)}
                onSelectionChange={(isSelected) => onSelectionChange(component.id, isSelected)}
                onView={() => onViewComponent(component)}
                onOpenDetails={onOpenDetails ? () => onOpenDetails(component.id) : undefined}
                selectionMode={selectionMode}
                rowIndex={virtualRow.index}
                density={density}
                onRowClick={(shiftKey) => handleRowClick(virtualRow.index, shiftKey)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
