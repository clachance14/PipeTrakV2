// T017: MemberRow component with ARIA attributes
// T050: Add "Remove Member" action button (visible to owner/admin only)
// T051: Integrate RemoveMemberDialog
import { ExpandablePermissionsRow } from './ExpandablePermissionsRow';
import { RemoveMemberDialog } from './RemoveMemberDialog';
import { Button } from '@/components/ui/button';
import type { TeamMember, Invitation, Role } from '@/types/team.types';

interface MemberRowProps {
  member?: TeamMember;
  invitation?: Invitation;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  organizationId: string;
  currentUserRole: Role;
  currentUserId: string; // NEW: ID of authenticated user
}

export function MemberRow({ member, invitation, isExpanded, onToggle, organizationId, currentUserRole, currentUserId }: MemberRowProps) {
  // Determine if this is a member or invitation
  const isMember = !!member;
  const id = member?.user_id || invitation?.id || '';
  const name = member?.name || invitation?.email || 'Unknown';
  const email = member?.email || invitation?.email || '';
  const role = member?.role || invitation?.role || 'viewer';
  const joinedAt = member?.joined_at;
  const status = invitation?.status;

  // Only owners and admins can remove members
  const canRemoveMember = currentUserRole === 'owner' || currentUserRole === 'admin';

  // Check if this row represents the current user
  const isSelf = member?.user_id === currentUserId;

  const handleClick = () => {
    onToggle(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(id);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = () => {
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
          Pending
        </span>
      );
    }
    if (status === 'expired') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
          Expired
        </span>
      );
    }
    return null;
  };

  const getRoleBadge = () => {
    const roleColors: Record<string, string> = {
      owner: 'bg-purple-50 text-purple-700 border-purple-200',
      admin: 'bg-blue-50 text-blue-700 border-blue-200',
      project_manager: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      foreman: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      qc_inspector: 'bg-teal-50 text-teal-700 border-teal-200',
      welder: 'bg-orange-50 text-orange-700 border-orange-200',
      viewer: 'bg-slate-50 text-slate-700 border-slate-200',
    };

    const colorClass = roleColors[role] || roleColors.viewer;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
        {role.replace('_', ' ')}
      </span>
    );
  };

  return (
    <>
      <div className="bg-white border-b border-slate-200 hover:bg-slate-50 transition-colors">
        <div
          className="flex flex-col lg:flex-row items-start lg:items-center justify-between px-4 lg:px-6 py-4 cursor-pointer gap-3 lg:gap-0"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          role="button"
          aria-expanded={isExpanded}
          aria-controls={`permissions-${id}`}
          aria-label="Expand permissions for this member"
          tabIndex={0}
        >
          <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0 w-full lg:w-auto">
            {/* Avatar placeholder */}
            <div className="flex-shrink-0 w-10 h-10 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              {name.charAt(0).toUpperCase()}
            </div>

            {/* Member info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-medium text-slate-900 truncate">{name}</h3>
                {getStatusBadge()}
                {/* Role badge - show inline on mobile */}
                <div className="lg:hidden">
                  {getRoleBadge()}
                </div>
              </div>
              <p className="text-sm text-slate-500 truncate">{email}</p>
              {/* Join date on mobile - show below email */}
              {isMember && joinedAt && (
                <p className="lg:hidden text-xs text-slate-400 mt-1">
                  Joined {formatDate(joinedAt)}
                </p>
              )}
            </div>

            {/* Expand/collapse icon - always visible */}
            <div className="flex-shrink-0 text-slate-400 ml-auto lg:ml-0">
              <svg
                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Desktop-only metadata row */}
          <div className="hidden lg:flex items-center gap-4 flex-shrink-0">
            {/* Role badge */}
            <div>
              {getRoleBadge()}
            </div>

            {/* Join date (only for members, not invitations) */}
            {isMember && joinedAt && (
              <div className="text-sm text-slate-500 min-w-[120px]">
                <span className="hidden xl:inline">Joined </span>
                {formatDate(joinedAt)}
              </div>
            )}
          </div>

          {/* Remove Member action (only for active members, not self) - Touch-friendly on mobile */}
          {isMember && member && !isSelf && canRemoveMember && (
            <div className="w-full lg:w-auto lg:ml-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <RemoveMemberDialog
                member={member}
                organizationId={organizationId}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full lg:w-auto min-h-[44px]"
                  >
                    Remove Member
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Permissions breakdown (only for members with roles) */}
      {isMember && (
        <ExpandablePermissionsRow role={role} isExpanded={isExpanded} userId={id} />
      )}
    </>
  );
}
