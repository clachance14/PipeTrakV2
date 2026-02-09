// src/lib/permissions.ts

import type { Role } from '@/types/team.types';

// Re-export Role type for convenience
export type { Role };

// Legacy alias for backward compatibility
export type UserRole = Role;

export type Permission =
  | 'manage_drawings'
  | 'assign_metadata'
  | 'update_milestones'
  | 'assign_welders'
  | 'manage_team'
  | 'view_reports'
  | 'manage_projects';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ['manage_drawings', 'assign_metadata', 'update_milestones', 'assign_welders', 'manage_team', 'view_reports', 'manage_projects'],
  admin: ['manage_drawings', 'assign_metadata', 'update_milestones', 'assign_welders', 'manage_team', 'view_reports'],
  project_manager: ['manage_drawings', 'assign_metadata', 'update_milestones', 'assign_welders', 'view_reports'],
  foreman: ['assign_metadata', 'update_milestones', 'assign_welders'],
  qc_inspector: ['update_milestones', 'view_reports'],
  welder: ['update_milestones'],
  viewer: ['view_reports'],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canManageTeam(role: Role): boolean {
  return hasPermission(role, 'manage_team');
}

export function canManageBilling(role: Role): boolean {
  return role === 'owner';
}

export function canCreateFieldWeld(role: Role): boolean {
  return ['owner', 'admin', 'project_manager', 'foreman', 'qc_inspector'].includes(role);
}

export function canDeleteFieldWeld(role: Role): boolean {
  return ['owner', 'admin', 'project_manager', 'foreman', 'qc_inspector'].includes(role);
}

// Role-based redirect paths for post-login/registration
export function getRoleRedirectPath(role: Role): string {
  switch (role) {
    case 'owner':
    case 'admin':
    case 'project_manager':
      return '/components'; // Most common landing page for managers
    case 'foreman':
    case 'qc_inspector':
      return '/components'; // Field staff also start at components
    case 'welder':
      return '/weld-log'; // Welders go directly to weld log
    case 'viewer':
      return '/components'; // Viewers can see progress
    default:
      return '/components';
  }
}
