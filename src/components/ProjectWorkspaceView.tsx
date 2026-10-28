/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type {
  Project,
  Screenplay,
  Scene,
  Character,
  Location,
  Shot,
  CreateSceneInput,
  UpdateSceneInput,
  CreateCharacterInput,
  UpdateCharacterInput,
  CreateLocationInput,
  UpdateLocationInput,
  CreateShotInput,
  UpdateShotInput,
  UpdateProjectInput,
  FolkverseBlueprint,
} from '../types/database.ts';
import { ScreenplayEditor } from './ScreenplayEditor.tsx';
import { SceneManager } from './SceneManager.tsx';
import { CharacterManager } from './CharacterManager.tsx';
import { LocationBible } from './LocationBible.tsx';
import { ShotPlanner } from './ShotPlanner.tsx';
import { ProductionSummary } from './ProductionSummary.tsx';
import { ConfirmationModal } from './ConfirmationModal.tsx';
import { ImportBlueprintModal } from './ImportBlueprintModal.tsx';
import { ExportBlueprintModal } from './ExportBlueprintModal.tsx';
import {
  FileText,
  Clapperboard,
  Users,
  MapPin,
  Camera,
  Layers,
  Info,
  ArrowLeft,
  Clock,
  Trash2,
  Edit3,
  Calendar,
  Check,
  AlertCircle,
  Copy,
  Upload,
  Download,
} from 'lucide-react';

interface ProjectWorkspaceViewProps {
  project: Project;
  screenplay: Screenplay | null;
  scenes: Scene[];
  characters: Character[];
  locations: Location[];
  shots: Shot[];
  isLoadingScreenplay: boolean;
  isLoadingScenes: boolean;
  isLoadingCharacters: boolean;
  isLoadingLocations: boolean;
  isLoadingShots: boolean;
  onBackToProjects: () => void;
  onSaveScreenplay: (content: string) => Promise<void>;
  onCreateScene: (input: CreateSceneInput) => Promise<void>;
  onUpdateScene: (sceneId: string, input: UpdateSceneInput) => Promise<void>;
  onReorderScenes: (orderedSceneIds: string[]) => Promise<void>;
  onDeleteScene: (sceneId: string) => Promise<void>;
  onCreateCharacter: (input: CreateCharacterInput) => Promise<void>;
  onUpdateCharacter: (characterId: string, input: UpdateCharacterInput) => Promise<void>;
  onDeleteCharacter: (characterId: string) => Promise<void>;
  onCreateLocation: (input: CreateLocationInput) => Promise<void>;
  onUpdateLocation: (locationId: string, input: UpdateLocationInput) => Promise<void>;
  onDeleteLocation: (locationId: string) => Promise<void>;
  onCreateShot: (input: CreateShotInput) => Promise<void>;
  onUpdateShot: (shotId: string, input: UpdateShotInput) => Promise<void>;
  onReorderShots: (sceneId: string, orderedShotIds: string[]) => Promise<void>;
  onMoveShotToScene: (shotId: string, targetSceneId: string) => Promise<void>;
  onDeleteShot: (shotId: string) => Promise<void>;
  onUpdateProject: (projectId: string, input: UpdateProjectInput) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onImportBlueprint: (blueprint: FolkverseBlueprint, mode: 'replace' | 'merge') => Promise<void>;
}

export const ProjectWorkspaceView: React.FC<ProjectWorkspaceViewProps> = ({
  project,
  screenplay,
  scenes,
  characters,
  locations,
  shots,
  isLoadingScreenplay,
  isLoadingScenes,
  isLoadingCharacters,
  isLoadingLocations,
  isLoadingShots,
  onBackToProjects,
  onSaveScreenplay,
  onCreateScene,
  onUpdateScene,
  onReorderScenes,
  onDeleteScene,
  onCreateCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation,
  onCreateShot,
  onUpdateShot,
  onReorderShots,
  onMoveShotToScene,
  onDeleteShot,
  onUpdateProject,
  onDeleteProject,
  onImportBlueprint,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'screenplay' | 'scenes' | 'shots' | 'characters' | 'locations' | 'details'
  >('overview');
  const [selectedShotSceneId, setSelectedShotSceneId] = useState<string>('');

  // Modals
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Form states for project details
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || '');
  const [genre, setGenre] = useState(project.genre || '');
  const [visualStyle, setVisualStyle] = useState(project.visual_style || 'Grounded cinematic realism');
  const [aspectRatio, setAspectRatio] = useState(project.aspect_ratio || '16:9');
  const [language, setLanguage] = useState(project.language || 'English');
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setMetaError('Project title cannot be empty.');
      return;
    }
    setMetaError(null);

    try {
      setIsSavingMeta(true);
      await onUpdateProject(project.id, {
        title: trimmedTitle,
        description: description.trim(),
        genre: genre.trim(),
        visual_style: visualStyle.trim(),
        aspect_ratio: aspectRatio.trim(),
        language: language.trim(),
      });
      setIsEditingMeta(false);
    } catch (err) {
      setMetaError(err instanceof Error ? err.message : 'Failed to update project.');
    } finally {
      setIsSavingMeta(false);
    }
  };

  const copyProjectId = () => {
    navigator.clipboard.writeText(project.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  };

  const handleJumpToShotPlanner = (sceneId: string) => {
    setSelectedShotSceneId(sceneId);
    setActiveTab('shots');
  };

  // Runtime calculation
  const totalSeconds = shots.reduce((acc, sh) => acc + (Number(sh.duration_seconds) || 0), 0);
  const runtimeMins = Math.floor(totalSeconds / 60);
  const runtimeSecs = Math.round(totalSeconds % 60);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Workspace Header */}
      <div className="bg-[#141518] border border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <button
                onClick={onBackToProjects}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Back to Projects"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold font-cinematic text-zinc-100 truncate">
                  {project.title}
                </h1>
                <button
                  onClick={copyProjectId}
                  className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Copy Project ID"
                >
                  {copiedId ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>ID: {project.id.slice(0, 8)}...</span>
                </button>
              </div>
            </div>

            {/* Sub-meta row */}
            <div className="flex items-center gap-3 text-xs text-zinc-400 pl-9 flex-wrap">
              {project.genre && (
                <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-amber-300 font-medium text-[11px]">
                  {project.genre}
                </span>
              )}
              {project.aspect_ratio && (
                <span className="text-zinc-500 text-[11px]">Ratio: {project.aspect_ratio}</span>
              )}
              <span className="text-zinc-500 text-[11px]">•</span>
              <span className="text-zinc-400 font-medium text-[11px]">
                Runtime: {runtimeMins}m {runtimeSecs}s ({shots.length} shots)
              </span>
            </div>

            {project.description && (
              <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed pl-9">
                {project.description}
              </p>
            )}
          </div>

          {/* Action Buttons: Import, Export, Edit */}
          <div className="flex items-center gap-2 self-start md:self-center pl-9 md:pl-0 flex-wrap">
            <button
              onClick={() => setImportModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Import JSON Blueprint"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Import Blueprint</span>
            </button>

            <button
              onClick={() => setExportModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export JSON Blueprint"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export Blueprint</span>
            </button>

            <button
              onClick={() => setIsEditingMeta(!isEditingMeta)}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Edit Project Details"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Edit Drawer */}
        {isEditingMeta && (
          <form
            onSubmit={handleSaveMeta}
            className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-3 mt-4 text-xs"
          >
            <h4 className="font-semibold uppercase tracking-wider text-amber-400 text-[11px]">
              Edit Project Settings
            </h4>
            {metaError && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{metaError}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Genre</label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="e.g. Historical Epic, Mythological Fantasy"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Visual Style</label>
                <input
                  type="text"
                  value={visualStyle}
                  onChange={(e) => setVisualStyle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1">Aspect Ratio</label>
                  <input
                    type="text"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    placeholder="16:9, 2.39:1"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Language</label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingMeta(false)}
                className="px-3 py-1.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingMeta}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSavingMeta && (
                  <div className="w-3 h-3 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                )}
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* Studio Navigation Tabs */}
        <div className="flex items-center gap-2 border-t border-zinc-800/80 pt-4 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-950/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Production Summary</span>
          </button>

          <button
            onClick={() => setActiveTab('scenes')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'scenes'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-950/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Clapperboard className="w-4 h-4" />
            <span>Scene Planner</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'scenes' ? 'bg-zinc-950/20 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {scenes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('shots')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'shots'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-950/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Shot Planner</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'shots' ? 'bg-zinc-950/20 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {shots.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('characters')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'characters'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-950/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Character Bible</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'characters' ? 'bg-zinc-950/20 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {characters.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('locations')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'locations'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-950/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Location Bible</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'locations' ? 'bg-zinc-950/20 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {locations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('screenplay')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'screenplay'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-950/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Screenplay Manuscript</span>
          </button>

          <button
            onClick={() => setActiveTab('details')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'details'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-950/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Project Details</span>
          </button>
        </div>
      </div>

      {/* Workspace Tab Contents */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <ProductionSummary
            project={project}
            scenes={scenes}
            shots={shots}
            characters={characters}
            locations={locations}
            onSelectScene={handleJumpToShotPlanner}
          />
        )}

        {activeTab === 'scenes' && (
          <SceneManager
            projectId={project.id}
            scenes={scenes}
            shots={shots}
            locations={locations}
            characters={characters}
            isLoading={isLoadingScenes}
            onCreateScene={onCreateScene}
            onUpdateScene={onUpdateScene}
            onReorderScenes={onReorderScenes}
            onDeleteScene={onDeleteScene}
            onSelectSceneForShots={handleJumpToShotPlanner}
          />
        )}

        {activeTab === 'shots' && (
          <ShotPlanner
            projectId={project.id}
            scenes={scenes}
            shots={shots}
            characters={characters}
            activeSceneId={selectedShotSceneId}
            isLoading={isLoadingShots}
            onCreateShot={onCreateShot}
            onUpdateShot={onUpdateShot}
            onReorderShots={onReorderShots}
            onMoveShotToScene={onMoveShotToScene}
            onDeleteShot={onDeleteShot}
          />
        )}

        {activeTab === 'characters' && (
          <CharacterManager
            projectId={project.id}
            characters={characters}
            scenes={scenes}
            shots={shots}
            isLoading={isLoadingCharacters}
            onCreateCharacter={onCreateCharacter}
            onUpdateCharacter={onUpdateCharacter}
            onDeleteCharacter={onDeleteCharacter}
          />
        )}

        {activeTab === 'locations' && (
          <LocationBible
            projectId={project.id}
            locations={locations}
            scenes={scenes}
            isLoading={isLoadingLocations}
            onCreateLocation={onCreateLocation}
            onUpdateLocation={onUpdateLocation}
            onDeleteLocation={onDeleteLocation}
          />
        )}

        {activeTab === 'screenplay' && (
          <ScreenplayEditor
            projectId={project.id}
            projectTitle={project.title}
            screenplay={screenplay}
            isLoading={isLoadingScreenplay}
            onSave={onSaveScreenplay}
          />
        )}

        {activeTab === 'details' && (
          <div className="bg-[#141518] border border-zinc-800 rounded-2xl p-6 space-y-6 text-xs">
            <div>
              <h3 className="text-base font-semibold text-zinc-100 font-cinematic">
                Project Overview & Diagnostics
              </h3>
              <p className="text-zinc-400 mt-1">
                Relational assets, schema compliance, and project metadata
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-2">
                <span className="text-zinc-500 block uppercase tracking-wider text-[10px] font-semibold">
                  Stable Project Identifier
                </span>
                <span className="font-mono text-zinc-200 select-all block break-all">
                  {project.id}
                </span>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-2">
                <span className="text-zinc-500 block uppercase tracking-wider text-[10px] font-semibold">
                  Owner User Identifier
                </span>
                <span className="font-mono text-zinc-200 select-all block break-all">
                  {project.user_id}
                </span>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-1">
                <span className="text-zinc-500 block uppercase tracking-wider text-[10px] font-semibold">
                  Created At
                </span>
                <span className="text-zinc-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  {new Date(project.created_at).toLocaleString()}
                </span>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-1">
                <span className="text-zinc-500 block uppercase tracking-wider text-[10px] font-semibold">
                  Last Updated
                </span>
                <span className="text-zinc-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  {new Date(project.updated_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-red-400">Danger Zone</h4>
                <p className="text-zinc-500 mt-0.5">
                  Permanently delete this project and all its screenplay, scenes, shots, characters, and locations.
                </p>
              </div>
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 self-start sm:self-auto"
              >
                <Trash2 className="w-4 h-4" />
                Delete Project
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        title="Delete Project"
        message={`Are you sure you want to permanently delete "${project.title}"? This will delete all ${scenes.length} scenes, ${shots.length} shots, ${characters.length} characters, and ${locations.length} locations.`}
        confirmLabel="Permanently Delete Project"
        cancelLabel="Keep Project"
        isDestructive={true}
        onConfirm={async () => {
          await onDeleteProject(project.id);
          onBackToProjects();
        }}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      {/* Import Blueprint Modal */}
      <ImportBlueprintModal
        isOpen={importModalOpen}
        activeProject={project}
        onClose={() => setImportModalOpen(false)}
        onImportNewProject={async (bp) => {
          // Handled at App level if called
          await onImportBlueprint(bp, 'replace');
        }}
        onImportActiveProject={async (bp, mode) => {
          await onImportBlueprint(bp, mode);
        }}
      />

      {/* Export Blueprint Modal */}
      <ExportBlueprintModal
        isOpen={exportModalOpen}
        project={project}
        characters={characters}
        locations={locations}
        scenes={scenes}
        shots={shots}
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  );
};
