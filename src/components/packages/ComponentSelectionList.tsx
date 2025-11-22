/**
 * Component Selection List Component
 * Feature 030 - Test Package Lifecycle Workflow - User Story 2
 *
 * Multi-select list of components with area/system filters and assignment status (FR-009, FR-010, FR-012).
 * Shows which components are already assigned to other packages (uniqueness validation).
 */

import { useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package as PackageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComponentWithAssignmentStatus } from '@/types/assignment.types';
import { useAreas } from '@/hooks/useAreas';
import { useSystems } from '@/hooks/useSystems';

export interface ComponentSelectionListProps {
  components: ComponentWithAssignmentStatus[];
  selectedComponentIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  isLoading?: boolean;
  projectId: string;
}

/**
 * Renders filterable multi-select list of components with assignment status
 *
 * Features:
 * - Checkbox selection for multiple components
 * - Area filter dropdown
 * - System filter dropdown
 * - Assignment status badges (shows if component is already assigned)
 * - Conflict warnings (prevents selecting already-assigned components)
 *
 * Used by PackageCreateDialog for component-based assignment mode.
 */
export function ComponentSelectionList({
  components,
  selectedComponentIds,
  onSelectionChange,
  isLoading = false,
  projectId,
}: ComponentSelectionListProps) {
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);

  const { data: areas = [] } = useAreas(projectId);
  const { data: systems = [] } = useSystems(projectId);

  // Filter components by area and system
  const filteredComponents = useMemo(() => {
    let filtered = components;

    if (selectedAreaId) {
      filtered = filtered.filter((c) => c.area_id === selectedAreaId);
    }

    if (selectedSystemId) {
      filtered = filtered.filter((c) => c.system_id === selectedSystemId);
    }

    return filtered;
  }, [components, selectedAreaId, selectedSystemId]);

  // Separate assignable and conflicting components
  const { assignableComponents, conflictingComponents } = useMemo(() => {
    const assignable = filteredComponents.filter((c) => c.can_assign);
    const conflicting = filteredComponents.filter((c) => !c.can_assign);

    return { assignableComponents: assignable, conflictingComponents: conflicting };
  }, [filteredComponents]);

  const handleToggleComponent = (componentId: string, canAssign: boolean) => {
    if (!canAssign) {
      // Don't allow selecting components that are already assigned
      return;
    }

    const isSelected = selectedComponentIds.includes(componentId);

    if (isSelected) {
      onSelectionChange(selectedComponentIds.filter((id) => id !== componentId));
    } else {
      onSelectionChange([...selectedComponentIds, componentId]);
    }
  };

  const handleSelectAll = () => {
    const visibleAssignableIds = assignableComponents.map((c) => c.id);
    const allVisibleSelected = visibleAssignableIds.every((id) =>
      selectedComponentIds.includes(id)
    );

    if (allVisibleSelected) {
      // Deselect only the currently visible assignable components
      onSelectionChange(
        selectedComponentIds.filter((id) => !visibleAssignableIds.includes(id))
      );
    } else {
      // Add all visible assignable components to the current selection
      const next = new Set(selectedComponentIds);
      visibleAssignableIds.forEach((id) => next.add(id));
      onSelectionChange(Array.from(next));
    }
  };

  const totalSelectedComponents = selectedComponentIds.length;

  // Helper to display component identity
  const getComponentIdentity = (component: ComponentWithAssignmentStatus): string => {
    const identityKey = component.identity_key as Record<string, unknown>;

    // Try common identity patterns
    if (identityKey.spool_id) return `Spool ${identityKey.spool_id}`;
    if (identityKey.weld_id) return `Weld ${identityKey.weld_id}`;
    if (identityKey.tag) return `${identityKey.tag}`;
    if (identityKey.valve_tag) return `${identityKey.valve_tag}`;

    // Fallback to component type
    return component.component_type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        Loading components...
      </div>
    );
  }

  if (components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <PackageIcon className="h-12 w-12 mb-2 text-gray-400" />
        <p>No components found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="area-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Area
          </label>
          <select
            id="area-filter"
            value={selectedAreaId || ''}
            onChange={(e) => setSelectedAreaId(e.target.value || null)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Areas</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="system-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by System
          </label>
          <select
            id="system-filter"
            value={selectedSystemId || ''}
            onChange={(e) => setSelectedSystemId(e.target.value || null)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Systems</option>
            {systems.map((system) => (
              <option key={system.id} value={system.id}>
                {system.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Header with select all */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all"
            checked={
              assignableComponents.length > 0 &&
              assignableComponents
                .map((c) => c.id)
                .every((id) => selectedComponentIds.includes(id))
            }
            onCheckedChange={handleSelectAll}
            disabled={assignableComponents.length === 0}
          />
          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
            Select All ({assignableComponents.length} available)
          </label>
        </div>
        {totalSelectedComponents > 0 && (
          <div className="text-sm text-gray-600">
            <PackageIcon className="inline h-4 w-4 mr-1" />
            {totalSelectedComponents} selected
          </div>
        )}
      </div>

      {/* Scrollable list */}
      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {/* Assignable components */}
          {assignableComponents.map((component) => {
            const isSelected = selectedComponentIds.includes(component.id);
            const identity = getComponentIdentity(component);

            return (
              <div
                key={component.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors',
                  isSelected
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                )}
                onClick={() => handleToggleComponent(component.id, component.can_assign)}
              >
                <Checkbox
                  id={`component-${component.id}`}
                  checked={isSelected}
                  onCheckedChange={() => handleToggleComponent(component.id, component.can_assign)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor={`component-${component.id}`}
                      className="font-medium text-sm cursor-pointer"
                    >
                      {identity}
                    </label>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full flex-shrink-0">
                      {component.component_type}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Conflicting components (already assigned) */}
          {conflictingComponents.map((component) => {
            const identity = getComponentIdentity(component);

            return (
              <div
                key={component.id}
                className="flex items-start gap-3 p-3 rounded-md border border-red-200 bg-red-50 opacity-60 cursor-not-allowed"
              >
                <Checkbox
                  id={`component-${component.id}`}
                  checked={false}
                  disabled={true}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor={`component-${component.id}`}
                      className="font-medium text-sm text-gray-700"
                    >
                      {identity}
                    </label>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full flex-shrink-0">
                      {component.component_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3 text-red-600" />
                    <p className="text-xs text-red-700">
                      Already assigned to {component.test_package_name}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredComponents.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No components match the selected filters
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
