# PipeTrak V2 – Implementation Plan

**Version:** 1.0
**Date:** October 2025
**Status:** Ready for Development
**Methodology:** Spec-Driven Development (GitHub Spec Kit)

---

## Executive Summary

### Project Overview

PipeTrak V2 is a mobile-first progressive web application designed to replace paper and Excel-based progress tracking for brownfield industrial piping projects (<$20M).

**Core Value Propositions:**
- Reduce foreman admin time from 15-20 min/day to <3 min/day
- Provide PMs real-time test package readiness visibility (updates within 30s)
- Capture welder attribution at moment of production (accountability)
- Eliminate re-keying effort for project controls (direct digital updates)
- Enable data-driven turnover decisions (package readiness dashboards)

### Technology Stack

**Frontend:**
- React 18+ with TypeScript 5+
- Vite (build tool)
- Shadcn/ui + Radix UI (accessible component library)
- TanStack Virtual (table virtualization for 10k+ rows)
- TanStack Query (server state management)
- Zustand (client state management)
- Tailwind CSS (styling)
- Progressive Web App (PWA) for mobile

**Backend:**
- Supabase (Backend-as-a-Service)
  - PostgreSQL 15+ (relational database)
  - PostgREST (auto-generated REST API)
  - Realtime (WebSocket subscriptions)
  - Auth (email/password authentication)
  - Edge Functions (Deno runtime for custom logic)
  - Storage (file uploads for imports)
  - Row Level Security (RLS) for multi-tenancy

**Infrastructure:**
- Vercel (frontend hosting, edge network)
- Supabase Cloud (database, realtime, auth, storage)
- GitHub Actions (CI/CD)
- Sentry (error monitoring)
- PostHog (product analytics)

### Timeline & Phases

**Total Duration:** 14 weeks (MVP to pilot completion)

- Sprint 0: Infrastructure Setup (Week 1)
- Sprint 1: Core Foundation (Week 2)
- Sprint 2: Component Types & Milestones (Week 3)
- Sprint 3: Import Pipeline (Week 4)
- Sprint 4: Welder & Needs Review (Week 5)
- Sprint 5: Bulk Updates & Packages (Week 6)
- Sprint 6: Real-time & Performance (Week 7)
- Sprint 7: Mobile UI & Polish (Week 8)
- Pilot Execution: Weeks 9-12
- Evaluation & Iteration: Weeks 13-14

### Success Criteria (Pilot)

**Quantitative Metrics:**
- Foreman admin time reduced by ≥50% (target: ≥60%)
- North Star Metric (NSM): ≥60% of components updated within 48h
- Package readiness accuracy within 5% of physical walkdown
- Real-time sync latency: ≥90% of updates visible in ≤30s
- Performance: p90 action time <1s, p95 <2s
- Import success rate: ≥95% on first attempt
- Drawing similarity detection: ≥90% accuracy on duplicate/typo identification

**Qualitative Metrics:**
- PM satisfaction score ≥4/5 ("Better than Excel")
- Foreman adoption: WAU/MAU ≥60%
- QC feedback: Welder accountability "significantly improved"

**Go/No-Go Decision:**
- If ≥3 of 4 primary metrics met → proceed to scale
- If <3 met → iterate for 2 more weeks, then reassess
- Rollback plan: Continue Excel alongside PipeTrak if <2 metrics met

---

## Documentation Structure

This implementation plan has been organized into logical sections for easy navigation:

### 📋 01. Foundation
- **[Current State Assessment](./01-foundation/current-state.md)** - What exists, what's missing, Spec Kit alignment
- **[Architecture & Technology Stack](./01-foundation/architecture.md)** - System architecture, tech stack rationale, security design

### 🔧 02. Technical Design
- **[Database Schema Design](./02-technical-design/database-schema.md)** - 13 tables, indexes, RLS policies, materialized views, stored procedures
- **[API Layer & Business Logic](./02-technical-design/api-layer.md)** - PostgREST endpoints, Edge Functions, real-time subscriptions
- **[Frontend Architecture](./02-technical-design/frontend-architecture.md)** - Application structure, key features, PWA configuration
- **[Technical Challenges & Solutions](./02-technical-design/technical-challenges.md)** - 6 major challenges with detailed solutions

### 🚀 03. Sprint Breakdown
- **[Sprint 0: Infrastructure Setup](./03-sprints/sprint-0-infrastructure.md)** (Week 1) - ✅ **94% COMPLETE** (See `specs/001-do-you-see/`)
- **[Sprint 1: Core Foundation](./03-sprints/sprint-1-foundation.md)** (Week 2) - ⏳ **NEXT**
- **[Sprint 2: Component Types & Milestones](./03-sprints/sprint-2-components.md)** (Week 3)
- **[Sprint 3: Import Pipeline](./03-sprints/sprint-3-imports.md)** (Week 4)
- **[Sprint 4: Welder Management & Needs Review](./03-sprints/sprint-4-welder-review.md)** (Week 5)
- **[Sprint 5: Bulk Updates & Test Packages](./03-sprints/sprint-5-bulk-packages.md)** (Week 6)
- **[Sprint 6: Real-time Sync & Performance](./03-sprints/sprint-6-realtime.md)** (Week 7)
- **[Sprint 7: Mobile UI & Pilot Prep](./03-sprints/sprint-7-mobile-polish.md)** (Week 8)

### ⚙️ 04. Operations
- **[Performance & Scale Strategy](./04-operations/performance-strategy.md)** - Performance targets, optimization checklists, scale testing
- **[Testing Strategy](./04-operations/testing-strategy.md)** - TDD workflow, coverage requirements, test organization, CI/CD gates
- **[Risk Register & Mitigation](./04-operations/risk-register.md)** - Technical, product, and business risks with mitigation plans

### 🎯 05. Pilot
- **[Pilot Plan Integration](./05-pilot/pilot-plan.md)** - Pilot timeline, phases, success criteria, go/no-go criteria
- **[Post-MVP Roadmap](./05-pilot/post-mvp-roadmap.md)** - Pending clarifications, Phase 2 features, tech debt items

### 📚 Appendices
- **[References & Resources](./appendices/references.md)** - Glossary, tech stack summary, key references, team roles, success metrics

---

## Quick Start

1. **Approve this plan** (stakeholder sign-off)
2. **Install Spec Kit:** `uv tool install specify-cli`
3. **Initialize project:** `specify init PipeTrak_V2`
4. **Begin Sprint 0** (Infrastructure Setup)

---

## Questions?

See [References & Resources](./appendices/references.md) for key references or contact the Product Manager.
