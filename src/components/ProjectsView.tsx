/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { Project, CreateProjectInput, UpdateProjectInput } from '../types/database.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { ConfirmationModal } from './ConfirmationModal.tsx';
import {
  Plus,
  Search,
  FolderKanban,
  Edit2,
  Trash2,
  ArrowRight,
  Clock,
  Lock,
  X,
  AlertCircle,
  Database,
  Upload,
} from 'lucide-react';

interface ProjectsViewProps {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  onSelectProject: (project: Project) => void;
  onCreateProject: (input: CreateProjectInput) => Promise<void>;
  onUpdateProject: (projectId: string, input: UpdateProjectInput) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onOpenImportModal: () => void;
  onOpenAuth: () => void;
  onOpenDbConfig: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  activeProject,
  isLoading,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onOpenImportModal,
  onOpenAuth,
  onOpenDbConfig,
}) => {
  const { user, isConfigured } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [visualStyle, setVisualStyle] = useState('Grounded cinematic realism');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [language, setLanguage] = useState('English');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.genre && p.genre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setGenre('');
    setVisualStyle('Grounded cinematic realism');
    setAspectRatio('16:9');
    setLanguage('English');
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setTitle(project.title);
    setDescription(project.description || '');
    setGenre(project.genre || '');
    setVisualStyle(project.visual_style || 'Grounded cinematic realism');
    setAspectRatio(project.aspect_ratio || '16:9');
    setLanguage(project.language || 'English');
    setFormError(null);
    setEditingProject(project);
  };

  const handleOpenDelete = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingProject(project);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Project title is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreateProject({
        title: trimmedTitle,
        description: description.trim(),
        genre: genre.trim(),
        visual_style: visualStyle.trim(),
        aspect_ratio: aspectRatio.trim(),
        language: language.trim(),
      });
      setCreateModalOpen(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setFormError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Project title cannot be empty.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onUpdateProject(editingProject.id, {
        title: trimmedTitle,
        description: description.trim(),
        genre: genre.trim(),
        visual_style: visualStyle.trim(),
        aspect_ratio: aspectRatio.trim(),
        language: language.trim(),
      });
      setEditingProject(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject) return;
    try {
      setIsSubmitting(true);
      await onDeleteProject(deletingProject.id);
      setDeletingProject(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-cinematic text-zinc-100 tracking-wide">
            My Story Projects
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage your narrative universes, screenplays, scenes, shots, and production bibles
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={onOpenImportModal}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 font-medium text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                Import Blueprint
              </button>

              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all shadow-md shadow-amber-950/40 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all shadow-md shadow-amber-950/40 flex items-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              Sign In to Create Projects
            </button>
          )}
        </div>
      </div>

      {/* Supabase status warning if unconfigured */}
      {!isConfigured && (
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 flex items-center justify-between gap-4 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Remote Supabase persistence is unconfigured. Connect Supabase to save and load your projects.
            </span>
          </div>
          <button
            onClick={onOpenDbConfig}
            className="underline font-semibold text-amber-300 hover:text-amber-200 cursor-pointer"
          >
            Setup Supabase
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search projects by title, description, or genre..."
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500/60 transition-all"
        />
      </div>

      {/* Projects List */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-400">Loading your project library...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-3">
          <FolderKanban className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-300">
            {searchTerm ? 'No projects match your search' : 'No projects found'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {searchTerm
              ? 'Try modifying your search keywords or clear the filter.'
              : user
              ? 'Get started by creating a new narrative project or importing a JSON production blueprint.'
              : 'Sign in to access your saved storytelling projects.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            {user ? (
              <>
                <button
                  onClick={handleOpenCreate}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Create Project
                </button>
                <button
                  onClick={onOpenImportModal}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Import Blueprint
                </button>
              </>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const isActive = activeProject?.id === project.id;
            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project)}
                className={`group p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-zinc-900 border-amber-500/60 shadow-lg shadow-amber-950/20'
                    : 'bg-[#141518] border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-9 h-9 rounded-lg bg-zinc-800/90 flex items-center justify-center text-amber-400 shrink-0">
                      <FolderKanban className="w-4 h-4" />
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleOpenEdit(project, e)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Edit Project Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleOpenDelete(project, e)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-100 text-base leading-snug group-hover:text-amber-300 transition-colors">
                        {project.title}
                      </h3>
                      {isActive && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Active
                        </span>
                      )}
                    </div>

                    {project.genre && (
                      <span className="text-[11px] font-medium text-amber-400/90 block mt-1">
                        {project.genre}
                      </span>
                    )}

                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                      {project.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-1 text-amber-400/90 group-hover:text-amber-300 font-medium text-xs">
                    <span>Open Studio</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#141518] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100 font-cinematic">
                Create Story Project
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-medium text-zinc-300 mb-1">
                  Project Title <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Chronicles of the Baobab Tree"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Genre</label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="e.g. Historical Fantasy"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Language</label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Visual Style</label>
                  <input
                    type="text"
                    value={visualStyle}
                    onChange={(e) => setVisualStyle(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Aspect Ratio</label>
                  <input
                    type="text"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    placeholder="16:9, 2.39:1"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2.5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A cinematic saga set across three kingdoms exploring lineage, ancestral spirits, and forgotten proverbs."
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500/60 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 font-medium text-zinc-400 hover:text-white rounded-lg cursor-pointer"
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
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#141518] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100 font-cinematic">
                Edit Project Details
              </h3>
              <button
                onClick={() => setEditingProject(null)}
                className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-medium text-zinc-300 mb-1">
                  Project Title <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Genre</label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Language</label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Visual Style</label>
                  <input
                    type="text"
                    value={visualStyle}
                    onChange={(e) => setVisualStyle(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-300 mb-1">Aspect Ratio</label>
                  <input
                    type="text"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2.5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-hidden focus:border-amber-500/60 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 font-medium text-zinc-400 hover:text-white rounded-lg cursor-pointer"
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deletingProject}
        title="Delete Project"
        message={`Are you sure you want to permanently delete "${deletingProject?.title}"? All associated screenplays, scenes, shots, and character profiles will be permanently removed.`}
        confirmLabel="Delete Project Permanently"
        cancelLabel="Keep Project"
        isDestructive={true}
        isLoading={isSubmitting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingProject(null)}
      />
    </div>
  );
};
