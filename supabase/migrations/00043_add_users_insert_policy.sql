-- Migration: Add INSERT policy for users table
-- Date: 2025-10-26
-- Issue: handle_new_user() trigger fails because no INSERT policy exists
-- Solution: Add policy to allow inserts (trigger uses SECURITY DEFINER to bypass RLS anyway)

-- Note: Even though the trigger uses SECURITY DEFINER, having an explicit policy
-- helps with debugging and follows best practices

CREATE POLICY "System can insert users"
  ON users FOR INSERT
  WITH CHECK (true);  -- Allow all inserts (trigger validates data)

COMMENT ON POLICY "System can insert users" ON users IS
  'Allows handle_new_user() trigger to create user records. Trigger uses SECURITY DEFINER to bypass RLS.';
