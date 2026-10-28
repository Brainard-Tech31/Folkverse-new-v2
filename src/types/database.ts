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
