/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import type { Project } from '../types/database.ts';
import {
  Sparkles,
  LayoutDashboard,
  FolderKanban,
  Film,
  Database,
  User,
  LogOut,
  LogIn,
  Settings,
  ChevronRight,
  Upload,
} from 'lucide-react';

interface NavigationProps {
  currentView: 'dashboard' | 'projects' | 'workspace' | 'settings';
  onNavigate: (view: 'dashboard' | 'projects' | 'workspace' | 'settings') => void;
  activeProject: Project | null;
  onOpenAuth: () => void;
  onOpenDbConfig: () => void;
  onOpenImportModal?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onNavigate,
  activeProject,
  onOpenAuth,
  onOpenDbConfig,
  onOpenImportModal,
}) => {
  const { user, signOut, isConfigured } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#0c0d0e]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 group cursor-pointer text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-700/30 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:border-amber-400 transition-all shadow-sm shadow-amber-950/30">
              <Sparkles className="w-5 h-5 text-amber-400 group-hover:scale-105 transition-transform" />
            </div>
            <div>
              <span className="font-cinematic font-bold text-lg tracking-wider text-zinc-100 flex items-center gap-2">
                FOLKVERSE
                <span className="text-[10px] font-sans font-medium px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 tracking-normal">
                  STUDIO
                </span>
              </span>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-zinc-800 text-sm font-medium">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
                currentView === 'dashboard'
                  ? 'bg-zinc-800 text-amber-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>

            <button
              onClick={() => onNavigate('projects')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
                currentView === 'projects'
                  ? 'bg-zinc-800 text-amber-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              My Projects
            </button>

            {activeProject && (
              <button
                onClick={() => onNavigate('workspace')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
                  currentView === 'workspace'
                    ? 'bg-zinc-800 text-amber-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Film className="w-4 h-4" />
                <span className="max-w-[150px] truncate">{activeProject.title}</span>
              </button>
            )}
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Quick Import Blueprint Button */}
          {onOpenImportModal && (
            <button
              onClick={onOpenImportModal}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Import JSON Blueprint"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Import Blueprint</span>
            </button>
          )}

          {/* Supabase Connection Status Pill */}
          <button
            onClick={onOpenDbConfig}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer ${
              isConfigured
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/40'
                : 'bg-amber-950/20 border-amber-500/30 text-amber-300 hover:bg-amber-950/40'
            }`}
            title="Configure Supabase Database"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isConfigured ? 'Supabase Connected' : 'Supabase Setup'}
            </span>
            <div
              className={`w-2 h-2 rounded-full ${
                isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
          </button>

          {/* Settings link */}
          <button
            onClick={() => onNavigate('settings')}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              currentView === 'settings'
                ? 'bg-zinc-800 text-amber-400'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Account / Sign In */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs text-zinc-200 transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span className="max-w-[120px] truncate">{user.email}</span>
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#141518] border border-zinc-800 shadow-xl z-50 py-1.5 text-xs text-zinc-200">
                    <div className="px-3 py-2 border-b border-zinc-800/80">
                      <p className="text-[11px] text-zinc-500">Signed in as</p>
                      <p className="font-medium text-zinc-200 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onNavigate('settings');
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-zinc-800 flex items-center justify-between text-zinc-300 hover:text-white cursor-pointer"
                    >
                      <span>Settings & Database</span>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut();
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-zinc-800 flex items-center gap-2 text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shadow-amber-950/30"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center justify-around border-t border-zinc-800/60 bg-zinc-950/60 py-2 px-4 text-xs font-medium">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`py-1 px-2 rounded-md ${
            currentView === 'dashboard' ? 'text-amber-400 font-semibold' : 'text-zinc-400'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onNavigate('projects')}
          className={`py-1 px-2 rounded-md ${
            currentView === 'projects' ? 'text-amber-400 font-semibold' : 'text-zinc-400'
          }`}
        >
          My Projects
        </button>
        {activeProject && (
          <button
            onClick={() => onNavigate('workspace')}
            className={`py-1 px-2 rounded-md ${
              currentView === 'workspace' ? 'text-amber-400 font-semibold' : 'text-zinc-400'
            }`}
          >
            Workspace
          </button>
        )}
      </div>
    </header>
  );
};
