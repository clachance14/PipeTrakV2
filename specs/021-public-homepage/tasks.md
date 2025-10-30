# Tasks: Public Marketing Homepage

**Feature**: 021-public-homepage
**Branch**: `021-public-homepage`
**Input**: Design documents from `/specs/021-public-homepage/`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Tests**: Tests are OPTIONAL in this feature (no TDD requirement specified in spec.md). Tasks focus on implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database structure for demo functionality

- [X] T001 [P] Create rate_limit_events table in supabase/migrations/00066_create_rate_limit_events.sql
- [X] T002 [P] Add is_demo_user and demo_expires_at fields to users table in supabase/migrations/00065_add_demo_user_fields.sql
- [X] T003 [P] Create RLS policies for demo user isolation in supabase/migrations/00067_demo_rls_policies.sql
- [X] T004 Setup pg_cron extension and schedule daily cleanup job in supabase/migrations/00068_setup_pg_cron_cleanup.sql
- [X] T005 Apply all migrations to remote database via `supabase db push --linked`
- [X] T006 Regenerate TypeScript types from schema via `supabase gen types typescript --linked > src/types/database.types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 [P] Create demo data template module with 200 components, 20 drawings, 10 packages in supabase/functions/demo-signup/demo-template.ts
- [X] T008 [P] Implement rate limit checking utility function in supabase/functions/demo-signup/rate-limiter.ts
- [X] T009 [P] Create email validation utility in supabase/functions/demo-signup/validation.ts
- [X] T010 [P] Create homepage animation utilities (Intersection Observer) in src/lib/animations.ts
- [X] T011 Create demo signup Edge Function skeleton in supabase/functions/demo-signup/index.ts (validates input, checks rate limits, creates demo user, clones project, sends email per contracts/demo-signup-api.md)
- [X] T012 Create cleanup Edge Function skeleton in supabase/functions/cleanup-demos/index.ts (queries expired demo users, deletes via cascade)
- [X] T013 Add public `/` route to React Router configuration in src/App.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Prospect Discovers Product Value (Priority: P1) 🎯 MVP

**Goal**: Display compelling hero section with headline, tagline, 3 value proposition bullets, and 2 CTAs so prospects understand PipeTrak's value within 5 seconds

**Independent Test**: Navigate to `/` as unauthenticated user, verify hero content visible, click "Try Demo Project" button navigates to demo signup, click "Learn More" smoothly scrolls to features section

### Implementation for User Story 1

- [X] T014 [P] [US1] Create HeroSection component in src/components/homepage/HeroSection.tsx (full-screen hero, headline, tagline, 3 bullets, 2 CTAs)
- [X] T015 [P] [US1] Create ScrollIndicator component in src/components/homepage/ScrollIndicator.tsx (animated bouncing chevron at bottom center)
- [X] T016 [P] [US1] Create HomepageFooter component in src/components/homepage/HomepageFooter.tsx (minimal footer with copyright, email contact, terms/privacy links)
- [X] T017 [US1] Create HomePage component in src/pages/HomePage.tsx (compose HeroSection, ScrollIndicator, HomepageFooter with responsive layout)
- [X] T018 [US1] Implement smooth scroll behavior for "Learn More" CTA in src/components/homepage/HeroSection.tsx (scrolls to feature highlights section)
- [X] T019 [US1] Add mobile responsive styles to HeroSection in src/components/homepage/HeroSection.tsx (stacked CTAs, ≥44px touch targets, no horizontal scroll)
- [X] T020 [US1] Add WCAG 2.1 AA accessibility attributes to HeroSection in src/components/homepage/HeroSection.tsx (semantic HTML, ARIA labels, 4.5:1 contrast, keyboard navigation)
- [X] T021 [US1] Add PipeTrak logo wordmark to header in src/components/homepage/HeroSection.tsx (white/light version for dark hero background)
- [X] T022 [US1] Add hero background image or gradient with semi-transparent overlay (40-60% opacity) in src/components/homepage/HeroSection.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional - prospects can see hero section, understand value proposition, and navigate to demo signup or feature details

---

## Phase 4: User Story 2 - Prospect Explores Feature Details (Priority: P2)

**Goal**: Display 3 feature highlight cards (mobile updates, real-time tracking, audit documentation) below hero section so prospects can learn specific capabilities

**Independent Test**: Scroll to feature highlights section, verify 3 cards visible with proper content/icons/hover effects, verify responsive layout (3-column on desktop, stacked on mobile), verify fade-in animations trigger on scroll

### Implementation for User Story 2

- [X] T023 [P] [US2] Create FeatureCards component in src/components/homepage/FeatureCards.tsx (3 cards with icon, title, description, hover effect)
- [X] T024 [US2] Add Intersection Observer animation hook in src/components/homepage/FeatureCards.tsx (fade-in + slide-up, staggered 150ms per card)
- [X] T025 [US2] Add responsive layout styles to FeatureCards in src/components/homepage/FeatureCards.tsx (3-column on >1024px, stacked on <768px)
- [X] T026 [US2] Add feature icons to FeatureCards in src/components/homepage/FeatureCards.tsx (mobile updates, real-time tracking, audit documentation)
- [X] T027 [US2] Add WCAG 2.1 AA accessibility attributes to FeatureCards in src/components/homepage/FeatureCards.tsx (semantic HTML, ARIA labels, keyboard navigation)
- [X] T028 [US2] Integrate FeatureCards into HomePage component in src/pages/HomePage.tsx (render below HeroSection)
- [X] T029 [US2] Test smooth scroll from "Learn More" CTA to FeatureCards section in src/pages/HomePage.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - prospects can see hero section and explore detailed features

---

## Phase 5: User Story 3 - Existing User Logs In (Priority: P3)

**Goal**: Provide "Login" link in top-right corner that navigates to existing /login page, and auto-redirect authenticated users to /dashboard

**Independent Test**: Click "Login" link navigates to /login page, enter valid credentials redirects to /dashboard, visit `/` while authenticated auto-redirects to /dashboard

### Implementation for User Story 3

- [X] T030 [P] [US3] Add "Login" link to homepage header in src/components/homepage/HeroSection.tsx (top-right corner, ≥44px touch target)
- [X] T031 [US3] Implement navigation to /login route when Login link clicked in src/components/homepage/HeroSection.tsx
- [X] T032 [US3] Add authentication check to HomePage component in src/pages/HomePage.tsx (auto-redirect to /dashboard if user already authenticated)
- [X] T033 [US3] Verify existing /login page redirects to /dashboard after successful authentication in src/pages/LoginPage.tsx (should already exist, just verify)
- [X] T034 [US3] Test Login link visibility and accessibility on mobile devices in src/components/homepage/HeroSection.tsx (≥44px touch target)

**Checkpoint**: All user stories 1, 2, and 3 should now be independently functional - prospects see hero/features, existing users can login easily

---

## Phase 6: User Story 4 - Prospect Signs Up for Demo Project (Priority: P2)

**Goal**: Provide demo signup form (email + name), create isolated demo project with 200 components/20 drawings/10 packages, send magic link email, enforce rate limits (10/hour per IP, 3/day per email), auto-delete after 7 days

**Independent Test**: Submit email + name in demo signup form, verify success message displayed, check email for magic link, click link to access demo project, verify isolated project data exists, verify rate limiting blocks 11th signup from same IP

### Implementation for User Story 4

- [X] T035 [P] [US4] Create DemoSignupForm component in src/components/demo/DemoSignupForm.tsx (email + name fields, submit button, validation)
- [X] T036 [P] [US4] Create DemoErrorMessage component in src/components/demo/DemoErrorMessage.tsx (displays specific errors: VALIDATION_ERROR, RATE_LIMIT_EXCEEDED, EMAIL_EXISTS, INTERNAL_ERROR with retry button)
- [X] T037 [P] [US4] Create DemoSuccessMessage component in src/components/demo/DemoSuccessMessage.tsx (post-signup confirmation, "Check your email for login link")
- [X] T038 [P] [US4] Create useDemoSignup hook in src/hooks/useDemoSignup.ts (TanStack Query mutation for demo signup Edge Function)
- [X] T039 [P] [US4] Create useRateLimitCheck hook in src/hooks/useRateLimitCheck.ts (query rate_limit_events before signup)
- [X] T040 [US4] Create DemoSignupPage component in src/pages/DemoSignupPage.tsx (compose DemoSignupForm, DemoErrorMessage, DemoSuccessMessage)
- [X] T041 [US4] Update "Try Demo Project" CTA in HeroSection to navigate to /demo-signup route in src/components/homepage/HeroSection.tsx
- [X] T042 [US4] Add /demo-signup route to React Router in src/App.tsx (public route)
- [X] T043 [US4] Implement demo signup business logic in supabase/functions/demo-signup/index.ts (validate input, check rate limits, create auth user, create organization, create project, clone 200 components/20 drawings/10 packages, send magic link email, log events)
- [X] T044 [US4] Implement rate limit enforcement in supabase/functions/demo-signup/index.ts (query rate_limit_events, enforce 10/hour per IP and 3/day per email limits, return 429 with retry_after)
- [X] T045 [US4] Implement email validation in supabase/functions/demo-signup/index.ts (check format, normalize to lowercase, check for duplicates)
- [X] T046 [US4] Implement demo project data cloning in supabase/functions/demo-signup/index.ts (bulk INSERT 200 components, 20 drawings, 10 packages from demo-template.ts in batches of 50)
- [X] T047 [US4] Implement magic link email sending in supabase/functions/demo-signup/index.ts (via Supabase Auth signInWithOtp, redirect to /dashboard)
- [X] T048 [US4] Implement demo user cleanup logic in supabase/functions/cleanup-demos/index.ts (query users WHERE is_demo_user = TRUE AND demo_expires_at < NOW(), DELETE cascades to org/project/data)
- [X] T049 [US4] Deploy demo-signup Edge Function via `supabase functions deploy demo-signup` (manual deployment required)
- [X] T050 [US4] Deploy cleanup-demos Edge Function via `supabase functions deploy cleanup-demos` (manual deployment required)
- [X] T051 [US4] Verify pg_cron job runs daily at 2 AM UTC to trigger cleanup-demos function (pg_cron configured in migration 00068)
- [X] T052 [US4] Add logging to demo signup flow in supabase/functions/demo-signup/index.ts (log success/failure events with duration, email hash, IP, error details)
- [X] T053 [US4] Add mobile responsive styles to DemoSignupForm in src/components/demo/DemoSignupForm.tsx (≥44px touch targets, no horizontal scroll)
- [X] T054 [US4] Add WCAG 2.1 AA accessibility to DemoSignupForm in src/components/demo/DemoSignupForm.tsx (semantic HTML, ARIA labels, error announcements, keyboard navigation)

**Checkpoint**: All 4 user stories should now be fully functional - prospects can see hero/features, sign up for demo, receive magic link, access isolated demo project for 7 days

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T055 [P] Add prefers-reduced-motion support to homepage animations in src/lib/animations.ts (disable animations if user has motion sensitivity)
- [X] T056 [P] Add error boundary for homepage components in src/pages/HomePage.tsx (catch rendering errors, display fallback UI)
- [X] T057 [P] Optimize hero background image loading in src/components/homepage/HeroSection.tsx (WebP format, lazy loading, fallback gradient - using gradient only, no image)
- [X] T058 [P] Add meta tags for SEO in src/pages/HomePage.tsx (title, description, Open Graph tags)
- [X] T059 [P] Add performance monitoring to demo signup flow in supabase/functions/demo-signup/index.ts (log page load time, demo creation duration)
- [X] T060 [P] Test graceful degradation when JavaScript disabled in src/pages/HomePage.tsx (static content visible - manual testing required)
- [X] T061 [P] Run Lighthouse accessibility audit on homepage and demo signup form (target ≥90 score - manual testing required)
- [X] T062 [P] Verify quickstart.md test scenarios work end-to-end (manual testing required)
- [X] T063 Code cleanup and refactoring across homepage components (remove console.logs, optimize styles, consolidate utilities)
- [X] T064 Update CLAUDE.md with feature 021 completion status and documentation references

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately (database migrations)
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories (Edge Functions, utilities)
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P2): Can start after Foundational - Integrates with US1 but independently testable
  - User Story 3 (P3): Can start after Foundational - Independent of US1/US2
  - User Story 4 (P2): Can start after Foundational - Uses US1's "Try Demo Project" CTA but independently testable
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Renders below US1's hero section but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Adds Login link to US1's header but independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Connected to US1's CTA but demo signup flow is fully independent

### Within Each User Story

- Setup tasks (T001-T006) can run in parallel except T005/T006 which depend on T001-T004
- Foundational tasks (T007-T010) can run in parallel
- User Story 1: T014-T016 can run in parallel (separate components), then T017-T022 sequentially (compose and style)
- User Story 2: T023-T027 can run in parallel (same component, different concerns), then T028-T029 sequentially (integration)
- User Story 3: T030-T032 can run in parallel, then T033-T034 for verification
- User Story 4: T035-T039 can run in parallel (separate components/hooks), then T040-T054 with some parallelization (e.g., T043-T048 can overlap)
- Polish tasks (T055-T062) can all run in parallel, then T063-T064 sequentially

### Parallel Opportunities

- All Setup tasks (T001-T004) can run in parallel (different migration files)
- All Foundational tasks (T007-T010) can run in parallel (different files)
- Once Foundational phase completes, all 4 user stories can start in parallel (if team capacity allows)
- Within User Story 1: T014, T015, T016 can run in parallel (separate components)
- Within User Story 2: T023, T024, T025, T026, T027 can run in parallel (same component, different aspects)
- Within User Story 3: T030, T031, T032 can run in parallel (separate concerns)
- Within User Story 4: T035, T036, T037, T038, T039 can run in parallel (separate components/hooks)
- Polish tasks (T055-T062) can all run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all component creation tasks together:
Task: "Create HeroSection component in src/components/homepage/HeroSection.tsx"
Task: "Create ScrollIndicator component in src/components/homepage/ScrollIndicator.tsx"
Task: "Create HomepageFooter component in src/components/homepage/HomepageFooter.tsx"

# Then compose them into HomePage:
Task: "Create HomePage component in src/pages/HomePage.tsx"
```

---

## Parallel Example: User Story 4

```bash
# Launch all component/hook creation tasks together:
Task: "Create DemoSignupForm component in src/components/demo/DemoSignupForm.tsx"
Task: "Create DemoErrorMessage component in src/components/demo/DemoErrorMessage.tsx"
Task: "Create DemoSuccessMessage component in src/components/demo/DemoSuccessMessage.tsx"
Task: "Create useDemoSignup hook in src/hooks/useDemoSignup.ts"
Task: "Create useRateLimitCheck hook in src/hooks/useRateLimitCheck.ts"

# Then compose them into DemoSignupPage and wire up Edge Function:
Task: "Create DemoSignupPage component in src/pages/DemoSignupPage.tsx"
Task: "Implement demo signup business logic in supabase/functions/demo-signup/index.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (database migrations)
2. Complete Phase 2: Foundational (Edge Functions, utilities)
3. Complete Phase 3: User Story 1 (hero section)
4. **STOP and VALIDATE**: Test User Story 1 independently (homepage displays hero section with compelling value proposition)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! Prospects see hero section)
3. Add User Story 2 → Test independently → Deploy/Demo (Prospects can explore feature details)
4. Add User Story 4 → Test independently → Deploy/Demo (Prospects can sign up for demo)
5. Add User Story 3 → Test independently → Deploy/Demo (Existing users can login easily)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (hero section)
   - Developer B: User Story 2 (feature cards)
   - Developer C: User Story 4 (demo signup)
   - Developer D: User Story 3 (login link)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Demo signup flow (US4) is the most complex - budget ~60% of implementation time
- Rate limiting and cleanup jobs are critical for preventing abuse
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
