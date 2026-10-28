-- ====================================================================
-- FOLKVERSE: Phase 5 Production Assembly & Final Cut Migration
-- Migration Name: 20261028030000_folkverse_phase5_production_assembly.sql
-- Description: Adds sequences, sequence_entries, and audio_tracks tables
--              for assembling final video cuts, trimming clips, managing
--              voiceovers/narration, and generating editor manifests.
-- ====================================================================

-- 1. Sequences Table (Assembly Sequences & Alternate Cuts)
CREATE TABLE IF NOT EXISTS public.sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  description TEXT DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sequences_project_id ON public.sequences(project_id);
CREATE INDEX IF NOT EXISTS idx_sequences_created_at ON public.sequences(created_at DESC);

CREATE OR REPLACE TRIGGER trigger_sequences_updated_at
  BEFORE UPDATE ON public.sequences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 2. Sequence Entries Table (Ordered Assembly Cuts)
CREATE TABLE IF NOT EXISTS public.sequence_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  shot_id UUID NOT NULL REFERENCES public.shots(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL DEFAULT 1 CHECK (sequence_order >= 1),
  video_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  image_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  in_point_seconds NUMERIC(8, 2) DEFAULT NULL CHECK (in_point_seconds IS NULL OR in_point_seconds >= 0),
  out_point_seconds NUMERIC(8, 2) DEFAULT NULL CHECK (out_point_seconds IS NULL OR out_point_seconds >= 0),
  transition_type TEXT DEFAULT 'cut',
  transition_duration_seconds NUMERIC(6, 2) DEFAULT 0 CHECK (transition_duration_seconds >= 0),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT check_sequence_entry_trimming
    CHECK (out_point_seconds IS NULL OR in_point_seconds IS NULL OR out_point_seconds > in_point_seconds)
);

CREATE INDEX IF NOT EXISTS idx_sequence_entries_sequence_id ON public.sequence_entries(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_entries_project_id ON public.sequence_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_sequence_entries_shot_id ON public.sequence_entries(shot_id);
CREATE INDEX IF NOT EXISTS idx_sequence_entries_order ON public.sequence_entries(sequence_id, sequence_order ASC);

CREATE OR REPLACE TRIGGER trigger_sequence_entries_updated_at
  BEFORE UPDATE ON public.sequence_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 3. Audio Tracks Table (Audio & Narration Planning)
CREATE TABLE IF NOT EXISTS public.audio_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES public.sequences(id) ON DELETE CASCADE,
  sequence_entry_id UUID REFERENCES public.sequence_entries(id) ON DELETE SET NULL,
  audio_type TEXT NOT NULL CHECK (audio_type IN ('dialogue', 'narration', 'sound_effect', 'music_cue')),
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  text TEXT DEFAULT '',
  audio_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'not_recorded' CHECK (status IN ('not_recorded', 'recorded', 'selected', 'reviewed')),
  start_time_seconds NUMERIC(8, 2) DEFAULT 0 CHECK (start_time_seconds >= 0),
  duration_seconds NUMERIC(8, 2) DEFAULT NULL CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  in_point_seconds NUMERIC(8, 2) DEFAULT NULL CHECK (in_point_seconds IS NULL OR in_point_seconds >= 0),
  out_point_seconds NUMERIC(8, 2) DEFAULT NULL CHECK (out_point_seconds IS NULL OR out_point_seconds >= 0),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audio_tracks_project_id ON public.audio_tracks(project_id);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_sequence_id ON public.audio_tracks(sequence_id);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_sequence_entry_id ON public.audio_tracks(sequence_entry_id);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_audio_type ON public.audio_tracks(audio_type);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_status ON public.audio_tracks(status);

CREATE OR REPLACE TRIGGER trigger_audio_tracks_updated_at
  BEFORE UPDATE ON public.audio_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR PHASE 5 TABLES
-- ====================================================================

ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_tracks ENABLE ROW LEVEL SECURITY;

-- Sequences Policies
CREATE POLICY "Sequences: user can view sequences in own project"
  ON public.sequences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = sequences.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Sequences: user can insert sequences into own project"
  ON public.sequences FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = sequences.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Sequences: user can update sequences in own project"
  ON public.sequences FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = sequences.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = sequences.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Sequences: user can delete sequences in own project"
  ON public.sequences FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = sequences.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- Sequence Entries Policies
CREATE POLICY "Sequence Entries: user can view entries in own project"
  ON public.sequence_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = sequence_entries.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Sequence Entries: user can insert entries into own project"
  ON public.sequence_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = sequence_entries.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Sequence Entries: user can update entries in own project"
  ON public.sequence_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = sequence_entries.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = sequence_entries.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Sequence Entries: user can delete entries in own project"
  ON public.sequence_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = sequence_entries.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- Audio Tracks Policies
CREATE POLICY "Audio Tracks: user can view audio tracks in own project"
  ON public.audio_tracks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = audio_tracks.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Audio Tracks: user can insert audio tracks into own project"
  ON public.audio_tracks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = audio_tracks.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Audio Tracks: user can update audio tracks in own project"
  ON public.audio_tracks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = audio_tracks.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = audio_tracks.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Audio Tracks: user can delete audio tracks in own project"
  ON public.audio_tracks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = audio_tracks.project_id
        AND projects.user_id = auth.uid()
    )
  );
