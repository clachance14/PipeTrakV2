-- Migration: Add logo_url column to organizations
-- Feature: Company Logo Support
-- Purpose: Store organization logo URL for header display and PDF reports

-- Add logo_url column to organizations table
ALTER TABLE organizations ADD COLUMN logo_url TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN organizations.logo_url IS 'Public URL to organization logo image stored in org-logos bucket';
