-- ==============================================================================
-- Migration: 20260918000002_documents_storage_and_history.sql
-- StockIN — Step 5: Supabase Storage & Document History Metadata System
--
-- 1. Provisions private 'documents' Supabase Storage bucket with 10MB PDF limits.
-- 2. Configures strict tenant-isolated RLS on storage.objects:
--    (storage.foldername(name))[1] = auth.uid()::text.
-- 3. Creates public.documents metadata tracking table with unique constraints
--    and query-optimized compound indexes for History filters & search.
-- 4. Extends invoices and quotations tables with storage_file_path and file_size.
-- 5. Creates public.history view for immediate visibility in Supabase.
-- 6. Automatically backfills all existing invoices and quotations into documents.
-- ==============================================================================

-- ── 1. Create Private Supabase Storage Bucket ─────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10 MB limit
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf']::text[];

-- ── 2. Storage Tenant Isolation Policies ──────────────────────────────────────
-- Note: Tenant path convention: {user_id}/invoices/{invoice_id}.pdf
--                              {user_id}/quotations/{quotation_id}.pdf

DROP POLICY IF EXISTS "documents_select_own" ON storage.objects;
CREATE POLICY "documents_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "documents_insert_own" ON storage.objects;
CREATE POLICY "documents_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "documents_update_own" ON storage.objects;
CREATE POLICY "documents_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "documents_delete_own" ON storage.objects;
CREATE POLICY "documents_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 3. Extend Invoices & Quotations Tables with Storage References ────────────
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS storage_file_path TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;

ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS storage_file_path TEXT;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;

-- ── 4. Document Metadata Table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id               TEXT PRIMARY KEY,
  user_id          UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type    TEXT NOT NULL CHECK (document_type IN ('invoice', 'quotation')),
  document_id      TEXT NOT NULL,
  document_number  TEXT NOT NULL,
  customer_id      TEXT DEFAULT '',
  customer_name    TEXT DEFAULT 'Customer',
  file_path        TEXT NOT NULL,
  file_size        BIGINT NOT NULL DEFAULT 0,
  mime_type        TEXT NOT NULL DEFAULT 'application/pdf',
  pdf_status       TEXT NOT NULL DEFAULT 'ready' CHECK (pdf_status IN ('pending', 'ready', 'failed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_documents_user_type_doc UNIQUE (user_id, document_type, document_id)
);

-- ── 5. History Query Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_documents_user_id       ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_created  ON public.documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_user_type     ON public.documents(user_id, document_type);
CREATE INDEX IF NOT EXISTS idx_documents_user_customer ON public.documents(user_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_doc_num  ON public.documents(user_id, document_number);

-- ── 6. Enable Row Level Security (RLS) ────────────────────────────────────────
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_own" ON public.documents;
CREATE POLICY "documents_own" ON public.documents
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.documents TO authenticated;

-- ── 7. History Alias View (Shows up as 'history' in Supabase Table/View list) ───
CREATE OR REPLACE VIEW public.history AS
SELECT * FROM public.documents;

GRANT ALL ON public.history TO authenticated;

-- ── 8. Automatically Backfill Existing Invoices & Quotations ──────────────────
INSERT INTO public.documents (
  id,
  user_id,
  document_type,
  document_id,
  document_number,
  customer_id,
  customer_name,
  file_path,
  file_size,
  mime_type,
  pdf_status,
  created_at,
  updated_at
)
SELECT
  'invoice_' || i.id,
  i.user_id,
  'invoice',
  i.id,
  i.invoice_number,
  COALESCE(i.customer_id, ''),
  COALESCE(i.customer_name, 'Customer'),
  COALESCE(i.storage_file_path, i.user_id || '/invoices/' || i.id || '.pdf'),
  COALESCE(i.file_size, 0),
  'application/pdf',
  CASE WHEN i.storage_file_path IS NOT NULL THEN 'ready' ELSE 'pending' END,
  i.created_at,
  i.created_at
FROM public.invoices i
ON CONFLICT (user_id, document_type, document_id) DO UPDATE SET
  customer_name = EXCLUDED.customer_name,
  document_number = EXCLUDED.document_number,
  file_path = EXCLUDED.file_path;

INSERT INTO public.documents (
  id,
  user_id,
  document_type,
  document_id,
  document_number,
  customer_id,
  customer_name,
  file_path,
  file_size,
  mime_type,
  pdf_status,
  created_at,
  updated_at
)
SELECT
  'quotation_' || q.id,
  q.user_id,
  'quotation',
  q.id,
  q.quotation_number,
  COALESCE(q.customer_id, ''),
  COALESCE(q.customer_name, 'Customer'),
  COALESCE(q.storage_file_path, q.user_id || '/quotations/' || q.id || '.pdf'),
  COALESCE(q.file_size, 0),
  'application/pdf',
  CASE WHEN q.storage_file_path IS NOT NULL THEN 'ready' ELSE 'pending' END,
  q.created_at,
  q.created_at
FROM public.quotations q
ON CONFLICT (user_id, document_type, document_id) DO UPDATE SET
  customer_name = EXCLUDED.customer_name,
  document_number = EXCLUDED.document_number,
  file_path = EXCLUDED.file_path;
