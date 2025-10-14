-- Migration: Auto-Create User Profile on Signup
-- Feature: 003-plan-complete-user
-- Purpose: Automatically create public.users records from auth.users on signup,
--          track terms of service acceptance, and backfill existing users
--
-- Requirements Addressed:
-- FR-001: Store user email in public.users table
-- FR-002: Store user full name in public.users table
-- FR-003: Track terms acceptance timestamp
-- FR-004: Store terms version information
-- FR-005: Automatic profile creation via database trigger
-- FR-006: Handle legacy users (NULL terms for pre-feature users)
-- FR-007: Zero downtime deployment (idempotent operations)
-- FR-008: Immediate data availability (trigger runs in auth transaction)
-- FR-009: Enable terms compliance auditing via queries
-- FR-010: Atomic operations (all-or-nothing via transaction)

-- This migration file will be populated with:
-- 1. Schema changes (ALTER TABLE to add columns + indexes)
-- 2. Trigger function (CREATE FUNCTION handle_new_user)
-- 3. Trigger attachment (CREATE TRIGGER on_auth_user_created)
-- 4. Backfill SQL (INSERT existing users from auth.users)

-- ==============================================================================
-- 1. SCHEMA CHANGES
-- ==============================================================================

-- Add terms acceptance tracking columns
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS terms_version TEXT NULL DEFAULT 'v1.0';

-- Add indexes for terms querying (partial indexes for better performance)
CREATE INDEX IF NOT EXISTS users_terms_version_idx
  ON public.users(terms_version)
  WHERE terms_version IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_terms_accepted_at_idx
  ON public.users(terms_accepted_at)
  WHERE terms_accepted_at IS NOT NULL;

-- Add column documentation
COMMENT ON COLUMN public.users.terms_accepted_at IS
  'Timestamp when user accepted terms of service. NULL for legacy users who registered before tracking was implemented.';

COMMENT ON COLUMN public.users.terms_version IS
  'Version of terms accepted (semantic versioning: v1.0, v2.0, etc.). Defaults to v1.0 for initial rollout.';

-- ==============================================================================
-- 2. TRIGGER FUNCTION
-- ==============================================================================

-- Function to automatically create public.users record from auth.users metadata
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

-- ==============================================================================
-- 3. TRIGGER ATTACHMENT
-- ==============================================================================

-- Drop existing trigger if present (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Attach trigger to auth.users INSERT events
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. BACKFILL EXISTING USERS
-- ==============================================================================

-- Backfill existing auth.users into public.users
-- This populates profile data for users who registered before this feature
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
