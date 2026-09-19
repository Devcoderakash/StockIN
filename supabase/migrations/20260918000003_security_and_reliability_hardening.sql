-- ==============================================================================
-- Migration: 20260918000003_security_and_reliability_hardening.sql
-- StockIN — Step 6: Security Hardening, View Isolation & Schema Cache Synchronization
--
-- 1. Hardens public.handle_new_user with explicit search_path = public, pg_temp.
-- 2. Hardens public.history view with WITH (security_invoker = true) so PostgREST
--    strictly evaluates PostgreSQL Row Level Security (RLS) on the caller context.
-- 3. Emits NOTIFY pgrst, 'reload schema' to ensure PostgREST in-memory cache
--    remains synchronized with all tables and stored procedures.
-- ==============================================================================

-- ── 1. Harden handle_new_user SECURITY DEFINER search_path ────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, business_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name',     new.raw_user_meta_data->>'fullName',     ''),
    COALESCE(new.raw_user_meta_data->>'business_name', new.raw_user_meta_data->>'businessName', ''),
    new.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- ── 2. Recreate public.history view with security_invoker = true ──────────────
DROP VIEW IF EXISTS public.history;
CREATE VIEW public.history
WITH (security_invoker = true) AS
SELECT * FROM public.documents;

GRANT ALL ON public.history TO authenticated;
GRANT ALL ON public.history TO anon;

-- ── 3. Synchronize PostgREST Schema Cache ─────────────────────────────────────
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
