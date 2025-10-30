# Implementation Plan: Weekly Progress Reports

**Branch**: `019-weekly-progress-reports` | **Date**: 2025-10-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/019-weekly-progress-reports/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a comprehensive reporting system that generates weekly progress reports showing component completion across 5 standardized milestones (Received, Installed, Punch, Tested, Restored), grouped by Area, System, or Test Package. Reports use earned value methodology where partially complete milestones contribute proportionally. Support manual generation with professional PDF/Excel/CSV export for stakeholder distribution.

**Technical Approach**:
- **Database Layer**: PostgreSQL functions for earned value calculations, materialized views for dimension-grouped aggregations
- **Frontend Layer**: React SPA with TanStack Query for data fetching, shadcn/ui components for UI
- **Export Layer**: Client-side PDF generation (jspdf), Excel generation (xlsx/SheetJS), CSV via browser Blob API
- **State Management**: URL-based report parameters, TanStack Query for server state, React hooks for UI state

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.3
**Primary Dependencies**:
- Frontend: React 18.3, TanStack Query v5, React Router v7, Tailwind CSS v4, shadcn/ui (Radix UI primitives)
- Export: jspdf + jspdf-autotable (PDF), xlsx/SheetJS (Excel), papaparse (CSV)
- Backend: Supabase (PostgreSQL 15, Row Level Security, PostgREST)

**Storage**: Supabase PostgreSQL (remote only, no local instance)
- report_configs table for saved configurations
- Leverage existing tables: components, areas, systems, test_packages, progress_templates
- New database functions: calculate_earned_milestone_value()
- New views: vw_progress_by_area, vw_progress_by_system, vw_progress_by_test_package

**Testing**: Vitest + Testing Library (jsdom environment)
- Unit tests for components and hooks (colocated .test.tsx files)
- Integration tests for database functions (tests/integration/)
- E2E tests for export workflows (tests/e2e/)
- Coverage requirement: ≥70% overall, ≥80% for src/lib/, ≥60% for components

**Target Platform**: Web (Chrome/Firefox/Safari latest 2 versions), mobile-responsive (≤1024px breakpoint)

**Project Type**: Single-page web application (React SPA)

**Performance Goals**:
- Report generation: <3 seconds for 10,000+ components
- PDF export: <5 seconds for 100-row reports
- Initial page load: <2 seconds
- Virtualized table rendering: 60fps with 1000+ rows

**Constraints**:
- Earned value calculations must be mathematically accurate (no rounding errors in intermediate calculations)
- PDF layout must match screenshot reference exactly (7 columns, company header, Grand Total row)
- Mobile touch targets ≥32px (WCAG 2.1 AA compliance per Feature 015 patterns)
- RLS policies enforced on all new tables
- No implementation details in spec (constitution compliance)

**Scale/Scope**:
- 10,000+ components per project (existing data volume)
- 50+ areas, systems, or test packages per dimension
- 11 component types with varying milestone structures
- 5 standardized report milestones
- 3 grouping dimensions (Area, System, Test Package)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Type Safety First ✅ PASS

- **TypeScript strict mode**: All new code will use strict mode (already enforced in tsconfig.app.json)
- **No type assertions**: Report calculation functions will use proper type guards and discriminated unions
- **noUncheckedIndexedAccess**: Already enabled globally; array/object access in milestone mapping will use defensive checks
- **Path aliases**: All imports will use `@/*` aliases (e.g., `import { useProgressReport } from '@/hooks/useProgressReport'`)
- **Database types**: New tables/functions will be added to generated database.types.ts via `npx supabase gen types`

**Verification**: Run `tsc -b` after implementation - zero errors required.

### Principle II: Component-Driven Development ✅ PASS

- **shadcn/ui patterns**: All UI components will follow existing patterns (Button, Card, Table from src/components/ui/)
- **Business component colocation**: Report components in src/components/reports/, pages in src/pages/
- **Single responsibility**: ReportTable, ExportButtons, DimensionSelector as separate composable components
- **TanStack Query**: useProgressReport, useReportConfigs hooks will wrap all Supabase queries
- **Layout wrapper**: Reports pages will use existing Layout component with sidebar navigation

**Verification**: Component structure matches Feature 010 (Drawing-Centered Table) and Feature 015 (Mobile Milestone UI) patterns.

### Principle III: Testing Discipline ✅ PASS

- **TDD via Specify workflow**: Following /specify → /plan → /tasks → /implement sequence
- **Tests before implementation**: tasks.md will order test creation before each feature implementation
- **Colocated tests**: ReportTable.test.tsx, useProgressReport.test.ts next to source files
- **Integration tests**: Database function tests in tests/integration/reports/
- **Testing Library**: All component tests use @testing-library/react (no enzyme)

**Verification**: CI pipeline (GitHub Actions) runs `npm test -- --coverage` and enforces ≥70% coverage.

### Principle IV: Supabase Integration Patterns ✅ PASS

- **RLS enabled**: report_configs table will have RLS policies (see migration 00056)
- **Multi-tenant isolation**: RLS policies filter by organization_id via user→project→organization join
- **Environment validation**: Existing supabase.ts client already validates VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- **TanStack Query wrapping**: All Supabase calls via useProgressReport, useReportConfigs hooks
- **No realtime subscriptions**: Reports are snapshot-based (no channel subscriptions needed)
- **AuthContext**: Existing context provides user authentication; no direct component access
- **Remote migrations only**: All SQL via `npx supabase db push --linked` (no local Supabase)

**Verification**:
- RLS policies tested with multiple user/organization scenarios
- All queries return empty results for users outside organization

### Principle V: Specify Workflow Compliance ✅ PASS

**Workflow Executed**:
- ✅ `/specify` completed → spec.md created with 6 prioritized user stories
- ✅ `/clarify` executed during brainstorming → earned value methodology clarified, milestone mapping defined
- ✅ `/plan` in progress → this file (plan.md)
- Pending: `/tasks` → task breakdown with TDD sequence
- Pending: `/implement` → execution with per-task commits

**Quality Tools**:
- ✅ Specification quality checklist created (checklists/requirements.md) - all items passed
- ✅ `/analyze` recommended before implementation (cross-artifact consistency check)
- Checklists for complex earned value calculations (recommended for FR-010 through FR-014)

**Constitution Gates Verified**:
- ✅ TypeScript strict mode: No violations planned
- ✅ RLS policies: report_configs table includes RLS (migration 00056 already created)
- ✅ TanStack Query: All server state managed via custom hooks
- ✅ Test ordering: tasks.md will follow RED-GREEN-REFACTOR cycle

**Feature Complexity**: **Typical** (using core workflow + quality gates)
- Not simple: Requires database functions, earned value calculations, multi-format exports
- Not complex: No hierarchical drill-down (Phase 4), no scheduled automation (Phase 7), no real-time collaboration

**Rationale**: Systematic planning ensures earned value calculations are mathematically correct and export formats match stakeholder requirements exactly.

## Project Structure

### Documentation (this feature)

```text
specs/019-weekly-progress-reports/
├── spec.md              # Feature specification (6 user stories, 50 functional requirements)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (export library comparison, earned value patterns)
├── data-model.md        # Phase 1 output (report_configs table, transient report entities)
├── quickstart.md        # Phase 1 output (developer onboarding guide)
├── contracts/           # Phase 1 output (TypeScript interfaces for report data structures)
│   ├── ReportConfig.ts
│   ├── ProgressReport.ts
│   └── ReportRow.ts
├── checklists/
│   └── requirements.md  # Spec quality validation (all checks passed)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created yet)
```

### Source Code (repository root)

```text
# React SPA Structure (existing project, adding Reports feature)
src/
├── components/
│   ├── ui/                      # Existing shadcn/ui components (Button, Card, Table, Dialog, etc.)
│   ├── reports/                 # NEW: Report-specific components
│   │   ├── ReportConfigList.tsx
│   │   ├── ReportBuilderForm.tsx
│   │   ├── ReportPreview.tsx
│   │   ├── ReportTable.tsx
│   │   ├── DimensionSelector.tsx
│   │   ├── ExportButtons.tsx
│   │   └── MilestoneColumn.tsx
│   ├── Sidebar.tsx              # MODIFIED: Add Reports navigation link
│   └── Layout.tsx               # Existing: No changes needed
│
├── pages/
│   ├── ReportsPage.tsx          # NEW: Reports landing page
│   ├── ReportBuilderPage.tsx   # NEW: Configure new report
│   └── ReportViewPage.tsx       # NEW: View/export generated report
│
├── hooks/
│   ├── useProgressReport.ts     # NEW: Fetch aggregated report data
│   ├── useReportConfigs.ts      # NEW: CRUD for saved configurations
│   └── useReportExport.ts       # NEW: Trigger PDF/Excel/CSV generation
│
├── lib/
│   ├── supabase.ts              # Existing: No changes needed
│   ├── reportExport.ts          # NEW: Export service (PDF/Excel/CSV generation)
│   └── milestoneMapping.ts      # NEW: Earned value calculation helpers
│
├── types/
│   ├── database.types.ts        # MODIFIED: Regenerate after migrations (npx supabase gen types)
│   └── reports.ts               # NEW: TypeScript interfaces for report data
│
└── App.tsx                      # MODIFIED: Add /reports routes

tests/
├── integration/
│   └── reports/
│       ├── earned-value.test.ts         # NEW: Test calculate_earned_milestone_value() function
│       ├── report-views.test.ts         # NEW: Test vw_progress_by_* views
│       └── report-configs-rls.test.ts   # NEW: Test RLS policies
│
└── unit/
    └── components/
        └── reports/
            ├── ReportTable.test.tsx
            ├── ExportButtons.test.tsx
            └── DimensionSelector.test.tsx

supabase/
└── migrations/
    ├── 00056_create_report_configs.sql           # CREATED: report_configs table + RLS
    ├── 00057_earned_milestone_function.sql       # NEW: calculate_earned_milestone_value()
    ├── 00058_progress_by_area_view.sql           # NEW: vw_progress_by_area
    ├── 00059_progress_by_system_view.sql         # NEW: vw_progress_by_system
    └── 00060_progress_by_test_package_view.sql   # NEW: vw_progress_by_test_package
```

**Structure Decision**: Using existing React SPA structure (src/ + tests/ + supabase/migrations/). New Reports feature integrates as:
1. **Frontend**: New directory `src/components/reports/` for report-specific UI, new pages in `src/pages/`
2. **Backend**: New migrations in `supabase/migrations/` (table + function + 3 views)
3. **Tests**: New integration tests in `tests/integration/reports/`, unit tests colocated with components

This matches the established pattern from Feature 010 (Drawing-Centered Table), Feature 015 (Mobile Milestone Updates), and Feature 016 (Team Management UI).

## Complexity Tracking

> **No constitution violations** - this table is empty (feature complies with all principles)

## Phase 0: Research & Decisions

### Research Topics

1. **Export Library Comparison** (resolves: NEEDS CLARIFICATION on PDF/Excel generation approach)
   - Evaluate jspdf vs. pdfmake vs. react-pdf for client-side PDF generation
   - Evaluate xlsx (SheetJS) vs. exceljs for Excel export
   - Decision criteria: bundle size, browser compatibility, API simplicity, active maintenance

2. **Earned Value Calculation Pattern** (resolves: Implementation strategy for FR-010 through FR-014)
   - Research PostgreSQL GROUPING SETS vs. separate views for dimension aggregation
   - Evaluate database function vs. client-side calculation for earned value
   - Decision criteria: performance at 10,000+ components, query complexity, maintainability

3. **Report Data Fetching Strategy** (resolves: Real-time vs. snapshot data)
   - Evaluate materialized views (refresh on schedule) vs. live queries
   - Research PostgREST aggregation capabilities vs. custom RPC functions
   - Decision criteria: 3-second generation target, data freshness requirements, query complexity

4. **Component Virtualization Library** (resolves: Table rendering at 1000+ rows)
   - Evaluate @tanstack/react-virtual (used in Feature 010) vs. react-window vs. no virtualization
   - Decision criteria: Integration with existing table components, performance at target scale, API simplicity

### Research Deliverable

**File**: `research.md` with sections:
- **Decision**: Export Libraries
  - PDF: jspdf + jspdf-autotable
  - Excel: xlsx (SheetJS)
  - CSV: Browser Blob API + papaparse
  - Rationale: [bundle size comparison, browser support matrix, API examples]

- **Decision**: Earned Value Calculation
  - Approach: PostgreSQL function `calculate_earned_milestone_value(component_type, milestones, standard_milestone)`
  - Rationale: [performance benchmarks, code reusability, maintainability]

- **Decision**: Report Data Fetching
  - Approach: Three separate views (vw_progress_by_area, vw_progress_by_system, vw_progress_by_test_package) with live queries
  - Rationale: [query performance, data freshness, implementation complexity]

- **Decision**: Table Virtualization
  - Approach: @tanstack/react-virtual (already used in Feature 010)
  - Rationale: [consistency with existing codebase, proven performance, familiar API]

## Phase 1: Design & Contracts

### Data Model

**File**: `data-model.md` with sections:

#### 1. Persisted Entities

**report_configs** (already created in migration 00056):
```sql
CREATE TABLE report_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT,
  grouping_dimension TEXT NOT NULL CHECK (grouping_dimension IN ('area', 'system', 'test_package')),
  hierarchical_grouping BOOLEAN NOT NULL DEFAULT false,
  component_type_filter TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_report_configs_project ON report_configs(project_id);
CREATE INDEX idx_report_configs_created_by ON report_configs(created_by);
CREATE INDEX idx_report_configs_grouping_dimension ON report_configs(grouping_dimension);

-- RLS Policies (enforced)
```

**Relationships**:
- report_configs belongs_to project (via project_id)
- report_configs belongs_to user (via created_by, optional for orphaned configs)

**Validation Rules**:
- name: Required, non-empty string
- grouping_dimension: One of 'area', 'system', 'test_package'
- project_id: Must reference existing project in user's organization (enforced by RLS)

#### 2. Transient Entities (not persisted, calculated on-demand)

**ProgressReport**:
```typescript
interface ProgressReport {
  title: string;                    // e.g., "Pipe Tracker - by Area"
  generatedAt: Date;
  groupingDimension: 'area' | 'system' | 'test_package';
  projectName: string;
  rows: ReportRow[];
  grandTotal: ReportRow;            // Aggregated totals across all rows
}
```

**ReportRow**:
```typescript
interface ReportRow {
  groupName: string;                // e.g., "B-64 OSBL"
  groupId: string;                  // UUID of area/system/test_package
  budget: number;                   // Component count
  pctReceived: number;              // 0-100
  pctInstalled: number;             // 0-100
  pctPunch: number;                 // 0-100
  pctTested: number;                // 0-100
  pctRestored: number;              // 0-100
  pctTotal: number;                 // 0-100 (average of component percent_complete values)
}
```

#### 3. Database Functions

**calculate_earned_milestone_value(component_type TEXT, milestones JSONB, standard_milestone TEXT) RETURNS NUMERIC**:
- Inputs: Component type (e.g., 'spool'), milestone completion state (JSONB), target standard milestone ('received', 'installed', 'punch', 'tested', 'restored')
- Output: Earned percentage (0-100) for that standard milestone
- Logic: Maps component-specific milestones to standard milestones using FR-010 mapping rules
- Example: `calculate_earned_milestone_value('spool', '{"Erect": true, "Connect": false}', 'installed')` returns 50 (40 earned / 80 total)

#### 4. Database Views

**vw_progress_by_area**:
```sql
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.project_id,
  COUNT(c.id) AS budget,
  AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received')) AS pct_received,
  AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed')) AS pct_installed,
  AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch')) AS pct_punch,
  AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested')) AS pct_tested,
  AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored')) AS pct_restored,
  AVG(c.percent_complete) AS pct_total
FROM areas a
LEFT JOIN components c ON c.area_id = a.id AND NOT c.is_retired
WHERE NOT a.is_retired
GROUP BY a.id, a.name, a.project_id;
```

**vw_progress_by_system** and **vw_progress_by_test_package**: Similar structure, joining on system_id and test_package_id respectively.

### API Contracts

**File**: `contracts/` directory with TypeScript interfaces:

**ReportConfig.ts**:
```typescript
export interface ReportConfig {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  grouping_dimension: 'area' | 'system' | 'test_package';
  hierarchical_grouping: boolean;
  component_type_filter: string[] | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateReportConfigInput {
  project_id: string;
  name: string;
  description?: string;
  grouping_dimension: 'area' | 'system' | 'test_package';
  hierarchical_grouping?: boolean;
  component_type_filter?: string[];
}

export interface UpdateReportConfigInput {
  name?: string;
  description?: string;
  grouping_dimension?: 'area' | 'system' | 'test_package';
}
```

**ProgressReport.ts**:
```typescript
export interface ProgressReport {
  title: string;
  generatedAt: Date;
  groupingDimension: 'area' | 'system' | 'test_package';
  projectName: string;
  rows: ReportRow[];
  grandTotal: ReportRow;
}

export interface ReportRow {
  groupName: string;
  groupId: string;
  budget: number;
  pctReceived: number;
  pctInstalled: number;
  pctPunch: number;
  pctTested: number;
  pctRestored: number;
  pctTotal: number;
}

export interface ReportExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  filename: string;
  includeHeader: boolean;
  companyLogoUrl?: string;
}
```

### Developer Quickstart

**File**: `quickstart.md` with sections:

#### Local Development Setup

1. **Prerequisites**: Node.js 18+, npm 9+, Supabase CLI
2. **Install dependencies**: `npm install` (includes new jspdf, jspdf-autotable, xlsx)
3. **Apply migrations**: `npx supabase db push --linked`
4. **Regenerate types**: `npx supabase gen types typescript --linked > src/types/database.types.ts`
5. **Run dev server**: `npm run dev`
6. **Run tests**: `npm test`

#### Feature Architecture

- **Entry Point**: Click "Reports" in sidebar → navigates to `/reports` (ReportsPage.tsx)
- **Report Flow**: Select dimension → Generate → View preview → Export (PDF/Excel/CSV)
- **Data Flow**: TanStack Query hook → Supabase view → Component render
- **State Management**: URL params for report config, TanStack Query cache for data

#### Key Files

- `src/hooks/useProgressReport.ts`: Main data fetching hook
- `src/lib/reportExport.ts`: Export logic (PDF/Excel/CSV)
- `src/components/reports/ReportTable.tsx`: Main report display component
- `supabase/migrations/00057_earned_milestone_function.sql`: Core calculation logic

#### Testing Strategy

- **Unit Tests**: Component behavior, export formatting
- **Integration Tests**: Database function accuracy, view performance, RLS enforcement
- **E2E Tests**: Full user workflows (generate → export → verify downloaded file)

#### Common Development Tasks

- **Add new export format**: Extend `reportExport.ts`, add button to `ExportButtons.tsx`
- **Modify milestone mapping**: Update `calculate_earned_milestone_value()` function in migration
- **Add new grouping dimension**: Create new view, update `DimensionSelector` options
- **Debug earned value**: Query `calculate_earned_milestone_value()` directly in Supabase SQL Editor

### Agent Context Update

**Action**: Run `.specify/scripts/bash/update-agent-context.sh claude`

**New Technology Added**:
- jspdf + jspdf-autotable (PDF generation)
- xlsx (Excel export via SheetJS)
- Weekly Progress Reports feature context

**Preserved Content**:
- Existing Feature 010-016 context
- Manual additions between `<!-- MANUAL ADDITIONS START -->` markers
- Constitution v1.0.2 reference

## UI/UX Design Vision

This section documents the complete user interface design, showing how each page and component will look in the final implementation.

### 1. Reports Landing Page (`/reports`)

```
┌─────────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  Reports                                          │
│             │                                                    │
│  Dashboard  │  ┌──────────────────────────────────────────────┐│
│  Components │  │  📊 Saved Reports                             ││
│  Drawings   │  │                                               ││
│  Packages   │  │  Weekly Area Report                 🔄 ✏️ 🗑️ ││
│  Welders    │  │  Grouped by Area • Created Oct 21, 2025      ││
│  Weld Log   │  │                                               ││
│ ►Reports    │  │  Monthly System Progress            🔄 ✏️ 🗑️ ││
│  Imports    │  │  Grouped by System • Created Oct 15, 2025    ││
│  Metadata   │  │                                               ││
│  Team       │  │  (Empty state if no saved reports)            ││
│             │  │  No saved reports yet.                        ││
│             │  │  Create your first report to get started.     ││
│             │  └──────────────────────────────────────────────┘│
│             │                                                    │
│             │  [+ Create New Report]                            │
│             │                                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Key UI Elements**:
- Sidebar highlights "Reports" as active menu item
- Card-based list of saved configurations showing name, grouping dimension, and creation date
- Quick actions for each saved report: Generate (🔄), Edit (✏️), Delete (🗑️)
- Empty state message with call-to-action when no saved reports exist
- Large "Create New Report" button for first-time users

**Component Mapping**:
- `ReportsPage.tsx` - Page orchestrator
- `ReportConfigList.tsx` - List of saved reports with action buttons
- `EmptyState.tsx` (existing) - "No saved reports" message
- `Button.tsx` (shadcn/ui) - Create New Report action

---

### 2. Report Configuration Page (`/reports/new`)

```
┌─────────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  Create New Report                                │
│             │                                                    │
│             │  ┌──────────────────────────────────────────────┐│
│             │  │  Report Configuration                         ││
│             │  │                                               ││
│             │  │  Group By:                                    ││
│             │  │  ○ Area    ● System    ○ Test Package        ││
│             │  │     └─ (Radio buttons, single selection)     ││
│             │  │                                               ││
│             │  │  Report Name (optional for saved configs):    ││
│             │  │  [Weekly System Report_____________]          ││
│             │  │                                               ││
│             │  │  Description (optional):                      ││
│             │  │  [Progress by system for stakeholder review_] ││
│             │  │                                               ││
│             │  └──────────────────────────────────────────────┘│
│             │                                                    │
│             │  [Generate Report]  [Save Configuration]          │
│             │                                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Key UI Elements**:
- Clear radio button selector for grouping dimension (Area/System/Test Package)
- Optional text fields for saving configuration (name and description)
- Two action buttons:
  - "Generate Report" - Creates report immediately without saving config
  - "Save Configuration" - Saves config for reuse, then generates report
- Simple, focused form with no overwhelming options (MVP scope)

**Component Mapping**:
- `ReportBuilderPage.tsx` - Page orchestrator
- `ReportBuilderForm.tsx` - Form container with validation
- `DimensionSelector.tsx` - Radio group for Area/System/Test Package
- `Input.tsx`, `Label.tsx` (shadcn/ui) - Text fields
- `Card.tsx` (shadcn/ui) - Form wrapper

**Validation Rules**:
- Grouping dimension: Required (enforced by radio button, one always selected)
- Report name: Optional for quick reports, required if "Save Configuration" clicked
- Description: Always optional

---

### 3. Generated Report Preview (Matching Reference Screenshot)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  Pipe Tracker - by Area                                               │
│             │  Project: Dark Knight - OSBL B-6800 Piping      Date: 10-28-2025      │
│             │                                                                         │
│             │  [Export PDF] [Export Excel] [Export CSV]  [Save Configuration]        │
│             │                                                                         │
│             │  ┌─────────────────────────────────────────────────────────────────┐  │
│             │  │ Area      Budget  %Rcvd  %Instld  %Punch  %Tstd  %Rstrd  %Total│  │
│             │  ├─────────────────────────────────────────────────────────────────┤  │
│             │  │ B-64 OSBL  1,974   100%    77%      56%    74%     0%      0%   53%│  │
│             │  │ B-66 OSBL  3,351   100%    77%      63%    75%     0%      0%   55%│  │
│             │  │ B-68       2,482   100%    11%       6%     8%     0%      0%   11%│  │
│             │  │ B-68 OSBL  1,997   100%     0%       0%     0%     0%      0%    5%│  │
│             │  │ B-75 OSBL  1,910   100%    58%      50%    50%     0%      0%   42%│  │
│             │  │ B-76       1,251   100%    96%      96%    96%     0%      0%   72%│  │
│             │  │ B-76 OSBL  2,715   100%    89%      82%    84%     0%      0%   64%│  │
│             │  ├─────────────────────────────────────────────────────────────────┤  │
│             │  │ Grand Total 15,680 100%    58%      49%    55%     0%      0%   43%│  │
│             │  └─────────────────────────────────────────────────────────────────┘  │
│             │                                                                         │
│             │  (Table supports virtualized scrolling for 100+ rows)                  │
│             │  (Column headers stay visible when scrolling - sticky positioning)     │
│             │                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Key Design Features**:

**Page Header**:
- Report title: "Pipe Tracker - by [Dimension]" (dynamically generated)
- Project name and date on same line (right-aligned)
- Matches reference screenshot header format exactly

**Action Bar** (above table):
- Three export buttons: PDF (primary), Excel, CSV
- "Save Configuration" button (if report not saved yet)
- All buttons use lucide-react icons + labels

**Table Structure** (7 columns):
1. **Area/System/Test Package** (left-aligned, primary key)
2. **Budget** (right-aligned, comma-separated thousands)
3. **%Rcvd** (right-aligned, whole number percentage)
4. **%Instld** (right-aligned, whole number percentage)
5. **%Punch** (right-aligned, whole number percentage)
6. **%Tstd** (right-aligned, whole number percentage)
7. **%Rstrd** (right-aligned, whole number percentage)
8. **%Total** (right-aligned, whole number percentage, slightly bolder)

**Grand Total Row**:
- Horizontal divider above (2px border)
- Bold font weight for all cells
- Light background color to distinguish from data rows
- Always visible at bottom (not virtualized)

**Column Abbreviations** (space-saving):
- %Rcvd = % Received
- %Instld = % Installed
- %Punch = % Punched
- %Tstd = % Tested
- %Rstrd = % Restored

**Component Mapping**:
- `ReportViewPage.tsx` - Page orchestrator
- `ReportPreview.tsx` - Report header + action bar + table wrapper
- `ReportTable.tsx` - Virtualized table component
- `MilestoneColumn.tsx` - Individual percentage column with tooltip
- `ExportButtons.tsx` - Action button group

**Visual Styling** (Tailwind CSS):
```typescript
// Column headers (sticky)
<th className="sticky top-0 z-10 bg-slate-100 px-4 py-3 text-left text-sm font-semibold border-b-2 border-slate-300">
  Area
</th>

// Data cells (percentage columns right-aligned)
<td className="px-4 py-2 text-sm text-right border-b border-slate-200">
  {row.pctReceived}%
</td>

// Budget column (comma-separated)
<td className="px-4 py-2 text-sm text-right border-b border-slate-200">
  {row.budget.toLocaleString()}
</td>

// Grand Total row
<tr className="font-bold bg-slate-50 border-t-2 border-slate-400">
  <td className="px-4 py-3 text-sm">Grand Total</td>
  <td className="px-4 py-3 text-sm text-right">{grandTotal.budget.toLocaleString()}</td>
  <td className="px-4 py-3 text-sm text-right">{grandTotal.pctReceived}%</td>
  ...
</tr>
```

**Color Scheme** (consistent with existing PipeTrak UI):
- **Headers**: Light slate background (`bg-slate-100`)
- **Data rows**: White background with light borders (`border-slate-200`)
- **Row hover**: Light blue highlight (`hover:bg-blue-50`)
- **Grand Total**: Slightly darker slate background (`bg-slate-50`)
- **Dividers**: Medium slate borders (`border-slate-300` for headers, `border-slate-400` for Grand Total)

**Interactivity**:
- Hover state on data rows (subtle blue highlight)
- Column headers show tooltip with full milestone name on hover
- Percentage cells show component breakdown on hover (e.g., "Erect: 40%, Connect: 40%")

---

### 4. Export Button Group (Action Bar Detail)

```
┌────────────────────────────────────────────────────────────────┐
│ [📄 Export PDF] [📊 Export Excel] [📋 Export CSV]  [💾 Save]  │
└────────────────────────────────────────────────────────────────┘
```

**Button Specifications**:
- **Icons**: lucide-react icons (FileText, Sheet, Download, Save)
- **Styling**:
  - Primary button (Export PDF): `bg-blue-600 text-white hover:bg-blue-700`
  - Secondary buttons (Excel, CSV): `bg-white border border-slate-300 hover:bg-slate-50`
  - Save button: `bg-slate-100 border border-slate-300 hover:bg-slate-200`
- **Disabled state**: When report is still loading, all buttons grayed out with spinner
- **Desktop**: Side-by-side layout with 8px gap
- **Mobile**: Stacked layout (vertical) with 4px gap

**Component Structure**:
```typescript
<ExportButtons
  report={reportData}
  projectName="Dark Knight"
  onSave={handleSaveConfig}
  isLoading={isGenerating}
/>
```

---

### 5. PDF Export Output (Stakeholder View)

```
┌─────────────────────────────────────────────────────────────┐
│  [ICS INC Logo]           Dow Chemical                      │
│                 S1601-085888 - Project Dark Knight          │
│                    OSBL B-6800 Piping                        │
│                  Pipe Tracker - by Area                      │
│                                                              │
│  Date: 10-12-2025                                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Area      Budget  %Rcvd  %Instld  %Punch  %Tstd  ... │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ B-64 OSBL  1,974   100%    77%      56%    74%   ... │  │
│  │ B-66 OSBL  3,351   100%    77%      63%    75%   ... │  │
│  │ B-68       2,482   100%    11%       6%     8%   ... │  │
│  │ B-68 OSBL  1,997   100%     0%       0%     0%   ... │  │
│  │ ... (continues with all rows)                        │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Grand Total 15,680 100%    58%      49%    55%   ... │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Page 1 of 2                                                 │
└─────────────────────────────────────────────────────────────┘
```

**PDF-Specific Features**:

**Header Section**:
- Company logo loaded from `organizations.logo_url` (top left, 80x80px)
- Company name: Fetched from `organizations.name` (large, centered)
- Project identifier: "S1601-085888" (example format, from project metadata)
- Project name: "Project Dark Knight - OSBL B-6800 Piping"
- Report title: "Pipe Tracker - by [Dimension]"
- Generation date: "Date: 10-12-2025" (format: MM-DD-YYYY)

**Layout Specifications**:
- **Orientation**: Landscape (better for 8-column table)
- **Page size**: US Letter (11" × 8.5" in landscape)
- **Margins**: 0.5" top/bottom, 0.75" left/right
- **Font**: Helvetica (jspdf default, professional appearance)
- **Header font size**: 16pt (title), 12pt (project info), 10pt (date)
- **Table font size**: 9pt (headers), 8pt (data)

**Table Rendering** (jspdf-autotable):
```typescript
doc.autoTable({
  head: [['Area', 'Budget', '%Rcvd', '%Instld', '%Punch', '%Tstd', '%Rstrd', '%Total']],
  body: reportRows.map(row => [
    row.groupName,
    row.budget.toLocaleString(),
    `${row.pctReceived}%`,
    `${row.pctInstalled}%`,
    `${row.pctPunch}%`,
    `${row.pctTested}%`,
    `${row.pctRestored}%`,
    `${row.pctTotal}%`,
  ]),
  foot: [['Grand Total', grandTotal.budget.toLocaleString(), ...]],
  startY: 80, // After header
  theme: 'grid', // Borders on all cells
  headStyles: { fillColor: [203, 213, 225], textColor: 0, fontStyle: 'bold' }, // slate-300
  footStyles: { fillColor: [241, 245, 249], textColor: 0, fontStyle: 'bold' }, // slate-100
  styles: { fontSize: 8, cellPadding: 3 },
  columnStyles: {
    0: { halign: 'left' }, // Area name
    1: { halign: 'right' }, // Budget
    2: { halign: 'right' }, // Percentages...
    3: { halign: 'right' },
    4: { halign: 'right' },
    5: { halign: 'right' },
    6: { halign: 'right' },
    7: { halign: 'right', fontStyle: 'bold' }, // %Total slightly emphasized
  },
  didDrawPage: (data) => {
    // Add page number footer
    doc.text(`Page ${data.pageNumber} of ${data.pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
  },
});
```

**Auto-Page Break Behavior**:
- When table exceeds one page, jspdf-autotable automatically breaks across pages
- Column headers repeat on each page
- Grand Total row only appears on final page
- Page numbers in footer: "Page 1 of 2"

**File Naming Convention**:
```
PipeTrak_[ProjectName]_[GroupingDimension]_[YYYY-MM-DD].pdf

Examples:
- PipeTrak_DarkKnight_Area_2025-10-28.pdf
- PipeTrak_DarkKnight_System_2025-10-28.pdf
- PipeTrak_TankFarm_TestPackage_2025-11-05.pdf
```

---

### 6. Mobile Responsive View (≤1024px)

```
┌─────────────────────────────┐
│ ☰  Reports                  │
│                             │
│ Group By:                   │
│ [▼ System ▼]                │
│                             │
│ [Generate Report]           │
│                             │
│ ┌─────────────────────────┐ │
│ │ Area      Budget  %Total│ │
│ │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│ │
│ │ B-64 OSBL 1,974    53%  │ │
│ │ ► Tap to expand details │ │
│ │                         │ │
│ │ B-66 OSBL 3,351    55%  │ │
│ │ ► Tap to expand details │ │
│ │                         │ │
│ │ B-68      2,482    11%  │ │
│ │ ► Tap to expand details │ │
│ └─────────────────────────┘ │
│                             │
│ Scroll horizontally → for   │
│ full table view             │
│                             │
│ [📄 PDF] [📊 XLS] [📋 CSV] │
│                             │
└─────────────────────────────┘
```

**Mobile-Specific Optimizations**:

**Collapsed View** (default):
- Show only 3 columns: Area name, Budget, %Total
- Tap any row to expand and show all 7 milestone columns
- "Tap to expand details" hint below each row
- Touch target: ≥44px height (WCAG 2.1 AA + iOS guidelines)

**Expanded Row State**:
```
┌─────────────────────────────┐
│ B-64 OSBL                   │
│ ▼ Tap to collapse           │
│                             │
│ Budget:      1,974          │
│ Received:    100%           │
│ Installed:   77%            │
│ Punch:       56%            │
│ Tested:      74%            │
│ Restored:    0%             │
│ Total:       53%            │
└─────────────────────────────┘
```

**Alternative: Horizontal Scroll**:
- Full 8-column table with horizontal scroll enabled
- First column (Area) frozen/sticky on left
- Swipe gesture to scroll right and see remaining columns
- Indicator: "Scroll → for more" message below table

**Mobile Action Buttons**:
- Stacked vertically (full width, 44px height each)
- Icons + labels: "📄 Export PDF", "📊 Export Excel", "📋 Export CSV"
- 8px vertical gap between buttons
- Export uses native mobile file download (prompts "Open in..." dialog)

**Dimension Selector** (mobile):
- Radio buttons replaced with dropdown (Select component)
- Larger touch target (≥44px height)
- Native iOS/Android picker UI where supported

**Responsive Breakpoint**: 1024px (matches Feature 015 mobile milestone patterns)

---

### 7. Excel Export Output (.xlsx)

**Spreadsheet Structure**:

```
Sheet1: "Progress Report"

Row 1:  [A1: "Pipe Tracker - by Area"]                    [Empty] ... [H1: "Date: 10-28-2025"]
Row 2:  [Empty]
Row 3:  [A3: "Area"] [B3: "Budget"] [C3: "%Received"] [D3: "%Installed"] ... [H3: "%Total"]
Row 4:  [A4: "B-64 OSBL"] [B4: 1974] [C4: 100%] [D4: 77%] ... [H4: 53%]
Row 5:  [A5: "B-66 OSBL"] [B5: 3351] [C5: 100%] [D5: 77%] ... [H5: 55%]
...
Row N:  [A: "Grand Total"] [B: 15680] [C: 100%] [D: 58%] ... [H: 43%]
```

**Cell Formatting** (xlsx library):
```typescript
// Percentage cells
worksheet['C4'] = { t: 'n', v: 1.0, z: '0%' };  // Displays as "100%"
worksheet['D4'] = { t: 'n', v: 0.77, z: '0%' }; // Displays as "77%"

// Number cells (Budget)
worksheet['B4'] = { t: 'n', v: 1974, z: '#,##0' }; // Displays as "1,974"

// Header row styling
worksheet['A3'].s = {
  font: { bold: true },
  fill: { fgColor: { rgb: 'E2E8F0' } }, // slate-200
  alignment: { horizontal: 'left' },
};

// Grand Total row styling
worksheet['A' + lastRow].s = {
  font: { bold: true },
  fill: { fgColor: { rgb: 'F1F5F9' } }, // slate-100
};

// Frozen panes (keep header row visible)
worksheet['!freeze'] = { xSplit: 0, ySplit: 3 }; // Freeze rows 1-3 (title + header)

// Column widths
worksheet['!cols'] = [
  { wch: 15 }, // Area name
  { wch: 10 }, // Budget
  { wch: 10 }, // %Received
  { wch: 10 }, // %Installed
  { wch: 10 }, // %Punch
  { wch: 10 }, // %Tested
  { wch: 10 }, // %Restored
  { wch: 10 }, // %Total
];
```

**Features**:
- Percentage formatting (native Excel percentages, not strings)
- Comma-separated thousands for Budget column
- Frozen header rows (title + column headers)
- Bold styling for headers and Grand Total row
- Auto-width columns (or fixed widths as shown above)
- Single sheet (no multi-sheet in MVP)

**File Naming**: Same as PDF (e.g., `PipeTrak_DarkKnight_Area_2025-10-28.xlsx`)

---

### 8. CSV Export Output (.csv)

**File Content** (plain text):
```csv
"Area","Budget","%Received","%Installed","%Punch","%Tested","%Restored","%Total"
"B-64 OSBL",1974,100,77,56,74,0,0,53
"B-66 OSBL",3351,100,77,63,75,0,0,55
"B-68",2482,100,11,6,8,0,0,11
"B-68 OSBL",1997,100,0,0,0,0,0,5
"B-75 OSBL",1910,100,58,50,50,0,0,42
"B-76",1251,100,96,96,96,0,0,72
"B-76 OSBL",2715,100,89,82,84,0,0,64
"Grand Total",15680,100,58,49,55,0,0,43
```

**Implementation** (papaparse):
```typescript
import Papa from 'papaparse';

const csvData = [
  { Area: 'B-64 OSBL', Budget: 1974, '%Received': 100, '%Installed': 77, ... },
  { Area: 'B-66 OSBL', Budget: 3351, '%Received': 100, '%Installed': 77, ... },
  // ... all rows including Grand Total
];

const csv = Papa.unparse(csvData);
const blob = new Blob([csv], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `PipeTrak_${projectName}_${dimension}_${date}.csv`;
link.click();
URL.revokeObjectURL(url);
```

**Features**:
- Standard CSV format (comma-separated)
- Quoted strings to handle commas in Area names (if any)
- Percentage values as integers (not formatted with % symbol, for Excel import compatibility)
- Compatible with Excel, Google Sheets, and any CSV parser
- Simplest format, smallest file size

---

## Design System Integration

**Existing Components Used** (from shadcn/ui):
- `Button` - All action buttons (Generate, Export, Save)
- `Card` - Report config form wrapper, saved reports list
- `Input`, `Label` - Text fields in configuration form
- `Select` - Mobile dimension selector dropdown
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` - Base table structure (extended with virtualization)
- `Dialog` - Delete confirmation for saved reports
- `Tooltip` - Milestone column explanations

**New Components Created**:
- `ReportTable` - Virtualized table with sticky headers
- `ReportConfigList` - Saved reports list with actions
- `DimensionSelector` - Radio group for Area/System/Test Package
- `ExportButtons` - Action button group with loading states
- `MilestoneColumn` - Percentage display with tooltip
- `ReportPreview` - Report wrapper with header and action bar

**Color Palette** (Tailwind CSS, matching existing PipeTrak):
- Primary: Blue (`blue-600`, `blue-700` for buttons)
- Neutral: Slate (`slate-100` to `slate-400` for table backgrounds/borders)
- Accent: Indigo (`indigo-600` for links, active states)
- Success: Green (`green-600` for completed milestones in tooltips)
- Warning: Yellow (`yellow-600` for in-progress milestones)

**Typography**:
- Headings: `font-semibold` (600 weight)
- Body: `text-sm` (14px) for data, `text-base` (16px) for labels
- Monospace: Budget numbers use default sans-serif with `tabular-nums` for alignment

**Spacing**:
- Table cell padding: `px-4 py-2` (16px horizontal, 8px vertical)
- Button gaps: `gap-2` (8px between export buttons)
- Section spacing: `space-y-4` (16px between major sections)

---

## Accessibility (WCAG 2.1 AA Compliance)

**Keyboard Navigation**:
- All buttons focusable with Tab key
- Export actions triggered with Enter or Space
- Table rows navigable with arrow keys (if row selection added)
- Dimension selector radio buttons navigable with arrow keys

**Screen Reader Support**:
- Table uses semantic HTML (`<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`)
- Column headers have `scope="col"` attribute
- Percentage cells announced as "Received: 100 percent" (not "one zero zero")
- Loading states announced: "Generating report, please wait"
- Export button labels: "Export as PDF", "Export as Excel spreadsheet", "Export as CSV file"

**Touch Targets** (Mobile):
- All interactive elements ≥44px touch target (iOS) / ≥48dp (Android)
- Export buttons: 44px height minimum
- Table rows (when expandable): 48px height minimum
- Clear visual feedback on tap (background color change)

**Color Contrast**:
- Text on background: ≥4.5:1 contrast ratio
- Headers (dark gray on light slate): ~8:1 ratio ✅
- Percentage values (dark gray on white): ~12:1 ratio ✅
- Grand Total (dark gray on light slate): ~8:1 ratio ✅

---

This comprehensive UI/UX design documentation ensures that all developers and stakeholders have a clear vision of the final product before implementation begins.

## Phase 2: Task Breakdown

**Note**: Task breakdown is generated by `/speckit.tasks` command (separate from `/speckit.plan`).

**Expected Structure** (preview, not executed yet):
- Phase 2.1: Database Foundation (migrations 00057-00060)
- Phase 2.2: TanStack Query Hooks (useProgressReport, useReportConfigs)
- Phase 2.3: Core UI Components (ReportTable, DimensionSelector, ExportButtons)
- Phase 2.4: Page Components (ReportsPage, ReportBuilderPage, ReportViewPage)
- Phase 2.5: Export Functionality (reportExport.ts service)
- Phase 2.6: Navigation Integration (Sidebar.tsx, App.tsx routes)
- Phase 2.7: Testing & Polish (unit tests, integration tests, mobile responsiveness)

Each phase follows TDD: Write test → Implement → Verify → Commit.

---

**Constitution Version**: 1.0.2 (verified compliant)
**Planning Complete**: Phase 0 and Phase 1 artifacts ready for generation
**Next Step**: Run `/speckit.tasks` to generate task breakdown, then `/implement` to execute
