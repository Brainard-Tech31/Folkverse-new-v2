/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { X, Lock, Mail, AlertCircle, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'signin',
}) => {
  const { signIn, signUp, error, clearError, isConfigured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalMessage(null);
    clearError();

    if (!email.trim() || !password) {
      setLocalMessage('Please provide both email and password.');
      return;
    }

    if (password.length < 6) {
      setLocalMessage('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsLoading(true);
      if (mode === 'signin') {
        await signIn(email.trim(), password);
        onClose();
      } else {
        await signUp(email.trim(), password);
        setLocalMessage('Account created successfully! You are now signed in or check your email if confirmation is required.');
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      // Error is caught and surfaced by AuthContext or error state
      console.error('Authentication attempt failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
      <div
        className="w-full max-w-md bg-[#141518] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100 font-cinematic tracking-wide">
                FOLKVERSE
              </h2>
              <p className="text-xs text-zinc-400">
                {mode === 'signin' ? 'Sign in to your storyteller workspace' : 'Create an author account'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-zinc-900/80 mx-6 mt-6 rounded-lg border border-zinc-800 text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setLocalMessage(null);
              clearError();
            }}
            className={`py-2 rounded-md transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-zinc-800 text-amber-300 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setLocalMessage(null);
              clearError();
            }}
            className={`py-2 rounded-md transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-zinc-800 text-amber-300 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isConfigured && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-200 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <strong className="block font-semibold mb-0.5">Supabase credentials required</strong>
                Cloud authentication requires active Supabase project credentials. Configure them in the setup panel or via environment variables.
              </div>
            </div>
          )}

          {(error || localMessage) && (
            <div
              className={`p-3.5 rounded-xl flex items-start gap-3 text-xs leading-relaxed ${
                localMessage && !error
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200'
                  : 'bg-red-500/10 border border-red-500/30 text-red-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error || localMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="storyteller@folkverse.org"
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/50 transition-all"
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Minimum 6 characters</p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isConfigured}
            className="w-full mt-2 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm rounded-xl transition-all shadow-md shadow-amber-950/40 cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            )}
            {mode === 'signin' ? 'Sign In to Folkverse' : 'Create Author Account'}
          </button>
        </form>

        {/* Footer info */}
        <div className="px-6 py-4 bg-zinc-950/60 border-t border-zinc-800/60 text-center text-xs text-zinc-500">
          Secured with Supabase Auth and Row Level Security (RLS).
        </div>
      </div>
    </div>
  );
};
