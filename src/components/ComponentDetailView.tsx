/**
 * ComponentDetailView component (Feature 007)
 * Detail view of a component with milestone tracking
 */

import { useState, useEffect } from 'react';
// import { MilestoneButton } from './MilestoneButton'; // TODO: Will be used in Phase 5
// import { MilestoneEventHistory } from './MilestoneEventHistory'; // TODO: Will be used in Phase 6
import { useComponent } from '@/hooks/useComponents';
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

interface ComponentDetailViewProps {
  componentId: string;
  canUpdateMilestones?: boolean; // Permission check
  canEditMetadata?: boolean;      // NEW
  onMetadataChange?: () => void;  // NEW
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
}: ComponentDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'milestones' | 'history'>('overview');
  const [welderDialogOpen, setWelderDialogOpen] = useState(false);

  const { data: componentData, isLoading } = useComponent(componentId);
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
  const handleMilestoneToggle = async (milestoneName: string, isPartial: boolean, currentValue: boolean | number) => {
    if (!component) return;

    let newValue: boolean | number;
    if (isPartial) {
      // Toggle partial between 0 and 100
      newValue = currentValue === 100 ? 0 : 100;
    } else {
      // Toggle boolean
      newValue = !currentValue;
    }

    try {
      await updateMilestoneMutation.mutateAsync({
        component_id: component.id,
        milestone_name: milestoneName,
        value: newValue,
      });
      toast.success(`${milestoneName} updated`);
    } catch (error) {
      toast.error(`Failed to update ${milestoneName}`);
      console.error(error);
    }
  };

  const handleSliderChange = async (milestoneName: string, value: number[]) => {
    if (!component) return;

    try {
      await updateMilestoneMutation.mutateAsync({
        component_id: component.id,
        milestone_name: milestoneName,
        value: value[0] ?? 0,
      });
    } catch (error) {
      toast.error(`Failed to update ${milestoneName}`);
      console.error(error);
    }
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

  // Calculate milestone stats
  const template = component.progress_template;
  const totalMilestones = template?.milestones_config?.length || 0;
  const currentMilestones = (component.current_milestones as Record<string, boolean | number>) || {};
  const completedMilestones = Object.values(currentMilestones).filter(
    (value) => value === true || value === 100
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

          {/* Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Progress</h3>
              <span className="text-2xl font-bold">{component.percent_complete.toFixed(1)}%</span>
            </div>
            <Progress value={component.percent_complete} className="h-3" />
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
                        ) : (
                          <Checkbox
                            checked={currentValue === true}
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

            {/* Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Progress</h3>
                <span className="text-2xl font-bold">{component.percent_complete.toFixed(1)}%</span>
              </div>
              <Progress value={component.percent_complete} className="h-3" />
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
                        ) : (
                          <Checkbox
                            checked={currentValue === true}
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
