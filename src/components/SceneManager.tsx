/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type {
  Scene,
  Shot,
  Location,
  Character,
  CreateSceneInput,
  UpdateSceneInput,
  SceneIntExt,
  SceneTimeOfDay,
} from '../types/database.ts';
import { ConfirmationModal } from './ConfirmationModal.tsx';
import {
  Plus,
  Clapperboard,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Clock,
  MapPin,
  X,
  AlertCircle,
  Copy,
  Check,
  Camera,
  Users,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface SceneManagerProps {
  projectId: string;
  scenes: Scene[];
  shots?: Shot[];
  locations?: Location[];
  characters?: Character[];
  isLoading: boolean;
  onCreateScene: (input: CreateSceneInput) => Promise<void>;
  onUpdateScene: (sceneId: string, input: UpdateSceneInput) => Promise<void>;
  onReorderScenes: (orderedSceneIds: string[]) => Promise<void>;
  onDeleteScene: (sceneId: string) => Promise<void>;
  onSelectSceneForShots?: (sceneId: string) => void;
}

export const SceneManager: React.FC<SceneManagerProps> = ({
  projectId,
  scenes,
  shots = [],
  locations = [],
  characters = [],
  isLoading,
  onCreateScene,
  onUpdateScene,
  onReorderScenes,
  onDeleteScene,
  onSelectSceneForShots,
}) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [deletingScene, setDeletingScene] = useState<Scene | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationId, setLocationId] = useState<string>('');
  const [intExt, setIntExt] = useState<SceneIntExt | ''>('EXT');
  const [timeOfDay, setTimeOfDay] = useState<SceneTimeOfDay | ''>('DAY');
  const [summary, setSummary] = useState('');
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [continuityNotes, setContinuityNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);

  const resetForm = () => {
    setTitle('');
    setLocationName('');
    setLocationId('');
    setIntExt('EXT');
    setTimeOfDay('DAY');
    setSummary('');
    setSelectedChars([]);
    setContinuityNotes('');
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (scene: Scene) => {
    setTitle(scene.title);
    setLocationName(scene.location || '');
    setLocationId(scene.location_id || '');
    setIntExt((scene.int_ext as SceneIntExt) || '');
    setTimeOfDay((scene.time_of_day as SceneTimeOfDay) || '');
    setSummary(scene.summary || scene.content || '');
    setSelectedChars(Array.isArray(scene.characters) ? scene.characters : []);
    setContinuityNotes(scene.continuity_notes || '');
    setFormError(null);
    setEditingScene(scene);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Scene title is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreateScene({
        project_id: projectId,
        title: trimmedTitle,
        location: locationName.trim(),
        location_id: locationId || null,
        int_ext: (intExt as SceneIntExt) || null,
        time_of_day: (timeOfDay as SceneTimeOfDay) || null,
        summary: summary.trim(),
        content: summary.trim(),
        characters: selectedChars,
        continuity_notes: continuityNotes.trim(),
      });
      setCreateModalOpen(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create scene.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScene) return;
    setFormError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Scene title cannot be empty.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onUpdateScene(editingScene.id, {
        title: trimmedTitle,
        location: locationName.trim(),
        location_id: locationId || null,
        int_ext: (intExt as SceneIntExt) || null,
        time_of_day: (timeOfDay as SceneTimeOfDay) || null,
        summary: summary.trim(),
        content: summary.trim(),
        characters: selectedChars,
        continuity_notes: continuityNotes.trim(),
      });
      setEditingScene(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update scene.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingScene) return;
    try {
      setIsSubmitting(true);
      await onDeleteScene(deletingScene.id);
      setDeletingScene(null);
    } catch (err) {
      console.error('Failed to delete scene:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scenes.length) return;

    const newOrder = [...scenes];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    const orderedIds = newOrder.map((s) => s.id);
    try {
      setReorderLoading(true);
      await onReorderScenes(orderedIds);
    } catch (err) {
      console.error('Failed to reorder scenes:', err);
    } finally {
      setReorderLoading(false);
    }
  };

  const copySceneId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
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
        <p className="text-xs text-zinc-400">Loading scene breakdown...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 font-cinematic flex items-center gap-2">
            <Clapperboard className="w-5 h-5 text-amber-400" />
            Scene Planner ({scenes.length})
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Sequence your scenes, monitor runtime from shot durations, and maintain environmental continuity
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all shadow-md shadow-amber-950/40 flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Scene
        </button>
      </div>

      {/* Scenes List */}
      {scenes.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-3">
          <Clapperboard className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-300">No scenes in this project</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Break down your story into distinct cinematic beats, interior/exterior environments, and time frames.
          </p>
          <div className="pt-2">
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              Add First Scene
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {scenes.map((scene, index) => {
            const isFirst = index === 0;
            const isLast = index === scenes.length - 1;

            // Compute scene duration from shots
            const sceneShots = shots.filter((sh) => sh.scene_id === scene.id);
            const sceneDuration = sceneShots.reduce(
              (acc, sh) => acc + (Number(sh.duration_seconds) || 0),
              0
            );
            const sceneMins = Math.floor(sceneDuration / 60);
            const sceneSecs = Math.round(sceneDuration % 60);

            // Match location
            const matchedLocation = locations.find((l) => l.id === scene.location_id);
            const isBrokenLocation = Boolean(scene.location_id && !matchedLocation);
            const displayLocation = matchedLocation ? matchedLocation.name : scene.location;

            return (
              <div
                key={scene.id}
                className="p-5 rounded-xl border border-zinc-800 bg-[#141518] hover:border-zinc-700/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Order badge & info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 text-center shrink-0">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase leading-tight">
                      SCENE
                    </span>
                    <span className="text-lg font-bold text-amber-400 leading-tight">
                      {scene.scene_order}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-zinc-100 text-base">
                        {scene.title}
                      </h4>

                      {scene.int_ext && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300">
                          {scene.int_ext}
                        </span>
                      )}

                      {scene.time_of_day && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300">
                          {scene.time_of_day}
                        </span>
                      )}

                      {isBrokenLocation ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-red-500/15 border border-red-500/30 text-red-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-red-400" />
                          <span>Broken Location Ref: {scene.location_id}</span>
                        </span>
                      ) : displayLocation ? (
                        <span className="text-xs text-zinc-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-zinc-500" />
                          <span>{displayLocation}</span>
                        </span>
                      ) : null}

                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>{sceneMins}m {sceneSecs}s</span>
                      </span>
                    </div>

                    {/* Summary */}
                    {(scene.summary || scene.content) && (
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {scene.summary || scene.content}
                      </p>
                    )}

                    {/* Participating characters & continuity */}
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-400">
                      {scene.characters && scene.characters.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-zinc-500" />
                          <span>
                            {scene.characters
                              .map((cId) => characters.find((c) => c.id === cId)?.name || cId)
                              .slice(0, 3)
                              .join(', ')}
                            {scene.characters.length > 3 && ` +${scene.characters.length - 3}`}
                          </span>
                        </div>
                      )}

                      {scene.continuity_notes && (
                        <div className="text-amber-300/80 truncate max-w-sm flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{scene.continuity_notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Stable ID */}
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-zinc-500">
                      <button
                        onClick={() => copySceneId(scene.id)}
                        className="font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copy Stable Scene ID"
                      >
                        {copiedId === scene.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>ID: {scene.id.slice(0, 8)}...</span>
                      </button>

                      <span>•</span>
                      <span>{sceneShots.length} {sceneShots.length === 1 ? 'Shot' : 'Shots'}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Controls & Shot planner jump */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-zinc-800/80">
                  {onSelectSceneForShots && (
                    <button
                      onClick={() => onSelectSceneForShots(scene.id)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>Plan Shots ({sceneShots.length})</span>
                      <ChevronRight className="w-3 h-3 text-zinc-500" />
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    {/* Reorder Buttons */}
                    <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                      <button
                        onClick={() => handleMove(index, 'up')}
                        disabled={isFirst || reorderLoading}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-100 disabled:opacity-30 transition-colors cursor-pointer"
                        title="Move Scene Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMove(index, 'down')}
                        disabled={isLast || reorderLoading}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-100 disabled:opacity-30 transition-colors cursor-pointer"
                        title="Move Scene Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Edit & Delete */}
                    <button
                      onClick={() => handleOpenEdit(scene)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Edit Scene"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingScene(scene)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Delete Scene"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Scene Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#141518] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100 font-cinematic">
                Add Scene to Planner
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Scene Title <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Discovery of the Golden Stool"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Environment
                  </label>
                  <select
                    value={intExt}
                    onChange={(e) => setIntExt(e.target.value as SceneIntExt | '')}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  >
                    <option value="">(None)</option>
                    <option value="INT">INT (Interior)</option>
                    <option value="EXT">EXT (Exterior)</option>
                    <option value="INT/EXT">INT/EXT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Time of Day
                  </label>
                  <select
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value as SceneTimeOfDay | '')}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  >
                    <option value="">(None)</option>
                    <option value="DAY">DAY</option>
                    <option value="NIGHT">NIGHT</option>
                    <option value="DUSK">DUSK</option>
                    <option value="DAWN">DAWN</option>
                    <option value="CONTINUOUS">CONTINUOUS</option>
                    <option value="LATER">LATER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Linked Location
                  </label>
                  <select
                    value={locationId}
                    onChange={(e) => {
                      setLocationId(e.target.value);
                      const loc = locations.find((l) => l.id === e.target.value);
                      if (loc) setLocationName(loc.name);
                    }}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  >
                    <option value="">(Select from Bible)</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Location Name (Custom or Override)
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. SACRED SHRINE ROOM"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Participating Characters
                </label>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl max-h-32 overflow-y-auto">
                  {characters.length === 0 ? (
                    <span className="text-zinc-500 text-xs">No characters in Bible yet.</span>
                  ) : (
                    characters.map((char) => {
                      const selected = selectedChars.includes(char.id);
                      return (
                        <button
                          key={char.id}
                          type="button"
                          onClick={() => toggleChar(char.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            selected
                              ? 'bg-amber-500 text-zinc-950 font-semibold'
                              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {char.name}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Scene Summary / Dramatic Beat
                </label>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Describe the central dramatic action and narrative progression."
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500/60 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Scene Continuity Notes
                </label>
                <textarea
                  rows={2}
                  value={continuityNotes}
                  onChange={(e) => setContinuityNotes(e.target.value)}
                  placeholder="Preserve lighting, costume shifts, wound or blood continuity."
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500/60 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  )}
                  Save Scene
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Scene Modal */}
      {editingScene && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#141518] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100 font-cinematic">
                Edit Scene {editingScene.scene_order}
              </h3>
              <button
                onClick={() => setEditingScene(null)}
                className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Scene Title <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Environment
                  </label>
                  <select
                    value={intExt}
                    onChange={(e) => setIntExt(e.target.value as SceneIntExt | '')}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  >
                    <option value="">(None)</option>
                    <option value="INT">INT</option>
                    <option value="EXT">EXT</option>
                    <option value="INT/EXT">INT/EXT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Time of Day
                  </label>
                  <select
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value as SceneTimeOfDay | '')}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  >
                    <option value="">(None)</option>
                    <option value="DAY">DAY</option>
                    <option value="NIGHT">NIGHT</option>
                    <option value="DUSK">DUSK</option>
                    <option value="DAWN">DAWN</option>
                    <option value="CONTINUOUS">CONTINUOUS</option>
                    <option value="LATER">LATER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Linked Location
                  </label>
                  <select
                    value={locationId}
                    onChange={(e) => {
                      setLocationId(e.target.value);
                      const loc = locations.find((l) => l.id === e.target.value);
                      if (loc) setLocationName(loc.name);
                    }}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  >
                    <option value="">(Select from Bible)</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Location Name
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Participating Characters
                </label>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl max-h-32 overflow-y-auto">
                  {characters.map((char) => {
                    const selected = selectedChars.includes(char.id);
                    return (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => toggleChar(char.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          selected
                            ? 'bg-amber-500 text-zinc-950 font-semibold'
                            : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {char.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Scene Summary / Dramatic Beat
                </label>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Scene Continuity Notes
                </label>
                <textarea
                  rows={2}
                  value={continuityNotes}
                  onChange={(e) => setContinuityNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingScene(null)}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
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

      {/* Delete Scene Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deletingScene}
        title="Delete Scene"
        message={`Are you sure you want to delete Scene ${deletingScene?.scene_order}: "${deletingScene?.title}"? All shots inside this scene will also be deleted.`}
        confirmLabel="Delete Scene"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isSubmitting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingScene(null)}
      />
    </div>
  );
};
