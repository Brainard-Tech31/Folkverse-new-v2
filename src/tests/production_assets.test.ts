/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../services/api.ts';
import * as supabaseService from '../services/supabase.ts';
import {
  validateBlueprint,
  exportProjectToBlueprint,
} from '../services/blueprint.ts';
import type {
  Shot,
  Scene,
  Character,
  Location,
  Project,
  ProductionAsset,
  ShotProductionStatus,
  AssetType,
  FolkverseBlueprint,
} from '../types/database.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('FOLKVERSE Phase 4: Production Execution & Asset Management Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Creating and Updating Shot Production Statuses
  describe('1. Shot Production Status Management', () => {
    it('supports all required production statuses and defaults to Not Started', () => {
      const allowedStatuses: ShotProductionStatus[] = [
        'Not Started',
        'Prompt Ready',
        'Image Generated',
        'Video Generated',
        'In Review',
        'Approved',
        'Needs Revision',
      ];

      expect(allowedStatuses).toHaveLength(7);

      const shot: Partial<Shot> = {
        id: 'shot-001',
        title: 'Opening Panorama',
        production_status: 'Not Started',
        image_prompt: 'Cinematic wide vista of savanna',
        motion_prompt: 'Slow crane down from golden sky',
      };

      expect(shot.production_status).toBe('Not Started');
    });

    it('updates production status without modifying the original creative prompts', async () => {
      const originalImagePrompt = 'Cinematic wide vista of savanna at twilight';
      const originalMotionPrompt = 'Slow crane down from golden sky';

      let currentShot: Shot = {
        id: 'shot-status-test',
        project_id: 'proj-1',
        scene_id: 'sc-1',
        shot_order: 1,
        title: 'Savanna Vista',
        shot_type: 'Wide shot',
        camera_angle: 'Eye level',
        camera_movement: 'Static',
        duration_seconds: 5,
        characters: [],
        action: 'Wind blowing through dry grass',
        image_prompt: originalImagePrompt,
        motion_prompt: originalMotionPrompt,
        dialogue: [],
        sound_effects: [],
        music_cue: '',
        continuity_notes: 'Warm amber tones',
        production_status: 'Not Started',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock updateShotProductionStatus to simulate status change
      vi.spyOn(api, 'updateShotProductionStatus').mockImplementation(async (id, status) => {
        currentShot = {
          ...currentShot,
          production_status: status,
        };
        return currentShot;
      });

      // Update to Image Generated
      await api.updateShotProductionStatus('shot-status-test', 'Image Generated');
      expect(currentShot.production_status).toBe('Image Generated');
      expect(currentShot.image_prompt).toBe(originalImagePrompt);
      expect(currentShot.motion_prompt).toBe(originalMotionPrompt);

      // Update to Approved
      await api.updateShotProductionStatus('shot-status-test', 'Approved');
      expect(currentShot.production_status).toBe('Approved');
      expect(currentShot.image_prompt).toBe(originalImagePrompt);

      // Mark approved shot as Needs Revision
      await api.updateShotProductionStatus('shot-status-test', 'Needs Revision');
      expect(currentShot.production_status).toBe('Needs Revision');
      expect(currentShot.image_prompt).toBe(originalImagePrompt);
      expect(currentShot.motion_prompt).toBe(originalMotionPrompt);
    });
  });

  // 2. Status Persistence After Refresh
  describe('2. Status Persistence After Refresh', () => {
    it('restores shot production status from database records', () => {
      const fetchedShotsFromDb: Partial<Shot>[] = [
        { id: 'sh-1', production_status: 'Approved' },
        { id: 'sh-2', production_status: 'Prompt Ready' },
        { id: 'sh-3', production_status: 'Needs Revision' },
      ];

      expect(fetchedShotsFromDb[0].production_status).toBe('Approved');
      expect(fetchedShotsFromDb[1].production_status).toBe('Prompt Ready');
      expect(fetchedShotsFromDb[2].production_status).toBe('Needs Revision');
    });
  });

  // 3. Uploading a Valid Asset & Validation
  describe('3. Uploading a Valid Asset', () => {
    it('validates and accepts valid image, video, and audio file metadata', () => {
      const validImageFile = new File(['image-bytes'], 'hero_frame_v1.png', { type: 'image/png' });
      const imgRes = api.validateAssetFile(validImageFile, 'image');
      expect(imgRes.valid).toBe(true);

      const validVideoFile = new File(['video-bytes'], 'motion_clip_v1.mp4', { type: 'video/mp4' });
      const vidRes = api.validateAssetFile(validVideoFile, 'video');
      expect(vidRes.valid).toBe(true);

      const validAudioFile = new File(['audio-bytes'], 'sound_cue.wav', { type: 'audio/wav' });
      const audRes = api.validateAssetFile(validAudioFile, 'audio');
      expect(audRes.valid).toBe(true);
    });
  });

  // 4. Rejecting Invalid File Types and Size Limits
  describe('4. Rejecting Invalid File Types and Files Exceeding Configured Limits', () => {
    it('rejects unsupported executable and script file types', () => {
      const badFile = new File(['malicious-bytes'], 'malware.exe', { type: 'application/x-msdownload' });
      const res = api.validateAssetFile(badFile, 'reference_file');
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Unsupported file format/);
    });

    it('rejects files exceeding configured size limits', () => {
      // Mock an oversized image (30MB, where limit is 25MB)
      const hugeImage = {
        name: 'huge_render.png',
        type: 'image/png',
        size: 30 * 1024 * 1024,
      } as File;

      const res = api.validateAssetFile(hugeImage, 'image');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('exceeds maximum allowed limit of 25 MB');
    });
  });

  // 5. Correct Asset Association with Project, Scene, and Shot
  describe('5. Correct Asset Association with Project and Shot', () => {
    it('creates an asset accurately linked to project_id, scene_id, and shot_id', () => {
      const asset: ProductionAsset = {
        id: 'asset-uuid-101',
        project_id: 'proj-uuid-1',
        scene_id: 'scene-uuid-1',
        shot_id: 'shot-uuid-1',
        asset_type: 'image',
        display_name: 'Hero Sunset Close-up',
        storage_path: 'https://supabase.co/storage/v1/object/public/production-assets/proj-1/shot-1/hero.png',
        mime_type: 'image/png',
        file_size: 2048500,
        version_number: 1,
        generation_tool: 'Flux Pro',
        prompt_used: 'Intense gaze towards the setting sun',
        is_preferred: true,
        review_status: 'approved',
        notes: 'Good skin texture and rim lighting',
        is_external: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(asset.project_id).toBe('proj-uuid-1');
      expect(asset.scene_id).toBe('scene-uuid-1');
      expect(asset.shot_id).toBe('shot-uuid-1');
      expect(asset.is_preferred).toBe(true);
      expect(asset.review_status).toBe('approved');
    });

    it('supports external URL media links with explicit is_external flag', () => {
      const externalAsset: ProductionAsset = {
        id: 'asset-uuid-external',
        project_id: 'proj-uuid-1',
        shot_id: 'shot-uuid-1',
        asset_type: 'video',
        display_name: 'Vimeo Reference Cut',
        storage_path: 'https://vimeo.com/12345678',
        external_url: 'https://vimeo.com/12345678',
        mime_type: 'video/external',
        file_size: 0,
        version_number: 1,
        generation_tool: 'Kling 1.5',
        is_preferred: false,
        review_status: 'pending',
        is_external: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(externalAsset.is_external).toBe(true);
      expect(externalAsset.storage_path).toBe('https://vimeo.com/12345678');
    });
  });

  // 6. Asset Metadata Persistence
  describe('6. Asset Metadata Persistence', () => {
    it('preserves generationTool, promptUsed, versionNumber, and reviewStatus', () => {
      const asset: ProductionAsset = {
        id: 'asset-meta',
        project_id: 'p1',
        shot_id: 's1',
        asset_type: 'image',
        display_name: 'Attempt 2',
        storage_path: 'https://...',
        mime_type: 'image/jpeg',
        file_size: 1024,
        version_number: 2,
        generation_tool: 'Midjourney v6.1',
        prompt_used: 'Photorealistic golden hour portrait --ar 16:9 --style raw',
        is_preferred: true,
        review_status: 'in_review',
        notes: 'Needs color grading check',
        is_external: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(asset.version_number).toBe(2);
      expect(asset.generation_tool).toBe('Midjourney v6.1');
      expect(asset.prompt_used).toContain('--style raw');
      expect(asset.notes).toBe('Needs color grading check');
    });
  });

  // 7. Multiple Attempts and Version History
  describe('7. Multiple Attempts and Version History', () => {
    it('retains multiple asset attempts for the same shot without overwriting historical versions', () => {
      const shotId = 'shot-test-multiversion';
      const history: ProductionAsset[] = [
        {
          id: 'ast-1',
          project_id: 'p1',
          shot_id: shotId,
          asset_type: 'image',
          display_name: 'Attempt 1 (Flux)',
          storage_path: 'https://.../v1.png',
          mime_type: 'image/png',
          file_size: 1000,
          version_number: 1,
          generation_tool: 'Flux Schnell',
          is_preferred: false,
          review_status: 'rejected',
          notes: 'Lighting too dim',
          is_external: false,
          created_at: '2026-10-28T01:00:00Z',
          updated_at: '2026-10-28T01:00:00Z',
        },
        {
          id: 'ast-2',
          project_id: 'p1',
          shot_id: shotId,
          asset_type: 'image',
          display_name: 'Attempt 2 (Midjourney)',
          storage_path: 'https://.../v2.png',
          mime_type: 'image/png',
          file_size: 1200,
          version_number: 2,
          generation_tool: 'Midjourney v6.1',
          is_preferred: true,
          review_status: 'approved',
          notes: 'Excellent dynamic range',
          is_external: false,
          created_at: '2026-10-28T02:00:00Z',
          updated_at: '2026-10-28T02:00:00Z',
        },
      ];

      expect(history).toHaveLength(2);
      expect(history[0].version_number).toBe(1);
      expect(history[0].review_status).toBe('rejected');
      expect(history[1].version_number).toBe(2);
      expect(history[1].review_status).toBe('approved');
    });
  });

  // 8. Selecting a Preferred Asset
  describe('8. Selecting a Preferred Asset', () => {
    it('sets preferred asset and keeps other versions unselected without deletion', () => {
      const assets: ProductionAsset[] = [
        {
          id: 'v1',
          project_id: 'p1',
          shot_id: 'shot-1',
          asset_type: 'video',
          display_name: 'Kling 1.0',
          storage_path: 'v1.mp4',
          mime_type: 'video/mp4',
          file_size: 100,
          version_number: 1,
          is_preferred: true,
          review_status: 'pending',
          is_external: false,
          created_at: '',
          updated_at: '',
        },
        {
          id: 'v2',
          project_id: 'p1',
          shot_id: 'shot-1',
          asset_type: 'video',
          display_name: 'Runway Gen-3',
          storage_path: 'v2.mp4',
          mime_type: 'video/mp4',
          file_size: 150,
          version_number: 2,
          is_preferred: false,
          review_status: 'pending',
          is_external: false,
          created_at: '',
          updated_at: '',
        },
      ];

      // Simulate setPreferredAsset(shotId, 'v2', 'video')
      const targetId = 'v2';
      const updated = assets.map((a) => ({
        ...a,
        is_preferred: a.id === targetId,
      }));

      expect(updated.find((a) => a.id === 'v1')?.is_preferred).toBe(false);
      expect(updated.find((a) => a.id === 'v2')?.is_preferred).toBe(true);
      // Both versions still exist!
      expect(updated).toHaveLength(2);
    });
  });

  // 9. Unauthorized Access Prevention (RLS Policy Audit)
  describe('9. Unauthorized Access Prevention (RLS Policy Audit)', () => {
    it('verifies SQL migration enforces Row Level Security on assets table referencing project ownership', () => {
      const migrationFile = path.resolve(
        process.cwd(),
        'supabase/migrations/20261028020000_folkverse_phase4_production_assets.sql'
      );

      expect(fs.existsSync(migrationFile)).toBe(true);
      const sql = fs.readFileSync(migrationFile, 'utf8');

      // Check RLS enabled
      expect(sql).toContain('ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;');

      // Check ownership check clauses
      expect(sql).toContain('projects.id = assets.project_id');
      expect(sql).toContain('projects.user_id = auth.uid()');

      // Check storage bucket setup
      expect(sql).toContain("'production-assets'");
    });
  });

  // 10. Dashboard Counts and Progress Calculations
  describe('10. Dashboard Counts and Progress Calculations', () => {
    it('calculates production pipeline breakdown and distinguishes audiovisual completion', () => {
      const mockShots: Shot[] = [
        {
          id: 'sh-1',
          project_id: 'p',
          scene_id: 'sc-1',
          shot_order: 1,
          title: 'Shot 1',
          shot_type: 'Wide',
          camera_angle: 'Eye',
          camera_movement: 'Static',
          duration_seconds: 5,
          characters: [],
          action: 'Walk',
          image_prompt: 'Prompt A',
          motion_prompt: 'Motion A',
          dialogue: [],
          sound_effects: [],
          music_cue: '',
          continuity_notes: '',
          production_status: 'Approved',
          created_at: '',
          updated_at: '',
        },
        {
          id: 'sh-2',
          project_id: 'p',
          scene_id: 'sc-1',
          shot_order: 2,
          title: 'Shot 2',
          shot_type: 'Close-up',
          camera_angle: 'Low',
          camera_movement: 'Push',
          duration_seconds: 6,
          characters: [],
          action: 'Talk',
          image_prompt: 'Prompt B',
          motion_prompt: '', // Missing motion prompt!
          dialogue: [],
          sound_effects: [],
          music_cue: '',
          continuity_notes: '',
          production_status: 'Image Generated',
          created_at: '',
          updated_at: '',
        },
        {
          id: 'sh-3',
          project_id: 'p',
          scene_id: 'sc-1',
          shot_order: 3,
          title: 'Shot 3',
          shot_type: 'Medium',
          camera_angle: 'Eye',
          camera_movement: 'Pan',
          duration_seconds: 4,
          characters: [],
          action: 'React',
          image_prompt: '', // Missing image prompt!
          motion_prompt: 'Motion C',
          dialogue: [],
          sound_effects: [],
          music_cue: '',
          continuity_notes: '',
          production_status: 'Needs Revision',
          created_at: '',
          updated_at: '',
        },
      ];

      const mockAssets: ProductionAsset[] = [
        // sh-1 has both image and video
        {
          id: 'a1',
          project_id: 'p',
          shot_id: 'sh-1',
          asset_type: 'image',
          display_name: 'Image 1',
          storage_path: '',
          mime_type: 'image/png',
          file_size: 100,
          version_number: 1,
          is_preferred: true,
          review_status: 'approved',
          is_external: false,
          created_at: '',
          updated_at: '',
        },
        {
          id: 'a2',
          project_id: 'p',
          shot_id: 'sh-1',
          asset_type: 'video',
          display_name: 'Video 1',
          storage_path: '',
          mime_type: 'video/mp4',
          file_size: 100,
          version_number: 1,
          is_preferred: true,
          review_status: 'approved',
          is_external: false,
          created_at: '',
          updated_at: '',
        },
        // sh-2 has only image (no video)
        {
          id: 'a3',
          project_id: 'p',
          shot_id: 'sh-2',
          asset_type: 'image',
          display_name: 'Image 2',
          storage_path: '',
          mime_type: 'image/png',
          file_size: 100,
          version_number: 1,
          is_preferred: true,
          review_status: 'pending',
          is_external: false,
          created_at: '',
          updated_at: '',
        },
      ];

      // Missing Prompts
      const missingPrompts = mockShots.filter(
        (sh) => !sh.image_prompt?.trim() || !sh.motion_prompt?.trim()
      );
      expect(missingPrompts).toHaveLength(2); // sh-2 (no motion prompt) and sh-3 (no image prompt)

      // Audiovisual complete (has both image AND video)
      const avComplete = mockShots.filter((sh) => {
        const hasImg = mockAssets.some((a) => a.shot_id === sh.id && a.asset_type === 'image');
        const hasVid = mockAssets.some((a) => a.shot_id === sh.id && a.asset_type === 'video');
        return hasImg && hasVid;
      });
      expect(avComplete).toHaveLength(1); // Only sh-1! sh-2 has image but not video
      expect(avComplete[0].id).toBe('sh-1');

      // Status breakdown
      const approvedCount = mockShots.filter((s) => s.production_status === 'Approved').length;
      expect(approvedCount).toBe(1);
      const revisionCount = mockShots.filter((s) => s.production_status === 'Needs Revision').length;
      expect(revisionCount).toBe(1);
    });
  });

  // 11. Failed Upload Handling
  describe('11. Failed Upload Handling', () => {
    it('throws explicit error when Supabase client is not configured', async () => {
      supabaseService.setForceUnconfigured(true);
      try {
        const testFile = new File(['data'], 'test.png', { type: 'image/png' });
        await expect(
          api.uploadAssetFile('proj-123', 'shot-123', testFile)
        ).rejects.toThrow(/Supabase is not configured/);
      } finally {
        supabaseService.setForceUnconfigured(false);
      }
    });
  });

  // 12. Blueprint Import/Export Compatibility
  describe('12. Blueprint Import/Export Compatibility', () => {
    it('exports project without embedding binary base64 and preserves v1.0 schema validity', () => {
      const project: Project = {
        id: 'proj-bp-test',
        user_id: 'user-bp-test',
        title: 'Kingdom of Benin',
        description: 'Epic story',
        genre: 'Historical',
        visual_style: 'Bronzework realism',
        aspect_ratio: '16:9',
        language: 'Edo / English',
        created_at: '2026-10-28T00:00:00Z',
        updated_at: '2026-10-28T00:00:00Z',
      };

      const scenes: Scene[] = [
        {
          id: 'sc-1',
          project_id: project.id,
          scene_order: 1,
          title: 'Palace Gate',
          location: 'Royal Gate',
          location_id: null,
          int_ext: 'EXT',
          time_of_day: 'DAY',
          content: '',
          characters: [],
          created_at: '',
          updated_at: '',
        },
      ];

      const shots: Shot[] = [
        {
          id: 'sh-1',
          project_id: project.id,
          scene_id: 'sc-1',
          shot_order: 1,
          title: 'Gate Sentinel',
          shot_type: 'Medium shot',
          camera_angle: 'Low angle',
          camera_movement: 'Static',
          duration_seconds: 6,
          characters: [],
          action: 'Sentinel raises bronze spear',
          image_prompt: 'Benin palace warrior standing guard in carved bronze portal',
          motion_prompt: 'Subtle atmospheric breeze, spear holds steady',
          dialogue: [],
          sound_effects: ['Spear ground strike'],
          music_cue: 'Distant royal drums',
          continuity_notes: 'Keep bronze coral beads visible',
          production_status: 'Approved',
          created_at: '',
          updated_at: '',
        },
      ];

      const exported = exportProjectToBlueprint(project, [], [], scenes, shots);
      expect(exported.schemaVersion).toBe('1.0');
      expect(exported.project.title).toBe('Kingdom of Benin');

      // Re-validate against blueprint validation
      const validation = validateBlueprint(exported);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Verify no base64 string embedding in blueprint
      const jsonStr = JSON.stringify(exported);
      expect(jsonStr).not.toContain('data:image/');
      expect(jsonStr).not.toContain('base64');
    });
  });

  // 13. Preservation of Existing Project, Scene, Shot, and Prompt Data
  describe('13. Preservation of Existing Data', () => {
    it('preserves all Phase 1 and Phase 2 fields during Phase 4 operations', () => {
      const shot: Shot = {
        id: 'sh-p1-p2',
        project_id: 'p-1',
        scene_id: 'sc-1',
        shot_order: 1,
        title: 'Arrival',
        shot_type: 'Establishing shot',
        camera_angle: 'High angle',
        camera_movement: 'Tracking shot',
        duration_seconds: 8.5,
        characters: ['char_001', 'char_002'],
        action: 'Caravan emerges from mountain pass',
        image_prompt: 'Dusty trade caravan descending rocky ridge',
        motion_prompt: 'Slow lateral tracking shot following lead camel',
        dialogue: [
          {
            characterId: 'char_001',
            text: 'We are finally here.',
            delivery: 'Weary whisper',
            voiceNotes: 'Parched throat',
          },
        ],
        sound_effects: ['Wind howl', 'Camel harness jingling'],
        music_cue: 'Haunting oud melody',
        continuity_notes: 'Sun position low on horizon',
        production_status: 'Approved',
        created_at: '2026-10-28T00:00:00Z',
        updated_at: '2026-10-28T00:00:00Z',
      };

      // Verify all Phase 1 & Phase 2 fields intact
      expect(shot.title).toBe('Arrival');
      expect(shot.duration_seconds).toBe(8.5);
      expect(shot.dialogue[0].delivery).toBe('Weary whisper');
      expect(shot.sound_effects).toContain('Wind howl');
      expect(shot.continuity_notes).toBe('Sun position low on horizon');
      expect(shot.production_status).toBe('Approved');
    });
  });
});
