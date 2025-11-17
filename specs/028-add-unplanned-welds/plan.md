# Implementation Plan: Add Unplanned Field Welds

**Branch**: `028-add-unplanned-welds` | **Date**: 2025-11-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/028-add-unplanned-welds/spec.md`

## Summary

Enable users to create individual unplanned field welds through the Weld Log page. Uses a SECURITY DEFINER RPC for atomic creation of both `component` and `field_weld` records with auto-generated weld numbers, drawing metadata inheritance, and permission enforcement. Includes smart drawing search, required weld specifications (type, size, spec), optional context notes, and mobile-optimized UI (≥44px touch targets).

**Technical Approach**: PostgreSQL RPC function + React TanStack Query hook + Shadcn dialog component following existing repair weld creation pattern.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), React 18, PostgreSQL 15+ (Supabase)
**Primary Dependencies**:
- Frontend: React 18, TanStack Query v5, Shadcn/ui, Radix UI, Tailwind CSS v4
- Backend: Supabase (PostgreSQL, Auth, RLS)
- Testing: Vitest, Testing Library, jsdom

**Storage**: Supabase PostgreSQL with RLS
- Tables: `field_welds`, `components`, `drawings`, `progress_templates`
- New column: `field_welds.notes TEXT` (creation context)
- New RPC: `create_unplanned_weld()` SECURITY DEFINER

**Testing**:
- Vitest for unit/integration/component tests
- Testing Library for React components
- RLS tests against remote Supabase instance
- Coverage: ≥70% overall, ≥80% hooks, ≥60% components

**Target Platform**: Web (desktop + mobile), React SPA with Vite
- Mobile breakpoint: ≤1024px
- Touch targets: ≥44px (WCAG 2.1 AA)

**Project Type**: Web application (single React SPA + Supabase backend)

**Performance Goals**:
- Weld creation completion: <60 seconds (user clicks "Add Weld" → sees weld in table)
- Drawing search response: <10 seconds to find correct drawing
- Form validation: Real-time (submit button disabled until valid)
- Table refresh: Optimistic updates via TanStack Query invalidation

**Constraints**:
- Atomic transactions required (both `component` and `field_weld` created or neither)
- Weld number uniqueness within project (not globally unique)
- RLS must remain multi-tenant-safe (filter by `project_id` + user access)
- No editable weld numbers in this feature (read-only in dialog)
- No NDE required field (QC determines post-creation)

**Scale/Scope**:
- Expected usage: 10-50 unplanned welds per project per month
- Drawing count: 100-1000 drawings per project (smart search required)
- Spec count: 10-50 valid specs per project (dropdown)
- Concurrent users: 2-5 users may create welds simultaneously (race condition handling needed)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Type Safety (Principle I):**
- [x] TypeScript strict mode enabled (`strict: true`)
- [x] No type assertions (`as` keyword) without justification
- [x] `noUncheckedIndexedAccess: true` enforced
- [x] Path aliases (`@/*`) used for cross-directory imports
- [x] Database types auto-generated from Supabase schema (regenerate after migration)

**Component-Driven Development (Principle II):**
- [x] UI components use shadcn/ui and Radix UI primitives (Dialog, Select, Input, Textarea)
- [x] Single responsibility composition verified (Dialog component, Hook, Permission utility separate)
- [x] TanStack Query for server state (RPC calls), no Zustand needed (no client state)

**Testing Discipline (Principle III):**
- [x] TDD workflow planned (Red-Green-Refactor)
  - Test RPC function → Implement migration
  - Test hook → Implement hook
  - Test dialog → Implement dialog
- [x] Integration tests cover spec acceptance scenarios (all 3 user stories)
- [x] Hotfix test debt tracking (N/A - not a hotfix)

**Supabase Integration (Principle IV):**
- [x] RLS enabled on all new tables (N/A - no new tables, only new column)
- [x] RLS patterns remain multi-tenant-safe (`project_id` filtering in RPC)
- [x] TanStack Query wraps all Supabase calls (hook calls RPC via `supabase.rpc()`)
- [x] AuthContext used for auth state (permission check uses `useAuth()` hook)

**Specify Workflow (Principle V):**
- [x] Feature documented in `specs/028-add-unplanned-welds/` directory
- [x] Constitution gates verified before planning
- [x] Tasks ordered with tests before implementation (will be enforced in tasks.md)

**Migration Rules (Principle VI):**
- [x] New sequential migration planned (`NNNN_create_unplanned_weld_rpc.sql`)
- [x] Migration idempotency verified (ALTER TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION)
- [x] RLS rules updated in same migration as table changes (N/A - only adding column, no new RLS)
- [x] Data migration reversibility documented (column addition is reversible via DROP COLUMN)
- [x] TypeScript types regeneration planned (`supabase gen types typescript --linked`)
- [x] Backward-compatibility notes documented (new column is nullable, no breaking changes)

**Performance Standards (Principle VII):**
- [x] Table rendering target <100ms for 10k rows (N/A - not modifying table rendering, using existing virtualization)
- [x] Database query index strategy documented (weld number query uses existing index on `components.identity_key`)
- [x] No `select *` in production code (RPC returns explicit columns, hook uses typed response)
- [x] TanStack Query pagination/virtualization planned (N/A - form inputs, not large lists)

**UI Standards (Principle VIII):**
- [x] Mobile layout planned (1024px breakpoint, responsive dialog)
- [x] Touch targets ≥44px (WCAG 2.1 AA) - all form inputs and buttons meet requirement
- [x] Keyboard accessibility planned (Tab, Enter to submit, Escape to cancel)
- [x] shadcn/ui and Radix patterns followed (Dialog, Select, Input components)
- [x] No inline styles (Tailwind CSS utility classes only)

**Test Coverage (Principle IX):**
- [x] Unit tests planned for business logic (permission utility, weld number generation)
- [x] Integration tests planned for data flow (RPC function tests with RLS)
- [x] At least one acceptance test per spec scenario:
  - User Story 1: Create weld with required fields
  - User Story 2: Create weld with notes
  - User Story 3: Smart drawing search
- [x] Coverage targets verified (≥70% overall, ≥80% hooks, ≥60% components)

## Project Structure

### Documentation (this feature)

```text
specs/028-add-unplanned-welds/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (SKIPPED - design doc exists)
├── data-model.md        # Phase 1 output (created below)
├── quickstart.md        # Phase 1 output (created below)
├── contracts/           # Phase 1 output (created below)
│   └── create-unplanned-weld-rpc.sql  # RPC signature and contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (completed)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# React SPA + Supabase backend structure
src/
├── components/
│   ├── ui/                                    # Shadcn/ui components
│   │   ├── dialog.tsx                        # (existing)
│   │   ├── input.tsx                         # (existing)
│   │   ├── select.tsx                        # (existing)
│   │   └── textarea.tsx                      # (existing)
│   └── field-welds/
│       ├── CreateUnplannedWeldDialog.tsx     # NEW: Main dialog component
│       ├── CreateUnplannedWeldDialog.test.tsx # NEW: Component tests
│       ├── CreateRepairWeldDialog.tsx        # (existing pattern reference)
│       └── UpdateWeldDialog.tsx              # (existing)
├── hooks/
│   ├── useCreateUnplannedWeld.ts             # NEW: TanStack Query mutation hook
│   ├── useCreateUnplannedWeld.test.ts        # NEW: Hook tests
│   ├── useCreateRepairWeld.ts                # (existing pattern reference)
│   ├── useFieldWelds.ts                      # (existing - invalidated on success)
│   └── useDrawings.ts                        # (existing - for drawing search)
├── lib/
│   ├── permissions.ts                        # UPDATE: Add canCreateFieldWeld()
│   └── supabase.ts                           # (existing - Supabase client)
├── pages/
│   └── WeldLogPage.tsx                       # UPDATE: Add "Add Weld" button
└── types/
    └── database.types.ts                     # UPDATE: Regenerate after migration

supabase/
└── migrations/
    └── NNNN_create_unplanned_weld_rpc.sql    # NEW: Schema + RPC migration

tests/
├── integration/
│   └── rls/
│       └── create-unplanned-weld.test.ts     # NEW: RPC + RLS permission tests
└── acceptance/
    └── create-unplanned-weld.test.ts         # NEW: End-to-end acceptance tests
```

**Structure Decision**: Web application structure with React frontend and Supabase backend. All new code follows existing patterns:
- Dialog component pattern from `CreateRepairWeldDialog.tsx`
- Hook pattern from `useCreateRepairWeld.ts`
- RPC pattern from existing SECURITY DEFINER functions
- Permission pattern from `src/lib/permissions.ts`

## Complexity Tracking

No constitutional violations. All requirements align with established patterns:
- SECURITY DEFINER RPC matches repair weld creation pattern
- Dialog component follows shadcn/ui patterns
- TanStack Query hook follows existing hook patterns
- Permission model matches existing field weld permissions

