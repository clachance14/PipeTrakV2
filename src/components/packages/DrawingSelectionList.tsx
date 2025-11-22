/**
 * Drawing Selection List Component (Enhanced with Expandable Rows)
 * Feature 030 - Test Package Lifecycle Workflow - User Story 1
 *
 * Multi-select list of drawings with expandable component rows (FR-002, FR-008).
 * Shows components inherited from drawings with individual component selection override.
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, FileText, Package as PackageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { DrawingWithComponentCount } from '@/types/assignment.types';

export interface DrawingSelectionListProps {
  drawings: DrawingWithComponentCount[];
  selectedDrawingIds: string[];
  selectedComponentIds: string[];
  onDrawingSelectionChange: (selectedIds: string[]) => void;
  onComponentSelectionChange: (selectedIds: string[]) => void;
  projectId: string;
  isLoading?: boolean;
  currentPackageId?: string; // Optional: ID of package being edited (to show "already in this package")
}

interface ComponentRow {
  id: string;
  identity_key: Record<string, any>; // JSONB object
  component_type: string;
  test_package_id: string | null;
  test_packages?: { name: string } | null;
}

/**
 * Format component identity_key JSONB object to display string
 * Handles different component types (pipe, valve, equipment, etc.)
 */
function formatIdentityKey(identityKey: Record<string, any>, componentType: string): string {
  if (!identityKey || typeof identityKey !== 'object') {
    return 'Unknown';
  }

  // Handle different component type formats
  const values = Object.entries(identityKey)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([, value]) => String(value))
    .join('-');

  return values || componentType || 'Unknown';
}

/**
 * Renders filterable multi-select list of drawings with expandable component rows
 *
 * Features:
 * - Expandable rows showing components per drawing
 * - Hierarchical checkbox selection (drawing → all components)
 * - Individual component selection override
 * - Component count badge per drawing
 * - Areas preview (comma-separated)
 * - Loading state support
 *
 * Selection Logic:
 * - Checking a drawing selects all its unassigned components
 * - Unchecking a drawing deselects all its components
 * - Individual components can be toggled independently
 * - Drawing checkbox shows indeterminate state if some (but not all) components selected
 *
 * Used by PackageCreateDialog for drawing-based assignment mode.
 */
export function DrawingSelectionList({
  drawings,
  selectedDrawingIds,
  selectedComponentIds,
  onDrawingSelectionChange,
  onComponentSelectionChange,
  projectId,
  isLoading = false,
  currentPackageId,
}: DrawingSelectionListProps) {
  const [expandedDrawingIds, setExpandedDrawingIds] = useState<Set<string>>(new Set());

  // Query components for all drawings
  const { data: allComponents = [] } = useQuery({
    queryKey: ['drawing-components', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('components')
        .select('id, identity_key, component_type, drawing_id, test_package_id, test_packages(name)')
        .eq('project_id', projectId)
        .eq('is_retired', false)
        .order('identity_key');

      if (error) throw error;
      return data as (ComponentRow & { drawing_id: string })[];
    },
    enabled: drawings.length > 0,
  });

  // Group components by drawing
  const componentsByDrawing = useMemo(() => {
    const map = new Map<string, ComponentRow[]>();
    allComponents.forEach((comp) => {
      const drawingComps = map.get(comp.drawing_id) || [];
      drawingComps.push(comp);
      map.set(comp.drawing_id, drawingComps);
    });
    return map;
  }, [allComponents]);

  const toggleDrawingExpanded = useCallback((drawingId: string) => {
    setExpandedDrawingIds((prev) => {
      const next = new Set(prev);
      if (next.has(drawingId)) {
        next.delete(drawingId);
      } else {
        next.add(drawingId);
      }
      return next;
    });
  }, []);

  const handleToggleDrawing = useCallback(
    (drawingId: string) => {
      const components = componentsByDrawing.get(drawingId) || [];
      const unassignedCompIds = components
        .filter((c) => c.test_package_id === null)
        .map((c) => c.id);

      const isDrawingSelected = selectedDrawingIds.includes(drawingId);
      const allComponentsSelected = unassignedCompIds.every((id) =>
        selectedComponentIds.includes(id)
      );

      if (isDrawingSelected || allComponentsSelected) {
        // Deselect drawing and all its components
        onDrawingSelectionChange(selectedDrawingIds.filter((id) => id !== drawingId));
        onComponentSelectionChange(
          selectedComponentIds.filter((id) => !unassignedCompIds.includes(id))
        );
      } else {
        // Select drawing and all its unassigned components
        onDrawingSelectionChange([...selectedDrawingIds, drawingId]);
        onComponentSelectionChange([
          ...selectedComponentIds.filter((id) => !unassignedCompIds.includes(id)),
          ...unassignedCompIds,
        ]);
      }
    },
    [
      componentsByDrawing,
      selectedDrawingIds,
      selectedComponentIds,
      onDrawingSelectionChange,
      onComponentSelectionChange,
    ]
  );

  const handleToggleComponent = useCallback(
    (componentId: string, drawingId: string) => {
      const isSelected = selectedComponentIds.includes(componentId);

      if (isSelected) {
        // Deselect component and drawing
        onComponentSelectionChange(selectedComponentIds.filter((id) => id !== componentId));
        onDrawingSelectionChange(selectedDrawingIds.filter((id) => id !== drawingId));
      } else {
        // Select component
        const newComponentIds = [...selectedComponentIds, componentId];
        onComponentSelectionChange(newComponentIds);

        // Check if all components in this drawing are now selected
        const components = componentsByDrawing.get(drawingId) || [];
        const unassignedCompIds = components
          .filter((c) => c.test_package_id === null)
          .map((c) => c.id);
        const allSelected = unassignedCompIds.every((id) => newComponentIds.includes(id));

        if (allSelected && !selectedDrawingIds.includes(drawingId)) {
          onDrawingSelectionChange([...selectedDrawingIds, drawingId]);
        }
      }
    },
    [
      selectedComponentIds,
      selectedDrawingIds,
      componentsByDrawing,
      onComponentSelectionChange,
      onDrawingSelectionChange,
    ]
  );

  const getDrawingCheckboxState = useCallback(
    (drawingId: string) => {
      const components = componentsByDrawing.get(drawingId) || [];
      const unassignedCompIds = components
        .filter((c) => c.test_package_id === null)
        .map((c) => c.id);

      if (unassignedCompIds.length === 0) {
        return { checked: false, indeterminate: false };
      }

      const selectedCount = unassignedCompIds.filter((id) =>
        selectedComponentIds.includes(id)
      ).length;

      if (selectedCount === 0) {
        return { checked: false, indeterminate: false };
      } else if (selectedCount === unassignedCompIds.length) {
        return { checked: true, indeterminate: false };
      } else {
        return { checked: false, indeterminate: true };
      }
    },
    [componentsByDrawing, selectedComponentIds]
  );

  const totalSelectedComponents = useMemo(() => {
    return selectedComponentIds.length;
  }, [selectedComponentIds]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        Loading drawings...
      </div>
    );
  }

  if (drawings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <FileText className="h-12 w-12 mb-2 text-gray-400" />
        <p>No drawings found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with total count */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="text-sm font-medium">
          {drawings.length} drawing{drawings.length !== 1 ? 's' : ''} available
        </div>
        {totalSelectedComponents > 0 && (
          <div className="text-sm text-gray-600">
            <PackageIcon className="inline h-4 w-4 mr-1" />
            {totalSelectedComponents} component{totalSelectedComponents !== 1 ? 's' : ''} selected
          </div>
        )}
      </div>

      {/* Scrollable list */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-1">
          {drawings.map((drawing) => {
            const isExpanded = expandedDrawingIds.has(drawing.id);
            const components = componentsByDrawing.get(drawing.id) || [];
            const { checked, indeterminate } = getDrawingCheckboxState(drawing.id);

            return (
              <div key={drawing.id} className="border rounded-md overflow-hidden">
                {/* Drawing row */}
                <div
                  className={cn(
                    'flex items-center gap-3 p-3 bg-white transition-colors',
                    (checked || indeterminate) && 'bg-blue-50',
                    drawing.is_fully_assigned && 'opacity-50'
                  )}
                >
                  {/* Expand chevron */}
                  <button
                    type="button"
                    onClick={() => toggleDrawingExpanded(drawing.id)}
                    className="flex-shrink-0 p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 text-gray-500 transition-transform',
                        isExpanded && 'rotate-90'
                      )}
                    />
                  </button>

                  {/* Drawing checkbox */}
                  <Checkbox
                    id={`drawing-${drawing.id}`}
                    checked={indeterminate ? "indeterminate" : checked}
                    disabled={drawing.is_fully_assigned}
                    onCheckedChange={() => handleToggleDrawing(drawing.id)}
                    onClick={(e) => e.stopPropagation()}
                    title={
                      drawing.is_fully_assigned
                        ? 'All components on this drawing have been assigned to other packages'
                        : undefined
                    }
                  />

                  {/* Drawing info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor={`drawing-${drawing.id}`}
                        className={cn(
                          'font-medium text-sm',
                          drawing.is_fully_assigned ? 'cursor-not-allowed' : 'cursor-pointer'
                        )}
                      >
                        {drawing.drawing_no_norm}
                      </label>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full flex-shrink-0">
                        {drawing.is_fully_assigned
                          ? 'All assigned'
                          : drawing.assigned_count > 0
                          ? `${drawing.available_count}/${drawing.component_count} available`
                          : `${drawing.available_count} available`}
                      </span>
                    </div>
                    {drawing.title && (
                      <p className="text-xs text-gray-600 mt-0.5 truncate">{drawing.title}</p>
                    )}
                    {drawing.areas.length > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Areas: {drawing.areas.join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Expandable component rows */}
                {isExpanded && components.length > 0 && (
                  <div className="bg-gray-50 border-t">
                    {components.map((component) => {
                      const isComponentSelected = selectedComponentIds.includes(component.id);
                      const isInCurrentPackage = currentPackageId && component.test_package_id === currentPackageId;
                      const isAssignedToOtherPackage = component.test_package_id !== null && !isInCurrentPackage;
                      const isAlreadyAssigned = component.test_package_id !== null;

                      return (
                        <div
                          key={component.id}
                          className={cn(
                            'flex items-center gap-3 py-2 px-3 pl-14 text-sm',
                            isComponentSelected && 'bg-blue-100',
                            isAlreadyAssigned && 'opacity-50'
                          )}
                        >
                          <Checkbox
                            id={`component-${component.id}`}
                            checked={isComponentSelected}
                            disabled={isAlreadyAssigned}
                            onCheckedChange={() =>
                              handleToggleComponent(component.id, drawing.id)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                          <label
                            htmlFor={`component-${component.id}`}
                            className={cn(
                              'flex-1 cursor-pointer',
                              isAlreadyAssigned && 'cursor-not-allowed'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">
                                {formatIdentityKey(component.identity_key, component.component_type)}
                              </span>
                              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                {component.component_type}
                              </span>
                              {isInCurrentPackage && (
                                <span className="text-xs text-green-600 font-medium">
                                  (already in this package)
                                </span>
                              )}
                              {isAssignedToOtherPackage && (
                                <span className="text-xs text-gray-500">
                                  (assigned to {component.test_packages?.name || 'another package'})
                                </span>
                              )}
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* No components message */}
                {isExpanded && components.length === 0 && (
                  <div className="bg-gray-50 border-t py-3 px-3 pl-14 text-xs text-gray-500">
                    No components on this drawing
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
