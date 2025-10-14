12. POST-MVP ROADMAP

12.1 Pending Clarifications (For Sprint 8+)

1. Threaded Pipe & Tubing ROC weights:
   - Confirm exact percentages so TOTAL = 100
   - Suggested: Fabricate 16%, Install 16%, Erect 16%, Connect 16%, Support 16%,
     Punch 5%, Test 10%, Restore 5%
   - Decision: Product Manager to confirm with field SMEs by end of Sprint 1

2. Test Package UI workflow:
   - Form fields for creation (name, description, target_date)?
   - Import CSV format (columns)?
   - Can components be reassigned between packages? Audit trail?
   - Decision: Defer to Sprint 8 (not critical for pilot)

3. Insulation & Paint identity keys:
   - Key structure: (project_id, drawing_norm, area_id?) or (segment_id?)
   - Import format (CSV columns)?
   - Total quantity tracking (unit: sq ft, lf)?
   - Decision: Defer to Sprint 9 (rare component types for pilot)

4. Weld repair workflow:
   - How is new weld number generated (e.g., original-R1, original-R2)?
   - Link to original weld in DB (repair lineage)?
   - Same drawing or new drawing?
   - Decision: Defer to Sprint 10 (edge case, can handle manually in pilot)

5. Area & System dictionary management:
   - UI workflow: Modal form or inline edit?
   - Import format (CSV)?
   - Can components be reassigned? Audit trail?
   - Decision: Defer to Sprint 8 (simple CRUD, low priority)

6. Drawing similarity threshold:
   - Confirm 85% threshold or make configurable per project?
   - Algorithm weights: prefix match, token overlap, Levenshtein?
   - Decision: Make configurable (Admin setting per project) in Sprint 8

7. Welder verification auto-flag threshold:
   - Confirm N=5 uses or make configurable?
   - Decision: Make configurable (default 5) in Sprint 4

12.2 Phase 2 Features (Post-Pilot)

Equipment Components (Pumps, Vessels, Exchangers):
- New component types with custom ROC templates
- Estimated effort: 2 weeks

Offline Mode (Full Sync):
- IndexedDB for local storage
- Sync on reconnect (conflict resolution)
- Estimated effort: 4 weeks

Weighted Rollups by Manhour/Material:
- Import manhour estimates per component
- Calculate weighted project % (not simple average)
- Estimated effort: 2 weeks

Email/SMS Notifications:
- Email digests (daily summary of Needs Review)
- SMS alerts for critical milestones (Weld Made, package ≥90%)
- Estimated effort: 1 week

Exports (CSV, PDF):
- Export components table (filtered view)
- Export package readiness report (PDF for client)
- Estimated effort: 1 week

Dashboard Metrics for PMs:
- Project velocity chart (components/day)
- Foreman productivity comparison
- Test package burndown chart
- Estimated effort: 2 weeks

Photo Attachments (X-ray, Test Reports):
- Upload photos per milestone (Weld Made, Test)
- Supabase Storage with RLS
- Estimated effort: 2 weeks

Welder Certification Tracking:
- Certification expiry dates
- Auto-flag expired certs (Needs Review)
- Estimated effort: 1 week

12.3 Tech Debt & Refactoring (Ongoing)

Sprint 8+:
- Refactor Edge Functions (split import-components into smaller modules)
- Add integration tests (Playwright for end-to-end flows)
- Improve type safety (stricter TypeScript configs)
- Add API documentation (Swagger/OpenAPI for Edge Functions)

Sprint 10+:
- Database partitioning (milestone_events by month)
- Archive old projects (move to cold storage after 1 year inactive)
- Security audit (penetration testing, OWASP Top 10)

═══════════════════════════════════════════════════════════════════════════════
