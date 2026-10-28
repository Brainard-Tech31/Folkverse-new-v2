/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  X,
  Database,
  Key,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    isConfigured,
    activeUrl,
    activeKeyMasked,
    updateCredentials,
    resetCredentials,
  } = useAuth();

  const [inputUrl, setInputUrl] = useState(activeUrl || '');
  const [inputKey, setInputKey] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'sql' | 'credentials'>('status');

  if (!isOpen) return null;

  const sqlMigrationCode = `-- ====================================================================
-- FOLKVERSE: Phase 1 Clean Foundation Schema Migration
-- Run this in your Supabase Project -> SQL Editor -> New Query
-- ====================================================================

-- 1. Helper function for updating timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

CREATE OR REPLACE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 3. Screenplays Table (One screenplay per project)
CREATE TABLE IF NOT EXISTS public.screenplays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_screenplays_project_id ON public.screenplays(project_id);

CREATE OR REPLACE TRIGGER trigger_screenplays_updated_at
  BEFORE UPDATE ON public.screenplays
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 4. Scenes Table (Ordered scenes within a project)
CREATE TABLE IF NOT EXISTS public.scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_order INTEGER NOT NULL DEFAULT 1 CHECK (scene_order >= 0),
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  location TEXT DEFAULT '',
  int_ext TEXT CHECK (int_ext IN ('INT', 'EXT', 'INT/EXT') OR int_ext IS NULL OR int_ext = ''),
  time_of_day TEXT CHECK (time_of_day IN ('DAY', 'NIGHT', 'DUSK', 'DAWN', 'CONTINUOUS', 'LATER') OR time_of_day IS NULL OR time_of_day = ''),
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_scenes_project_order ON public.scenes(project_id, scene_order ASC);
CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON public.scenes(project_id);

CREATE OR REPLACE TRIGGER trigger_scenes_updated_at
  BEFORE UPDATE ON public.scenes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 5. Characters Table (Character profiles within a project)
CREATE TABLE IF NOT EXISTS public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  role TEXT DEFAULT '',
  description TEXT DEFAULT '',
  appearance TEXT DEFAULT '',
  personality TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_characters_project_id ON public.characters(project_id);
CREATE INDEX IF NOT EXISTS idx_characters_name ON public.characters(name);

CREATE OR REPLACE TRIGGER trigger_characters_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Enable RLS on all 4 tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenplays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- RLS Policies with strict ownership checks
CREATE POLICY "Projects: user can view own projects" ON public.projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Projects: user can create own projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Projects: user can update own projects" ON public.projects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Projects: user can delete own projects" ON public.projects FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Screenplays: user can view screenplays in own project" ON public.screenplays FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = screenplays.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Screenplays: user can insert screenplays into own project" ON public.screenplays FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = screenplays.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Screenplays: user can update screenplays in own project" ON public.screenplays FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = screenplays.project_id AND projects.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = screenplays.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Screenplays: user can delete screenplays in own project" ON public.screenplays FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = screenplays.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Scenes: user can view scenes in own project" ON public.scenes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = scenes.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Scenes: user can insert scenes into own project" ON public.scenes FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = scenes.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Scenes: user can update scenes in own project" ON public.scenes FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = scenes.project_id AND projects.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = scenes.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Scenes: user can delete scenes in own project" ON public.scenes FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = scenes.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Characters: user can view characters in own project" ON public.characters FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = characters.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Characters: user can insert characters into own project" ON public.characters FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = characters.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Characters: user can update characters in own project" ON public.characters FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = characters.project_id AND projects.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = characters.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Characters: user can delete characters in own project" ON public.characters FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = characters.project_id AND projects.user_id = auth.uid()));
-- ====================================================================
-- PHASE 2 EXTENSIONS: LOCATIONS, SHOTS, AND CINEMATIC METADATA
-- ====================================================================

-- Extend projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS genre TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS visual_style TEXT DEFAULT 'Grounded cinematic realism',
  ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT '16:9',
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';

-- Extend characters
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS age_description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS wardrobe TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS reference_image_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS continuity_notes TEXT DEFAULT '';

-- Locations Table (Location Bible)
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  description TEXT DEFAULT '',
  visual_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_locations_project_id ON public.locations(project_id);

CREATE OR REPLACE TRIGGER trigger_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Extend scenes table
ALTER TABLE public.scenes
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS characters TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS continuity_notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS summary TEXT DEFAULT '';

-- Shots Table (Shot Planner)
CREATE TABLE IF NOT EXISTS public.shots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  shot_order INTEGER NOT NULL DEFAULT 1 CHECK (shot_order >= 0),
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  shot_type TEXT DEFAULT 'Wide shot',
  camera_angle TEXT DEFAULT 'Eye level',
  camera_movement TEXT DEFAULT 'Static',
  duration_seconds NUMERIC(6, 2) NOT NULL DEFAULT 5.00 CHECK (duration_seconds >= 0),
  characters TEXT[] DEFAULT '{}',
  action TEXT DEFAULT '',
  image_prompt TEXT DEFAULT '',
  motion_prompt TEXT DEFAULT '',
  dialogue JSONB DEFAULT '[]'::jsonb,
  sound_effects TEXT[] DEFAULT '{}',
  music_cue TEXT DEFAULT '',
  continuity_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_shots_project_id ON public.shots(project_id);
CREATE INDEX IF NOT EXISTS idx_shots_scene_id ON public.shots(scene_id);

CREATE OR REPLACE TRIGGER trigger_shots_updated_at
  BEFORE UPDATE ON public.shots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Enable RLS on locations and shots
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Locations: user can view locations in own project" ON public.locations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = locations.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Locations: user can insert locations into own project" ON public.locations FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = locations.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Locations: user can update locations in own project" ON public.locations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = locations.project_id AND projects.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = locations.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Locations: user can delete locations in own project" ON public.locations FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = locations.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Shots: user can view shots in own project" ON public.shots FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = shots.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Shots: user can insert shots into own project" ON public.shots FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = shots.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Shots: user can update shots in own project" ON public.shots FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = shots.project_id AND projects.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = shots.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Shots: user can delete shots in own project" ON public.shots FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = shots.project_id AND projects.user_id = auth.uid()));

-- ====================================================================
-- PHASE 4 EXTENSIONS: PRODUCTION STATUS & ASSET MANAGEMENT
-- ====================================================================

ALTER TABLE public.shots 
  ADD COLUMN IF NOT EXISTS production_status TEXT NOT NULL DEFAULT 'Not Started';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shots_production_status_check'
  ) THEN
    ALTER TABLE public.shots
      ADD CONSTRAINT shots_production_status_check
      CHECK (production_status IN ('Not Started', 'Prompt Ready', 'Image Generated', 'Video Generated', 'In Review', 'Approved', 'Needs Revision'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shots_production_status ON public.shots(production_status);

CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  shot_id UUID REFERENCES public.shots(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'video', 'audio', 'character_reference', 'location_reference', 'reference_file')),
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) > 0),
  storage_path TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size BIGINT NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  duration_seconds NUMERIC(8, 2) DEFAULT NULL CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  version_number INTEGER NOT NULL DEFAULT 1 CHECK (version_number >= 1),
  generation_tool TEXT DEFAULT '',
  prompt_used TEXT DEFAULT '',
  is_preferred BOOLEAN NOT NULL DEFAULT false,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'in_review')),
  notes TEXT DEFAULT '',
  is_external BOOLEAN NOT NULL DEFAULT false,
  external_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_assets_project_id ON public.assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_shot_id ON public.assets(shot_id);
CREATE INDEX IF NOT EXISTS idx_assets_scene_id ON public.assets(scene_id);
CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON public.assets(asset_type);

CREATE OR REPLACE TRIGGER trigger_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assets: user can view assets in own project" ON public.assets FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = assets.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Assets: user can insert assets into own project" ON public.assets FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = assets.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Assets: user can update assets in own project" ON public.assets FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = assets.project_id AND projects.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = assets.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Assets: user can delete assets in own project" ON public.assets FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = assets.project_id AND projects.user_id = auth.uid()));
`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlMigrationCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!inputUrl.trim() || !inputKey.trim()) {
      setErrorMsg('Both Supabase Project URL and Public Anon Key are required.');
      return;
    }

    try {
      updateCredentials(inputUrl, inputKey);
      setSuccessMsg('Supabase credentials applied successfully for this session!');
      setInputKey('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid credentials provided.');
    }
  };

  const handleReset = () => {
    resetCredentials();
    setInputUrl('');
    setInputKey('');
    setSuccessMsg('Active credentials reset to environment default.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl bg-[#141518] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100 font-cinematic">
                Supabase & Database Setup
              </h2>
              <p className="text-xs text-zinc-400">
                Folkverse Phase 1 PostgreSQL Persistence & Security Architecture
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
        <div className="flex border-b border-zinc-800 px-6 bg-zinc-900/40 text-xs font-medium">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'status'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Connection Status
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'sql'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Database className="w-4 h-4" />
            SQL Migration
          </button>
          <button
            onClick={() => setActiveTab('credentials')}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'credentials'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Key className="w-4 h-4" />
            Configure Credentials
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  isConfigured
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                    : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                    isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <div className="space-y-1">
                  <div className="font-semibold text-sm">
                    {isConfigured
                      ? 'Supabase Connection Configured'
                      : 'Supabase Configuration Required'}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {isConfigured
                      ? 'Cloud persistence, authentication, and RLS policies are active for your Folkverse workspace.'
                      : 'To persist projects, screenplays, scenes, and characters, connect a Supabase project. In accordance with Phase 1 requirements, remote persistence is never faked or replaced with local storage.'}
                  </p>
                </div>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Active Configuration Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
                    <span className="text-zinc-500 block mb-1">Project URL</span>
                    <span className="font-mono text-zinc-300 break-all">
                      {activeUrl || '(Not configured)'}
                    </span>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
                    <span className="text-zinc-500 block mb-1">Anon Key (Public)</span>
                    <span className="font-mono text-zinc-300">
                      {activeKeyMasked || '(Not configured)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 space-y-2 text-xs text-zinc-400">
                <h4 className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Phase 1 Security & Architecture Guarantees
                </h4>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>Never exposes Supabase service-role keys in browser code.</li>
                  <li>Enforces database-level Row Level Security (RLS) on all 4 tables.</li>
                  <li>Prevents cross-project unauthorized reading, inserting, or deletion.</li>
                  <li>Preserves scene stable UUIDs independently of display ordering.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-200 text-sm">
                    Supabase Schema Migration
                  </h3>
                  <p className="text-xs text-zinc-400">
                    File: <code className="text-amber-400 font-mono">/supabase/migrations/20261028000000_folkverse_phase1_schema.sql</code>
                  </p>
                </div>
                <button
                  onClick={handleCopySql}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Migration SQL
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-300 overflow-x-auto max-h-72 leading-relaxed">
                  {sqlMigrationCode}
                </pre>
              </div>

              <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs text-zinc-400 leading-relaxed">
                <strong>How to apply:</strong> In your Supabase dashboard, navigate to <strong>SQL Editor</strong> &gt; <strong>New Query</strong>, paste this script, and click <strong>Run</strong>.
              </div>
            </div>
          )}

          {activeTab === 'credentials' && (
            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                You can specify credentials in your environment (<code className="text-amber-300 font-mono">.env</code> or secrets panel) or configure them directly for this browser session.
              </p>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Supabase Public/Publishable Anon Key
                </label>
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500/60"
                />
                <span className="text-[11px] text-zinc-500 block mt-1">
                  Only provide the public <code className="text-zinc-400">anon</code> key. Never use the secret <code className="text-red-400">service_role</code> key.
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset to Environment Default
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-500">
          <span>Folkverse Phase 1: Clean Foundation</span>
          <a
            href="https://supabase.com/docs"
            target="_blank"
            rel="noreferrer"
            className="text-amber-400/80 hover:text-amber-300 flex items-center gap-1"
          >
            Supabase Docs <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
