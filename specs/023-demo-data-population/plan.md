# Implementation Plan: Demo Project Data Population

**Branch**: `023-demo-data-population` | **Date**: 2025-11-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/023-demo-data-population/spec.md`

## Summary

Populate demo projects with realistic industrial construction data (200 components, 20 drawings, ~120 field welds) using a progressive loading strategy: synchronous skeleton creation (<2s) followed by asynchronous bulk population (<45s). This enables immediate user access while avoiding Edge Function timeout constraints.

**Technical Approach**: Two-phase architecture with SQL function for skeleton (areas, systems, packages, welders) and TypeScript Edge Function for bulk data insertion using declarative seed file with natural key lookups.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Deno runtime (Supabase Edge Functions)
**Primary Dependencies**: Supabase JS Client (@supabase/supabase-js), existing database schema
**Storage**: PostgreSQL (Supabase) with existing tables (components, drawings, field_welds, areas, systems, test_packages, welders)
**Testing**: Vitest + Testing Library (integration tests for population logic)
**Target Platform**: Supabase Edge Functions (Deno runtime, 10s timeout for sync, unlimited for async invocations)
**Project Type**: Web (React SPA + Supabase backend)
**Performance Goals**: Skeleton creation <2s, full population <45s, 100% idempotent
**Constraints**: Edge Function 10s timeout (sync), no duplicate data on retry, database-generated UUIDs with natural key mapping
**Scale/Scope**: 200 components + 20 drawings + 120 welds per demo project, seed file ~2,500-3,000 lines

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Type Safety First ✅
- TypeScript strict mode enforced in Edge Functions
- Database types auto-generated from Supabase schema
- No type assertions without justification
- Seed file uses proper TypeScript interfaces

### Principle II: Component-Driven Development ✅
- No UI components needed (backend-only feature)
- Existing dashboard/components pages consume populated data
- N/A for this backend data population feature

### Principle III: Testing Discipline ✅
- Integration tests for skeleton creation SQL function
- Integration tests for bulk population Edge Function
- Contract tests for seed data structure validation
- Idempotency tests (retry scenarios)

### Principle IV: Supabase Integration Patterns ✅
- RLS policies already exist on all tables (no new tables)
- Multi-tenant isolation via organization_id (demo projects isolated)
- Service role key used in Edge Functions (not frontend)
- Database-generated UUIDs with natural key lookups
- Remote database migrations only (no new migrations needed for this feature)

### Principle V: Specify Workflow Compliance ✅
- Spec created via `/specify` ✅
- Clarify completed via `/clarify` ✅
- Plan created via `/plan` (this document) ✅
- Tasks will follow via `/tasks`
- TDD: Tests before implementation

**Gate Status**: ✅ PASSED - No violations

## Project Structure

### Documentation (this feature)

```text
specs/023-demo-data-population/
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md  # Specification quality checklist
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output (commodity codes, milestone templates)
├── data-model.md        # Phase 1 output (seed data structure)
├── quickstart.md        # Phase 1 output (how to test demo population)
├── contracts/           # Phase 1 output (seed data schema, SQL function signature)
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT created yet)
```

### Source Code (repository root)

```text
supabase/
├── functions/
│   ├── demo-signup/
│   │   └── index.ts                    # MODIFIED: Add skeleton creation call
│   └── populate-demo-data/
│       ├── index.ts                    # NEW: Async bulk population handler
│       ├── seed-data.ts                # NEW: Declarative demo dataset (~2,500 lines)
│       └── insertion-logic.ts          # NEW: Bulk insert with natural key mapping
└── migrations/
    └── [NEW_MIGRATION]_create_demo_skeleton_function.sql  # NEW: SQL function for skeleton

src/
├── hooks/
│   └── useDemoPopulationStatus.ts      # NEW: Optional hook to show loading state
└── types/
    └── demo-seed.types.ts              # NEW: TypeScript interfaces for seed data

tests/
├── integration/
│   ├── demo-skeleton-creation.test.ts  # NEW: Test skeleton SQL function
│   ├── demo-bulk-population.test.ts    # NEW: Test Edge Function population
│   └── demo-idempotency.test.ts        # NEW: Test retry scenarios
└── contract/
    └── seed-data-structure.test.ts     # NEW: Validate seed file structure
```

**Structure Decision**: Web application (existing React SPA). New Supabase Edge Function (`populate-demo-data`) with seed data file. Modified existing `demo-signup` function. New SQL function for skeleton creation. No frontend changes (existing pages consume populated data).

## Complexity Tracking

> No constitution violations - table intentionally empty.

---

## Phase 0: Research & Technology Decisions

*Command: `/speckit.plan` generates this section*

### Research Tasks

1. **Commodity Code Sourcing** ✅
   - Decision: Query existing production projects for authentic commodity codes
   - Rationale: Provides realistic demo data matching actual usage patterns
   - Execution: Database query completed, commodity codes documented in design doc
   - Alternatives: Generate random codes (rejected: unrealistic), hardcode sample codes (rejected: not authentic)

2. **Milestone Template Analysis** ✅
   - Decision: Use existing progress templates from migration 00009
   - Rationale: Templates already define milestone sequences for each component type
   - Execution: Reviewed templates, documented in design doc (5 component types, 5-6 milestones each)
   - Alternatives: Create custom demo milestones (rejected: doesn't match production behavior)

3. **Edge Function Async Invocation Pattern** ✅
   - Decision: Use Supabase Edge Function invocation from another Edge Function
   - Rationale: Enables background processing without blocking user signup
   - Pattern: `await supabase.functions.invoke('populate-demo-data', { body: { projectId } })`
   - Alternatives: pg_cron (rejected: adds complexity), client-side polling (rejected: unreliable)

4. **Natural Key Lookup Strategy** ✅
   - Decision: Use Map data structure for drawing_number → UUID, component_tag → UUID
   - Rationale: O(1) lookup performance, simple to implement
   - Pattern: Insert entities, capture returned IDs via `.select()`, build Map, resolve references
   - Alternatives: Subqueries (rejected: slower), pre-defined UUIDs (rejected: not deterministic)

5. **Idempotency Strategy** ✅
   - Decision: Check for existing data before insertion using unique constraints
   - Rationale: Safe retry without duplicates, leverages existing database constraints
   - Pattern: `WHERE NOT EXISTS (SELECT 1 FROM components WHERE project_id = X AND identity_key = Y)`
   - Alternatives: Transaction rollback (rejected: partial success valuable), delete-and-recreate (rejected: loses user changes)

### Technology Choices

**Supabase Edge Functions (Deno)**
- Best practice: Use TypeScript with strict types
- Pattern: SECURITY DEFINER for skeleton SQL function, service role for Edge Function
- Justification: Existing infrastructure, built-in async support, no additional deployment

**Declarative Seed File**
- Best practice: Single TypeScript file with typed data structures
- Pattern: Export const with nested objects (areas, systems, components, welds, milestones)
- Justification: Versionable, easy to inspect, type-safe

**Database-Generated UUIDs**
- Best practice: Let PostgreSQL generate UUIDs, resolve via natural keys
- Pattern: Insert with `.select('id, natural_key')`, build lookup map
- Justification: Prevents ID conflicts, standard database practice

---

**Output**: research.md (to be generated with these findings)

## Phase 1: Design & Contracts

*Command: `/speckit.plan` generates data-model.md, contracts/, quickstart.md*

### Data Model

**Entities** (all existing, no new tables):

1. **Areas** (5 records)
   - Fields: id (UUID), project_id (UUID), name (TEXT)
   - Values: 'Pipe Rack', 'ISBL', 'Containment Area', 'Water Process', 'Cooling Tower'
   - Relationships: One-to-many with components, drawings

2. **Systems** (5 records)
   - Fields: id (UUID), project_id (UUID), name (TEXT)
   - Values: 'Air', 'Nitrogen', 'Steam', 'Process', 'Condensate'
   - Relationships: One-to-many with components, drawings

3. **Test Packages** (10 records)
   - Fields: id (UUID), project_id (UUID), name (TEXT)
   - Values: 'TP-01' through 'TP-10'
   - Relationships: One-to-many with components

4. **Welders** (4 records)
   - Fields: id (UUID), organization_id (UUID), stamp (TEXT), name (TEXT)
   - Values: JD-123/John Davis, SM-456/Sarah Miller, TR-789/Tom Rodriguez, KL-012/Kim Lee
   - Relationships: One-to-many with field_welds (via welder_id)

5. **Drawings** (20 records)
   - Fields: id (UUID), project_id (UUID), drawing_no_raw (TEXT), drawing_no_norm (TEXT), area, system
   - Identity: drawing_no_norm (auto-generated by trigger from drawing_no_raw)
   - Relationships: One-to-many with components, field_welds

6. **Components** (200 records)
   - Fields: id (UUID), project_id (UUID), component_type (TEXT), identity_key (JSONB), drawing_id (UUID FK), area_id (UUID FK), system_id (UUID FK), test_package_id (UUID FK), current_milestones (JSONB), percent_complete (NUMERIC)
   - Types: spool (40), support (80), valve (50), flange (20), instrument (10)
   - Identity keys: Type-specific (spool_id for spools, drawing_norm+commodity_code+size+seq for others)
   - Milestones: Type-specific progression (Receive → Install/Erect → Punch, 0% Test/Restore)

7. **Field Welds** (~120 records)
   - Fields: id (UUID), project_id (UUID), drawing_id (UUID FK), weld_number (TEXT), weld_type (TEXT), material (TEXT), welder_id (UUID FK nullable), date_welded (DATE nullable), current_milestones (JSONB)
   - Types: butt, socket (all carbon steel)
   - Welder assignment: Only when "Weld Made" milestone true (~65% of welds)
   - Relationships: Many-to-one with drawings, many-to-one with welders (nullable)

8. **Seed Data Structure** (TypeScript interface)
   - Skeleton: { areas: string[], systems: string[], packages: string[], welders: Welder[] }
   - Components: { tag: string, type: ComponentType, identity: IdentityKey, drawing: string, area: string, system: string, package: string }[]
   - Drawings: { drawing_number: string, area: string, system: string }[]
   - Welds: { weld_number: string, drawing: string, type: WeldType, material: string }[]
   - Milestones: { component_tag: string, receive?: boolean, install?: boolean, erect?: boolean, connect?: boolean, punch?: boolean }[]
   - Weld Assignments: { weld_number: string, welder_stamp: string, date_welded: string }[]

### API Contracts

**SQL Function: create_demo_skeleton**

```sql
-- Contract: Create foundation project structure synchronously
CREATE OR REPLACE FUNCTION create_demo_skeleton(
  p_user_id UUID,
  p_org_id UUID,
  p_project_id UUID
) RETURNS void AS $$
BEGIN
  -- Insert 5 areas, 5 systems, 10 packages, 4 welders
  -- Execution time: <2 seconds
  -- Idempotent: Safe to retry (ON CONFLICT DO NOTHING)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Edge Function: populate-demo-data**

```typescript
// Contract: Populate full demo dataset asynchronously
interface PopulateDemoDataRequest {
  projectId: string;
  organizationId: string;
}

interface PopulateDemoDataResponse {
  success: boolean;
  componentsCreated: number;
  drawingsCreated: number;
  weldsCreated: number;
  executionTimeMs: number;
  errors?: string[];
}

// Execution time: 30-45 seconds
// Idempotent: Safe to retry (checks existing data before insert)
```

**Seed Data Schema**

```typescript
// Contract: Declarative seed data structure
export interface DemoSeedData {
  // Phase 1: Skeleton (created by SQL function)
  skeleton: {
    areas: string[];      // 5 areas
    systems: string[];    // 5 systems
    packages: string[];   // 10 packages
    welders: {
      stamp: string;
      name: string;
    }[];                  // 4 welders
  };

  // Phase 2: Bulk data (created by Edge Function)
  drawings: {
    drawing_number: string;
    area: string;
    system: string;
  }[];                    // 20 drawings

  components: {
    tag: string;
    type: ComponentType;
    identity: IdentityKey;
    drawing: string;      // Natural key reference
    area: string;
    system: string;
    package: string;
  }[];                    // 200 components

  welds: {
    weld_number: string;
    drawing: string;      // Natural key reference
    type: 'butt' | 'socket';
    material: 'CS';
  }[];                    // ~120 welds

  milestones: {
    component_tag: string;
    receive?: boolean;
    install?: boolean;
    erect?: boolean;
    connect?: boolean;
    punch?: boolean;
  }[];                    // 200 component milestone states

  weld_milestones: {
    weld_number: string;
    fit_up?: boolean;
    weld_made?: boolean;
    punch?: boolean;
  }[];                    // ~120 weld milestone states

  weld_assignments: {
    weld_number: string;
    welder_stamp: string;
    date_welded: string;
  }[];                    // ~78 assignments (65% of welds)
}
```

---

**Output**: data-model.md, contracts/, quickstart.md (to be generated)

## Phase 2: Task Breakdown

*Command: `/speckit.tasks` generates tasks.md (NOT created by `/speckit.plan`)*

**Task categories** (detailed breakdown in tasks.md):

1. **Database Setup**
   - Create SQL migration for `create_demo_skeleton` function
   - Test skeleton function creates correct structure

2. **Seed Data Creation**
   - Generate seed-data.ts with 200 components, 20 drawings, 120 welds
   - Validate seed data structure (counts, relationships, commodity codes)

3. **Edge Function Implementation**
   - Create populate-demo-data Edge Function handler
   - Implement insertion logic with natural key mapping
   - Test bulk population creates all entities correctly

4. **Integration**
   - Modify demo-signup to call skeleton function
   - Modify demo-signup to invoke populate-demo-data async
   - Test end-to-end demo signup flow

5. **Idempotency & Error Handling**
   - Implement retry logic with duplicate detection
   - Test population retry scenarios
   - Add error logging for debugging

---

## Constitution Compliance

**Version**: 1.0.2 | **Ratified**: 2025-10-04 | **Last Amended**: 2025-10-23

**Compliance Summary**:
- ✅ Type Safety First: TypeScript strict mode, database types, no assertions
- ✅ Component-Driven: N/A (backend feature)
- ✅ Testing Discipline: Integration tests for SQL function, Edge Function, idempotency
- ✅ Supabase Patterns: RLS policies exist, service role usage, database-generated UUIDs
- ✅ Specify Workflow: Spec → Clarify → Plan → Tasks → Implement

**No violations requiring justification.**
