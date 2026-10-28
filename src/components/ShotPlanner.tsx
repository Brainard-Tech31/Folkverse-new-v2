/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type {
  Shot,
  Scene,
  Character,
  CreateShotInput,
  UpdateShotInput,
  DialogueItem,
} from '../types/database.ts';
import { ConfirmationModal } from './ConfirmationModal.tsx';
import {
  Camera,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Clock,
  MessageSquare,
  Sparkles,
  MoveRight,
  Music,
  Volume2,
  Image,
  Video,
  X,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ShotPlannerProps {
  projectId: string;
  scenes: Scene[];
  shots: Shot[];
  characters: Character[];
  activeSceneId?: string;
  isLoading: boolean;
  onCreateShot: (input: CreateShotInput) => Promise<void>;
  onUpdateShot: (shotId: string, input: UpdateShotInput) => Promise<void>;
  onReorderShots: (sceneId: string, orderedShotIds: string[]) => Promise<void>;
  onMoveShotToScene: (shotId: string, targetSceneId: string) => Promise<void>;
  onDeleteShot: (shotId: string) => Promise<void>;
}

const COMMON_SHOT_TYPES = [
  'Wide shot',
  'Establishing shot',
  'Medium shot',
  'Medium close-up',
  'Close-up',
  'Extreme close-up',
  'Over-the-shoulder',
  'Point of view (POV)',
  'Aerial / Drone shot',
];

const COMMON_ANGLES = [
  'Eye level',
  'Slight low angle',
  'Low angle',
  'High angle',
  'Bird’s eye',
  'Dutch angle',
];

const COMMON_MOVEMENTS = [
  'Static',
  'Slow push-in',
  'Pull-out',
  'Tracking shot',
  'Pan left',
  'Pan right',
  'Tilt up',
  'Tilt down',
  'Crane / Boom',
  'Steadicam / Handheld',
];

export const ShotPlanner: React.FC<ShotPlannerProps> = ({
  projectId,
  scenes,
  shots,
  characters,
  activeSceneId: initialActiveSceneId,
  isLoading,
  onCreateShot,
  onUpdateShot,
  onReorderShots,
  onMoveShotToScene,
  onDeleteShot,
}) => {
  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    initialActiveSceneId || (scenes.length > 0 ? scenes[0].id : '')
  );
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [movingShot, setMovingShot] = useState<Shot | null>(null);
  const [targetSceneId, setTargetSceneId] = useState<string>('');
  const [deletingShot, setDeletingShot] = useState<Shot | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedShotId, setExpandedShotId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [shotType, setShotType] = useState('Wide shot');
  const [cameraAngle, setCameraAngle] = useState('Eye level');
  const [cameraMovement, setCameraMovement] = useState('Static');
  const [durationSeconds, setDurationSeconds] = useState<number>(5);
  const [action, setAction] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [motionPrompt, setMotionPrompt] = useState('');
  const [soundEffectsText, setSoundEffectsText] = useState('');
  const [musicCue, setMusicCue] = useState('');
  const [continuityNotes, setContinuityNotes] = useState('');
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [dialogueList, setDialogueList] = useState<DialogueItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter shots for active scene
  const currentScene = scenes.find((s) => s.id === selectedSceneId) || scenes[0];
  const activeShots = shots
    .filter((sh) => sh.scene_id === (currentScene?.id || ''))
    .sort((a, b) => a.shot_order - b.shot_order);

  const resetForm = () => {
    setTitle('');
    setShotType('Wide shot');
    setCameraAngle('Eye level');
    setCameraMovement('Static');
    setDurationSeconds(5);
    setAction('');
    setImagePrompt('');
    setMotionPrompt('');
    setSoundEffectsText('');
    setMusicCue('');
    setContinuityNotes('');
    setSelectedChars([]);
    setDialogueList([]);
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (shot: Shot, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTitle(shot.title);
    setShotType(shot.shot_type || 'Wide shot');
    setCameraAngle(shot.camera_angle || 'Eye level');
    setCameraMovement(shot.camera_movement || 'Static');
    setDurationSeconds(Number(shot.duration_seconds) || 5);
    setAction(shot.action || '');
    setImagePrompt(shot.image_prompt || '');
    setMotionPrompt(shot.motion_prompt || '');
    setSoundEffectsText(Array.isArray(shot.sound_effects) ? shot.sound_effects.join(', ') : '');
    setMusicCue(shot.music_cue || '');
    setContinuityNotes(shot.continuity_notes || '');
    setSelectedChars(Array.isArray(shot.characters) ? shot.characters : []);
    setDialogueList(Array.isArray(shot.dialogue) ? [...shot.dialogue] : []);
    setFormError(null);
    setEditingShot(shot);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentScene) return;
    setFormError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Shot title is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const soundEffects = soundEffectsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await onCreateShot({
        project_id: projectId,
        scene_id: currentScene.id,
        title: trimmedTitle,
        shot_type: shotType,
        camera_angle: cameraAngle,
        camera_movement: cameraMovement,
        duration_seconds: Math.max(0, Number(durationSeconds) || 0),
        action: action.trim(),
        image_prompt: imagePrompt.trim(),
        motion_prompt: motionPrompt.trim(),
        sound_effects: soundEffects,
        music_cue: musicCue.trim(),
        continuity_notes: continuityNotes.trim(),
        characters: selectedChars,
        dialogue: dialogueList,
      });
      setCreateModalOpen(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create shot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShot) return;
    setFormError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Shot title cannot be empty.');
      return;
    }

    try {
      setIsSubmitting(true);
      const soundEffects = soundEffectsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await onUpdateShot(editingShot.id, {
        title: trimmedTitle,
        shot_type: shotType,
        camera_angle: cameraAngle,
        camera_movement: cameraMovement,
        duration_seconds: Math.max(0, Number(durationSeconds) || 0),
        action: action.trim(),
        image_prompt: imagePrompt.trim(),
        motion_prompt: motionPrompt.trim(),
        sound_effects: soundEffects,
        music_cue: musicCue.trim(),
        continuity_notes: continuityNotes.trim(),
        characters: selectedChars,
        dialogue: dialogueList,
      });
      setEditingShot(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update shot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (!currentScene) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeShots.length) return;

    const newShots = [...activeShots];
    const temp = newShots[index];
    newShots[index] = newShots[targetIndex];
    newShots[targetIndex] = temp;

    const orderedIds = newShots.map((s) => s.id);
    await onReorderShots(currentScene.id, orderedIds);
  };

  const handleMoveSceneSubmit = async () => {
    if (!movingShot || !targetSceneId || targetSceneId === movingShot.scene_id) return;
    try {
      setIsSubmitting(true);
      await onMoveShotToScene(movingShot.id, targetSceneId);
      setMovingShot(null);
      setTargetSceneId('');
    } catch (err) {
      console.error('Failed to move shot between scenes:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingShot) return;
    try {
      setIsSubmitting(true);
      await onDeleteShot(deletingShot.id);
      setDeletingShot(null);
    } catch (err) {
      console.error('Failed to delete shot:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyShotId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const addDialogueLine = () => {
    setDialogueList((prev) => [
      ...prev,
      { characterId: characters[0]?.id || '', text: '', delivery: '', voiceNotes: '' },
    ]);
  };

  const updateDialogueLine = (index: number, field: keyof DialogueItem, value: string) => {
    setDialogueList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeDialogueLine = (index: number) => {
    setDialogueList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleChar = (charId: string) => {
    setSelectedChars((prev) =>
      prev.includes(charId) ? prev.filter((id) => id !== charId) : [...prev, charId]
    );
  };

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-zinc-400">Loading shots...</p>
      </div>
    );
  }

  if (scenes.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-3">
        <Camera className="w-10 h-10 text-zinc-600 mx-auto" />
        <h3 className="text-sm font-semibold text-zinc-300">No scenes in this project</h3>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          Create a scene in the Scene Planner first before adding shots.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Scene Switcher & Header */}
      <div className="bg-[#141518] border border-zinc-800 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-400" />
            <span className="font-cinematic font-bold text-zinc-100 text-base">
              Shot Planner
            </span>
          </div>

          <span className="text-zinc-600 hidden sm:inline">•</span>

          {/* Scene selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Target Scene:</span>
            <select
              value={currentScene?.id || ''}
              onChange={(e) => setSelectedSceneId(e.target.value)}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-amber-300 focus:outline-hidden focus:border-amber-500/60"
            >
              {scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  Scene {s.scene_order}: {s.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all shadow-md shadow-amber-950/40 flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Shot
        </button>
      </div>

      {/* Active Shots List */}
      {activeShots.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-3">
          <Camera className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-300">
            No shots in Scene {currentScene?.scene_order}: "{currentScene?.title}"
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Design camera angles, durations, image prompts, motion directions, and dialogue for this scene.
          </p>
          <div className="pt-2">
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              Add First Shot
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {activeShots.map((shot, index) => {
            const isFirst = index === 0;
            const isLast = index === activeShots.length - 1;
            const isExpanded = expandedShotId === shot.id;

            return (
              <div
                key={shot.id}
                className="rounded-xl border border-zinc-800 bg-[#141518] hover:border-zinc-700/80 transition-all overflow-hidden"
              >
                {/* Main Card Header */}
                <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-center shrink-0">
                      <span className="text-[10px] text-zinc-500 font-semibold uppercase">
                        SHOT
                      </span>
                      <span className="text-base font-bold text-amber-400 leading-tight">
                        {shot.shot_order}
                      </span>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-zinc-100 text-sm md:text-base">
                          {shot.title}
                        </h4>

                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>{shot.duration_seconds}s</span>
                        </span>

                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {shot.shot_type || 'Wide shot'}
                        </span>

                        {shot.camera_angle && (
                          <span className="text-[10px] text-zinc-400">
                            • {shot.camera_angle}
                          </span>
                        )}

                        {shot.camera_movement && (
                          <span className="text-[10px] text-zinc-400">
                            • {shot.camera_movement}
                          </span>
                        )}
                      </div>

                      {shot.action && (
                        <p className="text-xs text-zinc-400 line-clamp-1 leading-relaxed">
                          {shot.action}
                        </p>
                      )}

                      {/* Badges for prompts and dialogue */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-zinc-500">
                        <button
                          onClick={(e) => copyShotId(shot.id, e)}
                          className="font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Copy Stable ID"
                        >
                          {copiedId === shot.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>ID: {shot.id.slice(0, 8)}...</span>
                        </button>

                        {shot.image_prompt ? (
                          <span className="text-emerald-400/90 flex items-center gap-1 text-[10px]">
                            <Image className="w-3 h-3" /> Image Prompt
                          </span>
                        ) : (
                          <span className="text-amber-500/80 flex items-center gap-1 text-[10px]">
                            <AlertCircle className="w-3 h-3" /> Missing Image Prompt
                          </span>
                        )}

                        {shot.motion_prompt ? (
                          <span className="text-emerald-400/90 flex items-center gap-1 text-[10px]">
                            <Video className="w-3 h-3" /> Motion Prompt
                          </span>
                        ) : (
                          <span className="text-amber-500/80 flex items-center gap-1 text-[10px]">
                            <AlertCircle className="w-3 h-3" /> Missing Motion Prompt
                          </span>
                        )}

                        {shot.dialogue && shot.dialogue.length > 0 && (
                          <span className="text-zinc-400 flex items-center gap-1 text-[10px]">
                            <MessageSquare className="w-3 h-3 text-amber-400" />
                            {shot.dialogue.length} {shot.dialogue.length === 1 ? 'line' : 'lines'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Reordering */}
                  <div className="flex items-center justify-between md:justify-end gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-zinc-800/80">
                    <button
                      onClick={() => setExpandedShotId(isExpanded ? null : shot.id)}
                      className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Less' : 'Inspect'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                      <button
                        onClick={() => handleMoveOrder(index, 'up')}
                        disabled={isFirst}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-100 disabled:opacity-30 transition-colors cursor-pointer"
                        title="Move Shot Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveOrder(index, 'down')}
                        disabled={isLast}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-100 disabled:opacity-30 transition-colors cursor-pointer"
                        title="Move Shot Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setMovingShot(shot);
                        setTargetSceneId(scenes.find((s) => s.id !== shot.scene_id)?.id || '');
                      }}
                      className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Move to another scene"
                    >
                      <MoveRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => handleOpenEdit(shot, e)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Edit Shot"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeletingShot(shot)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Delete Shot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-zinc-800/80 bg-zinc-950/50 space-y-3 text-xs leading-relaxed">
                    {shot.action && (
                      <div>
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                          Action & Blocking
                        </span>
                        <p className="text-zinc-300 mt-0.5">{shot.action}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-1">
                        <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Image className="w-3.5 h-3.5" />
                          Image Generation Prompt
                        </span>
                        <p className="text-zinc-300 font-mono text-[11px]">
                          {shot.image_prompt || <span className="text-zinc-500 italic">None specified</span>}
                        </p>
                      </div>

                      <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-1">
                        <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5" />
                          Video Motion Prompt
                        </span>
                        <p className="text-zinc-300 font-mono text-[11px]">
                          {shot.motion_prompt || <span className="text-zinc-500 italic">None specified</span>}
                        </p>
                      </div>
                    </div>

                    {shot.dialogue && shot.dialogue.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                          Dialogue ({shot.dialogue.length})
                        </span>
                        <div className="space-y-1.5">
                          {shot.dialogue.map((d, dIdx) => {
                            const charName =
                              characters.find((c) => c.id === d.characterId)?.name ||
                              d.characterId ||
                              'Unknown Speaker';
                            return (
                              <div
                                key={dIdx}
                                className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800/80 text-zinc-300 flex flex-col gap-1"
                              >
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-semibold text-amber-400">{charName}</span>
                                  {d.delivery && (
                                    <span className="text-zinc-500 italic">({d.delivery})</span>
                                  )}
                                </div>
                                <p className="font-script text-zinc-200">"{d.text}"</p>
                                {d.voiceNotes && (
                                  <span className="text-[10px] text-zinc-400">Notes: {d.voiceNotes}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-zinc-400">
                      {shot.sound_effects && shot.sound_effects.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span>SFX: {shot.sound_effects.join(', ')}</span>
                        </div>
                      )}
                      {shot.music_cue && (
                        <div className="flex items-center gap-2">
                          <Music className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span>Music: {shot.music_cue}</span>
                        </div>
                      )}
                    </div>

                    {shot.continuity_notes && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Continuity: {shot.continuity_notes}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Shot Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-[#141518] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100 font-cinematic">
                Add Shot to Scene {currentScene?.scene_order}
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-300 mb-1">
                    Shot Title <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Courtyard Establishing Shot"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-300 mb-1">
                    Duration (Seconds) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Shot Type</label>
                  <input
                    type="text"
                    list="shot-types-list"
                    value={shotType}
                    onChange={(e) => setShotType(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                  <datalist id="shot-types-list">
                    {COMMON_SHOT_TYPES.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Camera Angle</label>
                  <input
                    type="text"
                    list="angles-list"
                    value={cameraAngle}
                    onChange={(e) => setCameraAngle(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                  <datalist id="angles-list">
                    {COMMON_ANGLES.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Camera Movement</label>
                  <input
                    type="text"
                    list="movements-list"
                    value={cameraMovement}
                    onChange={(e) => setCameraMovement(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                  <datalist id="movements-list">
                    {COMMON_MOVEMENTS.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-300 mb-1">
                  Action & Narrative Beat
                </label>
                <textarea
                  rows={2}
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder="Describe visual action occurring in frame."
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-amber-400" />
                    Image Generation Prompt
                  </label>
                  <textarea
                    rows={2}
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Detailed visual description for still frame generation."
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl font-mono text-[11px] text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-amber-400" />
                    Motion Prompt
                  </label>
                  <textarea
                    rows={2}
                    value={motionPrompt}
                    onChange={(e) => setMotionPrompt(e.target.value)}
                    placeholder="Motion instructions: tracking path, speed, lighting change."
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl font-mono text-[11px] text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
                  />
                </div>
              </div>

              {/* Dialogue Editor */}
              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                    Dialogue Lines ({dialogueList.length})
                  </span>
                  <button
                    type="button"
                    onClick={addDialogueLine}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded-lg font-medium cursor-pointer"
                  >
                    + Add Line
                  </button>
                </div>

                {dialogueList.map((d, idx) => (
                  <div key={idx} className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={d.characterId || ''}
                        onChange={(e) => updateDialogueLine(idx, 'characterId', e.target.value)}
                        className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 text-xs"
                      >
                        <option value="">(Select Speaker)</option>
                        {characters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={d.delivery || ''}
                        onChange={(e) => updateDialogueLine(idx, 'delivery', e.target.value)}
                        placeholder="Delivery (e.g. whispering)"
                        className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 text-xs flex-1"
                      />

                      <button
                        type="button"
                        onClick={() => removeDialogueLine(idx)}
                        className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={d.text}
                      onChange={(e) => updateDialogueLine(idx, 'text', e.target.value)}
                      placeholder="Spoken dialogue text"
                      className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 text-xs"
                    />
                  </div>
                ))}
              </div>

              {/* Sound & Music */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-300 mb-1">
                    Sound Effects (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={soundEffectsText}
                    onChange={(e) => setSoundEffectsText(e.target.value)}
                    placeholder="Wind through courtyard, Footsteps on stone"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Music Cue</label>
                  <input
                    type="text"
                    value={musicCue}
                    onChange={(e) => setMusicCue(e.target.value)}
                    placeholder="Low atmospheric tension"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-300 mb-1">Continuity Notes</label>
                <input
                  type="text"
                  value={continuityNotes}
                  onChange={(e) => setContinuityNotes(e.target.value)}
                  placeholder="Preserve wardrobe, props, and lighting"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  )}
                  Save Shot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Shot Modal */}
      {editingShot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-[#141518] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100 font-cinematic">
                Edit Shot {editingShot.shot_order}
              </h3>
              <button
                onClick={() => setEditingShot(null)}
                className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-300 mb-1">
                    Shot Title <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-300 mb-1">
                    Duration (Seconds) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Shot Type</label>
                  <input
                    type="text"
                    list="shot-types-list-edit"
                    value={shotType}
                    onChange={(e) => setShotType(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                  <datalist id="shot-types-list-edit">
                    {COMMON_SHOT_TYPES.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Camera Angle</label>
                  <input
                    type="text"
                    list="angles-list-edit"
                    value={cameraAngle}
                    onChange={(e) => setCameraAngle(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                  <datalist id="angles-list-edit">
                    {COMMON_ANGLES.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Camera Movement</label>
                  <input
                    type="text"
                    list="movements-list-edit"
                    value={cameraMovement}
                    onChange={(e) => setCameraMovement(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                  <datalist id="movements-list-edit">
                    {COMMON_MOVEMENTS.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-300 mb-1">
                  Action & Narrative Beat
                </label>
                <textarea
                  rows={2}
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-amber-400" />
                    Image Generation Prompt
                  </label>
                  <textarea
                    rows={2}
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl font-mono text-[11px] text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-amber-400" />
                    Motion Prompt
                  </label>
                  <textarea
                    rows={2}
                    value={motionPrompt}
                    onChange={(e) => setMotionPrompt(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl font-mono text-[11px] text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
                  />
                </div>
              </div>

              {/* Dialogue Editor */}
              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                    Dialogue Lines ({dialogueList.length})
                  </span>
                  <button
                    type="button"
                    onClick={addDialogueLine}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded-lg font-medium cursor-pointer"
                  >
                    + Add Line
                  </button>
                </div>

                {dialogueList.map((d, idx) => (
                  <div key={idx} className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={d.characterId || ''}
                        onChange={(e) => updateDialogueLine(idx, 'characterId', e.target.value)}
                        className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 text-xs"
                      >
                        <option value="">(Select Speaker)</option>
                        {characters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={d.delivery || ''}
                        onChange={(e) => updateDialogueLine(idx, 'delivery', e.target.value)}
                        placeholder="Delivery notes"
                        className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 text-xs flex-1"
                      />

                      <button
                        type="button"
                        onClick={() => removeDialogueLine(idx)}
                        className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={d.text}
                      onChange={(e) => updateDialogueLine(idx, 'text', e.target.value)}
                      placeholder="Spoken line"
                      className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Sound Effects</label>
                  <input
                    type="text"
                    value={soundEffectsText}
                    onChange={(e) => setSoundEffectsText(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Music Cue</label>
                  <input
                    type="text"
                    value={musicCue}
                    onChange={(e) => setMusicCue(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-300 mb-1">Continuity Notes</label>
                <input
                  type="text"
                  value={continuityNotes}
                  onChange={(e) => setContinuityNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingShot(null)}
                  className="px-4 py-2 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Shot Between Scenes Modal */}
      {movingShot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#141518] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100 font-cinematic">
                Move Shot to Another Scene
              </h3>
              <button
                onClick={() => setMovingShot(null)}
                className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-zinc-300">
                Move <strong>"{movingShot.title}"</strong> from Scene {currentScene?.scene_order} to:
              </p>

              <select
                value={targetSceneId}
                onChange={(e) => setTargetSceneId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:outline-hidden focus:border-amber-500/60"
              >
                <option value="">(Select Target Scene)</option>
                {scenes
                  .filter((s) => s.id !== movingShot.scene_id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      Scene {s.scene_order}: {s.title}
                    </option>
                  ))}
              </select>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMovingShot(null)}
                  className="px-4 py-2 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!targetSceneId || isSubmitting}
                  onClick={handleMoveSceneSubmit}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  )}
                  Move Shot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Shot Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deletingShot}
        title="Delete Shot"
        message={`Are you sure you want to delete Shot ${deletingShot?.shot_order}: "${deletingShot?.title}"? This cannot be undone.`}
        confirmLabel="Delete Shot"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isSubmitting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingShot(null)}
      />
    </div>
  );
};
