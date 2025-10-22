# Contract: Package Components Query

**Feature**: 012-test-package-readiness
**Entity**: `usePackageComponents` hook / Supabase query
**Type**: Data Query

## Query Signature

```typescript
// Hook interface
function usePackageComponents(packageId: string, projectId: string): UseQueryResult<PackageComponent[]>

// Underlying Supabase queries (two-query approach to avoid PostgREST join filter limitation)
// Query 1: Direct assignments
const directQuery = supabase
  .from('components')
  .select(`...fields...`)
  .eq('test_package_id', packageId)
  .eq('project_id', projectId)
  .eq('is_retired', false);

// Query 2: Inherited assignments (filter client-side by drawing.test_package_id)
const inheritedQuery = supabase
  .from('components')
  .select(`...fields...`)
  .is('test_package_id', null)
  .eq('project_id', projectId)
  .eq('is_retired', false);

// Combine results after filtering inherited components
```

## Response Contract

```typescript
interface PackageComponent {
  id: string;
  drawing_id: string | null;
  drawing_no_norm: string | null;
  drawing_test_package_id: string | null; // For inheritance detection
  component_type: ComponentType;
  identity_key: IdentityKey;
  identityDisplay: string; // Computed via formatIdentityKey
  test_package_id: string | null;
  percent_complete: number;
  current_milestones: Record<string, boolean | number>;
  progress_template_id: string;
  milestones_config: MilestoneConfig[];
}
```

## Behavioral Contracts

### BC-QUERY-001: Direct Assignment Included
**Given**: Component has `test_package_id = PKG-A`
**When**: Query components for `PKG-A`
**Then**: Component included in results

### BC-QUERY-002: Inherited Assignment Included
**Given**:
- Component has `test_package_id = NULL` AND `drawing_id = DWG-1`
- Drawing `DWG-1` has `test_package_id = PKG-A`
**When**: Query components for `PKG-A`
**Then**: Component included in results

### BC-QUERY-003: Override Excluded from Original Package
**Given**:
- Component has `test_package_id = PKG-B` AND `drawing_id = DWG-1`
- Drawing `DWG-1` has `test_package_id = PKG-A`
**When**: Query components for `PKG-A`
**Then**: Component NOT included in results

### BC-QUERY-004: Override Included in Target Package
**Given**:
- Component has `test_package_id = PKG-B` AND `drawing_id = DWG-1`
- Drawing `DWG-1` has `test_package_id = PKG-A`
**When**: Query components for `PKG-B`
**Then**: Component included in results

### BC-QUERY-005: Retired Components Excluded
**Given**: Component has `is_retired = true` AND `test_package_id = PKG-A`
**When**: Query components for `PKG-A`
**Then**: Component NOT included in results

### BC-QUERY-006: Drawing Information Joined
**Given**: Component with `drawing_id = DWG-1`
**When**: Query components
**Then**: Result includes `drawing_no_norm` from joined drawings table

### BC-QUERY-007: Progress Template Joined
**Given**: Component with `progress_template_id = TPL-1`
**When**: Query components
**Then**: Result includes `milestones_config` from joined progress_templates table

### BC-QUERY-008: Identity Display Formatted
**Given**: Component with `identity_key = {commodity_code: "VBALU-001", size: "2", seq: 1}`
**When**: Query components (client-side formatting)
**Then**: `identityDisplay = "VBALU-001 2\" (1)"`

### BC-QUERY-009: Empty Package Handling
**Given**: Package has NO components (directly or inherited)
**When**: Query components for package
**Then**: Returns empty array `[]`

### BC-QUERY-010: Project Isolation (RLS)
**Given**: User belongs to Organization A (Project P1)
**When**: Query components for package in Project P2 (Organization B)
**Then**: Returns empty array (RLS filters by project_id → organization_id)

## Performance Contracts

### PC-QUERY-001: Query Latency
**Given**: Package with 200 components
**When**: Execute query
**Then**: Query completes in <500ms (p95)

### PC-QUERY-002: Join Performance
**Given**: Database with 10,000 components, 5,000 drawings
**When**: Query single package (200 components)
**Then**: Query plan uses indexes (idx_components_package_id, idx_drawings_id)

### PC-QUERY-003: Caching
**Given**: usePackageComponents hook configured with TanStack Query
**When**: Query same package twice within 2 minutes
**Then**: Second query returns cached data (no network call)

## Hook Behavior Contracts

### HC-001: Loading State
**Given**: Hook called for first time
**When**: Data fetching in progress
**Then**: Returns `{ isLoading: true, data: undefined }`

### HC-002: Success State
**Given**: Query successful
**When**: Data fetched
**Then**: Returns `{ isLoading: false, data: PackageComponent[], error: null }`

### HC-003: Error State
**Given**: Query fails (network error or RLS rejection)
**When**: Error occurs
**Then**: Returns `{ isLoading: false, data: undefined, error: Error }`

### HC-004: Stale Time Respecting
**Given**: Hook configured with staleTime: 2 minutes
**When**: Data fetched, then re-queried 30 seconds later
**Then**: Returns cached data without refetch

### HC-005: Invalidation on Milestone Update
**Given**: Component milestone updated via useUpdateMilestone
**When**: Mutation succeeds
**Then**: usePackageComponents query invalidated and refetches

## Test Implementation

**Test File**: `tests/contract/package-components-query.contract.test.ts`

**Test Cases**:
1. ✅ BC-QUERY-001: Direct assignment included
2. ✅ BC-QUERY-002: Inherited assignment included
3. ✅ BC-QUERY-003: Override excluded from original
4. ✅ BC-QUERY-004: Override included in target
5. ✅ BC-QUERY-005: Retired excluded
6. ✅ BC-QUERY-006: Drawing info joined
7. ✅ BC-QUERY-007: Progress template joined
8. ✅ BC-QUERY-008: Identity display formatted
9. ✅ BC-QUERY-009: Empty package handled
10. ✅ BC-QUERY-010: Project isolation enforced
11. ✅ HC-001: Loading state
12. ✅ HC-002: Success state
13. ✅ HC-003: Error state
14. ✅ HC-004: Stale time respected
15. ✅ HC-005: Invalidation triggered

**Tests must FAIL before usePackageComponents hook is implemented**.
