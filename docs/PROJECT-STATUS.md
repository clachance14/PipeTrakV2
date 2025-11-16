# Project Status

Complete project status, feature history, and bug fix documentation for PipeTrak V2.

**Last Updated**: 2025-11-15

---

## Current Phase

**Phase**: Feature Development - Import Optimizations
**Progress**: Feature 027 Complete - Aggregate threaded pipe import operational

---

## Completed Features

### Feature 027: Aggregate Threaded Pipe Import (2025-11-15) - PRODUCTION READY

Import threaded pipe as aggregate components (1 component per drawing+commodity+size) instead of discrete instances.

**Key Capabilities**:
- ✅ Aggregate identity marked with pipe_id suffix "-AGG" (e.g., "P-001-1-PIPE-SCH40-AGG")
- ✅ Quantity summing on re-import (50 LF + 50 LF = 100 LF total_linear_feet)
- ✅ Line numbers array tracking (`["101", "205"]`) with duplicate prevention
- ✅ Milestone preservation during quantity updates (absolute LF values maintained)
- ✅ CSV validator exception allows threaded_pipe duplicates (rejected for other types)
- ✅ Component table displays "101 +2 more (100 LF)" with line number tooltip
- ✅ Milestone inputs show helper text "75 LF of 100 LF" for aggregate components
- ✅ Warning toast notification when quantities updated: "Milestone values preserved. Review progress for updated quantities."

**Technical Implementation**:
- ✅ Migration 00097 converts milestone storage to absolute LF schema (Fabricate_LF, Install_LF, etc.)
- ✅ Updated calculate_component_percent trigger to handle absolute LF milestone values
- ✅ Payload validator enforces QTY > 0 for threaded_pipe (rejects zero/negative quantities)
- ✅ Full test coverage with unit, integration, and component tests

📁 **Documentation**: `specs/027-aggregate-threaded-pipe-import/`

---

### Feature 026: Editable Milestone Weight Templates (2025-11-11) - PRODUCTION READY

Per-project milestone weight customization for all 11 component types.

**Key Capabilities**:
- ✅ View and edit milestone weights via Settings page (`/projects/:projectId/settings/milestones`)
- ✅ Clone system templates with 55 template rows (5 milestones × 11 component types)
- ✅ Real-time validation (weights must sum to 100%)
- ✅ Retroactive recalculation for existing components with progress indicator
- ✅ Audit trail with "Last modified by [User] on [Date]" on component type cards
- ✅ Optimistic locking to prevent concurrent edit conflicts
- ✅ Admin/PM-only access with permission gates in UI and RLS policies

**UX Features**:
- ✅ Keyboard navigation (Tab, Enter to save, Escape to cancel)
- ✅ WCAG 2.1 AA accessibility (ARIA labels, semantic HTML, screen reader support)
- ✅ Error boundary for graceful error handling
- ✅ Desktop-only (>1024px) - no mobile optimizations per spec

**Technical Implementation**:
- ✅ 9 database migrations (00087-00096) with 6 RPC functions
- ✅ 6 React components + 4 TanStack Query hooks
- ✅ Complete test coverage with integration and E2E tests

📁 **Documentation**: `specs/026-editable-milestone-templates/`

---

### Feature 025: Threaded Pipe Inline Milestone Input (2025-11-07) - PRODUCTION READY

Replaced slider-based popover/modal editors with inline numeric inputs for threaded pipe partial milestones.

**Key Capabilities**:
- ✅ Direct percentage entry (0-100) with Enter key or blur to save
- ✅ Input validation with visual feedback (red border, shake animation, error toast) for invalid values (>100, <0)
- ✅ Auto-revert to previous value after 2 seconds on error
- ✅ Keyboard navigation (Tab between inputs, Enter saves and advances, Escape cancels)

**Mobile Optimization**:
- ✅ ≥48px touch targets
- ✅ 16px font to prevent iOS zoom
- ✅ Numeric keyboard auto-opens

**UX Impact**:
- ✅ Reduced update workflow from 4-5 steps to 2 steps (50% faster: 3-4s → 1-2s)
- ✅ Permission-based disabled states (gray background, cursor-not-allowed)
- ✅ WCAG 2.1 AA accessibility (aria-label, aria-valuenow, aria-invalid, role="spinbutton")
- ✅ Zero database changes (pure UI refactor)
- ✅ Old components deleted (PartialMilestoneEditor, MobilePartialMilestoneEditor)

📁 **Documentation**: `specs/025-threaded-pipe-inline-input/`

---

### Feature 022: Mobile Weld Log Optimization (2025-11-02) - IN PROGRESS

Mobile-optimized 3-column weld log table for ≤1024px viewports.

**Key Capabilities**:
- ✅ 3-column table layout (Weld ID, Drawing, Date Welded)
- ✅ Row-click to open weld detail modal on mobile (desktop unchanged)
- ✅ WeldDetailModal with conditional action buttons (Update Weld, Record NDE)
- ✅ UpdateWeldDialog with welder assignment interception logic
- ✅ Touch targets ≥44px (WCAG 2.1 AA compliance)
- ✅ Keyboard navigation support (Tab, Enter, Escape)
- ✅ Integration tests for complete mobile workflow

**Pending**:
- ⚠️ Manual testing on mobile devices
- ⚠️ Accessibility audit

📁 **Documentation**: `specs/022-weld-log-mobile/`

---

### Feature 022 (Previous): Unified Component Details Form (2025-10-31) - PRODUCTION READY

Enhanced ComponentDetailView with 4-tab interface.

**Key Capabilities**:
- ✅ 4-tab interface (Overview, Details, Milestones, History)
- ✅ Metadata editing (Area, System, Test Package) in Details tab
- ✅ Interactive milestone editing (checkboxes for discrete, inline percentage inputs for partial)
- ✅ Milestone history timeline with user and timestamp
- ✅ Mobile-responsive with dropdown tab selector (<768px)
- ✅ Permission-based editing (can_update_milestones, can_edit_metadata)
- ✅ Accessible from both drawings page and components page
- ✅ Replaced ComponentAssignDialog with unified form
- ✅ WCAG 2.1 AA accessibility (keyboard navigation, ARIA labels)

---

### Feature 021: Public Marketing Homepage (2025-10-29) - PRODUCTION READY

Public homepage with demo signup flow.

**Key Capabilities**:
- ✅ Public homepage at `/` with hero section, value propositions, feature highlights
- ✅ Auto-redirect authenticated users to `/dashboard`
- ✅ Demo signup flow with email + name capture
- ✅ Isolated demo projects (200 components, 20 drawings, 10 packages) with 7-day access
- ✅ Rate limiting (10/hour per IP, 3/day per email) with `rate_limit_events` table
- ✅ Magic link authentication via Supabase Auth
- ✅ Automated demo cleanup via pg_cron (daily at 2 AM UTC)

**UX Features**:
- ✅ Mobile-responsive design (≥44px touch targets, no horizontal scroll)
- ✅ WCAG 2.1 AA accessibility (semantic HTML, ARIA labels, keyboard navigation)
- ✅ Scroll animations with reduced-motion support

**Technical Implementation**:
- ✅ 4 database migrations (00065-00068) for demo user fields and rate limiting
- ✅ 2 Supabase Edge Functions (`demo-signup`, `cleanup-demos`)

📁 **Documentation**: `specs/021-public-homepage/`

---

### Feature 019: Weekly Progress Reports (2025-10-28) - PRODUCTION READY

Generate progress reports with multiple export formats.

**Key Capabilities**:
- ✅ Progress reports grouped by Area, System, or Test Package
- ✅ Virtualized table display with 7 milestone columns (Budget, Received, Installed, Punch, Tested, Restored)
- ✅ Export to PDF, Excel, and CSV formats with proper formatting
- ✅ Performance optimized for 10,000+ component datasets (<3 second generation)
- ✅ Accessible from Reports navigation link in sidebar

**Mobile Features**:
- ✅ Mobile-responsive design (≤1024px breakpoint: 3-column table, dropdown dimension selector)
- ✅ Touch targets ≥44px (32px minimum exceeded for better UX)
- ✅ WCAG 2.1 AA accessibility (semantic HTML, ARIA labels, keyboard navigation)

**Technical Implementation**:
- ✅ Database views for aggregated progress (vw_progress_by_area, vw_progress_by_system, vw_progress_by_test_package)
- ✅ Earned value calculation function (calculate_earned_milestone_value)
- ✅ Full test coverage with E2E workflow tests

📁 **Documentation**: `specs/019-weekly-progress-reports/tasks.md`

---

### Feature 016: Team Management UI (2025-10-27) - PRODUCTION READY

Unified team member management with invitation flow.

**Key Capabilities**:
- ✅ View active members and pending invitations with expandable permissions breakdown
- ✅ Invite new members via email with role assignment and optional custom messages
- ✅ Search and filter team members by name, email, role, and status with URL persistence
- ✅ Manage member roles with optimistic UI updates and last-owner protection
- ✅ Remove team members with confirmation dialogs and RLS enforcement
- ✅ Resend and revoke pending invitations with real-time updates

**UX Features**:
- ✅ Mobile-responsive design (≤1024px breakpoint, 32px+ touch targets per Feature 015 patterns)
- ✅ WCAG 2.1 AA accessibility compliance (keyboard navigation, ARIA labels, screen reader support)

**Technical Implementation**:
- ✅ **Invitation flow fully operational** (13 migrations, email confirmation handling, SECURITY DEFINER functions)
- ✅ Layout component added (sidebar navigation now visible on Team page)
- ✅ 100+ tests with ≥70% coverage, RLS policy validation, performance targets met

📁 **Documentation**: `specs/016-team-management-ui/IMPLEMENTATION-NOTES.md` (includes 13 invitation flow migrations, email confirmation handling, SECURITY DEFINER functions)

---

### Feature 015: Mobile Milestone Updates & Field Weld Management (2025-10-26) - PRODUCTION READY

Mobile-optimized milestone UI and field weld tracking.

**Key Capabilities**:
- ✅ Mobile-optimized milestone UI with vertical layout for touch devices (≤1024px)
- ✅ Modal welder assignment for field welds
- ✅ Field weld tracking infrastructure (database, UI, hooks)
- ✅ Repair history and NDE result recording
- ✅ Touch-friendly filters and responsive design
- ✅ 100+ new tests with comprehensive coverage

📁 **Documentation**: `specs/015-mobile-milestone-updates/IMPLEMENTATION-NOTES.md`

---

### Feature 011: Drawing & Component Metadata Assignment UI (2025-10-21) - PRODUCTION READY

Metadata assignment and inheritance.

**Key Capabilities**:
- ✅ Single and bulk drawing assignment (up to 50 drawings)
- ✅ Component metadata override capability
- ✅ Automatic inheritance from drawings to components
- ✅ Inline metadata description editing

📁 **Documentation**: `specs/011-the-drawing-component/IMPLEMENTATION_STATUS.md`

---

### Feature 010: Drawing-Centered Component Progress Table (2025-10-19) - PRODUCTION READY

Unified drawing/component table with inline updates.

**Key Capabilities**:
- ✅ Unified drawing/component table with virtualization
- ✅ Inline milestone updates (discrete checkboxes + inline percentage inputs)
- ✅ URL-driven state management
- ✅ Real-time progress calculation

📁 **Documentation**: `specs/010-let-s-spec/IMPLEMENTATION_STATUS.md`

---

### Feature 009: CSV Material Takeoff Import (2025-10-19) - PRODUCTION READY

CSV import with size-aware identity keys.

**Key Capabilities**:
- ✅ CSV import with SIZE-aware identity keys
- ✅ Supabase Edge Function processing
- ✅ Transaction safety and error reporting

📁 **Documentation**: `specs/009-sprint-3-material/IMPLEMENTATION-NOTES.md`

---

### Sprint 1: Core Foundation (2025-10-16) - COMPLETE

Database and permission system expansion.

**Key Deliverables**:
- ✅ Database expanded to 14 tables
- ✅ Progress templates for 11 component types
- ✅ TanStack Query hooks for all entities
- ✅ RLS policies and permission system

---

### Sprint 0: Infrastructure Setup (2025-10-04) - COMPLETE

Development infrastructure and CI/CD.

**Key Deliverables**:
- ✅ Supabase CLI configured
- ✅ CI/CD pipeline operational
- ✅ GitHub Actions workflow (lint → type-check → test → build)
- ✅ Test suite with ≥70% coverage
- ✅ Constitution v1.0.0 ratified

---

## Bug Fixes

### Welder Assignment 400 Error (2025-11-08) - CRITICAL FIX

**Issue**: 400 Bad Request error when assigning welders in Component Detail modal.

**Root Cause**: Schema evolution inconsistency - `current_milestones` JSONB field stored boolean values (`true`/`false`) but `update_component_milestone` RPC expected numeric values (`1`/`0`).

**Solution**: Data migration converted all boolean milestone values to numeric (28 components affected).

**Error Message**: `invalid input syntax for type numeric: "true"` (PostgreSQL error code 22P02)

**Affected**: Field weld components and other component types with discrete milestones.

**Files**: `useAssignWelder.ts`, `WelderAssignDialog.tsx`, `ComponentDetailView.tsx`

📁 **Migration**: `supabase/migrations/00084_convert_boolean_milestones_to_numeric.sql`

**See**: `docs/BUG-FIXES.md` for complete bug fix history and resolved issues.

---

## Technology Stack

### Frontend
- React 18.3
- TypeScript 5.x (strict mode)
- Vite (build tool)
- Tailwind CSS v4
- TanStack Query v5 (server state)
- Zustand (client state)
- React Context (auth state)

### Backend
- Supabase (PostgreSQL, Auth, Realtime, Storage)
- Supabase Edge Functions (TypeScript/Deno)

### Testing
- Vitest (test runner)
- Testing Library (React)
- jsdom (DOM simulation)

### Data Export
- jsPDF, jsPDF-AutoTable (PDF export)
- xlsx (Excel export)
- @tanstack/react-virtual (virtualized rendering)

### Email
- Resend API (transactional emails, replacing Supabase default SMTP)

### Database
- Supabase PostgreSQL (remote only, no local instance)
- 14+ tables
- 100+ migrations (as of 2025-11-15)
- Row Level Security (RLS) enabled on all tables

---

## Recent Changes

### 2025-11-15
- Feature 027 complete: Aggregate threaded pipe import operational

### 2025-11-11
- Feature 026 complete: Editable milestone weight templates

### 2025-11-08
- Critical bug fix: Welder assignment 400 error resolved

### 2025-11-07
- Feature 025 complete: Threaded pipe inline milestone input

### 2025-11-02
- Feature 022 in progress: Mobile weld log optimization

### 2025-10-31
- Feature 022 complete: Unified component details form

### 2025-10-29
- Feature 021 complete: Public marketing homepage with demo signup
- Enhanced demo signup with custom-branded emails via Resend API

### 2025-10-28
- Feature 019 complete: Weekly progress reports with multi-format export

### 2025-10-27
- Feature 016 complete: Team management UI with invitation flow

### 2025-10-26
- Feature 015 complete: Mobile milestone updates & field weld management

---

## Feature Documentation Index

Detailed implementation notes, architecture decisions, and feature-specific documentation in `specs/` directory:

- **Feature 002**: User Registration & Team Onboarding - `specs/002-user-registration-and/IMPLEMENTATION-NOTES.md`
- **Feature 009**: CSV Material Takeoff Import - `specs/009-sprint-3-material/IMPLEMENTATION-NOTES.md`
- **Feature 010**: Drawing-Centered Component Progress Table - `specs/010-let-s-spec/IMPLEMENTATION_STATUS.md`
- **Feature 011**: Drawing & Component Metadata Assignment UI - `specs/011-the-drawing-component/IMPLEMENTATION_STATUS.md`
- **Feature 015**: Mobile Milestone Updates & Field Weld Management - `specs/015-mobile-milestone-updates/IMPLEMENTATION-NOTES.md`
- **Feature 016**: Team Management UI - `specs/016-team-management-ui/IMPLEMENTATION-NOTES.md` (13 invitation flow migrations, email confirmation, SECURITY DEFINER functions)
- **Feature 019**: Weekly Progress Reports - `specs/019-weekly-progress-reports/tasks.md` (virtualized reporting, PDF/Excel/CSV export, mobile-responsive, WCAG 2.1 AA)
- **Feature 021**: Public Marketing Homepage - `specs/021-public-homepage/`
- **Feature 022**: Mobile Weld Log Optimization - `specs/022-weld-log-mobile/`
- **Feature 025**: Threaded Pipe Inline Milestone Input - `specs/025-threaded-pipe-inline-input/`
- **Feature 026**: Editable Milestone Weight Templates - `specs/026-editable-milestone-templates/`
- **Feature 027**: Aggregate Threaded Pipe Import - `specs/027-aggregate-threaded-pipe-import/`
