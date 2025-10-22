# Contract: Materialized View Package Readiness

**Feature**: 012-test-package-readiness
**Entity**: `mv_package_readiness`
**Type**: Database View

## View Signature

```sql
SELECT * FROM mv_package_readiness
WHERE project_id = <uuid>;
```

**Returns**:
```typescript
interface PackageReadinessRow {
  package_id: string;
  project_id: string;
  package_name: string;
  description: string | null;
  target_date: string | null; // ISO 8601 date
  total_components: number;
  completed_components: number;
  avg_percent_complete: number | null;
  blocker_count: number;
  last_activity_at: string | null; // ISO 8601 timestamp
}
```

## Behavioral Contracts

### BC-001: Count Components with Direct Assignment
**Given**: Component has `test_package_id = PKG-A` (explicit assignment)
**When**: Query `mv_package_readiness` for `PKG-A`
**Then**: Component counted in `total_components`

### BC-002: Count Components with Inherited Assignment
**Given**:
- Component has `test_package_id = NULL` AND `drawing_id = DWG-1`
- Drawing `DWG-1` has `test_package_id = PKG-A`
**When**: Query `mv_package_readiness` for `PKG-A`
**Then**: Component counted in `total_components`

### BC-003: Override Beats Inheritance
**Given**:
- Component has `test_package_id = PKG-B` AND `drawing_id = DWG-1`
- Drawing `DWG-1` has `test_package_id = PKG-A`
**When**: Query `mv_package_readiness` for both packages
**Then**:
- PKG-A: Component NOT counted
- PKG-B: Component counted

### BC-004: Exclude Retired Components
**Given**: Component has `is_retired = true`
**When**: Query `mv_package_readiness`
**Then**: Component NOT counted regardless of test_package_id

### BC-005: NULL Inheritance When Drawing Has No Package
**Given**:
- Component has `test_package_id = NULL` AND `drawing_id = DWG-1`
- Drawing `DWG-1` has `test_package_id = NULL`
**When**: Query `mv_package_readiness`
**Then**: Component NOT counted in any package

### BC-006: Completed Component Filtering
**Given**: Component has `percent_complete = 100`
**When**: Query `mv_package_readiness`
**Then**: Component counted in `completed_components`

### BC-007: Blocker Count Aggregation
**Given**: Component has 2 needs_review items with `status = 'pending'`
**When**: Query `mv_package_readiness`
**Then**: `blocker_count = 2` for that package

### BC-008: Empty Package Handling
**Given**: Package has NO components assigned (directly or inherited)
**When**: Query `mv_package_readiness`
**Then**: Row exists with `total_components = 0`, `avg_percent_complete = NULL`

### BC-009: Description Field Inclusion
**Given**: Package has `description = "Test package for P-series"`
**When**: Query `mv_package_readiness`
**Then**: Row includes `description` column with correct value

### BC-010: Last Activity Timestamp
**Given**: Package has 3 components with `last_updated_at` of T1, T2, T3
**When**: Query `mv_package_readiness`
**Then**: `last_activity_at = MAX(T1, T2, T3)`

## Performance Contracts

### PC-001: Query Latency
**Given**: Database with 50 packages, 500 components per package
**When**: SELECT from `mv_package_readiness` for single project
**Then**: Query completes in <50ms (p95)

### PC-002: Refresh Performance
**Given**: Database with 100 packages, 1000 components per package
**When**: `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_package_readiness`
**Then**: Refresh completes in <5s

### PC-003: Concurrent Access
**Given**: 10 users querying `mv_package_readiness` simultaneously
**When**: Materialized view refresh runs
**Then**: Queries continue to return (stale) data without blocking

## RLS Contracts

### RLS-001: Project Isolation
**Given**: User belongs to Organization A (Project P1)
**When**: Query `mv_package_readiness`
**Then**: Only packages from Project P1 returned (no rows from other organizations)

### RLS-002: Cross-Tenant Protection
**Given**: Malicious user attempts `WHERE project_id = <other-org-project>`
**When**: Query `mv_package_readiness`
**Then**: No rows returned (RLS policies enforce organization_id isolation via projects table)

## Test Implementation

**Test File**: `tests/contract/materialized-view-inheritance.contract.test.ts`

**Test Cases**:
1. ✅ BC-001: Direct assignment counted
2. ✅ BC-002: Inherited assignment counted
3. ✅ BC-003: Override assignment counted in correct package
4. ✅ BC-004: Retired components excluded
5. ✅ BC-005: NULL inheritance handled
6. ✅ BC-006: Completed components filtered
7. ✅ BC-007: Blocker count aggregated
8. ✅ BC-008: Empty packages return 0 components
9. ✅ BC-009: Description field included
10. ✅ BC-010: Last activity timestamp correct
11. ✅ RLS-001: Project isolation enforced

**Test must FAIL before migration 00027 is applied** (existing view uses direct join only).
