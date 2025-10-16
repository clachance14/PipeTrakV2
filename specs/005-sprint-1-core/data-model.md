# Data Model: Sprint 1 - Core Foundation Database Expansion

**Feature**: 005-sprint-1-core
**Date**: 2025-10-15
**Phase**: 1 (Design & Contracts)

## Overview

Sprint 1 expands the database from 4 tables (organizations, users, projects, invitations) to 14 tables by adding 11 new tables for pipe component tracking. All new tables enforce multi-tenant RLS policies via `organization_id` filtering.

---

## Table 1: drawings

**Purpose**: Store construction drawings with normalized numbers for exact and fuzzy matching (FR-001, FR-002).

**Columns**:
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `project_id` UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
- `drawing_no_raw` TEXT NOT NULL — Original drawing number as imported (max 255 chars per FR-045)
- `drawing_no_norm` TEXT NOT NULL — Normalized: UPPERCASE, trimmed, separators collapsed, leading zeros removed
- `title` TEXT — Drawing title/description
- `rev` TEXT — Revision number
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `is_retired` BOOLEAN NOT NULL DEFAULT false — Soft delete flag (FR-006)
- `retire_reason` TEXT — Why drawing was retired

**Indexes**:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_drawings_project_norm ON drawings(project_id, drawing_no_norm) WHERE NOT is_retired
- INDEX idx_drawings_project_id ON drawings(project_id)
- GIN INDEX idx_drawings_norm_trgm ON drawings USING gin(drawing_no_norm gin_trgm_ops) — For similarity search (FR-037 to FR-040)

**Validation Rules**:
- FR-044: drawing_no_norm must be non-empty after normalization
- FR-045: drawing_no_raw max 255 characters

**RLS Policies** (FR-027 to FR-029):
```sql
CREATE POLICY "Users can view drawings in their organization"
ON drawings FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);
```

**Relationships**:
- Many drawings → One project
- One drawing → Many components (optional, components.drawing_id nullable)

---

## Table 2: areas

**Purpose**: Physical area grouping for components (e.g., "B-68", "Tank Farm") per FR-016 to FR-018.

**Columns**:
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `project_id` UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
- `name` TEXT NOT NULL
- `description` TEXT
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()

**Indexes**:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_areas_project_name ON areas(project_id, name)

**Validation Rules**:
- FR-018: name unique within project scope

**RLS Policies**:
```sql
CREATE POLICY "Users can view areas in their organization"
ON areas FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);
```

**Relationships**:
- Many areas → One project
- One area → Many components (optional, components.area_id nullable)

---

## Table 3: systems

**Purpose**: System grouping for components (e.g., "HC-05" hydraulic, "E-200" electrical) per FR-016 to FR-018.

**Columns**:
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `project_id` UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
- `name` TEXT NOT NULL
- `description` TEXT
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()

**Indexes**:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_systems_project_name ON systems(project_id, name)

**Validation Rules**:
- FR-018: name unique within project scope

**RLS Policies**:
```sql
CREATE POLICY "Users can view systems in their organization"
ON systems FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);
```

**Relationships**:
- Many systems → One project
- One system → Many components (optional, components.system_id nullable)

---

## Table 4: test_packages

**Purpose**: Collections of components ready for testing by target date per FR-016 to FR-018, FR-034.

**Columns**:
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `project_id` UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
- `name` TEXT NOT NULL
- `description` TEXT
- `target_date` DATE — When test package must be ready
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()

**Indexes**:
- PRIMARY KEY (id)
- INDEX idx_packages_project_id ON test_packages(project_id)
- INDEX idx_packages_target_date ON test_packages(target_date)

**Validation Rules**:
- Name not required to be unique (multiple packages can have same name in different projects)

**RLS Policies**:
```sql
CREATE POLICY "Users can view test_packages in their organization"
ON test_packages FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);
```

**Relationships**:
- Many test_packages → One project
- One test_package → Many components (optional, components.test_package_id nullable)

---

## Table 5: progress_templates

**Purpose**: Define milestone workflows for component types (FR-007 to FR-011). Versioned to allow future template changes without breaking existing components (FR-008).

**Columns**:
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `component_type` TEXT NOT NULL — One of 11 types: spool, field_weld, support, valve, fitting, flange, instrument, tubing, hose, misc_component, threaded_pipe (FR-003)
- `version` INTEGER NOT NULL — Template version (v1 for Sprint 1, future versions allow workflow updates)
- `workflow_type` TEXT NOT NULL CHECK (workflow_type IN ('discrete', 'quantity', 'hybrid')) — FR-009, FR-010
- `milestones_config` JSONB NOT NULL — Array of milestone objects: `[{"name": "Receive", "weight": 5, "order": 1, "is_partial": false, "requires_welder": false}, ...]`
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()

**Indexes**:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_templates_type_version ON progress_templates(component_type, version)

**Validation Rules**:
- FR-042: Milestone weights must total exactly 100% (enforced via CHECK constraint using `validate_milestone_weights()` function)
- FR-007: Milestones config includes name, weight, order, optional flags (is_partial, requires_welder)

**Seed Data** (11 templates for Sprint 1):
1. **Spool** (discrete, 6 milestones): Receive 5%, Erect 40%, Connect 40%, Punch 5%, Test 5%, Restore 5%
2. **Field Weld** (discrete, 5 milestones): Fit-Up 10%, Weld Made 60%, Punch 10%, Test 15%, Restore 5%
3. **Support** (discrete, 5 milestones): Receive 10%, Install 60%, Punch 10%, Test 15%, Restore 5%
4. **Valve** (discrete, 5 milestones): Receive 10%, Install 60%, Punch 10%, Test 15%, Restore 5%
5. **Fitting** (discrete, 5 milestones): Receive 10%, Install 60%, Punch 10%, Test 15%, Restore 5%
6. **Flange** (discrete, 5 milestones): Receive 10%, Install 60%, Punch 10%, Test 15%, Restore 5%
7. **Instrument** (discrete, 5 milestones): Receive 10%, Install 60%, Punch 10%, Test 15%, Restore 5%
8. **Tubing** (discrete, 5 milestones): Receive 10%, Install 60%, Punch 10%, Test 15%, Restore 5%
9. **Hose** (discrete, 5 milestones): Receive 10%, Install 60%, Punch 10%, Test 15%, Restore 5%
10. **Misc Component** (discrete, 5 milestones): Receive 10%, Install 60%, Punch 10%, Test 15%, Restore 5%
11. **Threaded Pipe** (hybrid, 8 milestones): Fabricate 16% (partial), Install 16% (partial), Erect 16% (partial), Connect 16% (partial), Support 16% (partial), Punch 5%, Test 10%, Restore 5%

**RLS Policies**:
```sql
-- Templates are global (not tenant-specific), readable by all authenticated users
CREATE POLICY "Authenticated users can view progress_templates"
ON progress_templates FOR SELECT
USING (auth.role() = 'authenticated');
```

**Relationships**:
- One progress_template → Many components (via components.progress_template_id, ON DELETE RESTRICT to prevent orphaned components per edge case #7)

---

## Table 6: components

**Purpose**: Core entity representing physical pipe components (FR-003 to FR-006, FR-012 to FR-015). Supports 11 component types with flexible JSONB identity keys and 1M+ row capacity (FR-033).

**Columns**:
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `project_id` UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
- `drawing_id` UUID REFERENCES drawings(id) ON DELETE SET NULL — Optional drawing reference
- `component_type` TEXT NOT NULL — One of 11 types (FR-003)
- `progress_template_id` UUID NOT NULL REFERENCES progress_templates(id) ON DELETE RESTRICT — Prevent template deletion if components reference it
- `identity_key` JSONB NOT NULL — Type-specific identity (FR-004):
  - Spool: `{"spool_id": "SP-001"}`
  - Field Weld: `{"weld_number": "W-001"}`
  - Support/Valve/etc.: `{"drawing_norm": "P-001", "commodity_code": "CS-2", "size": "2IN", "seq": 1}`
- `area_id` UUID REFERENCES areas(id) ON DELETE SET NULL — Optional area assignment (FR-016)
- `system_id` UUID REFERENCES systems(id) ON DELETE SET NULL — Optional system assignment (FR-016)
- `test_package_id` UUID REFERENCES test_packages(id) ON DELETE SET NULL — Optional package assignment (FR-016)
- `attributes` JSONB — Flexible type-specific fields (max 10KB per FR-045):
  - Spool: `{"spec": "A106-B", "material": "CS", "size": "4IN"}`
  - Field Weld: `{"weld_type": "BW", "welder_stencil": "JD42", "date_welded": "2025-09-21"}`
  - Pre-assignment: `{"area_name": "B-68", "system_name": "HC-05"}` (FR-017)
- `current_milestones` JSONB NOT NULL DEFAULT '{}' — Milestone state (FR-012):
  - Discrete: `{"Receive": true, "Erect": true, "Connect": false, ...}`
  - Hybrid (partial %): `{"Fabricate": 85.00, "Install": 60.00, "Punch": false, ...}`
- `percent_complete` NUMERIC(5,2) NOT NULL DEFAULT 0.00 — Cached ROC calculation 0.00-100.00 (FR-011, FR-012, FR-046)
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `created_by` UUID REFERENCES users(id)
- `last_updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `last_updated_by` UUID REFERENCES users(id)
- `is_retired` BOOLEAN NOT NULL DEFAULT false — Soft delete flag (FR-006)
- `retire_reason` TEXT

**Indexes**:
- PRIMARY KEY (id)
- INDEX idx_components_project_id ON components(project_id) — Critical for RLS performance
- INDEX idx_components_drawing_id ON components(drawing_id)
- INDEX idx_components_type ON components(component_type)
- INDEX idx_components_package_id ON components(test_package_id)
- INDEX idx_components_area_id ON components(area_id)
- INDEX idx_components_system_id ON components(system_id)
- INDEX idx_components_percent ON components(percent_complete)
- INDEX idx_components_updated ON components(last_updated_at DESC)
- GIN INDEX idx_components_identity ON components USING gin(identity_key)
- GIN INDEX idx_components_attrs ON components USING gin(attributes)
- UNIQUE INDEX idx_components_identity_unique ON components(project_id, component_type, identity_key) WHERE NOT is_retired — FR-005

**Validation Rules**:
- FR-041: identity_key structure matches component_type (enforced via `validate_component_identity_key()` CHECK constraint)
- FR-045: attributes max 10KB JSON
- FR-046: percent_complete 0.00-100.00

**Triggers**:
- `update_component_percent_on_milestone_change` BEFORE UPDATE OF current_milestones: Auto-recalculate percent_complete via `calculate_component_percent()` (FR-012)

**RLS Policies** (FR-027 to FR-029):
```sql
CREATE POLICY "Users can view components in their organization"
ON components FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update components if they have permission"
ON components FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND has_permission('can_update_milestones')  -- From Feature 004 permissions.ts
  )
);
```

**Relationships**:
- Many components → One project (required)
- Many components → One drawing (optional)
- Many components → One progress_template (required, ON DELETE RESTRICT)
- Many components → One area (optional)
- Many components → One system (optional)
- Many components → One test_package (optional)

---

## Table 7: milestone_events

**Purpose**: Audit record of milestone state changes (FR-013 to FR-015). Provides full audit trail for milestone updates, rollbacks, and metadata (e.g., welder assignments).

**Columns**:
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `component_id` UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE
- `milestone_name` TEXT NOT NULL — Name of milestone that changed
- `action` TEXT NOT NULL CHECK (action IN ('complete', 'rollback', 'update')) — Type of change
- `value` NUMERIC(5,2) — For partial % milestones (0.00-100.00), NULL for discrete boolean toggles
- `previous_value` NUMERIC(5,2) — Old value before change (FR-015)
- `user_id` UUID NOT NULL REFERENCES users(id)
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `metadata` JSONB — Additional context (max 5KB per FR-045):
  - Weld Made: `{"welder_id": "uuid", "stencil": "JD42"}` (FR-014)
  - Out-of-sequence: `{"prerequisite": "Install", "event_id": "uuid"}`

**Indexes**:
- PRIMARY KEY (id)
- INDEX idx_events_component_id ON milestone_events(component_id)
- INDEX idx_events_created_at ON milestone_events(created_at DESC)
- INDEX idx_events_user_id ON milestone_events(user_id)
- INDEX idx_events_milestone ON milestone_events(milestone_name)

**Validation Rules**:
- FR-045: metadata max 5KB JSON

**RLS Policies**:
```sql
CREATE POLICY "Users can view milestone_events in their organization"
ON milestone_events FOR SELECT
USING (
  component_id IN (
    SELECT id FROM components
    WHERE project_id IN (
      SELECT id FROM projects
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  )
);
```

**Relationships**:
- Many milestone_events → One component (ON DELETE CASCADE when component deleted)
- Many milestone_events → One user (who performed the action)

---

## Table 8: welders

**Purpose**: Registry of welders per project with verification workflow (FR-019 to FR-022). Auto-created during weld log import.

**Columns**:
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `project_id` UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
- `name` TEXT NOT NULL — Welder's full name
- `stencil` TEXT NOT NULL — Raw stencil as imported
- `stencil_norm` TEXT NOT NULL — Normalized: UPPER(TRIM(stencil)), validated against regex `[A-Z0-9-]{2,12}` (FR-043)
- `status` TEXT NOT NULL CHECK (status IN ('unverified', 'verified')) DEFAULT 'unverified' — FR-021
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `created_by` UUID REFERENCES users(id)
- `verified_at` TIMESTAMPTZ — When welder was verified (NULL if unverified)
- `verified_by` UUID REFERENCES users(id) — Who verified the welder (NULL if unverified)

**Indexes**:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_welders_project_stencil ON welders(project_id, stencil_norm) — FR-020: unique stencil within project
- INDEX idx_welders_status ON welders(status) WHERE status = 'unverified' — Partial index for verification queue

**Validation Rules**:
- FR-043: stencil_norm matches regex `[A-Z0-9-]{2,12}` (enforced via CHECK constraint)
- FR-020: stencil_norm unique within project

**RLS Policies**:
```sql
CREATE POLICY "Users can view welders in their organization"
ON welders FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can verify welders if they have permission"
ON welders FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND has_permission('can_manage_welders')  -- From Feature 004
  )
);
```

**Relationships**:
- Many welders → One project (ON DELETE CASCADE)
- Many welders → One creator user
- Many welders → One verifier user (nullable)

---

## Table 9: needs_review

**Purpose**: Exception queue for items requiring human review (FR-023 to FR-026). Surfaces data quality issues like out-of-sequence milestones, drawing changes, similar drawings, welder verification threshold.

**Columns**:
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `project_id` UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
- `component_id` UUID REFERENCES components(id) ON DELETE CASCADE — NULL for project-level reviews
- `type` TEXT NOT NULL CHECK (type IN ('out_of_sequence', 'rollback', 'delta_quantity', 'drawing_change', 'similar_drawing', 'verify_welder')) — FR-023
- `status` TEXT NOT NULL CHECK (status IN ('pending', 'resolved', 'ignored')) DEFAULT 'pending' — FR-024
- `payload` JSONB NOT NULL — Type-specific metadata (FR-025):
  - out_of_sequence: `{"milestone": "Test", "prerequisite": "Install", "event_id": "uuid"}`
  - delta_quantity: `{"group_key": {...}, "old_count": 10, "new_count": 13, "delta": 3}`
  - drawing_change: `{"weld_number": "W-001", "old_drawing_id": "uuid", "new_drawing_id": "uuid"}`
  - similar_drawing: `{"new_drawing_norm": "P-001", "matches": [{"drawing_id": "uuid", "score": 0.92}, ...]}`
  - verify_welder: `{"welder_id": "uuid", "usage_count": 7}`
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `created_by` UUID REFERENCES users(id)
- `resolved_at` TIMESTAMPTZ — When resolved/ignored (NULL if pending)
- `resolved_by` UUID REFERENCES users(id) — Who resolved/ignored (NULL if pending)
- `resolution_note` TEXT — Why resolved/ignored

**Indexes**:
- PRIMARY KEY (id)
- INDEX idx_review_project_id ON needs_review(project_id)
- INDEX idx_review_component_id ON needs_review(component_id)
- INDEX idx_review_type ON needs_review(type)
- INDEX idx_review_status ON needs_review(status) WHERE status = 'pending' — Partial index for review queue
- INDEX idx_review_created_at ON needs_review(created_at DESC)

**Validation Rules**:
- FR-023: type must be one of 6 exception types

**RLS Policies**:
```sql
CREATE POLICY "Users can view needs_review in their organization"
ON needs_review FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can resolve needs_review if they have permission"
ON needs_review FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND has_permission('can_resolve_reviews')  -- From Feature 004 (FR-026, FR-047)
  )
);
```

**Relationships**:
- Many needs_review → One project (ON DELETE CASCADE)
- Many needs_review → One component (optional, ON DELETE CASCADE)
- Many needs_review → One creator user
- Many needs_review → One resolver user (nullable)

---

## Table 10: audit_log

**Purpose**: Comprehensive audit trail for compliance (FR-030 to FR-032). Records all milestone updates, rollbacks, imports, review resolutions, and bulk updates. Retained indefinitely.

**Columns**:
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `project_id` UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
- `user_id` UUID NOT NULL REFERENCES users(id)
- `action_type` TEXT NOT NULL — Examples: 'milestone_update', 'rollback', 'import', 'resolve_review', 'bulk_update'
- `entity_type` TEXT NOT NULL — Examples: 'component', 'drawing', 'welder', 'needs_review'
- `entity_id` UUID — ID of entity that changed (NULL for bulk operations)
- `old_value` JSONB — State before change
- `new_value` JSONB — State after change
- `reason` TEXT — Optional reason for change
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()

**Indexes**:
- PRIMARY KEY (id)
- INDEX idx_audit_project_id ON audit_log(project_id)
- INDEX idx_audit_entity ON audit_log(entity_type, entity_id)
- INDEX idx_audit_user_id ON audit_log(user_id)
- INDEX idx_audit_created_at ON audit_log(created_at DESC)

**Retention Policy**:
- FR-032: Retain indefinitely while project active (no automatic purging)
- FR-052: Retain when project.is_archived = true (manual export/archival for closed projects)

**RLS Policies**:
```sql
CREATE POLICY "Users can view audit_log in their organization"
ON audit_log FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);
```

**Relationships**:
- Many audit_log → One project (ON DELETE CASCADE)
- Many audit_log → One user (who performed the action)

---

## Table 11: field_weld_inspections

**Purpose**: Detailed quality control tracking for field welds beyond construction milestones (FR-053 to FR-060). QC inspectors track weld-specific data including hydro testing, PMI, PWHT, NDE, x-ray flagging, and repair history. Separate from components table to support distinct QC workflow lifecycle.

**Columns**:
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `component_id` UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE — Link to field_weld component
- `project_id` UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE — For RLS performance
- `weld_id_number` NUMERIC(10,2) NOT NULL — Supports repairs: 42, 42.1, 42.2 (FR-056)
- `parent_weld_id` UUID REFERENCES field_weld_inspections(id) — NULL for original welds, set for repairs
- `repair_sequence` INTEGER NOT NULL DEFAULT 0 — 0 = original, 1+ = repair number
- `drawing_iso_number` TEXT — Drawing/Iso reference
- `tie_in_number` TEXT — Tie-in identifier
- `package_number` TEXT — Test package reference
- `spec` TEXT — Pipe specification (e.g., "A106-B")
- `system_code` TEXT — System reference (e.g., "HC-05")
- `welder_id` UUID REFERENCES welders(id) — Set by FOREMAN when marking "Weld Made" milestone (FR-054)
- `welder_stencil` TEXT — Denormalized stencil for historical record
- `date_welded` DATE — When weld was completed
- `xray_percentage` TEXT — "5%", "10%", "100%" (informational only, FR-057)
- `weld_size` TEXT — Weld size specification
- `schedule` TEXT — Pipe schedule
- `weld_type` TEXT CHECK (weld_type IN ('BW', 'SW', 'FW', 'TW')) — Butt Weld, Socket Weld, Fillet Weld, Tack Weld
- `base_metal` TEXT — Base metal specification
- `test_pressure` NUMERIC(8,2) — Test pressure in PSI
- `hydro_complete` BOOLEAN NOT NULL DEFAULT false — Hydro test completed
- `hydro_complete_date` DATE — When hydro test completed
- `restored_date` DATE — When restoration completed
- `pmi_required` BOOLEAN NOT NULL DEFAULT false — Positive Material Identification required
- `pmi_complete` BOOLEAN NOT NULL DEFAULT false — PMI test completed
- `pmi_date` DATE — When PMI completed
- `pmi_result` TEXT — PMI result notes
- `pwht_required` BOOLEAN NOT NULL DEFAULT false — Post-Weld Heat Treatment required
- `pwht_complete` BOOLEAN NOT NULL DEFAULT false — PWHT completed
- `pwht_date` DATE — When PWHT completed
- `nde_type_performed` TEXT — Non-Destructive Examination type (e.g., "RT", "UT")
- `nde_result` TEXT — NDE result notes
- `flagged_for_xray` BOOLEAN NOT NULL DEFAULT false — QC manually flags welds for x-ray (FR-057)
- `xray_flagged_by` UUID REFERENCES users(id) — Who flagged for x-ray
- `xray_flagged_date` DATE — When flagged for x-ray
- `xray_shot_number` TEXT — X-ray shot identifier
- `xray_result` TEXT — X-ray result notes
- `turned_over_to_client` BOOLEAN NOT NULL DEFAULT false — Turned over to client (FR-058)
- `turnover_date` DATE — When turned over to client
- `optional_info` TEXT — Additional optional information
- `comments` TEXT — General comments
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `created_by` UUID REFERENCES users(id)
- `last_updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `last_updated_by` UUID REFERENCES users(id)

**Indexes**:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_weld_inspections_project_weld_number ON field_weld_inspections(project_id, weld_id_number) — FR-055
- INDEX idx_weld_inspections_component_id ON field_weld_inspections(component_id)
- INDEX idx_weld_inspections_project_id ON field_weld_inspections(project_id) — Critical for RLS performance
- INDEX idx_weld_inspections_welder_id ON field_weld_inspections(welder_id)
- INDEX idx_weld_inspections_parent_weld ON field_weld_inspections(parent_weld_id) — For repair history queries
- INDEX idx_weld_inspections_flagged_xray ON field_weld_inspections(flagged_for_xray) WHERE flagged_for_xray = true — Partial index for x-ray queue
- INDEX idx_weld_inspections_hydro ON field_weld_inspections(hydro_complete) WHERE NOT hydro_complete — Partial index for hydro test queue
- INDEX idx_weld_inspections_turnover ON field_weld_inspections(turned_over_to_client) WHERE NOT turned_over_to_client — Partial index for turnover queue

**Validation Rules**:
- FR-055: weld_id_number unique within project
- FR-056: repair_sequence ≥ 0, parent_weld_id NULL iff repair_sequence = 0
- FR-059: welder_id required when component milestone "Weld Made" = true
- CHECK constraint: `(parent_weld_id IS NULL AND repair_sequence = 0) OR (parent_weld_id IS NOT NULL AND repair_sequence > 0)`

**Triggers**:
- `update_weld_inspection_timestamp` BEFORE UPDATE: Set last_updated_at = now(), last_updated_by = auth.uid()

**RLS Policies** (FR-060):
```sql
CREATE POLICY "Users can view field_weld_inspections in their organization"
ON field_weld_inspections FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update field_weld_inspections if they have permission"
ON field_weld_inspections FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND has_permission('can_update_milestones')  -- QC inspectors have this permission
  )
);
```

**Relationships**:
- Many field_weld_inspections → One component (field_weld type, ON DELETE CASCADE)
- Many field_weld_inspections → One project (for RLS, ON DELETE CASCADE)
- Many field_weld_inspections → One welder (set by foreman, nullable)
- Many field_weld_inspections → One parent_weld_inspection (for repairs, nullable)
- Many field_weld_inspections → One x-ray flagging user (nullable)
- Many field_weld_inspections → One creator user
- Many field_weld_inspections → One last updater user

**Example Queries**:

```sql
-- Get repair history for weld 42 (original + all repairs)
SELECT weld_id_number, repair_sequence, date_welded, welder_stencil, comments
FROM field_weld_inspections
WHERE project_id = 'uuid'
  AND (weld_id_number = 42.0 OR parent_weld_id = (SELECT id FROM field_weld_inspections WHERE weld_id_number = 42.0))
ORDER BY weld_id_number;

-- Get all welds flagged for x-ray but not yet shot
SELECT weld_id_number, drawing_iso_number, date_welded, welder_stencil
FROM field_weld_inspections
WHERE project_id = 'uuid'
  AND flagged_for_xray = true
  AND xray_shot_number IS NULL
ORDER BY xray_flagged_date;

-- Get all welds pending hydro test
SELECT weld_id_number, package_number, test_pressure, welder_stencil
FROM field_weld_inspections
WHERE project_id = 'uuid'
  AND hydro_complete = false
  AND test_pressure IS NOT NULL
ORDER BY weld_id_number;
```

**Workflow Integration**:
1. **Foreman marks "Weld Made" milestone**: Creates/updates field_weld_inspections row, selects welder from dropdown (FR-054)
2. **QC inspector flags for x-ray**: Sets flagged_for_xray = true, records xray_flagged_by and xray_flagged_date (FR-057)
3. **QC inspector tracks hydro**: Updates hydro_complete, hydro_complete_date, restored_date
4. **QC inspector tracks PMI/PWHT**: Updates pmi_complete, pmi_date, pwht_complete, pwht_date
5. **QC inspector records NDE**: Updates nde_type_performed, nde_result
6. **QC inspector records turnover**: Updates turned_over_to_client, turnover_date (FR-058)
7. **Repair workflow**: Create new row with parent_weld_id, increment weld_id_number decimally (42.1, 42.2) (FR-056)

---

## Materialized Views (Performance Optimization)

### mv_package_readiness

**Purpose**: Fast lookup for Test Package Readiness Dashboard (FR-034, p95 <50ms query time).

**Definition**:
```sql
CREATE MATERIALIZED VIEW mv_package_readiness AS
SELECT
  tp.id AS package_id,
  tp.project_id,
  tp.name AS package_name,
  tp.target_date,
  COUNT(c.id) AS total_components,
  COUNT(c.id) FILTER (WHERE c.percent_complete = 100) AS completed_components,
  AVG(c.percent_complete) AS avg_percent_complete,
  COUNT(nr.id) FILTER (WHERE nr.status = 'pending') AS blocker_count,
  MAX(c.last_updated_at) AS last_activity_at
FROM test_packages tp
LEFT JOIN components c ON c.test_package_id = tp.id AND NOT c.is_retired
LEFT JOIN needs_review nr ON nr.component_id = c.id AND nr.status = 'pending'
GROUP BY tp.id, tp.project_id, tp.name, tp.target_date;

CREATE UNIQUE INDEX idx_mv_package_readiness_id ON mv_package_readiness(package_id);
CREATE INDEX idx_mv_package_readiness_project ON mv_package_readiness(project_id);
```

**Refresh Strategy**:
- FR-035: `REFRESH MATERIALIZED VIEW CONCURRENTLY` every 60 seconds via pg_cron
- FR-036: Manual refresh after bulk import/update operations
- FR-049: Serve stale data if refresh fails, retry next cycle

---

### mv_drawing_progress

**Purpose**: Fast lookup for Drawing % Complete in tree navigation (FR-034, p95 <50ms).

**Definition**:
```sql
CREATE MATERIALIZED VIEW mv_drawing_progress AS
SELECT
  d.id AS drawing_id,
  d.project_id,
  d.drawing_no_norm,
  COUNT(c.id) AS total_components,
  AVG(c.percent_complete) AS avg_percent_complete
FROM drawings d
LEFT JOIN components c ON c.drawing_id = d.id AND NOT c.is_retired
WHERE NOT d.is_retired
GROUP BY d.id, d.project_id, d.drawing_no_norm;

CREATE UNIQUE INDEX idx_mv_drawing_progress_id ON mv_drawing_progress(drawing_id);
CREATE INDEX idx_mv_drawing_progress_project ON mv_drawing_progress(project_id);
```

**Refresh Strategy**: Same as `mv_package_readiness` (60-second pg_cron job + manual refresh trigger)

---

## Stored Procedures (Business Logic)

### calculate_component_percent(component_id UUID)

**Purpose**: Calculate weighted ROC % based on completed milestones (FR-011, FR-012).

**Signature**: `RETURNS NUMERIC(5,2)`

**Logic**:
1. Fetch `progress_template_id` and `current_milestones` from components table
2. Fetch `milestones_config` from progress_templates table
3. Loop through milestones config:
   - If `is_partial = true`: Add `weight * current_milestones[name] / 100`
   - If discrete: Add `weight` if `current_milestones[name] = true`
4. Return ROUND(total_weight, 2)

**Called By**: Trigger `update_component_percent_on_milestone_change` (BEFORE UPDATE OF current_milestones)

---

### detect_similar_drawings(project_id UUID, drawing_no_norm TEXT, threshold NUMERIC)

**Purpose**: Find similar drawing numbers using pg_trgm trigram similarity (FR-037 to FR-040).

**Signature**: `RETURNS TABLE(drawing_id UUID, drawing_no_norm TEXT, similarity_score NUMERIC)`

**Logic**:
1. Query drawings table WHERE project_id matches AND NOT is_retired
2. Filter by `similarity(drawing_no_norm, p_drawing_no_norm) > threshold` (default 0.85)
3. ORDER BY similarity score DESC
4. LIMIT 3 (return top 3 matches per FR-039)

**Prerequisites**: pg_trgm extension enabled, GIN index on `drawing_no_norm`

---

## Entity Relationship Diagram

```
organizations (existing)
  └── 1:N → projects (existing)
      ├── 1:N → drawings (NEW)
      │   └── 1:N → components (NEW)
      ├── 1:N → areas (NEW)
      │   └── 1:N → components
      ├── 1:N → systems (NEW)
      │   └── 1:N → components
      ├── 1:N → test_packages (NEW)
      │   ├── 1:N → components
      │   └── 1:N → mv_package_readiness (materialized view)
      ├── 1:N → welders (NEW)
      ├── 1:N → field_weld_inspections (NEW)
      ├── 1:N → needs_review (NEW)
      │   └── N:1 → components (optional)
      └── 1:N → audit_log (NEW)

progress_templates (NEW, global)
  └── 1:N → components (ON DELETE RESTRICT)

components (NEW)
  ├── 1:N → milestone_events (NEW)
  ├── 1:N → field_weld_inspections (NEW, for field_weld type components)
  └── 1:N → mv_drawing_progress (materialized view, via drawings)

welders (NEW)
  └── 1:N → field_weld_inspections (set by foreman)

field_weld_inspections (NEW)
  └── 1:N → field_weld_inspections (parent-child for repairs)

users (existing, Feature 004 single-org model)
  ├── 1:N → milestone_events.user_id
  ├── 1:N → welders.created_by
  ├── 1:N → welders.verified_by
  ├── 1:N → field_weld_inspections.created_by
  ├── 1:N → field_weld_inspections.last_updated_by
  ├── 1:N → field_weld_inspections.xray_flagged_by
  ├── 1:N → needs_review.created_by
  ├── 1:N → needs_review.resolved_by
  └── 1:N → audit_log.user_id
```

---

## Performance Considerations

**Table Sizes** (at 1M components):
- components: ~500MB (main data) + ~200MB (indexes) = 700MB
- field_weld_inspections: ~100MB (assuming 20% of components are field welds = 200k rows with 36 columns)
- milestone_events: ~50MB (1-3 events per component on average)
- audit_log: ~30MB (fewer entries than milestone_events)
- Other tables: <10MB each

**Query Performance Targets** (FR-033, FR-034):
- p90 <100ms for single component lookup (via `idx_components_project_id` + RLS)
- p95 <50ms for dashboard queries (via materialized views)
- Materialized view refresh: <5 seconds for 1M components (CONCURRENTLY mode prevents locks)

**Index Strategy**:
- Every foreign key has an index (e.g., `idx_components_project_id`)
- Multi-tenant filtering uses indexed `organization_id` column (via projects.organization_id)
- GIN indexes for JSONB columns (identity_key, attributes) and trigram search (drawing_no_norm)
- Partial indexes for status filtering (e.g., `WHERE status = 'unverified'`)

---

## Summary

**Tables Added**: 11 (drawings, areas, systems, test_packages, progress_templates, components, milestone_events, welders, field_weld_inspections, needs_review, audit_log)

**Total Tables**: 14 (4 existing + 10 new + invitations from Feature 002)

**Materialized Views**: 2 (mv_package_readiness, mv_drawing_progress)

**Stored Procedures**: 2 (calculate_component_percent, detect_similar_drawings)

**RLS Policies**: All 11 new tables have multi-tenant RLS policies filtering by `organization_id`

**Indexes**: ~53 total indexes (3-9 per table + GIN indexes for JSONB and trigram search)

**Seed Data**: 11 progress templates (1 per component type)

**Next Phase**: Generate API contracts (TanStack Query hooks) from this data model.
