/**
 * src/lib/supabase/client.ts
 *
 * Backward-compatible re-export module.
 * Canonical Supabase client definition lives in src/services/supabase/client.ts.
 */

export {
  supabase,
  isSupabaseConfigured,
  formatAuthError,
  formatDbError,
} from '@/services/supabase/client';
