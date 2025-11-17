# Data Model: Add Unplanned Field Welds

**Feature**: 028-add-unplanned-welds
**Created**: 2025-11-17

## Entity Relationships

```
┌─────────────────┐
│   User          │
│─────────────────│
│ id (PK)         │
│ role            │
└────────┬────────┘
         │ creates
         │
         ▼
┌─────────────────┐        references       ┌─────────────────┐
│   Component     │◄──────────────────────  │    Drawing      │
│─────────────────│                         │─────────────────│
│ id (PK)         │                         │ id (PK)         │
│ project_id (FK) │────────┐                │ drawing_number  │
│ drawing_id (FK) │────────┼───────────────►│ title           │
│ component_type  │        │                │ area_id (FK)    │
│ identity_key    │        │                │ system_id (FK)  │
│ progress_...    │        │                │ test_pkg_id     │
│ area_id (FK)    │        │                └─────────────────┘
│ system_id (FK)  │        │
│ test_pkg_id     │        │                ┌─────────────────┐
│ created_by (FK) │────────┼───────────────►│    Project      │
└────────┬────────┘        │                │─────────────────│
         │ 1:1             └───────────────►│ id (PK)         │
         │                                  │ organization_id │
         ▼                                  └─────────────────┘
┌─────────────────┐
│  Field Weld     │        references       ┌─────────────────┐
│─────────────────│────────────────────────►│  Progress       │
│ id (PK)         │                         │  Template       │
│ component_id ◄──┼────(FK, UNIQUE)         │─────────────────│
│ project_id (FK) │                         │ id (PK)         │
│ weld_type       │                         │ component_type  │
│ weld_size       │                         │ milestones JSON │
│ spec            │                         └─────────────────┘
│ schedule        │
│ base_metal      │
│ notes           │◄────────NEW COLUMN
│ welder_id (FK)  │
│ date_welded     │
│ status          │
│ created_by (FK) │
└─────────────────┘
```

## Entities

### Component (Existing - Modified)

Parent entity for all trackable items including field welds.

**Table**: `components`

**Key Attributes**:
- `id UUID PRIMARY KEY` - Unique component identifier
- `project_id UUID NOT NULL` - Project scope (for RLS filtering)
- `drawing_id UUID` - Reference to drawing (nullable for some component types, required for field welds)
- `component_type TEXT NOT NULL` - Type discriminator ('field_weld' for this feature)
- `identity_key JSONB NOT NULL` - Component identifier (e.g., `{"weld_number": "W-051"}`)
- `progress_template_id UUID NOT NULL` - References milestone template
- `area_id UUID` - Inherited from drawing
- `system_id UUID` - Inherited from drawing
- `test_package_id UUID` - Inherited from drawing
- `current_milestones JSONB NOT NULL` - Milestone completion state
- `percent_complete NUMERIC(5,2) NOT NULL` - Calculated progress (0.00-100.00)
- `created_by UUID NOT NULL` - User who created the component
- `last_updated_by UUID` - User who last updated
- `last_updated_at TIMESTAMPTZ` - Last update timestamp

**Validation Rules**:
- `component_type = 'field_weld'` for all welds created by this feature
- `identity_key` must be unique within `project_id` and `component_type`
- `drawing_id` is required for field welds
- Metadata (`area_id`, `system_id`, `test_package_id`) inherited from `drawing_id`

**Indexes** (existing):
- `identity_key` (BTREE) - For weld number uniqueness checks
- `project_id` (BTREE) - For RLS filtering
- `component_type` (BTREE) - For type-specific queries

### Field Weld (Existing - Modified)

Represents a weld joint tracked in the system.

**Table**: `field_welds`

**Key Attributes**:
- `id UUID PRIMARY KEY` - Unique weld identifier
- `component_id UUID NOT NULL UNIQUE` - One-to-one relationship with component
- `project_id UUID NOT NULL` - Project scope (for RLS filtering)
- `weld_type TEXT NOT NULL` - Weld type: BW, SW, FW, TW (CHECK constraint)
- `weld_size TEXT` - Weld size specification (e.g., "2\"", "1/2\"")
- `spec TEXT` - Weld specification code (must exist in project specs)
- `schedule TEXT` - Pipe schedule (e.g., "XS", "STD")
- `base_metal TEXT` - Base metal type (e.g., "CS", "SS")
- **`notes TEXT` - NEW: Creation context notes (why weld was created)**
- `welder_id UUID` - Assigned welder (nullable until assigned)
- `date_welded DATE` - Weld completion date
- `nde_required BOOLEAN NOT NULL DEFAULT false` - NDE test required flag
- `nde_type TEXT` - NDE test type: RT, UT, PT, MT, VT (CHECK constraint)
- `nde_result TEXT` - NDE result: PASS, FAIL, PENDING (CHECK constraint)
- `nde_date DATE` - NDE test date
- `nde_notes TEXT` - QC notes from NDE testing
- `status TEXT NOT NULL DEFAULT 'active'` - Status: active, accepted, rejected (CHECK constraint)
- `original_weld_id UUID` - For repair welds (references field_welds.id)
- `is_repair BOOLEAN GENERATED` - Computed: true if `original_weld_id IS NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` - Creation timestamp
- `created_by UUID NOT NULL` - User who created the weld
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` - Last update timestamp

**Validation Rules**:
- `component_id` is UNIQUE (one field_weld per component)
- `weld_type` IN ('BW', 'SW', 'FW', 'TW')
- `status` IN ('active', 'accepted', 'rejected')
- `nde_type` IN ('RT', 'UT', 'PT', 'MT', 'VT') when nde_required = true
- `nde_result` IN ('PASS', 'FAIL', 'PENDING') when populated
- `spec` must exist in project's valid specs

**Indexes** (existing):
- `component_id` (UNIQUE) - Enforces one-to-one relationship
- `project_id` (BTREE) - For RLS filtering
- `welder_id` (BTREE) - For welder assignments query

### Drawing (Existing - Referenced)

Engineering drawing document that welds reference.

**Table**: `drawings`

**Key Attributes**:
- `id UUID PRIMARY KEY` - Unique drawing identifier
- `project_id UUID NOT NULL` - Project scope
- `drawing_number TEXT NOT NULL` - Drawing number (e.g., "P&ID-001")
- `title TEXT` - Drawing title/description
- `area_id UUID` - Area assignment
- `system_id UUID` - System assignment
- `test_package_id UUID` - Test package assignment

**Usage in Feature**:
- Smart search matches on `drawing_number` and `title`
- Metadata (`area_id`, `system_id`, `test_package_id`) inherited to new welds

### Progress Template (Existing - Referenced)

Milestone template for component type.

**Table**: `progress_templates`

**Key Attributes**:
- `id UUID PRIMARY KEY` - Template identifier
- `component_type TEXT NOT NULL` - Component type ('field_weld')
- `milestones JSONB NOT NULL` - Milestone definitions with weights

**Field Weld Milestones**:
```json
[
  {"name": "Fit-up", "weight": 30},
  {"name": "Weld Complete", "weight": 65},
  {"name": "Accepted", "weight": 5}
]
```

**Usage in Feature**:
- RPC queries progress template for 'field_weld' component type
- Assigns template ID to new component record
- Initializes `current_milestones` to all false (0% complete)

## State Transitions

### Component Creation
```
[User Action] → [RPC Validation] → [Transaction] → [Success]
     ↓                ↓                  ↓             ↓
 Click "Add     Check perms      INSERT component   Return
   Weld"        Check drawing    INSERT field_weld  weld+comp
                Validate weld#        COMMIT        data JSON
```

### Milestone Progress (Post-Creation)
```
0% → 30% → 95% → 100%
↓     ↓     ↓      ↓
Created  Fit-up  Weld    Accepted
         Complete  (or Rejected)
```

New welds start at 0% (no milestones complete). Progression follows existing milestone update workflow via separate UI (not part of this feature).

## Data Flow: Create Unplanned Weld

### Input
```typescript
{
  project_id: UUID          // Current project
  drawing_id: UUID          // Selected drawing
  weld_number: string       // Auto-generated (e.g., "W-051")
  weld_type: 'BW'|'SW'|'FW'|'TW'  // Required
  weld_size: string         // Required (e.g., "2\"")
  spec: string              // Required (must exist in project specs)
  schedule?: string         // Optional (e.g., "XS")
  base_metal?: string       // Optional (e.g., "CS")
  notes?: string            // Optional creation context
}
```

### Processing (RPC Function)
1. Validate user permission (check role against allowed list)
2. Validate drawing exists and user has project access
3. Validate weld_number uniqueness in project
4. Fetch drawing metadata (area_id, system_id, test_package_id)
5. Fetch progress_template_id for component_type='field_weld'
6. BEGIN TRANSACTION
7. INSERT INTO components (...)
8. INSERT INTO field_welds (...)
9. COMMIT
10. Return weld + component data as JSON

### Output
```typescript
{
  field_weld: {
    id: UUID
    component_id: UUID
    project_id: UUID
    weld_type: string
    weld_size: string
    spec: string
    schedule: string | null
    base_metal: string | null
    notes: string | null
    status: 'active'
    created_by: UUID
    created_at: timestamp
    // ... other fields
  },
  component: {
    id: UUID
    project_id: UUID
    drawing_id: UUID
    component_type: 'field_weld'
    identity_key: { weld_number: string }
    area_id: UUID | null
    system_id: UUID | null
    test_package_id: UUID | null
    percent_complete: 0.00
    // ... other fields
  }
}
```

## RLS Policies

**No new RLS policies required** - existing policies apply:

### field_welds Table (existing)
- **SELECT**: All team members in organization can view
- **INSERT**: Owner, Admin, PM, Foreman, QC Inspector can create
- **UPDATE**: Owner, Admin, PM, Foreman, QC Inspector can modify
- **DELETE**: Owner, Admin only can delete

### components Table (existing)
- **SELECT**: All team members in organization can view
- **INSERT**: Owner, Admin, PM, Foreman, QC Inspector can create
- **UPDATE**: Owner, Admin, PM, Foreman, QC Inspector can modify
- **DELETE**: Owner, Admin only can delete

**Note**: RPC function uses SECURITY DEFINER to bypass RLS during creation, but includes explicit permission check at function start.

## Migration Impact

### Schema Change
```sql
-- Add notes column to field_welds table
ALTER TABLE field_welds ADD COLUMN IF NOT EXISTS notes TEXT;
```

**Backward Compatibility**:
- Column is nullable, no default value required
- Existing welds have `notes = NULL`
- No data migration needed

### Type Generation
After migration, regenerate TypeScript types:
```bash
supabase gen types typescript --linked > src/types/database.types.ts
```

New type will include `notes?: string | null` in `FieldWeld` interface.

## Validation & Constraints

### Required Fields (at creation)
- `project_id` - Must exist in projects table
- `drawing_id` - Must exist in drawings table and user must have access
- `weld_number` - Must be unique within project
- `weld_type` - Must be BW, SW, FW, or TW
- `weld_size` - Non-empty string
- `spec` - Must exist in project's valid specs

### Optional Fields
- `schedule` - Free text
- `base_metal` - Free text
- `notes` - Free text (no length limit, but reasonable UI limit ~1000 chars)

### Uniqueness Constraints
- `components.identity_key` must be unique within (`project_id`, `component_type`)
- `field_welds.component_id` must be unique (enforced by UNIQUE constraint)

### Referential Integrity
- `component.drawing_id` → `drawings.id` (FOREIGN KEY)
- `component.project_id` → `projects.id` (FOREIGN KEY)
- `field_weld.component_id` → `components.id` (FOREIGN KEY UNIQUE)
- `field_weld.project_id` → `projects.id` (FOREIGN KEY)
