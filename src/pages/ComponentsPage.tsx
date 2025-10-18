/**
 * ComponentsPage (Feature 007)
 * Main page for viewing and managing components with filtering and assignment
 */

import { useState } from 'react';
import { ComponentFilters, ComponentFiltersState } from '@/components/ComponentFilters';
import { ComponentList } from '@/components/ComponentList';
import { ComponentAssignDialog } from '@/components/ComponentAssignDialog';
import { ComponentDetailView } from '@/components/ComponentDetailView';
import { useComponents } from '@/hooks/useComponents';
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

  const handleComponentClick = (component: any) => {
    setSelectedComponentId(component.id);
  };

  const handleAssignSuccess = () => {
    setSelectedComponentIds([]);
    setShowAssignDialog(false);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Components</h1>
          <p className="text-muted-foreground">
            View, filter, and track component progress
          </p>
        </div>

        {selectedComponentIds.length > 0 && (
          <Button onClick={() => setShowAssignDialog(true)}>
            Assign {selectedComponentIds.length} Component
            {selectedComponentIds.length !== 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Filters */}
      <ComponentFilters projectId={projectId} onFilterChange={setFilters} />

      {/* Component List */}
      <ComponentList
        components={components}
        onComponentClick={handleComponentClick}
        isLoading={isLoading}
      />

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
  );
}
