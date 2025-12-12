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
import { useMobileDetection } from '@/hooks/useMobileDetection';
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
  const isMobile = useMobileDetection();
  const [filters, setFilters] = useState<ComponentFiltersState>({});
  const [selectedComponentIds, setSelectedComponentIds] = useState<Set<string>>(new Set());
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  // Get filtered components
  const { data: components = [], isLoading } = useComponents(projectId, filters);
  // Get total component count (unfiltered)
  const { data: allComponents = [] } = useComponents(projectId, {});
  const { sortRules, sortComponents, handleSort, resetToDefaultSort, getSortInfo } = useComponentSort();

  // Sort components using the hook
  const sortedComponents = useMemo(
    () => sortComponents(components),
    [components, sortComponents]
  );

  // Selection handlers
  const handleSelectionChange = (componentId: string, isSelected: boolean) => {
    setSelectedComponentIds(prev => {
      const next = new Set(prev);
      if (isSelected) {
        next.add(componentId);
      } else {
        next.delete(componentId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedComponentIds(new Set(sortedComponents.map(c => c.id)));
  };

  const handleClearSelection = () => {
    setSelectedComponentIds(new Set());
  };

  // Compute selection state
  const allSelected = selectedComponentIds.size === sortedComponents.length && sortedComponents.length > 0;
  const someSelected = selectedComponentIds.size > 0 && !allSelected;

  // View handler (opens detail modal)
  const handleViewComponent = (component: any) => {
    setSelectedComponentId(component.id);
  };

  const handleAssignSuccess = () => {
    setSelectedComponentIds(new Set());
    setShowAssignDialog(false);
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  // Clear all filters handler
  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <Layout>
      <div className="mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 space-y-4">
          <h1 className="text-2xl font-bold">Components</h1>

          {/* Filters */}
          <ComponentFilters
            projectId={projectId}
            onFilterChange={setFilters}
            filteredCount={sortedComponents.length}
            totalCount={allComponents.length}
          />

          {/* Assign Button */}
          {selectedComponentIds.size > 0 && (
            <Button onClick={() => setShowAssignDialog(true)}>
              Assign {selectedComponentIds.size} Component
              {selectedComponentIds.size !== 1 ? 's' : ''}
            </Button>
          )}
        </div>

        {/* Component List */}
        <div className="bg-white rounded-lg shadow h-[calc(100vh-280px)]">
          <ComponentList
            components={sortedComponents}
            onComponentClick={undefined}
            isLoading={isLoading}
            getSortInfo={getSortInfo}
            onSort={handleSort}
            sortRules={sortRules}
            onResetSort={resetToDefaultSort}
            selectedIds={selectedComponentIds}
            onSelectionChange={handleSelectionChange}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            allSelected={allSelected}
            someSelected={someSelected}
            onViewComponent={handleViewComponent}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
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
                defaultTab={isMobile ? 'milestones' : 'overview'}
                onMetadataChange={() => {
                  // Optionally refetch components list
                }}
                onClose={() => setSelectedComponentId(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Assign Dialog */}
        <ComponentAssignDialog
          projectId={projectId}
          componentIds={Array.from(selectedComponentIds)}
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
          onSuccess={handleAssignSuccess}
        />
      </div>
    </Layout>
  );
}
