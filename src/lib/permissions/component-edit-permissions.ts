import type { Role } from '@/types/team.types';

const COMPONENT_EDIT_ROLES: Role[] = ['owner', 'admin', 'project_manager', 'qc_inspector'];

export function canEditComponents(role: Role | null): boolean {
  if (!role) return false;
  return COMPONENT_EDIT_ROLES.includes(role);
}
