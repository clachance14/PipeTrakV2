11. PILOT PLAN INTEGRATION

11.1 Pilot Scope (from Problem Analysis doc)

Duration: 30-45 days (Weeks 9-12)
Scope: 1 active project, 3 foremen + 1 PM + 1 QC

11.2 Pilot Timeline

Week 9 (Setup & Onboarding):
□ Import project baseline (components + welds via Excel)
□ Validate clean import (fail-fast with row-level errors)
□ Create Test Packages (via UI or import)
□ Train foremen on mobile bulk updates + weld capture (30-min session)
□ Train QC on welder verification + Needs Review resolution (30-min session)
□ Train PM on package readiness view + Needs Review queue (30-min session)

Week 10-11 (Run & Measure):
□ Foremen use PipeTrak daily (instead of paper)
□ PM uses Test Package readiness view for turnover calls
□ QC verifies welders + resolves Needs Review items

Metrics to track:
- Time-to-update: Foreman bulk action ≤90s for 25 components
- Sync latency: % of updates visible in ≤30s
- NSM: % of components touched within 48h
- Needs Review backlog: Cleared ≤48h
- Import success rate: % on first attempt
- Drawing flags: % of similar drawing alerts correctly identify duplicates
- Welder capture: % of Weld Made events with welder attribution
- Performance: p90/p95 action times (via Sentry)

Week 12 (Evaluate):
□ Compare admin time before/after (foreman + project controls)
  - Before: 15-20 min/day (foreman), 2 hours/day (project controls)
  - After: ≤3 min/day (foreman), ≤30 min/day (project controls)
  - Target: ≥50% reduction
□ Sample 3 test packages: compare PipeTrak % complete vs client walkdown
  - Target: Within 5% accuracy
□ PM feedback interview: "Is this better than Excel?" (goal: yes)
□ Review Needs Review resolution times (goal: ≤48h median)
□ Identify UX friction points (session recordings, interviews)

11.3 Go/No-Go Decision Criteria

Success Thresholds:
✅ Admin time reduced by ≥50% (foreman + project controls)
✅ NSM ≥60% (components updated within 48h)
✅ Package accuracy within 5% of walkdown
✅ PM satisfaction score ≥4/5

Decision Matrix:
- If 4/4 met → GO (proceed to scale, onboard more projects)
- If 3/4 met → GO WITH CAUTION (iterate on failing metric, re-evaluate in 2 weeks)
- If 2/4 met → NO-GO (iterate for 2 more weeks, then re-pilot)
- If <2 met → PIVOT (major redesign or reconsider product-market fit)

Failure Handling:
- If adoption <40% → Investigate UX friction (interviews + session recordings)
- If performance p95 >3s → Optimize backend queries + frontend virtualization
- If import success <80% → Simplify template or add validation hints
- Rollback plan: Continue Excel alongside PipeTrak for 1-2 more weeks; iterate

11.4 Post-Pilot Iteration (Weeks 13-14)

Based on pilot feedback:
□ Fix top 3 UX friction points
□ Optimize performance bottlenecks (if any)
□ Clarify remaining items (Threaded Pipe weights, Test Package workflow, etc.)
□ Prepare for scale:
  - Onboard 2 more projects
  - Add customer support chat (Intercom or similar)
  - Create self-service onboarding flow

═══════════════════════════════════════════════════════════════════════════════
