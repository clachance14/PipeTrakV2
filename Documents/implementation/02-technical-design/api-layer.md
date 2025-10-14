5. API LAYER & BUSINESS LOGIC

5.1 API Architecture

Three-tier approach:
1. PostgREST (auto-generated CRUD for simple operations)
2. Stored Procedures (complex queries, aggregations)
3. Edge Functions (business logic, imports, validations)

──────────────────────────────────────────────────────────────────────────────
TIER 1: PostgREST Endpoints (Auto-Generated)
──────────────────────────────────────────────────────────────────────────────

GET /components?project_id=eq.{uuid}&select=*,drawing(*),area(*),system(*)
  → List components with joins (RLS enforced)

GET /components?id=eq.{uuid}&select=*
  → Single component lookup

PATCH /components?id=eq.{uuid}
  Body: {"current_milestones": {"Receive": true, "Erect": true}}
  → Update milestones (trigger auto-updates percent_complete)

GET /test_packages?project_id=eq.{uuid}
  → List packages

GET /mv_package_readiness?project_id=eq.{uuid}
  → Package readiness dashboard (fast materialized view)

POST /welders
  Body: {"project_id": "uuid", "name": "John Doe", "stencil": "JD42"}
  → Add welder (auto-normalizes stencil)

GET /needs_review?project_id=eq.{uuid}&status=eq.pending
  → Needs Review queue

──────────────────────────────────────────────────────────────────────────────
TIER 2: Stored Procedures (Complex Queries)
──────────────────────────────────────────────────────────────────────────────

POST /rpc/calculate_component_percent
  Body: {"p_component_id": "uuid"}
  → Returns percent_complete (for debugging)

POST /rpc/detect_similar_drawings
  Body: {"p_project_id": "uuid", "p_drawing_no_norm": "P-001"}
  → Returns top 3 similar drawings

POST /rpc/get_component_audit_trail
  Body: {"p_component_id": "uuid"}
  → Returns full audit history for component

──────────────────────────────────────────────────────────────────────────────
TIER 3: Edge Functions (Business Logic)
──────────────────────────────────────────────────────────────────────────────

POST /functions/v1/bulk-update-milestones
  Body: {
    "component_ids": ["uuid1", "uuid2", ...],
    "milestone_name": "Punch",
    "action": "complete",
    "user_id": "uuid"
  }
  → Validates compatibility (intersection logic)
  → Updates components in transaction
  → Creates milestone_events + audit_log entries
  → Returns summary: {"updated": 25, "skipped": 0, "flagged": 2}

POST /functions/v1/import-components
  Body: FormData with Excel/CSV file
  → Validates file format (fail-fast)
  → Normalizes drawing numbers
  → Detects duplicates (Class-A) or deltas (Class-B)
  → Creates Needs Review entries (similar drawings, deltas)
  → Stages components in temp table
  → Commits on success, rollback on error
  → Returns: {"success": true, "imported": 1000, "reviews_created": 5}
    OR: {"success": false, "errors": [{"row": 42, "field": "spool_id", "reason": "Duplicate"}]}

POST /functions/v1/resolve-needs-review
  Body: {
    "review_id": "uuid",
    "action": "approve" | "reject",
    "note": "Confirmed new drawing",
    "user_id": "uuid"
  }
  → Applies resolution logic (e.g., merge drawings, add instances)
  → Updates needs_review.status = 'resolved'
  → Logs to audit_log
  → Returns updated entities

POST /functions/v1/update-weld-made
  Body: {
    "component_id": "uuid",
    "welder_id": "uuid" | null,
    "new_welder": {"name": "John Doe", "stencil": "JD42"} | null,
    "user_id": "uuid"
  }
  → Creates welder if new (status=unverified)
  → Updates component.current_milestones.Weld Made = true
  → Creates milestone_event with welder metadata
  → Checks if welder usage > threshold → create Needs Review: Verify Welder
  → Returns: {"success": true, "welder_id": "uuid", "percent_complete": 70.00}

5.2 Real-time Subscriptions (Supabase Realtime)

──────────────────────────────────────────────────────────────────────────────
CHANNEL: project:{project_id}
──────────────────────────────────────────────────────────────────────────────

Client subscribes to:
  supabase
    .channel(`project:${projectId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'components',
      filter: `project_id=eq.${projectId}`
    }, payload => {
      // Update local state with new component data
      updateComponentInStore(payload.new)
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'milestone_events',
      filter: `component_id=in.(${componentIds.join(',')})`
    }, payload => {
      // Refresh component to get updated percent_complete
      refetchComponent(payload.new.component_id)
    })
    .subscribe()

Performance:
- WebSocket connection per project
- Broadcast to all subscribed clients within ~1-5s
- Fallback: TanStack Query polling every 30s if WebSocket disconnects

5.3 Offline Handling (No Offline Mode, but Graceful Degradation)

Strategy:
- Show sticky "Work Not Saved" banner when navigator.onLine = false
- Queue failed mutations in memory (max 50 actions)
- Retry queue when connection restored
- Drop queue on app close (no persistence)

Implementation (TanStack Query):
  const updateMilestone = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase
        .from('components')
        .update({ current_milestones: data.milestones })
        .eq('id', data.componentId)
      if (error) throw error
    },
    onError: (error) => {
      if (!navigator.onLine) {
        addToRetryQueue(mutationFn, variables)
        showWorkNotSavedBanner()
      } else {
        showErrorToast(error.message)
      }
    }
  })

═══════════════════════════════════════════════════════════════════════════════
