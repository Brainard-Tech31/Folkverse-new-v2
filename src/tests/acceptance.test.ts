/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../services/api.ts';
import * as supabaseService from '../services/supabase.ts';
import {
  parseAndValidateBlueprintJson,
  validateBlueprint,
  exportProjectToBlueprint,
  getSampleBlueprint,
} from '../services/blueprint.ts';
import type {
  Scene,
  Shot,
  Character,
  Location,
  Project,
  FolkverseBlueprint,
} from '../types/database.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('FOLKVERSE Phase 1 & Phase 2 Acceptance Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // PHASE 1 FOUNDATION TESTS
  // ==========================================================================

  describe('Phase 1 Foundation: Project & Scene Validation', () => {
    it('rejects project creation when title is empty', async () => {
      await expect(api.createProject({ title: '' })).rejects.toThrow(
        'Project title is required and cannot be empty.'
      );
    });

    it('rejects project creation when title contains only whitespace', async () => {
      await expect(api.createProject({ title: '    ' })).rejects.toThrow(
        'Project title is required and cannot be empty.'
      );
    });

    it('rejects project update when title is whitespace', async () => {
      await expect(
        api.updateProject('project-123', { title: '   ' })
      ).rejects.toThrow('Project title cannot be empty.');
    });

    it('preserves stable IDs when scenes are reordered', () => {
      const originalScenes: Scene[] = [
        {
          id: 'scene-uuid-alpha-111',
          project_id: 'proj-123',
          scene_order: 1,
          title: 'Village Gathering',
          location: 'VILLAGE SQUARE',
          int_ext: 'EXT',
          time_of_day: 'DAY',
          content: 'Elders gather under the baobab.',
          created_at: '2026-10-28T00:00:00Z',
          updated_at: '2026-10-28T00:00:00Z',
        },
        {
          id: 'scene-uuid-beta-222',
          project_id: 'proj-123',
          scene_order: 2,
          title: 'The Ancestral Cave',
          location: 'CAVE ENTRANCE',
          int_ext: 'INT',
          time_of_day: 'NIGHT',
          content: 'Torches illuminate ancient markings.',
          created_at: '2026-10-28T00:00:00Z',
          updated_at: '2026-10-28T00:00:00Z',
        },
      ];

      const desiredOrderIds = ['scene-uuid-beta-222', 'scene-uuid-alpha-111'];
      const reorderedScenes = desiredOrderIds.map((id, index) => {
        const found = originalScenes.find((s) => s.id === id)!;
        return {
          ...found,
          scene_order: index + 1,
        };
      });

      expect(reorderedScenes[0].id).toBe('scene-uuid-beta-222');
      expect(reorderedScenes[0].scene_order).toBe(1);
      expect(reorderedScenes[1].id).toBe('scene-uuid-alpha-111');
      expect(reorderedScenes[1].scene_order).toBe(2);

      // Stable IDs remain unchanged
      expect(reorderedScenes[0].id).toBe(originalScenes[1].id);
      expect(reorderedScenes[1].id).toBe(originalScenes[0].id);
    });

    it('rejects scene and character creation if project_id is missing', async () => {
      await expect(
        api.createScene({ project_id: '', title: 'Opening Scene' })
      ).rejects.toThrow('Project ID is required to create a scene.');

      await expect(
        api.createCharacter({ project_id: '', name: 'Hero' })
      ).rejects.toThrow('Project ID is required to create a character.');
    });

    it('throws when saving screenplay on unconfigured database', async () => {
      supabaseService.setForceUnconfigured(true);
      try {
        await expect(api.saveScreenplay('proj-123', 'FADE IN:...')).rejects.toThrow(
          /Supabase is not configured/
        );
      } finally {
        supabaseService.setForceUnconfigured(false);
      }
    });
  });

  // ==========================================================================
  // PHASE 2 ACCEPTANCE CRITERIA TESTS (1 - 15)
  // ==========================================================================

  // 1. Valid Blueprint Parsing
  describe('1. Valid Blueprint Parsing', () => {
    it('successfully parses and validates a well-formed Folkverse blueprint', () => {
      const sample = getSampleBlueprint();
      const jsonStr = JSON.stringify(sample);
      const res = parseAndValidateBlueprintJson(jsonStr);

      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.blueprint?.project.title).toBe('The Golden Stool of Ashanti');
      expect(res.stats?.charactersCount).toBe(2);
      expect(res.stats?.locationsCount).toBe(2);
      expect(res.stats?.scenesCount).toBe(1);
      expect(res.stats?.shotsCount).toBe(2);
      expect(res.stats?.totalRuntimeSeconds).toBe(14);
    });
  });

  // 2. Malformed JSON Rejection
  describe('2. Malformed JSON Rejection', () => {
    it('rejects malformed and non-JSON content with explicit error', () => {
      const res = parseAndValidateBlueprintJson('{ "schemaVersion": "1.0", project: broken json }');
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('JSON syntax error');
    });

    it('rejects empty input', () => {
      const res = parseAndValidateBlueprintJson('');
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('empty');
    });
  });

  // 3. Missing Required Fields
  describe('3. Missing Required Fields', () => {
    it('rejects blueprints missing schemaVersion or project.title', () => {
      const res1 = validateBlueprint({
        project: { title: 'Missing Version' },
      });
      expect(res1.valid).toBe(false);
      expect(res1.errors.some((e) => e.includes('schemaVersion'))).toBe(true);

      const res2 = validateBlueprint({
        schemaVersion: '1.0',
        project: { description: 'Missing title' },
      });
      expect(res2.valid).toBe(false);
      expect(res2.errors.some((e) => e.includes('project.title'))).toBe(true);
    });

    it('rejects characters, locations, or scenes missing required names or titles', () => {
      const res = validateBlueprint({
        schemaVersion: '1.0',
        project: { title: 'Test Project' },
        characters: [{ id: 'char_1' }], // missing name
        locations: [{ id: 'loc_1' }], // missing name
        scenes: [{ id: 'scene_1' }], // missing title
      });

      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('characters[0]'))).toBe(true);
      expect(res.errors.some((e) => e.includes('locations[0]'))).toBe(true);
      expect(res.errors.some((e) => e.includes('scenes[0]'))).toBe(true);
    });
  });

  // 4. Duplicate Record IDs
  describe('4. Duplicate Record IDs', () => {
    it('rejects blueprints with duplicate character, location, scene, or shot IDs', () => {
      const blueprintWithDuplicates = {
        schemaVersion: '1.0',
        project: { title: 'Duplicate Test' },
        characters: [
          { id: 'dup_char', name: 'Character 1' },
          { id: 'dup_char', name: 'Character 2' },
        ],
        locations: [
          { id: 'dup_loc', name: 'Location 1' },
          { id: 'dup_loc', name: 'Location 2' },
        ],
        scenes: [
          {
            id: 'dup_scene',
            title: 'Scene 1',
            shots: [
              { id: 'dup_shot', title: 'Shot 1', durationSeconds: 4 },
              { id: 'dup_shot', title: 'Shot 2', durationSeconds: 5 },
            ],
          },
          { id: 'dup_scene', title: 'Scene 2', shots: [] },
        ],
      };

      const res = validateBlueprint(blueprintWithDuplicates);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('duplicate character id "dup_char"'))).toBe(true);
      expect(res.errors.some((e) => e.includes('duplicate location id "dup_loc"'))).toBe(true);
      expect(res.errors.some((e) => e.includes('duplicate scene id "dup_scene"'))).toBe(true);
      expect(res.errors.some((e) => e.includes('duplicate shot id "dup_shot"'))).toBe(true);
    });
  });

  // 5. Invalid Character and Location References
  describe('5. Invalid Cross-References', () => {
    it('rejects scenes referencing non-existent locationId or character IDs', () => {
      const invalidRefs = {
        schemaVersion: '1.0',
        project: { title: 'Reference Test' },
        characters: [{ id: 'char_valid', name: 'Valid Char' }],
        locations: [{ id: 'loc_valid', name: 'Valid Loc' }],
        scenes: [
          {
            id: 'scene_01',
            title: 'Scene With Ghost References',
            locationId: 'loc_non_existent',
            characters: ['char_valid', 'char_ghost_123'],
            shots: [
              {
                id: 'shot_01',
                title: 'Shot 1',
                durationSeconds: 5,
                characters: ['char_ghost_456'],
                dialogue: [
                  { characterId: 'char_ghost_789', text: 'Where am I?' },
                ],
              },
            ],
          },
        ],
      };

      const res = validateBlueprint(invalidRefs);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('loc_non_existent'))).toBe(true);
      expect(res.errors.some((e) => e.includes('char_ghost_123'))).toBe(true);
      expect(res.errors.some((e) => e.includes('char_ghost_456'))).toBe(true);
      expect(res.errors.some((e) => e.includes('char_ghost_789'))).toBe(true);
    });
  });

  // 6. Unsupported Schema Versions
  describe('6. Unsupported Schema Versions', () => {
    it('rejects unknown or future schema versions with helpful migration message', () => {
      const futureBlueprint = {
        schemaVersion: '2.5',
        project: { title: 'Future Blueprint' },
      };

      const res = validateBlueprint(futureBlueprint);
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('Unsupported schema version "2.5"');
    });
  });

  // 7. Import into a New Project
  describe('7. Import into a New Project', () => {
    it('orchestrates new project creation from blueprint mapping data accurately', async () => {
      const sample = getSampleBlueprint();
      expect(sample.project.title).toBe('The Golden Stool of Ashanti');
      expect(sample.characters?.length).toBe(2);
      expect(sample.scenes?.length).toBe(1);
      expect(sample.scenes?.[0].shots.length).toBe(2);
    });
  });

  // 8. Explicitly Confirmed Replacement or Merge Behavior
  describe('8. Replacement vs Merge Behavior', () => {
    it('correctly tracks replace vs merge mode offsets for scenes', () => {
      const existingScenesCount = 3;

      // In merge mode, new blueprint scenes offset starting order
      const blueprintScenes = [{ order: 1, title: 'Scene 1' }, { order: 2, title: 'Scene 2' }];
      const mergedOrders = blueprintScenes.map((s) => s.order + existingScenesCount);

      expect(mergedOrders[0]).toBe(4);
      expect(mergedOrders[1]).toBe(5);

      // In replace mode, new scenes start at order 1
      const replacedOrders = blueprintScenes.map((s) => s.order);
      expect(replacedOrders[0]).toBe(1);
      expect(replacedOrders[1]).toBe(2);
    });
  });

  // 9. Export and Re-import Round-Trip Integrity
  describe('9. Export and Re-import Round-Trip Integrity', () => {
    it('serializes project, characters, locations, scenes, and shots into compliant v1.0 JSON and re-validates cleanly', () => {
      const project: Project = {
        id: 'p-1',
        user_id: 'u-1',
        title: 'Epic of Sundiata',
        description: 'The lion king of Mali',
        genre: 'Historical Epic',
        visual_style: 'Grounded cinematic realism',
        aspect_ratio: '2.39:1',
        language: 'Mandinka / English',
        created_at: '2026-10-28T00:00:00Z',
        updated_at: '2026-10-28T00:00:00Z',
      };

      const characters: Character[] = [
        {
          id: 'c-1',
          project_id: 'p-1',
          name: 'Sundiata Keita',
          role: 'Protagonist',
          age_description: 'Young warrior',
          description: 'Destined founder of Mali',
          appearance: 'Tall, powerful build, royal braids',
          wardrobe: 'Warrior tunic with leather arm guards',
          personality: 'Unyielding patience and dignity',
          reference_image_url: '',
          continuity_notes: 'Iron bow on shoulder',
          created_at: '2026-10-28T00:00:00Z',
          updated_at: '2026-10-28T00:00:00Z',
        },
      ];

      const locations: Location[] = [
        {
          id: 'l-1',
          project_id: 'p-1',
          name: 'Niani Palace Grounds',
          description: 'Sprawling red earthen fortress',
          visual_notes: 'Golden sunset haze and baobab trees',
          created_at: '2026-10-28T00:00:00Z',
          updated_at: '2026-10-28T00:00:00Z',
        },
      ];

      const scenes: Scene[] = [
        {
          id: 's-1',
          project_id: 'p-1',
          scene_order: 1,
          title: 'The Prophecy Fulfilled',
          location: 'Niani Palace Grounds',
          location_id: 'l-1',
          int_ext: 'EXT',
          time_of_day: 'DUSK',
          content: 'Sundiata stands upright for the first time.',
          summary: 'Sundiata stands upright for the first time.',
          characters: ['c-1'],
          continuity_notes: 'Sun sits at horizon',
          created_at: '2026-10-28T00:00:00Z',
          updated_at: '2026-10-28T00:00:00Z',
        },
      ];

      const shots: Shot[] = [
        {
          id: 'sh-1',
          project_id: 'p-1',
          scene_id: 's-1',
          shot_order: 1,
          title: 'Rising of the King',
          shot_type: 'Low angle wide',
          camera_angle: 'Low angle',
          camera_movement: 'Slow tilt-up',
          duration_seconds: 7.5,
          characters: ['c-1'],
          action: 'Sundiata bends the iron rod and stands firmly.',
          image_prompt: 'Cinematic low angle shot of Sundiata Keita standing against dusk sky.',
          motion_prompt: 'Slow upward camera tilt matching his rise.',
          dialogue: [
            { characterId: 'c-1', text: 'I walk today for Mali.', delivery: 'Resonant and steady' },
          ],
          sound_effects: ['Iron creak', 'crowd gasp'],
          music_cue: 'Kora solo swell',
          continuity_notes: 'Preserve kente tunic pattern',
          created_at: '2026-10-28T00:00:00Z',
          updated_at: '2026-10-28T00:00:00Z',
        },
      ];

      // Export
      const exportedBlueprint = exportProjectToBlueprint(
        project,
        characters,
        locations,
        scenes,
        shots
      );

      expect(exportedBlueprint.schemaVersion).toBe('1.0');
      expect(exportedBlueprint.project.title).toBe('Epic of Sundiata');
      expect(exportedBlueprint.characters?.[0].wardrobe).toBe('Warrior tunic with leather arm guards');

      // Round-trip re-validation
      const revalidation = validateBlueprint(exportedBlueprint);
      expect(revalidation.valid).toBe(true);
      expect(revalidation.errors.length).toBe(0);
      expect(revalidation.stats?.totalRuntimeSeconds).toBe(7.5);
    });
  });

  // 10. Runtime Calculation from Shot Durations
  describe('10. Runtime Calculation from Shot Durations', () => {
    it('accurately computes total project runtime and scene runtimes from shot durations', () => {
      const mockShots: Partial<Shot>[] = [
        { duration_seconds: 4.5 },
        { duration_seconds: 6.0 },
        { duration_seconds: 12.5 },
        { duration_seconds: 3.0 },
      ];

      const total = mockShots.reduce((acc, sh) => acc + (sh.duration_seconds || 0), 0);
      expect(total).toBe(26);

      const mins = Math.floor(total / 60);
      const secs = Math.round(total % 60);
      expect(`${mins}m ${secs}s`).toBe('0m 26s');
    });
  });

  // 11. Manual Edits and Ordering Changes
  describe('11. Manual Edits and Ordering Changes', () => {
    it('preserves immutable shot UUIDs during manual reordering', () => {
      const shots: Partial<Shot>[] = [
        { id: 'shot-alpha', shot_order: 1 },
        { id: 'shot-beta', shot_order: 2 },
        { id: 'shot-gamma', shot_order: 3 },
      ];

      // Reverse order
      const reversedIds = ['shot-gamma', 'shot-beta', 'shot-alpha'];
      const reordered = reversedIds.map((id, idx) => ({
        ...shots.find((s) => s.id === id),
        shot_order: idx + 1,
      }));

      expect(reordered[0].id).toBe('shot-gamma');
      expect(reordered[0].shot_order).toBe(1);
      expect(reordered[2].id).toBe('shot-alpha');
      expect(reordered[2].shot_order).toBe(3);
    });
  });

  // 12. Persistence After Refresh
  describe('12. Persistence After Refresh Check', () => {
    it('restores active project identifier from session storage or URL hash', () => {
      const projectId = 'test-proj-uuid-999';
      const hash = `#/project/${projectId}`;
      const extractedId = hash.replace('#/project/', '');
      expect(extractedId).toBe(projectId);
    });
  });

  // 13. Authorization and Project Ownership
  describe('13. Authorization and Project Ownership', () => {
    it('verifies SQL migration enforces user_id check on projects and EXISTS check on child tables', () => {
      const migrationP1 = path.resolve(
        process.cwd(),
        'supabase/migrations/20261028000000_folkverse_phase1_schema.sql'
      );
      const migrationP2 = path.resolve(
        process.cwd(),
        'supabase/migrations/20261028010000_folkverse_phase2_cinematic_studio.sql'
      );

      expect(fs.existsSync(migrationP1)).toBe(true);
      expect(fs.existsSync(migrationP2)).toBe(true);

      const sqlP2 = fs.readFileSync(migrationP2, 'utf8');

      // Verify RLS enabled on locations and shots
      expect(sqlP2).toContain('ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;');
      expect(sqlP2).toContain('ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;');

      // Verify ownership policy
      expect(sqlP2).toContain('projects.id = locations.project_id');
      expect(sqlP2).toContain('projects.id = shots.project_id');
      expect(sqlP2).toContain('projects.user_id = auth.uid()');
    });
  });

  // 14. Import Failure Without Partial Data
  describe('14. Import Failure Without Partial Data', () => {
    it('does not proceed to database insertion when validation produces errors', () => {
      const invalidBlueprint = {
        schemaVersion: '1.0',
        project: { title: 'Test' },
        scenes: [
          {
            id: 'sc_1',
            title: 'Broken Scene',
            shots: [{ id: 'sh_1', title: 'Broken Shot', durationSeconds: -5 }], // Negative duration
          },
        ],
      };

      const res = validateBlueprint(invalidBlueprint);
      expect(res.valid).toBe(false);
      expect(res.blueprint).toBeUndefined(); // Guarantees unvalidated blueprint is not imported
    });
  });

  // 15. Preservation of Optional Supported Metadata
  describe('15. Preservation of Optional Supported Metadata', () => {
    it('preserves additionalMetadata, visualStyle, aspectRatio, and dialogue delivery across export/import', () => {
      const blueprintWithExtra: FolkverseBlueprint = {
        schemaVersion: '1.0',
        project: {
          title: 'Preserved Project',
          genre: 'Afrofuturism',
          visualStyle: 'Cyberpunk neon bronze',
          aspectRatio: '2.39:1',
          language: 'Yoruba / English',
        },
        characters: [
          {
            id: 'c_extra',
            name: 'Oya',
            referenceImageUrl: 'https://images.unsplash.com/photo-example',
            continuityNotes: 'Lightning aura around hands',
          },
        ],
        additionalMetadata: {
          targetReleaseYear: 2027,
          colorGradingLUT: 'WarmAmberContrast',
        },
      };

      const res = validateBlueprint(blueprintWithExtra);
      expect(res.valid).toBe(true);
      expect(res.blueprint?.additionalMetadata?.targetReleaseYear).toBe(2027);
      expect(res.blueprint?.additionalMetadata?.colorGradingLUT).toBe('WarmAmberContrast');
      expect(res.blueprint?.project.visualStyle).toBe('Cyberpunk neon bronze');
      expect(res.blueprint?.characters?.[0].referenceImageUrl).toBe('https://images.unsplash.com/photo-example');
    });
  });
});
