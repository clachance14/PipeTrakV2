# Feature Specification: One-Click Demo Access

**Feature Branch**: `031-one-click-demo-access`
**Created**: 2025-11-25
**Status**: Draft
**Input**: User description: "Rewrite the demo project flow to provide instant access after lead capture, using a shared demo account with nightly data reset"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prospect Accesses Demo Instantly (Priority: P1)

A prospective customer visits the PipeTrak homepage and wants to explore the product without waiting for email verification. They click "Try Demo", enter their contact information for marketing purposes, and are immediately logged into a fully-populated demo project with real-looking construction data.

**Why this priority**: This is the core value proposition - converting curious visitors into engaged demo users with zero friction. Currently requires email verification which causes drop-off.

**Independent Test**: Can be fully tested by clicking "Try Demo" on homepage, filling in email and name, and verifying immediate access to dashboard with demo data.

**Acceptance Scenarios**:

1. **Given** a visitor is on the homepage, **When** they click "Try Demo Project", **Then** they are taken to a lead capture form
2. **Given** a visitor is on the lead capture form, **When** they enter a valid email and name and submit, **Then** they see a loading transition
3. **Given** the loading transition is displayed, **When** auto-login completes (within 5 seconds), **Then** they are redirected to the dashboard with the demo project loaded
4. **Given** a visitor submits the lead form, **When** they land on the dashboard, **Then** they see a persistent "Demo Mode" banner indicating data resets nightly

---

### User Story 2 - Lead Information Captured for Marketing (Priority: P1)

When a prospect accesses the demo, their contact information (email, name) is captured and stored for marketing follow-up purposes. This enables the sales team to nurture interested leads.

**Why this priority**: Lead capture is essential for the marketing funnel - the demo is a lead generation tool, not just a product showcase.

**Independent Test**: Can be tested by submitting the demo form and verifying the lead record exists in the database with correct information.

**Acceptance Scenarios**:

1. **Given** a visitor submits the lead form, **When** the submission is processed, **Then** their email, name, timestamp, and source are stored
2. **Given** a lead submits the form, **When** viewing stored leads, **Then** additional metadata (IP address, user agent, referrer) is captured for analytics
3. **Given** the same email submits multiple times, **When** checked in the leads table, **Then** each submission is recorded as a separate entry (allows tracking repeat interest)

---

### User Story 3 - Demo Data Resets Nightly (Priority: P2)

To keep the demo experience clean and consistent for all prospects, the shared demo project data resets to a pristine baseline state every night at midnight UTC. This prevents data from becoming cluttered or confusing from multiple users' modifications.

**Why this priority**: Important for demo quality but not blocking initial access. Users can still use the demo even if data is messy.

**Independent Test**: Can be tested by making changes to demo data, waiting for the scheduled reset, and verifying data returns to baseline state.

**Acceptance Scenarios**:

1. **Given** the demo project contains user-modified data, **When** midnight UTC occurs, **Then** all data is restored to the captured baseline snapshot
2. **Given** a demo user is actively using the system during reset, **When** the reset completes, **Then** their session remains valid but they see refreshed data on next page load
3. **Given** the baseline was captured after 1605 project import, **When** reset occurs, **Then** all components, drawings, welders, areas, and systems match the original import

---

### User Story 4 - Demo Mode Banner Shows Upgrade Path (Priority: P2)

Demo users see a persistent banner indicating they are in demo mode, with a clear call-to-action to sign up for their own account. This converts engaged demo users into trial/paying customers.

**Why this priority**: Important for conversion but the demo itself provides value even without the banner.

**Independent Test**: Can be tested by logging in as demo user and verifying banner appears with working sign-up link.

**Acceptance Scenarios**:

1. **Given** a user is logged in as the demo account, **When** viewing any authenticated page, **Then** a demo mode banner is visible at the top
2. **Given** the demo banner is displayed, **When** the user clicks "Sign Up", **Then** they are directed to the registration page
3. **Given** a user is logged in with a regular account, **When** viewing authenticated pages, **Then** no demo mode banner is displayed

---

### User Story 5 - Rate Limiting Prevents Abuse (Priority: P3)

To prevent abuse of the demo access system (spam lead submissions, bot attacks), rate limiting restricts the number of demo access requests per IP address and email address.

**Why this priority**: Defensive measure that doesn't affect legitimate users but protects system integrity.

**Independent Test**: Can be tested by attempting rapid submissions from same IP/email and verifying appropriate rate limit responses.

**Acceptance Scenarios**:

1. **Given** an IP address has made 10 demo requests in the past hour, **When** they attempt another request, **Then** they receive a rate limit error with retry-after time
2. **Given** an email has been used 5 times in the past 24 hours, **When** that email is submitted again, **Then** a rate limit error is returned
3. **Given** a user is rate limited, **When** the limit expires, **Then** they can successfully access the demo again

---

### Edge Cases

- What happens when the demo account is accidentally deleted or locked? System should have monitoring and documented recovery steps.
- How does the system handle if baseline snapshot is missing or corrupted? Reset should fail gracefully and alert administrators.
- What if a user tries to use the demo login page while already logged in with another account? Should log out existing session first or redirect to dashboard.
- What happens during the exact moment of nightly reset if a user is making changes? Changes may be lost; session remains valid but data refreshes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a lead capture form when user clicks "Try Demo Project" from homepage
- **FR-002**: System MUST collect email address and full name from the lead capture form
- **FR-003**: System MUST validate email format before accepting form submission
- **FR-004**: System MUST store lead information (email, name, IP, user agent, referrer, timestamp) in a dedicated leads table
- **FR-005**: System MUST authenticate the user to a shared demo account after successful lead capture
- **FR-006**: System MUST redirect authenticated demo users to the dashboard
- **FR-007**: System MUST display a loading transition during the auto-login process
- **FR-008**: System MUST show a persistent demo mode banner to users logged in as the demo account
- **FR-009**: System MUST provide a "Sign Up" call-to-action in the demo mode banner
- **FR-010**: System MUST reset demo project data to baseline at midnight UTC daily
- **FR-011**: System MUST preserve user sessions during data reset (only data changes, not auth)
- **FR-012**: System MUST enforce rate limiting of 10 requests per hour per IP address
- **FR-013**: System MUST enforce rate limiting of 5 requests per 24 hours per email address
- **FR-014**: System MUST return appropriate error messages when rate limits are exceeded

### Key Entities

- **Demo Lead**: A record of a prospect who accessed the demo. Contains email, full name, IP address, user agent, referrer URL, and capture timestamp. Used for marketing follow-up.
- **Demo Baseline**: A snapshot of the demo project's pristine data state. Contains serialized data for areas, systems, test packages, welders, drawings, and components. Used to restore demo to clean state.
- **Demo Account**: A single shared user account (demo@pipetrak.com) that all demo users are logged into. Associated with a permanent organization and project.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users complete the demo access flow (click to dashboard) in under 10 seconds
- **SC-002**: 95% of demo access attempts result in successful dashboard landing
- **SC-003**: Lead capture rate is 100% of successful demo accesses (every demo user is a captured lead)
- **SC-004**: Demo data returns to baseline state within 60 seconds of midnight UTC
- **SC-005**: System handles 100 concurrent demo access attempts without degradation
- **SC-006**: Demo mode banner achieves 5% click-through rate to registration page
- **SC-007**: Time from demo access to dashboard is reduced by 90% compared to current email verification flow

## Assumptions

- The permanent demo account (demo@pipetrak.com) will be created manually via the Supabase Dashboard after implementation
- Demo data will be imported from the existing 1605 project with anonymized welder names
- The baseline snapshot will be captured manually after data import is complete
- Rate limiting thresholds (10/hour IP, 5/day email) are reasonable starting points and may be adjusted based on usage patterns
- Midnight UTC is an acceptable reset time for the target user base

## Spec Completion Checklist *(Constitution v2.0.0)*

**Documentation Completeness:**
- [x] All user flows documented (mobile AND desktop where applicable)
- [x] All acceptance criteria written in testable "Given/When/Then" format
- [x] All edge cases listed with expected behavior

**Validation:**
- [x] No unresolved questions remain in `/clarify` (or clarifications marked as deferred with justification)
- [x] All dependencies on other features or systems listed explicitly

**Constitution Note:** Incomplete specs lead to vague plans and implementation churn. Exit criteria prevent premature planning.
