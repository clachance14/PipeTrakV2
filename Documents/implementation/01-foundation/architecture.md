# Architecture & Technology Stack

## 3.1 Architecture Pattern: Jamstack + BaaS

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React SPA (TypeScript)                                   │  │
│  │  - Mobile PWA (iOS/Android home screen install)          │  │
│  │  - Desktop responsive (PM/QC workflows)                  │  │
│  │  - Offline-aware (show "Work Not Saved" warning)         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↕ HTTPS/WSS                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Supabase Client SDK                                      │  │
│  │  - Auth (session management)                             │  │
│  │  - Realtime (WebSocket subscriptions)                    │  │
│  │  - PostgREST queries (type-safe with generated types)    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE PLATFORM                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Auth Layer                                               │  │
│  │  - Email/password (no SSO for MVP)                       │  │
│  │  - JWT tokens (30-day refresh)                           │  │
│  │  - Row Level Security (RLS) policies                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Layer (PostgREST)                                    │  │
│  │  - Auto-generated REST API from PostgreSQL schema        │  │
│  │  - CRUD operations with RLS enforcement                  │  │
│  │  - Complex queries via stored procedures                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Edge Functions (Deno)                                    │  │
│  │  - Bulk update operations                                │  │
│  │  - Import validation & staging                           │  │
│  │  - Drawing similarity detection                          │  │
│  │  - ROC % calculation & caching                           │  │
│  │  - Needs Review auto-creation logic                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL 15 (Primary Database)                        │  │
│  │  - Multi-tenant with org_id partitioning                 │  │
│  │  - JSONB for flexible metadata                           │  │
│  │  - Full-text search (pg_trgm for drawing similarity)     │  │
│  │  - Materialized views for readiness dashboards           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Realtime (WebSocket Server)                             │  │
│  │  - Broadcast channel per project_id                      │  │
│  │  - Subscribe to milestone_events table changes           │  │
│  │  - Presence tracking (who's online)                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Storage (S3-compatible)                                  │  │
│  │  - Import files (Excel/CSV staging)                      │  │
│  │  - Error reports (downloadable CSV)                      │  │
│  │  - RLS-protected per organization                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 3.2 Why Supabase (vs Alternatives)

Comparison Matrix:

| Requirement              | Supabase | Firebase | Custom API | AWS Amplify |
|--------------------------|----------|----------|------------|-------------|
| Multi-tenant RLS         | ✅ Native | ❌ Manual | ⚠️ Custom  | ⚠️ Cognito  |
| Real-time (<30s)         | ✅ Native | ✅ Native | ❌ Custom  | ⚠️ AppSync  |
| PostgreSQL (relational)  | ✅ Yes    | ❌ NoSQL  | ✅ Yes     | ⚠️ RDS      |
| Type-safe client         | ✅ Yes    | ⚠️ Partial| ❌ No      | ⚠️ GraphQL  |
| Edge Functions           | ✅ Deno   | ✅ Node   | ❌ N/A     | ✅ Lambda   |
| Development velocity     | ✅ Fast   | ✅ Fast   | ❌ Slow    | ⚠️ Medium   |
| Scale (1M components)    | ✅ Yes    | ⚠️ $$    | ✅ Yes     | ✅ Yes      |
| Cost (MVP)               | ✅ $25/mo | ⚠️ $50+  | ❌ $200+   | ⚠️ $100+    |

**Decision:** Supabase wins on native RLS, PostgreSQL, real-time, and cost.

## 3.3 Frontend Stack Rationale

**React + TypeScript:**
- Industry standard, mature ecosystem
- TypeScript for type safety (critical for complex domain model)
- React 18 concurrent features for performance

**TanStack Virtual:**
- Renders only visible rows (10k+ components without lag)
- Benchmark: 100k rows at 60fps with proper memoization

**Shadcn/ui + Radix UI:**
- Accessible by default (WCAG AA compliance)
- Unstyled primitives (full design control)
- Tree-shakeable (small bundle size)

**TanStack Query:**
- Server state caching (reduce API calls)
- Optimistic updates (instant UI feedback)
- Automatic background refetch (30s polling for realtime fallback)

**Zustand:**
- Lightweight client state (<1KB)
- DevTools integration
- No Provider hell (unlike Context API)

**Progressive Web App (PWA):**
- Install to home screen (mobile UX)
- Service worker for offline detection (show "Work Not Saved")
- Push notifications ready (post-MVP)

## 3.4 Database Stack Rationale

**PostgreSQL 15:**
- ACID compliance (critical for audit trail)
- JSONB for flexible metadata (commodity codes, custom fields)
- Full-text search (pg_trgm extension for drawing similarity)
- Materialized views for aggregations (package readiness)
- Partitioning support (future: archive old projects)

**Why NOT MongoDB/NoSQL:**
- Relational integrity required (components → drawings → projects)
- Complex joins (package readiness = avg across components)
- ACID transactions (atomic bulk updates)

## 3.5 Security Architecture

### Row Level Security (RLS) Policies

```sql
-- Example: components table
CREATE POLICY "Users can view components in their org's projects"
ON components FOR SELECT
USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN organizations o ON p.org_id = o.id
    JOIN user_organizations uo ON uo.org_id = o.id
    WHERE uo.user_id = auth.uid()
  )
);

CREATE POLICY "Users with can_update_milestones can update components"
ON components FOR UPDATE
USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN organizations o ON p.org_id = o.id
    JOIN user_organizations uo ON uo.org_id = o.id
    JOIN user_capabilities uc ON uc.user_id = uo.user_id
    WHERE uo.user_id = auth.uid() AND uc.can_update_milestones = true
  )
);
```

### Authentication Flow

1. User logs in with email/password
2. Supabase Auth returns JWT (includes user_id in payload)
3. Frontend stores JWT in localStorage + memory
4. All API calls include JWT in Authorization header
5. PostgreSQL RLS uses auth.uid() to enforce policies
6. JWT expires after 1 hour, refresh token lasts 30 days

### Authorization Model

- System roles: Admin, Member
- Capability flags per user (can_update_milestones, can_import_weld_log, etc.)
- RLS policies check capabilities via JOIN to user_capabilities table
- Frontend shows/hides UI based on user.capabilities (fetched at login)
