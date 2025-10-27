/**
 * RoleChangeDialog Component
 * Feature: 016-team-management-ui (User Story 4)
 *
 * Dialog for changing a team member's role with:
 * - Role selection dropdown
 * - Warning messages for owner role changes
 * - Disabled state during submission
 * - Keyboard accessible
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { Role } from '@/types/team.types'

interface RoleChangeDialogProps {
  open: boolean
  memberName: string
  currentRole: Role
  onConfirm: (newRole: Role) => void
  onCancel: () => void
  isLoading?: boolean
}

const ROLE_OPTIONS: Array<{
  value: Role
  label: string
  description: string
}> = [
  {
    value: 'owner',
    label: 'Owner',
    description: 'Full access including organization management',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access to team and project management',
  },
  {
    value: 'project_manager',
    label: 'Project Manager',
    description: 'Create/edit projects and assign work',
  },
  {
    value: 'foreman',
    label: 'Foreman',
    description: 'Update component status and assign welders',
  },
  {
    value: 'qc_inspector',
    label: 'QC Inspector',
    description: 'Approve/reject work and add inspection notes',
  },
  {
    value: 'welder',
    label: 'Welder',
    description: 'Update assigned components only',
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to projects and components',
  },
]

export function RoleChangeDialog({
  open,
  memberName,
  currentRole,
  onConfirm,
  onCancel,
  isLoading = false,
}: RoleChangeDialogProps) {
  const [selectedRole, setSelectedRole] = useState<Role>(currentRole)

  // Reset selected role when dialog opens or currentRole changes
  useEffect(() => {
    setSelectedRole(currentRole)
  }, [currentRole, open])

  const hasRoleChanged = selectedRole !== currentRole
  const isChangingFromOwner = currentRole === 'owner'

  const handleConfirm = () => {
    if (hasRoleChanged) {
      onConfirm(selectedRole)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      onCancel()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-modal="true"
        aria-labelledby="role-change-dialog-title"
        className="sm:max-w-[500px]"
      >
        <DialogHeader>
          <DialogTitle id="role-change-dialog-title">
            Change Role for {memberName}
          </DialogTitle>
          <DialogDescription>
            Select a new role for this team member. Changes take effect immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Role Selector */}
          <div className="space-y-2">
            <label htmlFor="role-selector" className="text-sm font-medium">
              Role
            </label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as Role)}
              disabled={isLoading}
            >
              <SelectTrigger id="role-selector" className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{role.label}</span>
                      <span className="text-xs text-slate-500">{role.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warning Messages */}
          {isChangingFromOwner && hasRoleChanged && (
            <div className="rounded-md bg-amber-50 p-3 text-sm">
              <p className="font-medium text-amber-900">
                Warning: Changing from Owner role
              </p>
              <p className="mt-1 text-amber-700">
                The organization must have at least one owner. Make sure another owner exists
                before proceeding, or this change may be rejected.
              </p>
            </div>
          )}

          {selectedRole === 'owner' && currentRole !== 'owner' && (
            <div className="rounded-md bg-blue-50 p-3 text-sm">
              <p className="font-medium text-blue-900">
                Promoting to Owner
              </p>
              <p className="mt-1 text-blue-700">
                This user will gain full access to organization settings and billing.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            type="button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!hasRoleChanged || isLoading}
            type="button"
          >
            {isLoading ? 'Updating...' : 'Update Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
