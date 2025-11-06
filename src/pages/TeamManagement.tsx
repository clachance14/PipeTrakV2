// T020: TeamManagementPage - Unified team member list with permissions
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useTeamFilters } from '@/hooks/useTeamFilters';
import { TeamMemberList } from '@/components/team/TeamMemberList';
import { TeamFilters } from '@/components/team/TeamFilters';
import { AddMemberDialog } from '@/components/team/AddMemberDialog';
import { Button } from '@/components/ui/button';
import type { Role } from '@/types/team.types';

export function TeamManagement() {
  const { user } = useAuth();
  const { useCurrentOrganization } = useOrganization();
  const { data: currentOrgData, isLoading, error } = useCurrentOrganization();
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);

  // URL-based filters
  const {
    searchTerm,
    roleFilter,
    statusFilter,
    sortBy,
    setSearch,
    setRoleFilter,
    setStatusFilter,
    setSortBy,
  } = useTeamFilters();

  // Show loading state while fetching organization
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
            <p className="mt-4 text-sm text-slate-600">Loading organization...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show error state if organization fetch failed
  if (error || !currentOrgData) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-slate-900">Unable to load organization</h3>
          <p className="mt-1 text-sm text-slate-500">
            {error instanceof Error ? error.message : 'Please try refreshing the page.'}
          </p>
        </div>
      </div>
      </Layout>
    );
  }

  const organizationId = currentOrgData.organization.id;
  const currentUserRole = currentOrgData.role as Role;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Team Management</h1>
              <p className="mt-2 text-sm text-slate-600">
                View and manage your team members and their permissions
              </p>
            </div>
            <Button
              onClick={() => setAddMemberDialogOpen(true)}
              className="w-full sm:w-auto"
            >
              Add Team Member
            </Button>
          </div>

          {/* Filters */}
          <TeamFilters
            searchTerm={searchTerm}
            roleFilter={roleFilter}
            statusFilter={statusFilter}
            sortBy={sortBy}
            onSearchChange={setSearch}
            onRoleFilterChange={setRoleFilter}
            onStatusFilterChange={setStatusFilter}
            onSortChange={setSortBy}
          />

          {/* Team Member List */}
          <TeamMemberList
            organizationId={organizationId}
            searchTerm={searchTerm}
            roleFilter={roleFilter}
            statusFilter={statusFilter}
            sortBy={sortBy}
            currentUserRole={currentUserRole}
            currentUserId={user?.id || ''}
            onAddMemberClick={() => setAddMemberDialogOpen(true)}
          />

          {/* Add Member Dialog */}
          <AddMemberDialog
            open={addMemberDialogOpen}
            onOpenChange={setAddMemberDialogOpen}
            organizationId={organizationId}
          />
        </div>
      </div>
    </Layout>
  );
}
