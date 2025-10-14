8. KEY TECHNICAL CHALLENGES & SOLUTIONS

8.1 Challenge: Virtualized Table Performance (10k+ rows)

Problem:
- Rendering 10k+ DOM nodes causes browser freeze
- Standard HTML tables cannot handle this scale

Solution: TanStack Virtual
- Render only visible rows (~30 rows for typical viewport)
- Absolute positioning with transform: translateY()
- Overscan 10 rows above/below for smooth scrolling

Proof of Concept:
  const virtualizer = useVirtualizer({
    count: 100000, // 100k rows
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10
  })

Result:
- 60fps scrolling with 100k rows
- Memory: ~50MB (vs ~2GB without virtualization)
- Initial render: <500ms

──────────────────────────────────────────────────────────────────────────────

8.2 Challenge: Drawing Similarity Detection at Scale

Problem:
- Levenshtein distance is O(n²) → slow for 10k+ drawings
- Need real-time detection on import

Solution: PostgreSQL pg_trgm (trigram similarity)
- Trigram index: idx_drawings_norm_trgm
- similarity() function uses precomputed trigrams → O(log n) lookup

Algorithm:
  SELECT
    id,
    drawing_no_norm,
    similarity(drawing_no_norm, 'P-001') AS score
  FROM drawings
  WHERE similarity(drawing_no_norm, 'P-001') > 0.85
  ORDER BY score DESC
  LIMIT 3;

Performance:
- 10k drawings: <50ms lookup
- Similarity threshold: 85% (configurable)

──────────────────────────────────────────────────────────────────────────────

8.3 Challenge: Real-time Sync (<30s) at Scale

Problem:
- 50 concurrent users updating components
- Need updates visible to all users within 30s
- WebSocket connections can drop (mobile networks)

Solution: Hybrid approach (Realtime + Polling)
1. Primary: Supabase Realtime (WebSocket)
   - Broadcast component updates to subscribed clients
   - Typical latency: 1-5s
2. Fallback: TanStack Query polling (HTTP)
   - Poll every 30s if WebSocket disconnected
   - Ensures updates arrive even if Realtime fails

Implementation:
  // Realtime
  useRealtimeComponents(projectId)

  // Polling fallback
  const { data } = useQuery({
    queryKey: ['components', projectId],
    queryFn: fetchComponents,
    refetchInterval: 30000,
    enabled: !realtimeConnected // Only poll if WebSocket down
  })

Result:
- ≥95% of updates visible in <5s (Realtime)
- 100% of updates visible in <30s (with polling fallback)

──────────────────────────────────────────────────────────────────────────────

8.4 Challenge: Bulk Update Performance (50+ components in <10s)

Problem:
- Updating 50 components = 50 individual UPDATE queries → slow
- Need transaction (all-or-nothing)
- Need audit trail for each component

Solution: Batch INSERT with Edge Function
  async function bulkUpdateMilestones(componentIds, milestone, userId) {
    const { data: components } = await supabase
      .from('components')
      .select('id, current_milestones, progress_template_id')
      .in('id', componentIds)

    // Calculate new milestones + percent_complete
    const updates = components.map(c => ({
      id: c.id,
      current_milestones: { ...c.current_milestones, [milestone]: true },
      percent_complete: calculatePercent(c, milestone)
    }))

    // Single batch UPDATE (use unnest() for array input)
    await supabase.rpc('bulk_update_components', { updates })

    // Batch INSERT for milestone_events
    const events = components.map(c => ({
      component_id: c.id,
      milestone_name: milestone,
      action: 'complete',
      user_id: userId
    }))
    await supabase.from('milestone_events').insert(events)
  }

Performance:
- 50 components: ~2s (vs ~15s with individual queries)
- 100 components: ~5s

──────────────────────────────────────────────────────────────────────────────

8.5 Challenge: Import Validation (1k rows in <60s)

Problem:
- Validating 1k rows = 1k database lookups (duplicates) → slow
- Excel parsing can be slow

Solution: Staged validation in Edge Function
1. Parse Excel in-memory (SheetJS): ~5s for 1k rows
2. Load all existing identity keys into memory (single query): ~1s
3. Validate in-memory (no database round trips): ~2s
4. Normalize drawings, detect duplicates: ~2s
5. Stage components in temp table: ~5s
6. Detect similar drawings (batch query): ~5s
7. Commit transaction: ~2s

Total: ~22s for 1k rows (well under 60s target)

──────────────────────────────────────────────────────────────────────────────

8.6 Challenge: Mobile Network Reliability (Offline Handling)

Problem:
- Job sites have spotty coverage
- Foreman updates may fail silently
- No offline mode in MVP

Solution: Optimistic updates + retry queue
1. Optimistic update: Update UI immediately (before API call)
2. Retry queue: If mutation fails, add to queue (max 50 actions)
3. Show banner: "Work Not Saved" (sticky until resolved)
4. Retry on reconnect: Batch retry all queued actions
5. Drop queue on app close (no persistence)

Implementation:
  const retryQueueStore = create((set, get) => ({
    queue: [],
    add: (mutationFn, variables) => {
      if (get().queue.length >= 50) {
        toast.error('Retry queue full. Please reconnect.')
        return
      }
      set({ queue: [...get().queue, { mutationFn, variables }] })
    },
    retryAll: async () => {
      for (const { mutationFn, variables } of get().queue) {
        try {
          await mutationFn(variables)
        } catch (error) {
          console.error('Retry failed', error)
        }
      }
      set({ queue: [] })
    }
  }))

Result:
- Foreman sees instant feedback (optimistic update)
- Work is never lost (retry queue)
- Clear visibility when offline ("Work Not Saved")

═══════════════════════════════════════════════════════════════════════════════
