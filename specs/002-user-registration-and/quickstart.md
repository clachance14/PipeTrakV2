# Quickstart: User Registration & Team Onboarding

**Feature**: 002-user-registration-and
**Purpose**: Validate implementation against acceptance scenarios from spec.md
**Estimated Time**: 15-20 minutes

This quickstart mirrors the 7 acceptance scenarios from the feature specification. Use it to validate the implementation works end-to-end after all tasks are completed.

---

## Prerequisites

- Development environment running (`npm run dev`)
- Supabase local instance running (`supabase start`)
- Database migrations applied (`supabase db reset`)
- Clean test data (no existing users/organizations)

---

## Scenario 1: First User Signup (Organization Creation)

**Goal**: Validate FR-001 through FR-007 (registration + org creation)

**Steps**:

1. Navigate to `http://localhost:5173/register`
2. Fill registration form:
   - Email: `john.owner@acmeconstruction.com`
   - Password: `password123` (6+ chars per NFR-004)
   - Full Name: `John Owner`
   - Organization Name: `Acme Construction Co.`
   - Check "I accept the terms of service"
3. Click "Create Account"

**Expected Results**:
- ✅ User account created in `auth.users` table
- ✅ Organization created in `organizations` table
- ✅ `user_organizations` record with `role = 'owner'`
- ✅ User automatically logged in with session token
- ✅ Redirected to `/onboarding/wizard` (FR-034)
- ✅ Email verification sent to john.owner@acmeconstruction.com

**Validation Queries**:
```sql
-- Check user created
SELECT id, email, raw_user_meta_data->>'full_name' as full_name
FROM auth.users
WHERE email = 'john.owner@acmeconstruction.com';

-- Check organization created
SELECT id, name, created_at, deleted_at
FROM organizations
WHERE name = 'Acme Construction Co.';

-- Check owner role assigned
SELECT uo.role, o.name as organization
FROM user_organizations uo
JOIN organizations o ON o.id = uo.organization_id
WHERE uo.user_id = (SELECT id FROM auth.users WHERE email = 'john.owner@acmeconstruction.com');
```

**Edge Case**: Try registering with same email again → Should show "Email already registered" error (FR-002)

---

## Scenario 2: Owner Invites Team Member

**Goal**: Validate FR-019 through FR-022 (invitation creation and email sending)

**Steps**:

1. Log in as `john.owner@acmeconstruction.com` (from Scenario 1)
2. Complete onboarding wizard steps (or skip if implemented)
3. Navigate to Team Management page (`/team`)
4. Click "Invite Team Member"
5. Fill invitation form:
   - Email: `mike.foreman@example.com`
   - Role: `foreman`
6. Click "Send Invitation"

**Expected Results**:
- ✅ Invitation record created in `invitations` table
- ✅ Status = `pending`
- ✅ `expires_at` = 7 days from now (research.md decision)
- ✅ `token_hash` contains SHA-256 hash (not raw token)
- ✅ Email sent to mike.foreman@example.com with invitation link
- ✅ Success message shown: "Invitation sent to mike.foreman@example.com"
- ✅ Invitation appears in pending invitations list

**Validation Queries**:
```sql
-- Check invitation created
SELECT id, email, role, status, expires_at,
       invited_by, created_at
FROM invitations
WHERE email = 'mike.foreman@example.com'
  AND organization_id = (SELECT id FROM organizations WHERE name = 'Acme Construction Co.');
```

**Email Content Check** (Supabase local inbucket):
- Open `http://localhost:54324` (Supabase inbucket UI)
- Find email to mike.foreman@example.com
- Verify email contains:
  - Organization name: "Acme Construction Co."
  - Role: "foreman"
  - Inviter name: "John Owner"
  - Invitation link with token

**Edge Case (FR-025)**: Try sending another invitation to `mike.foreman@example.com` → Should show "Duplicate invitation" error

---

## Scenario 3: Invitee Accepts Invitation (New User)

**Goal**: Validate FR-026, FR-027 (new user acceptance flow)

**Steps**:

1. Copy invitation link from email (from Scenario 2)
   - Format: `http://localhost:5173/accept-invitation?token={token}`
2. Open link in incognito/private window (to simulate new user)
3. Verify invitation preview shows:
   - "You've been invited to Acme Construction Co."
   - "Role: Foreman"
   - "Invited by: John Owner"
4. Fill new user form:
   - Password: `mikespassword` (6+ chars)
   - Full Name: `Mike Foreman`
5. Click "Accept Invitation"

**Expected Results**:
- ✅ User account created: `mike.foreman@example.com`
- ✅ `user_organizations` record created with `role = 'foreman'`
- ✅ Invitation status updated to `accepted`
- ✅ `accepted_at` timestamp set
- ✅ User automatically logged in
- ✅ Redirected to `/work` (role-specific dashboard per FR-036)

**Validation Queries**:
```sql
-- Check user created
SELECT id, email, raw_user_meta_data->>'full_name' as full_name
FROM auth.users
WHERE email = 'mike.foreman@example.com';

-- Check foreman role assigned
SELECT uo.role, o.name as organization
FROM user_organizations uo
JOIN organizations o ON o.id = uo.organization_id
WHERE uo.user_id = (SELECT id FROM auth.users WHERE email = 'mike.foreman@example.com');

-- Check invitation accepted
SELECT status, accepted_at
FROM invitations
WHERE email = 'mike.foreman@example.com';
```

**Edge Case**: Try using same invitation link again → Should show "Invitation already accepted" error

---

## Scenario 4: Invitee Accepts Invitation (Existing User)

**Goal**: Validate FR-026 for existing users with multi-org support (FR-010)

**Steps**:

1. Create a second organization via new registration:
   - Register as `sarah.owner@betaconstruction.com`
   - Organization: `Beta Construction LLC`
   - This gives Sarah an existing account
2. As John Owner (Acme Construction), invite Sarah:
   - Email: `sarah.owner@betaconstruction.com`
   - Role: `project_manager`
3. As Sarah, click invitation link (already logged in or log in if prompted)
4. Accept invitation (no password form - already has account)

**Expected Results**:
- ✅ Sarah's account NOT duplicated (same user ID)
- ✅ New `user_organizations` record for Sarah in Acme Construction
- ✅ Sarah now belongs to 2 organizations (Beta as owner, Acme as project_manager)
- ✅ Organization switcher appears in header (FR-031, FR-032)
- ✅ Redirected to `/projects` (project_manager dashboard)

**Validation Queries**:
```sql
-- Check Sarah has 2 organization memberships
SELECT o.name as organization, uo.role
FROM user_organizations uo
JOIN organizations o ON o.id = uo.organization_id
WHERE uo.user_id = (SELECT id FROM auth.users WHERE email = 'sarah.owner@betaconstruction.com')
  AND uo.deleted_at IS NULL;

-- Expected results:
-- | organization           | role            |
-- | Beta Construction LLC  | owner           |
-- | Acme Construction Co.  | project_manager |
```

---

## Scenario 5: Role-Based Dashboard Access

**Goal**: Validate FR-014, FR-016, FR-017, FR-018 (role permissions)

**Steps**:

1. Log in as Mike Foreman (`mike.foreman@example.com`)
2. Verify visible features:
   - ✅ Can view component list
   - ✅ Can update component status
   - ✅ Can assign welders to tasks
   - ✅ Can make field updates
3. Verify hidden features:
   - ❌ No "Billing" menu item (FR-011 - owner only)
   - ❌ No "Team Management" menu item (FR-012 - admin/owner only)
   - ❌ No "Create Project" button (FR-013 - project_manager+)
4. Try accessing restricted route directly: `/team`
   - Expected: Redirect to `/work` with "Insufficient permissions" toast

**Validation** (Frontend):
```typescript
// Check hasPermission() helper works
import { hasPermission } from '@/lib/permissions'

hasPermission('foreman', 'viewer') // true (foreman > viewer)
hasPermission('foreman', 'admin') // false (foreman < admin)
```

**Validation** (Backend RLS):
```sql
-- As Mike (foreman), try to access team management
SET request.jwt.claims.sub = '<mike-user-id>';

-- Should fail RLS policy
SELECT * FROM invitations WHERE organization_id = '<acme-org-id>';
-- Expected: 0 rows (foreman cannot view invitations)
```

---

## Scenario 6: Owner Manages Team Roles

**Goal**: Validate FR-006 scenario (role changes)

**Steps**:

1. Log in as John Owner
2. Navigate to Team Management (`/team`)
3. Find Mike Foreman in member list
4. Click "Change Role" → Select `project_manager`
5. Confirm change

**Expected Results**:
- ✅ `user_organizations.role` updated to `project_manager`
- ✅ Mike's permissions update immediately (if logged in, requires page refresh or realtime subscription)
- ✅ Success toast: "Mike Foreman's role changed to Project Manager"

**Validation**:
```sql
-- Check role updated
SELECT role FROM user_organizations
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'mike.foreman@example.com')
  AND organization_id = (SELECT id FROM organizations WHERE name = 'Acme Construction Co.');
-- Expected: project_manager
```

**Edge Case (FR-033)**: As John Owner, try changing own role to `viewer`:
- Expected: Error "Cannot change your own role"

**Edge Case (data-model.md trigger)**: Try changing John's role (last owner):
- Expected: Database error "Cannot remove last owner. Transfer ownership first."

---

## Scenario 7: Multiple Organization Membership

**Goal**: Validate FR-010, FR-031, FR-032 (multi-org context switching)

**Steps**:

1. Log in as Sarah (`sarah.owner@betaconstruction.com`)
2. Verify organization switcher in header shows:
   - "Beta Construction LLC" (active)
   - "Acme Construction Co."
3. Click switcher → Select "Acme Construction Co."
4. Verify:
   - Header updates to show "Acme Construction Co."
   - Available menu items change (owner → project_manager features)
   - No billing menu (project_manager has no billing access)
5. Switch back to "Beta Construction LLC"
6. Verify:
   - Header updates to "Beta Construction LLC"
   - Billing menu appears (owner role)

**Validation** (Zustand Store):
```typescript
// Check organizationStore updated
import { useOrganizationStore } from '@/stores/organizationStore'

const { activeOrgId } = useOrganizationStore.getState()
// Should match selected organization ID
```

**Validation** (LocalStorage):
```javascript
// Check persistence
localStorage.getItem('pipetrak:activeOrgId')
// Should match selected organization ID
```

**Security Check**: Switch organization → Try accessing data from previous org:
- Expected: RLS blocks access (organization_id mismatch)

---

## Edge Cases & Error Handling

### Expired Invitation (FR-023)

**Steps**:
1. As John Owner, create invitation for `test@example.com`
2. Manually update invitation:
   ```sql
   UPDATE invitations SET expires_at = NOW() - INTERVAL '1 day'
   WHERE email = 'test@example.com';
   ```
3. Try accepting invitation link
4. Expected: "Invitation expired. Contact the organization owner for a new invitation."

### Revoked Invitation (FR-028)

**Steps**:
1. Create invitation for `revoked@example.com`
2. As John Owner, click "Revoke" on invitation
3. Try accepting invitation link
4. Expected: "Invitation has been revoked."

### Last Owner Leaving Organization (FR-038, FR-039)

**Steps**:
1. Log in as John Owner (only owner in Acme Construction)
2. Click "Leave Organization" in settings
3. Expected: Modal appears:
   - "You are the only owner of Acme Construction Co."
   - "Transfer ownership to continue:"
   - Dropdown: [Mike Foreman (project_manager), Sarah Jones (project_manager)]
4. Select Mike → Click "Transfer & Leave"
5. Expected:
   - Mike's role updated to `owner`
   - John removed from organization (soft delete)
   - Redirect to other organization or landing page

**Alternative (Decline Transfer)**:
1. Click "Leave Organization"
2. Click "Delete Organization Instead" (if no transfer selected)
3. Expected:
   - Confirmation modal: "This will delete Acme Construction Co. and remove all members. This action can be undone within 30 days."
4. Confirm
5. Expected:
   - `organizations.deleted_at` set to NOW()
   - `organizations.deleted_by` set to John's user_id
   - All `user_organizations` records soft-deleted (FR-039)

**Validation**:
```sql
-- Check soft delete
SELECT deleted_at, deleted_by FROM organizations
WHERE name = 'Acme Construction Co.';

-- Check recovery window (within 30 days)
SELECT EXTRACT(DAY FROM NOW() - deleted_at) as days_since_deletion
FROM organizations
WHERE name = 'Acme Construction Co.';
-- Should be < 30
```

### Email Send Failure (FR-041)

**Steps**:
1. Simulate email failure (disconnect from network or stop Supabase inbucket)
2. Create invitation for `noemail@example.com`
3. Expected:
   - Error toast: "Failed to send email to noemail@example.com"
   - Invitation still created in database
   - Invitation link displayed for manual sharing:
     ```
     Email failed to send. Share this link manually:
     https://app.pipetrak.com/accept-invitation?token=abc123...
     ```

---

## Performance Validation (NFR-001, NFR-002)

### Account Creation Time (NFR-001: <3s)

**Steps**:
1. Open browser DevTools → Network tab
2. Complete registration form
3. Click "Create Account"
4. Measure time from submit to dashboard redirect
5. Expected: <3 seconds

**Measurement Points**:
- API request: POST `/api/auth/register`
- Response time should be <2s (leaves 1s for UI rendering)

### Invitation Email Delivery (NFR-002: <1min)

**Steps**:
1. Note current time
2. Send invitation
3. Check Supabase inbucket (`http://localhost:54324`)
4. Verify email appears within 1 minute
5. Expected: Email delivered <60 seconds

---

## Coverage Validation

After completing quickstart, verify test coverage meets constitution requirements:

```bash
npm test -- --coverage
```

**Expected Coverage**:
- Overall: ≥70% (lines, functions, branches, statements)
- `src/lib/auth.ts`: ≥80%
- `src/lib/invitations.ts`: ≥80%
- `src/components/auth/*`: ≥60%
- `src/components/team/*`: ≥60%

---

## Rollback Procedure

If quickstart fails and you need to reset:

```bash
# Reset Supabase local database
supabase db reset

# Clear browser storage
# In DevTools → Application → Clear site data

# Restart dev server
npm run dev
```

---

## Success Criteria

Quickstart is considered successful when:

- ✅ All 7 scenarios complete without errors
- ✅ All edge cases handled gracefully
- ✅ Performance NFRs met (<3s registration, <1min email)
- ✅ Test coverage ≥70% overall, ≥80% for `src/lib/**`
- ✅ No TypeScript errors (`tsc -b`)
- ✅ No console errors or warnings in browser

**Time to Complete**: 15-20 minutes (assumes implementation complete)

---

**Next Step**: Use this quickstart as integration test scenarios during `/tasks` phase. Each scenario should have corresponding test file in `tests/integration/`.
