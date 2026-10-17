/**
 * src/services/supabase/client.ts
 *
 * Canonical Supabase Client definition & Error Formatters for StockIN
 */

import { createClient } from '@supabase/supabase-js';

// Canonical public Supabase configuration for StockIN
const CANONICAL_SUPABASE_URL = 'https://lcwspuljhgozqkhvkpdq.supabase.co';
const CANONICAL_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxjd3NwdWxqaGdvenFraHZrcGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1Nzc4MTEsImV4cCI6MjEwNTE1MzgxMX0.rUsrFBis7rq7nEGxx40c3a0RJLQ-EK-p8RfjeDFxZ-I';

const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)?.trim();

const isExplicitValidUrl = Boolean(
  rawUrl &&
  !rawUrl.includes('your_supabase') &&
  !rawUrl.includes('your-project') &&
  !rawUrl.includes('placeholder')
);

const isExplicitValidKey = Boolean(
  rawKey &&
  !rawKey.includes('your_supabase') &&
  !rawKey.includes('your-supabase-anon-key') &&
  !rawKey.includes('placeholder')
);

// Fallback to canonical production credentials if environment variables are not injected by host (e.g. Vercel)
export const supabaseUrl = isExplicitValidUrl ? rawUrl! : CANONICAL_SUPABASE_URL;
export const supabaseAnonKey = isExplicitValidKey ? rawKey! : CANONICAL_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'stockin_auth',
  },
});

/**
 * Maps raw Supabase/PostgreSQL error messages to safe, user-friendly copy.
 * Ensures no raw technical exceptions, stack traces, or SQL errors reach the user.
 */
export function formatAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const message = (typeof error === 'object' && error !== null && 'message' in error)
    ? String((error as { message: unknown }).message).toLowerCase()
    : String(error).toLowerCase();

  // --- Authentication errors ---
  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return 'Invalid email or password.';
  }
  if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
    return 'Please verify your email address before signing in.';
  }
  if (message.includes('user already registered') || message.includes('already exists') || message.includes('already been registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (message.includes('password should be at least') || message.includes('password is too short') || message.includes('weak_password')) {
    return 'Password must be at least 6 characters long.';
  }
  if (message.includes('valid email') || message.includes('invalid email') || message.includes('unable to validate')) {
    return 'Please enter a valid email address.';
  }
  if (message.includes('rate limit') || message.includes('over_email_send_rate_limit') || message.includes('too many requests')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (message.includes('signup is disabled') || message.includes('signups not allowed')) {
    return 'New registrations are temporarily disabled. Please try again later.';
  }
  if (message.includes('expired') || message.includes('token_expired') || message.includes('token has expired')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (message.includes('token') && (message.includes('invalid') || message.includes('malformed'))) {
    return 'Invalid session token. Please sign in again.';
  }

  // --- Network / connectivity errors ---
  if (
    message.includes('failed to fetch') ||
    message.includes('network request failed') ||
    message.includes('networkerror') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('net::err')
  ) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }

  // --- Database / RLS errors ---
  if (message.includes('row-level security') || message.includes('rls') || message.includes('permission denied')) {
    return 'Access denied. You do not have permission to perform this action.';
  }
  if (message.includes('foreign key') || message.includes('violates foreign key constraint')) {
    return 'This record cannot be modified because it is linked to other data.';
  }
  if (message.includes('unique') || message.includes('duplicate key')) {
    return 'A record with these details already exists.';
  }

  // --- Unconfigured Supabase (development) ---
  if (!isSupabaseConfigured && (message.includes('placeholder') || message.includes('fetch'))) {
    return 'Supabase project not connected. Please set your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.';
  }

  return 'Authentication failed. Please verify your details and try again.';
}

/**
 * Maps raw Supabase database error codes/messages to safe user-facing messages.
 * Use this for non-auth database operations (insert, update, select).
 */
export function formatDbError(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const message = (typeof error === 'object' && error !== null && 'message' in error)
    ? String((error as { message: unknown }).message).toLowerCase()
    : String(error).toLowerCase();

  if (message.includes('row-level security') || message.includes('permission denied')) {
    return 'Access denied. You do not have permission to access this data.';
  }
  if (message.includes('foreign key')) {
    return 'This record is linked to other data and cannot be deleted or modified.';
  }
  if (message.includes('unique') || message.includes('duplicate')) {
    return 'A record with these details already exists.';
  }
  if (message.includes('not null') || message.includes('null value')) {
    return 'Required information is missing. Please fill in all required fields.';
  }
  if (message.includes('network') || message.includes('failed to fetch') || message.includes('timeout')) {
    return 'Network error. Please check your connection and try again.';
  }

  return 'A database error occurred. Please try again.';
}
