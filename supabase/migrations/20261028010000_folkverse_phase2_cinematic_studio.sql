-- ====================================================================
-- FOLKVERSE: Phase 2 Cinematic Production Studio Schema Migration
-- Migration Name: 20261028010000_folkverse_phase2_cinematic_studio.sql
-- Description: Extends projects, characters, and scenes with cinematic
--              metadata, adds locations and shots tables, with cascading
--              foreign keys, updated_at triggers, and strict RLS policies.
-- ====================================================================

-- 1. Extend projects table with cinematic production metadata
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS genre TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS visual_style TEXT DEFAULT 'Grounded cinematic realism',
  ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT '16:9',
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';

-- 2. Extend characters table with cinematic continuity metadata
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS age_description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS wardrobe TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS reference_image_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS continuity_notes TEXT DEFAULT '';

-- 3. Locations Table (Location Bible)
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
CREATE INDEX IF NOT EXISTS idx_locations_name ON public.locations(name);

CREATE OR REPLACE TRIGGER trigger_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 4. Extend scenes table with location link, continuity, summary, and participating characters
ALTER TABLE public.scenes
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS characters TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS continuity_notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS summary TEXT DEFAULT '';

-- 5. Shots Table (Shot Planner)
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
CREATE INDEX IF NOT EXISTS idx_shots_scene_order ON public.shots(scene_id, shot_order ASC);

CREATE OR REPLACE TRIGGER trigger_shots_updated_at
  BEFORE UPDATE ON public.shots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR LOCATIONS AND SHOTS
-- ====================================================================

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- Locations Policies (Verified via project ownership)
-- --------------------------------------------------------------------
CREATE POLICY "Locations: user can view locations in own project"
  ON public.locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = locations.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Locations: user can insert locations into own project"
  ON public.locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = locations.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Locations: user can update locations in own project"
  ON public.locations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = locations.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = locations.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Locations: user can delete locations in own project"
  ON public.locations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = locations.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------
-- Shots Policies (Verified via project ownership)
-- --------------------------------------------------------------------
CREATE POLICY "Shots: user can view shots in own project"
  ON public.shots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = shots.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Shots: user can insert shots into own project"
  ON public.shots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = shots.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Shots: user can update shots in own project"
  ON public.shots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = shots.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = shots.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Shots: user can delete shots in own project"
  ON public.shots FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = shots.project_id
        AND projects.user_id = auth.uid()
    )
  );
