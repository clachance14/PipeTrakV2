import { Layout } from '@/components/Layout';
import { useState, useMemo } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useWelders } from '@/hooks/useWelders';
import { useWelderUsage } from '@/hooks/useWelderUsage';
import { WelderTable, WelderRow } from '@/components/welders/WelderTable';
import { AddWelderModal, WelderFormData } from '@/components/welders/AddWelderModal';
import { VerifyWelderDialog } from '@/components/welders/VerifyWelderDialog';
import { EmptyState } from '@/components/EmptyState';
import { Wrench, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WeldersPage() {
  const { selectedProjectId } = useProject();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedWelder, setSelectedWelder] = useState<WelderRow | null>(null);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);

  const { data: welders, isLoading, isError, error, refetch } = useWelders(
    selectedProjectId || ''
  );

  const { data: welderUsage } = useWelderUsage(selectedProjectId || '');

  // Transform data to WelderRow format
  const welderRows = useMemo<WelderRow[]>(() => {
    if (!welders) return [];

    return welders.map(welder => ({
      id: welder.id,
      name: welder.name,
      stencil: welder.stencil_norm || welder.stencil,
      status: welder.status as WelderRow['status'],
      weldCount: welderUsage?.get(welder.id) || 0,
      verifiedAt: welder.verified_at ?? undefined,
      verifiedBy: welder.verified_by ?? undefined
    }));
  }, [welders, welderUsage]);

  const handleAdd = () => {
    setIsAddModalOpen(true);
  };

  const handleSubmitAdd = async (data: WelderFormData) => {
    // TODO: Implement add welder mutation when useWelders provides it
    console.log('Adding welder:', data);
    refetch();
  };

  const handleVerify = (id: string) => {
    const welder = welderRows.find(w => w.id === id);
    if (welder) {
      setSelectedWelder(welder);
      setIsVerifyDialogOpen(true);
    }
  };

  const handleConfirmVerify = async () => {
    // TODO: Implement verify welder mutation when useWelders provides it
    console.log('Verifying welder:', selectedWelder?.id);
    setIsVerifyDialogOpen(false);
    setSelectedWelder(null);
    refetch();
  };

  // No project selected
  if (!selectedProjectId) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            icon={Wrench}
            title="No Project Selected"
            description="Please select a project from the dropdown to view welders."
          />
        </div>
      </Layout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Welder Directory</h1>
            <p className="text-gray-600 mt-1">Manage welders and verification status</p>
          </div>
          <div className="bg-gray-100 rounded-lg animate-pulse h-96" />
        </div>
      </Layout>
    );
  }

  // Error state
  if (isError) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load welders</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Empty state
  if (welderRows.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Welder Directory</h1>
            <p className="text-gray-600 mt-1">Manage welders and verification status</p>
          </div>
          <EmptyState
            icon={Wrench}
            title="No welders found"
            description="Add your first welder to start tracking weld activities."
            action={{ label: 'Add Welder', onClick: handleAdd }}
          />
          <AddWelderModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSubmit={handleSubmitAdd}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <WelderTable
          welders={welderRows}
          onVerify={handleVerify}
          onAdd={handleAdd}
        />

        <AddWelderModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleSubmitAdd}
        />

        <VerifyWelderDialog
          welder={selectedWelder}
          isOpen={isVerifyDialogOpen}
          onClose={() => {
            setIsVerifyDialogOpen(false);
            setSelectedWelder(null);
          }}
          onConfirm={handleConfirmVerify}
        />
      </div>
    </Layout>
  );
}
