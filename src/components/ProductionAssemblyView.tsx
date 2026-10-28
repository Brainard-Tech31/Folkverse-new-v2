/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import type {
  Project,
  Scene,
  Shot,
  Character,
  ProductionAsset,
  Sequence,
  SequenceEntry,
  AudioTrack,
  AudioType,
  AudioStatus,
  CreateSequenceInput,
  CreateAudioTrackInput,
} from '../types/database.ts';
import * as api from '../services/api.ts';
import {
  calculateSequenceTiming,
  evaluateSequenceReadiness,
  generateProductionManifest,
  downloadManifestJson,
  validateTrimPoints,
  formatDuration,
} from '../services/assembly.ts';
import { ConfirmationModal } from './ConfirmationModal.tsx';
import {
  Film,
  Plus,
  Copy,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Volume2,
  Mic,
  Music,
  Scissors,
  Download,
  ShieldCheck,
  Check,
  FileCode,
  Layers,
  Sparkles,
  ExternalLink,
  Info,
} from 'lucide-react';

interface ProductionAssemblyViewProps {
  project: Project;
  scenes: Scene[];
  shots: Shot[];
  characters: Character[];
  assets: ProductionAsset[];
  onOpenShotDetail?: (shot: Shot) => void;
}

export const ProductionAssemblyView: React.FC<ProductionAssemblyViewProps> = ({
  project,
  scenes,
  shots,
  characters,
  assets,
  onOpenShotDetail,
}) => {
  // Sequence selection & list
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>('');
  const [entries, setEntries] = useState<SequenceEntry[]>([]);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Drawers
  const [isCreateSeqModalOpen, setIsCreateSeqModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isEditSeqModalOpen, setIsEditSeqModalOpen] = useState(false);
  const [isDeleteSeqModalOpen, setIsDeleteSeqModalOpen] = useState(false);
  const [isAddShotsModalOpen, setIsAddShotsModalOpen] = useState(false);
  const [isReadinessModalOpen, setIsReadinessModalOpen] = useState(false);
  const [isAddAudioModalOpen, setIsAddAudioModalOpen] = useState(false);

  // Form states
  const [newSeqTitle, setNewSeqTitle] = useState('');
  const [newSeqDesc, setNewSeqDesc] = useState('');
  const [populateFromBlueprint, setPopulateFromBlueprint] = useState(true);

  const [dupSeqTitle, setDupSeqTitle] = useState('');

  const [editSeqTitle, setEditSeqTitle] = useState('');
  const [editSeqDesc, setEditSeqDesc] = useState('');
  const [editSeqNotes, setEditSeqNotes] = useState('');

  // Audio track form
  const [audioTitle, setAudioTitle] = useState('');
  const [audioType, setAudioType] = useState<AudioType>('narration');
  const [audioCharId, setAudioCharId] = useState('');
  const [audioText, setAudioText] = useState('');
  const [audioAssetId, setAudioAssetId] = useState('');
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('not_recorded');
  const [audioStartTime, setAudioStartTime] = useState<number>(0);
  const [audioNotes, setAudioNotes] = useState('');

  // Draft cut override for readiness export
  const [draftOverride, setDraftOverride] = useState(false);

  // Active sub-panel: "timeline" or "audio"
  const [activeAssemblyTab, setActiveAssemblyTab] = useState<'timeline' | 'audio'>('timeline');

  // Load sequences and audio tracks on mount or project change
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const seqList = await api.fetchSequences(project.id);
      setSequences(seqList);

      const audList = await api.fetchAudioTracks(project.id);
      setAudioTracks(audList);

      if (seqList.length > 0) {
        // Keep current or select first
        const nextId = selectedSequenceId && seqList.some((s) => s.id === selectedSequenceId)
          ? selectedSequenceId
          : seqList[0].id;
        setSelectedSequenceId(nextId);
        const seqEntries = await api.fetchSequenceEntries(nextId);
        setEntries(seqEntries);
      } else {
        setSelectedSequenceId('');
        setEntries([]);
      }
    } catch (err) {
      console.error('Failed to load sequences:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assembly sequences.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [project.id]);

  // Load entries when selectedSequenceId changes
  const handleSelectSequence = async (seqId: string) => {
    setSelectedSequenceId(seqId);
    if (!seqId) {
      setEntries([]);
      return;
    }
    try {
      setIsLoading(true);
      const seqEntries = await api.fetchSequenceEntries(seqId);
      setEntries(seqEntries);
    } catch (err) {
      console.error('Failed to load sequence entries:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sequence entries.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentSequence = useMemo(() => {
    return sequences.find((s) => s.id === selectedSequenceId) || null;
  }, [sequences, selectedSequenceId]);

  // Quick lookup maps
  const shotMap = useMemo(() => {
    const map = new Map<string, Shot>();
    shots.forEach((s) => map.set(s.id, s));
    return map;
  }, [shots]);

  const sceneMap = useMemo(() => {
    const map = new Map<string, Scene>();
    scenes.forEach((sc) => map.set(sc.id, sc));
    return map;
  }, [scenes]);

  const assetMap = useMemo(() => {
    const map = new Map<string, ProductionAsset>();
    assets.forEach((a) => map.set(a.id, a));
    return map;
  }, [assets]);

  const characterMap = useMemo(() => {
    const map = new Map<string, Character>();
    characters.forEach((c) => map.set(c.id, c));
    return map;
  }, [characters]);

  // Calculate timing and readiness
  const timingSummary = useMemo(() => {
    return calculateSequenceTiming(entries, shots, assets);
  }, [entries, shots, assets]);

  const readinessReport = useMemo(() => {
    if (!currentSequence) {
      return {
        isFinalCutReady: false,
        isEditorialReady: false,
        isStructurallyValid: false,
        canExport: false,
        errorsCount: 0,
        warningsCount: 0,
        infoCount: 0,
        totalFindings: 0,
        summary: { errorsCount: 0, warningsCount: 0, infoCount: 0, totalFindings: 0 },
        findings: [],
        hasDraftOverride: false,
      };
    }
    return evaluateSequenceReadiness(
      currentSequence,
      entries,
      shots,
      scenes,
      assets,
      audioTracks,
      draftOverride
    );
  }, [currentSequence, entries, shots, scenes, assets, audioTracks, draftOverride]);

  // Handle Sequence CRUD
  const handleCreateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newSeqTitle.trim();
    if (!title) return;

    try {
      setIsLoading(true);
      // Sort shots in blueprint order (scene order, shot order)
      const sortedShots = [...shots].sort((a, b) => {
        const scA = sceneMap.get(a.scene_id)?.scene_order || 0;
        const scB = sceneMap.get(b.scene_id)?.scene_order || 0;
        if (scA !== scB) return scA - scB;
        return a.shot_order - b.shot_order;
      });

      const input: CreateSequenceInput = {
        project_id: project.id,
        title,
        description: newSeqDesc.trim(),
        version: 1,
        initial_shot_ids: populateFromBlueprint ? sortedShots.map((s) => s.id) : [],
      };

      const created = await api.createSequence(input);
      setIsCreateSeqModalOpen(false);
      setNewSeqTitle('');
      setNewSeqDesc('');
      await loadData();
      setSelectedSequenceId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sequence.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSequenceId) return;

    try {
      setIsLoading(true);
      const duplicated = await api.duplicateSequence(
        selectedSequenceId,
        dupSeqTitle.trim() || undefined
      );
      setIsDuplicateModalOpen(false);
      setDupSeqTitle('');
      await loadData();
      setSelectedSequenceId(duplicated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate sequence.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEditSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSequenceId) return;

    try {
      setIsLoading(true);
      await api.updateSequence(selectedSequenceId, {
        title: editSeqTitle.trim(),
        description: editSeqDesc.trim(),
        notes: editSeqNotes.trim(),
      });
      setIsEditSeqModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sequence.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSequence = async () => {
    if (!selectedSequenceId) return;

    try {
      setIsLoading(true);
      await api.deleteSequence(selectedSequenceId);
      setIsDeleteSeqModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sequence.');
    } finally {
      setIsLoading(false);
    }
  };

  // Entry updates (Asset selection, trimming, ordering, removal)
  const handleSelectAssetForEntry = async (entryId: string, assetId: string | null) => {
    try {
      const updated = await api.updateSequenceEntry(entryId, {
        video_asset_id: assetId,
      });
      setEntries((prev) => prev.map((e) => (e.id === entryId ? updated : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select video asset.');
    }
  };

  const handleUpdateTrims = async (
    entryId: string,
    inPoint: number | null | undefined,
    outPoint: number | null | undefined
  ) => {
    try {
      const updated = await api.updateSequenceEntry(entryId, {
        in_point_seconds: inPoint ?? null,
        out_point_seconds: outPoint ?? null,
      });
      setEntries((prev) => prev.map((e) => (e.id === entryId ? updated : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update trim points.');
    }
  };

  const handleMoveEntry = async (index: number, direction: 'up' | 'down') => {
    if (!currentSequence) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= entries.length) return;

    const newEntries = [...entries];
    const temp = newEntries[index];
    newEntries[index] = newEntries[targetIndex];
    newEntries[targetIndex] = temp;

    const orderedIds = newEntries.map((e) => e.id);
    try {
      // Optimistic update
      setEntries(
        newEntries.map((e, idx) => ({
          ...e,
          sequence_order: idx + 1,
        }))
      );
      await api.reorderSequenceEntries(currentSequence.id, orderedIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder sequence.');
      // Revert
      if (selectedSequenceId) {
        const fresh = await api.fetchSequenceEntries(selectedSequenceId);
        setEntries(fresh);
      }
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await api.deleteSequenceEntry(entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove entry from sequence.');
    }
  };

  const handleAddShotToSequence = async (shotId: string) => {
    if (!currentSequence) return;
    try {
      // Find preferred video asset if exists
      const prefVideo = assets.find(
        (a) => a.shot_id === shotId && a.asset_type === 'video' && a.is_preferred
      );
      const newEntry = await api.createSequenceEntry({
        sequence_id: currentSequence.id,
        project_id: project.id,
        shot_id: shotId,
        video_asset_id: prefVideo ? prefVideo.id : null,
      });
      setEntries((prev) => [...prev, newEntry]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add shot to sequence.');
    }
  };

  // Audio track management
  const handleCreateAudioTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioTitle.trim()) return;

    try {
      const input: CreateAudioTrackInput = {
        project_id: project.id,
        sequence_id: selectedSequenceId || null,
        title: audioTitle.trim(),
        audio_type: audioType,
        character_id: audioCharId || null,
        text: audioText.trim(),
        audio_asset_id: audioAssetId || null,
        status: audioStatus,
        start_time_seconds: Number(audioStartTime) || 0,
        notes: audioNotes.trim(),
      };
      const created = await api.createAudioTrack(input);
      setAudioTracks((prev) => [...prev, created]);
      setIsAddAudioModalOpen(false);
      // Reset form
      setAudioTitle('');
      setAudioText('');
      setAudioNotes('');
      setAudioAssetId('');
      setAudioCharId('');
      setAudioStatus('not_recorded');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create audio track.');
    }
  };

  const handleUpdateAudioStatus = async (trackId: string, status: AudioStatus) => {
    try {
      const updated = await api.updateAudioTrack(trackId, { status });
      setAudioTracks((prev) => prev.map((t) => (t.id === trackId ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update audio status.');
    }
  };

  const handleDeleteAudioTrack = async (trackId: string) => {
    try {
      await api.deleteAudioTrack(trackId);
      setAudioTracks((prev) => prev.filter((t) => t.id !== trackId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete audio track.');
    }
  };

  // Export Manifest
  const handleExportManifest = (overrideDraft = false) => {
    if (!currentSequence) return;
    try {
      const manifest = generateProductionManifest(
        project,
        currentSequence,
        entries,
        shots,
        scenes,
        characters,
        assets,
        audioTracks,
        overrideDraft
      );

      const safeTitle = (project.title || 'folkverse').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const safeSeq = currentSequence.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      downloadManifestJson(manifest, `${safeTitle}_${safeSeq}_v${currentSequence.version}_manifest.json`);
      setIsReadinessModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export manifest.');
    }
  };

  // Shots not yet in sequence
  const unusedShots = useMemo(() => {
    const includedIds = new Set(entries.map((e) => e.shot_id));
    return shots.filter((s) => !includedIds.has(s.id));
  }, [shots, entries]);

  // Audio assets for dropdown
  const audioAssets = useMemo(() => {
    return assets.filter((a) => a.asset_type === 'audio');
  }, [assets]);

  return (
    <div className="space-y-6">
      {/* Top Header / Sequence Selector Bar */}
      <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-zinc-100">
                Production Assembly & Final Cut
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Phase 5
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Sequence approved video assets, plan narration & audio, and generate editor-ready manifests.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-stretch md:self-auto flex-wrap">
          {/* Sequence Dropdown */}
          {sequences.length > 0 && (
            <div className="relative">
              <select
                value={selectedSequenceId}
                onChange={(e) => handleSelectSequence(e.target.value)}
                className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 text-xs font-semibold focus:outline-hidden focus:border-amber-500 cursor-pointer"
              >
                {sequences.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} (v{s.version})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* New Sequence Button */}
          <button
            onClick={() => {
              setNewSeqTitle(
                sequences.length === 0
                  ? 'Main Production Cut'
                  : `Assembly Cut ${sequences.length + 1}`
              );
              setNewSeqDesc('');
              setPopulateFromBlueprint(true);
              setIsCreateSeqModalOpen(true);
            }}
            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>New Cut</span>
          </button>

          {/* Duplicate Cut */}
          {currentSequence && (
            <button
              onClick={() => {
                setDupSeqTitle(`${currentSequence.title} (Alternate Cut)`);
                setIsDuplicateModalOpen(true);
              }}
              className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Duplicate into an alternate cut without touching shots"
            >
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Duplicate</span>
            </button>
          )}

          {/* Edit Sequence Settings */}
          {currentSequence && (
            <button
              onClick={() => {
                setEditSeqTitle(currentSequence.title);
                setEditSeqDesc(currentSequence.description || '');
                setEditSeqNotes(currentSequence.notes || '');
                setIsEditSeqModalOpen(true);
              }}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl transition-colors cursor-pointer"
              title="Edit Sequence Settings"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete Sequence */}
          {currentSequence && (
            <button
              onClick={() => setIsDeleteSeqModalOpen(true)}
              className="p-2 bg-zinc-900 hover:bg-red-950/40 border border-zinc-700 hover:border-red-800/60 text-zinc-400 hover:text-red-400 rounded-xl transition-colors cursor-pointer"
              title="Delete Cut (does not delete underlying shots)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Inspect Readiness & Export Manifest */}
          {currentSequence && (
            <button
              onClick={() => setIsReadinessModalOpen(true)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-950/30 cursor-pointer ml-auto md:ml-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Final Cut Readiness</span>
            </button>
          )}
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-400 hover:text-red-200 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Empty State when no sequences created */}
      {sequences.length === 0 && !isLoading && (
        <div className="p-12 text-center bg-zinc-950/50 border border-zinc-800/80 rounded-2xl max-w-xl mx-auto">
          <Film className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-base font-bold text-zinc-200 mb-1">
            No Production Assembly Sequences Yet
          </h3>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            Create an assembly cut to organize your approved video assets into an ordered sequence,
            trim clip bounds, coordinate voiceover and narration, and export a master production manifest.
          </p>
          <button
            onClick={() => {
              setNewSeqTitle('Main Production Cut');
              setNewSeqDesc('Primary assembly cut of the blueprint shots.');
              setPopulateFromBlueprint(true);
              setIsCreateSeqModalOpen(true);
            }}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl font-bold text-xs flex items-center gap-2 mx-auto transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Assembly Cut</span>
          </button>
        </div>
      )}

      {/* When a sequence is active */}
      {currentSequence && (
        <>
          {/* Timing & Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5">
              <div className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Assembled Runtime</span>
              </div>
              <div className="text-lg font-bold text-zinc-100">
                {timingSummary.totalAssembledFormatted}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                {timingSummary.entriesWithVerifiedDurationCount} verified,{' '}
                {timingSummary.entriesWithEstimatedDurationCount} planned
              </div>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5">
              <div className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5 mb-1">
                <Scissors className="w-3.5 h-3.5 text-indigo-400" />
                <span>Planned Blueprint</span>
              </div>
              <div className="text-lg font-bold text-zinc-200">
                {timingSummary.totalPlannedFormatted}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                From screenplay shot goals
              </div>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5">
              <div className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sequence Clips</span>
              </div>
              <div className="text-lg font-bold text-zinc-100">{entries.length} shots</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                {unusedShots.length} shots unassigned
              </div>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5">
              <div className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5 mb-1">
                <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Audio Cues</span>
              </div>
              <div className="text-lg font-bold text-zinc-100">{audioTracks.length} tracks</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                {audioTracks.filter((t) => t.status === 'not_recorded').length} not recorded
              </div>
            </div>
          </div>

          {/* Sub Navigation: Timeline Assembly vs Audio & Narration Planning */}
          <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
            <button
              onClick={() => setActiveAssemblyTab('timeline')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeAssemblyTab === 'timeline'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span>Timeline Sequence ({entries.length})</span>
            </button>

            <button
              onClick={() => setActiveAssemblyTab('audio')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeAssemblyTab === 'audio'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-purple-400" />
              <span>Audio & Narration Planning ({audioTracks.length})</span>
            </button>

            <div className="ml-auto flex items-center gap-2">
              {activeAssemblyTab === 'timeline' && (
                <button
                  onClick={() => setIsAddShotsModalOpen(true)}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add Shots</span>
                </button>
              )}

              {activeAssemblyTab === 'audio' && (
                <button
                  onClick={() => setIsAddAudioModalOpen(true)}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-purple-400" />
                  <span>Add Audio Track</span>
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: TIMELINE ASSEMBLY */}
          {activeAssemblyTab === 'timeline' && (
            <div className="space-y-4">
              {entries.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950/40 border border-zinc-800 rounded-xl">
                  <Film className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400 mb-3">
                    No shots currently in this assembly sequence.
                  </p>
                  <button
                    onClick={() => setIsAddShotsModalOpen(true)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Shots from Project</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {entries.map((entry, idx) => {
                    const shot = shotMap.get(entry.shot_id);
                    const scene = shot ? sceneMap.get(shot.scene_id) : undefined;
                    const timing = timingSummary.entryTimings.find((t) => t.entryId === entry.id);

                    // Candidate video assets for this shot
                    const shotVideoAssets = assets.filter(
                      (a) => a.shot_id === entry.shot_id && a.asset_type === 'video'
                    );
                    const selectedVideo = entry.video_asset_id
                      ? assetMap.get(entry.video_asset_id)
                      : undefined;

                    // Image thumbnail for preview
                    const shotImage = assets.find(
                      (a) => a.shot_id === entry.shot_id && a.asset_type === 'image' && a.is_preferred
                    ) || assets.find(
                      (a) => a.shot_id === entry.shot_id && a.asset_type === 'image'
                    );

                    // Validation of trim points
                    const trimCheck = validateTrimPoints(
                      entry.in_point_seconds,
                      entry.out_point_seconds,
                      selectedVideo?.duration_seconds
                    );

                    return (
                      <div
                        key={entry.id}
                        className={`bg-zinc-950/70 border rounded-xl p-3.5 transition-all ${
                          !selectedVideo
                            ? 'border-amber-500/40 bg-amber-500/5'
                            : !trimCheck.valid
                            ? 'border-red-500/50 bg-red-500/5'
                            : 'border-zinc-800/80 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                          {/* Order & Reordering arrows */}
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => handleMoveEntry(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                                title="Move Earlier"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveEntry(idx, 'down')}
                                disabled={idx === entries.length - 1}
                                className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                                title="Move Later"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>

                            <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                              {entry.sequence_order}
                            </span>

                            {/* Thumbnail */}
                            <div className="w-14 h-10 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center relative">
                              {shotImage ? (
                                <img
                                  src={shotImage.storage_path}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Film className="w-4 h-4 text-zinc-600" />
                              )}
                            </div>

                            {/* Shot Details */}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {scene && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                                    Scene {scene.scene_order}
                                  </span>
                                )}
                                <span className="text-xs font-bold text-zinc-200">
                                  {shot ? shot.title : `Shot ID: ${entry.shot_id}`}
                                </span>
                                {shot?.production_status && (
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                      shot.production_status === 'Approved'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-zinc-800 text-zinc-400'
                                    }`}
                                  >
                                    {shot.production_status}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-2">
                                <span>Planned: {shot?.duration_seconds || 0}s</span>
                                {timing && (
                                  <>
                                    <span>•</span>
                                    <span className="text-amber-400/90 font-medium">
                                      Timeline: {formatDuration(timing.startTimeSeconds)} -{' '}
                                      {formatDuration(timing.endTimeSeconds)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Asset Selection & Trimming Controls */}
                          <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto justify-end">
                            {/* Video Asset Dropdown */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-zinc-400">Media:</span>
                              <select
                                value={entry.video_asset_id || ''}
                                onChange={(e) =>
                                  handleSelectAssetForEntry(entry.id, e.target.value || null)
                                }
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium focus:outline-hidden cursor-pointer ${
                                  !selectedVideo
                                    ? 'bg-amber-950/40 border border-amber-500/50 text-amber-300'
                                    : 'bg-zinc-900 border border-zinc-700 text-zinc-200'
                                }`}
                              >
                                <option value="">— No Video Selected —</option>
                                {shotVideoAssets.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    v{v.version_number} — {v.display_name}{' '}
                                    {v.is_preferred ? '★ Preferred' : ''}{' '}
                                    {v.duration_seconds ? `(${v.duration_seconds}s)` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* In / Out Points */}
                            <div className="flex items-center gap-1 text-[11px] bg-zinc-900/80 px-2 py-1 rounded-lg border border-zinc-800">
                              <Scissors className="w-3 h-3 text-zinc-400" />
                              <span className="text-zinc-500">In:</span>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="0s"
                                value={entry.in_point_seconds ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? null : Number(e.target.value);
                                  handleUpdateTrims(entry.id, val, entry.out_point_seconds);
                                }}
                                className="w-12 px-1 py-0.5 bg-zinc-950 border border-zinc-700 rounded text-center text-zinc-200 text-xs focus:outline-hidden"
                              />
                              <span className="text-zinc-500">Out:</span>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder={
                                  selectedVideo?.duration_seconds
                                    ? `${selectedVideo.duration_seconds}s`
                                    : 'end'
                                }
                                value={entry.out_point_seconds ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? null : Number(e.target.value);
                                  handleUpdateTrims(entry.id, entry.in_point_seconds, val);
                                }}
                                className="w-12 px-1 py-0.5 bg-zinc-950 border border-zinc-700 rounded text-center text-zinc-200 text-xs focus:outline-hidden"
                              />
                            </div>

                            {/* Detail / Inspect Shortcut */}
                            {shot && onOpenShotDetail && (
                              <button
                                onClick={() => onOpenShotDetail(shot)}
                                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                                title="Open Shot Detail"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Remove from Assembly */}
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 hover:border-red-800/60 text-zinc-400 hover:text-red-400 cursor-pointer"
                              title="Remove from Assembly (does not delete shot)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Trim Validation Warning */}
                        {!trimCheck.valid && (
                          <div className="mt-2 text-[10px] text-red-400 flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{trimCheck.error}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AUDIO & NARRATION PLANNING */}
          {activeAssemblyTab === 'audio' && (
            <div className="space-y-4">
              <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-zinc-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-purple-400" />
                  <span>
                    Coordinate screenplay dialogue, voiceover narration, and sound cues with your cut.
                  </span>
                </div>
                <button
                  onClick={() => setIsAddAudioModalOpen(true)}
                  className="px-2.5 py-1 bg-purple-500 hover:bg-purple-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Audio Cue</span>
                </button>
              </div>

              {audioTracks.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950/40 border border-zinc-800 rounded-xl">
                  <Mic className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400 mb-3">
                    No custom audio or narration tracks planned yet.
                  </p>
                  <button
                    onClick={() => setIsAddAudioModalOpen(true)}
                    className="px-3 py-1.5 bg-purple-500 hover:bg-purple-400 text-zinc-950 font-bold rounded-lg text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Narration / VO Track</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {audioTracks.map((track) => {
                    const char = track.character_id
                      ? characterMap.get(track.character_id)
                      : undefined;
                    const linkedAsset = track.audio_asset_id
                      ? assetMap.get(track.audio_asset_id)
                      : undefined;

                    return (
                      <div
                        key={track.id}
                        className="bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-3.5 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                  track.audio_type === 'narration'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : track.audio_type === 'dialogue'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : track.audio_type === 'music_cue'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-zinc-800 text-zinc-300'
                                }`}
                              >
                                {track.audio_type}
                              </span>
                              <span className="text-xs font-bold text-zinc-200">
                                {track.title}
                              </span>
                              {char && (
                                <span className="text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                  Speaker: {char.name}
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-500">
                                Start: {track.start_time_seconds || 0}s
                              </span>
                            </div>

                            {track.text && (
                              <p className="text-xs text-zinc-300 italic font-serif pl-2 border-l-2 border-purple-500/40">
                                "{track.text}"
                              </p>
                            )}

                            {linkedAsset && (
                              <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-1">
                                <Volume2 className="w-3 h-3 text-purple-400" />
                                <span>Media: {linkedAsset.display_name}</span>
                                {linkedAsset.duration_seconds && (
                                  <span>({linkedAsset.duration_seconds}s)</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Audio Status & Controls */}
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <select
                              value={track.status}
                              onChange={(e) =>
                                handleUpdateAudioStatus(track.id, e.target.value as AudioStatus)
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold focus:outline-hidden cursor-pointer ${
                                track.status === 'reviewed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : track.status === 'selected'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                  : track.status === 'recorded'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              <option value="not_recorded">Not Recorded</option>
                              <option value="recorded">Recorded</option>
                              <option value="selected">Selected</option>
                              <option value="reviewed">Reviewed</option>
                            </select>

                            <button
                              onClick={() => handleDeleteAudioTrack(track.id)}
                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 hover:border-red-800/60 text-zinc-400 hover:text-red-400 cursor-pointer"
                              title="Delete Audio Track"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ===================================================================== */}
      {/* MODAL: FINAL CUT READINESS INSPECTION & EXPORT */}
      {/* ===================================================================== */}
      {isReadinessModalOpen && currentSequence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    readinessReport.summary.errorsCount > 0
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : readinessReport.summary.warningsCount > 0
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">
                    Final Cut Readiness Inspection
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {currentSequence.title} (v{currentSequence.version})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsReadinessModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Findings Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Summary Counts */}
              <div className="grid grid-cols-3 gap-3">
                <div
                  className={`p-3 rounded-xl border ${
                    readinessReport.summary.errorsCount > 0
                      ? 'bg-red-500/10 border-red-500/30 text-red-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <div className="font-bold text-base">{readinessReport.summary.errorsCount}</div>
                  <div className="text-[11px]">Errors (Blocking)</div>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    readinessReport.summary.warningsCount > 0
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <div className="font-bold text-base">{readinessReport.summary.warningsCount}</div>
                  <div className="text-[11px]">Warnings (Requires Override)</div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400">
                  <div className="font-bold text-base text-zinc-200">
                    {readinessReport.summary.infoCount}
                  </div>
                  <div className="text-[11px]">Observations</div>
                </div>
              </div>

              {/* Status Message */}
              {readinessReport.summary.errorsCount === 0 &&
                readinessReport.summary.warningsCount === 0 && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Sequence is 100% ready for editor manifest export.</span>
                  </div>
                )}

              {/* Warning override checkbox */}
              {readinessReport.summary.warningsCount > 0 &&
                readinessReport.summary.errorsCount === 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-medium">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>This sequence has non-blocking production warnings.</span>
                    </div>
                    <label className="flex items-center gap-2 text-zinc-200 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draftOverride}
                        onChange={(e) => setDraftOverride(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span>Allow Draft Manifest Export (explicitly override warnings)</span>
                    </label>
                  </div>
                )}

              {/* Findings List */}
              <div className="space-y-2">
                {readinessReport.findings.map((f) => (
                  <div
                    key={f.id}
                    className={`p-3 rounded-xl border space-y-1 ${
                      f.severity === 'error'
                        ? 'bg-red-500/5 border-red-500/30 text-red-200'
                        : f.severity === 'warning'
                        ? 'bg-amber-500/5 border-amber-500/30 text-amber-200'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        {f.severity === 'error' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        ) : f.severity === 'warning' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        )}
                        {f.message}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800">
                        {f.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 pl-5">{f.explanation}</p>
                    <p className="text-[10px] text-amber-400/90 pl-5">
                      Suggested Fix: {f.suggestedResolution}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
              <button
                onClick={() => setIsReadinessModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium cursor-pointer"
              >
                Close
              </button>

              <button
                disabled={!readinessReport.canExport}
                onClick={() => handleExportManifest(draftOverride)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  readinessReport.canExport
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-950/30'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>
                  {readinessReport.summary.warningsCount > 0 && draftOverride
                    ? 'Export Draft Manifest (JSON)'
                    : 'Export Production Manifest (JSON)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE SEQUENCE */}
      {/* ===================================================================== */}
      {isCreateSeqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs">
          <form
            onSubmit={handleCreateSequence}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Film className="w-4 h-4 text-amber-400" />
              <span>Create New Assembly Sequence</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Sequence Title</label>
                <input
                  type="text"
                  required
                  value={newSeqTitle}
                  onChange={(e) => setNewSeqTitle(e.target.value)}
                  placeholder="e.g. Director's Cut, Teaser Cut"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Description</label>
                <textarea
                  rows={2}
                  value={newSeqDesc}
                  onChange={(e) => setNewSeqDesc(e.target.value)}
                  placeholder="Notes about this edit version..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <label className="flex items-center gap-2 text-zinc-300 font-medium pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={populateFromBlueprint}
                  onChange={(e) => setPopulateFromBlueprint(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-0 cursor-pointer"
                />
                <span>Populate initially with all {shots.length} shots from blueprint</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsCreateSeqModalOpen(false)}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs cursor-pointer"
              >
                Create Cut
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: DUPLICATE SEQUENCE */}
      {/* ===================================================================== */}
      {isDuplicateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs">
          <form
            onSubmit={handleDuplicateSequence}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Copy className="w-4 h-4 text-amber-400" />
              <span>Duplicate Sequence (Alternate Cut)</span>
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Creates a separate copy of this cut with its own order, trims, and notes. Underlying shots
              and assets will remain unchanged.
            </p>

            <div className="text-xs">
              <label className="block text-zinc-400 mb-1 font-medium">New Sequence Title</label>
              <input
                type="text"
                required
                value={dupSeqTitle}
                onChange={(e) => setDupSeqTitle(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsDuplicateModalOpen(false)}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs cursor-pointer"
              >
                Duplicate Cut
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: EDIT SEQUENCE SETTINGS */}
      {/* ===================================================================== */}
      {isEditSeqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEditSequence}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-400" />
              <span>Edit Sequence Settings</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Title</label>
                <input
                  type="text"
                  required
                  value={editSeqTitle}
                  onChange={(e) => setEditSeqTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Description</label>
                <textarea
                  rows={2}
                  value={editSeqDesc}
                  onChange={(e) => setEditSeqDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Assembly Notes</label>
                <textarea
                  rows={2}
                  value={editSeqNotes}
                  onChange={(e) => setEditSeqNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsEditSeqModalOpen(false)}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD SHOTS TO SEQUENCE */}
      {/* ===================================================================== */}
      {isAddShotsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Add Shots to Sequence</span>
              </h3>
              <button
                onClick={() => setIsAddShotsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1 text-xs">
              {shots.map((sh) => {
                const isAlreadyIncluded = entries.some((e) => e.shot_id === sh.id);
                const scene = sceneMap.get(sh.scene_id);

                return (
                  <div
                    key={sh.id}
                    className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {scene && (
                          <span className="text-[10px] font-semibold text-zinc-400">
                            Scene {scene.scene_order}
                          </span>
                        )}
                        <span className="font-bold text-zinc-200">{sh.title}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                        {sh.action || sh.shot_type}
                      </p>
                    </div>

                    <button
                      onClick={() => handleAddShotToSequence(sh.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        isAlreadyIncluded
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                          : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold'
                      }`}
                    >
                      {isAlreadyIncluded ? '+ Add Again' : '+ Add'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setIsAddShotsModalOpen(false)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD AUDIO / NARRATION TRACK */}
      {/* ===================================================================== */}
      {isAddAudioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs">
          <form
            onSubmit={handleCreateAudioTrack}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Mic className="w-4 h-4 text-purple-400" />
              <span>Add Audio / Narration Track</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Track Title</label>
                <input
                  type="text"
                  required
                  value={audioTitle}
                  onChange={(e) => setAudioTitle(e.target.value)}
                  placeholder="e.g. Opening Voiceover, Sword Clash SFX"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Audio Type</label>
                  <select
                    value={audioType}
                    onChange={(e) => setAudioType(e.target.value as AudioType)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-hidden"
                  >
                    <option value="narration">Narration / VO</option>
                    <option value="dialogue">Dialogue</option>
                    <option value="sound_effect">Sound Effect</option>
                    <option value="music_cue">Music Cue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Speaker (Optional)</label>
                  <select
                    value={audioCharId}
                    onChange={(e) => setAudioCharId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-hidden"
                  >
                    <option value="">— None / Narrator —</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  Spoken Script / Voice Notes
                </label>
                <textarea
                  rows={2}
                  value={audioText}
                  onChange={(e) => setAudioText(e.target.value)}
                  placeholder="The spoken voiceover or sound cue direction..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Start Time (sec)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={audioStartTime}
                    onChange={(e) => setAudioStartTime(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Status</label>
                  <select
                    value={audioStatus}
                    onChange={(e) => setAudioStatus(e.target.value as AudioStatus)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-hidden"
                  >
                    <option value="not_recorded">Not Recorded</option>
                    <option value="recorded">Recorded</option>
                    <option value="selected">Selected</option>
                    <option value="reviewed">Reviewed</option>
                  </select>
                </div>
              </div>

              {audioAssets.length > 0 && (
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Link Uploaded Audio Media (Optional)
                  </label>
                  <select
                    value={audioAssetId}
                    onChange={(e) => setAudioAssetId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-hidden"
                  >
                    <option value="">— None —</option>
                    {audioAssets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.display_name} ({a.duration_seconds || 0}s)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsAddAudioModalOpen(false)}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-purple-500 hover:bg-purple-400 text-zinc-950 font-bold rounded-xl text-xs cursor-pointer"
              >
                Save Audio Track
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* CONFIRMATION MODAL: DELETE SEQUENCE */}
      {/* ===================================================================== */}
      <ConfirmationModal
        isOpen={isDeleteSeqModalOpen}
        title="Delete Production Assembly Cut"
        message={`Are you sure you want to delete the sequence "${currentSequence?.title}"? This will remove this sequence edit, but under NO circumstances will any shots, scenes, or assets be deleted.`}
        confirmLabel="Delete Cut"
        isDestructive={true}
        onConfirm={handleDeleteSequence}
        onCancel={() => setIsDeleteSeqModalOpen(false)}
      />
    </div>
  );
};
