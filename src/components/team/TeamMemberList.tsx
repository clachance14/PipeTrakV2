// T019: TeamMemberList component
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { useInvitations } from '@/hooks/useInvitations';
import { useExpandedRows } from '@/hooks/useExpandedRows';
import { MemberRow } from './MemberRow';
import { PendingInviteRow } from './PendingInviteRow';
import type { Role } from '@/types/team.types';

type SortOption = 'name' | 'role' | 'join_date' | 'last_active';

interface TeamMemberListProps {
  organizationId: string;
  searchTerm?: string;
  roleFilter?: Role | 'all';
  statusFilter?: 'all' | 'active' | 'pending';
  sortBy?: SortOption;
  currentUserRole?: Role;
  onAddMemberClick?: () => void;
}

export function TeamMemberList({
  organizationId,
  searchTerm = '',
  roleFilter = 'all',
  statusFilter = 'all',
  sortBy = 'name',
  currentUserRole = 'viewer',
  onAddMemberClick,
}: TeamMemberListProps) {
  const { toggleRow, isExpanded } = useExpandedRows();

  // Fetch active members
  const {
    data: members,
    isLoading: loadingMembers,
    error: membersError,
  } = useOrgMembers({ organizationId });

  // Fetch pending invitations
  const { useInvitations: useInvitationsList } = useInvitations();
  const {
    data: invitationsData,
    isLoading: loadingInvitations,
    error: invitationsError,
  } = useInvitationsList({ organizationId, status: 'pending' });

  const allInvitations = invitationsData?.invitations || [];

  // Client-side filtering for members
  let filteredMembers = (members || []).filter((member) => {
    // Search filter (name or email)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const nameMatch = member.name?.toLowerCase().includes(search);
      const emailMatch = member.email?.toLowerCase().includes(search);
      if (!nameMatch && !emailMatch) return false;
    }

    // Role filter
    if (roleFilter !== 'all' && member.role !== roleFilter) {
      return false;
    }

    // Status filter
    if (statusFilter === 'pending') {
      return false; // Active members excluded when filtering for pending
    }

    return true;
  });

  // Client-side filtering for invitations
  let filteredInvitations = allInvitations.filter((invitation) => {
    // Search filter (email)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!invitation.email?.toLowerCase().includes(search)) return false;
    }

    // Role filter
    if (roleFilter !== 'all' && invitation.role !== roleFilter) {
      return false;
    }

    // Status filter
    if (statusFilter === 'active') {
      return false; // Pending invitations excluded when filtering for active
    }

    return true;
  });

  // Client-side sorting for members
  filteredMembers = [...filteredMembers].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'role':
        return (a.role || '').localeCompare(b.role || '');
      case 'join_date':
        // Most recent first (descending)
        return new Date(b.joined_at || 0).getTime() - new Date(a.joined_at || 0).getTime();
      case 'last_active':
        // TODO: Add last_active field - fallback to join_date
        return new Date(b.joined_at || 0).getTime() - new Date(a.joined_at || 0).getTime();
      default:
        return 0;
    }
  });

  // Client-side sorting for invitations
  filteredInvitations = [...filteredInvitations].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.email || '').localeCompare(b.email || '');
      case 'role':
        return (a.role || '').localeCompare(b.role || '');
      case 'join_date':
        // Most recent first (descending)
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      case 'last_active':
        // Use created_at for invitations
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      default:
        return 0;
    }
  });

  const invitations = filteredInvitations;

  // Loading state
  if (loadingMembers || loadingInvitations) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-slate-600">Loading team members...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (membersError || invitationsError) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-slate-900">Error loading team members</h3>
          <p className="mt-1 text-sm text-slate-500">
            {membersError?.message || invitationsError?.message || 'Failed to fetch team data'}
          </p>
        </div>
      </div>
    );
  }

  // Empty state - T067: Add "Add Team Member" CTA
  if ((!members || members.length === 0) && invitations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-slate-900">No team members yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Start by inviting team members to your organization.
          </p>
          {onAddMemberClick && (
            <button
              onClick={onAddMemberClick}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Team Member
            </button>
          )}
        </div>
      </div>
    );
  }

  // Filtered empty state
  if (filteredMembers.length === 0 && invitations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h3 className="mt-2 text-sm font-medium text-slate-900">No results found</h3>
          <p className="mt-1 text-sm text-slate-500">
            Try adjusting your filters or search criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Members Section */}
      {filteredMembers.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900">
              Team Members ({filteredMembers.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {filteredMembers.map(member => (
              <MemberRow
                key={member.user_id}
                member={member}
                isExpanded={isExpanded(member.user_id)}
                onToggle={toggleRow}
                organizationId={organizationId}
                currentUserRole={currentUserRole}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending Invitations Section */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-yellow-50">
            <h2 className="text-lg font-semibold text-slate-900">
              Pending Invitations ({invitations.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {invitations.map(invitation => (
              <PendingInviteRow
                key={invitation.id}
                invitation={invitation}
              />
            ))}
          </div>
        </div>
      )}

      {/* No pending invitations message */}
      {invitations.length === 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900">Pending Invitations</h2>
          </div>
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-slate-500">No pending invitations</p>
          </div>
        </div>
      )}
    </div>
  );
}
