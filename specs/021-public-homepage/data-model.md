# Data Model: Public Marketing Homepage

**Feature**: 021-public-homepage
**Date**: 2025-10-29
**Phase**: 1 - Design & Contracts

## Overview

This feature extends the existing PipeTrak V2 database schema with tables and fields to support demo user signups, rate limiting, and automated cleanup. All new entities follow existing multi-tenant RLS patterns with `organization_id` isolation.

## New Entities

### 1. rate_limit_events

**Purpose**: Track demo signup attempts for rate limiting (10/hour per IP, 3/day per email)

**Table Definition**:
```sql
CREATE TABLE rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('demo_signup')),
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('ip_address', 'email')),
  identifier_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_rate_limit_events_lookup
  ON rate_limit_events (event_type, identifier_type, identifier_value, created_at DESC);
```

**Fields**:
- `id` (UUID): Primary key
- `event_type` (TEXT): Type of rate-limited event (currently only 'demo_signup')
- `identifier_type` (TEXT): 'ip_address' or 'email'
- `identifier_value` (TEXT): The IP address or email being tracked
- `created_at` (TIMESTAMPTZ): When the event occurred
- `metadata` (JSONB): Additional context (user agent, referrer, etc.)

**Indexes**:
- Composite index on (event_type, identifier_type, identifier_value, created_at DESC) for fast rate limit queries

**Relationships**: None (standalone audit table)

**RLS Policies**: None needed (server-side only access via Edge Function)

**Validation Rules**:
- `event_type` must be 'demo_signup' (extensible for future rate-limited features)
- `identifier_type` must be 'ip_address' or 'email'
- `identifier_value` cannot be null or empty
- `created_at` defaults to NOW()

**Lifecycle**:
- Created on every demo signup attempt (success or failure)
- Queried to check rate limits before allowing signup
- Never deleted (permanent audit trail)
- Retention: Indefinite (for abuse detection patterns)

---

### 2. users Table Extensions

**Purpose**: Mark demo users and track expiration dates

**Schema Changes**:
```sql
ALTER TABLE users
  ADD COLUMN is_demo_user BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN demo_expires_at TIMESTAMPTZ;

CREATE INDEX idx_users_demo_expiration
  ON users (is_demo_user, demo_expires_at)
  WHERE is_demo_user = TRUE;
```

**New Fields**:
- `is_demo_user` (BOOLEAN): Flag to distinguish demo users from regular users (default: FALSE)
- `demo_expires_at` (TIMESTAMPTZ): Expiration date for demo access (7 days from signup, null for regular users)

**Indexes**:
- Partial index on (is_demo_user, demo_expires_at) for efficient cleanup job queries

**Validation Rules**:
- If `is_demo_user = TRUE`, then `demo_expires_at` must NOT be null
- If `is_demo_user = FALSE`, then `demo_expires_at` must be null
- `demo_expires_at` must be in the future at creation time

**Lifecycle**:
- Set during demo signup (is_demo_user=TRUE, demo_expires_at=NOW() + 7 days)
- Queried daily by cleanup job (WHERE is_demo_user = TRUE AND demo_expires_at < NOW())
- User record deleted when expired (cascades to all related data)

---

### 3. organizations Table (No Schema Changes)

**Usage**: Demo users get their own isolated organization created during signup

**Demo Organization Naming**:
- Pattern: `Demo - {user_name}` or `Demo Organization {UUID}`
- Ensures RLS policies isolate demo project data per user
- Deleted when demo user expires (cascade deletion)

---

### 4. projects Table (No Schema Changes)

**Usage**: Demo project created for each demo user

**Demo Project Naming**:
- Pattern: `PipeTrak Demo Project`
- Contains cloned data (200 components, 20 drawings, 10 packages)
- Associated with demo user's organization via `organization_id`
- Deleted when demo user/organization expires (cascade deletion)

---

## Modified Entities

### users Table

**Existing Fields** (no changes):
- `id` (UUID): Primary key, linked to auth.users
- `email` (TEXT): User email
- `full_name` (TEXT): User full name
- `organization_id` (UUID): Foreign key to organizations

**New Fields** (see Users Table Extensions above):
- `is_demo_user` (BOOLEAN)
- `demo_expires_at` (TIMESTAMPTZ)

**RLS Policies** (existing, no changes needed):
- Users can only see their own record or users in their organization
- Demo users are automatically isolated via their unique organization_id

---

## Data Relationships

```
┌─────────────────────┐
│  rate_limit_events  │  (standalone audit table)
└─────────────────────┘

┌─────────────────────┐
│      auth.users     │  (Supabase managed)
└──────────┬──────────┘
           │
           │ (1:1)
           ▼
┌─────────────────────┐
│    users (public)   │
│  + is_demo_user     │
│  + demo_expires_at  │
└──────────┬──────────┘
           │
           │ (N:1)
           ▼
┌─────────────────────┐
│   organizations     │  (demo users get isolated org)
└──────────┬──────────┘
           │
           │ (1:N)
           ▼
┌─────────────────────┐
│      projects       │  (demo project with cloned data)
└──────────┬──────────┘
           │
           ├─── (1:N) ──▶ components (200 cloned)
           ├─── (1:N) ──▶ drawings (20 cloned)
           └─── (1:N) ──▶ packages (10 cloned)
```

**Key Relationships**:
1. **auth.users → users**: 1:1 (managed by Supabase Auth)
2. **users → organizations**: N:1 (demo users get unique org)
3. **organizations → projects**: 1:N (demo users get 1 demo project)
4. **projects → components/drawings/packages**: 1:N (cloned demo data)

**Cascade Deletion**:
- Delete demo user → cascades to organizations → cascades to projects → cascades to all project data
- Ensures complete cleanup when demo expires

---

## State Transitions

### Demo User Lifecycle

```
1. [PROSPECTIVE]
   ↓ (clicks "Try Demo Project")

2. [SIGNUP INITIATED]
   ↓ (submits email + name, passes rate limit check)

3. [ACCOUNT CREATED]
   - auth.users record created (Supabase Auth)
   - users record created (is_demo_user=TRUE, demo_expires_at=NOW()+7 days)
   - organizations record created (demo user's isolated org)
   - projects record created (demo project)
   - 230 records cloned (200 components, 20 drawings, 10 packages)
   ↓ (email confirmation sent)

4. [ACTIVE DEMO]
   - User receives magic link email
   - Clicks link to authenticate
   - Accesses demo project for 7 days
   - Can update milestones, view reports, etc.
   ↓ (7 days pass OR user upgrades)

5a. [EXPIRED] (if 7 days pass)
   - cleanup job runs daily (pg_cron)
   - demo_expires_at < NOW() detected
   - User + organization + project + all data deleted

5b. [UPGRADED] (if user converts before expiration)
   - is_demo_user set to FALSE
   - demo_expires_at set to NULL
   - Organization + project preserved
   - User becomes regular user
```

---

## Validation Rules

### Rate Limiting

**10 signups per hour per IP**:
```sql
SELECT COUNT(*) FROM rate_limit_events
WHERE event_type = 'demo_signup'
  AND identifier_type = 'ip_address'
  AND identifier_value = $ip
  AND created_at > NOW() - INTERVAL '1 hour';
```

**3 signups per day per email**:
```sql
SELECT COUNT(*) FROM rate_limit_events
WHERE event_type = 'demo_signup'
  AND identifier_type = 'email'
  AND identifier_value = $email
  AND created_at > NOW() - INTERVAL '1 day';
```

### Demo User Constraints

- Demo user MUST have `demo_expires_at` set
- Demo user MUST have unique organization (1:1 relationship)
- Demo project MUST be linked to demo user's organization
- Demo expiration date MUST be 7 days in future at creation

---

## Performance Considerations

### Indexes

1. **rate_limit_events**: Composite index on (event_type, identifier_type, identifier_value, created_at DESC)
   - Supports fast rate limit queries: `WHERE event_type = 'demo_signup' AND identifier_type = 'ip_address' AND identifier_value = $ip AND created_at > NOW() - INTERVAL '1 hour'`
   - Expected query time: <10ms for millions of rows

2. **users**: Partial index on (is_demo_user, demo_expires_at) WHERE is_demo_user = TRUE
   - Supports fast cleanup job queries: `WHERE is_demo_user = TRUE AND demo_expires_at < NOW()`
   - Expected query time: <50ms for thousands of demo users

### Data Volume Estimates

- **rate_limit_events**: ~100 signups/month × 12 months = ~1,200 rows/year (negligible)
- **Demo users**: ~100 active at any time (churns every 7 days)
- **Demo project data**: 100 demo users × 230 records × ~200 bytes/record = ~4.6MB

### Cleanup Strategy

- **Daily pg_cron job**: Runs at 2 AM UTC
- **Query**: `SELECT id FROM users WHERE is_demo_user = TRUE AND demo_expires_at < NOW()`
- **Action**: `DELETE FROM users WHERE id = ANY($expired_user_ids)` (cascades to all related data)
- **Expected runtime**: <1 second for typical volume

---

## Migration Strategy

**Migration Files** (to be created):
1. `000XX_create_rate_limit_events.sql` - Create rate_limit_events table with index
2. `000XX_add_demo_user_fields.sql` - Add is_demo_user and demo_expires_at to users table
3. `000XX_demo_rls_policies.sql` - Verify RLS policies work for demo users (no changes needed, but explicit check)
4. `000XX_setup_pg_cron_cleanup.sql` - Schedule cleanup job with pg_cron extension

**Rollback Plan**:
- Drop rate_limit_events table
- Drop users.is_demo_user and users.demo_expires_at columns
- Remove pg_cron job

**Data Migration**: None needed (new fields, no existing data to migrate)

---

## Testing Considerations

### Unit Tests

- Validate rate limit queries return correct counts
- Validate demo expiration date is set correctly (NOW() + 7 days)
- Validate cascade deletion works (delete user → all data deleted)

### Integration Tests

- Test full demo signup flow (rate limit → create → email → access)
- Test rate limiting enforcement (10/hour per IP, 3/day per email)
- Test cleanup job deletes expired demos correctly
- Test RLS policies isolate demo projects per user

### Data Integrity Tests

- Constraint: is_demo_user=TRUE requires demo_expires_at NOT NULL
- Constraint: is_demo_user=FALSE requires demo_expires_at = NULL
- Foreign key integrity: demo user → organization → project chain

---

## Enhancement: Custom Demo Signup Emails via Resend

**Added**: 2025-10-29
**Phase**: Custom email integration (no database changes)

### Overview

This enhancement modifies the `demo-signup` Edge Function to send custom-branded emails via Resend instead of Supabase's default SMTP. **No new database entities are required.**

### Application-Level Entities

#### EmailTemplate (TypeScript Function)

Logical entity representing email content structure. Exists as pure function, not persisted.

**Function Signature**:
```typescript
function generateDemoEmailHtml(
  fullName: string,
  magicLinkUrl: string,
  demoExpiresAt: string
): string
```

**Template Variables**:
| Variable | Type | Source | Description |
|----------|------|--------|-------------|
| `fullName` | string | `user_metadata.full_name` | Personalized greeting in email |
| `magicLinkUrl` | string | Supabase Admin API | Complete auth URL with token |
| `demoExpiresAt` | string | `users.demo_expires_at` | Formatted expiration date |

**Output**: HTML string (~5KB) with inline styles

**Content Sections**:
1. Header: "Welcome to PipeTrak!"
2. Welcome Message: Brand introduction + value proposition
3. CTA Button: "Access Your Demo Project →" (magic link)
4. Quick Start Guide: 4 suggested features to explore
5. Footer: Support contact + website link

#### ResendEmailRequest (API Payload)

Structure sent to Resend API for email delivery.

```typescript
interface ResendEmailRequest {
  from: string       // "PipeTrak Demo <demo@pipetrak.co>"
  to: string         // User's email address
  subject: string    // "Welcome to Your PipeTrak Demo!"
  html: string       // Output from generateDemoEmailHtml()
}
```

**Validation**:
- `from`: Must be verified sender in Resend dashboard (FR-032)
- `to`: Valid email format (already validated in signup form)
- `html`: Non-empty, <1MB (Resend limit, template is ~5KB)

### Modified Flow (Edge Function)

**Before** (Original Feature 021):
```typescript
await supabase.auth.signInWithOtp({
  email,
  options: { emailRedirectTo: '/dashboard' }
})
```

**After** (Custom Email Enhancement):
```typescript
// 1. Generate magic link token
const { data: linkData } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email,
  options: { redirectTo: '/dashboard' }
})

// 2. Render email template
const html = generateDemoEmailHtml(fullName, linkData.properties.action_link, demoExpiresAt)

// 3. Send via Resend API
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'PipeTrak Demo <demo@pipetrak.co>',
    to: email,
    subject: 'Welcome to Your PipeTrak Demo!',
    html
  })
})
```

### Dependencies

**External Services**:
- **Resend API** → Email delivery (HTTPS REST API)
- **Supabase Auth Admin API** → Magic link token generation

**Environment**:
- `RESEND_API_KEY` → Stored in Supabase Edge Function secrets

### No Database Changes

- No new tables
- No new columns
- No migrations required
- Existing entities (`users`, `organizations`, `projects`, `rate_limit_events`) unchanged

### Validation Rules (Application Level)

| Rule ID | Description | Enforcement |
|---------|-------------|-------------|
| **VR-EMT-001** | `fullName` must be non-empty | Edge Function (validated in signup form) |
| **VR-EMT-002** | `magicLinkUrl` must be valid URL with token | Supabase Admin API (errors if generation fails) |
| **VR-EMT-003** | Generated HTML must be <1MB | Resend API (template is ~5KB) |
| **VR-EMT-004** | `from` address must be verified sender | Resend API (403 if not verified) |
| **VR-EMT-005** | Resend rate limits: 100/day (free), 3,000/month (paid) | Resend API (429 if exceeded) |

### Testing Strategy

**Unit Tests**:
- `generateDemoEmailHtml()` renders correct HTML
- Template handles special characters in `fullName`
- Date formatting works correctly

**Integration Tests**:
- Edge Function generates magic link successfully
- Edge Function calls Resend API with correct payload
- Email delivery errors handled gracefully (non-critical failure)

**E2E Tests** (Manual):
- Complete signup → email delivery → magic link → dashboard flow
- Email renders correctly in Gmail, Outlook, Apple Mail
- Magic link authentication works

### Performance Impact

- **Email generation**: +10ms (simple string interpolation)
- **Resend API call**: +500ms-1s (transactional email API)
- **Total signup flow**: <10 seconds (SC-007, well within budget)

### Security Considerations

- **RESEND_API_KEY**: Stored securely in Supabase secrets (not in code)
- **Magic link token**: Generated by Supabase Auth (secure signing, 24h expiration)
- **Email content**: Static template (no XSS risk)
- **Sender verification**: Resend enforces SPF/DKIM/DMARC

### References (Enhancement-Specific)

- **Design Doc**: `docs/plans/2025-10-29-custom-demo-signup-emails-design.md`
- **Feature Spec Updates**: FR-027 through FR-035 in `spec.md`
- **Research**: `research.md` - Email provider and approach decisions

---

## References

- **Research Document**: [research.md](./research.md) - Technical decision rationale
- **Feature Spec**: [spec.md](./spec.md) - Functional requirements
- **Existing Schema**: `supabase/migrations/` - Current database schema
- **Supabase RLS Docs**: https://supabase.com/docs/guides/auth/row-level-security
