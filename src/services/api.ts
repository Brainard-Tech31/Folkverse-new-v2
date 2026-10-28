/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from './supabase.ts';
import type {
  Project,
  Screenplay,
  Scene,
  Character,
  Location,
  Shot,
  ShotProductionStatus,
  ProductionAsset,
  CreateAssetInput,
  UpdateAssetInput,
  AssetType,
  CreateProjectInput,
  UpdateProjectInput,
  CreateSceneInput,
  UpdateSceneInput,
  CreateCharacterInput,
  UpdateCharacterInput,
  CreateLocationInput,
  UpdateLocationInput,
  CreateShotInput,
  UpdateShotInput,
  FolkverseBlueprint,
} from '../types/database.ts';

/**
 * Normalizes error messages from Supabase or network failures.
 */
function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return new Error(String((error as { message: string }).message));
  }
  return new Error('An unexpected database error occurred.');
}

// ============================================================================
// PROJECTS
// ============================================================================

export async function fetchProjects(): Promise<Project[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw normalizeError(error);
  }
  return data || [];
}

export async function fetchProjectById(projectId: string): Promise<Project> {
  if (!projectId) throw new Error('Project ID is required.');
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    throw normalizeError(error);
  }
  if (!data) {
    throw new Error('Project not found.');
  }
  return data;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const title = input.title?.trim();
  if (!title) {
    throw new Error('Project title is required and cannot be empty.');
  }

  const supabase = getSupabaseClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    throw new Error('You must be signed in to create a project.');
  }

  const payload: Record<string, unknown> = {
    user_id: authData.user.id,
    title,
    description: input.description?.trim() || '',
    genre: input.genre?.trim() || '',
    visual_style: input.visual_style?.trim() || 'Grounded cinematic realism',
    aspect_ratio: input.aspect_ratio?.trim() || '16:9',
    language: input.language?.trim() || 'English',
  };

  const { data, error } = await supabase
    .from('projects')
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw normalizeError(error);
  }
  if (!data) {
    throw new Error('Failed to create project: No data returned from database.');
  }

  // Initialize empty screenplay for the new project
  try {
    await supabase.from('screenplays').insert([
      {
        project_id: data.id,
        content: '',
      },
    ]);
  } catch (err) {
    console.warn('Note: screenplay auto-init handled or deferred:', err);
  }

  return data;
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput
): Promise<Project> {
  if (!projectId) throw new Error('Project ID is required.');

  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const trimmed = input.title.trim();
    if (!trimmed) {
      throw new Error('Project title cannot be empty.');
    }
    updates.title = trimmed;
  }
  if (input.description !== undefined) updates.description = input.description.trim();
  if (input.genre !== undefined) updates.genre = input.genre.trim();
  if (input.visual_style !== undefined) updates.visual_style = input.visual_style.trim();
  if (input.aspect_ratio !== undefined) updates.aspect_ratio = input.aspect_ratio.trim();
  if (input.language !== undefined) updates.language = input.language.trim();

  if (Object.keys(updates).length === 0) {
    return fetchProjectById(projectId);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    throw normalizeError(error);
  }
  if (!data) {
    throw new Error('Project update failed: record not found or unauthorized.');
  }
  return data;
}

export async function deleteProject(projectId: string): Promise<void> {
  if (!projectId) throw new Error('Project ID is required.');

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('projects').delete().eq('id', projectId);

  if (error) {
    throw normalizeError(error);
  }
}

// ============================================================================
// SCREENPLAY
// ============================================================================

export async function fetchScreenplay(projectId: string): Promise<Screenplay> {
  if (!projectId) throw new Error('Project ID is required.');
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('screenplays')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) {
    throw normalizeError(error);
  }

  if (data) {
    return data;
  }

  // If no screenplay document exists yet for this project, create one
  const { data: created, error: createError } = await supabase
    .from('screenplays')
    .insert([{ project_id: projectId, content: '' }])
    .select()
    .single();

  if (createError) {
    throw normalizeError(createError);
  }
  return created;
}

export async function saveScreenplay(projectId: string, content: string): Promise<Screenplay> {
  if (!projectId) throw new Error('Project ID is required.');
  const supabase = getSupabaseClient();

  const { data: updated, error: updateError } = await supabase
    .from('screenplays')
    .update({ content })
    .eq('project_id', projectId)
    .select()
    .maybeSingle();

  if (updateError) {
    throw normalizeError(updateError);
  }

  if (updated) {
    return updated;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('screenplays')
    .insert([{ project_id: projectId, content }])
    .select()
    .single();

  if (insertError) {
    throw normalizeError(insertError);
  }
  if (!inserted) {
    throw new Error('Failed to save screenplay document.');
  }

  return inserted;
}

// ============================================================================
// LOCATIONS (Location Bible)
// ============================================================================

export async function fetchLocations(projectId: string): Promise<Location[]> {
  if (!projectId) throw new Error('Project ID is required.');
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('project_id', projectId)
    .order('name', { ascending: true });

  if (error) {
    throw normalizeError(error);
  }
  return data || [];
}

export async function createLocation(input: CreateLocationInput): Promise<Location> {
  if (!input.project_id) throw new Error('Project ID is required to create a location.');
  const name = input.name?.trim();
  if (!name) {
    throw new Error('Location name is required and cannot be empty.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('locations')
    .insert([
      {
        project_id: input.project_id,
        name,
        description: input.description?.trim() || '',
        visual_notes: input.visual_notes?.trim() || '',
      },
    ])
    .select()
    .single();

  if (error) {
    throw normalizeError(error);
  }
  if (!data) {
    throw new Error('Failed to create location.');
  }
  return data;
}

export async function updateLocation(
  locationId: string,
  input: UpdateLocationInput
): Promise<Location> {
  if (!locationId) throw new Error('Location ID is required.');

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed) throw new Error('Location name cannot be empty.');
    updates.name = trimmed;
  }
  if (input.description !== undefined) updates.description = input.description.trim();
  if (input.visual_notes !== undefined) updates.visual_notes = input.visual_notes.trim();

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('locations')
    .update(updates)
    .eq('id', locationId)
    .select()
    .single();

  if (error) {
    throw normalizeError(error);
  }
  if (!data) {
    throw new Error('Location update failed.');
  }
  return data;
}

export async function deleteLocation(locationId: string): Promise<void> {
  if (!locationId) throw new Error('Location ID is required.');
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('locations').delete().eq('id', locationId);

  if (error) {
    throw normalizeError(error);
  }
}

// ============================================================================
// SCENES
// ============================================================================

export async function fetchScenes(projectId: string): Promise<Scene[]> {
  if (!projectId) throw new Error('Project ID is required.');
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('scene_order', { ascending: true });

  if (error) {
    throw normalizeError(error);
  }
  return data || [];
}

export async function createScene(input: CreateSceneInput): Promise<Scene> {
  if (!input.project_id) throw new Error('Project ID is required to create a scene.');
  const title = input.title?.trim();
  if (!title) {
    throw new Error('Scene title is required and cannot be empty.');
  }

  const supabase = getSupabaseClient();

  let order = input.scene_order;
  if (order === undefined || order === null) {
    const { data: existing } = await supabase
      .from('scenes')
      .select('scene_order')
      .eq('project_id', input.project_id)
      .order('scene_order', { ascending: false })
      .limit(1);

    order = existing && existing.length > 0 ? existing[0].scene_order + 1 : 1;
  }

  const { data, error } = await supabase
    .from('scenes')
    .insert([
      {
        project_id: input.project_id,
        scene_order: order,
        title,
        location: input.location?.trim() || '',
        location_id: input.location_id || null,
        int_ext: input.int_ext || null,
        time_of_day: input.time_of_day || null,
        content: input.content || '',
        summary: input.summary || '',
        characters: input.characters || [],
        continuity_notes: input.continuity_notes || '',
      },
    ])
    .select()
    .single();

  if (error) {
    throw normalizeError(error);
  }
  if (!data) {
    throw new Error('Failed to create scene.');
  }
  return data;
}

export async function updateScene(sceneId: string, input: UpdateSceneInput): Promise<Scene> {
  if (!sceneId) throw new Error('Scene ID is required.');

  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const trimmed = input.title.trim();
    if (!trimmed) throw new Error('Scene title cannot be empty.');
    updates.title = trimmed;
  }
  if (input.location !== undefined) updates.location = input.location.trim();
  if (input.location_id !== undefined) updates.location_id = input.location_id || null;
  if (input.int_ext !== undefined) updates.int_ext = input.int_ext;
  if (input.time_of_day !== undefined) updates.time_of_day = input.time_of_day;
  if (input.content !== undefined) updates.content = input.content;
  if (input.summary !== undefined) updates.summary = input.summary;
  if (input.characters !== undefined) updates.characters = input.characters;
  if (input.continuity_notes !== undefined) updates.continuity_notes = input.continuity_notes;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('scenes')
    .update(updates)
    .eq('id', sceneId)
    .select()
    .single();

  if (error) {
    throw normalizeError(error);
  }
  if (!data) {
    throw new Error('Scene update failed.');
  }
  return data;
}

export async function reorderScenes(
  projectId: string,
  orderedSceneIds: string[]
): Promise<Scene[]> {
  if (!projectId) throw new Error('Project ID is required.');
  if (!orderedSceneIds || orderedSceneIds.length === 0) {
    return fetchScenes(projectId);
  }

  const supabase = getSupabaseClient();

  const updatePromises = orderedSceneIds.map((id, index) =>
    supabase
      .from('scenes')
      .update({ scene_order: index + 1 })
      .eq('id', id)
      .eq('project_id', projectId)
  );

  const results = await Promise.all(updatePromises);
  const firstError = results.find((r) => r.error);
  if (firstError && firstError.error) {
    throw normalizeError(firstError.error);
  }

  return fetchScenes(projectId);
}

export async function deleteScene(sceneId: string): Promise<void> {
  if (!sceneId) throw new Error('Scene ID is required.');

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('scenes').delete().eq('id', sceneId);

  if (error) {
    throw normalizeError(error);
  }
}

// ============================================================================
// CHARACTERS (Character Bible)
// ============================================================================

export async function fetchCharacters(projectId: string): Promise<Character[]> {
  if (!projectId) throw new Error('Project ID is required.');
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    throw normalizeError(error);
  }
  return data || [];
}

export async function createCharacter(input: CreateCharacterInput): Promise<Character> {
  if (!input.project_id) throw new Error('Project ID is required to create a character.');
  const name = input.name?.trim();
  if (!name) {
    throw new Error('Character name is required and cannot be empty.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('characters')
    .insert([
      {
        project_id: input.project_id,
        name,
        role: input.role?.trim() || '',
        description: input.description?.trim() || '',
        appearance: input.appearance?.trim() || '',
        personality: input.personality?.trim() || '',
        age_description: input.age_description?.trim() || '',
        wardrobe: input.wardrobe?.trim() || '',
        reference_image_url: input.reference_image_url?.trim() || '',
        continuity_notes: input.continuity_notes?.trim() || '',
      },
    ])
    .select()
    .single();

  if (error) {
    throw normalizeError(error);
  }
  if (!data) {
    throw new Error('Failed to create character.');
  }
  return data;
}

export async function updateCharacter(
  characterId: string,
  input: UpdateCharacterInput
): Promise<Character> {
  if (!characterId) throw new Error('Character ID is required.');

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed) throw new Error('Character name cannot be empty.');
    updates.name = trimmed;
  }
  if (input.role !== undefined) updates.role = input.role.trim();
  if (input.description !== undefined) updates.description = input.description.trim();
  if (input.appearance !== undefined) updates.appearance = input.appearance.trim();
  if (input.personality !== undefined) updates.personality = input.personality.trim();
  if (input.age_description !== undefined) updates.age_description = input.age_description.trim();
  if (input.wardrobe !== undefined) updates.wardrobe = input.wardrobe.trim();
  if (input.reference_image_url !== undefined) updates.reference_image_url = input.reference_image_url.trim();
  if (input.continuity_notes !== undefined) updates.continuity_notes = input.continuity_notes.trim();

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('characters')
    .update(updates)
    .eq('id', characterId)
    .select()
    .single();

  if (error) {
    throw normalizeError(error);
  }
  if (!data) {
    throw new Error('Character update failed.');
  }
  return data;
}

export async function deleteCharacter(characterId: string): Promise<void> {
  if (!characterId) throw new Error('Character ID is required.');

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('characters').delete().eq('id', characterId);

  if (error) {
    throw normalizeError(error);
  }
}

// ============================================================================
// SHOTS (Shot Planner)
// ============================================================================

export async function fetchShots(projectId: string): Promise<Shot[]> {
  if (!projectId) throw new Error('Project ID is required.');
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('shots')
    .select('*')
    .eq('project_id', projectId)
    .order('shot_order', { ascending: true });

  if (error) {
    throw normalizeError(error);
  }
  return data || [];
}

export async function createShot(input: CreateShotInput): Promise<Shot> {
  if (!input.project_id) throw new Error('Project ID is required.');
  if (!input.scene_id) throw new Error('Scene ID is required.');
  const title = input.title?.trim();
  if (!title) {
    throw new Error('Shot title is required.');
  }

  const supabase = getSupabaseClient();

  let order = input.shot_order;
  if (order === undefined || order === null) {
    const { data: existing } = await supabase
      .from('shots')
      .select('shot_order')
      .eq('scene_id', input.scene_id)
      .order('shot_order', { ascending: false })
      .limit(1);

    order = existing && existing.length > 0 ? existing[0].shot_order + 1 : 1;
  }

  const { data, error } = await supabase
    .from('shots')
    .insert([
      {
        project_id: input.project_id,
        scene_id: input.scene_id,
        shot_order: order,
        title,
        shot_type: input.shot_type || 'Wide shot',
        camera_angle: input.camera_angle || 'Eye level',
        camera_movement: input.camera_movement || 'Static',
        duration_seconds: input.duration_seconds !== undefined ? input.duration_seconds : 5,
        characters: input.characters || [],
        action: input.action || '',
        image_prompt: input.image_prompt || '',
        motion_prompt: input.motion_prompt || '',
        dialogue: input.dialogue || [],
        sound_effects: input.sound_effects || [],
        music_cue: input.music_cue || '',
        continuity_notes: input.continuity_notes || '',
        production_status: input.production_status || 'Not Started',
      },
    ])
    .select()
    .single();

  if (error) {
    throw normalizeError(error);
  }
  if (!data) {
    throw new Error('Failed to create shot.');
  }
  return data;
}

export async function updateShot(shotId: string, input: UpdateShotInput): Promise<Shot> {
  if (!shotId) throw new Error('Shot ID is required.');

  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const trimmed = input.title.trim();
    if (!trimmed) throw new Error('Shot title cannot be empty.');
    updates.title = trimmed;
  }
  if (input.scene_id !== undefined) updates.scene_id = input.scene_id;
  if (input.shot_order !== undefined) updates.shot_order = input.shot_order;
  if (input.shot_type !== undefined) updates.shot_type = input.shot_type;
  if (input.camera_angle !== undefined) updates.camera_angle = input.camera_angle;
  if (input.camera_movement !== undefined) updates.camera_movement = input.camera_movement;
  if (input.duration_seconds !== undefined) updates.duration_seconds = input.duration_seconds;
  if (input.characters !== undefined) updates.characters = input.characters;
  if (input.action !== undefined) updates.action = input.action;
  if (input.image_prompt !== undefined) updates.image_prompt = input.image_prompt;
  if (input.motion_prompt !== undefined) updates.motion_prompt = input.motion_prompt;
  if (input.dialogue !== undefined) updates.dialogue = input.dialogue;
  if (input.sound_effects !== undefined) updates.sound_effects = input.sound_effects;
  if (input.music_cue !== undefined) updates.music_cue = input.music_cue;
  if (input.continuity_notes !== undefined) updates.continuity_notes = input.continuity_notes;
  if (input.production_status !== undefined) updates.production_status = input.production_status;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('shots')
    .update(updates)
    .eq('id', shotId)
    .select()
    .single();

  if (error) {
    throw normalizeError(error);
  }
  if (!data) {
    throw new Error('Shot update failed.');
  }
  return data;
}

export async function updateShotProductionStatus(
  shotId: string,
  status: ShotProductionStatus
): Promise<Shot> {
  return updateShot(shotId, { production_status: status });
}

export async function reorderShots(
  projectId: string,
  sceneId: string,
  orderedShotIds: string[]
): Promise<Shot[]> {
  if (!projectId || !sceneId) throw new Error('Project ID and Scene ID are required.');
  const supabase = getSupabaseClient();

  const updatePromises = orderedShotIds.map((id, index) =>
    supabase
      .from('shots')
      .update({ shot_order: index + 1 })
      .eq('id', id)
      .eq('scene_id', sceneId)
      .eq('project_id', projectId)
  );

  const results = await Promise.all(updatePromises);
  const firstError = results.find((r) => r.error);
  if (firstError && firstError.error) {
    throw normalizeError(firstError.error);
  }

  return fetchShots(projectId);
}

export async function moveShotToScene(
  shotId: string,
  targetSceneId: string,
  newOrder?: number
): Promise<void> {
  if (!shotId || !targetSceneId) throw new Error('Shot ID and target Scene ID are required.');
  const supabase = getSupabaseClient();

  const updates: Record<string, unknown> = { scene_id: targetSceneId };
  if (newOrder !== undefined) {
    updates.shot_order = newOrder;
  }

  const { error } = await supabase.from('shots').update(updates).eq('id', shotId);
  if (error) {
    throw normalizeError(error);
  }
}

export async function deleteShot(shotId: string): Promise<void> {
  if (!shotId) throw new Error('Shot ID is required.');
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('shots').delete().eq('id', shotId);

  if (error) {
    throw normalizeError(error);
  }
}

// ============================================================================
// BLUEPRINT IMPORT ORCHESTRATION (Atomic & Validated)
// ============================================================================

export interface ImportBlueprintResult {
  project: Project;
  characters: Character[];
  locations: Location[];
  scenes: Scene[];
  shots: Shot[];
}

/**
 * Creates a brand new project and populates characters, locations, scenes, and shots from blueprint.
 */
export async function createProjectFromBlueprint(
  blueprint: FolkverseBlueprint
): Promise<ImportBlueprintResult> {
  // 1. Create Project
  const newProject = await createProject({
    title: blueprint.project.title,
    description: blueprint.project.description || '',
    genre: blueprint.project.genre || '',
    visual_style: blueprint.project.visualStyle || 'Grounded cinematic realism',
    aspect_ratio: blueprint.project.aspectRatio || '16:9',
    language: blueprint.project.language || 'English',
  });

  return importBlueprintToProject(newProject.id, blueprint, 'replace');
}

/**
 * Imports a blueprint into an existing project with either 'replace' or 'merge' strategy.
 */
export async function importBlueprintToProject(
  projectId: string,
  blueprint: FolkverseBlueprint,
  mode: 'replace' | 'merge' = 'replace'
): Promise<ImportBlueprintResult> {
  const supabase = getSupabaseClient();

  // If replacing, cleanly clear existing production data
  if (mode === 'replace') {
    // Delete in order to avoid foreign key conflicts
    await supabase.from('shots').delete().eq('project_id', projectId);
    await supabase.from('scenes').delete().eq('project_id', projectId);
    await supabase.from('locations').delete().eq('project_id', projectId);
    await supabase.from('characters').delete().eq('project_id', projectId);

    // Update project metadata if provided
    await updateProject(projectId, {
      title: blueprint.project.title,
      description: blueprint.project.description || '',
      genre: blueprint.project.genre || '',
      visual_style: blueprint.project.visualStyle || 'Grounded cinematic realism',
      aspect_ratio: blueprint.project.aspectRatio || '16:9',
      language: blueprint.project.language || 'English',
    });
  }

  // Cross-reference mapping tables: blueprint ID -> database UUID
  const characterIdMap = new Map<string, string>();
  const locationIdMap = new Map<string, string>();

  // 1. Insert Characters
  const createdCharacters: Character[] = [];
  if (blueprint.characters && blueprint.characters.length > 0) {
    for (const char of blueprint.characters) {
      const created = await createCharacter({
        project_id: projectId,
        name: char.name,
        role: char.role || '',
        description: char.appearance || '',
        appearance: char.appearance || '',
        personality: char.personality || '',
        age_description: char.ageDescription || '',
        wardrobe: char.wardrobe || '',
        reference_image_url: char.referenceImageUrl || '',
        continuity_notes: char.continuityNotes || '',
      });
      characterIdMap.set(char.id, created.id);
      createdCharacters.push(created);
    }
  }

  // 2. Insert Locations
  const createdLocations: Location[] = [];
  if (blueprint.locations && blueprint.locations.length > 0) {
    for (const loc of blueprint.locations) {
      const created = await createLocation({
        project_id: projectId,
        name: loc.name,
        description: loc.description || '',
        visual_notes: loc.visualNotes || '',
      });
      locationIdMap.set(loc.id, created.id);
      createdLocations.push(created);
    }
  }

  // Determine starting scene order offset if merging
  let sceneOrderOffset = 0;
  if (mode === 'merge') {
    const existingScenes = await fetchScenes(projectId);
    sceneOrderOffset = existingScenes.length;
  }

  // 3. Insert Scenes and Shots
  const createdScenes: Scene[] = [];
  const createdShots: Shot[] = [];

  if (blueprint.scenes && blueprint.scenes.length > 0) {
    for (const sc of blueprint.scenes) {
      // Remap locationId
      const remappedLocationId = sc.locationId ? locationIdMap.get(sc.locationId) || null : null;

      // Remap characters array
      const remappedSceneChars = (sc.characters || []).map(
        (cId) => characterIdMap.get(cId) || cId
      );

      const createdScene = await createScene({
        project_id: projectId,
        scene_order: sc.order + sceneOrderOffset,
        title: sc.title,
        location: sc.locationId && locationIdMap.has(sc.locationId)
          ? blueprint.locations?.find((l) => l.id === sc.locationId)?.name || ''
          : '',
        location_id: remappedLocationId,
        time_of_day: sc.timeOfDay || 'DAY',
        summary: sc.summary || '',
        content: sc.summary || '',
        characters: remappedSceneChars,
        continuity_notes: sc.continuityNotes || '',
      });
      createdScenes.push(createdScene);

      // Insert shots for this scene
      if (sc.shots && sc.shots.length > 0) {
        for (const sh of sc.shots) {
          // Remap shot characters
          const remappedShotChars = (sh.characters || []).map(
            (cId) => characterIdMap.get(cId) || cId
          );

          // Remap dialogue characterId
          const remappedDialogue = (sh.dialogue || []).map((d) => ({
            characterId: d.characterId ? characterIdMap.get(d.characterId) || d.characterId : undefined,
            text: d.text,
            delivery: d.delivery,
            voiceNotes: d.voiceNotes,
          }));

          const createdShot = await createShot({
            project_id: projectId,
            scene_id: createdScene.id,
            shot_order: sh.order,
            title: sh.title,
            shot_type: sh.shotType || 'Wide shot',
            camera_angle: sh.cameraAngle || 'Eye level',
            camera_movement: sh.cameraMovement || 'Static',
            duration_seconds: sh.durationSeconds,
            characters: remappedShotChars,
            action: sh.action || '',
            image_prompt: sh.imagePrompt || '',
            motion_prompt: sh.motionPrompt || '',
            dialogue: remappedDialogue,
            sound_effects: sh.soundEffects || [],
            music_cue: sh.musicCue || '',
            continuity_notes: sh.continuityNotes || '',
          });
          createdShots.push(createdShot);
        }
      }
    }
  }

  const finalProject = await fetchProjectById(projectId);
  const finalCharacters = await fetchCharacters(projectId);
  const finalLocations = await fetchLocations(projectId);
  const finalScenes = await fetchScenes(projectId);
  const finalShots = await fetchShots(projectId);

  return {
    project: finalProject,
    characters: finalCharacters,
    locations: finalLocations,
    scenes: finalScenes,
    shots: finalShots,
  };
}

// ============================================================================
// ASSET MANAGEMENT (Phase 4: Production Execution & Asset Management)
// ============================================================================

const MAX_SIZES_BY_TYPE: Record<string, number> = {
  image: 25 * 1024 * 1024, // 25MB
  video: 100 * 1024 * 1024, // 100MB
  audio: 50 * 1024 * 1024, // 50MB
  character_reference: 25 * 1024 * 1024,
  location_reference: 25 * 1024 * 1024,
  reference_file: 30 * 1024 * 1024,
};

const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/', 'application/pdf', 'text/'];

export function validateAssetFile(
  file: File,
  assetType?: AssetType
): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  const mime = (file.type || '').toLowerCase();
  const isAllowedMime =
    ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix)) ||
    mime === 'application/json';

  const matchesExtension = file.name.match(
    /\.(jpg|jpeg|png|webp|gif|avif|mp4|webm|mov|mkv|mp3|wav|ogg|aac|flac|m4a|pdf|txt|json)$/i
  );

  if (!isAllowedMime && !matchesExtension) {
    return {
      valid: false,
      error: `Unsupported file format: ${file.type || 'unknown'}. Please upload image, video, audio, or production reference files.`,
    };
  }

  const typeKey =
    assetType ||
    (mime.startsWith('video') ? 'video' : mime.startsWith('audio') ? 'audio' : 'image');
  const maxBytes = MAX_SIZES_BY_TYPE[typeKey] || 30 * 1024 * 1024;

  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of ${maxMb} MB for ${typeKey} assets.`,
    };
  }

  return { valid: true };
}

export async function fetchProjectAssets(projectId: string): Promise<ProductionAsset[]> {
  if (!projectId) throw new Error('Project ID is required.');
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    throw normalizeError(error);
  }
  return data || [];
}

export async function fetchShotAssets(shotId: string): Promise<ProductionAsset[]> {
  if (!shotId) throw new Error('Shot ID is required.');
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('shot_id', shotId)
    .order('version_number', { ascending: false });

  if (error) {
    throw normalizeError(error);
  }
  return data || [];
}

export async function createAsset(input: CreateAssetInput): Promise<ProductionAsset> {
  if (!input.project_id) throw new Error('Project ID is required to create an asset.');
  const displayName = input.display_name?.trim();
  if (!displayName) {
    throw new Error('Asset display name is required and cannot be empty.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('assets')
    .insert([
      {
        project_id: input.project_id,
        scene_id: input.scene_id || null,
        shot_id: input.shot_id || null,
        asset_type: input.asset_type,
        display_name: displayName,
        storage_path: input.storage_path || '',
        mime_type: input.mime_type || 'application/octet-stream',
        file_size: input.file_size || 0,
        duration_seconds: input.duration_seconds || null,
        version_number: input.version_number !== undefined ? input.version_number : 1,
        generation_tool: input.generation_tool?.trim() || '',
        prompt_used: input.prompt_used?.trim() || '',
        is_preferred: Boolean(input.is_preferred),
        review_status: input.review_status || 'pending',
        notes: input.notes?.trim() || '',
        is_external: Boolean(input.is_external),
        external_url: input.external_url?.trim() || '',
      },
    ])
    .select()
    .single();

  if (error) {
    throw normalizeError(error);
  }
  if (!data) {
    throw new Error('Failed to register asset.');
  }
  return data;
}

export async function updateAsset(
  assetId: string,
  input: UpdateAssetInput
): Promise<ProductionAsset> {
  if (!assetId) throw new Error('Asset ID is required.');

  const updates: Record<string, unknown> = {};
  if (input.display_name !== undefined) {
    const trimmed = input.display_name.trim();
    if (!trimmed) throw new Error('Asset display name cannot be empty.');
    updates.display_name = trimmed;
  }
  if (input.review_status !== undefined) updates.review_status = input.review_status;
  if (input.is_preferred !== undefined) updates.is_preferred = input.is_preferred;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.generation_tool !== undefined) updates.generation_tool = input.generation_tool;
  if (input.prompt_used !== undefined) updates.prompt_used = input.prompt_used;
  if (input.duration_seconds !== undefined) updates.duration_seconds = input.duration_seconds;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('assets')
    .update(updates)
    .eq('id', assetId)
    .select()
    .single();

  if (error) {
    throw normalizeError(error);
  }
  if (!data) {
    throw new Error('Failed to update asset.');
  }
  return data;
}

export async function setPreferredAsset(
  shotId: string,
  assetId: string,
  assetType: AssetType
): Promise<void> {
  if (!shotId || !assetId) throw new Error('Shot ID and Asset ID are required.');
  const supabase = getSupabaseClient();

  // 1. Unset preferred for all assets on this shot of the same type
  const { error: unsetError } = await supabase
    .from('assets')
    .update({ is_preferred: false })
    .eq('shot_id', shotId)
    .eq('asset_type', assetType);

  if (unsetError) {
    throw normalizeError(unsetError);
  }

  // 2. Set preferred on target asset
  const { error: setError } = await supabase
    .from('assets')
    .update({ is_preferred: true })
    .eq('id', assetId);

  if (setError) {
    throw normalizeError(setError);
  }
}

export async function deleteAsset(assetId: string): Promise<void> {
  if (!assetId) throw new Error('Asset ID is required.');
  const supabase = getSupabaseClient();

  // Check if storage file exists
  const { data: asset } = await supabase
    .from('assets')
    .select('storage_path, is_external')
    .eq('id', assetId)
    .maybeSingle();

  const { error } = await supabase.from('assets').delete().eq('id', assetId);
  if (error) {
    throw normalizeError(error);
  }

  // If local Supabase storage, attempt cleanup
  if (asset && !asset.is_external && asset.storage_path) {
    try {
      const match = asset.storage_path.match(/production-assets\/(.+)$/);
      if (match && match[1]) {
        await supabase.storage.from('production-assets').remove([match[1]]);
      }
    } catch {
      // Ignore background storage removal errors
    }
  }
}

export async function uploadAssetFile(
  projectId: string,
  shotId: string | null,
  file: File,
  meta?: {
    scene_id?: string | null;
    asset_type?: AssetType;
    display_name?: string;
    generation_tool?: string;
    prompt_used?: string;
    notes?: string;
    version_number?: number;
  }
): Promise<ProductionAsset> {
  if (!projectId) throw new Error('Project ID is required.');

  let detectedType: AssetType = meta?.asset_type || 'image';
  if (!meta?.asset_type) {
    if (file.type.startsWith('video')) detectedType = 'video';
    else if (file.type.startsWith('audio')) detectedType = 'audio';
    else if (file.type.startsWith('image')) detectedType = 'image';
    else detectedType = 'reference_file';
  }

  const validation = validateAssetFile(file, detectedType);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file.');
  }

  const supabase = getSupabaseClient();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${projectId}/${shotId || 'general'}/${Date.now()}_${sanitizedName}`;

  const { error: uploadError } = await supabase.storage
    .from('production-assets')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      `Storage upload failed: ${uploadError.message}. Make sure the 'production-assets' bucket exists in your Supabase project, or use an external URL link.`
    );
  }

  const { data: urlData } = supabase.storage
    .from('production-assets')
    .getPublicUrl(storagePath);

  const publicUrl = urlData?.publicUrl || storagePath;

  let version = meta?.version_number;
  if (!version && shotId) {
    const { count } = await supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('shot_id', shotId)
      .eq('asset_type', detectedType);
    version = (count || 0) + 1;
  }

  return createAsset({
    project_id: projectId,
    scene_id: meta?.scene_id || null,
    shot_id: shotId,
    asset_type: detectedType,
    display_name: meta?.display_name?.trim() || file.name,
    storage_path: publicUrl,
    mime_type: file.type || 'application/octet-stream',
    file_size: file.size,
    version_number: version || 1,
    generation_tool: meta?.generation_tool?.trim() || '',
    prompt_used: meta?.prompt_used?.trim() || '',
    notes: meta?.notes?.trim() || '',
    is_external: false,
    review_status: 'pending',
  });
}

export async function createExternalAsset(input: {
  project_id: string;
  scene_id?: string | null;
  shot_id?: string | null;
  asset_type: AssetType;
  display_name: string;
  external_url: string;
  generation_tool?: string;
  prompt_used?: string;
  notes?: string;
  version_number?: number;
}): Promise<ProductionAsset> {
  const url = input.external_url?.trim();
  if (!url) throw new Error('External asset URL cannot be empty.');
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('URL must start with http:// or https://');
    }
  } catch {
    throw new Error('Invalid URL format. Please provide a full URL starting with https://');
  }

  const displayName = input.display_name?.trim() || 'External Media';

  return createAsset({
    project_id: input.project_id,
    scene_id: input.scene_id || null,
    shot_id: input.shot_id || null,
    asset_type: input.asset_type,
    display_name: displayName,
    storage_path: url,
    external_url: url,
    is_external: true,
    mime_type:
      input.asset_type === 'video'
        ? 'video/external'
        : input.asset_type === 'audio'
        ? 'audio/external'
        : 'image/external',
    file_size: 0,
    generation_tool: input.generation_tool?.trim() || '',
    prompt_used: input.prompt_used?.trim() || '',
    notes: input.notes?.trim() || '',
    version_number: input.version_number || 1,
    review_status: 'pending',
  });
}

