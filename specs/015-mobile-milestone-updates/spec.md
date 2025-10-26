# Feature Specification: Mobile Milestone Updates

**Feature Branch**: `015-mobile-milestone-updates`
**Created**: 2025-10-23
**Status**: Draft
**Input**: User description: "Lets creat the mobile milestone feature"

## Clarifications

### Session 2025-10-24

- Q: What browser storage mechanism should be used for the offline milestone update queue? → A: localStorage
- Q: When a server-wins conflict occurs (user's queued offline update is discarded because server had a newer version), should the user be notified? → A: Silent - No notification, user never knows their update was discarded
- Q: What responsive behavior should apply for tablet viewports (641-1024px)? → A: Always mobile - Tablets always get mobile UI (touch targets, full-screen modals) like phones
- Q: What is the maximum number of queued offline updates before the app blocks new milestone updates? → A: 50 updates - Conservative limit, ~25KB storage, suitable for typical shift (1-2 drawings, 20 components)
- Q: What exact retry timing should be used for exponential backoff when sync fails? → A: 0s, 3s, 9s - True exponential (immediate, +3s, +9s = 3^1, 3^2), 12 second cycle

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Update Milestones from Mobile Device (Priority: P1)

As a foreman in the field, I need to update component milestones from my phone so that I can record work progress in real-time without returning to the office or using a desktop computer.

**Why this priority**: This is the core value proposition of the feature. Without mobile milestone updates, foremen must delay progress tracking until they can access a desktop, leading to stale data and reduced accountability.

**Independent Test**: Can be fully tested by opening the drawing table on a mobile device (phone viewport ≤640px), expanding a drawing, viewing components, and tapping to update discrete milestones (checkboxes) or partial milestones (sliders). Delivers immediate value by enabling field-based progress tracking.

**Acceptance Scenarios**:

1. **Given** I am a foreman viewing the drawings page on my phone, **When** I tap on a drawing row, **Then** the drawing expands to show its components with visible milestone controls
2. **Given** I am viewing a component's milestones on my phone, **When** I tap a discrete milestone checkbox (e.g., "Receive"), **Then** the milestone toggles between complete/incomplete with optimistic UI update
3. **Given** I am viewing a component's milestones on my phone, **When** I tap a partial milestone (e.g., "Install 0-100%"), **Then** a full-screen editor opens with a slider control allowing me to set the percentage
4. **Given** I have updated a milestone on my phone, **When** the update completes, **Then** I see confirmation (toast or checkmark) and the drawing's progress percentage recalculates
5. **Given** I am using a phone with viewport width ≤640px, **When** I navigate to the drawings page, **Then** all UI elements are touch-friendly (minimum 44x44px tap targets) and readable without zooming

---

### User Story 2 - Navigate and Search on Mobile (Priority: P1)

As a foreman in the field, I need to find specific drawings and components on my mobile device so that I can quickly locate the work I need to update without scrolling through hundreds of items.

**Why this priority**: Mobile screens have limited space. Without effective search and navigation, finding the right component becomes frustrating and time-consuming, reducing adoption of the mobile feature.

**Independent Test**: Can be fully tested by opening the drawings page on mobile, using the search input to filter by drawing number, and using the status filter to show only in-progress work. Delivers value by making the mobile experience efficient despite small screen size.

**Acceptance Scenarios**:

1. **Given** I am on the drawings page on my phone, **When** I tap the search input and type a drawing number (e.g., "P-001"), **Then** the drawing list filters to show only matching drawings
2. **Given** I am viewing the drawings page on my phone, **When** I tap the status filter and select "In Progress", **Then** the list shows only drawings with completion between 1-99%
3. **Given** I am on the drawings page on my phone, **When** I tap the hamburger menu icon, **Then** the navigation sidebar slides out from the left, allowing me to navigate to other pages (Packages, Welders, etc.)
4. **Given** I have multiple drawings expanded on my phone, **When** I tap the "Collapse All" button, **Then** all expanded drawings collapse to reduce scrolling
5. **Given** I am viewing the drawings page on mobile, **When** the page loads, **Then** filters and search are stacked vertically for easy access without horizontal scrolling

---

### User Story 3 - Work Offline with Automatic Sync (Priority: P2)

As a foreman working in areas with poor cell signal, I need milestone updates to queue locally when offline and automatically sync when connection returns, so that I can continue working without worrying about connectivity.

**Why this priority**: Construction sites often have spotty connectivity. This feature ensures foremen can work continuously regardless of signal strength, though it's secondary to basic mobile milestone updates (P1).

**Independent Test**: Can be fully tested by putting the device in airplane mode, updating milestones (which queue in localStorage), then reconnecting to see the queued updates sync automatically. Delivers value by making the app resilient to connectivity issues.

**Acceptance Scenarios**:

1. **Given** I am offline (no network connection), **When** I update a milestone, **Then** the update is queued locally with optimistic UI update, and I see a "Updates pending" badge in the header
2. **Given** I have 5 updates queued while offline, **When** my device reconnects to the network, **Then** the app automatically attempts to sync all queued updates in order
3. **Given** I have updates queued and connection is restored, **When** sync completes successfully, **Then** the queue badge shows a green checkmark and the queue clears
4. **Given** I have updates queued and sync fails (e.g., server error), **When** the sync attempt fails, **Then** the queue badge shows a red warning icon and I can tap to retry manually
5. **Given** I updated a milestone while offline and the server also received an update for the same milestone while I was offline, **When** sync occurs, **Then** the server's version wins (server-wins conflict resolution), my local change is discarded, and I see no error

---

### User Story 4 - View Progress on Mobile (Priority: P2)

As a foreman in the field, I need to view component and drawing-level progress on my mobile device so that I can assess work status and plan next steps without needing to update milestones.

**Why this priority**: Read-only progress viewing helps foremen make decisions in the field (e.g., "Is this drawing ready for inspection?"). It complements milestone updates but is less critical than the ability to actually update progress.

**Independent Test**: Can be fully tested by viewing the drawings page on mobile, observing progress bars and percentages at both drawing and component levels, and verifying the data matches desktop. Delivers value by providing situational awareness in the field.

**Acceptance Scenarios**:

1. **Given** I am viewing a drawing row on my phone, **When** I look at the drawing's progress bar, **Then** I see the aggregated completion percentage (e.g., "47%") with a visual progress bar
2. **Given** I have expanded a drawing on my phone, **When** I view the component list, **Then** I see each component's progress percentage and milestone status (complete/incomplete/partial)
3. **Given** I am viewing progress on my phone, **When** I tap a progress bar or percentage, **Then** I see a breakdown of which milestones contribute to the percentage (tooltip or expanded detail)
4. **Given** I am viewing the drawings page on mobile, **When** components are updated by other users in real-time, **Then** the progress percentages update without requiring a manual refresh (via cache invalidation)

---

### Edge Cases

- **What happens when the user updates a milestone while offline, and another user updates the same milestone on the server while the first user is offline?**
  - Server-wins: The server's version takes precedence, the queued local update is discarded silently (no error shown to user)

- **What happens when localStorage is full and the app tries to queue more updates?**
  - When 50 queued updates are reached (max limit), the app shows an error toast: "Update queue full (50/50) - please reconnect to sync pending updates" and prevents new updates until sync clears the queue

- **What happens when a foreman tries to update milestones on a tablet (viewport 641-1024px)?**
  - The responsive design adapts: tablets (641-1024px) always use the same touch-friendly mobile UI as phones (≤640px), with full-screen modals and 44px touch targets

- **What happens when the user rotates their phone from portrait to landscape?**
  - The layout adapts responsively using viewport-based breakpoints, maintaining usability in both orientations

- **What happens when sync fails repeatedly (e.g., 3 failed retries)?**
  - The app shows a persistent red warning badge with count of pending updates and a "Tap to retry" action, using exponential backoff (immediate, +3s, +9s, max 3 retries)

- **What happens when a foreman navigates away from the page while updates are queued?**
  - The queue persists in localStorage across page navigation and browser sessions, syncing automatically when connection is available regardless of which page the user is on

- **What happens when the user is on a slow connection (e.g., 3G)?**
  - The app uses optimistic UI updates (milestone changes appear instantly), showing a loading spinner only if the request takes >2 seconds, preventing perceived lag

## Requirements *(mandatory)*

### Functional Requirements

#### Mobile UI & Responsiveness

- **FR-001**: System MUST render the drawings page with touch-friendly controls on viewports ≤1024px (mobile phones and tablets)
- **FR-002**: System MUST ensure all interactive elements (buttons, checkboxes, sliders) have minimum 44x44px touch targets on mobile devices
- **FR-003**: System MUST display the navigation sidebar as a collapsible hamburger menu on mobile viewports, defaulting to closed
- **FR-004**: System MUST stack search and filter controls vertically on mobile to avoid horizontal scrolling
- **FR-005**: System MUST use a full-screen modal for partial milestone editing (slider controls) on mobile, replacing desktop popovers
- **FR-006**: System MUST display drawing progress bars and percentages in a simplified format on mobile (e.g., remove verbose labels, show "47%" instead of "47% Complete")
- **FR-007**: System MUST lazy-load component lists when drawings are expanded, preventing performance degradation on mobile devices with limited memory

#### Milestone Updates

- **FR-008**: Users MUST be able to update discrete milestones (boolean checkboxes) with a single tap on mobile devices
- **FR-009**: Users MUST be able to update partial milestones (0-100% sliders) by tapping to open a full-screen editor with a large, draggable slider control
- **FR-010**: System MUST provide optimistic UI updates (instant visual feedback) when users tap milestone controls, before server confirmation
- **FR-011**: System MUST show a confirmation indicator (toast notification or checkmark animation) when milestone updates complete successfully
- **FR-012**: System MUST recalculate and update drawing-level progress percentages immediately after component milestone updates

#### Offline Queue & Sync

- **FR-013**: System MUST detect when the device is offline using browser connectivity detection
- **FR-014**: System MUST queue milestone updates in localStorage when offline (max 50 updates), storing: component_id, milestone_name, value, timestamp, retry_count
- **FR-015**: System MUST display a persistent "X updates pending" badge in the header when offline updates are queued
- **FR-016**: System MUST automatically attempt to sync queued updates when network connection is restored
- **FR-017**: System MUST use server-wins conflict resolution with silent discard: if a milestone was updated on the server while the user was offline, the server's version takes precedence and the queued local update is discarded with no user notification
- **FR-018**: System MUST retry failed sync attempts with exponential backoff (max 3 retries: immediate, +3s, +9s, then stop)
- **FR-019**: System MUST show a green checkmark indicator when sync completes successfully and clear the queue
- **FR-020**: System MUST show a red warning indicator when sync fails after all retries, allowing users to tap to manually retry
- **FR-021**: System MUST persist the offline queue across page navigation and browser sessions

#### Search & Navigation

- **FR-022**: Users MUST be able to search for drawings by number on mobile, with the search input debounced (500ms) to reduce lag on slower devices
- **FR-023**: Users MUST be able to filter drawings by status (All, Not Started, In Progress, Complete) on mobile
- **FR-024**: Users MUST be able to collapse all expanded drawings with a single tap to reduce scrolling on mobile
- **FR-025**: System MUST preserve search and filter state in the URL on mobile (e.g., `?search=P-001&status=in-progress`)

#### Performance

- **FR-026**: System MUST load the drawings page in under 3 seconds on a 4G mobile connection with 100 drawings visible
- **FR-027**: System MUST render milestone updates with optimistic UI in under 50ms perceived latency on mobile devices
- **FR-028**: System MUST reduce virtualization overscan on mobile (5 rows instead of 10) to conserve memory

#### Accessibility

- **FR-029**: System MUST support touch gestures (tap, drag for sliders) for all milestone controls on mobile
- **FR-030**: System MUST prevent double-tap zoom on milestone buttons and other interactive controls
- **FR-031**: System MUST provide accessibility labels and roles for screen reader compatibility on mobile

### Key Entities

- **Offline Update Queue Entry**: Represents a milestone update queued while offline
  - Attributes: unique ID, component ID, milestone name, new value (boolean or 0-100), timestamp of update, retry count (0-3)
  - Relationships: References a specific component and milestone from the existing components table
  - Lifecycle: Created when offline update occurs, persisted in localStorage (max 50 entries), deleted when successfully synced or after 3 failed retries

- **Sync Status**: Represents the current state of offline/online synchronization
  - Attributes: online/offline status, pending update count, last sync attempt timestamp, sync success/failure indicator
  - Displayed in UI: Persistent badge in header showing "X updates pending", green checkmark (success), or red warning (failure)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Foremen can successfully update component milestones from mobile devices (phones with viewport ≤640px) in under 10 seconds per milestone, including navigation to the component
- **SC-002**: Mobile milestone updates work offline with automatic sync, with 100% of queued updates successfully syncing when connection is restored (or failing gracefully with user notification)
- **SC-003**: All interactive elements on mobile have minimum 44x44px touch targets, verified by manual testing on real devices
- **SC-004**: The drawings page loads in under 3 seconds on a 4G mobile connection with 100 drawings visible
- **SC-005**: Users can search and filter drawings on mobile with results appearing in under 1 second after typing stops (500ms debounce)
- **SC-006**: Optimistic UI updates appear instantly (under 50ms perceived latency) when users tap milestone controls on mobile
- **SC-007**: The mobile experience is usable on modern mobile browsers (latest 2 versions of major mobile browsers)
- **SC-008**: Foremen report improved satisfaction with field-based progress tracking, reducing the need to return to office computers (qualitative feedback via user interviews)

## Assumptions

- Foremen have mobile devices with modern browsers supporting responsive web design
- Typical field usage involves 1-2 drawings and fewer than 20 components per shift, well within the 50-update offline queue limit (~25KB in localStorage)
- Mobile data connectivity is intermittent but available (hybrid online/offline approach), not completely absent for extended periods
- Foremen have existing accounts and permissions to update milestones (no new authentication or authorization requirements for mobile)
- The existing desktop drawing table UI and data fetching patterns can be adapted for mobile with responsive design
- Browser storage is sufficient for queueing updates (typically 5-10 MB available)

## Out of Scope

- Comments/notes on milestone updates (future enhancement)
- Photo attachments for milestones (future enhancement)
- QR code or barcode scanning for component identification (future enhancement)
- Progressive Web App installation prompts and service workers (future enhancement)
- Push notifications for milestone updates or sync status (future enhancement)
- Native mobile applications (using responsive web design only)
- Offline caching of entire project data (only milestone update queue is persisted offline)

## Dependencies

- Feature 010: Drawing-Centered Component Progress Table (provides the desktop UI to adapt for mobile)
- Existing milestone update functionality and data fetching patterns
- Existing authentication and authorization system
- Browser support for responsive design, touch events, and local storage
