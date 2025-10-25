# Data Model: Field Weld QC Module

**Feature**: 014-add-comprehensive-field
**Created**: 2025-10-22
**Status**: Phase 1 Design

## Overview

Field welds extend the existing component tracking system with weld-specific QC data. This document defines the complete database schema including tables, triggers, RLS policies, indexes, and progress templates.

## Architecture Pattern

Field welds use **normalized separation** pattern:
- Core component data stored in `components` table (type='field_weld')
- Extended weld data in `field_welds` table (one-to-one via component_id)
- Reuses existing component infrastructure (progress tracking, drawing assignment, metadata inheritance)

## Tables

### field_welds

Complete weld-specific data including specifications, welder assignment, NDE inspection, status, and repair linkage.

```sql
CREATE TABLE field_welds (
  -- Primary Key & Relationships
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL UNIQUE REFERENCES components(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Weld Specifications
  weld_type TEXT NOT NULL CHECK (weld_type IN ('BW', 'SW', 'FW', 'TW')),
  weld_size TEXT,
  schedule TEXT,
  base_metal TEXT,
  spec TEXT,

  -- Welder Assignment
  welder_id UUID REFERENCES welders(id) ON DELETE RESTRICT,
  date_welded DATE,

  -- NDE Inspection Tracking
  nde_required BOOLEAN DEFAULT false NOT NULL,
  nde_type TEXT CHECK (nde_type IN ('RT', 'UT', 'PT', 'MT') OR nde_type IS NULL),
  nde_result TEXT CHECK (nde_result IN ('PASS', 'FAIL', 'PENDING') OR nde_result IS NULL),
  nde_date DATE,
  nde_notes TEXT,

  -- Status & Repair Management
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'rejected')),
  original_weld_id UUID REFERENCES field_welds(id) ON DELETE SET NULL,
  is_repair BOOLEAN GENERATED ALWAYS AS (original_weld_id IS NOT NULL) STORED,

  -- Audit Fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

-- Comments for documentation
COMMENT ON TABLE field_welds IS 'Weld-specific QC data extending components table for field_weld type';
COMMENT ON COLUMN field_welds.component_id IS 'One-to-one link to components table - enforced by UNIQUE constraint';
COMMENT ON COLUMN field_welds.project_id IS 'Denormalized for RLS performance - auto-synced via trigger_sync_project_id';
COMMENT ON COLUMN field_welds.weld_type IS 'BW=Butt Weld, SW=Socket Weld, FW=Fillet Weld, TW=Tack Weld';
COMMENT ON COLUMN field_welds.nde_type IS 'RT=Radiographic, UT=Ultrasonic, PT=Penetrant, MT=Magnetic Testing';
COMMENT ON COLUMN field_welds.status IS 'active=In Progress, accepted=NDE Passed, rejected=NDE Failed (completed but not accepted)';
COMMENT ON COLUMN field_welds.original_weld_id IS 'Link to failed weld this repairs - NULL for original welds';
COMMENT ON COLUMN field_welds.is_repair IS 'Computed column - true if original_weld_id IS NOT NULL';
```

### welders

Project-scoped registry of certified welders available for assignment to field welds.

```sql
CREATE TABLE welders (
  -- Primary Key & Relationships
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Welder Identity
  stencil TEXT NOT NULL CHECK (stencil ~ '^[A-Z0-9-]{2,12}$'),
  name TEXT NOT NULL,

  -- Verification Fields (future use - no workflow in initial release)
  status TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified', 'verified')),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Audit Fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Constraints
  UNIQUE (project_id, stencil)
);

-- Comments
COMMENT ON TABLE welders IS 'Project-scoped welder registry for field weld assignments';
COMMENT ON COLUMN welders.stencil IS 'Unique 2-12 character alphanumeric welder identifier (normalized to uppercase)';
COMMENT ON COLUMN welders.status IS 'unverified (default) or verified - no verification workflow in initial release';
COMMENT ON CONSTRAINT welders_project_id_stencil_key ON welders IS 'Enforce unique stencil within project (same stencil allowed across different projects)';
```

## Indexes

Performance-critical indexes for query optimization and constraint enforcement.

```sql
-- field_welds indexes
CREATE UNIQUE INDEX idx_field_welds_component_id ON field_welds(component_id);
CREATE INDEX idx_field_welds_project_id ON field_welds(project_id);
CREATE INDEX idx_field_welds_welder_id ON field_welds(welder_id);
CREATE INDEX idx_field_welds_original_weld_id ON field_welds(original_weld_id);
CREATE INDEX idx_field_welds_status_active ON field_welds(project_id) WHERE status = 'active';

-- welders indexes
CREATE INDEX idx_welders_project_id ON welders(project_id);
CREATE UNIQUE INDEX idx_welders_project_stencil ON welders(project_id, stencil);

-- Index comments
COMMENT ON INDEX idx_field_welds_component_id IS 'Enforces one-to-one relationship with components table';
COMMENT ON INDEX idx_field_welds_project_id IS 'Optimizes RLS policy checks (project-level isolation)';
COMMENT ON INDEX idx_field_welds_welder_id IS 'Optimizes queries filtering/grouping by assigned welder';
COMMENT ON INDEX idx_field_welds_original_weld_id IS 'Optimizes repair history traversal (recursive CTE)';
COMMENT ON INDEX idx_field_welds_status_active IS 'Partial index for common query filtering active welds only';
COMMENT ON INDEX idx_welders_project_stencil IS 'Enforces unique stencil within project scope';
```

## Triggers

Automated business logic for weld rejection handling, repair initialization, and timestamp management.

### 1. handle_weld_rejection

Automatically marks weld as rejected and completes all milestones when NDE fails.

```sql
CREATE OR REPLACE FUNCTION handle_weld_rejection()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when nde_result changes to FAIL
  IF NEW.nde_result = 'FAIL' AND (OLD.nde_result IS DISTINCT FROM 'FAIL') THEN
    -- Set status to rejected
    NEW.status := 'rejected';

    -- Mark all milestones complete on linked component (100% progress)
    UPDATE components
    SET
      percent_complete = 100,
      progress_state = jsonb_set(
        progress_state,
        '{milestones}',
        jsonb_build_object(
          'Fit-up', true,
          'Weld Complete', true,
          'Accepted', true
        )
      ),
      updated_at = now(),
      updated_by = NEW.updated_by
    WHERE id = NEW.component_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_handle_weld_rejection
  BEFORE UPDATE ON field_welds
  FOR EACH ROW
  EXECUTE FUNCTION handle_weld_rejection();

COMMENT ON FUNCTION handle_weld_rejection() IS 'Sets status=rejected and marks component 100% complete when NDE fails - prevents rejected welds showing as work remaining';
```

### 2. auto_start_repair_welds

Automatically completes Fit-up milestone when repair weld is created.

```sql
CREATE OR REPLACE FUNCTION auto_start_repair_welds()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for repair welds (original_weld_id NOT NULL)
  IF NEW.original_weld_id IS NOT NULL THEN
    -- Mark Fit-up milestone complete on linked component (30% progress)
    UPDATE components
    SET
      percent_complete = 30,
      progress_state = jsonb_set(
        progress_state,
        '{milestones,Fit-up}',
        'true'::jsonb
      ),
      updated_at = now(),
      updated_by = NEW.created_by
    WHERE id = NEW.component_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_start_repair_welds
  AFTER INSERT ON field_welds
  FOR EACH ROW
  EXECUTE FUNCTION auto_start_repair_welds();

COMMENT ON FUNCTION auto_start_repair_welds() IS 'Auto-completes Fit-up milestone (30%) for repair welds - skips prep work already done';
```

### 3. sync_field_weld_project_id

Automatically synchronizes denormalized project_id with component's actual project to prevent RLS bypass.

```sql
CREATE OR REPLACE FUNCTION sync_field_weld_project_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Lookup actual project_id from component → drawing → project chain
  SELECT p.id INTO NEW.project_id
  FROM components c
  INNER JOIN drawings d ON c.drawing_id = d.id
  INNER JOIN projects p ON d.project_id = p.id
  WHERE c.id = NEW.component_id;

  -- Fail if project cannot be determined
  IF NEW.project_id IS NULL THEN
    RAISE EXCEPTION 'Cannot determine project_id from component_id %', NEW.component_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_sync_project_id
  BEFORE INSERT OR UPDATE ON field_welds
  FOR EACH ROW
  EXECUTE FUNCTION sync_field_weld_project_id();

COMMENT ON FUNCTION sync_field_weld_project_id() IS 'Enforces project_id matches component.drawing.project_id - prevents RLS bypass and multi-tenant data leakage';
```

### 4. update_field_weld_timestamp

Standard audit trigger to maintain updated_at timestamp.

```sql
CREATE OR REPLACE FUNCTION update_field_weld_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_field_weld_timestamp
  BEFORE UPDATE ON field_welds
  FOR EACH ROW
  EXECUTE FUNCTION update_field_weld_timestamp();

COMMENT ON FUNCTION update_field_weld_timestamp() IS 'Maintains updated_at timestamp for audit trail';
```

### Trigger Execution Order

PostgreSQL executes BEFORE triggers in **alphabetical order by trigger name**. The current trigger ordering is:

1. `trigger_handle_weld_rejection` (alphabetically first - starts with 'h')
2. `trigger_sync_project_id` (alphabetically second - starts with 's')
3. `trigger_update_field_weld_timestamp` (alphabetically last - starts with 'u')

**Critical Dependencies**:
- `trigger_handle_weld_rejection` MUST run before `trigger_update_field_weld_timestamp` to ensure rejection status changes are captured in the updated timestamp.
- `trigger_sync_project_id` MUST run before RLS policy checks (enforced by BEFORE timing).

**Migration Safety**:
- ⚠️ DO NOT rename triggers in a way that changes alphabetical order.
- ⚠️ When adding new BEFORE UPDATE triggers, ensure names don't conflict with established order.
- ✅ Integration tests validate trigger execution sequence (see `tests/contract/field-welds/trigger-order.contract.test.ts`).

## RLS Policies

Row-level security policies enforcing multi-tenant isolation and role-based permissions.

### field_welds Policies

```sql
-- Enable RLS
ALTER TABLE field_welds ENABLE ROW LEVEL SECURITY;

-- SELECT: All team members can view field welds in their organization's projects
CREATE POLICY "field_welds_select_policy" ON field_welds
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id
      FROM projects p
      INNER JOIN users u ON u.organization_id = p.organization_id
      WHERE u.id = auth.uid()
    )
  );

-- INSERT: Foremen, QC inspectors, project managers, and admins can create field welds
CREATE POLICY "field_welds_insert_policy" ON field_welds
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id
      FROM projects p
      INNER JOIN users u ON u.organization_id = p.organization_id
      WHERE u.id = auth.uid()
        AND u.role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector')
    )
  );

-- UPDATE: Same roles that can create can also update
CREATE POLICY "field_welds_update_policy" ON field_welds
  FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id
      FROM projects p
      INNER JOIN users u ON u.organization_id = p.organization_id
      WHERE u.id = auth.uid()
        AND u.role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector')
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id
      FROM projects p
      INNER JOIN users u ON u.organization_id = p.organization_id
      WHERE u.id = auth.uid()
        AND u.role IN ('owner', 'admin', 'project_manager', 'foreman', 'qc_inspector')
    )
  );

-- DELETE: Only owners and admins can delete field welds
CREATE POLICY "field_welds_delete_policy" ON field_welds
  FOR DELETE
  USING (
    project_id IN (
      SELECT p.id
      FROM projects p
      INNER JOIN users u ON u.organization_id = p.organization_id
      WHERE u.id = auth.uid()
        AND u.role IN ('owner', 'admin')
    )
  );

-- Policy comments
COMMENT ON POLICY "field_welds_select_policy" ON field_welds IS 'Allow viewing field welds for projects in user organization';
COMMENT ON POLICY "field_welds_insert_policy" ON field_welds IS 'Allow creating field welds for foremen, QC inspectors, PMs, and admins';
COMMENT ON POLICY "field_welds_update_policy" ON field_welds IS 'Allow updating field welds for foremen, QC inspectors, PMs, and admins';
COMMENT ON POLICY "field_welds_delete_policy" ON field_welds IS 'Only owners and admins can delete field welds';
```

### welders Policies

```sql
-- Enable RLS
ALTER TABLE welders ENABLE ROW LEVEL SECURITY;

-- SELECT: All team members can view welders in their organization's projects
CREATE POLICY "welders_select_policy" ON welders
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id
      FROM projects p
      INNER JOIN users u ON u.organization_id = p.organization_id
      WHERE u.id = auth.uid()
    )
  );

-- INSERT: Users with can_manage_team permission can create welders
CREATE POLICY "welders_insert_policy" ON welders
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id
      FROM projects p
      INNER JOIN users u ON u.organization_id = p.organization_id
      WHERE u.id = auth.uid()
        AND u.can_manage_team = true
    )
  );

-- UPDATE: Users with can_manage_team permission can update welders
CREATE POLICY "welders_update_policy" ON welders
  FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id
      FROM projects p
      INNER JOIN users u ON u.organization_id = p.organization_id
      WHERE u.id = auth.uid()
        AND u.can_manage_team = true
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id
      FROM projects p
      INNER JOIN users u ON u.organization_id = p.organization_id
      WHERE u.id = auth.uid()
        AND u.can_manage_team = true
    )
  );

-- DELETE: Users with can_manage_team permission can delete welders (if not assigned)
CREATE POLICY "welders_delete_policy" ON welders
  FOR DELETE
  USING (
    project_id IN (
      SELECT p.id
      FROM projects p
      INNER JOIN users u ON u.organization_id = p.organization_id
      WHERE u.id = auth.uid()
        AND u.can_manage_team = true
    )
  );

-- Policy comments
COMMENT ON POLICY "welders_select_policy" ON welders IS 'Allow viewing welders for projects in user organization';
COMMENT ON POLICY "welders_insert_policy" ON welders IS 'Only users with can_manage_team permission can create welders';
COMMENT ON POLICY "welders_update_policy" ON welders IS 'Only users with can_manage_team permission can update welders';
COMMENT ON POLICY "welders_delete_policy" ON welders IS 'Only users with can_manage_team permission can delete welders (FK constraint prevents deletion if assigned)';
```

## Progress Template

Field Weld progress template with 3-milestone discrete workflow.

```sql
-- Insert Field Weld progress template
INSERT INTO progress_templates (
  component_type,
  workflow_type,
  milestones,
  created_by
) VALUES (
  'field_weld',
  'discrete',
  jsonb_build_array(
    jsonb_build_object(
      'name', 'Fit-up',
      'weight', 30,
      'order', 1
    ),
    jsonb_build_object(
      'name', 'Weld Complete',
      'weight', 65,
      'order', 2
    ),
    jsonb_build_object(
      'name', 'Accepted',
      'weight', 5,
      'order', 3
    )
  ),
  (SELECT id FROM users WHERE role = 'owner' LIMIT 1)
);

-- Template comments
COMMENT ON COLUMN progress_templates.milestones IS 'Field Weld: Fit-up 30% (prep work), Weld Complete 65% (primary labor), Accepted 5% (QC verification gate)';
```

## Relationships

Entity relationship diagram (text format):

```
organizations (1)                   
                                    
                                     organization_id
                                    
projects (1)                        4    
                                        
        project_id                       organization_id
                                        
         > welders (N)                 users (N)
                                          
               welder_id                   created_by, updated_by
                                          
         > components (N)                 
                 
                  component_id (1:1)
                 
            field_welds (1)
                 
                  original_weld_id (self-reference)
                 
                   > field_welds (repair chain)

Legend:
  (1) = One
  (N) = Many
    > = Foreign Key
  (1:1) = One-to-One (enforced by UNIQUE constraint)
```

## Key Relationships Explained

1. **field_welds � components**: One-to-one (component_id UNIQUE)
   - Every field_weld has exactly one component
   - Component provides: drawing assignment, metadata inheritance, progress tracking
   - Field_weld provides: weld specifications, welder assignment, NDE data

2. **field_welds � welders**: Many-to-one (welder_id)
   - One welder can be assigned to many welds
   - One weld can have zero or one welder (NULL until assigned)
   - FK constraint ON DELETE RESTRICT prevents deleting welders with assigned welds

3. **field_welds � field_welds**: Repair chain (original_weld_id self-reference)
   - Original welds: original_weld_id IS NULL
   - Repair welds: original_weld_id points to failed weld
   - Supports chains: Repair of repair (traverse via recursive CTE)
   - FK constraint ON DELETE SET NULL (deleting original doesn't cascade delete repairs)

4. **field_welds � projects**: Denormalized many-to-one (project_id)
   - Duplicates component � drawing � project relationship
   - Required for RLS performance (avoids multi-level joins in policy checks)
   - Must be kept in sync with component.project_id (enforced via application logic)

5. **welders � projects**: Many-to-one (project_id)
   - Welders scoped to single project
   - Same stencil allowed across different projects (different welders)
   - UNIQUE constraint on (project_id, stencil)

## Repair Chain Constraints

### Maximum Chain Depth

**Limit**: 10 repairs maximum per original weld

**Enforcement**: Application-level validation in `useCreateRepairWeld` hook

**Rationale**:
- Prevents infinite loops in recursive repair chain queries
- Forces engineering review after 10 failed repair attempts (indicates systemic issue)
- Repair history UI displays full chain up to depth limit

### Cycle Prevention

**Database Level**:
- FK constraint prevents direct self-reference: `original_weld_id REFERENCES field_welds(id)` rejects `UPDATE field_welds SET original_weld_id = id`
- No constraint prevents multi-hop cycles (A→B→A), but these are caught by application logic

**Application Level** (`useCreateRepairWeld` hook):
```typescript
// Before creating repair, traverse chain to check depth
let depth = 0;
let currentId = originalWeldId;

while (currentId && depth < 10) {
  const { data } = await supabase
    .from('field_welds')
    .select('original_weld_id')
    .eq('id', currentId)
    .single();

  currentId = data?.original_weld_id;
  depth++;
}

if (depth >= 10) {
  throw new Error('Maximum repair chain depth (10) exceeded. Engineering review required.');
}
```

**UI Behavior**:
- `CreateRepairWeldDialog` shows depth counter: "Repair attempt #3 of 10"
- At depth 9: Yellow warning "This is the 9th repair attempt. Consider engineering review."
- At depth 10: Red error "Maximum repair depth reached. Contact engineering before proceeding."

### Traversal Strategy

**RepairHistoryDialog** recursive query uses `WITH RECURSIVE` CTE with safety limit:

```sql
WITH RECURSIVE repair_chain AS (
  -- Base case: Start from clicked weld
  SELECT id, original_weld_id, 0 as depth
  FROM field_welds
  WHERE id = $1

  UNION ALL

  -- Recursive case: Follow original_weld_id chain
  SELECT fw.id, fw.original_weld_id, rc.depth + 1
  FROM field_welds fw
  INNER JOIN repair_chain rc ON fw.id = rc.original_weld_id
  WHERE rc.depth < 10  -- Prevent runaway recursion
)
SELECT * FROM repair_chain ORDER BY depth DESC;
```

**Edge Cases**:
- Orphaned repairs (original_weld_id points to deleted weld): ON DELETE SET NULL, repair becomes standalone
- Circular reference via multi-hop: Query terminates at depth 10, displays warning in UI

## Data Validation Rules

### field_welds Validation

- **weld_type**: Must be one of BW, SW, FW, TW
- **nde_type**: Must be one of RT, UT, PT, MT or NULL
- **nde_result**: Must be one of PASS, FAIL, PENDING or NULL
- **status**: Must be one of active, accepted, rejected (default: active)
- **component_id**: Must be UNIQUE (enforces one-to-one)
- **project_id**: Auto-synced from component.drawing.project chain via trigger_sync_project_id
- **original_weld_id**: Must reference valid field_weld or be NULL

### welders Validation

- **stencil**: Must match pattern `^[A-Z0-9-]{2,12}$` (2-12 uppercase alphanumeric or hyphen)
- **stencil**: Must be UNIQUE within project (enforced by composite index)
- **status**: Must be one of unverified, verified (default: unverified)

## Performance Considerations

### Query Optimization

**Most common queries**:
1. List active welds for drawing (filter by project_id + status='active')
   - Uses: `idx_field_welds_status_active` (partial index)

2. Find welds assigned to welder (filter by welder_id)
   - Uses: `idx_field_welds_welder_id`

3. Load repair history for weld (traverse original_weld_id chain)
   - Uses: `idx_field_welds_original_weld_id`

4. RLS policy checks (filter by project_id)
   - Uses: `idx_field_welds_project_id`

### Expected Data Volumes

- Small projects: 500-1,000 welds, 10-20 welders
- Medium projects: 2,000-3,000 welds, 30-40 welders
- Large projects: 4,000-5,000 welds, 50 welders
- Max single drawing: 100 welds

### Scalability Notes

- Virtual scrolling in UI handles 10,000+ components without pagination
- Partial index on active welds reduces index size by ~80% (only active welds indexed)
- Denormalized project_id avoids 3-level join in RLS policies (field_weld � component � drawing � project)

## Migration Sequencing

Migrations must be applied in order:

1. **00032_drop_field_weld_inspections.sql** - Clean up old schema from migration 00011
2. **00033_create_field_welds.sql** - Create field_welds + welders tables with indexes, RLS, and 4 triggers
3. **00034_field_weld_progress_template.sql** - Insert Field Weld progress template
4. **00035_backfill_field_welds.sql** - (Optional) Backfill existing field weld data

**Note**: Migration 00033 now includes 4 triggers (updated from original 3-trigger plan):
- `handle_weld_rejection` - Marks rejected welds as 100% complete
- `auto_start_repair_welds` - Auto-completes Fit-up milestone for repairs
- `sync_field_weld_project_id` - **NEW** - Enforces project_id sync (addresses CHK010)
- `update_field_weld_timestamp` - Maintains updated_at timestamp

**Critical**: Component type validation must already include 'field_weld' (verify migration 00010).

## Future Extensions

Schema designed to support future enhancements without breaking changes:

- **Welder Certification**: Add cert_number, cert_type, cert_expiry, cert_document_url to welders
- **Inspection History**: Add field_weld_inspections table (one-to-many) for multi-attempt tracking
- **Photo Attachments**: Add field_weld_photos table with storage bucket links
- **WPS Linkage**: Add wps_id foreign key to field_welds
- **PWHT Tracking**: Add pwht_required, pwht_date, pwht_notes to field_welds
- **PMI Tracking**: Add pmi_required, pmi_result, pmi_date to field_welds

All future columns can be added as nullable without schema migration complexity.
