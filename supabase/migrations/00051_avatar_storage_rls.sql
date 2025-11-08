-- Add RLS policies for avatars storage bucket
-- Feature: 017-user-profile-management
-- Purpose: Secure avatar uploads with user-owned folder access

-- Allow authenticated users to read any avatar (public team photos)
CREATE POLICY "Public avatars are viewable by authenticated users"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- Allow users to upload to their own folder only
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatar only
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatar only
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
