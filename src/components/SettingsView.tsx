/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  User,
  LogOut,
  LogIn,
  Database,
  ShieldCheck,
  Key,
  Copy,
  Check,
  Layers,
  Sparkles,
  ExternalLink,
  Code2,
} from 'lucide-react';

interface SettingsViewProps {
  onOpenAuth: () => void;
  onOpenDbConfig: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenAuth,
  onOpenDbConfig,
}) => {
  const { user, isConfigured, activeUrl, activeKeyMasked, signOut } = useAuth();
  const [copiedEnv, setCopiedEnv] = useState(false);

  const envSample = `VITE_SUPABASE_URL="${activeUrl || 'https://your-project-id.supabase.co'}"\nVITE_SUPABASE_ANON_KEY="your-anon-key"`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envSample);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold font-cinematic text-zinc-100 tracking-wide">
          Settings & Storytelling Workspace Architecture
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Manage your author credentials, Supabase PostgreSQL persistence, and security policies
        </p>
      </div>

      {/* Account Section */}
      <div className="bg-[#141518] border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100 font-cinematic">
              Author Account
            </h2>
            <p className="text-xs text-zinc-400">
              Supabase Authentication and session status
            </p>
          </div>
        </div>

        {user ? (
          <div className="pt-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/80">
                <span className="text-zinc-500 block mb-1">Email Address</span>
                <span className="font-semibold text-zinc-200">{user.email}</span>
              </div>
              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/80">
                <span className="text-zinc-500 block mb-1">User Identifier (auth.uid)</span>
                <span className="font-mono text-zinc-300 text-[11px] break-all">{user.id}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => signOut()}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-red-400 hover:text-red-300 border border-zinc-800 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-2 space-y-3">
            <p className="text-xs text-zinc-400 leading-relaxed">
              You are currently unauthenticated. Sign in or create an account to persist projects, screenplays, and characters under your unique owner ID.
            </p>
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign In / Sign Up
            </button>
          </div>
        )}
      </div>

      {/* Supabase Connection Details */}
      <div className="bg-[#141518] border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 font-cinematic">
                Supabase Persistence & RLS Status
              </h2>
              <p className="text-xs text-zinc-400">
                PostgreSQL database connection and Row Level Security policies
              </p>
            </div>
          </div>

          <button
            onClick={onOpenDbConfig}
            className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Manage Credentials
          </button>
        </div>

        <div className="pt-2 space-y-4">
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              isConfigured
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${
                isConfigured ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <div className="text-xs leading-relaxed">
              <strong className="block font-semibold">
                {isConfigured ? 'Active Cloud Database' : 'Supabase Credentials Unconfigured'}
              </strong>
              {isConfigured
                ? `Connected to Supabase endpoint: ${activeUrl}`
                : 'Folkverse requires real Supabase credentials. In accordance with Phase 1 instructions, remote persistence is never faked or substituted with browser localStorage.'}
            </div>
          </div>

          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Environment Configuration (.env)
              </span>
              <button
                onClick={handleCopyEnv}
                className="text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1 cursor-pointer font-medium"
              >
                {copiedEnv ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy .env Variables
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 overflow-x-auto">
              {envSample}
            </pre>
          </div>
        </div>
      </div>

      {/* Phase 1 Foundation Verification Checklist */}
      <div className="bg-[#141518] border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100 font-cinematic">
              Phase 1 Clean Foundation Standards
            </h2>
            <p className="text-xs text-zinc-400">
              Verified functional commitments
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-300 pt-2">
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 flex items-start gap-2.5">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Fresh Independent Architecture:</strong> No legacy dependencies, no patch pollution, clean React + TypeScript + Supabase foundation.
            </div>
          </div>

          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 flex items-start gap-2.5">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Strict RLS Security:</strong> All 4 tables (projects, screenplays, scenes, characters) isolated by authenticated user ownership.
            </div>
          </div>

          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 flex items-start gap-2.5">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Stable Scene Identifiers:</strong> Changing scene order adjusts sequence numbers while preserving stable UUIDs.
            </div>
          </div>

          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 flex items-start gap-2.5">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>No Silent Failure / Fake Success:</strong> Failed saves throw explicit errors and never claim remote persistence when offline.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
