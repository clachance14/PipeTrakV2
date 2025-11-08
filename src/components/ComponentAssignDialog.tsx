/**
 * ComponentAssignDialog component (Feature 007 + Feature 011 enhancements)
 * Dialog for assigning components to area/system/test package
 *
 * Feature 011 enhancements:
 * - Supports single component mode with inheritance detection
 * - Shows inheritance warning when overriding inherited values
 * - Displays "(inherited from drawing)" notation in dropdowns
 * - Provides "Clear all assignments" checkbox to set all fields to NULL
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MetadataDescriptionEditor } from '@/components/MetadataDescriptionEditor';
import { useAssignComponents, useClearComponentAssignments } from '@/hooks/useComponentAssignment';
import { useAreas } from '@/hooks/useAreas';
import { useSystems } from '@/hooks/useSystems';
import { useTestPackages } from '@/hooks/useTestPackages';
import { useDrawingsWithProgress } from '@/hooks/useDrawingsWithProgress';
import { getBadgeType } from '@/lib/metadata-inheritance';
import { PermissionGate } from '@/components/PermissionGate';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

interface ComponentAssignDialogProps {
  projectId: string;
  componentIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** Optional: Single component data for inheritance detection (Feature 011) */
  singleComponentData?: {
    componentId: string;
    drawingId: string;
    currentAreaId: string | null;
    currentSystemId: string | null;
    currentTestPackageId: string | null;
    identityDisplay?: string;
  };
}

export function ComponentAssignDialog({
  projectId,
  componentIds,
  open,
  onOpenChange,
  onSuccess,
  singleComponentData,
}: ComponentAssignDialogProps) {
  const [areaId, setAreaId] = useState<string | undefined>();
  const [systemId, setSystemId] = useState<string | undefined>();
  const [testPackageId, setTestPackageId] = useState<string | undefined>();
  const [clearAllChecked, setClearAllChecked] = useState(false);

  const isSingleComponent = componentIds.length === 1 && singleComponentData;

  const assignMutation = useAssignComponents();
  const clearMutation = useClearComponentAssignments();
  const { data: areas = [] } = useAreas(projectId);
  const { data: systems = [] } = useSystems(projectId);
  const { data: testPackages = [] } = useTestPackages(projectId);

  // Fetch drawing data for single component mode to detect inheritance
  const { data: drawings = [] } = useDrawingsWithProgress(projectId);
  const drawing = useMemo(() => {
    if (!isSingleComponent) return null;
    return drawings.find(d => d.id === singleComponentData?.drawingId);
  }, [drawings, isSingleComponent, singleComponentData?.drawingId]);

  // Determine inheritance status for each field (Feature 011)
  const inheritanceStatus = useMemo(() => {
    if (!isSingleComponent || !drawing || !singleComponentData) {
      return { area: false, system: false, test_package: false };
    }

    return {
      area: getBadgeType(singleComponentData.currentAreaId, drawing.area?.id || null) === 'inherited',
      system: getBadgeType(singleComponentData.currentSystemId, drawing.system?.id || null) === 'inherited',
      test_package: getBadgeType(singleComponentData.currentTestPackageId, drawing.test_package?.id || null) === 'inherited',
    };
  }, [isSingleComponent, drawing, singleComponentData]);

  // Show warning if any field is inherited (Feature 011 FR-033)
  const showInheritanceWarning = useMemo(() => {
    return inheritanceStatus.area || inheritanceStatus.system || inheritanceStatus.test_package;
  }, [inheritanceStatus]);

  // Initialize form values with current component values in single mode
  useEffect(() => {
    if (isSingleComponent && singleComponentData && open) {
      setAreaId(singleComponentData.currentAreaId || undefined);
      setSystemId(singleComponentData.currentSystemId || undefined);
      setTestPackageId(singleComponentData.currentTestPackageId || undefined);
      setClearAllChecked(false);
    }
  }, [isSingleComponent, singleComponentData, open]);

  const handleClearAll = async () => {
    if (!isSingleComponent || !singleComponentData) return;

    try {
      await clearMutation.mutateAsync({ component_id: singleComponentData.componentId });
      toast.success('All assignments cleared');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to clear assignments');
    }
  };

  const handleAssign = async () => {
    // Validate at least one assignment
    if (!areaId && !systemId && !testPackageId) {
      toast.error('Please select at least one assignment (Area, System, or Test Package)');
      return;
    }

    try {
      const result = await assignMutation.mutateAsync({
        component_ids: componentIds,
        area_id: areaId || null,
        system_id: systemId || null,
        test_package_id: testPackageId || null,
      });

      toast.success(`Successfully assigned ${result.updated_count} component(s)`);
      onOpenChange(false);
      onSuccess?.();

      // Reset selections
      setAreaId(undefined);
      setSystemId(undefined);
      setTestPackageId(undefined);
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign components');
    }
  };

  // Helper to get display name with inheritance notation
  const getDisplayName = (
    fieldName: 'area' | 'system' | 'test_package',
    value: string | null | undefined,
    items: Array<{ id: string; name: string }>
  ) => {
    if (!value) return undefined;
    const item = items.find(i => i.id === value);
    if (!item) return undefined;

    const isInherited = inheritanceStatus[fieldName];
    return isInherited
      ? `${item.name} (inherited from drawing)`
      : item.name;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isSingleComponent ? 'Assign Component Details' : 'Assign Components'}
          </DialogTitle>
          <DialogDescription>
            {isSingleComponent && singleComponentData
              ? `Assigning to: ${singleComponentData.identityDisplay || 'component'} on drawing ${drawing?.drawing_no_norm || 'unknown'}`
              : `Assign ${componentIds.length} component${componentIds.length !== 1 ? 's' : ''} to area, system, and/or test package`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Inheritance warning (Feature 011 FR-033) */}
        {isSingleComponent && showInheritanceWarning && (
          <Alert variant="default" className="border-yellow-500 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Changing these values will override the drawing's assignments for this component only.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          {/* Area selection */}
          <div className="space-y-2">
            <Label>Area</Label>
            <Select
              value={areaId || 'none'}
              onValueChange={(value) => setAreaId(value === 'none' ? undefined : value)}
              disabled={clearAllChecked}
            >
              <SelectTrigger>
                <SelectValue>
                  {isSingleComponent && areaId
                    ? getDisplayName('area', areaId, areas)
                    : areaId
                    ? areas.find(a => a.id === areaId)?.name
                    : 'Select area (optional)'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No area</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{area.name}</div>
                        {area.description && (
                          <div className="text-xs text-slate-500 truncate max-w-[200px]">
                            {area.description.length > 50
                              ? `${area.description.slice(0, 50)}...`
                              : area.description}
                          </div>
                        )}
                      </div>
                      <PermissionGate permission="can_manage_team">
                        <MetadataDescriptionEditor
                          entityType="area"
                          entityId={area.id}
                          entityName={area.name}
                          currentDescription={area.description}
                        />
                      </PermissionGate>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* System selection */}
          <div className="space-y-2">
            <Label>System</Label>
            <Select
              value={systemId || 'none'}
              onValueChange={(value) => setSystemId(value === 'none' ? undefined : value)}
              disabled={clearAllChecked}
            >
              <SelectTrigger>
                <SelectValue>
                  {isSingleComponent && systemId
                    ? getDisplayName('system', systemId, systems)
                    : systemId
                    ? systems.find(s => s.id === systemId)?.name
                    : 'Select system (optional)'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No system</SelectItem>
                {systems.map((system) => (
                  <SelectItem key={system.id} value={system.id}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{system.name}</div>
                        {system.description && (
                          <div className="text-xs text-slate-500 truncate max-w-[200px]">
                            {system.description.length > 50
                              ? `${system.description.slice(0, 50)}...`
                              : system.description}
                          </div>
                        )}
                      </div>
                      <PermissionGate permission="can_manage_team">
                        <MetadataDescriptionEditor
                          entityType="system"
                          entityId={system.id}
                          entityName={system.name}
                          currentDescription={system.description}
                        />
                      </PermissionGate>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Test Package selection */}
          <div className="space-y-2">
            <Label>Test Package</Label>
            <Select
              value={testPackageId || 'none'}
              onValueChange={(value) =>
                setTestPackageId(value === 'none' ? undefined : value)
              }
              disabled={clearAllChecked}
            >
              <SelectTrigger>
                <SelectValue>
                  {isSingleComponent && testPackageId
                    ? getDisplayName('test_package', testPackageId, testPackages)
                    : testPackageId
                    ? testPackages.find(p => p.id === testPackageId)?.name
                    : 'Select test package (optional)'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No test package</SelectItem>
                {testPackages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{pkg.name}</div>
                        {pkg.description && (
                          <div className="text-xs text-slate-500 truncate max-w-[200px]">
                            {pkg.description.length > 50
                              ? `${pkg.description.slice(0, 50)}...`
                              : pkg.description}
                          </div>
                        )}
                      </div>
                      <PermissionGate permission="can_manage_team">
                        <MetadataDescriptionEditor
                          entityType="test_package"
                          entityId={pkg.id}
                          entityName={pkg.name}
                          currentDescription={pkg.description}
                        />
                      </PermissionGate>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear all assignments checkbox (Feature 011 FR-035) */}
          {isSingleComponent && (
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="clear-all"
                checked={clearAllChecked}
                onCheckedChange={(checked) => setClearAllChecked(checked === true)}
              />
              <Label
                htmlFor="clear-all"
                className="text-sm font-normal cursor-pointer"
              >
                Clear all assignments (set to None)
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={clearAllChecked ? handleClearAll : handleAssign}
            disabled={assignMutation.isPending || clearMutation.isPending}
          >
            {assignMutation.isPending || clearMutation.isPending
              ? 'Processing...'
              : clearAllChecked
              ? 'Clear All'
              : isSingleComponent
              ? 'Update Component'
              : 'Assign Components'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
