14. APPENDICES

14.1 Glossary of Terms

AWP: Advanced Work Packaging (methodology for brownfield construction)
BaaS: Backend-as-a-Service (Supabase, Firebase, etc.)
Class-A Component: Strict unique identity (Spools, Welds, Instruments)
Class-B Component: Quantity-based, instantiated as discrete rows (Supports, Valves)
Discrete Milestone: Boolean toggle (complete/not complete)
Edge Function: Serverless function (Deno runtime on Supabase)
Hybrid Workflow: Combination of partial % and discrete milestones (Threaded Pipe)
Jamstack: JavaScript, APIs, Markup (static site architecture)
NSM: North Star Metric (% of components updated within 48h)
Partial Milestone: % entry (0-100%, for Threaded Pipe Fabricate/Install/Erect/etc.)
PWA: Progressive Web App (installable web app)
RLS: Row Level Security (PostgreSQL feature for multi-tenancy)
ROC: Rules of Credit (milestone weights per component type)
Supavisor: Supabase connection pooler (PgBouncer wrapper)

14.2 Technology Stack Summary

Layer               | Technology                  | Version  | Rationale
--------------------|-----------------------------|----------|---------------------------
Frontend Framework  | React                       | 18+      | Industry standard, mature
Language            | TypeScript                  | 5+       | Type safety for complex domain
Build Tool          | Vite                        | 5+       | Fast HMR, optimized builds
UI Library          | Shadcn/ui + Radix UI        | Latest   | Accessible, unstyled primitives
Styling             | Tailwind CSS                | 3+       | Utility-first, fast iteration
Table Virtualization| TanStack Virtual            | 3+       | 10k+ row performance
Server State        | TanStack Query              | 5+       | Caching, optimistic updates
Client State        | Zustand                     | 4+       | Lightweight, simple API
Routing             | React Router                | 6+       | Standard routing library
Forms               | React Hook Form + Zod       | Latest   | Validation, type safety
Backend Platform    | Supabase                    | Latest   | BaaS, PostgreSQL, Realtime
Database            | PostgreSQL                  | 15+      | Relational, ACID, full-text search
API Layer           | PostgREST + Edge Functions  | Latest   | Auto-generated + custom logic
Real-time           | Supabase Realtime           | Latest   | WebSocket subscriptions
Auth                | Supabase Auth               | Latest   | Email/password, JWT
Storage             | Supabase Storage            | Latest   | S3-compatible, RLS-protected
Hosting (Frontend)  | Vercel                      | Latest   | Edge network, auto-deploy
Hosting (Backend)   | Supabase Cloud              | Latest   | Managed PostgreSQL + services
CI/CD               | GitHub Actions              | Latest   | Lint, test, deploy
Error Monitoring    | Sentry                      | Latest   | Error tracking, performance
Analytics           | PostHog                     | Latest   | Product analytics, funnels

14.3 Key References

- Problem Analysis: Documents/Problem Analysis
- Business Logic: Documents/Business Logic
- User Stories: Documents/User Stories
- Rules of Credit: Documents/Rules of Credit
- Technical Reference: Documents/Technical Implementation Reference
- Supabase Docs: https://supabase.com/docs
- TanStack Virtual: https://tanstack.com/virtual
- TanStack Query: https://tanstack.com/query
- Shadcn/ui: https://ui.shadcn.com
- PostgreSQL pg_trgm: https://www.postgresql.org/docs/current/pgtrgm.html
- Spec Kit: https://github.com/github/spec-kit

14.4 Team Roles & Responsibilities

Role                     | Responsibilities
-------------------------|-------------------------------------------------------
Product Manager          | Define features, prioritize backlog, pilot planning
Tech Lead                | Architecture decisions, code review, sprint planning
Frontend Lead            | Component design, performance optimization, mobile UX
Backend Lead             | Database schema, Edge Functions, RLS policies
DevOps/Infra             | Supabase config, CI/CD, monitoring, security
Designer                 | Mobile UI design, accessibility, user testing
QA Engineer              | Test plans, load testing, pilot support

14.5 Communication & Ceremonies

Daily Standup: 15 min, async (Slack thread)
Sprint Planning: Monday Week 1 (2 hours)
Sprint Review: Friday Week 1 (1 hour, demo to stakeholders)
Sprint Retro: Friday Week 1 (30 min, team only)
Backlog Grooming: Wednesday (1 hour, PM + Tech Lead)
Pilot Kickoff: Week 9 Monday (30 min, with pilot users)
Pilot Weekly Check-in: Week 10-12 Fridays (15 min)
Pilot Retrospective: Week 12 Friday (1 hour)

14.6 Success Metrics Dashboard (Week 9-12)

Foreman Metrics:
- Admin time/day (target: ≤3 min)
- Bulk update time for 25 components (target: ≤90s)
- WAU/MAU (target: ≥60%)

PM Metrics:
- Package readiness accuracy (target: within 5% of walkdown)
- Satisfaction score (target: ≥4/5)
- Time to identify near-ready packages (target: <30s)

QC Metrics:
- Welder attribution capture rate (target: 100% of Weld Made events)
- Needs Review resolution time (target: ≤48h median)
- Welder verification backlog (target: ≤10 unverified)

Project Controls Metrics:
- Import success rate (target: ≥95% first attempt)
- Re-keying time/day (target: 0 hours)
- Drawing similarity detection accuracy (target: ≥90%)

System Metrics:
- Real-time sync latency (target: ≥90% ≤30s)
- Performance p90 (target: <1s)
- Error rate (target: <0.1%)
- Uptime (target: ≥99.5%)

═══════════════════════════════════════════════════════════════════════════════

CONCLUSION

This Implementation Plan provides a complete roadmap from infrastructure setup
to pilot completion. Key highlights:

✅ Technology Stack: React + TypeScript + Supabase (proven for scale, fast dev)
✅ Database Schema: 13 tables with RLS, indexes, materialized views (ready to implement)
✅ Sprint Breakdown: 8 weeks to MVP, 4 weeks pilot, 2 weeks iteration
✅ Technical Challenges: Solutions for virtualization, similarity detection, real-time sync
✅ Risk Mitigation: 10 identified risks with owners and mitigation plans
✅ Pilot Plan: Integrated 30-45 day pilot with clear go/no-go criteria

Next Steps:
1. Approve this plan (stakeholder sign-off)
2. Install Spec Kit: uv tool install specify-cli
3. Initialize project: specify init PipeTrak_V2
4. Begin Sprint 0 (Infrastructure Setup)

Questions? See Appendix 13.3 for key references or contact Product Manager.

═══════════════════════════════════════════════════════════════════════════════

END OF IMPLEMENTATION PLAN
