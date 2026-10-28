/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Project,
  Scene,
  Shot,
  Character,
  Location,
  ProductionAsset,
  FolkverseBlueprint,
  BlueprintScene,
  BlueprintShot,
  BlueprintCharacter,
  BlueprintLocation,
  QualityFinding,
  QualityReport,
  RuntimeReport,
  SceneRuntimeSummary,
  FindingSeverity,
  FindingCategory,
} from '../types/database.ts';

// Storage key prefix for user review decisions
const REVIEW_STORAGE_PREFIX = 'folkverse_qc_reviewed_';

/**
 * In-memory fallback for environments without localStorage (e.g. Node / Vitest)
 */
const memoryReviewStore = new Map<string, Record<string, { reviewedAt: string; fingerprint: string }>>();

export function getReviewedDecisions(projectId: string): Record<string, { reviewedAt: string; fingerprint: string }> {
  if (!projectId) return {};
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(`${REVIEW_STORAGE_PREFIX}${projectId}`);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch {
    // Fall back to memory store
  }
  return memoryReviewStore.get(projectId) || {};
}

export function markFindingReviewed(
  projectId: string,
  findingId: string,
  fingerprint: string
): void {
  if (!projectId || !findingId) return;
  const current = getReviewedDecisions(projectId);
  const updated = {
    ...current,
    [findingId]: {
      reviewedAt: new Date().toISOString(),
      fingerprint,
    },
  };

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`${REVIEW_STORAGE_PREFIX}${projectId}`, JSON.stringify(updated));
    }
  } catch {
    // Ignore storage quota
  }
  memoryReviewStore.set(projectId, updated);
}

export function unmarkFindingReviewed(projectId: string, findingId: string): void {
  if (!projectId || !findingId) return;
  const current = getReviewedDecisions(projectId);
  if (!current[findingId]) return;

  const { [findingId]: _, ...rest } = current;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`${REVIEW_STORAGE_PREFIX}${projectId}`, JSON.stringify(rest));
    }
  } catch {
    // Ignore
  }
  memoryReviewStore.set(projectId, rest);
}

export function clearReviewedDecisions(projectId: string): void {
  if (!projectId) return;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(`${REVIEW_STORAGE_PREFIX}${projectId}`);
    }
  } catch {
    // Ignore
  }
  memoryReviewStore.delete(projectId);
}

/**
 * Calculates deterministic project and scene runtimes from shots.
 * Guarantees every shot is counted exactly once by unique ID.
 */
export function calculateProductionRuntime(shots: Shot[]): RuntimeReport {
  // Deduplicate shots by ID to prevent double counting
  const seenShotIds = new Set<string>();
  const uniqueShots: Shot[] = [];
  shots.forEach((sh, idx) => {
    const id = sh.id || `shot_index_${idx}`;
    if (!seenShotIds.has(id)) {
      seenShotIds.add(id);
      uniqueShots.push(sh);
    }
  });

  let totalSeconds = 0;
  const sceneDurations: Record<string, { seconds: number; count: number }> = {};

  uniqueShots.forEach((sh) => {
    const dur = Math.max(0, Number(sh.duration_seconds) || 0);
    totalSeconds += dur;

    const scId = sh.scene_id || 'unassigned';
    if (!sceneDurations[scId]) {
      sceneDurations[scId] = { seconds: 0, count: 0 };
    }
    sceneDurations[scId].seconds += dur;
    sceneDurations[scId].count += 1;
  });

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);

  let totalFormatted = '';
  if (hours > 0) {
    totalFormatted = `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  } else {
    totalFormatted = `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  const sceneRuntimes: Record<string, SceneRuntimeSummary> = {};
  Object.entries(sceneDurations).forEach(([scId, data]) => {
    const scMins = Math.floor(data.seconds / 60);
    const scSecs = Math.round(data.seconds % 60);
    sceneRuntimes[scId] = {
      sceneId: scId,
      durationSeconds: data.seconds,
      formatted: `${scMins}m ${String(scSecs).padStart(2, '0')}s`,
      shotCount: data.count,
    };
  });

  return {
    totalSeconds,
    totalFormatted,
    hours,
    minutes,
    seconds,
    sceneRuntimes,
  };
}

/**
 * Helper to build deterministic finding IDs
 */
function buildFindingId(
  ruleId: string,
  targetType: 'project' | 'scene' | 'shot' | 'character' | 'location',
  targetId: string,
  extraKey?: string
): string {
  return `${ruleId}:${targetType}:${targetId}${extraKey ? `:${extraKey}` : ''}`;
}

/**
 * Computes deterministic data fingerprint for change invalidation
 */
function computeRecordFingerprint(data: Record<string, unknown>): string {
  const parts = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(';');

  // Simple, deterministic string hash
  let hash = 0;
  for (let i = 0; i < parts.length; i++) {
    const char = parts.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

/**
 * Comprehensive Quality-Control Engine
 * Analyzes project data and returns deterministic findings and runtime metrics.
 */
export function analyzeProjectQuality(
  project: Project,
  scenes: Scene[],
  shots: Shot[],
  characters: Character[],
  locations: Location[],
  assets: ProductionAsset[] = [],
  options: {
    reviewedDecisions?: Record<string, { reviewedAt: string; fingerprint: string }>;
  } = {}
): QualityReport {
  const findings: QualityFinding[] = [];
  const reviewedMap = options.reviewedDecisions || getReviewedDecisions(project.id);

  // Runtime calculation
  const runtime = calculateProductionRuntime(shots);

  // Registries for relational validation
  const characterMap = new Map<string, Character>();
  const characterIdCounts = new Map<string, number>();
  characters.forEach((c) => {
    characterMap.set(c.id, c);
    characterIdCounts.set(c.id, (characterIdCounts.get(c.id) || 0) + 1);
  });

  const locationMap = new Map<string, Location>();
  const locationIdCounts = new Map<string, number>();
  locations.forEach((l) => {
    locationMap.set(l.id, l);
    locationIdCounts.set(l.id, (locationIdCounts.get(l.id) || 0) + 1);
  });

  const sceneMap = new Map<string, Scene>();
  const sceneIdCounts = new Map<string, number>();
  const sceneOrderCounts = new Map<number, Scene[]>();
  scenes.forEach((s) => {
    sceneMap.set(s.id, s);
    sceneIdCounts.set(s.id, (sceneIdCounts.get(s.id) || 0) + 1);

    const ord = s.scene_order ?? 1;
    if (!sceneOrderCounts.has(ord)) {
      sceneOrderCounts.set(ord, []);
    }
    sceneOrderCounts.get(ord)!.push(s);
  });

  const shotMap = new Map<string, Shot>();
  const shotIdCounts = new Map<string, number>();
  const sceneShotOrderCounts = new Map<string, Map<number, Shot[]>>();
  shots.forEach((sh) => {
    shotMap.set(sh.id, sh);
    shotIdCounts.set(sh.id, (shotIdCounts.get(sh.id) || 0) + 1);

    if (!sceneShotOrderCounts.has(sh.scene_id)) {
      sceneShotOrderCounts.set(sh.scene_id, new Map());
    }
    const orderMap = sceneShotOrderCounts.get(sh.scene_id)!;
    const ord = sh.shot_order ?? 1;
    if (!orderMap.has(ord)) {
      orderMap.set(ord, []);
    }
    orderMap.get(ord)!.push(sh);
  });

  // Helper to append a finding with resolution and reviewed status
  const addFinding = (f: {
    ruleId: string;
    severity: FindingSeverity;
    category: FindingCategory;
    message: string;
    explanation: string;
    suggestedResolution: string;
    projectId?: string;
    sceneId?: string;
    shotId?: string;
    characterId?: string;
    locationId?: string;
    fieldName?: string;
    targetType: 'project' | 'scene' | 'shot' | 'character' | 'location';
    targetId: string;
    extraKey?: string;
    fingerprintData: Record<string, unknown>;
  }) => {
    const id = buildFindingId(f.ruleId, f.targetType, f.targetId, f.extraKey);
    const fingerprint = computeRecordFingerprint(f.fingerprintData);
    const canBeReviewed = f.severity !== 'error'; // Structural errors CANNOT be marked reviewed

    const reviewEntry = reviewedMap[id];
    const isReviewed = canBeReviewed && reviewEntry ? reviewEntry.fingerprint === fingerprint : false;

    findings.push({
      id,
      ruleId: f.ruleId,
      severity: f.severity,
      category: f.category,
      message: f.message,
      explanation: f.explanation,
      suggestedResolution: f.suggestedResolution,
      canBeReviewed,
      isResolved: false, // If the finding was raised, it is not resolved in the active data
      isReviewed,
      fingerprint,
      projectId: f.projectId || project.id,
      sceneId: f.sceneId,
      shotId: f.shotId,
      characterId: f.characterId,
      locationId: f.locationId,
      fieldName: f.fieldName,
    });
  };

  // ==========================================================================
  // 1. DUPLICATE ID CHECKS (STRUCTURAL ERRORS)
  // ==========================================================================

  // A. Duplicate Character IDs
  characterIdCounts.forEach((count, charId) => {
    if (count > 1) {
      addFinding({
        ruleId: 'ERR_DUPLICATE_CHARACTER_ID',
        severity: 'error',
        category: 'structure',
        targetType: 'character',
        targetId: charId,
        message: `Duplicate Character ID detected: "${charId}" is defined ${count} times.`,
        explanation: 'Character IDs must be globally unique to guarantee unambiguous scene and shot referencing.',
        suggestedResolution: 'Ensure every character in the Bible has a unique identifier.',
        characterId: charId,
        fingerprintData: { charId, count },
      });
    }
  });

  // B. Duplicate Location IDs
  locationIdCounts.forEach((count, locId) => {
    if (count > 1) {
      addFinding({
        ruleId: 'ERR_DUPLICATE_LOCATION_ID',
        severity: 'error',
        category: 'structure',
        targetType: 'location',
        targetId: locId,
        message: `Duplicate Location ID detected: "${locId}" is defined ${count} times.`,
        explanation: 'Location IDs must be unique across the project Bible.',
        suggestedResolution: 'Ensure each location record has a distinct unique identifier.',
        locationId: locId,
        fingerprintData: { locId, count },
      });
    }
  });

  // C. Duplicate Scene IDs
  sceneIdCounts.forEach((count, scId) => {
    if (count > 1) {
      addFinding({
        ruleId: 'ERR_DUPLICATE_SCENE_ID',
        severity: 'error',
        category: 'structure',
        targetType: 'scene',
        targetId: scId,
        message: `Duplicate Scene ID detected: "${scId}" is defined ${count} times.`,
        explanation: 'Scene IDs must be unique across the narrative timeline.',
        suggestedResolution: 'Regenerate or assign distinct IDs to duplicate scenes.',
        sceneId: scId,
        fingerprintData: { scId, count },
      });
    }
  });

  // D. Duplicate Shot IDs
  shotIdCounts.forEach((count, shId) => {
    if (count > 1) {
      addFinding({
        ruleId: 'ERR_DUPLICATE_SHOT_ID',
        severity: 'error',
        category: 'structure',
        targetType: 'shot',
        targetId: shId,
        message: `Duplicate Shot ID detected: "${shId}" is defined ${count} times.`,
        explanation: 'Shot IDs must be unique to ensure accurate asset binding and sequencing.',
        suggestedResolution: 'Assign distinct IDs to each shot.',
        shotId: shId,
        fingerprintData: { shId, count },
      });
    }
  });

  // E. Duplicate Scene Orders
  sceneOrderCounts.forEach((scList, orderNum) => {
    if (scList.length > 1) {
      scList.forEach((sc) => {
        addFinding({
          ruleId: 'ERR_DUPLICATE_SCENE_ORDER',
          severity: 'error',
          category: 'structure',
          targetType: 'scene',
          targetId: sc.id,
          extraKey: `order_${orderNum}`,
          message: `Scene "${sc.title}" shares order position #${orderNum} with another scene.`,
          explanation: 'Scene ordering defines the sequential timeline of your story.',
          suggestedResolution: 'Reorder scenes using the Scene Planner drag-and-drop or order field.',
          sceneId: sc.id,
          fieldName: 'scene_order',
          fingerprintData: { sceneId: sc.id, orderNum, totalWithOrder: scList.length },
        });
      });
    }
  });

  // F. Duplicate Shot Orders within the same scene
  sceneShotOrderCounts.forEach((orderMap, scId) => {
    orderMap.forEach((shList, orderNum) => {
      if (shList.length > 1) {
        shList.forEach((sh) => {
          addFinding({
            ruleId: 'ERR_DUPLICATE_SHOT_ORDER',
            severity: 'error',
            category: 'structure',
            targetType: 'shot',
            targetId: sh.id,
            extraKey: `order_${orderNum}`,
            message: `Shot "${sh.title}" shares order index #${orderNum} with another shot in the same scene.`,
            explanation: 'Each shot in a scene must have a unique sequential ordering index.',
            suggestedResolution: 'Adjust shot order sequence in the Shot Planner.',
            sceneId: scId,
            shotId: sh.id,
            fieldName: 'shot_order',
            fingerprintData: { shotId: sh.id, sceneId: scId, orderNum, count: shList.length },
          });
        });
      }
    });
  });

  // ==========================================================================
  // 2. CHARACTER VALIDATION & CONTINUITY
  // ==========================================================================

  characters.forEach((char) => {
    const hasAppearance = Boolean(char.appearance?.trim());
    const hasWardrobe = Boolean(char.wardrobe?.trim());
    const hasContinuityNotes = Boolean(char.continuity_notes?.trim());

    // Missing appearance
    if (!hasAppearance) {
      addFinding({
        ruleId: 'WARN_CHAR_MISSING_APPEARANCE',
        severity: 'warning',
        category: 'character_continuity',
        targetType: 'character',
        targetId: char.id,
        fieldName: 'appearance',
        message: `Character "${char.name}" has no appearance description.`,
        explanation: 'Visual features (facial structure, hair, build, distinctive marks) maintain character fidelity across shots.',
        suggestedResolution: 'Fill in character appearance in the Character Bible.',
        characterId: char.id,
        fingerprintData: { charId: char.id, name: char.name, appearance: char.appearance },
      });
    }

    // Missing wardrobe
    if (!hasWardrobe) {
      addFinding({
        ruleId: 'WARN_CHAR_MISSING_WARDROBE',
        severity: 'warning',
        category: 'character_continuity',
        targetType: 'character',
        targetId: char.id,
        fieldName: 'wardrobe',
        message: `Character "${char.name}" has no wardrobe description.`,
        explanation: 'Wardrobe descriptions ensure clothing colors, cultural textures, and accessories remain uniform across production.',
        suggestedResolution: 'Add standard or ceremonial wardrobe details in the Character Bible.',
        characterId: char.id,
        fingerprintData: { charId: char.id, name: char.name, wardrobe: char.wardrobe },
      });
    }

    // Continuity notes reminder
    if (hasContinuityNotes) {
      addFinding({
        ruleId: 'INFO_CHAR_CONTINUITY_NOTES',
        severity: 'info',
        category: 'character_continuity',
        targetType: 'character',
        targetId: char.id,
        fieldName: 'continuity_notes',
        message: `Continuity Directives for "${char.name}": ${char.continuity_notes}`,
        explanation: 'Mandatory wardrobe folds, jewelry, scars, or facial paint that must be checked when reviewing shots and prompts.',
        suggestedResolution: 'Verify these directives when reviewing shots where this character appears.',
        characterId: char.id,
        fingerprintData: { charId: char.id, notes: char.continuity_notes },
      });
    }
  });

  // ==========================================================================
  // 3. LOCATION VALIDATION & CONTINUITY
  // ==========================================================================

  locations.forEach((loc) => {
    const hasVisualNotes = Boolean(loc.visual_notes?.trim());
    if (!hasVisualNotes) {
      addFinding({
        ruleId: 'WARN_LOCATION_MISSING_VISUAL_NOTES',
        severity: 'warning',
        category: 'location_continuity',
        targetType: 'location',
        targetId: loc.id,
        fieldName: 'visual_notes',
        message: `Location "${loc.name}" has no visual notes or atmospheric lighting guidance.`,
        explanation: 'Visual notes guide lighting continuity, background architecture, and color grading across scenes in this location.',
        suggestedResolution: 'Add architectural style, environmental conditions, and default lighting in the Location Bible.',
        locationId: loc.id,
        fingerprintData: { locId: loc.id, name: loc.name, visualNotes: loc.visual_notes },
      });
    }
  });

  // ==========================================================================
  // 4. SCENE VALIDATION & CONTINUITY
  // ==========================================================================

  scenes.forEach((sc) => {
    // Missing scene title
    if (!sc.title || !sc.title.trim()) {
      addFinding({
        ruleId: 'ERR_SCENE_MISSING_TITLE',
        severity: 'error',
        category: 'structure',
        targetType: 'scene',
        targetId: sc.id,
        fieldName: 'title',
        message: `Scene ID "${sc.id}" is missing a title.`,
        explanation: 'Every scene must have a descriptive title for narrative planning.',
        suggestedResolution: 'Assign a title to this scene in the Scene Planner.',
        sceneId: sc.id,
        fingerprintData: { scId: sc.id, title: sc.title },
      });
    }

    // Invalid location reference
    if (sc.location_id && sc.location_id.trim()) {
      if (!locationMap.has(sc.location_id.trim())) {
        addFinding({
          ruleId: 'ERR_SCENE_INVALID_LOCATION',
          severity: 'error',
          category: 'structure',
          targetType: 'scene',
          targetId: sc.id,
          extraKey: sc.location_id,
          fieldName: 'location_id',
          message: `Scene "${sc.title}" references missing location ID "${sc.location_id}".`,
          explanation: 'The referenced location does not exist in the project Location Bible.',
          suggestedResolution: 'Select an existing location from the Location Bible or create this location record.',
          sceneId: sc.id,
          locationId: sc.location_id,
          fingerprintData: { sceneId: sc.id, locationId: sc.location_id },
        });
      } else {
        // Location Lighting Contrast Review
        const loc = locationMap.get(sc.location_id.trim())!;
        const locNotes = `${loc.visual_notes || ''} ${loc.description || ''}`.toLowerCase();
        const timeOfDay = (sc.time_of_day || '').toUpperCase();

        const mentionsBrightDay =
          locNotes.includes('afternoon') ||
          locNotes.includes('daylight') ||
          locNotes.includes('midday') ||
          locNotes.includes('bright sun');
        const mentionsNight =
          locNotes.includes('night') ||
          locNotes.includes('midnight') ||
          locNotes.includes('lanterns at night') ||
          locNotes.includes('darkness');

        if (mentionsBrightDay && (timeOfDay === 'NIGHT' || timeOfDay === 'DUSK')) {
          addFinding({
            ruleId: 'WARN_LIGHTING_CONTINUITY',
            severity: 'info',
            category: 'location_continuity',
            targetType: 'scene',
            targetId: sc.id,
            fieldName: 'time_of_day',
            message: `Lighting review reminder: Scene time of day (${timeOfDay}) contrasts with location default day notes.`,
            explanation: `Location "${loc.name}" describes day lighting ("${loc.visual_notes}"), while Scene "${sc.title}" is set at ${timeOfDay}. Creative shifts between daytime and nighttime are valid; review to confirm this intentional shift.`,
            suggestedResolution: 'Confirm that this scene intentionally takes place at a different time of day than the location default.',
            sceneId: sc.id,
            locationId: loc.id,
            fingerprintData: { sceneId: sc.id, locId: loc.id, timeOfDay, locNotes: loc.visual_notes },
          });
        } else if (mentionsNight && (timeOfDay === 'DAY' || timeOfDay === 'DAWN')) {
          addFinding({
            ruleId: 'WARN_LIGHTING_CONTINUITY',
            severity: 'info',
            category: 'location_continuity',
            targetType: 'scene',
            targetId: sc.id,
            fieldName: 'time_of_day',
            message: `Lighting review reminder: Scene time of day (${timeOfDay}) contrasts with location default night notes.`,
            explanation: `Location "${loc.name}" mentions night atmosphere ("${loc.visual_notes}"), while Scene "${sc.title}" is set at ${timeOfDay}. Confirm this intentional setting.`,
            suggestedResolution: 'Verify that daytime lighting is desired for this scene.',
            sceneId: sc.id,
            locationId: loc.id,
            fingerprintData: { sceneId: sc.id, locId: loc.id, timeOfDay, locNotes: loc.visual_notes },
          });
        }
      }
    }

    // Unresolved character references in scene
    if (sc.characters && Array.isArray(sc.characters)) {
      sc.characters.forEach((charId) => {
        if (!characterMap.has(charId)) {
          addFinding({
            ruleId: 'ERR_SCENE_INVALID_CHARACTER',
            severity: 'error',
            category: 'structure',
            targetType: 'scene',
            targetId: sc.id,
            extraKey: charId,
            fieldName: 'characters',
            message: `Scene "${sc.title}" references missing character ID "${charId}".`,
            explanation: 'The character ID referenced in this scene roster does not exist in the Character Bible.',
            suggestedResolution: 'Remove the invalid character reference or create the character in the Character Bible.',
            sceneId: sc.id,
            characterId: charId,
            fingerprintData: { sceneId: sc.id, charId },
          });
        }
      });
    }

    // Scene continuity notes accessibility
    if (sc.continuity_notes && sc.continuity_notes.trim()) {
      addFinding({
        ruleId: 'INFO_SCENE_CONTINUITY_NOTES',
        severity: 'info',
        category: 'location_continuity',
        targetType: 'scene',
        targetId: sc.id,
        fieldName: 'continuity_notes',
        message: `Scene "${sc.title}" Continuity Directives: ${sc.continuity_notes}`,
        explanation: 'Scene-level environmental continuity directives (e.g. weather shifts, firelight, crowd position) to keep in mind during shot generation.',
        suggestedResolution: 'Review these directives when producing shots for this scene.',
        sceneId: sc.id,
        fingerprintData: { sceneId: sc.id, notes: sc.continuity_notes },
      });
    }
  });

  // ==========================================================================
  // 5. SHOT COMPLETENESS, DIALOGUE, AND CONTINUITY CHECKS
  // ==========================================================================

  shots.forEach((sh) => {
    const parentScene = sceneMap.get(sh.scene_id);

    // A. Broken Scene Parent Reference
    if (!parentScene) {
      addFinding({
        ruleId: 'ERR_SHOT_INVALID_SCENE',
        severity: 'error',
        category: 'structure',
        targetType: 'shot',
        targetId: sh.id,
        extraKey: sh.scene_id,
        fieldName: 'scene_id',
        message: `Shot "${sh.title}" references non-existent parent scene ID "${sh.scene_id}".`,
        explanation: 'Every shot must belong to a valid parent scene in the project.',
        suggestedResolution: 'Move the shot to a valid scene using the move action in the Shot Planner.',
        shotId: sh.id,
        sceneId: sh.scene_id,
        fingerprintData: { shotId: sh.id, sceneId: sh.scene_id },
      });
    }

    // B. Missing Shot Title
    if (!sh.title || !sh.title.trim()) {
      addFinding({
        ruleId: 'ERR_SHOT_MISSING_TITLE',
        severity: 'error',
        category: 'shot_completeness',
        targetType: 'shot',
        targetId: sh.id,
        fieldName: 'title',
        message: `Shot ID "${sh.id}" has no title.`,
        explanation: 'Every shot requires a distinct label describing its framing or subject.',
        suggestedResolution: 'Provide a title for this shot in the Shot Planner.',
        shotId: sh.id,
        sceneId: sh.scene_id,
        fingerprintData: { shotId: sh.id, title: sh.title },
      });
    }

    // C. Invalid Duration
    const durNum = Number(sh.duration_seconds);
    if (sh.duration_seconds === undefined || sh.duration_seconds === null || isNaN(durNum) || durNum <= 0) {
      addFinding({
        ruleId: 'ERR_SHOT_INVALID_DURATION',
        severity: 'error',
        category: 'shot_completeness',
        targetType: 'shot',
        targetId: sh.id,
        fieldName: 'duration_seconds',
        message: `Shot "${sh.title}" has an invalid duration (${sh.duration_seconds}s). Duration must be greater than zero.`,
        explanation: 'Accurate shot durations are required for scene timing, editing pace, and video generation quotas.',
        suggestedResolution: 'Set a positive duration in seconds (e.g. 3, 5, or 8 seconds).',
        shotId: sh.id,
        sceneId: sh.scene_id,
        fingerprintData: { shotId: sh.id, duration: sh.duration_seconds },
      });
    }

    // D. Missing Action Description
    if (!sh.action || !sh.action.trim()) {
      addFinding({
        ruleId: 'WARN_SHOT_ACTION_MISSING',
        severity: 'warning',
        category: 'shot_completeness',
        targetType: 'shot',
        targetId: sh.id,
        fieldName: 'action',
        message: `Shot "${sh.title}" has no action description.`,
        explanation: 'An action description explains what takes place on camera for actors and animators.',
        suggestedResolution: 'Describe the primary kinetic and character action for this shot.',
        shotId: sh.id,
        sceneId: sh.scene_id,
        fingerprintData: { shotId: sh.id, action: sh.action },
      });
    }

    // E. Empty Image Prompt
    if (!sh.image_prompt || !sh.image_prompt.trim()) {
      addFinding({
        ruleId: 'INFO_SHOT_EMPTY_IMAGE_PROMPT',
        severity: 'info',
        category: 'shot_completeness',
        targetType: 'shot',
        targetId: sh.id,
        fieldName: 'image_prompt',
        message: `Shot "${sh.title}" has no image prompt defined.`,
        explanation: 'Production prompts are required before keyframe image generation can take place.',
        suggestedResolution: 'Craft a prompt detailing lighting, framing, composition, and visual textures.',
        shotId: sh.id,
        sceneId: sh.scene_id,
        fingerprintData: { shotId: sh.id, imagePrompt: sh.image_prompt },
      });
    }

    // F. Empty Motion Prompt
    if (!sh.motion_prompt || !sh.motion_prompt.trim()) {
      addFinding({
        ruleId: 'INFO_SHOT_EMPTY_MOTION_PROMPT',
        severity: 'info',
        category: 'shot_completeness',
        targetType: 'shot',
        targetId: sh.id,
        fieldName: 'motion_prompt',
        message: `Shot "${sh.title}" has no motion prompt defined.`,
        explanation: 'Motion prompts guide camera movement and character kinetic actions during video generation.',
        suggestedResolution: 'Add camera movement directions (e.g. slow dolly push-in, static hold, tracking shot).',
        shotId: sh.id,
        sceneId: sh.scene_id,
        fingerprintData: { shotId: sh.id, motionPrompt: sh.motion_prompt },
      });
    }

    // G. Shot Character References Validation
    const shotCharIds = Array.isArray(sh.characters) ? sh.characters : [];
    shotCharIds.forEach((charId) => {
      // 1. Broken character reference (Error)
      if (!characterMap.has(charId)) {
        addFinding({
          ruleId: 'ERR_SHOT_INVALID_CHARACTER',
          severity: 'error',
          category: 'character_continuity',
          targetType: 'shot',
          targetId: sh.id,
          extraKey: charId,
          fieldName: 'characters',
          message: `Shot "${sh.title}" references non-existent character ID "${charId}".`,
          explanation: 'The character assigned to this shot does not exist in the Character Bible.',
          suggestedResolution: 'Remove the invalid character reference or create this character in the Bible.',
          shotId: sh.id,
          sceneId: sh.scene_id,
          characterId: charId,
          fingerprintData: { shotId: sh.id, charId },
        });
      } else {
        const char = characterMap.get(charId)!;

        // 2. Character in Shot but not in Parent Scene (Warning)
        const sceneCharList = Array.isArray(parentScene?.characters) ? parentScene.characters : [];
        if (parentScene && !sceneCharList.includes(charId)) {
          addFinding({
            ruleId: 'WARN_CHAR_NOT_IN_SCENE',
            severity: 'warning',
            category: 'character_continuity',
            targetType: 'shot',
            targetId: sh.id,
            extraKey: charId,
            fieldName: 'characters',
            message: `Character "${char.name}" appears in Shot "${sh.title}", but is not declared in Scene "${parentScene.title}" roster.`,
            explanation: `The shot includes "${char.name}", but the character was omitted from the parent scene's character list. Variations are permitted for surprise or background entrances.`,
            suggestedResolution: `Add "${char.name}" to the parent scene character list or verify if this is an intentional brief appearance.`,
            shotId: sh.id,
            sceneId: parentScene.id,
            characterId: char.id,
            fingerprintData: {
              shotId: sh.id,
              shotTitle: sh.title,
              sceneId: parentScene.id,
              charId: char.id,
              sceneChars: sceneCharList,
              shotChars: sh.characters,
            },
          });
        }

        // 3. Character missing visual reference info
        const hasVisuals =
          Boolean(char.appearance?.trim()) ||
          Boolean(char.wardrobe?.trim()) ||
          Boolean(char.reference_image_url?.trim());
        if (!hasVisuals) {
          addFinding({
            ruleId: 'WARN_SHOT_CHAR_MISSING_VISUAL_REF',
            severity: 'warning',
            category: 'character_continuity',
            targetType: 'shot',
            targetId: sh.id,
            extraKey: charId,
            message: `Shot "${sh.title}" includes "${char.name}", who lacks appearance, wardrobe, and visual reference imagery.`,
            explanation: 'Generation models and storyboard artists require visual reference descriptions to maintain character likeness.',
            suggestedResolution: `Complete ${char.name}'s appearance and wardrobe in the Character Bible.`,
            shotId: sh.id,
            sceneId: sh.scene_id,
            characterId: char.id,
            fingerprintData: { shotId: sh.id, charId: char.id, appearance: char.appearance, wardrobe: char.wardrobe },
          });
        }

        // 4. Character Continuity Notes Keyword Check in Image Prompt
        if (char.continuity_notes && char.continuity_notes.trim()) {
          const notesText = char.continuity_notes.toLowerCase();
          const promptText = (sh.image_prompt || '').toLowerCase();

          // Extract meaningful keywords (>3 letters, ignoring common stop words)
          const stopWords = new Set([
            'always', 'never', 'must', 'with', 'from', 'have', 'preserve', 'across', 'every',
            'this', 'that', 'they', 'their', 'remain', 'identical', 'left', 'right', 'over', 'both'
          ]);

          const words = notesText
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter((w) => w.length > 3 && !stopWords.has(w));

          // If character has significant keywords and none appear in the image prompt
          const matchesKeyword = words.some((w) => promptText.includes(w));
          if (words.length > 0 && !matchesKeyword && sh.image_prompt?.trim()) {
            addFinding({
              ruleId: 'WARN_CONTINUITY_PROMPT_KEYWORD',
              severity: 'warning',
              category: 'character_continuity',
              targetType: 'shot',
              targetId: sh.id,
              extraKey: char.id,
              fieldName: 'image_prompt',
              message: `Continuity review: Shot image prompt does not mention key continuity notes for ${char.name}.`,
              explanation: `${char.name} has continuity directives ("${char.continuity_notes}"), but the shot image prompt does not explicitly mention these keywords. Note: A prompt that omits a phrase does not prove the generated image violates continuity.`,
              suggestedResolution: `Review the shot image prompt and verify whether specific character wardrobe or appearance directives should be explicitly prompted.`,
              shotId: sh.id,
              sceneId: sh.scene_id,
              characterId: char.id,
              fingerprintData: { shotId: sh.id, charId: char.id, prompt: sh.image_prompt, notes: char.continuity_notes },
            });
          }
        }
      }
    });

    // H. Dialogue Validation
    if (sh.dialogue && Array.isArray(sh.dialogue)) {
      sh.dialogue.forEach((dItem, dIdx) => {
        if (!dItem || typeof dItem !== 'object') {
          addFinding({
            ruleId: 'ERR_DIALOGUE_MALFORMED',
            severity: 'error',
            category: 'dialogue',
            targetType: 'shot',
            targetId: sh.id,
            extraKey: `dialogue_${dIdx}`,
            fieldName: 'dialogue',
            message: `Shot "${sh.title}" has an invalid dialogue record at index ${dIdx}.`,
            explanation: 'Dialogue records must be valid objects with dialogue text.',
            suggestedResolution: 'Correct or remove the malformed dialogue entry in the Shot Details panel.',
            shotId: sh.id,
            sceneId: sh.scene_id,
            fingerprintData: { shotId: sh.id, dIdx, item: dItem },
          });
          return;
        }

        // Empty dialogue text check
        if (!dItem.text || !dItem.text.trim()) {
          addFinding({
            ruleId: 'ERR_DIALOGUE_MALFORMED',
            severity: 'error',
            category: 'dialogue',
            targetType: 'shot',
            targetId: sh.id,
            extraKey: `empty_text_${dIdx}`,
            fieldName: 'dialogue',
            message: `Dialogue line #${dIdx + 1} in Shot "${sh.title}" has empty spoken text.`,
            explanation: 'Spoken dialogue entries must have non-empty line text or be removed.',
            suggestedResolution: 'Provide spoken dialogue or remove the empty line.',
            shotId: sh.id,
            sceneId: sh.scene_id,
            fingerprintData: { shotId: sh.id, dIdx, text: dItem.text },
          });
        }

        // Speaker reference check
        if (dItem.characterId && dItem.characterId.trim()) {
          if (!characterMap.has(dItem.characterId.trim())) {
            addFinding({
              ruleId: 'ERR_DIALOGUE_INVALID_CHARACTER',
              severity: 'error',
              category: 'dialogue',
              targetType: 'shot',
              targetId: sh.id,
              extraKey: `invalid_char_${dItem.characterId}`,
              fieldName: 'dialogue',
              message: `Dialogue in Shot "${sh.title}" references non-existent character ID "${dItem.characterId}".`,
              explanation: 'The speaker attributed to this line does not exist in the Character Bible.',
              suggestedResolution: 'Assign the line to an existing character or create the character in the Bible.',
              shotId: sh.id,
              sceneId: sh.scene_id,
              characterId: dItem.characterId,
              fingerprintData: { shotId: sh.id, dIdx, charId: dItem.characterId },
            });
          } else {
            const speaker = characterMap.get(dItem.characterId.trim())!;
            // Speaker not in shot characters warning
            if (!shotCharIds.includes(dItem.characterId.trim())) {
              addFinding({
                ruleId: 'WARN_DIALOGUE_CHAR_NOT_IN_SHOT',
                severity: 'warning',
                category: 'dialogue',
                targetType: 'shot',
                targetId: sh.id,
                extraKey: `speaker_not_in_shot_${dItem.characterId}`,
                fieldName: 'dialogue',
                message: `Dialogue speaker "${speaker.name}" is not included in the character list for Shot "${sh.title}".`,
                explanation: `The character speaking this line is not listed among the characters present in this shot. Off-screen (O.S.) or voiceover (V.O.) dialogue is valid.`,
                suggestedResolution: `Add "${speaker.name}" to the shot's characters, or confirm this line is spoken off-screen.`,
                shotId: sh.id,
                sceneId: sh.scene_id,
                characterId: speaker.id,
                fingerprintData: { shotId: sh.id, charId: speaker.id, shotChars: shotCharIds },
              });
            }
          }
        }
      });
    }

    // I. Phase 4 Production Asset Health (Informational Observations)
    if (assets.length > 0) {
      const hasShotImage = assets.some((a) => a.shot_id === sh.id && a.asset_type === 'image');
      const hasShotVideo = assets.some((a) => a.shot_id === sh.id && a.asset_type === 'video');

      if (!hasShotImage) {
        addFinding({
          ruleId: 'INFO_SHOT_MISSING_IMAGE_ASSET',
          severity: 'info',
          category: 'production_readiness',
          targetType: 'shot',
          targetId: sh.id,
          message: `Shot "${sh.title}" has no keyframe image asset attached.`,
          explanation: 'This shot has not yet had a preferred or draft image asset uploaded or linked.',
          suggestedResolution: 'Generate and upload an image keyframe in the Shot Details media panel.',
          shotId: sh.id,
          sceneId: sh.scene_id,
          fingerprintData: { shotId: sh.id, hasShotImage },
        });
      }

      if (!hasShotVideo) {
        addFinding({
          ruleId: 'INFO_SHOT_MISSING_VIDEO_ASSET',
          severity: 'info',
          category: 'production_readiness',
          targetType: 'shot',
          targetId: sh.id,
          message: `Shot "${sh.title}" has no video clip asset attached.`,
          explanation: 'This shot has not yet had video footage uploaded or linked.',
          suggestedResolution: 'Generate and link video footage when the keyframe and prompts are approved.',
          shotId: sh.id,
          sceneId: sh.scene_id,
          fingerprintData: { shotId: sh.id, hasShotVideo },
        });
      }
    }
  });

  // ==========================================================================
  // 6. SUMMARY METRICS CALCULATION
  // ==========================================================================

  let errorsCount = 0;
  let warningsCount = 0;
  let infoCount = 0;
  let reviewedCount = 0;
  let unresolvedCount = 0;

  const affectedSceneIds = new Set<string>();
  const affectedShotIds = new Set<string>();
  const shotsWithBrokenRefs = new Set<string>();
  const shotsRequiringContinuityReview = new Set<string>();

  const categoryCounts: Record<FindingCategory, number> = {
    structure: 0,
    character_continuity: 0,
    location_continuity: 0,
    shot_completeness: 0,
    dialogue: 0,
    production_readiness: 0,
  };

  findings.forEach((f) => {
    if (f.severity === 'error') errorsCount++;
    else if (f.severity === 'warning') warningsCount++;
    else if (f.severity === 'info') infoCount++;

    if (f.isReviewed) {
      reviewedCount++;
    } else {
      unresolvedCount++;
    }

    if (f.category && categoryCounts[f.category] !== undefined) {
      categoryCounts[f.category]++;
    }

    if (f.sceneId) affectedSceneIds.add(f.sceneId);
    if (f.shotId) {
      affectedShotIds.add(f.shotId);
      if (
        f.ruleId === 'ERR_SHOT_INVALID_CHARACTER' ||
        f.ruleId === 'ERR_SHOT_INVALID_SCENE' ||
        f.ruleId === 'ERR_DIALOGUE_INVALID_CHARACTER'
      ) {
        shotsWithBrokenRefs.add(f.shotId);
      }
      if (
        f.ruleId === 'WARN_CHAR_NOT_IN_SCENE' ||
        f.ruleId === 'WARN_CONTINUITY_PROMPT_KEYWORD' ||
        f.ruleId === 'WARN_SHOT_CHAR_MISSING_VISUAL_REF'
      ) {
        shotsRequiringContinuityReview.add(f.shotId);
      }
    }
  });

  const shotsMissingImagePromptsCount = shots.filter((sh) => !sh.image_prompt?.trim()).length;
  const shotsMissingMotionPromptsCount = shots.filter((sh) => !sh.motion_prompt?.trim()).length;

  return {
    findings,
    summary: {
      totalFindings: findings.length,
      errorsCount,
      warningsCount,
      infoCount,
      unresolvedCount,
      reviewedCount,
      affectedScenesCount: affectedSceneIds.size,
      affectedShotsCount: affectedShotIds.size,
      shotsMissingImagePromptsCount,
      shotsMissingMotionPromptsCount,
      shotsWithBrokenRefsCount: shotsWithBrokenRefs.size,
      shotsRequiringContinuityReviewCount: shotsRequiringContinuityReview.size,
      categoryCounts,
    },
    runtime,
  };
}

/**
 * Validates raw or parsed FolkverseBlueprint (v1.0) using the exact same deterministic QC engine.
 */
export function analyzeBlueprintQuality(
  blueprint: FolkverseBlueprint,
  options?: { reviewedDecisions?: Record<string, { reviewedAt: string; fingerprint: string }> }
): QualityReport {
  // Convert blueprint records into runtime model structures
  const project: Project = {
    id: 'blueprint_project',
    user_id: 'blueprint_user',
    title: blueprint.project?.title || 'Untitled Project',
    description: blueprint.project?.description || '',
    genre: blueprint.project?.genre || '',
    visual_style: blueprint.project?.visualStyle || '',
    aspect_ratio: blueprint.project?.aspectRatio || '16:9',
    language: blueprint.project?.language || 'English',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const characters: Character[] = (blueprint.characters || []).map((c: BlueprintCharacter, idx: number) => ({
    id: c.id || `char_${idx + 1}`,
    project_id: project.id,
    name: c.name || `Character ${idx + 1}`,
    role: c.role || null,
    description: null,
    appearance: c.appearance || null,
    personality: c.personality || null,
    age_description: c.ageDescription || null,
    wardrobe: c.wardrobe || null,
    reference_image_url: c.referenceImageUrl || null,
    continuity_notes: c.continuityNotes || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const locations: Location[] = (blueprint.locations || []).map((l: BlueprintLocation, idx: number) => ({
    id: l.id || `loc_${idx + 1}`,
    project_id: project.id,
    name: l.name || `Location ${idx + 1}`,
    description: l.description || null,
    visual_notes: l.visualNotes || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const scenes: Scene[] = [];
  const shots: Shot[] = [];

  (blueprint.scenes || []).forEach((sc: BlueprintScene, scIdx: number) => {
    const sceneId = sc.id || `scene_${scIdx + 1}`;
    scenes.push({
      id: sceneId,
      project_id: project.id,
      scene_order: sc.order ?? scIdx + 1,
      title: sc.title || `Scene ${scIdx + 1}`,
      location: null,
      location_id: sc.locationId || null,
      int_ext: null,
      time_of_day: sc.timeOfDay || 'DAY',
      content: null,
      summary: sc.summary || null,
      characters: Array.isArray(sc.characters) ? sc.characters : [],
      continuity_notes: sc.continuityNotes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    (sc.shots || []).forEach((sh: BlueprintShot, shIdx: number) => {
      shots.push({
        id: sh.id || `shot_${scIdx + 1}_${shIdx + 1}`,
        project_id: project.id,
        scene_id: sceneId,
        shot_order: sh.order ?? shIdx + 1,
        title: sh.title || `Shot ${shIdx + 1}`,
        shot_type: sh.shotType || 'Wide shot',
        camera_angle: sh.cameraAngle || 'Eye level',
        camera_movement: sh.cameraMovement || 'Static',
        duration_seconds: sh.durationSeconds,
        characters: Array.isArray(sh.characters) ? sh.characters : [],
        action: sh.action || '',
        image_prompt: sh.imagePrompt || '',
        motion_prompt: sh.motionPrompt || '',
        dialogue: Array.isArray(sh.dialogue) ? sh.dialogue : [],
        sound_effects: Array.isArray(sh.soundEffects) ? sh.soundEffects : [],
        music_cue: sh.musicCue || '',
        continuity_notes: sh.continuityNotes || '',
        production_status: 'Not Started',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });
  });

  return analyzeProjectQuality(project, scenes, shots, characters, locations, [], options);
}
