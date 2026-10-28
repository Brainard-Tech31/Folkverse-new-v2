-- ====================================================================
-- FOLKVERSE: Phase 1 Clean Foundation Schema Migration
-- Migration Name: 20261028000000_folkverse_phase1_schema.sql
-- Description: Core tables, foreign keys, constraints, automated updated_at
--              triggers, and strict Row Level Security (RLS) policies for
--              Projects, Screenplays, Scenes, and Characters.
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

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all 4 tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenplays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- Projects Policies (Owner verification on user_id)
-- --------------------------------------------------------------------
CREATE POLICY "Projects: user can view own projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Projects: user can create own projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Projects: user can update own projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Projects: user can delete own projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- --------------------------------------------------------------------
-- Screenplays Policies (Verified via project ownership)
-- --------------------------------------------------------------------
CREATE POLICY "Screenplays: user can view screenplays in own project"
  ON public.screenplays FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = screenplays.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Screenplays: user can insert screenplays into own project"
  ON public.screenplays FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = screenplays.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Screenplays: user can update screenplays in own project"
  ON public.screenplays FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = screenplays.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = screenplays.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Screenplays: user can delete screenplays in own project"
  ON public.screenplays FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = screenplays.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------
-- Scenes Policies (Verified via project ownership)
-- --------------------------------------------------------------------
CREATE POLICY "Scenes: user can view scenes in own project"
  ON public.scenes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = scenes.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Scenes: user can insert scenes into own project"
  ON public.scenes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = scenes.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Scenes: user can update scenes in own project"
  ON public.scenes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = scenes.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = scenes.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Scenes: user can delete scenes in own project"
  ON public.scenes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = scenes.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------
-- Characters Policies (Verified via project ownership)
-- --------------------------------------------------------------------
CREATE POLICY "Characters: user can view characters in own project"
  ON public.characters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = characters.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Characters: user can insert characters into own project"
  ON public.characters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = characters.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Characters: user can update characters in own project"
  ON public.characters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = characters.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = characters.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Characters: user can delete characters in own project"
  ON public.characters FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = characters.project_id
        AND projects.user_id = auth.uid()
    )
  );
