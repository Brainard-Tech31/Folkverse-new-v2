/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import type {
  Project,
  Screenplay,
  Scene,
  Character,
  Location,
  Shot,
  CreateProjectInput,
  UpdateProjectInput,
  CreateSceneInput,
  UpdateSceneInput,
  CreateCharacterInput,
  UpdateCharacterInput,
  CreateLocationInput,
  UpdateLocationInput,
  CreateShotInput,
  UpdateShotInput,
  FolkverseBlueprint,
} from './types/database.ts';
import * as api from './services/api.ts';
import { Navigation } from './components/Navigation.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { ProjectsView } from './components/ProjectsView.tsx';
import { ProjectWorkspaceView } from './components/ProjectWorkspaceView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { SupabaseConfigModal } from './components/SupabaseConfigModal.tsx';
import { ImportBlueprintModal } from './components/ImportBlueprintModal.tsx';
import { AlertCircle, Film } from 'lucide-react';

function MainApp() {
  const { user, loading: authLoading, isConfigured } = useAuth();

  const [currentView, setCurrentView] = useState<'dashboard' | 'projects' | 'workspace' | 'settings'>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [screenplay, setScreenplay] = useState<Screenplay | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);

  // Loading states
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false);
  const [isLoadingScreenplay, setIsLoadingScreenplay] = useState<boolean>(false);
  const [isLoadingScenes, setIsLoadingScenes] = useState<boolean>(false);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState<boolean>(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState<boolean>(false);
  const [isLoadingShots, setIsLoadingShots] = useState<boolean>(false);

  // Global Notification / Error Banner
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [dbConfigModalOpen, setDbConfigModalOpen] = useState<boolean>(false);
  const [globalImportModalOpen, setGlobalImportModalOpen] = useState<boolean>(false);

  // 1. Load Projects when authenticated and configured
  const loadProjects = useCallback(async () => {
    if (!isConfigured || !user) {
      setProjects([]);
      setActiveProject(null);
      return;
    }

    try {
      setIsLoadingProjects(true);
      setGlobalError(null);
      const list = await api.fetchProjects();
      setProjects(list);

      // Reopen project from session/hash if present
      const storedActiveId =
        window.location.hash.startsWith('#/project/')
          ? window.location.hash.replace('#/project/', '')
          : sessionStorage.getItem('folkverse_active_project_id');

      if (storedActiveId) {
        const found = list.find((p) => p.id === storedActiveId);
        if (found) {
          setActiveProject(found);
          setCurrentView('workspace');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load projects';
      setGlobalError(msg);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [isConfigured, user]);

  useEffect(() => {
    if (!authLoading) {
      loadProjects();
    }
  }, [authLoading, loadProjects]);

  // 2. Load Workspace details when active project changes
  const loadProjectData = useCallback(async (projectId: string) => {
    if (!isConfigured || !user) return;

    // Load screenplay
    setIsLoadingScreenplay(true);
    try {
      const sp = await api.fetchScreenplay(projectId);
      setScreenplay(sp);
    } catch (err) {
      console.error('Failed to load screenplay:', err);
    } finally {
      setIsLoadingScreenplay(false);
    }

    // Load scenes
    setIsLoadingScenes(true);
    try {
      const scList = await api.fetchScenes(projectId);
      setScenes(scList);
    } catch (err) {
      console.error('Failed to load scenes:', err);
    } finally {
      setIsLoadingScenes(false);
    }

    // Load characters
    setIsLoadingCharacters(true);
    try {
      const chList = await api.fetchCharacters(projectId);
      setCharacters(chList);
    } catch (err) {
      console.error('Failed to load characters:', err);
    } finally {
      setIsLoadingCharacters(false);
    }

    // Load locations
    setIsLoadingLocations(true);
    try {
      const locList = await api.fetchLocations(projectId);
      setLocations(locList);
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setIsLoadingLocations(false);
    }

    // Load shots
    setIsLoadingShots(true);
    try {
      const shList = await api.fetchShots(projectId);
      setShots(shList);
    } catch (err) {
      console.error('Failed to load shots:', err);
    } finally {
      setIsLoadingShots(false);
    }
  }, [isConfigured, user]);

  useEffect(() => {
    if (activeProject) {
      try {
        sessionStorage.setItem('folkverse_active_project_id', activeProject.id);
        window.location.hash = `#/project/${activeProject.id}`;
      } catch {
        // Ignore
      }
      loadProjectData(activeProject.id);
    } else {
      setScreenplay(null);
      setScenes([]);
      setCharacters([]);
      setLocations([]);
      setShots([]);
    }
  }, [activeProject, loadProjectData]);

  // Project selection
  const handleSelectProject = (project: Project) => {
    setActiveProject(project);
    setCurrentView('workspace');
  };

  // Project Actions
  const handleCreateProject = async (input: CreateProjectInput) => {
    setGlobalError(null);
    const created = await api.createProject(input);
    setProjects((prev) => [created, ...prev]);
    setActiveProject(created);
    setCurrentView('workspace');
  };

  const handleUpdateProject = async (projectId: string, input: UpdateProjectInput) => {
    setGlobalError(null);
    const updated = await api.updateProject(projectId, input);
    setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
    if (activeProject?.id === projectId) {
      setActiveProject(updated);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setGlobalError(null);
    await api.deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (activeProject?.id === projectId) {
      setActiveProject(null);
      sessionStorage.removeItem('folkverse_active_project_id');
      window.location.hash = '';
      setCurrentView('projects');
    }
  };

  // Screenplay Actions
  const handleSaveScreenplay = async (content: string) => {
    if (!activeProject) throw new Error('No active project selected.');
    setGlobalError(null);
    const updated = await api.saveScreenplay(activeProject.id, content);
    setScreenplay(updated);
  };

  // Scene Actions
  const handleCreateScene = async (input: CreateSceneInput) => {
    setGlobalError(null);
    const created = await api.createScene(input);
    setScenes((prev) => [...prev, created].sort((a, b) => a.scene_order - b.scene_order));
  };

  const handleUpdateScene = async (sceneId: string, input: UpdateSceneInput) => {
    setGlobalError(null);
    const updated = await api.updateScene(sceneId, input);
    setScenes((prev) => prev.map((s) => (s.id === sceneId ? updated : s)));
  };

  const handleReorderScenes = async (orderedSceneIds: string[]) => {
    if (!activeProject) return;
    setGlobalError(null);
    const refreshed = await api.reorderScenes(activeProject.id, orderedSceneIds);
    setScenes(refreshed);
  };

  const handleDeleteScene = async (sceneId: string) => {
    setGlobalError(null);
    await api.deleteScene(sceneId);
    setScenes((prev) => prev.filter((s) => s.id !== sceneId));
    setShots((prev) => prev.filter((sh) => sh.scene_id !== sceneId));
  };

  // Character Actions
  const handleCreateCharacter = async (input: CreateCharacterInput) => {
    setGlobalError(null);
    const created = await api.createCharacter(input);
    setCharacters((prev) => [...prev, created]);
  };

  const handleUpdateCharacter = async (characterId: string, input: UpdateCharacterInput) => {
    setGlobalError(null);
    const updated = await api.updateCharacter(characterId, input);
    setCharacters((prev) => prev.map((c) => (c.id === characterId ? updated : c)));
  };

  const handleDeleteCharacter = async (characterId: string) => {
    setGlobalError(null);
    await api.deleteCharacter(characterId);
    setCharacters((prev) => prev.filter((c) => c.id !== characterId));
  };

  // Location Actions
  const handleCreateLocation = async (input: CreateLocationInput) => {
    setGlobalError(null);
    const created = await api.createLocation(input);
    setLocations((prev) => [...prev, created]);
  };

  const handleUpdateLocation = async (locationId: string, input: UpdateLocationInput) => {
    setGlobalError(null);
    const updated = await api.updateLocation(locationId, input);
    setLocations((prev) => prev.map((l) => (l.id === locationId ? updated : l)));
  };

  const handleDeleteLocation = async (locationId: string) => {
    setGlobalError(null);
    await api.deleteLocation(locationId);
    setLocations((prev) => prev.filter((l) => l.id !== locationId));
  };

  // Shot Actions
  const handleCreateShot = async (input: CreateShotInput) => {
    setGlobalError(null);
    const created = await api.createShot(input);
    setShots((prev) => [...prev, created].sort((a, b) => a.shot_order - b.shot_order));
  };

  const handleUpdateShot = async (shotId: string, input: UpdateShotInput) => {
    setGlobalError(null);
    const updated = await api.updateShot(shotId, input);
    setShots((prev) => prev.map((sh) => (sh.id === shotId ? updated : sh)));
  };

  const handleReorderShots = async (sceneId: string, orderedShotIds: string[]) => {
    if (!activeProject) return;
    setGlobalError(null);
    const refreshed = await api.reorderShots(activeProject.id, sceneId, orderedShotIds);
    setShots(refreshed);
  };

  const handleMoveShotToScene = async (shotId: string, targetSceneId: string) => {
    if (!activeProject) return;
    setGlobalError(null);
    await api.moveShotToScene(shotId, targetSceneId);
    const refreshed = await api.fetchShots(activeProject.id);
    setShots(refreshed);
  };

  const handleDeleteShot = async (shotId: string) => {
    setGlobalError(null);
    await api.deleteShot(shotId);
    setShots((prev) => prev.filter((sh) => sh.id !== shotId));
  };

  // Blueprint Import Actions
  const handleImportNewProject = async (blueprint: FolkverseBlueprint) => {
    setGlobalError(null);
    const res = await api.createProjectFromBlueprint(blueprint);
    setProjects((prev) => [res.project, ...prev]);
    setActiveProject(res.project);
    setCharacters(res.characters);
    setLocations(res.locations);
    setScenes(res.scenes);
    setShots(res.shots);
    setCurrentView('workspace');
  };

  const handleImportActiveProject = async (
    blueprint: FolkverseBlueprint,
    mode: 'replace' | 'merge'
  ) => {
    if (!activeProject) return;
    setGlobalError(null);
    const res = await api.importBlueprintToProject(activeProject.id, blueprint, mode);
    setActiveProject(res.project);
    setProjects((prev) => prev.map((p) => (p.id === activeProject.id ? res.project : p)));
    setCharacters(res.characters);
    setLocations(res.locations);
    setScenes(res.scenes);
    setShots(res.shots);
  };

  // Full page authentication initialization state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0c0d0e] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-pulse">
          <Film className="w-6 h-6" />
        </div>
        <div className="space-y-1 text-center">
          <h2 className="text-sm font-semibold tracking-widest uppercase font-cinematic text-zinc-200">
            FOLKVERSE STUDIO
          </h2>
          <p className="text-xs text-zinc-500">Initializing storytelling workspace session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0d0e] text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* Top Navigation */}
      <Navigation
        currentView={currentView}
        onNavigate={(view) => {
          setGlobalError(null);
          setCurrentView(view);
        }}
        activeProject={activeProject}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenDbConfig={() => setDbConfigModalOpen(true)}
        onOpenImportModal={() => setGlobalImportModalOpen(true)}
      />

      {/* Global Error Banner */}
      {globalError && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-2.5 text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span className="font-medium">{globalError}</span>
          </div>
          <button
            onClick={() => setGlobalError(null)}
            className="text-red-400 hover:text-red-200 text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Areas */}
      <main className="flex-1 pb-16">
        {currentView === 'dashboard' && (
          <DashboardView
            projects={projects}
            activeProject={activeProject}
            onSelectProject={handleSelectProject}
            onOpenCreateModal={() => setCurrentView('projects')}
            onOpenImportModal={() => setGlobalImportModalOpen(true)}
            onNavigate={(view) => setCurrentView(view)}
            onOpenAuth={() => setAuthModalOpen(true)}
            onOpenDbConfig={() => setDbConfigModalOpen(true)}
          />
        )}

        {currentView === 'projects' && (
          <ProjectsView
            projects={projects}
            activeProject={activeProject}
            isLoading={isLoadingProjects}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onOpenImportModal={() => setGlobalImportModalOpen(true)}
            onOpenAuth={() => setAuthModalOpen(true)}
            onOpenDbConfig={() => setDbConfigModalOpen(true)}
          />
        )}

        {currentView === 'workspace' && activeProject && (
          <ProjectWorkspaceView
            project={activeProject}
            screenplay={screenplay}
            scenes={scenes}
            characters={characters}
            locations={locations}
            shots={shots}
            isLoadingScreenplay={isLoadingScreenplay}
            isLoadingScenes={isLoadingScenes}
            isLoadingCharacters={isLoadingCharacters}
            isLoadingLocations={isLoadingLocations}
            isLoadingShots={isLoadingShots}
            onBackToProjects={() => setCurrentView('projects')}
            onSaveScreenplay={handleSaveScreenplay}
            onCreateScene={handleCreateScene}
            onUpdateScene={handleUpdateScene}
            onReorderScenes={handleReorderScenes}
            onDeleteScene={handleDeleteScene}
            onCreateCharacter={handleCreateCharacter}
            onUpdateCharacter={handleUpdateCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onCreateLocation={handleCreateLocation}
            onUpdateLocation={handleUpdateLocation}
            onDeleteLocation={handleDeleteLocation}
            onCreateShot={handleCreateShot}
            onUpdateShot={handleUpdateShot}
            onReorderShots={handleReorderShots}
            onMoveShotToScene={handleMoveShotToScene}
            onDeleteShot={handleDeleteShot}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onImportBlueprint={async (bp, mode) => {
              if (mode === 'replace') {
                await handleImportActiveProject(bp, 'replace');
              } else {
                await handleImportActiveProject(bp, 'merge');
              }
            }}
          />
        )}

        {currentView === 'workspace' && !activeProject && (
          <div className="max-w-md mx-auto my-24 p-8 text-center bg-[#141518] border border-zinc-800 rounded-2xl space-y-4">
            <Film className="w-10 h-10 text-zinc-600 mx-auto" />
            <h2 className="text-base font-semibold text-zinc-200 font-cinematic">
              No Project Open
            </h2>
            <p className="text-xs text-zinc-400">
              Select or create a story project from your library to open its production studio.
            </p>
            <button
              onClick={() => setCurrentView('projects')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              Go to My Projects
            </button>
          </div>
        )}

        {currentView === 'settings' && (
          <SettingsView
            onOpenAuth={() => setAuthModalOpen(true)}
            onOpenDbConfig={() => setDbConfigModalOpen(true)}
          />
        )}
      </main>

      {/* Global Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <SupabaseConfigModal
        isOpen={dbConfigModalOpen}
        onClose={() => setDbConfigModalOpen(false)}
      />

      <ImportBlueprintModal
        isOpen={globalImportModalOpen}
        activeProject={activeProject}
        onClose={() => setGlobalImportModalOpen(false)}
        onImportNewProject={handleImportNewProject}
        onImportActiveProject={handleImportActiveProject}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
