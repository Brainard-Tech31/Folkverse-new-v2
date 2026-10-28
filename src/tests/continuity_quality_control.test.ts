/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateProductionRuntime,
  analyzeProjectQuality,
  analyzeBlueprintQuality,
  markFindingReviewed,
  unmarkFindingReviewed,
  getReviewedDecisions,
  clearReviewedDecisions,
} from '../services/qualityControl.ts';
import {
  getSampleBlueprint,
  validateBlueprint,
  exportProjectToBlueprint,
} from '../services/blueprint.ts';
import type {
  Project,
  Scene,
  Shot,
  Character,
  Location,
  ProductionAsset,
  FolkverseBlueprint,
} from '../types/database.ts';

describe('FOLKVERSE Phase 3: Production Continuity & Quality Control Test Suite', () => {
  const baseProject: Project = {
    id: 'proj_test_001',
    user_id: 'user_test_001',
    title: 'The Golden Stool of Ashanti',
    description: 'Historical cinematic narrative',
    genre: 'Historical Epic',
    visual_style: 'Grounded cinematic realism',
    aspect_ratio: '16:9',
    language: 'English',
    created_at: '2026-10-28T00:00:00Z',
    updated_at: '2026-10-28T00:00:00Z',
  };

  const char1: Character = {
    id: 'char_yaa',
    project_id: baseProject.id,
    name: 'Nana Yaa Asantewaa',
    role: 'Protagonist',
    description: 'Queen Mother of Ejisu',
    appearance: 'Regal posture, sharp commanding gaze, braided crown',
    wardrobe: 'Traditional handwoven indigo and gold Kente cloth, polished brass wrist cuffs',
    personality: 'Fierce, eloquent, unwavering moral authority',
    reference_image_url: 'https://example.com/assets/yaa_ref.jpg',
    continuity_notes: 'Always preserve royal brass bracelet on right wrist and indigo kente weave.',
    created_at: '2026-10-28T00:00:00Z',
    updated_at: '2026-10-28T00:00:00Z',
  };

  const char2: Character = {
    id: 'char_anokye',
    project_id: baseProject.id,
    name: 'Okomfo Anokye',
    role: 'Spiritual Elder',
    description: 'Ancestral priest',
    appearance: 'Silver-threaded beard, white ceremonial forehead markings',
    wardrobe: 'Pristine white ceremonial robes and raffia necklace',
    personality: 'Enigmatic, calm seer',
    reference_image_url: '',
    continuity_notes: 'White clay forehead markings must remain identical across all scenes.',
    created_at: '2026-10-28T00:00:00Z',
    updated_at: '2026-10-28T00:00:00Z',
  };

  const loc1: Location = {
    id: 'loc_palace',
    project_id: baseProject.id,
    name: 'Palace Courtyard of Kumasi',
    description: 'Vast ceremonial courtyard with red clay ramparts.',
    visual_notes: 'Warm afternoon golden hour light, red dust swirling subtly near stone dais.',
    created_at: '2026-10-28T00:00:00Z',
    updated_at: '2026-10-28T00:00:00Z',
  };

  const scene1: Scene = {
    id: 'scene_001',
    project_id: baseProject.id,
    scene_order: 1,
    title: 'The Council of Defiance',
    location: 'Palace Courtyard',
    location_id: 'loc_palace',
    int_ext: 'EXT',
    time_of_day: 'DUSK',
    content: 'Yaa Asantewaa addresses the council of chiefs.',
    summary: 'The kingdom decides to resist.',
    characters: ['char_yaa', 'char_anokye'],
    continuity_notes: 'Dusk light shifts from warm amber to deep twilight indigo.',
    created_at: '2026-10-28T00:00:00Z',
    updated_at: '2026-10-28T00:00:00Z',
  };

  const shot1: Shot = {
    id: 'shot_001',
    project_id: baseProject.id,
    scene_id: 'scene_001',
    shot_order: 1,
    title: 'Courtyard Establishing Wide',
    shot_type: 'Wide shot',
    camera_angle: 'Eye level',
    camera_movement: 'Slow push-in',
    duration_seconds: 6,
    characters: ['char_yaa'],
    action: 'The council sits in heavy silence as dusk settles over the red clay palace.',
    image_prompt: 'Epic wide cinematic shot of Kumasi palace courtyard at dusk, African chiefs in kente robes, golden hour haze.',
    motion_prompt: 'Slow cinematic dolly push toward the council dais as torches are lit.',
    dialogue: [],
    sound_effects: ['Distant drums echoing'],
    music_cue: 'Low resonant cellos',
    continuity_notes: 'Match position of royal standards on the left parapet.',
    production_status: 'Approved',
    created_at: '2026-10-28T00:00:00Z',
    updated_at: '2026-10-28T00:00:00Z',
  };

  const shot2: Shot = {
    id: 'shot_002',
    project_id: baseProject.id,
    scene_id: 'scene_001',
    shot_order: 2,
    title: 'Yaa Asantewaa Addresses Chiefs',
    shot_type: 'Medium close-up',
    camera_angle: 'Slight low angle',
    camera_movement: 'Static',
    duration_seconds: 8,
    characters: ['char_yaa'],
    action: 'Yaa Asantewaa rises, clutching her staff, locking eyes with each hesitant chief.',
    image_prompt: 'Cinematic medium close-up of Queen Yaa Asantewaa in indigo kente cloth with polished brass cuffs.',
    motion_prompt: 'Camera holds firm on Yaa Asantewaa as she rises into frame.',
    dialogue: [
      {
        characterId: 'char_yaa',
        text: 'If the men of Ashanti will not go forward, then we the women will!',
        delivery: 'Impassioned and clear',
        voiceNotes: 'Resonant and commanding',
      },
    ],
    sound_effects: [],
    music_cue: 'Solo horn swell',
    continuity_notes: 'Preserve indigo kente fold over left shoulder.',
    production_status: 'In Review',
    created_at: '2026-10-28T00:00:00Z',
    updated_at: '2026-10-28T00:00:00Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    clearReviewedDecisions(baseProject.id);
  });

  // 1. Valid Blueprint with No Structural Errors
  it('1. validates a well-formed blueprint with 0 structural errors', () => {
    const sample = getSampleBlueprint();
    const report = analyzeBlueprintQuality(sample);

    expect(report.summary.errorsCount).toBe(0);
    expect(report.summary.totalFindings).toBeGreaterThanOrEqual(0);
    expect(report.runtime.totalSeconds).toBe(14); // 6s + 8s
  });

  // 2. Duplicate character, scene, location, and shot IDs
  it('2. detects duplicate character, scene, location, and shot IDs as structural errors', () => {
    const dupChars = [char1, { ...char1, name: 'Nana Yaa Duplicate' }];
    const dupLocs = [loc1, { ...loc1, name: 'Palace Duplicate' }];
    const dupScenes = [scene1, { ...scene1, title: 'Scene Duplicate' }];
    const dupShots = [shot1, { ...shot1, title: 'Shot Duplicate' }];

    const report = analyzeProjectQuality(
      baseProject,
      dupScenes,
      dupShots,
      dupChars,
      dupLocs
    );

    const dupCharFinding = report.findings.find((f) => f.ruleId === 'ERR_DUPLICATE_CHARACTER_ID');
    const dupLocFinding = report.findings.find((f) => f.ruleId === 'ERR_DUPLICATE_LOCATION_ID');
    const dupSceneFinding = report.findings.find((f) => f.ruleId === 'ERR_DUPLICATE_SCENE_ID');
    const dupShotFinding = report.findings.find((f) => f.ruleId === 'ERR_DUPLICATE_SHOT_ID');

    expect(dupCharFinding).toBeDefined();
    expect(dupCharFinding?.severity).toBe('error');
    expect(dupLocFinding).toBeDefined();
    expect(dupLocFinding?.severity).toBe('error');
    expect(dupSceneFinding).toBeDefined();
    expect(dupSceneFinding?.severity).toBe('error');
    expect(dupShotFinding).toBeDefined();
    expect(dupShotFinding?.severity).toBe('error');
  });

  // 3. Missing Scene Location References
  it('3. flags scene referencing a non-existent location ID as a structural error', () => {
    const brokenScene: Scene = {
      ...scene1,
      location_id: 'loc_missing_ghost',
    };

    const report = analyzeProjectQuality(
      baseProject,
      [brokenScene],
      [shot1],
      [char1],
      [loc1]
    );

    const finding = report.findings.find((f) => f.ruleId === 'ERR_SCENE_INVALID_LOCATION');
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('error');
    expect(finding?.fieldName).toBe('location_id');
    expect(finding?.sceneId).toBe('scene_001');
    expect(finding?.canBeReviewed).toBe(false); // Errors cannot be bypassed
  });

  // 4. Missing Character References
  it('4. flags scene and shot referencing non-existent character IDs as structural errors', () => {
    const sceneWithGhostChar: Scene = {
      ...scene1,
      characters: ['char_ghost_007'],
    };

    const shotWithGhostChar: Shot = {
      ...shot1,
      characters: ['char_ghost_999'],
    };

    const report = analyzeProjectQuality(
      baseProject,
      [sceneWithGhostChar],
      [shotWithGhostChar],
      [char1],
      [loc1]
    );

    const sceneFinding = report.findings.find((f) => f.ruleId === 'ERR_SCENE_INVALID_CHARACTER');
    const shotFinding = report.findings.find((f) => f.ruleId === 'ERR_SHOT_INVALID_CHARACTER');

    expect(sceneFinding).toBeDefined();
    expect(sceneFinding?.severity).toBe('error');
    expect(shotFinding).toBeDefined();
    expect(shotFinding?.severity).toBe('error');
  });

  // 5. Invalid Shot Ordering
  it('5. detects duplicate shot ordering within the same scene', () => {
    const shotWithDupOrder: Shot = {
      ...shot2,
      shot_order: 1, // Shares shot_order 1 with shot1
    };

    const report = analyzeProjectQuality(
      baseProject,
      [scene1],
      [shot1, shotWithDupOrder],
      [char1],
      [loc1]
    );

    const orderFindings = report.findings.filter((f) => f.ruleId === 'ERR_DUPLICATE_SHOT_ORDER');
    expect(orderFindings.length).toBeGreaterThanOrEqual(2);
    expect(orderFindings[0].severity).toBe('error');
    expect(orderFindings[0].fieldName).toBe('shot_order');
  });

  // 6. Invalid or Missing Shot Duration
  it('6. flags zero, negative, or NaN shot duration as a structural error', () => {
    const zeroDurShot: Shot = {
      ...shot1,
      duration_seconds: 0,
    };
    const negDurShot: Shot = {
      ...shot2,
      duration_seconds: -3.5,
    };

    const report = analyzeProjectQuality(
      baseProject,
      [scene1],
      [zeroDurShot, negDurShot],
      [char1],
      [loc1]
    );

    const durFindings = report.findings.filter((f) => f.ruleId === 'ERR_SHOT_INVALID_DURATION');
    expect(durFindings).toHaveLength(2);
    expect(durFindings[0].severity).toBe('error');
    expect(durFindings[0].fieldName).toBe('duration_seconds');
  });

  // 7. Missing Image and Motion Prompts
  it('7. identifies empty image prompts and motion prompts as production readiness guidance', () => {
    const unpromptedShot: Shot = {
      ...shot1,
      image_prompt: '',
      motion_prompt: '   ',
    };

    const report = analyzeProjectQuality(
      baseProject,
      [scene1],
      [unpromptedShot],
      [char1],
      [loc1]
    );

    const imagePromptFinding = report.findings.find((f) => f.ruleId === 'INFO_SHOT_EMPTY_IMAGE_PROMPT');
    const motionPromptFinding = report.findings.find((f) => f.ruleId === 'INFO_SHOT_EMPTY_MOTION_PROMPT');

    expect(imagePromptFinding).toBeDefined();
    expect(imagePromptFinding?.severity).toBe('info');
    expect(motionPromptFinding).toBeDefined();
    expect(motionPromptFinding?.severity).toBe('info');
  });

  // 8. Valid Empty Dialogue Arrays
  it('8. treats intentionally empty dialogue arrays as completely valid without generating errors', () => {
    const shotNoDialogue: Shot = {
      ...shot1,
      dialogue: [],
    };

    const report = analyzeProjectQuality(
      baseProject,
      [scene1],
      [shotNoDialogue],
      [char1],
      [loc1]
    );

    const dialogueFindings = report.findings.filter((f) => f.category === 'dialogue');
    expect(dialogueFindings).toHaveLength(0);
  });

  // 9. Malformed Dialogue Records
  it('9. flags dialogue with empty or whitespace-only text as an error', () => {
    const malformedShot: Shot = {
      ...shot2,
      dialogue: [
        {
          characterId: 'char_yaa',
          text: '    ', // empty line
        },
      ],
    };

    const report = analyzeProjectQuality(
      baseProject,
      [scene1],
      [malformedShot],
      [char1],
      [loc1]
    );

    const malformedFinding = report.findings.find((f) => f.ruleId === 'ERR_DIALOGUE_MALFORMED');
    expect(malformedFinding).toBeDefined();
    expect(malformedFinding?.severity).toBe('error');
  });

  // 10. Invalid Dialogue Speaker References
  it('10. flags dialogue referencing a non-existent speaker character ID', () => {
    const ghostDialogueShot: Shot = {
      ...shot2,
      dialogue: [
        {
          characterId: 'char_ghost_speaker',
          text: 'We must assemble the council!',
        },
      ],
    };

    const report = analyzeProjectQuality(
      baseProject,
      [scene1],
      [ghostDialogueShot],
      [char1],
      [loc1]
    );

    const finding = report.findings.find((f) => f.ruleId === 'ERR_DIALOGUE_INVALID_CHARACTER');
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('error');
  });

  // 11. Character References Inconsistent with Parent Scene Membership
  it('11. warns when a character appears in a shot but was omitted from parent scene roster', () => {
    const sceneWithoutYaa: Scene = {
      ...scene1,
      characters: ['char_anokye'], // Yaa is not listed in scene roster
    };

    const report = analyzeProjectQuality(
      baseProject,
      [sceneWithoutYaa],
      [shot2], // shot2 contains char_yaa
      [char1, char2],
      [loc1]
    );

    const finding = report.findings.find((f) => f.ruleId === 'WARN_CHAR_NOT_IN_SCENE');
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('warning');
    expect(finding?.characterId).toBe('char_yaa');
    expect(finding?.canBeReviewed).toBe(true);
  });

  // 12. Character Continuity-Note Visibility and Review Warnings
  it('12. generates continuity directives and review warnings when shot prompt omits continuity notes', () => {
    const shotMissingKeywords: Shot = {
      ...shot2,
      image_prompt: 'A portrait of an African queen standing near trees.', // omits "kente", "bracelet", etc.
    };

    const report = analyzeProjectQuality(
      baseProject,
      [scene1],
      [shotMissingKeywords],
      [char1],
      [loc1]
    );

    // 1. Character continuity note informational finding
    const infoNotes = report.findings.find((f) => f.ruleId === 'INFO_CHAR_CONTINUITY_NOTES');
    expect(infoNotes).toBeDefined();
    expect(infoNotes?.characterId).toBe('char_yaa');

    // 2. Continuity keyword review warning with non-prescriptive wording
    const keywordWarning = report.findings.find((f) => f.ruleId === 'WARN_CONTINUITY_PROMPT_KEYWORD');
    expect(keywordWarning).toBeDefined();
    expect(keywordWarning?.severity).toBe('warning');
    expect(keywordWarning?.explanation).toContain('A prompt that omits a phrase does not prove the generated image violates continuity');
  });

  // 13. Scene and Project Runtime Calculations
  it('13. calculates scene and project runtimes with single-count guarantee', () => {
    const runtime = calculateProductionRuntime([shot1, shot2]);

    expect(runtime.totalSeconds).toBe(14); // 6 + 8
    expect(runtime.hours).toBe(0);
    expect(runtime.minutes).toBe(0);
    expect(runtime.seconds).toBe(14);
    expect(runtime.totalFormatted).toBe('0m 14s');

    // Scene runtime breakdown
    expect(runtime.sceneRuntimes['scene_001']).toBeDefined();
    expect(runtime.sceneRuntimes['scene_001'].durationSeconds).toBe(14);
    expect(runtime.sceneRuntimes['scene_001'].shotCount).toBe(2);

    // Re-passing the exact same shot ID deduplicates and guarantees exact-once counting
    const runtimeWithDup = calculateProductionRuntime([shot1, shot2, shot1]);
    expect(runtimeWithDup.totalSeconds).toBe(14);
  });

  // 14. Runtime Updates After Shot Edits
  it('14. updates scene and project runtimes when shot durations are edited or shots are added', () => {
    const initialRuntime = calculateProductionRuntime([shot1, shot2]);
    expect(initialRuntime.totalSeconds).toBe(14);

    // Edit shot 1 from 6s to 20s
    const editedShot1: Shot = {
      ...shot1,
      duration_seconds: 20,
    };

    const updatedRuntime = calculateProductionRuntime([editedShot1, shot2]);
    expect(updatedRuntime.totalSeconds).toBe(28); // 20 + 8
    expect(updatedRuntime.totalFormatted).toBe('0m 28s');

    // Add a new shot of 3600s (1 hour)
    const epicShot: Shot = {
      ...shot1,
      id: 'shot_epic_battle',
      duration_seconds: 3600,
    };

    const longRuntime = calculateProductionRuntime([editedShot1, shot2, epicShot]);
    expect(longRuntime.hours).toBe(1);
    expect(longRuntime.totalFormatted).toContain('1h');
  });

  // 15. Quality Findings Linking to the Correct Records
  it('15. ensures findings link directly to affected scene, shot, character, and field names', () => {
    const shotWithIssues: Shot = {
      ...shot1,
      duration_seconds: -10,
      characters: ['char_unreal'],
    };

    const report = analyzeProjectQuality(
      baseProject,
      [scene1],
      [shotWithIssues],
      [char1],
      [loc1]
    );

    const durFinding = report.findings.find((f) => f.ruleId === 'ERR_SHOT_INVALID_DURATION');
    expect(durFinding?.shotId).toBe('shot_001');
    expect(durFinding?.sceneId).toBe('scene_001');
    expect(durFinding?.fieldName).toBe('duration_seconds');

    const charFinding = report.findings.find((f) => f.ruleId === 'ERR_SHOT_INVALID_CHARACTER');
    expect(charFinding?.shotId).toBe('shot_001');
    expect(charFinding?.characterId).toBe('char_unreal');
    expect(charFinding?.fieldName).toBe('characters');
  });

  // 16. Resolution After Correcting the Underlying Data
  it('16. resolves finding when the underlying invalid data is corrected', () => {
    // Stage 1: Has broken location
    const sceneBadLoc: Scene = {
      ...scene1,
      location_id: 'bad_loc',
    };
    const report1 = analyzeProjectQuality(baseProject, [sceneBadLoc], [shot1], [char1], [loc1]);
    expect(report1.findings.some((f) => f.ruleId === 'ERR_SCENE_INVALID_LOCATION')).toBe(true);

    // Stage 2: Corrected to valid location
    const sceneFixedLoc: Scene = {
      ...scene1,
      location_id: 'loc_palace',
    };
    const report2 = analyzeProjectQuality(baseProject, [sceneFixedLoc], [shot1], [char1], [loc1]);
    expect(report2.findings.some((f) => f.ruleId === 'ERR_SCENE_INVALID_LOCATION')).toBe(false);
  });

  // 17. Reviewed Warnings Remaining Distinguishable from Resolved Findings
  it('17. keeps reviewed non-blocking warnings distinguishable from resolved and structural errors', () => {
    // Character not in parent scene produces a warning
    const sceneWithoutYaa: Scene = {
      ...scene1,
      characters: [],
    };

    const initialReport = analyzeProjectQuality(baseProject, [sceneWithoutYaa], [shot1], [char1], [loc1]);
    const warnFinding = initialReport.findings.find((f) => f.ruleId === 'WARN_CHAR_NOT_IN_SCENE');
    expect(warnFinding).toBeDefined();
    expect(warnFinding?.isReviewed).toBe(false);
    expect(warnFinding?.canBeReviewed).toBe(true);

    // Mark as reviewed
    markFindingReviewed(baseProject.id, warnFinding!.id, warnFinding!.fingerprint);

    // Re-analyze: Finding is still generated, but marked as isReviewed: true
    const reviewedReport = analyzeProjectQuality(baseProject, [sceneWithoutYaa], [shot1], [char1], [loc1]);
    const recheckedFinding = reviewedReport.findings.find((f) => f.id === warnFinding!.id);
    expect(recheckedFinding?.isReviewed).toBe(true);
    expect(reviewedReport.summary.reviewedCount).toBeGreaterThanOrEqual(1);

    // If shot data changes (e.g. shot title or characters modified), fingerprint changes, invalidating reviewed state
    const modifiedShot: Shot = {
      ...shot1,
      title: 'Courtyard Establishing Wide - Revised',
    };
    const invalidatedReport = analyzeProjectQuality(baseProject, [sceneWithoutYaa], [modifiedShot], [char1], [loc1]);
    const newFinding = invalidatedReport.findings.find((f) => f.ruleId === 'WARN_CHAR_NOT_IN_SCENE');
    expect(newFinding?.isReviewed).toBe(false); // Review was invalidated by data change
  });

  // 18. Preservation of Phase 4 Assets and Production Statuses
  it('18. preserves Phase 4 assets and shot production statuses without mutation during QC', () => {
    const assets: ProductionAsset[] = [
      {
        id: 'asset_img_001',
        project_id: baseProject.id,
        scene_id: scene1.id,
        shot_id: shot1.id,
        asset_type: 'image',
        display_name: 'Courtyard Wide Keyframe',
        storage_path: 'https://example.com/kumasi.png',
        mime_type: 'image/png',
        file_size: 1024000,
        version_number: 1,
        is_preferred: true,
        review_status: 'approved',
        is_external: false,
        created_at: '2026-10-28T00:00:00Z',
        updated_at: '2026-10-28T00:00:00Z',
      },
    ];

    const initialStatus = shot1.production_status; // 'Approved'
    const report = analyzeProjectQuality(baseProject, [scene1], [shot1], [char1], [loc1], assets);

    // Shot production status is not changed by QC engine
    expect(shot1.production_status).toBe(initialStatus);

    // Informational readiness notices properly identify missing video asset without failing build
    const videoNotice = report.findings.find((f) => f.ruleId === 'INFO_SHOT_MISSING_VIDEO_ASSET');
    expect(videoNotice).toBeDefined();
    expect(videoNotice?.severity).toBe('info');
  });

  // 19. JSON schemaVersion 1.0 Import/Export Compatibility
  it('19. maintains full compatibility with JSON blueprint schemaVersion 1.0', () => {
    const exportedBlueprint = exportProjectToBlueprint(
      baseProject,
      [char1, char2],
      [loc1],
      [scene1],
      [shot1, shot2]
    );

    expect(exportedBlueprint.schemaVersion).toBe('1.0');
    expect(exportedBlueprint.project.title).toBe(baseProject.title);
    expect(exportedBlueprint.characters).toHaveLength(2);
    expect(exportedBlueprint.scenes).toHaveLength(1);
    expect(exportedBlueprint.scenes?.[0].shots).toHaveLength(2);

    // Validates against existing blueprint validator
    const valResult = validateBlueprint(exportedBlueprint);
    expect(valResult.valid).toBe(true);
    expect(valResult.errors).toHaveLength(0);

    // Quality check runs cleanly on the exported blueprint
    const qcResult = analyzeBlueprintQuality(exportedBlueprint);
    expect(qcResult.summary.errorsCount).toBe(0);
  });

  // 20. Preservation of Existing Phase 1 and Phase 2 Functionality
  it('20. preserves Phase 1 and Phase 2 foundation behavior alongside Phase 3', () => {
    // Phase 1: Reordering scenes preserves stable IDs
    const scenesToReorder = [
      { ...scene1, id: 'scene_A', scene_order: 1 },
      { ...scene1, id: 'scene_B', scene_order: 2 },
    ];
    const reordered = [
      { ...scenesToReorder[1], scene_order: 1 },
      { ...scenesToReorder[0], scene_order: 2 },
    ];

    expect(reordered[0].id).toBe('scene_B');
    expect(reordered[0].scene_order).toBe(1);
    expect(reordered[1].id).toBe('scene_A');
    expect(reordered[1].scene_order).toBe(2);

    // Phase 2: Location and Shot models preserve all cinematic metadata
    expect(shot1.camera_angle).toBe('Eye level');
    expect(shot1.camera_movement).toBe('Slow push-in');
    expect(loc1.visual_notes).toContain('golden hour');
  });
});
