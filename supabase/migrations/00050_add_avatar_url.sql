-- Migration: Add avatar_url column to users table
-- Feature: 017-user-profile-management
-- Purpose: Support profile photo uploads via Supabase Storage
-- Date: 2025-10-27

-- Add avatar_url column to users table
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.avatar_url IS
  'Public URL to user avatar image in Supabase Storage avatars bucket. NULL if no avatar uploaded.';

-- Update RLS policies for users table to allow avatar_url updates
-- Users can update their own avatar_url
CREATE POLICY "Users can update own avatar_url"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
