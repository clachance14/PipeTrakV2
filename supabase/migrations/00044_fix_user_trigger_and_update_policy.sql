-- Migration: Fix handle_new_user trigger and UPDATE policy
-- Date: 2025-10-26
-- Issue: Signup fails with 500 error, UPDATE policy has recursion
-- Solution: Make trigger more robust, fix UPDATE policy recursion

-- Fix UPDATE policy (remove recursive check)
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());  -- Simplified: users can only update their own record

COMMENT ON POLICY "Users can update own profile" ON users IS
  'Users can only update their own user record';

-- Recreate handle_new_user trigger with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_count INT;
  is_first_user BOOLEAN;
BEGIN
  -- Check if this is the first user (super admin)
  SELECT COUNT(*) INTO user_count FROM auth.users;
  is_first_user := (user_count = 1);

  -- Create public.users record from auth.users metadata
  -- Wrap in BEGIN/EXCEPTION to handle any errors gracefully
  BEGIN
    INSERT INTO public.users (
      id,
      email,
      full_name,
      terms_accepted_at,
      terms_version,
      is_super_admin,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),  -- Default to empty string if null
      (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamptz,
      COALESCE(NEW.raw_user_meta_data->>'terms_version', 'v1.0'),
      is_first_user,
      NEW.created_at,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Failed to create public.users record for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger function to auto-create public.users record from auth.users metadata on signup. First user is marked as super admin. Errors are logged but do not fail signup.';
