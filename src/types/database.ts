/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SceneIntExt = 'INT' | 'EXT' | 'INT/EXT';
export type SceneTimeOfDay = 'DAY' | 'NIGHT' | 'DUSK' | 'DAWN' | 'CONTINUOUS' | 'LATER' | string;

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string;
  genre?: string;
  visual_style?: string;
  aspect_ratio?: string;
  language?: string;
  created_at: string;
  updated_at: string;
}

export interface Screenplay {
  id: string;
  project_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  project_id: string;
  name: string;
  role: string | null;
  description: string | null;
  appearance: string | null;
  personality: string | null;
  age_description?: string | null;
  wardrobe?: string | null;
  reference_image_url?: string | null;
  continuity_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  visual_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DialogueItem {
  characterId?: string;
  text: string;
  delivery?: string;
  voiceNotes?: string;
}

export type ShotProductionStatus =
  | 'Not Started'
  | 'Prompt Ready'
  | 'Image Generated'
  | 'Video Generated'
  | 'In Review'
  | 'Approved'
  | 'Needs Revision';

export const SHOT_PRODUCTION_STATUSES: ShotProductionStatus[] = [
  'Not Started',
  'Prompt Ready',
  'Image Generated',
  'Video Generated',
  'In Review',
  'Approved',
  'Needs Revision',
];

export interface Shot {
  id: string;
  project_id: string;
  scene_id: string;
  shot_order: number;
  title: string;
  shot_type: string;
  camera_angle: string;
  camera_movement: string;
  duration_seconds: number;
  characters: string[];
  action: string;
  image_prompt: string;
  motion_prompt: string;
  dialogue: DialogueItem[];
  sound_effects: string[];
  music_cue: string;
  continuity_notes: string;
  production_status?: ShotProductionStatus;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  project_id: string;
  scene_order: number;
  title: string;
  location: string | null;
  location_id?: string | null;
  int_ext: SceneIntExt | null;
  time_of_day: SceneTimeOfDay | null;
  content: string | null;
  summary?: string | null;
  characters?: string[];
  continuity_notes?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DTOs for mutations
// ============================================================================

export interface CreateProjectInput {
  title: string;
  description?: string;
  genre?: string;
  visual_style?: string;
  aspect_ratio?: string;
  language?: string;
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  genre?: string;
  visual_style?: string;
  aspect_ratio?: string;
  language?: string;
}

export interface CreateSceneInput {
  project_id: string;
  title: string;
  scene_order?: number;
  location?: string;
  location_id?: string | null;
  int_ext?: SceneIntExt | null;
  time_of_day?: SceneTimeOfDay | null;
  content?: string;
  summary?: string;
  characters?: string[];
  continuity_notes?: string;
}

export interface UpdateSceneInput {
  title?: string;
  location?: string;
  location_id?: string | null;
  int_ext?: SceneIntExt | null;
  time_of_day?: SceneTimeOfDay | null;
  content?: string;
  summary?: string;
  characters?: string[];
  continuity_notes?: string;
}

export interface CreateCharacterInput {
  project_id: string;
  name: string;
  role?: string;
  description?: string;
  appearance?: string;
  personality?: string;
  age_description?: string;
  wardrobe?: string;
  reference_image_url?: string;
  continuity_notes?: string;
}

export interface UpdateCharacterInput {
  name?: string;
  role?: string;
  description?: string;
  appearance?: string;
  personality?: string;
  age_description?: string;
  wardrobe?: string;
  reference_image_url?: string;
  continuity_notes?: string;
}

export interface CreateLocationInput {
  project_id: string;
  name: string;
  description?: string;
  visual_notes?: string;
}

export interface UpdateLocationInput {
  name?: string;
  description?: string;
  visual_notes?: string;
}

export interface CreateShotInput {
  project_id: string;
  scene_id: string;
  shot_order?: number;
  title: string;
  shot_type?: string;
  camera_angle?: string;
  camera_movement?: string;
  duration_seconds?: number;
  characters?: string[];
  action?: string;
  image_prompt?: string;
  motion_prompt?: string;
  dialogue?: DialogueItem[];
  sound_effects?: string[];
  music_cue?: string;
  continuity_notes?: string;
  production_status?: ShotProductionStatus;
}

export interface UpdateShotInput {
  scene_id?: string;
  shot_order?: number;
  title?: string;
  shot_type?: string;
  camera_angle?: string;
  camera_movement?: string;
  duration_seconds?: number;
  characters?: string[];
  action?: string;
  image_prompt?: string;
  motion_prompt?: string;
  dialogue?: DialogueItem[];
  sound_effects?: string[];
  music_cue?: string;
  continuity_notes?: string;
  production_status?: ShotProductionStatus;
}

// ============================================================================
// PRODUCTION ASSETS
// ============================================================================

export type AssetType =
  | 'image'
  | 'video'
  | 'audio'
  | 'character_reference'
  | 'location_reference'
  | 'reference_file';

export const ASSET_TYPES: AssetType[] = [
  'image',
  'video',
  'audio',
  'character_reference',
  'location_reference',
  'reference_file',
];

export type AssetReviewStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'in_review';

export const ASSET_REVIEW_STATUSES: AssetReviewStatus[] = [
  'pending',
  'in_review',
  'approved',
  'rejected',
];

export interface ProductionAsset {
  id: string;
  project_id: string;
  scene_id?: string | null;
  shot_id?: string | null;
  asset_type: AssetType;
  display_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  duration_seconds?: number | null;
  version_number: number;
  generation_tool?: string | null;
  prompt_used?: string | null;
  is_preferred: boolean;
  review_status: AssetReviewStatus;
  notes?: string | null;
  is_external: boolean;
  external_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAssetInput {
  project_id: string;
  scene_id?: string | null;
  shot_id?: string | null;
  asset_type: AssetType;
  display_name: string;
  storage_path?: string;
  mime_type?: string;
  file_size?: number;
  duration_seconds?: number | null;
  version_number?: number;
  generation_tool?: string | null;
  prompt_used?: string | null;
  is_preferred?: boolean;
  review_status?: AssetReviewStatus;
  notes?: string | null;
  is_external?: boolean;
  external_url?: string | null;
}

export interface UpdateAssetInput {
  display_name?: string;
  review_status?: AssetReviewStatus;
  is_preferred?: boolean;
  notes?: string | null;
  generation_tool?: string | null;
  prompt_used?: string | null;
  duration_seconds?: number | null;
}

// ============================================================================
// FOLKVERSE JSON BLUEPRINT SCHEMA (v1.0)
// ============================================================================

export interface BlueprintProject {
  title: string;
  description?: string;
  genre?: string;
  visualStyle?: string;
  aspectRatio?: string;
  language?: string;
}

export interface BlueprintCharacter {
  id: string;
  name: string;
  role?: string;
  ageDescription?: string;
  appearance?: string;
  wardrobe?: string;
  personality?: string;
  referenceImageUrl?: string;
  continuityNotes?: string;
}

export interface BlueprintLocation {
  id: string;
  name: string;
  description?: string;
  visualNotes?: string;
}

export interface BlueprintDialogueItem {
  characterId?: string;
  text: string;
  delivery?: string;
  voiceNotes?: string;
}

export interface BlueprintShot {
  id: string;
  order: number;
  title: string;
  shotType?: string;
  cameraAngle?: string;
  cameraMovement?: string;
  durationSeconds: number;
  characters?: string[];
  action?: string;
  imagePrompt?: string;
  motionPrompt?: string;
  dialogue?: BlueprintDialogueItem[];
  soundEffects?: string[];
  musicCue?: string;
  continuityNotes?: string;
}

export interface BlueprintScene {
  id: string;
  order: number;
  title: string;
  locationId?: string;
  timeOfDay?: string;
  summary?: string;
  characters?: string[];
  continuityNotes?: string;
  shots: BlueprintShot[];
}

export interface FolkverseBlueprint {
  schemaVersion: '1.0' | string;
  project: BlueprintProject;
  characters?: BlueprintCharacter[];
  locations?: BlueprintLocation[];
  scenes?: BlueprintScene[];
  additionalMetadata?: Record<string, unknown>;
}

// ============================================================================
// PHASE 3: QUALITY CONTROL & CONTINUITY TYPES
// ============================================================================

export type FindingSeverity = 'error' | 'warning' | 'info';

export type FindingCategory =
  | 'structure'
  | 'character_continuity'
  | 'location_continuity'
  | 'shot_completeness'
  | 'dialogue'
  | 'production_readiness';

export interface QualityFinding {
  id: string;
  ruleId: string;
  severity: FindingSeverity;
  category: FindingCategory;
  message: string;
  explanation: string;
  suggestedResolution: string;
  canBeReviewed: boolean;
  isResolved: boolean;
  isReviewed: boolean;
  fingerprint: string;
  projectId?: string;
  sceneId?: string;
  shotId?: string;
  characterId?: string;
  locationId?: string;
  fieldName?: string;
}

export interface SceneRuntimeSummary {
  sceneId: string;
  durationSeconds: number;
  formatted: string;
  shotCount: number;
}

export interface RuntimeReport {
  totalSeconds: number;
  totalFormatted: string;
  hours: number;
  minutes: number;
  seconds: number;
  sceneRuntimes: Record<string, SceneRuntimeSummary>;
}

export interface QualityReportSummary {
  totalFindings: number;
  errorsCount: number;
  warningsCount: number;
  infoCount: number;
  unresolvedCount: number;
  reviewedCount: number;
  affectedScenesCount: number;
  affectedShotsCount: number;
  shotsMissingImagePromptsCount: number;
  shotsMissingMotionPromptsCount: number;
  shotsWithBrokenRefsCount: number;
  shotsRequiringContinuityReviewCount: number;
  categoryCounts: Record<FindingCategory, number>;
}

export interface QualityReport {
  findings: QualityFinding[];
  summary: QualityReportSummary;
  runtime: RuntimeReport;
}

// ============================================================================
// PHASE 5: PRODUCTION ASSEMBLY & FINAL CUT TYPES
// ============================================================================

export interface Sequence {
  id: string;
  project_id: string;
  user_id?: string | null;
  title: string;
  description?: string | null;
  version: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SequenceEntry {
  id: string;
  sequence_id: string;
  project_id: string;
  shot_id: string;
  sequence_order: number;
  video_asset_id?: string | null;
  image_asset_id?: string | null;
  in_point_seconds?: number | null;
  out_point_seconds?: number | null;
  transition_type?: string | null;
  transition_duration_seconds?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type AudioType = 'dialogue' | 'narration' | 'sound_effect' | 'music_cue';
export const AUDIO_TYPES: AudioType[] = ['dialogue', 'narration', 'sound_effect', 'music_cue'];

export type AudioStatus = 'not_recorded' | 'recorded' | 'selected' | 'reviewed';
export const AUDIO_STATUSES: AudioStatus[] = ['not_recorded', 'recorded', 'selected', 'reviewed'];

export interface AudioTrack {
  id: string;
  project_id: string;
  user_id?: string | null;
  sequence_id?: string | null;
  sequence_entry_id?: string | null;
  audio_type: AudioType;
  title: string;
  character_id?: string | null;
  text?: string | null;
  audio_asset_id?: string | null;
  status: AudioStatus;
  start_time_seconds?: number | null;
  duration_seconds?: number | null;
  in_point_seconds?: number | null;
  out_point_seconds?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// Sequence & Audio DTOs
export interface CreateSequenceInput {
  project_id: string;
  title: string;
  description?: string;
  version?: number;
  notes?: string;
  initialShotIds?: string[];
  initial_shot_ids?: string[];
}

export interface UpdateSequenceInput {
  title?: string;
  description?: string;
  version?: number;
  notes?: string;
}

export interface CreateSequenceEntryInput {
  sequence_id: string;
  project_id: string;
  shot_id: string;
  sequence_order?: number;
  video_asset_id?: string | null;
  image_asset_id?: string | null;
  in_point_seconds?: number | null;
  out_point_seconds?: number | null;
  transition_type?: string;
  transition_duration_seconds?: number;
  notes?: string;
}

export interface UpdateSequenceEntryInput {
  sequence_order?: number;
  video_asset_id?: string | null;
  image_asset_id?: string | null;
  in_point_seconds?: number | null;
  out_point_seconds?: number | null;
  transition_type?: string;
  transition_duration_seconds?: number;
  notes?: string;
}

export interface CreateAudioTrackInput {
  project_id: string;
  sequence_id?: string | null;
  sequence_entry_id?: string | null;
  audio_type: AudioType;
  title: string;
  character_id?: string | null;
  text?: string;
  audio_asset_id?: string | null;
  status?: AudioStatus;
  start_time_seconds?: number;
  duration_seconds?: number | null;
  in_point_seconds?: number | null;
  out_point_seconds?: number | null;
  notes?: string;
}

export interface UpdateAudioTrackInput {
  title?: string;
  character_id?: string | null;
  text?: string;
  audio_asset_id?: string | null;
  status?: AudioStatus;
  start_time_seconds?: number;
  duration_seconds?: number | null;
  in_point_seconds?: number | null;
  out_point_seconds?: number | null;
  notes?: string;
}

// Sequence Timing & Calculation Summary
export interface SequenceEntryTiming {
  entryId: string;
  shotId: string;
  order: number;
  plannedDurationSeconds: number;
  sourceAssetDuration: number | null;
  effectiveDurationSeconds: number | null; // null if unmeasured
  isDurationEstimated: boolean;
  startTimeSeconds: number;
  endTimeSeconds: number;
  inPointSeconds: number | null;
  outPointSeconds: number | null;
}

export interface SequenceTimingSummary {
  totalAssembledSeconds: number;
  totalAssembledFormatted: string;
  totalPlannedSeconds: number;
  totalPlannedFormatted: string;
  entriesCount: number;
  entriesWithVerifiedDurationCount: number;
  entriesWithEstimatedDurationCount: number;
  entryTimings: SequenceEntryTiming[];
  sceneDurations: Record<string, { sceneTitle: string; durationSeconds: number; formatted: string }>;
}

// Readiness Report
export type ReadinessSeverity = 'error' | 'warning' | 'info';

export interface ReadinessFinding {
  id: string;
  code: string;
  severity: ReadinessSeverity;
  message: string;
  explanation: string;
  suggestedResolution: string;
  sequenceEntryId?: string;
  shotId?: string;
  assetId?: string;
  audioTrackId?: string;
}

export interface SequenceReadinessReport {
  isFinalCutReady: boolean;
  isEditorialReady: boolean;
  isStructurallyValid: boolean;
  canExport: boolean;
  errorsCount: number;
  warningsCount: number;
  infoCount: number;
  totalFindings: number;
  summary: {
    errorsCount: number;
    warningsCount: number;
    infoCount: number;
    totalFindings: number;
  };
  findings: ReadinessFinding[];
  hasDraftOverride: boolean;
}

// External Editor Manifest Schema (v1.0)
export interface ManifestSourceRef {
  type: 'supabase_storage' | 'external_url' | 'none';
  path: string;
  url?: string;
  mimeType?: string;
  fileSizeBytes?: number;
}

export interface ManifestDialogueRef {
  characterName: string;
  characterId?: string;
  text: string;
  delivery?: string;
}

export interface ManifestAudioItem {
  id: string;
  type: AudioType;
  title: string;
  speaker?: string;
  text?: string;
  status: AudioStatus;
  source: ManifestSourceRef;
  startTimeSeconds: number;
  durationSeconds: number | null;
  inPointSeconds?: number | null;
  outPointSeconds?: number | null;
  notes?: string;
}

export interface ManifestSequenceEntry {
  order: number;
  entryId: string;
  sceneId: string;
  sceneOrder: number;
  sceneTitle: string;
  shotId: string;
  shotOrder: number;
  shotTitle: string;
  shotType?: string;
  cameraMovement?: string;
  action?: string;
  productionStatus?: string;
  plannedDurationSeconds: number;
  durationSeconds: number | null;
  durationStatus: 'verified' | 'estimated' | 'missing';
  inPointSeconds: number | null;
  outPointSeconds: number | null;
  videoAssetId: string | null;
  videoSource: ManifestSourceRef;
  videoAsset?: {
    id: string;
    name?: string;
    url?: string;
    storagePath?: string;
    durationSeconds?: number | null;
  };
  imageAssetId: string | null;
  imageSource: ManifestSourceRef;
  transitionType?: string;
  transitionDurationSeconds?: number;
  dialogue: ManifestDialogueRef[];
  audio: ManifestAudioItem[];
  notes?: string;
}

export interface ProductionManifest {
  manifestSchemaVersion: '1.0';
  exportTimestamp: string;
  project: {
    id: string;
    projectId: string;
    title: string;
    aspectRatio: string;
    visualStyle: string;
    language: string;
    genre: string;
  };
  sequence: {
    id: string;
    sequenceId: string;
    title: string;
    version: number;
    description: string;
    totalAssembledDurationSeconds: number;
    totalAssembledFormatted: string;
    totalPlannedDurationSeconds: number;
    readinessStatus: {
      isFinalCutReady: boolean;
      errorsCount: number;
      warningsCount: number;
      unapprovedShotsCount: number;
      missingMediaCount: number;
    };
    entries: ManifestSequenceEntry[];
  };
  unresolvedWarnings?: string[];
}


