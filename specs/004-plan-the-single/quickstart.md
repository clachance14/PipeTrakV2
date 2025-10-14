# Quickstart: Single-Organization User Model Verification

**Feature**: 004-plan-the-single
**Purpose**: Validate the single-organization refactor is working correctly
**Time**: ~10 minutes

## Prerequisites

- Feature implementation complete
- All tests passing (`npm test`)
- TypeScript compilation successful (`tsc -b`)
- Supabase migrations applied
- Development server running (`npm run dev`)

## Verification Steps

### 1. Database Schema Validation

**Verify `user_organizations` table removed**:
```bash
npx supabase db diff --schema public --linked
```

**Expected**: No `user_organizations` table listed

**Verify `users` table has new columns**:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name IN ('organization_id', 'role');
```

**Expected Output**:
```
 column_name      | data_type | is_nullable
------------------+-----------+-------------
 organization_id  | uuid      | NO
 role             | text      | NO
```

**Verify role check constraint**:
```sql
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
  AND constraint_name LIKE '%role%';
```

**Expected**: Constraint with 7 valid roles listed

### 2. RLS Policy Validation

**Verify policies use direct organization relationship**:
```sql
SELECT schemaname, tablename, policyname, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'organizations', 'projects', 'invitations');
```

**Expected**: Policies reference `(SELECT organization_id FROM users WHERE id = auth.uid())` pattern, NOT `user_organizations` table

### 3. User Data Validation

**Verify existing user has organization**:
```sql
SELECT id, email, organization_id, role
FROM users;
```

**Expected**: Single user row with `organization_id` and `role` populated (NOT NULL)

### 4. Type Generation Validation

**Verify types updated**:
```bash
cat src/types/database.types.ts | grep -A 10 "export type User"
```

**Expected**: User type includes `organization_id` and `role` fields as required (not nullable)

### 5. Frontend Component Validation

**Verify OrganizationSwitcher removed**:
```bash
find src -name "*OrganizationSwitcher*"
```

**Expected**: No files found

**Verify Layout doesn't reference switcher**:
```bash
grep -r "OrganizationSwitcher" src/components/Layout.tsx
```

**Expected**: No matches

### 6. Permission System Validation

**Verify permissions file exists**:
```bash
ls -la src/lib/permissions.ts
```

**Expected**: File exists

**Verify ROLE_PERMISSIONS export**:
```bash
grep "export const ROLE_PERMISSIONS" src/lib/permissions.ts
```

**Expected**: Match found with 7 roles defined

### 7. Hook Validation

**Verify useOrganization updated**:
```bash
grep "switchOrganizationMutation\|leaveOrganizationMutation" src/hooks/useOrganization.ts
```

**Expected**: No matches (functions removed)

**Verify useCurrentOrganization exists**:
```bash
grep "useCurrentOrganization" src/hooks/useOrganization.ts
```

**Expected**: Match found

**Verify usePermissions exists**:
```bash
ls -la src/hooks/usePermissions.ts
```

**Expected**: File exists

### 8. Integration Test Validation

**Run contract tests**:
```bash
npm test -- tests/contract/
```

**Expected**: All contract tests pass
- `migration-schema.test.ts` - Migration validation
- `hooks-api.test.ts` - Hook contracts
- `permissions-api.test.ts` - Permission matrix

**Run RLS integration tests**:
```bash
npm test -- tests/integration/rls/
```

**Expected**: All RLS tests pass, single-org isolation verified

### 9. Manual UI Testing

**Test 1: Registration Flow**
1. Navigate to `/register`
2. Create new account with organization name
3. Submit registration
4. **Expected**: User created with `organization_id` and `role='owner'` in database
5. **Expected**: No organization switcher UI visible after login

**Test 2: Invitation Flow (User Without Org)**
1. As admin, invite new user via `/team`
2. Copy invitation link
3. Open in incognito window
4. Accept invitation
5. **Expected**: User created with organization from invitation
6. **Expected**: Login successful, no org switcher

**Test 3: Invitation Flow (User With Org)**
1. As admin, invite existing user's email
2. Existing user clicks invitation link
3. **Expected**: Error message "Cannot accept invitation: user already belongs to an organization"
4. **Expected**: Invitation not accepted

**Test 4: Permission Checks**
1. Login as user with role 'viewer'
2. Navigate to milestone tracking page
3. **Expected**: Milestone buttons disabled (no `can_update_milestones` permission)
4. **Expected**: Dashboard visible (`can_view_dashboards` permission)

**Test 5: Team Management**
1. Login as owner
2. Navigate to `/team`
3. Attempt to change own role
4. **Expected**: Role change allowed (owner can manage team)
5. **Expected**: Cannot remove self if last owner

### 10. Performance Validation

**Benchmark organization query performance**:
```sql
EXPLAIN ANALYZE
SELECT *
FROM projects
WHERE organization_id = (
  SELECT organization_id FROM users WHERE id = 'USER_ID_HERE'
);
```

**Expected**:
- Query plan shows simple sequential scan or index scan
- NO JOIN to `user_organizations` table (doesn't exist)
- Execution time < 10ms for small dataset

### 11. Test Coverage Validation

**Run coverage report**:
```bash
npm test -- --coverage
```

**Expected**:
- Overall coverage ≥70%
- `src/lib/permissions.ts` coverage ≥80%
- `src/hooks/useOrganization.ts` coverage ≥80%
- `src/hooks/usePermissions.ts` coverage ≥80%

## Success Criteria

- ✅ `user_organizations` table no longer exists
- ✅ `users` table has `organization_id` and `role` columns
- ✅ All RLS policies updated to use direct organization relationship
- ✅ Existing user has organization and role assigned
- ✅ OrganizationSwitcher component removed from codebase
- ✅ Permission system (`ROLE_PERMISSIONS`) defined in code
- ✅ `usePermissions()` hook available and tested
- ✅ `useCurrentOrganization()` returns user's single organization
- ✅ Invitation acceptance blocks users with existing organization
- ✅ All tests passing with ≥70% coverage
- ✅ Type generation includes new User schema
- ✅ No TypeScript errors (`tsc -b` clean)

## Rollback Procedure (if needed)

Since this is a development environment with minimal data:

1. **Drop current schema**:
   ```bash
   npx supabase db reset --linked
   ```

2. **Re-apply migrations up to previous version**:
   ```bash
   # Migrations will auto-apply up to 00007_fix_organizations_insert_policy.sql
   # Skip the single-org migration
   ```

3. **Restore code to previous commit**:
   ```bash
   git checkout 003-plan-complete-user
   npm install
   npm run dev
   ```

4. **Verify multi-org model restored**:
   - `user_organizations` table exists
   - OrganizationSwitcher visible in UI
   - User can belong to multiple organizations

## Troubleshooting

**Issue**: Migration fails with "users without organization found"
**Solution**: Check pre-migration validation, ensure all users have exactly one row in `user_organizations`

**Issue**: TypeScript errors after migration
**Solution**: Re-run `npx supabase gen types typescript --linked > src/types/database.types.ts`

**Issue**: RLS tests failing
**Solution**: Verify RLS policies were updated to reference `users.organization_id`, not `user_organizations`

**Issue**: Permission checks not working
**Solution**: Verify `usePermissions()` hook is using `user.role` from session, and `ROLE_PERMISSIONS` is imported correctly

## Next Steps

After quickstart passes:
1. Run full test suite: `npm test`
2. Build production bundle: `npm run build`
3. Deploy to staging environment
4. Monitor for regressions
5. Update CLAUDE.md with single-org architecture notes
6. Create PR for review
