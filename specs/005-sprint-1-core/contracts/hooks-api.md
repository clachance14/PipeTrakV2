# TanStack Query Hooks API Contract

**Feature**: 005-sprint-1-core
**Date**: 2025-10-15

## Design Principles

All hooks follow TanStack Query v5 patterns:
- **Queries**: `useQuery` for data fetching with automatic caching
- **Mutations**: `useMutation` for create/update/delete with optimistic updates
- **Query Keys**: Hierarchical structure for cache invalidation (e.g., `['projects', projectId, 'components']`)
- **Error Handling**: Errors propagate to UI via `error` property, no silent failures
- **RLS Enforcement**: All queries automatically filtered by `organization_id` via Supabase RLS policies

---

## 1. useProjects Hook

**File**: `src/hooks/useProjects.ts`

**Purpose**: CRUD operations for projects table.

### Queries

#### useProjects(filters?)
```typescript
function useProjects(filters?: {
  is_archived?: boolean;
  search?: string;
}): UseQueryResult<Project[], Error>

// Query Key: ['projects', filters]
// RLS: Filtered by organization_id automatically
// Cache: 5 minutes (staleTime: 5 * 60 * 1000)
```

#### useProject(id)
```typescript
function useProject(id: string): UseQueryResult<Project, Error>

// Query Key: ['projects', id]
// RLS: Returns null if project not in user's org
```

### Mutations

#### useCreateProject()
```typescript
function useCreateProject(): UseMutationResult<Project, Error, {
  name: string;
  description?: string;
}>

// Invalidates: ['projects']
// Optimistic Update: Adds project to cache immediately
```

#### useUpdateProject()
```typescript
function useUpdateProject(): UseMutationResult<Project, Error, {
  id: string;
  name?: string;
  description?: string;
  is_archived?: boolean;
}>

// Invalidates: ['projects', id], ['projects']
// Optimistic Update: Updates project in cache immediately
```

---

## 2. useDrawings Hook

**File**: `src/hooks/useDrawings.ts`

**Purpose**: Drawing management + similarity detection.

### Queries

#### useDrawings(projectId, filters?)
```typescript
function useDrawings(projectId: string, filters?: {
  is_retired?: boolean;
  search?: string;
}): UseQueryResult<Drawing[], Error>

// Query Key: ['projects', projectId, 'drawings', filters]
// RLS: Filtered by project.organization_id
```

#### useSimilarDrawings(projectId, drawingNoNorm)
```typescript
function useSimilarDrawings(
  projectId: string,
  drawingNoNorm: string,
  threshold?: number // default 0.85
): UseQueryResult<{
  drawing_id: string;
  drawing_no_norm: string;
  similarity_score: number;
}[], Error>

// Query Key: ['projects', projectId, 'similar-drawings', drawingNoNorm, threshold]
// Calls: detect_similar_drawings() stored procedure (FR-037 to FR-040)
```

### Mutations

#### useCreateDrawing()
```typescript
function useCreateDrawing(): UseMutationResult<Drawing, Error, {
  project_id: string;
  drawing_no_raw: string;
  title?: string;
  rev?: string;
}>

// Auto-normalizes: drawing_no_norm = normalize(drawing_no_raw)
// Invalidates: ['projects', project_id, 'drawings']
// Side Effect: Triggers similar drawing detection, creates needs_review if matches found
```

#### useRetireDrawing()
```typescript
function useRetireDrawing(): UseMutationResult<Drawing, Error, {
  id: string;
  retire_reason: string;
}>

// Invalidates: ['projects', projectId, 'drawings'], ['drawings', id]
// Sets: is_retired = true, retire_reason
```

---

## 3. useComponents Hook

**File**: `src/hooks/useComponents.ts`

**Purpose**: Component CRUD + milestone updates.

### Queries

#### useComponents(projectId, filters?)
```typescript
function useComponents(projectId: string, filters?: {
  component_type?: ComponentType;
  drawing_id?: string;
  area_id?: string;
  system_id?: string;
  test_package_id?: string;
  is_retired?: boolean;
}): UseQueryResult<Component[], Error>

// Query Key: ['projects', projectId, 'components', filters]
// RLS: Filtered by project.organization_id
```

#### useComponent(id)
```typescript
function useComponent(id: string): UseQueryResult<Component, Error>

// Query Key: ['components', id]
// Includes: Joins with progress_template to get milestones config
```

### Mutations

#### useCreateComponent()
```typescript
function useCreateComponent(): UseMutationResult<Component, Error, {
  project_id: string;
  component_type: ComponentType;
  identity_key: Record<string, any>; // Type-specific, validated by FR-041
  progress_template_id: string;
  drawing_id?: string;
  attributes?: Record<string, any>;
}>

// Validation: identity_key structure matches component_type (FR-041)
// Invalidates: ['projects', project_id, 'components']
// Sets: current_milestones = {}, percent_complete = 0.00
```

#### useUpdateComponentMilestones()
```typescript
function useUpdateComponentMilestones(): UseMutationResult<Component, Error, {
  id: string;
  current_milestones: Record<string, boolean | number>; // boolean for discrete, 0-100 for partial %
  reason?: string; // Optional reason for audit_log
}>

// Permission Check: Requires can_update_milestones (FR-047)
// Trigger: Auto-recalculates percent_complete via calculate_component_percent() (FR-012)
// Side Effects:
//   - Creates milestone_event record (FR-013)
//   - Creates audit_log entry (FR-030)
//   - Checks for out-of-sequence, creates needs_review if detected (FR-023)
// Invalidates: ['components', id], ['projects', projectId, 'components']
```

---

## 4. useAreas Hook

**File**: `src/hooks/useAreas.ts`

**Purpose**: Area assignment management.

### Queries

#### useAreas(projectId)
```typescript
function useAreas(projectId: string): UseQueryResult<Area[], Error>

// Query Key: ['projects', projectId, 'areas']
// RLS: Filtered by project.organization_id
```

### Mutations

#### useCreateArea()
```typescript
function useCreateArea(): UseMutationResult<Area, Error, {
  project_id: string;
  name: string;
  description?: string;
}>

// Validation: name unique within project (idx_areas_project_name, FR-018)
// Invalidates: ['projects', project_id, 'areas']
```

---

## 5. useSystems Hook

**File**: `src/hooks/useSystems.ts`

**Purpose**: System assignment management.

### Queries

#### useSystems(projectId)
```typescript
function useSystems(projectId: string): UseQueryResult<System[], Error>

// Query Key: ['projects', projectId, 'systems']
```

### Mutations

#### useCreateSystem()
```typescript
function useCreateSystem(): UseMutationResult<System, Error, {
  project_id: string;
  name: string;
  description?: string;
}>

// Validation: name unique within project (idx_systems_project_name, FR-018)
```

---

## 6. useTestPackages Hook

**File**: `src/hooks/useTestPackages.ts`

**Purpose**: Test package + readiness view.

### Queries

#### useTestPackages(projectId)
```typescript
function useTestPackages(projectId: string): UseQueryResult<TestPackage[], Error>

// Query Key: ['projects', projectId, 'test-packages']
```

#### usePackageReadiness(packageId)
```typescript
function usePackageReadiness(packageId: string): UseQueryResult<{
  package_id: string;
  project_id: string;
  package_name: string;
  target_date: string;
  total_components: number;
  completed_components: number;
  avg_percent_complete: number;
  blocker_count: number;
  last_activity_at: string;
}, Error>

// Query Key: ['test-packages', packageId, 'readiness']
// Source: mv_package_readiness materialized view (FR-034)
// Permission Check: Requires can_view_dashboards (FR-047)
// Refresh: Auto-refreshed every 60 seconds (FR-035)
```

### Mutations

#### useCreateTestPackage()
```typescript
function useCreateTestPackage(): UseMutationResult<TestPackage, Error, {
  project_id: string;
  name: string;
  description?: string;
  target_date?: string; // ISO 8601 date
}>
```

---

## 7. useWelders Hook

**File**: `src/hooks/useWelders.ts`

**Purpose**: Welder registry + verification.

### Queries

#### useWelders(projectId, filters?)
```typescript
function useWelders(projectId: string, filters?: {
  status?: 'unverified' | 'verified';
}): UseQueryResult<Welder[], Error>

// Query Key: ['projects', projectId, 'welders', filters]
```

### Mutations

#### useCreateWelder()
```typescript
function useCreateWelder(): UseMutationResult<Welder, Error, {
  project_id: string;
  name: string;
  stencil: string;
}>

// Auto-normalizes: stencil_norm = UPPER(TRIM(stencil))
// Validation: stencil_norm matches regex [A-Z0-9-]{2,12} (FR-043)
// Validation: stencil_norm unique within project (idx_welders_project_stencil, FR-020)
// Sets: status = 'unverified'
```

#### useVerifyWelder()
```typescript
function useVerifyWelder(): UseMutationResult<Welder, Error, {
  id: string;
}>

// Permission Check: Requires can_manage_welders (FR-047)
// Sets: status = 'verified', verified_at = now(), verified_by = auth.uid()
// Invalidates: ['projects', projectId, 'welders'], ['welders', id]
```

---

## 8. useFieldWeldInspections Hook

**File**: `src/hooks/useFieldWeldInspections.ts`

**Purpose**: QC tracking for field welds (hydro, PMI, PWHT, x-ray, repairs).

### Queries

#### useFieldWeldInspections(projectId, filters?)
```typescript
function useFieldWeldInspections(projectId: string, filters?: {
  component_id?: string;
  welder_id?: string;
  flagged_for_xray?: boolean;
  hydro_complete?: boolean;
  turned_over_to_client?: boolean;
  parent_weld_id?: string; // Filter for repairs only
}): UseQueryResult<FieldWeldInspection[], Error>

// Query Key: ['projects', projectId, 'field-weld-inspections', filters]
// RLS: Filtered by project.organization_id
```

#### useFieldWeldInspection(id)
```typescript
function useFieldWeldInspection(id: string): UseQueryResult<FieldWeldInspection, Error>

// Query Key: ['field-weld-inspections', id]
// Includes: Joins with welder, component for full context
```

#### useWeldRepairHistory(parentWeldId)
```typescript
function useWeldRepairHistory(parentWeldId: string): UseQueryResult<FieldWeldInspection[], Error>

// Query Key: ['field-weld-inspections', parentWeldId, 'repair-history']
// Returns: Original weld + all repairs (42, 42.1, 42.2) ordered by weld_id_number
// Calls: get_weld_repair_history() stored procedure (FR-056)
```

### Mutations

#### useCreateFieldWeldInspection()
```typescript
function useCreateFieldWeldInspection(): UseMutationResult<FieldWeldInspection, Error, {
  component_id: string; // Must be field_weld type component
  project_id: string;
  weld_id_number: number; // For repairs: 42.1, 42.2
  parent_weld_id?: string; // Required for repairs
  welder_id: string; // Set by foreman when marking "Weld Made"
  drawing_iso_number?: string;
  package_number?: string;
  spec?: string;
  system_code?: string;
  date_welded?: string; // ISO 8601 date
  // ... other optional QC fields
}>

// Validation: weld_id_number unique within project (FR-055)
// Validation: parent_weld_id required if weld_id_number has decimal (FR-056)
// Validation: welder_id required (FR-059)
// Invalidates: ['projects', project_id, 'field-weld-inspections']
// Side Effect: If parent_weld_id set, increments repair_sequence automatically
```

#### useUpdateFieldWeldInspection()
```typescript
function useUpdateFieldWeldInspection(): UseMutationResult<FieldWeldInspection, Error, {
  id: string;
  // QC fields (all optional)
  flagged_for_xray?: boolean;
  xray_shot_number?: string;
  xray_result?: string;
  hydro_complete?: boolean;
  hydro_complete_date?: string; // ISO 8601 date
  restored_date?: string;
  pmi_complete?: boolean;
  pmi_date?: string;
  pmi_result?: string;
  pwht_complete?: boolean;
  pwht_date?: string;
  nde_type_performed?: string;
  nde_result?: string;
  turned_over_to_client?: boolean;
  turnover_date?: string;
  comments?: string;
}>

// Permission Check: Requires can_update_milestones (FR-060)
// Side Effects:
//   - Sets last_updated_at = now(), last_updated_by = auth.uid()
//   - Creates audit_log entry for QC updates
//   - If flagged_for_xray = true, sets xray_flagged_by = auth.uid(), xray_flagged_date = now()
// Invalidates: ['field-weld-inspections', id], ['projects', projectId, 'field-weld-inspections']
```

#### useFlagWeldForXRay()
```typescript
function useFlagWeldForXRay(): UseMutationResult<FieldWeldInspection, Error, {
  id: string;
}>

// Permission Check: Requires can_update_milestones (QC inspector)
// Sets: flagged_for_xray = true, xray_flagged_by = auth.uid(), xray_flagged_date = now()
// Invalidates: ['field-weld-inspections', id], ['projects', projectId, 'field-weld-inspections']
```

#### useCreateWeldRepair()
```typescript
function useCreateWeldRepair(): UseMutationResult<FieldWeldInspection, Error, {
  parent_weld_id: string;
  welder_id: string;
  date_welded: string; // ISO 8601 date
  comments?: string;
}>

// Workflow: Create repair weld (FR-056)
// Logic:
//   1. Fetch parent weld's weld_id_number (e.g., 42.0)
//   2. Calculate next repair sequence (e.g., 42.1, 42.2)
//   3. Create new row with parent_weld_id, increment weld_id_number decimally
// Validation: parent_weld_id must exist
// Invalidates: ['field-weld-inspections', parent_weld_id, 'repair-history'], ['projects', projectId, 'field-weld-inspections']
```

---

## 9. useNeedsReview Hook

**File**: `src/hooks/useNeedsReview.ts`

**Purpose**: Exception queue management.

### Queries

#### useNeedsReview(projectId, filters?)
```typescript
function useNeedsReview(projectId: string, filters?: {
  status?: 'pending' | 'resolved' | 'ignored';
  type?: 'out_of_sequence' | 'rollback' | 'delta_quantity' | 'drawing_change' | 'similar_drawing' | 'verify_welder';
}): UseQueryResult<NeedsReviewItem[], Error>

// Query Key: ['projects', projectId, 'needs-review', filters]
// Default: status = 'pending' (show review queue)
```

### Mutations

#### useResolveNeedsReview()
```typescript
function useResolveNeedsReview(): UseMutationResult<NeedsReviewItem, Error, {
  id: string;
  status: 'resolved' | 'ignored';
  resolution_note?: string;
}>

// Permission Check: Requires can_resolve_reviews (FR-026, FR-047)
// Sets: resolved_at = now(), resolved_by = auth.uid()
// Side Effect: Creates audit_log entry (FR-030)
```

---

## 10. useAuditLog Hook

**File**: `src/hooks/useAuditLog.ts`

**Purpose**: Audit trail queries (read-only).

### Queries

#### useAuditLog(projectId, filters?)
```typescript
function useAuditLog(projectId: string, filters?: {
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  action_type?: string;
  limit?: number; // default 100
  offset?: number; // default 0
}): UseQueryResult<AuditLogEntry[], Error>

// Query Key: ['projects', projectId, 'audit-log', filters]
// RLS: Filtered by project.organization_id
// Retention: Indefinite while project active (FR-032)
```

---

## 11. useRefreshDashboards Hook (Utility)

**File**: `src/hooks/useRefreshDashboards.ts`

**Purpose**: Manually refresh materialized views after bulk operations (FR-036).

```typescript
function useRefreshDashboards(): UseMutationResult<void, Error, void>

// Calls: Supabase RPC 'refresh_materialized_views'
// Refreshes: mv_package_readiness, mv_drawing_progress
// Use Case: After bulk import, call refetch() to update dashboards immediately
```

---

## Hook Testing Strategy

All hooks MUST have contract tests in `tests/contract/hooks-api.test.ts`:

### Test Template
```typescript
describe('useComponents', () => {
  it('exports query hook with correct signature', () => {
    expect(typeof useComponents).toBe('function');
    // Validate return type includes: data, error, isLoading, refetch
  });

  it('uses correct query key format', () => {
    const { result } = renderHook(() => useComponents('project-123'));
    expect(result.current.queryKey).toEqual(['projects', 'project-123', 'components', {}]);
  });

  it('enforces RLS filtering (integration test)', async () => {
    // Create components in Org A and Org B
    // Authenticate as Org A user
    // Verify only Org A components returned
  });
});

describe('useUpdateComponentMilestones', () => {
  it('enforces can_update_milestones permission', async () => {
    // Authenticate as viewer (no can_update_milestones)
    // Attempt milestone update
    // Expect RLS policy to block update (403 error)
  });

  it('triggers calculate_component_percent on update', async () => {
    // Update current_milestones to {"Receive": true, "Erect": true}
    // Verify percent_complete auto-updated to 45.00 (5% + 40%)
  });
});
```

---

## Query Key Hierarchy

```
projects
├── [project-id]
│   ├── drawings
│   │   ├── [filters]
│   │   └── similar-drawings
│   │       └── [drawing-norm, threshold]
│   ├── components
│   │   └── [filters]
│   ├── areas
│   ├── systems
│   ├── test-packages
│   │   └── [package-id]
│   │       └── readiness
│   ├── welders
│   │   └── [filters]
│   ├── field-weld-inspections
│   │   └── [filters]
│   ├── needs-review
│   │   └── [filters]
│   └── audit-log
│       └── [filters]
└── [filters]

components
└── [component-id]

drawings
└── [drawing-id]

test-packages
└── [package-id]
    └── readiness

welders
└── [welder-id]

field-weld-inspections
├── [inspection-id]
└── [parent-weld-id]
    └── repair-history
```

---

## Error Handling Patterns

All hooks follow consistent error handling:

```typescript
// Query error (e.g., RLS blocks access)
const { data, error, isLoading } = useComponents('project-id');
if (error) {
  // Error object includes:
  // - error.message: "Failed to fetch components"
  // - error.code: "PGRST116" (Supabase RLS denial)
  // - error.details: Additional context
}

// Mutation error (e.g., validation failure)
const { mutate, error } = useCreateComponent();
mutate({ ... }, {
  onError: (error) => {
    // Handle specific errors:
    if (error.message.includes('chk_identity_key_structure')) {
      toast.error('Invalid identity key structure for component type');
    }
  }
});
```

---

## Performance Optimizations

1. **Query Deduplication**: TanStack Query automatically deduplicates identical queries
2. **Stale-While-Revalidate**: Cached data served immediately, background refetch updates
3. **Optimistic Updates**: UI updates before server confirms (rollback on error)
4. **Materialized Views**: Dashboard queries (<50ms via mv_package_readiness, mv_drawing_progress)
5. **Selective Invalidation**: Only invalidate affected query keys (not entire cache)

---

## Next Steps

1. Generate contract tests in `tests/contract/hooks-api.test.ts`
2. Implement hooks following contracts (tests must fail first per TDD)
3. Validate query performance meets targets (p90 <100ms, p95 <50ms for materialized views)
