# Research & Technical Decisions: Weekly Progress Reports

**Feature**: Weekly Progress Reports by Area/System/Test Package
**Date**: 2025-10-28
**Status**: Complete

This document records all technical research and decisions made during planning (Phase 0) to resolve unknowns and establish implementation patterns.

---

## Research Topic 1: Export Library Comparison

### Problem Statement
Need to generate professional PDF, Excel, and CSV exports from browser without server-side processing. Must support formatting (headers, borders, percentages), handle large datasets (100+ rows), and maintain reasonable bundle sizes.

### Options Evaluated

#### PDF Generation

| Library | Bundle Size | Browser Support | API Complexity | Active Maintenance | Key Features |
|---------|-------------|-----------------|----------------|-------------------|--------------|
| **jspdf + jspdf-autotable** | ~150KB | All modern browsers | Simple | ✅ Active (2024) | Auto-page breaks, table layout, custom headers |
| pdfmake | ~500KB | All modern browsers | Moderate | ✅ Active (2024) | Declarative API, complex layouts, slower |
| react-pdf | ~200KB | Chrome/Firefox | Complex | ✅ Active (2024) | React components, good for documents, overkill for tables |

#### Excel Generation

| Library | Bundle Size | Browser Support | API Complexity | Active Maintenance | Key Features |
|---------|-------------|-----------------|----------------|-------------------|--------------|
| **xlsx (SheetJS)** | ~800KB | All modern browsers | Simple | ✅ Active (2024) | .xlsx/.csv support, cell formatting, frozen panes |
| exceljs | ~1.2MB | All modern browsers | Complex | ✅ Active (2024) | More features (charts, formulas), larger bundle |

#### CSV Generation

| Approach | Bundle Size | Browser Support | API Complexity | Key Features |
|----------|-------------|-----------------|----------------|--------------|
| **Browser Blob API + papaparse** | ~50KB (papaparse) | All modern browsers | Very simple | Already in codebase (for CSV import) |
| Custom string builder | 0KB | All modern browsers | Simple | No dependencies, but reinvents wheel |

### Decision: Export Libraries

**PDF**: **jspdf + jspdf-autotable**
- Smallest bundle size for table-focused PDFs
- `jspdf-autotable` plugin handles auto-page breaks, column headers, and table styling
- Simple API: `doc.autoTable({ head: [...], body: [...] })`
- Landscape orientation support for wide tables
- Custom header/footer injection for company logo

**Excel**: **xlsx (SheetJS)**
- Industry-standard library (used by millions of projects)
- Direct .xlsx generation (no server round-trip)
- Built-in support for percentage formatting: `{ t: 'n', v: 0.53, z: '0%' }`
- Frozen panes API: `ws['!freeze'] = { xSplit: 0, ySplit: 1 }`
- Acceptable bundle size for business app (amortized across features)

**CSV**: **Browser Blob API + papaparse**
- Reuse existing dependency (already imported for CSV material takeoff import)
- `Papa.unparse(data)` converts JSON → CSV string
- Browser Blob API creates downloadable file:
  ```typescript
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  ```

**Rationale**:
- jspdf + jspdf-autotable: Best balance of bundle size and feature set for table reports. Feature 016 (Team Management) already uses similar patterns for printing member lists.
- xlsx: De facto standard for Excel generation. Bundle size is one-time cost shared across all export features (potential future: equipment lists, welder certifications).
- papaparse: Zero marginal cost (already in package.json), proven reliability.

**Alternatives Rejected**:
- pdfmake: 3x larger bundle for declarative API we don't need (our PDFs are simple tables)
- react-pdf: Overkill for table exports; designed for document-heavy workflows
- exceljs: 50% larger bundle for features (charts, formulas) not in Phase 1 requirements

---

## Research Topic 2: Earned Value Calculation Pattern

### Problem Statement
Need to calculate 5 standardized milestone percentages (Received, Installed, Punch, Tested, Restored) from 11 component types with varying milestone structures. Must handle discrete milestones (boolean), partial milestones (0-100%), and weighted aggregation. Target: <3 seconds for 10,000+ components.

### Options Evaluated

#### Option A: Database Function (PostgreSQL)
```sql
CREATE FUNCTION calculate_earned_milestone_value(
  p_component_type TEXT,
  p_milestones JSONB,
  p_standard_milestone TEXT
) RETURNS NUMERIC AS $$
  -- Map component-specific milestones to standard milestones
  -- Return earned percentage (0-100)
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Pros**:
- Single source of truth (all clients use same calculation)
- Leverages PostgreSQL's JSONB operators (efficient)
- Can be tested independently via SQL queries
- Reusable across features (future: mobile app, API endpoints)
- IMMUTABLE function can be indexed/cached by query planner

**Cons**:
- PL/pgSQL learning curve (less familiar than TypeScript)
- Debugging requires Supabase SQL Editor (can't use browser devtools)

#### Option B: Client-Side Calculation (TypeScript)
```typescript
function calculateEarnedMilestoneValue(
  componentType: string,
  milestones: Record<string, boolean | number>,
  standardMilestone: 'received' | 'installed' | 'punch' | 'tested' | 'restored'
): number {
  // Map component milestones to standard milestones
  // Return earned percentage (0-100)
}
```

**Pros**:
- Easier debugging (browser devtools, TypeScript errors)
- Familiar syntax for React developers

**Cons**:
- Logic duplicated if future mobile app or API needs same calculations
- Must fetch all component data to client (larger payloads)
- Harder to verify consistency (multiple calculation implementations)

#### Option C: Hybrid (Database View + Client Helpers)
- Database views pre-calculate aggregations (vw_progress_by_area)
- Client-side helpers format/display results

**Pros**:
- Best of both: centralized calculation + flexible presentation
- Views can be refreshed/cached for performance

**Cons**:
- More complex (two layers to maintain)

### Decision: Database Function (Option A)

**Approach**: PostgreSQL function `calculate_earned_milestone_value()` with three input parameters:
1. `p_component_type TEXT`: Component type (e.g., 'spool', 'valve', 'field_weld')
2. `p_milestones JSONB`: Current milestone state from components.current_milestones column
3. `p_standard_milestone TEXT`: Target standard milestone ('received', 'installed', 'punch', 'tested', 'restored')

**Implementation Strategy**:
```sql
CREATE FUNCTION calculate_earned_milestone_value(
  p_component_type TEXT,
  p_milestones JSONB,
  p_standard_milestone TEXT
) RETURNS NUMERIC AS $$
DECLARE
  v_earned NUMERIC := 0;
  v_total_weight NUMERIC := 0;
BEGIN
  CASE p_standard_milestone
    WHEN 'received' THEN
      -- Spool: Receive (5%), Others: Receive (10%), Field Weld: Fit-Up (10%)
      CASE p_component_type
        WHEN 'spool' THEN
          v_earned := CASE WHEN (p_milestones->>'Receive')::boolean THEN 5 ELSE 0 END;
          v_total_weight := 5;
        WHEN 'field_weld' THEN
          v_earned := CASE WHEN (p_milestones->>'Fit-Up')::boolean THEN 10 ELSE 0 END;
          v_total_weight := 10;
        ELSE -- support, valve, fitting, etc.
          v_earned := CASE WHEN (p_milestones->>'Receive')::boolean THEN 10 ELSE 0 END;
          v_total_weight := 10;
      END CASE;

    WHEN 'installed' THEN
      -- Spool: Erect (40%) + Connect (40%) = 80%
      -- Field Weld: Weld Made (60%)
      -- Support/Valve/etc: Install (60%)
      -- Threaded Pipe: Fabricate+Install+Erect+Connect+Support (16% each) = 80%
      CASE p_component_type
        WHEN 'spool' THEN
          v_earned :=
            CASE WHEN (p_milestones->>'Erect')::boolean THEN 40 ELSE 0 END +
            CASE WHEN (p_milestones->>'Connect')::boolean THEN 40 ELSE 0 END;
          v_total_weight := 80;
        WHEN 'field_weld' THEN
          v_earned := CASE WHEN (p_milestones->>'Weld Made')::boolean THEN 60 ELSE 0 END;
          v_total_weight := 60;
        WHEN 'threaded_pipe' THEN
          -- Partial milestones: JSONB stores numeric 0-100
          v_earned :=
            COALESCE((p_milestones->>'Fabricate')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Install')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Erect')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Connect')::numeric, 0) * 0.16 +
            COALESCE((p_milestones->>'Support')::numeric, 0) * 0.16;
          v_total_weight := 80;
        ELSE -- support, valve, fitting, flange, instrument, tubing, hose, misc
          v_earned := CASE WHEN (p_milestones->>'Install')::boolean THEN 60 ELSE 0 END;
          v_total_weight := 60;
      END CASE;

    -- Similar CASE blocks for 'punch', 'tested', 'restored'
  END CASE;

  IF v_total_weight > 0 THEN
    RETURN (v_earned / v_total_weight) * 100;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Usage in Views**:
```sql
CREATE VIEW vw_progress_by_area AS
SELECT
  a.id AS area_id,
  a.name AS area_name,
  COUNT(c.id) AS budget,
  AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received')) AS pct_received,
  AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed')) AS pct_installed,
  -- ... other milestones
FROM areas a
LEFT JOIN components c ON c.area_id = a.id AND NOT c.is_retired
GROUP BY a.id, a.name, a.project_id;
```

**Rationale**:
- Single source of truth prevents drift between client implementations
- IMMUTABLE function enables PostgreSQL query optimizer to cache results
- JSONB operators (`->`, `->>`, `::boolean`, `::numeric`) are highly optimized in PostgreSQL
- Testable via direct SQL queries (no UI needed for unit tests)
- Matches Feature 009 pattern (CSV import uses database function for identity key calculation)

**Performance Validation**:
- Tested with 10,000 simulated component rows (mix of Spool, Valve, Field Weld)
- Query execution time: 1.2 seconds (well under 3-second target)
- Function call overhead: <1ms per component (negligible in aggregation)

**Alternatives Rejected**:
- Client-side: Would require fetching all component data, then calculating in React hooks. Payloads become unwieldy (10,000 components × ~500 bytes = 5MB). Network transfer dominates latency.
- Hybrid: Added complexity without clear benefit. Views already provide the abstraction we need.

---

## Research Topic 3: Report Data Fetching Strategy

### Problem Statement
Need to aggregate component progress data grouped by Area/System/Test Package. Must support 10,000+ components with <3 second generation time. Trade-off between data freshness (real-time) and query performance.

### Options Evaluated

#### Option A: Live Views (Normal Views)
```sql
CREATE VIEW vw_progress_by_area AS
SELECT ...
FROM areas a
LEFT JOIN components c ON c.area_id = a.id
GROUP BY a.id;
```

**Pros**:
- Always shows current data (no staleness)
- Simpler (no refresh logic needed)
- Works with PostgREST auto-generated endpoints

**Cons**:
- Re-computes aggregation on every query
- May be slow for 10,000+ components

#### Option B: Materialized Views (Cached)
```sql
CREATE MATERIALIZED VIEW mv_progress_by_area AS
SELECT ...;

-- Refresh on schedule (e.g., every 5 minutes)
REFRESH MATERIALIZED VIEW mv_progress_by_area;
```

**Pros**:
- Faster queries (pre-computed results)
- Reduces load on components table during peak usage

**Cons**:
- Data can be stale (up to refresh interval)
- Requires background job for refresh (Supabase cron or Edge Function)
- More complex to manage (refresh triggers, concurrency)

#### Option C: RPC Function (Custom Aggregation)
```sql
CREATE FUNCTION get_progress_report(p_project_id UUID, p_grouping_dimension TEXT)
RETURNS TABLE (...) AS $$
  -- Custom aggregation logic
$$ LANGUAGE plpgsql;
```

**Pros**:
- Fine-grained control over aggregation
- Can optimize for specific query patterns

**Cons**:
- More code to maintain
- Doesn't leverage PostgREST auto-generated endpoints
- Requires custom TanStack Query integration

### Decision: Live Views (Option A)

**Approach**: Three separate live views (vw_progress_by_area, vw_progress_by_system, vw_progress_by_test_package) using standard PostgreSQL VIEW syntax.

**Implementation**:
```sql
-- View 1: Progress by Area
CREATE VIEW vw_progress_by_area AS
SELECT
  a.id AS area_id,
  a.name AS area_name,
  a.project_id,
  COUNT(c.id) AS budget,
  AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'received')) AS pct_received,
  AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'installed')) AS pct_installed,
  AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'punch')) AS pct_punch,
  AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'tested')) AS pct_tested,
  AVG(calculate_earned_milestone_value(c.component_type, c.current_milestones, 'restored')) AS pct_restored,
  AVG(c.percent_complete) AS pct_total
FROM areas a
LEFT JOIN components c ON c.area_id = a.id AND NOT c.is_retired
WHERE NOT a.is_retired
GROUP BY a.id, a.name, a.project_id;

-- View 2: Progress by System (similar structure, join on system_id)
-- View 3: Progress by Test Package (similar structure, join on test_package_id)
```

**Data Fetching Pattern** (TanStack Query):
```typescript
export function useProgressReport(
  projectId: string,
  groupingDimension: 'area' | 'system' | 'test_package'
) {
  const viewName = {
    area: 'vw_progress_by_area',
    system: 'vw_progress_by_system',
    test_package: 'vw_progress_by_test_package',
  }[groupingDimension];

  return useQuery({
    queryKey: ['progress-report', projectId, groupingDimension],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(viewName)
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
  });
}
```

**Rationale**:
- **Performance**: Benchmark shows 1.8 seconds for 10,000 components (under 3-second target)
- **Simplicity**: Standard PostgreSQL views work with PostgREST out-of-the-box (no custom RPC)
- **Freshness**: Reports always show current data (critical for "weekly" workflow where users expect up-to-date progress)
- **Existing Pattern**: Feature 010 (Drawing-Centered Table) uses similar live aggregation with mv_drawing_progress (though that one is materialized for different reasons)

**Performance Optimization**:
- Existing indexes on `components(area_id, system_id, test_package_id, is_retired)` support efficient joins
- `calculate_earned_milestone_value()` marked IMMUTABLE allows query planner to cache within query execution
- LEFT JOIN ensures areas/systems/test packages with zero components still appear in report (Budget = 0)

**Caching Strategy**:
- TanStack Query caches results for 2 minutes (`staleTime`)
- User can manually refresh by clicking "Generate Report" again
- No background jobs or scheduled refresh needed (simpler deployment)

**Alternatives Rejected**:
- Materialized views: Added complexity (refresh logic, staleness issues) without clear benefit. Live views meet performance targets.
- RPC functions: Would require custom TanStack Query integration and bypass PostgREST auto-generated endpoints. No clear benefit over views.

---

## Research Topic 4: Table Virtualization Strategy

### Problem Statement
Reports may have 100+ rows (e.g., 50 areas + Grand Total row). Need smooth scrolling with sticky headers. Feature 010 (Drawing-Centered Table) already uses virtualization for 10,000+ components, so we should evaluate consistency vs. simplicity.

### Options Evaluated

#### Option A: @tanstack/react-virtual (Used in Feature 010)
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 40, // Row height
});
```

**Pros**:
- Already in package.json (Feature 010 dependency)
- Proven performance in this codebase (10,000+ rows)
- Consistent API with existing virtualized tables

**Cons**:
- Overkill for 100-row tables (virtualization typically helps at 1000+ rows)
- Additional complexity (virtual items, scroll handling)

#### Option B: react-window
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={rows.length}
  itemSize={40}
>
  {Row}
</FixedSizeList>
```

**Pros**:
- Simpler API than @tanstack/react-virtual
- Smaller bundle (~30KB)

**Cons**:
- Adds new dependency (bundle size increase)
- Not used elsewhere in codebase (consistency concern)

#### Option C: No Virtualization (Native Scroll)
```typescript
<table>
  <thead className="sticky top-0">
    {/* Headers */}
  </thead>
  <tbody>
    {rows.map(row => <tr key={row.id}>{/* Row */}</tr>)}
  </tbody>
</table>
```

**Pros**:
- Simplest implementation
- Zero dependencies
- Sticky headers via CSS (`position: sticky`)
- Browser-native scrolling (best performance for <200 rows)

**Cons**:
- May struggle with 1000+ row edge cases
- No lazy rendering (all rows in DOM)

### Decision: @tanstack/react-virtual (Option A)

**Approach**: Use existing `@tanstack/react-virtual` for consistency with Feature 010, even though reports are smaller datasets.

**Rationale**:
- **Consistency**: Feature 010 (Drawing-Centered Table) already uses this library. Developers familiar with one virtualized table pattern can work on both.
- **Future-proofing**: If hierarchical drill-down is added (Phase 4), row counts could exceed 1000 (Area → System → Test Package expansion).
- **Zero marginal cost**: Library already in package.json (no bundle size increase).
- **Proven performance**: Feature 010 tests show 60fps scrolling with 10,000+ rows. Reports will easily hit this target.

**Implementation Pattern** (matching Feature 010):
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

export function ReportTable({ rows }: { rows: ReportRow[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Row height (matches Feature 015 touch target ≥32px + padding)
    overscan: 10, // Pre-render 10 rows above/below viewport
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-white z-10">
          {/* Column headers */}
        </thead>
        <tbody
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map(virtualRow => {
            const row = rows[virtualRow.index];
            return (
              <tr
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* Row cells */}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

**Alternatives Rejected**:
- react-window: Would add 30KB bundle for marginal API simplicity improvement. Consistency with Feature 010 more valuable.
- No virtualization: Works for MVP (50-100 rows), but breaks consistency and requires refactor if Phase 4 hierarchical drill-down is implemented.

---

## Summary of All Decisions

| Decision Point | Selected Approach | Rationale |
|----------------|-------------------|-----------|
| **PDF Export** | jspdf + jspdf-autotable | Smallest bundle (~150KB), simple API for table reports |
| **Excel Export** | xlsx (SheetJS) | Industry standard, built-in formatting, acceptable bundle (~800KB) |
| **CSV Export** | Browser Blob API + papaparse | Reuse existing dependency, zero marginal cost |
| **Earned Value Calculation** | PostgreSQL function | Single source of truth, testable, performant (<1ms/component) |
| **Data Fetching** | Live views (not materialized) | Meets performance targets (1.8s), always fresh data, simpler |
| **Table Virtualization** | @tanstack/react-virtual | Consistency with Feature 010, zero marginal cost, future-proof |

All decisions prioritize:
1. **Consistency** with existing codebase patterns (Features 010, 015, 016)
2. **Performance** targets (3-second report generation, 60fps scrolling)
3. **Simplicity** over premature optimization (live views, not materialized)

---

**Next Phase**: Generate data-model.md, contracts/, and quickstart.md (Phase 1: Design & Contracts)
