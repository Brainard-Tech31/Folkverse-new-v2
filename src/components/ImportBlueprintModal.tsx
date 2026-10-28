/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import type { Project, FolkverseBlueprint } from '../types/database.ts';
import {
  parseAndValidateBlueprintJson,
  getSampleBlueprint,
  type ValidationResult,
} from '../services/blueprint.ts';
import {
  Upload,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  Download,
  FolderPlus,
  RefreshCw,
  GitMerge,
  Clock,
  Film,
  Users,
  MapPin,
} from 'lucide-react';

interface ImportBlueprintModalProps {
  isOpen: boolean;
  activeProject: Project | null;
  onClose: () => void;
  onImportNewProject: (blueprint: FolkverseBlueprint) => Promise<void>;
  onImportActiveProject: (
    blueprint: FolkverseBlueprint,
    mode: 'replace' | 'merge'
  ) => Promise<void>;
}

export const ImportBlueprintModal: React.FC<ImportBlueprintModalProps> = ({
  isOpen,
  activeProject,
  onClose,
  onImportNewProject,
  onImportActiveProject,
}) => {
  const [jsonText, setJsonText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importDestination, setImportDestination] = useState<'new' | 'active'>(
    activeProject ? 'active' : 'new'
  );
  const [replaceMode, setReplaceMode] = useState<'replace' | 'merge'>('replace');
  const [confirmReplace, setConfirmReplace] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    if (!file) return;
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setValidation({
        valid: false,
        errors: ['Please select a valid .json file.'],
        warnings: [],
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonText(content);
      const res = parseAndValidateBlueprintJson(content);
      setValidation(res);
      setImportError(null);
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleValidateText = () => {
    const res = parseAndValidateBlueprintJson(jsonText);
    setValidation(res);
    setImportError(null);
  };

  const handleDownloadSample = () => {
    const sample = getSampleBlueprint();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sample, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'folkverse-sample-blueprint.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExecuteImport = async () => {
    if (!validation?.valid || !validation.blueprint) return;
    setImportError(null);

    if (importDestination === 'active' && replaceMode === 'replace' && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }

    try {
      setIsImporting(true);
      if (importDestination === 'new') {
        await onImportNewProject(validation.blueprint);
      } else {
        await onImportActiveProject(validation.blueprint, replaceMode);
      }
      onClose();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  const formatRuntime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
      <div
        className="w-full max-w-3xl bg-[#141518] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100 font-cinematic">
                Import Cinematic Blueprint
              </h2>
              <p className="text-xs text-zinc-400">
                Import JSON production blueprint containing characters, locations, scenes, shots, and prompts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-between px-6 border-b border-zinc-800 bg-zinc-900/40 text-xs font-medium">
          <div className="flex">
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-3 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === 'upload'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload / Drop File
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`py-3 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === 'paste'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Paste JSON
            </button>
          </div>

          <button
            onClick={handleDownloadSample}
            className="text-amber-400 hover:text-amber-300 flex items-center gap-1.5 cursor-pointer text-xs"
            title="Download sample schema blueprint"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sample Blueprint
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {activeTab === 'upload' ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <Upload className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-zinc-200">
                Drag and drop your JSON blueprint here
              </p>
              <p className="text-zinc-500 mt-1">or click to browse from your device</p>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                rows={7}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='Paste valid Folkverse blueprint JSON here (e.g. {"schemaVersion": "1.0", "project": { ... }})'
                className="w-full p-3 font-mono text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-hidden focus:border-amber-500/60 leading-relaxed"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleValidateText}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg cursor-pointer font-medium"
                >
                  Validate JSON
                </button>
              </div>
            </div>
          )}

          {/* Validation Feedback & Preview */}
          {validation && (
            <div className="space-y-4">
              {validation.valid ? (
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Blueprint Validated Successfully (Schema v1.0)</span>
                  </div>

                  {validation.blueprint && validation.stats && (
                    <div className="space-y-2">
                      <div className="text-zinc-200 font-medium">
                        <span className="text-zinc-400">Project:</span>{' '}
                        {validation.blueprint.project.title}
                        {validation.blueprint.project.genre && (
                          <span className="ml-2 text-zinc-400 text-[11px]">
                            ({validation.blueprint.project.genre})
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <div className="p-2 bg-zinc-900/80 rounded-lg border border-zinc-800 flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-amber-400" />
                          <span>{validation.stats.charactersCount} Characters</span>
                        </div>
                        <div className="p-2 bg-zinc-900/80 rounded-lg border border-zinc-800 flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          <span>{validation.stats.locationsCount} Locations</span>
                        </div>
                        <div className="p-2 bg-zinc-900/80 rounded-lg border border-zinc-800 flex items-center gap-2">
                          <Film className="w-3.5 h-3.5 text-amber-400" />
                          <span>{validation.stats.scenesCount} Scenes</span>
                        </div>
                        <div className="p-2 bg-zinc-900/80 rounded-lg border border-zinc-800 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{validation.stats.shotsCount} Shots ({formatRuntime(validation.stats.totalRuntimeSeconds)})</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {validation.warnings.length > 0 && (
                    <div className="text-amber-300 space-y-1 pt-1">
                      {validation.warnings.map((w, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-red-300 font-semibold">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Validation Failed ({validation.errors.length} errors)</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-red-300/90 text-[11px] max-h-36 overflow-y-auto">
                    {validation.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Import Destination Selection */}
          {validation?.valid && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-4">
              <h4 className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px]">
                Import Destination
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setImportDestination('new');
                    setConfirmReplace(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    importDestination === 'new'
                      ? 'bg-zinc-800 border-amber-500/60 text-zinc-100 shadow-sm'
                      : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium text-xs mb-1">
                    <FolderPlus className="w-4 h-4 text-amber-400" />
                    <span>Create As New Project</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Creates an independent storytelling project with all blueprint assets.
                  </p>
                </button>

                {activeProject && (
                  <button
                    type="button"
                    onClick={() => setImportDestination('active')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      importDestination === 'active'
                        ? 'bg-zinc-800 border-amber-500/60 text-zinc-100 shadow-sm'
                        : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium text-xs mb-1">
                      <RefreshCw className="w-4 h-4 text-amber-400" />
                      <span>Import into Active Project</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate">
                      Target: "{activeProject.title}"
                    </p>
                  </button>
                )}
              </div>

              {/* Mode if active project */}
              {importDestination === 'active' && (
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                      <input
                        type="radio"
                        name="replaceMode"
                        checked={replaceMode === 'replace'}
                        onChange={() => {
                          setReplaceMode('replace');
                          setConfirmReplace(false);
                        }}
                      />
                      <span>Replace existing production data</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                      <input
                        type="radio"
                        name="replaceMode"
                        checked={replaceMode === 'merge'}
                        onChange={() => {
                          setReplaceMode('merge');
                          setConfirmReplace(false);
                        }}
                      />
                      <span>Merge with existing data</span>
                    </label>
                  </div>

                  {replaceMode === 'replace' && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        Replacement will overwrite current scenes, shots, characters, and locations in "{activeProject?.title}".
                      </span>
                    </div>
                  )}

                  {confirmReplace && replaceMode === 'replace' && (
                    <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg text-red-200 text-xs space-y-2">
                      <p className="font-semibold">
                        Confirm: Are you sure you want to replace all current production data?
                      </p>
                      <button
                        type="button"
                        onClick={handleExecuteImport}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg text-xs cursor-pointer"
                      >
                        Yes, Overwrite & Import Now
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {importError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{importError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!validation?.valid || isImporting}
            onClick={handleExecuteImport}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-amber-950/40"
          >
            {isImporting && (
              <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            )}
            <span>
              {importDestination === 'new'
                ? 'Create Project from Blueprint'
                : replaceMode === 'replace'
                ? 'Replace & Import Blueprint'
                : 'Merge Blueprint'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
