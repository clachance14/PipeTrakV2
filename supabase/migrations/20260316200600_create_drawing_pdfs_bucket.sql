-- Create the drawing-pdfs storage bucket for AI drawing import
-- Private bucket, 50MB limit, PDF only

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'drawing-pdfs',
  'drawing-pdfs',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for drawing-pdfs bucket
-- Policy: Project members can read drawing PDFs
CREATE POLICY "Project members can read drawing PDFs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'drawing-pdfs'
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM projects p
    JOIN users u ON u.organization_id = p.organization_id
    WHERE u.id = auth.uid()
  )
);

-- Policy: Project members can upload drawing PDFs
CREATE POLICY "Project members can upload drawing PDFs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'drawing-pdfs'
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM projects p
    JOIN users u ON u.organization_id = p.organization_id
    WHERE u.id = auth.uid()
  )
);

-- Policy: Project members can update (overwrite) drawing PDFs
CREATE POLICY "Project members can update drawing PDFs"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'drawing-pdfs'
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM projects p
    JOIN users u ON u.organization_id = p.organization_id
    WHERE u.id = auth.uid()
  )
);

-- Policy: Admins and PMs can delete drawing PDFs
CREATE POLICY "Admins and PMs can delete drawing PDFs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'drawing-pdfs'
  AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'admin', 'project_manager')
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM projects p
    JOIN users u ON u.organization_id = p.organization_id
    WHERE u.id = auth.uid()
  )
);
