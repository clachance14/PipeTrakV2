# Implementation Plan: Flexible CSV Import

**Branch**: `024-flexible-csv-import` | **Date**: 2025-11-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-flexible-csv-import/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enhance the component import system to support flexible CSV formats with smart column detection, metadata auto-creation, and preview capability. System will auto-detect column name variations (DRAWING/DRAWINGS), parse CSV client-side, display preview with validation results and metadata analysis, then send structured JSON to server for transactional import. Primary goals: eliminate manual CSV preprocessing, auto-create Area/System/Test Package records, and provide user confidence through preview before commit.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.3
**Primary Dependencies**: Papa Parse (CSV parsing), TanStack Query v5 (server state), Supabase JS Client, existing CSV utilities (normalize-drawing, normalize-size, generate-identity-key)
**Storage**: Supabase PostgreSQL (remote only via `npx supabase db push --linked`)
**Testing**: Vitest + Testing Library, integration tests with Supabase mocking
**Target Platform**: Web browsers (modern, JavaScript enabled)
**Project Type**: Web application (React SPA + Supabase Edge Functions)
**Performance Goals**: Preview display < 3 seconds for 1,000 rows, import completion < 60 seconds for 1,000 rows, client-side parsing < 5 seconds for 10,000 rows
**Constraints**: 5MB file size limit, 10,000 row limit, 6MB Edge Function payload limit, all-or-nothing transaction semantics
**Scale/Scope**: Single project, 7 new source files (3 utilities, 3 UI components, 1 Edge Function modification), enhance existing import-takeoff Edge Function, ~800-1000 LOC estimated

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Type Safety First ✅

- [x] TypeScript strict mode enabled (existing project configuration)
- [x] No type assertions without justification (will use proper typing for Papa Parse results)
- [x] `noUncheckedIndexedAccess: true` enforced (defensive array access for CSV rows)
- [x] Path aliases (`@/*`) used for all imports
- [x] Database types auto-generated from Supabase schema (existing `src/types/database.types.ts`)

**Compliance**: PASS - All type safety requirements met. New utilities will use strict typing with Papa Parse types.

### Principle II: Component-Driven Development ✅

- [x] UI components follow shadcn/ui patterns (ImportPreview, ColumnMappingDisplay, ValidationResults)
- [x] Single responsibility composition (separate components for mapping, validation, preview)
- [x] TanStack Query for server state (metadata existence check, import execution)
- [x] Colocated with pages (`src/components/` for shared, modify `src/pages/ImportsPage.tsx`)

**Compliance**: PASS - Component structure follows existing patterns. ImportPreview orchestrates child components.

### Principle III: Testing Discipline ✅

- [x] TDD via Specify workflow (`/specify` → `/plan` → `/tasks` → `/implement`)
- [x] Tests before implementation (Red-Green-Refactor enforced in tasks.md)
- [x] Colocated test files (`src/lib/csv/*.test.ts`, `src/components/*.test.tsx`)
- [x] Integration tests cover spec acceptance scenarios (5 user stories → 5 integration test files)
- [x] Testing Library for component tests (existing pattern)
- [x] Coverage targets: ≥80% for utilities (src/lib/csv/), ≥60% for UI components, ≥70% overall

**Compliance**: PASS - TDD workflow enforced. All acceptance scenarios testable.

### Principle IV: Supabase Integration Patterns ✅

- [x] RLS enabled on all tables (existing: components, drawings, areas, systems, test_packages)
- [x] Multi-tenant isolation via organization_id in RLS (existing project already single-org, policies enforce project_id)
- [x] TanStack Query wrapping Supabase calls (metadata existence check via query)
- [x] AuthContext for auth state (existing, no changes needed)
- [x] Remote migrations only (`npx supabase db push --linked` - no schema changes needed for this feature)
- [x] Edge Function modifications follow existing patterns (supabase/functions/import-takeoff/)

**Compliance**: PASS - No new tables, no schema changes. Enhances existing import-takeoff Edge Function. Metadata upsert uses existing tables with RLS.

### Principle V: Specify Workflow Compliance ✅

- [x] Feature spec created (`/specify` → specs/024-flexible-csv-import/spec.md)
- [x] Implementation plan with constitution verification (`/plan` → this file)
- [x] Tasks breakdown next (`/tasks` → will create ordered TDD task list)
- [x] Execution phase (`/implement` → per-task commits)
- [x] Documentation in specs/024-flexible-csv-import/ directory

**Compliance**: PASS - Using complete Specify workflow. Feature qualifies as "typical complexity" (core + quality gates recommended).

**Re-check after Phase 1**: Will verify data-model.md alignment with existing schema, contracts align with Edge Function patterns.

## Project Structure

### Documentation (this feature)

```text
specs/024-flexible-csv-import/
├── spec.md              # Feature specification (COMPLETE)
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output (technical decisions)
├── data-model.md        # Phase 1 output (entities, validation rules)
├── quickstart.md        # Phase 1 output (developer setup guide)
├── contracts/           # Phase 1 output (TypeScript interfaces, validation schemas)
│   ├── column-mapping.ts       # Column mapping types and confidence levels
│   ├── validation.ts           # Validation result types and categorization
│   ├── metadata-discovery.ts   # Metadata analysis types
│   ├── preview-state.ts        # Preview UI state interface
│   └── import-payload.ts       # Edge Function request/response types
├── checklists/
│   └── requirements.md  # Spec quality validation (COMPLETE)
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT yet created)
```

### Source Code (repository root)

```text
# Web application structure (React SPA + Supabase Edge Functions)

src/
├── lib/
│   └── csv/                          # NEW - CSV processing utilities
│       ├── column-mapper.ts          # Smart column mapping engine (3-tier matching)
│       ├── column-mapper.test.ts     # Unit tests for column mapping
│       ├── csv-validator.ts          # Client-side validation (required fields, types)
│       ├── csv-validator.test.ts     # Unit tests for validation
│       ├── metadata-analyzer.ts      # Metadata discovery and categorization
│       ├── metadata-analyzer.test.ts # Unit tests for metadata analysis
│       ├── normalize-drawing.ts      # EXISTING - reuse for drawing normalization
│       ├── normalize-size.ts         # EXISTING - reuse for size normalization
│       └── generate-identity-key.ts  # EXISTING - reuse for identity keys
│
├── components/
│   ├── ImportPreview.tsx             # NEW - Main preview component (orchestrator)
│   ├── ImportPreview.test.tsx        # Component tests
│   ├── ColumnMappingDisplay.tsx      # NEW - Column mapping UI with confidence %
│   ├── ColumnMappingDisplay.test.tsx # Component tests
│   ├── ValidationResults.tsx         # NEW - Validation warnings/errors display
│   ├── ValidationResults.test.tsx    # Component tests
│   └── ImportPage.tsx                # EXISTING - may need modifications
│
├── pages/
│   └── ImportsPage.tsx               # MODIFY - integrate preview flow
│
└── types/
    ├── database.types.ts             # EXISTING - auto-generated from Supabase
    └── csv-import.types.ts           # NEW - shared types for CSV import (from contracts/)

supabase/
└── functions/
    └── import-takeoff/               # EXISTING Edge Function - enhance
        ├── index.ts                  # MODIFY - accept JSON payload, add metadata logic
        ├── parser.ts                 # EXISTING - may deprecate (client-side parsing now)
        ├── validator.ts              # EXISTING - may deprecate or adapt for server-side final check
        └── transaction.ts            # MODIFY - add metadata upsert, maintain batch processing

tests/
├── integration/
│   ├── flexible-import-preview.test.ts     # NEW - client-side parsing → preview flow
│   ├── flexible-import-metadata.test.ts    # NEW - metadata auto-creation and linking
│   ├── flexible-import-transaction.test.ts # NEW - Edge Function transaction processing
│   └── flexible-import-validation.test.ts  # NEW - end-to-end validation (client + server)
│
└── contract/
    └── csv-import-contracts.test.ts  # NEW - validate TypeScript contracts match runtime

package.json                          # MODIFY - add papaparse dependency
```

**Structure Decision**: Web application structure selected. Feature enhances existing React SPA (`src/`) and Supabase Edge Function (`supabase/functions/import-takeoff/`). New client-side utilities in `src/lib/csv/`, new preview components in `src/components/`, integration with existing `ImportsPage.tsx`. No schema changes required - leverages existing tables (components, drawings, areas, systems, test_packages).

## Complexity Tracking

> **No violations to justify** - All constitution checks passed without requiring exceptions.

This feature aligns with all 5 constitution principles:
- Type safety maintained through strict TypeScript and Papa Parse types
- Component-driven development with single-responsibility UI components
- TDD enforced via Specify workflow and ordered tasks
- Supabase patterns followed (TanStack Query, existing RLS policies, Edge Function enhancements)
- Complete Specify workflow usage (typical complexity level)

---

## Phase 0: Research - COMPLETE ✅

**Output**: `research.md`

All technical decisions documented:
1. CSV Parsing: Papa Parse (RFC 4180, streaming support)
2. Column Mapping: Three-tier fuzzy algorithm (exact/case-insensitive/synonym)
3. Metadata Check: Batch Supabase query with RLS
4. Identity Keys: Client + Server dual generation (preview + validation)
5. Validation: Three-category system (valid/skipped/error)
6. Preview Performance: Lazy rendering + sample truncation (<3s target)
7. Metadata Transaction: Upsert-first strategy for atomicity
8. Payload Size: Structured JSON + client checks (<6MB limit)

**Dependencies Added**: `papaparse` (^5.4.1), `@types/papaparse` (^5.3.14)

---

## Phase 1: Design & Contracts - COMPLETE ✅

**Outputs**:
- `data-model.md` - 6 client-side entities with validation rules
- `contracts/` - 5 TypeScript interface files
- `quickstart.md` - Developer setup guide
- Updated `CLAUDE.md` - Agent context synchronized

**Entities Defined**:
1. ColumnMapping - CSV column detection with confidence scoring
2. ValidationResult - Three-category row validation (valid/skipped/error)
3. MetadataDiscovery - Metadata existence check and creation planning
4. ImportPreviewState - Consolidated preview UI state
5. ImportPayload - Edge Function request payload
6. ImportResult - Edge Function response

**Contracts Created**:
- `column-mapping.ts` - Mapping types, synonyms, required fields
- `validation.ts` - Validation types, component types, rules
- `metadata-discovery.ts` - Metadata analysis types
- `preview-state.ts` - Preview UI state interface
- `import-payload.ts` - API request/response types

**Constitution Re-Check**: ✅ PASSED
- All 5 principles compliant after design phase
- No new tables (leverages existing schema)
- TypeScript strict mode enforced
- TDD workflow ready
- RLS patterns maintained

---

**Constitution Version**: 1.0.2 | **Plan Status**: Phase 1 Complete - Ready for `/tasks`

**Next Step**: Run `/speckit.tasks` to generate ordered task breakdown with TDD sequence
