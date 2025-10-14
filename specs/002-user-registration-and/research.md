# Research: User Registration & Team Onboarding

**Feature**: 002-user-registration-and
**Date**: 2025-10-04
**Status**: Complete

## Overview

This document consolidates technical research and design decisions for the user registration and team onboarding feature. All critical unknowns from the feature specification have been resolved through the `/clarify` session documented in spec.md.

## Research Areas

### 1. Invitation Token Security

**Decision**: Use cryptographically secure random tokens with minimum 32 bytes of entropy

**Rationale**:
- NFR-005 mandates ≥32 bytes entropy for invitation tokens
- Supabase does not provide built-in invitation token generation
- Must prevent token guessing attacks (brute force, timing attacks)
- Tokens will be used in URLs, so must be URL-safe

**Implementation**:
- Use Web Crypto API `crypto.getRandomValues()` for token generation
- Base64url encoding for URL safety (RFC 4648)
- Store SHA-256 hash in database, compare hashed tokens on validation
- Token format: 32 random bytes → 43 char base64url string

**Alternatives Considered**:
- UUIIDv4: Only 122 bits entropy (15.25 bytes) - insufficient
- Short codes (6-8 digits): Too vulnerable to brute force
- Signed JWTs: Overkill for one-time use tokens, token revocation complexity

**References**:
- OWASP: Authentication tokens should have ≥128 bits entropy
- Web Crypto API: `crypto.getRandomValues()` uses OS-level CSPRNG

---

### 2. Invitation Expiration Period

**Decision**: 7 days default expiration for invitation links (configurable)

**Rationale**:
- FR-023 left expiration period as "[NEEDS CLARIFICATION]" - now resolved
- Construction teams typically onboard within 1 week of project start
- Balances security (shorter = better) with user convenience
- Expired invitations can be resent by admins/owners

**Implementation**:
- Store `expires_at` timestamp in invitations table
- Calculate as `CURRENT_TIMESTAMP + INTERVAL '7 days'` on creation
- Database-level check: `expires_at > NOW()` in queries
- Frontend shows clear expiration date to invitee

**Alternatives Considered**:
- 30 days: Too long, increases attack window if email compromised
- 24 hours: Too short for users who check email infrequently
- No expiration: Security risk (leaked emails remain vulnerable indefinitely)

**Configuration Path** (future enhancement):
- Add `invitation_expiry_hours` to organization settings table
- Default 168 hours (7 days), allow orgs to customize 24-168 range

---

### 3. Email Service Integration

**Decision**: Use Supabase Auth built-in email templates for MVP, plan migration to Resend/SendGrid for production

**Rationale**:
- Supabase Auth provides email templates for signup confirmation
- Can leverage same system for custom invitation emails
- Reduces external dependencies for MVP
- Known limitation: Supabase email has 100/hour rate limit on free tier

**Implementation (MVP)**:
- Custom email template via Supabase Auth UI settings
- Template variables: `{{.InviterName}}`, `{{.OrganizationName}}`, `{{.InvitationLink}}`, `{{.RoleName}}`
- Use Supabase "magic link" pattern for invitation acceptance
- FR-041 handling: Try email send, catch error, notify inviter, still create invitation record

**Production Migration Path**:
- Switch to Resend (recommended) or SendGrid for higher volume
- Advantages: Better deliverability, analytics, custom domains, higher rate limits
- Implementation: Replace `supabase.auth.admin.inviteUserByEmail()` with Resend SDK
- Timeline: Before exceeding 50 users/org (NFR-003 scale)

**Alternatives Considered**:
- Mailgun: Good but more expensive than Resend for startup tier
- AWS SES: Requires additional AWS account management
- Custom SMTP: Deliverability challenges, spam filtering complexity

**References**:
- Supabase email rate limits: https://supabase.com/docs/guides/auth/auth-email-templates
- Resend pricing: Free tier 100 emails/day, $20/mo for 50k/month

---

### 4. Multi-Organization User Experience

**Decision**: Zustand store for active organization context with LocalStorage persistence

**Rationale**:
- Users can belong to multiple orgs (FR-010)
- Need to track "current active organization" across page navigation
- TanStack Query handles server state, need client-side context for UI
- Zustand provides simple global state without prop drilling (Constitution II)

**Implementation**:
```typescript
// src/stores/organizationStore.ts
interface OrganizationStore {
  activeOrgId: string | null
  setActiveOrg: (orgId: string) => void
  clearActiveOrg: () => void
}

// Persisted to localStorage: 'pipetrak:activeOrgId'
```

**UI Components**:
- `OrganizationSwitcher` in app header (Constitution II - Layout component integration)
- Displays current org name, dropdown to switch
- On switch: Update Zustand store → TanStack Query refetches data for new org

**Alternatives Considered**:
- React Context: Works but Zustand provides better DevTools, simpler updates
- URL-based org selection (`/org/:orgId/projects`): Breaks direct linking, requires route rewrites
- Cookie-based: Requires server-side logic, PipeTrak is pure SPA

**Security Note**:
- Frontend org selection is UX only
- RLS policies on backend enforce actual data access (Constitution IV)
- Malicious user cannot bypass RLS by changing Zustand store

---

### 5. Role-Based Access Control Implementation

**Decision**: Enum-based roles in database with frontend permission helpers

**Rationale**:
- FR-008: 7 distinct roles (owner, admin, project_manager, foreman, qc_inspector, welder, viewer)
- RBAC logic must be enforced at database (RLS) and UI (hide inaccessible features)
- Role hierarchy: owner > admin > project_manager > foreman > qc_inspector > welder > viewer

**Database Schema**:
```sql
-- In existing user_organizations table (from Sprint 0)
CREATE TYPE user_role AS ENUM (
  'owner', 'admin', 'project_manager', 'foreman',
  'qc_inspector', 'welder', 'viewer'
);

ALTER TABLE user_organizations
  ADD COLUMN role user_role NOT NULL DEFAULT 'viewer';
```

**RLS Policy Pattern**:
```sql
-- Example: Projects table
CREATE POLICY "Users can view projects in their org"
  ON projects FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project managers can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'project_manager')
    )
  );
```

**Frontend Permission Helpers**:
```typescript
// src/lib/permissions.ts
const ROLE_HIERARCHY = ['viewer', 'welder', 'qc_inspector', 'foreman', 'project_manager', 'admin', 'owner'];

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

export function canManageTeam(role: UserRole): boolean {
  return ['owner', 'admin'].includes(role);
}
```

**Alternatives Considered**:
- ACL (Access Control Lists): Over-engineered for 7 fixed roles
- ABAC (Attribute-Based): Too complex, roles are sufficient
- Casbin/CASL libraries: External dependencies, roles are simple enough for custom logic

**References**:
- Supabase RLS best practices: https://supabase.com/docs/guides/auth/row-level-security
- PostgreSQL ENUM types: https://www.postgresql.org/docs/current/datatype-enum.html

---

### 6. Password Security & Validation

**Decision**: Minimum 6 characters with email verification as primary security (relaxed standard per NFR-004)

**Rationale**:
- Clarification session resolved to relaxed password requirements
- Email verification serves as primary account security mechanism
- Construction teams prioritize usability over high-security passwords
- Supabase Auth handles password hashing (bcrypt)

**Implementation**:
- Frontend validation: `password.length >= 6`
- No complexity requirements (uppercase, numbers, symbols)
- Supabase Auth enforces email verification before account activation
- Password reset via Supabase magic links

**User Messaging**:
- Registration form: "Minimum 6 characters"
- Optional strength indicator (weak/medium/strong) without blocking submission

**Future Enhancement Path**:
- Add optional 2FA via Supabase Auth (TOTP)
- Org-level setting to enforce stronger passwords (8+ chars, complexity rules)

**Alternatives Considered**:
- NIST 800-63B standard (8+ chars, check against breach databases): Rejected per clarification session
- Passwordless (magic links only): Too unfamiliar for construction industry
- SSO integration: Deferred to enterprise tier (post-MVP)

---

### 7. First User vs. Invited User Onboarding Flows

**Decision**: Conditional routing based on invitation status with separate onboarding components

**Rationale**:
- FR-034: First-time owners need organization setup wizard
- FR-037: Different onboarding flows for owners vs. invited users
- Invited users skip org creation, go straight to role-specific dashboard

**Implementation**:

**First User (Organization Owner) Flow**:
1. Complete registration form (email, password, name, org name)
2. Supabase creates user account + organization + user_organizations record with role='owner'
3. Redirect to `/onboarding/wizard`
4. Wizard steps (FR-035):
   - Organization settings (logo, industry, timezone)
   - First project setup (optional)
   - Invite team members (optional)
5. Redirect to owner dashboard (`/`)

**Invited User Flow**:
1. Click invitation link: `/accept-invitation?token={token}`
2. If existing user: Sign in → Accept invitation → Add org to account
3. If new user: Set password → Create account → Accept invitation
4. Redirect to role-specific dashboard:
   - Owners/admins: Full dashboard (`/`)
   - Project managers: Projects view (`/projects`)
   - Foremen/QC/Welders: Assigned work (`/work`)
   - Viewers: Read-only dashboard (`/dashboard`)

**Component Structure**:
- `OnboardingWizard.tsx` (owner-specific, 3-step wizard)
- `AcceptInvitation.tsx` (invitation acceptance page)
- `RoleBasedRedirect.tsx` (post-auth routing helper)

**Alternatives Considered**:
- Single unified onboarding: Confusing, mixes concerns
- Email-based onboarding sequence: Too slow, users want immediate access
- Admin-driven onboarding: Reduces self-service capability

---

### 8. Handling Last Owner Leaving Organization

**Decision**: Prompt for ownership transfer, soft-delete organization if declined, with 30-day recovery window

**Rationale**:
- FR-038, FR-039, FR-040: Resolved in clarification session
- Prevents orphaned organizations with no billing contact
- Soft delete allows recovery from accidental deletions

**Implementation**:

**Database Schema**:
```sql
ALTER TABLE organizations
  ADD COLUMN deleted_at TIMESTAMP,
  ADD COLUMN deleted_by UUID REFERENCES users(id);

-- Soft delete means deleted_at IS NOT NULL
```

**Logic Flow**:
1. Owner clicks "Leave Organization" or "Delete Account"
2. System checks: `SELECT COUNT(*) FROM user_organizations WHERE organization_id = X AND role = 'owner'`
3. If count = 1 (last owner):
   - Show modal: "Transfer ownership to another admin before leaving"
   - Dropdown: Select from admins in organization
   - Options: Transfer or Cancel
4. If user declines (closes modal):
   - Soft delete organization: `UPDATE organizations SET deleted_at = NOW(), deleted_by = auth.uid()`
   - Soft delete all memberships: `UPDATE user_organizations SET deleted_at = NOW() WHERE organization_id = X`
5. Recovery: Admin task to restore `deleted_at = NULL` within 30 days
6. Cleanup: Cron job deletes `deleted_at < NOW() - INTERVAL '30 days'`

**RLS Policy Update**:
```sql
-- Exclude soft-deleted orgs from queries
CREATE POLICY "Users cannot see deleted organizations"
  ON organizations FOR SELECT
  USING (deleted_at IS NULL AND id IN (...));
```

**Alternatives Considered**:
- Auto-promote admin to owner: Surprising, admin may not want billing responsibility
- Hard delete immediately: No recovery from mistakes
- Orphan org (no owners): Billing and data ownership unclear

---

## Summary of Technical Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Invitation Tokens | 32-byte CSPRNG → base64url | Security (NFR-005), URL safety |
| Invitation Expiry | 7 days default | Balance security vs. convenience |
| Email Service | Supabase Auth (MVP) → Resend (production) | Reduce dependencies initially, scale later |
| Multi-Org Context | Zustand store + localStorage | Client state persistence, no prop drilling |
| RBAC | PostgreSQL ENUM + RLS policies | Type safety, database-level enforcement |
| Password Security | Min 6 chars + email verification | Clarification session resolution (NFR-004) |
| Onboarding Flows | Conditional routing (owner vs. invited) | FR-034, FR-037 requirements |
| Last Owner Handling | Transfer prompt → soft delete + recovery | FR-038, FR-039, FR-040 requirements |

---

## Open Questions for Phase 1 Design

1. **Database Indexes**: Which columns need indexes for performance at ~50 users/org scale? (invitations.token, user_organizations.organization_id + user_id)
2. **Email Template Variables**: Full list of template placeholders for Supabase Auth customization
3. **Organization Switcher UX**: Dropdown vs. command palette vs. separate page?
4. **Role Permission Matrix**: Detailed feature-by-feature CRUD permissions table (for `/tasks` phase)

**Next Phase**: Generate data-model.md and API contracts based on these research findings.
