/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type {
  Character,
  Scene,
  Shot,
  CreateCharacterInput,
  UpdateCharacterInput,
} from '../types/database.ts';
import { ConfirmationModal } from './ConfirmationModal.tsx';
import {
  Plus,
  Users,
  Edit2,
  Trash2,
  Clock,
  Eye,
  X,
  AlertCircle,
  Copy,
  Check,
  Film,
  Camera,
  Shirt,
  Sparkles,
} from 'lucide-react';

interface CharacterManagerProps {
  projectId: string;
  characters: Character[];
  scenes?: Scene[];
  shots?: Shot[];
  isLoading: boolean;
  onCreateCharacter: (input: CreateCharacterInput) => Promise<void>;
  onUpdateCharacter: (characterId: string, input: UpdateCharacterInput) => Promise<void>;
  onDeleteCharacter: (characterId: string) => Promise<void>;
}

const COMMON_ROLES = [
  'Protagonist',
  'Antagonist',
  'Mentor / Elder',
  'Trickster Archetype',
  'Spiritual Guardian',
  'Foil / Rival',
  'Supporting Ally',
  'Chorus / Narrator',
];

export const CharacterManager: React.FC<CharacterManagerProps> = ({
  projectId,
  characters,
  scenes = [],
  shots = [],
  isLoading,
  onCreateCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
}) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [viewingCharacter, setViewingCharacter] = useState<Character | null>(null);
  const [deletingCharacter, setDeletingCharacter] = useState<Character | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [ageDescription, setAgeDescription] = useState('');
  const [description, setDescription] = useState('');
  const [appearance, setAppearance] = useState('');
  const [wardrobe, setWardrobe] = useState('');
  const [personality, setPersonality] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [continuityNotes, setContinuityNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setRole('');
    setAgeDescription('');
    setDescription('');
    setAppearance('');
    setWardrobe('');
    setPersonality('');
    setReferenceImageUrl('');
    setContinuityNotes('');
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (character: Character, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setName(character.name);
    setRole(character.role || '');
    setAgeDescription(character.age_description || '');
    setDescription(character.description || '');
    setAppearance(character.appearance || '');
    setWardrobe(character.wardrobe || '');
    setPersonality(character.personality || '');
    setReferenceImageUrl(character.reference_image_url || '');
    setContinuityNotes(character.continuity_notes || '');
    setFormError(null);
    setEditingCharacter(character);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Character name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreateCharacter({
        project_id: projectId,
        name: trimmedName,
        role: role.trim(),
        age_description: ageDescription.trim(),
        description: description.trim(),
        appearance: appearance.trim(),
        wardrobe: wardrobe.trim(),
        personality: personality.trim(),
        reference_image_url: referenceImageUrl.trim(),
        continuity_notes: continuityNotes.trim(),
      });
      setCreateModalOpen(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create character profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCharacter) return;
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Character name cannot be empty.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onUpdateCharacter(editingCharacter.id, {
        name: trimmedName,
        role: role.trim(),
        age_description: ageDescription.trim(),
        description: description.trim(),
        appearance: appearance.trim(),
        wardrobe: wardrobe.trim(),
        personality: personality.trim(),
        reference_image_url: referenceImageUrl.trim(),
        continuity_notes: continuityNotes.trim(),
      });
      setEditingCharacter(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update character.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCharacter) return;
    try {
      setIsSubmitting(true);
      await onDeleteCharacter(deletingCharacter.id);
      setDeletingCharacter(null);
      if (viewingCharacter?.id === deletingCharacter.id) {
        setViewingCharacter(null);
      }
    } catch (err) {
      console.error('Failed to delete character:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCharId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-zinc-400">Loading character dossiers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 font-cinematic flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            Character Bible ({characters.length})
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Define character archetypes, appearances, wardrobe, personality, and visual continuity notes
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all shadow-md shadow-amber-950/40 flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Character
        </button>
      </div>

      {/* Characters Grid */}
      {characters.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-3">
          <Users className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-300">No characters created</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Populate your story universe with protagonists, elders, tricksters, and supporting figures.
          </p>
          <div className="pt-2">
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              Add First Character
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {characters.map((char) => {
            // Find scenes and shots referencing this character
            const referencingScenes = scenes.filter((s) => s.characters?.includes(char.id));
            const referencingShots = shots.filter(
              (sh) =>
                sh.characters?.includes(char.id) ||
                sh.dialogue?.some((d) => d.characterId === char.id)
            );

            return (
              <div
                key={char.id}
                onClick={() => setViewingCharacter(char)}
                className="group p-5 rounded-xl border border-zinc-800 bg-[#141518] hover:border-zinc-700/80 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0 font-cinematic">
                      {char.name.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleOpenEdit(char, e)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        title="Edit Character"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingCharacter(char);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                        title="Delete Character"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-zinc-100 text-base group-hover:text-amber-300 transition-colors">
                        {char.name}
                      </h4>
                      {char.role && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-amber-300 border border-zinc-700">
                          {char.role}
                        </span>
                      )}
                      {char.age_description && (
                        <span className="text-[10px] text-zinc-400">
                          • {char.age_description}
                        </span>
                      )}
                    </div>

                    {char.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
                        {char.description}
                      </p>
                    )}
                  </div>

                  {/* Wardrobe & Continuity preview */}
                  {(char.wardrobe || char.continuity_notes) && (
                    <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-[11px] space-y-1">
                      {char.wardrobe && (
                        <div className="text-zinc-300 truncate">
                          <span className="text-zinc-500 font-medium">Wardrobe: </span>
                          <span>{char.wardrobe}</span>
                        </div>
                      )}
                      {char.continuity_notes && (
                        <div className="text-amber-300/90 truncate">
                          <span className="text-zinc-500 font-medium">Continuity: </span>
                          <span>{char.continuity_notes}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* References counter */}
                  <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <Film className="w-3 h-3 text-amber-400/80" />
                      <span>{referencingScenes.length} scenes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Camera className="w-3 h-3 text-amber-400/80" />
                      <span>{referencingShots.length} shots</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                  <button
                    onClick={(e) => copyCharId(char.id, e)}
                    className="font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors text-[11px]"
                    title="Copy Stable ID"
                  >
                    {copiedId === char.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>ID: {char.id.slice(0, 8)}...</span>
                  </button>

                  <div className="flex items-center gap-1 text-zinc-400 hover:text-amber-300 text-xs">
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Dossier</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Character Dossier Modal */}
      {viewingCharacter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#141518] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold font-cinematic">
                  {viewingCharacter.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-100 font-cinematic">
                    {viewingCharacter.name}
                  </h3>
                  {viewingCharacter.role && (
                    <span className="text-xs text-amber-400 font-medium">
                      {viewingCharacter.role}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleOpenEdit(viewingCharacter);
                    setViewingCharacter(null);
                  }}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewingCharacter(null)}
                  className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs leading-relaxed">
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 font-mono text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Stable ID: {viewingCharacter.id}</span>
                <button
                  onClick={(e) => copyCharId(viewingCharacter.id, e)}
                  className="text-amber-400 hover:text-amber-300"
                >
                  Copy
                </button>
              </div>

              {viewingCharacter.age_description && (
                <div>
                  <span className="text-zinc-500 font-medium uppercase text-[10px] tracking-wider block">Age Profile</span>
                  <p className="text-zinc-200 mt-0.5">{viewingCharacter.age_description}</p>
                </div>
              )}

              {viewingCharacter.appearance && (
                <div>
                  <span className="text-zinc-500 font-medium uppercase text-[10px] tracking-wider block">Visual Appearance</span>
                  <p className="text-zinc-200 mt-0.5 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">{viewingCharacter.appearance}</p>
                </div>
              )}

              {viewingCharacter.wardrobe && (
                <div>
                  <span className="text-zinc-500 font-medium uppercase text-[10px] tracking-wider block">Wardrobe & Costume</span>
                  <p className="text-zinc-200 mt-0.5 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">{viewingCharacter.wardrobe}</p>
                </div>
              )}

              {viewingCharacter.personality && (
                <div>
                  <span className="text-zinc-500 font-medium uppercase text-[10px] tracking-wider block">Personality & Demeanor</span>
                  <p className="text-zinc-200 mt-0.5 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">{viewingCharacter.personality}</p>
                </div>
              )}

              {viewingCharacter.continuity_notes && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                  <span className="text-amber-400 font-semibold uppercase text-[10px] tracking-wider block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Continuity Guidelines
                  </span>
                  <p className="text-amber-200/90">{viewingCharacter.continuity_notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 text-[11px] text-zinc-500">
                <span>Created {new Date(viewingCharacter.created_at).toLocaleString()}</span>
                <span>Updated {new Date(viewingCharacter.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Character Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#141518] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100 font-cinematic">
                Add Character Profile
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Amina"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Story Role
                  </label>
                  <input
                    type="text"
                    list="roles-list"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Protagonist"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                  <datalist id="roles-list">
                    {COMMON_ROLES.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Age Description
                </label>
                <input
                  type="text"
                  value={ageDescription}
                  onChange={(e) => setAgeDescription(e.target.value)}
                  placeholder="e.g. Young adult (mid 20s)"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Visual Appearance
                </label>
                <textarea
                  rows={2}
                  value={appearance}
                  onChange={(e) => setAppearance(e.target.value)}
                  placeholder="Distinctive facial features, height, hair, physical markings."
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Wardrobe & Costuming
                </label>
                <textarea
                  rows={2}
                  value={wardrobe}
                  onChange={(e) => setWardrobe(e.target.value)}
                  placeholder="Dark indigo travelling clothes, leather satchel, brass cuffs."
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Personality & Temperament
                </label>
                <textarea
                  rows={2}
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  placeholder="Determined, observant, speaks with restrained tension."
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Continuity Notes
                </label>
                <textarea
                  rows={2}
                  value={continuityNotes}
                  onChange={(e) => setContinuityNotes(e.target.value)}
                  placeholder="Keep face, hairstyle, clothing, and props consistent across scenes."
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
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
                  Save Character
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Character Modal */}
      {editingCharacter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#141518] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100 font-cinematic">
                Edit Character Profile
              </h3>
              <button
                onClick={() => setEditingCharacter(null)}
                className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Story Role
                  </label>
                  <input
                    type="text"
                    list="roles-list"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Age Description
                </label>
                <input
                  type="text"
                  value={ageDescription}
                  onChange={(e) => setAgeDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Visual Appearance
                </label>
                <textarea
                  rows={2}
                  value={appearance}
                  onChange={(e) => setAppearance(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Wardrobe & Costuming
                </label>
                <textarea
                  rows={2}
                  value={wardrobe}
                  onChange={(e) => setWardrobe(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Personality & Demeanor
                </label>
                <textarea
                  rows={2}
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Continuity Notes
                </label>
                <textarea
                  rows={2}
                  value={continuityNotes}
                  onChange={(e) => setContinuityNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCharacter(null)}
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

      {/* Delete Confirmation Modal with Reference Guard */}
      {deletingCharacter && (
        <ConfirmationModal
          isOpen={true}
          title="Delete Character Profile"
          message={
            scenes.some((s) => s.characters?.includes(deletingCharacter.id)) ||
            shots.some((sh) => sh.characters?.includes(deletingCharacter.id))
              ? `Warning: "${deletingCharacter.name}" is currently referenced in production scenes or shots. Deleting this profile may create unresolved character references.`
              : `Are you sure you want to delete "${deletingCharacter.name}"? This action cannot be undone.`
          }
          confirmLabel="Delete Character"
          cancelLabel="Keep Character"
          isDestructive={true}
          isLoading={isSubmitting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingCharacter(null)}
        />
      )}
    </div>
  );
};
