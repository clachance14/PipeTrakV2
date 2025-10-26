# Research: Field Weld QC Module

**Feature**: 014-add-comprehensive-field
**Date**: 2025-10-22
**Research Phase**: Complete

## Research Method

All technical decisions were clarified through interactive brainstorming session with stakeholder. The conversation followed structured Socratic questioning to understand workflow, clarify ambiguous requirements, and explore architectural alternatives. All findings documented below.

## Key Research Questions & Decisions

### 1. Data Model Architecture

**Question**: How should field welds integrate with existing component tracking system?

**Decision**: **Normalized Separation**

Field welds stored as `field_weld` component type with extended data in separate `field_welds` table. One-to-one relationship via `component_id UNIQUE`.

**Rationale**:
- Clean separation of concerns (weld-specific data isolated)
- Easier to extend with additional QC features (e.g., photo attachments, inspection history)
- Reuses existing component infrastructure (progress tracking, drawing assignment, metadata inheritance)
- Queries can efficiently join when weld details needed

**Alternatives Considered**:

1. **Minimal Extension** (add weld fields directly to components table)
   - **Pros**: Simple, fewer tables, no joins
   - **Cons**: Pollutes components table with weld-specific columns (14+ new fields), harder to extend later
   - **Rejected because**: Weld-specific data (NDE, welder, status, repair links) doesn't apply to other component types

2. **Hybrid Registry** (separate construction vs QC data)
   - **Pros**: Mirrors real workflow split (foremen vs QC inspectors)
   - **Cons**: Data split across tables complicates queries, ambiguous which table owns which fields
   - **Rejected because**: Single source of truth simpler, most queries need both construction + QC data

**Implementation Notes**:
- `field_welds.component_id` has UNIQUE constraint (enforces one-to-one)
- Components table already supports `field_weld` type (validated in migration 00009)
- Existing component progress tracking reused (no duplicate logic)

---

### 2. Progress Template Milestone Weights

**Question**: What workflow stages should drive progress % for field welds, and how weighted?

**Decision**: **3-milestone workflow with unequal weights**
- Fit-up: 30%
- Weld Complete: 65%
- Accepted: 5%

**Rationale**:
- Welding is the primary work (65% reflects actual labor/time investment)
- Acceptance is verification only (5% - minimal effort, but critical gate)
- Failed welds reach 100% complete (status='rejected'), so don't inflate "work remaining" metrics
- Repair welds start at 30% (Fit-up auto-completed via trigger)

**Alternatives Considered**:

1. **Equal weights** (33% / 33% / 34%)
   - **Rejected because**: Doesn't reflect actual work distribution - welding takes significantly more time than fit-up or acceptance

2. **Acceptance weighted higher** (30% / 30% / 40%)
   - **Rejected because**: Stakeholder clarified acceptance is just verification, not substantial work

3. **Two separate templates** (original weld vs repair weld)
   - **Rejected because**: Adds complexity, skip logic (trigger auto-completes Fit-up for repairs) achieves same result

**Implementation Notes**:
- Template stored in `progress_templates` table with `component_type = 'field_weld'`
- `workflow_type = 'discrete'` (boolean milestones, not partial)
- Trigger `auto_start_repair_welds` sets Fit-up to true when `original_weld_id IS NOT NULL`

---

### 3. Repair Workflow Logic

**Question**: When a weld fails NDE, how should the system handle the failure and subsequent repair?

**Decision**: **Failed weld → 100% complete with rejected status, create new weld component for repair**

**Rationale**:
- Original failed weld doesn't show as "work remaining" in progress calculations (marked 100% complete)
- Repair weld shows as new active work item (0-100% progress separately)
- Clear audit trail (original weld preserved, repair linked via `original_weld_id`)
- Supports repair chains (repair of repair) - `original_weld_id` points to failed weld, not necessarily original

**Workflow**:
1. QC inspector records NDE result = FAIL
2. Trigger `handle_weld_rejection` fires:
   - Sets `status = 'rejected'`
   - Marks all milestones complete (100%)
3. UI prompts to create repair weld
4. New component + field_weld created with `original_weld_id` = failed weld ID
5. Trigger `auto_start_repair_welds` fires:
   - Sets Fit-up milestone complete (30%)
   - Ready for welding

**Alternatives Considered**:

1. **Decimal weld IDs** (42.0 for original, 42.1 for first repair, 42.2 for second repair)
   - **Pros**: Visually indicates repair sequence
   - **Cons**: Complex identity key generation, decimal arithmetic in commodity codes, harder to maintain uniqueness
   - **Rejected because**: Adds unnecessary complexity to existing identity key system

2. **Single weld record with repair history** (keep same component, add repair log)
   - **Pros**: Single component ID for all attempts
   - **Cons**: Progress calculations ambiguous (is it 95% if welding complete but rejected?), complicated to track which "version" is current
   - **Rejected because**: Clean separation (failed vs repair) makes progress tracking unambiguous

**Implementation Notes**:
- `field_welds.original_weld_id` nullable UUID foreign key (NULL for original welds)
- `field_welds.is_repair` computed column: `GENERATED ALWAYS AS (original_weld_id IS NOT NULL) STORED`
- Repair history query: recursive CTE traverses `original_weld_id` chain

---

### 4. NDE Inspection Workflow

**Question**: How should the system determine which welds require NDE, and how track inspection results?

**Decision**: **Boolean flag + simple enum result**
- `nde_required` BOOLEAN (set from CSV X-RAY% column or manually by QC)
- `nde_result` TEXT CHECK (PASS/FAIL/PENDING)
- `nde_type` TEXT (RT/UT/PT/MT - radiographic/ultrasonic/penetrant/magnetic)
- `nde_date` DATE
- `nde_notes` TEXT

**Rationale**:
- QC inspector determines NDE requirement in field (not auto-calculated)
- Engineering specs vary by project - no universal rule for "2-inch pipe in HC05 needs RT"
- Single latest result sufficient (no need for inspection history table)
- If result changes, audit captured via `updated_at` timestamp

**Alternatives Considered**:

1. **Auto-calculate NDE from spec/diameter**
   - **Pros**: Reduces manual data entry
   - **Cons**: Engineering specs vary by client/project, would require complex rules engine
   - **Rejected because**: Stakeholder confirmed NDE requirements determined by project-specific specs, easier to set boolean flag than maintain rules

2. **Separate inspection history table** (one-to-many)
   - **Pros**: Tracks all inspection attempts, full audit trail
   - **Cons**: Adds complexity, most queries only need latest result
   - **Rejected because**: YAGNI - if inspection fails, new weld created anyway (repair workflow), so latest result on original weld sufficient

3. **X-ray specific fields** (shot number, film ID, etc.)
   - **Rejected because**: Out of scope for initial release (documented in spec "Out of Scope" section)

**Implementation Notes**:
- CSV import sets `nde_required = true` if X-RAY% column has value
- QC inspector can toggle `nde_required` flag in UI if engineering changes spec
- `nde_result` defaults to NULL (pending) until inspector records result

---

### 5. CSV Import Strategy

**Question**: Should field weld import reuse existing material takeoff import flow, or have dedicated import?

**Decision**: **Dedicated edge function** (`import-field-welds`)

**Rationale**:
- Field weld CSV has unique format (WELD LOG.csv) - different columns than material takeoff
- Different validation rules (weld type enum, welder stencil format, NDE result values)
- Different progress initialization logic (Date Welded → 95%, NDE PASS → 100%)
- Auto-creates welders from stencils (not applicable to material takeoff)
- Cleaner to maintain separate flows than complicate existing working import

**CSV Format** (from stakeholder's WELD LOG.csv):
```csv
Weld ID Number,Drawing / Isometric Number,SPEC,Weld Size,Schedule,Weld Type,Base Metal,X-RAY %,Welder Stencil,Date Welded,Type of NDE Performed,NDE Result,Comments
1,P-26B07,HC05,1",XS,SW,CS,5%,K-07,2024-01-15,RT,PASS,
2,P-93909,HC05,3",STD,BW,CS,5%,R-05,2024-01-16,UT,PASS,
```

**Required Columns**: Weld ID Number, Drawing / Isometric Number, Weld Type
**Optional Columns**: All others (spec, size, schedule, base metal, X-RAY %, welder stencil, date welded, NDE type/result, comments)

**Validation Rules**:
1. Required fields present (Weld ID, Drawing, Weld Type)
2. Valid weld type (BW, SW, FW, TW)
3. Valid NDE result if present (PASS, FAIL, PENDING)
4. Drawing exists in database (normalize drawing number before lookup)
5. Unique Weld ID Number within project

**Error Handling**:
- Skip invalid rows (continue processing)
- Generate downloadable error report CSV (row number + specific error message)
- Transaction rollback if critical error (e.g., database connection lost)

**Alternatives Considered**:

1. **Extend existing import-takeoff function**
   - **Pros**: Code reuse, single import endpoint
   - **Cons**: Would require complex branching logic based on component type, different CSV column mappings, risk breaking existing working import
   - **Rejected because**: Existing import is production-stable, don't want to risk regression

**Implementation Notes**:
- Edge function location: `supabase/functions/import-field-welds/`
- Uses PapaParse for CSV parsing (same as existing import)
- Auto-creates welders: if stencil not found, INSERT INTO welders with status='unverified'
- Progress initialization:
  - If `Date Welded` present: Set "Weld Complete" milestone → 95%
  - If `NDE Result` = PASS: Set "Accepted" milestone → 100%
  - Otherwise: 0% (not started)

---

### 6. Welder Verification Workflow

**Question**: Should welders require verification/certification tracking before assignment?

**Decision**: **No verification workflow in initial release**

Welders immediately available for assignment after creation. Verification fields exist in database schema (`status`, `verified_at`, `verified_by`) but no UI or workflow to set them.

**Rationale**:
- Simplifies MVP scope
- Foremen need to assign welders immediately in field (don't want to block on admin approval)
- Certification tracking is complex (expiry dates, multiple cert types, renewal process) - better as future dedicated feature

**Future Roadmap** (out of scope):
- Welder certification management (cert number, expiry date, cert type)
- Expiration warnings
- Automatic de-assignment when cert expires
- Certification document uploads

**Alternatives Considered**:

1. **Full certification tracking now**
   - **Rejected because**: Out of scope for initial release, adds significant complexity

2. **Simple verify/unverified flag**
   - **Rejected because**: If we're not enforcing verification, why have the flag? Just creates confusion. Better to omit workflow entirely.

**Implementation Notes**:
- Welder table keeps `status` VARCHAR (unverified/verified), `verified_at`, `verified_by` columns for future use
- All welders created with `status = 'unverified'` (consistent default)
- RLS policies don't restrict based on status (all welders visible/assignable)
- UI doesn't show status field or verification button

---

## Technology Choices

### CSV Parsing Library: PapaParse

**Decision**: Use PapaParse 5.5 for CSV parsing in edge function

**Rationale**:
- Already used in existing import-takeoff edge function (proven in production)
- Handles quoted fields, escaped commas, BOM markers (Excel exports)
- Stream parsing support (memory efficient for large files)
- Deno-compatible (edge function runtime)

**Alternatives**: None evaluated - existing dependency works well

---

### Component Type Validation

**Decision**: Add `field_weld` to existing component type enum

**Rationale**:
- Component type already defined in migrations (00009, 00010) with 11 types
- `field_weld` already listed but never implemented
- Validation function `validate_component_identity_key` needs update to handle field_weld

**Implementation**: Verify migration 00010 includes `field_weld` in CHECK constraint

---

## Database Design Decisions

### Field Welds Table Schema

**Core Fields**:
- `id` UUID PK
- `component_id` UUID UNIQUE FK (one-to-one relationship)
- `project_id` UUID FK (for RLS performance - denormalized)

**Weld Specifications**:
- `weld_type` TEXT CHECK (BW/SW/FW/TW)
- `weld_size` TEXT (e.g., "1"", "3"")
- `schedule` TEXT (STD, XS, etc.)
- `base_metal` TEXT (CS, SS, etc.)
- `spec` TEXT (e.g., "HC05")

**Welder Assignment**:
- `welder_id` UUID FK welders(id) NULL
- `date_welded` DATE NULL

**NDE Tracking**:
- `nde_required` BOOLEAN DEFAULT false
- `nde_type` TEXT NULL (RT/UT/PT/MT)
- `nde_result` TEXT CHECK (PASS/FAIL/PENDING) NULL
- `nde_date` DATE NULL
- `nde_notes` TEXT NULL

**Status & Repair**:
- `status` TEXT CHECK (active/accepted/rejected) DEFAULT 'active'
- `original_weld_id` UUID FK field_welds(id) NULL
- `is_repair` BOOLEAN GENERATED (computed from original_weld_id)

**Audit**:
- `created_at` TIMESTAMPTZ DEFAULT now()
- `created_by` UUID FK users(id)
- `updated_at` TIMESTAMPTZ DEFAULT now()
- `updated_by` UUID FK users(id)

### Indexes Strategy

**Performance-critical indexes**:
1. `idx_field_welds_component_id` - UNIQUE (enforces one-to-one)
2. `idx_field_welds_project_id` - For RLS queries
3. `idx_field_welds_welder_id` - For welder assignment queries
4. `idx_field_welds_original_weld_id` - For repair history traversal
5. `idx_field_welds_status_active` - Partial index WHERE status='active' (most queries filter active welds)

### Triggers

**1. handle_weld_rejection** (BEFORE UPDATE ON field_welds)
- Fires when `nde_result` changes to FAIL
- Sets `status = 'rejected'`
- Marks component 100% complete (all milestones true)
- Prevents showing rejected weld as work remaining

**2. auto_start_repair_welds** (AFTER INSERT ON field_welds)
- Fires when new field_weld created with `original_weld_id` NOT NULL
- Sets Fit-up milestone complete on linked component (30% progress)
- Ready for welding without manual intervention

**3. update_field_weld_timestamp** (BEFORE UPDATE ON field_welds)
- Auto-updates `updated_at` to now()
- Standard audit pattern

### RLS Policies

**Multi-tenant isolation** via project → organization:
```sql
-- SELECT: All team members can view welds in their org's projects
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
)

-- INSERT: Foremen/QC/Admins can create welds
WITH CHECK (
  project_id IN (SELECT id FROM projects WHERE organization_id = ...)
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector')
  )
)

-- UPDATE: Same permissions as INSERT
-- DELETE: Only owner/admin can delete
```

---

## Integration Points

### Existing Systems

**Component Tracking**: Field welds reuse existing:
- Progress template system (`progress_templates` table)
- Component progress tracking (`components.percent_complete`, `progress_state` JSONB)
- Drawing assignment (`components.drawing_id`)
- Metadata inheritance (`components.area_id`, `system_id`, `test_package_id`)

**Drawing Table**: Field welds appear in existing drawing-component table:
- Filter: Add "Field Weld" option to component type dropdown
- Row rendering: Conditional render `FieldWeldRow` component when `type = 'field_weld'`
- Columns: Add Welder, Date Welded, NDE Status, Status Badge to table

**Import System**: Separate from material takeoff import:
- Different edge function (`import-field-welds` vs `import-takeoff`)
- Different CSV format and validation
- Different UI (new tab in imports page)

---

## Performance Considerations

### CSV Import Performance

**Target**: 2000 welds imported in <30 seconds

**Strategy**:
- Batch inserts (1000 rows per INSERT statement)
- Single transaction (all-or-nothing)
- Parallel validation (validate rows while parsing, don't wait for full file parse)
- Error-tolerant (skip invalid rows, continue processing)

**Estimated Performance**:
- Parse 2000-row CSV: ~500ms (PapaParse)
- Validate 2000 rows: ~1s (JS validation in edge function)
- Database inserts: ~2s (2x 1000-row batches)
- Auto-create welders: ~500ms (deduplicate stencils, bulk insert)
- Total: ~4s (well under 30s target)

### Drawing Table Performance

**Existing Performance** (from Feature 010):
- 500 drawings + 10,000 components
- Virtual scrolling with @tanstack/react-virtual
- Fixed row heights (64px drawing, 60px component)
- 10 row overscan

**Impact of Field Welds**:
- Field welds add ~2000-5000 components per project (typical)
- Virtual scrolling already handles 10k+ components
- Additional columns (Welder, NDE Status) don't significantly impact render performance
- No additional performance optimization needed

---

## Open Questions

**None** - All questions resolved during brainstorming session.

---

## Research Complete

All technical decisions documented and ready for design phase (Phase 1).

**Next Phase**: Generate data-model.md with complete database schema, contract definitions for hooks, and quickstart developer guide.
