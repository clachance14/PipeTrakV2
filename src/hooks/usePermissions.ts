/**
 * usePermissions Hook
 * Feature: 004-plan-the-single
 *
 * Provides convenient access to the current user's permissions based on their role.
 */

import { useAuth } from '@/contexts/AuthContext';
import { hasPermission as checkPermission, type Role, type Permission, ROLE_PERMISSIONS } from '@/lib/permissions';

export interface UsePermissionsReturn {
  // Boolean flags for each permission (camelCase)
  canUpdateMilestones: boolean;
  canImportWeldLog: boolean;
  canManageWelders: boolean;
  canResolveReviews: boolean;
  canViewDashboards: boolean;
  canManageTeam: boolean;
  canManageProject: boolean;

  // Function to check arbitrary permission
  hasPermission: (permission: Permission) => boolean;

  // Current user role
  role: Role | null;
}

/**
 * Hook to get permissions for the current authenticated user
 *
 * @returns Object with permission flags and utility functions
 *
 * @example
 * ```tsx
 * function MilestoneButton() {
 *   const { canUpdateMilestones } = usePermissions();
 *
 *   if (!canUpdateMilestones) {
 *     return <span>View Only</span>;
 *   }
 *
 *   return <Button onClick={updateMilestone}>Update</Button>;
 * }
 * ```
 */
export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth();

  // Get user role from the user object
  // @ts-ignore - user.role exists after migration
  const userRole: Role | null = user?.role || null;

  // If no user or no role, deny all permissions
  if (!userRole) {
    return {
      canUpdateMilestones: false,
      canImportWeldLog: false,
      canManageWelders: false,
      canResolveReviews: false,
      canViewDashboards: false,
      canManageTeam: false,
      canManageProject: false,
      hasPermission: () => false,
      role: null,
    };
  }

  // Get permissions for the user's role
  const permissions = ROLE_PERMISSIONS[userRole];

  return {
    canUpdateMilestones: permissions.includes('update_milestones'),
    canImportWeldLog: false, // Not a defined permission yet
    canManageWelders: permissions.includes('assign_welders'),
    canResolveReviews: false, // Not a defined permission yet
    canViewDashboards: permissions.includes('view_reports'),
    canManageTeam: permissions.includes('manage_team'),
    canManageProject: permissions.includes('manage_projects'),
    hasPermission: (permission: Permission) => checkPermission(userRole, permission),
    role: userRole,
  };
}
