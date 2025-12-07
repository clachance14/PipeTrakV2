# Research: Manhour Earned Value Tracking

**Feature**: 032-manhour-earned-value
**Date**: 2025-12-04

## Research Tasks

### 1. Weight Calculation Formula

**Question**: What formula should be used to calculate component weights from SIZE field?

**Decision**: Use non-linear scaling with diameter^1.5

**Rationale**:
- Linear scaling (diameter × 1) underestimates larger pipe work
- Pipe cross-sectional area scales as diameter^2, but welding complexity scales more slowly
- Industry standard uses approximately diameter^1.5 for estimating welding manhours
- A 4" pipe takes roughly 2.8x the effort of a 2" pipe (4^1.5 / 2^1.5 = 8/2.83 = 2.83)

**Alternatives Considered**:
1. **Linear (diameter × 1)**: Rejected - too simple, underestimates large pipe
2. **Quadratic (diameter^2)**: Rejected - overestimates large pipe work
3. **Lookup table**: Rejected - adds complexity without proportional accuracy benefit

**Formula**:
```
weight = POWER(diameter, 1.5)

For reducers (e.g., "2X4"):
  weight = (POWER(larger_diameter, 1.5) + POWER(smaller_diameter, 1.5)) / 2

For components without size:
  weight = 1.0 (fixed fallback)

For threaded pipe:
  weight = POWER(diameter, 1.5) * linear_feet * 0.1
```

### 2. SIZE Field Parsing

**Question**: How is SIZE stored in identity_key and how should it be parsed?

**Decision**: Parse SIZE from identity_key using existing normalization patterns

**Rationale**:
- Identity key structure is well-documented in `generate-identity-key.ts`
- SIZE appears as second field in identity key (e.g., "P001-2-VBALU-001")
- Existing `normalizeSize()` function handles common formats

**Existing Patterns** (from codebase):
```typescript
// src/lib/csv/generate-identity-key.ts
// Format: {DRAWING_NORM}-{SIZE}-{CMDTY_CODE}-{###}

// src/lib/identity-sort.ts
// getSortableIdentity() parses identity_key components
```

**SIZE Formats to Handle**:
| Input | Parsed Diameter |
|-------|-----------------|
| "2" | 2.0 |
| "4" | 4.0 |
| "1/2" | 0.5 |
| "1/4" | 0.25 |
| "3/4" | 0.75 |
| "2X4" | (2 + 4) / 2 = 3.0 (reducer average) |
| "1X2" | (1 + 2) / 2 = 1.5 (reducer average) |
| "HALF" | 0.5 (normalized) |
| "NOSIZE" | null → fixed weight |
| "" | null → fixed weight |

### 3. Integration with Milestone Updates

**Question**: Where should earned value calculations be triggered?

**Decision**: Extend existing `update_component_milestone()` RPC

**Rationale**:
- Single integration point ensures atomic updates
- Existing RPC already handles milestone state, audit trail, and view refresh
- Adding earned value calculation maintains transactional consistency
- No additional triggers needed

**Integration Point** (Migration 00018):
```sql
CREATE OR REPLACE FUNCTION update_component_milestone(...)
RETURNS JSONB AS $$
BEGIN
  -- Existing logic: update milestone, calculate percent_complete

  -- NEW: Calculate earned manhours if budget exists
  IF EXISTS (
    SELECT 1 FROM project_manhour_budgets
    WHERE project_id = p_project_id AND is_active = true
  ) THEN
    PERFORM calculate_component_earned_manhours(p_component_id);
  END IF;

  -- Existing logic: create audit record, refresh views
END;
$$;
```

**Alternatives Considered**:
1. **Database trigger**: Rejected - triggers on JSONB changes are complex and error-prone
2. **Frontend calculation**: Rejected - violates single source of truth, RLS bypass risk
3. **Separate endpoint**: Rejected - introduces race conditions, extra network calls

### 4. Aggregation Strategy

**Question**: Should manhour aggregations use materialized views or regular views?

**Decision**: Use regular SQL views (not materialized)

**Rationale**:
- Manhour data changes with every milestone update (high write frequency)
- Aggregations are read on demand (reports page, dashboard widget)
- Regular views ensure data is always current
- Existing progress views (`vw_progress_by_area`, etc.) use same pattern successfully

**View Pattern**:
```sql
CREATE VIEW vw_manhour_by_area AS
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.project_id,
  COUNT(cm.component_id) AS component_count,
  COALESCE(SUM(cm.budgeted_manhours), 0) AS budgeted_mh,
  COALESCE(SUM(cm.earned_manhours), 0) AS earned_mh,
  COALESCE(SUM(cm.budgeted_manhours), 0) - COALESCE(SUM(cm.earned_manhours), 0) AS remaining_mh,
  CASE
    WHEN COALESCE(SUM(cm.budgeted_manhours), 0) = 0 THEN 0
    ELSE ROUND(COALESCE(SUM(cm.earned_manhours), 0) / SUM(cm.budgeted_manhours) * 100, 2)
  END AS percent_complete
FROM areas a
LEFT JOIN components c ON c.area_id = a.id AND NOT c.is_retired
LEFT JOIN component_manhours cm ON cm.component_id = c.id
GROUP BY a.id, a.name, a.project_id;
```

**Alternatives Considered**:
1. **Materialized views with refresh**: Rejected - stale data between refreshes, refresh overhead on every milestone change
2. **Application-level aggregation**: Rejected - multiple queries, N+1 risk, inconsistent results
3. **Denormalized totals in budget table**: Rejected - update anomalies, complex sync logic

### 5. Permission Model

**Question**: How should manhour data access be controlled?

**Decision**: Dual enforcement via RLS and frontend visibility

**Rationale**:
- RLS provides database-level security (cannot be bypassed by malicious clients)
- Frontend visibility provides UX optimization (no error states for unauthorized users)
- Follows existing pattern used for project settings access

**RLS Policy**:
```sql
-- component_manhours: viewable by project members with financial roles
CREATE POLICY "manhour_select" ON component_manhours
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM project_users pu
    WHERE pu.project_id = component_manhours.project_id
    AND pu.user_id = auth.uid()
    AND pu.role IN ('owner', 'admin', 'project_manager')
  )
);
```

**Frontend Pattern**:
```typescript
// src/hooks/usePermissions.ts (existing)
const { canViewFinancials } = usePermissions();

// In component:
{canViewFinancials && <ManhourSummaryWidget />}
```

**Alternatives Considered**:
1. **RLS only**: Rejected - causes errors/empty states for unauthorized users
2. **Frontend only**: Rejected - security bypass risk via direct API calls
3. **Separate API layer**: Rejected - adds complexity, duplicates existing patterns

### 6. Bucket Allocation Model

**Question**: How should manhours be allocated to buckets (Area, System, etc.)?

**Decision**: Bottom-up aggregation by default, with optional manual overrides

**Rationale**:
- Automatic bucket totals eliminate manual data entry errors
- Manual overrides support fixed budgets per area/system from contracts
- Redistribution scope prevents unintended changes to other buckets

**Behavior**:
1. **Default (auto-calculated)**: Bucket total = sum of component weights in bucket × (total budget / total project weight)
2. **Manual override**: User sets bucket total directly; components within bucket redistributed proportionally
3. **Redistribution scope**: When adjusting component weight, user selects scope (Area, System, etc.); only that bucket is affected

**Data Model**:
```sql
CREATE TABLE manhour_buckets (
  id UUID PRIMARY KEY,
  budget_id UUID REFERENCES project_manhour_budgets(id),
  dimension TEXT CHECK (dimension IN ('area', 'system', 'test_package', 'component_type')),
  dimension_value TEXT, -- e.g., area name, system name
  allocated_manhours NUMERIC(12,2),
  is_manual_override BOOLEAN DEFAULT FALSE,
  ...
);
```

### 7. Threaded Pipe Special Handling

**Question**: How should threaded pipe weight calculations differ from standard components?

**Decision**: Factor in linear footage using formula: diameter^1.5 × linear_feet × 0.1

**Rationale**:
- Threaded pipe work scales with length (unlike welded fittings)
- `linear_feet` field exists in identity_key for threaded pipe components
- 0.1 multiplier normalizes threaded pipe weights relative to welded components

**Implementation**:
```sql
CASE
  WHEN c.component_type = 'threaded_pipe'
    AND (c.identity_key->>'linear_feet') IS NOT NULL
  THEN POWER(parsed_diameter, 1.5) * (c.identity_key->>'linear_feet')::NUMERIC * 0.1
  ELSE POWER(parsed_diameter, 1.5)
END AS weight
```

### 8. Earned Value Calculation

**Question**: How should earned manhours be calculated from milestone progress?

**Decision**: Use existing milestone weights from progress_templates

**Rationale**:
- Milestone weights already sum to 100% (validated by `validate_milestone_weights()`)
- Weights represent proportion of work - directly applicable to manhours
- Existing `calculate_earned_milestone_value()` function provides pattern

**Formula**:
```
earned_manhours = budgeted_manhours × (earned_percentage / 100)

where earned_percentage = SUM(
  FOR EACH milestone:
    IF discrete: weight × (value = 1 ? 1 : 0)
    IF partial: weight × (value / 100)
)
```

**Example**:
- Component: 10 budgeted MH
- Milestones: Receive (10%), Fabricate (16%), Weld Made (60%), Tested (14%)
- Current state: Receive=true, Fabricate=50%, Weld Made=false, Tested=false
- Earned = 10 × ((10 × 1) + (16 × 0.5) + (60 × 0) + (14 × 0)) / 100
- Earned = 10 × (10 + 8 + 0 + 0) / 100 = 10 × 0.18 = 1.8 MH

---

## Performance Considerations

### Budget Distribution (5,000 components target: <30s)

**Strategy**: Single-transaction batch INSERT
```sql
INSERT INTO component_manhours (component_id, project_id, budgeted_manhours, weight_value, ...)
SELECT
  c.id,
  c.project_id,
  (calculated_weight / total_weight) * p_total_budget,
  calculated_weight,
  ...
FROM components c
WHERE c.project_id = p_project_id AND NOT c.is_retired;
```

**Indexes**:
```sql
CREATE INDEX idx_component_manhours_project ON component_manhours(project_id);
CREATE INDEX idx_component_manhours_component ON component_manhours(component_id);
```

### Aggregation Views

**Strategy**: Leverage existing indexes on components table
- `idx_components_area` on (project_id, area_id)
- `idx_components_system` on (project_id, system_id)
- `idx_components_test_package` on (project_id, test_package_id)

**Query Plan Target**: Index scans for aggregation, no sequential scans

### Dashboard Query

**Strategy**: Single query with TanStack Query caching
```typescript
useQuery({
  queryKey: ['projects', projectId, 'manhour-summary'],
  queryFn: fetchManhourSummary,
  staleTime: 60_000, // 1 minute
});
```

---

## Backward Compatibility

### No Breaking Changes
- New tables do not modify existing schema
- Existing `update_component_milestone()` RPC extended (signature unchanged)
- Components without budgets continue to work (graceful skip)

### Migration Rollback
- All migrations can be rolled back via `DROP TABLE` / `DROP VIEW` / `DROP FUNCTION`
- No data migrations required for existing data
- New components added after budget → no manhour allocation (documented behavior)

---

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| Can users manually adjust individual component manhour allocations? | No direct edits. Users adjust weight values, system redistributes within scope. |
| How are manhours allocated to buckets vs components? | Bottom-up aggregation by default; manual bucket overrides supported. |
| What happens to new components after budget distribution? | No allocation until next budget version. |
| How are partial milestones handled? | weight × (value / 100) |
| What happens if SIZE is unparseable? | Fixed weight of 1.0 with validation warning. |
