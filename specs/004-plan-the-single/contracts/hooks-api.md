# Hook API Contracts: Single-Organization User Model

## Modified Hooks

### `useOrganization()`

**Purpose**: Manage organization-related operations

**Changes**: Remove multi-org functionality

**Before**:
```typescript
function useOrganization() {
  return {
    useUserOrganizations: () => UseQueryResult<Organization[]>,
    switchOrganizationMutation: UseMutationResult<void, Error, { organizationId: string }>,
    useOrgMembers: (params) => UseQueryResult<User[]>,
    updateMemberRoleMutation: UseMutationResult<void, Error, { userId: string, role: string }>,
    removeMemberMutation: UseMutationResult<void, Error, { userId: string }>,
    leaveOrganizationMutation: UseMutationResult<void, Error, { organizationId: string }>,
  };
}
```

**After**:
```typescript
function useOrganization() {
  return {
    // REMOVED: useUserOrganizations (user has only one org)
    // REMOVED: switchOrganizationMutation (no switching needed)
    // REMOVED: leaveOrganizationMutation (cannot leave only org)

    useCurrentOrganization: () => UseQueryResult<Organization>, // NEW: Get user's single organization
    useOrgMembers: (params) => UseQueryResult<User[]>, // UNCHANGED
    updateMemberRoleMutation: UseMutationResult<void, Error, { userId: string, role: Role }>, // UNCHANGED
    removeMemberMutation: UseMutationResult<void, Error, { userId: string }>, // UNCHANGED (validates not last owner)
  };
}
```

**Contract Tests**:
- `useCurrentOrganization()` returns organization from `users.organization_id`
- `updateMemberRoleMutation` validates role is valid enum value
- `removeMemberMutation` prevents removing last owner

### `useInvitations()`

**Purpose**: Manage team invitations

**Changes**: Add validation for existing organization

**Before**:
```typescript
function useInvitations(params) {
  return {
    useInvitations: (params) => UseQueryResult<Invitation[]>,
    createInvitationMutation: UseMutationResult<Invitation, Error, CreateInvitationInput>,
    acceptInvitationMutation: UseMutationResult<void, Error, { token: string }>,
    resendInvitationMutation: UseMutationResult<void, Error, { invitationId: string }>,
    revokeInvitationMutation: UseMutationResult<void, Error, { invitationId: string }>,
    useValidateToken: (token) => UseQueryResult<Invitation>,
  };
}
```

**After**:
```typescript
function useInvitations(params) {
  return {
    useInvitations: (params) => UseQueryResult<Invitation[]>, // UNCHANGED
    createInvitationMutation: UseMutationResult<Invitation, Error, CreateInvitationInput>, // UNCHANGED
    acceptInvitationMutation: UseMutationResult<void, Error, { token: string }>, // VALIDATION ADDED
    resendInvitationMutation: UseMutationResult<void, Error, { invitationId: string }>, // UNCHANGED
    revokeInvitationMutation: UseMutationResult<void, Error, { invitationId: string }>, // UNCHANGED
    useValidateToken: (token) => UseQueryResult<Invitation>, // VALIDATION ADDED
  };
}
```

**New Validation Logic**:
```typescript
// In acceptInvitationMutation
async function acceptInvitation(token: string) {
  // Check if current user already has organization
  const { data: currentUser } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .single();

  if (currentUser?.organization_id) {
    throw new Error('Cannot accept invitation: user already belongs to an organization');
  }

  // Check if email already has user with organization
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, organization_id')
    .eq('email', invitationEmail)
    .single();

  if (existingUser?.organization_id) {
    throw new Error('Cannot accept invitation: email already associated with an organization');
  }

  // Proceed with acceptance
  // ...
}
```

**Contract Tests**:
- `acceptInvitationMutation` throws error if user has organization
- `acceptInvitationMutation` throws error if email has user with organization
- `useValidateToken` validates invitation is for email without organization

### `useRegistration()`

**Purpose**: Handle user registration

**Changes**: Ensure organization assignment on creation

**Before**:
```typescript
function useRegistration() {
  return {
    registerMutation: UseMutationResult<User, Error, RegisterInput>,
  };
}

interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
  termsAccepted: boolean;
}
```

**After**:
```typescript
function useRegistration() {
  return {
    registerMutation: UseMutationResult<User, Error, RegisterInput>, // VALIDATION ENHANCED
  };
}

interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  organizationName: string; // Creates new organization
  termsAccepted: boolean;
}

// Internal implementation ensures user.organization_id is set
```

**New Enforcement**:
```typescript
async function register(input: RegisterInput) {
  // 1. Create organization
  const { data: org } = await supabase
    .from('organizations')
    .insert({ name: input.organizationName })
    .select()
    .single();

  // 2. Create auth user
  const { data: authUser } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });

  // 3. Create public user WITH organization_id and role (MUST be atomic)
  const { data: user } = await supabase
    .from('users')
    .insert({
      id: authUser.user.id,
      email: input.email,
      full_name: input.fullName,
      organization_id: org.id, // REQUIRED
      role: 'owner', // First user is owner
      terms_accepted_at: new Date().toISOString(),
      terms_version: '1.0',
    })
    .select()
    .single();

  return user;
}
```

**Contract Tests**:
- `registerMutation` creates user with `organization_id` NOT NULL
- `registerMutation` creates user with `role` = 'owner'
- `registerMutation` fails if `organization_id` is missing

## New Hooks

### `usePermissions()`

**Purpose**: Check role-based permissions

**Signature**:
```typescript
function usePermissions(): {
  hasPermission: (permission: Permission) => boolean;
  canUpdateMilestones: boolean;
  canImportWeldLog: boolean;
  canManageWelders: boolean;
  canResolveReviews: boolean;
  canViewDashboards: boolean;
  canManageTeam: boolean;
};
```

**Implementation**:
```typescript
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, Permission, ROLE_PERMISSIONS } from '@/lib/permissions';

export function usePermissions() {
  const { user } = useAuth(); // Gets user with role
  const role = user?.role; // From users.role column

  return {
    hasPermission: (permission: Permission) =>
      role ? hasPermission(role, permission) : false,

    canUpdateMilestones: role ? ROLE_PERMISSIONS[role].can_update_milestones : false,
    canImportWeldLog: role ? ROLE_PERMISSIONS[role].can_import_weld_log : false,
    canManageWelders: role ? ROLE_PERMISSIONS[role].can_manage_welders : false,
    canResolveReviews: role ? ROLE_PERMISSIONS[role].can_resolve_reviews : false,
    canViewDashboards: role ? ROLE_PERMISSIONS[role].can_view_dashboards : false,
    canManageTeam: role ? ROLE_PERMISSIONS[role].can_manage_team : false,
  };
}
```

**Contract Tests**:
- Each role returns correct permissions per `ROLE_PERMISSIONS` mapping
- Unknown role returns all false
- No role (user null) returns all false

## Removed Hooks

None - all hooks retained but modified

## Type Changes

### User Type (Generated)

**Before**:
```typescript
interface User {
  id: string;
  email: string;
  full_name: string | null;
  terms_accepted_at: string | null;
  terms_version: string | null;
  created_at: string;
  updated_at: string;
}

// Organization relationship via separate query
interface UserOrganization {
  user_id: string;
  organization_id: string;
  role: string;
  created_at: string;
}
```

**After**:
```typescript
interface User {
  id: string;
  email: string;
  full_name: string | null;
  organization_id: string; // NEW: NOT NULL
  role: Role; // NEW: NOT NULL
  terms_accepted_at: string | null;
  terms_version: string | null;
  created_at: string;
  updated_at: string;
}

type Role = 'owner' | 'admin' | 'project_manager' | 'foreman' | 'qc_inspector' | 'welder' | 'viewer';

// UserOrganization interface REMOVED
```

## Contract Validation

All hooks must:
1. Use TypeScript strict mode (no `as` assertions)
2. Return properly typed TanStack Query results
3. Handle errors with user-friendly messages
4. Validate inputs before Supabase calls
5. Use path aliases (`@/`) for imports
6. Have failing tests before implementation
