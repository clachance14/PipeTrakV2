// T015: PermissionBadge component
import type { Permission } from '@/lib/permissions';

interface PermissionBadgeProps {
  permission: Permission;
  hasPermission: boolean;
}

export function PermissionBadge({ permission, hasPermission }: PermissionBadgeProps) {
  // Convert snake_case to Title Case
  const formatPermissionName = (perm: Permission): string => {
    return perm
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const permissionName = formatPermissionName(permission);
  const icon = hasPermission ? '✓' : '✗';

  const badgeClasses = hasPermission
    ? 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200'
    : 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200';

  const ariaLabel = hasPermission
    ? `${permissionName}: Granted`
    : `${permissionName}: Not granted`;

  return (
    <span
      className={badgeClasses}
      role="status"
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <span className="select-none" aria-hidden="true">
        {icon}
      </span>
      <span>{permissionName}</span>
    </span>
  );
}
