/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type {
  Project,
  Scene,
  Shot,
  Character,
  Location,
  ProductionAsset,
  ShotProductionStatus,
} from '../types/database.ts';
import { SHOT_PRODUCTION_STATUSES } from '../types/database.ts';
import {
  Film,
  Camera,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Image as ImageIcon,
  Video,
  Volume2,
  FileText,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Star,
} from 'lucide-react';

interface ProductionDashboardViewProps {
  project: Project;
  scenes: Scene[];
  shots: Shot[];
  characters: Character[];
  locations: Location[];
  assets: ProductionAsset[];
  onOpenShotDetail: (shot: Shot) => void;
  onJumpToScenes: () => void;
  onJumpToShotPlanner: (sceneId?: string) => void;
}

export const ProductionDashboardView: React.FC<ProductionDashboardViewProps> = ({
  project,
  scenes,
  shots,
  characters,
  locations,
  assets,
  onOpenShotDetail,
  onJumpToScenes,
  onJumpToShotPlanner,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | ShotProductionStatus | 'missing_prompts' | 'missing_image' | 'missing_video'>('all');
  const [sceneFilter, setSceneFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Total runtime
  const totalSeconds = shots.reduce((acc, sh) => acc + (Number(sh.duration_seconds) || 0), 0);
  const runtimeMins = Math.floor(totalSeconds / 60);
  const runtimeSecs = Math.round(totalSeconds % 60);

  // Status Counts
  const statusCounts: Record<ShotProductionStatus, number> = {
    'Not Started': 0,
    'Prompt Ready': 0,
    'Image Generated': 0,
    'Video Generated': 0,
    'In Review': 0,
    Approved: 0,
    'Needs Revision': 0,
  };

  shots.forEach((sh) => {
    const st = sh.production_status || 'Not Started';
    if (statusCounts[st] !== undefined) {
      statusCounts[st]++;
    } else {
      statusCounts['Not Started']++;
    }
  });

  // Prompt & Media Asset Health Checks
  const shotsMissingPrompts = shots.filter(
    (sh) => !sh.image_prompt?.trim() || !sh.motion_prompt?.trim()
  );

  const shotsWithoutImages = shots.filter((sh) => {
    const hasImage = assets.some(
      (a) => a.shot_id === sh.id && a.asset_type === 'image'
    );
    return !hasImage;
  });

  const shotsWithoutVideo = shots.filter((sh) => {
    const hasVideo = assets.some(
      (a) => a.shot_id === sh.id && a.asset_type === 'video'
    );
    return !hasVideo;
  });

  // Completed Audiovisual Shots (Both Image and Video generated/attached)
  const audiovisualCompleteShots = shots.filter((sh) => {
    const hasImage = assets.some((a) => a.shot_id === sh.id && a.asset_type === 'image');
    const hasVideo = assets.some((a) => a.shot_id === sh.id && a.asset_type === 'video');
    return hasImage && hasVideo;
  });

  // Asset counts by type
  const imageAssetsCount = assets.filter((a) => a.asset_type === 'image').length;
  const videoAssetsCount = assets.filter((a) => a.asset_type === 'video').length;
  const audioAssetsCount = assets.filter((a) => a.asset_type === 'audio').length;
  const referenceAssetsCount = assets.filter(
    (a) =>
      a.asset_type === 'character_reference' ||
      a.asset_type === 'location_reference' ||
      a.asset_type === 'reference_file'
  ).length;

  // Real completion percentage calculation
  const totalShots = shots.length;
  const approvedPercentage = totalShots > 0 ? Math.round((statusCounts.Approved / totalShots) * 100) : 0;
  const audiovisualPercentage = totalShots > 0 ? Math.round((audiovisualCompleteShots.length / totalShots) * 100) : 0;
  const promptReadyPercentage = totalShots > 0 ? Math.round(((totalShots - shotsMissingPrompts.length) / totalShots) * 100) : 0;

  // Filtering shots for interactive table
  const filteredShots = shots.filter((sh) => {
    // Scene filter
    if (sceneFilter !== 'all' && sh.scene_id !== sceneFilter) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = sh.title.toLowerCase().includes(q);
      const matchAction = (sh.action || '').toLowerCase().includes(q);
      if (!matchTitle && !matchAction) return false;
    }

    // Status filter
    if (statusFilter === 'all') return true;
    if (statusFilter === 'missing_prompts') {
      return !sh.image_prompt?.trim() || !sh.motion_prompt?.trim();
    }
    if (statusFilter === 'missing_image') {
      return !assets.some((a) => a.shot_id === sh.id && a.asset_type === 'image');
    }
    if (statusFilter === 'missing_video') {
      return !assets.some((a) => a.shot_id === sh.id && a.asset_type === 'video');
    }
    return (sh.production_status || 'Not Started') === statusFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Header Overview & KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Shots & Runtime */}
        <div className="bg-[#141518] border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Production Scope</span>
            <Film className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">{totalShots} Shots</div>
          <div className="text-xs text-zinc-400 flex items-center gap-1.5 pt-1">
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            <span>{scenes.length} Scenes</span>
            <span>•</span>
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>{runtimeMins}m {runtimeSecs}s</span>
          </div>
        </div>

        {/* Approved Progress */}
        <div className="bg-[#141518] border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Approved Cut</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{statusCounts.Approved} / {totalShots}</div>
          <div className="space-y-1 pt-1">
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${approvedPercentage}%` }}
              />
            </div>
            <div className="text-[11px] text-zinc-400 flex justify-between">
              <span>{approvedPercentage}% final approved</span>
              <span>{statusCounts['Needs Revision']} in revision</span>
            </div>
          </div>
        </div>

        {/* Audiovisual Readiness */}
        <div className="bg-[#141518] border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Audiovisual Ready</span>
            <Video className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300">
            {audiovisualCompleteShots.length} / {totalShots}
          </div>
          <div className="space-y-1 pt-1">
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${audiovisualPercentage}%` }}
              />
            </div>
            <div className="text-[11px] text-zinc-400 flex justify-between">
              <span>{audiovisualPercentage}% both image + video</span>
            </div>
          </div>
        </div>

        {/* Total Assets Stored */}
        <div className="bg-[#141518] border border-zinc-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Total Media Assets</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">{assets.length} Files</div>
          <div className="text-[11px] text-zinc-400 flex items-center gap-2 pt-1">
            <span className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3 text-cyan-400" /> {imageAssetsCount}
            </span>
            <span className="flex items-center gap-1">
              <Video className="w-3 h-3 text-purple-400" /> {videoAssetsCount}
            </span>
            <span className="flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-amber-400" /> {audioAssetsCount}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Pipeline Status Distribution Bar */}
      <div className="bg-[#141518] border border-zinc-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            Production Workflow Pipeline Status
          </h3>
          <span className="text-xs text-zinc-400">Click a status to filter shot list</span>
        </div>

        {/* Pipeline Distribution Bar */}
        <div className="w-full bg-zinc-950 h-3 rounded-full overflow-hidden flex border border-zinc-800">
          {totalShots > 0 && (
            <>
              <div
                className="bg-zinc-700 h-full transition-all"
                style={{ width: `${(statusCounts['Not Started'] / totalShots) * 100}%` }}
                title={`Not Started: ${statusCounts['Not Started']}`}
              />
              <div
                className="bg-amber-500 h-full transition-all"
                style={{ width: `${(statusCounts['Prompt Ready'] / totalShots) * 100}%` }}
                title={`Prompt Ready: ${statusCounts['Prompt Ready']}`}
              />
              <div
                className="bg-cyan-500 h-full transition-all"
                style={{ width: `${(statusCounts['Image Generated'] / totalShots) * 100}%` }}
                title={`Image Generated: ${statusCounts['Image Generated']}`}
              />
              <div
                className="bg-purple-500 h-full transition-all"
                style={{ width: `${(statusCounts['Video Generated'] / totalShots) * 100}%` }}
                title={`Video Generated: ${statusCounts['Video Generated']}`}
              />
              <div
                className="bg-blue-500 h-full transition-all"
                style={{ width: `${(statusCounts['In Review'] / totalShots) * 100}%` }}
                title={`In Review: ${statusCounts['In Review']}`}
              />
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${(statusCounts.Approved / totalShots) * 100}%` }}
                title={`Approved: ${statusCounts.Approved}`}
              />
              <div
                className="bg-rose-500 h-full transition-all"
                style={{ width: `${(statusCounts['Needs Revision'] / totalShots) * 100}%` }}
                title={`Needs Revision: ${statusCounts['Needs Revision']}`}
              />
            </>
          )}
        </div>

        {/* Pipeline Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
          {SHOT_PRODUCTION_STATUSES.map((status) => {
            const count = statusCounts[status] || 0;
            const isSelected = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(isSelected ? 'all' : status)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-800/60'
                }`}
              >
                <div className="text-[11px] text-zinc-400 truncate">{status}</div>
                <div className="text-base font-bold text-zinc-100 mt-0.5">{count}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Production Health & Attention Triggers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Missing Prompts Alert */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'missing_prompts' ? 'all' : 'missing_prompts')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'missing_prompts'
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-zinc-800 bg-[#141518] hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-200 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Missing Creative Prompts
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              shotsMissingPrompts.length > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'
            }`}>
              {shotsMissingPrompts.length}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Shots that do not yet have an image prompt or motion prompt configured in their blueprint.
          </p>
        </div>

        {/* Missing Generated Image */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'missing_image' ? 'all' : 'missing_image')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'missing_image'
              ? 'border-cyan-500 bg-cyan-500/10'
              : 'border-zinc-800 bg-[#141518] hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-200 flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              Awaiting Generated Image
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              shotsWithoutImages.length > 0 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-400'
            }`}>
              {shotsWithoutImages.length}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Shots without any attached visual image attempts.
          </p>
        </div>

        {/* Missing Generated Video */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'missing_video' ? 'all' : 'missing_video')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'missing_video'
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-zinc-800 bg-[#141518] hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-200 flex items-center gap-2">
              <Video className="w-3.5 h-3.5 text-purple-400" />
              Awaiting Video Generation
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              shotsWithoutVideo.length > 0 ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-400'
            }`}>
              {shotsWithoutVideo.length}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Shots without any attached motion video clips.
          </p>
        </div>
      </div>

      {/* 4. Scene by Scene Production Progress */}
      <div className="bg-[#141518] border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            Scene-by-Scene Production Breakdown
          </h3>
          <button
            onClick={onJumpToScenes}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
          >
            Scene Manager <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-3">
          {scenes.map((scene) => {
            const sceneShots = shots.filter((sh) => sh.scene_id === scene.id);
            const sceneApproved = sceneShots.filter((sh) => sh.production_status === 'Approved').length;
            const scenePercent = sceneShots.length > 0 ? Math.round((sceneApproved / sceneShots.length) * 100) : 0;
            const sceneRuntime = sceneShots.reduce((acc, sh) => acc + (Number(sh.duration_seconds) || 0), 0);

            return (
              <div
                key={scene.id}
                className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400">Scene {scene.scene_order}:</span>
                    <h4 className="text-xs font-medium text-zinc-100 truncate">{scene.title}</h4>
                  </div>
                  <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                    <span>{sceneShots.length} shots</span>
                    <span>•</span>
                    <span>{sceneRuntime.toFixed(1)}s runtime</span>
                    {scene.location && (
                      <>
                        <span>•</span>
                        <span className="truncate">{scene.location}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-32 space-y-1">
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${scenePercent}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-zinc-400 text-right">
                      {sceneApproved}/{sceneShots.length} approved ({scenePercent}%)
                    </div>
                  </div>

                  <button
                    onClick={() => onJumpToShotPlanner(scene.id)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Open Shots
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Filterable Interactive Shot Table */}
      <div className="bg-[#141518] border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-amber-400" />
              Production Shot Registry ({filteredShots.length} / {shots.length})
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Click any shot to inspect prompts, review versions, or upload media assets.
            </p>
          </div>

          {/* Search & Scene Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search shots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 w-40 sm:w-48"
              />
            </div>

            <select
              value={sceneFilter}
              onChange={(e) => setSceneFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">All Scenes</option>
              {scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  Scene {s.scene_order}: {s.title}
                </option>
              ))}
            </select>

            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {/* Shot Table */}
        <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-950/40">
          <div className="divide-y divide-zinc-800/60">
            {filteredShots.map((sh) => {
              const shotScene = scenes.find((s) => s.id === sh.scene_id);
              const shotAssetList = assets.filter((a) => a.shot_id === sh.id);
              const preferredAsset = shotAssetList.find((a) => a.is_preferred) || shotAssetList[0];
              const hasImage = shotAssetList.some((a) => a.asset_type === 'image');
              const hasVideo = shotAssetList.some((a) => a.asset_type === 'video');

              const getBadgeColor = (status?: ShotProductionStatus) => {
                switch (status) {
                  case 'Approved':
                    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                  case 'In Review':
                    return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
                  case 'Video Generated':
                    return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
                  case 'Image Generated':
                    return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
                  case 'Prompt Ready':
                    return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                  case 'Needs Revision':
                    return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                  default:
                    return 'bg-zinc-800 text-zinc-400 border-zinc-700';
                }
              };

              return (
                <div
                  key={sh.id}
                  onClick={() => onOpenShotDetail(sh)}
                  className="p-3.5 hover:bg-zinc-900/60 flex items-center justify-between gap-4 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Thumbnail or Icon */}
                    <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden relative">
                      {preferredAsset?.storage_path ? (
                        <img
                          src={preferredAsset.storage_path}
                          alt={sh.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-400">#{sh.shot_order}</span>
                        <h4 className="text-xs font-semibold text-zinc-200 truncate group-hover:text-amber-400 transition-colors">
                          {sh.title}
                        </h4>
                        <span className="text-[11px] text-zinc-400 hidden sm:inline">
                          ({shotScene ? `Sc. ${shotScene.scene_order}` : ''})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                        <span>{sh.shot_type || 'Wide shot'}</span>
                        <span>•</span>
                        <span>{sh.duration_seconds}s</span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5">
                          <span className={hasImage ? 'text-cyan-400' : 'text-zinc-600'}>IMG</span>
                          <span className={hasVideo ? 'text-purple-400' : 'text-zinc-600'}>VID</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium ${getBadgeColor(
                        sh.production_status
                      )}`}
                    >
                      {sh.production_status || 'Not Started'}
                    </span>

                    <span className="text-xs text-zinc-400 font-medium hidden md:inline">
                      {shotAssetList.length} {shotAssetList.length === 1 ? 'asset' : 'assets'}
                    </span>

                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </div>
                </div>
              );
            })}

            {filteredShots.length === 0 && (
              <div className="p-8 text-center text-xs text-zinc-400">
                No shots match your selected criteria.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
