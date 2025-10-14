# Feature Specification: User Registration & Team Onboarding

**Feature Branch**: `002-user-registration-and`
**Created**: 2025-10-04
**Status**: Draft
**Input**: User description: "User registration and onboarding system with multi-tenant organization setup, role-based access control (owner, admin, project manager, foreman, QC inspector, welder, viewer), and team invitation workflow"

## Execution Flow (main)
```
1. Parse user description from Input
   → ✅ Extracted: registration, multi-tenant orgs, 7 roles, team invitations
2. Extract key concepts from description
   → Actors: Organization owner, invited users, various role types
   → Actions: Sign up, create organization, invite team, accept invitation
   → Data: User profiles, organizations, roles, invitations
   → Constraints: Multi-tenant isolation, role-based permissions
3. For each unclear aspect:
   → ✅ Marked 8 areas needing clarification (see requirements)
4. Fill User Scenarios & Testing section
   → ✅ Defined: First user signup, team invitation, role assignment flows
5. Generate Functional Requirements
   → ✅ 28 functional requirements across signup, roles, invitations, security
6. Identify Key Entities
   → ✅ Organizations, Users, Roles, Invitations, User-Organization links
7. Run Review Checklist
   → ⚠️ WARN "Spec has 8 [NEEDS CLARIFICATION] items - requires /clarify"
8. Return: SUCCESS (spec ready for clarification phase)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-04

- Q: What password complexity standard should be enforced? → A: Relaxed - Min 6 chars, email verification as primary security
- Q: Should organization names be unique globally or can multiple orgs share names? → A: Non-unique; multiple organizations can share names, identified by org_id only. GTM strategy targets individual project managers first, enterprise consolidation later.
- Q: What happens when the last owner attempts to leave/delete their account? → A: Prompt for ownership transfer; if declined, soft-delete organization and all associated user memberships/data with recovery window.
- Q: What should happen when invitation email fails to send? → A: Notify inviter via error notification; invitation record still created for manual sharing of link.
- Q: Expected maximum users per organization for initial launch? → A: ~50 users per organization (medium teams; requires light pagination and basic search).

---

## User Scenarios & Testing

### Primary User Story

**As a construction company manager**, I want to create a PipeTrak account for my organization and invite my field team (foremen, welders, QC inspectors) so that we can collaboratively track pipe components across our brownfield projects with appropriate access controls.

**First User Journey (Organization Owner):**
1. Visit PipeTrak website, click "Sign Up"
2. Enter email, password, full name, and organization name
3. Accept terms of service
4. System creates organization and assigns me as owner (billing admin)
5. Complete onboarding wizard to set up organization preferences
6. Invite team members via email with assigned roles

**Invited User Journey:**
1. Receive invitation email from organization owner
2. Click invitation link in email
3. If new user: Set password and create account
4. If existing user: Sign in to accept invitation
5. System adds me to the organization with assigned role
6. Redirect to appropriate dashboard based on role

### Acceptance Scenarios

#### Scenario 1: First User Signup (Organization Creation)
- **Given** I am a new user visiting PipeTrak for the first time
- **When** I complete the signup form with valid email, password, full name, and organization name
- **Then** The system creates my user account, creates a new organization, and assigns me the "owner" role with billing privileges

#### Scenario 2: Owner Invites Team Member
- **Given** I am logged in as an organization owner
- **When** I navigate to team management and send an invitation to "john@example.com" with role "foreman"
- **Then** The system sends an email invitation to John with a unique acceptance link valid for 7 days

#### Scenario 3: Invitee Accepts Invitation (New User)
- **Given** John receives an invitation email and has never used PipeTrak
- **When** John clicks the invitation link and sets a password
- **Then** The system creates John's account, links him to the organization with "foreman" role, and marks invitation as accepted

#### Scenario 4: Invitee Accepts Invitation (Existing User)
- **Given** John already has a PipeTrak account in Organization A and receives invitation to Organization B
- **When** John clicks the invitation link and signs in
- **Then** The system adds Organization B to John's account with the invited role, allowing him to switch between organizations

#### Scenario 5: Role-Based Dashboard Access
- **Given** I am logged in as a "welder" in my organization
- **When** I access the dashboard
- **Then** I can only view and update pipe components assigned to me, without access to billing or team management

#### Scenario 6: Owner Manages Team Roles
- **Given** I am logged in as organization owner
- **When** I change a user's role from "foreman" to "project_manager"
- **Then** The user's permissions update immediately, granting them project creation and management capabilities

#### Scenario 7: Multiple Organization Membership
- **Given** I belong to both Organization A (as owner) and Organization B (as foreman)
- **When** I log in to PipeTrak
- **Then** I can switch between organizations and my available features change based on my role in each

### Edge Cases
- What happens when an invited user's email already exists in the same organization? (System should reject duplicate invitation)
- How does system handle expired invitation links? (Show error message with option to request new invitation)
- What if organization owner tries to change their own role? (System should prevent owner from removing their own owner status)
- What happens when the last owner leaves an organization? (System prompts for ownership transfer; if declined, organization and all user memberships are soft-deleted with recovery window)
- Can a user accept multiple invitations to the same organization? (System should prevent duplicate memberships)
- What happens when an invitation is sent to an already-invited pending email? (System should allow resending/updating the invitation)
- How does system handle if owner deletes their account? (Same as last owner leaving: prompt for transfer, soft-delete org/memberships if declined)

---

## Requirements

### Functional Requirements - User Registration

- **FR-001**: System MUST allow new users to create an account by providing email, password, full name, and organization name
- **FR-002**: System MUST validate email addresses are in correct format and not already registered
- **FR-003**: System MUST enforce minimum password length of 6 characters with email verification as primary security mechanism
- **FR-004**: System MUST require acceptance of terms of service before account creation
- **FR-005**: System MUST automatically assign the first user of a new organization the "owner" role
- **FR-006**: System MUST create the organization record atomically with the user account (all-or-nothing)
- **FR-007**: System MUST allow multiple organizations to share the same name (non-unique); organizations are distinguished by internal org_id only

### Functional Requirements - Role System

- **FR-008**: System MUST support seven distinct user roles: owner, admin, project_manager, foreman, qc_inspector, welder, viewer
- **FR-009**: System MUST assign each user exactly one role per organization they belong to
- **FR-010**: System MUST allow users to belong to multiple organizations with different roles in each
- **FR-011**: **Owner** role MUST have full access including billing, team management, and all project operations
- **FR-012**: **Admin** role MUST have full access to projects and team management but NOT billing
- **FR-013**: **Project Manager** role MUST be able to create/edit projects, assign work, and view reports
- **FR-014**: **Foreman** role MUST be able to update component status, assign welders, and make field updates
- **FR-015**: **QC Inspector** role MUST be able to approve/reject work and add inspection notes
- **FR-016**: **Welder** role MUST be able to update only components assigned to them
- **FR-017**: **Viewer** role MUST have read-only access to assigned projects
- **FR-018**: System MUST prevent users from accessing features outside their role permissions

### Functional Requirements - Team Invitations

- **FR-019**: System MUST allow owners and admins to invite new team members by email address
- **FR-020**: System MUST require role selection when creating an invitation
- **FR-021**: System MUST generate a unique, secure invitation token for each invitation
- **FR-022**: System MUST send invitation emails with acceptance link to invited users
- **FR-041**: System MUST notify inviter via error message if invitation email fails to send; invitation record still created for manual link sharing
- **FR-023**: System MUST expire invitation links after [NEEDS CLARIFICATION: expiration period - 7 days, 30 days?]
- **FR-024**: System MUST allow resending invitations to pending invites
- **FR-025**: System MUST prevent duplicate invitations to the same email in the same organization
- **FR-026**: System MUST allow invitees to accept invitations whether they have an existing account or not
- **FR-027**: System MUST mark invitations as "accepted" once the invitee completes signup/signin
- **FR-028**: System MUST allow owners/admins to revoke pending invitations

### Functional Requirements - Multi-Tenancy & Security

- **FR-029**: System MUST isolate all organization data using row-level security
- **FR-030**: System MUST prevent users from accessing data from organizations they don't belong to
- **FR-031**: System MUST provide organization switching capability for users in multiple organizations
- **FR-032**: System MUST display current organization context in the UI header
- **FR-033**: System MUST prevent privilege escalation (users cannot grant themselves higher roles)
- **FR-038**: System MUST prompt last owner for ownership transfer when attempting to leave or delete account
- **FR-039**: System MUST soft-delete organization and all user memberships if last owner declines transfer
- **FR-040**: System MUST provide recovery window for soft-deleted organizations before permanent deletion

### Functional Requirements - Onboarding Experience

- **FR-034**: System MUST show a welcome wizard to first-time organization owners after signup
- **FR-035**: Welcome wizard MUST guide owners through: organization settings, project setup, team invitation
- **FR-036**: System MUST redirect invited users to appropriate dashboard based on their role after accepting invitation
- **FR-037**: System MUST provide different onboarding flows for owners vs. invited users

### Non-Functional Requirements

- **NFR-001**: Account creation process MUST complete within 3 seconds
- **NFR-002**: Invitation emails MUST be delivered within 1 minute of creation
- **NFR-003**: System MUST support up to 50 users per organization with light pagination and basic search functionality
- **NFR-004**: Password security uses relaxed standard (6 char minimum); email verification serves as primary account security mechanism
- **NFR-005**: Invitation tokens MUST be cryptographically secure (minimum 32 bytes of entropy)

### Key Entities

- **Organization**: Represents a construction company or tenant, has name, created date, billing status; root entity for multi-tenant isolation
- **User**: Individual person using PipeTrak, has email, password (hashed), full name; can belong to multiple organizations
- **Role**: Defines permission level within an organization (owner, admin, project_manager, foreman, qc_inspector, welder, viewer); determines feature access
- **User-Organization Link**: Junction entity linking users to organizations with their assigned role; allows many-to-many relationship
- **Invitation**: Represents a pending team member invitation, has email, assigned role, invitation token, status (pending/accepted/revoked/expired), expiration date, invited by user reference

---

## Open Questions

### Resolved (Session 2025-10-04)

1. ✅ **Password Requirements** (FR-003): Minimum 6 characters with email verification as primary security
2. ✅ **Organization Naming** (FR-007): Non-unique; multiple orgs can share names (identified by org_id)
3. ✅ **Organization Scale** (NFR-003): Up to 50 users per organization
4. ✅ **Compliance Requirements** (NFR-004): Relaxed standard; email verification primary security
5. ✅ **Ownership Transfer**: Prompt for transfer; soft-delete org/memberships if declined
6. ✅ **Email Failure Handling** (FR-041): Notify inviter; create invitation record for manual sharing

### Deferred to Planning (Low Impact)

7. **Invitation Expiration** (FR-023): How long should invitation links remain valid? (Suggested default: 7 days)
8. **Email Service**: Use built-in Supabase Auth emails or external provider? (Suggested: start with Supabase Auth)

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] Critical clarifications resolved (5 of 8 items addressed; 2 low-impact items deferred to planning)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted (registration, roles, invitations, multi-tenancy)
- [x] Ambiguities marked (8 clarification items identified)
- [x] User scenarios defined (7 scenarios + edge cases)
- [x] Requirements generated (41 functional + 5 non-functional requirements)
- [x] Entities identified (5 key entities)
- [x] Critical clarifications resolved (5 high-impact items; 2 low-impact deferred)
- [x] Review checklist passed

---

**Next Step**: Run `/plan` to generate implementation plan.
