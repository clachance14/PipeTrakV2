-- Migration: Allow users to update their own invitation when accepting
-- Date: 2025-10-27
-- Issue: New users cannot mark invitation as accepted because they don't have org/role yet
-- Solution: Create helper function and add policy allowing users to update their invitations

-- Helper function to get current user's email (bypasses RLS)
CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT email
    FROM users
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_current_user_email() IS
  'Returns the email of the current authenticated user. Uses SECURITY DEFINER to bypass RLS.';

-- Add policy allowing users to update invitations for their own email
CREATE POLICY "Users can accept their own invitations"
  ON invitations FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND email = get_current_user_email()
    AND status = 'pending'
  )
  WITH CHECK (
    -- Only allow updating to accepted status
    status = 'accepted'
  );

COMMENT ON POLICY "Users can accept their own invitations" ON invitations IS
  'Allows authenticated users to mark invitations sent to their email as accepted. Only pending invitations can be updated to accepted status.';
