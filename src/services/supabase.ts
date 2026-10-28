/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Runtime override allows entering public anon keys in the development session UI
let runtimeUrl: string | null = null;
let runtimeKey: string | null = null;
let forceUnconfigured = false;

export function setForceUnconfigured(val: boolean): void {
  forceUnconfigured = val;
}

// Check session storage for session-scoped configuration overrides (never persisted permanently or substituting database)
try {
  const storedUrl = sessionStorage.getItem('folkverse_supabase_url');
  const storedKey = sessionStorage.getItem('folkverse_supabase_key');
  if (storedUrl && storedKey) {
    runtimeUrl = storedUrl;
    runtimeKey = storedKey;
  }
} catch {
  // Ignore in restricted environments
}

export function getActiveSupabaseCredentials(): { url: string; key: string } {
  const url = runtimeUrl || rawUrl;
  const key = runtimeKey || rawKey;
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  if (forceUnconfigured) return false;
  const { url, key } = getActiveSupabaseCredentials();
  if (!url || !key) return false;
  if (url.includes('your-project-id') || key.includes('your-supabase-anon-key')) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  const { url, key } = getActiveSupabaseCredentials();

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment, or provide your public project credentials in the configuration panel.'
    );
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseInstance;
}

export function configureRuntimeSupabase(url: string, key: string): void {
  const trimmedUrl = url.trim();
  const trimmedKey = key.trim();

  try {
    const parsed = new URL(trimmedUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Supabase URL must start with https://');
    }
  } catch (err) {
    throw new Error('Invalid Supabase URL format.');
  }

  if (trimmedKey.length < 10) {
    throw new Error('Supabase anon key is invalid or too short.');
  }

  runtimeUrl = trimmedUrl;
  runtimeKey = trimmedKey;
  try {
    sessionStorage.setItem('folkverse_supabase_url', trimmedUrl);
    sessionStorage.setItem('folkverse_supabase_key', trimmedKey);
  } catch {
    // Ignore
  }

  // Re-create instance
  supabaseInstance = createClient(runtimeUrl, runtimeKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export function resetRuntimeSupabase(): void {
  runtimeUrl = null;
  runtimeKey = null;
  forceUnconfigured = false;
  supabaseInstance = null;
  try {
    sessionStorage.removeItem('folkverse_supabase_url');
    sessionStorage.removeItem('folkverse_supabase_key');
  } catch {
    // Ignore
  }
}
