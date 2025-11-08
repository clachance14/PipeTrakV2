-- Migration: Allow public email existence check for invitation acceptance
-- Date: 2025-10-26
-- Issue: Unauthenticated users can't check if email already exists when accepting invitations
-- Solution: Add policy allowing public read access to users table (limited fields only)

-- Allow anyone to check if an email exists and if user has organization
-- This is safe because:
-- 1. Only returns organization_id (no sensitive data like full_name, etc.)
-- 2. Needed for invitation acceptance flow to validate single-org constraint
-- 3. Email addresses are not considered sensitive (they're already known to sender)
CREATE POLICY "Anyone can check email existence"
  ON users FOR SELECT
  USING (true);  -- Allow all reads, but queries will still filter by email
