/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type {
  Project,
  Character,
  Location,
  Scene,
  Shot,
} from '../types/database.ts';
import { exportProjectToBlueprint } from '../services/blueprint.ts';
import {
  Download,
  Copy,
  Check,
  X,
  FileCode,
  AlertTriangle,
  Film,
} from 'lucide-react';

interface ExportBlueprintModalProps {
  isOpen: boolean;
  project: Project;
  characters: Character[];
  locations: Location[];
  scenes: Scene[];
  shots: Shot[];
  hasUnsavedEdits?: boolean;
  onClose: () => void;
}

export const ExportBlueprintModal: React.FC<ExportBlueprintModalProps> = ({
  isOpen,
  project,
  characters,
  locations,
  scenes,
  shots,
  hasUnsavedEdits = false,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const blueprint = exportProjectToBlueprint(
    project,
    characters,
    locations,
    scenes,
    shots
  );

  const jsonString = JSON.stringify(blueprint, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const slug = project.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'folkverse-project';
    const filename = `${slug}-blueprint.json`;

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
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
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100 font-cinematic">
                Export Cinematic Blueprint
              </h2>
              <p className="text-xs text-zinc-400">
                Export complete production architecture into standard Folkverse v1.0 JSON format
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

        {/* Unsaved Edits Warning */}
        {hasUnsavedEdits && (
          <div className="mx-6 mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Warning: You have unsaved screenplay or workspace edits. Save all changes first to guarantee complete export.
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-3">
              <span>{scenes.length} Scenes</span>
              <span>•</span>
              <span>{shots.length} Shots</span>
              <span>•</span>
              <span>{characters.length} Characters</span>
              <span>•</span>
              <span>{locations.length} Locations</span>
            </div>

            <button
              onClick={handleCopy}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center gap-1.5 cursor-pointer font-medium"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy JSON
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <pre className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-300 overflow-x-auto max-h-80 leading-relaxed">
              {jsonString}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between text-xs">
          <span className="text-zinc-500">
            Ready for re-import into any Folkverse studio instance.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-950/40"
            >
              <Download className="w-4 h-4" />
              Download .json File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
