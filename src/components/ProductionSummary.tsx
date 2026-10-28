/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type {
  Project,
  Scene,
  Shot,
  Character,
  Location,
} from '../types/database.ts';
import {
  Film,
  Camera,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Users,
  MapPin,
  Image,
  Video,
  Layers,
} from 'lucide-react';

interface ProductionSummaryProps {
  project: Project;
  scenes: Scene[];
  shots: Shot[];
  characters: Character[];
  locations: Location[];
  onSelectScene?: (sceneId: string) => void;
}

export const ProductionSummary: React.FC<ProductionSummaryProps> = ({
  project,
  scenes,
  shots,
  characters,
  locations,
  onSelectScene,
}) => {
  // 1. Calculate Runtimes
  const totalSeconds = shots.reduce(
    (acc, sh) => acc + (Number(sh.duration_seconds) || 0),
    0
  );
  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = Math.round(totalSeconds % 60);

  // 2. Production Health & Quality Checks
  // A. Shots missing image prompts
  const shotsMissingImagePrompt = shots.filter(
    (sh) => !sh.image_prompt || !sh.image_prompt.trim()
  );

  // B. Shots missing motion prompts
  const shotsMissingMotionPrompt = shots.filter(
    (sh) => !sh.motion_prompt || !sh.motion_prompt.trim()
  );

  // C. Dialogue with unresolved character references
  const characterIds = new Set(characters.map((c) => c.id));
  const unresolvedDialogue: { shotTitle: string; sceneOrder: number; characterId: string }[] = [];
  shots.forEach((sh) => {
    const parentScene = scenes.find((s) => s.id === sh.scene_id);
    (sh.dialogue || []).forEach((d) => {
      if (d.characterId && !characterIds.has(d.characterId)) {
        unresolvedDialogue.push({
          shotTitle: sh.title,
          sceneOrder: parentScene?.scene_order || 0,
          characterId: d.characterId,
        });
      }
    });
  });

  // D. Incomplete or missing continuity notes
  const scenesMissingContinuity = scenes.filter(
    (s) => !s.continuity_notes || !s.continuity_notes.trim()
  );
  const charactersMissingContinuity = characters.filter(
    (c) => !c.continuity_notes || !c.continuity_notes.trim()
  );

  // Scene durations breakdown
  const sceneDurations = scenes.map((sc) => {
    const scShots = shots.filter((sh) => sh.scene_id === sc.id);
    const dur = scShots.reduce((acc, sh) => acc + (Number(sh.duration_seconds) || 0), 0);
    return {
      scene: sc,
      shotCount: scShots.length,
      durationSeconds: dur,
      durationFormatted: `${Math.floor(dur / 60)}m ${Math.round(dur % 60)}s`,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 font-cinematic flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-400" />
          Production Summary & Health Checks
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Real-time metrics, scene duration distributions, and production asset readiness checks
        </p>
      </div>

      {/* High Level Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#141518] border border-zinc-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="uppercase tracking-wider text-[10px]">Total Runtime</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-cinematic text-zinc-100">
            {totalMinutes}m {remainingSeconds}s
          </div>
          <span className="text-[11px] text-zinc-500">{totalSeconds.toFixed(1)} seconds</span>
        </div>

        <div className="p-4 bg-[#141518] border border-zinc-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="uppercase tracking-wider text-[10px]">Scenes</span>
            <Film className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-cinematic text-zinc-100">
            {scenes.length}
          </div>
          <span className="text-[11px] text-zinc-500">
            {scenes.length > 0 ? `Avg ~${(totalSeconds / scenes.length).toFixed(0)}s per scene` : 'None'}
          </span>
        </div>

        <div className="p-4 bg-[#141518] border border-zinc-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="uppercase tracking-wider text-[10px]">Planned Shots</span>
            <Camera className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-cinematic text-zinc-100">
            {shots.length}
          </div>
          <span className="text-[11px] text-zinc-500">
            {shots.length > 0 ? `Avg ~${(totalSeconds / shots.length).toFixed(1)}s per shot` : 'None'}
          </span>
        </div>

        <div className="p-4 bg-[#141518] border border-zinc-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="uppercase tracking-wider text-[10px]">Bibles & Assets</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-cinematic text-zinc-100">
            {characters.length + locations.length}
          </div>
          <span className="text-[11px] text-zinc-500">
            {characters.length} characters, {locations.length} locations
          </span>
        </div>
      </div>

      {/* Production Health & Quality Checklist */}
      <div className="bg-[#141518] border border-zinc-800 rounded-2xl p-5 md:p-6 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200 font-cinematic uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-400" />
          Production Integrity & Asset Checklist
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Image Prompts */}
          <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <Image className="w-4 h-4 text-amber-400" />
                Image Generation Prompts
              </span>
              {shotsMissingImagePrompt.length === 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium text-[11px]">
                  All Set ({shots.length}/{shots.length})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium text-[11px]">
                  {shotsMissingImagePrompt.length} Missing
                </span>
              )}
            </div>

            {shotsMissingImagePrompt.length > 0 ? (
              <p className="text-zinc-400 text-[11px]">
                {shotsMissingImagePrompt.length} shot(s) lack prompt descriptions for visual rendering.
              </p>
            ) : (
              <p className="text-emerald-400/90 text-[11px]">
                Every planned shot includes a detailed image generation prompt.
              </p>
            )}
          </div>

          {/* Motion Prompts */}
          <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-amber-400" />
                Video Motion Prompts
              </span>
              {shotsMissingMotionPrompt.length === 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium text-[11px]">
                  All Set ({shots.length}/{shots.length})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium text-[11px]">
                  {shotsMissingMotionPrompt.length} Missing
                </span>
              )}
            </div>

            {shotsMissingMotionPrompt.length > 0 ? (
              <p className="text-zinc-400 text-[11px]">
                {shotsMissingMotionPrompt.length} shot(s) lack motion or camera movement prompts.
              </p>
            ) : (
              <p className="text-emerald-400/90 text-[11px]">
                Every shot has explicit camera tracking and motion guidelines.
              </p>
            )}
          </div>

          {/* Dialogue References */}
          <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                Dialogue Character References
              </span>
              {unresolvedDialogue.length === 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium text-[11px]">
                  All Resolved
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-medium text-[11px]">
                  {unresolvedDialogue.length} Unresolved
                </span>
              )}
            </div>

            {unresolvedDialogue.length > 0 ? (
              <p className="text-red-300 text-[11px]">
                {unresolvedDialogue.length} dialogue line(s) reference unknown character IDs.
              </p>
            ) : (
              <p className="text-emerald-400/90 text-[11px]">
                All dialogue lines correctly link to defined Character Bible dossiers.
              </p>
            )}
          </div>

          {/* Continuity Notes */}
          <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Continuity Guidelines
              </span>
              {scenesMissingContinuity.length === 0 && charactersMissingContinuity.length === 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium text-[11px]">
                  Fully Documented
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium text-[11px]">
                  Partial Notes
                </span>
              )}
            </div>

            <p className="text-zinc-400 text-[11px]">
              {scenes.length - scenesMissingContinuity.length}/{scenes.length} scenes and{' '}
              {characters.length - charactersMissingContinuity.length}/{characters.length} characters
              have continuity rules documented.
            </p>
          </div>
        </div>
      </div>

      {/* Scene-by-Scene Duration Breakdown */}
      <div className="bg-[#141518] border border-zinc-800 rounded-2xl p-5 md:p-6 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200 font-cinematic uppercase tracking-wider">
          Scene-by-Scene Duration Breakdown
        </h3>

        {sceneDurations.length === 0 ? (
          <p className="text-zinc-500 text-xs">No scenes in this project.</p>
        ) : (
          <div className="space-y-2.5">
            {sceneDurations.map(({ scene, shotCount, durationSeconds: dur, durationFormatted }) => {
              const percentage = totalSeconds > 0 ? (dur / totalSeconds) * 100 : 0;

              return (
                <div
                  key={scene.id}
                  onClick={() => onSelectScene?.(scene.id)}
                  className="p-3.5 bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-400">Scene {scene.scene_order}:</span>
                      <span className="font-semibold text-zinc-200 truncate">{scene.title}</span>
                      {scene.time_of_day && (
                        <span className="text-[10px] text-zinc-400">({scene.time_of_day})</span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.max(2, percentage)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-zinc-400 text-right shrink-0">
                    <span>{shotCount} {shotCount === 1 ? 'shot' : 'shots'}</span>
                    <span className="font-semibold text-zinc-100 font-mono w-16">
                      {durationFormatted}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
