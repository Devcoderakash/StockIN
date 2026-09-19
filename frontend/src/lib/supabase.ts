/**
 * src/lib/supabase.ts
 *
 * Backward-compatible re-export module.
 * The primary Supabase client definition lives in src/lib/supabase/client.ts.
 */

export {
  supabase,
  isSupabaseConfigured,
  formatAuthError,
  formatDbError,
} from './supabase/client';
