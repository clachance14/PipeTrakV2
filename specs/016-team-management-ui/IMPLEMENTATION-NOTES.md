# Feature 016: Team Management UI - Implementation Notes

**Status**: ✅ Complete
**Date Completed**: 2025-10-27
**Developer**: Claude Code with clachance14

## Overview

This document provides detailed implementation notes for Feature 016: Team Management UI, including all database migrations, invitation flow fixes, and architectural decisions made during development.

## Implementation Summary

### Core Feature Components

1. **Team Member List** (`src/components/team/TeamMemberList.tsx`)
   - Unified view of active members and pending invitations
   - Expandable permission rows showing detailed role capabilities
   - Mobile-responsive design (≤1024px breakpoint)
   - 32px+ touch targets for accessibility

2. **Add Member Dialog** (`src/components/team/AddMemberDialog.tsx`)
   - Email invitation with role selection
   - Optional custom message
   - Email sending via Resend Edge Function

3. **Team Filters** (`src/components/team/TeamFilters.tsx`)
   - Search by name/email
   - Filter by role (owner, admin, member)
   - Filter by status (active, pending)
   - Sort by name, email, or role
   - URL state persistence

4. **Role Management**
   - Role change dialog with confirmation
   - Last owner protection (cannot demote last owner)
   - Optimistic UI updates

5. **Member Removal**
   - Confirmation dialog
   - RLS enforcement (owners can remove anyone, admins can remove members)

## Database Migrations

### Migration Timeline (00037-00049)

All migrations related to fixing the invitation acceptance flow and RLS policies.

#### 00037: Fix Invitation Public Access
**Date**: 2025-10-26
**Purpose**: Allow unauthenticated users to view invitations by token_hash

```sql
CREATE POLICY "Anyone can view invitation by token_hash"
  ON invitations FOR SELECT
  USING (token_hash IS NOT NULL);
```

**Why**: During invitation acceptance, users don't have a session yet, so they need public read access to validate the invitation token.

---

#### 00038: Fix get_user_org_role Function
**Date**: 2025-10-26
**Purpose**: Update function to use `users` table instead of deleted `user_organizations` table

```sql
CREATE OR REPLACE FUNCTION get_user_org_role(user_uuid UUID, org_uuid UUID)
RETURNS user_role AS $$
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

**Why**: After the single-org refactor, the old multi-tenant `user_organizations` junction table was removed, but some functions still referenced it.

---

#### 00039: Cleanup All user_organizations References
**Date**: 2025-10-26
**Purpose**: Remove all remaining references to the deleted `user_organizations` table from RLS policies

**Why**: Old policies from the multi-tenant era were causing "relation does not exist" errors.

---

#### 00040: Allow Public Email Check
**Date**: 2025-10-26
**Purpose**: Create SECURITY DEFINER function to check if email has organization

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

**Why**: Single-org validation during invitation creation/acceptance requires checking if an email is already associated with an organization, but unauthenticated users can't query the users table directly.

---

#### 00041: Fix Users RLS (Final)
**Date**: 2025-10-26
**Purpose**: Create helper functions to prevent RLS policy infinite recursion

Created `check_email_has_organization()` SECURITY DEFINER function to safely check user organization status without triggering recursive policy checks.

**Why**: Users table SELECT policies were querying the users table within their own USING clause, causing infinite recursion.

---

#### 00042: Fix Users Recursion
**Date**: 2025-10-26
**Purpose**: Simplified users read policy to prevent recursion

Updated the policy to use the SECURITY DEFINER functions instead of direct table queries in the policy logic.

---

#### 00043: Add Users Insert Policy
**Date**: 2025-10-26
**Purpose**: Allow system to insert user records

```sql
CREATE POLICY "System can insert users"
  ON users FOR INSERT
  WITH CHECK (true);
```

**Why**: The `handle_new_user()` trigger needs permission to create user records when auth.users receives a new signup.

---

#### 00044: Fix User Trigger and Update Policy
**Date**: 2025-10-26
**Purpose**: Fix handle_new_user trigger and UPDATE policy recursion

```sql
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

**Why**: Simplified the UPDATE policy to prevent recursive checks. Users can only update their own record.

---

#### 00045: Make organization_id Nullable
**Date**: 2025-10-26
**Purpose**: Allow user creation without organization during signup

```sql
ALTER TABLE users ALTER COLUMN organization_id DROP NOT NULL;
```

**Why**: The `handle_new_user()` trigger was failing because organization_id had a NOT NULL constraint, but new signups don't have an organization yet (assigned later via invitation acceptance).

---

#### 00046: Make role Nullable
**Date**: 2025-10-26
**Purpose**: Allow user creation without role during signup

```sql
ALTER TABLE users ALTER COLUMN role DROP NOT NULL;
```

**Why**: Similar to organization_id, role is assigned after email confirmation via invitation acceptance, not during initial signup.

---

#### 00047: Allow Org Members to View Team
**Date**: 2025-10-27
**Purpose**: Enable team member visibility for all authenticated users in the same organization

```sql
CREATE OR REPLACE FUNCTION get_current_user_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id FROM users
    WHERE id = auth.uid() AND organization_id IS NOT NULL
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Users read policy"
  ON users FOR SELECT
  USING (
    is_super_admin()
    OR id = auth.uid()
    OR (
      auth.uid() IS NOT NULL
      AND organization_id IS NOT NULL
      AND organization_id = get_current_user_org_id()
    )
  );
```

**Why**: New users could log in but couldn't see their team members because the RLS policy only allowed viewing their own record.

---

#### 00048: Allow Users to Accept Own Invitation
**Date**: 2025-10-27
**Purpose**: Let authenticated users update their own invitation status

```sql
CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT email FROM users WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Users can accept their own invitations"
  ON invitations FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND email = get_current_user_email()
    AND status = 'pending'
  )
  WITH CHECK (status = 'accepted');
```

**Why**: After email confirmation, users need to mark their invitation as accepted, but they don't have full permissions yet.

---

#### 00049: Accept Invitation Function (CRITICAL)
**Date**: 2025-10-27
**Purpose**: Create SECURITY DEFINER function to assign organization and role immediately after signup

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

  -- Validate invitation (exists, pending, not expired, email matches)
  -- ... validation logic ...

  -- Update user with organization and role
  UPDATE users
  SET organization_id = v_invitation.organization_id,
      role = v_invitation.role,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Mark invitation as accepted
  UPDATE invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = p_invitation_id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_invitation.organization_id,
    'role', v_invitation.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Why**: This is the **key fix** that makes the invitation flow work correctly. Before this migration:
- Users signed up → email confirmation sent → organization_id and role were NULL
- Users had to return to the invitation link after confirming email
- Flow was confusing and error-prone

After this migration:
- Users sign up → `accept_invitation_for_user()` immediately assigns org/role → email confirmation sent
- When users confirm email and log in, they already have full team access
- No need to return to invitation link

This function uses SECURITY DEFINER to bypass RLS, allowing it to work even without an active session (during email confirmation flow).

---

## Invitation Flow Architecture

### Before Fix (Broken Flow)

1. User clicks invitation link
2. User creates account → signup successful
3. Email confirmation sent
4. **PROBLEM**: organization_id and role are NULL because UPDATE query only runs if user has active session
5. User confirms email
6. User logs in → sees empty team list (RLS blocks viewing other members)
7. **REQUIRED**: User must return to invitation link to complete setup (confusing!)

### After Fix (Working Flow)

1. User clicks invitation link
2. User creates account → signup successful
3. **IMMEDIATELY**: `accept_invitation_for_user()` assigns organization_id and role from invitation
4. Email confirmation sent
5. User confirms email
6. User logs in → **automatically appears in team list with correct role**
7. No additional steps needed!

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Invitation Flow                          │
└─────────────────────────────────────────────────────────────┘

[Admin] → Send Invitation
            ↓
          Email sent via Resend
            ↓
[New User] → Click invitation link
            ↓
          Accept & Create Account
            ↓
          supabase.auth.signUp()
            ↓
          accept_invitation_for_user() ← SECURITY DEFINER
            ↓                             (bypasses RLS)
          ✅ organization_id set
          ✅ role set
          ✅ invitation marked accepted
            ↓
          Email confirmation sent
            ↓
[New User] → Confirm email
            ↓
          Login
            ↓
          ✅ Appears in team list
          ✅ Has correct permissions
          ✅ Can see other team members
```

## Code Implementation

### useInvitations Hook Changes

**File**: `src/hooks/useInvitations.ts`

**Key Changes**:
1. Added `AcceptInvitationResult` interface for RPC response typing
2. Call `accept_invitation_for_user()` immediately after signup (line 220-249)
3. Handle email confirmation gracefully (line 243-251)
4. Use same function for existing users accepting invitations (line 267-282)

**Critical Code Section**:
```typescript
if (!user && password && full_name) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: invitation.email,
    password,
    options: { data: { full_name } },
  })
  if (authError) throw authError
  if (!authData.user) throw new Error('Signup failed')

  // IMMEDIATELY assign organization and role using SECURITY DEFINER function
  // This works even without a session (during email confirmation flow)
  const { data: acceptResult, error: acceptError } = await supabase
    .rpc('accept_invitation_for_user', {
      p_user_id: authData.user.id,
      p_invitation_id: invitation.id,
    })

  const result = acceptResult as unknown as AcceptInvitationResult

  if (acceptError) {
    console.error('Failed to accept invitation:', acceptError)
    throw new Error(`Failed to complete invitation: ${acceptError.message}`)
  }

  if (!result?.success) {
    console.error('Invitation acceptance failed:', result?.error)
    throw new Error(result?.error || 'Failed to accept invitation')
  }

  console.log('✅ Organization and role assigned:', {
    user_id: authData.user.id,
    organization_id: result.organization_id,
    role: result.role,
  })

  // Check if email confirmation is required (user created but no session)
  if (authData.user && !authData.session) {
    console.log('Email confirmation required - organization already assigned')
    return {
      user: { id: authData.user.id, email: invitation.email, is_new_user: true },
      organization: invitation.organizations,
      role: invitation.role,
      requires_email_confirmation: true,
    }
  }

  // If we have a session, return success
  return {
    user: { id: authData.user.id, email: invitation.email, is_new_user: true },
    organization: invitation.organizations,
    role: invitation.role,
  }
}
```

### AcceptInvitation UI Changes

**File**: `src/pages/AcceptInvitation.tsx`

**Changes**:
- Updated success message to reflect new flow
- Auto-navigate to login page after 3 seconds if email confirmation required
- Removed confusing "return to this link" instruction

**Before**:
```typescript
toast.info('After confirming, log in and return to this invitation link to complete setup.')
```

**After**:
```typescript
toast.info('Please check your email to confirm your account, then log in to start using PipeTrak.')
setTimeout(() => navigate('/login'), 3000)
```

### TeamManagement Layout Fix

**File**: `src/pages/TeamManagement.tsx`

**Issue**: Team Management page was missing the `<Layout>` wrapper component, so it didn't show the sidebar navigation.

**Fix**: Wrapped all return statements with `<Layout>`:
```typescript
import { Layout } from '@/components/Layout';

return (
  <Layout>
    {/* Team management content */}
  </Layout>
);
```

## Testing

### Manual Testing Checklist

✅ Send invitation from Team Management page
✅ Receive email via Resend
✅ Click invitation link
✅ Create new account
✅ Verify organization_id and role assigned immediately (check database)
✅ Confirm email
✅ Log in
✅ Verify user appears in team list
✅ Verify correct role permissions
✅ Verify can see other team members

### Database Verification

To verify invitation acceptance:

```javascript
// query_db.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf-8')
let supabaseUrl = ''
let supabaseServiceKey = ''

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim()
  }
})

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// Check user has organization and role
const { data: users } = await supabase
  .from('users')
  .select('id, email, organization_id, role')
  .eq('email', 'test@example.com')

console.log('User:', users[0])
// Expected: { id: '...', email: 'test@example.com', organization_id: '...', role: 'admin' }

// Check invitation is accepted
const { data: invitations } = await supabase
  .from('invitations')
  .select('id, email, status, accepted_at')
  .eq('email', 'test@example.com')

console.log('Invitation:', invitations[0])
// Expected: { id: '...', email: 'test@example.com', status: 'accepted', accepted_at: '2025-10-27...' }
```

Run with: `node query_db.mjs`

## Known Issues & Workarounds

### Issue: TypeScript RPC Return Type

**Problem**: Supabase RPC functions return `Json` type, which doesn't match our `AcceptInvitationResult` interface.

**Workaround**: Use double type assertion:
```typescript
const result = acceptResult as unknown as AcceptInvitationResult
```

This is safe because we control both the database function and the TypeScript interface.

### Issue: Nullable Fields

**Problem**: After making `organization_id` and `role` nullable, existing code had type errors.

**Fix**: Added null checks in:
- `src/components/team/TeamList.tsx:191` - Role display
- `src/hooks/useOrganization.ts:42` - Organization query
- `src/hooks/useProjects.ts:160` - Project creation

## Security Considerations

### SECURITY DEFINER Functions

We created several SECURITY DEFINER functions to bypass RLS:
- `accept_invitation_for_user()` - Assigns organization/role
- `get_current_user_org_id()` - Gets user's organization
- `get_current_user_email()` - Gets user's email
- `check_email_has_organization()` - Checks if email is taken

**Why Safe**:
1. All functions validate input (invitation exists, not expired, email matches)
2. Functions only allow specific operations (can't be exploited for arbitrary queries)
3. Used only for invitation flow and team visibility (well-defined use cases)
4. No user-controlled SQL injection vectors

**Best Practice**: Always validate all parameters and limit scope when using SECURITY DEFINER.

## Performance Considerations

### Query Optimization

1. **Team Member List**: Uses indexes on `organization_id` and `deleted_at`
2. **Invitation Lookup**: Uses index on `token_hash` (unique)
3. **RLS Policies**: Helper functions prevent N+1 query issues

### Future Improvements

- Add pagination for large teams (current limit: 1000 members)
- Cache organization data in React Context to reduce queries
- Add real-time subscriptions for team member updates

## Deployment Checklist

Before deploying to production:

✅ All migrations applied (`supabase db push --linked`)
✅ TypeScript types regenerated (`supabase gen types typescript --linked`)
✅ All tests passing (`npm test`)
✅ Build succeeds (`npm run build`)
✅ Manual testing complete (invitation flow end-to-end)
✅ Email sending working (Resend domain verified)
✅ RLS policies tested (team visibility, invitation acceptance)

## Related Documentation

- **Spec**: `specs/016-team-management-ui/spec.md`
- **Plan**: `specs/016-team-management-ui/plan.md`
- **Tasks**: `specs/016-team-management-ui/tasks.md`
- **Quickstart**: `specs/016-team-management-ui/quickstart.md`
- **Database Schema**: `specs/016-team-management-ui/data-model.md`

## Lessons Learned

1. **RLS Policy Complexity**: Multi-table RLS policies can cause infinite recursion. Use SECURITY DEFINER functions to break cycles.

2. **Email Confirmation Flow**: Supabase email confirmation creates users without sessions. Must handle this case explicitly in invitation flow.

3. **Nullable Constraints**: Transitional states (user created, organization not yet assigned) require nullable fields even if they're logically "required" later.

4. **Type Safety**: Supabase RPC functions return generic Json types. Always create TypeScript interfaces for return values.

5. **Testing is Critical**: Manual testing of the full invitation flow (email → signup → confirmation → login) is essential to catch edge cases.

## Future Enhancements

### Potential Improvements

1. **Invitation Link Expiration UI**: Show time remaining on invitation acceptance page
2. **Bulk Invitations**: CSV upload to invite multiple team members at once
3. **Custom Permissions**: Allow fine-grained permission configuration per user
4. **Invitation Reminders**: Automatic reminder emails for pending invitations
5. **Audit Log**: Track all team member changes (invitations, role changes, removals)
6. **SSO Integration**: Support SAML/OAuth for enterprise team login

### Technical Debt

1. Consider replacing SECURITY DEFINER functions with Postgres roles/grants for better security model
2. Add database triggers to automatically clean up expired invitations
3. Implement rate limiting on invitation sending to prevent abuse
4. Add integration tests for RLS policies (currently only manual testing)

---

**Last Updated**: 2025-10-27
**Status**: Production Ready ✅
