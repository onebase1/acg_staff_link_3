-- Migration: Fix Documents Storage Bucket
-- Date: 2025-11-23
-- Purpose: Create documents bucket with proper CORS and access policies

-- ============================================================
-- STORAGE BUCKET SETUP
-- ============================================================

-- Create documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760, -- 10MB max file size
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access to documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;

-- Policy: Anyone can view/download documents (public read)
CREATE POLICY "Public Access to documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- Policy: Authenticated users can upload documents
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
);

-- Policy: Authenticated users can update their own documents
CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
);

-- Policy: Authenticated users can delete their own documents
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
);

-- ============================================================
-- CORS CONFIGURATION (for reference)
-- ============================================================

-- NOTE: CORS cannot be set via SQL migration.
-- You must configure CORS in Supabase Dashboard:
--
-- 1. Go to: Supabase Dashboard → Storage → Configuration
-- 2. Add allowed origins:
--    - https://agilecareanagement.co.uk
--    - https://*.agilecareanagement.co.uk
--    - http://localhost:5173 (for local dev)
-- 3. Allowed methods: GET, POST, PUT, DELETE
-- 4. Allowed headers: authorization, x-client-info, apikey, content-type

COMMENT ON TABLE storage.buckets IS 'Storage buckets with documents bucket configured for timesheet uploads';
