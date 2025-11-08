-- Migration: Add demo user fields to users table
-- Feature: 021-public-homepage
-- Task: T002
-- Description: Extend users table to mark demo users and track expiration dates (7 days from signup)

-- Add demo user fields to users table
ALTER TABLE users
  ADD COLUMN is_demo_user BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN demo_expires_at TIMESTAMPTZ;

-- Create partial index for efficient demo user expiration queries
-- Only indexes rows where is_demo_user = TRUE to minimize index size
CREATE INDEX idx_users_demo_expiration
  ON users (is_demo_user, demo_expires_at)
  WHERE is_demo_user = TRUE;

-- Add comment documenting validation rules (enforced at application layer)
COMMENT ON COLUMN users.is_demo_user IS 'Indicates if this is a demo/trial user account';
COMMENT ON COLUMN users.demo_expires_at IS 'Expiration timestamp for demo accounts (must be NOT NULL when is_demo_user = TRUE, must be NULL when is_demo_user = FALSE - validated at application layer)';
