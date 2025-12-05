/**
 * Manhour Permissions Helper
 * Feature: 032-manhour-earned-value
 *
 * Provides permission checks for manhour data access and budget editing.
 * Only Owner, Admin, and Project Manager roles can view manhours and edit budgets.
 */

import { useAuth } from '@/contexts/AuthContext';
import type { Role } from '@/types/team.types';

/**
 * Roles that have access to manhour data
 */
const MANHOUR_ROLES: Role[] = ['owner', 'admin', 'project_manager'];

/**
 * Check if a role can view manhour data
 */
function canViewManhours(role: Role | undefined): boolean {
  if (!role) return false;
  return MANHOUR_ROLES.includes(role);
}

/**
 * Check if a role can edit budget data
 */
function canEditBudget(role: Role | undefined): boolean {
  if (!role) return false;
  return MANHOUR_ROLES.includes(role);
}

/**
 * Hook to get manhour permissions for the current authenticated user
 *
 * @returns Object with manhour permission flags
 *
 * @example
 * ```tsx
 * function ManhourReport() {
 *   const { canViewManhours, canEditBudget } = useManhourPermissions();
 *
 *   if (!canViewManhours) {
 *     return <AccessDenied />;
 *   }
 *
 *   return (
 *     <div>
 *       <ManhourChart />
 *       {canEditBudget && <BudgetEditor />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useManhourPermissions(): {
  canViewManhours: boolean;
  canEditBudget: boolean;
} {
  const { user } = useAuth();
  const role = user?.role;

  return {
    canViewManhours: canViewManhours(role),
    canEditBudget: canEditBudget(role),
  };
}
