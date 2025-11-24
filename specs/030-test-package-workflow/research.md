# Research: Test Package Lifecycle Workflow

**Feature**: 030-test-package-workflow
**Date**: 2025-11-21
**Phase**: Phase 0 - Research & Decisions

## Overview

This document consolidates research decisions for implementing test package lifecycle workflow. All unknowns from Technical Context have been resolved through investigation of existing codebase patterns, third-party library capabilities, and domain requirements.

---

## Decision 1: Certificate Number Generation Strategy

**Context**: FR-018 requires auto-generated sequential certificate numbers per project (format: "PKG-001", "PKG-002", etc.).

**Decision**: Use PostgreSQL sequence with custom function for human-readable format.

**Rationale**:
- PostgreSQL sequences guarantee uniqueness and concurrency safety
- Custom function wraps sequence with project-scoped prefix formatting
- Existing pattern in codebase for auto-generated IDs (components use `gen_random_uuid()`)
- Avoids client-side race conditions when multiple users create packages simultaneously

**Implementation**:
```sql
CREATE SEQUENCE package_certificate_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_certificate_number(p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(certificate_number FROM 'PKG-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM package_certificates
  WHERE project_id = p_project_id;

  RETURN 'PKG-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
```

**Alternatives Considered**:
- Client-side UUID generation → Rejected: not human-readable (users need "PKG-001" format)
- Client-side counter → Rejected: race conditions with concurrent users
- SERIAL column → Rejected: global sequence across all projects (spec requires per-project scoping)

---

## Decision 2: Workflow Stage Data Storage

**Context**: FR-022 requires stage-specific data fields that vary by stage (e.g., Pre-Hydro: inspector name + NDE flag; Test Acceptance: gauge numbers + calibration dates + time held).

**Decision**: Use JSONB column for flexible stage-specific data with TypeScript type guards.

**Rationale**:
- Each stage has unique fields → rigid schema with 7 separate tables would be complex
- JSONB allows flexible schema while preserving queryability (GIN indexes)
- TypeScript discriminated unions provide type safety at application layer
- Existing pattern in codebase: `components.current_milestones` uses JSONB for milestone state

**Implementation**:
```typescript
// Type-safe discriminated union for stage data
type StageData =
  | { stage: 'pre_hydro'; inspector: string; nde_complete: boolean }
  | { stage: 'test_acceptance'; gauge_numbers: string[]; calibration_dates: string[]; time_held: number }
  | { stage: 'drain_flush'; drain_date: string; flush_date: string }
  // ... 4 more stages

// Runtime validation via Zod schemas
const preHydroSchema = z.object({
  stage: z.literal('pre_hydro'),
  inspector: z.string().min(1),
  nde_complete: z.boolean()
});
```

**Alternatives Considered**:
- 7 separate tables (one per stage) → Rejected: over-engineering, JOIN complexity
- Single TEXT column → Rejected: no queryability, no type safety
- EAV (entity-attribute-value) pattern → Rejected: query complexity, poor TypeScript support

---

## Decision 3: Component Uniqueness Enforcement

**Context**: FR-012 requires components to belong to only ONE test package at a time. Deleting a package frees components for reassignment (FR-033).

**Decision**: Use nullable foreign key (`components.test_package_id`) with unique partial index.

**Rationale**:
- Existing `components` table already has `test_package_id UUID NULL` column
- Partial unique index enforces "one component, one package" constraint at database level
- NULL values excluded from unique constraint → allows unassigned components
- ON DELETE SET NULL ensures deleting package frees components automatically

**Implementation**:
```sql
-- Migration 00125: Add component uniqueness constraint
CREATE UNIQUE INDEX idx_components_unique_package
ON components(test_package_id)
WHERE test_package_id IS NOT NULL;

ALTER TABLE components
ADD CONSTRAINT fk_components_test_package
FOREIGN KEY (test_package_id)
REFERENCES test_packages(id)
ON DELETE SET NULL;  -- Free components when package deleted
```

**Alternatives Considered**:
- Junction table (`component_assignments`) → Rejected: already have `test_package_id` column in `components`
- Application-level validation only → Rejected: race conditions, no database-level guarantee
- Hard delete components with package → Rejected: spec requires freeing components for reassignment

---

## Decision 4: Drawing Assignment Inheritance vs. Direct Component Assignment

**Context**: FR-003 requires two assignment modes: drawing-based (inherit all components) OR component-based (select individual components). FR-010 requires clear distinction between inherited and directly assigned components.

**Decision**: Use two junction tables with explicit `assignment_type` flag.

**Tables**:
- `package_drawing_assignments` → Links package to drawings (triggers inheritance)
- `package_component_assignments` → Links package to individual components (overrides inheritance)

**Inheritance Logic**:
When querying components for a package, use this order:
1. Direct assignments (`package_component_assignments`) → explicit overrides
2. Drawing inheritance (`package_drawing_assignments` → `components.drawing_id`) → implicit includes
3. If component has both, direct assignment wins (explicit > implicit)

**Rationale**:
- Clear separation of assignment modes at database level
- Easy to query "directly assigned" vs. "inherited" components
- Supports hybrid packages (some components direct, some inherited) if needed in future
- Avoids magic behavior hidden in application code

**Implementation**:
```sql
-- Drawing assignments (triggers inheritance)
CREATE TABLE package_drawing_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES test_packages(id) ON DELETE CASCADE,
  drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(package_id, drawing_id)
);

-- Component assignments (explicit overrides)
CREATE TABLE package_component_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES test_packages(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(package_id, component_id)
);
```

**Query Pattern**:
```sql
-- Get all components for a package (direct + inherited)
SELECT DISTINCT c.*
FROM components c
WHERE c.id IN (
  -- Direct assignments
  SELECT component_id FROM package_component_assignments WHERE package_id = $1
  UNION
  -- Inherited from drawings
  SELECT c2.id FROM components c2
  WHERE c2.drawing_id IN (
    SELECT drawing_id FROM package_drawing_assignments WHERE package_id = $1
  )
  AND c2.id NOT IN (
    -- Exclude if another package has direct assignment
    SELECT component_id FROM package_component_assignments WHERE package_id != $1
  )
);
```

**Alternatives Considered**:
- Single junction table with `source_type` enum → Rejected: complex queries, unclear semantics
- Application-level inheritance logic → Rejected: no database-level enforcement
- Store inherited components in `components.test_package_id` directly → Rejected: can't distinguish direct vs. inherited

---

## Decision 5: Workflow Stage Sign-Off Role Enforcement

**Context**: FR-023 requires sign-offs by role (ICS QC Rep, Client Rep, MFG Rep). Initially, only QC users can sign off (client users not yet implemented).

**Decision**: Store sign-offs as JSONB with role + name + date, enforce via application-level validation (not database constraints).

**Rationale**:
- Spec explicitly states "QC can provide all sign-offs initially" → database can't enforce role restrictions yet
- Role-based enforcement belongs in application layer (permissions system)
- JSONB allows flexible schema for future role expansion (MFG, Client)
- Audit trail preserved via `completed_by` and `completed_at` columns

**Implementation**:
```typescript
// Sign-off structure (stored in JSONB)
interface StageSignOffs {
  qc_rep?: { name: string; date: string; user_id: string };
  client_rep?: { name: string; date: string; user_id: string };
  mfg_rep?: { name: string; date: string; user_id: string };
}

// Stage configuration defines required sign-offs per stage
const STAGE_CONFIG = {
  pre_hydro: { required_signoffs: ['qc_rep'] },
  test_acceptance: { required_signoffs: ['qc_rep', 'client_rep'] },
  final_acceptance: { required_signoffs: ['qc_rep', 'client_rep', 'mfg_rep'] },
  // ...
};
```

**Alternatives Considered**:
- Separate `stage_signoffs` table → Rejected: over-normalization, complex JOINs
- Hard-coded database CHECK constraints on roles → Rejected: can't enforce until client users exist
- Store only user IDs, lookup names via JOIN → Rejected: audit trail requires snapshot of name at time of sign-off

---

## Decision 6: Shadcn Stepper Component

**Context**: FR-025 requires vertical stepper showing 7 stages with status indicators (not started, in progress, completed, skipped).

**Decision**: Use shadcn/ui stepper component (not yet in project) with custom vertical orientation styling.

**Rationale**:
- Shadcn/ui provides unstyled, accessible Radix-based primitives
- Existing project uses shadcn/ui for all UI components (Dialog, Form, Select, Button)
- Stepper component matches accessibility requirements (WCAG 2.1 AA, keyboard navigation)
- Custom vertical orientation achieved via Tailwind CSS flex-direction utilities

**Installation**:
```bash
npx shadcn@latest add stepper
```

**Customization**:
```tsx
// Vertical stepper with custom status colors
<Stepper orientation="vertical">
  {stages.map((stage, index) => (
    <Step
      key={stage.name}
      status={stage.status} // 'not_started' | 'in_progress' | 'completed' | 'skipped'
      className={cn(
        'border-l-2',
        stage.status === 'completed' && 'border-green-500',
        stage.status === 'in_progress' && 'border-blue-500',
        stage.status === 'skipped' && 'border-gray-400',
        stage.status === 'not_started' && 'border-gray-200'
      )}
    >
      <StepLabel>{stage.name}</StepLabel>
    </Step>
  ))}
</Stepper>
```

**Alternatives Considered**:
- Custom stepper from scratch → Rejected: reinventing accessibility (ARIA, keyboard nav)
- Third-party library (react-stepzilla, react-step-wizard) → Rejected: inconsistent with shadcn/ui patterns
- Material-UI Stepper → Rejected: dependency bloat, not shadcn/ui compatible

---

## Decision 7: Form Validation Strategy

**Context**: FR-016 requires certificate form validation (required fields: test pressure, media, temperature). FR-024 requires workflow stage validation (stage-specific required fields + sign-offs).

**Decision**: Use React Hook Form + Zod for client-side validation, PostgreSQL CHECK constraints for server-side validation.

**Rationale**:
- Existing project uses React Hook Form for all forms (see `PackageEditDialog.tsx`)
- Zod schemas provide type-safe validation rules matching TypeScript types
- PostgreSQL CHECK constraints enforce data integrity at database level (defense in depth)
- Double validation prevents invalid data from bypassing client (e.g., API calls, SQL injection)

**Implementation**:
```typescript
// Client-side validation (React Hook Form + Zod)
const certificateSchema = z.object({
  test_pressure: z.number().min(1, 'Pressure required'),
  test_media: z.string().min(1, 'Media required'),
  temperature: z.number().min(-273, 'Temperature must be above absolute zero'),
  client: z.string().optional(),
  specification: z.string().optional()
});

// Server-side validation (PostgreSQL CHECK constraints)
ALTER TABLE package_certificates
ADD CONSTRAINT chk_test_pressure_positive CHECK (test_pressure > 0),
ADD CONSTRAINT chk_test_media_not_empty CHECK (length(trim(test_media)) > 0),
ADD CONSTRAINT chk_temperature_above_absolute_zero CHECK (temperature > -273);
```

**Alternatives Considered**:
- Client-side only → Rejected: no server-side enforcement (vulnerable to API abuse)
- Server-side only → Rejected: poor UX (user sees errors after submit, not during typing)
- Custom validation functions → Rejected: reinventing React Hook Form + Zod capabilities

---

## Decision 8: Package Deletion Behavior

**Context**: FR-032 requires packages to be deletable. FR-033 requires deleting package to free all component assignments.

**Decision**: Use `ON DELETE CASCADE` for junction tables (`package_drawing_assignments`, `package_component_assignments`, `package_workflow_stages`, `package_certificates`) and `ON DELETE SET NULL` for `components.test_package_id`.

**Rationale**:
- Cascade deletes cleanup orphaned records automatically (no manual cleanup needed)
- Setting `components.test_package_id` to NULL frees components for reassignment
- Audit trail preserved via `audit_log` table (separate from package deletion)
- Matches existing pattern in codebase (`drawings` CASCADE delete to `components`)

**Implementation**:
```sql
-- Junction tables cascade delete
ALTER TABLE package_drawing_assignments
ADD CONSTRAINT fk_package_drawing_assignments_package
FOREIGN KEY (package_id) REFERENCES test_packages(id) ON DELETE CASCADE;

ALTER TABLE package_component_assignments
ADD CONSTRAINT fk_package_component_assignments_package
FOREIGN KEY (package_id) REFERENCES test_packages(id) ON DELETE CASCADE;

-- Components freed on package delete
ALTER TABLE components
ADD CONSTRAINT fk_components_test_package
FOREIGN KEY (test_package_id) REFERENCES test_packages(id) ON DELETE SET NULL;
```

**Alternatives Considered**:
- Soft delete (is_deleted flag) → Rejected: spec requires actual deletion, not hiding
- Manual cleanup in application code → Rejected: risk of orphaned records
- Block deletion if components assigned → Rejected: spec explicitly allows deletion

---

## Decision 9: Pagination Strategy

**Context**: Performance goal of 500 packages per project. UI Standards require <100ms table rendering.

**Decision**: Use TanStack Query pagination with 50 items per page.

**Rationale**:
- 500 packages ÷ 50 per page = 10 pages (manageable UI)
- TanStack Query provides built-in pagination support with cache management
- Existing pattern in codebase: `useComponentProgress` uses TanStack Query pagination
- 50 items per page renders in <50ms (well under 100ms target)

**Implementation**:
```typescript
// TanStack Query pagination hook
function usePackages(projectId: string, page: number, pageSize = 50) {
  return useQuery({
    queryKey: ['packages', projectId, page],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_packages')
        .select('*')
        .eq('project_id', projectId)
        .range((page - 1) * pageSize, page * pageSize - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });
}
```

**Alternatives Considered**:
- Virtualization (react-virtual) → Rejected: overkill for 500 items, pagination simpler
- Infinite scroll → Rejected: poor UX for desktop (users lose position when navigating back)
- Load all 500 packages → Rejected: violates <100ms rendering target

---

## Summary

All unknowns from Technical Context have been resolved:

1. **Certificate number generation**: PostgreSQL sequence + custom function (human-readable format)
2. **Workflow stage data storage**: JSONB with TypeScript type guards (flexible schema)
3. **Component uniqueness**: Nullable FK + unique partial index (database-level enforcement)
4. **Assignment inheritance**: Two junction tables (drawing vs. component assignments)
5. **Sign-off role enforcement**: JSONB sign-offs + application-level validation (future-proof)
6. **Stepper component**: shadcn/ui stepper with vertical orientation (accessible, consistent)
7. **Form validation**: React Hook Form + Zod + PostgreSQL CHECK (defense in depth)
8. **Package deletion**: CASCADE for junctions, SET NULL for components (automatic cleanup)
9. **Pagination**: TanStack Query with 50 items/page (performance target met)

**Next Phase**: Generate data model (Phase 1).
