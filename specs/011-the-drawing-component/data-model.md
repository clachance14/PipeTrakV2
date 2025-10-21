# Data Model: Drawing & Component Metadata Assignment UI

**Feature**: 011-the-drawing-component
**Date**: 2025-10-21

## Entity Diagram

```
┌──────────────────────┐
│ Drawing              │
├──────────────────────┤
│ id (UUID, PK)        │
│ drawing_no_norm (str)│
│ area_id (UUID, FK)   │◄─────┐
│ system_id (UUID, FK) │◄──┐  │
│ test_package_id (FK) │◄┐ │  │
└──────────────────────┘ │ │  │
          │              │ │  │
          │ 1:N          │ │  │
          │              │ │  │
          ▼              │ │  │
┌──────────────────────┐ │ │  │
│ Component            │ │ │  │
├──────────────────────┤ │ │  │
│ id (UUID, PK)        │ │ │  │
│ drawing_id (UUID, FK)│ │ │  │
│ identity_key (JSONB) │ │ │  │
│ area_id (UUID, FK)   │─┘ │  │
│ system_id (UUID, FK) │───┘  │
│ test_package_id (FK) │──────┘
└──────────────────────┘
          │
          │ Inheritance Logic:
          │ IF component.area_id == drawing.area_id
          │    AND drawing.area_id IS NOT NULL
          │ THEN area is "inherited"
          │ ELSE area is "manually assigned"

┌──────────────────────┐
│ Area                 │
├──────────────────────┤
│ id (UUID, PK)        │
│ name (VARCHAR, UQ)   │
│ description (VARCHAR)│  ← NEW (Migration 00025)
│ organization_id (FK) │
└──────────────────────┘

┌──────────────────────┐
│ System               │
├──────────────────────┤
│ id (UUID, PK)        │
│ name (VARCHAR, UQ)   │
│ description (VARCHAR)│  ← NEW (Migration 00025)
│ organization_id (FK) │
└──────────────────────┘

┌──────────────────────┐
│ TestPackage          │
├──────────────────────┤
│ id (UUID, PK)        │
│ name (VARCHAR, UQ)   │
│ description (VARCHAR)│  ← NEW (Migration 00025)
│ organization_id (FK) │
└──────────────────────┘
```

## Entity Definitions

### Drawing (Existing + Enhanced)

**Table**: `drawings`

**Purpose**: Construction drawing with optional metadata assignments

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| drawing_no_norm | VARCHAR | NOT NULL, UNIQUE (per project) | Normalized drawing number (e.g., "P-001") |
| project_id | UUID | NOT NULL, FK → projects.id | Parent project |
| area_id | UUID | NULLABLE, FK → areas.id | Assigned area (can be NULL) |
| system_id | UUID | NULLABLE, FK → systems.id | Assigned system (can be NULL) |
| test_package_id | UUID | NULLABLE, FK → test_packages.id | Assigned test package (can be NULL) |

**RLS Policies**:
- SELECT: User belongs to project's organization
- UPDATE: User has can_manage_team permission

**Validation Rules**:
- area_id, system_id, test_package_id must belong to same organization as project
- Foreign keys enforce referential integrity (ON DELETE SET NULL)

---

### Component (Existing + Enhanced)

**Table**: `components`

**Purpose**: Trackable item that can inherit or override drawing metadata

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| drawing_id | UUID | NOT NULL, FK → drawings.id | Parent drawing |
| identity_key | JSONB | NOT NULL | Unique key (commodity_code, size, seq) |
| component_type | VARCHAR | NOT NULL | Type (valve, instrument, etc.) |
| area_id | UUID | NULLABLE, FK → areas.id | Assigned/inherited area |
| system_id | UUID | NULLABLE, FK → systems.id | Assigned/inherited system |
| test_package_id | UUID | NULLABLE, FK → test_packages.id | Assigned/inherited test package |

**RLS Policies**:
- SELECT: User belongs to project's organization (via drawing → project)
- UPDATE: User has can_manage_team permission

**Inheritance Logic** (Computed):
```sql
-- Not stored, computed at read time
component.area_id = drawing.area_id AND drawing.area_id IS NOT NULL
  → area is "inherited"
  
component.area_id != drawing.area_id OR drawing.area_id IS NULL
  → area is "manually assigned"
```

**Validation Rules**:
- area_id, system_id, test_package_id must belong to same organization as drawing's project
- NULL values are valid (component can have no assignment)

---

### Area (Existing + Description Field)

**Table**: `areas`

**Purpose**: Physical zone within a project

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| name | VARCHAR(255) | NOT NULL, UNIQUE (per project) | Area name (e.g., "Area 100") |
| description | VARCHAR(100) | NULLABLE | Optional description (e.g., "North wing - Level 2") |
| project_id | UUID | NOT NULL, FK → projects.id | Parent project |
| organization_id | UUID | NOT NULL, FK → organizations.id | Multi-tenant isolation |

**RLS Policies**:
- SELECT: User belongs to organization
- INSERT/UPDATE/DELETE: User has can_manage_team permission

**Validation Rules**:
- name must be unique within project
- description max 100 characters
- description is optional (can be NULL or empty string)

---

### System (Existing + Description Field)

**Table**: `systems`

**Purpose**: Functional system within a project

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| name | VARCHAR(255) | NOT NULL, UNIQUE (per project) | System name (e.g., "HVAC-01") |
| description | VARCHAR(100) | NULLABLE | Optional description (e.g., "Cooling water distribution") |
| project_id | UUID | NOT NULL, FK → projects.id | Parent project |
| organization_id | UUID | NOT NULL, FK → organizations.id | Multi-tenant isolation |

**RLS Policies**:
- SELECT: User belongs to organization
- INSERT/UPDATE/DELETE: User has can_manage_team permission

**Validation Rules**:
- name must be unique within project
- description max 100 characters
- description is optional (can be NULL or empty string)

---

### TestPackage (Existing + Description Field)

**Table**: `test_packages`

**Purpose**: Grouping for turnover readiness

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| name | VARCHAR(255) | NOT NULL, UNIQUE (per project) | Package name (e.g., "TP-2025-001") |
| description | VARCHAR(100) | NULLABLE | Optional description (e.g., "Q1 2025 mechanical completion") |
| project_id | UUID | NOT NULL, FK → projects.id | Parent project |
| organization_id | UUID | NOT NULL, FK → organizations.id | Multi-tenant isolation |

**RLS Policies**:
- SELECT: User belongs to organization
- INSERT/UPDATE/DELETE: User has can_manage_team permission

**Validation Rules**:
- name must be unique within project
- description max 100 characters
- description is optional (can be NULL or empty string)

---

## TypeScript Types

### Drawing Row (Extended)

```typescript
interface DrawingRow {
  id: string;
  drawing_no_norm: string;
  area_id: string | null;
  area_name: string | null;
  area_description: string | null;  // NEW
  system_id: string | null;
  system_name: string | null;
  system_description: string | null;  // NEW
  test_package_id: string | null;
  test_package_name: string | null;
  test_package_description: string | null;  // NEW
  component_count: number;
  percent_complete: number;
}
```

### Component Row (Extended)

```typescript
interface ComponentRow {
  id: string;
  drawing_id: string;
  identity_display: string;
  component_type: string;
  area_id: string | null;
  area_name: string | null;
  area_description: string | null;  // NEW
  system_id: string | null;
  system_name: string | null;
  system_description: string | null;  // NEW
  test_package_id: string | null;
  test_package_name: string | null;
  test_package_description: string | null;  // NEW
  // Computed fields
  area_inherited: boolean;
  system_inherited: boolean;
  package_inherited: boolean;
}
```

### Metadata Entities (with Description)

```typescript
interface Area {
  id: string;
  name: string;
  description: string | null;  // NEW
  project_id: string;
  organization_id: string;
}

interface System {
  id: string;
  name: string;
  description: string | null;  // NEW
  project_id: string;
  organization_id: string;
}

interface TestPackage {
  id: string;
  name: string;
  description: string | null;  // NEW
  project_id: string;
  organization_id: string;
}
```

### Assignment Payloads

```typescript
interface AssignDrawingMetadataPayload {
  drawing_id: string;
  area_id: string | null;      // NULL = "No change" for bulk
  system_id: string | null;     // NULL = "No change" for bulk
  test_package_id: string | null;  // NULL = "No change" for bulk
  user_id: string;
}

interface BulkAssignPayload {
  drawing_ids: string[];  // Max 50
  area_id: string | null | "NO_CHANGE";
  system_id: string | null | "NO_CHANGE";
  test_package_id: string | null | "NO_CHANGE";
  user_id: string;
}

interface AssignmentSummary {
  drawing_id: string;
  inherited_count: number;  // Components that inherited new values
  kept_count: number;       // Components that kept existing assignments
}

interface UpdateDescriptionPayload {
  entity_type: "area" | "system" | "test_package";
  entity_id: string;
  description: string | null;  // NULL clears description
  user_id: string;
}
```

### Inheritance Status

```typescript
interface InheritanceStatus {
  areaInherited: boolean;
  systemInherited: boolean;
  packageInherited: boolean;
}

// Computed function
function detectInheritance(
  component: ComponentRow,
  drawing: DrawingRow
): InheritanceStatus {
  return {
    areaInherited: component.area_id === drawing.area_id && drawing.area_id !== null,
    systemInherited: component.system_id === drawing.system_id && drawing.system_id !== null,
    packageInherited: component.test_package_id === drawing.test_package_id && drawing.test_package_id !== null,
  };
}
```

---

## State Transitions

### Drawing Metadata Assignment

```
Initial: Drawing.area_id = NULL

User Action: Assign Area 100
  ↓
  UPDATE drawings SET area_id = 'uuid-area-100' WHERE id = 'drawing-uuid'
  ↓
  UPDATE components 
  SET area_id = 'uuid-area-100' 
  WHERE drawing_id = 'drawing-uuid' AND area_id IS NULL
  ↓
Final: Drawing.area_id = Area 100
       Components with area_id = NULL → Area 100 (inherited)
       Components with area_id != NULL → unchanged (kept)
```

### Component Override

```
Initial: Component.area_id = Area 100 (inherited from drawing)

User Action: Override to Area 200
  ↓
  UPDATE components SET area_id = 'uuid-area-200' WHERE id = 'component-uuid'
  ↓
Final: Component.area_id = Area 200 (manually assigned)
       Badge changes from gray "(inherited)" to blue "(assigned)"
```

### Component Clear Assignment

```
Initial: Component.area_id = Area 200 (manually assigned)

User Action: Clear assignment
  ↓
  UPDATE components SET area_id = NULL WHERE id = 'component-uuid'
  ↓
Final: Component.area_id = NULL
       IF Drawing.area_id IS NOT NULL:
         Display shows inherited value with gray badge
       ELSE:
         Display shows "—" (no assignment)
```

### Description Update

```
Initial: Area.description = NULL

User Action: Edit description to "North wing - Level 2"
  ↓
  UPDATE areas SET description = 'North wing - Level 2' WHERE id = 'area-uuid'
  ↓
  Query cache invalidated
  ↓
Final: Area.description = "North wing - Level 2"
       Dropdown shows two-line display with description
```

---

## Database Functions (Supabase RPC)

### assign_drawing_metadata

**Purpose**: Atomically assign metadata to drawing and inherit to components

**Signature**:
```sql
CREATE OR REPLACE FUNCTION assign_drawing_metadata(
  p_drawing_id UUID,
  p_area_id UUID,
  p_system_id UUID,
  p_test_package_id UUID,
  p_user_id UUID
) RETURNS JSONB;
```

**Returns**:
```json
{
  "inherited_count": 12,
  "kept_count": 11
}
```

**Logic**:
1. Update drawing with provided metadata (COALESCE for "No change")
2. Update components WHERE field IS NULL with drawing's values
3. Count inherited vs kept components
4. Return summary

---

### bulk_assign_drawings

**Purpose**: Batch assign metadata to multiple drawings with single transaction

**Signature**:
```sql
CREATE OR REPLACE FUNCTION bulk_assign_drawings(
  p_drawing_ids UUID[],
  p_area_id UUID,
  p_system_id UUID,
  p_test_package_id UUID,
  p_user_id UUID
) RETURNS JSONB;
```

**Returns**:
```json
{
  "drawings_updated": 50,
  "total_inherited": 1250,
  "total_kept": 750
}
```

**Logic**:
1. Validate drawing_ids length ≤ 50
2. FOR EACH drawing IN drawing_ids:
     - Call assign_drawing_metadata()
3. Aggregate summaries
4. Return totals

---

## Validation Rules Summary

| Rule | Enforcement | Error Message |
|------|-------------|---------------|
| Max 50 bulk drawings | Client + Server | "Bulk operations limited to 50 drawings" |
| Description ≤ 100 chars | Client + DB | "Description cannot exceed 100 characters" |
| Metadata belongs to project org | RLS Policy | "Invalid metadata assignment" |
| User has can_manage_team | RLS Policy | "Permission denied" |
| Drawing exists | Foreign key | "Drawing not found" |
| Area/System/Package exists | Foreign key | "Metadata entity not found" |
