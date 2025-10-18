# Data Model: Component Tracking & Lifecycle Management

**Feature**: 007-component-tracking-lifecycle
**Date**: 2025-10-16

## Overview

This document defines the **UI data models** for Feature 007. Note: Database tables already exist from Sprint 1 (`areas`, `systems`, `test_packages`, `components`, `drawings`, `milestone_events`). These are TypeScript interfaces for form data, API requests, and component props - NOT new database schemas.

---

## Form Data Models

### AreaFormData

**Purpose**: Data structure for creating/editing areas

```typescript
interface AreaFormData {
  name: string          // Unique per project, max 50 chars, trimmed
  description: string | null  // Max 500 chars, optional
}
```

**Validation Rules** (Zod schema):
- `name`: Required, 1-50 characters, trimmed, must be unique within project
- `description`: Optional, max 500 characters

**Usage**: `<AreaForm>` component, `useCreateArea()` mutation, `useUpdateArea()` mutation

**Example**:
```typescript
const areaData: AreaFormData = {
  name: 'Area 100',
  description: 'Process equipment zone'
}
```

---

### SystemFormData

**Purpose**: Data structure for creating/editing systems

```typescript
interface SystemFormData {
  name: string          // Unique per project, max 50 chars, trimmed
  description: string | null  // Max 500 chars, optional
}
```

**Validation Rules** (Zod schema):
- `name`: Required, 1-50 characters, trimmed, must be unique within project
- `description`: Optional, max 500 characters

**Usage**: `<SystemForm>` component, `useCreateSystem()` mutation, `useUpdateSystem()` mutation

**Example**:
```typescript
const systemData: SystemFormData = {
  name: 'HVAC-01',
  description: 'Heating, ventilation, and air conditioning system'
}
```

---

### TestPackageFormData

**Purpose**: Data structure for creating/editing test packages

```typescript
interface TestPackageFormData {
  name: string          // Unique per project, max 100 chars
  description: string | null  // Max 500 chars, optional
  target_date: Date | null    // Future date (warn if past, don't block)
}
```

**Validation Rules** (Zod schema):
- `name`: Required, 1-100 characters, must be unique within project
- `description`: Optional, max 500 characters
- `target_date`: Optional, must be valid Date object (warn if past date, allow submission)

**Usage**: `<TestPackageForm>` component, `useCreateTestPackage()` mutation, `useUpdateTestPackage()` mutation

**Example**:
```typescript
const packageData: TestPackageFormData = {
  name: 'TP-2025-001',
  description: 'Q4 2025 test package for HVAC system',
  target_date: new Date('2025-12-15')
}
```

---

### ComponentAssignmentData

**Purpose**: Data structure for bulk-assigning components to areas/systems/test packages

```typescript
interface ComponentAssignmentData {
  component_ids: string[]   // Array of component UUIDs to assign
  area_id: string | null    // Target area UUID (optional)
  system_id: string | null  // Target system UUID (optional)
  test_package_id: string | null  // Target test package UUID (optional)
}
```

**Validation Rules**:
- `component_ids`: Required, must be non-empty array
- At least ONE of `area_id`, `system_id`, or `test_package_id` must be non-null
- All IDs must be valid UUIDs

**Usage**: `<ComponentAssignDialog>` component, `useAssignComponents()` mutation

**Example**:
```typescript
const assignmentData: ComponentAssignmentData = {
  component_ids: ['uuid-1', 'uuid-2', 'uuid-3'],
  area_id: 'area-uuid',
  system_id: 'system-uuid',
  test_package_id: null
}
```

---

### DrawingRetirementData

**Purpose**: Data structure for retiring a drawing

```typescript
interface DrawingRetirementData {
  drawing_id: string    // UUID of drawing to retire
  retire_reason: string // Required, min 10 chars
}
```

**Validation Rules** (Zod schema):
- `drawing_id`: Required, valid UUID
- `retire_reason`: Required, min 10 characters, cannot be empty or whitespace-only

**Usage**: `<DrawingRetireDialog>` component, `useRetireDrawing()` mutation

**Example**:
```typescript
const retirementData: DrawingRetirementData = {
  drawing_id: 'drawing-uuid',
  retire_reason: 'Superseded by revision B, issued 2025-10-15'
}
```

---

### MilestoneUpdateData

**Purpose**: Data structure for updating a component milestone

```typescript
interface MilestoneUpdateData {
  component_id: string  // UUID of component
  milestone_name: string  // Name from progress_template (e.g., "Receive", "Fabricate")
  value: boolean | number // Boolean for discrete, 0-100 for partial %
  metadata?: {
    welder_stencil?: string  // Required for "Weld Made" milestone
    [key: string]: any       // Extensible for future milestone-specific data
  }
}
```

**Validation Rules**:
- `component_id`: Required, valid UUID
- `milestone_name`: Required, must exist in component's progress_template.milestones_config
- `value`:
  - If discrete milestone (`is_partial: false`): boolean (true = complete, false = incomplete)
  - If partial milestone (`is_partial: true`): number (0-100, validated range)
- `metadata.welder_stencil`: Required if `milestone_name === 'Weld Made'` for field_weld components

**Usage**: `<MilestoneButton>` component, `useUpdateMilestone()` mutation

**Example - Discrete**:
```typescript
const discreteUpdate: MilestoneUpdateData = {
  component_id: 'component-uuid',
  milestone_name: 'Receive',
  value: true // Mark as complete
}
```

**Example - Partial**:
```typescript
const partialUpdate: MilestoneUpdateData = {
  component_id: 'component-uuid',
  milestone_name: 'Fabricate',
  value: 85 // 85% complete
}
```

**Example - Weld with metadata**:
```typescript
const weldUpdate: MilestoneUpdateData = {
  component_id: 'component-uuid',
  milestone_name: 'Weld Made',
  value: true,
  metadata: {
    welder_stencil: 'JD42'
  }
}
```

---

### ComponentFilters

**Purpose**: Data structure for filtering component list

```typescript
interface ComponentFilters {
  area_id?: string        // Filter by area UUID
  system_id?: string      // Filter by system UUID
  component_type?: string // Filter by type (spool, field_weld, support, etc.)
  drawing_id?: string     // Filter by drawing UUID
  test_package_id?: string  // Filter by test package UUID
  progress_min?: number   // Filter by min % complete (0-100)
  progress_max?: number   // Filter by max % complete (0-100)
  search?: string         // Search identity key (partial match, case-insensitive)
}
```

**Validation Rules**:
- All fields optional
- `progress_min` and `progress_max`: 0-100 range, `progress_min ≤ progress_max`
- `search`: Trimmed, case-insensitive partial match on identity_key JSONB

**Usage**: `<ComponentFilters>` component, `useComponents({ filters })` query

**Example**:
```typescript
const filters: ComponentFilters = {
  area_id: 'area-100-uuid',
  component_type: 'spool',
  progress_min: 50,
  progress_max: 100,
  search: 'SP-001'
}
```

---

## Component Props Models

### MilestoneButtonProps

**Purpose**: Props for `<MilestoneButton>` component

```typescript
interface MilestoneButtonProps {
  milestone: {
    name: string
    weight: number
    is_partial?: boolean
  }
  value: boolean | number  // Current milestone value
  onChange: (value: boolean | number) => void
  disabled: boolean        // True if user lacks can_update_milestones permission
}
```

**Usage**: Renders Checkbox (discrete) or Slider (partial) based on `milestone.is_partial` flag

---

### ComponentRowProps

**Purpose**: Props for virtualized component row in `<ComponentList>`

```typescript
interface ComponentRowProps {
  component: {
    id: string
    identity_key: Record<string, any>
    component_type: string
    drawing: { drawing_no_norm: string } | null
    area: { name: string } | null
    system: { name: string } | null
    test_package: { name: string } | null
    percent_complete: number
    last_updated_at: string
  }
  style: React.CSSProperties  // Positioning styles from react-virtual
}
```

**Usage**: Single row in virtualized component list

---

## API Response Models

### AreaResponse

```typescript
interface AreaResponse {
  area: {
    id: string
    project_id: string
    name: string
    description: string | null
    created_at: string
  }
}
```

**Usage**: Response from `useCreateArea()` and `useUpdateArea()`

---

### ComponentListResponse

```typescript
interface ComponentListResponse {
  components: Array<{
    id: string
    project_id: string
    drawing_id: string | null
    component_type: string
    progress_template_id: string
    identity_key: Record<string, any>
    area_id: string | null
    system_id: string | null
    test_package_id: string | null
    attributes: Record<string, any>
    current_milestones: Record<string, boolean | number>
    percent_complete: number
    created_at: string
    last_updated_at: string
    is_retired: boolean
    // Joined relations
    drawing?: { drawing_no_norm: string, title: string }
    area?: { name: string }
    system?: { name: string }
    test_package?: { name: string }
    progress_template?: {
      component_type: string
      milestones_config: Array<{
        name: string
        weight: number
        order: number
        is_partial?: boolean
      }>
    }
  }>
  total_count: number
}
```

**Usage**: Response from `useComponents({ projectId, filters })` query

---

### MilestoneEventResponse

```typescript
interface MilestoneEventResponse {
  component: {
    id: string
    current_milestones: Record<string, boolean | number>
    percent_complete: number
    last_updated_at: string
  }
  event: {
    id: string
    component_id: string
    milestone_name: string
    action: 'complete' | 'rollback' | 'update'
    value: boolean | number | null
    previous_value: boolean | number | null
    user_id: string
    created_at: string
    metadata: Record<string, any> | null
  }
}
```

**Usage**: Response from `useUpdateMilestone()` mutation

---

## State Transitions

### Milestone State Transitions

**Discrete Milestones**:
```
Initial: false (incomplete)
  ↓ (user clicks checkbox)
Complete: true
  ↓ (user un-clicks checkbox - rollback)
Incomplete: false
```

**Partial Milestones (Hybrid)**:
```
Initial: 0 (0% complete)
  ↓ (user drags slider to 50)
Partial: 50 (50% complete)
  ↓ (user drags slider to 100)
Complete: 100 (100% complete)
  ↓ (user drags slider to 0 - rollback)
Incomplete: 0 (0% complete)
```

**Milestone Event Actions**:
- `complete`: Value changes from `false` → `true` OR `0` → `>0`
- `rollback`: Value changes from `true` → `false` OR `>0` → `0`
- `update`: Partial % changes (e.g., `50` → `85`)

---

## Relationships

### Area → Components
- **Type**: One-to-Many
- **Relationship**: Area can have many components, component can have one area (or NULL)
- **Cascade**: When area deleted → `component.area_id` set to NULL (not deleted)

### System → Components
- **Type**: One-to-Many
- **Relationship**: System can have many components, component can have one system (or NULL)
- **Cascade**: When system deleted → `component.system_id` set to NULL (not deleted)

### Test Package → Components
- **Type**: One-to-Many
- **Relationship**: Test package can have many components, component can have one test package (or NULL)
- **Cascade**: When test package deleted → `component.test_package_id` set to NULL (not deleted)

### Component → Milestone Events
- **Type**: One-to-Many
- **Relationship**: Component has many milestone events (audit trail)
- **Cascade**: When component deleted → milestone events CASCADE DELETE (audit trail removed)

### Drawing → Components
- **Type**: One-to-Many
- **Relationship**: Drawing has many components, component references one drawing
- **Cascade**: When drawing retired (`is_retired=true`) → components retain `drawing_id` (no cascade)

---

## Summary

All UI data models defined for Feature 007:
- ✅ 6 Form Data models (Area, System, TestPackage, ComponentAssignment, DrawingRetirement, MilestoneUpdate)
- ✅ 1 Filter model (ComponentFilters)
- ✅ 2 Component Props models (MilestoneButton, ComponentRow)
- ✅ 3 API Response models (Area, ComponentList, MilestoneEvent)
- ✅ State transitions documented (discrete and partial milestones)
- ✅ Relationships mapped (areas, systems, packages → components → events)

**Next**: Generate contracts/ directory with TypeScript contract definitions
