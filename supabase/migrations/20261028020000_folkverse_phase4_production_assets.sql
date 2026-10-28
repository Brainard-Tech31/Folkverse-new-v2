-- ====================================================================
-- FOLKVERSE: Phase 4 Production Execution & Asset Management Migration
-- Run this in your Supabase Project -> SQL Editor -> New Query
-- ====================================================================

-- 1. Add production_status to shots table
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

-- 2. Assets Table (Production Asset Management)
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
CREATE INDEX IF NOT EXISTS idx_assets_is_preferred ON public.assets(is_preferred);

-- Updated at trigger for assets
CREATE OR REPLACE TRIGGER trigger_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR ASSETS
-- ====================================================================

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assets: user can view assets in own project"
  ON public.assets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = assets.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Assets: user can insert assets into own project"
  ON public.assets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = assets.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Assets: user can update assets in own project"
  ON public.assets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = assets.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = assets.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Assets: user can delete assets in own project"
  ON public.assets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = assets.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- ====================================================================
-- SUPABASE STORAGE BUCKET FOR PRODUCTION ASSETS
-- ====================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('production-assets', 'production-assets', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
