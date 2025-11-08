# RLS Audit Checklist

**Quick Reference**: Use this checklist when creating new database functions, tables, or migrations.

---

## 🆕 New Table Creation

### Core Setup
- [ ] Enable RLS: `ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;`
- [ ] Determine isolation scope:
  - [ ] Organization-scoped (users, invitations, organizations)
  - [ ] Project-scoped (components, drawings, welders, etc.)
  - [ ] Public (progress_templates)
  - [ ] Self-access (user profile, avatars)

### Policy Creation
- [ ] **SELECT Policy**: Who can read?
  ```sql
  CREATE POLICY "Users can view [table] in their organization"
    ON [table_name] FOR SELECT
    USING ([organization_check]);
  ```

- [ ] **INSERT Policy**: Who can create?
  ```sql
  CREATE POLICY "Users can insert [table] in their organization"
    ON [table_name] FOR INSERT
    WITH CHECK ([organization_check]);
  ```

- [ ] **UPDATE Policy**: Who can modify?
  - [ ] Self-access only (`id = auth.uid()`)
  - [ ] Role-based (`role IN ('owner', 'admin', ...)`)
  - [ ] Organization-scoped
  ```sql
  CREATE POLICY "Users can update [table] if they have permission"
    ON [table_name] FOR UPDATE
    USING ([organization_check] AND [role_check])
    WITH CHECK ([organization_check] AND [role_check]);
  ```

- [ ] **DELETE Policy**: Who can delete?
  - [ ] Admin-only (recommended)
  - [ ] Self-access for user-created content
  ```sql
  CREATE POLICY "Users can delete [table] if they are admin"
    ON [table_name] FOR DELETE
    USING ([organization_check] AND [admin_check]);
  ```

### Soft Delete Support
- [ ] Add `deleted_at IS NULL` to all policies
- [ ] Verify soft-deleted records are excluded from queries

### Testing
- [ ] Test as **owner** (full access)
- [ ] Test as **admin** (nearly full access)
- [ ] Test as **project_manager** (project-level access)
- [ ] Test as **viewer** (read-only)
- [ ] Test as **user in different org** (NO access)
- [ ] Test as **unauthenticated** (NO access, except public data)
- [ ] Test with **super admin flag** (bypass org isolation)

---

## 🔧 New Database Function Creation

### Security Analysis
- [ ] Does the function need to bypass RLS?
  - [ ] YES → Use `SECURITY DEFINER`
  - [ ] NO → Use `SECURITY INVOKER` (default)

- [ ] Does the function access RLS-protected tables?
  - [ ] May cause recursion if used in RLS policies
  - [ ] Solution: Use `SECURITY DEFINER` helper function

### Authorization Checks
- [ ] Validate user permissions (role checks)
- [ ] Check organization isolation (prevent cross-org access)
- [ ] Verify project ownership (if project-scoped)

### Input Validation
- [ ] Sanitize inputs (SQL injection prevention)
- [ ] Validate data types
- [ ] Check for NULL/empty values

### Grants and Documentation
- [ ] Grant execution to appropriate roles:
  ```sql
  GRANT EXECUTE ON FUNCTION [function_name] TO authenticated;
  ```
- [ ] Add `COMMENT ON FUNCTION` explaining security model
- [ ] Document why `SECURITY DEFINER` is used (if applicable)

---

## 📦 Migration Testing

### Multi-Role Testing
- [ ] Owner: Full access to all resources
- [ ] Admin: Nearly full access (cannot delete org)
- [ ] Project Manager: Can manage projects/components
- [ ] Foreman: Can manage milestones/field ops
- [ ] QC Inspector: Can manage quality control
- [ ] Welder: Can view assigned work
- [ ] Viewer: Read-only access

### Cross-Organization Testing
- [ ] Create test users in **separate organizations**
- [ ] Verify User A **cannot** access User B's data
- [ ] Verify User A **cannot** modify User B's organization

### Edge Cases
- [ ] Soft-deleted records are excluded
- [ ] NULL organization_id handling
- [ ] Unauthenticated access (should fail except public data)
- [ ] Super admin bypass (should work)

---

## ☁️ Edge Function Development

### Service Role Key Usage
- [ ] Does the Edge Function use service role key?
  - [ ] Document **why** (e.g., system operation, bulk import, demo cleanup)
  - [ ] Ensure key is stored in **Supabase Secrets** (not in code)

### Security Validation
- [ ] Validate request origin (CORS, authentication)
- [ ] Check user authentication (even with service role)
- [ ] Validate inputs before database operations
- [ ] Respect organization boundaries (even with service role)
- [ ] Log privileged operations (audit trail)

### Service Role Key Rules
- [ ] **NEVER** expose service role key in client-side code
- [ ] Use **ONLY** in Edge Functions, admin scripts, or migrations
- [ ] Remember: Service role bypasses **ALL** RLS policies

---

## ⚠️ Common Pitfalls to Avoid

### 1. Recursive RLS Policies
**Problem**: Using RLS-protected tables in RLS checks causes infinite loops.

❌ **Bad**:
```sql
CREATE POLICY "Users can view projects"
  ON projects FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM users  -- RLS-protected!
      WHERE id = auth.uid()
    )
  );
```

✅ **Good**:
```sql
-- Use SECURITY DEFINER helper function
CREATE POLICY "Users can view projects"
  ON projects FOR SELECT
  USING (
    organization_id = get_user_organization(auth.uid())  -- Bypasses RLS
  );
```

### 2. Missing `deleted_at` Checks
**Problem**: Soft-deleted records leak through RLS.

❌ **Bad**:
```sql
USING (organization_id = (...))
```

✅ **Good**:
```sql
USING (
  organization_id = (...)
  AND deleted_at IS NULL  -- Exclude soft-deleted
)
```

### 3. Overly Permissive INSERT Policies
**Problem**: Users can create data for other organizations.

❌ **Bad**:
```sql
CREATE POLICY "Users can insert"
  ON components FOR INSERT
  WITH CHECK (true);  -- DANGEROUS!
```

✅ **Good**:
```sql
CREATE POLICY "Users can insert components"
  ON components FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );
```

### 4. Missing UPDATE `WITH CHECK`
**Problem**: Users can modify data to belong to other organizations.

❌ **Bad**:
```sql
CREATE POLICY "Users can update"
  ON components FOR UPDATE
  USING (organization_id = (...));
  -- Missing WITH CHECK!
```

✅ **Good**:
```sql
CREATE POLICY "Users can update components"
  ON components FOR UPDATE
  USING (
    project_id IN (...)
  )
  WITH CHECK (
    project_id IN (...)  -- Prevent moving to other org
  );
```

### 5. Missing Role Checks on Sensitive Operations
**Problem**: Any authenticated user can perform admin actions.

❌ **Bad**:
```sql
CREATE POLICY "Users can delete"
  ON users FOR UPDATE
  USING (organization_id = (...));
  -- Any user can delete any user!
```

✅ **Good**:
```sql
CREATE POLICY "Admins can delete members"
  ON users FOR UPDATE
  USING (
    organization_id = (...)
    AND get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );
```

### 6. Exposing Service Role Key
**Problem**: Client can bypass all RLS.

❌ **Bad**:
```javascript
// client-side code
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY  // EXPOSED TO CLIENT!
)
```

✅ **Good**:
```javascript
// Edge Function only
const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')  // Server-side only
)
```

### 7. Not Testing Cross-Organization Access
**Problem**: Users can access other orgs' data.

✅ **Solution**:
- Create test users in **separate organizations**
- Verify User A **cannot** query User B's data
- Use `service role` to inspect database directly

---

## 📋 Standard RLS Policy Templates

### Organization-Scoped Table
```sql
-- Enable RLS
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
CREATE POLICY "Users can view [table] in their organization"
  ON [table_name] FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL
    )
  );

-- INSERT Policy
CREATE POLICY "Users can insert [table] in their organization"
  ON [table_name] FOR INSERT
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

### Project-Scoped Table
```sql
-- Enable RLS
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
CREATE POLICY "Users can view [table] in their organization"
  ON [table_name] FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL
      )
    )
  );

-- INSERT Policy
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

### Role-Based UPDATE Policy
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
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );
```

### Admin-Only DELETE Policy
```sql
CREATE POLICY "Admins can delete [table]"
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

---

## 🔗 Quick Links

- [Full RLS Rules Documentation](./RLS-RULES.md)
- [CLAUDE.md](/home/clachance14/projects/PipeTrak_V2/CLAUDE.md) - Project overview
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-06
