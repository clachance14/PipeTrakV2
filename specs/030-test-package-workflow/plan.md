# Implementation Plan: Test Package Lifecycle Workflow

**Branch**: `030-test-package-workflow` | **Date**: 2025-11-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/030-test-package-workflow/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Transform test packages from basic containers (name, description, target date) into full lifecycle-tracked entities with:
- **Minimal creation**: Name + test type selection + drawing/component assignment (two modes: drawing-based inheritance OR component-based direct assignment)
- **Certificate form**: Formal Pipe Testing Acceptance Certificate with test parameters (pressure, media, temperature), client details, and auto-generated certificate numbers
- **Sequential workflow**: 7 acceptance stages (Pre-Hydro, Test Acceptance, Drain/Flush, Post-Hydro, Coatings, Insulation, Final Acceptance) with sign-offs and audit trails
- **Flexible assignment**: Drawing-level inheritance (80% use case) OR component-level override (20% edge cases), enforcing component uniqueness (one package per component)

This feature targets Project Managers and QC Inspectors for desktop-only workflows, supporting up to 500 packages per project with 50 concurrent users.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), React 18
**Primary Dependencies**: TanStack Query v5 (server state), Zustand (client state), shadcn/ui + Radix UI (components), React Hook Form + Zod (forms/validation), Supabase SDK v2 (database)
**Storage**: PostgreSQL 15+ (Supabase) with Row Level Security
**Testing**: Vitest + Testing Library (unit/integration), jsdom (browser env)
**Target Platform**: Desktop browsers only (Chrome, Firefox, Safari, Edge) - no mobile/tablet support
**Project Type**: Web application (React SPA + Supabase backend)
**Performance Goals**: <2s response time for page loads/form submissions, support 50 concurrent users, handle 500 packages per project
**Constraints**: Desktop-only (no responsive mobile layouts required), RLS multi-tenant-safe (filter by organization_id), TDD mandatory (tests before implementation), strict TypeScript (no `any` types)
**Scale/Scope**: Medium scale - up to 500 packages/project, 50 concurrent users, 10k+ components per project

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Type Safety (Principle I):**
- [x] TypeScript strict mode enabled (`strict: true`) - Existing project config
- [x] No type assertions (`as` keyword) without justification - Enforced via code review
- [x] `noUncheckedIndexedAccess: true` enforced - Existing project config
- [x] Path aliases (`@/*`) used for cross-directory imports - All imports use `@/`
- [x] Database types auto-generated from Supabase schema - `supabase gen types` after migrations

**Component-Driven Development (Principle II):**
- [x] UI components use shadcn/ui and Radix UI primitives - Dialog, Form, Select, Button, Stepper
- [x] Single responsibility composition verified - Package creation, certificate form, workflow stages as separate components
- [x] TanStack Query for server state, Zustand for client state - Package data via TanStack Query, no client state persistence needed

**Testing Discipline (Principle III):**
- [x] TDD workflow planned (Red-Green-Refactor) - Tests written first for all scenarios
- [x] Integration tests cover spec acceptance scenarios - All 4 user stories + edge cases mapped to tests
- [ ] Hotfix test debt tracking (if applicable) - N/A (not a hotfix)

**Supabase Integration (Principle IV):**
- [x] RLS enabled on all new tables - `package_certificates`, `package_workflow_stages`, `package_drawing_assignments`, `package_component_assignments`
- [x] RLS patterns remain multi-tenant-safe (`organization_id`/`user_id` filtering) - All policies filter via `project_id IN (SELECT id FROM projects WHERE organization_id = ...)`
- [x] TanStack Query wraps all Supabase calls - Custom hooks: `usePackages`, `usePackageCertificate`, `usePackageWorkflow`, `usePackageAssignments`
- [x] AuthContext used for auth state (no direct component access) - Existing pattern followed

**Specify Workflow (Principle V):**
- [x] Feature documented in `specs/###-feature-name/` directory - `specs/030-test-package-workflow/`
- [x] Constitution gates verified before planning - This checklist
- [x] Tasks ordered with tests before implementation - `/tasks` command will enforce TDD ordering

**Migration Rules (Principle VI):**
- [x] New sequential migration planned (if schema changes) - 4 new tables: `package_certificates`, `package_workflow_stages`, `package_drawing_assignments`, `package_component_assignments`
- [x] Migration idempotency verified or marked irreversible - All `CREATE TABLE IF NOT EXISTS` with reversible DDL
- [x] RLS rules updated in same migration as table changes - Each table creation includes RLS policies in same migration
- [x] Data migration reversibility documented (if applicable) - No data migration (new tables only)
- [x] TypeScript types regeneration planned - `supabase gen types typescript --linked > src/types/database.types.ts`
- [x] Backward-compatibility notes documented - No breaking changes (new tables + new columns on existing `test_packages` table)

**Performance Standards (Principle VII):**
- [x] Table rendering target <100ms for 10k rows (virtualization strategy) - Package list uses pagination (max 500 packages per project), no virtualization needed
- [x] Database query index strategy documented - Indexes on `project_id`, `package_id`, `created_at`, unique constraints on certificate numbers
- [x] No `select *` in production code - All queries use explicit column lists via TanStack Query hooks
- [x] TanStack Query pagination/virtualization planned - Pagination for package list (50 per page)

**UI Standards (Principle VIII):**
- [x] Mobile layout planned (1024px breakpoint) - Desktop-only (spec FR-034: no mobile/tablet support)
- [x] Touch targets ≥44px (WCAG 2.1 AA) - N/A (desktop-only)
- [x] Keyboard accessibility planned (Tab, Enter, Escape) - All forms support keyboard navigation via React Hook Form
- [x] shadcn/ui and Radix patterns followed - Dialog, Form, Select, Stepper from shadcn/ui
- [x] No inline styles (Tailwind CSS only) - All styles via Tailwind utility classes

**Test Coverage (Principle IX):**
- [x] Unit tests planned for business logic - Certificate validation, workflow stage transitions, component uniqueness checks
- [x] Integration tests planned for data flow - Package creation + assignment, certificate form submission, workflow stage completion
- [x] At least one acceptance test per spec scenario - 4 user stories × 3-7 scenarios each = 20+ acceptance tests
- [x] Coverage targets verified (≥70% overall, ≥80% lib, ≥60% components) - Enforced via CI

## Project Structure

### Documentation (this feature)

```text
specs/030-test-package-workflow/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (research decisions)
├── data-model.md        # Phase 1 output (database schema)
├── quickstart.md        # Phase 1 output (developer guide)
├── contracts/           # Phase 1 output (TypeScript interfaces)
│   ├── package.types.ts
│   ├── certificate.types.ts
│   ├── workflow.types.ts
│   └── assignment.types.ts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Structure Decision**: Web application (React SPA frontend + Supabase PostgreSQL backend). All code organized under `src/` with database migrations in `supabase/migrations/`.

```text
src/
├── components/
│   ├── packages/
│   │   ├── PackageCard.tsx                    # Existing - display package summary
│   │   ├── PackageEditDialog.tsx              # Existing - edit basic package metadata
│   │   ├── PackageFilters.tsx                 # Existing - filter package list
│   │   ├── PackageCreateDialog.tsx            # NEW - create package with assignment modes
│   │   ├── PackageCertificateForm.tsx         # NEW - certificate form with test parameters
│   │   ├── PackageWorkflowStepper.tsx         # NEW - 7-stage vertical stepper
│   │   ├── PackageWorkflowStageForm.tsx       # NEW - stage-specific data entry + sign-offs
│   │   ├── DrawingSelectionList.tsx           # NEW - multi-select drawing list with preview
│   │   └── ComponentSelectionList.tsx         # NEW - multi-select component list with filters
│   └── ui/
│       ├── stepper.tsx                        # NEW - shadcn stepper component (vertical orientation)
│       └── [existing shadcn components]
├── hooks/
│   ├── usePackages.ts                         # Existing - fetch package readiness view
│   ├── usePackageCertificate.ts               # NEW - CRUD for package certificates
│   ├── usePackageWorkflow.ts                  # NEW - CRUD for workflow stages
│   ├── usePackageAssignments.ts               # NEW - manage drawing/component assignments
│   └── usePackageCertificateNumber.ts         # NEW - generate sequential certificate numbers
├── lib/
│   ├── packageValidation.ts                   # NEW - certificate validation, component uniqueness
│   └── workflowStageConfig.ts                 # NEW - stage definitions (names, required fields, sign-off types)
├── pages/
│   ├── PackagesPage.tsx                       # Existing - update with new create dialog
│   └── PackageDetailPage.tsx                  # NEW - package detail with tabs (Certificate, Workflow, Components)
└── types/
    ├── database.types.ts                      # Auto-generated from Supabase schema
    ├── package.types.ts                       # NEW - package domain types
    ├── certificate.types.ts                   # NEW - certificate domain types
    ├── workflow.types.ts                      # NEW - workflow domain types
    └── assignment.types.ts                    # NEW - assignment domain types

supabase/
└── migrations/
    ├── [existing migrations]
    ├── 00121_add_test_type_to_packages.sql    # NEW - add test_type column to test_packages
    ├── 00122_create_package_certificates.sql   # NEW - certificate table
    ├── 00123_create_package_workflow_stages.sql # NEW - workflow stages table
    ├── 00124_create_package_assignments.sql    # NEW - drawing + component assignments tables
    └── 00125_add_component_uniqueness.sql      # NEW - unique constraint on components.test_package_id

tests/
├── integration/
│   ├── packages/
│   │   ├── packageCreation.test.ts            # NEW - test package creation with assignments
│   │   ├── packageCertificate.test.ts         # NEW - test certificate form submission
│   │   ├── packageWorkflow.test.ts            # NEW - test workflow stage transitions
│   │   └── packageAssignments.test.ts         # NEW - test component uniqueness enforcement
└── unit/
    ├── lib/
    │   ├── packageValidation.test.ts          # NEW - test validation logic
    │   └── workflowStageConfig.test.ts        # NEW - test stage configuration
```

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations** - All constitution gates passed. This feature follows existing patterns and introduces no new architectural complexity.
