-- Migration: Fix progress_templates RLS policy to allow anonymous access
-- Reason: Progress templates are global, non-sensitive data needed before authentication
-- Templates are not organization-specific and contain only workflow definitions

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can view progress_templates" ON progress_templates;

-- Create new policy allowing anonymous (public) read access
CREATE POLICY "Anyone can view progress_templates"
ON progress_templates FOR SELECT
USING (true);  -- Allow all users (anon and authenticated) to read progress templates

-- Progress templates remain protected from modifications (no INSERT/UPDATE/DELETE policies)
-- Only database administrators can modify templates
