/**
 * ComponentAssignDialog component (Feature 007)
 * Dialog for bulk assigning components to area/system/test package
 */

import { useState } from 'react';
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
import { useAssignComponents } from '@/hooks/useComponentAssignment';
import { useAreas } from '@/hooks/useAreas';
import { useSystems } from '@/hooks/useSystems';
import { useTestPackages } from '@/hooks/useTestPackages';
import { toast } from 'sonner';

interface ComponentAssignDialogProps {
  projectId: string;
  componentIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ComponentAssignDialog({
  projectId,
  componentIds,
  open,
  onOpenChange,
  onSuccess,
}: ComponentAssignDialogProps) {
  const [areaId, setAreaId] = useState<string | undefined>();
  const [systemId, setSystemId] = useState<string | undefined>();
  const [testPackageId, setTestPackageId] = useState<string | undefined>();

  const assignMutation = useAssignComponents();
  const { data: areas = [] } = useAreas(projectId);
  const { data: systems = [] } = useSystems(projectId);
  const { data: testPackages = [] } = useTestPackages(projectId);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Components</DialogTitle>
          <DialogDescription>
            Assign {componentIds.length} component{componentIds.length !== 1 ? 's' : ''} to
            area, system, and/or test package
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Area selection */}
          <div className="space-y-2">
            <Label>Area</Label>
            <Select
              value={areaId || 'none'}
              onValueChange={(value) => setAreaId(value === 'none' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select area (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No area</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
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
            >
              <SelectTrigger>
                <SelectValue placeholder="Select system (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No system</SelectItem>
                {systems.map((system) => (
                  <SelectItem key={system.id} value={system.id}>
                    {system.name}
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
            >
              <SelectTrigger>
                <SelectValue placeholder="Select test package (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No test package</SelectItem>
                {testPackages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name}
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
          <Button onClick={handleAssign} disabled={assignMutation.isPending}>
            {assignMutation.isPending ? 'Assigning...' : 'Assign Components'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
