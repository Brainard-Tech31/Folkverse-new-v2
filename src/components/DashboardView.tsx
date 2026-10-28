/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { Project } from '../types/database.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  Sparkles,
  Film,
  Plus,
  FolderKanban,
  FileText,
  Users,
  Calendar,
  ArrowRight,
  Database,
  Lock,
  Layers,
  Upload,
  Camera,
  MapPin,
} from 'lucide-react';

interface DashboardViewProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (project: Project) => void;
  onOpenCreateModal: () => void;
  onOpenImportModal: () => void;
  onNavigate: (view: 'dashboard' | 'projects' | 'workspace' | 'settings') => void;
  onOpenAuth: () => void;
  onOpenDbConfig: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onOpenCreateModal,
  onOpenImportModal,
  onNavigate,
  onOpenAuth,
  onOpenDbConfig,
}) => {
  const { user, isConfigured } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-[#141518] to-zinc-950 p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Phase 2: Cinematic Production Studio & JSON Blueprint Engine
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-cinematic text-zinc-100 tracking-wide">
            Manual Cinematic Story Studio
          </h1>
          <p className="text-sm md:text-base text-zinc-400 leading-relaxed font-sans">
            Architect complete cinematic productions through importable & exportable JSON blueprints. Plan camera angles, shot durations, image prompts, motion directions, dialogue, and location bibles with full PostgreSQL persistence.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {user ? (
              <>
                <button
                  onClick={onOpenCreateModal}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm rounded-xl transition-all shadow-md shadow-amber-950/40 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create New Project
                </button>

                <button
                  onClick={onOpenImportModal}
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 font-semibold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Upload className="w-4 h-4 text-amber-400" />
                  Import Blueprint (JSON)
                </button>
              </>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm rounded-xl transition-all shadow-md shadow-amber-950/40 flex items-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                Sign In to Start
              </button>
            )}

            <button
              onClick={() => onNavigate('projects')}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-medium text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <FolderKanban className="w-4 h-4 text-zinc-400" />
              View Projects ({projects.length})
            </button>
          </div>
        </div>
      </div>

      {/* Supabase status warning if unconfigured */}
      {!isConfigured && (
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-200">
                Supabase Persistence Setup Required
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Configure your Supabase project URL and public anon key to enable authenticated cloud storage and PostgreSQL persistence.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenDbConfig}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            Configure Supabase
          </button>
        </div>
      )}

      {/* Core Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Projects</span>
            <FolderKanban className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-cinematic text-zinc-100">
            {projects.length}
          </div>
          <p className="text-[11px] text-zinc-500">Authenticated story archives</p>
        </div>

        <div className="p-5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Workspace</span>
            <Film className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-base font-semibold text-zinc-100 truncate">
            {activeProject ? activeProject.title : 'None Selected'}
          </div>
          <p className="text-[11px] text-zinc-500">
            {activeProject ? 'Ready for production planning' : 'Open a project to begin'}
          </p>
        </div>

        <div className="p-5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium uppercase tracking-wider">Blueprint Engine</span>
            <Upload className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-semibold text-emerald-400">
            Schema v1.0 Ready
          </div>
          <p className="text-[11px] text-zinc-500">Import & Export validated</p>
        </div>

        <div className="p-5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium uppercase tracking-wider">Studio Engine</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm font-semibold text-amber-300">
            Manual Cinematic Studio
          </div>
          <p className="text-[11px] text-zinc-500">No AI API dependencies</p>
        </div>
      </div>

      {/* Recent Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-zinc-100 font-cinematic">
              Recent Projects
            </h2>
            <p className="text-xs text-zinc-400">
              Your narrative archives and cinematic storytelling workspaces
            </p>
          </div>
          {projects.length > 0 && (
            <button
              onClick={() => onNavigate('projects')}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              View all ({projects.length}) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-3">
            <Film className="w-10 h-10 text-zinc-600 mx-auto" />
            <h3 className="text-sm font-semibold text-zinc-300">No projects yet</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {user
                ? 'Create a project or import a JSON blueprint to start planning scenes, shots, and character bibles.'
                : 'Sign in to access your saved projects or import a cinematic narrative.'}
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              {user ? (
                <>
                  <button
                    onClick={onOpenCreateModal}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Create Project
                  </button>
                  <button
                    onClick={onOpenImportModal}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-amber-500/30 text-amber-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Import Blueprint
                  </button>
                </>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Sign In Now
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 3).map((project) => {
              const isActive = activeProject?.id === project.id;
              return (
                <div
                  key={project.id}
                  className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                    isActive
                      ? 'bg-zinc-900 border-amber-500/50 shadow-md shadow-amber-950/20'
                      : 'bg-[#141518] border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center text-amber-400 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      {isActive && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Active
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold text-zinc-100 text-base leading-snug">
                        {project.title}
                      </h3>
                      {project.genre && (
                        <span className="text-[10px] font-medium text-amber-400 block mt-0.5">
                          {project.genre}
                        </span>
                      )}
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                        {project.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>

                    <button
                      onClick={() => {
                        onSelectProject(project);
                        onNavigate('workspace');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Open Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Phase 2 Studio Highlights */}
      <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-400 font-cinematic">
          Phase 2 Cinematic Studio Capabilities
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-zinc-400">
          <div className="p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800/60 space-y-1.5">
            <span className="font-semibold text-zinc-200 block flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-400" />
              JSON Blueprint Engine
            </span>
            <p className="leading-relaxed">
              Validate, import, and export entire cinematic productions with schema v1.0 compliance and full relational cross-references.
            </p>
          </div>
          <div className="p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800/60 space-y-1.5">
            <span className="font-semibold text-zinc-200 block flex items-center gap-2">
              <Camera className="w-4 h-4 text-amber-400" />
              Shot Planner & Prompts
            </span>
            <p className="leading-relaxed">
              Plan camera angles, movements, durations, image prompts, motion directions, and dialogue lines with actor voice notes.
            </p>
          </div>
          <div className="p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800/60 space-y-1.5">
            <span className="font-semibold text-zinc-200 block flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Character & Location Bibles
            </span>
            <p className="leading-relaxed">
              Track actor appearances, costumes, visual lighting notes, and safeguard referenced characters from accidental deletion.
            </p>
          </div>
          <div className="p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800/60 space-y-1.5">
            <span className="font-semibold text-zinc-200 block flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Production Health Checks
            </span>
            <p className="leading-relaxed">
              Monitor total estimated runtime, scene duration distributions, missing prompts, and unresolved character dialogue records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
