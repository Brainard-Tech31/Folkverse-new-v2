/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Project,
  Scene,
  Shot,
  Character,
  ProductionAsset,
  Sequence,
  SequenceEntry,
  AudioTrack,
  SequenceTimingSummary,
  SequenceEntryTiming,
  SequenceReadinessReport,
  ReadinessFinding,
  ProductionManifest,
  ManifestSequenceEntry,
  ManifestAudioItem,
  ManifestDialogueRef,
  ManifestSourceRef,
} from '../types/database.ts';

/**
 * Validates in-point and out-point trimming ranges against numerical rules and known media duration.
 */
export function validateTrimPoints(
  inPoint?: number | null,
  outPoint?: number | null,
  sourceDuration?: number | null
): { valid: boolean; error?: string } {
  if (inPoint !== null && inPoint !== undefined) {
    if (isNaN(inPoint) || inPoint < 0) {
      return { valid: false, error: 'In-point must be a positive number or zero.' };
    }
  }

  if (outPoint !== null && outPoint !== undefined) {
    if (isNaN(outPoint) || outPoint <= 0) {
      return { valid: false, error: 'Out-point must be a positive number greater than zero.' };
    }
  }

  if (
    inPoint !== null &&
    inPoint !== undefined &&
    outPoint !== null &&
    outPoint !== undefined
  ) {
    if (outPoint <= inPoint) {
      return { valid: false, error: 'Out-point must be strictly greater than in-point.' };
    }
  }

  if (sourceDuration !== null && sourceDuration !== undefined && sourceDuration > 0) {
    if (inPoint !== null && inPoint !== undefined && inPoint >= sourceDuration) {
      return {
        valid: false,
        error: `In-point (${inPoint}s) cannot meet or exceed source media duration (${sourceDuration}s).`,
      };
    }
    if (outPoint !== null && outPoint !== undefined && outPoint > sourceDuration) {
      return {
        valid: false,
        error: `Out-point (${outPoint}s) exceeds source media duration (${sourceDuration}s).`,
      };
    }
  }

  return { valid: true };
}

/**
 * Formats a duration in seconds into human-readable minutes and seconds or hours.
 */
export function formatDuration(seconds: number): string {
  const safeSec = Math.max(0, Number(seconds) || 0);
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = Math.round(safeSec % 60);

  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

/**
 * Calculates sequence timing from actual selected media assets, trimming ranges, and planned shots.
 * Strictly separates verified media duration from planned blueprint durations.
 */
export function calculateSequenceTiming(
  entries: SequenceEntry[],
  shots: Shot[],
  assets: ProductionAsset[]
): SequenceTimingSummary {
  const shotMap = new Map<string, Shot>();
  shots.forEach((s) => shotMap.set(s.id, s));

  const assetMap = new Map<string, ProductionAsset>();
  assets.forEach((a) => assetMap.set(a.id, a));

  // Sort entries by sequence_order
  const sortedEntries = [...entries].sort((a, b) => a.sequence_order - b.sequence_order);

  let currentRunningTime = 0;
  let totalAssembledSeconds = 0;
  let totalPlannedSeconds = 0;
  let verifiedCount = 0;
  let estimatedCount = 0;

  const entryTimings: SequenceEntryTiming[] = [];
  const sceneDurationMap: Record<string, { sceneTitle: string; durationSeconds: number }> = {};

  sortedEntries.forEach((entry) => {
    const shot = shotMap.get(entry.shot_id);
    const plannedDur = shot ? Math.max(0, Number(shot.duration_seconds) || 0) : 0;
    totalPlannedSeconds += plannedDur;

    // Check selected video asset
    const selectedVideo = entry.video_asset_id ? assetMap.get(entry.video_asset_id) : null;
    const sourceDuration = selectedVideo?.duration_seconds ?? null;

    let effectiveDuration: number | null = null;
    let isEstimated = false;

    // Trimming range has highest priority if valid
    if (
      entry.in_point_seconds !== null &&
      entry.in_point_seconds !== undefined &&
      entry.out_point_seconds !== null &&
      entry.out_point_seconds !== undefined &&
      entry.out_point_seconds > entry.in_point_seconds
    ) {
      effectiveDuration = Math.max(0, entry.out_point_seconds - entry.in_point_seconds);
      isEstimated = false;
    } else if (sourceDuration !== null && sourceDuration > 0) {
      // Full source duration
      effectiveDuration = sourceDuration;
      isEstimated = false;
    } else {
      // Media duration is unmeasured/unknown
      effectiveDuration = null;
      isEstimated = true;
    }

    if (!isEstimated && effectiveDuration !== null) {
      verifiedCount += 1;
      totalAssembledSeconds += effectiveDuration;
    } else {
      estimatedCount += 1;
    }

    // Clip playback duration added to running timeline
    const durationForTimeline = effectiveDuration !== null ? effectiveDuration : plannedDur;
    const startTime = currentRunningTime;
    const endTime = startTime + durationForTimeline;
    currentRunningTime = endTime;

    entryTimings.push({
      entryId: entry.id,
      shotId: entry.shot_id,
      order: entry.sequence_order,
      plannedDurationSeconds: plannedDur,
      sourceAssetDuration: sourceDuration,
      effectiveDurationSeconds: effectiveDuration,
      isDurationEstimated: isEstimated,
      startTimeSeconds: Math.round(startTime * 100) / 100,
      endTimeSeconds: Math.round(endTime * 100) / 100,
      inPointSeconds: entry.in_point_seconds ?? null,
      outPointSeconds: entry.out_point_seconds ?? null,
    });

    // Scene group duration tracking
    if (shot?.scene_id) {
      if (!sceneDurationMap[shot.scene_id]) {
        sceneDurationMap[shot.scene_id] = { sceneTitle: `Scene ${shot.scene_id}`, durationSeconds: 0 };
      }
      sceneDurationMap[shot.scene_id].durationSeconds += durationForTimeline;
    }
  });

  const sceneDurations: Record<string, { sceneTitle: string; durationSeconds: number; formatted: string }> = {};
  Object.entries(sceneDurationMap).forEach(([scId, data]) => {
    sceneDurations[scId] = {
      sceneTitle: data.sceneTitle,
      durationSeconds: data.durationSeconds,
      formatted: formatDuration(data.durationSeconds),
    };
  });

  return {
    totalAssembledSeconds: Math.round(totalAssembledSeconds * 100) / 100,
    totalAssembledFormatted: formatDuration(totalAssembledSeconds),
    totalPlannedSeconds: Math.round(totalPlannedSeconds * 100) / 100,
    totalPlannedFormatted: formatDuration(totalPlannedSeconds),
    entriesCount: sortedEntries.length,
    entriesWithVerifiedDurationCount: verifiedCount,
    entriesWithEstimatedDurationCount: estimatedCount,
    entryTimings,
    sceneDurations,
  };
}

/**
 * Evaluates sequence completeness, media integrity, trim bounds, and final-cut readiness.
 */
export function evaluateSequenceReadiness(
  sequence: Sequence,
  entries: SequenceEntry[],
  shots: Shot[],
  scenes: Scene[],
  assets: ProductionAsset[],
  audioTracks: AudioTrack[] = [],
  hasDraftOverride: boolean = false
): SequenceReadinessReport {
  const findings: ReadinessFinding[] = [];

  const shotMap = new Map<string, Shot>();
  shots.forEach((s) => shotMap.set(s.id, s));

  const sceneMap = new Map<string, Scene>();
  scenes.forEach((sc) => sceneMap.set(sc.id, sc));

  const assetMap = new Map<string, ProductionAsset>();
  assets.forEach((a) => assetMap.set(a.id, a));

  if (entries.length === 0) {
    findings.push({
      id: `err_empty_sequence_${sequence.id}`,
      code: 'ERR_EMPTY_SEQUENCE',
      severity: 'error',
      message: 'Sequence contains no shot entries.',
      explanation: 'An assembly sequence must contain at least one shot entry to form an edit.',
      suggestedResolution: 'Add shots from your scenes into this sequence.',
    });
  }

  // Track duplicated shot IDs to check accidental repetition
  const shotUseCount = new Map<string, string[]>();

  entries.forEach((entry, idx) => {
    const shot = shotMap.get(entry.shot_id);

    // 1. Broken Shot Reference
    if (!shot) {
      findings.push({
        id: `err_missing_shot_${entry.id}`,
        code: 'ERR_MISSING_SHOT_REF',
        severity: 'error',
        message: `Sequence entry #${entry.sequence_order} references non-existent shot ID "${entry.shot_id}".`,
        explanation: 'The underlying shot record was deleted or does not belong to this project.',
        suggestedResolution: 'Remove this entry or reassign it to an existing shot.',
        sequenceEntryId: entry.id,
        shotId: entry.shot_id,
      });
      return;
    }

    // Shot repetition check
    if (!shotUseCount.has(shot.id)) {
      shotUseCount.set(shot.id, []);
    }
    shotUseCount.get(shot.id)!.push(entry.id);

    // 2. Video Asset Selection Check
    if (!entry.video_asset_id) {
      findings.push({
        id: `warn_no_video_${entry.id}`,
        code: 'WARN_MISSING_VIDEO',
        severity: 'warning',
        message: `Entry #${entry.sequence_order} ("${shot.title}") has no video asset selected.`,
        explanation: 'Final-cut assembly requires an approved or selected video clip for each sequence entry.',
        suggestedResolution: 'Attach or select a video asset for this shot entry.',
        sequenceEntryId: entry.id,
        shotId: shot.id,
      });
    } else {
      const selectedAsset = assetMap.get(entry.video_asset_id);

      // Selected asset missing in project
      if (!selectedAsset) {
        findings.push({
          id: `err_asset_not_found_${entry.id}`,
          code: 'ERR_ASSET_NOT_FOUND',
          severity: 'error',
          message: `Entry #${entry.sequence_order} references missing asset ID "${entry.video_asset_id}".`,
          explanation: 'The selected video asset was not found in the project asset registry.',
          suggestedResolution: 'Select an available video asset from the media list.',
          sequenceEntryId: entry.id,
          shotId: shot.id,
          assetId: entry.video_asset_id,
        });
      } else {
        // Cross-project security validation
        if (selectedAsset.project_id !== sequence.project_id) {
          findings.push({
            id: `err_cross_project_asset_${entry.id}`,
            code: 'ERR_FOREIGN_ASSET',
            severity: 'error',
            message: `Entry #${entry.sequence_order} references asset from another project.`,
            explanation: 'Cross-project asset referencing is prohibited by project security rules.',
            suggestedResolution: 'Select an asset that belongs exclusively to this project.',
            sequenceEntryId: entry.id,
            shotId: shot.id,
            assetId: selectedAsset.id,
          });
        }

        // Rejected asset check
        if (selectedAsset.review_status === 'rejected') {
          findings.push({
            id: `warn_rejected_asset_${entry.id}`,
            code: 'WARN_REJECTED_ASSET',
            severity: 'warning',
            message: `Entry #${entry.sequence_order} uses a rejected video asset ("${selectedAsset.display_name}").`,
            explanation: 'This asset attempt was marked as rejected during editorial review.',
            suggestedResolution: 'Choose an approved video version or re-evaluate asset status.',
            sequenceEntryId: entry.id,
            shotId: shot.id,
            assetId: selectedAsset.id,
          });
        }

        // Trimming validation
        const trimCheck = validateTrimPoints(
          entry.in_point_seconds,
          entry.out_point_seconds,
          selectedAsset.duration_seconds
        );
        if (!trimCheck.valid) {
          findings.push({
            id: `err_invalid_trim_${entry.id}`,
            code: 'ERR_INVALID_TRIM',
            severity: 'error',
            message: `Entry #${entry.sequence_order} has invalid trimming: ${trimCheck.error}`,
            explanation: 'In-point and out-point bounds must fall within valid source media duration.',
            suggestedResolution: 'Adjust or clear in-point and out-point values.',
            sequenceEntryId: entry.id,
            shotId: shot.id,
            assetId: selectedAsset.id,
          });
        }

        // Unmeasured media duration
        if (selectedAsset.duration_seconds === null || selectedAsset.duration_seconds === undefined) {
          findings.push({
            id: `info_unmeasured_duration_${entry.id}`,
            code: 'INFO_UNMEASURED_DURATION',
            severity: 'info',
            message: `Entry #${entry.sequence_order} video asset duration has not been measured.`,
            explanation: 'Duration will fall back to planned duration until exact media playback length is measured.',
            suggestedResolution: 'Measure or record the exact duration in seconds for this asset.',
            sequenceEntryId: entry.id,
            shotId: shot.id,
            assetId: selectedAsset.id,
          });
        }
      }
    }

    // 3. Shot Approval Check (Phase 4 integration)
    if (shot.production_status !== 'Approved') {
      findings.push({
        id: `warn_unapproved_shot_${entry.id}`,
        code: 'WARN_UNAPPROVED_SHOT',
        severity: 'warning',
        message: `Entry #${entry.sequence_order} ("${shot.title}") is marked "${shot.production_status || 'Not Started'}", not "Approved".`,
        explanation: 'Final-cut export standards require each shot to be reviewed and marked Approved.',
        suggestedResolution: 'Review and approve this shot in the Shot Details panel or override for rough cut.',
        sequenceEntryId: entry.id,
        shotId: shot.id,
      });
    }
  });

  // Check duplicate shots in sequence without editorial notes
  shotUseCount.forEach((entryIds, sId) => {
    if (entryIds.length > 1) {
      const shot = shotMap.get(sId);
      findings.push({
        id: `warn_repeated_shot_${sId}`,
        code: 'WARN_REPEATED_SHOT',
        severity: 'info',
        message: `Shot "${shot?.title || sId}" appears ${entryIds.length} times in this sequence.`,
        explanation: 'Multiple sequence entries use the exact same shot. This is valid for recurring motifs or flashback cutaways.',
        suggestedResolution: 'Ensure this repetition is intentional and add editorial notes if needed.',
        shotId: sId,
      });
    }
  });

  // 4. Audio & Narration Checks
  audioTracks.forEach((track) => {
    if (track.audio_type === 'narration' && track.status === 'not_recorded') {
      findings.push({
        id: `warn_unrecorded_narration_${track.id}`,
        code: 'WARN_UNRECORDED_NARRATION',
        severity: 'warning',
        message: `Narration cue "${track.title}" has not been recorded yet.`,
        explanation: 'Planned voiceover narration is required before final audio mixdown.',
        suggestedResolution: 'Record or upload the voiceover asset and update its audio status.',
        audioTrackId: track.id,
      });
    }

    if (track.audio_asset_id && !assetMap.has(track.audio_asset_id)) {
      findings.push({
        id: `err_missing_audio_asset_${track.id}`,
        code: 'ERR_MISSING_AUDIO_ASSET',
        severity: 'error',
        message: `Audio track "${track.title}" references missing audio asset ID "${track.audio_asset_id}".`,
        explanation: 'The linked audio file could not be found in project assets.',
        suggestedResolution: 'Relink or re-upload the audio file in the Audio Planning panel.',
        audioTrackId: track.id,
      });
    }
  });

  let errorsCount = 0;
  let warningsCount = 0;
  let infoCount = 0;

  findings.forEach((f) => {
    if (f.severity === 'error') errorsCount++;
    else if (f.severity === 'warning') warningsCount++;
    else if (f.severity === 'info') infoCount++;
  });

  const isStructurallyValid = errorsCount === 0;
  const isEditorialReady = isStructurallyValid && entries.length > 0;
  const isFinalCutReady = isStructurallyValid && (warningsCount === 0 || hasDraftOverride);

  return {
    isFinalCutReady,
    isEditorialReady,
    isStructurallyValid,
    canExport: isFinalCutReady,
    errorsCount,
    warningsCount,
    infoCount,
    totalFindings: findings.length,
    summary: {
      errorsCount,
      warningsCount,
      infoCount,
      totalFindings: findings.length,
    },
    findings,
    hasDraftOverride,
  };
}

/**
 * Builds a durable, exportable Production Manifest JSON object for external video editors.
 * Guarantees no base64 binary media embedding and preserves sequence ordering.
 */
export function generateProductionManifest(
  project: Project,
  sequence: Sequence,
  entries: SequenceEntry[],
  shots: Shot[],
  scenes: Scene[],
  characters: Character[],
  assets: ProductionAsset[],
  audioTracks: AudioTrack[] = [],
  readinessReportOrDraftOverride?: SequenceReadinessReport | boolean
): ProductionManifest {
  const shotMap = new Map<string, Shot>();
  shots.forEach((s) => shotMap.set(s.id, s));

  const sceneMap = new Map<string, Scene>();
  scenes.forEach((sc) => sceneMap.set(sc.id, sc));

  const characterMap = new Map<string, Character>();
  characters.forEach((c) => characterMap.set(c.id, c));

  const assetMap = new Map<string, ProductionAsset>();
  assets.forEach((a) => assetMap.set(a.id, a));

  const sortedEntries = [...entries].sort((a, b) => a.sequence_order - b.sequence_order);
  const timing = calculateSequenceTiming(sortedEntries, shots, assets);

  const manifestEntries: ManifestSequenceEntry[] = sortedEntries.map((entry, idx) => {
    const shot = shotMap.get(entry.shot_id);
    const scene = shot ? sceneMap.get(shot.scene_id) : null;
    const entryTiming = timing.entryTimings[idx];

    // Video Source
    const videoAsset = entry.video_asset_id ? assetMap.get(entry.video_asset_id) : null;
    const videoSource: ManifestSourceRef = videoAsset
      ? {
          type: videoAsset.is_external ? 'external_url' : 'supabase_storage',
          path: videoAsset.storage_path,
          url: videoAsset.external_url || videoAsset.storage_path,
          mimeType: videoAsset.mime_type,
          fileSizeBytes: videoAsset.file_size,
        }
      : {
          type: 'none',
          path: '',
        };

    // Image Source (Keyframe/Storyboard)
    const imageAsset = entry.image_asset_id ? assetMap.get(entry.image_asset_id) : null;
    const imageSource: ManifestSourceRef = imageAsset
      ? {
          type: imageAsset.is_external ? 'external_url' : 'supabase_storage',
          path: imageAsset.storage_path,
          url: imageAsset.external_url || imageAsset.storage_path,
          mimeType: imageAsset.mime_type,
        }
      : {
          type: 'none',
          path: '',
        };

    // Dialogue Lines for this shot
    const dialogueList: ManifestDialogueRef[] = (shot?.dialogue || []).map((d) => {
      const char = d.characterId ? characterMap.get(d.characterId) : null;
      return {
        characterName: char?.name || 'Unknown Speaker',
        characterId: d.characterId,
        text: d.text,
        delivery: d.delivery,
      };
    });

    // Associated Audio Tracks for this entry
    const entryAudioTracks: ManifestAudioItem[] = audioTracks
      .filter((t) => t.sequence_entry_id === entry.id)
      .map((t) => {
        const audioAsset = t.audio_asset_id ? assetMap.get(t.audio_asset_id) : null;
        const char = t.character_id ? characterMap.get(t.character_id) : null;
        return {
          id: t.id,
          type: t.audio_type,
          title: t.title,
          speaker: char?.name,
          text: t.text || undefined,
          status: t.status,
          startTimeSeconds: Number(t.start_time_seconds) || 0,
          durationSeconds: t.duration_seconds ?? null,
          inPointSeconds: t.in_point_seconds ?? null,
          outPointSeconds: t.out_point_seconds ?? null,
          notes: t.notes || undefined,
          source: audioAsset
            ? {
                type: audioAsset.is_external ? 'external_url' : 'supabase_storage',
                path: audioAsset.storage_path,
                url: audioAsset.external_url || audioAsset.storage_path,
                mimeType: audioAsset.mime_type,
              }
            : {
                type: 'none',
                path: '',
              },
        };
      });

    return {
      order: entry.sequence_order,
      entryId: entry.id,
      sceneId: scene?.id || '',
      sceneOrder: scene?.scene_order || 1,
      sceneTitle: scene?.title || 'Untitled Scene',
      shotId: shot?.id || entry.shot_id,
      shotOrder: shot?.shot_order || 1,
      shotTitle: shot?.title || 'Untitled Shot',
      shotType: shot?.shot_type,
      cameraMovement: shot?.camera_movement,
      action: shot?.action,
      productionStatus: shot?.production_status,
      plannedDurationSeconds: shot ? Number(shot.duration_seconds) || 0 : 0,
      durationSeconds: entryTiming?.effectiveDurationSeconds ?? null,
      durationStatus: entryTiming?.isDurationEstimated ? 'estimated' : 'verified',
      inPointSeconds: entry.in_point_seconds ?? null,
      outPointSeconds: entry.out_point_seconds ?? null,
      videoAssetId: entry.video_asset_id || null,
      videoSource,
      videoAsset: videoAsset
        ? {
            id: videoAsset.id,
            name: videoAsset.display_name,
            url: videoAsset.external_url || videoAsset.storage_path,
            storagePath: videoAsset.storage_path,
            durationSeconds: videoAsset.duration_seconds,
          }
        : undefined,
      imageAssetId: entry.image_asset_id || null,
      imageSource,
      transitionType: entry.transition_type || 'cut',
      transitionDurationSeconds: entry.transition_duration_seconds || 0,
      dialogue: dialogueList,
      audio: entryAudioTracks,
      notes: entry.notes || '',
    };
  });

  const report: SequenceReadinessReport =
    typeof readinessReportOrDraftOverride === 'object' && readinessReportOrDraftOverride !== null
      ? readinessReportOrDraftOverride
      : evaluateSequenceReadiness(
          sequence,
          entries,
          shots,
          scenes,
          assets,
          audioTracks,
          Boolean(readinessReportOrDraftOverride)
        );

  const unresolvedWarnings: string[] = (report.findings || [])
    .filter((f) => f.severity === 'warning' || f.severity === 'error')
    .map((f) => `[${f.severity.toUpperCase()}] ${f.message}`);

  return {
    manifestSchemaVersion: '1.0',
    exportTimestamp: new Date().toISOString(),
    project: {
      id: project.id,
      projectId: project.id,
      title: project.title,
      aspectRatio: project.aspect_ratio || '16:9',
      visualStyle: project.visual_style || 'Grounded cinematic realism',
      language: project.language || 'English',
      genre: project.genre || '',
    },
    sequence: {
      id: sequence.id,
      sequenceId: sequence.id,
      title: sequence.title,
      version: sequence.version || 1,
      description: sequence.description || '',
      totalAssembledDurationSeconds: timing.totalAssembledSeconds,
      totalAssembledFormatted: timing.totalAssembledFormatted,
      totalPlannedDurationSeconds: timing.totalPlannedSeconds,
      readinessStatus: {
        isFinalCutReady: Boolean(report.isFinalCutReady),
        errorsCount: report.errorsCount || 0,
        warningsCount: report.warningsCount || 0,
        unapprovedShotsCount: sortedEntries.filter(
          (e) => (shotMap.get(e.shot_id)?.production_status || 'Not Started') !== 'Approved'
        ).length,
        missingMediaCount: sortedEntries.filter((e) => !e.video_asset_id).length,
      },
      entries: manifestEntries,
    },
    unresolvedWarnings: unresolvedWarnings.length > 0 ? unresolvedWarnings : undefined,
  };
}

/**
 * Triggers a browser download of the Production Manifest JSON file.
 */
export function downloadManifestJson(manifest: ProductionManifest, filename?: string): void {
  const safeTitle = manifest.project.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const safeSeq = manifest.sequence.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const name = filename || `${safeTitle}_${safeSeq}_v${manifest.sequence.version}_manifest.json`;

  const jsonStr = JSON.stringify(manifest, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
