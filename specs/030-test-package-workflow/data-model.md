# Data Model: Test Package Lifecycle Workflow

**Feature**: 030-test-package-workflow
**Date**: 2025-11-21
**Phase**: Phase 1 - Design

## Overview

This document defines the database schema for test package lifecycle workflow. It includes 5 new/modified tables to support package certificates, workflow stages, and flexible drawing/component assignments.

**Schema Changes**:
1. Extend existing `test_packages` table with `test_type` column
2. Create `package_certificates` table (certificate form data)
3. Create `package_workflow_stages` table (7-stage workflow tracking)
4. Create `package_drawing_assignments` table (drawing-based inheritance)
5. Create `package_component_assignments` table (component-based direct assignment)
6. Add unique constraint to `components.test_package_id` (component uniqueness)

---

## Entity Relationship Diagram

```text
┌─────────────────────┐
│   test_packages     │ (existing, modified)
│─────────────────────│
│ id (PK)             │◄──────┐
│ project_id (FK)     │       │
│ name                │       │
│ description         │       │
│ test_type (NEW)     │       │ 1:1
│ target_date         │       │
│ created_at          │       │
└─────────────────────┘       │
         │                    │
         │ 1:1                │
         ├──────────────────┐ │
         │                  │ │
         ▼                  ▼ │
┌────────────────────┐ ┌──────────────────────────┐
│ package_certificates│ │ package_workflow_stages  │
│────────────────────│ │──────────────────────────│
│ id (PK)            │ │ id (PK)                  │
│ package_id (FK)────┤ │ package_id (FK)──────────┤
│ certificate_number │ │ stage_name               │
│ client             │ │ stage_order              │
│ client_spec        │ │ status                   │
│ line_number        │ │ stage_data (JSONB)       │
│ test_pressure      │ │ signoffs (JSONB)         │
│ pressure_unit      │ │ skip_reason              │
│ test_media         │ │ completed_by (FK → users)│
│ temperature        │ │ completed_at             │
│ temperature_unit   │ │ created_at               │
│ created_at         │ └──────────────────────────┘
│ updated_at         │          1:N
└────────────────────┘
         │
         │ 1:N
         │
         ▼
┌───────────────────────────┐
│ package_drawing_assignments│
│───────────────────────────│
│ id (PK)                   │
│ package_id (FK)───────────┤
│ drawing_id (FK → drawings)│
│ created_at                │
└───────────────────────────┘
         │
         │ N:M (via inheritance)
         │
         ▼
┌──────────────────┐        ┌──────────────────────────────┐
│   drawings       │        │ package_component_assignments│
│──────────────────│        │──────────────────────────────│
│ id (PK)          │        │ id (PK)                      │
│ project_id (FK)  │        │ package_id (FK)──────────────┤
│ drawing_no_raw   │        │ component_id (FK → components)│
│ drawing_no_norm  │        │ created_at                   │
│ ...              │        └──────────────────────────────┘
└──────────────────┘                 │
         │                           │
         │ 1:N                       │ N:M (direct)
         ▼                           ▼
┌──────────────────┐        ┌──────────────────┐
│   components     │◄───────│   components     │ (self-reference)
│──────────────────│        │──────────────────│
│ id (PK)          │        │ test_package_id  │ (nullable FK → test_packages)
│ project_id (FK)  │        │ (UNIQUE constraint)
│ drawing_id (FK)  │        └──────────────────┘
│ test_package_id  │ (nullable, uniqueness enforced)
│ ...              │
└──────────────────┘
```

**Key Relationships**:
- `test_packages` 1:1 `package_certificates` (one certificate per package)
- `test_packages` 1:N `package_workflow_stages` (7 stages per package)
- `test_packages` 1:N `package_drawing_assignments` (many drawings per package)
- `test_packages` 1:N `package_component_assignments` (many components per package)
- `components.test_package_id` nullable FK with UNIQUE constraint (one package per component)

---

## Table Schemas

### 1. `test_packages` (Modified)

**Purpose**: Existing table extended with test type for certificate pre-population.

**New Columns**:
```sql
ALTER TABLE test_packages
ADD COLUMN test_type TEXT;

-- Constraint: test_type must be one of 6 valid values or NULL (for backward compatibility)
ALTER TABLE test_packages
ADD CONSTRAINT chk_test_type_valid
CHECK (test_type IS NULL OR test_type IN (
  'Sensitive Leak Test',
  'Pneumatic Test',
  'Alternative Leak Test',
  'In-service Test',
  'Hydrostatic Test',
  'Other'
));
```

**Migration**: `00121_add_test_type_to_packages.sql`

**Validation Rules**:
- `test_type` is optional (NULL allowed for existing packages created before this feature)
- Must be one of 6 predefined values if provided

---

### 2. `package_certificates` (New)

**Purpose**: Store formal Pipe Testing Acceptance Certificate data with test parameters.

**Schema**:
```sql
CREATE TABLE package_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL UNIQUE REFERENCES test_packages(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL,  -- Auto-generated: "PKG-001", "PKG-002", etc.
  client TEXT,
  client_spec TEXT,
  line_number TEXT,
  test_pressure NUMERIC(10, 2) NOT NULL,
  pressure_unit TEXT NOT NULL DEFAULT 'PSIG',
  test_media TEXT NOT NULL,
  temperature NUMERIC(6, 2) NOT NULL,
  temperature_unit TEXT NOT NULL DEFAULT 'F',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_package_certificates_package_id ON package_certificates(package_id);
CREATE UNIQUE INDEX idx_package_certificates_number_project ON package_certificates(certificate_number, (
  SELECT project_id FROM test_packages WHERE id = package_id
));

-- RLS Policies
ALTER TABLE package_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view certificates in their organization"
ON package_certificates FOR SELECT
USING (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert certificates in their organization"
ON package_certificates FOR INSERT
WITH CHECK (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update certificates in their organization"
ON package_certificates FOR UPDATE
USING (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- Constraints
ALTER TABLE package_certificates
ADD CONSTRAINT chk_test_pressure_positive CHECK (test_pressure > 0),
ADD CONSTRAINT chk_test_media_not_empty CHECK (length(trim(test_media)) > 0),
ADD CONSTRAINT chk_temperature_above_absolute_zero CHECK (temperature > -273),
ADD CONSTRAINT chk_pressure_unit_valid CHECK (pressure_unit IN ('PSIG', 'BAR', 'KPA', 'PSI')),
ADD CONSTRAINT chk_temperature_unit_valid CHECK (temperature_unit IN ('F', 'C', 'K'));

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_package_certificate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_package_certificate_updated_at
BEFORE UPDATE ON package_certificates
FOR EACH ROW
EXECUTE FUNCTION update_package_certificate_updated_at();
```

**Migration**: `00122_create_package_certificates.sql`

**Validation Rules**:
- `package_id` must be unique (1:1 relationship with test_packages)
- `test_pressure` must be > 0
- `test_media` must not be empty string
- `temperature` must be > -273 (absolute zero)
- `pressure_unit` must be one of: PSIG, BAR, KPA, PSI
- `temperature_unit` must be one of: F, C, K
- `certificate_number` auto-generated via function (see research.md Decision 1)

**Relationships**:
- `package_id` → `test_packages.id` (1:1, CASCADE on delete)

---

### 3. `package_workflow_stages` (New)

**Purpose**: Track 7-stage sequential workflow with sign-offs and stage-specific data.

**Schema**:
```sql
CREATE TABLE package_workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES test_packages(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,  -- One of 7 predefined stage names
  stage_order INTEGER NOT NULL,  -- 1-7 for sequential ordering
  status TEXT NOT NULL DEFAULT 'not_started',
  stage_data JSONB,  -- Flexible stage-specific fields (see research.md Decision 2)
  signoffs JSONB,  -- QC/Client/MFG sign-offs with names + dates (see research.md Decision 5)
  skip_reason TEXT,  -- Required if status = 'skipped'
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_package_workflow_stages_package_id ON package_workflow_stages(package_id);
CREATE INDEX idx_package_workflow_stages_status ON package_workflow_stages(status);
CREATE UNIQUE INDEX idx_package_workflow_stages_unique ON package_workflow_stages(package_id, stage_name);

-- RLS Policies
ALTER TABLE package_workflow_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow stages in their organization"
ON package_workflow_stages FOR SELECT
USING (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert workflow stages in their organization"
ON package_workflow_stages FOR INSERT
WITH CHECK (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update workflow stages in their organization"
ON package_workflow_stages FOR UPDATE
USING (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- Constraints
ALTER TABLE package_workflow_stages
ADD CONSTRAINT chk_stage_name_valid CHECK (stage_name IN (
  'Pre-Hydro Acceptance',
  'Test Acceptance',
  'Drain/Flush Acceptance',
  'Post-Hydro Acceptance',
  'Protective Coatings Acceptance',
  'Insulation Acceptance',
  'Final Package Acceptance'
)),
ADD CONSTRAINT chk_stage_order_valid CHECK (stage_order BETWEEN 1 AND 7),
ADD CONSTRAINT chk_status_valid CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),
ADD CONSTRAINT chk_skip_reason_required CHECK (
  (status = 'skipped' AND skip_reason IS NOT NULL AND length(trim(skip_reason)) > 0)
  OR status != 'skipped'
),
ADD CONSTRAINT chk_completed_at_with_completed_by CHECK (
  (completed_at IS NOT NULL AND completed_by IS NOT NULL)
  OR (completed_at IS NULL AND completed_by IS NULL)
);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_package_workflow_stage_updated_at
BEFORE UPDATE ON package_workflow_stages
FOR EACH ROW
EXECUTE FUNCTION update_package_certificate_updated_at();  -- Reuse same function
```

**Migration**: `00123_create_package_workflow_stages.sql`

**Validation Rules**:
- `stage_name` must be one of 7 predefined values
- `stage_order` must be 1-7
- `status` must be one of: not_started, in_progress, completed, skipped
- If `status = 'skipped'`, `skip_reason` is required and non-empty
- `completed_at` and `completed_by` must both be NULL or both be NOT NULL
- Unique constraint on `(package_id, stage_name)` → prevents duplicate stages

**JSONB Fields**:

**`stage_data`** - Stage-specific fields (varies by stage):
```typescript
// Pre-Hydro Acceptance
{ inspector: string, nde_complete: boolean }

// Test Acceptance
{ gauge_numbers: string[], calibration_dates: string[], time_held: number }

// Drain/Flush Acceptance
{ drain_date: string, flush_date: string }

// Post-Hydro Acceptance
{ inspection_date: string, defects_found: boolean, defect_description?: string }

// Protective Coatings Acceptance
{ coating_type: string, application_date: string, cure_date: string }

// Insulation Acceptance
{ insulation_type: string, installation_date: string }

// Final Package Acceptance
{ final_notes: string }
```

**`signoffs`** - Sign-offs by role (see research.md Decision 5):
```typescript
{
  qc_rep?: { name: string, date: string, user_id: string },
  client_rep?: { name: string, date: string, user_id: string },
  mfg_rep?: { name: string, date: string, user_id: string }
}
```

**Relationships**:
- `package_id` → `test_packages.id` (N:1, CASCADE on delete)
- `completed_by` → `users.id` (N:1, nullable)

---

### 4. `package_drawing_assignments` (New)

**Purpose**: Link packages to drawings for component inheritance (drawing-based assignment mode).

**Schema**:
```sql
CREATE TABLE package_drawing_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES test_packages(id) ON DELETE CASCADE,
  drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_package_drawing_assignments_package_id ON package_drawing_assignments(package_id);
CREATE INDEX idx_package_drawing_assignments_drawing_id ON package_drawing_assignments(drawing_id);
CREATE UNIQUE INDEX idx_package_drawing_assignments_unique ON package_drawing_assignments(package_id, drawing_id);

-- RLS Policies
ALTER TABLE package_drawing_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view drawing assignments in their organization"
ON package_drawing_assignments FOR SELECT
USING (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert drawing assignments in their organization"
ON package_drawing_assignments FOR INSERT
WITH CHECK (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete drawing assignments in their organization"
ON package_drawing_assignments FOR DELETE
USING (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);
```

**Migration**: `00124_create_package_assignments.sql`

**Validation Rules**:
- Unique constraint on `(package_id, drawing_id)` → prevents duplicate assignments
- Drawings can be assigned to multiple packages (no uniqueness constraint on `drawing_id`)

**Relationships**:
- `package_id` → `test_packages.id` (N:1, CASCADE on delete)
- `drawing_id` → `drawings.id` (N:1, CASCADE on delete)

---

### 5. `package_component_assignments` (New)

**Purpose**: Link packages to individual components for direct assignment (component-based assignment mode).

**Schema**:
```sql
CREATE TABLE package_component_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES test_packages(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_package_component_assignments_package_id ON package_component_assignments(package_id);
CREATE INDEX idx_package_component_assignments_component_id ON package_component_assignments(component_id);
CREATE UNIQUE INDEX idx_package_component_assignments_unique ON package_component_assignments(package_id, component_id);

-- RLS Policies
ALTER TABLE package_component_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view component assignments in their organization"
ON package_component_assignments FOR SELECT
USING (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert component assignments in their organization"
ON package_component_assignments FOR INSERT
WITH CHECK (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete component assignments in their organization"
ON package_component_assignments FOR DELETE
USING (
  package_id IN (
    SELECT tp.id FROM test_packages tp
    JOIN projects p ON tp.project_id = p.id
    WHERE p.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);
```

**Migration**: `00124_create_package_assignments.sql` (same as drawing assignments)

**Validation Rules**:
- Unique constraint on `(package_id, component_id)` → prevents duplicate assignments
- Component uniqueness enforced via separate constraint on `components.test_package_id` (see below)

**Relationships**:
- `package_id` → `test_packages.id` (N:1, CASCADE on delete)
- `component_id` → `components.id` (N:1, CASCADE on delete)

---

### 6. `components` (Modified)

**Purpose**: Add uniqueness constraint to enforce "one component, one package" rule (see research.md Decision 3).

**New Constraints**:
```sql
-- Partial unique index: components can only belong to one package at a time
-- NULL values excluded → allows unassigned components
CREATE UNIQUE INDEX idx_components_unique_package
ON components(test_package_id)
WHERE test_package_id IS NOT NULL;

-- Foreign key with SET NULL on delete → frees components when package deleted
ALTER TABLE components
DROP CONSTRAINT IF EXISTS fk_components_test_package;  -- Remove old constraint if exists

ALTER TABLE components
ADD CONSTRAINT fk_components_test_package
FOREIGN KEY (test_package_id)
REFERENCES test_packages(id)
ON DELETE SET NULL;  -- Free components when package deleted (FR-033)
```

**Migration**: `00125_add_component_uniqueness.sql`

**Validation Rules**:
- Component can only belong to ONE package at a time (enforced by unique index)
- Deleting package sets `test_package_id` to NULL (frees components for reassignment)
- NULL values excluded from unique constraint (allows unassigned components)

**Impact on Existing Code**:
- All component assignment logic must check uniqueness before inserting
- Application-level validation must prevent assigning already-assigned components

---

## State Transitions

### Package Lifecycle

```text
┌─────────────────┐
│  Package Created│
│  (no certificate)│
└────────┬────────┘
         │
         ▼
┌────────────────────┐
│ Certificate Draft  │ (optional intermediate state)
└────────┬───────────┘
         │
         ▼
┌─────────────────────┐
│ Certificate Complete│
│ (all required fields)│
└────────┬────────────┘
         │
         ▼
┌──────────────────────┐
│  Workflow Started    │ (stage 1 available)
│  (7 stages created)  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Stages Progressing  │ (sequential completion)
│  (1→2→3→4→5→6→7)     │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Final Acceptance     │ (all stages completed or skipped)
└──────────────────────┘
```

### Workflow Stage Status

```text
┌──────────────┐
│ not_started  │ (default state)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ in_progress  │ (user clicked stage, entering data)
└──────┬───────┘
       │
       ├──────────┐
       │          │
       ▼          ▼
┌──────────┐  ┌─────────┐
│ completed│  │ skipped │ (with required skip_reason)
└──────────┘  └─────────┘
```

**Transitions**:
- `not_started` → `in_progress` (user clicks stage)
- `in_progress` → `completed` (all required fields + sign-offs provided)
- `in_progress` → `skipped` (user clicks "Skip Stage" with reason)
- `completed` → `in_progress` (user clicks "Edit" to correct errors)
- `skipped` cannot transition back (immutable once skipped)

---

## Query Patterns

### Get all components for a package (drawing-based inheritance + direct assignments)

```sql
-- Components assigned to package via drawing inheritance OR direct assignment
-- Excludes components already assigned to other packages (component uniqueness)
SELECT DISTINCT c.*
FROM components c
WHERE c.id IN (
  -- Direct component assignments (explicit)
  SELECT pca.component_id
  FROM package_component_assignments pca
  WHERE pca.package_id = $1

  UNION

  -- Inherited from drawings (implicit)
  SELECT c2.id
  FROM components c2
  JOIN package_drawing_assignments pda ON c2.drawing_id = pda.drawing_id
  WHERE pda.package_id = $1
    AND c2.test_package_id IS NULL  -- Not assigned to another package
);
```

### Check if component can be assigned (uniqueness validation)

```sql
-- Returns TRUE if component can be assigned, FALSE if already assigned elsewhere
SELECT test_package_id IS NULL
FROM components
WHERE id = $1;
```

### Get workflow stage progress summary

```sql
-- Count stages by status for a package
SELECT
  status,
  COUNT(*) as stage_count
FROM package_workflow_stages
WHERE package_id = $1
GROUP BY status;
```

### Generate next certificate number for project

```sql
-- Auto-increment certificate number scoped to project
-- See research.md Decision 1 for full function implementation
SELECT 'PKG-' || LPAD((
  SELECT COALESCE(MAX(CAST(SUBSTRING(certificate_number FROM 'PKG-(\d+)') AS INTEGER)), 0) + 1
  FROM package_certificates pc
  JOIN test_packages tp ON pc.package_id = tp.id
  WHERE tp.project_id = $1
)::TEXT, 3, '0');
```

---

## Migration Order

Migrations must be applied in this order due to foreign key dependencies:

1. `00121_add_test_type_to_packages.sql` (extend existing table)
2. `00122_create_package_certificates.sql` (depends on test_packages)
3. `00123_create_package_workflow_stages.sql` (depends on test_packages, users)
4. `00124_create_package_assignments.sql` (depends on test_packages, drawings, components)
5. `00125_add_component_uniqueness.sql` (modify existing components table)

**Important**: Wait 2+ seconds between creating migration files to avoid timestamp collisions (see CLAUDE.md Migration Creation Checklist).

---

## Backward Compatibility

**Safe for existing data**:
- `test_packages.test_type` is nullable (existing packages have NULL)
- New tables have no impact on existing functionality
- `components.test_package_id` uniqueness constraint only applies to non-NULL values (existing unassigned components unaffected)

**Breaking changes**: None

**Data migration required**: None (all new columns nullable or have defaults)

---

## Summary

**New Tables**: 4
- `package_certificates` (1:1 with test_packages)
- `package_workflow_stages` (1:N with test_packages)
- `package_drawing_assignments` (N:M junction)
- `package_component_assignments` (N:M junction)

**Modified Tables**: 2
- `test_packages` (add `test_type` column)
- `components` (add unique constraint on `test_package_id`)

**Total Migrations**: 5

**RLS Policies**: 12 new policies (SELECT/INSERT/UPDATE/DELETE across 4 new tables)

**Indexes**: 15 new indexes (primary keys, foreign keys, unique constraints, query optimization)

**Next Phase**: Generate API contracts (TypeScript interfaces).
