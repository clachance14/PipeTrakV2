# Feature Specification: Team Management UI

**Feature Branch**: `016-team-management-ui`
**Created**: 2025-10-26
**Status**: Draft
**Input**: User description: "Teams Page - Best Practice Implementation Plan

Design Summary: A streamlined team management UI focused on individual member onboarding with detailed role/permissions setup, inline pending invites, and comprehensive member management actions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Team Members and Pending Invitations (Priority: P1)

As an organization owner or admin, I need to see all current team members and pending invitations in one unified view so I can quickly understand my team's composition and who has access to the system.

**Why this priority**: This is the foundation for all team management tasks. Without visibility into current team state, no other management actions can be performed effectively.

**Independent Test**: Can be fully tested by logging in as an owner/admin, navigating to `/team`, and verifying the member list displays with correct roles, statuses (active vs. pending), and basic information (name, email, join date). Delivers immediate value by providing team visibility.

**Acceptance Scenarios**:

1. **Given** I am logged in as an organization owner or admin, **When** I navigate to the `/team` page, **Then** I see a list of all active members in my current organization with their names, emails, roles, and join dates
2. **Given** there are pending invitations in my organization, **When** I view the team member list, **Then** pending invites appear inline with active members marked with a "Pending" badge
3. **Given** I am a member with viewer role, **When** I attempt to navigate to `/team`, **Then** I am denied access with a permission error message
4. **Given** the team list is displayed, **When** I click on a member row, **Then** the row expands to show detailed permissions breakdown based on their role

---

### User Story 2 - Invite New Team Members (Priority: P1)

As an organization owner or admin, I need to invite new team members by email with a pre-assigned role so they can join my organization and start collaborating.

**Why this priority**: Team growth is essential. This is the primary mechanism for expanding the team and is needed immediately after visibility.

**Independent Test**: Can be fully tested by clicking "Add Team Member" button, filling the invitation form (email + role + optional message), submitting, and verifying the pending invite appears in the list with a success toast. Email delivery can be verified separately. Delivers value by enabling team expansion.

**Acceptance Scenarios**:

1. **Given** I am viewing the team page, **When** I click the "Add Team Member" button, **Then** a modal dialog opens with an invitation form
2. **Given** the invitation form is open, **When** I enter a valid email address and select a role from the dropdown, **Then** the submit button becomes enabled
3. **Given** I submit a valid invitation, **When** the invitation is created successfully, **Then** the modal closes, a success toast appears, and the new pending invite appears inline in the member list
4. **Given** I attempt to invite an email that already exists in the organization, **When** I submit the form, **Then** I see an inline validation error indicating the user is already a member
5. **Given** I submit an invitation, **When** the invite is sent, **Then** the invitee receives an email with the invitation link and optional custom message

---

### User Story 3 - Search and Filter Team Members (Priority: P2)

As an organization owner or admin managing a large team, I need to search by name/email and filter by role or status so I can quickly find specific team members without scrolling through the entire list.

**Why this priority**: Essential for usability with teams larger than 10-15 members. Lower priority than core CRUD operations but critical for production use.

**Independent Test**: Can be fully tested by entering search terms in the search input, selecting filter options (role, status), and verifying the list updates to show only matching members. URL params can be verified in browser address bar. Delivers value by improving navigation efficiency.

**Acceptance Scenarios**:

1. **Given** I am viewing a team with 20+ members, **When** I type a name or email in the search input, **Then** the member list filters to show only matching members (debounced at 300ms)
2. **Given** I am viewing the team page, **When** I select "Admin" from the role filter dropdown, **Then** only members with the admin role are displayed
3. **Given** I have applied search and filter criteria, **When** I refresh the page, **Then** my filters persist via URL query parameters
4. **Given** I am viewing filtered results, **When** I select a sort option (Name, Role, Join Date, Last Active), **Then** the list reorders accordingly and the sort preference persists in the URL

---

### User Story 4 - Manage Member Roles (Priority: P2)

As an organization owner or admin, I need to change a team member's role so I can adjust their permissions as their responsibilities change.

**Why this priority**: Role management is important for maintaining proper access control but is less frequent than viewing/inviting. Can be delayed slightly as initial invites have correct roles.

**Independent Test**: Can be fully tested by clicking a "Change Role" action on a member row, selecting a new role from the dropdown, confirming, and verifying the role updates with a success toast and optimistic UI update. Delivers value by enabling permission adjustments.

**Acceptance Scenarios**:

1. **Given** I am viewing a team member's row, **When** I click the "Change Role" action, **Then** a role selection dropdown or modal appears
2. **Given** I select a new role for a member, **When** I confirm the change, **Then** the member's role updates immediately (optimistic update) and a success toast appears
3. **Given** I am the only owner in the organization, **When** I attempt to change my own role to a non-owner role, **Then** I see an error message preventing the action (must maintain at least one owner)
4. **Given** a role change fails on the server, **When** the error response is received, **Then** the UI reverts to the previous role (rollback optimistic update) and shows an error toast

---

### User Story 5 - Remove Team Members (Priority: P2)

As an organization owner or admin, I need to remove team members from the organization so I can revoke access when someone leaves the team.

**Why this priority**: Important for security and access control but less frequent than other operations. Removal is a destructive action that should be implemented carefully.

**Independent Test**: Can be fully tested by clicking "Remove Member" action, confirming in the AlertDialog, and verifying the member disappears from the list with a success toast. RLS policies should prevent the removed user from accessing org resources. Delivers value by enabling access revocation.

**Acceptance Scenarios**:

1. **Given** I am viewing a team member's row, **When** I click the "Remove Member" action, **Then** a confirmation dialog appears asking "Are you sure?"
2. **Given** the confirmation dialog is open, **When** I confirm the removal, **Then** the member is removed from the list and a success toast appears
3. **Given** I am the only owner in the organization, **When** I attempt to remove myself, **Then** I see an error message preventing the action (cannot remove last owner)
4. **Given** a member is removed, **When** they attempt to access organization resources, **Then** they are denied access via RLS policies

---

### User Story 6 - Manage Pending Invitations (Priority: P3)

As an organization owner or admin, I need to resend or revoke pending invitations so I can handle cases where invites are not received or need to be cancelled.

**Why this priority**: Useful for edge cases (lost emails, changed plans) but not critical for initial launch. Can be added after core invite flow works.

**Independent Test**: Can be fully tested by locating a pending invite in the list, clicking "Resend Invitation" to trigger a new email, or clicking "Revoke Invitation" to cancel it with confirmation. Delivers value by handling invitation edge cases.

**Acceptance Scenarios**:

1. **Given** I am viewing a pending invitation, **When** I click the "Resend Invitation" action, **Then** a new invitation email is sent and the "Last sent" timestamp updates
2. **Given** I am viewing a pending invitation, **When** I click "Revoke Invitation" and confirm, **Then** the invitation is cancelled and removed from the list
3. **Given** an invitation is revoked, **When** the invitee attempts to use the invitation link, **Then** they see an error message indicating the invitation is no longer valid

---

### Edge Cases

- What happens when an organization has zero members (should not be possible due to creator being auto-added)?
- What happens when a user belongs to multiple organizations and switches context via OrganizationSwitcher?
- How does the system handle inviting an email that belongs to a user already in a different organization?
- What happens if a user accepts an invitation after it has been revoked?
- How does the system handle role changes when the target user is currently logged in?
- What happens when filtering/sorting results in an empty list?
- How does the expandable permissions row behave on mobile devices with limited screen width?
- What happens when attempting to remove a member who owns critical resources (drawings, components, etc.)?

## Requirements *(mandatory)*

### Functional Requirements

**Display & Navigation**
- **FR-001**: System MUST display all members of the currently active organization (respecting OrganizationSwitcher context)
- **FR-002**: System MUST show pending invitations inline with active members, marked with a "Pending" badge
- **FR-003**: System MUST display member information including name, email, role, and join date for active members
- **FR-004**: System MUST display invitation information including invitee email, assigned role, and "last sent" timestamp for pending invites
- **FR-005**: System MUST restrict access to the `/team` page to users with owner or admin roles via RLS policies

**Invitation Management**
- **FR-006**: System MUST provide an "Add Team Member" button that opens a modal dialog with an invitation form
- **FR-007**: Invitation form MUST include required fields: email (validated), role dropdown (7 roles: owner, admin, project_manager, foreman, qc_inspector, welder, viewer)
- **FR-008**: Invitation form MUST include optional field: custom message to include in invitation email (max 500 characters)
- **FR-009**: System MUST validate email format and check for duplicate emails before allowing invitation submission
- **FR-010**: System MUST send invitation email to invitee with invitation link and optional custom message
- **FR-011**: System MUST fix the assigned role at invitation time (role cannot be changed during acceptance)
- **FR-012**: System MUST close the modal and show a success toast when invitation is created successfully
- **FR-013**: System MUST update the member list to show the new pending invite inline immediately after successful creation

**Filtering & Search**
- **FR-014**: System MUST provide a search input that filters members by name or email (case-insensitive, partial match)
- **FR-015**: System MUST debounce search input at 300ms to avoid excessive filtering
- **FR-016**: System MUST provide a role filter dropdown with options: All, Owner, Admin, Project Manager, Foreman, QC Inspector, Welder, Viewer
- **FR-017**: System MUST provide a status filter with options: All, Active, Pending
- **FR-018**: System MUST provide sort options: Name (A-Z), Role, Join Date (newest first), Last Active (most recent first)
- **FR-019**: System MUST persist all filter and sort selections in URL query parameters (format: `?search=john&role=admin&status=active&sort=name`)
- **FR-020**: System MUST restore filter and sort state from URL parameters on page load or refresh

**Role Management**
- **FR-021**: System MUST provide a "Change Role" action for each active member (visible to owner/admin only)
- **FR-022**: System MUST display a role selection dropdown or modal when "Change Role" action is clicked
- **FR-023**: System MUST apply optimistic updates when role change is initiated (update UI immediately before server confirmation)
- **FR-024**: System MUST show success toast and maintain optimistic UI state when role change succeeds on server
- **FR-025**: System MUST rollback optimistic update and show error toast when role change fails on server
- **FR-026**: System MUST prevent changing role if it would result in zero owners in the organization (show error toast with explanation)
- **FR-027**: System MUST disable "Change Role" action with tooltip explanation if current user lacks permission

**Member Removal**
- **FR-028**: System MUST provide a "Remove Member" action for each member (visible to owner/admin only)
- **FR-029**: System MUST display a Radix AlertDialog confirmation when "Remove Member" action is clicked
- **FR-030**: System MUST remove the member and show success toast when removal is confirmed
- **FR-031**: System MUST prevent removing the last owner in the organization (show error toast with explanation)
- **FR-032**: System MUST disable "Remove Member" action with tooltip explanation if current user lacks permission
- **FR-033**: System MUST enforce access revocation via RLS policies immediately after member removal

**Invitation Actions**
- **FR-034**: System MUST provide "Resend Invitation" action for pending invites (visible to owner/admin only)
- **FR-035**: System MUST send a new invitation email and update "last sent" timestamp when "Resend Invitation" is clicked
- **FR-036**: System MUST provide "Revoke Invitation" action for pending invites with confirmation dialog
- **FR-037**: System MUST cancel the invitation and remove it from the list when revocation is confirmed
- **FR-038**: System MUST show error message to invitees attempting to use a revoked invitation link

**Permissions Breakdown**
- **FR-039**: System MUST make each member row expandable (click to expand/collapse)
- **FR-040**: System MUST display detailed permissions breakdown when row is expanded, based on the member's role
- **FR-041**: System MUST show visual indicators (checkmarks for granted, X for denied) for each permission capability
- **FR-042**: System MUST include at minimum these permission categories in the breakdown: Manage Drawings, Assign Metadata, Update Milestones, Assign Welders, Manage Team (invite/remove members), View Reports

**Error Handling & Empty States**
- **FR-043**: System MUST show toast notifications (Sonner) for all action results (success, error, permission denied)
- **FR-044**: System MUST display empty state message "No team members yet" with "Add Team Member" CTA when organization has zero members (edge case)
- **FR-045**: System MUST display "No results found" message when filter/search criteria match zero members
- **FR-046**: System MUST show inline validation errors in invitation form for invalid email format or duplicate emails
- **FR-047**: System MUST show permission error toast with message "You need admin role to perform this action" when action is attempted without sufficient privileges

**Mobile Responsiveness**
- **FR-048**: System MUST adapt layout for mobile devices (≤1024px) following Feature 015 responsive patterns
- **FR-049**: System MUST make expandable permissions breakdown usable on mobile (consider accordion or modal pattern)

### Key Entities

- **TeamMember**: Represents an active user in the organization. Attributes: user ID, organization ID, name, email, role, join date, last active timestamp. Relationship: Belongs to one organization, has one role.

- **Invitation**: Represents a pending invitation to join the organization. Attributes: invitation ID, organization ID, invitee email, assigned role, created timestamp, last sent timestamp, optional custom message, invitation token, expiry date (7 days from creation). Relationship: Belongs to one organization, has one assigned role.

- **Role**: Represents a permission level within the organization. Attributes: role name (owner, admin, project_manager, foreman, qc_inspector, welder, viewer), permission capabilities (manage_drawings, assign_metadata, update_milestones, assign_welders, manage_team, view_reports, etc.). Relationship: Many team members and invitations reference one role.

- **Organization**: Represents the organizational context. Attributes: organization ID, name. Relationship: Has many team members and invitations. Members can belong to multiple organizations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Organization owners/admins can view their complete team roster (active + pending) in under 2 seconds for teams up to 100 members
- **SC-002**: Users can complete the full invitation flow (click "Add Team Member" → fill form → submit → see pending invite in list) in under 30 seconds
- **SC-003**: Search and filter operations return results within 300ms for teams up to 100 members
- **SC-004**: Role changes and member removals complete with optimistic UI updates in under 50ms perceived latency (actual server round-trip <500ms)
- **SC-005**: 95% of users successfully complete their first team member invitation without errors or support intervention
- **SC-006**: Zero accessibility violations (WCAG 2.1 AA) for all interactive elements (modals, dropdowns, expandable rows, buttons)
- **SC-007**: Team management page is fully functional on mobile devices (≤1024px width) with no horizontal scrolling or unusable controls
- **SC-008**: Permission errors are clearly communicated with actionable guidance (e.g., "Contact an organization owner to change member roles")
- **SC-009**: 100% of invitation emails are delivered within 1 minute of invitation creation
- **SC-010**: Zero unauthorized access incidents (RLS policies correctly enforce owner/admin-only access to team management features)

## Assumptions *(optional)*

1. **Performance Targets**: Team list loads in <2s for up to 100 members. This aligns with standard web application expectations. If organizations grow beyond 100 members, we may need pagination or virtualization (defer to future enhancement).

2. **Permission Model**: Reusing the existing 7-role system from Feature 002 (owner, admin, project_manager, foreman, qc_inspector, welder, viewer). Permission capabilities for each role are already defined in the database schema.

3. **Invitation Expiry**: 7-day expiration for invitation tokens (already established in Feature 002 implementation). No change needed.

4. **Search Implementation**: Client-side filtering for teams <100 members with 300ms debounce. If team size grows significantly, we may need server-side search (defer to future optimization).

5. **Mobile Breakpoint**: Following Feature 015 responsive patterns with ≤1024px as the mobile breakpoint. Layout adapts using vertical stacking and touch-friendly controls.

6. **Existing Infrastructure**: Leveraging existing TanStack Query hooks (`useInvitations()`, `useOrgMembers()`, `useOrganization()`) from Feature 002. Also reusing `RoleSelector` component, Sonner toast configuration, and URL state management patterns from Feature 010/011.

7. **Email Delivery**: Supabase Auth handles invitation email sending. Delivery reliability is delegated to Supabase infrastructure (assumed >99% delivery rate).

8. **Data Ownership**: Removed members do not have their created data (drawings, components, etc.) automatically reassigned. Data remains attributed to their user ID but is inaccessible to them after removal. Future enhancement may add data reassignment workflow.

## Dependencies *(optional)*

- **Feature 002 (User Registration & Team Onboarding)**: This feature builds directly on the invitation system, RLS policies, and multi-organization infrastructure established in Feature 002. The database schema (`invitations`, `user_organizations`, role validation) must be in place.

- **Existing Custom Hooks**: Requires `useInvitations()`, `useOrgMembers()`, `useOrganization()` hooks with mutations for creating invitations, changing roles, removing members, resending/revoking invitations.

- **OrganizationSwitcher Component**: The team page must respect the currently active organization context managed by this component.

- **Sonner Toast Configuration**: Toast notification system must be configured and available for success/error feedback.

- **Radix UI Primitives**: Dialog, AlertDialog, Dropdown, Tooltip components must be installed (already confirmed in CLAUDE.md).

- **RLS Policies**: Row Level Security policies must enforce:
  - Only owner/admin can access `/team` page
  - Only owner/admin can create invitations, change roles, remove members
  - Cannot remove last owner
  - Members can only see their own organization's team

## Out of Scope *(optional)*

- **Bulk Invitation Upload**: Uploading a CSV file with multiple email addresses to invite in batch is not included. Single invitation only.

- **Role Permissions Customization**: Modifying the permission capabilities associated with each role (e.g., customizing what "admin" can do). Roles have fixed permission sets.

- **Team Activity Dashboard**: Analytics or visualizations showing team member activity over time (e.g., "Most active members this week").

- **Member Profile Pages**: Detailed profile pages for each team member showing their activity history, assigned resources, etc.

- **Data Reassignment on Removal**: Automatically reassigning a removed member's created resources (drawings, components, milestones) to another user. Data remains attributed to the removed user's ID.

- **Invitation Approval Workflow**: Requiring current members to approve new member invitations before they can accept (owner/admin has full control to invite directly).

- **Audit Log**: Recording a detailed audit trail of all team management actions (who invited whom, who changed whose role, etc.). Basic timestamping only.

- **Integration with External HR Systems**: Syncing team members with external systems (e.g., Active Directory, HRIS).

- **Advanced Search**: Full-text search, regex patterns, or searching across custom fields. Simple name/email substring matching only.

## Open Questions *(optional)*

None at this time. All design decisions have been made based on brainstorming session responses.
