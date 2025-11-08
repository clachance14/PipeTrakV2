# Implementation Plan: User Profile Management

**Branch**: `017-user-profile-management` | **Date**: 2025-10-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-user-profile-management/spec.md`

## Summary

Implement user profile viewing and editing via modal dialog accessible from avatar dropdown in top navigation. Users can view read-only information (email, organization, role) and edit their full name, upload profile photos to Supabase Storage, and change passwords through Supabase Auth. Modal-based UI keeps users in their workflow without navigation. Implementation follows TDD with ≥70% test coverage, mobile-responsive design (≤1024px breakpoint, 32px+ touch targets per Feature 015 patterns), and WCAG 2.1 AA accessibility.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) with React 18.3
**Primary Dependencies**:
- React 18.3.1 + React DOM 18.3.1
- Supabase JS 2.58.0 (Auth + Storage + Database)
- TanStack Query 5.90.2 (server state management)
- Radix UI primitives (Dialog, DropdownMenu)
- Shadcn/ui component patterns
- Vite (build tool)
- Vitest (testing framework with jsdom)

**Storage**:
- PostgreSQL via Supabase (users table + avatar_url column)
- Supabase Storage (avatars bucket for profile photos)
- RLS policies enforce user-owned data access

**Testing**: Vitest + Testing Library (React)
- Coverage thresholds: ≥70% (lines, functions, branches, statements)
- ≥60% for components (src/components/**)
- ≥80% for utilities (src/lib/**)
- Provider: v8 (native V8 engine coverage)

**Target Platform**: Web (desktop + mobile browsers, responsive ≤375px)

**Project Type**: Single-page application (SPA) with React Router v7

**Performance Goals**:
- Profile modal opens in <200ms
- Profile data loads in <500ms (cached after first fetch)
- Avatar upload completes in <5 seconds for 2MB files
- Optimistic UI updates appear immediately (<50ms)

**Constraints**:
- Modal must work without JavaScript frameworks beyond React (no Next.js SSR)
- Avatar storage limited to 2MB per file
- Must maintain user session through password changes (no forced re-login)
- Mobile virtual keyboard must not obscure form fields
- All functionality accessible via keyboard (no mouse-only interactions)

**Scale/Scope**:
- 5 new components (UserMenu, UserProfileModal, ProfileHeader, ProfileInfoSection, PasswordChangeForm)
- 2 modified components (Layout, AuthContext)
- 3 new TanStack Query hooks (useUserProfile, useUpdateProfile, useUpdateAvatar)
- 1 database migration (add avatar_url column)
- 1 storage bucket configuration (avatars with RLS)
- ~15 test files (components + hooks + integration)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Type Safety First
- **Status**: PASS
- **Evidence**: TypeScript strict mode already enabled in tsconfig.app.json (lines 8-12)
- **Action**: Maintain strict mode, avoid `as` keyword, use generated Supabase types

### ✅ II. Component-Driven Development
- **Status**: PASS
- **Evidence**: Feature uses shadcn/ui patterns with Radix UI primitives (Dialog, DropdownMenu)
- **Action**: Implement 5 new components following single responsibility principle

### ✅ III. Testing Discipline
- **Status**: PASS
- **Evidence**: TDD workflow mandatory per spec, ≥70% coverage enforced in vitest.config.ts
- **Action**: Write tests before implementation for all components and hooks (Red-Green-Refactor)

### ✅ IV. Supabase Integration Patterns
- **Status**: PASS - with RLS setup required
- **Evidence**: Feature requires:
  - RLS policies for users table (user can only update own profile)
  - RLS policies for avatars storage bucket (user can only write to own path)
  - TanStack Query for all Supabase operations
  - AuthContext integration for password changes
- **Action**:
  - Create RLS policy for users.avatar_url updates (user_id = auth.uid())
  - Create storage RLS policies for avatars/{user_id}/* (owner-only write, public read)
  - Wrap all Supabase calls in TanStack Query hooks

### ✅ V. Specify Workflow Compliance
- **Status**: PASS
- **Evidence**: Using full workflow (`/specify` → `/plan` → `/tasks` → `/implement`)
- **Action**: Generate data-model.md, contracts/, quickstart.md before proceeding to tasks

### Re-check Post-Design
Will re-verify after Phase 1 that:
- [ ] Data model includes RLS policy specifications
- [ ] Contracts define type-safe interfaces (no `any` types)
- [ ] Quickstart includes TDD example for first component

## Project Structure

### Documentation (this feature)

```text
specs/017-user-profile-management/
├── spec.md                      # Feature specification (completed)
├── plan.md                      # This file (/speckit.plan output)
├── checklists/
│   └── requirements.md          # Spec quality validation (completed)
├── research.md                  # Phase 0 output (will be created below)
├── data-model.md                # Phase 1 output (will be created below)
├── quickstart.md                # Phase 1 output (will be created below)
├── contracts/                   # Phase 1 output (will be created below)
│   ├── user-profile.types.ts    # TypeScript interfaces for profile data
│   ├── avatar-storage.types.ts  # TypeScript interfaces for storage operations
│   └── password-change.types.ts # TypeScript interfaces for password operations
└── tasks.md                     # Phase 2 output (/speckit.tasks - not yet created)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── ui/                      # Shadcn/ui components
│   │   ├── dialog.tsx           # Radix Dialog wrapper (add if not exists)
│   │   └── dropdown-menu.tsx    # Radix DropdownMenu wrapper (add if not exists)
│   ├── profile/                 # NEW: Profile feature components
│   │   ├── UserMenu.tsx         # Avatar dropdown with "View Profile" + "Sign Out"
│   │   ├── UserProfileModal.tsx # Modal container coordinating profile sections
│   │   ├── ProfileHeader.tsx    # Avatar upload/display + full name editing
│   │   ├── ProfileInfoSection.tsx # Read-only display (email, org, role)
│   │   └── PasswordChangeForm.tsx # Password update with validation
│   └── Layout.tsx               # MODIFIED: Replace avatar with UserMenu
├── contexts/
│   └── AuthContext.tsx          # MODIFIED: Add refreshUser() function
├── hooks/
│   ├── useUserProfile.ts        # NEW: Fetch user + organization data
│   ├── useUpdateProfile.ts      # NEW: Update full_name with optimistic updates
│   └── useUpdateAvatar.ts       # NEW: Upload avatar + update avatar_url
├── lib/
│   ├── supabase.ts              # Existing Supabase client
│   └── avatar-utils.ts          # NEW: Avatar validation and upload helpers
└── types/
    └── index.ts                 # MODIFIED: Add User type with avatar_url field

supabase/
├── migrations/
│   └── 00050_add_avatar_url.sql # NEW: Add avatar_url column to users table
└── storage/
    └── buckets/
        └── avatars/             # NEW: Storage bucket configuration (via Supabase dashboard or migration)

tests/
├── unit/
│   ├── components/
│   │   └── profile/             # NEW: Unit tests for profile components
│   │       ├── UserMenu.test.tsx
│   │       ├── UserProfileModal.test.tsx
│   │       ├── ProfileHeader.test.tsx
│   │       ├── ProfileInfoSection.test.tsx
│   │       └── PasswordChangeForm.test.tsx
│   └── hooks/
│       ├── useUserProfile.test.ts
│       ├── useUpdateProfile.test.ts
│       └── useUpdateAvatar.test.ts
└── integration/
    └── profile-workflow.test.tsx # NEW: End-to-end profile editing flow
```

**Structure Decision**: Single project structure (Option 1 from template). PipeTrak V2 is a React SPA with colocated components. Profile components grouped under `src/components/profile/` for feature cohesion. Tests mirror source structure with unit tests in `tests/unit/` and integration tests in `tests/integration/`. Supabase migrations in `supabase/migrations/` following existing migration numbering (00050+).

## Complexity Tracking

> **No violations** - feature complies with all Constitution principles.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | N/A        | N/A                                 |

---

## Phase 0: Research & Decisions

### Research Tasks

1. **Supabase Storage Best Practices**
   - **Question**: How to securely configure avatar uploads with RLS policies?
   - **Findings**: See research.md below

2. **Supabase Auth Password Changes**
   - **Question**: How to update passwords without forcing re-login?
   - **Findings**: See research.md below

3. **Optimistic UI Updates with TanStack Query**
   - **Question**: How to implement rollback on failure for profile updates?
   - **Findings**: See research.md below

4. **Avatar Image Optimization**
   - **Question**: Should client resize images before upload or use server-side processing?
   - **Findings**: See research.md below

5. **Modal Focus Management**
   - **Question**: How to trap focus in modal and return to avatar button on close?
   - **Findings**: See research.md below

### Research Document

*Creating research.md in separate file operation below*

---

## Phase 1: Design & Contracts

### Data Model

*Creating data-model.md in separate file operation below*

### API Contracts

*Creating contracts/ directory and TypeScript interface files below*

### Quickstart Guide

*Creating quickstart.md in separate file operation below*

---

## Constitution Re-check (Post-Design)

**Re-verification after Phase 1 design:**

### ✅ I. Type Safety First
- **Evidence**: All contracts use strict TypeScript interfaces (contracts/*.types.ts)
- **Evidence**: No `any` types, all Supabase responses typed with generated types
- **Status**: PASS

### ✅ II. Component-Driven Development
- **Evidence**: 5 single-responsibility components documented in data-model.md
- **Evidence**: Component hierarchy follows shadcn/ui patterns (Dialog, DropdownMenu wrappers)
- **Status**: PASS

### ✅ III. Testing Discipline
- **Evidence**: quickstart.md includes TDD example (failing test → implementation)
- **Evidence**: Test files planned for all components and hooks (15+ test files)
- **Status**: PASS

### ✅ IV. Supabase Integration Patterns
- **Evidence**: RLS policies specified in data-model.md for users table and avatars bucket
- **Evidence**: All Supabase operations wrapped in TanStack Query hooks (contracts/*.types.ts)
- **Status**: PASS

### ✅ V. Specify Workflow Compliance
- **Evidence**: Following plan → tasks → implement workflow
- **Evidence**: All required artifacts generated (research, data-model, contracts, quickstart)
- **Status**: PASS

**Overall Status**: ✅ READY FOR PHASE 2 (/speckit.tasks)

---

## Next Steps

1. Review this plan for accuracy and completeness
2. Run `/speckit.tasks` to generate ordered task breakdown with TDD sequence
3. Run `/speckit.implement` to execute tasks with per-task commits

---

**Constitution Version**: 1.0.2 | **Plan Generated**: 2025-10-27
