# Data Model: Dashboard Recent Activity Feed

**Feature**: 018-activity-feed | **Date**: 2025-10-28 | **Phase**: 1

## Overview

The activity feed uses a PostgreSQL view (`vw_recent_activity`) that joins 4 existing tables to produce formatted activity items. No new tables are created; all data comes from the existing `milestone_events` audit trail.

## Entity Relationship Diagram

```
┌─────────────────────┐
│  milestone_events   │ 1────┐
│ (existing table)    │      │
├─────────────────────┤      │
│ • id (PK)           │      │
│ • component_id (FK) │──────┼───┐
│ • user_id (FK)      │──────┼───┼───┐
│ • milestone_name    │      │   │   │
│ • value             │      │   │   │
│ • previous_value    │      │   │   │
│ • created_at        │      │   │   │
└─────────────────────┘      │   │   │
                             │   │   │
         ┌───────────────────┘   │   │
         │                       │   │
         ▼                       │   │
┌─────────────────────┐          │   │
│    components       │ 1        │   │
│ (existing table)    │          │   │
├─────────────────────┤          │   │
│ • id (PK)           │          │   │
│ • project_id (FK)   │──────────┼───┼──┐
│ • drawing_id (FK)   │──────────┼───┼──┼───┐
│ • component_type    │          │   │  │   │
│ • identity_key      │          │   │  │   │
└─────────────────────┘          │   │  │   │
                                 │   │  │   │
         ┌───────────────────────┘   │  │   │
         │                           │  │   │
         ▼                           ▼  │   │
┌─────────────────────┐  ┌──────────────┴───┴──┐
│       users         │  │     drawings         │
│  (existing table)   │  │  (existing table)    │
├─────────────────────┤  ├─────────────────────┤
│ • id (PK)           │  │ • id (PK)           │
│ • full_name         │  │ • project_id (FK)   │
│ • email             │  │ • drawing_no_raw    │
└─────────────────────┘  └─────────────────────┘
         │                           │
         │                           │
         └──────────┬─────────── ────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  vw_recent_activity │
         │   (NEW VIEW)        │
         ├─────────────────────┤
         │ • id                │
         │ • project_id        │
         │ • user_id           │
         │ • user_initials     │ (computed)
         │ • description       │ (computed)
         │ • timestamp         │
         └─────────────────────┘
```

## View Schema: `vw_recent_activity`

### Columns

| Column | Type | Source | Description |
|--------|------|--------|-------------|
| `id` | UUID | `milestone_events.id` | Unique identifier for the activity |
| `project_id` | UUID | `components.project_id` | Project this activity belongs to (for filtering) |
| `user_id` | UUID | `milestone_events.user_id` | User who performed the action |
| `user_initials` | TEXT | Computed from `users.full_name` or `users.email` | 2-3 character initials for avatar display |
| `description` | TEXT | Computed from multiple fields | Human-readable activity description with full context |
| `timestamp` | TIMESTAMPTZ | `milestone_events.created_at` | When the activity occurred |

### Computed Fields

#### user_initials

**Algorithm**:
```sql
CASE
  WHEN u.full_name IS NOT NULL THEN
    -- Multi-word name: "John Smith" → "JS"
    string_agg(substring(word, 1, 1), '')
  ELSE
    -- Email fallback: "john@example.com" → "JO"
    upper(substring(u.email, 1, 2))
END
```

**Examples**:
- "John Smith" → "JS"
- "Madonna" → "M"
- NULL (email: "john@example.com") → "JO"

#### description

**Template**: `"[Full Name] marked [Milestone] [action] for [Component Identity] [Drawing]"`

**Components**:
1. **User name**: `users.full_name`
2. **Milestone name**: `milestone_events.milestone_name`
3. **Action**:
   - `value = 1` → "complete"
   - `value < 1` → "to {value}%"
4. **Previous value** (if exists): "(was {previous_value}%)"
5. **Component identity**: Type-specific formatting from `identity_key` JSONB
6. **Drawing**: "on Drawing {drawing_no_raw}" or "(no drawing assigned)"

**Example Outputs**:
- "John Smith marked Weld complete for Spool SP-001 on Drawing P-12345"
- "Jane Doe marked Fabricate to 85% (was 60%) for Field Weld FW-042 on Drawing P-67890"
- "Bob Jones marked Receive complete for Support CS-2 2IN (no drawing assigned)"

### Component Identity Formatting

**Logic**: CASE statement on `component_type` extracting appropriate JSONB fields

```sql
CASE c.component_type
  WHEN 'spool' THEN concat('Spool ', c.identity_key->>'spool_id')
  WHEN 'field_weld' THEN concat('Field Weld ', c.identity_key->>'weld_number')
  WHEN 'support' THEN concat('Support ',
                             c.identity_key->>'commodity_code', ' ',
                             c.identity_key->>'size')
  WHEN 'valve' THEN concat('Valve ', c.identity_key->>'tag_number')
  WHEN 'fitting' THEN concat('Fitting ', c.identity_key->>'fitting_id')
  WHEN 'flange' THEN concat('Flange ', c.identity_key->>'flange_id')
  WHEN 'instrument' THEN concat('Instrument ', c.identity_key->>'tag_number')
  WHEN 'tubing' THEN concat('Tubing ', c.identity_key->>'tubing_id')
  WHEN 'hose' THEN concat('Hose ', c.identity_key->>'hose_id')
  WHEN 'misc_component' THEN concat('Misc Component ', c.identity_key->>'component_id')
  WHEN 'threaded_pipe' THEN concat('Threaded Pipe ', c.identity_key->>'pipe_id')
  ELSE concat('Component ', c.id::text)  -- Fallback for unknown types
END
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Updates Milestone                       │
│  (via Components page or Drawing-Centered Component Table UI)  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│             RPC: update_component_milestone()                   │
│  • Locks component row                                          │
│  • Updates current_milestones JSONB                             │
│  • Recalculates percent_complete                                │
│  • Inserts into milestone_events table ◄─────────────────────┐  │
└───────────────────────────────┬─────────────────────────────────┘
                                │                                  │
                                ▼                                  │
┌─────────────────────────────────────────────────────────────────┐
│              milestone_events Table (Append-Only)               │
│  New row: {id, component_id, milestone_name, value,            │
│            previous_value, user_id, created_at}                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
┌────────────────────────────┐    ┌────────────────────────────┐
│  Supabase Realtime Event   │    │    vw_recent_activity      │
│   • Broadcasts INSERT      │    │  • View auto-updates       │
│   • Event type: INSERT     │    │  • No refresh needed       │
│   • Table: milestone_events│    │  • Joins 4 tables          │
└────────────┬───────────────┘    │  • Formats description     │
             │                    └────────────┬───────────────┘
             │                                 │
             ▼                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              Frontend: useAuditLog Hook                         │
│  • Receives Realtime event                                      │
│  • Invalidates TanStack Query cache                             │
│  • Refetches from vw_recent_activity (10 rows, <100ms)         │
│  • Returns ActivityItem[]                                       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              UI: ActivityFeed Component                         │
│  • Renders list of activities                                   │
│  • Shows user initials in avatar circle                         │
│  • Displays formatted description                               │
│  • Shows relative timestamp ("2 minutes ago")                   │
└─────────────────────────────────────────────────────────────────┘
```

## State Transitions

### Milestone Event States

Milestone events are **immutable** (append-only audit log). No state transitions occur after insertion.

**States**:
- **Created**: Event inserted into `milestone_events` table
- **Displayed**: Event visible in activity feed via view
- **Historical**: Event older than visible window (not deleted, just not in "last 10")

### Activity Feed Display States

**Empty State**:
- **Condition**: No milestone_events for selected project
- **Display**: "No recent activity" message

**Loading State**:
- **Condition**: Initial query or refetch in progress
- **Display**: Loading skeleton (handled by DashboardPage.tsx)

**Populated State**:
- **Condition**: 1-10 activities returned from view
- **Display**: List of activities in reverse chronological order

**Real-time Update Transition**:
```
User A updates milestone
  → milestone_events INSERT
  → Realtime broadcast
  → User B's dashboard: query invalidation
  → Refetch vw_recent_activity
  → New activity appears at top of feed

Timeline: <3 seconds from action to display
```

## Performance Characteristics

### Query Performance

**Target**: <100ms for 10 activities

**Optimization Strategy**:
1. **Indexed joins**:
   - `milestone_events(created_at DESC)` - sorts efficiently
   - `milestone_events(component_id)` - join to components
   - `components(project_id)` - filter by project
2. **LIMIT 10**: Prevents large scans
3. **LEFT JOIN drawings**: NULL drawings don't block query
4. **LATERAL unnest**: Computed per-row, no subquery needed

**Expected Explain Plan**:
```
Limit (10 rows)
  → Sort on milestone_events.created_at DESC
    → Hash Join (components on component_id)
      → Hash Join (users on user_id)
        → Hash Left Join (drawings on drawing_id)
          → Index Scan on milestone_events (project filter via components)
```

### Real-time Latency

**Target**: Activities appear within 3 seconds

**Breakdown**:
- Realtime broadcast: <500ms
- Query invalidation: <10ms
- View query execution: <100ms
- React render: <50ms
- **Total**: <1 second (well under 3-second target)

### Caching Strategy

**TanStack Query Configuration**:
- `staleTime: 30 * 1000` (30 seconds)
- **Behavior**: Prevents refetch if data <30 seconds old
- **Benefit**: Reduces server load during rapid navigation

**Cache Invalidation Triggers**:
1. User switches projects (different `project_id` query key)
2. Realtime event received (any milestone_events INSERT)
3. Manual refetch (user action)

## Security & Access Control

### Row Level Security (RLS)

**View Inherits RLS from Base Tables**:

1. **milestone_events**: No RLS policy exists, but component-level RLS applies
2. **components**: RLS filters by `organization_id` via projects table
3. **users**: RLS filters by organization membership
4. **drawings**: RLS filters by `organization_id` via projects table

**Effective Access Control**:
- Users see only activities for projects in their organization
- No additional RLS policy needed on view itself
- Multi-tenant isolation enforced at table level

### Permissions

**View Access**:
```sql
GRANT SELECT ON vw_recent_activity TO authenticated;
```

**Who Can Query**:
- All authenticated users in the organization
- Filtered automatically by project_id (which is org-scoped)

**Who Cannot Query**:
- Anonymous users (view requires authenticated role)
- Users from other organizations (RLS filters via project_id → organization_id)

## Validation Rules

### Data Integrity

1. **milestone_events.id** (PK): Must be unique UUID
2. **milestone_events.component_id** (FK): Must reference valid components.id
3. **milestone_events.user_id** (FK): Must reference valid users.id
4. **milestone_events.milestone_name**: Must match progress_templates.milestones_config
5. **milestone_events.value**: Must be NUMERIC(5,2) between 0.00 and 100.00

**Note**: All validation enforced by existing table constraints and RPC function. View is read-only.

### Display Constraints

1. **LIMIT 10**: Hard limit on activities per project
2. **ORDER BY timestamp DESC**: Newest first, no pagination
3. **Component type validation**: CASE statement handles unknown types with fallback

## Migration Strategy

### DDL Changes

**New Objects**:
- 1 VIEW: `vw_recent_activity`
- 1 GRANT: SELECT permission to authenticated role

**Modified Objects**:
- None (all base tables unchanged)

**Migration File**: `supabase/migrations/000XX_create_recent_activity_view.sql`

### Rollback Procedure

```sql
DROP VIEW IF EXISTS vw_recent_activity;
```

**Impact**: Activity feed shows "No recent activity" (graceful degradation). All underlying data preserved.

---

**Data Model Complete** | Ready for contract tests (Phase 1) and task generation (Phase 2)
