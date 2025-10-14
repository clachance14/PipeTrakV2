import { useState } from 'react'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useInvitations } from '@/hooks/useInvitations'
import { Button } from '@/components/ui/button'
import { TeamList } from '@/components/team/TeamList'
import { InvitationForm } from '@/components/team/InvitationForm'
import { toast } from 'sonner'

export function TeamManagement() {
  const { activeOrgId } = useOrganizationStore()
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members')
  const [showInviteModal, setShowInviteModal] = useState(false)

  const { useInvitations: useInvitationsList, resendInvitationMutation, revokeInvitationMutation } =
    useInvitations()

  const { data: invitationsData } = useInvitationsList({
    organizationId: activeOrgId || '',
    status: 'pending',
    limit: 50,
    offset: 0,
  })

  const pendingInvitations = invitationsData?.invitations || []

  // Get current user's role (simplified - in real app would come from auth context)
  const currentUserRole = 'owner' // TODO: Get from auth context

  const handleResend = (invitationId: string) => {
    resendInvitationMutation.mutate(
      { invitationId },
      {
        onSuccess: (data) => {
          if (data.email_sent) {
            toast.success('Invitation resent successfully')
          } else {
            toast.error('Failed to send email, but invitation link is available')
          }
        },
        onError: () => {
          toast.error('Failed to resend invitation')
        },
      }
    )
  }

  const handleRevoke = (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return

    revokeInvitationMutation.mutate(
      { invitationId },
      {
        onSuccess: () => {
          toast.success('Invitation revoked')
        },
        onError: () => {
          toast.error('Failed to revoke invitation')
        },
      }
    )
  }

  if (!activeOrgId) {
    return (
      <div className="p-8">
        <p className="text-gray-600">No organization selected</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
        <p className="text-gray-600">Manage your team members and invitations</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'members'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Team Members
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invitations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending Invitations
            {pendingInvitations.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                {pendingInvitations.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'members' && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Team Members</h2>
            <Button onClick={() => setShowInviteModal(true)}>
              Invite Team Member
            </Button>
          </div>

          <TeamList
            organizationId={activeOrgId}
            currentUserRole={currentUserRole}
          />
        </div>
      )}

      {activeTab === 'invitations' && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Pending Invitations</h2>
            <Button onClick={() => setShowInviteModal(true)}>
              Invite Team Member
            </Button>
          </div>

          {pendingInvitations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No pending invitations
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Invited By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Expires At
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingInvitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invitation.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                        {invitation.role.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invitation.invited_by?.full_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResend(invitation.id)}
                        >
                          Resend
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevoke(invitation.id)}
                        >
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Invite Team Member</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <InvitationForm
              currentUserRole={currentUserRole}
              onSuccess={() => {
                setShowInviteModal(false)
                toast.success('Invitation sent!')
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
