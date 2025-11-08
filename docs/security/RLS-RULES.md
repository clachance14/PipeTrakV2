# Row Level Security (RLS) Rules

**Last Updated**: 2025-11-06
**Database Version**: 82 migrations applied
**Architecture**: Single-organization model (refactored from multi-tenant in Migration 00008)

---

## Table of Contents

1. [Core RLS Principles](#core-rls-principles)
2. [Architecture Overview](#architecture-overview)
3. [Access Control Patterns](#access-control-patterns)
4. [Helper Functions](#helper-functions)
5. [Table-by-Table RLS Rules](#table-by-table-rls-rules)
6. [Special Cases](#special-cases)
7. [RLS Audit Checklist](#rls-audit-checklist)

---

## Core RLS Principles

### 1. Organization-Based Isolation
All data access is scoped to the user's organization. Users can **ONLY** access data belonging to their organization.

```sql
-- Standard organization check pattern
WHERE organization_id = (
  SELECT organization_id FROM users WHERE id = auth.uid()
)
```

### 2. Project-Based Access
Tables linked to projects inherit organization-level isolation through the project's organization.

```sql
-- Standard project-based check pattern
WHERE project_id IN (
  SELECT id FROM projects
  WHERE organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
)
```

### 3. Role-Based Authorization
Operations requiring elevated permissions check user roles:
- **owner**: Full control (create, update, delete all resources)
- **admin**: Nearly full control (cannot delete organization)
- **project_manager**: Can manage projects, components, and assignments
- **foreman**: Can manage milestones and field operations
- **qc_inspector**: Can manage quality control and inspections
- **welder**: Can view assigned work
- **viewer**: Read-only access

### 4. Soft Delete Support
All tables with `deleted_at` column exclude soft-deleted records from RLS checks:

```sql
AND deleted_at IS NULL
```

### 5. Self-Access Override
Users always have access to their own records (e.g., profile, avatar):

```sql
WHERE id = auth.uid()
```

---

## Architecture Overview

### Single-Organization Model (Migration 00008)
- **Before**: Multi-tenant with `user_organizations` junction table
- **After**: Direct `organization_id` and `role` columns on `users` table
- **Constraint**: Each user belongs to exactly ONE organization
- **Benefits**: Simplified RLS policies, faster query performance, clearer access model

### Key Tables
1. **organizations** - Top-level tenant isolation
2. **users** - User profiles with direct organization relationship
3. **projects** - Project containers within organizations
4. **components** - Core pipe tracking entities (project-scoped)
5. **drawings** - Drawing metadata (project-scoped)
6. **areas, systems, test_packages** - Metadata groupings (project-scoped)
7. **welders, field_welds** - Welder and weld tracking (project-scoped)
8. **invitations** - Team member invitations (organization-scoped)

---

## Access Control Patterns

### Pattern 1: Organization-Scoped Tables
**Tables**: `users`, `invitations`, `organizations`

**SELECT Policy**:
```sql
CREATE POLICY "Users can read own organization"
  ON [table_name] FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

### Pattern 2: Project-Scoped Tables
**Tables**: `drawings`, `areas`, `systems`, `test_packages`, `components`, `milestone_events`, `welders`, `field_welds`, `field_weld_inspections`, `needs_review`, `audit_log`, `field_weld_report_snapshots`, `report_configs`

**SELECT Policy**:
```sql
CREATE POLICY "Users can view [table] in their organization"
  ON [table_name] FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );
```

**INSERT Policy**:
```sql
CREATE POLICY "Users can insert [table] in their organization"
  ON [table_name] FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );
```

### Pattern 3: Role-Based Write Operations
**Use Case**: Operations requiring elevated permissions (UPDATE, DELETE)

**UPDATE Policy (Admin/Owner)**:
```sql
CREATE POLICY "Users can update [table] if they have permission"
  ON [table_name] FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector')
    )
  );
```

**DELETE Policy (Admin Only)**:
```sql
CREATE POLICY "Users can delete [table] if they are admin"
  ON [table_name] FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );
```

### Pattern 4: Self-Access (Own Records)
**Tables**: `users` (profile updates), `report_configs` (user-created configs)

**UPDATE Policy**:
```sql
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

### Pattern 5: Public Templates
**Tables**: `progress_templates` (milestone templates for component types)

**SELECT Policy**:
```sql
CREATE POLICY "Authenticated users can view progress_templates"
  ON progress_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);
```

### Pattern 6: Special Invitation Access
**Use Case**: Unauthenticated users viewing invitations by token

**SELECT Policy (Token-Based)**:
```sql
CREATE POLICY "Anyone can view invitation by token_hash"
  ON invitations FOR SELECT
  USING (
    token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex')
  );
```

### Pattern 7: Super Admin Override
**Use Case**: Platform-level support access

**SELECT Policy (with Super Admin)**:
```sql
CREATE POLICY "Users read policy"
  ON users FOR SELECT
  USING (
    is_super_admin()           -- Super admins see all
    OR id = auth.uid()         -- Users see their own record
    OR organization_id = (     -- Users see others in their org
      SELECT organization_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL
    )
  );
```

---

## Helper Functions

### 1. `get_user_org_role(user_uuid UUID, org_uuid UUID)`
Returns the role of a user within an organization.

**Definition** (Migration 00038):
```sql
CREATE OR REPLACE FUNCTION get_user_org_role(user_uuid UUID, org_uuid UUID)
RETURNS user_role AS $$
DECLARE
  user_role_result user_role;
BEGIN
  SELECT role INTO user_role_result
  FROM users
  WHERE id = user_uuid
    AND organization_id = org_uuid
    AND deleted_at IS NULL
  LIMIT 1;

  RETURN user_role_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage**:
```sql
-- Check if user is owner/admin
WHERE get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
```

**IMPORTANT**: This function uses `SECURITY DEFINER` to bypass RLS when checking roles. This prevents infinite recursion in RLS policies.

### 2. `is_super_admin()`
Checks if the current user is a platform super admin.

**Definition** (Migration 00006):
```sql
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND is_super_admin = TRUE
  );
END;
$$;
```

**Usage**:
```sql
-- Super admins bypass organization isolation
WHERE is_super_admin() OR organization_id = (...)
```

### 3. `check_email_has_organization(check_email TEXT)`
Checks if an email is already associated with an organization (for invitation validation).

**Definition** (Migration 00041):
```sql
CREATE OR REPLACE FUNCTION check_email_has_organization(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE email = check_email
      AND organization_id IS NOT NULL
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage**:
```sql
-- Validate invitation before sending
SELECT check_email_has_organization('user@example.com');
```

---

## Table-by-Table RLS Rules

### Core Tables

#### 1. `organizations`
**RLS Enabled**: Yes
**Policies**:
- **SELECT**: Users can read their own organization
  ```sql
  USING (id = (SELECT organization_id FROM users WHERE id = auth.uid()))
  ```
- **INSERT**: Authenticated users can create organizations (for new signups)
  ```sql
  WITH CHECK (true)  -- See Migration 00082
  ```
- **UPDATE**: Owners can update their organization
  ```sql
  USING (get_user_org_role(auth.uid(), id) = 'owner')
  ```

#### 2. `users`
**RLS Enabled**: Yes
**Policies**:
- **SELECT**: Super admins see all, users see own record + org members
  ```sql
  USING (
    is_super_admin()
    OR id = auth.uid()
    OR organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL
    )
  )
  ```
- **INSERT**: System can insert users (SECURITY DEFINER trigger)
  ```sql
  WITH CHECK (true)  -- Controlled via trigger, see Migration 00043
  ```
- **UPDATE**: Users can update own profile
  ```sql
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND organization_id = (...))
  ```
- **UPDATE**: Owners/admins can update members in their org (soft delete)
  ```sql
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'))
  ```

#### 3. `projects`
**RLS Enabled**: Yes
**Policies**:
- **SELECT**: Users can read projects in their organization
  ```sql
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()))
  ```
- **INSERT**: Users can create projects in their organization
  ```sql
  WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()))
  ```
- **UPDATE**: Users can update projects in their organization
  ```sql
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()))
  ```
- **DELETE**: Users can delete projects in their organization
  ```sql
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()))
  ```

#### 4. `invitations`
**RLS Enabled**: Yes
**Policies**:
- **SELECT (Token)**: Anyone can view invitation by token_hash (for acceptance)
  ```sql
  USING (token_hash IS NOT NULL)  -- See Migration 00037
  ```
- **SELECT (Org)**: Authenticated users can view invitations in their org
  ```sql
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()))
  ```
- **INSERT**: Owners/admins can create invitations for their org
  ```sql
  WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  )
  ```
- **UPDATE**: Owners/admins can update invitations for their org (revoke, resend)
  ```sql
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'))
  ```

### Project-Scoped Tables

#### 5. `drawings`
**RLS Enabled**: Yes
**Policies**: Standard project-scoped (SELECT, INSERT, UPDATE)

#### 6. `areas`
**RLS Enabled**: Yes
**Policies**: Standard project-scoped (SELECT, INSERT)

#### 7. `systems`
**RLS Enabled**: Yes
**Policies**: Standard project-scoped (SELECT, INSERT)

#### 8. `test_packages`
**RLS Enabled**: Yes
**Policies**: Standard project-scoped (SELECT, INSERT)

#### 9. `components`
**RLS Enabled**: Yes
**Policies**: Standard project-scoped (SELECT, INSERT, UPDATE)

#### 10. `milestone_events`
**RLS Enabled**: Yes
**Policies**: Standard project-scoped (SELECT, INSERT)

#### 11. `welders`
**RLS Enabled**: Yes
**Policies**:
- **SELECT**: Standard project-scoped
- **INSERT**: Standard project-scoped
- **UPDATE**: Requires `can_manage_welders` permission
  ```sql
  USING (
    project_id IN (SELECT id FROM projects WHERE organization_id = (...))
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector')
    )
  )
  ```

#### 12. `field_welds`
**RLS Enabled**: Yes
**Policies**:
- **SELECT**: Standard project-scoped
- **INSERT**: Requires `can_update_milestones` permission
  ```sql
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE organization_id = (...))
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector')
    )
  )
  ```
- **UPDATE**: Same as INSERT
- **DELETE**: Admin only
  ```sql
  USING (
    project_id IN (SELECT id FROM projects WHERE organization_id = (...))
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  ```

#### 13. `field_weld_inspections`
**RLS Enabled**: Yes
**Policies**: Same pattern as `field_welds` (SELECT, INSERT, UPDATE, DELETE)

#### 14. `needs_review`
**RLS Enabled**: Yes
**Policies**:
- **SELECT**: Standard project-scoped
- **INSERT**: Standard project-scoped
- **UPDATE**: Requires `can_update_milestones` permission (for resolution)
- **DELETE**: Standard project-scoped

#### 15. `audit_log`
**RLS Enabled**: Yes
**Policies**:
- **SELECT**: Standard project-scoped
- **INSERT**: Standard project-scoped

#### 16. `field_weld_report_snapshots`
**RLS Enabled**: Yes
**Policies**:
- **SELECT**: Standard project-scoped
- **INSERT**: Requires `can_manage_reports` permission
  ```sql
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE organization_id = (...))
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role IN ('owner', 'admin', 'project_manager', 'qc_inspector')
    )
  )
  ```
- **DELETE**: Admin only

#### 17. `report_configs`
**RLS Enabled**: Yes
**Policies**:
- **SELECT**: Standard project-scoped
- **INSERT**: Standard project-scoped
- **UPDATE**: Users can update reports they created
  ```sql
  USING (created_by = auth.uid())
  ```
- **DELETE**: Users can delete reports they created
  ```sql
  USING (created_by = auth.uid())
  ```

### Template Tables

#### 18. `progress_templates`
**RLS Enabled**: Yes
**Policies**:
- **SELECT**: All authenticated users can view templates
  ```sql
  USING (auth.uid() IS NOT NULL)
  ```

### Storage Tables

#### 19. `storage.objects` (avatars bucket)
**RLS Enabled**: Yes
**Policies**:
- **SELECT**: Authenticated users can view public avatars
  ```sql
  USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL)
  ```
- **INSERT**: Users can upload their own avatar
  ```sql
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND auth.uid() IS NOT NULL
  )
  ```
- **UPDATE**: Users can update their own avatar
  ```sql
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  ```
- **DELETE**: Users can delete their own avatar
  ```sql
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  ```

---

## Special Cases

### 1. Demo User Isolation (Migration 00067)
**Strategy**: Each demo user gets a unique organization during signup (1:1 relationship).

**Existing RLS policies automatically enforce demo isolation**:
- Demo users can ONLY see data linked to their organization
- Regular users CANNOT see demo project data (different organization_id)
- Demo users CANNOT see each other's data (different organization_id)

**Verification Query**:
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 2. Invitation Acceptance Flow (Migrations 00037-00049)
**Challenge**: Unauthenticated users need to view invitations before accepting.

**Solution**:
1. Public SELECT policy using `token_hash` (Migration 00037)
2. SECURITY DEFINER function `accept_invitation()` for immediate org/role assignment (Migration 00049)
3. Authenticated users can update their own invitation acceptance (Migration 00048)

**Accept Invitation Function** (simplified for documentation; see `00049_accept_invitation_function.sql` for full implementation):
```sql
CREATE OR REPLACE FUNCTION accept_invitation_for_user(
  p_user_id UUID,
  p_invitation_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Get invitation details
  SELECT id, email, organization_id, role, status, expires_at
  INTO v_invitation
  FROM invitations
  WHERE id = p_invitation_id;

  -- SECURITY VALIDATIONS (actual implementation includes):
  -- 1. Validate invitation exists
  -- 2. Validate status is 'pending'
  -- 3. Validate not expired
  -- 4. Verify user email matches invitation email

  -- Update user with organization and role
  UPDATE users
  SET organization_id = v_invitation.organization_id,
      role = v_invitation.role
  WHERE id = p_user_id;

  -- Mark invitation as accepted
  UPDATE invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = p_invitation_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Note**: The actual implementation in migration `00049_accept_invitation_function.sql` includes comprehensive security validations:
- Email matching check (user email must match invitation email)
- Status validation (invitation must be 'pending')
- Expiration check (invitation must not be expired)
- Proper error handling with specific error codes

### 3. Super Admin Bypass
**Use Case**: Platform support needs to access any organization for debugging.

**Implementation**:
- `is_super_admin()` function checks `users.is_super_admin` flag
- SELECT policies include `is_super_admin() OR (...)` clause
- Super admin flag is NOT exposed to client, only checked server-side

**Security Notes**:
- Super admin flag can only be set via direct database access (not exposed in UI)
- Use sparingly for support/debugging only
- All super admin actions should be logged

### 4. Service Role Bypass
**Use Case**: Supabase Edge Functions need to bypass RLS for system operations (e.g., demo cleanup, bulk imports).

**Implementation**:
```javascript
// Use service role key to bypass RLS
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,  // Not anon key!
  { auth: { persistSession: false, autoRefreshToken: false } }
)
```

**Security Notes**:
- Service role key bypasses ALL RLS policies
- NEVER expose service role key in client-side code
- Use only in Edge Functions, admin scripts, or migrations
- Edge Functions run server-side, safe from client exposure

### 5. SECURITY DEFINER Functions
**Use Case**: Functions that need to bypass RLS to prevent recursion or perform privileged operations.

**Functions Using SECURITY DEFINER**:
1. `get_user_org_role()` - Prevents RLS recursion when checking roles
2. `is_super_admin()` - Prevents RLS recursion when checking super admin status
3. `check_email_has_organization()` - Checks email existence for invitation validation
4. `accept_invitation()` - Updates user organization/role immediately upon acceptance

**Security Notes**:
- SECURITY DEFINER functions run with the privileges of the function owner (bypassing RLS)
- Always validate inputs and ensure proper authorization checks inside the function
- Use sparingly and document clearly

---

## RLS Audit Checklist

Use this checklist when creating new database functions, tables, or migrations:

### New Table Creation
- [ ] Enable RLS on the table: `ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;`
- [ ] Determine isolation scope: organization-scoped or project-scoped?
- [ ] Create SELECT policy (who can read?)
- [ ] Create INSERT policy (who can create?)
- [ ] Create UPDATE policy (who can modify? role-based?)
- [ ] Create DELETE policy (who can delete? admin-only?)
- [ ] Add `deleted_at IS NULL` checks for soft-delete support
- [ ] Test policies with different user roles (owner, admin, project_manager, viewer)
- [ ] Document any special access patterns or exceptions

### New Database Function Creation
- [ ] Does the function need to bypass RLS? (Use `SECURITY DEFINER` if yes)
- [ ] Does the function access tables with RLS? (May cause recursion)
- [ ] Does the function validate user permissions? (Role checks)
- [ ] Does the function check organization isolation? (Prevent cross-org access)
- [ ] Is input sanitized? (SQL injection prevention)
- [ ] Is the function granted to appropriate roles? (`GRANT EXECUTE ON FUNCTION ...`)
- [ ] Document why SECURITY DEFINER is used (if applicable)
- [ ] Add comments explaining security model

### Migration Testing
- [ ] Test as owner (should have full access)
- [ ] Test as admin (should have nearly full access)
- [ ] Test as project_manager (should have project-level access)
- [ ] Test as viewer (should have read-only access)
- [ ] Test as user in different organization (should have NO access)
- [ ] Test with super admin flag (should bypass organization isolation)
- [ ] Test with unauthenticated user (should have NO access except public data)
- [ ] Verify soft-deleted records are excluded from RLS checks

### Edge Function Development
- [ ] Does the Edge Function use service role key? (Document why)
- [ ] Is service role key stored securely? (Supabase Secrets, not in code)
- [ ] Does the function validate request origin? (CORS, authentication)
- [ ] Does the function log privileged operations? (Audit trail)
- [ ] Are inputs validated before database operations? (Type checking, sanitization)
- [ ] Does the function respect organization boundaries? (Even with service role)

### Common Pitfalls to Avoid
- [ ] **Recursive RLS policies**: Using RLS-protected tables in RLS checks (causes infinite loops)
  - ✅ Use `SECURITY DEFINER` helper functions instead
- [ ] **Missing deleted_at checks**: Soft-deleted records leak through RLS
  - ✅ Always include `AND deleted_at IS NULL` in policies
- [ ] **Overly permissive INSERT policies**: Users can create data for other organizations
  - ✅ Use `WITH CHECK` to validate organization/project ownership
- [ ] **Forgetting UPDATE WITH CHECK**: Users can modify data to belong to other organizations
  - ✅ Always include `WITH CHECK` on UPDATE policies
- [ ] **Missing role checks on sensitive operations**: Any authenticated user can perform admin actions
  - ✅ Use `EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN (...))`
- [ ] **Exposing service role key**: Client can bypass all RLS
  - ✅ NEVER use service role key in client code, only in Edge Functions
- [ ] **Not testing cross-organization access**: Users can access other orgs' data
  - ✅ Create test users in separate organizations and verify isolation

---

## Role Permission Matrix

| Role              | View Data | Create Data | Update Data | Delete Data | Manage Team | Admin Functions |
|-------------------|-----------|-------------|-------------|-------------|-------------|-----------------|
| owner             | ✅        | ✅          | ✅          | ✅          | ✅          | ✅              |
| admin             | ✅        | ✅          | ✅          | ✅          | ✅          | ⚠️ (limited)    |
| project_manager   | ✅        | ✅          | ✅          | ❌          | ❌          | ❌              |
| foreman           | ✅        | ✅          | ✅          | ❌          | ❌          | ❌              |
| qc_inspector      | ✅        | ✅          | ✅          | ❌          | ❌          | ❌              |
| welder            | ✅        | ❌          | ⚠️ (own)    | ❌          | ❌          | ❌              |
| viewer            | ✅        | ❌          | ❌          | ❌          | ❌          | ❌              |

**Legend**:
- ✅ Full permission
- ⚠️ Limited permission (with conditions)
- ❌ No permission

---

## References

### Key Migrations
- **00001**: Initial schema with RLS foundation
- **00008**: Single-org refactor (breaking change)
- **00037-00049**: Invitation flow RLS fixes (13 migrations)
- **00041**: Users RLS final fix (helper functions)
- **00051**: Avatar storage RLS
- **00067**: Demo RLS documentation
- **00081**: Admin member removal RLS
- **00082**: Organization insert policy fix

### Related Documentation
- [CLAUDE.md](../../CLAUDE.md) - Project overview and architecture
- [Feature 016: Team Management](../../specs/016-team-management-ui/IMPLEMENTATION-NOTES.md) - Invitation flow details
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)

---

**Document Version**: 1.0
**Author**: Generated via Claude Code
**Review Status**: Initial Draft
**Next Review**: After migration 00090 or next major RLS change
