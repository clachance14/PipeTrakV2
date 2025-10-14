import { useState } from 'react'
import { useOrganization } from '@/hooks/useOrganization'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RoleSelector } from './RoleSelector'
import type { UserRole } from '@/lib/permissions'
import { canManageTeam } from '@/lib/permissions'
import { toast } from 'sonner'

interface TeamListProps {
  organizationId: string
  currentUserRole: UserRole
}

export function TeamList({ organizationId, currentUserRole }: TeamListProps) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [page, setPage] = useState(0)
  const limit = 50

  const { useOrgMembers, updateMemberRoleMutation, removeMemberMutation } =
    useOrganization()

  const { data, isLoading } = useOrgMembers({
    organizationId,
    search: search || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    limit,
    offset: page * limit,
  })

  const members = data?.members || []
  const totalCount = data?.total_count || 0
  const canManage = canManageTeam(currentUserRole)

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    updateMemberRoleMutation.mutate(
      { userId, role: newRole, organizationId },
      {
        onSuccess: () => {
          toast.success('Role updated successfully')
        },
        onError: (error: Error) => {
          const message = error.message || 'Failed to update role'
          if (message.includes('CANNOT_CHANGE_OWN_ROLE')) {
            toast.error('You cannot change your own role')
          } else if (message.includes('CANNOT_REMOVE_LAST_OWNER')) {
            toast.error('Cannot remove the last owner')
          } else {
            toast.error('Failed to update role')
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
      {/* Search and Filter */}
      <div className="flex gap-4">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <div className="w-48">
          <RoleSelector
            value={roleFilter === 'all' ? 'viewer' : roleFilter}
            onChange={(role) => setRoleFilter(role)}
            currentUserRole={currentUserRole}
          />
        </div>
      </div>

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
                    {canManage ? (
                      <RoleSelector
                        value={member.role as UserRole}
                        onChange={(role) => handleRoleChange(member.id, role)}
                        currentUserRole={currentUserRole}
                      />
                    ) : (
                      <span className="capitalize">{member.role.replace('_', ' ')}</span>
                    )}
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
