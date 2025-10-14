# Data Model: Complete User Data Storage During Signup

**Feature**: 003-plan-complete-user
**Phase**: 1 (Design & Contracts)
**Date**: 2025-10-06

## Overview
This document defines schema changes to the `public.users` table and the database trigger mechanism for automatic profile creation. Changes support tracking terms of service acceptance and backfilling existing users.

## Schema Changes

### Table: `public.users`

**Current Schema** (from `00001_initial_schema.sql`):
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Required Changes**:
```sql
-- Add terms acceptance tracking columns
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS terms_version TEXT NULL DEFAULT 'v1.0';

-- Add indexes for terms querying
CREATE INDEX IF NOT EXISTS users_terms_version_idx
  ON public.users(terms_version)
  WHERE terms_version IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_terms_accepted_at_idx
  ON public.users(terms_accepted_at)
  WHERE terms_accepted_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.users.terms_accepted_at IS
  'Timestamp when user accepted terms of service. NULL for legacy users who registered before tracking was implemented.';

COMMENT ON COLUMN public.users.terms_version IS
  'Version of terms accepted (semantic versioning: v1.0, v2.0, etc.). Defaults to v1.0 for initial rollout.';
```

**Full Schema After Migration**:
```sql
TABLE public.users (
  -- Primary key and auth reference
  id                  UUID PRIMARY KEY REFERENCES auth.users(id),

  -- User profile data
  email               TEXT NOT NULL UNIQUE,
  full_name           TEXT NULL,  -- NULL allowed for legacy users

  -- Terms of service tracking (NEW)
  terms_accepted_at   TIMESTAMPTZ NULL,  -- NULL = legacy user
  terms_version       TEXT NULL DEFAULT 'v1.0',

  -- Timestamps
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
)
```

### Field Specifications

| Field | Type | Nullable | Default | Validation | Purpose |
|-------|------|----------|---------|------------|---------|
| `id` | UUID | NOT NULL | - | FK to auth.users(id) | Primary key, links to auth system |
| `email` | TEXT | NOT NULL | - | Email format, UNIQUE | User's email address (from auth.users) |
| `full_name` | TEXT | **NULL** | - | Min 1 char if present | User's full name (from signup metadata) |
| `terms_accepted_at` | TIMESTAMPTZ | **NULL** | - | Must be <= NOW() | Timestamp of terms acceptance |
| `terms_version` | TEXT | **NULL** | `'v1.0'` | Semantic version format | Version of terms accepted |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | - | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | NOW() | - | Last update timestamp |

**Nullability Rationale**:
- `full_name`: NULL allowed for legacy users who signed up before metadata tracking
- `terms_accepted_at`: NULL distinguishes legacy users (no tracking) from new users (explicit timestamp)
- `terms_version`: NULL for legacy users, defaults to 'v1.0' for new users

## Database Trigger

### Trigger Function: `handle_new_user()`

**Purpose**: Automatically create `public.users` record when user signs up via Supabase Auth.

**Trigger Timing**: `AFTER INSERT` on `auth.users`

**Function Definition**:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create public.users record from auth.users metadata
  INSERT INTO public.users (
    id,
    email,
    full_name,
    terms_accepted_at,
    terms_version,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamptz,
    COALESCE(NEW.raw_user_meta_data->>'terms_version', 'v1.0'),
    NEW.created_at,
    NOW()
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger function to auto-create public.users record from auth.users metadata on signup. Runs as SECURITY DEFINER to bypass RLS.';
```

**Trigger Attachment**:
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Trigger Behavior

**Input** (from `auth.users` NEW record):
- `NEW.id` → users.id
- `NEW.email` → users.email
- `NEW.created_at` → users.created_at
- `NEW.raw_user_meta_data->>'full_name'` → users.full_name
- `NEW.raw_user_meta_data->>'terms_accepted_at'` → users.terms_accepted_at
- `NEW.raw_user_meta_data->>'terms_version'` → users.terms_version (default: 'v1.0')

**Output**: New row in `public.users` with profile data

**Error Handling**:
- If INSERT fails (e.g., FK constraint violation), entire signup transaction rolls back
- Trigger failure prevents user creation in auth.users (transactional safety)
- PostgreSQL logs error details for debugging

**Performance**:
- O(1) operation (single row INSERT)
- Negligible overhead on signup flow (<10ms)
- No impact on existing users (trigger only fires on INSERT)

## Data Migration Strategy

### Backfill SQL

**Purpose**: Populate `public.users` for existing users who signed up before this feature.

**Implementation**:
```sql
-- Backfill existing auth.users into public.users
INSERT INTO public.users (
  id,
  email,
  full_name,
  terms_accepted_at,
  terms_version,
  created_at,
  updated_at
)
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
WHERE pu.id IS NULL  -- Only users not yet in public.users
ON CONFLICT (id) DO NOTHING;  -- Idempotent (safe to re-run)
```

**Expected Results**:
- ~10 existing users backfilled (current user base size)
- Legacy users will have NULL for `full_name` and `terms_accepted_at` (metadata didn't exist)
- New users (post-feature) will have full data from trigger

**Rollback Strategy**:
```sql
-- To rollback (development only, NOT production)
DELETE FROM public.users
WHERE terms_accepted_at IS NULL
  AND created_at < '2025-10-06';  -- Pre-feature users
```

## Row Level Security (RLS) Updates

### Current Policies
```sql
-- Existing SELECT policy (from 00001_initial_schema.sql)
CREATE POLICY "Users can read own record"
  ON users FOR SELECT
  USING (id = auth.uid());
```

**No Changes Needed**:
- SELECT policy already allows users to read their own profile (including new terms fields)
- No INSERT policy for clients (trigger handles all inserts via SECURITY DEFINER)
- No UPDATE/DELETE policies yet (future feature for profile editing)

### Future Policies (Out of Scope)
```sql
-- Future: Allow users to update own profile (except terms fields)
-- CREATE POLICY "Users can update own profile"
--   ON users FOR UPDATE
--   USING (id = auth.uid())
--   WITH CHECK (
--     id = auth.uid()
--     AND (OLD.terms_accepted_at IS NOT DISTINCT FROM NEW.terms_accepted_at)
--     AND (OLD.terms_version IS NOT DISTINCT FROM NEW.terms_version)
--   );
```

## Entity Relationships

### ER Diagram
```
┌─────────────────┐
│   auth.users    │ (Supabase managed, not RLS-accessible)
│─────────────────│
│ id (PK)         │
│ email           │
│ raw_user_meta_  │
│   data (JSONB)  │
│ created_at      │
└────────┬────────┘
         │ 1
         │ (trigger auto-creates)
         │ 1
┌────────▼────────┐      1       ┌──────────────────┐
│  public.users   │◄─────────────┤ user_organizations│
│─────────────────│              │──────────────────│
│ id (PK, FK)     │              │ user_id (FK)     │
│ email           │              │ organization_id  │
│ full_name       │              │ role             │
│ terms_accepted_ │              └──────────────────┘
│   at (NEW)      │
│ terms_version   │
│   (NEW)         │
│ created_at      │
│ updated_at      │
└─────────────────┘
```

### Relationships
1. **auth.users → public.users** (1:1)
   - Enforced by PK/FK constraint (`public.users.id REFERENCES auth.users(id)`)
   - Trigger ensures every auth user has exactly one profile record

2. **public.users → user_organizations** (1:N)
   - Existing relationship (from Feature 002)
   - Users can belong to multiple organizations
   - Cascade delete: if user deleted from auth.users, profile + memberships deleted

## Data Validation Rules

### Application-Level Validation (src/lib/auth.ts)

**Pre-signup Checks**:
```typescript
// Before calling supabase.auth.signUp()
if (!validateEmail(email)) {
  throw new Error('Invalid email format')
}

if (password.length < 6) {
  throw new Error('Password must be at least 6 characters')
}

if (!fullName || fullName.trim().length === 0) {
  throw new Error('Full name is required')
}

if (!termsAccepted) {
  throw new Error('Must accept terms of service')
}
```

**Metadata Payload**:
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName.trim(),
      terms_accepted_at: new Date().toISOString(),
      terms_version: 'v1.0'
    }
  }
})
```

### Database-Level Validation (Future Enhancement)

**Potential Constraints**:
```sql
-- Ensure terms_version follows semantic versioning pattern
ALTER TABLE public.users
  ADD CONSTRAINT terms_version_format
  CHECK (terms_version IS NULL OR terms_version ~ '^v[0-9]+\.[0-9]+$');

-- Ensure terms_accepted_at is not in future
ALTER TABLE public.users
  ADD CONSTRAINT terms_accepted_at_not_future
  CHECK (terms_accepted_at IS NULL OR terms_accepted_at <= NOW());
```

**Decision**: Defer to future iteration (not needed for MVP)

## Migration File Structure

**File**: `supabase/migrations/00004_auto_create_user_profile.sql`

**Sections**:
1. **Header Comment** - Feature number, purpose, requirements addressed
2. **Schema Changes** - ALTER TABLE to add columns + indexes
3. **Trigger Function** - CREATE OR REPLACE FUNCTION handle_new_user()
4. **Trigger Attachment** - CREATE TRIGGER on_auth_user_created
5. **Data Migration** - Backfill existing users
6. **Comments** - Table/column documentation

**Transaction Handling**:
- Entire migration runs in single transaction (Supabase default)
- If any step fails, all changes roll back
- Idempotent (safe to re-run with ON CONFLICT DO NOTHING)

## Testing Implications

### Contract Tests
1. **Registration flow**: Assert response includes `terms_accepted_at` and `terms_version`
2. **Profile retrieval**: Assert `SELECT * FROM users WHERE id = auth.uid()` returns all fields

### Integration Tests
1. New user signup → verify public.users record created with all fields
2. Legacy user query → verify NULL handling for terms fields
3. Backfill verification → count users in public.users matches auth.users

### Manual Testing (quickstart.md)
1. Register new user → check database for profile data
2. Query existing user → verify backfill worked
3. SQL audit → `SELECT * FROM users WHERE terms_accepted_at IS NULL` (should be legacy users only)

## Summary

**Schema Changes**: 2 new columns (`terms_accepted_at`, `terms_version`), 2 indexes
**New Functions**: 1 trigger function (`handle_new_user()`)
**New Triggers**: 1 trigger (`on_auth_user_created`)
**Data Migration**: Backfill ~10 existing users
**RLS Changes**: None (existing policies sufficient)

**Next Steps**: Generate contract tests, quickstart validation, update CLAUDE.md

---
**Data Model Complete**: Ready for contract test generation (Phase 1 continuation).
