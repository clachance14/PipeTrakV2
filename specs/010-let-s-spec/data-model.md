# Phase 1: Data Model

**Feature**: Drawing-Centered Component Progress Table
**Date**: 2025-10-19

## Overview
This document defines the data structures, state management, and data flow for the unified drawing/component table feature.

---

## 1. Core Data Entities

### 1.1 Drawing Row (UI Entity)

**Purpose**: Represents a drawing with aggregated progress metrics in the table

**Source**: Join of `drawings` table + `mv_drawing_progress` materialized view

**TypeScript Interface**:
```typescript
interface DrawingRow {
  // From drawings table
  id: string // UUID
  project_id: string // UUID
  drawing_no_norm: string // Normalized drawing number (e.g., "P-001")
  drawing_no_raw: string // Original drawing number
  title: string | null // Optional description
  rev: string | null // Revision number
  is_retired: boolean

  // From mv_drawing_progress
  total_components: number // Count of all components
  completed_components: number // Count where percent_complete = 100
  avg_percent_complete: number // Mean of all component percentages

  // UI state (not from database)
  isExpanded: boolean // Tracked in React state
  isLoading: boolean // True while components are loading
}
```

**Display Format**:
- **Progress Summary**: `${completed_components}/${total_components} • ${avg_percent_complete.toFixed(0)}%`
- **Example**: "15/23 • 65%"

**Validation Rules**:
- `total_components` ≥ 0
- `completed_components` ≤ `total_components`
- `avg_percent_complete` between 0.00 and 100.00

**State Management**:
- Fetched via TanStack Query `useDrawingsWithProgress()` hook
- Cached for 2 minutes
- Invalidated on component milestone updates

---

### 1.2 Component Row (UI Entity)

**Purpose**: Represents a single component within an expanded drawing

**Source**: `components` table with joined `progress_templates`

**TypeScript Interface**:
```typescript
interface ComponentRow {
  // From components table
  id: string // UUID
  project_id: string // UUID
  drawing_id: string | null // UUID (nullable)
  component_type: ComponentType
  identity_key: IdentityKey // JSONB
  current_milestones: Record<string, boolean | number> // JSONB
  percent_complete: number // 0.00 to 100.00
  created_at: string // ISO timestamp
  last_updated_at: string // ISO timestamp
  last_updated_by: string | null // UUID
  is_retired: boolean

  // From progress_templates (joined)
  template: ProgressTemplate

  // Computed fields
  identityDisplay: string // Human-readable identity (e.g., "VBALU-001 2\" (1)")
  canUpdate: boolean // Based on user permissions
}

type ComponentType =
  | 'spool' | 'field_weld' | 'support' | 'valve' | 'fitting'
  | 'flange' | 'instrument' | 'tubing' | 'hose' | 'misc_component'
  | 'threaded_pipe'

interface IdentityKey {
  drawing_norm: string
  commodity_code: string
  size: string
  seq: number
}
```

**Derived Fields**:
```typescript
// identityDisplay calculation
function formatIdentityKey(key: IdentityKey, type: ComponentType): string {
  if (type === 'instrument') {
    return `${key.commodity_code} ${key.size === 'NOSIZE' ? '' : key.size}`.trim()
  }
  return `${key.commodity_code} ${key.size === 'NOSIZE' ? '' : key.size} (${key.seq})`.trim()
}

// canUpdate calculation
function canUpdateComponent(userPermissions: Permissions, component: ComponentRow): boolean {
  return !component.is_retired && userPermissions.can_update_milestones
}
```

**State Management**:
- Fetched lazily when drawing is expanded
- Cached per drawing_id: `['components', { drawing_id }]`
- Optimistic updates on milestone changes
- Invalidated on successful mutation

---

### 1.3 Progress Template (Database Entity)

**Purpose**: Defines milestone configuration for each component type

**Source**: `progress_templates` table

**TypeScript Interface**:
```typescript
interface ProgressTemplate {
  id: string // UUID
  component_type: ComponentType
  version: number // Currently always 1
  workflow_type: 'discrete' | 'quantity' | 'hybrid'
  milestones_config: MilestoneConfig[]
}

interface MilestoneConfig {
  name: string // e.g., "Receive", "Install"
  weight: number // Percentage weight (1-100)
  order: number // Display order (1, 2, 3...)
  is_partial: boolean // false = discrete (boolean), true = partial (0-100%)
  requires_welder: boolean // Welder stencil required for this milestone
}
```

**Constraints**:
- Sum of all `weight` values MUST equal 100
- `order` values MUST be unique within a template
- `name` values MUST be unique within a template

**Examples**:
```typescript
// Support template (discrete workflow)
{
  component_type: 'support',
  workflow_type: 'discrete',
  milestones_config: [
    { name: 'Receive', weight: 10, order: 1, is_partial: false, requires_welder: false },
    { name: 'Install', weight: 60, order: 2, is_partial: false, requires_welder: false },
    { name: 'Punch', weight: 10, order: 3, is_partial: false, requires_welder: false },
    { name: 'Test', weight: 15, order: 4, is_partial: false, requires_welder: false },
    { name: 'Restore', weight: 5, order: 5, is_partial: false, requires_welder: false }
  ]
}

// Threaded Pipe template (hybrid workflow)
{
  component_type: 'threaded_pipe',
  workflow_type: 'hybrid',
  milestones_config: [
    { name: 'Receive', weight: 10, order: 1, is_partial: false, requires_welder: false },
    { name: 'Fabricate', weight: 10, order: 2, is_partial: true, requires_welder: false },
    { name: 'Install', weight: 15, order: 3, is_partial: true, requires_welder: false },
    { name: 'Erect', weight: 10, order: 4, is_partial: true, requires_welder: false },
    { name: 'Connect', weight: 10, order: 5, is_partial: true, requires_welder: false },
    { name: 'Support', weight: 15, order: 6, is_partial: true, requires_welder: false },
    { name: 'Punch', weight: 10, order: 7, is_partial: false, requires_welder: false },
    { name: 'Test', weight: 15, order: 8, is_partial: false, requires_welder: false },
    { name: 'Restore', weight: 5, order: 9, is_partial: false, requires_welder: false }
  ]
}
```

**State Management**:
- Fetched once on mount
- Cached indefinitely (`staleTime: Infinity`)
- Stored in Map for O(1) lookup: `Map<ComponentType, ProgressTemplate>`

---

### 1.4 Milestone Update Payload (API Entity)

**Purpose**: Data structure for milestone update mutations

**TypeScript Interface**:
```typescript
interface MilestoneUpdatePayload {
  component_id: string // UUID
  milestone_name: string // e.g., "Receive"
  value: boolean | number // Discrete: true/false, Partial: 0-100
  user_id: string // From auth context
}

interface MilestoneUpdateResponse {
  component: ComponentRow // Updated component
  previous_value: boolean | number | null // For rollback
  audit_event_id: string // UUID of created milestone_event
}
```

**Validation Rules**:
```typescript
function validateMilestoneUpdate(payload: MilestoneUpdatePayload, template: ProgressTemplate): ValidationResult {
  const config = template.milestones_config.find(m => m.name === payload.milestone_name)

  if (!config) {
    return { valid: false, error: `Milestone ${payload.milestone_name} not in template` }
  }

  if (config.is_partial) {
    // Partial milestone: must be number 0-100
    if (typeof payload.value !== 'number' || payload.value < 0 || payload.value > 100) {
      return { valid: false, error: 'Partial milestone value must be 0-100' }
    }
  } else {
    // Discrete milestone: must be boolean
    if (typeof payload.value !== 'boolean') {
      return { valid: false, error: 'Discrete milestone value must be boolean' }
    }
  }

  return { valid: true }
}
```

**Mutation Flow**:
1. Validate payload against template
2. Fetch current component state
3. Update `current_milestones` JSONB field
4. Database trigger auto-calculates new `percent_complete`
5. Create `milestone_events` audit record
6. Return updated component

---

## 2. State Management Architecture

### 2.1 Server State (TanStack Query)

**Query Keys**:
```typescript
const queryKeys = {
  // Drawings with progress
  drawingsWithProgress: (projectId: string) =>
    ['drawings-with-progress', { project_id: projectId }],

  // Components by drawing
  componentsByDrawing: (drawingId: string) =>
    ['components', { drawing_id: drawingId }],

  // All progress templates (static)
  progressTemplates: ['progress-templates'],

  // Drawing progress view
  drawingProgress: (projectId: string) =>
    ['drawing-progress', { project_id: projectId }],
}
```

**Custom Hooks**:
```typescript
// Load drawings with progress
function useDrawingsWithProgress(projectId: string) {
  return useQuery({
    queryKey: queryKeys.drawingsWithProgress(projectId),
    queryFn: async () => {
      // Join drawings + mv_drawing_progress
      const { data, error } = await supabase
        .from('drawings')
        .select(`
          *,
          mv_drawing_progress!inner(
            total_components,
            completed_components,
            avg_percent_complete
          )
        `)
        .eq('project_id', projectId)
        .eq('is_retired', false)
        .order('drawing_no_norm')

      if (error) throw error
      return data.map(d => ({
        ...d,
        ...d.mv_drawing_progress,
        isExpanded: false,
        isLoading: false
      }))
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Load components for a drawing (lazy)
function useComponentsByDrawing(drawingId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.componentsByDrawing(drawingId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('components')
        .select(`
          *,
          progress_templates!inner(*)
        `)
        .eq('drawing_id', drawingId)
        .eq('is_retired', false)
        .order('identity_key->seq')

      if (error) throw error
      return data.map(c => ({
        ...c,
        template: c.progress_templates,
        identityDisplay: formatIdentityKey(c.identity_key, c.component_type),
        canUpdate: true // Will be set based on permissions
      }))
    },
    enabled: enabled && !!drawingId,
    staleTime: 2 * 60 * 1000,
  })
}

// Update milestone with optimistic UI
function useUpdateMilestone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: MilestoneUpdatePayload) => {
      const { data, error } = await supabase.rpc('update_component_milestone', {
        p_component_id: payload.component_id,
        p_milestone_name: payload.milestone_name,
        p_new_value: payload.value,
        p_user_id: payload.user_id
      })

      if (error) throw error
      return data as MilestoneUpdateResponse
    },
    onMutate: async (payload) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['components'] })

      // Snapshot previous state
      const previous = queryClient.getQueryData(
        queryKeys.componentsByDrawing(payload.component_id)
      )

      // Optimistically update
      queryClient.setQueryData(
        queryKeys.componentsByDrawing(payload.component_id),
        (old: ComponentRow[] | undefined) => {
          if (!old) return old
          return old.map(c =>
            c.id === payload.component_id
              ? { ...c, current_milestones: { ...c.current_milestones, [payload.milestone_name]: payload.value } }
              : c
          )
        }
      )

      return { previous }
    },
    onError: (err, payload, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.componentsByDrawing(payload.component_id),
          context.previous
        )
      }
      toast.error('Failed to update milestone')
    },
    onSuccess: (data, payload) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['components'] })
      queryClient.invalidateQueries({ queryKey: ['drawing-progress'] })
      queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] })
    }
  })
}
```

---

### 2.2 Client State (URL + React State)

**URL State** (via useSearchParams):
```typescript
interface URLState {
  expanded: string // Comma-separated drawing IDs
  search: string // Search term
  status: 'all' | 'not-started' | 'in-progress' | 'complete'
}

// Parse from URL
const [searchParams, setSearchParams] = useSearchParams()

const expandedDrawingIds = useMemo(() => {
  const expanded = searchParams.get('expanded')
  return expanded ? new Set(expanded.split(',')) : new Set<string>()
}, [searchParams])

const searchTerm = searchParams.get('search') || ''
const statusFilter = (searchParams.get('status') || 'all') as URLState['status']

// Update URL
function toggleDrawingExpanded(drawingId: string) {
  setSearchParams(prev => {
    const current = new Set(prev.get('expanded')?.split(',').filter(Boolean) || [])
    if (current.has(drawingId)) {
      current.delete(drawingId)
    } else {
      current.add(drawingId)
    }
    return {
      ...Object.fromEntries(prev),
      expanded: Array.from(current).join(',') || undefined
    }
  })
}
```

**Local React State**:
```typescript
// Component-level state (not in URL)
const [loadingDrawingId, setLoadingDrawingId] = useState<string | null>(null)
const [partialMilestoneEditor, setPartialMilestoneEditor] = useState<{
  componentId: string
  milestoneName: string
  currentValue: number
} | null>(null)
```

---

### 2.3 Permission State

**Source**: `usePermissions()` hook (already exists)

**TypeScript Interface**:
```typescript
interface Permissions {
  can_update_milestones: boolean
  can_view_components: boolean
  can_view_audit_log: boolean
  // ... other permissions
}
```

**Usage in Component**:
```typescript
const { can_update_milestones } = usePermissions()

<MilestoneCheckbox
  disabled={!can_update_milestones}
  value={milestone.value}
  onChange={handleChange}
/>
```

---

## 3. Data Flow Diagrams

### 3.1 Page Load Flow

```
User lands on /components
    ↓
useDrawingsWithProgress(projectId) fires
    ↓
TanStack Query fetches from Supabase:
  - drawings table (filtered by project_id, is_retired=false)
  - mv_drawing_progress view (joined)
    ↓
Data transformed to DrawingRow[]
    ↓
React renders table with collapsed drawings
    ↓
User sees: Drawing # | Title | Progress Summary | Component Count
```

### 3.2 Drawing Expansion Flow

```
User clicks Drawing Row
    ↓
toggleDrawingExpanded(drawingId) called
    ↓
URL updated: ?expanded=drawing-uuid-123
    ↓
useComponentsByDrawing(drawingId, enabled=true) fires
    ↓
Loading state shown (skeleton rows)
    ↓
TanStack Query fetches from Supabase:
  - components table (filtered by drawing_id, is_retired=false)
  - progress_templates table (joined)
    ↓
Data transformed to ComponentRow[]
    ↓
Virtualized component rows rendered beneath drawing
    ↓
User sees: Identity | Type | Milestone 1 ☐ | Milestone 2 ☐ | ... | Progress %
```

### 3.3 Milestone Update Flow (Discrete)

```
User clicks Milestone Checkbox (currently unchecked)
    ↓
handleMilestoneToggle({ componentId, milestoneName, value: true })
    ↓
useUpdateMilestone mutation fires
    ↓
OPTIMISTIC UPDATE:
  - Checkbox shows checked immediately
  - Progress % updates immediately
    ↓
Mutation sent to Supabase RPC: update_component_milestone
    ↓
Database transaction:
  1. Update components.current_milestones JSONB
  2. Trigger recalculates components.percent_complete
  3. Insert milestone_events audit record
    ↓
SUCCESS:
  - Invalidate ['components'] query
  - Invalidate ['drawing-progress'] query
  - Drawing summary updates (15/23 → 16/23)
    ↓
OR ERROR:
  - Rollback optimistic update
  - Show toast: "Failed to update milestone"
  - User can retry
```

### 3.4 Milestone Update Flow (Partial)

```
User clicks Percentage Value (e.g., "75%")
    ↓
Popover opens with Slider control
    ↓
User drags slider to 85%
    ↓
Local state updates (tempValue = 85)
    ↓
User clicks "Update" button
    ↓
handlePartialUpdate({ componentId, milestoneName, value: 85 })
    ↓
useUpdateMilestone mutation fires
    ↓
[Same optimistic update flow as discrete]
    ↓
Popover closes
    ↓
Component row shows "85%" (success) or reverts to "75%" (error)
```

---

## 4. Database Schema Dependencies

### 4.1 Existing Tables (No Changes Required)

```sql
-- drawings table (already exists)
CREATE TABLE drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_no_norm TEXT NOT NULL,
  drawing_no_raw TEXT NOT NULL,
  title TEXT,
  rev TEXT,
  is_retired BOOLEAN DEFAULT false,
  UNIQUE (project_id, drawing_no_norm)
);

-- components table (already exists)
CREATE TABLE components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_id UUID REFERENCES drawings(id) ON DELETE SET NULL,
  component_type TEXT NOT NULL,
  progress_template_id UUID NOT NULL REFERENCES progress_templates(id),
  identity_key JSONB NOT NULL,
  current_milestones JSONB DEFAULT '{}',
  percent_complete NUMERIC(5,2) DEFAULT 0.00,
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  last_updated_by UUID,
  is_retired BOOLEAN DEFAULT false,
  UNIQUE (project_id, component_type, identity_key) WHERE is_retired = false
);

-- progress_templates table (already exists)
CREATE TABLE progress_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_type TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('discrete', 'quantity', 'hybrid')),
  milestones_config JSONB NOT NULL
);

-- milestone_events table (already exists)
CREATE TABLE milestone_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('complete', 'rollback', 'update')),
  value NUMERIC(5,2),
  previous_value NUMERIC(5,2),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

-- mv_drawing_progress materialized view (already exists)
CREATE MATERIALIZED VIEW mv_drawing_progress AS
SELECT
  d.id AS drawing_id,
  d.drawing_no_norm,
  d.project_id,
  COUNT(c.id) AS total_components,
  COUNT(c.id) FILTER (WHERE c.percent_complete = 100) AS completed_components,
  AVG(c.percent_complete) AS avg_percent_complete
FROM drawings d
LEFT JOIN components c ON c.drawing_id = d.id AND c.is_retired = false
WHERE d.is_retired = false
GROUP BY d.id, d.drawing_no_norm, d.project_id;
```

**RLS Policies**: All tables already have RLS enabled with organization_id filtering

---

### 4.2 Required Database Function (To Be Created)

```sql
-- Stored procedure for atomic milestone update
CREATE OR REPLACE FUNCTION update_component_milestone(
  p_component_id UUID,
  p_milestone_name TEXT,
  p_new_value NUMERIC,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_component RECORD;
  v_previous_value NUMERIC;
  v_new_milestones JSONB;
  v_audit_id UUID;
BEGIN
  -- Fetch current component
  SELECT * INTO v_component
  FROM components
  WHERE id = p_component_id
  FOR UPDATE; -- Lock row

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Component not found: %', p_component_id;
  END IF;

  -- Get previous value
  v_previous_value := (v_component.current_milestones->>p_milestone_name)::NUMERIC;

  -- Update milestones JSONB
  v_new_milestones := jsonb_set(
    v_component.current_milestones,
    ARRAY[p_milestone_name],
    to_jsonb(p_new_value)
  );

  -- Update component
  UPDATE components
  SET
    current_milestones = v_new_milestones,
    last_updated_at = now(),
    last_updated_by = p_user_id
  WHERE id = p_component_id;

  -- Note: percent_complete auto-updated by trigger

  -- Create audit event
  INSERT INTO milestone_events (
    component_id,
    milestone_name,
    action,
    value,
    previous_value,
    user_id
  ) VALUES (
    p_component_id,
    p_milestone_name,
    CASE
      WHEN v_previous_value IS NULL THEN 'complete'
      WHEN v_previous_value > p_new_value THEN 'rollback'
      ELSE 'update'
    END,
    p_new_value,
    v_previous_value,
    p_user_id
  ) RETURNING id INTO v_audit_id;

  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_drawing_progress;

  -- Return updated component
  RETURN json_build_object(
    'component', row_to_json(v_component),
    'previous_value', v_previous_value,
    'audit_event_id', v_audit_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. Type Safety Guarantees

### 5.1 Database Type Generation

```bash
# Command to regenerate types after schema changes
npx supabase gen types typescript --linked > src/types/database.types.ts
```

**Generated Types** (example):
```typescript
export interface Database {
  public: {
    Tables: {
      components: {
        Row: {
          id: string
          project_id: string
          drawing_id: string | null
          component_type: string
          // ... all fields
        }
        Insert: { /* ... */ }
        Update: { /* ... */ }
      }
      // ... other tables
    }
    Views: {
      mv_drawing_progress: {
        Row: {
          drawing_id: string
          total_components: number
          completed_components: number
          avg_percent_complete: number
        }
      }
    }
  }
}
```

### 5.2 Zod Validation Schemas

**Milestone Update Schema**:
```typescript
import { z } from 'zod'

export const milestoneUpdateSchema = z.object({
  component_id: z.string().uuid(),
  milestone_name: z.string().min(1),
  value: z.union([z.boolean(), z.number().min(0).max(100)])
})

export type MilestoneUpdate = z.infer<typeof milestoneUpdateSchema>

// Usage in mutation
async function updateMilestone(payload: unknown) {
  const validated = milestoneUpdateSchema.parse(payload) // Throws if invalid
  // ... proceed with mutation
}
```

---

## 6. Performance Characteristics

### 6.1 Query Performance

| Query | Dataset Size | Expected Time | Optimization |
|-------|-------------|---------------|--------------|
| Load drawings | 500 drawings | <500ms | Indexed on project_id, materialized view |
| Load components | 200 components | <300ms | Indexed on drawing_id, lazy loaded |
| Update milestone | 1 component | <200ms | RPC function, single transaction |
| Refresh progress | 500 drawings | <1s | Materialized view, concurrent refresh |

### 6.2 Memory Usage

| Component | Per Item | 500 Drawings | 10,000 Components |
|-----------|----------|--------------|-------------------|
| DrawingRow | ~200 bytes | 100 KB | — |
| ComponentRow | ~500 bytes | — | 5 MB |
| Virtualized DOM | ~1 KB/row | ~2 MB | ~100 KB (only visible) |
| TanStack Query cache | ~1.5x raw | 150 KB | 7.5 MB |

**Total estimated memory**: ~10 MB for full dataset (well within browser limits)

---

## 7. Error Handling

### 7.1 Network Errors

```typescript
const { data, error, isError } = useDrawingsWithProgress(projectId)

if (isError) {
  return (
    <ErrorState
      title="Failed to load drawings"
      message={error.message}
      retry={() => refetch()}
    />
  )
}
```

### 7.2 Validation Errors

```typescript
try {
  await updateMilestoneMutation.mutateAsync(payload)
} catch (error) {
  if (error instanceof ZodError) {
    toast.error('Invalid milestone value')
  } else if (error.code === 'PGRST116') {
    toast.error('Component not found')
  } else {
    toast.error('Failed to update milestone')
  }
}
```

### 7.3 Permission Errors

```typescript
// Component-level check
if (!can_update_milestones) {
  return (
    <Tooltip content="You don't have permission to update milestones">
      <button disabled className="cursor-not-allowed opacity-50">
        <Checkbox disabled />
      </button>
    </Tooltip>
  )
}
```

---

## Summary

**Data Model Status**: ✅ COMPLETE

**Key Entities Defined**:
1. ✅ DrawingRow (UI entity with aggregated progress)
2. ✅ ComponentRow (UI entity with template and permissions)
3. ✅ ProgressTemplate (database entity, cached)
4. ✅ MilestoneUpdatePayload (API entity)

**State Management**:
1. ✅ Server state via TanStack Query
2. ✅ Client state via URL params
3. ✅ Permission state via usePermissions hook

**Database Dependencies**:
1. ✅ All existing tables sufficient (no schema changes)
2. ✅ One new RPC function required: `update_component_milestone()`
3. ✅ Materialized view already exists

**Type Safety**:
1. ✅ TypeScript interfaces defined
2. ✅ Zod validation schemas
3. ✅ Database types auto-generated

**Performance**:
1. ✅ Query times <1s for all operations
2. ✅ Memory usage <10 MB for full dataset
3. ✅ Optimistic updates for instant UI feedback

**Ready for**: Contract generation and test creation (next steps in Phase 1)
