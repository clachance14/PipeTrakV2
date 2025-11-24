/**
 * Package Create Dialog Component
 * Feature 030 - Test Package Lifecycle Workflow - User Story 1 & 2
 *
 * Dialog for creating test packages with drawing OR component assignment (FR-001 through FR-013).
 * Provides quick package creation flow with automatic component inheritance or direct selection.
 */

import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Package as PackageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useCreatePackage } from '@/hooks/usePackages';
import { useCreateWorkflowStages } from '@/hooks/usePackageWorkflow';
import {
  useDrawingsWithComponentCount,
} from '@/hooks/usePackageAssignments';
import { DrawingSelectionList } from './DrawingSelectionList';
import type { TestType } from '@/types/package.types';

interface PackageCreateDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TEST_TYPES: TestType[] = [
  'Hydrostatic Test',
  'Pneumatic Test',
  'Sensitive Leak Test',
  'Alternative Leak Test',
  'In-service Test',
  'Other',
];

/**
 * Dialog for creating test packages with drawing OR component assignment
 *
 * Features:
 * - Package name, description, test type, target date
 * - Tab-based assignment mode: "Select Drawings" OR "Select Components" (FR-011)
 * - Multi-select drawings with component count preview (FR-002, FR-008)
 * - Multi-select components with area/system filters (FR-009, FR-010)
 * - Automatic component inheritance from selected drawings (FR-007)
 * - Component uniqueness validation (FR-012, FR-013)
 * - Exclusive mode validation (prevent mixing drawings + components)
 * - Empty assignment prevention
 *
 * Flow:
 * 1. User fills package details
 * 2. User chooses assignment mode (Drawings tab OR Components tab)
 * 3. User selects drawings/components
 * 4. Preview shows total component count
 * 5. User creates package
 * 6. Assignments are created (drawings OR components, not both)
 */
export function PackageCreateDialog({
  projectId,
  open,
  onOpenChange,
}: PackageCreateDialogProps) {
  const queryClient = useQueryClient();
  const createPackageMutation = useCreatePackage(projectId);
  const createWorkflowStages = useCreateWorkflowStages();
  const { data: drawingsData, isLoading: drawingsLoading } =
    useDrawingsWithComponentCount(projectId);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [testType, setTestType] = useState<TestType>('Hydrostatic Test');
  const [testTypeOther, setTestTypeOther] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [requiresCoating, setRequiresCoating] = useState(false);
  const [requiresInsulation, setRequiresInsulation] = useState(false);
  const [testPressure, setTestPressure] = useState<string>(''); // String for input, convert to number on submit
  const [testPressureUnit, setTestPressureUnit] = useState<string>('PSIG');
  const [selectedDrawingIds, setSelectedDrawingIds] = useState<string[]>([]);
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [isCreatingAssignments, setIsCreatingAssignments] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setTestType('Hydrostatic Test');
      setTestTypeOther('');
      setTargetDate('');
      setRequiresCoating(false);
      setRequiresInsulation(false);
      setTestPressure('');
      setTestPressureUnit('PSIG');
      setSelectedDrawingIds([]);
      setSelectedComponentIds([]);
    }
  }, [open]);

  // Calculate preview stats
  const previewStats = useMemo(() => {
    return {
      count: selectedDrawingIds.length,
      componentCount: selectedComponentIds.length,
    };
  }, [selectedDrawingIds, selectedComponentIds]);

  // Validation
  const hasSelection = selectedComponentIds.length > 0;

  // Check if test type requires pressure
  const isPressureBasedTest = testType === 'Hydrostatic Test' || testType === 'Pneumatic Test';
  const pressureValue = testPressure.trim() ? parseFloat(testPressure) : null;
  const hasPressureIfRequired = !isPressureBasedTest || (pressureValue !== null && pressureValue > 0);

  const isFormValid =
    name.trim().length > 0 &&
    selectedComponentIds.length > 0 &&
    hasPressureIfRequired &&
    !createPackageMutation.isPending &&
    !isCreatingAssignments;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) return;

    createPackage();
  };

  const createPackage = async () => {
    const trimmedName = name.trim();
    const finalTestType = testType === 'Other' ? testTypeOther.trim() : testType;

    // Parse test pressure (only for pressure-based tests)
    const finalTestPressure = isPressureBasedTest && testPressure.trim()
      ? parseFloat(testPressure)
      : null;

    // Create package
    createPackageMutation.mutate(
      {
        p_project_id: projectId,
        p_name: trimmedName,
        p_description: description.trim() || null,
        p_test_type: finalTestType,
        p_target_date: targetDate || null,
        p_requires_coating: requiresCoating,
        p_requires_insulation: requiresInsulation,
        p_test_pressure: finalTestPressure,
        p_test_pressure_unit: isPressureBasedTest ? testPressureUnit : undefined,
      },
      {
        onSuccess: async (packageId: string) => {
          console.log('[PackageCreate] Package created with ID:', packageId);
          console.log('[PackageCreate] Selected drawings:', selectedDrawingIds);
          console.log('[PackageCreate] Selected components:', selectedComponentIds);

          // Create workflow stages based on test type and requirements
          try {
            console.log('[PackageCreate] Creating workflow stages...');
            await createWorkflowStages.mutateAsync({
              packageId,
              testType: finalTestType,
              requiresCoating,
              requiresInsulation,
            });
            console.log('[PackageCreate] Workflow stages created');
          } catch (error: any) {
            console.error('[PackageCreate] Failed to create workflow stages:', error);
            toast.error('Package created but workflow stages failed: ' + error.message);
          }

          // After package created, create assignments if any were selected
          if (hasSelection) {
            setIsCreatingAssignments(true);

            try {
              // Create drawing assignments (for audit trail)
              if (selectedDrawingIds.length > 0) {
                console.log('[PackageCreate] Creating drawing assignments...');
                const { data: assignmentData, error: assignmentError } = await supabase
                  .from('package_drawing_assignments')
                  .insert(
                    selectedDrawingIds.map((drawingId) => ({
                      package_id: packageId,
                      drawing_id: drawingId,
                    }))
                  )
                  .select();

                if (assignmentError) {
                  console.error('[PackageCreate] Drawing assignment error:', assignmentError);
                  throw assignmentError;
                }
                console.log('[PackageCreate] Drawing assignments created:', assignmentData);

                // Invalidate package drawing queries
                queryClient.invalidateQueries({ queryKey: ['package-drawing-assignments', packageId] });

                // Update drawings table to set test_package_id (so it shows in drawing rows)
                console.log('[PackageCreate] Updating drawings.test_package_id...');
                const { data: drawingUpdateData, error: drawingUpdateError } = await supabase
                  .from('drawings')
                  .update({ test_package_id: packageId })
                  .in('id', selectedDrawingIds)
                  .select();

                if (drawingUpdateError) {
                  console.error('[PackageCreate] Drawing update error:', drawingUpdateError);
                  throw drawingUpdateError;
                }
                console.log('[PackageCreate] Drawings updated:', drawingUpdateData?.length || 0);

                // Invalidate drawing-related queries
                queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'drawings'] });
                queryClient.invalidateQueries({ queryKey: ['drawings-with-progress', { project_id: projectId }] });
                queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] });
              }

              // Assign selected components
              console.log('[PackageCreate] Assigning selected components...');
              console.log('[PackageCreate] Component IDs:', selectedComponentIds);

              const { data: componentData, error: componentError } = await supabase
                .from('components')
                .update({ test_package_id: packageId })
                .in('id', selectedComponentIds)
                .select();

              if (componentError) {
                console.error('[PackageCreate] Component assignment error:', componentError);
                throw componentError;
              }
              console.log('[PackageCreate] Components assigned:', componentData?.length || 0);

              // Invalidate all component and package-related queries
              queryClient.invalidateQueries({ queryKey: ['components'] });
              queryClient.invalidateQueries({ queryKey: ['drawing-components', projectId] });
              queryClient.invalidateQueries({ queryKey: ['drawings-component-count', projectId] });
              queryClient.invalidateQueries({ queryKey: ['package-components', { package_id: packageId }] });
              queryClient.invalidateQueries({ queryKey: ['package-readiness', projectId] });
              queryClient.invalidateQueries({ queryKey: ['package-readiness'] });

              const componentCount = componentData?.length || 0;
              toast.success(
                `Package created with ${componentCount} component${componentCount !== 1 ? 's' : ''}`
              );
            } catch (error: any) {
              console.error('[PackageCreate] Assignment failed:', error);
              toast.error('Package created but failed to assign components: ' + error.message);
            } finally {
              setIsCreatingAssignments(false);
            }
          } else {
            toast.success('Package created');
          }

          onOpenChange(false);
        },
        onError: (error: any) => {
          toast.error('Failed to create package: ' + error.message);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Test Package</DialogTitle>
            <DialogDescription>
              Create a test package and select drawings. Expand drawings to choose specific
              components.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Package Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Package Details</h3>

              {/* Package Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Package Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Area 100 Hydro Test"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>

              {/* Test Type */}
              <div className="space-y-2">
                <Label htmlFor="test-type">
                  Test Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={testType}
                  onValueChange={(value) => setTestType(value as TestType)}
                >
                  <SelectTrigger id="test-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEST_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Test Type Other (conditional) */}
              {testType === 'Other' && (
                <div className="space-y-2">
                  <Label htmlFor="test-type-other">
                    Specify Test Type <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="test-type-other"
                    value={testTypeOther}
                    onChange={(e) => setTestTypeOther(e.target.value)}
                    placeholder="Enter custom test type"
                    required
                  />
                </div>
              )}

              {/* Test Pressure (conditional - for pressure-based tests) */}
              {isPressureBasedTest && (
                <div className="space-y-4 border-t pt-4">
                  <Label className="text-sm font-medium">
                    Test Pressure <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-gray-500">
                    Specify the designed test pressure for this {testType}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Pressure Value */}
                    <div className="space-y-2">
                      <Label htmlFor="test-pressure" className="text-xs">
                        Pressure
                      </Label>
                      <Input
                        id="test-pressure"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={testPressure}
                        onChange={(e) => setTestPressure(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    {/* Pressure Unit */}
                    <div className="space-y-2">
                      <Label htmlFor="pressure-unit" className="text-xs">
                        Unit
                      </Label>
                      <Select
                        value={testPressureUnit}
                        onValueChange={setTestPressureUnit}
                      >
                        <SelectTrigger id="pressure-unit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PSIG">PSIG</SelectItem>
                          <SelectItem value="BAR">BAR</SelectItem>
                          <SelectItem value="KPA">KPA</SelectItem>
                          <SelectItem value="PSI">PSI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Target Date */}
              <div className="space-y-2">
                <Label htmlFor="target-date">Target Date</Label>
                <Input
                  id="target-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>

              {/* Workflow Requirements */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-medium">Workflow Requirements</Label>
                <p className="text-xs text-gray-500">
                  Select additional stages required for this package
                </p>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requires-coating"
                    checked={requiresCoating}
                    onCheckedChange={(checked) => setRequiresCoating(checked as boolean)}
                  />
                  <label
                    htmlFor="requires-coating"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Requires Protective Coatings
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requires-insulation"
                    checked={requiresInsulation}
                    onCheckedChange={(checked) => setRequiresInsulation(checked as boolean)}
                  />
                  <label
                    htmlFor="requires-insulation"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Requires Insulation
                  </label>
                </div>
              </div>
            </div>

            {/* Drawing Selection with Expandable Components */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Select Drawings & Components <span className="text-red-500">*</span>
                </h3>
                {previewStats.componentCount > 0 && (
                  <div className="text-sm text-gray-600 flex items-center gap-1">
                    <PackageIcon className="h-4 w-4" />
                    {previewStats.componentCount} component
                    {previewStats.componentCount !== 1 ? 's' : ''} selected
                  </div>
                )}
              </div>

              <DrawingSelectionList
                drawings={drawingsData || []}
                selectedDrawingIds={selectedDrawingIds}
                selectedComponentIds={selectedComponentIds}
                onDrawingSelectionChange={setSelectedDrawingIds}
                onComponentSelectionChange={setSelectedComponentIds}
                projectId={projectId}
                isLoading={drawingsLoading}
              />

              {selectedComponentIds.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Expand drawings and select components to create package
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="min-h-[44px] min-w-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid}
              className="min-h-[44px] min-w-[44px] bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:bg-slate-300"
            >
              {createPackageMutation.isPending
                ? 'Creating...'
                : isCreatingAssignments
                ? 'Assigning components...'
                : 'Create Package'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
