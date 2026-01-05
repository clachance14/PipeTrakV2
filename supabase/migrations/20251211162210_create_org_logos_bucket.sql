-- Migration: Create org-logos storage bucket with RLS policies
-- Feature: Company Logo Support
-- Purpose: Secure storage for organization logo images

-- Create org-logos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-logos',
  'org-logos',
  true,
  2097152, -- 2MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read any org logo (for header display across org)
CREATE POLICY "Org logos are viewable by authenticated users"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'org-logos');

-- Allow owner/admin to upload org logo
-- Folder structure: org-logos/{organization_id}/logo.{ext}
CREATE POLICY "Owner or admin can upload org logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'org-logos' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id::text = (storage.foldername(name))[1]
    AND users.role IN ('owner', 'admin')
    AND users.deleted_at IS NULL
  )
);

-- Allow owner/admin to update org logo
CREATE POLICY "Owner or admin can update org logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'org-logos' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id::text = (storage.foldername(name))[1]
    AND users.role IN ('owner', 'admin')
    AND users.deleted_at IS NULL
  )
);

-- Allow owner/admin to delete org logo
CREATE POLICY "Owner or admin can delete org logo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'org-logos' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id::text = (storage.foldername(name))[1]
    AND users.role IN ('owner', 'admin')
    AND users.deleted_at IS NULL
  )
);
