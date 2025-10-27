// T057, T058: PendingInviteRow with Resend and Revoke actions
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useInvitations } from '@/hooks/useInvitations'
import { toast } from 'sonner'
import type { Invitation } from '@/types/team.types'

interface PendingInviteRowProps {
  invitation: Invitation
}

export function PendingInviteRow({ invitation }: PendingInviteRowProps) {
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const { resendInvitationMutation, revokeInvitationMutation } = useInvitations()

  const handleResend = () => {
    resendInvitationMutation.mutate(
      { invitationId: invitation.id },
      {
        // T059: Success toast for resend
        onSuccess: () => {
          toast.success(`Invitation resent to ${invitation.email}`)
        },
        // T061: Error handling
        onError: (error: any) => {
          if (error?.code === 'PGRST116' || error?.message?.includes('not found')) {
            toast.error('Invitation no longer exists')
          } else if (error?.code === '42501' || error?.message?.toLowerCase().includes('permission')) {
            toast.error('You need admin role to resend invitations')
          } else {
            toast.error('Failed to resend invitation. Please try again.')
          }
        },
      }
    )
  }

  const handleRevoke = () => {
    revokeInvitationMutation.mutate(
      { invitationId: invitation.id },
      {
        // T060: Success toast for revoke
        onSuccess: () => {
          toast.success('Invitation cancelled')
          setRevokeDialogOpen(false)
        },
        // T061: Error handling
        onError: (error: any) => {
          if (error?.code === '23514' || error?.message?.toLowerCase().includes('cannot revoke accepted')) {
            toast.error('Cannot revoke accepted invitation')
          } else if (error?.code === '42501' || error?.message?.toLowerCase().includes('permission')) {
            toast.error('You need admin role to revoke invitations')
          } else {
            toast.error('Failed to revoke invitation. Please try again.')
          }
          setRevokeDialogOpen(false)
        },
      }
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not sent'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <>
      {/* Mobile-friendly card layout (replaces table row) */}
      <div
        className="bg-white border-b border-slate-200 px-4 lg:px-6 py-4"
        data-testid="invitation-row"
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
          {/* Email and status - primary info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-medium text-slate-900 truncate">{invitation.email}</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Pending
              </span>
            </div>
            <p className="text-sm text-slate-500 capitalize mt-1">
              {invitation.role.replace(/_/g, ' ')}
            </p>
            {/* Mobile-only dates */}
            <div className="lg:hidden text-xs text-slate-400 mt-2 space-y-1">
              <p>Created: {formatDate(invitation.created_at)}</p>
              <p>Expires: {formatDate(invitation.expires_at)}</p>
            </div>
          </div>

          {/* Desktop-only dates */}
          <div className="hidden lg:flex lg:items-center lg:gap-6 flex-shrink-0">
            <div className="text-sm text-slate-500 min-w-[100px]">
              <span className="text-xs text-slate-400 block">Created</span>
              {formatDate(invitation.created_at)}
            </div>
            <div className="text-sm text-slate-500 min-w-[100px]">
              <span className="text-xs text-slate-400 block">Expires</span>
              {formatDate(invitation.expires_at)}
            </div>
          </div>

          {/* Action buttons - Touch-friendly on mobile (32px+ height) */}
          <div className="flex gap-2 w-full lg:w-auto lg:ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={resendInvitationMutation.isPending}
              className="flex-1 lg:flex-none min-h-[32px]"
              aria-label="Resend invitation email"
            >
              {resendInvitationMutation.isPending ? 'Resending...' : 'Resend'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setRevokeDialogOpen(true)}
              disabled={revokeInvitationMutation.isPending}
              className="flex-1 lg:flex-none min-h-[32px]"
              aria-label="Revoke invitation"
            >
              Revoke
            </Button>
          </div>
        </div>
      </div>

      {/* T058: Confirmation dialog for revoke */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the invitation for {invitation.email}?
              This action cannot be undone and the recipient will no longer be able
              to accept this invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revokeInvitationMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {revokeInvitationMutation.isPending ? 'Revoking...' : 'Revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
