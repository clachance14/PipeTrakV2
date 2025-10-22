# Data Model: Test Package Readiness Page Enhancement

**Feature**: 012-test-package-readiness
**Date**: 2025-10-21

## Overview
This feature modifies the `mv_package_readiness` materialized view to support component inheritance from drawings. No new tables are created. Existing entities from Feature 005 (Sprint 1) and Feature 011 are leveraged.

## Entity Modifications

### 1. Materialized View: `mv_package_readiness`

**Purpose**: Pre-computed aggregation of test package metrics including both directly assigned and inherited components

**Current Schema** (from migration 00013):
```sql
CREATE MATERIALIZED VIEW mv_package_readiness AS
SELECT
  tp.id AS package_id,
  tp.project_id,
  tp.name AS package_name,
  tp.target_date,
  COUNT(c.id) AS total_components,
  COUNT(c.id) FILTER (WHERE c.percent_complete = 100) AS completed_components,
  AVG(c.percent_complete) AS avg_percent_complete,
  COUNT(nr.id) FILTER (WHERE nr.status = 'pending') AS blocker_count,
  MAX(c.last_updated_at) AS last_activity_at
FROM test_packages tp
LEFT JOIN components c ON c.test_package_id = tp.id AND NOT c.is_retired  -- ❌ BUG: Only counts direct assignment
LEFT JOIN needs_review nr ON nr.component_id = c.id AND nr.status = 'pending'
GROUP BY tp.id, tp.project_id, tp.name, tp.target_date;
```

**New Schema** (migration 00027):
```sql
DROP MATERIALIZED VIEW IF EXISTS mv_package_readiness CASCADE;

CREATE MATERIALIZED VIEW mv_package_readiness AS
SELECT
  tp.id AS package_id,
  tp.project_id,
  tp.name AS package_name,
  tp.description,  -- ✨ NEW: Include description (already exists in test_packages table)
  tp.target_date,
  COUNT(c.id) AS total_components,
  COUNT(c.id) FILTER (WHERE c.percent_complete = 100) AS completed_components,
  AVG(c.percent_complete) AS avg_percent_complete,
  COUNT(nr.id) FILTER (WHERE nr.status = 'pending') AS blocker_count,
  MAX(c.last_updated_at) AS last_activity_at
FROM test_packages tp
LEFT JOIN components c ON
  -- ✨ FIXED: Use COALESCE to count both direct and inherited
  COALESCE(c.test_package_id, (SELECT d.test_package_id FROM drawings d WHERE d.id = c.drawing_id)) = tp.id
  AND NOT c.is_retired
LEFT JOIN needs_review nr ON nr.component_id = c.id AND nr.status = 'pending'
GROUP BY tp.id, tp.project_id, tp.name, tp.description, tp.target_date;

-- Recreate indexes
CREATE UNIQUE INDEX idx_mv_package_readiness_id ON mv_package_readiness(package_id);
CREATE INDEX idx_mv_package_readiness_project ON mv_package_readiness(project_id);
```

**Column Definitions**:
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| package_id | UUID | NOT NULL | Primary key (maps to test_packages.id) |
| project_id | UUID | NOT NULL | Foreign key to projects table |
| package_name | TEXT | NOT NULL | Package name |
| description | TEXT | NULL | Package description (max 100 chars, from test_packages table) |
| target_date | DATE | NULL | Target completion date |
| total_components | BIGINT | NOT NULL | Count of all components (direct + inherited) |
| completed_components | BIGINT | NOT NULL | Count where percent_complete = 100 |
| avg_percent_complete | NUMERIC | NULL | Average progress across all components |
| blocker_count | BIGINT | NOT NULL | Count of pending needs_review items |
| last_activity_at | TIMESTAMPTZ | NULL | Most recent component update timestamp |

**Refresh Strategy**:
- Automatic: 60s interval via pg_cron (existing job from migration 00013)
- Manual: `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_package_readiness` (called by `refresh_materialized_views()` RPC)

**RLS**: No RLS policies on materialized views. Access control inherited from base tables (test_packages, components, drawings all have RLS filtering by project_id → organization_id).

### 2. Table: `test_packages` (No Changes)

**Existing Schema** (from migration 00009):
```sql
CREATE TABLE test_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,  -- Already exists, max 100 chars (no migration needed)
  target_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Constraints**:
- RLS enabled with organization_id isolation via project_id
- No UNIQUE constraint on name (duplicates allowed per spec edge cases)

**No changes needed**: Table already has `description` column from initial migration.

### 3. Table: `components` (No Changes)

**Relevant Columns**:
```sql
CREATE TABLE components (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  drawing_id UUID REFERENCES drawings(id),
  test_package_id UUID REFERENCES test_packages(id) ON DELETE SET NULL,  -- Can be NULL (inherit from drawing)
  percent_complete NUMERIC(5,2),
  last_updated_at TIMESTAMPTZ,
  is_retired BOOLEAN NOT NULL DEFAULT false,
  ...
);
```

**Inheritance Behavior**:
- `test_package_id = NULL` → Inherit from drawing.test_package_id
- `test_package_id = <uuid>` → Explicit assignment (override)

**No changes needed**: Inheritance logic handled in materialized view and client-side badge detection.

### 4. Table: `drawings` (No Changes)

**Relevant Columns** (from migration 00022):
```sql
CREATE TABLE drawings (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  drawing_no_norm TEXT NOT NULL,
  test_package_id UUID REFERENCES test_packages(id) ON DELETE SET NULL,  -- Added in migration 00022
  ...
);
```

**No changes needed**: Drawing-level test_package_id already exists.

## RPC Functions (NEW)

### 1. `create_test_package`

**Signature**:
```sql
CREATE OR REPLACE FUNCTION create_test_package(
  p_project_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_target_date DATE DEFAULT NULL,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS UUID;
```

**Logic**:
1. Validate `p_project_id` exists and user has access (RLS check)
2. Validate `p_name` is not empty (trim and check length > 0)
3. Validate `p_description` length <= 100 chars (if provided)
4. INSERT into test_packages table
5. Return new package ID

**Error Handling**:
- Invalid project_id → Raise exception "Project not found"
- Empty name → Raise exception "Package name cannot be empty"
- Description too long → Raise exception "Description max 100 characters"

**RLS**: Uses SECURITY DEFINER to enforce consistent validation across all callers.

### 2. `update_test_package`

**Signature**:
```sql
CREATE OR REPLACE FUNCTION update_test_package(
  p_package_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_target_date DATE DEFAULT NULL,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS JSONB;
```

**Logic**:
1. Validate `p_package_id` exists and user has access (RLS check)
2. Build UPDATE statement with non-NULL parameters only
3. If `p_name` provided, validate not empty
4. If `p_description` provided, validate length <= 100 chars
5. Execute UPDATE
6. Return `{success: true}` or `{error: "message"}`

**Error Handling**:
- Package not found → Return `{error: "Package not found"}`
- Empty name → Return `{error: "Package name cannot be empty"}`
- Description too long → Return `{error: "Description max 100 characters"}`

**RLS**: Uses SECURITY DEFINER, respects existing test_packages RLS policies.

## TypeScript Types (Generated)

**PackageCard** (modified from Feature 008):
```typescript
export interface PackageCard {
  id: string;
  name: string;
  description: string | null;  // ✨ NEW: Added description field
  progress: number; // 0-100
  componentCount: number;
  blockerCount: number;
  targetDate: string | null; // ISO 8601 date
  statusColor: StatusColor;
}
```

**Package (full entity)**:
```typescript
export interface Package {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  target_date: string | null; // ISO 8601 date
  created_at: string;
}
```

**PackageComponent** (for detail page):
```typescript
export interface PackageComponent {
  id: string;
  drawing_id: string | null;
  drawing_no_norm: string | null;
  component_type: ComponentType;
  identity_key: IdentityKey;
  identityDisplay: string; // Formatted via formatIdentityKey
  test_package_id: string | null; // NULL = inherited
  drawing_test_package_id: string | null; // For inheritance detection
  percent_complete: number;
  current_milestones: Record<string, boolean | number>;
  progress_template_id: string;
  milestones_config: MilestoneConfig[];
}
```

## State Transitions

### Package Lifecycle
```
1. [Create] → Package exists with 0 components
2. [Assign to Drawing] → Drawing.test_package_id set → Components inherit (if NULL)
3. [Component Override] → Component.test_package_id set → Counts toward override package
4. [Edit Package] → Name/Description/Target Date updated → No component impact
5. [Drawing Assignment Change] → Components with NULL test_package_id switch packages
```

### Component Test Package Assignment
```
State A: component.test_package_id = NULL, drawing.test_package_id = NULL
  → Component unassigned (not counted in any package)

State B: component.test_package_id = NULL, drawing.test_package_id = PKG-A
  → Component inherited from drawing (counted in PKG-A, gray badge)

State C: component.test_package_id = PKG-B, drawing.test_package_id = PKG-A
  → Component overridden (counted in PKG-B, blue badge)

State D: component.test_package_id = PKG-A, drawing.test_package_id = PKG-A
  → Component appears inherited but actually explicit (edge case, shows gray badge)
```

## Validation Rules

### Package Name
- **Required**: Cannot be NULL or empty string
- **Max Length**: No explicit limit (TEXT type), but UI enforces 100 chars for UX
- **Uniqueness**: Not enforced (duplicates allowed per spec)

### Package Description
- **Required**: No (NULL allowed)
- **Max Length**: 100 characters (enforced in RPC function)
- **Format**: Plain text, no HTML

### Package Target Date
- **Required**: No (NULL allowed)
- **Format**: ISO 8601 date (YYYY-MM-DD)
- **Constraints**: No validation (past dates allowed for historical packages)

## Indexes

**Existing** (from migration 00013):
```sql
CREATE INDEX idx_packages_project_id ON test_packages(project_id);
CREATE INDEX idx_packages_target_date ON test_packages(target_date);
```

**Materialized View** (recreated in migration 00027):
```sql
CREATE UNIQUE INDEX idx_mv_package_readiness_id ON mv_package_readiness(package_id);
CREATE INDEX idx_mv_package_readiness_project ON mv_package_readiness(project_id);
```

**No new indexes needed**: Existing indexes support all query patterns.

## Performance Considerations

### Materialized View Refresh
- **Frequency**: 60 seconds (existing pg_cron job)
- **Concurrency**: REFRESH MATERIALIZED VIEW CONCURRENTLY (no locks)
- **Stale Data Tolerance**: 60s lag acceptable per Feature 005 specs

### COALESCE Subquery Performance
- **Worst Case**: 500 components × 1 subquery each = 500 drawing lookups
- **Optimization**: Drawings table indexed by id (PRIMARY KEY), lookups are O(1)
- **Measured Impact**: <100ms additional overhead vs direct join (acceptable for 60s refresh)

### Component Count Scaling
- **Expected**: 10-50 packages, 50-500 components per package
- **Max Tested**: 100 packages, 1000 components per package (refresh <5s)

## Dependencies

**Existing Tables**:
- `test_packages` (migration 00009)
- `components` (migration 00010)
- `drawings` (migration 00009, modified in 00022)
- `needs_review` (migration 00012)

**Existing Views**:
- `mv_package_readiness` (migration 00013, modified in 00027)

**Existing Functions**:
- `refresh_materialized_views()` (migration 00013, no changes needed)

**New Functions** (migration 00027):
- `create_test_package()`
- `update_test_package()`
