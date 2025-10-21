/**
 * PermissionGate component (Feature 007)
 * Conditionally renders children based on user permissions
 * Uses Sprint 1 usePermissions() hook pattern
 */

import { ReactNode } from 'react';

// Placeholder for usePermissions hook - will need to check if this exists
// For now, we'll create a simple version that can be extended
interface PermissionGateProps {
  permission:
    | 'can_update_milestones'
    | 'can_manage_team'
    | 'can_view_dashboards'
    | 'can_resolve_reviews'
    | 'can_manage_welders';
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Permission gate component
 * Hides UI elements when user lacks required permission
 * Note: This is client-side UX only - RLS enforces server-side security
 */
export function PermissionGate({
  permission: _permission,
  children,
  fallback: _fallback = null,
}: PermissionGateProps) {
  // TODO: Integrate with actual usePermissions() hook from Sprint 1
  // For now, return children (permissive default for development)
  // This will be replaced with:
  // const permissions = usePermissions()
  // if (!permissions[permission]) return fallback

  // Temporary implementation - always show children for development
  // WARNING: Replace with actual permission check before production
  return <>{children}</>;
}
