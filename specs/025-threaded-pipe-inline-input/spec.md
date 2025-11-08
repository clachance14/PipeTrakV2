# Feature Specification: Threaded Pipe Inline Milestone Input

**Feature Branch**: `025-threaded-pipe-inline-input`
**Created**: 2025-11-07
**Status**: Draft
**Input**: User description: "Let's implement the Threaded Pipe Inline Input"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Update Partial Milestone with Direct Numeric Entry (Priority: P1)

Field workers need to update threaded pipe milestone progress quickly using direct numeric input instead of sliders. Workers can type a percentage value directly (e.g., "75") and press Enter or tap outside the field to save, eliminating the multi-step popover/modal workflow.

**Why this priority**: This is the core value proposition - reducing update friction from 4-5 steps to 2 steps. Field workers update milestones multiple times per day, so reducing interaction time by 50% has immediate productivity impact.

**Independent Test**: Can be fully tested by creating a threaded pipe component with partial milestones, tapping an input field, typing a numeric value, and verifying it saves correctly. Delivers immediate value as a faster update mechanism.

**Acceptance Scenarios**:

1. **Given** a threaded pipe component with Fabricate at 50%, **When** field worker clicks the input field, types "75", and presses Enter, **Then** the milestone updates to 75% and progress percentage recalculates
2. **Given** a threaded pipe component on mobile, **When** field worker taps the Fabricate input field, **Then** the numeric keyboard opens automatically with the current value selected
3. **Given** a field worker is editing a milestone value, **When** they click outside the input field (blur), **Then** the new value saves and the field returns to default state
4. **Given** a milestone input in focus state, **When** field worker presses Escape key, **Then** the edit is cancelled and the value reverts to the previous saved value

---

### User Story 2 - Validate Input with Real-Time Feedback (Priority: P1)

Field workers need immediate feedback when entering invalid milestone values to prevent data entry errors. The system validates that entered values are between 0-100 and provides clear visual/textual feedback for invalid entries.

**Why this priority**: Data validation is critical to prevent invalid progress values from being saved. Without validation, the system could accept nonsensical values like 150% or negative numbers, corrupting progress data.

**Independent Test**: Can be fully tested by attempting to enter out-of-range values (e.g., 150, -10), empty values, and non-numeric characters, then verifying appropriate error states and prevention mechanisms.

**Acceptance Scenarios**:

1. **Given** a field worker is editing a milestone input, **When** they type a value greater than 100 (e.g., "150") and blur the field, **Then** the input shows a red border, displays an error toast "Value must be between 0-100", and reverts to the previous value after 2 seconds
2. **Given** a field worker is editing a milestone input, **When** they type a negative number (e.g., "-10") and blur the field, **Then** the input shows an error state and reverts to the previous value
3. **Given** a field worker has cleared the input field, **When** they blur the field without entering a value, **Then** the input reverts to the previous saved value
4. **Given** a field worker enters a decimal value (e.g., "75.5"), **When** they save the value, **Then** the system rounds to the nearest integer (76) and saves it
5. **Given** a field worker enters a value with leading zeros (e.g., "075"), **When** they save the value, **Then** the system normalizes it to "75" and saves it

---

### User Story 3 - Mobile-Optimized Touch Interactions (Priority: P1)

Field workers on mobile devices need touch-optimized input fields with adequate touch targets and automatic numeric keyboard invocation for efficient data entry in the field.

**Why this priority**: Mobile is the primary device for field workers updating progress in real-time. Touch targets below 44px WCAG standards cause tap errors, and failing to invoke the numeric keyboard forces users to manually switch keyboards, adding friction.

**Independent Test**: Can be fully tested on mobile devices (iOS Safari, Android Chrome) by verifying touch target sizes, keyboard behavior, and tap interactions work correctly in portrait/landscape orientations.

**Acceptance Scenarios**:

1. **Given** a field worker is on a mobile device (≤1024px viewport), **When** they view a threaded pipe component, **Then** all milestone input fields are at least 48px tall (exceeding 44px WCAG AA minimum)
2. **Given** a field worker on iOS taps a milestone input field, **When** the field receives focus, **Then** the numeric keyboard opens automatically without requiring manual keyboard switching
3. **Given** a field worker on Android taps a milestone input field, **When** the field receives focus, **Then** the numeric keypad appears with the current value selected for easy overwriting
4. **Given** a field worker is viewing the component in landscape orientation, **When** they tap an input field, **Then** the input remains accessible and keyboard doesn't obscure the field

---

### User Story 4 - Keyboard Navigation for Desktop Users (Priority: P2)

Office staff updating progress reports from desktop computers need efficient keyboard navigation between milestone fields without requiring mouse interaction for each field.

**Why this priority**: Desktop users (office staff doing batch updates from field notes) benefit from keyboard shortcuts for faster data entry. While less critical than mobile optimization (P1), it significantly improves desktop UX.

**Independent Test**: Can be fully tested on desktop by navigating through multiple milestone inputs using only keyboard (Tab, Enter, Escape) and verifying all interactions work without mouse.

**Acceptance Scenarios**:

1. **Given** a desktop user has focused on the Fabricate input field, **When** they press Tab, **Then** focus moves to the next milestone input field (Install)
2. **Given** a desktop user has focused on a milestone input and typed a new value, **When** they press Enter, **Then** the value saves and focus moves to the next milestone input
3. **Given** a desktop user is navigating milestone inputs, **When** they press Shift+Tab, **Then** focus moves to the previous milestone input
4. **Given** a desktop user is editing a milestone input, **When** they press Escape, **Then** the edit is cancelled, the value reverts, and the field loses focus

---

### User Story 5 - Maintain Permissions and Disabled States (Priority: P2)

The system must respect existing user permissions (`canUpdateMilestones`) and disable milestone input fields for users without update rights, preventing unauthorized progress modifications.

**Why this priority**: Permission enforcement is essential for data integrity and security, but it's leveraging existing permission logic. The UI just needs to reflect existing backend constraints.

**Independent Test**: Can be fully tested by creating users with and without `canUpdateMilestones` permission, then verifying input fields are disabled/enabled appropriately.

**Acceptance Scenarios**:

1. **Given** a user without `canUpdateMilestones` permission views a threaded pipe component, **When** the component renders, **Then** all milestone input fields are disabled (gray background, cursor not-allowed)
2. **Given** a user without update permission, **When** they attempt to click a disabled milestone input field, **Then** no interaction occurs and no keyboard opens
3. **Given** a user with update permission loses that permission during an active session, **When** the permission change propagates, **Then** the input fields become disabled mid-session and any in-progress edit is cancelled

---

### User Story 6 - Screen Reader Accessibility (Priority: P3)

Users relying on screen readers need proper ARIA labels and live region announcements to understand milestone states and receive feedback on updates.

**Why this priority**: Accessibility is important for inclusive design, but it's lower priority than core functionality. It can be added/tested after P1-P2 features are working.

**Independent Test**: Can be fully tested using screen readers (VoiceOver on iOS/Mac, TalkBack on Android, NVDA on Windows) to verify all inputs are properly announced and updates are communicated.

**Acceptance Scenarios**:

1. **Given** a screen reader user navigates to a milestone input field, **When** the field receives focus, **Then** the screen reader announces "Fabricate milestone, currently 50 percent, edit text"
2. **Given** a screen reader user successfully updates a milestone, **When** the save completes, **Then** a live region announces "Fabricate updated to 75 percent"
3. **Given** a screen reader user enters an invalid value, **When** the validation error occurs, **Then** the screen reader announces "Invalid value. Must be between 0 and 100"
4. **Given** a screen reader user navigates through milestone inputs, **When** they encounter a disabled field, **Then** the screen reader announces the field name and "disabled, unavailable"

---

### Edge Cases

- **What happens when network connection is lost during edit?** Input remains functional, update is queued to localStorage via existing offline queue mechanism, and syncs when connection restored
- **What happens when two users update the same milestone simultaneously?** Last write wins (standard optimistic concurrency), each user sees their own update confirmed via toast, next refresh shows final value
- **What happens when user rapidly tabs through fields without saving?** Each field retains its previous value until explicitly changed; no auto-save on focus change without explicit value modification
- **What happens when component template is missing or corrupted?** Fallback to empty state (no inputs shown), error logged to console
- **What happens when current_milestones data is null or malformed?** Initialize all partial milestones to 0%, discrete milestones to 0 (incomplete)
- **What happens when input has focus and component re-renders?** Focus is preserved if possible, current edit state maintained, no jarring focus loss
- **What happens on mobile when keyboard covers the input field?** Browser's native behavior scrolls input into view when focused; no custom scroll handling needed
- **What happens when user switches browser tabs mid-edit?** On blur (tab switch), current value saves if valid; on return, field shows saved value

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace slider-based partial milestone editors (popover on desktop, modal on mobile) with inline numeric input fields for threaded pipe components
- **FR-002**: System MUST display milestone input fields that allow direct numeric entry (0-100) with a visually appended "%" suffix
- **FR-003**: System MUST validate entered values are integers between 0-100 (inclusive) before saving to the database
- **FR-004**: System MUST provide visual feedback for invalid input (red border, shake animation) and display error toast message "Value must be between 0-100"
- **FR-005**: System MUST automatically select all text when an input field receives focus, allowing immediate overwriting
- **FR-006**: System MUST open the numeric keyboard on mobile devices (iOS/Android) when milestone input fields are tapped
- **FR-007**: System MUST save milestone values when user presses Enter key or clicks/taps outside the input field (onBlur event)
- **FR-008**: System MUST cancel edits and revert to previous value when user presses Escape key
- **FR-009**: System MUST support Tab key navigation between milestone input fields in left-to-right order
- **FR-010**: System MUST disable milestone input fields (gray background, cursor not-allowed, no interaction) when user lacks `canUpdateMilestones` permission
- **FR-011**: System MUST maintain touch target sizes of at least 48px height on mobile (≤1024px viewports) for WCAG 2.1 AA compliance
- **FR-012**: System MUST use 16px font size for input fields on mobile to prevent iOS auto-zoom on focus
- **FR-013**: System MUST integrate with existing `useUpdateMilestone` hook for optimistic updates and database synchronization
- **FR-014**: System MUST trigger automatic progress percentage recalculation after milestone value saves (via existing database trigger)
- **FR-015**: System MUST display success toast notification after successful milestone update (e.g., "Fabricate updated to 75%")
- **FR-016**: System MUST queue milestone updates to localStorage when offline and sync when connection restored (via existing `useOfflineQueue` hook)
- **FR-017**: System MUST provide proper ARIA labels for screen readers (e.g., "Fabricate milestone, currently 50 percent")
- **FR-018**: System MUST announce milestone updates to screen readers via live regions (e.g., "Fabricate updated to 75 percent")
- **FR-019**: System MUST handle edge cases: empty input (revert to previous), leading zeros (normalize), decimals (round to nearest integer)
- **FR-020**: System MUST maintain discrete milestones (Punch, Test, Restore) as checkboxes (no changes to existing checkbox behavior)

### Key Entities *(include if feature involves data)*

- **Partial Milestone Input**: Represents a percentage-based milestone (Fabricate, Install, Erect, Connect, Support) with numeric value (0-100), weight (16% each), and display order
- **Discrete Milestone**: Represents a boolean milestone (Punch, Test, Restore) with weight (5%, 10%, 5% respectively) - unchanged by this feature
- **Component Progress**: Aggregated progress percentage automatically calculated from weighted milestone values (partial: weight × value/100, discrete: full weight if complete)
- **Threaded Pipe Component**: Component type with hybrid workflow (5 partial + 3 discrete milestones) requiring percentage-based progress tracking for bulk commodity pipe

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Field workers can update a single threaded pipe milestone in under 2 seconds (50% faster than current 3-4 second popover/modal workflow)
- **SC-002**: Number of interaction steps to update a milestone reduced from 4-5 steps to 2 steps (tap/click input, type value, save)
- **SC-003**: Validation error rate for milestone updates remains below 5% of total updates (confirms validation logic is clear and effective)
- **SC-004**: Touch target compliance: 100% of milestone input fields on mobile meet or exceed 44px WCAG 2.1 AA minimum (actual target: 48px)
- **SC-005**: Numeric keyboard automatically opens on 100% of mobile input field taps without requiring manual keyboard switching
- **SC-006**: Screen reader users can successfully update milestones and receive appropriate feedback announcements (verified via VoiceOver/TalkBack testing)
- **SC-007**: Desktop users can complete updates for all 5 partial milestones using only keyboard navigation without mouse interaction
- **SC-008**: Update latency perceived by users remains under 100ms (via optimistic updates, same as current implementation)
- **SC-009**: Field worker satisfaction with milestone update workflow improves (measured via user feedback surveys post-deployment)
- **SC-010**: Zero increase in invalid milestone data saved to database (validation prevents all out-of-range values)

## Assumptions

- Existing `useUpdateMilestone` hook and database trigger (`calculate_component_percent`) correctly handle numeric values 0-100 for partial milestones
- Mobile devices support `inputMode="numeric"` and `pattern="[0-9]*"` attributes for numeric keyboard invocation (standard HTML5 support)
- Users are familiar with threaded pipe progress tracking and understand percentage-based milestones (no onboarding/help text needed)
- Network connectivity is generally available; offline queue mechanism (existing) handles rare disconnection scenarios
- Permission system (`canUpdateMilestones`) is enforced at database level via RLS policies, UI just reflects permission state
- Browser support targets modern browsers (Chrome, Safari, Firefox, Edge); IE11 not supported (consistent with existing app requirements)
- Field workers have basic numeric literacy and can estimate progress percentages without calculation assistance
- Toast notification duration (4 seconds for success, error) is sufficient for users to read feedback messages

## Dependencies

- Existing `useUpdateMilestone` TanStack Query hook for milestone mutations
- Existing `useOfflineQueue` hook for offline update queuing
- Existing `useMobileDetection` hook for viewport size detection (≤1024px mobile breakpoint)
- Existing database function `update_component_milestone` (RPC) for saving milestone values
- Existing database trigger `update_component_percent_on_milestone_change` for progress recalculation
- Existing RLS policies on `components` table for permission enforcement
- Shadcn/ui components (if using shared input styling, though likely custom input)
- Existing milestone_events table for audit trail (captures all milestone changes)

## Out of Scope

- Bulk update functionality (updating multiple milestones simultaneously in one action)
- Preset quick-select buttons (0%, 25%, 50%, 75%, 100%) for common values
- Arrow key increment/decrement functionality (Up/Down arrows adjust by 5%)
- Voice input for milestone values (browser speech recognition)
- Calculation helper (e.g., "Installed 20 of 40 joints" → auto-calculate 50%)
- Changes to discrete milestone behavior (checkboxes remain unchanged)
- Changes to other component types (valve, fitting, flange, etc.) - only affects threaded_pipe
- Mobile landscape keyboard overlay optimization (rely on browser native behavior)
- Custom scroll-into-view logic for input fields (rely on browser native behavior)
