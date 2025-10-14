10. RISK REGISTER & MITIGATION

10.1 Technical Risks

┌─────────────────────────────────────────────────────────────────────────────┐
│ RISK: Performance degrades with 1M components                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ Probability: Medium                                                          │
│ Impact: High (user churn if slow)                                           │
│ Mitigation:                                                                  │
│ - Load test early (Sprint 6)                                                │
│ - Optimize indexes based on query patterns                                  │
│ - Use materialized views for aggregations                                   │
│ - Partition milestone_events by month (if >1M events)                       │
│ - Fallback: Pagination (if virtualization insufficient)                     │
│ Owner: Tech Lead                                                             │
│ Status: Monitoring                                                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ RISK: Import validation too complex (fails on real-world data)              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Probability: High                                                            │
│ Impact: High (pilot blockers)                                               │
│ Mitigation:                                                                  │
│ - Test with actual client Excel files (Sprint 3)                            │
│ - Simplify normalization rules (make configurable)                          │
│ - Provide "Import Validator" tool (preview errors before upload)            │
│ - Manual override: Admin can force-import with warnings                     │
│ Owner: Backend Lead                                                          │
│ Status: Active (Sprint 3)                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ RISK: Drawing similarity detection has false positives                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Probability: Medium                                                          │
│ Impact: Medium (annoying, not blocking)                                     │
│ Mitigation:                                                                  │
│ - Tune similarity threshold (default 85%, make configurable)                │
│ - Allow users to "Ignore" similar drawing alerts                            │
│ - Auto-dismiss after 48h (attach to new drawing)                            │
│ - Track false positive rate (analytics)                                     │
│ Owner: Product Manager                                                       │
│ Status: Monitoring                                                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ RISK: Real-time sync fails on slow networks                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ Probability: Medium                                                          │
│ Impact: Medium (foreman frustration)                                        │
│ Mitigation:                                                                  │
│ - Fallback to 30s polling (always enabled)                                  │
│ - Show "Work Not Saved" banner immediately                                  │
│ - Retry queue (max 50 actions)                                              │
│ - Network health indicator (green/yellow/red)                               │
│ Owner: Frontend Lead                                                         │
│ Status: Implemented (Sprint 6)                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ RISK: Supabase RLS policies misconfigured (data leak)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ Probability: Low                                                             │
│ Impact: Critical (regulatory compliance)                                     │
│ Mitigation:                                                                  │
│ - Test RLS policies with 2+ test orgs (Sprint 1)                            │
│ - Automated RLS tests in CI (verify cross-org isolation)                    │
│ - Manual security audit before production deploy                            │
│ - Enable Supabase audit logs (track all RLS bypasses)                       │
│ Owner: Security Lead / Tech Lead                                             │
│ Status: Active (Sprint 1)                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

10.2 Product Risks

┌─────────────────────────────────────────────────────────────────────────────┐
│ RISK: Foremen don't adopt (prefer paper)                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Probability: Medium                                                          │
│ Impact: Critical (pilot failure)                                             │
│ Mitigation:                                                                  │
│ - Mobile-first design (optimized for field use)                             │
│ - 5-minute training video (not 30-page manual)                              │
│ - Incentivize adoption (PM recognizes top users)                            │
│ - Show time savings (dashboard: "You saved 2 hours this week!")             │
│ - Run Excel alongside for first 2 weeks (safety net)                        │
│ Owner: Product Manager                                                       │
│ Status: Monitoring (Pilot)                                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ RISK: PM doesn't trust package readiness % (vs walkdown)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Probability: Medium                                                          │
│ Impact: High (value prop fails)                                             │
│ Mitigation:                                                                  │
│ - Pilot validation: Sample 3 packages, compare PipeTrak % vs walkdown       │
│ - Target: Within 5% accuracy                                                │
│ - Show "Last updated" timestamp (PM knows data is fresh)                    │
│ - Highlight blockers (Needs Review items) to explain discrepancies          │
│ Owner: Product Manager                                                       │
│ Status: Active (Pilot Week 5)                                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ RISK: Import errors too frequent (>5% fail rate)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ Probability: High                                                            │
│ Impact: Medium (project controls frustration)                               │
│ Mitigation:                                                                  │
│ - Provide "Import Validator" (dry-run mode, show errors before upload)      │
│ - Simplify Excel template (fewer required fields)                           │
│ - Auto-fix common issues (e.g., trim whitespace, UPPERCASE)                 │
│ - Help text in template (tooltip per column)                                │
│ - Support call: Screen-share to debug import issues                         │
│ Owner: Product Manager                                                       │
│ Status: Active (Sprint 3)                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

10.3 Business Risks

┌─────────────────────────────────────────────────────────────────────────────┐
│ RISK: Pilot project goes offline (client decision, weather, etc.)           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Probability: Low                                                             │
│ Impact: High (no data for evaluation)                                       │
│ Mitigation:                                                                  │
│ - Identify backup pilot project (same client or different)                  │
│ - Run pilot for 6 weeks (not 4) to buffer for disruptions                   │
│ Owner: Product Manager                                                       │
│ Status: Monitoring                                                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ RISK: Threaded Pipe weights still unconfirmed (blocks Sprint 2)             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Probability: Medium                                                          │
│ Impact: Low (workaround: use default template)                              │
│ Mitigation:                                                                  │
│ - Use suggested weights (Fabricate 16%, Install 16%, etc.)                  │
│ - Make configurable (Admin can override per project)                        │
│ - Defer Threaded Pipe to post-MVP if unresolved by Sprint 2                 │
│ Owner: Product Manager                                                       │
│ Status: Awaiting stakeholder input                                           │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
