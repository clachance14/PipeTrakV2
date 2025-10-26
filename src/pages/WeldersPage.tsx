import { Layout } from '@/components/Layout';
import { useProject } from '@/contexts/ProjectContext';
import { WelderList } from '@/components/welders/WelderList';
import { EmptyState } from '@/components/EmptyState';
import { Wrench } from 'lucide-react';

export function WeldersPage() {
  const { selectedProjectId } = useProject();

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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-slate-600">
            <li>
              <a href="/" className="hover:text-slate-900">
                Home
              </a>
            </li>
            <li>
              <span className="mx-2">/</span>
            </li>
            <li className="font-medium text-slate-900">Welders</li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Welder Management</h1>
          <p className="mt-2 text-slate-600">
            Manage welders for this project. Add new welders and track their assignments.
          </p>
        </div>

        {/* Welder List Component */}
        <WelderList projectId={selectedProjectId} />
      </div>
    </Layout>
  );
}
