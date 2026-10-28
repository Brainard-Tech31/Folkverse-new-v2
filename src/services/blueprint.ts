/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  FolkverseBlueprint,
  BlueprintCharacter,
  BlueprintLocation,
  BlueprintScene,
  BlueprintShot,
  Project,
  Character,
  Location,
  Scene,
  Shot,
} from '../types/database.ts';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  blueprint?: FolkverseBlueprint;
  stats?: {
    charactersCount: number;
    locationsCount: number;
    scenesCount: number;
    shotsCount: number;
    totalRuntimeSeconds: number;
  };
}

/**
 * Validates a Folkverse JSON blueprint thoroughly against schema and relational rules.
 */
export function validateBlueprint(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: ['Blueprint must be a valid JSON object.'],
      warnings,
    };
  }

  const raw = data as Record<string, unknown>;

  // 1. Schema Version Check
  if (!raw.schemaVersion) {
    errors.push('Missing required root property "schemaVersion".');
  } else if (typeof raw.schemaVersion !== 'string') {
    errors.push('"schemaVersion" must be a string.');
  } else if (raw.schemaVersion !== '1.0') {
    errors.push(
      `Unsupported schema version "${raw.schemaVersion}". Supported version is "1.0". Migration required for other versions.`
    );
  }

  // 2. Project Object Check
  if (!raw.project || typeof raw.project !== 'object') {
    errors.push('Missing or invalid "project" configuration block.');
  } else {
    const project = raw.project as Record<string, unknown>;
    if (!project.title || typeof project.title !== 'string' || !project.title.trim()) {
      errors.push('project.title is required and cannot be empty.');
    }
  }

  // Unique ID registries
  const characterIdSet = new Set<string>();
  const locationIdSet = new Set<string>();
  const sceneIdSet = new Set<string>();
  const shotIdSet = new Set<string>();

  // 3. Characters Array Check
  const characters: BlueprintCharacter[] = [];
  if (raw.characters !== undefined) {
    if (!Array.isArray(raw.characters)) {
      errors.push('"characters" must be an array.');
    } else {
      raw.characters.forEach((char, idx) => {
        if (!char || typeof char !== 'object') {
          errors.push(`characters[${idx}] is not an object.`);
          return;
        }
        const c = char as Record<string, unknown>;
        if (!c.id || typeof c.id !== 'string' || !c.id.trim()) {
          errors.push(`characters[${idx}]: missing or empty "id".`);
        } else if (characterIdSet.has(c.id.trim())) {
          errors.push(`characters[${idx}]: duplicate character id "${c.id}".`);
        } else {
          characterIdSet.add(c.id.trim());
        }

        if (!c.name || typeof c.name !== 'string' || !c.name.trim()) {
          errors.push(`characters[${idx}]: missing or empty "name".`);
        }

        characters.push({
          id: String(c.id || `char_${idx + 1}`),
          name: String(c.name || ''),
          role: typeof c.role === 'string' ? c.role : undefined,
          ageDescription: typeof c.ageDescription === 'string' ? c.ageDescription : undefined,
          appearance: typeof c.appearance === 'string' ? c.appearance : undefined,
          wardrobe: typeof c.wardrobe === 'string' ? c.wardrobe : undefined,
          personality: typeof c.personality === 'string' ? c.personality : undefined,
          referenceImageUrl: typeof c.referenceImageUrl === 'string' ? c.referenceImageUrl : undefined,
          continuityNotes: typeof c.continuityNotes === 'string' ? c.continuityNotes : undefined,
        });
      });
    }
  }

  // 4. Locations Array Check
  const locations: BlueprintLocation[] = [];
  if (raw.locations !== undefined) {
    if (!Array.isArray(raw.locations)) {
      errors.push('"locations" must be an array.');
    } else {
      raw.locations.forEach((loc, idx) => {
        if (!loc || typeof loc !== 'object') {
          errors.push(`locations[${idx}] is not an object.`);
          return;
        }
        const l = loc as Record<string, unknown>;
        if (!l.id || typeof l.id !== 'string' || !l.id.trim()) {
          errors.push(`locations[${idx}]: missing or empty "id".`);
        } else if (locationIdSet.has(l.id.trim())) {
          errors.push(`locations[${idx}]: duplicate location id "${l.id}".`);
        } else {
          locationIdSet.add(l.id.trim());
        }

        if (!l.name || typeof l.name !== 'string' || !l.name.trim()) {
          errors.push(`locations[${idx}]: missing or empty "name".`);
        }

        locations.push({
          id: String(l.id || `loc_${idx + 1}`),
          name: String(l.name || ''),
          description: typeof l.description === 'string' ? l.description : undefined,
          visualNotes: typeof l.visualNotes === 'string' ? l.visualNotes : undefined,
        });
      });
    }
  }

  // 5. Scenes & Shots Check
  let totalRuntimeSeconds = 0;
  let totalShots = 0;
  const scenes: BlueprintScene[] = [];

  if (raw.scenes !== undefined) {
    if (!Array.isArray(raw.scenes)) {
      errors.push('"scenes" must be an array.');
    } else {
      raw.scenes.forEach((sc, sceneIdx) => {
        if (!sc || typeof sc !== 'object') {
          errors.push(`scenes[${sceneIdx}] is not an object.`);
          return;
        }
        const s = sc as Record<string, unknown>;
        if (!s.id || typeof s.id !== 'string' || !s.id.trim()) {
          errors.push(`scenes[${sceneIdx}]: missing or empty "id".`);
        } else if (sceneIdSet.has(s.id.trim())) {
          errors.push(`scenes[${sceneIdx}]: duplicate scene id "${s.id}".`);
        } else {
          sceneIdSet.add(s.id.trim());
        }

        if (!s.title || typeof s.title !== 'string' || !s.title.trim()) {
          errors.push(`scenes[${sceneIdx}]: missing or empty "title".`);
        }

        if (s.order !== undefined && typeof s.order !== 'number') {
          errors.push(`scenes[${sceneIdx}]: "order" must be a number.`);
        }

        // Location reference check
        if (s.locationId && typeof s.locationId === 'string' && s.locationId.trim()) {
          if (!locationIdSet.has(s.locationId.trim())) {
            errors.push(
              `scenes[${sceneIdx}] "${s.title || s.id}": referenced locationId "${s.locationId}" does not exist in locations array.`
            );
          }
        }

        // Scene character references check
        if (s.characters !== undefined) {
          if (!Array.isArray(s.characters)) {
            errors.push(`scenes[${sceneIdx}]: "characters" must be an array of IDs.`);
          } else {
            s.characters.forEach((charId, cIdx) => {
              if (typeof charId !== 'string' || !characterIdSet.has(charId.trim())) {
                errors.push(
                  `scenes[${sceneIdx}] "${s.title || s.id}": character reference "${charId}" at index ${cIdx} is not defined in characters array.`
                );
              }
            });
          }
        }

        // Shots inside scene
        const shots: BlueprintShot[] = [];
        if (s.shots !== undefined) {
          if (!Array.isArray(s.shots)) {
            errors.push(`scenes[${sceneIdx}]: "shots" must be an array.`);
          } else {
            s.shots.forEach((sh, shotIdx) => {
              if (!sh || typeof sh !== 'object') {
                errors.push(`scenes[${sceneIdx}].shots[${shotIdx}] is not an object.`);
                return;
              }
              const shot = sh as Record<string, unknown>;
              if (!shot.id || typeof shot.id !== 'string' || !shot.id.trim()) {
                errors.push(`scenes[${sceneIdx}].shots[${shotIdx}]: missing or empty "id".`);
              } else if (shotIdSet.has(shot.id.trim())) {
                errors.push(`scenes[${sceneIdx}].shots[${shotIdx}]: duplicate shot id "${shot.id}".`);
              } else {
                shotIdSet.add(shot.id.trim());
              }

              if (!shot.title || typeof shot.title !== 'string' || !shot.title.trim()) {
                errors.push(`scenes[${sceneIdx}].shots[${shotIdx}]: missing or empty "title".`);
              }

              const dur = Number(shot.durationSeconds);
              if (isNaN(dur) || dur < 0) {
                errors.push(
                  `scenes[${sceneIdx}].shots[${shotIdx}]: "durationSeconds" must be a positive number or zero.`
                );
              } else {
                totalRuntimeSeconds += dur;
              }
              totalShots += 1;

              // Shot character references check
              if (shot.characters !== undefined) {
                if (!Array.isArray(shot.characters)) {
                  errors.push(
                    `scenes[${sceneIdx}].shots[${shotIdx}]: "characters" must be an array of IDs.`
                  );
                } else {
                  shot.characters.forEach((charId) => {
                    if (typeof charId !== 'string' || !characterIdSet.has(charId.trim())) {
                      errors.push(
                        `scenes[${sceneIdx}].shots[${shotIdx}]: character reference "${charId}" is not defined in characters array.`
                      );
                    }
                  });
                }
              }

              // Dialogue character references check
              if (shot.dialogue !== undefined) {
                if (!Array.isArray(shot.dialogue)) {
                  errors.push(`scenes[${sceneIdx}].shots[${shotIdx}]: "dialogue" must be an array.`);
                } else {
                  shot.dialogue.forEach((dItem, dIdx) => {
                    if (!dItem || typeof dItem !== 'object') return;
                    const d = dItem as Record<string, unknown>;
                    if (d.characterId && typeof d.characterId === 'string' && d.characterId.trim()) {
                      if (!characterIdSet.has(d.characterId.trim())) {
                        errors.push(
                          `scenes[${sceneIdx}].shots[${shotIdx}].dialogue[${dIdx}]: referenced characterId "${d.characterId}" is not defined.`
                        );
                      }
                    }
                  });
                }
              }

              shots.push({
                id: String(shot.id || `shot_${totalShots}`),
                order: typeof shot.order === 'number' ? shot.order : shotIdx + 1,
                title: String(shot.title || `Shot ${shotIdx + 1}`),
                shotType: typeof shot.shotType === 'string' ? shot.shotType : undefined,
                cameraAngle: typeof shot.cameraAngle === 'string' ? shot.cameraAngle : undefined,
                cameraMovement: typeof shot.cameraMovement === 'string' ? shot.cameraMovement : undefined,
                durationSeconds: isNaN(dur) ? 5 : dur,
                characters: Array.isArray(shot.characters) ? (shot.characters as string[]) : [],
                action: typeof shot.action === 'string' ? shot.action : undefined,
                imagePrompt: typeof shot.imagePrompt === 'string' ? shot.imagePrompt : undefined,
                motionPrompt: typeof shot.motionPrompt === 'string' ? shot.motionPrompt : undefined,
                dialogue: Array.isArray(shot.dialogue) ? (shot.dialogue as any[]) : [],
                soundEffects: Array.isArray(shot.soundEffects) ? (shot.soundEffects as string[]) : [],
                musicCue: typeof shot.musicCue === 'string' ? shot.musicCue : undefined,
                continuityNotes: typeof shot.continuityNotes === 'string' ? shot.continuityNotes : undefined,
              });
            });
          }
        }

        scenes.push({
          id: String(s.id || `scene_${sceneIdx + 1}`),
          order: typeof s.order === 'number' ? s.order : sceneIdx + 1,
          title: String(s.title || `Scene ${sceneIdx + 1}`),
          locationId: typeof s.locationId === 'string' ? s.locationId : undefined,
          timeOfDay: typeof s.timeOfDay === 'string' ? s.timeOfDay : undefined,
          summary: typeof s.summary === 'string' ? s.summary : undefined,
          characters: Array.isArray(s.characters) ? (s.characters as string[]) : [],
          continuityNotes: typeof s.continuityNotes === 'string' ? s.continuityNotes : undefined,
          shots,
        });
      });
    }
  }

  // Warnings for production completeness
  if (characters.length === 0) {
    warnings.push('Blueprint contains no characters.');
  }
  if (scenes.length === 0) {
    warnings.push('Blueprint contains no scenes.');
  }
  if (totalShots === 0) {
    warnings.push('Blueprint contains no shots.');
  }

  const valid = errors.length === 0;

  const validatedBlueprint: FolkverseBlueprint | undefined = valid
    ? {
        schemaVersion: String(raw.schemaVersion || '1.0'),
        project: {
          title: String((raw.project as Record<string, unknown>).title),
          description: typeof (raw.project as Record<string, unknown>).description === 'string'
            ? String((raw.project as Record<string, unknown>).description)
            : '',
          genre: typeof (raw.project as Record<string, unknown>).genre === 'string'
            ? String((raw.project as Record<string, unknown>).genre)
            : '',
          visualStyle: typeof (raw.project as Record<string, unknown>).visualStyle === 'string'
            ? String((raw.project as Record<string, unknown>).visualStyle)
            : 'Grounded cinematic realism',
          aspectRatio: typeof (raw.project as Record<string, unknown>).aspectRatio === 'string'
            ? String((raw.project as Record<string, unknown>).aspectRatio)
            : '16:9',
          language: typeof (raw.project as Record<string, unknown>).language === 'string'
            ? String((raw.project as Record<string, unknown>).language)
            : 'English',
        },
        characters,
        locations,
        scenes,
        additionalMetadata: typeof raw.additionalMetadata === 'object' && raw.additionalMetadata !== null
          ? (raw.additionalMetadata as Record<string, unknown>)
          : undefined,
      }
    : undefined;

  return {
    valid,
    errors,
    warnings,
    blueprint: validatedBlueprint,
    stats: {
      charactersCount: characters.length,
      locationsCount: locations.length,
      scenesCount: scenes.length,
      shotsCount: totalShots,
      totalRuntimeSeconds,
    },
  };
}

/**
 * Parses raw JSON string and runs complete validation with size guard.
 */
export function parseAndValidateBlueprintJson(jsonString: string): ValidationResult {
  if (!jsonString || !jsonString.trim()) {
    return {
      valid: false,
      errors: ['Blueprint content is empty.'],
      warnings: [],
    };
  }

  // Size limit guard: 10MB
  if (jsonString.length > 10 * 1024 * 1024) {
    return {
      valid: false,
      errors: ['Blueprint file size exceeds the 10MB limit.'],
      warnings: [],
    };
  }

  try {
    const parsed = JSON.parse(jsonString);
    return validateBlueprint(parsed);
  } catch (err) {
    return {
      valid: false,
      errors: [`JSON syntax error: ${err instanceof Error ? err.message : 'Invalid JSON'}`],
      warnings: [],
    };
  }
}

/**
 * Builds a FolkverseBlueprint JSON object from current project state.
 */
export function exportProjectToBlueprint(
  project: Project,
  characters: Character[],
  locations: Location[],
  scenes: Scene[],
  shots: Shot[],
  additionalMetadata?: Record<string, unknown>
): FolkverseBlueprint {
  // Sort scenes by scene_order
  const sortedScenes = [...scenes].sort((a, b) => a.scene_order - b.scene_order);

  // Map locations: ID can be preserved
  const blueprintLocations: BlueprintLocation[] = locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    description: loc.description || '',
    visualNotes: loc.visual_notes || '',
  }));

  // Map characters
  const blueprintCharacters: BlueprintCharacter[] = characters.map((char) => ({
    id: char.id,
    name: char.name,
    role: char.role || '',
    ageDescription: char.age_description || '',
    appearance: char.appearance || '',
    wardrobe: char.wardrobe || '',
    personality: char.personality || '',
    referenceImageUrl: char.reference_image_url || '',
    continuityNotes: char.continuity_notes || '',
  }));

  // Map scenes and shots
  const blueprintScenes: BlueprintScene[] = sortedScenes.map((scene) => {
    // Find shots belonging to this scene, ordered by shot_order
    const sceneShots = shots
      .filter((sh) => sh.scene_id === scene.id)
      .sort((a, b) => a.shot_order - b.shot_order)
      .map((sh) => ({
        id: sh.id,
        order: sh.shot_order,
        title: sh.title,
        shotType: sh.shot_type || 'Wide shot',
        cameraAngle: sh.camera_angle || 'Eye level',
        cameraMovement: sh.camera_movement || 'Static',
        durationSeconds: Number(sh.duration_seconds) || 5,
        characters: Array.isArray(sh.characters) ? sh.characters : [],
        action: sh.action || '',
        imagePrompt: sh.image_prompt || '',
        motionPrompt: sh.motion_prompt || '',
        dialogue: Array.isArray(sh.dialogue) ? sh.dialogue : [],
        soundEffects: Array.isArray(sh.sound_effects) ? sh.sound_effects : [],
        musicCue: sh.music_cue || '',
        continuityNotes: sh.continuity_notes || '',
      }));

    return {
      id: scene.id,
      order: scene.scene_order,
      title: scene.title,
      locationId: scene.location_id || undefined,
      timeOfDay: scene.time_of_day || 'DAY',
      summary: scene.summary || scene.content || '',
      characters: Array.isArray(scene.characters) ? scene.characters : [],
      continuityNotes: scene.continuity_notes || '',
      shots: sceneShots,
    };
  });

  return {
    schemaVersion: '1.0',
    project: {
      title: project.title,
      description: project.description || '',
      genre: project.genre || '',
      visualStyle: project.visual_style || 'Grounded cinematic realism',
      aspectRatio: project.aspect_ratio || '16:9',
      language: project.language || 'English',
    },
    characters: blueprintCharacters,
    locations: blueprintLocations,
    scenes: blueprintScenes,
    additionalMetadata: additionalMetadata,
  };
}

/**
 * Standard Reference Sample Blueprint
 */
export function getSampleBlueprint(): FolkverseBlueprint {
  return {
    schemaVersion: '1.0',
    project: {
      title: 'The Golden Stool of Ashanti',
      description: 'An epic historical narrative chronicling royal unity, ancestral spirits, and courageous defiance.',
      genre: 'Historical Epic',
      visualStyle: 'Grounded cinematic realism with rich warm earthen and gold palette',
      aspectRatio: '16:9',
      language: 'English',
    },
    characters: [
      {
        id: 'char_001',
        name: 'Nana Yaa Asantewaa',
        role: 'Protagonist',
        ageDescription: 'Middle-aged warrior queen',
        appearance: 'Regal posture, sharp commanding gaze, braided crown adorned with kente trim',
        wardrobe: 'Traditional handwoven indigo and gold Kente cloth, polished brass wrist cuffs',
        personality: 'Fierce, eloquent, unwavering moral authority',
        referenceImageUrl: '',
        continuityNotes: 'Always preserve royal brass bracelet on right wrist and indigo kente weave.',
      },
      {
        id: 'char_002',
        name: 'Okomfo Anokye',
        role: 'Spiritual Elder',
        ageDescription: 'Elderly priest and seer',
        appearance: 'Silver-threaded beard, white ceremonial markings over cheekbones',
        wardrobe: 'Pristine white ceremonial robes and raffia necklace',
        personality: 'Enigmatic, calm, speaks in ancestral proverbs',
        referenceImageUrl: '',
        continuityNotes: 'White clay forehead markings must remain identical across all scenes.',
      },
    ],
    locations: [
      {
        id: 'loc_001',
        name: 'Palace Courtyard of Kumasi',
        description: 'Vast ceremonial courtyard with red clay ramparts and towering silk cotton trees.',
        visualNotes: 'Warm afternoon golden hour light, red dust swirling subtly near stone dais.',
      },
      {
        id: 'loc_002',
        name: 'The Sacred Shrine Room',
        description: 'Sanctum holding ceremonial relics lit by clay oil lanterns.',
        visualNotes: 'Deep shadows, amber lantern glow reflecting off polished bronze artifacts.',
      },
    ],
    scenes: [
      {
        id: 'scene_001',
        order: 1,
        title: 'The Council of Defiance',
        locationId: 'loc_001',
        timeOfDay: 'DUSK',
        summary: 'Yaa Asantewaa addresses the hesitating chiefs, declaring the kingdom will not yield.',
        characters: ['char_001'],
        continuityNotes: 'Dusk light shifts from warm amber to deep twilight indigo.',
        shots: [
          {
            id: 'shot_001',
            order: 1,
            title: 'Courtyard Establishing Wide',
            shotType: 'Wide shot',
            cameraAngle: 'Eye level',
            cameraMovement: 'Slow push-in',
            durationSeconds: 6,
            characters: ['char_001'],
            action: 'The council sits in heavy silence as dusk settles over the red clay palace.',
            imagePrompt: 'Epic wide cinematic shot of Kumasi palace courtyard at dusk, African chiefs in kente robes, towering trees, golden hour haze.',
            motionPrompt: 'Slow cinematic dolly push toward the council dais as torches are lit one by one.',
            dialogue: [],
            soundEffects: ['Distant drums echoing across the valley', 'Crackle of cedar torches'],
            musicCue: 'Low resonant cellos and rhythmic gourds building tension',
            continuityNotes: 'Match position of royal standards on the left parapet.',
          },
          {
            id: 'shot_002',
            order: 2,
            title: 'Yaa Asantewaa Speaks',
            shotType: 'Medium close-up',
            cameraAngle: 'Slight low angle',
            cameraMovement: 'Static',
            durationSeconds: 8,
            characters: ['char_001'],
            action: 'Yaa Asantewaa rises, clutching her staff, locking eyes with each hesitant chief.',
            imagePrompt: 'Cinematic medium close-up of Queen Yaa Asantewaa, resolute expression, golden firelight dancing on brass cuffs.',
            motionPrompt: 'Camera holds firm on Yaa Asantewaa as she rises deliberately into frame.',
            dialogue: [
              {
                characterId: 'char_001',
                text: 'If the men of Ashanti will not go forward, then we the women will!',
                delivery: 'Impassioned, clear and piercing',
                voiceNotes: 'Resonant and commanding without shouting',
              },
            ],
            soundEffects: ['Sharp intake of breath from the council'],
            musicCue: 'Solo horn swell',
            continuityNotes: 'Preserve indigo kente fold over left shoulder.',
          },
        ],
      },
    ],
  };
}
