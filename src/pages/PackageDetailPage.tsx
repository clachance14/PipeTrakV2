/**
 * Component: PackageDetailPage
 * Feature: 030-test-package-workflow (User Stories 3 & 4)
 *
 * Drill-down page showing test package details with tabbed interface:
 * - Certificate: Form to fill out test certificate (US3)
 * - Workflow: 7-stage workflow stepper with sign-offs (US4)
 * - Components: List of all components in package
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Layout } from '@/components/Layout';
import { useProject } from '@/contexts/ProjectContext';
import { usePackageComponents, usePackageReadiness, usePackageDetails } from '@/hooks/usePackages';
import { usePackageCompletionReport } from '@/hooks/usePackageCompletionReport';
import { getKeyStages, formatStageForDisplay, getWorkflowSummary } from '@/lib/getKeyStages';
import { useDeleteComponentAssignment, useCreateComponentAssignments, useDrawingsWithComponentCount } from '@/hooks/usePackageAssignments';
import { useBulkUpdatePostHydro } from '@/hooks/useBulkUpdatePostHydro';
import { usePackageWorkflow } from '@/hooks/usePackageWorkflow';
import { usePackageWorkflowPDFExport } from '@/hooks/usePackageWorkflowPDFExport';
import { usePDFPreviewState } from '@/hooks/usePDFPreviewState';
import { useOrganizationLogo } from '@/hooks/useOrganizationLogo';
import { usePackageWorkflowCustomizationStore } from '@/stores/usePackageWorkflowCustomizationStore';
import { usePackageWorkflowCustomization } from '@/hooks/usePackageWorkflowCustomization';
import type { PackageWorkflowPDFOptions } from '@/stores/usePackageWorkflowCustomizationStore';
// PackageCertificateForm removed - now only for creating new packages, not editing existing ones
import { PackageWorkflowStepper } from '@/components/packages/PackageWorkflowStepper';
import { DrawingSelectionList } from '@/components/packages/DrawingSelectionList';
import { PDFPreviewDialog } from '@/components/reports/PDFPreviewDialog';
import { PackageWorkflowCustomizationDialog } from '@/components/packages/PackageWorkflowCustomizationDialog';
import { ComponentMetadataModal } from '@/components/component-metadata/ComponentMetadataModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/EmptyState';
import { ArrowLeft, Package, AlertCircle, FileText, ClipboardList, Boxes, X, Trash2, Pencil, Plus, Download, Settings, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PackageDetailPage() {
  const { packageId } = useParams<{ packageId: string }>();
  const { selectedProjectId } = useProject();
  const navigate = useNavigate();
  // editCertificate state removed - certificate editing not yet implemented
  const [editMode, setEditMode] = useState(false);
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [componentToRemove, setComponentToRemove] = useState<string | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDrawingIds, setSelectedDrawingIds] = useState<string[]>([]);
  const [selectedAddComponentIds, setSelectedAddComponentIds] = useState<string[]>([]);
  const [metadataModalComponentId, setMetadataModalComponentId] = useState<string | null>(null);

  // Sorting state
  type SortField = 'drawing' | 'identity' | 'type' | 'progress';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('drawing');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Fetch package metadata for header
  const { data: packagesData, isLoading: packagesLoading } = usePackageReadiness(
    selectedProjectId || ''
  );

  // Fetch package details (including test_type)
  const { data: packageDetails } = usePackageDetails(packageId);

  // Fetch workflow stages for PDF export
  const { data: workflowStages } = usePackageWorkflow(packageId || '');

  // PDF export hook
  const { generatePDFPreview, isGenerating: isPDFGenerating } = usePackageWorkflowPDFExport();

  // PDF preview state
  const { previewState, openPreview, updatePreview, closePreview } = usePDFPreviewState();
  const { data: companyLogo } = useOrganizationLogo();

  // PDF customization store
  const { options: pdfOptions, setOptions: setPDFOptions } = usePackageWorkflowCustomizationStore();

  // Customization modal state
  const {
    customizationState,
    openCustomization,
    closeCustomization,
  } = usePackageWorkflowCustomization();

  // Regeneration loading state
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Fetch completion report data for Summary tab
  const { data: completionReportData, isLoading: completionReportLoading } = usePackageCompletionReport(
    packageId,
    selectedProjectId || ''
  );

  // Fetch components in this package
  const {
    data: components,
    isLoading: componentsLoading,
    isError,
    error,
    refetch,
  } = usePackageComponents(packageId, selectedProjectId || '');

  // Find package metadata from readiness data
  // Note: description field added in migration 00028
  const foundPackage = packagesData?.find((pkg) => pkg.package_id === packageId);
  const packageData = foundPackage ? {
    ...foundPackage,
    description: (foundPackage as any).description || null,
  } : undefined;

  // Fetch available drawings with component counts (for adding components)
  const { data: availableDrawings = [] } = useDrawingsWithComponentCount(
    selectedProjectId || ''
  );

  // Delete component assignment mutation
  const deleteComponentAssignment = useDeleteComponentAssignment(
    packageId || '',
    selectedProjectId || ''
  );

  // Create component assignment mutation
  const createComponentAssignment = useCreateComponentAssignments(
    packageId || '',
    selectedProjectId || ''
  );

  // Post-hydro bulk update mutation
  const updatePostHydro = useBulkUpdatePostHydro();

  // Handler for single component post-hydro toggle
  const handleTogglePostHydro = async (componentId: string, postHydro: boolean) => {
    try {
      await updatePostHydro.mutateAsync({
        componentIds: [componentId],
        postHydroInstall: postHydro,
      });
      refetch();
    } catch {
      toast.error('Failed to update post-hydro status');
    }
  };

  // Handler for bulk post-hydro update
  const handleBulkPostHydro = async (postHydro: boolean) => {
    if (selectedComponentIds.length === 0) return;
    try {
      await updatePostHydro.mutateAsync({
        componentIds: selectedComponentIds,
        postHydroInstall: postHydro,
      });
      toast.success(`${postHydro ? 'Marked' : 'Cleared'} ${selectedComponentIds.length} component(s) as post-hydro`);
      setSelectedComponentIds([]);
      refetch();
    } catch {
      toast.error('Failed to update post-hydro status');
    }
  };

  // Handlers for component removal
  const handleRemoveComponent = (componentId: string) => {
    setComponentToRemove(componentId);
    setShowRemoveDialog(true);
  };

  const handleRemoveBulk = () => {
    if (selectedComponentIds.length > 0) {
      setShowRemoveDialog(true);
    }
  };

  const confirmRemoval = async () => {
    const idsToRemove = componentToRemove
      ? [componentToRemove]
      : selectedComponentIds;

    for (const id of idsToRemove) {
      await deleteComponentAssignment.mutateAsync({ componentId: id, reason: removalReason });
    }

    // Reset state
    setShowRemoveDialog(false);
    setComponentToRemove(null);
    setSelectedComponentIds([]);
    setRemovalReason('');
    setEditMode(false);
    refetch();
  };

  const handleSelectAll = () => {
    if (selectedComponentIds.length === components?.length) {
      setSelectedComponentIds([]);
    } else {
      setSelectedComponentIds(components?.map((c) => c.id) || []);
    }
  };

  const handleToggleComponent = (componentId: string) => {
    setSelectedComponentIds((prev) =>
      prev.includes(componentId)
        ? prev.filter((id) => id !== componentId)
        : [...prev, componentId]
    );
  };

  // Handle column sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sorted components
  const sortedComponents = useMemo(() => {
    if (!components) return [];

    return [...components].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'drawing':
          // Natural string sort for drawing numbers (P-001, P-002, P-010)
          comparison = (a.drawing_no_norm || '').localeCompare(b.drawing_no_norm || '', undefined, {
            numeric: true,
            sensitivity: 'base',
          });
          break;

        case 'identity':
          // Sort by identity_key using natural string comparison
          comparison = (a.identity_key || '').localeCompare(b.identity_key || '', undefined, {
            numeric: true,
            sensitivity: 'base',
          });
          break;

        case 'type':
          // Alphabetical sort for component type
          comparison = (a.component_type || '').localeCompare(b.component_type || '');
          break;

        case 'progress':
          // Numeric sort for progress percentage
          comparison = (a.percent_complete || 0) - (b.percent_complete || 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [components, sortField, sortDirection]);

  // Handlers for adding components
  const handleAddComponents = () => {
    setShowAddDialog(true);
  };

  const confirmAddComponents = async () => {
    if (selectedAddComponentIds.length === 0) return;

    await createComponentAssignment.mutateAsync({
      package_id: packageId || '',
      component_ids: selectedAddComponentIds,
    });

    // Reset state
    setShowAddDialog(false);
    setSelectedDrawingIds([]);
    setSelectedAddComponentIds([]);
    refetch();
  };

  // No project selected
  if (!selectedProjectId) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            icon={Package}
            title="No Project Selected"
            description="Please select a project from the dropdown to view test package details."
          />
        </div>
      </Layout>
    );
  }

  // Loading state
  if (packagesLoading || componentsLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate('/packages')} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Packages
            </Button>
            <div className="h-8 bg-gray-100 rounded w-1/3 animate-pulse mb-2" />
            <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
          </div>
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (isError) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate('/packages')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Packages
          </Button>
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Failed to load package components
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Package not found
  if (!packageData) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate('/packages')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Packages
          </Button>
          <EmptyState
            icon={Package}
            title="Package Not Found"
            description="The requested test package could not be found."
          />
        </div>
      </Layout>
    );
  }

  const progress = packageData.avg_percent_complete
    ? Math.round(packageData.avg_percent_complete)
    : 0;

  const statusColor =
    Number(packageData.blocker_count) > 0
      ? 'amber'
      : progress === 100
      ? 'green'
      : 'blue';

  const progressColorClass = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
  }[statusColor];

  // PDF Customization Handlers
  const handleEditReport = () => {
    openCustomization(pdfOptions);
  };

  const handleSaveCustomization = async (newOptions: PackageWorkflowPDFOptions) => {
    // Save to store
    setPDFOptions(newOptions);
    closeCustomization();

    // If preview is open, regenerate automatically
    if (previewState.open && packageDetails && workflowStages) {
      setIsRegenerating(true);
      try {
        const { blob, url, filename } = await generatePDFPreview(
          {
            name: packageDetails.name,
            description: packageDetails.description,
            test_type: packageDetails.test_type,
            target_date: packageDetails.target_date,
            requires_coating: packageDetails.requires_coating,
            requires_insulation: packageDetails.requires_insulation,
          },
          workflowStages,
          packageData.package_name || 'Unknown Project',
          companyLogo ?? undefined,
          newOptions // Use new options
        );
        updatePreview(blob, url, filename); // Update existing preview
        toast.success('PDF regenerated with new settings');
      } catch (error) {
        toast.error('Failed to regenerate PDF');
        console.error(error);
      } finally {
        setIsRegenerating(false);
      }
    }
  };

  const handleExportPDF = async () => {
    if (!packageDetails || !workflowStages) return;
    try {
      const { blob, url, filename } = await generatePDFPreview(
        {
          name: packageDetails.name,
          description: packageDetails.description,
          test_type: packageDetails.test_type,
          target_date: packageDetails.target_date,
          requires_coating: packageDetails.requires_coating,
          requires_insulation: packageDetails.requires_insulation,
        },
        workflowStages,
        packageData.package_name || 'Unknown Project',
        companyLogo ?? undefined,
        pdfOptions // Use saved options
      );
      openPreview(blob, url, filename);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleEditFromPreview = () => {
    openCustomization(pdfOptions);
  };

  return (
    <Layout>
      {/* PDF Preview Dialog */}
      <PDFPreviewDialog
        open={previewState.open}
        onClose={closePreview}
        previewUrl={previewState.url}
        blob={previewState.blob}
        filename={previewState.filename}
        onEditSettings={handleEditFromPreview}
        isRegenerating={isRegenerating}
      />

      {/* PDF Customization Dialog */}
      <PackageWorkflowCustomizationDialog
        open={customizationState.isOpen}
        onClose={closeCustomization}
        onSave={handleSaveCustomization}
        initialOptions={customizationState.tempOptions || pdfOptions}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Back button and actions */}
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/packages')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Packages
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/packages/${packageId}/completion-report`)}
            className="gap-2"
          >
            <ClipboardList className="h-4 w-4" />
            View Completion Report
          </Button>
        </div>

        {/* Package Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {packageData.package_name}
              </h1>
              {packageData.description && (
                <p className="text-gray-600">{packageData.description}</p>
              )}
            </div>
            {packageData.target_date && (
              <div className="text-sm text-gray-600">
                Target: {new Date(packageData.target_date).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Overall Progress</span>
              <span className="text-sm font-semibold text-gray-900">{progress}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full transition-all duration-300', progressColorClass)}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span>{Number(packageData.total_components)} components</span>
            {Number(packageData.blocker_count) > 0 && (
              <span className="text-amber-600 font-medium">
                {packageData.blocker_count} blockers
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList>
            <TabsTrigger value="summary">
              <FileText className="h-4 w-4 mr-2" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="workflow">
              <ClipboardList className="h-4 w-4 mr-2" />
              Workflow
            </TabsTrigger>
            <TabsTrigger value="components">
              <Boxes className="h-4 w-4 mr-2" />
              Components ({components?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab - Paper/Document Style */}
          <TabsContent value="summary" className="space-y-6">
            {completionReportLoading ? (
              <div className="space-y-4">
                <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
              </div>
            ) : completionReportData ? (
              <div className="bg-white border border-gray-200 shadow-sm max-w-3xl mx-auto">
                {/* Paper-like document with padding */}
                <div className="px-12 py-10">
                  {/* Document Header */}
                  <div className="text-center border-b-2 border-gray-800 pb-6 mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight uppercase">
                      Test Package Summary
                    </h1>
                    <p className="text-lg text-gray-700 mt-2">{completionReportData.package_name}</p>
                  </div>

                  {/* Executive Summary Section */}
                  <section className="mb-10">
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-300 pb-2 mb-6">
                      Executive Summary
                    </h2>

                    <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Test Type</dt>
                        <dd className="mt-1 text-base text-gray-900">{completionReportData.test_type || 'Not specified'}</dd>
                      </div>

                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Test Pressure</dt>
                        <dd className="mt-1 text-base text-gray-900">
                          {completionReportData.test_pressure != null
                            ? `${completionReportData.test_pressure} ${completionReportData.test_pressure_unit || 'PSIG'}`
                            : 'Not specified'}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Piping Spec</dt>
                        <dd className="mt-1 text-base text-gray-900">{completionReportData.piping_spec || 'Not specified'}</dd>
                      </div>

                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Components</dt>
                        <dd className="mt-1 text-base text-gray-900">{completionReportData.total_components}</dd>
                      </div>

                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Welds</dt>
                        <dd className="mt-1 text-base text-gray-900">{completionReportData.overall_nde_summary.total_welds}</dd>
                      </div>

                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">X-rays Completed</dt>
                        <dd className="mt-1 text-base text-gray-900">
                          {completionReportData.overall_nde_summary.nde_pass_count + completionReportData.overall_nde_summary.nde_fail_count}
                        </dd>
                      </div>
                    </div>

                    {/* Workflow Progress - Featured */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <div className="flex items-baseline justify-between">
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Workflow Progress</dt>
                        <dd className="text-xl font-bold text-gray-900">
                          {(() => {
                            const summary = getWorkflowSummary(workflowStages);
                            return `${summary.completedStages}/${summary.totalStages}`;
                          })()}
                          {(() => {
                            const summary = getWorkflowSummary(workflowStages);
                            return summary.isComplete && (
                              <span className="ml-2 text-sm font-normal text-green-600">Complete</span>
                            );
                          })()}
                        </dd>
                      </div>
                    </div>
                  </section>

                  {/* Key Approvals Section */}
                  {workflowStages && workflowStages.length > 0 && (
                    <section>
                      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-300 pb-2 mb-6">
                        Key Approvals
                      </h2>

                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-300">
                            <th className="text-left py-2 font-medium text-gray-700">Stage</th>
                            <th className="text-left py-2 font-medium text-gray-700">Status</th>
                            <th className="text-left py-2 font-medium text-gray-700">Company Rep</th>
                            <th className="text-left py-2 font-medium text-gray-700">Client Rep</th>
                            <th className="text-right py-2 font-medium text-gray-700">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getKeyStages(workflowStages).map((stage, index) => {
                            const formatted = formatStageForDisplay(stage);
                            const isLast = index === getKeyStages(workflowStages).length - 1;
                            return (
                              <tr key={stage.id} className={cn(!isLast && 'border-b border-gray-100')}>
                                <td className="py-3 text-gray-900">{formatted.name}</td>
                                <td className="py-3">
                                  <span
                                    className={cn(
                                      formatted.status === 'completed' && 'text-green-700',
                                      formatted.status === 'skipped' && 'text-gray-500 italic',
                                      formatted.status === 'pending' && 'text-amber-600'
                                    )}
                                  >
                                    {formatted.status === 'completed'
                                      ? 'Completed'
                                      : formatted.status === 'skipped'
                                        ? 'Skipped'
                                        : 'Pending'}
                                  </span>
                                </td>
                                <td className="py-3 text-gray-600">{formatted.companyRep || '—'}</td>
                                <td className="py-3 text-gray-600">{formatted.clientRep || '—'}</td>
                                <td className="py-3 text-right text-gray-600">{formatted.completedDate || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </section>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 text-gray-500 text-center border rounded-lg bg-gray-50">
                <p>Unable to load package summary.</p>
              </div>
            )}
          </TabsContent>

          {/* Workflow Tab */}
          <TabsContent value="workflow">
            <div className="space-y-4">
              {/* PDF Export Actions - desktop only */}
              <div className="hidden lg:flex justify-end gap-2">
                <Button
                  onClick={handleEditReport}
                  disabled={isPDFGenerating || isRegenerating || !workflowStages || workflowStages.length === 0}
                  variant="outline"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Report
                </Button>
                <Button
                  onClick={handleExportPDF}
                  disabled={isPDFGenerating || isRegenerating || !workflowStages || workflowStages.length === 0}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isPDFGenerating || isRegenerating ? 'Generating...' : 'Export PDF'}
                </Button>
              </div>

              {packageId && <PackageWorkflowStepper packageId={packageId} />}
            </div>
          </TabsContent>

          {/* Components Tab */}
          <TabsContent value="components">
            {componentsLoading ? (
              <div className="text-center text-gray-500 py-8">Loading components...</div>
            ) : !components || components.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No components in this package"
                description="Components will appear here once they are assigned to this test package."
              />
            ) : (
              <div className="space-y-4">
                {/* Edit mode toggle */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {components.length} component{components.length !== 1 ? 's' : ''} in package
                  </div>
                  <div className="flex items-center gap-2">
                    {editMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddComponents}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Components
                      </Button>
                    )}
                    <Button
                      variant={editMode ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => {
                        setEditMode(!editMode);
                        setSelectedComponentIds([]);
                      }}
                    >
                      {editMode ? (
                        <>Done Editing</>
                      ) : (
                        <>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Components
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Actions header (only in edit mode) */}
                {editMode && selectedComponentIds.length > 0 && (
                  <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedComponentIds.length} component{selectedComponentIds.length !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkPostHydro(true)}
                        disabled={updatePostHydro.isPending}
                      >
                        Mark Post-Hydro
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkPostHydro(false)}
                        disabled={updatePostHydro.isPending}
                      >
                        Clear Post-Hydro
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveBulk}
                        disabled={deleteComponentAssignment.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Selected
                      </Button>
                    </div>
                  </div>
                )}

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {editMode && (
                          <th className="px-4 py-3 w-12">
                            <Checkbox
                              checked={
                                components.length > 0 &&
                                selectedComponentIds.length === components.length
                              }
                              onCheckedChange={handleSelectAll}
                            />
                          </th>
                        )}
                        <th className="px-4 py-3 text-left">
                          <button
                            onClick={() => handleSort('drawing')}
                            className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-gray-700"
                          >
                            Drawing
                            {sortField === 'drawing' && (
                              sortDirection === 'asc' ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )
                            )}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button
                            onClick={() => handleSort('identity')}
                            className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-gray-700"
                          >
                            Identity
                            {sortField === 'identity' && (
                              sortDirection === 'asc' ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )
                            )}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button
                            onClick={() => handleSort('type')}
                            className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-gray-700"
                          >
                            Type
                            {sortField === 'type' && (
                              sortDirection === 'asc' ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )
                            )}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button
                            onClick={() => handleSort('progress')}
                            className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-gray-700"
                          >
                            Progress
                            {sortField === 'progress' && (
                              sortDirection === 'asc' ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )
                            )}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 w-24">
                          Post-Hydro
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                          Milestones
                        </th>
                        {editMode && (
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 w-24">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedComponents.map((component) => {
                      const componentProgress = component.percent_complete || 0;
                      const milestones = component.milestones_config || [];
                      const isSelected = selectedComponentIds.includes(component.id);

                      return (
                        <tr
                          key={component.id}
                          className={cn(
                            'hover:bg-gray-50',
                            editMode && isSelected && 'bg-blue-50'
                          )}
                        >
                          {editMode && (
                            <td className="px-4 py-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleComponent(component.id)}
                              />
                            </td>
                          )}
                          <td className="px-4 py-3 text-sm">
                            {component.drawing_id ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/drawings?expanded=${component.drawing_id}`);
                                }}
                                className="text-blue-600 hover:underline cursor-pointer text-left"
                              >
                                {component.drawing_no_norm || '—'}
                              </button>
                            ) : (
                              <span className="text-gray-900">{component.drawing_no_norm || '—'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMetadataModalComponentId(component.id);
                              }}
                              className="text-blue-600 hover:underline cursor-pointer text-left"
                            >
                              {component.identityDisplay}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                            {component.component_type}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500"
                                  style={{ width: `${componentProgress}%` }}
                                />
                              </div>
                              <span className="text-gray-900 font-medium w-10 text-right">
                                {Math.round(componentProgress)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {editMode ? (
                              <Checkbox
                                checked={component.post_hydro_install || false}
                                onCheckedChange={(checked) => handleTogglePostHydro(component.id, !!checked)}
                                disabled={updatePostHydro.isPending}
                              />
                            ) : (
                              component.post_hydro_install && (
                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                  Post-Hydro
                                </Badge>
                              )
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              {milestones.map((milestone: any) => {
                                const milestoneState = component.current_milestones?.[milestone.name];

                                // Determine completion state
                                let isComplete = false;
                                let isPartialProgress = false;
                                let progressPercent = 0;

                                if (milestone.is_partial) {
                                  // Partial milestone (0-100)
                                  progressPercent = typeof milestoneState === 'number' ? milestoneState : 0;
                                  isComplete = progressPercent === 100;
                                  isPartialProgress = progressPercent > 0 && progressPercent < 100;
                                } else {
                                  // Discrete milestone (stored as 100 or 0, or legacy true/false)
                                  isComplete = milestoneState === 100 || milestoneState === 1 || milestoneState === true;
                                }

                                return (
                                  <div
                                    key={milestone.name}
                                    className={cn(
                                      'px-2 py-1 rounded text-xs font-medium',
                                      isComplete
                                        ? 'bg-green-500 text-white'
                                        : isPartialProgress
                                        ? 'bg-amber-400 text-amber-900'
                                        : 'bg-gray-200 text-gray-600'
                                    )}
                                    title={
                                      milestone.is_partial
                                        ? `${milestone.name}: ${progressPercent}%`
                                        : milestone.name
                                    }
                                  >
                                    {milestone.name}
                                    {milestone.is_partial && progressPercent > 0 && (
                                      <span className="ml-1">({progressPercent}%)</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          {editMode && (
                            <td className="px-4 py-3 text-sm">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveComponent(component.id)}
                                disabled={deleteComponentAssignment.isPending}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
                </div>
            )}

            {/* Remove Confirmation Dialog */}
            <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Remove {componentToRemove ? '1' : selectedComponentIds.length} Component
                    {componentToRemove || selectedComponentIds.length > 1 ? 's' : ''}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Component{componentToRemove || selectedComponentIds.length > 1 ? 's' : ''} will
                    be removed from this package and become unassigned. You can reassign them to
                    another package later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <label htmlFor="removal-reason" className="text-sm font-medium text-gray-900">
                    Reason for removal <span className="text-red-600">*</span>
                  </label>
                  <Textarea
                    id="removal-reason"
                    placeholder="e.g., Splitting package for different test types..."
                    value={removalReason}
                    onChange={(e) => setRemovalReason(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      setComponentToRemove(null);
                      setRemovalReason('');
                    }}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmRemoval}
                    disabled={!removalReason.trim()}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Add Components Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Add Components to Package</DialogTitle>
                  <DialogDescription>
                    Select drawings and components to add to this package. Drawings with all components assigned are greyed out.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-hidden">
                  <DrawingSelectionList
                    drawings={availableDrawings}
                    selectedDrawingIds={selectedDrawingIds}
                    selectedComponentIds={selectedAddComponentIds}
                    onDrawingSelectionChange={setSelectedDrawingIds}
                    onComponentSelectionChange={setSelectedAddComponentIds}
                    projectId={selectedProjectId || ''}
                    currentPackageId={packageId}
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddDialog(false);
                      setSelectedDrawingIds([]);
                      setSelectedAddComponentIds([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmAddComponents}
                    disabled={selectedAddComponentIds.length === 0 || createComponentAssignment.isPending}
                  >
                    {createComponentAssignment.isPending
                      ? 'Adding...'
                      : `Add ${selectedAddComponentIds.length} Component${selectedAddComponentIds.length !== 1 ? 's' : ''}`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>

      {/* Component Metadata Modal */}
      <ComponentMetadataModal
        componentId={metadataModalComponentId || ''}
        open={!!metadataModalComponentId}
        onClose={() => setMetadataModalComponentId(null)}
        onMetadataChange={() => refetch()}
      />
    </Layout>
  );
}
