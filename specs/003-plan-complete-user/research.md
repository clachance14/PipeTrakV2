# Research: Complete User Data Storage During Signup

**Feature**: 003-plan-complete-user
**Phase**: 0 (Research & Exploration)
**Date**: 2025-10-06

## Overview
This document consolidates research findings for implementing automatic user profile creation via database triggers, terms of service tracking, and backfilling existing users. Research focuses on Supabase/PostgreSQL patterns, RLS security, and data migration strategies.

## Research Topics

### 1. Supabase Database Triggers for auth.users

**Decision**: Use PostgreSQL trigger on `auth.users` INSERT with `AFTER` timing and `FOR EACH ROW` granularity.

**Rationale**:
- Supabase Auth stores users in `auth.users` schema (not accessible via RLS)
- Triggers on `auth.users` can create corresponding records in `public.users`
- `AFTER INSERT` ensures auth record exists before creating profile
- `FOR EACH ROW` provides access to `NEW` record with metadata

**Alternatives Considered**:
- **Client-side creation**: Rejected due to race conditions and failure scenarios (auth succeeds but profile insert fails)
- **Supabase Edge Functions**: Rejected due to added complexity and latency (requires separate deployment)
- **BEFORE INSERT trigger**: Rejected because we need the auth.users record to exist first (FK constraint)

**Implementation Pattern**:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, terms_accepted_at, terms_version)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamptz,
    COALESCE(NEW.raw_user_meta_data->>'terms_version', 'v1.0')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Sources**:
- Supabase Docs: [Database Triggers](https://supabase.com/docs/guides/database/postgres/triggers)
- PostgreSQL Docs: [Trigger Functions](https://www.postgresql.org/docs/current/plpgsql-trigger.html)

---

### 2. Accessing auth.users Metadata in Triggers

**Decision**: Extract user metadata from `NEW.raw_user_meta_data` JSONB column using `->>`operator.

**Rationale**:
- Supabase stores custom signup data in `auth.users.raw_user_meta_data` as JSONB
- Data passed via `supabase.auth.signUp({ ..., options: { data: { full_name, terms_accepted_at } } })`
- `->>` operator extracts as text, cast to appropriate type with `::`
- Metadata is immutable after signup (can only be changed via admin API)

**Alternatives Considered**:
- **Store in app_metadata**: Rejected because app_metadata requires admin API (not accessible from client)
- **Separate API call**: Rejected due to race conditions and complexity
- **user_metadata**: Rejected because it's for user-editable data (we want immutable signup data)

**Field Mapping**:
| Metadata Field | SQL Extraction | Target Column | Notes |
|----------------|----------------|---------------|-------|
| `full_name` | `NEW.raw_user_meta_data->>'full_name'` | `users.full_name` | Text, nullable for legacy |
| `terms_accepted_at` | `(NEW.raw_user_meta_data->>'terms_accepted_at')::timestamptz` | `users.terms_accepted_at` | Cast to timestamp |
| `terms_version` | `COALESCE(NEW.raw_user_meta_data->>'terms_version', 'v1.0')` | `users.terms_version` | Default to v1.0 |

**Sources**:
- Supabase Docs: [User Metadata](https://supabase.com/docs/guides/auth/auth-deep-dive/auth-deep-dive-jwts#user-metadata)
- PostgreSQL Docs: [JSON Functions](https://www.postgresql.org/docs/current/functions-json.html)

---

### 3. RLS Policy Patterns for INSERT on public.users

**Decision**: Add INSERT policy allowing trigger function to bypass RLS using `SECURITY DEFINER`.

**Rationale**:
- Trigger functions run as database owner when declared `SECURITY DEFINER`
- RLS policies don't apply to superuser/owner context
- Prevents circular dependency (trigger can't check auth.uid() during signup)
- No client-side INSERT policy needed (clients never insert directly)

**Alternatives Considered**:
- **Policy allowing auth.uid() = id**: Rejected because `auth.uid()` is NULL during trigger execution
- **Disable RLS temporarily**: Rejected due to security risk (would allow direct inserts)
- **SECURITY INVOKER**: Rejected because trigger would inherit RLS context of signUp() call (anonymous)

**Implementation**:
```sql
-- No INSERT policy for clients (trigger handles all inserts)
-- Existing SELECT policy already allows users to read own record

-- Ensure trigger function uses SECURITY DEFINER (owner context)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public  -- Critical: Run as owner
LANGUAGE plpgsql
AS $$ ... $$;
```

**Security Considerations**:
- `SET search_path = public` prevents schema injection attacks
- Function is idempotent (safe to retry)
- No user input validation needed (data comes from Supabase Auth, already validated)

**Sources**:
- Supabase Docs: [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- PostgreSQL Docs: [SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)

---

### 4. Backfilling Strategies for Existing Users

**Decision**: Use `INSERT ... ON CONFLICT DO NOTHING` in migration to backfill from `auth.users` to `public.users`.

**Rationale**:
- Idempotent operation (safe to run multiple times)
- Skips users who already have profile records (future-proof)
- Atomic operation within migration transaction
- Handles partial metadata gracefully (NULL for missing fields)

**Alternatives Considered**:
- **Separate backfill script**: Rejected due to deployment complexity (requires manual execution)
- **UPDATE existing records**: Rejected because records don't exist yet
- **Trigger handles backfill**: Rejected because trigger only fires on INSERT (existing users won't trigger it)

**Implementation**:
```sql
-- Backfill existing users from auth.users to public.users
INSERT INTO public.users (id, email, full_name, terms_accepted_at, terms_version, created_at, updated_at)
SELECT
  au.id,
  au.email,
  au.raw_user_meta_data->>'full_name' AS full_name,
  (au.raw_user_meta_data->>'terms_accepted_at')::timestamptz AS terms_accepted_at,
  COALESCE(au.raw_user_meta_data->>'terms_version', 'v1.0') AS terms_version,
  au.created_at,
  NOW() AS updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL  -- Only insert missing users
ON CONFLICT (id) DO NOTHING;  -- Skip if race condition occurs
```

**Legacy User Handling**:
- Users without `full_name` metadata: `full_name` will be NULL (acceptable per spec edge case)
- Users without `terms_accepted_at`: NULL indicates "accepted before tracking implemented" (valid legacy state)
- Email always available (required by Supabase Auth)

**Sources**:
- PostgreSQL Docs: [INSERT ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT)
- Supabase Docs: [Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)

---

### 5. Terms of Service Versioning Patterns

**Decision**: Use semantic versioning (e.g., `v1.0`, `v1.1`, `v2.0`) stored as TEXT.

**Rationale**:
- Simple to compare (`WHERE terms_version < 'v2.0'`)
- Human-readable in database queries
- Follows industry standard (SemVer)
- Extensible for future major changes (GDPR updates, new clauses)

**Alternatives Considered**:
- **Date-based versioning** (`2025-10-06`): Rejected because dates don't convey significance of changes
- **Integer versioning** (`1`, `2`, `3`): Rejected because no minor/patch distinction
- **Separate terms_versions table**: Rejected as over-engineering for MVP (YAGNI)

**Future Extensibility**:
- Could add `terms_content` JSONB column with full text per version
- Could add `user_terms_history` table if need to track re-acceptance
- Current design supports querying "users who haven't accepted v2.0 yet"

**Default Version**: `v1.0` (current terms of service as of feature deployment)

**Sources**:
- Semantic Versioning: [semver.org](https://semver.org/)
- GDPR Best Practices: [ICO Guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/)

---

### 6. PostgreSQL Trigger Security (SECURITY DEFINER vs SECURITY INVOKER)

**Decision**: Use `SECURITY DEFINER` with explicit `SET search_path = public`.

**Rationale**:
- Trigger needs to bypass RLS to insert into `public.users`
- `SECURITY DEFINER` runs function as owner (not as invoking user)
- `SET search_path` prevents malicious schema injection
- No risk of privilege escalation (function only inserts, doesn't expose data)

**Alternatives Considered**:
- **SECURITY INVOKER**: Rejected because anonymous users (during signup) have no RLS privileges
- **Grant INSERT to anon role**: Rejected due to security risk (would allow direct client inserts)
- **No security qualifier**: Rejected because defaults to `SECURITY INVOKER` (same problem)

**Security Best Practices**:
1. **Always set search_path** in SECURITY DEFINER functions
2. **Validate inputs** even if from trusted source (paranoid defense)
3. **Keep function minimal** (only insert, no complex logic)
4. **Avoid dynamic SQL** (no EXECUTE with user input)

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER              -- Run as owner (bypasses RLS)
SET search_path = public      -- Prevent schema injection
LANGUAGE plpgsql
AS $$
BEGIN
  -- Function body with minimal logic
END;
$$;
```

**Sources**:
- PostgreSQL Security: [SECURITY DEFINER Functions](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
- Supabase Security: [RLS with Triggers](https://supabase.com/docs/guides/database/postgres/row-level-security#triggers-and-rls)

---

## Summary of Decisions

| Topic | Decision | Key Rationale |
|-------|----------|---------------|
| Trigger Timing | AFTER INSERT on auth.users | Ensures auth record exists before profile creation |
| Metadata Access | raw_user_meta_data->> 'field' | Supabase stores signup data in JSONB metadata |
| RLS for INSERT | SECURITY DEFINER (no client policy) | Trigger runs as owner, bypasses RLS safely |
| Backfill Strategy | INSERT ... ON CONFLICT in migration | Idempotent, atomic, handles legacy users |
| Version Format | Semantic versioning (vX.Y) | Industry standard, human-readable, extensible |
| Trigger Security | SECURITY DEFINER + SET search_path | Bypass RLS while preventing injection |

## Implementation Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Trigger fails silently | Add error logging + monitor PostgreSQL logs |
| Metadata missing for old users | Allow NULL for full_name/terms_accepted_at, handle in UI |
| Migration runs twice | Use ON CONFLICT DO NOTHING (idempotent) |
| Privilege escalation via trigger | SET search_path, minimal function logic, no dynamic SQL |
| Performance impact on signups | Trigger is single row INSERT (negligible overhead) |

## Next Steps (Phase 1)
1. Design data-model.md with exact schema changes
2. Write contract tests that expect new fields
3. Create quickstart.md with manual verification steps
4. Update CLAUDE.md with trigger pattern context

---
**Research Complete**: All technical unknowns resolved. Ready for Phase 1 (Design & Contracts).
