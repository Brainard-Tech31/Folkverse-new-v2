/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type {
  Location,
  Scene,
  CreateLocationInput,
  UpdateLocationInput,
} from '../types/database.ts';
import { ConfirmationModal } from './ConfirmationModal.tsx';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Copy,
  Check,
  Film,
  Compass,
} from 'lucide-react';

interface LocationBibleProps {
  projectId: string;
  locations: Location[];
  scenes: Scene[];
  isLoading: boolean;
  onCreateLocation: (input: CreateLocationInput) => Promise<void>;
  onUpdateLocation: (locationId: string, input: UpdateLocationInput) => Promise<void>;
  onDeleteLocation: (locationId: string) => Promise<void>;
}

export const LocationBible: React.FC<LocationBibleProps> = ({
  projectId,
  locations,
  scenes,
  isLoading,
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation,
}) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visualNotes, setVisualNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setDescription('');
    setVisualNotes('');
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (loc: Location, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setName(loc.name);
    setDescription(loc.description || '');
    setVisualNotes(loc.visual_notes || '');
    setFormError(null);
    setEditingLocation(loc);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Location name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreateLocation({
        project_id: projectId,
        name: trimmedName,
        description: description.trim(),
        visual_notes: visualNotes.trim(),
      });
      setCreateModalOpen(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create location.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Location name cannot be empty.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onUpdateLocation(editingLocation.id, {
        name: trimmedName,
        description: description.trim(),
        visual_notes: visualNotes.trim(),
      });
      setEditingLocation(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update location.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingLocation) return;
    try {
      setIsSubmitting(true);
      await onDeleteLocation(deletingLocation.id);
      setDeletingLocation(null);
    } catch (err) {
      console.error('Failed to delete location:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLocId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-zinc-400">Loading location bible...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 font-cinematic flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-400" />
            Location Bible ({locations.length})
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage environments, architectural notes, lighting rules, and scene continuity
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all shadow-md shadow-amber-950/40 flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </div>

      {/* Locations Grid */}
      {locations.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-3">
          <MapPin className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-300">No locations created</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Build your world's environments, royal courtyards, sacred groves, and village squares.
          </p>
          <div className="pt-2">
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              Add First Location
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {locations.map((loc) => {
            // Find scenes referencing this location
            const referencingScenes = scenes.filter(
              (sc) => sc.location_id === loc.id || sc.location?.toLowerCase() === loc.name.toLowerCase()
            );

            return (
              <div
                key={loc.id}
                className="p-5 rounded-xl border border-zinc-800 bg-[#141518] hover:border-zinc-700/80 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-9 h-9 rounded-lg bg-zinc-800/90 flex items-center justify-center text-amber-400 shrink-0">
                      <Compass className="w-4 h-4" />
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleOpenEdit(loc, e)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Edit Location"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingLocation(loc)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Delete Location"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-zinc-100 text-base leading-snug">
                      {loc.name}
                    </h4>
                    {loc.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1.5 leading-relaxed">
                        {loc.description}
                      </p>
                    )}
                  </div>

                  {loc.visual_notes && (
                    <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-0.5">
                      <span className="text-amber-400/90 font-semibold block uppercase tracking-wider text-[10px]">
                        Visual & Lighting Notes
                      </span>
                      <p className="line-clamp-2 leading-relaxed">{loc.visual_notes}</p>
                    </div>
                  )}

                  {/* Referencing scenes */}
                  <div className="pt-2 border-t border-zinc-800/60 text-[11px]">
                    <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                      <Film className="w-3 h-3 text-amber-400/80" />
                      <span>Used in {referencingScenes.length} {referencingScenes.length === 1 ? 'scene' : 'scenes'}:</span>
                    </div>
                    {referencingScenes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {referencingScenes.slice(0, 3).map((s) => (
                          <span
                            key={s.id}
                            className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 truncate max-w-[140px]"
                          >
                            #{s.scene_order} {s.title}
                          </span>
                        ))}
                        {referencingScenes.length > 3 && (
                          <span className="text-zinc-500 text-[10px] self-center">
                            +{referencingScenes.length - 3} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-600 italic">Not yet assigned to any scenes</span>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                  <button
                    onClick={(e) => copyLocId(loc.id, e)}
                    className="font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors text-[11px] cursor-pointer"
                    title="Copy Stable ID"
                  >
                    {copiedId === loc.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>ID: {loc.id.slice(0, 8)}...</span>
                  </button>

                  <span className="text-[11px] text-zinc-500">
                    Updated {new Date(loc.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Location Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#141518] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100 font-cinematic">
                Add Location Profile
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Location Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Royal Courtyard of Kumasi"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Description / Architecture
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Vast ceremonial courtyard with red clay ramparts and towering silk cotton trees."
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500/60 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Visual & Environment Notes
                </label>
                <textarea
                  rows={2}
                  value={visualNotes}
                  onChange={(e) => setVisualNotes(e.target.value)}
                  placeholder="Warm afternoon golden hour light, red dust swirling subtly near stone dais."
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
                  Save Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {editingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#141518] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100 font-cinematic">
                Edit Location
              </h3>
              <button
                onClick={() => setEditingLocation(null)}
                className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Location Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Description / Architecture
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Visual & Environment Notes
                </label>
                <textarea
                  rows={2}
                  value={visualNotes}
                  onChange={(e) => setVisualNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLocation(null)}
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

      {/* Delete Location Confirmation Modal with reference guard */}
      {deletingLocation && (
        <ConfirmationModal
          isOpen={true}
          title="Delete Location"
          message={
            scenes.some((s) => s.location_id === deletingLocation.id || s.location?.toLowerCase() === deletingLocation.name.toLowerCase())
              ? `Warning: "${deletingLocation.name}" is currently used in ${
                  scenes.filter((s) => s.location_id === deletingLocation.id || s.location?.toLowerCase() === deletingLocation.name.toLowerCase()).length
                } scene(s). Deleting it will clear the location reference in those scenes.`
              : `Are you sure you want to delete "${deletingLocation.name}"? This action cannot be undone.`
          }
          confirmLabel="Delete Location"
          cancelLabel="Keep Location"
          isDestructive={true}
          isLoading={isSubmitting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingLocation(null)}
        />
      )}
    </div>
  );
};
