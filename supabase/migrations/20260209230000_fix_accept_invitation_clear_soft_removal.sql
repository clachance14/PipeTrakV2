-- Migration: Fix accept_invitation_for_user to clear deleted_at
-- Date: 2026-02-09
-- Issue: When a soft-deleted user re-accepts an invitation, deleted_at was not cleared,
--        causing the user to remain invisible in the team management view.

CREATE OR REPLACE FUNCTION accept_invitation_for_user(
  p_user_id UUID,
  p_invitation_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_invitation RECORD;
  v_result JSONB;
BEGIN
  -- Get invitation details
  SELECT
    id,
    email,
    organization_id,
    role,
    status,
    expires_at
  INTO v_invitation
  FROM invitations
  WHERE id = p_invitation_id
  LIMIT 1;

  -- Validate invitation exists
  IF v_invitation.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVITATION_NOT_FOUND'
    );
  END IF;

  -- Validate invitation status
  IF v_invitation.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVITATION_ALREADY_ACCEPTED'
    );
  END IF;

  -- Validate invitation not expired
  IF v_invitation.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVITATION_EXPIRED'
    );
  END IF;

  -- Verify user email matches invitation
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id
    AND email = v_invitation.email
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EMAIL_MISMATCH'
    );
  END IF;

  -- Update user with organization and role, clear soft-delete if previously removed
  UPDATE users
  SET
    organization_id = v_invitation.organization_id,
    role = v_invitation.role,
    deleted_at = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Mark invitation as accepted
  UPDATE invitations
  SET
    status = 'accepted',
    accepted_at = NOW()
  WHERE id = p_invitation_id;

  -- Return success with organization info
  SELECT jsonb_build_object(
    'success', true,
    'organization_id', v_invitation.organization_id,
    'role', v_invitation.role
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION accept_invitation_for_user(UUID, UUID) IS
  'Accepts an invitation for a user by assigning organization_id and role from the invitation. Clears deleted_at for previously removed users. Uses SECURITY DEFINER to bypass RLS. Can be called immediately after signup even without an active session.';
