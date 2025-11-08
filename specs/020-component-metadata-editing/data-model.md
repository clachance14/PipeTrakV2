# Data Model: Component Metadata Editing

**Feature**: 020-component-metadata-editing
**Date**: 2025-10-28 (Updated: 2025-10-29)

## Overview

This feature uses existing database tables with ONE schema change required: adding a `version` column to the `components` table for optimistic locking (concurrent edit detection). This document describes the data entities involved, their relationships, validation rules, and state transitions.

## Database Schema (Existing Tables)

### Component

Represents a physical pipe component in the project.

**Table**: `components`

**Key Fields**:
```typescript
{
  id: string                    // UUID primary key
  drawing_number: string        // Foreign key to drawings table
  component_identity: string    // Component identifier (e.g., "VBALU-PFCBLF00M-001")

  // Metadata assignments (NULLABLE - core of this feature)
  area_id: string | null        // Foreign key to areas table
  system_id: string | null      // Foreign key to systems table
  test_package_id: string | null // Foreign key to test_packages table

  // Audit fields
  version: number               // **NEW**: Integer version for optimistic locking (starts at 1)
  last_updated_at: string       // ISO timestamp, auto-updated on save
  organization_id: string       // For RLS multi-tenancy
  project_id: string            // Foreign key to projects table
}
```

**Validation Rules**:
- `area_id`, `system_id`, `test_package_id` must exist in respective tables if not null
- `version` automatically incremented on UPDATE via database trigger
- `last_updated_at` automatically updated on save via database trigger
- Must belong to user's organization (enforced by RLS)

**State Transitions**:
1. **Initial**: Metadata fields may be null after CSV import
2. **Assigned**: User assigns metadata via edit modal
3. **Reassigned**: User changes metadata assignments
4. **Cleared**: User sets metadata to null via "(None)" option

**Relationships**:
- Many-to-one with `areas` (components can belong to one area)
- Many-to-one with `systems` (components can belong to one system)
- Many-to-one with `test_packages` (components can belong to one test package)

---

### Area

Represents a physical or logical area of the construction site.

**Table**: `areas`

**Key Fields**:
```typescript
{
  id: string                    // UUID primary key
  name: string                  // Display name (e.g., "North Wing", "Area-2")
  project_id: string            // Foreign key to projects table
  organization_id: string       // For RLS multi-tenancy
  created_by: string            // Foreign key to users table (audit trail)
  created_at: string            // ISO timestamp
}
```

**Validation Rules**:
- `name` must be unique within project (case-insensitive)
- `name` cannot be empty or whitespace-only
- `name` should be trimmed before save
- Must belong to current project

**Creation Flow** (via useCreateArea hook):
1. User selects "Create new Area..." in combobox
2. Inline form validates name uniqueness (case-insensitive, trimmed)
3. If unique, inserts new area with current user as `created_by`
4. New area auto-selected in combobox

**Relationships**:
- One-to-many with `components`
- Belongs to one `project`
- Created by one `user`

---

### System

Represents a functional system in the project.

**Table**: `systems`

**Key Fields**:
```typescript
{
  id: string                    // UUID primary key
  name: string                  // Display name (e.g., "Drain System", "HVAC")
  project_id: string            // Foreign key to projects table
  organization_id: string       // For RLS multi-tenancy
  created_by: string            // Foreign key to users table (audit trail)
  created_at: string            // ISO timestamp
}
```

**Validation Rules**:
- `name` must be unique within project (case-insensitive)
- `name` cannot be empty or whitespace-only
- `name` should be trimmed before save
- Must belong to current project

**Creation Flow** (via useCreateSystem hook):
1. User selects "Create new System..." in combobox
2. Inline form validates name uniqueness (case-insensitive, trimmed)
3. If unique, inserts new system with current user as `created_by`
4. New system auto-selected in combobox

**Relationships**:
- One-to-many with `components`
- Belongs to one `project`
- Created by one `user`

---

### Test Package

Represents a testing group for commissioning activities.

**Table**: `test_packages`

**Key Fields**:
```typescript
{
  id: string                    // UUID primary key
  name: string                  // Display name (e.g., "TP-11", "TP-12")
  project_id: string            // Foreign key to projects table
  organization_id: string       // For RLS multi-tenancy
  created_by: string            // Foreign key to users table (audit trail)
  created_at: string            // ISO timestamp
}
```

**Validation Rules**:
- `name` must be unique within project (case-insensitive)
- `name` cannot be empty or whitespace-only
- `name` should be trimmed before save
- Must belong to current project

**Creation Flow** (via useCreateTestPackage hook):
1. User selects "Create new Test Package..." in combobox
2. Inline form validates name uniqueness (case-insensitive, trimmed)
3. If unique, inserts new test package with current user as `created_by`
4. New test package auto-selected in combobox

**Relationships**:
- One-to-many with `components`
- Belongs to one `project`
- Created by one `user`

---

## Client-Side Data Types

### UpdateComponentMetadataParams

Used by `useUpdateComponentMetadata` mutation hook.

```typescript
interface UpdateComponentMetadataParams {
  componentId: string
  version: number               // **NEW**: Current version for optimistic locking
  area_id: string | null        // null clears assignment
  system_id: string | null      // null clears assignment
  test_package_id: string | null // null clears assignment
}
```

**Usage**:
```typescript
const mutation = useUpdateComponentMetadata()

mutation.mutate({
  componentId: 'uuid-123',
  version: 5,  // Current version from modal open
  area_id: 'area-uuid-456',
  system_id: null,  // Clears system assignment
  test_package_id: 'tp-uuid-789'
})
```

---

### CreateAreaParams

Used by `useCreateArea` mutation hook.

```typescript
interface CreateAreaParams {
  name: string                  // Trimmed, validated for uniqueness
  project_id: string            // Current project
}
```

**Validation**:
- `name` must not be empty after trimming
- `name` must be unique within project (case-insensitive)
- Client checks uniqueness before sending to server

**Usage**:
```typescript
const mutation = useCreateArea()

mutation.mutate({
  name: 'North Wing',
  project_id: currentProjectId
})
```

---

### CreateSystemParams

Used by `useCreateSystem` mutation hook.

```typescript
interface CreateSystemParams {
  name: string                  // Trimmed, validated for uniqueness
  project_id: string            // Current project
}
```

**Validation**:
- Same rules as CreateAreaParams

---

### CreateTestPackageParams

Used by `useCreateTestPackage` mutation hook.

```typescript
interface CreateTestPackageParams {
  name: string                  // Trimmed, validated for uniqueness
  project_id: string            // Current project
}
```

**Validation**:
- Same rules as CreateAreaParams

---

## Data Flow & State Management

### Component Metadata Update Flow

```
1. User clicks component row
   ↓
2. Modal opens, fetches component via useComponent(id)
   ↓
3. MetadataEditForm displays current metadata in comboboxes
   ↓
4. User selects different metadata or creates new
   ↓
5. User clicks Save
   ↓
6. useUpdateComponentMetadata.mutate() fires
   ↓
7. onMutate: Optimistically update cache
   ↓
8. Server processes update
   ↓
9. onSuccess: Invalidate queries, refetch fresh data
   ↓
10. Table row updates with new metadata
```

### Optimistic Update Cache Strategy

**TanStack Query Cache Keys**:
- `['component', componentId]` - Single component details
- `['components']` - All components list
- `['drawings-with-progress']` - Drawings table with components

**Optimistic Update**:
```typescript
onMutate: async (variables) => {
  // Cancel in-flight queries
  await queryClient.cancelQueries(['component', variables.componentId])

  // Snapshot previous state
  const previous = queryClient.getQueryData(['component', variables.componentId])

  // Update cache immediately
  queryClient.setQueryData(['component', variables.componentId], (old) => ({
    ...old,
    area_id: variables.area_id,
    system_id: variables.system_id,
    test_package_id: variables.test_package_id,
    last_updated_at: new Date().toISOString()  // Optimistic timestamp
  }))

  return { previous }
}
```

**Rollback on Error**:
```typescript
onError: (err, variables, context) => {
  // Restore snapshot
  queryClient.setQueryData(['component', variables.componentId], context?.previous)
}
```

**Confirm on Success**:
```typescript
onSuccess: () => {
  // Invalidate to refetch authoritative data
  queryClient.invalidateQueries(['component', variables.componentId])
  queryClient.invalidateQueries(['components'])
  queryClient.invalidateQueries(['drawings-with-progress'])
}
```

---

### Metadata Creation Flow

```
1. User clicks combobox dropdown
   ↓
2. Combobox displays existing options + "Create new..."
   ↓
3. User selects "Create new Area..."
   ↓
4. Dropdown switches to inline input form
   ↓
5. User types name (e.g., "North Wing")
   ↓
6. Client validates uniqueness (search existing areas)
   ↓
7. If duplicate: Show error "Area 'North Wing' already exists"
   ↓
8. If unique: User clicks Create or presses Enter
   ↓
9. useCreateArea.mutate() fires
   ↓
10. Server inserts new area
   ↓
11. onSuccess: Invalidate areas query cache
   ↓
12. Combobox refetches areas, new option appears
   ↓
13. Auto-select newly created area
   ↓
14. User can now save component with new area assigned
```

---

## Concurrent Edit Detection

**Strategy**: Version field with optimistic locking (UPDATED 2025-10-29)

**Implementation**:
1. When modal opens, component fetched via `useComponent(id)`
2. Component data includes current `version` number (e.g., version: 5)
3. On save, mutation includes this version in payload
4. Server UPDATE query includes WHERE clause with version check:
   ```sql
   UPDATE components
   SET area_id = $1, system_id = $2, test_package_id = $3
   WHERE id = $4 AND version = $5
   RETURNING *;
   ```
5. Database trigger automatically increments version: `NEW.version = OLD.version + 1`
6. If no rows updated (version changed by another user), throw error
7. Client catches error, shows toast: "Component was updated by another user. Please refresh."
8. User must close modal and reopen to see fresh data

**Database Migration Required** (00063_add_components_version_field.sql):
```sql
-- Add version column to components table
ALTER TABLE components
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Create trigger to auto-increment version on update
CREATE OR REPLACE FUNCTION increment_component_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_component_version
  BEFORE UPDATE ON components
  FOR EACH ROW
  EXECUTE FUNCTION increment_component_version();

-- Add index for version-based queries
CREATE INDEX idx_components_version ON components(id, version);
```

**Rationale**: Version field more reliable than timestamps (prevents race conditions within same millisecond)

---

## Row Level Security (RLS) Policies

### Components Table

**SELECT Policy**:
```sql
organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
```

**UPDATE Policy**:
```sql
organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
AND (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Manager')
```

**Effect**: Only Admin and Manager users can update component metadata.

---

### Areas, Systems, Test Packages Tables

**SELECT Policy**:
```sql
organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
```

**INSERT Policy**:
```sql
organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
AND (SELECT role FROM users WHERE id = auth.uid()) IN ('Admin', 'Manager')
```

**Effect**: Only Admin and Manager users can create new metadata entries.

---

## Query Patterns

### Fetch Component with Metadata

```typescript
const { data: component } = useComponent(componentId)

// Returns:
{
  id: string
  drawing_number: string
  component_identity: string
  area_id: string | null
  system_id: string | null
  test_package_id: string | null
  area?: { id: string, name: string }        // Joined from areas table
  system?: { id: string, name: string }      // Joined from systems table
  test_package?: { id: string, name: string } // Joined from test_packages table
  last_updated_at: string
}
```

---

### Fetch All Areas for Project

```typescript
const { data: areas } = useAreas(projectId)

// Returns:
[
  { id: 'uuid-1', name: 'Area-2', project_id: 'proj-1' },
  { id: 'uuid-2', name: 'North Wing', project_id: 'proj-1' },
  // ... sorted alphabetically by name
]
```

**Sorting**: Client-side sort by `name` (case-insensitive) for combobox display.

---

### Check for Duplicate Name (Client-Side)

```typescript
const areas = useAreas(projectId).data ?? []
const isDuplicate = areas.some(
  area => area.name.trim().toLowerCase() === inputName.trim().toLowerCase()
)

if (isDuplicate) {
  setError('Area with this name already exists')
}
```

**Note**: Server also enforces uniqueness via UNIQUE constraint on `(name, project_id)`.

---

## Error Scenarios & Data Handling

### Scenario 1: Concurrent Update

**Trigger**: Two users edit same component simultaneously

**Detection**: `last_updated_at` timestamp mismatch on UPDATE

**Response**:
1. Mutation fails with error
2. Optimistic update reverted
3. Toast shown: "Component was updated by another user. Please refresh."
4. User must close modal and reopen to see fresh data

---

### Scenario 2: Deleted Metadata

**Trigger**: User opens modal, admin deletes assigned area, user tries to save

**Detection**: Foreign key constraint violation on UPDATE

**Response**:
1. Mutation fails with error
2. Optimistic update reverted
3. Toast shown: "Selected metadata no longer exists. Please refresh and try again."
4. User must close modal and reopen

---

### Scenario 3: Duplicate Metadata Creation

**Trigger**: User tries to create area with name that already exists

**Detection**: Client-side validation before INSERT

**Response**:
1. Show inline error: "Area 'North Wing' already exists"
2. Prevent mutation from firing
3. User can search existing areas in combobox instead

**Fallback**: If client validation missed it, server UNIQUE constraint catches it:
1. Mutation fails with error
2. Toast shown: "Area with this name already exists"

---

### Scenario 4: Network Failure

**Trigger**: Network drops during save

**Detection**: Fetch error in mutation

**Response**:
1. Optimistic update reverted
2. Toast shown: "Failed to save changes. Retry?" with retry button
3. User can click retry to attempt mutation again

---

## Data Integrity Guarantees

1. **Organization Isolation**: RLS policies ensure users only see/edit their organization's data
2. **Role Enforcement**: UPDATE policies require Admin/Manager role
3. **Referential Integrity**: Foreign keys ensure metadata references valid entities
4. **Uniqueness**: UNIQUE constraints prevent duplicate metadata names per project
5. **Audit Trail**: `created_by` and `last_updated_at` track who and when
6. **Concurrent Safety**: Timestamp comparison prevents lost updates

---

## Performance Considerations

### Query Optimization

- **Indexes**: Existing indexes on `organization_id`, `project_id`, foreign keys
- **Joins**: useComponent query joins areas, systems, test_packages (3 joins, minimal cost)
- **Caching**: TanStack Query caches results, reduces redundant fetches

### Metadata Dropdown Performance

- **Scale**: Tested with 1000+ options (combobox uses virtualization)
- **Filtering**: Client-side search (instant, no server round-trip)
- **Sorting**: One-time sort on fetch, cached in memory

---

## Summary

This feature requires **one database migration** (00063_add_components_version_field.sql) to add the `version` column for optimistic locking. All other tables and RLS policies already exist. The data model is simple, focusing on updating nullable foreign keys on the `components` table and optionally creating new entries in `areas`, `systems`, and `test_packages` tables. Optimistic updates provide instant feedback while server-side validation, version-based conflict detection, and RLS policies ensure data integrity.
