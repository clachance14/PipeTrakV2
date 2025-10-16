# Research: Sprint 1 - Core Foundation Database Expansion

**Feature**: 005-sprint-1-core
**Date**: 2025-10-15
**Phase**: 0 (Outline & Research)

## Research Questions

### 1. PostgreSQL pg_trgm Extension for Drawing Similarity Detection

**Question**: How to implement trigram similarity search in PostgreSQL for detecting similar drawing numbers (e.g., "P-001" vs "P-0001" with 85% threshold)?

**Decision**: Use `pg_trgm` extension with `similarity()` function and GIN index on `drawing_no_norm` column.

**Rationale**:
- Built-in PostgreSQL extension, widely used for fuzzy text matching
- `similarity(text, text)` returns score 0.0-1.0 (0.85 = 85% match threshold)
- GIN index (`CREATE INDEX idx_drawings_norm_trgm ON drawings USING gin(drawing_no_norm gin_trgm_ops)`) enables fast similarity queries
- Performance: O(log n) index lookup instead of O(n) full table scan
- Proven pattern in production systems handling millions of text records

**Implementation**:
```sql
-- Enable extension (run once per database)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram index
CREATE INDEX idx_drawings_norm_trgm ON drawings
USING gin(drawing_no_norm gin_trgm_ops);

-- Similarity search function (FR-037 to FR-040)
CREATE OR REPLACE FUNCTION detect_similar_drawings(
  p_project_id UUID,
  p_drawing_no_norm TEXT,
  p_threshold NUMERIC DEFAULT 0.85
)
RETURNS TABLE(drawing_id UUID, drawing_no_norm TEXT, similarity_score NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.drawing_no_norm,
    similarity(d.drawing_no_norm, p_drawing_no_norm) AS score
  FROM drawings d
  WHERE d.project_id = p_project_id
    AND NOT d.is_retired
    AND similarity(d.drawing_no_norm, p_drawing_no_norm) > p_threshold
  ORDER BY score DESC
  LIMIT 3;
END;
$$ LANGUAGE plpgsql;
```

**Alternatives Considered**:
- **Levenshtein distance** (`fuzzystrmatch` extension): Requires exact character-by-character comparison, slower for large strings, less tolerant of prefix/suffix variations
- **Full-text search** (`tsvector`): Designed for word-based search, not optimal for alphanumeric codes with semantic prefixes/suffixes
- **Application-level fuzzy matching** (JS libraries like `fuse.js`): Moves computation to frontend, scales poorly with 1M+ components, no database index support

**Testing Strategy**:
- Contract test: `detect_similar_drawings('P-001')` finds `'P-0001'` with score >0.85
- Contract test: Retired drawings excluded from results
- Performance test: Query execution <100ms with 10k drawings (via EXPLAIN ANALYZE)

---

### 2. Materialized View Refresh Strategy for Dashboard Performance

**Question**: How to refresh materialized views (`mv_package_readiness`, `mv_drawing_progress`) every 60 seconds without blocking queries or causing stale data issues?

**Decision**: Use `REFRESH MATERIALIZED VIEW CONCURRENTLY` with background pg_cron job + manual refresh trigger after bulk operations.

**Rationale**:
- `CONCURRENTLY` option allows queries to continue reading stale data during refresh (no table locks)
- pg_cron extension (built into Supabase) schedules automatic refresh every 60 seconds
- Manual refresh via hook call after bulk imports ensures dashboard updates immediately for large data changes
- 60-second staleness acceptable per spec (FR-035: "refresh every 60 seconds", FR-049: "serve stale data until successful refresh")

**Implementation**:
```sql
-- Create materialized views with unique indexes (required for CONCURRENTLY)
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
LEFT JOIN components c ON c.test_package_id = tp.id AND NOT c.is_retired
LEFT JOIN needs_review nr ON nr.component_id = c.id AND nr.status = 'pending'
GROUP BY tp.id, tp.project_id, tp.name, tp.target_date;

CREATE UNIQUE INDEX idx_mv_package_readiness_id ON mv_package_readiness(package_id);

-- Background refresh job (pg_cron syntax for Supabase)
SELECT cron.schedule(
  'refresh-package-readiness',
  '*/1 * * * *',  -- Every 1 minute (60 seconds)
  $$ REFRESH MATERIALIZED VIEW CONCURRENTLY mv_package_readiness $$
);

-- Manual refresh hook (called after bulk imports)
export function useRefreshDashboards() {
  return useMutation({
    mutationFn: async () => {
      await supabase.rpc('refresh_materialized_views');
    }
  });
}
```

**Alternatives Considered**:
- **Real-time triggers**: Update aggregates on every component change → excessive write amplification (1M components = 1M trigger fires), performance killer
- **Application-level caching** (Redis): Adds infrastructure complexity, requires cache invalidation logic, costs more than Supabase-native materialized views
- **Non-concurrent refresh** (`REFRESH MATERIALIZED VIEW`): Locks table during refresh, blocks dashboard queries for 1-5 seconds (unacceptable UX)

**Error Handling** (FR-049):
- If refresh fails (e.g., constraint violation, deadlock), pg_cron retries next cycle (60 seconds later)
- Dashboard continues serving stale data (last successful refresh)
- Error logged to Supabase logs for monitoring

---

### 3. JSONB Identity Key Validation Strategy

**Question**: How to validate component `identity_key` structure matches component type schema (FR-041) without hard-coding 11 different CHECK constraints?

**Decision**: Use PostgreSQL JSONB operators + reusable validation function with type-specific schema checks.

**Rationale**:
- JSONB supports key existence checks (`?` operator), type checks (`jsonb_typeof()`), and path queries (`->>`)
- Single validation function handles all 11 component types with CASE statement
- Called from CHECK constraint or application-layer validation before INSERT/UPDATE
- Flexible for future component type additions without schema migration

**Implementation**:
```sql
-- Validation function (called from CHECK constraint or application layer)
CREATE OR REPLACE FUNCTION validate_component_identity_key(
  p_component_type TEXT,
  p_identity_key JSONB
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN CASE p_component_type
    WHEN 'spool' THEN
      p_identity_key ? 'spool_id' AND
      jsonb_typeof(p_identity_key->'spool_id') = 'string'

    WHEN 'field_weld' THEN
      p_identity_key ? 'weld_number' AND
      jsonb_typeof(p_identity_key->'weld_number') = 'string'

    WHEN 'support', 'valve', 'fitting', 'flange', 'instrument', 'tubing', 'hose', 'misc_component' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq' AND
      jsonb_typeof(p_identity_key->'seq') = 'number'

    WHEN 'threaded_pipe' THEN
      p_identity_key ? 'drawing_norm' AND
      p_identity_key ? 'commodity_code' AND
      p_identity_key ? 'size' AND
      p_identity_key ? 'seq'

    ELSE FALSE  -- Unknown component type
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Apply as CHECK constraint (optional - can also validate in application layer)
ALTER TABLE components
ADD CONSTRAINT chk_identity_key_structure
CHECK (validate_component_identity_key(component_type, identity_key));
```

**Alternatives Considered**:
- **11 separate CHECK constraints**: Verbose, hard to maintain, slows down ALTER TABLE operations
- **JSON Schema validation** (3rd party extension): Requires additional PostgreSQL extension not available in Supabase, overkill for simple key existence checks
- **Application-layer validation only**: Allows invalid data if migration scripts bypass validation, no database-level integrity guarantee

**Testing Strategy**:
- Contract test: Insert spool with valid identity_key `{"spool_id": "SP-001"}` → success
- Contract test: Insert spool with invalid identity_key `{"weld_number": "W-001"}` → CHECK constraint violation
- Contract test: Insert support with valid identity_key `{"drawing_norm": "P-001", "commodity_code": "CS-2", "size": "2IN", "seq": 1}` → success

---

### 4. Progress Template Milestone Weight Validation

**Question**: How to ensure milestone weights total exactly 100% (FR-042) and prevent rounding errors in weighted calculations?

**Decision**: PostgreSQL CHECK constraint validates sum = 100 on INSERT, use NUMERIC(5,2) for all percentage fields to avoid floating-point rounding errors.

**Rationale**:
- NUMERIC(5,2) provides exact decimal arithmetic (no 0.1 + 0.2 = 0.30000000000000004 issues)
- Range: 0.00 to 100.00 (sufficient for percentages)
- CHECK constraint enforces business rule at database level (cannot insert invalid template)
- Validation runs only on INSERT (templates immutable after creation due to versioning)

**Implementation**:
```sql
-- Validation function to sum milestone weights
CREATE OR REPLACE FUNCTION validate_milestone_weights(p_milestones_config JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  total_weight NUMERIC(5,2) := 0;
  milestone JSONB;
BEGIN
  FOR milestone IN SELECT * FROM jsonb_array_elements(p_milestones_config) LOOP
    total_weight := total_weight + (milestone->>'weight')::NUMERIC(5,2);
  END LOOP;

  RETURN total_weight = 100.00;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Apply as CHECK constraint
ALTER TABLE progress_templates
ADD CONSTRAINT chk_milestone_weights_total_100
CHECK (validate_milestone_weights(milestones_config));

-- All percentage columns use NUMERIC(5,2)
-- components.percent_complete NUMERIC(5,2) NOT NULL DEFAULT 0.00
-- milestone_events.value NUMERIC(5,2)
```

**Alternatives Considered**:
- **FLOAT/DOUBLE PRECISION**: Subject to floating-point rounding errors (0.1 + 0.2 ≠ 0.3), unacceptable for financial/progress calculations
- **INTEGER (basis points)**: Stores as 10000 = 100%, requires division by 100 everywhere, error-prone for developers
- **Application-layer validation only**: Allows invalid templates via direct SQL, no database integrity guarantee

**Testing Strategy**:
- Contract test: Insert template with weights [5, 40, 40, 5, 5, 5] (total 100) → success
- Contract test: Insert template with weights [5, 40, 40, 5, 5, 2] (total 97) → CHECK constraint violation
- Integration test: `calculate_component_percent()` returns exactly 45.00 (not 44.99999) when milestones sum to 45%

---

### 5. RLS Policy Performance with organization_id Filtering

**Question**: Will RLS policies using `users.organization_id` in WHERE clause scale to 1M+ components without performance degradation?

**Decision**: Yes, with proper indexes on `organization_id` foreign key columns + RLS policy optimization using `(SELECT organization_id FROM users WHERE id = auth.uid())` subquery caching.

**Rationale**:
- PostgreSQL query planner caches RLS policy subqueries (executes once per statement, not per row)
- Index on `components.project_id` + `projects.organization_id` enables index-only scans for org filtering
- Feature 004 single-org model simplifies queries (no JOIN to `user_organizations` table)
- Tested pattern in production Supabase apps handling millions of rows

**Implementation**:
```sql
-- RLS policy for components table (FR-027 to FR-029)
CREATE POLICY "Users can view components in their organization"
ON components FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Critical indexes for RLS performance
CREATE INDEX idx_components_project_id ON components(project_id);
CREATE INDEX idx_projects_organization_id ON projects(organization_id);
CREATE INDEX idx_users_organization_id ON users(organization_id);

-- Query plan analysis (validate <100ms p90)
EXPLAIN ANALYZE
SELECT * FROM components WHERE project_id = 'some-uuid';
-- Expected: Index Scan on idx_components_project_id (cost=...)
```

**Alternatives Considered**:
- **Application-layer filtering** (add `WHERE organization_id = ?` to all queries): Requires remembering filter in every query, human error risk, no database-level security guarantee
- **Denormalized `organization_id` on components table**: Adds redundant column (already reachable via `project_id → projects.organization_id`), increases storage by ~16 bytes * 1M rows = 16MB, violates normalization

**Performance Validation**:
- Integration test: Query 10k components with RLS enabled → p90 <100ms
- Integration test: User from Org A cannot read components from Org B (RLS blocks at database level, not application)

---

## Research Summary

**All NEEDS CLARIFICATION Resolved**: ✅

1. **Drawing similarity**: pg_trgm extension with GIN index + `similarity()` function
2. **Materialized view refresh**: `REFRESH MATERIALIZED VIEW CONCURRENTLY` via pg_cron every 60 seconds
3. **JSONB validation**: Reusable `validate_component_identity_key()` function with type-specific checks
4. **Milestone weight validation**: NUMERIC(5,2) for exact arithmetic + CHECK constraint validates sum = 100
5. **RLS performance**: Indexed `organization_id` filtering with subquery caching, proven pattern for 1M+ rows

**Key Technical Decisions**:
- Use PostgreSQL native features (pg_trgm, pg_cron, JSONB operators) instead of external libraries
- NUMERIC(5,2) for all percentages to avoid floating-point errors
- Feature 004 single-org model simplifies RLS queries (no `user_organizations` JOIN)
- Sprint 1 focuses on database foundation—import UI and complex validation deferred to Sprint 2

**Next Phase**: Phase 1 (Design & Contracts) - Extract data model from spec, generate TanStack Query hook contracts, create quickstart validation tests.
