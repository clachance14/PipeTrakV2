# Quickstart: Complete User Data Storage During Signup

**Feature**: 003-plan-complete-user
**Purpose**: Manual testing guide for verifying user profile data storage and terms acceptance tracking
**Date**: 2025-10-06

## Prerequisites

- Local Supabase instance running (`supabase start`)
- Migration 00004 applied (`supabase db reset` or `supabase migration up`)
- Development server running (`npm run dev`)
- PostgreSQL client (psql, Supabase Studio, or DBeaver) for database inspection

## Test Scenario 1: New User Registration

**Goal**: Verify that new user registration creates complete profile with terms tracking.

### Steps

1. **Navigate to Registration Page**
   ```
   http://localhost:5173/register
   ```

2. **Fill Out Registration Form**
   - Email: `test-new-user@example.com`
   - Password: `test123456`
   - Full Name: `New Test User`
   - Organization Name: `Test Organization`
   - ✓ Accept terms of service

3. **Submit Form**
   - Click "Create Account" button
   - Should redirect to `/onboarding/wizard` or dashboard

4. **Verify Database State**

   Open Supabase Studio or run SQL:

   ```sql
   -- Query the newly created user
   SELECT
     id,
     email,
     full_name,
     terms_accepted_at,
     terms_version,
     created_at,
     updated_at
   FROM public.users
   WHERE email = 'test-new-user@example.com';
   ```

   **Expected Results**:
   - ✅ Record exists in `public.users`
   - ✅ `email` = `'test-new-user@example.com'`
   - ✅ `full_name` = `'New Test User'`
   - ✅ `terms_accepted_at` is a recent timestamp (within last minute)
   - ✅ `terms_version` = `'v1.0'`
   - ✅ `created_at` is a recent timestamp
   - ✅ `updated_at` is a recent timestamp

5. **Verify Organization Created**

   ```sql
   -- Check organization and membership
   SELECT
     o.id,
     o.name,
     uo.user_id,
     uo.role
   FROM organizations o
   JOIN user_organizations uo ON o.id = uo.organization_id
   JOIN users u ON uo.user_id = u.id
   WHERE u.email = 'test-new-user@example.com';
   ```

   **Expected Results**:
   - ✅ Organization named `'Test Organization'` exists
   - ✅ User is member with role `'owner'`

6. **Verify Auth Record**

   ```sql
   -- Check auth.users has corresponding record
   SELECT
     id,
     email,
     raw_user_meta_data->>'full_name' as meta_full_name,
     raw_user_meta_data->>'terms_accepted_at' as meta_terms_timestamp,
     raw_user_meta_data->>'terms_version' as meta_terms_version
   FROM auth.users
   WHERE email = 'test-new-user@example.com';
   ```

   **Expected Results**:
   - ✅ Record exists in `auth.users`
   - ✅ `meta_full_name` = `'New Test User'`
   - ✅ `meta_terms_timestamp` is ISO 8601 timestamp
   - ✅ `meta_terms_version` = `'v1.0'`

### Success Criteria

- [x] User can complete registration without errors
- [x] `public.users` record created immediately (no delay)
- [x] All profile fields populated (email, full_name, terms fields)
- [x] Terms timestamp is accurate (matches registration time)
- [x] Organization and membership created
- [x] Data in `public.users` matches data in `auth.users` metadata

---

## Test Scenario 2: Existing User Profile Visibility

**Goal**: Verify that existing users (who registered before this feature) have profile data backfilled.

### Steps

1. **Identify Existing User**

   Find a user who registered before migration 00004:

   ```sql
   -- Find existing users (created before feature deployment)
   SELECT
     id,
     email,
     created_at
   FROM auth.users
   WHERE created_at < '2025-10-06'  -- Adjust date to deployment date
   ORDER BY created_at ASC
   LIMIT 1;
   ```

   Note the `id` and `email` for testing.

2. **Login as Existing User**
   - Navigate to `http://localhost:5173/login`
   - Enter existing user's email and password
   - Should successfully login and redirect to dashboard

3. **Verify Profile Data Backfilled**

   ```sql
   -- Check if existing user has profile in public.users
   SELECT
     id,
     email,
     full_name,
     terms_accepted_at,
     terms_version,
     created_at
   FROM public.users
   WHERE email = '<existing-user-email>';
   ```

   **Expected Results**:
   - ✅ Record exists in `public.users` (backfilled by migration)
   - ✅ `email` matches auth.users email
   - ✅ `full_name` may be NULL (if metadata didn't exist before)
   - ✅ `terms_accepted_at` is NULL (legacy user - no tracking before feature)
   - ✅ `terms_version` may be `'v1.0'` or NULL
   - ✅ `created_at` matches auth.users created_at

4. **Verify UI Handles NULL Gracefully**
   - If profile viewing UI exists, check that it doesn't crash on NULL full_name
   - Should display email even if full_name is missing

### Success Criteria

- [x] Existing user can login successfully
- [x] `public.users` record exists after backfill migration
- [x] Email is populated (non-NULL)
- [x] NULL values handled gracefully (no UI crashes)
- [x] Legacy users distinguishable by NULL `terms_accepted_at`

---

## Test Scenario 3: Terms Acceptance Audit

**Goal**: Verify that terms acceptance data can be queried for compliance auditing.

### Steps

1. **Query Users Who Have Accepted Terms**

   ```sql
   -- Find all users who explicitly accepted terms (non-NULL timestamp)
   SELECT
     id,
     email,
     full_name,
     terms_accepted_at,
     terms_version
   FROM public.users
   WHERE terms_accepted_at IS NOT NULL
   ORDER BY terms_accepted_at DESC;
   ```

   **Expected Results**:
   - ✅ Returns all users who registered after feature deployment
   - ✅ Each has non-NULL `terms_accepted_at` timestamp
   - ✅ Each has `terms_version` = `'v1.0'`

2. **Query Legacy Users (No Terms Tracking)**

   ```sql
   -- Find users who registered before terms tracking
   SELECT
     id,
     email,
     full_name,
     terms_accepted_at,
     created_at
   FROM public.users
   WHERE terms_accepted_at IS NULL
   ORDER BY created_at ASC;
   ```

   **Expected Results**:
   - ✅ Returns users who registered before migration 00004
   - ✅ All have NULL `terms_accepted_at`
   - ✅ Created_at predates feature deployment date

3. **Query Users by Terms Version**

   ```sql
   -- Find users who accepted specific terms version
   SELECT
     id,
     email,
     terms_version,
     terms_accepted_at
   FROM public.users
   WHERE terms_version = 'v1.0'
   ORDER BY terms_accepted_at DESC;
   ```

   **Expected Results**:
   - ✅ Returns all users with v1.0 terms
   - ✅ Each has matching `terms_version`

4. **Simulate Future Re-Acceptance Query**

   ```sql
   -- Find users who need to re-accept terms (for future v2.0 rollout)
   SELECT
     id,
     email,
     terms_version,
     terms_accepted_at
   FROM public.users
   WHERE terms_version IS NULL
      OR terms_version != 'v2.0'
   ORDER BY email;
   ```

   **Expected Results**:
   - ✅ Query executes without errors
   - ✅ Returns all users (since v2.0 doesn't exist yet)
   - ✅ Demonstrates schema supports future terms updates

### Success Criteria

- [x] Can query users by terms acceptance status
- [x] Can distinguish legacy users from new users
- [x] Can filter by terms version
- [x] Schema supports future terms re-acceptance workflows

---

## Test Scenario 4: Data Consistency Verification

**Goal**: Verify that registration is atomic (all-or-nothing) and data is consistent.

### Steps

1. **Verify Referential Integrity**

   ```sql
   -- Ensure every public.users record has corresponding auth.users
   SELECT
     pu.id,
     pu.email,
     au.id as auth_id
   FROM public.users pu
   LEFT JOIN auth.users au ON pu.id = au.id
   WHERE au.id IS NULL;
   ```

   **Expected Results**:
   - ✅ Returns 0 rows (all public.users have auth.users parent)

2. **Verify No Orphaned Auth Records**

   ```sql
   -- Check if any auth.users lack public.users record
   SELECT
     au.id,
     au.email,
     pu.id as profile_id
   FROM auth.users au
   LEFT JOIN public.users pu ON au.id = pu.id
   WHERE pu.id IS NULL;
   ```

   **Expected Results**:
   - ✅ Returns 0 rows (trigger created profile for every auth user)

3. **Verify Email Uniqueness**

   ```sql
   -- Check for duplicate emails in public.users
   SELECT
     email,
     COUNT(*) as count
   FROM public.users
   GROUP BY email
   HAVING COUNT(*) > 1;
   ```

   **Expected Results**:
   - ✅ Returns 0 rows (UNIQUE constraint enforced)

4. **Verify Timestamp Consistency**

   ```sql
   -- Check that created_at in public.users matches auth.users
   SELECT
     pu.id,
     pu.email,
     pu.created_at as profile_created,
     au.created_at as auth_created,
     (pu.created_at - au.created_at) as time_diff
   FROM public.users pu
   JOIN auth.users au ON pu.id = au.id
   WHERE ABS(EXTRACT(EPOCH FROM (pu.created_at - au.created_at))) > 5;
   ```

   **Expected Results**:
   - ✅ Returns 0 rows (timestamps match within 5 seconds)

### Success Criteria

- [x] No orphaned records (all auth users have profiles)
- [x] No duplicate emails
- [x] Timestamps consistent between auth.users and public.users
- [x] Foreign key constraints enforced

---

## Test Scenario 5: Contract Test Execution

**Goal**: Run automated contract tests to verify API contracts.

### Steps

1. **Run Contract Tests**

   ```bash
   npm test specs/003-plan-complete-user/contracts/registration.test.ts
   npm test specs/003-plan-complete-user/contracts/profile-retrieval.test.ts
   ```

2. **Verify Test Results**

   **Expected Output**:
   - ✅ All registration contract tests pass
   - ✅ All profile retrieval contract tests pass
   - ✅ No errors or warnings

3. **Review Coverage**

   ```bash
   npm test -- --coverage specs/003-plan-complete-user/contracts/
   ```

   **Expected Results**:
   - ✅ Contract tests cover all functional requirements (FR-001 through FR-010)

### Success Criteria

- [x] All contract tests pass
- [x] Tests cover registration flow
- [x] Tests cover profile retrieval
- [x] Tests cover legacy user handling
- [x] Tests cover terms auditing

---

## Rollback Procedure (Development Only)

If you need to rollback the feature during testing:

1. **Revert Migration**

   ```bash
   supabase migration down 00004_auto_create_user_profile.sql
   ```

2. **Verify Rollback**

   ```sql
   -- Check columns removed
   SELECT column_name
   FROM information_schema.columns
   WHERE table_name = 'users'
     AND column_name IN ('terms_accepted_at', 'terms_version');
   ```

   Should return 0 rows.

3. **Clean Up Test Data**

   ```bash
   supabase db reset  # Resets to migrations before 00004
   ```

**WARNING**: Do NOT rollback in production. Data loss will occur.

---

## Success Summary

After completing all test scenarios, you should have verified:

- ✅ New users get complete profiles with terms tracking
- ✅ Existing users have backfilled profiles (with NULL legacy handling)
- ✅ Terms acceptance data is queryable for auditing
- ✅ Data is consistent and referentially sound
- ✅ Trigger creates profiles automatically (no race conditions)
- ✅ Contract tests pass (API contracts enforced)

## Next Steps

After manual verification:
1. Run full test suite (`npm test`)
2. Verify CI/CD pipeline passes
3. Deploy to staging environment
4. Repeat test scenarios in staging
5. Deploy to production

---

**Quickstart Complete**: Feature ready for implementation phase.
