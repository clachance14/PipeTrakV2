/**
 * Component: DrawingAssignDialog
 * Feature: 011-the-drawing-component
 *
 * Dialog for assigning Area/System/Test Package metadata to drawings.
 * Supports both single drawing and bulk assignment modes.
 */

import { useState, useEffect } from 'react';
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
import { MetadataDescriptionEditor } from '@/components/MetadataDescriptionEditor';
import { useAssignDrawing, useAssignDrawingsBulk } from '@/hooks/useAssignDrawings';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGate } from '@/components/PermissionGate';
import { toast } from 'sonner';
import type { DrawingRow } from '@/types/drawing-table.types';

interface DrawingAssignDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Single drawing to assign (mutually exclusive with drawingIds) */
  drawing?: DrawingRow;
  /** Multiple drawing IDs for bulk assignment (mutually exclusive with drawing) */
  drawingIds?: string[];
  /** All available areas for dropdown */
  areas: Array<{ id: string; name: string; description: string | null }>;
  /** All available systems for dropdown */
  systems: Array<{ id: string; name: string; description: string | null }>;
  /** All available test packages for dropdown */
  testPackages: Array<{ id: string; name: string; description: string | null }>;
}

export function DrawingAssignDialog({
  open,
  onOpenChange,
  drawing,
  drawingIds = [],
  areas = [],
  systems = [],
  testPackages = [],
}: DrawingAssignDialogProps) {
  const { user } = useAuth();
  const assignDrawing = useAssignDrawing();
  const assignDrawingsBulk = useAssignDrawingsBulk();

  // Single mode if drawing prop is provided, bulk mode if drawingIds provided
  const isBulkMode = !drawing && drawingIds.length > 0;

  // Store initial values to detect changes (only for single mode)
  const initialAreaId = drawing?.area?.id || null;
  const initialSystemId = drawing?.system?.id || null;
  const initialTestPackageId = drawing?.test_package?.id || null;

  // Form state
  const [areaId, setAreaId] = useState<string | 'NO_CHANGE' | null>(
    isBulkMode ? 'NO_CHANGE' : initialAreaId
  );
  const [systemId, setSystemId] = useState<string | 'NO_CHANGE' | null>(
    isBulkMode ? 'NO_CHANGE' : initialSystemId
  );
  const [testPackageId, setTestPackageId] = useState<string | 'NO_CHANGE' | null>(
    isBulkMode ? 'NO_CHANGE' : initialTestPackageId
  );

  // Reset state when dialog opens or drawing changes
  useEffect(() => {
    if (open) {
      if (isBulkMode) {
        setAreaId('NO_CHANGE');
        setSystemId('NO_CHANGE');
        setTestPackageId('NO_CHANGE');
      } else {
        setAreaId(initialAreaId);
        setSystemId(initialSystemId);
        setTestPackageId(initialTestPackageId);
      }
    }
  }, [open, isBulkMode, initialAreaId, initialSystemId, initialTestPackageId]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('You must be logged in to assign metadata');
      return;
    }

    // Validate at least one field is selected (not null and not NO_CHANGE)
    const hasAreaSelection = areaId && areaId !== 'NO_CHANGE';
    const hasSystemSelection = systemId && systemId !== 'NO_CHANGE';
    const hasPackageSelection = testPackageId && testPackageId !== 'NO_CHANGE';

    if (!hasAreaSelection && !hasSystemSelection && !hasPackageSelection) {
      toast.error('Please select at least one metadata field (Area, System, or Test Package)');
      return;
    }

    try {
      if (isBulkMode) {
        // Bulk assignment
        const result = await assignDrawingsBulk.mutateAsync({
          drawing_ids: drawingIds,
          area_id: areaId === 'NO_CHANGE' ? 'NO_CHANGE' : areaId || undefined,
          system_id: systemId === 'NO_CHANGE' ? 'NO_CHANGE' : systemId || undefined,
          test_package_id:
            testPackageId === 'NO_CHANGE' ? 'NO_CHANGE' : testPackageId || undefined,
          user_id: user.id,
        });

        // Calculate total inherited components across all drawings
        const totalInherited = result?.reduce((sum, r) => sum + (r.components_inherited || 0), 0) || 0;
        toast.success(
          `Successfully assigned metadata to ${drawingIds.length} drawing(s). ` +
          `${totalInherited} component(s) inherited metadata.`
        );
      } else if (drawing) {
        // Single assignment - send 'NO_CHANGE' for unchanged fields
        const result = await assignDrawing.mutateAsync({
          drawing_id: drawing.id,
          area_id: areaId === initialAreaId ? 'NO_CHANGE' : (areaId || undefined),
          system_id: systemId === initialSystemId ? 'NO_CHANGE' : (systemId || undefined),
          test_package_id: testPackageId === initialTestPackageId ? 'NO_CHANGE' : (testPackageId || undefined),
          user_id: user.id,
        });

        const inherited = result?.components_inherited || 0;
        const kept = result?.components_kept_existing || 0;

        toast.success(
          `Metadata assigned to drawing ${drawing.drawing_no_norm}. ` +
          `${inherited} component(s) inherited, ${kept} kept existing values.`
        );
      }

      // Close dialog on success
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to assign metadata:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to assign metadata: ${errorMessage}`);
    }
  };

  const title = isBulkMode
    ? `Assign Metadata to ${drawingIds.length} Drawings`
    : `Assign Metadata to Drawing: ${drawing?.drawing_no_norm}`;

  const description = isBulkMode
    ? 'Select metadata to assign to all selected drawings. Choose "No change" to preserve existing values.'
    : drawing?.title
    ? `${drawing.title}`
    : 'Select metadata to assign to this drawing.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Area Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="area" className="text-right">
              Area
            </Label>
            <Select
              value={areaId || 'none'}
              onValueChange={(value) => setAreaId(value === 'none' ? null : value)}
            >
              <SelectTrigger id="area" className="col-span-3 bg-white">
                <SelectValue placeholder="Select area..." />
              </SelectTrigger>
              <SelectContent>
                {isBulkMode && (
                  <SelectItem value="NO_CHANGE">
                    <span className="font-medium">No change</span>
                    <span className="text-xs text-gray-500 ml-2">(preserve existing)</span>
                  </SelectItem>
                )}
                <SelectItem value="none">
                  <span className="text-gray-500">—</span>
                </SelectItem>
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

          {/* System Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="system" className="text-right">
              System
            </Label>
            <Select
              value={systemId || 'none'}
              onValueChange={(value) => setSystemId(value === 'none' ? null : value)}
            >
              <SelectTrigger id="system" className="col-span-3 bg-white">
                <SelectValue placeholder="Select system..." />
              </SelectTrigger>
              <SelectContent>
                {isBulkMode && (
                  <SelectItem value="NO_CHANGE">
                    <span className="font-medium">No change</span>
                    <span className="text-xs text-gray-500 ml-2">(preserve existing)</span>
                  </SelectItem>
                )}
                <SelectItem value="none">
                  <span className="text-gray-500">—</span>
                </SelectItem>
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

          {/* Test Package Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="package" className="text-right">
              Test Package
            </Label>
            <Select
              value={testPackageId || 'none'}
              onValueChange={(value) => setTestPackageId(value === 'none' ? null : value)}
            >
              <SelectTrigger id="package" className="col-span-3 bg-white">
                <SelectValue placeholder="Select test package..." />
              </SelectTrigger>
              <SelectContent>
                {isBulkMode && (
                  <SelectItem value="NO_CHANGE">
                    <span className="font-medium">No change</span>
                    <span className="text-xs text-gray-500 ml-2">(preserve existing)</span>
                  </SelectItem>
                )}
                <SelectItem value="none">
                  <span className="text-gray-500">—</span>
                </SelectItem>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={assignDrawing.isPending || assignDrawingsBulk.isPending}
          >
            {assignDrawing.isPending || assignDrawingsBulk.isPending
              ? 'Assigning...'
              : isBulkMode
              ? `Assign to ${drawingIds.length} Drawings`
              : 'Assign Metadata'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
