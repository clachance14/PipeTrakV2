import { useState } from 'react'
import { useOrganization } from '@/hooks/useOrganization'
import { Button } from '@/components/ui/button'
import { RoleChangeDialog } from './RoleChangeDialog'
import type { Role } from '@/types/team.types'
import { canManageTeam } from '@/lib/permissions'
import { toast } from 'sonner'

type SortOption = 'name' | 'role' | 'join_date' | 'last_active';

interface TeamListProps {
  organizationId: string
  currentUserRole: Role
  searchTerm?: string
  roleFilter?: Role | 'all'
  statusFilter?: 'all' | 'active' | 'pending'
  sortBy?: SortOption
}

export function TeamList({
  organizationId,
  currentUserRole,
  searchTerm = '',
  roleFilter = 'all',
  statusFilter = 'all',
  sortBy = 'name',
}: TeamListProps) {
  const [page, setPage] = useState(0)
  const limit = 50

  // Role change dialog state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string; role: Role } | null>(null)

  const { useOrgMembers, updateMemberRoleMutation, removeMemberMutation } =
    useOrganization()

  const { data, isLoading } = useOrgMembers({
    organizationId,
    limit: 1000, // Fetch all members for client-side filtering/sorting
    offset: 0,
  })

  const allMembers = data?.members || []
  const canManage = canManageTeam(currentUserRole)

  // Client-side filtering
  let filteredMembers = allMembers.filter((member) => {
    // Search filter (name or email)
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const nameMatch = member.full_name?.toLowerCase().includes(search)
      const emailMatch = member.email?.toLowerCase().includes(search)
      if (!nameMatch && !emailMatch) return false
    }

    // Role filter
    if (roleFilter !== 'all' && member.role !== roleFilter) {
      return false
    }

    // Status filter (active vs pending invitations)
    // For now, assume all members from useOrgMembers are "active"
    if (statusFilter === 'pending') {
      return false // Members from useOrgMembers are always active
    }

    return true
  })

  // Client-side sorting
  filteredMembers = [...filteredMembers].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.full_name || '').localeCompare(b.full_name || '')
      case 'role':
        return (a.role || '').localeCompare(b.role || '')
      case 'join_date':
        // Most recent first (descending)
        return new Date(b.joined_at || 0).getTime() - new Date(a.joined_at || 0).getTime()
      case 'last_active':
        // TODO: Add last_active field to member type
        // For now, sort by join_date as fallback
        return new Date(b.joined_at || 0).getTime() - new Date(a.joined_at || 0).getTime()
      default:
        return 0
    }
  })

  // Pagination
  const totalCount = filteredMembers.length
  const members = filteredMembers.slice(page * limit, (page + 1) * limit)

  const handleOpenRoleDialog = (userId: string, name: string, role: Role) => {
    setSelectedMember({ id: userId, name, role })
    setRoleDialogOpen(true)
  }

  const handleCloseRoleDialog = () => {
    setRoleDialogOpen(false)
    setSelectedMember(null)
  }

  const handleConfirmRoleChange = (newRole: Role) => {
    if (!selectedMember) return

    updateMemberRoleMutation.mutate(
      { userId: selectedMember.id, role: newRole, organizationId },
      {
        onSuccess: () => {
          toast.success(`Role updated to ${newRole}`)
          handleCloseRoleDialog()
        },
        onError: (error: Error) => {
          const message = error.message || 'Failed to update role'
          if (message.includes('CANNOT_CHANGE_OWN_ROLE')) {
            toast.error('You cannot change your own role')
          } else if (message.includes('CANNOT_REMOVE_LAST_OWNER')) {
            toast.error('Cannot change role: Organization must have at least one owner')
          } else {
            toast.error('Failed to update role. Please try again.')
          }
        },
      }
    )
  }

  const handleRemoveMember = (userId: string, userName: string) => {
    if (!confirm(`Remove ${userName} from the organization?`)) return

    removeMemberMutation.mutate(
      { userId, organizationId },
      {
        onSuccess: () => {
          toast.success('Member removed successfully')
        },
        onError: (error: Error) => {
          const message = error.message || 'Failed to remove member'
          if (message.includes('CANNOT_REMOVE_LAST_OWNER')) {
            toast.error('Cannot remove the last owner. Transfer ownership first.')
          } else {
            toast.error('Failed to remove member')
          }
        },
      }
    )
  }

  return (
    <div className="space-y-4">
      {/* Members Table */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No members found</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Joined
                </th>
                {canManage && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {member.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{member.role?.replace('_', ' ') || 'No role'}</span>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenRoleDialog(member.id, member.full_name, member.role as Role)}
                          aria-label="Change role"
                        >
                          Change Role
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'N/A'}
                  </td>
                  {canManage && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id, member.full_name)}
                      >
                        Remove
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Change Dialog */}
      {selectedMember && (
        <RoleChangeDialog
          open={roleDialogOpen}
          memberName={selectedMember.name}
          currentRole={selectedMember.role}
          onConfirm={handleConfirmRoleChange}
          onCancel={handleCloseRoleDialog}
          isLoading={updateMemberRoleMutation.isPending}
        />
      )}

      {/* Pagination */}
      {totalCount > limit && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Showing {page * limit + 1} to {Math.min((page + 1) * limit, totalCount)} of{' '}
            {totalCount} members
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * limit >= totalCount}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
