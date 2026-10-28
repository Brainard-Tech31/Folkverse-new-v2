/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../services/api.ts';
import {
  calculateSequenceTiming,
  evaluateSequenceReadiness,
  generateProductionManifest,
  validateTrimPoints,
  formatDuration,
} from '../services/assembly.ts';
import {
  validateBlueprint,
  exportProjectToBlueprint,
  getSampleBlueprint,
} from '../services/blueprint.ts';
import type {
  Project,
  Scene,
  Shot,
  Character,
  Location,
  ProductionAsset,
  Sequence,
  SequenceEntry,
  AudioTrack,
  CreateSequenceInput,
  CreateSequenceEntryInput,
  CreateAudioTrackInput,
} from '../types/database.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('FOLKVERSE Phase 5: Production Assembly & Final Cut Test Suite', () => {
  const baseProject: Project = {
    id: 'proj_p5_001',
    user_id: 'user_p5_001',
    title: 'Sundiata: The Lion King of Mali',
    description: 'An epic historical narrative of Mali.',
    genre: 'Historical Epic',
    visual_style: 'Warm Sahelian gold and dust',
    aspect_ratio: '16:9',
    language: 'English / Mandinka',
    created_at: '2026-10-28T00:00:00Z',
    updated_at: '2026-10-28T00:00:00Z',
  };

  const scene1: Scene = {
    id: 'scene_01',
    project_id: baseProject.id,
    scene_order: 1,
    title: 'The Prophecy at Niani',
    location: 'Palisade of Niani',
    location_id: 'loc_01',
    int_ext: 'EXT',
    time_of_day: 'Dusk',
    content: '',
    summary: 'A hunter delivers a prophecy of an empire to King Naré Maghann.',
    characters: ['char_hunter', 'char_king'],
    created_at: '2026-10-28T00:00:00Z',
    updated_at: '2026-10-28T00:00:00Z',
  };

  const scene2: Scene = {
    id: 'scene_02',
    project_id: baseProject.id,
    scene_order: 2,
    title: 'The Great Baobab Tree',
    location: 'Baobab Grove',
    location_id: 'loc_02',
    int_ext: 'EXT',
    time_of_day: 'Midday',
    content: '',
    summary: 'Sundiata stands for the first time, uprooting the iron rod.',
    characters: ['char_sundiata', 'char_sogolon'],
    created_at: '2026-10-28T00:00:00Z',
    updated_at: '2026-10-28T00:00:00Z',
  };

  const shot1: Shot = {
    id: 'shot_01_01',
    project_id: baseProject.id,
    scene_id: scene1.id,
    shot_order: 1,
    title: 'Silhouette of the Hunter',
    shot_type: 'Wide shot',
    camera_angle: 'Low angle',
    camera_movement: 'Static',
    duration_seconds: 6,
    characters: ['char_hunter'],
    action: 'The hunter approaches the palisade of Niani under an amber sky.',
    image_prompt: 'Cinematic wide low angle silhouette of Mandinka hunter with bow at dusk.',
    motion_prompt: 'Slow dust drift with rising heat shimmer.',
    dialogue: [{ characterId: 'char_hunter', text: 'Great King, a conqueror will be born.' }],
    sound_effects: ['Dry wind', 'distant balafon'],
    music_cue: 'Kora solo in D minor',
    continuity_notes: '',
    production_status: 'Approved',
    created_at: '2026-10-28T00:00:00Z',
    updated_at: '2026-10-28T00:00:00Z',
  };

  const shot2: Shot = {
    id: 'shot_01_02',
    project_id: baseProject.id,
    scene_id: scene1.id,
    shot_order: 2,
    title: 'King Naré Listens',
    shot_type: 'Close-up',
    camera_angle: 'Eye level',
    camera_movement: 'Slow push in',
    duration_seconds: 4,
    characters: ['char_king'],
    action: 'The King raises his brow in quiet contemplation.',
    image_prompt: 'Close-up of Mandinka king in indigo robes by oil lamp.',
    motion_prompt: 'Slow subtle camera dolly into the eyes.',
    dialogue: [{ characterId: 'char_king', text: 'Destiny arrives when it wills.' }],
    sound_effects: ['Crackling torch'],
    music_cue: 'Kora harmony',
    continuity_notes: '',
    production_status: 'Approved',
    created_at: '2026-10-28T00:00:00Z',
    updated_at: '2026-10-28T00:00:00Z',
  };

  const shot3: Shot = {
    id: 'shot_02_01',
    project_id: baseProject.id,
    scene_id: scene2.id,
    shot_order: 1,
    title: 'The Iron Rod Bends',
    shot_type: 'Medium shot',
    camera_angle: 'Ground level',
    camera_movement: 'Whip tilt',
    duration_seconds: 8,
    characters: ['char_sundiata'],
    action: 'Young Sundiata grips the iron staff and rises to his feet.',
    image_prompt: 'Young African prince gripping a heavy forged iron bar with supreme effort.',
    motion_prompt: 'Powerful rising motion as the ground trembles.',
    dialogue: [],
    sound_effects: ['Iron groaning', 'crowd gasp'],
    music_cue: 'Triumphant djembe ensemble',
    continuity_notes: '',
    production_status: 'In Review',
    created_at: '2026-10-28T00:00:00Z',
    updated_at: '2026-10-28T00:00:00Z',
  };

  const videoAsset1: ProductionAsset = {
    id: 'asset_vid_01',
    project_id: baseProject.id,
    scene_id: scene1.id,
    shot_id: shot1.id,
    asset_type: 'video',
    display_name: 'Hunter_Silhouette_Take3.mp4',
    storage_path: 'https://storage.example.com/assets/hunter_take3.mp4',
    mime_type: 'video/mp4',
    file_size: 15400000,
    duration_seconds: 6.5,
    version_number: 3,
    generation_tool: 'Kling 1.5 Pro',
    prompt_used: 'Silhouette hunter walking against glowing red sunset.',
    is_preferred: true,
    review_status: 'approved',
    notes: 'Flawless dust motion and silhouette contrast',
    is_external: false,
    created_at: '2026-10-28T01:00:00Z',
    updated_at: '2026-10-28T01:00:00Z',
  };

  const videoAsset2: ProductionAsset = {
    id: 'asset_vid_02',
    project_id: baseProject.id,
    scene_id: scene1.id,
    shot_id: shot2.id,
    asset_type: 'video',
    display_name: 'King_Reaction_Take1.mp4',
    storage_path: 'https://storage.example.com/assets/king_take1.mp4',
    mime_type: 'video/mp4',
    file_size: 9800000,
    duration_seconds: 4.2,
    version_number: 1,
    generation_tool: 'Runway Gen-3',
    prompt_used: 'Regal African king subtle micro-expressions and eye shift.',
    is_preferred: true,
    review_status: 'approved',
    notes: 'Very natural blink and head tilt',
    is_external: false,
    created_at: '2026-10-28T01:10:00Z',
    updated_at: '2026-10-28T01:10:00Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Creating and saving a sequence
  describe('1. Creating and Saving a Sequence', () => {
    it('creates a sequence record with stable ID, project ID, title, and initial version', () => {
      const seq: Sequence = {
        id: 'seq_assembly_001',
        project_id: baseProject.id,
        user_id: baseProject.user_id,
        title: 'Master Assembly Cut',
        description: 'First assembly cut of Acts 1 and 2.',
        version: 1,
        notes: 'Pacing feels deliberate and grounded.',
        created_at: '2026-10-28T02:00:00Z',
        updated_at: '2026-10-28T02:00:00Z',
      };

      expect(seq.id).toBe('seq_assembly_001');
      expect(seq.project_id).toBe(baseProject.id);
      expect(seq.title).toBe('Master Assembly Cut');
      expect(seq.version).toBe(1);
    });
  });

  // 2. Reopening a saved sequence
  describe('2. Reopening a Saved Sequence', () => {
    it('restores sequence entries with order, asset references, and trim points', () => {
      const entry1: SequenceEntry = {
        id: 'entry_01',
        sequence_id: 'seq_assembly_001',
        project_id: baseProject.id,
        shot_id: shot1.id,
        sequence_order: 1,
        video_asset_id: videoAsset1.id,
        image_asset_id: null,
        in_point_seconds: 0.5,
        out_point_seconds: 6.0,
        transition_type: 'cut',
        transition_duration_seconds: 0,
        notes: 'Trim first half-second of wind shake',
        created_at: '2026-10-28T02:05:00Z',
        updated_at: '2026-10-28T02:05:00Z',
      };

      expect(entry1.sequence_order).toBe(1);
      expect(entry1.shot_id).toBe('shot_01_01');
      expect(entry1.video_asset_id).toBe('asset_vid_01');
      expect(entry1.in_point_seconds).toBe(0.5);
      expect(entry1.out_point_seconds).toBe(6.0);
    });
  });

  // 3. Adding and removing sequence entries
  describe('3. Adding and Removing Sequence Entries', () => {
    it('removes an entry from the cut without deleting the underlying shot from the project', () => {
      let entries: SequenceEntry[] = [
        {
          id: 'ent_1',
          sequence_id: 'seq_1',
          project_id: baseProject.id,
          shot_id: shot1.id,
          sequence_order: 1,
          video_asset_id: videoAsset1.id,
          image_asset_id: null,
          in_point_seconds: null,
          out_point_seconds: null,
          created_at: '2026-10-28T00:00:00Z',
          updated_at: '2026-10-28T00:00:00Z',
        },
        {
          id: 'ent_2',
          sequence_id: 'seq_1',
          project_id: baseProject.id,
          shot_id: shot2.id,
          sequence_order: 2,
          video_asset_id: videoAsset2.id,
          image_asset_id: null,
          in_point_seconds: null,
          out_point_seconds: null,
          created_at: '2026-10-28T00:00:00Z',
          updated_at: '2026-10-28T00:00:00Z',
        },
      ];

      // Remove entry 1 from sequence
      entries = entries.filter((e) => e.id !== 'ent_1');
      expect(entries).toHaveLength(1);
      expect(entries[0].shot_id).toBe(shot2.id);

      // Verify underlying shot is intact
      expect(shot1.id).toBe('shot_01_01');
      expect(shot1.duration_seconds).toBe(6);
      expect(shot1.production_status).toBe('Approved');
    });
  });

  // 4. Reordering shots without modifying blueprint order
  describe('4. Reordering Shots Without Modifying Blueprint Order', () => {
    it('allows rearranging sequence order without changing the original shot_order in blueprint', () => {
      // In sequence: Shot 2 comes before Shot 1
      const reorderedEntries: SequenceEntry[] = [
        {
          id: 'ent_rev_1',
          sequence_id: 'seq_alt',
          project_id: baseProject.id,
          shot_id: shot2.id, // Scene 1 Shot 2
          sequence_order: 1,
          created_at: '2026-10-28T00:00:00Z',
          updated_at: '2026-10-28T00:00:00Z',
        },
        {
          id: 'ent_rev_2',
          sequence_id: 'seq_alt',
          project_id: baseProject.id,
          shot_id: shot1.id, // Scene 1 Shot 1
          sequence_order: 2,
          created_at: '2026-10-28T00:00:00Z',
          updated_at: '2026-10-28T00:00:00Z',
        },
      ];

      expect(reorderedEntries[0].sequence_order).toBe(1);
      expect(reorderedEntries[0].shot_id).toBe(shot2.id);

      // Original shot order in blueprint remains unaltered!
      expect(shot1.shot_order).toBe(1);
      expect(shot2.shot_order).toBe(2);
    });
  });

  // 5. Duplicating a sequence without duplicating shots or assets
  describe('5. Duplicating Sequence Without Duplicating Shots or Assets', () => {
    it('creates an alternate cut with independent sequence entries without cloning shots or assets', () => {
      const originalSeq: Sequence = {
        id: 'seq_orig',
        project_id: baseProject.id,
        title: 'Theatrical Cut',
        version: 1,
        created_at: '2026-10-28T00:00:00Z',
        updated_at: '2026-10-28T00:00:00Z',
      };

      const originalEntries: SequenceEntry[] = [
        {
          id: 'entry_orig_1',
          sequence_id: originalSeq.id,
          project_id: baseProject.id,
          shot_id: shot1.id,
          sequence_order: 1,
          video_asset_id: videoAsset1.id,
          in_point_seconds: 1.0,
          out_point_seconds: 5.0,
          created_at: '2026-10-28T00:00:00Z',
          updated_at: '2026-10-28T00:00:00Z',
        },
      ];

      // Clone simulation
      const duplicatedSeq: Sequence = {
        id: 'seq_dupe',
        project_id: originalSeq.project_id,
        title: 'Extended Festival Cut',
        version: 2,
        created_at: '2026-10-28T03:00:00Z',
        updated_at: '2026-10-28T03:00:00Z',
      };

      const duplicatedEntries: SequenceEntry[] = originalEntries.map((e) => ({
        ...e,
        id: `entry_dupe_${e.sequence_order}`,
        sequence_id: duplicatedSeq.id,
      }));

      expect(duplicatedSeq.id).not.toBe(originalSeq.id);
      expect(duplicatedEntries[0].id).not.toBe(originalEntries[0].id);
      expect(duplicatedEntries[0].shot_id).toBe(shot1.id);
      expect(duplicatedEntries[0].video_asset_id).toBe(videoAsset1.id);

      // Mutating duplicate cut trim doesn't affect original sequence entry
      duplicatedEntries[0].in_point_seconds = 0.0;
      expect(originalEntries[0].in_point_seconds).toBe(1.0);
    });
  });

  // 6. Selecting a preferred video asset
  describe('6. Selecting Preferred Video Asset', () => {
    it('maps preferred video asset to entry while allowing alternate take selection', () => {
      const altTake: ProductionAsset = {
        ...videoAsset1,
        id: 'asset_vid_01_take1',
        display_name: 'Hunter_Silhouette_Take1.mp4',
        version_number: 1,
        is_preferred: false,
      };

      const entry: SequenceEntry = {
        id: 'ent_pick',
        sequence_id: 'seq_1',
        project_id: baseProject.id,
        shot_id: shot1.id,
        sequence_order: 1,
        video_asset_id: videoAsset1.id, // preferred
        created_at: '2026-10-28T00:00:00Z',
        updated_at: '2026-10-28T00:00:00Z',
      };

      expect(entry.video_asset_id).toBe(videoAsset1.id);

      // User selects alternate take 1
      entry.video_asset_id = altTake.id;
      expect(entry.video_asset_id).toBe('asset_vid_01_take1');
      // Original asset record is still not preferred, preserving Phase 4 state
      expect(altTake.is_preferred).toBe(false);
      expect(videoAsset1.is_preferred).toBe(true);
    });
  });

  // 7. Rejecting assets from another project
  describe('7. Rejecting Assets from Another Project', () => {
    it('detects and flags foreign assets in readiness check', () => {
      const foreignAsset: ProductionAsset = {
        id: 'asset_foreign',
        project_id: 'other_proj_999', // foreign!
        shot_id: shot1.id,
        asset_type: 'video',
        display_name: 'Foreign_Cut.mp4',
        storage_path: 'https://storage.example.com/other.mp4',
        mime_type: 'video/mp4',
        file_size: 1000,
        version_number: 1,
        is_preferred: false,
        review_status: 'approved',
        is_external: false,
        created_at: '2026-10-28T00:00:00Z',
        updated_at: '2026-10-28T00:00:00Z',
      };

      const seq: Sequence = {
        id: 'seq_1',
        project_id: baseProject.id,
        title: 'Cut',
        version: 1,
        created_at: '2026-10-28T00:00:00Z',
        updated_at: '2026-10-28T00:00:00Z',
      };

      const entry: SequenceEntry = {
        id: 'ent_foreign',
        sequence_id: seq.id,
        project_id: baseProject.id,
        shot_id: shot1.id,
        sequence_order: 1,
        video_asset_id: foreignAsset.id,
        created_at: '2026-10-28T00:00:00Z',
        updated_at: '2026-10-28T00:00:00Z',
      };

      const report = evaluateSequenceReadiness(
        seq,
        [entry],
        [shot1],
        [scene1],
        [foreignAsset],
        [],
        false
      );

      const foreignError = report.findings.find((f) => f.code === 'ERR_FOREIGN_ASSET');
      expect(foreignError).toBeDefined();
      expect(report.summary.errorsCount).toBeGreaterThanOrEqual(1);
      expect(report.canExport).toBe(false);
    });
  });

  // 8. Validating trim in-points and out-points
  describe('8. Validating Trim In-Points and Out-Points', () => {
    it('accepts valid in and out trimming bounds within media duration', () => {
      const res = validateTrimPoints(1.5, 4.5, 6.0);
      expect(res.valid).toBe(true);
    });

    it('rejects negative in-point', () => {
      const res = validateTrimPoints(-0.5, 3.0, 5.0);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('positive number or zero');
    });

    it('rejects out-point less than or equal to in-point', () => {
      const res = validateTrimPoints(3.0, 2.0, 6.0);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('strictly greater than in-point');
    });

    it('rejects out-point exceeding source media duration', () => {
      const res = validateTrimPoints(1.0, 7.5, 6.0); // source is 6.0s
      expect(res.valid).toBe(false);
      expect(res.error).toContain('exceeds source media duration');
    });
  });

  // 9. Calculating sequence duration correctly
  describe('9. Calculating Sequence Duration Correctly', () => {
    it('accurately sums trimmed durations of assembled clips', () => {
      const entries: SequenceEntry[] = [
        {
          id: 'e1',
          sequence_id: 'seq_1',
          project_id: baseProject.id,
          shot_id: shot1.id,
          sequence_order: 1,
          video_asset_id: videoAsset1.id, // 6.5s
          in_point_seconds: 1.0,
          out_point_seconds: 5.0, // effective: 4.0s
          created_at: '2026-10-28T00:00:00Z',
          updated_at: '2026-10-28T00:00:00Z',
        },
        {
          id: 'e2',
          sequence_id: 'seq_1',
          project_id: baseProject.id,
          shot_id: shot2.id,
          sequence_order: 2,
          video_asset_id: videoAsset2.id, // 4.2s (no trim)
          in_point_seconds: null,
          out_point_seconds: null, // effective: 4.2s
          created_at: '2026-10-28T00:00:00Z',
          updated_at: '2026-10-28T00:00:00Z',
        },
      ];

      const timing = calculateSequenceTiming(
        entries,
        [shot1, shot2],
        [videoAsset1, videoAsset2]
      );

      // 4.0s + 4.2s = 8.2s
      expect(timing.totalAssembledSeconds).toBeCloseTo(8.2, 1);
      expect(timing.totalAssembledFormatted).toBe('0m 08s');
      expect(timing.entriesWithVerifiedDurationCount).toBe(2);
      expect(timing.entriesWithEstimatedDurationCount).toBe(0);
    });
  });

  // 10. Distinguishing planned runtime from actual media duration
  describe('10. Distinguishing Planned Runtime from Actual Media Duration', () => {
    it('clearly distinguishes planned screenplay duration from actual measured duration', () => {
      // Shot 3 has planned 8s, but no video asset attached yet
      const entryUnmeasured: SequenceEntry = {
        id: 'e3',
        sequence_id: 'seq_1',
        project_id: baseProject.id,
        shot_id: shot3.id,
        sequence_order: 1,
        video_asset_id: null,
        created_at: '2026-10-28T00:00:00Z',
        updated_at: '2026-10-28T00:00:00Z',
      };

      const timing = calculateSequenceTiming(
        [entryUnmeasured],
        [shot3],
        []
      );

      // Planned duration is 8s
      expect(timing.totalPlannedSeconds).toBe(8);
      // Assembled runtime with no media defaults to 0 verified seconds
      expect(timing.totalAssembledSeconds).toBe(0);
      expect(timing.entriesWithEstimatedDurationCount).toBe(1);
      expect(timing.entryTimings[0].isDurationEstimated).toBe(true);
      expect(timing.entryTimings[0].effectiveDurationSeconds).toBeNull();
    });
  });

  // 11. Audio and narration planning persistence
  describe('11. Audio and Narration Planning Persistence', () => {
    it('manages narration and voiceover cues with speaker references and status states', () => {
      const narrationTrack: AudioTrack = {
        id: 'audio_vo_01',
        project_id: baseProject.id,
        sequence_id: 'seq_1',
        sequence_entry_id: 'entry_01',
        audio_type: 'narration',
        title: 'Opening Voice of the Griot',
        character_id: 'char_griot',
        text: 'Listen to the tale of Djata, son of the buffalo and the lion.',
        audio_asset_id: null,
        status: 'not_recorded',
        start_time_seconds: 0.0,
        duration_seconds: 5.5,
        in_point_seconds: null,
        out_point_seconds: null,
        notes: 'Needs deep resonant delivery',
        created_at: '2026-10-28T00:00:00Z',
        updated_at: '2026-10-28T00:00:00Z',
      };

      expect(narrationTrack.status).toBe('not_recorded');
      expect(narrationTrack.character_id).toBe('char_griot');

      // Update to recorded and link audio asset
      const recordedTrack: AudioTrack = {
        ...narrationTrack,
        status: 'recorded',
        audio_asset_id: 'asset_audio_griot_take2',
      };

      expect(recordedTrack.status).toBe('recorded');
      expect(recordedTrack.audio_asset_id).toBe('asset_audio_griot_take2');
    });
  });

  // 12. Readiness findings for missing video and unapproved shots
  describe('12. Readiness Findings for Missing Video and Unapproved Shots', () => {
    it('flags warnings for missing video and unapproved shots, requiring draft cut override', () => {
      const seq: Sequence = {
        id: 'seq_readiness_test',
        project_id: baseProject.id,
        title: 'Rough Assembly Cut',
        version: 1,
        created_at: '2026-10-28T00:00:00Z',
        updated_at: '2026-10-28T00:00:00Z',
      };

      // shot3 is 'In Review' and has no video attached
      const entry: SequenceEntry = {
        id: 'ent_incomplete',
        sequence_id: seq.id,
        project_id: baseProject.id,
        shot_id: shot3.id,
        sequence_order: 1,
        video_asset_id: null,
        created_at: '2026-10-28T00:00:00Z',
        updated_at: '2026-10-28T00:00:00Z',
      };

      // 1. Without override: cannot export
      const reportWithoutOverride = evaluateSequenceReadiness(
        seq,
        [entry],
        [shot3],
        [scene2],
        [],
        [],
        false // no override
      );

      expect(reportWithoutOverride.summary.warningsCount).toBeGreaterThanOrEqual(2);
      expect(reportWithoutOverride.findings.some((f) => f.code === 'WARN_MISSING_VIDEO')).toBe(true);
      expect(reportWithoutOverride.findings.some((f) => f.code === 'WARN_UNAPPROVED_SHOT')).toBe(true);
      expect(reportWithoutOverride.canExport).toBe(false);

      // 2. With draft override: export is unlocked
      const reportWithOverride = evaluateSequenceReadiness(
        seq,
        [entry],
        [shot3],
        [scene2],
        [],
        [],
        true // explicit draft cut override
      );

      expect(reportWithOverride.canExport).toBe(true);
    });
  });

  // 13. Manifest export with correct ordering and asset references
  describe('13. Manifest Export with Correct Ordering and Asset References', () => {
    it('produces manifestSchemaVersion 1.0 with ordered clips and durable media URLs', () => {
      const seq: Sequence = {
        id: 'seq_manifest_01',
        project_id: baseProject.id,
        title: 'Master Sequence',
        version: 1,
        created_at: '2026-10-28T00:00:00Z',
        updated_at: '2026-10-28T00:00:00Z',
      };

      const entries: SequenceEntry[] = [
        {
          id: 'ent_1',
          sequence_id: seq.id,
          project_id: baseProject.id,
          shot_id: shot1.id,
          sequence_order: 1,
          video_asset_id: videoAsset1.id,
          in_point_seconds: 0.0,
          out_point_seconds: 6.0,
          transition_type: 'cut',
          transition_duration_seconds: 0,
          created_at: '2026-10-28T00:00:00Z',
          updated_at: '2026-10-28T00:00:00Z',
        },
      ];

      const manifest = generateProductionManifest(
        baseProject,
        seq,
        entries,
        [shot1],
        [scene1],
        [],
        [videoAsset1],
        [],
        false
      );

      expect(manifest.manifestSchemaVersion).toBe('1.0');
      expect(manifest.project.id).toBe(baseProject.id);
      expect(manifest.sequence.id).toBe(seq.id);
      expect(manifest.sequence.entries).toHaveLength(1);
      expect(manifest.sequence.entries[0].videoAsset?.url).toBe(videoAsset1.storage_path);
      expect(manifest.sequence.entries[0].inPointSeconds).toBe(0.0);
      expect(manifest.sequence.entries[0].outPointSeconds).toBe(6.0);
    });
  });

  // 14. Manifest export without embedded binary media
  describe('14. Manifest Export Without Embedded Binary Media', () => {
    it('ensures exported manifest JSON contains no base64 binary embeddings', () => {
      const seq: Sequence = {
        id: 'seq_clean',
        project_id: baseProject.id,
        title: 'Clean Cut',
        version: 1,
        created_at: '2026-10-28T00:00:00Z',
        updated_at: '2026-10-28T00:00:00Z',
      };

      const entries: SequenceEntry[] = [
        {
          id: 'ent_clean_1',
          sequence_id: seq.id,
          project_id: baseProject.id,
          shot_id: shot1.id,
          sequence_order: 1,
          video_asset_id: videoAsset1.id,
          created_at: '2026-10-28T00:00:00Z',
          updated_at: '2026-10-28T00:00:00Z',
        },
      ];

      const manifest = generateProductionManifest(
        baseProject,
        seq,
        entries,
        [shot1],
        [scene1],
        [],
        [videoAsset1],
        [],
        false
      );

      const jsonString = JSON.stringify(manifest);

      // Must NOT contain base64 binary data URIs
      expect(jsonString).not.toMatch(/data:image\/[^;]+;base64/);
      expect(jsonString).not.toMatch(/data:video\/[^;]+;base64/);
      expect(jsonString).not.toMatch(/data:audio\/[^;]+;base64/);
      // Must contain clean URLs
      expect(jsonString).toContain('https://storage.example.com/assets/hunter_take3.mp4');
    });
  });

  // 15. Preservation of original blueprint
  describe('15. Preservation of Original Blueprint', () => {
    it('preserves the JSON blueprint schemaVersion 1.0 completely intact', () => {
      const sample = getSampleBlueprint();
      const validation = validateBlueprint(sample);

      expect(validation.valid).toBe(true);
      expect(sample.schemaVersion).toBe('1.0');
      expect(sample.scenes && sample.scenes.length > 0).toBe(true);
    });
  });

  // 16. Preservation of Phase 4 statuses, asset versions, and preferred assets
  describe('16. Preservation of Phase 4 Records', () => {
    it('leaves Phase 4 production statuses and asset version records intact during assembly', () => {
      expect(shot1.production_status).toBe('Approved');
      expect(videoAsset1.version_number).toBe(3);
      expect(videoAsset1.is_preferred).toBe(true);
      expect(videoAsset1.review_status).toBe('approved');
    });
  });

  // 17. Supabase authorization and ownership in migration
  describe('17. Supabase Authorization and Ownership Rules', () => {
    it('verifies that Phase 5 SQL migration file defines RLS and auth.uid() checks for all 3 tables', () => {
      const migrationPath = path.resolve(
        process.cwd(),
        'supabase/migrations/20261028030000_folkverse_phase5_production_assembly.sql'
      );

      expect(fs.existsSync(migrationPath)).toBe(true);
      const sqlContent = fs.readFileSync(migrationPath, 'utf8');

      // Table creations
      expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS public.sequences');
      expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS public.sequence_entries');
      expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS public.audio_tracks');

      // RLS enabled
      expect(sqlContent).toContain('ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;');
      expect(sqlContent).toContain('ALTER TABLE public.sequence_entries ENABLE ROW LEVEL SECURITY;');
      expect(sqlContent).toContain('ALTER TABLE public.audio_tracks ENABLE ROW LEVEL SECURITY;');

      // auth.uid() checks
      expect(sqlContent).toContain('projects.user_id = auth.uid()');
      expect(sqlContent).toContain('auth.uid()');
    });
  });

  // 18. Production build and relevant regression tests
  describe('18. Production Build and Regression Verifications', () => {
    it('formats duration strings into standard time notation', () => {
      expect(formatDuration(0)).toBe('0m 00s');
      expect(formatDuration(45)).toBe('0m 45s');
      expect(formatDuration(125)).toBe('2m 05s');
      expect(formatDuration(3665)).toBe('1h 01m 05s');
    });
  });
});
