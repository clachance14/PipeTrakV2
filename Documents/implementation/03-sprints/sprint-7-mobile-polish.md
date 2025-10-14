7.8 Sprint 7: Mobile UI & Pilot Prep (Week 8)

Duration: 5 days
Team: 2 Full-stack Developers + 1 Designer

GOALS:
- Polish mobile UI (PWA)
- Implement notifications (in-app only)
- Create training materials
- Deploy to production
- Onboard pilot users

TASKS (TDD ORDER - Tests First):

**Phase 1: Write Component Tests (MUST FAIL initially)**
□ Write tests for mobile UI:
  - Test: Responsive design renders correctly on mobile viewport (375px, 768px)
  - Test: Touch targets ≥44x44px (accessibility)
  - Test: Bottom navigation works on mobile
  - Test: Pull-to-refresh triggers refetch
  - Test: PWA manifest valid (can be installed)
□ Write tests for in-app notifications:
  - Test: Weld Made event creates notification for QC/PM
  - Test: Rollback event creates notification for PM
  - Test: Bell icon shows unread count
  - Test: Mark as read updates notification status
  - Test: Clear all removes all notifications
□ Write tests for notification preferences:
  - Test: "Notify on Weld Made" toggle saves preference
  - Test: Default preferences set correctly by role (QC/PM on, foreman off)
  - Test: Disabled notification type does not create notification

**Phase 2: Write E2E Tests (Playwright or Cypress)**
□ Write E2E smoke tests for critical workflows:
  - Test: Foreman workflow (login → bulk update 25 Spools → logout)
  - Test: PM workflow (login → view package readiness → drill down → logout)
  - Test: QC workflow (login → verify welder → resolve needs_review → logout)
  - Test: Import workflow (login → upload Excel → verify components created → logout)
□ Write cross-browser/device tests:
  - Test: PWA install on iOS Safari
  - Test: PWA install on Chrome Android
  - Test: Touch interactions work on physical device
  - Test: Offline detection (airplane mode shows banner)

**Phase 3: Implement Features & Deploy**
□ Mobile UI polish:
  - Responsive design (all pages mobile-friendly)
  - Touch-optimized buttons (min 44x44px)
  - Bottom navigation for mobile (Projects, Search, Packages, Notifications)
  - Pull-to-refresh on components table
  - PWA manifest + service worker (install to home screen)
□ Implement in-app notifications:
  - Bell icon (show unread count)
  - Notification types: Weld Made, Rollback
  - Mark as read (click notification)
  - Clear all (desktop only)
□ Build notification preferences (future: email opt-in):
  - Toggle: "Notify me on Weld Made" (default: on for QC/PM)
  - Toggle: "Notify me on Rollback" (default: on for PM)
□ Run E2E tests on staging:
  - All smoke tests pass on staging environment
  - Cross-browser tests pass (iOS Safari, Chrome Android, desktop Chrome)
□ Create training materials:
  - Foreman quick start guide (PDF): "How to update milestones"
  - PM guide (PDF): "How to use Package Readiness Dashboard"
  - QC guide (PDF): "How to verify welders and resolve Needs Review"
  - Video demos (Loom): 5-minute walkthrough per role
□ Production deployment:
  - Deploy database schema to production Supabase
  - Seed progress templates
  - Deploy frontend to Vercel production
  - Run E2E smoke tests on production
  - Manual smoke test: Create test project, import components, update milestones
□ Onboard pilot users:
  - Create accounts for 3 foremen, 1 PM, 1 QC
  - Set capabilities (can_update_milestones, can_resolve_reviews, etc.)
  - Send login credentials + training materials
  - Schedule kickoff call (30 min demo)

DELIVERABLES:
✅ Mobile UI polished (PWA installable)
✅ In-app notifications functional
✅ Training materials created
✅ Production deployment live
✅ Pilot users onboarded
✅ E2E smoke tests passing on production
✅ Mobile UI passes accessibility tests (WCAG AA)

ACCEPTANCE CRITERIA:
- Foreman can install PWA to iPhone home screen (verified in E2E tests)
- Foreman can update 25 components in <10s on mobile (verified in E2E tests)
- PM receives in-app notification when weld completed (verified in tests)
- All pilot users logged in successfully
- E2E smoke tests pass on production (all 3 workflows)

CONSTITUTION COMPLIANCE (v1.0.0):
- ✅ I. Type Safety First: PWA manifest types valid, notification types defined
- ✅ II. Component-Driven: Mobile UI components responsive, touch targets ≥44px (accessible)
- ✅ III. Testing Discipline: E2E tests for critical workflows, cross-browser tests
- ✅ IV. Supabase Integration: Notifications use realtime subscriptions
- ✅ V. Specify Workflow: Production deployment follows systematic testing (E2E on staging → production)

═══════════════════════════════════════════════════════════════════════════════
