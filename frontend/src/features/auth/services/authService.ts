/**
 * src/features/auth/services/authService.ts
 *
 * Dedicated Supabase service layer for Authentication & Profile operations
 */

import { supabase, formatAuthError } from '@/lib/supabase/client';
import type { UserProfile } from '@/types';

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  businessName: string;
}

export interface AuthResult<T = void> {
  success: boolean;
  data?: T;
  needsEmailVerification?: boolean;
  error?: string;
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    return { success: false, error: formatAuthError(error) };
  }
  return { success: true };
}

export async function signUp(params: SignUpParams): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email: params.email.trim().toLowerCase(),
    password: params.password,
    options: {
      data: {
        full_name: params.fullName.trim(),
        business_name: params.businessName.trim(),
      },
    },
  });

  if (error) {
    return { success: false, error: formatAuthError(error) };
  }

  // If user exists but session is null, Supabase requires email confirmation
  const needsEmailVerification = Boolean(data.user && !data.session);
  return { success: true, needsEmailVerification };
}

export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { success: false, error: formatAuthError(error) };
  }
  return { success: true };
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const redirectTo = `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo }
  );

  if (error) {
    return { success: false, error: formatAuthError(error) };
  }
  return { success: true };
}

export async function updatePassword(password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { success: false, error: formatAuthError(error) };
  }
  return { success: true };
}

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[AuthService] fetchProfile error:', error.message);
    return null;
  }

  if (data) {
    return {
      id: data.id,
      userId: data.id,
      fullName: data.full_name || '',
      businessName: data.business_name || '',
      phone: data.phone || '',
      email: data.email || '',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
  return null;
}
