/**
 * Metadata Management Page
 * Simple admin page to create and manage Areas, Systems, and Test Packages
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useProject } from '@/contexts/ProjectContext';
import { useAreas, useCreateArea } from '@/hooks/useAreas';
import { useSystems, useCreateSystem } from '@/hooks/useSystems';
import { useTestPackages, useCreateTestPackage } from '@/hooks/useTestPackages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Plus, Pencil2Icon as Pencil, AlertCircle } from 'lucide-react';
import { MetadataDescriptionEditor } from '@/components/MetadataDescriptionEditor';

export default function MetadataManagementPage() {
  const { selectedProjectId } = useProject();

  if (!selectedProjectId) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Alert className="max-w-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <p className="font-semibold mb-2">No Project Selected</p>
              <p className="mb-4">
                You need to create or select a project before managing metadata.
              </p>
              <Link to="/projects">
                <Button>
                  Go to Projects
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-8">
        <h1 className="text-3xl font-bold">Metadata Management</h1>
        <p className="text-slate-600">
          Manage areas, systems, and test packages for your project.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          <AreaManager projectId={selectedProjectId} />
          <SystemManager projectId={selectedProjectId} />
          <TestPackageManager projectId={selectedProjectId} />
        </div>
      </div>
    </Layout>
  );
}

function AreaManager({ projectId }: { projectId: string }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { data: areas = [], isLoading } = useAreas(projectId);
  const createMutation = useCreateArea();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Area name is required');
      return;
    }

    try {
      await createMutation.mutateAsync({
        project_id: projectId,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success(`Area "${name}" created`);
      setName('');
      setDescription('');
    } catch (error) {
      toast.error(`Failed to create area: ${(error as Error).message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Areas</CardTitle>
        <CardDescription>Manage project areas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create Form */}
        <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
          <Label htmlFor="area-name">Create New Area</Label>
          <Input
            id="area-name"
            placeholder="Area name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Description (optional, max 100 chars)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={100}
          />
          <div className="text-xs text-slate-500 text-right">
            {description.length}/100 characters
          </div>
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createMutation.isPending ? 'Creating...' : 'Create Area'}
          </Button>
        </div>

        {/* List Existing */}
        <div>
          <h4 className="font-medium mb-2">Existing Areas ({areas.length})</h4>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : areas.length === 0 ? (
            <p className="text-sm text-slate-500">No areas yet. Create one above!</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {areas.map((area) => (
                <div
                  key={area.id}
                  className="p-3 bg-white border rounded-lg hover:border-slate-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{area.name}</div>
                      {area.description && (
                        <div className="text-sm text-slate-500 mt-1">
                          {area.description}
                        </div>
                      )}
                      {!area.description && (
                        <div className="text-sm text-slate-400 italic mt-1">
                          No description
                        </div>
                      )}
                    </div>
                    <MetadataDescriptionEditor
                      entityType="area"
                      entityId={area.id}
                      entityName={area.name}
                      currentDescription={area.description}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SystemManager({ projectId }: { projectId: string }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { data: systems = [], isLoading } = useSystems(projectId);
  const createMutation = useCreateSystem();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('System name is required');
      return;
    }

    try {
      await createMutation.mutateAsync({
        project_id: projectId,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success(`System "${name}" created`);
      setName('');
      setDescription('');
    } catch (error) {
      toast.error(`Failed to create system: ${(error as Error).message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Systems</CardTitle>
        <CardDescription>Manage project systems</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create Form */}
        <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
          <Label htmlFor="system-name">Create New System</Label>
          <Input
            id="system-name"
            placeholder="System name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Description (optional, max 100 chars)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={100}
          />
          <div className="text-xs text-slate-500 text-right">
            {description.length}/100 characters
          </div>
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createMutation.isPending ? 'Creating...' : 'Create System'}
          </Button>
        </div>

        {/* List Existing */}
        <div>
          <h4 className="font-medium mb-2">Existing Systems ({systems.length})</h4>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : systems.length === 0 ? (
            <p className="text-sm text-slate-500">No systems yet. Create one above!</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {systems.map((system) => (
                <div
                  key={system.id}
                  className="p-3 bg-white border rounded-lg hover:border-slate-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{system.name}</div>
                      {system.description && (
                        <div className="text-sm text-slate-500 mt-1">
                          {system.description}
                        </div>
                      )}
                      {!system.description && (
                        <div className="text-sm text-slate-400 italic mt-1">
                          No description
                        </div>
                      )}
                    </div>
                    <MetadataDescriptionEditor
                      entityType="system"
                      entityId={system.id}
                      entityName={system.name}
                      currentDescription={system.description}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TestPackageManager({ projectId }: { projectId: string }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { data: testPackages = [], isLoading } = useTestPackages(projectId);
  const createMutation = useCreateTestPackage();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Test package name is required');
      return;
    }

    try {
      await createMutation.mutateAsync({
        project_id: projectId,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success(`Test package "${name}" created`);
      setName('');
      setDescription('');
    } catch (error) {
      toast.error(`Failed to create test package: ${(error as Error).message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Packages</CardTitle>
        <CardDescription>Manage test packages</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create Form */}
        <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
          <Label htmlFor="package-name">Create New Test Package</Label>
          <Input
            id="package-name"
            placeholder="Package name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Description (optional, max 100 chars)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={100}
          />
          <div className="text-xs text-slate-500 text-right">
            {description.length}/100 characters
          </div>
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createMutation.isPending ? 'Creating...' : 'Create Test Package'}
          </Button>
        </div>

        {/* List Existing */}
        <div>
          <h4 className="font-medium mb-2">
            Existing Test Packages ({testPackages.length})
          </h4>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : testPackages.length === 0 ? (
            <p className="text-sm text-slate-500">
              No test packages yet. Create one above!
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {testPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-3 bg-white border rounded-lg hover:border-slate-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{pkg.name}</div>
                      {pkg.description && (
                        <div className="text-sm text-slate-500 mt-1">
                          {pkg.description}
                        </div>
                      )}
                      {!pkg.description && (
                        <div className="text-sm text-slate-400 italic mt-1">
                          No description
                        </div>
                      )}
                    </div>
                    <MetadataDescriptionEditor
                      entityType="test_package"
                      entityId={pkg.id}
                      entityName={pkg.name}
                      currentDescription={pkg.description}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
