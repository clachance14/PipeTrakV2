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
