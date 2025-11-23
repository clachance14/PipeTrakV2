# Test Package Data Model and Schema

**Document Version**: 1.0
**Last Updated**: 2025-11-23
**Audience**: Backend developers, database architects, feature planning

---

## Purpose

This document analyzes the current test package data model in PipeTrak and proposes enhancements to support industry-standard test package workflows for chemical plant and refinery construction. It documents existing schema, identifies gaps relative to industry practices, and proposes specific schema changes for future enhancements.

---

## Current Schema Overview

### Core Tables

#### 1. `test_packages` (Foundation)

**Purpose**: Collections of components/ISOs grouped for testing.

**Schema** (as of Migration 00009 + enhancements):
```sql
CREATE TABLE test_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  test_type TEXT,  -- Added: 'Hydrostatic Test', 'Pneumatic Test', etc.
  requires_coating BOOLEAN DEFAULT false,  -- Added: coating stage required?
  requires_insulation BOOLEAN DEFAULT false,  -- Added: insulation stage required?
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Current Capabilities**:
- ✅ Basic package identification (name, description)
- ✅ Project scoping (multi-project support)
- ✅ Target date tracking
- ✅ Test type designation (hydrotest, pneumatic, etc.)
- ✅ Coating/insulation requirements

**Limitations**:
- ❌ No test pressure storage (calculated elsewhere, not persisted)
- ❌ No test medium storage (water, air, nitrogen)
- ❌ No design pressure reference (for calculating test pressure)
- ❌ No service type (liquid, gas, steam)
- ❌ No pressure class (150#, 300#, 600#)
- ❌ No isolation point documentation
- ❌ No overall package status (beyond workflow stages)

---

#### 2. `package_workflow_stages` (Stage Tracking)

**Purpose**: Track 7-stage sequential workflow with sign-offs.

**Schema** (Migration 20251121234756):
```sql
CREATE TABLE package_workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES test_packages(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL CHECK (stage_name IN (
    'Pre-Hydro Acceptance',
    'Test Acceptance',
    'Drain/Flush Acceptance',
    'Post-Hydro Acceptance',
    'Protective Coatings Acceptance',
    'Insulation Acceptance',
    'Final Package Acceptance'
  )),
  stage_order INTEGER NOT NULL CHECK (stage_order BETWEEN 1 AND 7),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'in_progress', 'completed', 'skipped'
  )),
  stage_data JSONB,  -- Flexible data per stage
  signoffs JSONB,  -- Sign-off records
  skip_reason TEXT,  -- Required if status = 'skipped'
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(package_id, stage_name)
);
```

**Current Capabilities**:
- ✅ Sequential stage tracking (7 stages, ordered)
- ✅ Status per stage (not_started, in_progress, completed, skipped)
- ✅ Flexible stage data (JSONB for stage-specific fields)
- ✅ Sign-off tracking (JSONB for multiple sign-offs)
- ✅ Skip reason documentation (if stage bypassed)
- ✅ Completion audit (who completed, when)

**Stage Names** (Current):
1. Pre-Hydro Acceptance
2. Test Acceptance
3. Drain/Flush Acceptance
4. Post-Hydro Acceptance
5. Protective Coatings Acceptance
6. Insulation Acceptance
7. Final Package Acceptance

**Limitations**:
- ❌ Stage names specific to hydrotest workflow (not generic)
- ❌ No stage-specific checklists (just JSONB stage_data)
- ❌ No file attachment support (test photos, reports)
- ❌ No multi-party sign-off workflow (just JSONB signoffs)

---

#### 3. `package_certificates` (Test Certificates)

**Purpose**: Store formal Pipe Testing Acceptance Certificate data.

**Schema** (Migration 20251121234718):
```sql
CREATE TABLE package_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL UNIQUE REFERENCES test_packages(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL,  -- e.g., 'PKG-001'
  client TEXT,
  client_spec TEXT,
  line_number TEXT,
  test_pressure NUMERIC(10, 2) NOT NULL CHECK (test_pressure > 0),
  pressure_unit TEXT NOT NULL DEFAULT 'PSIG' CHECK (pressure_unit IN ('PSIG', 'BAR', 'KPA', 'PSI')),
  test_media TEXT NOT NULL CHECK (length(trim(test_media)) > 0),
  temperature NUMERIC(6, 2) NOT NULL CHECK (temperature > -273),
  temperature_unit TEXT NOT NULL DEFAULT 'F' CHECK (temperature_unit IN ('F', 'C', 'K')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Current Capabilities**:
- ✅ Formal certificate documentation
- ✅ Sequential certificate numbering (via `generate_certificate_number()` RPC)
- ✅ Test pressure and unit tracking
- ✅ Test media documentation (water, air, nitrogen)
- ✅ Temperature recording
- ✅ Client and spec reference

**Helper Function**:
```sql
CREATE FUNCTION generate_certificate_number(p_project_id UUID) RETURNS TEXT;
-- Returns: 'PKG-001', 'PKG-002', etc. (sequential per project)
```

**Limitations**:
- ❌ No hold time recording (how long pressure maintained)
- ❌ No gauge calibration reference
- ❌ No leak documentation (if test failed, where were leaks)
- ❌ No re-test tracking (if initial test failed)
- ❌ No inspector information (who performed test)
- ❌ No photo attachments (gauge readings, leak photos)

---

#### 4. `package_workflow_templates` (Test Type Templates)

**Purpose**: Define which workflow stages apply to each test type.

**Schema** (Migration 20251122184641):
```sql
CREATE TABLE package_workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type TEXT NOT NULL CHECK (test_type IN (
    'Sensitive Leak Test',
    'Pneumatic Test',
    'Alternative Leak Test',
    'In-service Test',
    'Hydrostatic Test',
    'Other'
  )),
  stage_name TEXT NOT NULL CHECK (stage_name IN (
    'Pre-Hydro Acceptance',
    'Test Acceptance',
    'Drain/Flush Acceptance',
    'Post-Hydro Acceptance',
    'Protective Coatings Acceptance',
    'Insulation Acceptance',
    'Final Package Acceptance'
  )),
  stage_order INTEGER NOT NULL CHECK (stage_order BETWEEN 1 AND 7),
  is_required BOOLEAN NOT NULL DEFAULT true,
  default_skip_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(test_type, stage_name)
);
```

**Current Capabilities**:
- ✅ Test-type-specific workflow configuration
- ✅ Stage ordering per test type
- ✅ Required vs optional stage designation
- ✅ Default skip reasons (e.g., "Pneumatic test doesn't require drain/flush")

**Example Usage**:
- Hydrostatic Test: All 7 stages required
- Pneumatic Test: Skip "Drain/Flush Acceptance" (no water to drain)
- Sensitive Leak Test: Custom stage order

**Limitations**:
- ❌ No per-stage checklist templates (just required/optional flag)
- ❌ No per-stage role assignments (who can complete each stage)
- ❌ No per-stage document requirements (what attachments needed)

---

### Related Tables

#### `drawings` (ISOs)

**Purpose**: Store isometric drawings (ISOs) assigned to test packages.

**Schema** (Migration 00009):
```sql
CREATE TABLE drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_no_raw TEXT NOT NULL,
  drawing_no_norm TEXT NOT NULL,  -- Normalized for matching
  title TEXT,
  rev TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_retired BOOLEAN NOT NULL DEFAULT false,
  retire_reason TEXT
);
```

**Relationship to Test Packages**:
- Drawings can be assigned to test packages (via foreign key on drawings table)
- Test package groups multiple ISOs for testing
- Component list derived from ISOs in package

**Current Gap**: No direct `test_package_id` foreign key on `drawings` table yet (may be added in future).

---

#### `components` (Component Tracking)

**Purpose**: Track individual pipe components (spools, fittings, valves, etc.).

**Schema** (estimated from context):
```sql
CREATE TABLE components (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  drawing_id UUID REFERENCES drawings(id),  -- ISO reference
  test_package_id UUID REFERENCES test_packages(id),  -- Package assignment
  component_type TEXT,  -- 'spool', 'valve', 'fitting', etc.
  tag_number TEXT,
  material_spec TEXT,
  heat_number TEXT,  -- MTC traceability
  -- ... milestone tracking fields
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Relationship to Test Packages**:
- Components assigned to test packages
- Component list = all components in package
- Milestone completion tracked per component
- MTC traceability via heat_number

---

#### `welds` (Weld Tracking)

**Purpose**: Track individual welds with inspection status.

**Schema** (estimated from context):
```sql
CREATE TABLE welds (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  drawing_id UUID REFERENCES drawings(id),
  weld_number TEXT UNIQUE,
  welder_id UUID REFERENCES welders(id),
  weld_type TEXT,  -- 'butt', 'socket', 'fillet'
  nde_type TEXT,  -- 'RT', 'UT', 'PT', 'MT', 'VT'
  nde_status TEXT,  -- 'pending', 'accepted', 'rejected', 'repair'
  nde_date DATE,
  inspector_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Relationship to Test Packages**:
- All welds in package must be inspected and accepted before testing
- Weld maps included in test package documentation
- NDE reports required for MC Certificate

**Current Gap**: No direct link from welds to test packages (linked via drawing → test package).

---

## Industry Standards Mapping

### ASME B31.3 Requirements

**Code Requirements** vs **Current Schema**:

| Requirement | Code Reference | Current Support | Gap |
|-------------|----------------|-----------------|-----|
| **Test pressure = 1.5× design** | Para 345.4.2 | ⚠️ Partial (test_pressure in certificate) | No design_pressure field to verify calculation |
| **Temperature correction** | Para 345.4.2(a) | ❌ No | No design_temperature or test_temperature fields |
| **Hold time ≥10 min** | Para 345.4.2(c) | ❌ No | No hold_time field in certificate |
| **Test medium** | Para 345.4 | ✅ Yes | test_media field in certificate |
| **Leak acceptance** | Para 345.4.2(c) | ⚠️ Partial | No leak documentation if test failed |
| **Test records** | Para 345.2.7 | ✅ Yes | package_certificates table |

---

### Typical Test Package Contents (Industry Standard)

**Required Documentation** vs **Current Schema**:

| Document | Industry Requirement | Current Support | Gap |
|----------|---------------------|-----------------|-----|
| **Marked-up P&IDs** | Test boundaries highlighted | ❌ N/A | Contractors don't have P&IDs (use ISOs instead) |
| **Isometric drawings** | All ISOs in package | ✅ Yes | drawings table |
| **Component list** | All components in package | ✅ Yes | components table |
| **Weld maps** | Weld locations, numbers | ✅ Yes | welds table |
| **NDE reports** | RT, UT, PT, MT results | ⚠️ Partial | NDE status tracked, but no attachment storage |
| **MTCs** | Material test certificates | ⚠️ Partial | heat_number in components, but no PDF attachment |
| **Calibration certificates** | Test gauge calibration | ❌ No | No calibration tracking |
| **Test procedure** | Approved test procedure | ❌ No | No procedure document storage |
| **Test report** | Results, photos, sign-offs | ⚠️ Partial | certificate + signoffs, but no photo attachments |
| **Punch list** | Open items at MC | ⚠️ Partial | Punch list exists, but no link to test package |

---

## Schema Enhancement Opportunities

### Priority 1: High-Value Additions

#### Enhancement 1.1: Add Provided Test Parameter Fields to `test_packages`

**Purpose**: Store test parameters provided by engineering (from line list and testing schedule).

**IMPORTANT**: Contractors receive test parameters from engineering - they do NOT calculate these values.

**Proposed Schema Change**:
```sql
ALTER TABLE test_packages
ADD COLUMN test_pressure NUMERIC(10, 2),  -- Test pressure (provided by engineering)
ADD COLUMN test_media TEXT,  -- Test media (water, air, nitrogen, etc.)
ADD COLUMN pressure_unit TEXT DEFAULT 'PSIG' CHECK (pressure_unit IN ('PSIG', 'BAR', 'KPA', 'PSI')),
ADD COLUMN service_type TEXT CHECK (service_type IN ('liquid', 'gas', 'vapor', 'steam', 'two_phase')),
ADD COLUMN testing_schedule_ref TEXT;  -- Reference to testing schedule document
```

**Benefits**:
- Store engineering-provided test parameters (test_type already exists, add test_pressure and test_media)
- No calculation required (values provided, not calculated)
- Reference to testing schedule for traceability
- Service type for context (optional, from line list if available)

**Implementation**:
- Add fields via migration
- Import test parameters from line list/testing schedule CSV
- Display in UI for test execution reference
- Validate test_pressure is provided before allowing test execution

**Note**: This schema stores PROVIDED values, not calculated values. Engineering is responsible for test pressure calculations per ASME B31.3.

---

#### Enhancement 1.2: Add Isolation Point Documentation to `test_packages`

**Purpose**: Document test boundaries (blinds, valves, caps).

**Proposed Schema Change**:
```sql
ALTER TABLE test_packages
ADD COLUMN isolation_points JSONB;  -- Array of isolation point objects
```

**JSONB Structure**:
```json
{
  "isolation_points": [
    {
      "location": "ISO-2-CW-101-A4, Weld W-042",
      "type": "flange",
      "method": "blind",
      "notes": "8\" 150# blind flange, gasket: spiral wound",
      "installed": true,
      "installed_date": "2025-11-15",
      "removed": false
    },
    {
      "location": "ISO-2-CW-102-A4, Valve XV-1234",
      "type": "valve",
      "method": "closure",
      "notes": "Gate valve, verified closes fully",
      "installed": true,
      "installed_date": "2025-11-15"
    }
  ]
}
```

**Benefits**:
- Clear documentation of test boundaries
- Field verification checklist (all isolation points installed?)
- Post-test removal tracking (temporary blinds removed?)
- Historical record of test setup

**Alternative**: Create separate `test_package_isolation_points` table (more normalized, queryable).

---

#### Enhancement 1.3: Add Test Execution Details to `package_certificates`

**Purpose**: Record complete test execution data per ASME B31.3.

**Proposed Schema Change**:
```sql
ALTER TABLE package_certificates
ADD COLUMN test_start_time TIMESTAMPTZ,
ADD COLUMN test_end_time TIMESTAMPTZ,
ADD COLUMN hold_time_minutes INTEGER CHECK (hold_time_minutes >= 10),  -- ASME minimum 10 min
ADD COLUMN pressure_gauge_1_serial TEXT,  -- Gauge calibration traceability
ADD COLUMN pressure_gauge_2_serial TEXT,  -- Redundant gauge
ADD COLUMN gauge_calibration_date DATE,
ADD COLUMN ambient_temperature NUMERIC(6, 2),
ADD COLUMN test_result TEXT CHECK (test_result IN ('pass', 'fail', 'conditional_pass')),
ADD COLUMN leak_locations JSONB,  -- Array of leak descriptions if test failed
ADD COLUMN inspector_id UUID REFERENCES users(id),
ADD COLUMN inspector_certification TEXT,
ADD COLUMN witness_id UUID REFERENCES users(id),  -- Third-party inspector
ADD COLUMN client_rep_id UUID REFERENCES users(id);  -- Client acceptance
```

**JSONB Structure for Leak Locations** (if test failed):
```json
{
  "leak_locations": [
    {
      "location": "ISO-2-CW-101-A4, Weld W-042",
      "severity": "minor_weeping",
      "description": "Small weep at 6 o'clock position",
      "repair_required": true
    }
  ]
}
```

**Benefits**:
- Complete test record per ASME B31.3 requirements
- Hold time verification (≥10 minutes)
- Gauge calibration traceability
- Multi-party sign-off tracking (inspector, witness, client)
- Leak documentation for failed tests (supports re-test tracking)

---

#### Enhancement 1.4: Create `test_package_attachments` Table

**Purpose**: Store photos, PDFs, and documents related to test packages.

**Proposed Schema**:
```sql
CREATE TABLE test_package_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES test_packages(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES package_workflow_stages(id) ON DELETE SET NULL,  -- Optional stage link
  attachment_type TEXT NOT NULL CHECK (attachment_type IN (
    'photo',
    'pdf',
    'certificate',
    'test_report',
    'nde_report',
    'mtc',
    'calibration_cert',
    'procedure',
    'other'
  )),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,  -- Supabase Storage path
  file_size INTEGER,  -- Bytes
  mime_type TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_test_package_attachments_package_id ON test_package_attachments(package_id);
CREATE INDEX idx_test_package_attachments_stage_id ON test_package_attachments(stage_id);
CREATE INDEX idx_test_package_attachments_type ON test_package_attachments(attachment_type);
```

**Benefits**:
- Store test photos (gauge readings, leak photos, test setup)
- Store NDE reports (PDF radiography, ultrasonic reports)
- Store MTCs (material test certificates)
- Store calibration certificates (test gauge calibration)
- Link attachments to specific workflow stages
- Complete digital documentation package

**Integration**: Use Supabase Storage for file storage, table stores metadata + path.

---

### Priority 2: Workflow Enhancements

#### Enhancement 2.1: Add Overall Package Status to `test_packages`

**Purpose**: High-level status for reporting and filtering.

**Proposed Schema Change**:
```sql
ALTER TABLE test_packages
ADD COLUMN status TEXT DEFAULT 'planning' CHECK (status IN (
  'planning',           -- Initial creation, not started
  'construction',       -- Components being installed
  'mechanical_completion',  -- MC walkdown and punch list resolution
  'pre_test_prep',      -- Installing test boundaries, equipment
  'testing',            -- Executing pressure test
  'repair_retest',      -- Repairing leaks, re-testing
  'accepted',           -- Test passed, client accepted
  'commissioned'        -- Handed over to commissioning (optional)
));
```

**Benefits**:
- Simple status filtering (show all packages in 'testing' status)
- Progress dashboard (count packages by status)
- Stage-independent status (status can advance even if some stages skipped)

**Relationship to Workflow Stages**: Status is derived from workflow_stages table (highest completed stage determines status).

---

#### Enhancement 2.2: Create `test_package_history` Table (Audit Log)

**Purpose**: Track all status changes, stage completions, and modifications.

**Proposed Schema**:
```sql
CREATE TABLE test_package_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES test_packages(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created',
    'status_changed',
    'stage_completed',
    'stage_skipped',
    'test_passed',
    'test_failed',
    'repaired',
    'accepted',
    'modified'
  )),
  from_value TEXT,  -- Previous value (for changes)
  to_value TEXT,    -- New value
  description TEXT,
  user_id UUID REFERENCES users(id),
  event_timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_test_package_history_package_id ON test_package_history(package_id);
CREATE INDEX idx_test_package_history_event_type ON test_package_history(event_type);
CREATE INDEX idx_test_package_history_timestamp ON test_package_history(event_timestamp);
```

**Benefits**:
- Complete audit trail (who changed what, when)
- Historical reporting (how long in each status, cycle time analysis)
- Compliance evidence (who approved, when)
- Debugging (understand why package status changed)

**Auto-Population**: Use triggers on test_packages and package_workflow_stages to auto-insert history records.

---

#### Enhancement 2.3: Create `test_package_checklists` Table

**Purpose**: Stage-specific checklists for completeness verification.

**Proposed Schema**:
```sql
CREATE TABLE test_package_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES package_workflow_templates(id) ON DELETE CASCADE,  -- Template reference
  checklist_item TEXT NOT NULL,
  item_order INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT true,
  help_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE test_package_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES package_workflow_stages(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES test_package_checklists(id),
  is_checked BOOLEAN DEFAULT false,
  checked_by UUID REFERENCES users(id),
  checked_at TIMESTAMPTZ,
  notes TEXT
);
```

**Example Checklist** (Pre-Hydro Acceptance):
- [ ] All components installed
- [ ] All welds inspected and accepted
- [ ] All punch list items resolved (Category A)
- [ ] Test boundaries installed (blinds, valves, caps)
- [ ] Pressure gauges calibrated (certificates available)
- [ ] Test procedure approved
- [ ] Safety review complete

**Benefits**:
- Ensures completeness before stage advancement
- Reduces errors (forgot to calibrate gauge, forgot to resolve punch list)
- Compliance evidence (all items checked)
- User guidance (help_text provides instructions)

---

### Priority 3: Advanced Features

#### Enhancement 3.1: Create `line_list_data` Table

**Purpose**: Import line list data to auto-populate test package metadata.

**Proposed Schema**:
```sql
CREATE TABLE line_list_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  line_number TEXT NOT NULL,  -- e.g., '2-CW-101-A4'
  size TEXT,  -- e.g., '2"'
  service_code TEXT,  -- e.g., 'CW' (Cooling Water)
  service_description TEXT,  -- e.g., 'Cooling Water'
  design_pressure NUMERIC(10, 2),
  design_temperature NUMERIC(6, 2),
  pressure_unit TEXT DEFAULT 'PSIG',
  temperature_unit TEXT DEFAULT 'F',
  fluid_type TEXT CHECK (fluid_type IN ('liquid', 'gas', 'vapor', 'steam', 'two_phase')),
  material_spec TEXT,  -- e.g., 'A106 GrB'
  pressure_class TEXT,  -- e.g., '150#', '300#'
  insulation_required BOOLEAN DEFAULT false,
  heat_trace_required BOOLEAN DEFAULT false,
  special_requirements TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(project_id, line_number)
);

CREATE INDEX idx_line_list_project_id ON line_list_data(project_id);
CREATE INDEX idx_line_list_service_code ON line_list_data(service_code);
CREATE INDEX idx_line_list_pressure_class ON line_list_data(pressure_class);
```

**Usage**:
1. Import line list CSV/Excel (line number, pressure, service, etc.)
2. Match line numbers to drawings/components
3. Auto-populate test package fields:
   - design_pressure (from line_list_data)
   - service_type (from fluid_type)
   - requires_insulation (from insulation_required)
4. Auto-calculate test_pressure (1.5× design_pressure)
5. Auto-recommend test_type (liquid → Hydrostatic, gas <10 bar → Pneumatic)

**Benefits**:
- Eliminate manual data entry
- Accurate test pressure calculations
- Consistent test type selection (logic-driven, not manual)
- Integration with engineering data (line list is authoritative source)

---

#### Enhancement 3.2: Create `test_package_iso_assignments` Table

**Purpose**: Many-to-many relationship between test packages and ISOs.

**Current Gap**: Drawings may have test_package_id foreign key, but this is one-to-many (one ISO, one package). Industry practice: one ISO can span multiple test packages (e.g., long ISO crosses test boundaries).

**Proposed Schema**:
```sql
CREATE TABLE test_package_iso_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES test_packages(id) ON DELETE CASCADE,
  drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  notes TEXT,  -- e.g., "Only welds W-001 through W-015 in this package"
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(package_id, drawing_id)
);

CREATE INDEX idx_test_package_iso_package_id ON test_package_iso_assignments(package_id);
CREATE INDEX idx_test_package_iso_drawing_id ON test_package_iso_assignments(drawing_id);
```

**Benefits**:
- Flexible ISO-to-package mapping (one ISO can be in multiple packages)
- Partial ISO assignment (notes field documents which welds in this package)
- Reassignment tracking (assigned_by, assigned_at audit trail)

**Query Example**: "Show all ISOs in package PKG-001"
```sql
SELECT d.drawing_no_raw, d.title
FROM drawings d
JOIN test_package_iso_assignments a ON d.id = a.drawing_id
WHERE a.package_id = '<package-uuid>'
ORDER BY d.drawing_no_raw;
```

---

#### Enhancement 3.3: Create `test_package_re_tests` Table

**Purpose**: Track re-test history when initial test fails.

**Proposed Schema**:
```sql
CREATE TABLE test_package_re_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES test_packages(id) ON DELETE CASCADE,
  certificate_id UUID REFERENCES package_certificates(id) ON DELETE SET NULL,  -- Link to original certificate
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  test_date TIMESTAMPTZ NOT NULL,
  test_result TEXT NOT NULL CHECK (test_result IN ('pass', 'fail')),
  failure_reason TEXT,  -- If failed, why?
  leak_locations JSONB,  -- Array of leak descriptions
  repair_description TEXT,  -- What repairs were made before re-test
  inspector_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(package_id, attempt_number)
);

CREATE INDEX idx_test_package_re_tests_package_id ON test_package_re_tests(package_id);
```

**Benefits**:
- Historical record of all test attempts
- Quality metrics (first-time pass rate = packages without re-tests)
- Root cause analysis (common failure reasons: weld defect, flange leak, etc.)
- Repair tracking (what was done between attempts)

**Query Example**: "Show packages with >1 test attempt (quality issues)"
```sql
SELECT tp.name, COUNT(rt.id) AS attempt_count
FROM test_packages tp
JOIN test_package_re_tests rt ON tp.id = rt.package_id
GROUP BY tp.id, tp.name
HAVING COUNT(rt.id) > 1
ORDER BY attempt_count DESC;
```

---

## Data Model Diagram (Enhanced)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TEST PACKAGES CORE                          │
└─────────────────────────────────────────────────────────────────────┘

                     ┌──────────────────────────┐
                     │    test_packages         │
                     ├──────────────────────────┤
                     │ id (PK)                  │
                     │ project_id (FK)          │
                     │ name                     │
                     │ description              │
                     │ target_date              │
                     │ test_type                │◄──────┐
                     │ design_pressure [NEW]    │       │
                     │ calculated_test_pressure │       │
                     │ service_type [NEW]       │       │
                     │ requires_coating         │       │
                     │ requires_insulation      │       │
                     │ status [NEW]             │       │
                     │ isolation_points [NEW]   │       │
                     └────────┬─────────────────┘       │
                              │                         │
                              │ 1:N                     │
                              ▼                         │
                     ┌──────────────────────────┐       │
                     │ package_workflow_stages  │       │
                     ├──────────────────────────┤       │
                     │ id (PK)                  │       │
                     │ package_id (FK)          │       │
                     │ stage_name               │       │ Determines
                     │ stage_order              │       │ which stages
                     │ status                   │       │ apply
                     │ stage_data (JSONB)       │       │
                     │ signoffs (JSONB)         │       │
                     │ skip_reason              │       │
                     │ completed_by (FK)        │       │
                     │ completed_at             │       │
                     └────────┬─────────────────┘       │
                              │                         │
                              │ 1:N                     │
                              ▼                         │
                     ┌──────────────────────────┐       │
                     │ test_package_checklist_  │       │
                     │ items [NEW]              │       │
                     ├──────────────────────────┤       │
                     │ id (PK)                  │       │
                     │ stage_id (FK)            │       │
                     │ checklist_id (FK) ───────┼───┐   │
                     │ is_checked               │   │   │
                     │ checked_by (FK)          │   │   │
                     │ checked_at               │   │   │
                     │ notes                    │   │   │
                     └──────────────────────────┘   │   │
                                                    │   │
                                                    │   │
                     ┌──────────────────────────┐   │   │
                     │ package_certificates     │   │   │
                     ├──────────────────────────┤   │   │
                     │ id (PK)                  │   │   │
                     │ package_id (FK UNIQUE) ──┼───┘   │
                     │ certificate_number       │       │
                     │ test_pressure            │       │
                     │ test_media               │       │
                     │ hold_time_minutes [NEW]  │       │
                     │ inspector_id [NEW] (FK)  │       │
                     │ witness_id [NEW] (FK)    │       │
                     │ leak_locations [NEW]     │       │
                     └──────────────────────────┘       │
                                                        │
                     ┌──────────────────────────┐       │
                     │ package_workflow_        │       │
                     │ templates                │◄──────┘
                     ├──────────────────────────┤
                     │ id (PK)                  │
                     │ test_type                │
                     │ stage_name               │
                     │ stage_order              │
                     │ is_required              │
                     │ default_skip_reason      │
                     └────────┬─────────────────┘
                              │
                              │ 1:N
                              ▼
                     ┌──────────────────────────┐
                     │ test_package_checklists  │
                     │ [NEW]                    │
                     ├──────────────────────────┤
                     │ id (PK)                  │
                     │ template_id (FK)         │
                     │ checklist_item           │
                     │ item_order               │
                     │ is_required              │
                     │ help_text                │
                     └──────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         SUPPORTING TABLES                           │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐         ┌──────────────────────────┐
│ test_package_            │         │ test_package_re_tests    │
│ attachments [NEW]        │         │ [NEW]                    │
├──────────────────────────┤         ├──────────────────────────┤
│ id (PK)                  │         │ id (PK)                  │
│ package_id (FK)          │         │ package_id (FK)          │
│ stage_id (FK, optional)  │         │ certificate_id (FK)      │
│ attachment_type          │         │ attempt_number           │
│ file_path                │         │ test_result              │
│ uploaded_by (FK)         │         │ failure_reason           │
└──────────────────────────┘         │ leak_locations (JSONB)   │
                                     │ repair_description       │
┌──────────────────────────┐         └──────────────────────────┘
│ test_package_history     │
│ [NEW]                    │         ┌──────────────────────────┐
├──────────────────────────┤         │ line_list_data [NEW]     │
│ id (PK)                  │         ├──────────────────────────┤
│ package_id (FK)          │         │ id (PK)                  │
│ event_type               │         │ project_id (FK)          │
│ from_value               │         │ line_number              │
│ to_value                 │         │ design_pressure          │
│ description              │         │ design_temperature       │
│ user_id (FK)             │         │ fluid_type               │
│ event_timestamp          │         │ material_spec            │
└──────────────────────────┘         │ pressure_class           │
                                     └──────────────────────────┘
┌──────────────────────────┐
│ test_package_iso_        │
│ assignments [NEW]        │
├──────────────────────────┤
│ id (PK)                  │
│ package_id (FK)          │
│ drawing_id (FK)          │
│ notes                    │
│ assigned_by (FK)         │
└──────────────────────────┘

┌──────────────────────────┐
│ drawings (ISOs)          │
├──────────────────────────┤
│ id (PK)                  │
│ project_id (FK)          │
│ drawing_no_raw           │
│ drawing_no_norm          │
└──────────────────────────┘

┌──────────────────────────┐
│ components               │
├──────────────────────────┤
│ id (PK)                  │
│ drawing_id (FK)          │
│ test_package_id (FK)     │
│ component_type           │
└──────────────────────────┘

┌──────────────────────────┐
│ welds                    │
├──────────────────────────┤
│ id (PK)                  │
│ drawing_id (FK)          │
│ weld_number              │
│ nde_status               │
└──────────────────────────┘
```

---

## Migration Strategy

### Phase 1: Critical Fields (Immediate Value)

**Migrations**:
1. Add test calculation fields to `test_packages` (design_pressure, calculated_test_pressure, service_type)
2. Add test execution fields to `package_certificates` (hold_time, inspector_id, leak_locations)
3. Add overall status to `test_packages` (status field)
4. Create `test_package_attachments` table (photo/PDF storage)

**Effort**: 2-3 days (migration + RPC functions + UI updates)

**ROI**: High (enables automated test pressure calculation, complete test documentation, photo attachments)

---

### Phase 2: Workflow Enhancements (Process Improvement)

**Migrations**:
1. Create `test_package_history` table (audit log)
2. Create `test_package_checklists` and `test_package_checklist_items` tables
3. Add isolation_points JSONB to `test_packages`
4. Create `test_package_re_tests` table

**Effort**: 3-5 days (migration + triggers + UI for checklists)

**ROI**: Medium-High (audit trail, checklist enforcement, re-test tracking)

---

### Phase 3: Data Integration (Advanced Features)

**Migrations**:
1. Create `line_list_data` table (line list import)
2. Create `test_package_iso_assignments` table (many-to-many ISO mapping)
3. Build import/export functions (CSV import, turnover package generation)

**Effort**: 5-7 days (import logic, data validation, UI for import)

**ROI**: Medium (eliminates manual data entry, but requires line list availability)

---

## RPC Functions (Proposed)

### ~~1. `calculate_test_pressure(package_id UUID) RETURNS NUMERIC`~~ (NOT NEEDED)

**NOTE**: This function is NOT needed because test pressure is provided by engineering, not calculated by contractors.

Test pressure comes from line list/testing schedule and is entered directly into the `test_pressure` field.

---

### ~~2. `recommend_test_type(p_service_type TEXT, p_design_pressure NUMERIC) RETURNS TEXT`~~ (NOT NEEDED)

**NOTE**: This function is NOT needed because test type (Test Class) is provided by engineering, not determined by contractors.

Test type comes from line list/testing schedule and is entered directly into the `test_type` field (which already exists in `test_packages` table).

---

### 3. `get_package_component_count(package_id UUID) RETURNS INTEGER`

**Purpose**: Count components in test package (for reporting).

**Logic**:
```sql
CREATE OR REPLACE FUNCTION get_package_component_count(p_package_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM components
    WHERE test_package_id = p_package_id
  );
END;
$$ LANGUAGE plpgsql;
```

**Usage**: Dashboard metric (e.g., "Package PKG-001: 47 components").

---

### 4. `get_package_weld_inspection_status(package_id UUID) RETURNS JSONB`

**Purpose**: Summarize weld inspection status for package.

**Logic**:
```sql
CREATE OR REPLACE FUNCTION get_package_weld_inspection_status(p_package_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_welds', COUNT(*),
    'accepted', COUNT(*) FILTER (WHERE nde_status = 'accepted'),
    'rejected', COUNT(*) FILTER (WHERE nde_status = 'rejected'),
    'pending', COUNT(*) FILTER (WHERE nde_status = 'pending'),
    'repair', COUNT(*) FILTER (WHERE nde_status = 'repair'),
    'all_accepted', COUNT(*) = COUNT(*) FILTER (WHERE nde_status = 'accepted')
  )
  INTO v_result
  FROM welds w
  JOIN components c ON w.drawing_id = c.drawing_id
  WHERE c.test_package_id = p_package_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

**Usage**: Pre-test completeness check (ensure all_accepted = true before testing).

---

## Related Documentation

- [TEST-PACKAGE-WORKFLOW-CONTEXT.md](./TEST-PACKAGE-WORKFLOW-CONTEXT.md) - Industry standards and workflow overview
- [TEST-PACKAGE-CREATION.md](./TEST-PACKAGE-CREATION.md) - ISO-based test package creation guide
- [TESTING-PROCEDURES.md](./TESTING-PROCEDURES.md) - Hydrotest and pneumatic testing procedures
- [TEST-PACKAGE-STAGES.md](./TEST-PACKAGE-STAGES.md) - Workflow stages and handoffs
- [SCHEMA-COMPLIANCE-WORKFLOW.md](./SCHEMA-COMPLIANCE-WORKFLOW.md) - Database schema compliance
- [RLS-RULES.md](../security/RLS-RULES.md) - Row Level Security patterns

---

## Summary

**Current State**: PipeTrak has a solid foundation for test package tracking with workflow stages, certificates, and templates.

**Gaps**: Missing test calculation fields, attachment storage, checklist enforcement, re-test tracking, and line list integration.

**Recommended Next Steps**:
1. **Phase 1** (Immediate): Add test calculation fields, attachment storage, overall status (2-3 days)
2. **Phase 2** (Near-term): Add audit log, checklists, re-test tracking (3-5 days)
3. **Phase 3** (Future): Line list import, ISO assignments, turnover package generation (5-7 days)

**Total Effort**: 10-15 days development time for all three phases.

**Business Value**: Complete digital test package workflow, ASME B31.3 compliance, reduced manual documentation, faster test execution, quality metrics (first-time pass rate), turnover package automation.
