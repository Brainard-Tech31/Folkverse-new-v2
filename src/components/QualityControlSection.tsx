/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import type {
  Project,
  Scene,
  Shot,
  Character,
  Location,
  ProductionAsset,
  QualityFinding,
  FindingSeverity,
  FindingCategory,
} from '../types/database.ts';
import {
  analyzeProjectQuality,
  markFindingReviewed,
  unmarkFindingReviewed,
  getReviewedDecisions,
} from '../services/qualityControl.ts';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  Layers,
  Camera,
  Users,
  MapPin,
  RefreshCw,
  Filter,
  Search,
  ExternalLink,
  Check,
  Eye,
  Film,
  Sparkles,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';

interface QualityControlSectionProps {
  project: Project;
  scenes: Scene[];
  shots: Shot[];
  characters: Character[];
  locations: Location[];
  assets?: ProductionAsset[];
  onOpenShotDetail?: (shot: Shot) => void;
  onNavigateToTab?: (tab: 'scenes' | 'shots' | 'characters' | 'locations') => void;
  onSelectSceneForShots?: (sceneId: string) => void;
}

export const QualityControlSection: React.FC<QualityControlSectionProps> = ({
  project,
  scenes,
  shots,
  characters,
  locations,
  assets = [],
  onOpenShotDetail,
  onNavigateToTab,
  onSelectSceneForShots,
}) => {
  // Local state for review decisions refresh trigger
  const [reviewUpdateCounter, setReviewUpdateCounter] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<'all' | FindingSeverity>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | FindingCategory>('all');
  const [sceneFilter, setSceneFilter] = useState<string>('all');
  const [shotFilter, setShotFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unresolved' | 'reviewed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Re-run quality analysis whenever dependencies or manual trigger changes
  const qualityReport = useMemo(() => {
    // Reading reviewDecisions triggers re-render when counter changes
    const decisions = getReviewedDecisions(project.id);
    return analyzeProjectQuality(project, scenes, shots, characters, locations, assets, {
      reviewedDecisions: decisions,
    });
  }, [project, scenes, shots, characters, locations, assets, reviewUpdateCounter]);

  const { findings, summary, runtime } = qualityReport;

  // Manual Review Action
  const handleToggleReview = (finding: QualityFinding) => {
    if (!finding.canBeReviewed) return;

    if (finding.isReviewed) {
      unmarkFindingReviewed(project.id, finding.id);
    } else {
      markFindingReviewed(project.id, finding.id, finding.fingerprint);
    }
    setReviewUpdateCounter((prev) => prev + 1);
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setReviewUpdateCounter((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 300);
  };

  // Filtered Findings
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
      if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
      if (sceneFilter !== 'all' && f.sceneId !== sceneFilter) return false;
      if (shotFilter !== 'all' && f.shotId !== shotFilter) return false;

      if (statusFilter === 'unresolved' && f.isReviewed) return false;
      if (statusFilter === 'reviewed' && !f.isReviewed) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMsg = f.message.toLowerCase().includes(q);
        const matchExp = f.explanation.toLowerCase().includes(q);
        const matchRes = f.suggestedResolution.toLowerCase().includes(q);
        const matchRule = f.ruleId.toLowerCase().includes(q);
        if (!matchMsg && !matchExp && !matchRes && !matchRule) return false;
      }
      return true;
    });
  }, [findings, severityFilter, categoryFilter, sceneFilter, shotFilter, statusFilter, searchQuery]);

  // Navigate to affected record
  const handleNavigateToRecord = (f: QualityFinding) => {
    if (f.shotId && onOpenShotDetail) {
      const targetShot = shots.find((s) => s.id === f.shotId);
      if (targetShot) {
        onOpenShotDetail(targetShot);
        return;
      }
    }
    if (f.shotId && onSelectSceneForShots && f.sceneId) {
      onSelectSceneForShots(f.sceneId);
      return;
    }
    if (f.sceneId && onNavigateToTab) {
      onNavigateToTab('scenes');
      return;
    }
    if (f.characterId && onNavigateToTab) {
      onNavigateToTab('characters');
      return;
    }
    if (f.locationId && onNavigateToTab) {
      onNavigateToTab('locations');
      return;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-[#141518] border border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Phase 3: Production Continuity & Quality Control
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-cinematic text-zinc-100 tracking-wide flex items-center gap-2">
              Production Quality Check
            </h2>
            <p className="text-xs text-zinc-400">
              Deterministic validation of relational references, shot completeness, runtime metrics, and character continuity.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleManualRefresh}
              className={`px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                isRefreshing ? 'opacity-50' : ''
              }`}
              title="Re-run deterministic checks"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : 'text-zinc-400'}`} />
              <span>Re-run Checks</span>
            </button>
          </div>
        </div>

        {/* 1. Core Summary Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {/* Total Findings */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
            <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Total Findings</div>
            <div className="text-xl font-bold text-zinc-100 font-cinematic">{summary.totalFindings}</div>
            <div className="text-[10px] text-zinc-500">{summary.unresolvedCount} active review items</div>
          </div>

          {/* Structural Errors */}
          <div className={`p-3.5 rounded-xl border space-y-1 ${
            summary.errorsCount > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-zinc-900/60 border-zinc-800/80'
          }`}>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
              <span>Errors</span>
              <ShieldAlert className={`w-3.5 h-3.5 ${summary.errorsCount > 0 ? 'text-red-400' : 'text-zinc-500'}`} />
            </div>
            <div className={`text-xl font-bold font-cinematic ${summary.errorsCount > 0 ? 'text-red-400' : 'text-zinc-100'}`}>
              {summary.errorsCount}
            </div>
            <div className="text-[10px] text-zinc-500">Structural blockers</div>
          </div>

          {/* Continuity Warnings */}
          <div className={`p-3.5 rounded-xl border space-y-1 ${
            summary.warningsCount > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-900/60 border-zinc-800/80'
          }`}>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
              <span>Warnings</span>
              <AlertTriangle className={`w-3.5 h-3.5 ${summary.warningsCount > 0 ? 'text-amber-400' : 'text-zinc-500'}`} />
            </div>
            <div className={`text-xl font-bold font-cinematic ${summary.warningsCount > 0 ? 'text-amber-400' : 'text-zinc-100'}`}>
              {summary.warningsCount}
            </div>
            <div className="text-[10px] text-zinc-500">Continuity review</div>
          </div>

          {/* Informational Guidance */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
              <span>Guidance</span>
              <Info className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl font-bold text-cyan-300 font-cinematic">{summary.infoCount}</div>
            <div className="text-[10px] text-zinc-500">Readiness notices</div>
          </div>

          {/* Runtime Duration */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
              <span>Calculated Runtime</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-base font-bold text-amber-400 font-mono truncate">{runtime.totalFormatted}</div>
            <div className="text-[10px] text-zinc-500">{shots.length} shots counted once</div>
          </div>

          {/* Reviewed Findings */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
              <span>Reviewed</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400 font-cinematic">{summary.reviewedCount}</div>
            <div className="text-[10px] text-zinc-500">Retained decisions</div>
          </div>
        </div>

        {/* 2. Production Health Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-zinc-800/60 text-xs">
          <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/50 flex items-center justify-between">
            <span className="text-zinc-400">Broken References</span>
            <span className={`font-semibold px-2 py-0.5 rounded-md ${
              summary.shotsWithBrokenRefsCount > 0 ? 'bg-red-500/20 text-red-300 font-mono' : 'text-emerald-400'
            }`}>
              {summary.shotsWithBrokenRefsCount}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/50 flex items-center justify-between">
            <span className="text-zinc-400">Continuity Reviews</span>
            <span className={`font-semibold px-2 py-0.5 rounded-md ${
              summary.shotsRequiringContinuityReviewCount > 0 ? 'bg-amber-500/20 text-amber-300 font-mono' : 'text-zinc-400'
            }`}>
              {summary.shotsRequiringContinuityReviewCount}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/50 flex items-center justify-between">
            <span className="text-zinc-400">Missing Image Prompts</span>
            <span className={`font-semibold px-2 py-0.5 rounded-md ${
              summary.shotsMissingImagePromptsCount > 0 ? 'bg-cyan-500/20 text-cyan-300 font-mono' : 'text-zinc-400'
            }`}>
              {summary.shotsMissingImagePromptsCount}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/50 flex items-center justify-between">
            <span className="text-zinc-400">Missing Motion Prompts</span>
            <span className={`font-semibold px-2 py-0.5 rounded-md ${
              summary.shotsMissingMotionPromptsCount > 0 ? 'bg-purple-500/20 text-purple-300 font-mono' : 'text-zinc-400'
            }`}>
              {summary.shotsMissingMotionPromptsCount}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Filter Bar */}
      <div className="bg-[#141518] border border-zinc-800 rounded-xl p-4 space-y-3 shadow-md">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search findings by message, rule ID, or resolution..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-amber-500/60"
            />
          </div>

          {/* Quick Severity Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
            <button
              onClick={() => setSeverityFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                severityFilter === 'all'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({findings.length})
            </button>
            <button
              onClick={() => setSeverityFilter('error')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                severityFilter === 'error'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'text-zinc-400 hover:text-red-400'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Errors ({summary.errorsCount})
            </button>
            <button
              onClick={() => setSeverityFilter('warning')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                severityFilter === 'warning'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-amber-400'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Warnings ({summary.warningsCount})
            </button>
            <button
              onClick={() => setSeverityFilter('info')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                severityFilter === 'info'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-zinc-400 hover:text-cyan-400'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              Info ({summary.infoCount})
            </button>
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-zinc-800/60 text-xs">
          {/* Category Filter */}
          <div>
            <label className="block text-zinc-400 text-[10px] uppercase font-semibold mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-xs focus:outline-hidden focus:border-amber-500/60 cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="structure">Structure & References</option>
              <option value="character_continuity">Character Continuity</option>
              <option value="location_continuity">Location & Scene Continuity</option>
              <option value="shot_completeness">Shot Completeness</option>
              <option value="dialogue">Dialogue Attributions</option>
              <option value="production_readiness">Production Readiness</option>
            </select>
          </div>

          {/* Scene Filter */}
          <div>
            <label className="block text-zinc-400 text-[10px] uppercase font-semibold mb-1">Scene</label>
            <select
              value={sceneFilter}
              onChange={(e) => {
                setSceneFilter(e.target.value);
                setShotFilter('all');
              }}
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-xs focus:outline-hidden focus:border-amber-500/60 cursor-pointer"
            >
              <option value="all">All Scenes</option>
              {scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  Sc. {s.scene_order}: {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Shot Filter */}
          <div>
            <label className="block text-zinc-400 text-[10px] uppercase font-semibold mb-1">Shot</label>
            <select
              value={shotFilter}
              onChange={(e) => setShotFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-xs focus:outline-hidden focus:border-amber-500/60 cursor-pointer"
            >
              <option value="all">All Shots</option>
              {shots
                .filter((sh) => sceneFilter === 'all' || sh.scene_id === sceneFilter)
                .map((sh) => (
                  <option key={sh.id} value={sh.id}>
                    Shot #{sh.shot_order}: {sh.title}
                  </option>
                ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-zinc-400 text-[10px] uppercase font-semibold mb-1">Review Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-xs focus:outline-hidden focus:border-amber-500/60 cursor-pointer"
            >
              <option value="all">All Items</option>
              <option value="unresolved">Unresolved ({summary.unresolvedCount})</option>
              <option value="reviewed">Reviewed ({summary.reviewedCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Findings List */}
      <div className="space-y-3">
        {filteredFindings.map((finding) => {
          const isError = finding.severity === 'error';
          const isWarning = finding.severity === 'warning';
          const isInfo = finding.severity === 'info';

          const parentScene = finding.sceneId ? scenes.find((s) => s.id === finding.sceneId) : null;
          const targetShot = finding.shotId ? shots.find((s) => s.id === finding.shotId) : null;
          const targetChar = finding.characterId ? characters.find((c) => c.id === finding.characterId) : null;
          const targetLoc = finding.locationId ? locations.find((l) => l.id === finding.locationId) : null;

          return (
            <div
              key={finding.id}
              className={`p-4 rounded-xl border transition-all ${
                finding.isReviewed
                  ? 'bg-zinc-950/40 border-zinc-800/60 opacity-75'
                  : isError
                  ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/40'
                  : isWarning
                  ? 'bg-amber-500/5 border-amber-500/25 hover:border-amber-500/40'
                  : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Left: Indicator & Finding Details */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {isError ? (
                      <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                    ) : isWarning ? (
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <Info className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    {/* Tags row */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                          isError
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : isWarning
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {finding.severity}
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 capitalize font-medium">
                        {finding.category.replace('_', ' ')}
                      </span>

                      <span className="text-zinc-500 font-mono text-[10px]">
                        {finding.ruleId}
                      </span>

                      {finding.isReviewed && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium inline-flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Reviewed (Retained)
                        </span>
                      )}
                    </div>

                    {/* Human message */}
                    <h3 className="text-sm font-semibold text-zinc-100 leading-snug">
                      {finding.message}
                    </h3>

                    {/* Explanation */}
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {finding.explanation}
                    </p>

                    {/* Suggested Resolution */}
                    <div className="text-xs text-amber-300/90 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2 flex items-start gap-2">
                      <span className="font-semibold text-amber-400 shrink-0">Resolution:</span>
                      <span>{finding.suggestedResolution}</span>
                    </div>

                    {/* Affected Context Badges */}
                    <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] text-zinc-400">
                      {parentScene && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md">
                          <ClapperboardIcon className="w-3 h-3 text-amber-400" />
                          Sc. {parentScene.scene_order}: {parentScene.title}
                        </span>
                      )}

                      {targetShot && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md">
                          <Camera className="w-3 h-3 text-cyan-400" />
                          Shot #{targetShot.shot_order}: {targetShot.title}
                        </span>
                      )}

                      {targetChar && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md">
                          <Users className="w-3 h-3 text-purple-400" />
                          {targetChar.name}
                        </span>
                      )}

                      {targetLoc && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          {targetLoc.name}
                        </span>
                      )}

                      {finding.fieldName && (
                        <span className="text-zinc-500 font-mono text-[10px]">
                          field: {finding.fieldName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Manual Resolution Actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0">
                  {/* Open Record Navigation Action */}
                  <button
                    onClick={() => handleNavigateToRecord(finding)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Open Record</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  </button>

                  {/* Mark as Reviewed Button for Warnings & Info */}
                  {finding.canBeReviewed ? (
                    <button
                      onClick={() => handleToggleReview(finding)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        finding.isReviewed
                          ? 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                          : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
                      }`}
                      title={finding.isReviewed ? 'Unmark reviewed decision' : 'Mark non-blocking finding as reviewed'}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{finding.isReviewed ? 'Unmark Review' : 'Mark Reviewed'}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-red-400/80 font-medium px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-md">
                      Fix Required in Data
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty State when no findings match filter or when project is 100% clean */}
        {filteredFindings.length === 0 && (
          <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-800 bg-[#141518]/50 space-y-3">
            {findings.length === 0 ? (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-zinc-200 font-cinematic">
                  All Quality Checks Passed
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  No structural errors, broken references, or continuity inconsistencies were detected. All shot durations and scene timings are validated.
                </p>
              </>
            ) : (
              <>
                <Filter className="w-8 h-8 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-semibold text-zinc-300">
                  No findings match your filter
                </h3>
                <p className="text-xs text-zinc-500">
                  Try clearing or adjusting your severity, category, or search filters.
                </p>
                <button
                  onClick={() => {
                    setSeverityFilter('all');
                    setCategoryFilter('all');
                    setSceneFilter('all');
                    setShotFilter('all');
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Small Clapperboard icon helper
function ClapperboardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20.2 6 3 11l-.9-2.4c-.4-1.1.2-2.4 1.3-2.8l12.5-4.6c1.1-.4 2.4.2 2.8 1.3Z" />
      <path d="m6.2 5.3 3.1 4" />
      <path d="m11.6 3.4 3.1 4" />
      <path d="M4 11v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9" />
      <path d="m3.1 11 17.8-6.5" />
    </svg>
  );
}
