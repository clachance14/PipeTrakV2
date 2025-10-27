# Feature Specification: User Profile Management

**Feature Branch**: `017-user-profile-management`
**Created**: 2025-10-27
**Status**: Draft
**Input**: User description: "Add user profile viewing and editing capability via modal dialog accessible from avatar dropdown. Users should be able to view and edit their full name, change password, and upload/update profile photo. Display read-only information including email, organization name, and role."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Profile Information (Priority: P1)

A user wants to see their current profile information including their name, email, organization, and role to verify their account details.

**Why this priority**: Foundational capability - users must be able to access and view their profile before any editing functionality makes sense. This is the minimum viable product.

**Independent Test**: Can be fully tested by clicking the avatar, opening the profile modal, and verifying all read-only information displays correctly. Delivers immediate value by giving users visibility into their account status.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they click their avatar in the top navigation, **Then** a dropdown menu appears with "View Profile" and "Sign Out" options
2. **Given** the dropdown menu is open, **When** the user clicks "View Profile", **Then** a modal opens displaying their profile information
3. **Given** the profile modal is open, **When** viewing the information section, **Then** the user sees their email address, organization name, and role displayed as read-only fields
4. **Given** the profile modal is open, **When** viewing their avatar, **Then** the user sees either their uploaded profile photo or a default avatar with their email initial
5. **Given** the profile modal is open, **When** the user presses Escape or clicks outside, **Then** the modal closes and returns focus to the avatar button

---

### User Story 2 - Update Full Name (Priority: P1)

A user wants to update their display name so their profile reflects their preferred name or corrects an error from initial registration.

**Why this priority**: Part of the core MVP - users expect basic profile editing capabilities. Full name is the simplest editable field with no security implications.

**Independent Test**: Can be tested by opening the profile modal, editing the full name field, saving, and verifying the change persists and appears throughout the application. Works independently of other editing features.

**Acceptance Scenarios**:

1. **Given** the profile modal is open, **When** the user edits their full name field and clicks "Save", **Then** the name updates immediately with an optimistic UI update
2. **Given** a name update is in progress, **When** the update succeeds, **Then** a success message appears and the new name displays everywhere in the app
3. **Given** a name update fails, **When** the server returns an error, **Then** the name reverts to the previous value and an error message explains what happened
4. **Given** the user enters an empty name, **When** they attempt to save, **Then** validation prevents submission and shows "Name cannot be empty"
5. **Given** the user enters a name with only whitespace, **When** they attempt to save, **Then** validation prevents submission and shows appropriate error

---

### User Story 3 - Upload Profile Photo (Priority: P2)

A user wants to upload a custom profile photo so they can personalize their account and be more easily recognizable to team members.

**Why this priority**: Important for user personalization and team collaboration, but not critical for basic functionality. System works fine with default avatars.

**Independent Test**: Can be tested by uploading various image files, verifying they display correctly, and checking that the avatar updates throughout the application. Works independently without other profile features.

**Acceptance Scenarios**:

1. **Given** the profile modal is open, **When** the user hovers over their avatar, **Then** an "Upload Photo" button overlay appears
2. **Given** the upload button is clicked, **When** the user selects a valid image file (JPG, PNG, WebP under 2MB), **Then** the image uploads and the avatar updates immediately
3. **Given** the user selects an invalid file, **When** validation runs, **Then** an error message explains the issue (file type, size limit) before attempting upload
4. **Given** an upload is in progress, **When** the file is uploading, **Then** a progress indicator shows upload status for files over 500KB
5. **Given** an upload fails, **When** a network error occurs, **Then** the error is displayed with a "Retry" option
6. **Given** a photo is successfully uploaded, **When** viewing the avatar throughout the app, **Then** the new photo displays in the navigation bar and all other locations
7. **Given** the user has uploaded a custom photo, **When** they upload a new one, **Then** the old photo is replaced (not accumulated in storage)

---

### User Story 4 - Change Password (Priority: P2)

A user wants to change their password for security reasons or because they suspect their account may have been compromised.

**Why this priority**: Important security feature, but not needed for basic profile viewing and editing. Can be implemented after core profile display/edit functionality.

**Independent Test**: Can be tested by submitting current and new passwords, verifying authentication, and testing login with the new password. Works independently as a self-contained security feature.

**Acceptance Scenarios**:

1. **Given** the profile modal is open, **When** the user expands the "Change Password" section, **Then** a form appears with fields for current password, new password, and confirm password
2. **Given** the password form is filled correctly, **When** the user submits with matching new passwords, **Then** the password updates and a success message confirms the change
3. **Given** the user enters an incorrect current password, **When** they submit, **Then** an error message appears: "Current password is incorrect"
4. **Given** the new password is too weak, **When** validation runs, **Then** a password strength indicator shows weakness and prevents submission
5. **Given** the new password and confirmation don't match, **When** the user attempts to submit, **Then** an error displays: "Passwords do not match"
6. **Given** a password change succeeds, **When** the update completes, **Then** the user remains logged in (no re-authentication required)
7. **Given** the user session expires during password change, **When** they submit, **Then** they are redirected to login with a message explaining the session timeout

---

### Edge Cases

- **What happens when a user has no organization?** (User registered but hasn't accepted invitation yet) - Display "No organization" placeholder text in the organization field
- **What happens when the user's full_name is null in the database?** - Display "Add your name" placeholder in edit mode
- **How does the system handle very large avatar files?** - Client-side validation prevents files over 2MB from uploading; show clear error before attempting upload
- **What happens if storage quota is exceeded?** - Display error message: "Unable to upload photo. Please contact your organization administrator"
- **How does the system handle concurrent profile updates?** - Last write wins; if detected, show warning that another change was saved
- **What happens if the modal is open and the user's session expires?** - Detect session expiry and redirect to login with return URL to profile
- **How are invalid image file types handled?** - Client-side validation checks file extension/MIME type before upload; server-side validation as backup
- **What happens on mobile devices with camera?** - File picker shows option to take photo with camera or choose from gallery
- **How does keyboard navigation work in the modal?** - Tab cycles through form fields, Escape closes modal, focus returns to avatar button on close
- **What happens if user has uploaded a photo but it's not loading?** - Show default avatar (initial letter) as fallback while attempting to load; error indicator if load fails

## Requirements *(mandatory)*

### Functional Requirements

#### Profile Viewing

- **FR-001**: System MUST display a dropdown menu when user clicks their avatar in the top navigation bar, containing "View Profile" and "Sign Out" options
- **FR-002**: System MUST open a modal dialog when user selects "View Profile" from the dropdown
- **FR-003**: System MUST display user's current email address as read-only text in the profile modal
- **FR-004**: System MUST display user's organization name as read-only text in the profile modal
- **FR-005**: System MUST display user's role (owner, admin, project_manager, foreman, qc_inspector, welder, viewer) as read-only text in the profile modal
- **FR-006**: System MUST display user's current profile photo or default avatar (email initial) in the profile modal
- **FR-007**: System MUST close the profile modal when user presses Escape key or clicks outside the modal
- **FR-008**: System MUST return keyboard focus to the avatar button when modal closes

#### Profile Editing - Full Name

- **FR-009**: System MUST provide an editable text field for the user's full name in the profile modal
- **FR-010**: System MUST validate that full name is not empty before allowing save
- **FR-011**: System MUST trim leading and trailing whitespace from full name before saving
- **FR-012**: System MUST update the user's full name in the database when user clicks "Save"
- **FR-013**: System MUST display the updated full name throughout the application immediately after successful save
- **FR-014**: System MUST show optimistic UI update (display new name immediately) while save operation is in progress
- **FR-015**: System MUST revert to previous name and show error message if save operation fails

#### Profile Photo Upload

- **FR-016**: System MUST display an "Upload Photo" button overlay when user hovers over their avatar in the profile modal
- **FR-017**: System MUST open the device's file picker when user clicks "Upload Photo"
- **FR-018**: System MUST validate file type before upload (only JPG, PNG, WebP allowed)
- **FR-019**: System MUST validate file size before upload (maximum 2MB)
- **FR-020**: System MUST display clear error messages for invalid file types or sizes before attempting upload
- **FR-021**: System MUST upload the selected image file to secure storage
- **FR-022**: System MUST store the public URL of the uploaded image in the user's profile
- **FR-023**: System MUST display the new avatar throughout the application immediately after successful upload
- **FR-024**: System MUST show upload progress indicator for files larger than 500KB
- **FR-025**: System MUST replace (not accumulate) previous avatar when user uploads a new photo
- **FR-026**: System MUST display default avatar (email initial) if profile photo fails to load

#### Password Change

- **FR-027**: System MUST provide a "Change Password" section in the profile modal (collapsible or always visible)
- **FR-028**: System MUST require user to enter their current password before changing to a new password
- **FR-029**: System MUST require user to enter new password twice (password + confirmation) for verification
- **FR-030**: System MUST validate that new password meets minimum security requirements (minimum 8 characters)
- **FR-031**: System MUST validate that new password and confirmation password match before submitting
- **FR-032**: System MUST verify current password is correct before processing password change
- **FR-033**: System MUST update user's password in the authentication system when change is submitted
- **FR-034**: System MUST keep user logged in after successful password change (no re-authentication required)
- **FR-035**: System MUST display success message after password change completes
- **FR-036**: System MUST display specific error messages for password change failures (incorrect current password, weak password, passwords don't match)
- **FR-037**: System MUST display password strength indicator as user types new password

#### Security & Permissions

- **FR-038**: System MUST only allow authenticated users to access the profile modal
- **FR-039**: System MUST only allow users to view and edit their own profile information
- **FR-040**: System MUST only allow users to upload files to their own avatar storage location
- **FR-041**: System MUST prevent users from modifying their email address (read-only)
- **FR-042**: System MUST prevent users from modifying their organization assignment (read-only)
- **FR-043**: System MUST prevent users from modifying their role (read-only)
- **FR-044**: System MUST sanitize and validate all user input before saving to database

#### Error Handling

- **FR-045**: System MUST display user-friendly error messages for all failure scenarios
- **FR-046**: System MUST provide "Retry" option for transient errors (network failures, timeouts)
- **FR-047**: System MUST rollback optimistic UI updates if server operation fails
- **FR-048**: System MUST log all errors for debugging purposes without exposing sensitive information to users
- **FR-049**: System MUST redirect to login page if user session expires while modal is open

#### Mobile Responsiveness

- **FR-050**: System MUST display profile modal as full-screen overlay on mobile devices (screens ≤768px wide)
- **FR-051**: System MUST ensure all interactive elements have minimum 32px touch targets on mobile devices
- **FR-052**: System MUST support native camera integration on mobile devices for avatar photo capture
- **FR-053**: System MUST prevent virtual keyboard from obscuring form fields (scroll into view when focused)
- **FR-054**: System MUST use single-column layout for all form fields on mobile devices

#### Accessibility

- **FR-055**: System MUST trap keyboard focus within modal when open (Tab cycles through modal elements only)
- **FR-056**: System MUST provide appropriate ARIA labels for all interactive elements
- **FR-057**: System MUST announce success and error messages to screen readers
- **FR-058**: System MUST support keyboard navigation for all functionality (no mouse-only interactions)

### Key Entities

- **User Profile**: Represents a user's account information including full name (editable), email (read-only), organization membership (read-only), role (read-only), and profile photo URL (editable via upload). Links to authentication system for password management.

- **Avatar Storage**: Represents user profile photos stored in secure file storage with public read access. Each user has a dedicated storage location identified by their user ID to enforce upload permissions.

- **Organization**: Represents the company/organization a user belongs to. Users view their organization name in profile but cannot change it (managed by organization owners/admins).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can open the profile modal in under 2 clicks (avatar → "View Profile")
- **SC-002**: Users can view all their profile information (name, email, organization, role, photo) in a single modal view without navigation
- **SC-003**: Users can update their full name and see the change reflected throughout the application within 2 seconds
- **SC-004**: Users can upload a profile photo under 2MB in size and see it display within 5 seconds
- **SC-005**: Users can complete a password change in under 30 seconds with clear feedback on success or failure
- **SC-006**: Profile modal loads and displays within 500 milliseconds on typical network conditions
- **SC-007**: 95% of users successfully complete profile updates on their first attempt without errors
- **SC-008**: All profile functionality is fully accessible via keyboard navigation (no mouse required)
- **SC-009**: Profile modal is fully responsive and usable on mobile devices with screens as small as 375px wide
- **SC-010**: Users receive clear, actionable error messages for all failure scenarios (file too large, password incorrect, network error, etc.)
- **SC-011**: Profile photo uploads complete with progress indication for any file taking longer than 1 second to upload
- **SC-012**: Password changes maintain user session (user remains logged in and working after password update)

### Technical Performance Targets

- **SC-013**: Profile modal animation completes in under 200 milliseconds (smooth open/close transition)
- **SC-014**: Avatar images are optimized to 256x256 pixels to balance quality and performance
- **SC-015**: System handles profile photo uploads up to 2MB without browser performance degradation
- **SC-016**: Profile data is cached after first load to minimize subsequent fetch times (near-instant on repeat views)

## Assumptions

- Users have already completed registration and have an active authenticated session
- The existing authentication system (Supabase Auth) supports password updates via its API
- Supabase Storage is available and configured for the project to handle file uploads
- The `users` table in the database can be modified to add an `avatar_url` column
- Users belong to exactly one organization (single-org architecture per Feature 004)
- Organization membership and role assignment are managed by organization owners/admins (not self-service)
- Email addresses are managed through the authentication system and cannot be changed via profile (security consideration)
- Default avatars displaying email initials are acceptable when no photo is uploaded
- Profile photos are publicly readable (appropriate for team collaboration tool where members see each other)
- Browser support includes modern evergreen browsers with JavaScript enabled
- Mobile devices support file upload and camera access through standard HTML5 file input

## Dependencies

- Supabase Authentication system for password change functionality
- Supabase Storage for profile photo uploads and hosting
- Database migration to add `avatar_url` column to `users` table
- Existing Layout component and AuthContext for integration points
- Shadcn/ui Dialog component for modal implementation
- Shadcn/ui DropdownMenu component for avatar dropdown
- TanStack Query for data fetching and optimistic updates
- Existing test infrastructure (Vitest, Testing Library) for test coverage

## Out of Scope

- Email address changes (security consideration - requires separate verification flow)
- Multi-factor authentication setup (separate security feature)
- Organization switching for users who belong to multiple organizations (current architecture is single-org)
- Profile photo editing/cropping tools (users must crop before upload)
- Account deletion or deactivation (separate feature requiring admin approval)
- Profile privacy settings (all profile information visible to organization members)
- Notification preferences (separate settings feature)
- Theme/appearance preferences (separate feature)
- Timezone or locale preferences (separate feature)
- Social media profile links or additional custom fields
- Profile viewing for other users (view other team members' profiles)
