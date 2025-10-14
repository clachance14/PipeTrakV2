# Research: Single-Organization User Model Refactor

**Feature**: 004-plan-the-single
**Date**: 2025-10-07
**Status**: Complete

## Executive Summary

This research phase identifies the technical approach for refactoring the multi-organization user model to a single-organization model. The clarifications from the spec confirm this is a development environment refactor with minimal data (single user, single organization), significantly simplifying the migration strategy.

## Technical Decisions

### Decision 1: Database Migration Approach

**Chosen**: Drop and recreate schema with data preservation script

**Rationale**:
- Development environment with only one user
- No production data at risk
- Simpler than complex ALTER TABLE migrations
- Faster execution
- Easy rollback (re-run previous migrations)

**Alternatives Considered**:
- **ALTER TABLE with column additions**: More complex, unnecessary for dev environment
- **Blue-green migration**: Overkill for single-user database
- **Online migration with zero downtime**: Not required per NFR-004

**Implementation**:
1. Export existing user data (single row)
2. Create new migration file that:
   - Drops `user_organizations` table
   - Adds `organization_id` and `role` columns to `users` table
   - Adds NOT NULL constraints and foreign keys
   - Re-imports user data with organization assignment
3. Update all RLS policies to reference `users.organization_id`

### Decision 2: Role-Based Permission System

**Chosen**: Code-defined permission mapping (TypeScript const object)

**Rationale**:
- Eliminates `user_capabilities` table complexity
- Permissions are business logic, not data
- Easier to version control and review
- Type-safe at compile time
- Matches shadcn/ui patterns for configuration

**Alternatives Considered**:
- **Database-stored capabilities**: Adds table, requires migrations for permission changes
- **JSONB capabilities column on users**: Less type-safe, harder to query

**Implementation**:
```typescript
// src/lib/permissions.ts
export const ROLE_PERMISSIONS = {
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

export type Role = keyof typeof ROLE_PERMISSIONS;
export type Permission = keyof typeof ROLE_PERMISSIONS.owner;

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role][permission];
}
```

### Decision 3: RLS Policy Update Strategy

**Chosen**: Update existing policies in-place, reference `users.organization_id`

**Rationale**:
- RLS policies currently check `user_organizations` junction table
- New model stores `organization_id` directly on `users` table
- Simpler queries (no JOIN required)
- Better performance (one less table lookup)

**Migration Pattern**:
```sql
-- OLD (junction table)
CREATE POLICY "Users can read own org projects"
  ON projects FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations
    WHERE user_id = auth.uid()
  ));

-- NEW (direct relationship)
CREATE POLICY "Users can read own org projects"
  ON projects FOR SELECT
  USING (organization_id = (
    SELECT organization_id FROM users
    WHERE id = auth.uid()
  ));
```

**Tables Requiring RLS Updates**:
1. `organizations` - Already references user_organizations
2. `users` - Update to allow users to read own record
3. `projects` - Update organization filter
4. `invitations` - Update to check user doesn't have organization
5. Future tables (components, drawings, etc.) - Will use new pattern

### Decision 4: Frontend Component Removal Strategy

**Chosen**: Delete OrganizationSwitcher component and all references

**Rationale**:
- Component no longer needed in single-org model
- Simplifies UI
- Removes state management complexity
- Users always scoped to their one organization

**Components to Remove**:
- `src/components/team/OrganizationSwitcher.tsx`
- Zustand store slice for active organization (if exists)
- Any organization selection UI in Layout

**Components to Update**:
- `src/hooks/useOrganization.ts` - Remove `switchOrganization` mutation
- `src/hooks/useInvitations.ts` - Add validation for existing organization
- `src/pages/AcceptInvitation.tsx` - Block users with organization
- `src/pages/Register.tsx` - Ensure organization assignment on creation

### Decision 5: Test Update Strategy

**Chosen**: Update existing tests with new data setup patterns

**Rationale**:
- Tests currently mock multi-org scenarios
- Need to update to single-org patterns
- Maintain ≥70% coverage requirement
- Tests document new behavior

**Test Updates Required**:
1. **AuthContext tests**: User has organization in session
2. **Registration tests**: User assigned to organization
3. **Invitation tests**: Reject if user has organization
4. **Team management tests**: Remove org switching tests
5. **RLS tests** (new): Verify organization isolation

### Decision 6: Type Generation Strategy

**Chosen**: Re-generate types from updated schema

**Rationale**:
- Constitution mandates auto-generated types
- Schema changes require type updates
- Ensures type safety across refactor

**Command**: `npx supabase gen types typescript --linked > src/types/database.types.ts`

**Expected Type Changes**:
- `Database['public']['Tables']['users']` gains `organization_id` and `role` columns
- `Database['public']['Tables']['user_organizations']` removed from types
- All queries updated to match new types

## Technology Stack (No Changes)

- **Language**: TypeScript 5 (strict mode)
- **Framework**: React 18 + Vite
- **Database**: PostgreSQL (Supabase)
- **Testing**: Vitest + Testing Library
- **State Management**: TanStack Query (server state), Zustand (client state)
- **UI**: shadcn/ui + Radix UI + Tailwind CSS v4

## Performance Considerations

### Query Performance Improvements

**Before** (junction table):
```sql
-- Requires JOIN through user_organizations
SELECT * FROM projects
WHERE organization_id IN (
  SELECT organization_id FROM user_organizations
  WHERE user_id = auth.uid()
);
```

**After** (direct relationship):
```sql
-- Single subquery, no JOIN
SELECT * FROM projects
WHERE organization_id = (
  SELECT organization_id FROM users
  WHERE id = auth.uid()
);
```

**Expected Impact**:
- Faster RLS policy evaluation
- Simpler query plans
- One less table in query path
- Better index utilization

### Migration Performance

**Estimated Time**: <1 second
- Single user to migrate
- No multi-org complexity
- Simple column addition

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Breaking existing tests | High | Medium | Update tests in same commit as migration |
| RLS policy bugs | Medium | High | Write RLS integration tests first (TDD) |
| Missing component updates | Medium | Medium | Grep for all references to removed components |
| Type errors after generation | Low | Medium | Run `tsc -b` before committing |
| Data loss during migration | Very Low | High | Export user data first, verify after migration |

## Open Questions Resolved

All questions from spec resolved via clarifications:
1. ✅ Multi-org users: None exist, migration validates
2. ✅ Orphaned users: None exist, migration validates
3. ✅ Rollback strategy: Dev environment, can drop/recreate

## Next Steps

Proceed to Phase 1:
1. Generate data model document
2. Create migration contract (SQL schema)
3. Define API contracts for updated hooks
4. Generate quickstart verification steps
5. Update CLAUDE.md with architectural changes
