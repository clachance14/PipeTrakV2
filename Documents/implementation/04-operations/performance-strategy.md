9. PERFORMANCE & SCALE STRATEGY

9.1 Performance Targets (Restated)

Action                          | p50      | p90      | p95      | p99
--------------------------------|----------|----------|----------|----------
Single milestone update         | <500ms   | <1s      | <2s      | <5s
Bulk update (25 components)     | <5s      | <10s     | <15s     | <30s
Component lookup (by ID)        | <50ms    | <100ms   | <200ms   | <500ms
Package readiness view (1k)     | <1s      | <2s      | <3s      | <5s
Import (1k rows)                | <30s     | <60s     | <90s     | <120s
Import (10k rows)               | <3m      | <5m      | <7m      | <10m
Global search (typeahead)       | <200ms   | <500ms   | <1s      | <2s
Real-time sync latency          | <2s      | <5s      | <30s     | <60s

9.2 Database Optimization Checklist

□ Indexes on all foreign keys (project_id, drawing_id, etc.)
□ Composite indexes for common queries:
  - (project_id, component_type)
  - (project_id, test_package_id)
  - (project_id, last_updated_at DESC)
□ GIN indexes for JSONB columns (identity_key, attributes)
□ Trigram index for drawing similarity (drawing_no_norm)
□ Partial indexes for active data (WHERE NOT is_retired)
□ Materialized views for aggregations (mv_package_readiness, mv_drawing_progress)
□ Materialized view refresh: CONCURRENTLY every 60s
□ Connection pooling: Supabase Supavisor (max 100 connections)
□ Query timeout: 5s (prevent runaway queries)
□ Analyze statistics: ANALYZE after bulk imports

9.3 Frontend Optimization Checklist

□ Code splitting: Lazy load routes (React.lazy)
□ Bundle size: <500KB initial JS (use Vite bundle analyzer)
□ Image optimization: WebP format, lazy loading
□ Virtualized lists: TanStack Virtual for tables
□ Memoization: useMemo for expensive calculations (ROC %, similarity scores)
□ Debounce: Search input (300ms), filters (500ms)
□ Optimistic updates: Update UI before API response
□ Cache: TanStack Query (5-minute stale time for static data)
□ Service worker: Cache static assets (PWA)
□ CDN: Vercel Edge Network (global latency <100ms)

9.4 Scale Testing Plan

Scenario 1: 1M components, single project
- Seed 1M components (100k Spools, 200k Welds, 700k Supports/Valves/Fittings)
- Test queries:
  - Component lookup by ID: <100ms (indexed)
  - Filter by test_package_id: <500ms (indexed)
  - Package readiness view: <2s (materialized view)
- Expected database size: ~5GB (components table + indexes)

Scenario 2: 50 concurrent users
- Simulate 50 users (k6 script):
  - 25 foremen updating milestones (1 update/min)
  - 15 PMs viewing package readiness (1 refresh/min)
  - 10 QC reviewing Needs Review queue (1 action/2min)
- Target: p95 latency <2s for all actions
- Monitor: Supabase dashboard (CPU, memory, connections)

Scenario 3: Bulk import stress test
- Import 10k components in single file
- Target: <5m total time
- Monitor: Edge Function timeout (default 25s → increase to 300s for imports)

9.5 Monitoring & Alerting

Metrics to track:
- Error rate (Sentry): <0.1% of requests
- p95 latency (Sentry): <2s for critical actions
- Real-time sync latency (custom metric): ≥90% <30s
- Database connections (Supabase): <80% of pool size
- Database query time (Supabase): p95 <200ms
- Failed imports (custom metric): <5% of total imports

Alerts:
- Error rate >1% (last 5 min) → Slack alert
- p95 latency >5s (last 5 min) → Slack alert
- Database CPU >80% (last 5 min) → Email alert
- Failed import rate >10% (last hour) → Slack alert

═══════════════════════════════════════════════════════════════════════════════
