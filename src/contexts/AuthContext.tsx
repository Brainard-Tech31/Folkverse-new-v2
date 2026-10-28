/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import {
  isSupabaseConfigured,
  getSupabaseClient,
  getActiveSupabaseCredentials,
  configureRuntimeSupabase,
  resetRuntimeSupabase,
} from '../services/supabase.ts';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  error: string | null;
  activeUrl: string;
  activeKeyMasked: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  updateCredentials: (url: string, key: string) => void;
  resetCredentials: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);

  const creds = getActiveSupabaseCredentials();
  const maskedKey = creds.key
    ? `${creds.key.slice(0, 6)}...${creds.key.slice(-4)}`
    : '';

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const initAuth = useCallback(async () => {
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);

    if (!configured) {
      setUser(null);
      setSession(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      const { data, error: sessionErr } = await supabase.auth.getSession();

      if (sessionErr) {
        setError(sessionErr.message);
        setUser(null);
        setSession(null);
      } else {
        setSession(data.session);
        setUser(data.session?.user || null);
      }

      // Listen for auth state changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize authentication.';
      setError(msg);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const signIn = async (email: string, password: string): Promise<void> => {
    setError(null);
    if (!isConfigured) {
      const msg = 'Supabase credentials are not configured. Cloud authentication is inactive.';
      setError(msg);
      throw new Error(msg);
    }

    const supabase = getSupabaseClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      throw authError;
    }

    setSession(data.session);
    setUser(data.user);
  };

  const signUp = async (email: string, password: string): Promise<void> => {
    setError(null);
    if (!isConfigured) {
      const msg = 'Supabase credentials are not configured. Cloud authentication is inactive.';
      setError(msg);
      throw new Error(msg);
    }

    const supabase = getSupabaseClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      throw authError;
    }

    // Check if user was confirmed or requires email confirmation
    if (data.session) {
      setSession(data.session);
      setUser(data.user);
    } else if (data.user) {
      setUser(data.user);
    }
  };

  const signOut = async (): Promise<void> => {
    setError(null);
    if (!isConfigured) {
      setUser(null);
      setSession(null);
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const { error: signErr } = await supabase.auth.signOut();
      if (signErr) {
        setError(signErr.message);
        throw signErr;
      }
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  const updateCredentials = (url: string, key: string) => {
    try {
      configureRuntimeSupabase(url, key);
      setIsConfigured(true);
      setError(null);
      initAuth();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      setError(msg);
      throw err;
    }
  };

  const resetCredentials = () => {
    resetRuntimeSupabase();
    setIsConfigured(isSupabaseConfigured());
    setUser(null);
    setSession(null);
    initAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured,
        error,
        activeUrl: creds.url,
        activeKeyMasked: maskedKey,
        signIn,
        signUp,
        signOut,
        clearError,
        updateCredentials,
        resetCredentials,
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
