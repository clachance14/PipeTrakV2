// T016: ExpandablePermissionsRow component
import { PermissionBadge } from './PermissionBadge';
import { ROLE_PERMISSIONS, type Permission } from '@/lib/permissions';
import type { Role } from '@/types/team.types';

interface ExpandablePermissionsRowProps {
  role: Role;
  isExpanded: boolean;
  userId: string;
}

const ALL_PERMISSIONS: Permission[] = [
  'manage_drawings',
  'assign_metadata',
  'update_milestones',
  'assign_welders',
  'manage_team',
  'view_reports',
  'manage_projects',
];

export function ExpandablePermissionsRow({ role, isExpanded, userId }: ExpandablePermissionsRowProps) {
  if (!isExpanded) {
    return null;
  }

  const userPermissions = ROLE_PERMISSIONS[role];

  return (
    <div
      id={`permissions-${userId}`}
      className="bg-slate-50 px-6 py-4 border-t border-slate-200"
      role="region"
      aria-label="Permission breakdown"
    >
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-700">Permissions</h4>
        <div className="flex flex-wrap gap-2">
          {ALL_PERMISSIONS.map(permission => {
            const hasPermission = userPermissions.includes(permission);
            return (
              <PermissionBadge
                key={permission}
                permission={permission}
                hasPermission={hasPermission}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
