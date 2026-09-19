import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, formatAuthError } from '@/lib/supabase';
import type { UserProfile } from '@/types';

interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  businessName: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (params: SignUpParams) => Promise<{ success: boolean; needsEmailVerification?: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  userDisplayName: string;
  userEmail: string;
  businessName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // Tracks whether the current session is from a Supabase password-recovery email link.
  // When true, the ResetPasswordPage is shown rather than the dashboard.
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);

  // Initialize session once on app mount
  useEffect(() => {
    let isMounted = true;

    // 1. Check existing session
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (!isMounted) return;
      if (error) {
        console.error('[StockIN Auth] Initial session resolution error:', error.message);
      }
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
    }).catch((err) => {
      if (!isMounted) return;
      console.error('[StockIN Auth] Session fetch exception:', err);
      setLoading(false);
    });

    // 2. Listen to real-time auth events (token refreshes, sign in, sign out, password recovery)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the password-reset email link.
        // Keep them on /reset-password — do NOT redirect to dashboard.
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_IN' && isPasswordRecovery) {
        // After password update, clear recovery flag
        setIsPasswordRecovery(false);
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute profile info derived from user metadata
  const profile = useMemo<UserProfile | null>(() => {
    if (!user) return null;
    const meta = user.user_metadata || {};
    return {
      id: user.id,
      userId: user.id,
      fullName: meta.full_name || meta.fullName || user.email?.split('@')[0] || 'User',
      businessName: meta.business_name || meta.businessName || 'StockIN Business',
      email: user.email || '',
      createdAt: user.created_at,
    };
  }, [user]);

  const userDisplayName = useMemo(() => {
    if (profile?.fullName) return profile.fullName;
    if (user?.email) {
      const namePart = user.email.split('@')[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return 'Business Owner';
  }, [profile, user]);

  const userEmail = useMemo(() => user?.email || '', [user]);

  const businessName = useMemo(() => {
    return profile?.businessName || 'StockIN Business';
  }, [profile]);

  // Sign In
  const signIn = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim();
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { success: false, error: formatAuthError(error) };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: formatAuthError(err) };
    }
  }, []);

  // Sign Up
  const signUp = useCallback(async ({
    email,
    password,
    fullName,
    businessName,
  }: SignUpParams): Promise<{ success: boolean; needsEmailVerification?: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim();
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            business_name: businessName.trim(),
          },
        },
      });

      if (error) {
        return { success: false, error: formatAuthError(error) };
      }

      // If user is returned but session is null, email verification is required by Supabase
      const needsEmailVerification = !data.session;

      return { success: true, needsEmailVerification };
    } catch (err) {
      return { success: false, error: formatAuthError(err) };
    }
  }, []);

  // Sign Out
  const signOut = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { success: false, error: formatAuthError(error) };
      }
      setSession(null);
      setUser(null);
      setIsPasswordRecovery(false);
      return { success: true };
    } catch (err) {
      return { success: false, error: formatAuthError(err) };
    }
  }, []);

  // Send Password Reset
  const sendPasswordReset = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim();
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { success: false, error: formatAuthError(error) };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: formatAuthError(err) };
    }
  }, []);

  // Update Password (used from ResetPasswordPage after email link)
  const updatePassword = useCallback(async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        return { success: false, error: formatAuthError(error) };
      }

      // Clear recovery mode after successful password change
      setIsPasswordRecovery(false);

      return { success: true };
    } catch (err) {
      return { success: false, error: formatAuthError(err) };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isPasswordRecovery,
        signIn,
        signUp,
        signOut,
        sendPasswordReset,
        updatePassword,
        userDisplayName,
        userEmail,
        businessName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
