# Implementation Plan: One-Click Demo Access

**Branch**: `031-one-click-demo-access` | **Date**: 2025-11-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/031-one-click-demo-access/spec.md`

## Summary

Transform the demo signup flow from email verification to instant access. Users enter contact info (lead capture for marketing), are auto-logged into a shared `demo@pipetrak.com` account, and land on a pre-populated dashboard. Demo data resets nightly from a baseline snapshot of the 1605 project.

**Technical Approach**: Token-based auto-login via Supabase edge function (no password exposure in client), new `demo_leads` table for marketing, pg_cron for nightly reset from JSONB baseline snapshot.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), React 18, PostgreSQL 15+ (Supabase)
**Primary Dependencies**: Supabase Auth, TanStack Query, Zustand, Radix UI, Tailwind CSS
**Storage**: Supabase PostgreSQL with RLS
**Testing**: Vitest, Testing Library, jsdom
**Target Platform**: Web (desktop + mobile responsive, 1024px breakpoint)
**Project Type**: Web SPA with Supabase Edge Functions backend
**Performance Goals**: Demo access flow <10 seconds, 100 concurrent users without degradation
**Constraints**: No password exposure in client code, nightly reset at midnight UTC
**Scale/Scope**: Single shared demo account, ~200 components imported from 1605 project

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Type Safety (Principle I):**
- [x] TypeScript strict mode enabled (`strict: true`)
- [x] No type assertions (`as` keyword) without justification
- [x] `noUncheckedIndexedAccess: true` enforced
- [x] Path aliases (`@/*`) used for cross-directory imports
- [x] Database types auto-generated from Supabase schema

**Component-Driven Development (Principle II):**
- [x] UI components use shadcn/ui and Radix UI primitives
- [x] Single responsibility composition verified
- [x] TanStack Query for server state, Zustand for client state

**Testing Discipline (Principle III):**
- [x] TDD workflow planned (Red-Green-Refactor)
- [x] Integration tests cover spec acceptance scenarios
- [x] Hotfix test debt tracking (if applicable) - N/A

**Supabase Integration (Principle IV):**
- [x] RLS enabled on all new tables (`demo_leads`, `demo_baseline`)
- [x] RLS patterns remain multi-tenant-safe (service role only for demo tables)
- [x] TanStack Query wraps all Supabase calls
- [x] AuthContext used for auth state (no direct component access)

**Specify Workflow (Principle V):**
- [x] Feature documented in `specs/031-one-click-demo-access/` directory
- [x] Constitution gates verified before planning
- [x] Tasks ordered with tests before implementation

**Migration Rules (Principle VI):**
- [x] New sequential migration planned (if schema changes) - 3 migrations
- [x] Migration idempotency verified or marked irreversible
- [x] RLS rules updated in same migration as table changes
- [x] Data migration reversibility documented (if applicable) - N/A new tables
- [x] TypeScript types regeneration planned
- [x] Backward-compatibility notes documented - N/A new feature

**Performance Standards (Principle VII):**
- [x] Table rendering target <100ms for 10k rows - N/A no new tables rendered
- [x] Database query index strategy documented
- [x] No `select *` in production code
- [x] TanStack Query pagination/virtualization planned - N/A

**UI Standards (Principle VIII):**
- [x] Mobile layout planned (1024px breakpoint)
- [x] Touch targets ≥44px (WCAG 2.1 AA)
- [x] Keyboard accessibility planned (Tab, Enter, Escape)
- [x] shadcn/ui and Radix patterns followed
- [x] No inline styles (Tailwind CSS only)

**Test Coverage (Principle IX):**
- [x] Unit tests planned for business logic
- [x] Integration tests planned for data flow
- [x] At least one acceptance test per spec scenario
- [x] Coverage targets verified (≥70% overall, ≥80% lib, ≥60% components)

## Project Structure

### Documentation (this feature)

```text
specs/031-one-click-demo-access/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output (manual setup guide)
├── contracts/           # Phase 1 output
│   └── demo-access.md   # Edge function contract
├── checklists/
│   └── requirements.md  # Quality validation
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── demo/
│       ├── DemoModeBanner.tsx        # NEW: Persistent banner for demo users
│       └── DemoLoadingTransition.tsx # NEW: Loading overlay during login
├── hooks/
│   └── useDemoAccess.ts              # NEW: Lead capture + auto-login hook
├── pages/
│   └── DemoSignupPage.tsx            # MODIFY: Use new auto-login flow
└── contexts/
    └── AuthContext.tsx               # READ ONLY: Use existing auth

supabase/
├── functions/
│   └── demo-access/
│       └── index.ts                  # NEW: Lead capture + token generation
└── migrations/
    ├── XXXXXX_create_demo_leads_table.sql
    ├── XXXXXX_create_demo_baseline_system.sql
    └── XXXXXX_setup_demo_reset_cron.sql
```

**Structure Decision**: Web SPA structure with Supabase Edge Functions. New components in `src/components/demo/`, new hook in `src/hooks/`, new edge function in `supabase/functions/demo-access/`.

## Complexity Tracking

No constitution violations requiring justification.

---

# Phase 0: Research

## Decisions Made During Planning

### 1. Auto-Login Strategy

**Decision**: Token-based login via Supabase admin API (magic link generation + immediate verification)

**Rationale**:
- Never exposes demo password in client code
- Uses existing Supabase auth patterns
- Tokens are short-lived and single-use
- More secure than hardcoding password

**Alternatives Rejected**:
- Direct password auth: Exposes credentials in client bundle
- Service account with API key: Requires additional infrastructure

### 2. Demo Data Population

**Decision**: Manual import from 1605 project with baseline snapshot capture

**Rationale**:
- Real project data provides authentic demo experience
- User controls exactly what data is shown
- Baseline snapshot enables reliable nightly restoration

**Alternatives Rejected**:
- Auto-generated data: Less realistic, doesn't showcase actual workflows
- Database clone: Complex, requires production access

### 3. Nightly Reset Mechanism

**Decision**: pg_cron job calling `reset_demo_data()` RPC function that restores from JSONB snapshot

**Rationale**:
- Database-level execution (reliable, no external dependencies)
- JSONB snapshot captures exact state including all relationships
- Transactional (all-or-nothing reset)

**Alternatives Rejected**:
- Edge function trigger: External dependency, could fail silently
- Manual reset: Unreliable, human-dependent

### 4. Rate Limiting

**Decision**: Reuse existing `rate_limit_events` table pattern from `demo-signup` edge function

**Rationale**:
- Proven pattern already in codebase
- Consistent with existing security practices
- No new infrastructure needed

---

# Phase 1: Design & Contracts

## Data Model

See [data-model.md](./data-model.md) for complete entity definitions.

### New Tables

| Table | Purpose | RLS Policy |
|-------|---------|------------|
| `demo_leads` | Marketing lead capture | Service role only (no client access) |
| `demo_baseline` | Snapshot for nightly reset | Service role only (no client access) |

### New Functions

| Function | Purpose | Security |
|----------|---------|----------|
| `capture_demo_baseline(project_id)` | Saves current demo state as JSONB | SECURITY DEFINER |
| `reset_demo_data(project_id)` | Restores demo from baseline | SECURITY DEFINER |

## API Contract

See [contracts/demo-access.md](./contracts/demo-access.md) for complete specification.

### Edge Function: `demo-access`

**Endpoint**: `POST /functions/v1/demo-access`

**Request**:
```json
{
  "email": "user@example.com",
  "full_name": "John Doe"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "session": {
    "access_token": "eyJ...",
    "refresh_token": "abc..."
  }
}
```

**Response (Rate Limited)**:
```json
{
  "success": false,
  "error": "rate_limit_exceeded",
  "retry_after": 3600
}
```

---

# Your Responsibilities: Manual Setup Guide

**IMPORTANT**: The following steps must be completed by you (the project owner) after the automated implementation is deployed.

## Step 1: Deploy Migrations and Edge Function

After implementation is complete, deploy to Supabase:

```bash
# Push migrations (creates demo_leads, demo_baseline tables and functions)
./db-push.sh

# Deploy edge function
supabase functions deploy demo-access

# Regenerate TypeScript types
supabase gen types typescript --linked > src/types/database.types.ts
```

## Step 2: Create Demo User Account

**In Supabase Dashboard:**

1. Go to **Authentication** → **Users** → **Add user**
2. Fill in:
   - **Email**: `demo@pipetrak.com`
   - **Password**: Choose a secure password (at least 12 characters, mix of letters/numbers/symbols)
   - Example: `PipeTrak-Demo-2025!` (but use your own unique password)
3. Click **Create user**
4. **Copy the User UUID** - you'll need it for the next step

**Store the password securely:**
- Add to Supabase Secrets: `supabase secrets set DEMO_PASSWORD=your-password-here`
- Or store in a password manager for your records

## Step 3: Create Demo Organization and Project

**In Supabase Dashboard SQL Editor**, run:

```sql
-- Replace <USER-UUID> with the UUID from Step 2

-- 1. Create the demo organization
INSERT INTO organizations (id, name)
VALUES (gen_random_uuid(), 'Demo Organization')
RETURNING id;

-- 2. Copy the returned organization ID and update the demo user
-- Replace <ORG-UUID> with the organization ID from above
-- Replace <USER-UUID> with the demo user's UUID
UPDATE users
SET organization_id = '<ORG-UUID>'
WHERE id = '<USER-UUID>';

-- 3. Create the demo project
-- Replace <ORG-UUID> with the organization ID
INSERT INTO projects (id, organization_id, name, description)
VALUES (
  gen_random_uuid(),
  '<ORG-UUID>',
  'PipeTrak Demo Project',
  'Explore PipeTrak features with real construction data'
)
RETURNING id;

-- 4. Copy the project ID for Step 4
```

**Save these IDs:**
- Organization UUID: `_______________`
- Project UUID: `_______________`

## Step 4: Import Data from 1605 Project

**Prepare the 1605 data:**

1. Export components, drawings, and welds from 1605 project via CSV
2. **Anonymize welder names** - replace real names with generic ones:
   - "John Davis" → "JD-001"
   - "Sarah Miller" → "SM-002"
   - etc.
3. Ensure Areas and Systems are included

**Import via PipeTrak UI:**

1. Log into PipeTrak as an admin user
2. Switch to the "PipeTrak Demo Project"
3. Go to **Imports** page
4. Import in this order:
   - Areas (if not auto-created)
   - Systems (if not auto-created)
   - Welders (with anonymized names)
   - Drawings
   - Components

**Alternatively, import via SQL:**

```sql
-- If you have SQL exports, run them against the demo project
-- Ensure all project_id references point to your demo project UUID
```

## Step 5: Capture Baseline Snapshot

**After all data is imported and verified**, capture the pristine state:

```sql
-- Replace <PROJECT-UUID> with your demo project UUID
SELECT capture_demo_baseline('<PROJECT-UUID>');

-- Verify snapshot was captured
SELECT table_name,
       jsonb_array_length(data) as record_count,
       captured_at
FROM demo_baseline;
```

**Expected output:**
| table_name | record_count | captured_at |
|------------|--------------|-------------|
| areas | 5+ | 2025-XX-XX |
| systems | 5+ | 2025-XX-XX |
| test_packages | 10+ | 2025-XX-XX |
| welders | 4+ | 2025-XX-XX |
| drawings | 20+ | 2025-XX-XX |
| components | 200+ | 2025-XX-XX |

## Step 6: Verify Nightly Reset Cron Job

```sql
-- Check cron job is scheduled
SELECT jobid, schedule, command, jobname
FROM cron.job
WHERE jobname = 'reset-demo-data-nightly';
```

**Expected output:**
| jobid | schedule | command | jobname |
|-------|----------|---------|---------|
| 1 | 0 0 * * * | SELECT reset_demo_data(...) | reset-demo-data-nightly |

## Step 7: Test the Complete Flow

1. **Clear your browser session** (logout, clear cookies)
2. Go to homepage → Click "Try Demo Project"
3. Enter a test email and name → Submit
4. Verify:
   - [ ] Loading transition appears
   - [ ] Redirected to dashboard within 5 seconds
   - [ ] Demo project is selected
   - [ ] Data is visible (components, drawings)
   - [ ] Demo mode banner appears at top
5. Check database:
   ```sql
   SELECT * FROM demo_leads ORDER BY created_at DESC LIMIT 1;
   ```
   - [ ] Lead was captured with correct email/name

## Step 8: Test Nightly Reset (Optional)

To test the reset mechanism manually:

```sql
-- Make a change to demo data
UPDATE components
SET percent_complete = 99
WHERE project_id = '<PROJECT-UUID>'
LIMIT 1;

-- Trigger reset manually
SELECT reset_demo_data('<PROJECT-UUID>');

-- Verify data was restored
SELECT percent_complete FROM components
WHERE project_id = '<PROJECT-UUID>'
LIMIT 5;
-- Should match original baseline values, not 99
```

---

## Troubleshooting

### Demo login fails with "Invalid credentials"
- Verify demo user exists in Supabase Auth
- Check user email is exactly `demo@pipetrak.com`
- Verify edge function has correct environment secrets

### Nightly reset not running
- Check pg_cron extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
- Verify cron job exists: `SELECT * FROM cron.job;`
- Check cron job logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

### Baseline snapshot is empty
- Re-run `capture_demo_baseline()` with correct project UUID
- Verify data exists in the demo project before capturing

### Rate limit errors during testing
- Clear rate limit events: `DELETE FROM rate_limit_events WHERE email = 'test@example.com';`
- Wait for rate limit window to expire (1 hour for IP, 24 hours for email)

---

**Plan Version**: 1.0.0 | **Constitution**: v2.0.0 | **Created**: 2025-11-25
