/**
 * ComponentDetailView component (Feature 007)
 * Detail view of a component with milestone tracking
 */

import { useState, useEffect } from 'react';
// import { MilestoneButton } from './MilestoneButton'; // TODO: Will be used in Phase 5
// import { MilestoneEventHistory } from './MilestoneEventHistory'; // TODO: Will be used in Phase 6
import { useComponent, useEffectiveTemplate } from '@/hooks/useComponents';
import { useUpdateMilestone } from '@/hooks/useMilestones';
import { Button } from '@/components/ui/button';
import { useAreas } from '@/hooks/useAreas';
import { useSystems } from '@/hooks/useSystems';
import { useTestPackages } from '@/hooks/useTestPackages';
import { useAssignComponents } from '@/hooks/useComponentAssignment';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { formatIdentityKey } from '@/lib/formatIdentityKey';
import { formatIdentityKey as formatFieldWeldKey } from '@/lib/field-weld-utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMilestoneHistory } from '@/hooks/useMilestoneHistory';
import { WelderAssignDialog } from '@/components/field-welds/WelderAssignDialog';
import { UserPlus } from 'lucide-react';
import { ComponentManhourSection } from '@/components/component-detail/ComponentManhourSection';
import { RollbackConfirmationModal } from '@/components/drawing-table/RollbackConfirmationModal';
import type { RollbackReasonData } from '@/types/drawing-table.types';

interface ComponentDetailViewProps {
  componentId: string;
  canUpdateMilestones?: boolean; // Permission check
  canEditMetadata?: boolean;      // NEW
  onMetadataChange?: () => void;  // NEW
  defaultTab?: 'overview' | 'details' | 'milestones' | 'history'; // Default tab to show (NEW - mobile support)
  onClose?: () => void;            // NEW - Close dialog handler
}

/**
 * ComponentDetailView component
 * Shows component details with interactive milestone buttons
 * Displays progress % and milestone event history
 */
export function ComponentDetailView({
  componentId,
  canUpdateMilestones = false,
  canEditMetadata = false,
  onMetadataChange,
  defaultTab = 'overview',
  onClose,
}: ComponentDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'milestones' | 'history'>(defaultTab);
  const [welderDialogOpen, setWelderDialogOpen] = useState(false);
  const [rollbackPending, setRollbackPending] = useState<{
    milestoneName: string;
    currentValue: number;
    newValue: number;
  } | null>(null);

  // Local state for milestone input values (for pipe/threaded_pipe input boxes)
  const [localMilestoneValues, setLocalMilestoneValues] = useState<Record<string, number>>({});

  const { data: componentData, isLoading } = useComponent(componentId);
  const { data: effectiveTemplate } = useEffectiveTemplate(componentId);
  const updateMilestoneMutation = useUpdateMilestone();
  const { data: history = [], isLoading: historyLoading } = useMilestoneHistory(componentId, 50);

  // Cast to proper type early for metadata access
  const component = componentData as any;

  // State for metadata form
  const [metadataForm, setMetadataForm] = useState({
    area_id: component?.area_id || null,
    system_id: component?.system_id || null,
    test_package_id: component?.test_package_id || null,
  });
  const [isDirty, setIsDirty] = useState(false);

  // Sync form with component data
  useEffect(() => {
    if (component) {
      setMetadataForm({
        area_id: component.area_id,
        system_id: component.system_id,
        test_package_id: component.test_package_id,
      });
      setIsDirty(false);
    }
  }, [component]);

  // Fetch metadata options
  const { data: areas = [] } = useAreas(component?.project_id || '');
  const { data: systems = [] } = useSystems(component?.project_id || '');
  const { data: testPackages = [] } = useTestPackages(component?.project_id || '');
  const assignMutation = useAssignComponents();

  if (isLoading) {
    return <div className="p-6">Loading component details...</div>;
  }

  if (!componentData) {
    return <div className="p-6">Component not found</div>;
  }

  // Handle metadata save
  const handleMetadataSave = async () => {
    if (!component) return;

    try {
      await assignMutation.mutateAsync({
        component_ids: [component.id],
        area_id: metadataForm.area_id,
        system_id: metadataForm.system_id,
        test_package_id: metadataForm.test_package_id,
      });

      toast.success('Metadata updated successfully');
      setIsDirty(false);
      onMetadataChange?.();
    } catch (error) {
      toast.error('Failed to update metadata');
      console.error(error);
    }
  };

  const handleMetadataCancel = () => {
    setMetadataForm({
      area_id: component.area_id,
      system_id: component.system_id,
      test_package_id: component.test_package_id,
    });
    setIsDirty(false);
  };

  // Handle milestone toggle
  const handleMilestoneToggle = async (milestoneName: string, _isPartial: boolean, currentValue: boolean | number) => {
    if (!component) return;

    // Normalize current value to numeric
    const currentNumeric = typeof currentValue === 'boolean'
      ? (currentValue ? 100 : 0)
      : (typeof currentValue === 'number' ? currentValue : 0);

    // Toggle between 0 and 100
    const newNumeric = currentNumeric === 100 ? 0 : 100;

    // Detect rollback (decrease in value)
    const isRollback = newNumeric < currentNumeric;

    if (isRollback) {
      // Open rollback confirmation modal
      setRollbackPending({
        milestoneName,
        currentValue: currentNumeric,
        newValue: newNumeric,
      });
      return;
    }

    // For field welds: Auto-open welder dialog when Weld Made/Weld Complete is checked
    // Note: Templates may use 'Weld Made' (old) or 'Weld Complete' (new) depending on when created
    if (
      component.component_type === 'field_weld' &&
      (milestoneName === 'Weld Made' || milestoneName === 'Weld Complete') &&
      newNumeric === 100
    ) {
      setWelderDialogOpen(true);
      return; // Don't update milestone yet - let welder assignment handle it
    }

    // Not a rollback - proceed immediately
    try {
      await updateMilestoneMutation.mutateAsync({
        component_id: component.id,
        milestone_name: milestoneName,
        value: newNumeric,
      });
      toast.success(`${milestoneName} updated`);
    } catch (error) {
      toast.error(`Failed to update ${milestoneName}`);
      console.error(error);
    }
  };

  const handleSliderChange = async (milestoneName: string, value: number[]) => {
    if (!component) return;

    const newValue = value[0] ?? 0;
    const currentMilestones = (component.current_milestones as Record<string, boolean | number>) || {};
    const currentValue = currentMilestones[milestoneName];
    const currentNumeric = typeof currentValue === 'number' ? currentValue : 0;

    // Detect rollback (decrease in value)
    const isRollback = newValue < currentNumeric;

    if (isRollback) {
      // Open rollback confirmation modal
      setRollbackPending({
        milestoneName,
        currentValue: currentNumeric,
        newValue,
      });
      return;
    }

    // Not a rollback - proceed immediately
    try {
      await updateMilestoneMutation.mutateAsync({
        component_id: component.id,
        milestone_name: milestoneName,
        value: newValue,
      });
    } catch (error) {
      toast.error(`Failed to update ${milestoneName}`);
      console.error(error);
    }
  };

  // Handle input change for pipe/threaded_pipe milestone inputs
  const handleInputChange = (milestoneName: string, inputValue: string) => {
    // Parse as integer, treating empty as 0
    // Use Number() to avoid leading zero issues (e.g., "0100" -> 100)
    const value = inputValue === '' ? 0 : Number(inputValue);
    if (!isNaN(value) && Number.isInteger(value)) {
      setLocalMilestoneValues((prev) => ({ ...prev, [milestoneName]: value }));
    }
  };

  // Handle input commit (blur or Enter) for pipe/threaded_pipe milestone inputs
  const handleInputCommit = async (milestoneName: string) => {
    if (!component) return;

    const currentMilestones = (component.current_milestones as Record<string, boolean | number>) || {};
    const existingValue = currentMilestones[milestoneName];
    const currentNumeric = typeof existingValue === 'number' ? existingValue : 0;
    const localValue = localMilestoneValues[milestoneName] ?? currentNumeric;

    // Clamp to 0-100
    const clampedValue = Math.max(0, Math.min(100, localValue));

    // If value hasn't changed, skip
    if (clampedValue === currentNumeric) {
      // Reset local to match current if it was out of bounds
      if (localValue !== clampedValue) {
        setLocalMilestoneValues((prev) => ({ ...prev, [milestoneName]: clampedValue }));
      }
      return;
    }

    // Detect rollback (decrease in value)
    const isRollback = clampedValue < currentNumeric;

    if (isRollback) {
      // Open rollback confirmation modal
      setRollbackPending({
        milestoneName,
        currentValue: currentNumeric,
        newValue: clampedValue,
      });
      return;
    }

    // Not a rollback - proceed immediately
    try {
      await updateMilestoneMutation.mutateAsync({
        component_id: component.id,
        milestone_name: milestoneName,
        value: clampedValue,
      });
      toast.success(`${milestoneName} updated to ${clampedValue}%`);
    } catch (error) {
      toast.error(`Failed to update ${milestoneName}`);
      console.error(error);
      // Reset local value on error
      setLocalMilestoneValues((prev) => ({ ...prev, [milestoneName]: currentNumeric }));
    }
  };

  // Get display value for milestone input (local state or current value)
  const getMilestoneInputValue = (milestoneName: string, currentValue: boolean | number | undefined): number => {
    const localValue = localMilestoneValues[milestoneName];
    if (localValue !== undefined) {
      return localValue;
    }
    return typeof currentValue === 'number' ? currentValue : 0;
  };

  // Handle rollback confirmation
  const handleRollbackConfirm = async (reasonData: RollbackReasonData) => {
    if (!rollbackPending || !component) return;

    const { milestoneName, newValue } = rollbackPending;

    try {
      await updateMilestoneMutation.mutateAsync({
        component_id: component.id,
        milestone_name: milestoneName,
        value: newValue,
        metadata: {
          rollback: true,
          rollbackReason: reasonData.reason,
          rollbackReasonLabel: reasonData.reasonLabel,
          rollbackDetails: reasonData.details,
        },
      });
      toast.success(`${milestoneName} rolled back`);
    } catch (error) {
      toast.error(`Failed to rollback ${milestoneName}`);
      console.error(error);
    } finally {
      setRollbackPending(null);
    }
  };

  // Handle rollback cancellation
  const handleRollbackCancel = () => {
    setRollbackPending(null);
  };

  // Format identity based on type
  let identityDisplay: string;
  if (component.component_type === 'field_weld') {
    identityDisplay = formatFieldWeldKey(
      component.identity_key as Record<string, unknown>,
      component.component_type
    );
  } else if (component.component_type === 'spool') {
    const key = component.identity_key as Record<string, unknown>;
    identityDisplay = (key?.spool_id as string) || 'Unknown Spool';
  } else {
    identityDisplay = formatIdentityKey(
      component.identity_key as any,
      component.component_type as any
    );
  }

  // Extract attributes with type safety
  const attributes = component?.attributes as {
    spec?: string;
    description?: string;
    total_linear_feet?: number;
    [key: string]: unknown;
  } | null;
  const spec = attributes?.spec || 'Not specified';
  const description = attributes?.description || 'Not specified';

  // Check if this is a pipe/threaded_pipe aggregate component (for linear feet display)
  const totalLinearFeet = attributes?.total_linear_feet ?? 0;
  const isPipeType = component?.component_type === 'pipe' || component?.component_type === 'threaded_pipe';

  // Calculate milestone stats
  // Use effective_template (project-specific) if available, fallback to progress_template (system default)
  // Feature 026: effective_template comes from useEffectiveTemplate hook
  const template = effectiveTemplate || component.progress_template;
  const totalMilestones = template?.milestones_config?.length || 0;
  const currentMilestones = (component.current_milestones as Record<string, boolean | number>) || {};
  const completedMilestones = Object.values(currentMilestones).filter(
    (value) => value === 1 || value === true || value === 100
  ).length;

  return (
    <>
      {/* Desktop: Horizontal Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="hidden md:block">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          {/* Component Identity */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Component</h3>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-mono">{identityDisplay}</span>
              <Badge variant="secondary">{component.component_type}</Badge>
            </div>
          </div>

          {/* Component Attributes */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Attributes</h3>
            <dl className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="text-sm font-medium text-muted-foreground min-w-[120px]">Spec</dt>
                <dd className="text-sm">{spec}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="text-sm font-medium text-muted-foreground min-w-[120px]">Description</dt>
                <dd className="text-sm">{description}</dd>
              </div>
            </dl>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Progress</h3>
              <span className="text-2xl font-bold">{(component.percent_complete ?? 0).toFixed(1)}%</span>
            </div>
            <Progress value={component.percent_complete ?? 0} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {component.last_updated_at
                ? new Date(component.last_updated_at).toLocaleString()
                : 'Never'}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Total Milestones</p>
              <p className="text-3xl font-bold">{totalMilestones}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-3xl font-bold">{completedMilestones}</p>
            </div>
          </div>

          {/* Manhour Section */}
          <ComponentManhourSection component={component} />
        </TabsContent>

        <TabsContent value="details" className="mt-4 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Assign Metadata</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Assign or change the Area, System, and Test Package for this component.
            </p>

            {/* Area */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Area</label>
              <Select
                value={metadataForm.area_id || 'none'}
                onValueChange={(val) => {
                  setMetadataForm({ ...metadataForm, area_id: val === 'none' ? null : val });
                  setIsDirty(true);
                }}
                disabled={!canEditMetadata}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- No Area --</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* System */}
            <div className="space-y-2">
              <label className="text-sm font-medium">System</label>
              <Select
                value={metadataForm.system_id || 'none'}
                onValueChange={(val) => {
                  setMetadataForm({ ...metadataForm, system_id: val === 'none' ? null : val });
                  setIsDirty(true);
                }}
                disabled={!canEditMetadata}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select system" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- No System --</SelectItem>
                  {systems.map((system) => (
                    <SelectItem key={system.id} value={system.id}>
                      {system.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Test Package */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Test Package</label>
              <Select
                value={metadataForm.test_package_id || 'none'}
                onValueChange={(val) => {
                  setMetadataForm({ ...metadataForm, test_package_id: val === 'none' ? null : val });
                  setIsDirty(true);
                }}
                disabled={!canEditMetadata}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select test package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- No Test Package --</SelectItem>
                  {testPackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            {canEditMetadata && (
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleMetadataSave}
                  disabled={!isDirty || assignMutation.isPending}
                >
                  {assignMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleMetadataCancel}
                  disabled={!isDirty || assignMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            )}

            {!canEditMetadata && (
              <p className="text-sm text-muted-foreground pt-4">
                You don't have permission to edit metadata.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="milestones" className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Milestones</h3>

              {/* Field weld welder assignment button */}
              {component.component_type === 'field_weld' && canUpdateMilestones && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWelderDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Assign Welder
                </Button>
              )}
            </div>

            {!canUpdateMilestones && (
              <p className="text-sm text-muted-foreground mb-4">
                You don't have permission to update milestones.
              </p>
            )}

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {template?.milestones_config
                  ?.sort((a: any, b: any) => a.order - b.order)
                  .map((milestone: any) => {
                    const currentValue = currentMilestones[milestone.name];

                    return (
                      <div
                        key={milestone.name}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{milestone.name}</span>
                            <Badge variant="outline">{milestone.weight}%</Badge>
                          </div>
                          {milestone.is_partial && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Current: {typeof currentValue === 'number' ? currentValue : 0}%
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {milestone.is_partial ? (
                            isPipeType ? (
                              /* Input box for pipe/threaded_pipe components */
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    max={100}
                                    value={getMilestoneInputValue(milestone.name, currentValue)}
                                    onChange={(e) => handleInputChange(milestone.name, e.target.value)}
                                    onBlur={() => handleInputCommit(milestone.name)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleInputCommit(milestone.name);
                                        (e.target as HTMLInputElement).blur();
                                      }
                                    }}
                                    disabled={!canUpdateMilestones || updateMilestoneMutation.isPending}
                                    className="w-16 h-10 text-center border rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                  />
                                  <span className="text-sm text-muted-foreground">%</span>
                                </div>
                                {/* Linear feet helper for pipe/threaded_pipe */}
                                {totalLinearFeet > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {Math.min(totalLinearFeet, parseFloat(((getMilestoneInputValue(milestone.name, currentValue) / 100) * totalLinearFeet).toFixed(1)))} / {totalLinearFeet} LF
                                  </span>
                                )}
                              </div>
                            ) : (
                              /* Slider for other component types */
                              <div className="w-48">
                                <Slider
                                  value={[typeof currentValue === 'number' ? currentValue : 0]}
                                  onValueCommit={(val) => handleSliderChange(milestone.name, val)}
                                  min={0}
                                  max={100}
                                  step={1}
                                  disabled={!canUpdateMilestones || updateMilestoneMutation.isPending}
                                  className="min-h-[44px]"
                                />
                              </div>
                            )
                          ) : (
                            <Checkbox
                              checked={currentValue === 100 || currentValue === 1 || currentValue === true}
                              onCheckedChange={() => handleMilestoneToggle(milestone.name, false, currentValue as boolean)}
                              disabled={!canUpdateMilestones || updateMilestoneMutation.isPending}
                              className="h-6 w-6"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>

            {template?.milestones_config?.length === 0 && (
              <p className="text-sm text-muted-foreground">No milestones configured for this component type.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Milestone History</h3>

            {historyLoading && (
              <p className="text-sm text-muted-foreground">Loading history...</p>
            )}

            {!historyLoading && history.length === 0 && (
              <p className="text-sm text-muted-foreground">No milestone updates yet</p>
            )}

            {!historyLoading && history.length > 0 && (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {history.map((event) => {
                    const oldValueDisplay = typeof event.previous_value === 'number'
                      ? `${event.previous_value}%`
                      : event.previous_value ? 'Complete' : 'Incomplete';
                    const newValueDisplay = typeof event.value === 'number'
                      ? `${event.value}%`
                      : event.value ? 'Complete' : 'Incomplete';

                    return (
                      <div
                        key={event.id}
                        className="p-4 border rounded-lg bg-muted/30"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{event.milestone_name}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {oldValueDisplay} → {newValueDisplay}
                            </p>
                          </div>
                          <time className="text-xs text-muted-foreground">
                            {new Date(event.created_at).toLocaleString()}
                          </time>
                        </div>
                        {event.user && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Updated by: {event.user.full_name || event.user.email}
                          </p>
                        )}

                        {/* Field weld context */}
                        {component.component_type === 'field_weld' && event.milestone_name === 'Weld Made' && (
                          <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                            <p>Field weld milestone - check weld log for welder details</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Mobile: Dropdown Selector */}
      <div className="md:hidden space-y-4">
        <Select value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
          <SelectTrigger className="w-full min-h-[44px]">
            <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overview">Overview</SelectItem>
            <SelectItem value="details">Details</SelectItem>
            <SelectItem value="milestones">Milestones</SelectItem>
            <SelectItem value="history">History</SelectItem>
          </SelectContent>
        </Select>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Component Identity */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Component</h3>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-mono">{identityDisplay}</span>
                <Badge variant="secondary">{component.component_type}</Badge>
              </div>
            </div>

            {/* Component Attributes */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Attributes</h3>
              <dl className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <dt className="text-sm font-medium text-muted-foreground min-w-[120px]">Spec</dt>
                  <dd className="text-sm">{spec}</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <dt className="text-sm font-medium text-muted-foreground min-w-[120px]">Description</dt>
                  <dd className="text-sm">{description}</dd>
                </div>
              </dl>
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Progress</h3>
                <span className="text-2xl font-bold">{(component.percent_complete ?? 0).toFixed(1)}%</span>
              </div>
              <Progress value={component.percent_complete ?? 0} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                Last updated: {component.last_updated_at
                  ? new Date(component.last_updated_at).toLocaleString()
                  : 'Never'}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Total Milestones</p>
                <p className="text-3xl font-bold">{totalMilestones}</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold">{completedMilestones}</p>
              </div>
            </div>

            {/* Manhour Section */}
            <ComponentManhourSection component={component} />
          </div>
        )}
        {activeTab === 'details' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Assign Metadata</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Assign or change the Area, System, and Test Package for this component.
            </p>

            {/* Area */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Area</label>
              <Select
                value={metadataForm.area_id || 'none'}
                onValueChange={(val) => {
                  setMetadataForm({ ...metadataForm, area_id: val === 'none' ? null : val });
                  setIsDirty(true);
                }}
                disabled={!canEditMetadata}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- No Area --</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* System */}
            <div className="space-y-2">
              <label className="text-sm font-medium">System</label>
              <Select
                value={metadataForm.system_id || 'none'}
                onValueChange={(val) => {
                  setMetadataForm({ ...metadataForm, system_id: val === 'none' ? null : val });
                  setIsDirty(true);
                }}
                disabled={!canEditMetadata}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select system" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- No System --</SelectItem>
                  {systems.map((system) => (
                    <SelectItem key={system.id} value={system.id}>
                      {system.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Test Package */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Test Package</label>
              <Select
                value={metadataForm.test_package_id || 'none'}
                onValueChange={(val) => {
                  setMetadataForm({ ...metadataForm, test_package_id: val === 'none' ? null : val });
                  setIsDirty(true);
                }}
                disabled={!canEditMetadata}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select test package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- No Test Package --</SelectItem>
                  {testPackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            {canEditMetadata && (
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleMetadataSave}
                  disabled={!isDirty || assignMutation.isPending}
                >
                  {assignMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleMetadataCancel}
                  disabled={!isDirty || assignMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            )}

            {!canEditMetadata && (
              <p className="text-sm text-muted-foreground pt-4">
                You don't have permission to edit metadata.
              </p>
            )}
          </div>
        )}
        {activeTab === 'milestones' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Milestones</h3>

              {/* Field weld welder assignment button */}
              {component.component_type === 'field_weld' && canUpdateMilestones && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWelderDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Assign Welder
                </Button>
              )}
            </div>

            {!canUpdateMilestones && (
              <p className="text-sm text-muted-foreground mb-4">
                You don't have permission to update milestones.
              </p>
            )}

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {template?.milestones_config
                  ?.sort((a: any, b: any) => a.order - b.order)
                  .map((milestone: any) => {
                    const currentValue = currentMilestones[milestone.name];

                    return (
                      <div
                        key={milestone.name}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{milestone.name}</span>
                            <Badge variant="outline">{milestone.weight}%</Badge>
                          </div>
                          {milestone.is_partial && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Current: {typeof currentValue === 'number' ? currentValue : 0}%
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {milestone.is_partial ? (
                            isPipeType ? (
                              /* Input box for pipe/threaded_pipe components (mobile) */
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    max={100}
                                    value={getMilestoneInputValue(milestone.name, currentValue)}
                                    onChange={(e) => handleInputChange(milestone.name, e.target.value)}
                                    onBlur={() => handleInputCommit(milestone.name)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleInputCommit(milestone.name);
                                        (e.target as HTMLInputElement).blur();
                                      }
                                    }}
                                    disabled={!canUpdateMilestones || updateMilestoneMutation.isPending}
                                    className="w-16 h-12 text-center text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                  />
                                  <span className="text-sm text-muted-foreground">%</span>
                                </div>
                                {/* Linear feet helper for pipe/threaded_pipe */}
                                {totalLinearFeet > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {Math.min(totalLinearFeet, parseFloat(((getMilestoneInputValue(milestone.name, currentValue) / 100) * totalLinearFeet).toFixed(1)))} / {totalLinearFeet} LF
                                  </span>
                                )}
                              </div>
                            ) : (
                              /* Slider for other component types (mobile) */
                              <div className="w-48">
                                <Slider
                                  value={[typeof currentValue === 'number' ? currentValue : 0]}
                                  onValueCommit={(val) => handleSliderChange(milestone.name, val)}
                                  min={0}
                                  max={100}
                                  step={1}
                                  disabled={!canUpdateMilestones || updateMilestoneMutation.isPending}
                                  className="min-h-[44px]"
                                />
                              </div>
                            )
                          ) : (
                            <Checkbox
                              checked={currentValue === 100 || currentValue === 1 || currentValue === true}
                              onCheckedChange={() => handleMilestoneToggle(milestone.name, false, currentValue as boolean)}
                              disabled={!canUpdateMilestones || updateMilestoneMutation.isPending}
                              className="h-6 w-6"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>

            {template?.milestones_config?.length === 0 && (
              <p className="text-sm text-muted-foreground">No milestones configured for this component type.</p>
            )}
          </div>
        )}
        {activeTab === 'history' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Milestone History</h3>

            {historyLoading && (
              <p className="text-sm text-muted-foreground">Loading history...</p>
            )}

            {!historyLoading && history.length === 0 && (
              <p className="text-sm text-muted-foreground">No milestone updates yet</p>
            )}

            {!historyLoading && history.length > 0 && (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {history.map((event) => {
                    const oldValueDisplay = typeof event.previous_value === 'number'
                      ? `${event.previous_value}%`
                      : event.previous_value ? 'Complete' : 'Incomplete';
                    const newValueDisplay = typeof event.value === 'number'
                      ? `${event.value}%`
                      : event.value ? 'Complete' : 'Incomplete';

                    return (
                      <div
                        key={event.id}
                        className="p-4 border rounded-lg bg-muted/30"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{event.milestone_name}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {oldValueDisplay} → {newValueDisplay}
                            </p>
                          </div>
                          <time className="text-xs text-muted-foreground">
                            {new Date(event.created_at).toLocaleString()}
                          </time>
                        </div>
                        {event.user && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Updated by: {event.user.full_name || event.user.email}
                          </p>
                        )}

                        {/* Field weld context */}
                        {component.component_type === 'field_weld' && event.milestone_name === 'Weld Made' && (
                          <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                            <p>Field weld milestone - check weld log for welder details</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </div>

      {/* Sticky Footer with Done Button */}
      {onClose && (
        <DialogFooter className="sticky bottom-0 bg-background border-t mt-auto pt-4">
          <Button
            onClick={onClose}
            className="min-h-[44px] w-full sm:w-auto"
          >
            Done
          </Button>
        </DialogFooter>
      )}

      {/* Rollback Confirmation Modal */}
      {rollbackPending && (
        <RollbackConfirmationModal
          isOpen={!!rollbackPending}
          onClose={handleRollbackCancel}
          onConfirm={handleRollbackConfirm}
          componentName={identityDisplay}
          milestoneName={rollbackPending.milestoneName}
        />
      )}

      {/* Welder Assignment Dialog (for field welds) */}
      {component?.component_type === 'field_weld' && (
        <WelderAssignDialog
          componentId={componentId}
          projectId={component.project_id}
          open={welderDialogOpen}
          onOpenChange={setWelderDialogOpen}
        />
      )}
    </>
  );
}
