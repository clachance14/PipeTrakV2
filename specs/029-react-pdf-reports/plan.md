# Implementation Plan: Advanced Report Generation with Component-Based PDF Library

**Branch**: `029-react-pdf-reports` | **Date**: 2025-01-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/029-react-pdf-reports/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a component-based PDF generation system using @react-pdf/renderer to create professional, branded field weld progress reports. The system will provide reusable PDF components (headers, footers, tables) and a lazy-loading architecture to minimize bundle impact. This proof-of-concept implementation will migrate the existing field weld report from jsPDF to the new component-based approach while maintaining the classic export as a fallback. **Desktop-only feature** (screen width ≥1024px).

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), React 18
**Primary Dependencies**:
- @react-pdf/renderer v4.3.1 (component-based PDF generation)
- Existing: TanStack Query v5, Zustand, shadcn/ui, Radix UI
- Current PDF: jsPDF v3.0.3 + jspdf-autotable v5.0.2 (maintained as fallback)

**Storage**: Supabase PostgreSQL (remote only, existing field_welds data via RPC `get_field_weld_progress`)
**Testing**: Vitest with Testing Library, jsdom environment
**Target Platform**: Desktop web browsers (≥1024px), landscape PDFs optimized for Chrome/Firefox/Safari PDF viewers
**Project Type**: Single React SPA (Vite + TypeScript)
**Performance Goals**:
- PDF generation <5 seconds for 100-row reports
- Lazy loading ensures zero initial bundle impact
- Generated PDFs <500KB for 10-50 row reports

**Constraints**:
- Desktop-only UI (no mobile/tablet export buttons)
- Landscape A4 orientation (8-10 columns depending on dimension)
- Company logo optional (base64 encoded, <50KB recommended)
- Existing jsPDF export must remain functional during transition

**Scale/Scope**:
- 4 report dimensions (area, system, test_package, welder)
- Typical reports: 10-50 rows, max 100+ rows with pagination
- Reusable component library for future reports (progress reports, milestone reports)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Type Safety (Principle I):**
- [x] TypeScript strict mode enabled (`strict: true`) - Project already configured
- [x] No type assertions (`as` keyword) without justification - Will avoid in new PDF components
- [x] `noUncheckedIndexedAccess: true` enforced - Project already configured
- [x] Path aliases (`@/*`) used for cross-directory imports - Will use for PDF components
- [x] Database types auto-generated from Supabase schema - No new tables, uses existing `field_welds` data

**Component-Driven Development (Principle II):**
- [x] UI components use shadcn/ui and Radix UI primitives - Export button follows existing patterns (Button, toast)
- [x] Single responsibility composition verified - PDF components separated by concern (header, footer, table, page layout)
- [x] TanStack Query for server state, Zustand for client state - Uses existing `useFieldWeldProgressReport` hook (TanStack Query)

**Testing Discipline (Principle III):**
- [x] TDD workflow planned (Red-Green-Refactor) - Tests before implementation for each component
- [x] Integration tests cover spec acceptance scenarios - Test PDF generation with real data, verify button behavior
- [x] Hotfix test debt tracking (if applicable) - N/A, not a hotfix

**Supabase Integration (Principle IV):**
- [x] RLS enabled on all new tables - N/A, no new tables (uses existing field_welds via RPC)
- [x] RLS patterns remain multi-tenant-safe (`organization_id`/`user_id` filtering) - N/A, read-only feature using existing data
- [x] TanStack Query wraps all Supabase calls - Uses existing `useFieldWeldProgressReport` hook
- [x] AuthContext used for auth state (no direct component access) - Uses existing `useProject` context for project name

**Specify Workflow (Principle V):**
- [x] Feature documented in `specs/###-feature-name/` directory - This document (specs/029-react-pdf-reports/)
- [x] Constitution gates verified before planning - This checklist
- [x] Tasks ordered with tests before implementation - Will be enforced in tasks.md

**Migration Rules (Principle VI):**
- [x] New sequential migration planned (if schema changes) - N/A, no schema changes
- [x] Migration idempotency verified or marked irreversible - N/A
- [x] RLS rules updated in same migration as table changes - N/A
- [x] Data migration reversibility documented (if applicable) - N/A
- [x] TypeScript types regeneration planned - N/A, no schema changes
- [x] Backward-compatibility notes documented - Existing jsPDF export remains functional

**Performance Standards (Principle VII):**
- [x] Table rendering target <100ms for 10k rows (virtualization strategy) - N/A, table already rendered by existing FieldWeldReportTable component
- [x] Database query index strategy documented - N/A, uses existing indexed `field_welds` table
- [x] No `select *` in production code - Uses existing RPC with explicit columns
- [x] TanStack Query pagination/virtualization planned - Uses existing hook with proper data fetching

**UI Standards (Principle VIII):**
- [x] Mobile layout planned (1024px breakpoint) - **Desktop-only feature, export buttons hidden on <1024px**
- [x] Touch targets ≥44px (WCAG 2.1 AA) - Desktop buttons meet standard click target sizes
- [x] Keyboard accessibility planned (Tab, Enter, Escape) - Export button keyboard accessible (Enter to trigger)
- [x] shadcn/ui and Radix patterns followed - Uses existing Button component pattern
- [x] No inline styles (Tailwind CSS only) - PDF components use @react-pdf/renderer StyleSheet API (separate from DOM)

**Test Coverage (Principle IX):**
- [x] Unit tests planned for business logic - Test PDF component rendering, data formatting utilities
- [x] Integration tests planned for data flow - Test full PDF generation flow with mock data
- [x] At least one acceptance test per spec scenario - Test P1 (PDF export), P2 (loading states), P3 (dual buttons)
- [x] Coverage targets verified (≥70% overall, ≥80% lib, ≥60% components) - Will meet targets for new code

## Project Structure

### Documentation (this feature)

```text
specs/029-react-pdf-reports/
├── spec.md                  # Feature specification (completed)
├── plan.md                  # This file (/speckit.plan output)
├── research.md              # Phase 0 output (technology decisions)
├── data-model.md            # Phase 1 output (PDF component data flow)
├── quickstart.md            # Phase 1 output (developer onboarding)
├── contracts/               # Phase 1 output (component interfaces)
│   └── pdf-components.ts    # TypeScript interfaces for PDF components
└── checklists/
    └── requirements.md      # Quality validation checklist (completed)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── pdf/                       # NEW: PDF component library
│   │   ├── layout/
│   │   │   ├── PageLayout.tsx     # Reusable page wrapper with header/footer
│   │   │   ├── BrandedHeader.tsx  # Company logo + report title header
│   │   │   └── ReportFooter.tsx   # Page numbers footer
│   │   ├── tables/
│   │   │   ├── Table.tsx          # Generic table component
│   │   │   ├── TableHeader.tsx    # Table header row
│   │   │   └── TableRow.tsx       # Table body row
│   │   ├── reports/
│   │   │   └── FieldWeldReportPDF.tsx  # Field weld report PDF document
│   │   ├── styles/
│   │   │   └── commonStyles.ts    # Shared PDF styles (colors, typography)
│   │   └── index.ts               # Barrel exports
│   ├── reports/
│   │   └── FieldWeldReportTable.tsx   # EXISTING: UI table component
│   └── ui/                        # EXISTING: shadcn/ui components
├── hooks/
│   ├── useFieldWeldProgressReport.ts  # EXISTING: TanStack Query hook
│   └── useFieldWeldPDFExport.ts       # NEW: Lazy-loading PDF export hook
├── lib/
│   └── exportFieldWeldReport.ts   # EXISTING: jsPDF export functions (maintained)
├── pages/
│   └── ReportsPage.tsx            # MODIFIED: Add enhanced PDF export button
└── types/
    └── reports.ts                 # EXISTING: FieldWeldReportData types

tests/
├── components/
│   └── pdf/
│       ├── Table.test.tsx         # Unit tests for table components
│       ├── BrandedHeader.test.tsx # Unit tests for header
│       └── FieldWeldReportPDF.test.tsx  # Integration tests for full report
└── hooks/
    └── useFieldWeldPDFExport.test.ts    # Hook behavior tests
```

**Structure Decision**: Single React SPA with new `src/components/pdf/` directory for reusable PDF components. This separates PDF generation logic from UI components while maintaining the existing component structure. The lazy-loading hook (`useFieldWeldPDFExport`) ensures the PDF library only loads when users click the export button, preventing bundle bloat.

## Complexity Tracking

> **No Constitution violations** - All principles satisfied. This is a standard feature addition with no architectural exceptions needed.

---

**Constitution Version**: 2.0.0 | **Ratified**: 2025-10-04 | **Last Amended**: 2025-11-16
