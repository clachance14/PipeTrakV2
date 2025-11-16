# Implementation Plan: Aggregate Threaded Pipe Import

**Branch**: `027-aggregate-threaded-pipe-import` | **Date**: 2025-11-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/027-aggregate-threaded-pipe-import/spec.md`

## Summary

Change threaded pipe CSV imports from creating discrete component instances (1 per unit) to aggregate tracking (1 component per drawing+commodity+size representing total linear feet). This reduces component proliferation, improves data clarity, and maintains accurate milestone tracking with absolute linear feet storage. The implementation modifies the Supabase Edge Function import logic to skip quantity explosion for threaded_pipe type, creates components with pipe_id identity keys using -AGG suffix, sums quantities for duplicate identities, stores milestones as absolute LF values (Fabricate_LF, Install_LF, etc.), and enhances the frontend UI to display linear footage with calculated percentage display. Requires Migration 00097 to convert existing milestone storage and update trigger function.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.3, Node.js 18+ (Edge Functions)
**Primary Dependencies**: Supabase JS Client v2, TanStack Query v5, React 18, Vite, Tailwind CSS v4
**Storage**: Supabase PostgreSQL (remote only), JSONB for identity_key and attributes
**Testing**: Vitest + Testing Library (jsdom), integration tests via service role client
**Target Platform**: Web (desktop-first, mobile responsive ≤1024px per Feature 015)
**Project Type**: Web application (React SPA + Supabase Edge Functions backend)
**Performance Goals**: CSV import handles 1000+ rows in <5 seconds, UI renders 10,000+ components via virtualization
**Constraints**: Zero breaking changes to non-threaded-pipe imports, preserve existing milestone semantics, ≥70% test coverage
**Scale/Scope**: Affects 1 component type (threaded_pipe out of 11 total), 2 frontend components, 1 Edge Function, 1 CSV validator update, 1 database migration (00097) required to convert milestone storage and update trigger function

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Type Safety First ✅

- **TypeScript strict mode**: All code uses strict:true with noUncheckedIndexedAccess
- **Database types**: Components use auto-generated `Database['public']['Tables']['components']` types
- **No type assertions**: No `as` keyword usage (identity_key is properly typed as JSONB Record)
- **Path aliases**: All imports use `@/` prefix for cross-directory references

**Status**: COMPLIANT - No violations

### Principle II: Component-Driven Development ✅

- **UI components**: Enhancements to existing ComponentRow and PartialMilestoneInput in `src/components/drawing-table/`
- **Single responsibility**: Each component handles one concern (display vs input)
- **TanStack Query**: All Supabase calls wrapped in useQuery/useMutation hooks (no new queries needed, existing hooks sufficient)
- **Layout wrappers**: Drawings page already has Layout component (no changes needed)

**Status**: COMPLIANT - Leverages existing component patterns

### Principle III: Testing Discipline ✅

- **TDD mandatory**: Tests written before implementation (Red-Green-Refactor cycle)
- **Colocated tests**: ComponentRow.test.tsx, PartialMilestoneInput.test.tsx alongside components
- **Integration tests**: `tests/integration/import-aggregate-threaded-pipe.test.ts` covers Edge Function → DB → frontend flow
- **Coverage target**: ≥70% per constitution (expected 75-80% for this feature)

**Status**: COMPLIANT - TDD workflow planned in Phase 2

### Principle IV: Supabase Integration Patterns ✅

- **RLS enabled**: No new tables (components table already has RLS)
- **Multi-tenant isolation**: Existing `organization_id` RLS policies unchanged
- **Environment validation**: Edge Function uses existing Supabase client initialization
- **TanStack Query**: Existing `useComponents` hook covers new aggregate model (no schema changes)
- **Remote migrations**: Migration 00097 required to:
  - Convert existing milestone storage from percentages to absolute LF (Fabricate → Fabricate_LF, etc.)
  - Backfill line_numbers array from single line_number field
  - Update calculate_component_percent trigger to handle absolute LF milestone values

**Status**: COMPLIANT - Follows migration pattern with backward-compatible JSONB changes

### Principle V: Specify Workflow Compliance ✅

- **Planning Phase**: `/specify` (complete) → `/plan` (this document) → `/tasks` (Phase 2)
- **Quality Assurance**: `/analyze` recommended before implementation (cross-artifact check)
- **Execution**: `/implement` will execute tasks with per-task commits
- **Documentation**: All artifacts in `specs/027-aggregate-threaded-pipe-import/` directory
- **Constitution gates**: All gates passed (see sections above)

**Status**: COMPLIANT - Following complete workflow

### Final Gate Status: ✅ PASSED

All constitution principles satisfied. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/027-aggregate-threaded-pipe-import/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file (Phase 0-1 output)
├── research.md          # Phase 0: Technical decisions and patterns
├── data-model.md        # Phase 1: Component identity and attributes structure
├── quickstart.md        # Phase 1: Developer onboarding for this feature
├── contracts/           # Phase 1: Edge Function request/response schemas
│   └── import-takeoff.json  # Updated contract with aggregate behavior
├── checklists/
│   └── requirements.md  # Specification quality checklist (complete)
└── tasks.md             # Phase 2: Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# Web application structure (React SPA + Supabase backend)

# Frontend (React 18 + TypeScript)
src/
├── components/
│   └── drawing-table/
│       ├── ComponentRow.tsx             # [MODIFY] Add "(X LF)" suffix display
│       ├── ComponentRow.test.tsx        # [MODIFY] Add aggregate display tests
│       ├── PartialMilestoneInput.tsx    # [MODIFY] Add linear feet helper text
│       └── PartialMilestoneInput.test.tsx  # [MODIFY] Add helper text tests
├── types/
│   └── database.types.ts                # [NO CHANGE] Existing types sufficient
└── hooks/
    └── useComponents.ts                 # [NO CHANGE] Existing hook works with aggregate model

# Backend (Supabase Edge Functions)
supabase/functions/import-takeoff/
├── index.ts                             # [NO CHANGE] Entry point unchanged
├── transaction-v2.ts                    # [MODIFY] Add threaded_pipe aggregate logic (lines 332-366)
├── payload-validator.ts                 # [MODIFY] Add QTY > 0 validation for threaded_pipe
└── validator.ts                         # [NO CHANGE] TYPE enum already includes Threaded_Pipe

# Tests
tests/
├── integration/
│   └── import-aggregate-threaded-pipe.test.ts  # [NEW] End-to-end import → display test
└── unit/
    └── transaction-v2.test.ts           # [MODIFY] Add aggregate creation tests
```

**Structure Decision**: Web application (single-tenant React SPA + serverless Edge Functions). No new directories needed - all changes fit existing structure. Frontend changes isolated to `drawing-table/` components, backend changes isolated to `import-takeoff/` Edge Function.

## Complexity Tracking

> **No violations** - This section intentionally left empty

All constitution gates passed without exceptions. No complexity justifications required.

---

## Phase 0: Research & Technical Decisions

**Status**: In Progress

### Research Tasks

1. **Supabase JSONB null value handling**
   - **Question**: Does PostgreSQL UNIQUE constraint correctly handle identity_key with seq:null vs seq:1?
   - **Reason**: Need to ensure aggregate (seq:null) and discrete (seq:1) components can coexist without conflicts

2. **TanStack Query cache invalidation for quantity updates**
   - **Question**: When re-import updates total_linear_feet, does useComponents hook automatically refetch?
   - **Reason**: Must ensure UI displays updated quantity without manual refresh

3. **Edge Function transaction behavior for upsert logic**
   - **Question**: How to handle SELECT → UPDATE pattern within existing transaction boundary?
   - **Reason**: Quantity summing requires checking for existing component before insert/update

4. **React component rendering optimization**
   - **Question**: Does conditional helper text rendering affect virtualization performance?
   - **Reason**: Drawing table uses react-virtual for 10,000+ row performance

### Consolidation Target

**Output**: `research.md` documenting:
- JSONB null value uniqueness behavior (with examples)
- TanStack Query invalidation strategy (mutation pattern)
- Edge Function transaction pattern (SELECT + upsert within tx)
- Component rendering performance impact (measurement plan)

---

## Phase 1: Design & Contracts

**Status**: Pending (depends on Phase 0 completion)

### Artifacts to Generate

1. **data-model.md**:
   - Aggregate component identity_key structure (`{drawing_norm, commodity_code, size, seq: null}`)
   - attributes.total_linear_feet field semantics
   - Milestone percentage → linear feet mapping
   - Comparison: aggregate vs discrete component models

2. **contracts/import-takeoff.json**:
   - Edge Function request/response schema
   - Threaded_pipe aggregate creation behavior
   - Quantity summing for duplicate identities
   - Error codes for validation failures (QTY ≤ 0)

3. **quickstart.md**:
   - How to test aggregate import locally
   - Sample CSV with threaded pipe rows
   - Expected database state after import
   - How to verify UI displays correctly

### Agent Context Update

After Phase 1 completion:
```bash
.specify/scripts/bash/update-agent-context.sh claude
```

This updates `.claude/CLAUDE.md` with:
- Feature 027: Aggregate Threaded Pipe Import summary
- New import behavior for threaded_pipe type
- Frontend display enhancements (LF suffix, helper text)

---

## Phase 2: Task Breakdown

**Status**: Pending (created by `/speckit.tasks` command, NOT by `/plan`)

**Expected Output**: `tasks.md` with ordered tasks following TDD workflow:
1. Write failing tests for aggregate import
2. Implement Edge Function changes
3. Write failing tests for UI enhancements
4. Implement ComponentRow changes
5. Implement PartialMilestoneInput changes
6. Integration tests for end-to-end flow

**Dependencies**:
- Phase 0 research complete (technical decisions documented)
- Phase 1 design complete (contracts and data model validated)
- Constitution gates re-verified (all still passing)

---

## Implementation Approach

### Backend Changes (Supabase Edge Function)

**File**: `/supabase/functions/import-takeoff/transaction-v2.ts` (lines 332-366)

**Current Logic**:
```typescript
// Quantity explosion for all types
for (let i = 1; i <= row.qty; i++) {
  components.push({
    ...baseComponent,
    identity_key: { ..., seq: i }
  });
}
```

**New Logic**:
```typescript
if (typeLower === 'threaded_pipe') {
  // Aggregate model: use pipe_id with -AGG suffix
  const pipeId = `${normalized}-${normalizeSize(row.size)}-${row.cmdtyCode}-AGG`;
  const identityKey = { pipe_id: pipeId };

  const existing = await tx
    .from('components')
    .select('id, attributes, current_milestones')
    .eq('project_id', projectId)
    .eq('component_type', 'threaded_pipe')
    .eq('identity_key', identityKey)
    .maybeSingle();

  if (existing) {
    // Sum quantities and append line number
    const newTotal = (existing.attributes?.total_linear_feet || 0) + row.qty;
    const lineNumbers = existing.attributes?.line_numbers || [];
    if (!lineNumbers.includes(row.lineNumber)) {
      lineNumbers.push(row.lineNumber);
    }

    await tx.from('components').update({
      attributes: {
        ...existing.attributes,
        total_linear_feet: newTotal,
        line_numbers: lineNumbers
      }
      // current_milestones preserved (absolute LF values)
    }).eq('id', existing.id);
  } else {
    // Create new aggregate with absolute LF milestones
    components.push({
      ...baseComponent,
      identity_key: identityKey,
      attributes: {
        ...baseComponent.attributes,
        total_linear_feet: row.qty,
        line_numbers: [row.lineNumber]
      },
      current_milestones: {
        Fabricate_LF: 0, Install_LF: 0, Erect_LF: 0,
        Connect_LF: 0, Support_LF: 0,
        Punch: false, Test: false, Restore: false
      }
    });
  }
} else {
  // Existing quantity explosion for all other types
  for (let i = 1; i <= row.qty; i++) { /* ... */ }
}
```

### Frontend Changes

**File**: `/src/components/drawing-table/ComponentRow.tsx`

**Display Enhancement**:
```typescript
const isAggregateThreadedPipe =
  component.component_type === 'threaded_pipe' &&
  component.identity_key.pipe_id?.endsWith('-AGG');

const lineNumbers = component.attributes?.line_numbers || [];
const totalLF = component.attributes?.total_linear_feet || component.attributes?.original_qty || 0;

const displayLineNumber = isAggregateThreadedPipe
  ? lineNumbers.length === 1
    ? `${lineNumbers[0]} (${totalLF} LF)`
    : `${lineNumbers[0]} +${lineNumbers.length - 1} more (${totalLF} LF)`
  : component.attributes.line_number || component.identity_key.seq || 'N/A';

// Tooltip for multi-line aggregates
const lineNumberTooltip = isAggregateThreadedPipe && lineNumbers.length > 1
  ? `Line numbers: ${lineNumbers.join(', ')}`
  : undefined;
```

**File**: `/src/components/drawing-table/PartialMilestoneInput.tsx`

**Helper Text Enhancement**:
```typescript
const isAggregateThreadedPipe =
  component.component_type === 'threaded_pipe' &&
  component.identity_key.pipe_id?.endsWith('-AGG');

const totalLF = component.attributes?.total_linear_feet;
const linearFeet = totalLF && isAggregateThreadedPipe
  ? Math.round((value / 100) * totalLF)
  : null;

// Render helper text below input (calculated LF from percentage input)
{linearFeet !== null && (
  <span className="text-xs text-gray-500">
    {linearFeet} LF of {totalLF} LF
  </span>
)}
```

**Note**: User enters percentage (0-100), UI shows helper text in LF, backend stores absolute LF value (Fabricate_LF field).

### CSV Validator Changes

**File**: `/src/lib/csv/csv-validator.ts` (lines 120-138)

**Current Logic**:
```typescript
// Reject all duplicate identity keys
if (identityMap.has(identityString)) {
  errors.push({
    row: index + 2,
    field: 'DUPLICATE',
    message: `Duplicate identity: ${identityString}`
  });
}
```

**New Logic**:
```typescript
// Allow duplicates for threaded_pipe (will be summed in Edge Function)
if (identityMap.has(identityString)) {
  if (typeLower !== 'threaded_pipe') {
    errors.push({
      row: index + 2,
      field: 'DUPLICATE',
      message: `Duplicate identity: ${identityString}`
    });
  }
  // For threaded_pipe: allow duplicates, skip validation error
}
```

**Rationale**: Threaded pipe quantities are summed during import (User Story 2), so duplicate identities are expected and valid. Non-threaded components still reject duplicates (existing behavior preserved).

### Database Migration

**Migration**: `00097_threaded_pipe_aggregate_model.sql`

**Actions**:
1. **Convert milestone storage** for existing threaded_pipe components:
   ```sql
   UPDATE components
   SET current_milestones = jsonb_build_object(
     'Fabricate_LF', COALESCE((current_milestones->>'Fabricate')::numeric / 100 * (attributes->>'total_linear_feet')::numeric, 0),
     'Install_LF', COALESCE((current_milestones->>'Install')::numeric / 100 * (attributes->>'total_linear_feet')::numeric, 0),
     -- ... other partial milestones
     'Punch', (current_milestones->>'Punch')::boolean,
     'Test', (current_milestones->>'Test')::boolean,
     'Restore', (current_milestones->>'Restore')::boolean
   )
   WHERE component_type = 'threaded_pipe'
     AND identity_key ? 'pipe_id'
     AND identity_key->>'pipe_id' LIKE '%-AGG';
   ```

2. **Backfill line_numbers array**:
   ```sql
   UPDATE components
   SET attributes = jsonb_set(
     attributes,
     '{line_numbers}',
     CASE
       WHEN attributes ? 'line_number'
       THEN jsonb_build_array(attributes->>'line_number')
       ELSE '[]'::jsonb
     END
   )
   WHERE component_type = 'threaded_pipe';
   ```

3. **Update calculate_component_percent trigger function**:
   ```sql
   CREATE OR REPLACE FUNCTION calculate_component_percent()
   RETURNS trigger AS $$
   BEGIN
     IF NEW.component_type = 'threaded_pipe' AND
        NEW.identity_key->>'pipe_id' LIKE '%-AGG' THEN
       -- Aggregate threaded pipe: calculate from absolute LF
       NEW.percent_complete :=
         ((NEW.current_milestones->>'Fabricate_LF')::numeric / (NEW.attributes->>'total_linear_feet')::numeric * 16) +
         ((NEW.current_milestones->>'Install_LF')::numeric / (NEW.attributes->>'total_linear_feet')::numeric * 16) +
         -- ... other partial milestones
         CASE WHEN (NEW.current_milestones->>'Punch')::boolean THEN 5 ELSE 0 END +
         CASE WHEN (NEW.current_milestones->>'Test')::boolean THEN 10 ELSE 0 END +
         CASE WHEN (NEW.current_milestones->>'Restore')::boolean THEN 5 ELSE 0 END;
     ELSE
       -- Existing logic for all other components (percentage-based)
       NEW.percent_complete := ... existing calculation ...
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   ```

**Rollback**: Reverse conversions (absolute LF → percentage, array → string)

### Testing Strategy

**Unit Tests** (`/tests/unit/transaction-v2.test.ts`):
- Aggregate creation (QTY=100 → 1 component with pipe_id ending in -AGG)
- Identity key structure verification (pipe_id format: "P001-1-PIPE-SCH40-AGG")
- Quantity summing (50 + 50 → 100 total_linear_feet)
- Line numbers array appending (["101"] → ["101", "205"])
- Absolute LF milestone initialization (Fabricate_LF: 0, Install_LF: 0, etc.)
- Milestone preservation on update (absolute LF values preserved)
- Mixed import (threaded_pipe + valves)

**Component Tests**:
- `ComponentRow.test.tsx`: Aggregate display with "+X more (X LF)" format and tooltip
- `PartialMilestoneInput.test.tsx`: Helper text rendering and LF calculation

**Integration Tests** (`/tests/integration/import-aggregate-threaded-pipe.test.ts`):
- End-to-end: CSV → Edge Function → Database → TanStack Query → UI
- Duplicate identity summing across multiple imports
- CSV validator allows threaded_pipe duplicates (rejects other type duplicates)
- Validation: QTY ≤ 0 rejection

**Migration Tests**:
- Verify existing discrete threaded_pipe components (if any) are migrated correctly
- Verify absolute LF milestone conversion preserves progress percentages
- Verify trigger function calculates percent_complete correctly for both old and new schemas

---

## Next Steps

1. **Complete Phase 0**: Generate `research.md` with technical decisions
2. **Complete Phase 1**: Generate `data-model.md`, `contracts/`, `quickstart.md`
3. **Update agent context**: Run `.specify/scripts/bash/update-agent-context.sh claude`
4. **Run `/speckit.tasks`**: Generate ordered task breakdown
5. **Run `/speckit.analyze`** (recommended): Verify cross-artifact consistency
6. **Run `/speckit.implement`**: Execute tasks with TDD workflow

---

**Constitution Version**: 1.0.2 (ratified 2025-10-04, amended 2025-10-23)
**Plan Status**: Phase 0-1 Complete | Phase 2 Pending (`/speckit.tasks` command)
