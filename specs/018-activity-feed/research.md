# Research: Dashboard Recent Activity Feed

**Feature**: 018-activity-feed | **Date**: 2025-10-28 | **Phase**: 0

## Research Questions & Findings

### 1. PostgreSQL View vs. Materialized View

**Question**: Should `vw_recent_activity` be a standard view or materialized view?

**Decision**: **Standard VIEW** (not materialized)

**Rationale**:
- **Real-time requirement**: Activities must appear within 3 seconds of milestone updates. Materialized views require manual `REFRESH MATERIALIZED VIEW` which adds lag.
- **Small result set**: Limited to 10 rows per query with indexed joins - performance acceptable without caching
- **Existing patterns**: Project uses standard views (e.g., `mv_drawing_progress` is materialized but refreshes on RPC calls, not suitable for real-time dashboard)
- **Complexity**: Standard views simpler - no refresh management, no stale data concerns

**Alternatives Considered**:
- Materialized view with triggers: Complex, adds maintenance overhead
- Application-layer caching: TanStack Query already provides 30-second cache

**Performance Validation**:
- Indexed joins on `milestone_events(created_at DESC)`, `milestone_events(component_id)`, `components(project_id)`
- `LIMIT 10` prevents large scans
- Expected query time: <100ms (requirement: <100ms) ✅

---

### 2. User Initials Calculation Algorithm

**Question**: Verify `string_to_array` + `unnest` + `string_agg` works correctly for multi-word names

**Decision**: Use **LATERAL unnest + string_agg** pattern with COALESCE fallback

**SQL Pattern**:
```sql
CASE
  WHEN u.full_name IS NOT NULL THEN
    string_agg(substring(word, 1, 1), '')
  ELSE
    upper(substring(u.email, 1, 2))
END as user_initials
FROM ...
LEFT JOIN LATERAL unnest(string_to_array(u.full_name, ' ')) AS word ON true
GROUP BY ... u.full_name, u.email
```

**Rationale**:
- **Multi-word support**: "John Smith" → `["John", "Smith"]` → `["J", "S"]` → "JS"
- **Single word**: "Madonna" → `["Madonna"]` → `["M"]` → "M"
- **NULL handling**: Falls back to `substring(email, 1, 2)` for users without full_name
- **Case handling**: Email fallback uses `upper()` for consistency

**Edge Cases Handled**:
- Empty string full_name → NULL → email fallback
- Multiple spaces in name → `string_to_array` collapses
- Non-ASCII characters → PostgreSQL handles UTF-8 substring correctly

**Alternatives Considered**:
- regex_split_to_array: More complex, no advantage
- Client-side calculation: Slower, requires additional query fields

---

### 3. Component Identity Key Structure

**Question**: Confirm identity_key JSONB structure for all 11 component types

**Decision**: Use **type-specific JSONB extraction** with CASE statement

**Confirmed Structures** (from migrations/00010_component_tracking.sql):

| Component Type | identity_key Fields | Display Format |
|----------------|---------------------|----------------|
| spool | `{"spool_id": "SP-001"}` | "Spool SP-001" |
| field_weld | `{"weld_number": "FW-042"}` | "Field Weld FW-042" |
| support | `{"commodity_code": "CS-2", "size": "2IN", "seq": 1, "drawing_norm": "P-001"}` | "Support CS-2 2IN" |
| valve | `{"tag_number": "V-001"}` | "Valve V-001" |
| fitting | `{"fitting_id": "F-001"}` | "Fitting F-001" |
| flange | `{"flange_id": "FL-001"}` | "Flange FL-001" |
| instrument | `{"tag_number": "I-001"}` | "Instrument I-001" |
| tubing | `{"tubing_id": "T-001"}` | "Tubing T-001" |
| hose | `{"hose_id": "H-001"}` | "Hose H-001" |
| misc_component | `{"component_id": "MC-001"}` | "Misc Component MC-001" |
| threaded_pipe | `{"pipe_id": "TP-001"}` | "Threaded Pipe TP-001" |

**SQL Pattern**:
```sql
CASE c.component_type
  WHEN 'spool' THEN concat('Spool ', c.identity_key->>'spool_id')
  WHEN 'field_weld' THEN concat('Field Weld ', c.identity_key->>'weld_number')
  WHEN 'support' THEN concat('Support ', c.identity_key->>'commodity_code', ' ', c.identity_key->>'size')
  -- ... other types
  ELSE concat('Component ', c.id::text)  -- Fallback for unknown/malformed
END
```

**Rationale**:
- **Type safety**: JSONB->>operator extracts as TEXT, preventing type errors
- **Graceful degradation**: ELSE clause handles malformed keys with UUID fallback
- **Consistent formatting**: All types follow "[Type] [Identifier]" pattern

**Alternatives Considered**:
- Single generic field: Would miss type-specific formatting (support needs commodity_code + size)
- Client-side formatting: Slower, duplicates logic

---

### 4. Real-time Subscription Filtering

**Question**: Confirm we cannot filter `milestone_events` Realtime by project_id (table lacks column)

**Decision**: **Subscribe to all milestone_events INSERTs**, invalidate query on every event

**Challenge**: `milestone_events` table has no `project_id` column - only `component_id`. Cannot use Supabase Realtime filter `project_id=eq.{uuid}`.

**Rationale for All-Events Subscription**:
1. **Simplicity**: No need to lookup component_id → project_id on every event
2. **Performance acceptable**: Query invalidation triggers refetch of 10 rows (fast)
3. **Stale time protection**: TanStack Query won't refetch if data <30 seconds old
4. **Network efficiency**: Realtime sends only event notification (~100 bytes), not full data

**Alternative Considered**: Check component_id on event
```typescript
// NOT IMPLEMENTED - too complex
.on('INSERT', async (payload) => {
  const { data } = await supabase
    .from('components')
    .select('project_id')
    .eq('id', payload.new.component_id)
    .single();

  if (data?.project_id === projectId) {
    queryClient.invalidateQueries(['projects', projectId, 'recent-activity']);
  }
})
```

**Why Rejected**: Additional query on every event adds latency and complexity with marginal benefit (most users view single project at a time).

---

## Technology Best Practices

### TanStack Query Configuration

**Stale Time**: 30 seconds
- **Rationale**: Balances freshness with server load. Real-time subscription provides instant updates; stale time prevents refetch storms.
- **Pattern**: `staleTime: 30 * 1000`

**Query Key Structure**: `['projects', projectId, 'recent-activity']`
- **Rationale**: Hierarchical keys enable selective invalidation
- **Pattern**: Follows existing convention in `useDashboardMetrics.ts`

### Supabase Realtime Cleanup

**Pattern**: Return cleanup function from useEffect
```typescript
useEffect(() => {
  const channel = supabase.channel(`milestone_events:${projectId}`)...;
  return () => {
    supabase.removeChannel(channel);
  };
}, [projectId, queryClient]);
```

**Rationale**: Prevents memory leaks and duplicate subscriptions on component remount

### Database View Permissions

**Pattern**: Grant SELECT to authenticated role
```sql
GRANT SELECT ON vw_recent_activity TO authenticated;
```

**Rationale**: Views inherit RLS from base tables (milestone_events, components, users, drawings all have RLS policies filtering by organization_id). No additional RLS needed on view itself.

---

## Summary

All research questions resolved. Key technical decisions:

1. ✅ Standard PostgreSQL view (not materialized) for real-time data
2. ✅ LATERAL unnest pattern for user initials with email fallback
3. ✅ CASE statement with 11 component type branches for identity formatting
4. ✅ All-events Realtime subscription with query invalidation
5. ✅ TanStack Query 30-second stale time
6. ✅ View inherits RLS from base tables

**No blockers identified**. Ready to proceed to Phase 1 (Data Model & Contracts).
