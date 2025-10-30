# Recent Activity Feed Design

**Date:** 2025-10-28
**Feature:** Dashboard Recent Activity Feed
**Status:** Approved Design

## Overview

Implement a real-time activity feed on the dashboard that displays the last 10 milestone update activities for the currently selected project. Activities show full context including user name, milestone details, previous values, component identity, and drawing information.

## Requirements

### Functional Requirements

1. **Activity Tracking:** Track all milestone updates (from `milestone_events` table)
2. **Activity Display:** Show last 10 activities for selected project
3. **Full Context:** Display format: "[User Name] marked [Milestone Name] complete (was [Previous Value]) for [Component Identity] on [Drawing Number]"
4. **Real-time Updates:** Instantly show new activities when team members update milestones
5. **User Initials:** Calculate and display user initials from full name

### Non-Functional Requirements

1. **Performance:** Fast queries using database view with proper indexes
2. **No Data Duplication:** Use existing `milestone_events` table, no new audit trail
3. **Historical Data:** Immediately show all existing milestone events (no backfill needed)
4. **Project Filtering:** Automatically filter by selected project from `ProjectContext`

## Architecture

### Database Layer

**PostgreSQL View: `vw_recent_activity`**

Create a view that:
- Joins `milestone_events` with `components`, `users`, and `drawings`
- Formats activity descriptions with full context
- Calculates user initials from `users.full_name`
- Exposes `project_id` for easy filtering
- Pre-computes all display strings

**View Schema:**

```sql
CREATE VIEW vw_recent_activity AS
SELECT
  me.id,
  c.project_id,
  me.user_id,
  -- User initials calculation
  CASE
    WHEN u.full_name IS NOT NULL THEN
      -- Extract first letter of each word
      string_agg(substring(word, 1, 1), '')
    ELSE
      -- Fallback to first 2 chars of email
      upper(substring(u.email, 1, 2))
  END as user_initials,
  -- Formatted description
  concat(
    u.full_name,
    ' marked ',
    me.milestone_name,
    CASE
      WHEN me.value = 1 THEN ' complete'
      ELSE concat(' to ', me.value::text, '%')
    END,
    CASE
      WHEN me.previous_value IS NOT NULL THEN
        concat(' (was ', me.previous_value::text,
               CASE WHEN me.previous_value < 1 THEN '%' ELSE '' END, ')')
      ELSE ''
    END,
    ' for ',
    -- Component identity formatting (type-specific)
    CASE c.component_type
      WHEN 'spool' THEN concat('Spool ', c.identity_key->>'spool_id')
      WHEN 'field_weld' THEN concat('Field Weld ', c.identity_key->>'weld_number')
      WHEN 'support' THEN concat('Support ',
                                 c.identity_key->>'commodity_code', ' ',
                                 c.identity_key->>'size')
      -- Add other component types as needed
      ELSE concat('Component ', c.id::text)
    END,
    CASE
      WHEN d.drawing_no_raw IS NOT NULL THEN
        concat(' on Drawing ', d.drawing_no_raw)
      ELSE ' (no drawing assigned)'
    END
  ) as description,
  me.created_at as timestamp
FROM milestone_events me
JOIN components c ON c.id = me.component_id
JOIN users u ON u.id = me.user_id
LEFT JOIN drawings d ON d.id = c.drawing_id
LEFT JOIN LATERAL unnest(string_to_array(u.full_name, ' ')) AS word ON true
GROUP BY me.id, c.project_id, c.component_type, c.identity_key,
         c.id, u.full_name, u.email, d.drawing_no_raw, me.milestone_name,
         me.value, me.previous_value, me.created_at;
```

**Index Requirements:**

- `milestone_events(created_at DESC)` - already exists
- `milestone_events(component_id)` - already exists
- `components(project_id)` - already exists

### Frontend Layer

**Hook: `useAuditLog`**

Replace stubbed implementation in `useDashboardMetrics.ts`:

```typescript
function useAuditLog(projectId: string): { data: ActivityItem[] } {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['projects', projectId, 'recent-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_recent_activity')
        .select('id, user_initials, description, timestamp')
        .eq('project_id', projectId)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!projectId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`milestone_events:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'milestone_events',
        },
        (payload) => {
          // Check if this event belongs to current project
          // We'll need to verify via component_id -> project_id
          // For simplicity, just invalidate the query
          queryClient.invalidateQueries(['projects', projectId, 'recent-activity']);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);

  return { data: query.data || [] };
}
```

**Real-time Strategy:**

Since `milestone_events` doesn't have `project_id`, we can't filter the Realtime subscription. Options:
1. Subscribe to all `milestone_events` INSERTs, invalidate query on every event (simple, may refetch unnecessarily)
2. Subscribe and check if `payload.new.component_id` belongs to current project (requires additional lookup)

**Recommendation:** Option 1 for simplicity. The query is fast and limited to 10 rows.

**Component Updates:**

No changes needed to `ActivityFeed.tsx` - it already accepts `ActivityItem[]` and renders correctly.

## Data Flow

1. User updates milestone via `update_component_milestone()` RPC
2. RPC inserts into `milestone_events` table
3. Supabase Realtime broadcasts INSERT event
4. Frontend hook receives event and invalidates query
5. TanStack Query refetches from `vw_recent_activity` view
6. `ActivityFeed` component re-renders with new data

## User Initials Calculation

**Algorithm:**

```
IF users.full_name IS NOT NULL THEN
  Split full_name by spaces
  Take first letter of each word
  Join letters (e.g., "John Smith" → "JS")
ELSE
  Take first 2 characters of email before @ (e.g., "john@example.com" → "JO")
END
```

**Edge Cases:**

- Single name: "Madonna" → "M"
- Empty full_name: Use email fallback
- Deleted users: Name still available in view (historical record)

## Component Identity Formatting

| Component Type | Identity Key Fields | Display Format |
|----------------|---------------------|----------------|
| spool | `spool_id` | "Spool SP-001" |
| field_weld | `weld_number` | "Field Weld FW-042" |
| support | `commodity_code`, `size` | "Support CS-2 2IN" |
| valve | `tag_number` | "Valve V-001" |
| fitting | `fitting_id` | "Fitting F-001" |
| flange | `flange_id` | "Flange FL-001" |
| instrument | `tag_number` | "Instrument I-001" |
| tubing | `tubing_id` | "Tubing T-001" |
| hose | `hose_id` | "Hose H-001" |
| misc_component | `component_id` | "Misc Component MC-001" |
| threaded_pipe | `pipe_id` | "Threaded Pipe TP-001" |

## Error Handling

### Database View

- **Missing drawing:** Show "(no drawing assigned)"
- **NULL full_name:** Fall back to email-based initials
- **Invalid identity_key:** Fall back to generic "Component [UUID]"

### Frontend Hook

- **Query failure:** Return empty array, `ActivityFeed` shows error state
- **Realtime disconnect:** Continue with 30-second polling as fallback
- **Empty results:** `ActivityFeed` shows "No recent activity" message

### Performance

- **View query:** Indexed joins, limited to 10 rows - fast (<50ms)
- **Realtime overhead:** Minimal - only change notifications, not full data
- **Refetch frequency:** 30-second stale time prevents excessive queries

## Testing Strategy

### Database Tests

1. **View correctness:** Verify joins and formatting for various milestone types
2. **User initials:** Test full_name parsing and email fallback
3. **Component identity:** Test all 11 component types format correctly
4. **Drawing handling:** Test with and without assigned drawings

### Frontend Tests

1. **Hook tests:**
   - Mock Supabase query and verify data transformation
   - Test enabled/disabled based on projectId
   - Test stale time behavior

2. **Real-time tests:**
   - Mock channel subscription
   - Verify query invalidation on INSERT events
   - Test cleanup on unmount

3. **Integration tests:**
   - End-to-end: Update milestone → Activity appears
   - Multi-user: One user updates, another sees real-time update

### Coverage Targets

- Overall: ≥70%
- `useAuditLog` hook: ≥80%
- Database view: Manual SQL testing + integration tests

## Migration Plan

### Migration File: `000XX_create_recent_activity_view.sql`

**Steps:**

1. Create `vw_recent_activity` view with all joins and formatting logic
2. Grant SELECT permission to authenticated users
3. Add RLS policy on view (if needed - views inherit RLS from base tables)
4. Enable Realtime on `milestone_events` table (if not already enabled)

**Rollback:**

```sql
DROP VIEW IF EXISTS vw_recent_activity;
```

### Frontend Deployment

1. Update `useDashboardMetrics.ts` to replace stubbed `useAuditLog`
2. No changes to `ActivityFeed.tsx` component
3. No changes to `DashboardPage.tsx` component

**No breaking changes** - existing UI components already expect `ActivityItem[]` format.

## Success Criteria

1. ✅ Dashboard shows last 10 milestone updates for selected project
2. ✅ Activities display full context (user, milestone, previous value, component, drawing)
3. ✅ Real-time updates appear instantly when team members update milestones
4. ✅ User initials calculated correctly from full names
5. ✅ All 11 component types display proper identity strings
6. ✅ Historical milestone_events data visible immediately (no backfill needed)
7. ✅ Query performance <50ms for 10 activities
8. ✅ Test coverage ≥70% overall, ≥80% for hook

## Future Enhancements (Out of Scope)

1. Pagination or "Load more" for activities beyond 10
2. Filter activities by user or milestone type
3. Activity details modal with full metadata
4. Export activity history to CSV
5. Track other activity types (imports, team changes, etc.)
