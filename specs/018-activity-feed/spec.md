# Feature Specification: Dashboard Recent Activity Feed

**Feature Branch**: `018-activity-feed`
**Created**: 2025-10-28
**Status**: Draft
**Input**: User description: "let's build out the activity feed"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Recent Milestone Updates (Priority: P1)

As a project manager, I want to see the most recent milestone updates on my dashboard so that I can quickly understand what progress has been made by my team without navigating through multiple pages.

**Why this priority**: This is the core value of the activity feed - providing at-a-glance visibility into team activity. Without this, users have no way to see recent project progress centrally.

**Independent Test**: Can be fully tested by updating a component milestone and verifying it appears in the dashboard activity feed with complete details (who, what, when, which component, which drawing).

**Acceptance Scenarios**:

1. **Given** I am on the dashboard with a project selected, **When** the page loads, **Then** I see the last 10 milestone update activities for that project displayed in reverse chronological order
2. **Given** a team member updates a milestone, **When** I am viewing the dashboard, **Then** the new activity appears at the top of the feed in real-time (within 3 seconds)
3. **Given** I am viewing activities for Project A, **When** I switch to Project B in the project dropdown, **Then** I see only activities for Project B

---

### User Story 2 - Understand Activity Context (Priority: P1)

As a project manager, I want each activity to show full details (who made the change, which milestone, previous value, which component, and which drawing) so that I can understand the complete context without clicking through to other pages.

**Why this priority**: Without full context, users must navigate away from the dashboard to understand what happened, defeating the purpose of a quick activity overview.

**Independent Test**: Can be fully tested by creating various types of milestone updates (discrete checkboxes, partial percentages, different component types) and verifying each displays with complete, formatted descriptions.

**Acceptance Scenarios**:

1. **Given** a discrete milestone is marked complete, **When** I view the activity, **Then** I see "[User Name] marked [Milestone] complete for [Component Identity] on [Drawing Number]"
2. **Given** a partial milestone is updated from 50% to 85%, **When** I view the activity, **Then** I see "[User Name] marked [Milestone] to 85% (was 50%) for [Component Identity] on [Drawing Number]"
3. **Given** a component has no drawing assigned, **When** I view its activity, **Then** I see "[User Name] marked [Milestone] complete for [Component Identity] (no drawing assigned)"
4. **Given** any activity, **When** I view it, **Then** I see the user's initials displayed in a colored circle avatar

---

### User Story 3 - See Historical Activities (Priority: P2)

As a project manager, I want to see activities from existing milestone data (not just new updates) so that I have immediate visibility into recent team work when the feature is deployed.

**Why this priority**: Waiting for new activities to accumulate would make the feature unusable for days/weeks after deployment. Historical data provides immediate value.

**Independent Test**: Can be fully tested by deploying the feature to a project with existing milestone_events data and verifying the feed is populated immediately with the last 10 activities.

**Acceptance Scenarios**:

1. **Given** the feature is newly deployed and milestone_events table has 100+ existing records, **When** I open the dashboard, **Then** I see the last 10 activities immediately (no empty state)
2. **Given** historical milestone updates exist from various users and components, **When** I view the activity feed, **Then** each activity shows correctly formatted details from the historical data

---

### User Story 4 - Identify Team Members (Priority: P3)

As a project manager, I want to see user initials in the activity feed so that I can quickly identify who made each change without reading full names.

**Why this priority**: Initials provide quick visual scanning but are less critical than the activity content itself. Nice-to-have for usability.

**Independent Test**: Can be fully tested by verifying initials are correctly calculated from user full names (e.g., "John Smith" → "JS") and displayed in the avatar circle.

**Acceptance Scenarios**:

1. **Given** a user has full_name "John Smith", **When** their activity appears, **Then** I see initials "JS" in the avatar circle
2. **Given** a user has full_name "Madonna" (single word), **When** their activity appears, **Then** I see initials "M" in the avatar circle
3. **Given** a user has no full_name set, **When** their activity appears, **Then** I see initials derived from their email address (first 2 characters before @)

---

### Edge Cases

- What happens when no activities exist for a project (e.g., new project with no milestone updates)?
  - Display "No recent activity" message in the activity feed card
- How does the system handle activities from deleted users?
  - Display the user's historical name and initials from the snapshot at time of activity (users table retains historical records)
- What happens when a component referenced in an activity is deleted?
  - Activity remains visible with the component identity as it was at the time (historical record preserved)
- How does the system handle components with missing or malformed identity_key data?
  - Fall back to displaying generic "Component [UUID]" format
- What happens when multiple activities occur simultaneously (same timestamp)?
  - Display in the order returned by the database (typically insertion order)
- How does the system handle real-time connection failures?
  - Fall back to 30-second polling; users still see updates with minimal delay
- What happens when a component has an extremely long identity key (e.g., very long spool ID)?
  - Truncate display with ellipsis if necessary to prevent UI overflow

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display the last 10 milestone update activities for the currently selected project on the dashboard
- **FR-002**: System MUST show activities in reverse chronological order (newest first)
- **FR-003**: System MUST automatically filter activities by the selected project from the project dropdown
- **FR-004**: System MUST display each activity with: user name, milestone name, previous value (if applicable), new value, component identity, and drawing number (if assigned)
- **FR-005**: System MUST calculate and display user initials from the user's full name (first letter of each word)
- **FR-006**: System MUST fall back to email-based initials (first 2 characters before @) when full_name is not available
- **FR-007**: System MUST format component identities appropriately based on component type (e.g., "Spool SP-001", "Field Weld FW-042")
- **FR-008**: System MUST show "(no drawing assigned)" when a component has no associated drawing
- **FR-009**: System MUST update the activity feed in real-time when new milestone updates occur (within 3 seconds)
- **FR-010**: System MUST include existing historical milestone_events data in the activity feed (no backfill required - data already exists)
- **FR-011**: System MUST display "No recent activity" message when no activities exist for the selected project
- **FR-012**: System MUST show relative timestamps for each activity (e.g., "2 minutes ago", "3 hours ago", "1 day ago")
- **FR-013**: System MUST handle all 11 component types with appropriate identity formatting (spool, field_weld, support, valve, fitting, flange, instrument, tubing, hose, misc_component, threaded_pipe)

### Key Entities

- **Milestone Event**: Represents a single milestone update action by a user on a component. Contains: milestone name, previous value, new value, timestamp, user reference, component reference
- **Activity Item**: Formatted representation of a milestone event for display. Contains: unique ID, user initials, formatted description string, timestamp
- **Component**: Physical pipe component with type-specific identity. Activity feed shows identity in human-readable format
- **User**: Team member who performed the milestone update. Activity feed shows their name and initials
- **Drawing**: Optional design document associated with a component. Activity feed shows drawing number when available

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Project managers can see the last 10 team activities on the dashboard without navigating to other pages
- **SC-002**: New milestone updates appear in the activity feed within 3 seconds for all users viewing the dashboard
- **SC-003**: Activity feed displays complete context (who, what, when, which component, which drawing) for 100% of milestone updates
- **SC-004**: Historical milestone data (existing milestone_events) is visible in the activity feed immediately upon feature deployment
- **SC-005**: Activity feed queries complete in under 100 milliseconds for feeds with 10 activities
- **SC-006**: Users can correctly identify team member activity using initials with 95% accuracy
- **SC-007**: System handles projects with zero activities gracefully (shows empty state message)
- **SC-008**: Real-time updates continue to function when multiple team members (5+) update milestones concurrently

## Assumptions *(optional)*

- Existing `milestone_events` table contains comprehensive audit trail of all milestone changes
- Existing `users` table has `full_name` field populated for most users (email fallback available)
- Existing `components` table has `identity_key` JSONB field with type-specific identifiers
- Existing `drawings` table has `drawing_number` field for display
- Project managers want to see activities for the currently selected project only (no cross-project view needed)
- 10 activities is sufficient for the initial implementation (no pagination/infinite scroll required)
- Real-time updates are more valuable than slightly lower server load (justifies Supabase Realtime subscription)
- Users understand relative timestamps ("2 hours ago") better than absolute timestamps for recent activity

## Out of Scope *(optional)*

- Filtering activities by user, milestone type, or date range
- Pagination or "Load more" functionality for viewing more than 10 activities
- Detailed activity modal showing full milestone metadata and history
- Exporting activity history to CSV or other formats
- Notifications/alerts for specific types of activities
- Tracking non-milestone activities (imports, team changes, configuration changes)
- Cross-project activity view (showing activities from multiple projects simultaneously)
- Undo/rollback functionality directly from the activity feed
- Activity search or full-text filtering

## Dependencies *(optional)*

- Existing `milestone_events` table with historical data
- Existing `components` table with `identity_key`, `component_type`, and `drawing_id` fields
- Existing `users` table with `full_name` and `email` fields
- Existing `drawings` table with `drawing_number` field
- Existing `ActivityFeed` UI component (already implemented, accepts `ActivityItem[]` format)
- TanStack Query for data fetching and caching
- Supabase Realtime for real-time subscriptions (already configured in project)
- PostgreSQL view support (Supabase provides native PostgreSQL)

## Related Features *(optional)*

- Feature 010: Drawing-Centered Component Progress Table (provides milestone update UI that generates activity feed entries)
- Feature 015: Mobile Milestone Updates (mobile-optimized milestone updates that also populate activity feed)
- Feature 008: Authenticated Pages with Real Data (dashboard infrastructure where activity feed lives)
