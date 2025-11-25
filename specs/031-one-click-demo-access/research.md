# Research: One-Click Demo Access

**Feature**: 031-one-click-demo-access
**Date**: 2025-11-25

## Research Questions Resolved

### 1. How to auto-login users without exposing credentials?

**Decision**: Token-based login via Supabase admin API

**Approach**:
1. Edge function generates magic link for `demo@pipetrak.com` using `supabase.auth.admin.generateLink()`
2. Immediately verify the token to get a session using `supabase.auth.verifyOtp()`
3. Return access_token and refresh_token to client
4. Client calls `supabase.auth.setSession()` to establish session

**Rationale**:
- Password never transmitted or stored in client code
- Uses existing Supabase auth infrastructure
- Tokens are short-lived (1 hour default)
- Single-use tokens prevent replay attacks

**Alternatives Considered**:
- Direct password auth: Rejected - exposes credentials in bundle
- Custom JWT: Rejected - requires additional infrastructure
- Service key auth: Rejected - bypasses RLS, security risk

### 2. How to reset demo data reliably?

**Decision**: pg_cron + SECURITY DEFINER RPC function + JSONB snapshot

**Approach**:
1. `capture_demo_baseline(project_id)` saves current state to `demo_baseline` table
2. pg_cron schedules `reset_demo_data(project_id)` at midnight UTC
3. Reset function deletes current data, restores from JSONB snapshot

**Rationale**:
- Database-level execution (reliable, no external dependencies)
- Transactional (all-or-nothing reset)
- JSONB preserves exact data including relationships
- pg_cron already available on Supabase

**Alternatives Considered**:
- Edge function trigger: Rejected - external dependency, could fail silently
- GitHub Actions: Rejected - requires secrets management, external service
- Manual reset: Rejected - unreliable, human-dependent

### 3. How to capture leads efficiently?

**Decision**: Dedicated `demo_leads` table with service-role-only access

**Approach**:
1. New table with email, name, metadata columns
2. RLS enabled with NO policies (only service role can access)
3. Insert happens in edge function before generating session

**Rationale**:
- Marketing data isolated from user data
- Service role access prevents unauthorized reads
- Index on email for deduplication queries
- Index on created_at for chronological export

**Alternatives Considered**:
- Reuse existing users table: Rejected - pollutes user data
- Third-party marketing service: Rejected - adds dependency
- Log to analytics only: Rejected - harder to query and export

### 4. What rate limiting thresholds to use?

**Decision**: 10 requests/hour per IP, 5 requests/day per email

**Rationale**:
- Matches existing demo-signup thresholds (proven in production)
- 10/hour IP: Allows legitimate multiple attempts while blocking brute force
- 5/day email: Prevents spam submissions while allowing retries

**Alternatives Considered**:
- Stricter limits: Rejected - could block legitimate users
- No limits: Rejected - vulnerable to abuse
- CAPTCHA instead: Rejected - adds friction, reduces conversion

## Best Practices Applied

### Supabase Edge Functions
- Use `createClient` with service role key for admin operations
- Validate all inputs before processing
- Return consistent JSON response format
- Include CORS headers for browser compatibility

### pg_cron Integration
- Use `cron.schedule()` for job creation
- Store job name for easy identification
- Schedule during low-traffic hours (midnight UTC)
- Log job execution in `cron.job_run_details`

### TanStack Query Pattern
- Use `useMutation` for demo access (one-time operation)
- Handle loading/error states in UI
- Invalidate queries after session change
- Use `onSuccess` for navigation

## Existing Patterns Referenced

### Rate Limiting (from demo-signup)
- File: `supabase/functions/demo-signup/rate-limiter.ts`
- Pattern: Check `rate_limit_events` table before processing
- Return 429 with `retry_after` on limit exceeded

### Magic Link Generation (from demo-signup)
- File: `supabase/functions/demo-signup/index.ts`
- Pattern: `supabase.auth.admin.generateLink({ type: 'magiclink', email })`
- Extract token from action_link URL

### Form Validation (from DemoSignupForm)
- File: `src/components/demo/DemoSignupForm.tsx`
- Pattern: Email regex validation, name length check
- Display inline errors, disable button during submission
