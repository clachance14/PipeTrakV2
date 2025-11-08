# Feature Specification: Public Marketing Homepage

**Feature Branch**: `021-public-homepage`
**Created**: 2025-10-29
**Status**: Draft
**Input**: User description: "Public marketing homepage with hero section, feature highlights, and login access"

## Clarifications

### Session 2025-10-29

- Q: Demo signup rate limiting to prevent abuse? → A: Basic rate limiting - 10 signups per hour per IP address, 3 signups per day per email address
- Q: How should demo signup failures be handled? → A: User-friendly error messages showing specific errors (invalid email, rate limit exceeded, system error) with retry button and support contact link
- Q: Should Login link open a modal or navigate to a page? → A: Navigate to existing /login page
- Q: What size should the demo project data template be? → A: Medium dataset - 200 components, 20 drawings, 10 packages
- Q: What observability and monitoring is needed? → A: Basic logging with key metrics - log demo signup events, failures, cleanup jobs, page load times, and demo creation duration

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prospect Discovers Product Value (Priority: P1)

A construction manager or project executive visits www.pipetrak.co to evaluate PipeTrak as a solution. They see a compelling hero section with a clear headline, three value proposition bullets, and understand immediately what PipeTrak does and why it's valuable. They can try the demo project or learn more about features.

**Why this priority**: This is the primary marketing function - attracting new customers. Without this, the homepage fails its core purpose of generating leads and explaining the product.

**Independent Test**: Can be fully tested by navigating to the homepage as an unauthenticated user, verifying all hero content is visible and compelling, and clicking the "Try Demo Project" button. Delivers standalone value by explaining the product to prospects.

**Acceptance Scenarios**:

1. **Given** a prospect visits www.pipetrak.co, **When** the page loads, **Then** they see a full-screen hero section with headline, tagline, three value proposition bullets, and two CTA buttons
2. **Given** a prospect reads the hero content, **When** they understand the value proposition, **Then** they can identify that PipeTrak solves visibility, efficiency, and compliance problems for pipe tracking
3. **Given** a prospect wants immediate hands-on experience, **When** they click "Try Demo Project" button, **Then** they are directed to a demo project experience
4. **Given** a prospect on mobile device (< 768px width), **When** viewing the hero section, **Then** all content is readable, touch targets are ≥44px, and CTAs are stacked vertically

---

### User Story 2 - Prospect Explores Feature Details (Priority: P2)

A prospect who wants more information scrolls down from the hero section to see three feature highlight cards that explain mobile updates, real-time tracking, and audit documentation. Each card provides concrete details about how PipeTrak works in practice.

**Why this priority**: Secondary to initial value proposition but critical for prospects who need more detail before requesting a demo. Helps qualify leads by providing depth.

**Independent Test**: Can be tested by scrolling to the feature highlights section and verifying all three cards are visible with proper content, icons, and responsive layout. Delivers value by educating prospects on specific capabilities.

**Acceptance Scenarios**:

1. **Given** a prospect on the homepage, **When** they click "Learn More" or scroll down, **Then** the page smoothly scrolls to the feature highlights section
2. **Given** a prospect viewing the feature section, **When** they see the three cards, **Then** each card displays a title, icon, description, and hover effect (on desktop)
3. **Given** a prospect on desktop (> 1024px), **When** viewing feature cards, **Then** cards are displayed in a 3-column horizontal grid
4. **Given** a prospect on mobile (< 768px), **When** viewing feature cards, **Then** cards are stacked vertically with adequate spacing
5. **Given** feature cards scroll into viewport, **When** they become visible, **Then** cards animate with a fade-in and slide-up effect, staggered by 150ms per card

---

### User Story 3 - Existing User Logs In (Priority: P3)

An existing PipeTrak user visits www.pipetrak.co and needs to access their account. They click the "Login" link in the top-right corner, which navigates to the existing /login page, allowing them to authenticate and access the application dashboard.

**Why this priority**: Important for existing users but tertiary to the marketing function. Existing users can always navigate directly to /login or /dashboard if bookmarked.

**Independent Test**: Can be tested by clicking the "Login" link in the header and successfully authenticating with valid credentials, then being redirected to the dashboard. Delivers value by providing existing users with easy access to the app.

**Acceptance Scenarios**:

1. **Given** an existing user on the homepage, **When** they click the "Login" link in the top-right corner, **Then** they are navigated to the /login page
2. **Given** an existing user enters valid credentials, **When** they submit the login form, **Then** they are authenticated and redirected to the dashboard
3. **Given** an authenticated user visits www.pipetrak.co, **When** the homepage loads, **Then** they are automatically redirected to /dashboard
4. **Given** a user on mobile device, **When** they view the homepage header, **Then** the Login link remains visible and accessible with ≥44px touch target

---

### User Story 4 - Prospect Signs Up for Demo Project (Priority: P2)

A prospect clicks "Try Demo Project" on the homepage and is presented with a simple signup form requesting their email and name. After submission, they receive a custom-branded email with a welcome message, quick start guide, and unique login link. The system creates an isolated demo project with realistic data for them to explore for 7 days. They can update milestones, view reports, and experience the full application as if it were their real project.

**Why this priority**: Critical for lead generation and product demonstration, but secondary to showing the initial value proposition on the homepage. This is the primary conversion path from prospect to potential customer.

**Independent Test**: Can be tested by submitting email + name in demo signup form, verifying email is sent with login link, clicking link to access demo project, and confirming isolated project data exists with full functionality. Delivers value by providing hands-on product experience.

**Acceptance Scenarios**:

1. **Given** a prospect clicks "Try Demo Project" button, **When** the form loads, **Then** they see a simple form with email and name fields and a submit button
2. **Given** a prospect enters valid email and name, **When** they submit the form, **Then** a demo user account is created in Supabase with `is_demo_user: true` flag
3. **Given** a demo user account is created, **When** the system processes the signup, **Then** an isolated demo project is created with full data (components, drawings, packages, welders, metadata)
4. **Given** a demo signup is complete, **When** the system sends confirmation, **Then** the user receives a custom-branded email with welcome message, PipeTrak value proposition, quick start guide (4 suggested features to explore), and unique login link valid for 7 days
4a. **Given** a demo user receives the confirmation email, **When** they read the email content, **Then** they see their name personalized, "Access Your Demo Project" CTA button, and footer with pipetrak.co link
5. **Given** a demo user clicks the login link in their email, **When** they authenticate, **Then** they are redirected to their isolated demo project dashboard
6. **Given** a demo user explores the demo project, **When** they update milestones or data, **Then** their changes persist during their 7-day access period
7. **Given** a demo user account is 7 days old, **When** the cleanup job runs, **Then** the demo user account and all associated project data are deleted from the database
8. **Given** a demo user wants to keep their project, **When** they choose to upgrade before expiration, **Then** their account is converted to a full account and data is preserved
9. **Given** a prospect submits an email already used for demo signup, **When** the system checks for duplicates, **Then** the user receives an error message or is redirected to login with their existing demo account

---

### Edge Cases

- **Demo signup form submission fails (network error, server error)**: Display specific error message ("Network error - please check your connection", "Server error - please try again") with retry button and support contact link; log failure with error type, user email, timestamp, IP address, and stack trace
- **Demo project data cloning fails during account creation**: Display error message "Unable to create demo project - please try again or contact support" with retry option; log error with user email, timestamp, cloning duration, and failure reason
- **Email delivery fails for demo confirmation link**: Display success message to user with instruction to check spam folder; log delivery failure with user email, timestamp, and delivery service error; allow user to resend confirmation email
- How does the system handle browser window resize from desktop to mobile (or vice versa) while viewing the page?
- What happens when hero background image fails to load or is blocked by content blockers?
- How does the page behave for users with JavaScript disabled (graceful degradation)?
- What happens when a user lands on the homepage via direct navigation vs. from an external marketing link (UTM tracking)?
- How does the page handle users with prefers-reduced-motion accessibility setting enabled?
- What happens when a demo user tries to access their project after 7-day expiration?
- What happens when cleanup job fails to delete expired demo users?
- What happens if a demo user tries to invite other users to their demo project?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a full-screen hero section (100vh) with headline, tagline, three value proposition bullets, and two CTA buttons
- **FR-002**: System MUST provide two distinct CTAs: "Try Demo Project" (primary) and "Learn More" (secondary)
- **FR-003**: System MUST display three feature highlight cards below the hero section, each with icon, title, and description
- **FR-004**: System MUST provide a "Login" link in the top-right header that navigates to the existing /login page
- **FR-005**: System MUST implement smooth scroll behavior when "Learn More" CTA is clicked, scrolling to the feature highlights section
- **FR-006**: System MUST display feature cards with fade-in and slide-up animations when they scroll into viewport, staggered by 150ms per card
- **FR-007**: System MUST implement responsive design with mobile (< 768px), tablet (768-1024px), and desktop (> 1024px) breakpoints
- **FR-008**: System MUST stack CTAs vertically on mobile with full width, and display horizontally on desktop
- **FR-009**: System MUST ensure all interactive elements have ≥44px touch targets on mobile devices
- **FR-010**: System MUST implement WCAG 2.1 AA accessibility compliance including semantic HTML, ARIA labels, keyboard navigation, and sufficient color contrast (4.5:1 minimum)
- **FR-011**: System MUST display PipeTrak logo wordmark in the top-left header (white/light version for dark hero background)
- **FR-012**: System MUST include a minimal footer with copyright notice and optional email contact and terms/privacy links
- **FR-013**: System MUST render the homepage as a public route at `/` without authentication requirement
- **FR-014**: System MUST display an animated scroll indicator (bouncing chevron or text) at the bottom center of the hero section
- **FR-015**: System MUST apply a semi-transparent dark overlay (40-60% opacity) over the hero background image
- **FR-016**: "Try Demo Project" CTA MUST direct users to a demo signup form that collects email and name
- **FR-017**: System MUST create isolated demo project for each demo user with full project data (components, drawings, packages, welders, metadata)
- **FR-018**: System MUST send email confirmation with unique login link after demo signup to verify email address
- **FR-019**: Demo users MUST have 7 days of full access to their isolated demo project with all functionality enabled
- **FR-020**: System MUST automatically delete demo user accounts and associated project data after 7-day expiration period
- **FR-021**: Demo users MUST be marked with `is_demo_user` flag to distinguish from regular users
- **FR-022**: System MUST allow demo users to upgrade/convert their demo account to a full account before expiration
- **FR-023**: System MUST enforce rate limiting on demo signups: maximum 10 signups per hour per IP address and maximum 3 signups per day per email address
- **FR-024**: System MUST display user-friendly error messages for demo signup failures including specific error types (invalid email format, rate limit exceeded, network error, server error) with retry button and support contact link
- **FR-025**: System MUST log key operational events including demo signup attempts (success/failure), demo project creation duration, email delivery status, cleanup job executions, and page load performance metrics
- **FR-026**: System MUST log all demo signup failures with sufficient context for debugging (error type, user email, timestamp, IP address, stack trace)
- **FR-027**: System MUST send demo confirmation emails via Resend API (not default Supabase SMTP) with custom HTML template
- **FR-028**: Demo confirmation email MUST include welcome message introducing PipeTrak as industrial pipe tracking system for brownfield construction projects
- **FR-029**: Demo confirmation email MUST include "What to Explore First" quick start guide with 4 suggested features (Progress Dashboard with 200 components, Drawing Table with 20 drawings, Test Packages with 10 packages, Team Management for inviting members)
- **FR-030**: Demo confirmation email MUST use simple HTML formatting (headings, bold, links, inline styles) without complex templates or images
- **FR-031**: Demo confirmation email MUST personalize greeting with user's full name from signup form
- **FR-032**: Demo confirmation email MUST use `demo@pipetrak.co` as sender address with "PipeTrak Demo" display name
- **FR-033**: Demo confirmation email MUST include footer with support contact ("Questions? Reply to this email") and pipetrak.co link
- **FR-034**: Demo signup Edge Function MUST generate Supabase magic link token using `admin.generateLink()` API and include in custom email template
- **FR-035**: System MUST NOT expose demo users to limitation messaging (e.g., what features are disabled) in signup emails

### Key Entities

- **Hero Content**: Represents the marketing copy displayed in the hero section (headline, tagline, value proposition bullets). Contains text content, display order, and visibility settings. Does not change frequently but should be maintainable.
- **Feature Card**: Represents one of three feature highlights displayed below the hero. Contains icon identifier, title text, description text, and display order. Each card highlights a specific product capability (mobile updates, real-time tracking, audit documentation).
- **Call-to-Action (CTA)**: Represents a clickable button in the hero section. Contains button text, style variant (primary/secondary/tertiary), target action (navigation URL, form trigger, smooth scroll), and display order.
- **Demo User**: Represents a prospect who signed up for demo access. Contains email, name, demo project reference, creation date, expiration date (7 days from creation), and is_demo_user flag. Associated with isolated demo project data that persists for 7 days.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Prospects can understand PipeTrak's core value proposition within 5 seconds of page load (headline + 3 bullets visible immediately)
- **SC-002**: Page loads and displays hero content in under 2 seconds on standard broadband connection (3G or better)
- **SC-003**: 100% of interactive elements (buttons, links) meet WCAG 2.1 AA accessibility standards including ≥44px touch targets and 4.5:1 color contrast
- **SC-004**: Homepage is fully responsive and functional across mobile (< 768px), tablet (768-1024px), and desktop (> 1024px) breakpoints without horizontal scrolling
- **SC-005**: Existing users can access the login flow from the homepage in 1 click (Login link → authentication)
- **SC-006**: Prospects can navigate to demo signup form in 1 click ("Try Demo Project" CTA → demo signup form)
- **SC-007**: Demo account creation and project data cloning (200 components, 20 drawings, 10 packages) completes in under 10 seconds after form submission
- **SC-008**: Demo confirmation email is delivered via Resend within 2 minutes of signup with >95% delivery rate
- **SC-009**: Demo users can access their isolated project with full functionality for 7 days from signup
- **SC-010**: Expired demo user accounts and data are deleted within 24 hours of expiration
- **SC-011**: Feature cards animate smoothly when scrolled into view with no layout shift or jank (60fps animation performance)
- **SC-012**: 100% of users with keyboard-only navigation can access all interactive elements in logical tab order
- **SC-013**: Page renders correctly and maintains core functionality when JavaScript is disabled (graceful degradation to static content)

## Assumptions *(optional)*

- The homepage will be deployed at the root domain www.pipetrak.co (not a subdomain or path)
- Existing users have bookmarked /dashboard or /login and may not frequently use the homepage for login access
- The primary traffic source will be organic search, paid ads, and external marketing campaigns (UTM tracking may be needed in future)
- Hero headline selection (Option A, B, or C from design doc) will be decided before implementation or set as configurable content
- Hero background image will be sourced or created separately (industrial pipes, construction site, or abstract blueprint pattern)
- PipeTrak logo wordmark asset (white/light version) exists or will be created before implementation
- No A/B testing infrastructure is required for initial launch (can be added in future iteration)
- Performance optimization (WebP images, lazy loading) will follow standard web performance best practices
- The homepage does not require a content management system (CMS) for initial launch; content can be hardcoded in React components
- Demo project data template (master dataset to clone) will be created separately with realistic construction project data (200 components, 20 drawings, 10 packages)
- Resend email service is configured with verified `demo@pipetrak.co` sender address and API key stored in Supabase Edge Function secrets
- Email confirmation link will use Supabase magic link authentication token generated via `admin.generateLink()` API
- Resend API has acceptable delivery rates (>95%) and latency (<30 seconds) for transactional emails
- Demo users will have read/write access to their isolated project but cannot invite other users or access billing features
- 7-day demo period is sufficient for prospects to evaluate the product
- Database storage costs for demo projects are acceptable (estimated ~40-50KB per demo user with 200 components, 20 drawings, 10 packages)
- Daily cleanup job (Supabase Edge Function or cron) will handle expired demo user deletion

## Dependencies *(optional)*

- Existing AuthContext and Supabase authentication system must be functional for login integration
- Existing React Router v7 routing configuration in App.tsx must support adding a public `/` route
- Tailwind CSS v4 must support the required color scheme (industrial blue, teal/green accent, slate grays) and responsive utilities
- Resend account with API key and verified `demo@pipetrak.co` sender address (API key stored in Supabase Edge Function secrets via `supabase secrets set`)
- Supabase Auth Admin API must support `admin.generateLink()` for magic link token generation
- Master demo project data template must be created with realistic construction data for cloning
- Database schema must support `is_demo_user` flag on users table and expiration tracking
- Supabase Edge Function or scheduled job infrastructure for daily cleanup of expired demo users
- RLS policies must properly isolate demo project data per user
- Demo signup form page/modal must be implemented (can be part of this feature or separate)

## Out of Scope *(optional)*

- A/B testing infrastructure for headline or CTA variations
- Content management system (CMS) for non-technical users to edit homepage content
- Analytics and tracking implementation beyond basic page view metrics (e.g., heatmaps, session replay)
- Marketing automation or CRM integration for demo user nurturing campaigns
- Multi-language support or internationalization (i18n)
- Advanced animations beyond fade-in, slide-up, and scroll-triggered entrance effects
- Video or multimedia content (e.g., product demo video in hero section)
- Testimonials, case studies, or social proof sections
- Pricing page or detailed product documentation
- Blog, resources, or help center content
- SEO optimization beyond basic meta tags (title, description, Open Graph tags)
- Newsletter signup or email capture functionality (separate from demo signup)
- Chat widget or support integrations
- Advanced demo features (scheduled demos, guided tours, in-app walkthroughs)
- Demo usage analytics dashboard for sales team
