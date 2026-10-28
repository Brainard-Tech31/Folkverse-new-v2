import React, { useState, useRef, useMemo } from 'react';
import type {
  Shot,
  Scene,
  Character,
  Location,
  ProductionAsset,
  ShotProductionStatus,
  AssetType,
  AssetReviewStatus,
} from '../types/database.ts';
import { SHOT_PRODUCTION_STATUSES } from '../types/database.ts';
import { ConfirmationModal } from './ConfirmationModal.tsx';
import {
  analyzeProjectQuality,
  markFindingReviewed,
  unmarkFindingReviewed,
  getReviewedDecisions,
} from '../services/qualityControl.ts';
import {
  X,
  Camera,
  Film,
  Sparkles,
  Copy,
  Check,
  Upload,
  Link,
  Star,
  Trash2,
  Edit2,
  Clock,
  User,
  MapPin,
  MessageSquare,
  Volume2,
  Music,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  FileText,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Play,
} from 'lucide-react';

interface ShotDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  shot: Shot;
  scene?: Scene;
  characters: Character[];
  locations: Location[];
  assets: ProductionAsset[];
  onUpdateShotStatus: (shotId: string, status: ShotProductionStatus) => Promise<void>;
  onUploadAssetFile: (
    file: File,
    meta: {
      asset_type: AssetType;
      display_name: string;
      generation_tool?: string;
      prompt_used?: string;
      notes?: string;
      version_number?: number;
    }
  ) => Promise<void>;
  onCreateExternalAsset: (input: {
    asset_type: AssetType;
    display_name: string;
    external_url: string;
    generation_tool?: string;
    prompt_used?: string;
    notes?: string;
    version_number?: number;
  }) => Promise<void>;
  onSetPreferredAsset: (assetId: string, assetType: AssetType) => Promise<void>;
  onUpdateAsset: (
    assetId: string,
    updates: { review_status?: AssetReviewStatus; notes?: string; display_name?: string }
  ) => Promise<void>;
  onDeleteAsset: (assetId: string) => Promise<void>;
}

export const ShotDetailModal: React.FC<ShotDetailModalProps> = ({
  isOpen,
  onClose,
  shot,
  scene,
  characters,
  locations,
  assets,
  onUpdateShotStatus,
  onUploadAssetFile,
  onCreateExternalAsset,
  onSetPreferredAsset,
  onUpdateAsset,
  onDeleteAsset,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'prompts' | 'dialogue'>('overview');
  const [selectedAssetFilter, setSelectedAssetFilter] = useState<'all' | AssetType>('all');
  const [copiedType, setCopiedType] = useState<'image' | 'motion' | null>(null);

  // New Asset Form State
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [addMode, setAddMode] = useState<'upload' | 'link'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('image');
  const [displayName, setDisplayName] = useState('');
  const [generationTool, setGenerationTool] = useState('Midjourney v6.1');
  const [promptUsed, setPromptUsed] = useState(shot.image_prompt || '');
  const [notes, setNotes] = useState('');
  const [isSubmittingAsset, setIsSubmittingAsset] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);

  // Status Change State
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Asset Deletion State
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  // Lightbox Media Preview
  const [lightboxUrl, setLightboxUrl] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Filter assets for this specific shot
  const shotAssets = assets.filter((a) => a.shot_id === shot.id);
  const filteredAssets = selectedAssetFilter === 'all'
    ? shotAssets
    : shotAssets.filter((a) => a.asset_type === selectedAssetFilter);

  // Participating characters
  const shotCharacters = characters.filter((c) => (shot.characters || []).includes(c.id));
  const sceneLocation = locations.find((l) => l.id === scene?.location_id);

  // Shot Quality & Continuity findings
  const [qcCounter, setQcCounter] = useState(0);
  const shotFindings = useMemo(() => {
    if (!scene) return [];
    const dummyProject = {
      id: shot.project_id || 'proj',
      user_id: '',
      title: '',
      description: '',
      created_at: '',
      updated_at: '',
    };
    const report = analyzeProjectQuality(
      dummyProject,
      [scene],
      [shot],
      characters,
      locations,
      assets,
      { reviewedDecisions: getReviewedDecisions(shot.project_id) }
    );
    return report.findings.filter((f) => f.shotId === shot.id);
  }, [shot, scene, characters, locations, assets, qcCounter]);

  const handleToggleFindingReview = (findingId: string, fingerprint: string, isReviewed: boolean) => {
    if (isReviewed) {
      unmarkFindingReviewed(shot.project_id, findingId);
    } else {
      markFindingReviewed(shot.project_id, findingId, fingerprint);
    }
    setQcCounter((c) => c + 1);
  };

  const handleCopyPrompt = (text: string, type: 'image' | 'motion') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleStatusChange = async (newStatus: ShotProductionStatus) => {
    try {
      setIsUpdatingStatus(true);
      setStatusError(null);
      await onUpdateShotStatus(shot.id, newStatus);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!displayName) {
        setDisplayName(file.name.replace(/\.[^/.]+$/, ''));
      }
      if (file.type.startsWith('video')) {
        setAssetType('video');
        setGenerationTool('Kling 1.5');
        setPromptUsed(shot.motion_prompt || shot.image_prompt || '');
      } else if (file.type.startsWith('audio')) {
        setAssetType('audio');
        setGenerationTool('ElevenLabs');
      } else {
        setAssetType('image');
        setGenerationTool('Flux Pro');
        setPromptUsed(shot.image_prompt || '');
      }
    }
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssetError(null);

    const name = displayName.trim() || (selectedFile ? selectedFile.name : 'Asset');

    try {
      setIsSubmittingAsset(true);
      if (addMode === 'upload') {
        if (!selectedFile) {
          setAssetError('Please select a file to upload.');
          return;
        }
        await onUploadAssetFile(selectedFile, {
          asset_type: assetType,
          display_name: name,
          generation_tool: generationTool.trim(),
          prompt_used: promptUsed.trim(),
          notes: notes.trim(),
        });
      } else {
        if (!externalUrl.trim()) {
          setAssetError('Please provide an external URL.');
          return;
        }
        await onCreateExternalAsset({
          asset_type: assetType,
          display_name: name,
          external_url: externalUrl.trim(),
          generation_tool: generationTool.trim(),
          prompt_used: promptUsed.trim(),
          notes: notes.trim(),
        });
      }

      // Reset form
      setIsAddingAsset(false);
      setSelectedFile(null);
      setExternalUrl('');
      setDisplayName('');
      setNotes('');
    } catch (err) {
      setAssetError(err instanceof Error ? err.message : 'Failed to register asset.');
    } finally {
      setIsSubmittingAsset(false);
    }
  };

  const getStatusBadgeColor = (status?: ShotProductionStatus) => {
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-[#121316] border border-zinc-800 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
              #{shot.shot_order}
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-zinc-100 truncate flex items-center gap-2">
                {shot.title}
                <span className="text-xs font-normal text-zinc-400">
                  {scene ? `(Scene ${scene.scene_order}: ${scene.title})` : ''}
                </span>
              </h2>
              <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                <span>{shot.shot_type || 'Wide shot'}</span>
                <span>•</span>
                <span>{shot.camera_angle || 'Eye level'}</span>
                <span>•</span>
                <span>{shot.duration_seconds}s</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Control */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-400 hidden sm:inline">Status:</label>
              <select
                value={shot.production_status || 'Not Started'}
                onChange={(e) => handleStatusChange(e.target.value as ShotProductionStatus)}
                disabled={isUpdatingStatus}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer ${getStatusBadgeColor(
                  shot.production_status
                )}`}
              >
                {SHOT_PRODUCTION_STATUSES.map((st) => (
                  <option key={st} value={st} className="bg-zinc-900 text-zinc-200">
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close Workspace"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {statusError && (
          <div className="px-6 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{statusError}</span>
          </div>
        )}

        {/* Workspace Tab Navigation */}
        <div className="px-6 border-b border-zinc-800 flex gap-6 bg-zinc-900/30 text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Shot Overview & Context
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'assets'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Attached Production Assets ({shotAssets.length})
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'prompts'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Prompts & Camera Directives
          </button>
          <button
            onClick={() => setActiveTab('dialogue')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'dialogue'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Dialogue & Sound Cues
          </button>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Quick Status & Actions Bar */}
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Production Workflow Status</div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(shot.production_status)}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {shot.production_status || 'Not Started'}
                    </span>
                    {shot.production_status === 'Approved' && (
                      <button
                        onClick={() => handleStatusChange('Needs Revision')}
                        className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer ml-2"
                      >
                        Mark as Needs Revision
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveTab('assets');
                      setIsAddingAsset(true);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Attach Media Asset
                  </button>
                  <button
                    onClick={() => handleCopyPrompt(shot.image_prompt, 'image')}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedType === 'image' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Prompt
                  </button>
                </div>
              </div>

              {/* Action Description */}
              <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Shot Action Description
                </h3>
                <p className="text-sm text-zinc-200 leading-relaxed">
                  {shot.action || <span className="text-zinc-400 italic">No action description provided.</span>}
                </p>
              </div>

              {/* Grid: Context references */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Location Reference */}
                <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    Location Reference
                  </div>
                  {sceneLocation ? (
                    <div className="space-y-1.5">
                      <div className="text-sm font-medium text-zinc-100">{sceneLocation.name}</div>
                      {sceneLocation.description && (
                        <p className="text-xs text-zinc-400 line-clamp-2">{sceneLocation.description}</p>
                      )}
                      {sceneLocation.visual_notes && (
                        <div className="text-xs text-amber-400/90 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2 mt-2">
                          <span className="font-semibold">Visual Notes: </span>
                          {sceneLocation.visual_notes}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">
                      {scene?.location || 'No location specified for this scene.'}
                    </p>
                  )}
                </div>

                {/* Character References */}
                <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    Characters Present ({shotCharacters.length})
                  </div>
                  {shotCharacters.length > 0 ? (
                    <div className="space-y-2">
                      {shotCharacters.map((char) => (
                        <div key={char.id} className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-3 space-y-2">
                          <div className="flex items-start gap-2.5">
                            {char.reference_image_url ? (
                              <img
                                src={char.reference_image_url}
                                alt={char.name}
                                className="w-11 h-11 rounded-md object-cover border border-zinc-700 shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold text-sm shrink-0 border border-zinc-700">
                                {char.name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1 text-xs">
                              <div className="font-semibold text-zinc-100">{char.name} {char.role ? <span className="text-zinc-400 font-normal">({char.role})</span> : ''}</div>
                              {char.appearance && <p className="text-zinc-400 text-[11px] mt-0.5"><span className="text-zinc-500">Appearance:</span> {char.appearance}</p>}
                              {char.wardrobe && <p className="text-zinc-400 text-[11px] mt-0.5"><span className="text-zinc-500">Wardrobe:</span> {char.wardrobe}</p>}
                            </div>
                          </div>

                          {/* Continuity Directives Callout */}
                          {char.continuity_notes && (
                            <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-md p-2">
                              <span className="font-semibold text-amber-400">Continuity Directive: </span>
                              {char.continuity_notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">No characters assigned to this shot.</p>
                  )}
                </div>
              </div>

              {/* Continuity Directives: Scene & Shot */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Scene Continuity Directives */}
                <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 text-xs space-y-1.5">
                  <div className="font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Scene Continuity Directives
                  </div>
                  <p className="text-zinc-300 leading-relaxed">
                    {scene?.continuity_notes || (
                      <span className="text-zinc-500 italic">No scene-level continuity directives specified.</span>
                    )}
                  </p>
                </div>

                {/* Shot Continuity Directives */}
                <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 text-xs space-y-1.5">
                  <div className="font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    Shot Continuity Directives
                  </div>
                  <p className="text-zinc-300 leading-relaxed">
                    {shot.continuity_notes || (
                      <span className="text-zinc-500 italic">No shot-specific continuity directives recorded.</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Shot Quality & Continuity Findings Card */}
              {shotFindings.length > 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                        Quality & Continuity Checks ({shotFindings.length})
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {shotFindings.map((finding) => {
                      const isErr = finding.severity === 'error';
                      return (
                        <div
                          key={finding.id}
                          className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                            finding.isReviewed
                              ? 'bg-zinc-950/40 border-zinc-800/60 opacity-80'
                              : isErr
                              ? 'bg-red-500/10 border-red-500/30'
                              : 'bg-amber-500/10 border-amber-500/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                  isErr ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                                }`}>
                                  {finding.severity}
                                </span>
                                <span className="font-semibold text-zinc-200">{finding.message}</span>
                              </div>
                              <p className="text-zinc-400 text-[11px] leading-relaxed">{finding.explanation}</p>
                              <p className="text-amber-300/90 text-[11px]"><span className="font-semibold">Resolution:</span> {finding.suggestedResolution}</p>
                            </div>

                            {finding.canBeReviewed && (
                              <button
                                onClick={() => handleToggleFindingReview(finding.id, finding.fingerprint, finding.isReviewed)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold shrink-0 cursor-pointer transition-colors ${
                                  finding.isReviewed
                                    ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                                }`}
                              >
                                {finding.isReviewed ? 'Unmark Review' : 'Mark Reviewed'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ASSETS */}
          {activeTab === 'assets' && (
            <div className="space-y-6">
              
              {/* Asset Action & Filter Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['all', 'image', 'video', 'audio', 'reference_file'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedAssetFilter(type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer capitalize ${
                        selectedAssetFilter === type
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {type === 'all' ? 'All Media' : `${type}s`}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsAddingAsset(!isAddingAsset)}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isAddingAsset ? 'Cancel Upload' : 'Add New Asset Attempt'}
                </button>
              </div>

              {/* Add Asset Drawer */}
              {isAddingAsset && (
                <form
                  onSubmit={handleSaveAsset}
                  className="bg-zinc-900 border border-amber-500/30 rounded-xl p-5 space-y-4 shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Attach Production Asset Attempt
                    </h4>
                    
                    {/* Mode Toggle */}
                    <div className="flex items-center bg-zinc-950 rounded-lg p-0.5 border border-zinc-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setAddMode('upload')}
                        className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                          addMode === 'upload' ? 'bg-amber-500 text-black font-semibold' : 'text-zinc-400'
                        }`}
                      >
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddMode('link')}
                        className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                          addMode === 'link' ? 'bg-amber-500 text-black font-semibold' : 'text-zinc-400'
                        }`}
                      >
                        External Link
                      </button>
                    </div>
                  </div>

                  {assetError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{assetError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addMode === 'upload' ? (
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs text-zinc-300 font-medium">Select File (Image, Video, Audio, or Reference):</label>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          className="w-full text-xs text-zinc-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-amber-400 hover:file:bg-zinc-700 cursor-pointer"
                        />
                        <p className="text-[11px] text-zinc-400">Supported: Images up to 25MB, Videos up to 100MB, Audio up to 50MB.</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs text-zinc-300 font-medium">External Media URL:</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={externalUrl}
                          onChange={(e) => setExternalUrl(e.target.value)}
                          required
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <p className="text-[11px] text-zinc-400">Direct media link, YouTube/Vimeo, Google Drive, or CDN asset URL.</p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs text-zinc-300 font-medium">Display Title / Label:</label>
                      <input
                        type="text"
                        placeholder="e.g. Hero Close-up Attempt 2"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-zinc-300 font-medium">Asset Media Type:</label>
                      <select
                        value={assetType}
                        onChange={(e) => setAssetType(e.target.value as AssetType)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="image">Generated Image</option>
                        <option value="video">Generated Video</option>
                        <option value="audio">Audio / Sound Effect / Score</option>
                        <option value="character_reference">Character Reference</option>
                        <option value="location_reference">Location Reference</option>
                        <option value="reference_file">Production Reference</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-zinc-300 font-medium">Generation Tool / Model:</label>
                      <input
                        type="text"
                        placeholder="e.g. Midjourney v6.1, Flux Pro, Kling 1.5, Runway Gen-3"
                        value={generationTool}
                        onChange={(e) => setGenerationTool(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-zinc-300 font-medium">Notes / Rationale:</label>
                      <input
                        type="text"
                        placeholder="e.g. Great atmospheric lighting, slight distortion on left hand"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs text-zinc-300 font-medium">Prompt Used for this Generation:</label>
                      <textarea
                        rows={2}
                        value={promptUsed}
                        onChange={(e) => setPromptUsed(e.target.value)}
                        placeholder="Specific prompt passed to the external tool..."
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingAsset(false)}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingAsset}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {isSubmittingAsset ? 'Saving...' : 'Register Asset Attempt'}
                    </button>
                  </div>
                </form>
              )}

              {/* Assets Grid / List */}
              {filteredAssets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className={`bg-zinc-900/60 border rounded-xl overflow-hidden flex flex-col transition-all ${
                        asset.is_preferred
                          ? 'border-amber-500/60 shadow-lg shadow-amber-500/5'
                          : 'border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      {/* Media Preview Box */}
                      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-zinc-800/80">
                        {asset.asset_type === 'image' || asset.asset_type === 'character_reference' || asset.asset_type === 'location_reference' ? (
                          <img
                            src={asset.storage_path}
                            alt={asset.display_name}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                            onClick={() => setLightboxUrl({ url: asset.storage_path, type: 'image' })}
                          />
                        ) : asset.asset_type === 'video' ? (
                          <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
                            <video
                              src={asset.storage_path}
                              controls
                              preload="metadata"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : asset.asset_type === 'audio' ? (
                          <div className="p-4 w-full flex flex-col items-center justify-center space-y-2 bg-zinc-950">
                            <Volume2 className="w-8 h-8 text-amber-400/80" />
                            <audio src={asset.storage_path} controls className="w-full max-w-[240px] h-8" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 text-zinc-400 gap-1">
                            <FileText className="w-8 h-8 text-zinc-500" />
                            <span className="text-xs truncate max-w-[200px]">{asset.display_name}</span>
                          </div>
                        )}

                        {/* Badges on preview */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-semibold text-zinc-200 uppercase">
                            v{asset.version_number}
                          </span>
                          {asset.is_preferred && (
                            <span className="px-2 py-0.5 rounded bg-amber-500 text-[10px] font-bold text-black flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-black" />
                              Preferred
                            </span>
                          )}
                          {asset.is_external && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/80 text-[10px] text-white">
                              External
                            </span>
                          )}
                        </div>

                        {asset.storage_path && (
                          <a
                            href={asset.storage_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-2 right-2 p-1 rounded bg-black/70 hover:bg-black text-zinc-300 hover:text-white transition-colors"
                            title="Open direct file link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {/* Asset Details */}
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="text-xs font-semibold text-zinc-100 truncate" title={asset.display_name}>
                              {asset.display_name}
                            </h5>
                            
                            {/* Review Status badge */}
                            <select
                              value={asset.review_status || 'pending'}
                              onChange={(e) =>
                                onUpdateAsset(asset.id, { review_status: e.target.value as AssetReviewStatus })
                              }
                              className={`text-[10px] px-2 py-0.5 rounded border font-medium focus:outline-none cursor-pointer ${
                                asset.review_status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : asset.review_status === 'rejected'
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                              }`}
                            >
                              <option value="pending">Pending</option>
                              <option value="in_review">In Review</option>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>

                          {asset.generation_tool && (
                            <p className="text-[11px] text-amber-400/90 font-medium">Tool: {asset.generation_tool}</p>
                          )}

                          {asset.notes && (
                            <p className="text-[11px] text-zinc-400 line-clamp-2 italic">“{asset.notes}”</p>
                          )}
                        </div>

                        {/* Asset Controls */}
                        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                          {!asset.is_preferred ? (
                            <button
                              onClick={() => onSetPreferredAsset(asset.id, asset.asset_type)}
                              className="text-[11px] text-zinc-400 hover:text-amber-400 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Star className="w-3.5 h-3.5" />
                              Set Preferred
                            </button>
                          ) : (
                            <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              Selected Cut
                            </span>
                          )}

                          <button
                            onClick={() => setDeletingAssetId(asset.id)}
                            className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete Asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl space-y-3">
                  <Film className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400">No media assets attached yet for this shot.</p>
                  <button
                    onClick={() => setIsAddingAsset(true)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Attach First Asset Attempt
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROMPTS */}
          {activeTab === 'prompts' && (
            <div className="space-y-6">
              
              {/* Image Prompt Box */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Visual Image Generation Prompt
                  </h4>
                  <button
                    onClick={() => handleCopyPrompt(shot.image_prompt, 'image')}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedType === 'image' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Image Prompt
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap select-all">
                  {shot.image_prompt || <span className="text-zinc-500 italic">No image prompt configured.</span>}
                </div>
              </div>

              {/* Motion Prompt Box */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    Motion & Camera Video Prompt
                  </h4>
                  <button
                    onClick={() => handleCopyPrompt(shot.motion_prompt, 'motion')}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedType === 'motion' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Motion Prompt
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap select-all">
                  {shot.motion_prompt || <span className="text-zinc-500 italic">No motion prompt configured.</span>}
                </div>
              </div>

              {/* Camera Directives Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 text-xs">
                <div>
                  <span className="text-zinc-400">Shot Type:</span>
                  <p className="font-semibold text-zinc-200 mt-0.5">{shot.shot_type || 'Wide shot'}</p>
                </div>
                <div>
                  <span className="text-zinc-400">Camera Angle:</span>
                  <p className="font-semibold text-zinc-200 mt-0.5">{shot.camera_angle || 'Eye level'}</p>
                </div>
                <div>
                  <span className="text-zinc-400">Camera Movement:</span>
                  <p className="font-semibold text-zinc-200 mt-0.5">{shot.camera_movement || 'Static'}</p>
                </div>
                <div>
                  <span className="text-zinc-400">Target Duration:</span>
                  <p className="font-semibold text-zinc-200 mt-0.5">{shot.duration_seconds} seconds</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DIALOGUE & SOUND */}
          {activeTab === 'dialogue' && (
            <div className="space-y-6">
              
              {/* Dialogue Items */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  Scripted Dialogue & Delivery
                </h4>

                {(shot.dialogue || []).length > 0 ? (
                  <div className="space-y-3">
                    {shot.dialogue.map((diag, idx) => {
                      const speaker = characters.find((c) => c.id === diag.characterId);
                      return (
                        <div key={idx} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-amber-400 uppercase tracking-wider">
                              {speaker ? speaker.name : diag.characterId || 'Narrator / Off-screen'}
                            </span>
                            {diag.delivery && (
                              <span className="text-zinc-400 italic">({diag.delivery})</span>
                            )}
                          </div>
                          <p className="text-sm text-zinc-100 font-serif leading-relaxed">
                            “{diag.text}”
                          </p>
                          {diag.voiceNotes && (
                            <p className="text-xs text-zinc-400 border-t border-zinc-800/60 pt-2 mt-2">
                              <span className="text-zinc-500 font-semibold">Voice Notes:</span> {diag.voiceNotes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-400">
                    No dialogue in this shot (Action or environmental shot).
                  </div>
                )}
              </div>

              {/* Sound Effects & Music Cue */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    Sound Effects (SFX)
                  </div>
                  {(shot.sound_effects || []).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {shot.sound_effects.map((sfx, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-200">
                          {sfx}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">No specific sound effects logged.</p>
                  )}
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    <Music className="w-3.5 h-3.5 text-purple-400" />
                    Musical Score Cue
                  </div>
                  <p className="text-xs text-zinc-200 leading-relaxed">
                    {shot.music_cue || <span className="text-zinc-400 italic">No music cue specified.</span>}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs">
          <span className="text-zinc-400">
            Shot ID: <span className="font-mono text-zinc-300">{shot.id.slice(0, 8)}...</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Close Workspace
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Asset Deletion */}
      <ConfirmationModal
        isOpen={Boolean(deletingAssetId)}
        title="Delete Production Asset"
        message="Are you sure you want to delete this media asset attempt? This will permanently remove the record and storage file."
        confirmLabel="Delete Asset"
        onConfirm={async () => {
          if (deletingAssetId) {
            await onDeleteAsset(deletingAssetId);
            setDeletingAssetId(null);
          }
        }}
        onCancel={() => setDeletingAssetId(null)}
      />

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 p-1.5 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            {lightboxUrl.type === 'image' ? (
              <img
                src={lightboxUrl.url}
                alt="Enlarged Preview"
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
              />
            ) : (
              <video
                src={lightboxUrl.url}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
