# Permission System API Contract

## Role-Based Permission Mapping

**File**: `src/lib/permissions.ts`
**Purpose**: Define role-to-permission mappings without database table

### Types

```typescript
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
```

### Permission Matrix

```typescript
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
    can_import_milestones: false,
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
```

### Public API

```typescript
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
```

## Contract Tests

**File**: `tests/contract/permissions-api.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { hasPermission, getRolePermissions, ROLE_PERMISSIONS } from '@/lib/permissions';

describe('Permission System Contract', () => {
  describe('Role Completeness', () => {
    it('defines permissions for all 7 roles', () => {
      const roles = Object.keys(ROLE_PERMISSIONS);
      expect(roles).toHaveLength(7);
      expect(roles).toContain('owner');
      expect(roles).toContain('admin');
      expect(roles).toContain('project_manager');
      expect(roles).toContain('foreman');
      expect(roles).toContain('qc_inspector');
      expect(roles).toContain('welder');
      expect(roles).toContain('viewer');
    });

    it('defines all 6 permissions for each role', () => {
      Object.values(ROLE_PERMISSIONS).forEach(permissions => {
        expect(Object.keys(permissions)).toHaveLength(6);
        expect(permissions).toHaveProperty('can_update_milestones');
        expect(permissions).toHaveProperty('can_import_weld_log');
        expect(permissions).toHaveProperty('can_manage_welders');
        expect(permissions).toHaveProperty('can_resolve_reviews');
        expect(permissions).toHaveProperty('can_view_dashboards');
        expect(permissions).toHaveProperty('can_manage_team');
      });
    });
  });

  describe('Owner Permissions', () => {
    it('owner has all permissions', () => {
      expect(hasPermission('owner', 'can_update_milestones')).toBe(true);
      expect(hasPermission('owner', 'can_import_weld_log')).toBe(true);
      expect(hasPermission('owner', 'can_manage_welders')).toBe(true);
      expect(hasPermission('owner', 'can_resolve_reviews')).toBe(true);
      expect(hasPermission('owner', 'can_view_dashboards')).toBe(true);
      expect(hasPermission('owner', 'can_manage_team')).toBe(true);
    });
  });

  describe('Admin Permissions', () => {
    it('admin has all permissions (same as owner)', () => {
      expect(hasPermission('admin', 'can_update_milestones')).toBe(true);
      expect(hasPermission('admin', 'can_import_weld_log')).toBe(true);
      expect(hasPermission('admin', 'can_manage_welders')).toBe(true);
      expect(hasPermission('admin', 'can_resolve_reviews')).toBe(true);
      expect(hasPermission('admin', 'can_view_dashboards')).toBe(true);
      expect(hasPermission('admin', 'can_manage_team')).toBe(true);
    });
  });

  describe('Project Manager Permissions', () => {
    it('project_manager can update milestones', () => {
      expect(hasPermission('project_manager', 'can_update_milestones')).toBe(true);
    });

    it('project_manager can resolve reviews', () => {
      expect(hasPermission('project_manager', 'can_resolve_reviews')).toBe(true);
    });

    it('project_manager can view dashboards', () => {
      expect(hasPermission('project_manager', 'can_view_dashboards')).toBe(true);
    });

    it('project_manager cannot import weld logs', () => {
      expect(hasPermission('project_manager', 'can_import_weld_log')).toBe(false);
    });

    it('project_manager cannot manage welders', () => {
      expect(hasPermission('project_manager', 'can_manage_welders')).toBe(false);
    });

    it('project_manager cannot manage team', () => {
      expect(hasPermission('project_manager', 'can_manage_team')).toBe(false);
    });
  });

  describe('Foreman Permissions', () => {
    it('foreman can update milestones', () => {
      expect(hasPermission('foreman', 'can_update_milestones')).toBe(true);
    });

    it('foreman can view dashboards', () => {
      expect(hasPermission('foreman', 'can_view_dashboards')).toBe(true);
    });

    it('foreman cannot import weld logs', () => {
      expect(hasPermission('foreman', 'can_import_weld_log')).toBe(false);
    });

    it('foreman cannot manage welders', () => {
      expect(hasPermission('foreman', 'can_manage_welders')).toBe(false);
    });

    it('foreman cannot resolve reviews', () => {
      expect(hasPermission('foreman', 'can_resolve_reviews')).toBe(false);
    });

    it('foreman cannot manage team', () => {
      expect(hasPermission('foreman', 'can_manage_team')).toBe(false);
    });
  });

  describe('QC Inspector Permissions', () => {
    it('qc_inspector can update milestones', () => {
      expect(hasPermission('qc_inspector', 'can_update_milestones')).toBe(true);
    });

    it('qc_inspector can resolve reviews', () => {
      expect(hasPermission('qc_inspector', 'can_resolve_reviews')).toBe(true);
    });

    it('qc_inspector can view dashboards', () => {
      expect(hasPermission('qc_inspector', 'can_view_dashboards')).toBe(true);
    });

    it('qc_inspector cannot import weld logs', () => {
      expect(hasPermission('qc_inspector', 'can_import_weld_log')).toBe(false);
    });

    it('qc_inspector cannot manage welders', () => {
      expect(hasPermission('qc_inspector', 'can_manage_welders')).toBe(false);
    });

    it('qc_inspector cannot manage team', () => {
      expect(hasPermission('qc_inspector', 'can_manage_team')).toBe(false);
    });
  });

  describe('Welder Permissions', () => {
    it('welder can update milestones', () => {
      expect(hasPermission('welder', 'can_update_milestones')).toBe(true);
    });

    it('welder cannot import weld logs', () => {
      expect(hasPermission('welder', 'can_import_weld_log')).toBe(false);
    });

    it('welder cannot manage welders', () => {
      expect(hasPermission('welder', 'can_manage_welders')).toBe(false);
    });

    it('welder cannot resolve reviews', () => {
      expect(hasPermission('welder', 'can_resolve_reviews')).toBe(false);
    });

    it('welder cannot view dashboards', () => {
      expect(hasPermission('welder', 'can_view_dashboards')).toBe(false);
    });

    it('welder cannot manage team', () => {
      expect(hasPermission('welder', 'can_manage_team')).toBe(false);
    });
  });

  describe('Viewer Permissions', () => {
    it('viewer can view dashboards', () => {
      expect(hasPermission('viewer', 'can_view_dashboards')).toBe(true);
    });

    it('viewer cannot update milestones', () => {
      expect(hasPermission('viewer', 'can_update_milestones')).toBe(false);
    });

    it('viewer cannot import weld logs', () => {
      expect(hasPermission('viewer', 'can_import_weld_log')).toBe(false);
    });

    it('viewer cannot manage welders', () => {
      expect(hasPermission('viewer', 'can_manage_welders')).toBe(false);
    });

    it('viewer cannot resolve reviews', () => {
      expect(hasPermission('viewer', 'can_resolve_reviews')).toBe(false);
    });

    it('viewer cannot manage team', () => {
      expect(hasPermission('viewer', 'can_manage_team')).toBe(false);
    });
  });

  describe('getRolePermissions', () => {
    it('returns all permissions for a role', () => {
      const permissions = getRolePermissions('owner');
      expect(permissions).toEqual({
        can_update_milestones: true,
        can_import_weld_log: true,
        can_manage_welders: true,
        can_resolve_reviews: true,
        can_view_dashboards: true,
        can_manage_team: true,
      });
    });
  });
});
```

## Usage in Components

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MilestoneButton({ milestone }: { milestone: string }) {
  const { canUpdateMilestones } = usePermissions();

  if (!canUpdateMilestones) {
    return <span className="text-muted-foreground">{milestone}</span>;
  }

  return (
    <Button onClick={() => toggleMilestone(milestone)}>
      {milestone}
    </Button>
  );
}
```

## Contract Guarantees

1. ✅ All 7 roles defined with complete permissions
2. ✅ All 6 permissions defined for each role
3. ✅ Type-safe permission checks
4. ✅ No database queries required for permission checks
5. ✅ Permissions are code-reviewed and version-controlled
6. ✅ Tests document expected permissions for each role
