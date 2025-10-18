/**
 * ProjectSetup page (Feature 007)
 * Admin page for creating/editing areas, systems, and test packages
 */

import { useState } from 'react';
import { AreaForm } from '@/components/AreaForm';
import { SystemForm } from '@/components/SystemForm';
import { TestPackageForm } from '@/components/TestPackageForm';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { PermissionGate } from '@/components/PermissionGate';
import { Button } from '@/components/ui/button';
import { useAreas, useDeleteArea } from '@/hooks/useAreas';
import { useSystems, useDeleteSystem } from '@/hooks/useSystems';
import { useTestPackages, useDeleteTestPackage } from '@/hooks/useTestPackages';
import { toast } from 'sonner';

interface ProjectSetupProps {
  projectId: string;
}

export function ProjectSetup({ projectId }: ProjectSetupProps) {
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [showSystemForm, setShowSystemForm] = useState(false);
  const [showTestPackageForm, setShowTestPackageForm] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    type: 'area' | 'system' | 'testPackage';
    id: string;
    name: string;
  } | null>(null);

  const { data: areas = [] } = useAreas(projectId);
  const { data: systems = [] } = useSystems(projectId);
  const { data: testPackages = [] } = useTestPackages(projectId);

  const deleteAreaMutation = useDeleteArea();
  const deleteSystemMutation = useDeleteSystem();
  const deleteTestPackageMutation = useDeleteTestPackage();

  const handleDelete = async () => {
    if (!deleteDialog) return;

    try {
      if (deleteDialog.type === 'area') {
        await deleteAreaMutation.mutateAsync({ id: deleteDialog.id });
        toast.success('Area deleted successfully');
      } else if (deleteDialog.type === 'system') {
        await deleteSystemMutation.mutateAsync({ id: deleteDialog.id });
        toast.success('System deleted successfully');
      } else if (deleteDialog.type === 'testPackage') {
        await deleteTestPackageMutation.mutateAsync({ id: deleteDialog.id });
        toast.success('Test package deleted successfully');
      }
      setDeleteDialog(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  return (
    <PermissionGate permission="can_manage_team">
      <div className="container mx-auto py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Project Setup</h1>
          <p className="text-muted-foreground">
            Manage areas, systems, and test packages for this project
          </p>
        </div>

        {/* Areas Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Areas</h2>
            <Button onClick={() => setShowAreaForm(!showAreaForm)}>
              {showAreaForm ? 'Cancel' : 'Add Area'}
            </Button>
          </div>

          {showAreaForm && (
            <div className="border rounded-lg p-4">
              <AreaForm
                projectId={projectId}
                onSuccess={() => setShowAreaForm(false)}
                onCancel={() => setShowAreaForm(false)}
              />
            </div>
          )}

          <div className="grid gap-2">
            {areas.map((area) => (
              <div
                key={area.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{area.name}</div>
                  {area.description && (
                    <div className="text-sm text-muted-foreground">
                      {area.description}
                    </div>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    setDeleteDialog({ type: 'area', id: area.id, name: area.name })
                  }
                >
                  Delete
                </Button>
              </div>
            ))}
            {areas.length === 0 && (
              <p className="text-sm text-muted-foreground">No areas yet</p>
            )}
          </div>
        </section>

        {/* Systems Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Systems</h2>
            <Button onClick={() => setShowSystemForm(!showSystemForm)}>
              {showSystemForm ? 'Cancel' : 'Add System'}
            </Button>
          </div>

          {showSystemForm && (
            <div className="border rounded-lg p-4">
              <SystemForm
                projectId={projectId}
                onSuccess={() => setShowSystemForm(false)}
                onCancel={() => setShowSystemForm(false)}
              />
            </div>
          )}

          <div className="grid gap-2">
            {systems.map((system) => (
              <div
                key={system.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{system.name}</div>
                  {system.description && (
                    <div className="text-sm text-muted-foreground">
                      {system.description}
                    </div>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    setDeleteDialog({ type: 'system', id: system.id, name: system.name })
                  }
                >
                  Delete
                </Button>
              </div>
            ))}
            {systems.length === 0 && (
              <p className="text-sm text-muted-foreground">No systems yet</p>
            )}
          </div>
        </section>

        {/* Test Packages Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Test Packages</h2>
            <Button onClick={() => setShowTestPackageForm(!showTestPackageForm)}>
              {showTestPackageForm ? 'Cancel' : 'Add Test Package'}
            </Button>
          </div>

          {showTestPackageForm && (
            <div className="border rounded-lg p-4">
              <TestPackageForm
                projectId={projectId}
                onSuccess={() => setShowTestPackageForm(false)}
                onCancel={() => setShowTestPackageForm(false)}
              />
            </div>
          )}

          <div className="grid gap-2">
            {testPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{pkg.name}</div>
                  {pkg.description && (
                    <div className="text-sm text-muted-foreground">
                      {pkg.description}
                    </div>
                  )}
                  {pkg.target_date && (
                    <div className="text-sm text-muted-foreground">
                      Target: {new Date(pkg.target_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    setDeleteDialog({
                      type: 'testPackage',
                      id: pkg.id,
                      name: pkg.name,
                    })
                  }
                >
                  Delete
                </Button>
              </div>
            ))}
            {testPackages.length === 0 && (
              <p className="text-sm text-muted-foreground">No test packages yet</p>
            )}
          </div>
        </section>

        {/* Delete Confirmation Dialog */}
        {deleteDialog && (
          <DeleteConfirmationDialog
            open={true}
            onOpenChange={() => setDeleteDialog(null)}
            onConfirm={handleDelete}
            title={`Delete ${deleteDialog.type}`}
            description={`This will remove the ${deleteDialog.type} from the project.`}
            entityName={deleteDialog.name}
            warningMessage="Components assigned to this will be unassigned (set to NULL)."
            isPending={
              deleteAreaMutation.isPending ||
              deleteSystemMutation.isPending ||
              deleteTestPackageMutation.isPending
            }
          />
        )}
      </div>
    </PermissionGate>
  );
}
