/**
 * ComponentsPage (Feature 007)
 * Main page for viewing and managing components with filtering and assignment
 */

import { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { ComponentFilters, ComponentFiltersState } from '@/components/ComponentFilters';
import { ComponentList } from '@/components/ComponentList';
import { ComponentAssignDialog } from '@/components/ComponentAssignDialog';
import { ComponentDetailView } from '@/components/ComponentDetailView';
import { ComponentsBulkActions } from '@/components/ComponentsBulkActions';
import { useComponents } from '@/hooks/useComponents';
import { useComponentSort } from '@/hooks/useComponentSort';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { useBulkReceiveComponents } from '@/hooks/useBulkReceiveComponents';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface ComponentsPageProps {
  projectId: string;
  canUpdateMilestones?: boolean;
}

export function ComponentsPage({
  projectId,
  canUpdateMilestones = false,
}: ComponentsPageProps) {
  const isMobile = useMobileDetection();
  const { user } = useAuth();
  const { bulkReceive, isProcessing } = useBulkReceiveComponents();
  const [filters, setFilters] = useState<ComponentFiltersState>({});
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const [selectedComponentIds, setSelectedComponentIds] = useState<Set<string>>(new Set());
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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

  // Sync debounced search with filters
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch || undefined }));
  }, [debouncedSearch]);

  // Prune selection when filtered results change (remove IDs no longer in view)
  useEffect(() => {
    setSelectedComponentIds(prev => {
      const visibleIds = new Set(sortedComponents.map(c => c.id));
      const pruned = new Set([...prev].filter(id => visibleIds.has(id)));
      // Only update state if something was pruned
      if (pruned.size !== prev.size) {
        return pruned;
      }
      return prev;
    });
  }, [sortedComponents]);

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

  const handleSelectionChangeMany = (componentIds: string[], isSelected: boolean) => {
    setSelectedComponentIds(prev => {
      const next = new Set(prev);
      componentIds.forEach(id => {
        if (isSelected) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedComponentIds(new Set(sortedComponents.map(c => c.id)));
  };

  const handleClearSelection = () => {
    setSelectedComponentIds(new Set());
  };

  const handleToggleSelectionMode = () => {
    if (selectionMode) {
      // When toggling OFF, clear selections
      handleClearSelection();
    }
    setSelectionMode(!selectionMode);
  };

  // Bulk receive handlers
  const handleMarkReceived = async () => {
    if (!user?.id || selectedComponentIds.size === 0) return;

    // Check if confirmation needed (>10 components)
    if (selectedComponentIds.size > 10) {
      setShowConfirmDialog(true);
      return;
    }

    // Execute directly for 10 or fewer
    await executeMarkReceived();
  };

  const executeMarkReceived = async () => {
    if (!user?.id) return;

    // Get selected components with their milestone data
    const selectedComponents = sortedComponents
      .filter(c => selectedComponentIds.has(c.id))
      .map(c => ({
        id: c.id,
        current_milestones: c.current_milestones as Record<string, boolean | number> | null,
      }));

    const result = await bulkReceive({
      projectId,
      components: selectedComponents,
      userId: user.id,
    });

    // Show summary toast
    if (result.failed > 0) {
      toast.error(`Updated ${result.updated}, failed ${result.failed}`);
    } else {
      toast.success(
        `Updated ${result.updated}${result.skipped > 0 ? `, skipped ${result.skipped} (already received)` : ''}`
      );
    }

    // Clear selections after successful bulk receive
    handleClearSelection();
  };

  const handleConfirmReceive = async () => {
    setShowConfirmDialog(false);
    await executeMarkReceived();
  };

  const handleCancelReceive = () => {
    setShowConfirmDialog(false);
  };

  // Compute selection state
  const allSelected = selectedComponentIds.size === sortedComponents.length && sortedComponents.length > 0;
  const someSelected = selectedComponentIds.size > 0 && !allSelected;

  // View handler (opens detail modal)
  const handleViewComponent = (component: { id: string }) => {
    setSelectedComponentId(component.id);
  };

  const handleAssignSuccess = () => {
    setSelectedComponentIds(new Set());
    setShowAssignDialog(false);
  };

  // Check if any filters are active (include search)
  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '') || searchTerm.length > 0;

  // Clear all filters handler
  const handleClearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  return (
    <Layout fixedHeight>
      <div className="flex flex-col h-full mx-auto px-4 py-2">
        {/* Toolbar Row: Title + Search + Filters + Count */}
        <div className="flex-shrink-0 flex flex-col lg:flex-row lg:items-center gap-2 mb-1">
          <h1 className="text-lg lg:text-xl font-bold text-slate-900 whitespace-nowrap">
            Components
          </h1>

          {/* Search */}
          <div className="lg:w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8"
              />
            </div>
          </div>

          {/* Filters - inline on desktop */}
          <div className="hidden lg:block flex-1">
            <ComponentFilters
              projectId={projectId}
              onFilterChange={setFilters}
              filteredCount={sortedComponents.length}
              totalCount={allComponents.length}
              searchTerm={debouncedSearch}
            />
          </div>

          {/* Count badge - desktop only */}
          <span className="hidden lg:inline text-sm text-slate-500 whitespace-nowrap">
            {sortedComponents.length}/{allComponents.length}
          </span>

          {/* Assign Button */}
          {selectedComponentIds.size > 0 && (
            <Button onClick={() => setShowAssignDialog(true)} size="sm" className="h-8">
              Assign {selectedComponentIds.size}
            </Button>
          )}
        </div>

        {/* Mobile Filters - shown only on mobile */}
        <div className="flex-shrink-0 mb-1 lg:hidden">
          <ComponentFilters
            projectId={projectId}
            onFilterChange={setFilters}
            filteredCount={sortedComponents.length}
            totalCount={allComponents.length}
            searchTerm={debouncedSearch}
          />
        </div>

        {/* Bulk Actions Bar - inline with less padding */}
        <div className="flex-shrink-0 mb-1">
          <ComponentsBulkActions
            selectionMode={selectionMode}
            onToggleSelectionMode={handleToggleSelectionMode}
            selectedCount={selectedComponentIds.size}
            onClearSelection={handleClearSelection}
            onMarkReceived={handleMarkReceived}
            isProcessing={isProcessing}
          />
        </div>

        {/* Component List - fills remaining space */}
        <div className="flex-1 overflow-hidden bg-white rounded-lg shadow">
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
            onSelectionChangeMany={handleSelectionChangeMany}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            allSelected={allSelected}
            someSelected={someSelected}
            onViewComponent={handleViewComponent}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
            selectionMode={selectionMode}
            onOpenDetails={(componentId) => handleViewComponent({ id: componentId })}
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

        {/* Bulk Receive Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Bulk Receive</AlertDialogTitle>
              <AlertDialogDescription>
                Mark {selectedComponentIds.size} components as Received? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelReceive}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmReceive}>
                Mark Received
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
