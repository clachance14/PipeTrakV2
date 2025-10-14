# Feature Specification: Single-Organization User Model

**Feature Branch**: `004-plan-the-single`
**Created**: 2025-10-07
**Status**: Draft
**Input**: User description: "plan the single-org refactor as a separate spec"

## Context

The current implementation (Feature 002) allows users to belong to multiple organizations with an organization switcher UI. However, the business requirement is that **users are employees of a single company** - one user belongs to exactly one organization. This refactor corrects the data model to match the actual business domain.

## Clarifications

### Session 2025-10-07

- Q: How should the system handle users who currently belong to multiple organizations? → A: None exist (migration fails if any multi-org users found)
- Q: How should orphaned users (users with zero organizations) be handled during migration? → A: None exist (single user belongs to single organization; migration fails if any orphaned users found)
- Q: What rollback mechanism should be used if the migration fails or needs to be reversed? → A: Database is empty (single user only); can delete and repush schemas if needed - no complex rollback required

## User Scenarios & Testing

### Primary User Story

As a system administrator, I need the application to enforce that each user belongs to exactly one organization (their employer), so that the data model accurately reflects the business reality that employees work for a single company.

### Acceptance Scenarios

1. **Given** a new user registers, **When** they create an account, **Then** they are assigned to exactly one organization and cannot join additional organizations
2. **Given** an existing user with a role in their organization, **When** they log in, **Then** their organization and role are immediately available without requiring organization selection
3. **Given** a user receives an invitation to join an organization, **When** they already belong to an organization, **Then** the system prevents them from accepting the invitation
4. **Given** an administrator invites a new user, **When** the invitation is accepted, **Then** the new user is added to the administrator's organization with the specified role
5. **Given** a user's organization membership, **When** querying projects or components, **Then** the system automatically filters to their organization without requiring organization context switching

### Edge Cases

- What happens when a user tries to accept an invitation while already belonging to an organization? System must reject the invitation with a clear error message.
- What happens to existing users who currently belong to multiple organizations? Migration must fail with error report listing affected users (assumption: none exist).
- How does the system handle orphaned users (no organization)? Migration must fail with error report listing affected users (assumption: none exist - single user belongs to single organization).
- What happens when attempting to remove a user's organization? System must prevent this - organization membership is required.

## Requirements

### Functional Requirements

- **FR-001**: System MUST enforce that each user belongs to exactly one organization at all times
- **FR-002**: System MUST store the user's organization assignment as a direct relationship (not through a junction table)
- **FR-003**: System MUST store the user's role within their organization as a single value (owner, admin, project_manager, foreman, qc_inspector, welder, viewer)
- **FR-004**: System MUST prevent users from accepting invitations if they already belong to an organization
- **FR-005**: System MUST remove the organization switcher UI component (no longer needed)
- **FR-006**: System MUST automatically scope all data queries to the user's organization without requiring manual organization selection
- **FR-007**: Migration MUST validate that no users belong to multiple organizations before proceeding; if found, migration MUST abort with error list
- **FR-008**: System MUST preserve all existing user data during migration (email, full_name, terms acceptance, etc.)
- **FR-009**: System MUST update all permission checks to reference the user's direct organization assignment
- **FR-010**: System MUST prevent creating a user without an organization assignment
- **FR-011**: System MUST use role-based permissions (code-defined) instead of a separate user capabilities table
- **FR-012**: Invitation acceptance flow MUST assign the user's organization and role in a single atomic operation

### Non-Functional Requirements

- **NFR-001**: Migration can use simple drop/recreate approach (development environment with single user)
- **NFR-002**: All existing tests MUST pass after refactor with updated assertions
- **NFR-003**: Database queries MUST perform as well or better than the junction table approach (simpler joins)
- **NFR-004**: Migration can use maintenance window (development environment, no production data at risk)

### Key Entities

- **User**: Represents a person with system access. Each user has exactly one organization (their employer) and exactly one role within that organization. Key attributes: email, full_name, organization, role, terms acceptance.
- **Organization**: Represents a company using the system. An organization has many users (employees). Key attributes: name, active status.
- **Invitation**: Represents a pending team member invitation. Can only be accepted by users who do NOT already belong to an organization. Key attributes: email, target organization, assigned role, expiry date.
- **Role**: Represents a user's permission level within their organization. Not a database entity - defined as an enumerated type (owner, admin, project_manager, foreman, qc_inspector, welder, viewer).

## Migration Strategy

### Data Migration Requirements

- **MR-001**: For users with exactly one organization: preserve that organization and role
- **MR-002**: Migration MUST verify no users belong to multiple organizations; if any multi-org users are found, migration MUST fail with error report
- **MR-003**: Migration MUST verify all users have exactly one organization; if any orphaned users (zero organizations) are found, migration MUST fail with error report
- **MR-004**: All pending invitations MUST remain valid after migration
- **MR-005**: All existing RLS policies MUST be updated to use the new organization relationship

### Backward Compatibility

- **BC-001**: Existing API contracts (GraphQL/REST) should maintain the same response shape where possible
- **BC-002**: Existing authentication flow should work unchanged
- **BC-003**: All feature 002 team management capabilities (invite, role changes, remove members) should continue working

## Success Criteria

1. ✅ User registration assigns user to exactly one organization
2. ✅ No user can belong to more than one organization
3. ✅ Organization switcher UI removed from application
4. ✅ All RLS policies enforce organization boundaries using direct user-organization relationship
5. ✅ All existing users successfully migrated with organization and role assigned
6. ✅ Invitation acceptance prevents users with existing organizations from joining additional ones
7. ✅ All tests pass with ≥70% coverage maintained
8. ✅ Database schema simplified (user_organizations junction table removed)
9. ✅ Permission checks use role-based logic (no user_capabilities table)
10. ✅ Zero data loss during migration

## Dependencies & Assumptions

### Dependencies
- Feature 002 (User Registration and Team Management) is fully implemented and must be refactored
- Existing users and organizations exist in the database and must be preserved

### Assumptions
- Users represent individual employees, not shared accounts
- Organizations represent distinct legal entities (companies)
- A user cannot work for multiple companies simultaneously in this system
- Role-based permissions (7 roles) are sufficient without per-user capability overrides
- Current database is in development state with single user and single organization
- No production data exists; migration can use destructive operations if needed

## Out of Scope

- Allowing users to transfer between organizations (future feature)
- Organization hierarchy or parent/child relationships
- Shared users across organizations (violates single-org principle)
- Historical tracking of organization changes
- Multi-organization SSO integration

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities resolved (3 clarifications completed)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
