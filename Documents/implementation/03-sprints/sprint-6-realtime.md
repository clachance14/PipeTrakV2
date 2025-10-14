7.7 Sprint 6: Real-time Sync & Performance (Week 7)

Duration: 5 days
Team: 2 Full-stack Developers

GOALS:
- Implement Supabase Realtime subscriptions
- Optimize query performance (p90 <1s)
- Optimize bulk update performance
- Load testing (1M components, 50 concurrent users)

TASKS (TDD ORDER - Tests First):

**Phase 1: Write Integration Tests (MUST FAIL initially)**
□ Write tests for real-time subscriptions:
  - Test: Component update broadcasts to subscribed clients
  - Test: Milestone_events subscription triggers notification
  - Test: Local cache updates on broadcast
  - Test: Fallback polling works when WebSocket disconnected
  - Test: Reconnection resumes realtime subscription
□ Write tests for retry queue:
  - Test: Queues failed requests when offline
  - Test: Shows "Work Not Saved" banner when queue not empty
  - Test: Retries all queued requests on reconnect
  - Test: Drops queue on app close
  - Test: Max queue size (50 actions)

**Phase 2: Write Performance Tests**
□ Write load tests (k6 or Artillery scripts):
  - Test: 1M components seeded across 10 projects
  - Test: 50 concurrent users updating milestones simultaneously
  - Test: p50/p90/p95 latencies for milestone update
  - Test: Component lookup with 1M components <100ms
  - Test: Bulk update 50 components <10s
  - Test: No degradation under load (latency stable)
□ Write sync latency tests:
  - Test: User A updates component → User B sees update in ≤30s
  - Test: ≥90% of updates visible in ≤30s (statistical measurement)

**Phase 3: Optimization & Implementation**
□ Implement real-time subscriptions:
  - Subscribe to components table changes (per project_id)
  - Subscribe to milestone_events (for notifications)
  - Update local cache on broadcast
  - Fallback: 30s polling if WebSocket disconnects
□ Measure sync latency (run tests):
  - User A updates component on mobile
  - User B sees update on desktop within 30s
  - Target: ≥90% of updates visible in ≤30s
□ Optimize database queries:
  - Add missing indexes (analyze EXPLAIN ANALYZE output)
  - Optimize materialized view refresh (incremental update?)
  - Add database query timeout (5s)
□ Optimize Edge Functions:
  - Batch inserts (bulk-update-milestones: use single INSERT statement)
  - Connection pooling (Supabase Supavisor)
  - Reduce round trips (use stored procedures for complex logic)
□ Run load testing:
  - Seed 1M components across 10 projects
  - Simulate 50 concurrent users (k6 or Artillery)
  - Measure p50/p90/p95 latencies
  - Target: p90 <1s for milestone update, p95 <2s
□ Implement retry queue for offline:
  - Zustand store: retryQueueStore
  - Show "Work Not Saved" banner
  - Retry all on reconnect
  - Drop queue on app close
□ Add performance monitoring:
  - Sentry (error tracking + performance)
  - PostHog (user actions, funnel analysis)

DELIVERABLES:
✅ Real-time sync working (≤30s latency)
✅ Performance optimized (p90 <1s)
✅ Load test passed (1M components, 50 users)
✅ Retry queue functional
✅ All realtime and performance tests passing

ACCEPTANCE CRITERIA:
- Foreman updates component on mobile → PM sees update on desktop in <30s (verified in tests)
- p90 milestone update <1s, p95 <2s (measured via Sentry and load tests)
- Bulk update 50 components <10s (verified in performance tests)
- 1M components: component lookup <100ms (verified in load tests)
- 50 concurrent users: no degradation (verified in load tests)

CONSTITUTION COMPLIANCE (v1.0.0):
- ✅ I. Type Safety First: Realtime subscription types match Supabase generated types
- ✅ II. Component-Driven: Retry queue uses Zustand for client state
- ✅ III. Testing Discipline: Load tests verify performance targets, integration tests for realtime
- ✅ IV. Supabase Integration: Realtime subscriptions clean up on unmount
- ✅ V. Specify Workflow: Performance benchmarks validated before optimization

──────────────────────────────────────────────────────────────────────────────
