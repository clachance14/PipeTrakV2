/**
 * Role-Based Permission System
 * Feature: 004-plan-the-single
 *
 * This module defines the permission matrix for all user roles.
 * Permissions are code-based (no database table) for better performance and version control.
 */

export type Role =
  | 'owner'
  | 'admin'
  | 'project_manager'
  | 'foreman'
  | 'qc_inspector'
  | 'welder'
  | 'viewer';

export type Permission =
  | 'can_update_milestones'
  | 'can_import_weld_log'
  | 'can_manage_welders'
  | 'can_resolve_reviews'
  | 'can_view_dashboards'
  | 'can_manage_team';

export interface RolePermissions {
  can_update_milestones: boolean;
  can_import_weld_log: boolean;
  can_manage_welders: boolean;
  can_resolve_reviews: boolean;
  can_view_dashboards: boolean;
  can_manage_team: boolean;
}

/**
 * Permission matrix mapping each role to its permissions.
 *
 * Role hierarchy (descending authority):
 * 1. owner - Full access to everything
 * 2. admin - Full access (same as owner)
 * 3. project_manager - Can manage milestones, resolve reviews, view dashboards
 * 4. qc_inspector - Can update milestones, resolve reviews, view dashboards
 * 5. foreman - Can update milestones, view dashboards
 * 6. welder - Can only update milestones
 * 7. viewer - Read-only access to dashboards
 */
export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  owner: {
    can_update_milestones: true,
    can_import_weld_log: true,
    can_manage_welders: true,
    can_resolve_reviews: true,
    can_view_dashboards: true,
    can_manage_team: true,
  },
  admin: {
    can_update_milestones: true,
    can_import_weld_log: true,
    can_manage_welders: true,
    can_resolve_reviews: true,
    can_view_dashboards: true,
    can_manage_team: true,
  },
  project_manager: {
    can_update_milestones: true,
    can_import_weld_log: false,
    can_manage_welders: false,
    can_resolve_reviews: true,
    can_view_dashboards: true,
    can_manage_team: false,
  },
  foreman: {
    can_update_milestones: true,
    can_import_weld_log: false,
    can_manage_welders: false,
    can_resolve_reviews: false,
    can_view_dashboards: true,
    can_manage_team: false,
  },
  qc_inspector: {
    can_update_milestones: true,
    can_import_weld_log: false,
    can_manage_welders: false,
    can_resolve_reviews: true,
    can_view_dashboards: true,
    can_manage_team: false,
  },
  welder: {
    can_update_milestones: true,
    can_import_weld_log: false,
    can_manage_welders: false,
    can_resolve_reviews: false,
    can_view_dashboards: false,
    can_manage_team: false,
  },
  viewer: {
    can_update_milestones: false,
    can_import_weld_log: false,
    can_manage_welders: false,
    can_resolve_reviews: false,
    can_view_dashboards: true,
    can_manage_team: false,
  },
} as const;

/**
 * Check if a role has a specific permission
 * @param role - User role from users.role column
 * @param permission - Permission key to check
 * @returns true if role has permission, false otherwise
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role][permission];
}

/**
 * Get all permissions for a role
 * @param role - User role from users.role column
 * @returns Object with all permission flags
 */
export function getRolePermissions(role: Role): RolePermissions {
  return ROLE_PERMISSIONS[role];
}

/**
 * Check if role can perform action (alias for hasPermission)
 * @param role - User role from users.role column
 * @param permission - Permission key to check
 * @returns true if role has permission, false otherwise
 */
export function can(role: Role, permission: Permission): boolean {
  return hasPermission(role, permission);
}

/**
 * Type alias for backward compatibility with existing code
 */
export type UserRole = Role;

/**
 * Check if role can manage team (owner or admin only)
 */
export function canManageTeam(role: Role): boolean {
  return hasPermission(role, 'can_manage_team');
}

/**
 * Check if role can manage billing (owner only in this implementation)
 * Currently all roles with can_manage_team can also manage billing
 */
export function canManageBilling(role: Role): boolean {
  return role === 'owner';
}

/**
 * Get redirect path based on user role
 */
export function getRoleRedirectPath(role: Role): string {
  switch (role) {
    case 'owner':
    case 'admin':
      return '/';
    case 'project_manager':
      return '/';
    case 'foreman':
    case 'qc_inspector':
    case 'welder':
      return '/';
    case 'viewer':
      return '/';
    default:
      return '/';
  }
}
