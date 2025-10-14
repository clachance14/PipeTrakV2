import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { UserRole } from '@/lib/permissions'
import { canManageBilling } from '@/lib/permissions'

interface RoleSelectorProps {
  value: UserRole
  onChange: (value: UserRole) => void
  currentUserRole?: UserRole
  disabled?: boolean
}

const ROLE_OPTIONS: Array<{
  value: UserRole
  label: string
  description: string
}> = [
  {
    value: 'owner',
    label: 'Owner',
    description: 'Full access including billing and account management',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access except billing',
  },
  {
    value: 'project_manager',
    label: 'Project Manager',
    description: 'Create/edit projects, assign work',
  },
  {
    value: 'foreman',
    label: 'Foreman',
    description: 'Update component status, assign welders',
  },
  {
    value: 'qc_inspector',
    label: 'QC Inspector',
    description: 'Approve/reject work, add inspection notes',
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

export function RoleSelector({
  value,
  onChange,
  currentUserRole,
  disabled = false,
}: RoleSelectorProps) {
  // Filter out owner role if current user cannot manage billing
  // (Only owners can assign owner role)
  const availableRoles = ROLE_OPTIONS.filter((role) => {
    if (role.value === 'owner' && currentUserRole && !canManageBilling(currentUserRole)) {
      return false
    }
    return true
  })

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        {availableRoles.map((role) => (
          <SelectItem key={role.value} value={role.value}>
            <div className="flex flex-col">
              <span className="font-medium">{role.label}</span>
              <span className="text-xs text-gray-500">{role.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
