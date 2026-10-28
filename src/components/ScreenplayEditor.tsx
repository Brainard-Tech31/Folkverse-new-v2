/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import type { Screenplay } from '../types/database.ts';
import {
  Save,
  RotateCcw,
  Clock,
  FileText,
  AlertCircle,
  Check,
  AlignLeft,
  User,
  MessageSquare,
  Compass,
} from 'lucide-react';

interface ScreenplayEditorProps {
  projectId: string;
  projectTitle: string;
  screenplay: Screenplay | null;
  isLoading: boolean;
  onSave: (content: string) => Promise<void>;
}

export const ScreenplayEditor: React.FC<ScreenplayEditorProps> = ({
  projectId,
  projectTitle,
  screenplay,
  isLoading,
  onSave,
}) => {
  const [content, setContent] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (screenplay) {
      setContent(screenplay.content || '');
      setInitialContent(screenplay.content || '');
      setSaveError(null);
    }
  }, [screenplay, projectId]);

  const isDirty = content !== initialContent;

  // Screenplay metrics
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const estimatedPages = Math.max(1, Math.ceil(words / 250));

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(false);

    try {
      setIsSaving(true);
      await onSave(content);
      setInitialContent(content);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save screenplay document.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = () => {
    setContent(initialContent);
    setSaveError(null);
  };

  const insertSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);

    const newContent = `${before}${snippet}${after}`;
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-zinc-400">Loading screenplay document...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Editor Toolbar */}
      <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Formatting Helpers */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-zinc-500 font-medium mr-1 uppercase text-[10px] tracking-wider">
            Format:
          </span>
          <button
            type="button"
            onClick={() => insertSnippet('\n\nINT. LOCATION - DAY\n\n')}
            className="px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 rounded-md transition-colors cursor-pointer flex items-center gap-1"
            title="Scene Heading / Slugline"
          >
            <Compass className="w-3 h-3 text-amber-400" />
            <span>Slugline</span>
          </button>

          <button
            type="button"
            onClick={() => insertSnippet('\n\nAction description goes here.\n\n')}
            className="px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 rounded-md transition-colors cursor-pointer flex items-center gap-1"
            title="Action block"
          >
            <AlignLeft className="w-3 h-3 text-zinc-400" />
            <span>Action</span>
          </button>

          <button
            type="button"
            onClick={() => insertSnippet('\n\n                CHARACTER NAME\n')}
            className="px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 rounded-md transition-colors cursor-pointer flex items-center gap-1"
            title="Character Cue"
          >
            <User className="w-3 h-3 text-amber-400" />
            <span>Character</span>
          </button>

          <button
            type="button"
            onClick={() => insertSnippet('            (whispering)\n')}
            className="px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 rounded-md transition-colors cursor-pointer"
            title="Parenthetical"
          >
            <span>(Parenthetical)</span>
          </button>

          <button
            type="button"
            onClick={() => insertSnippet('        Dialogue line spoken by the character.\n\n')}
            className="px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 rounded-md transition-colors cursor-pointer flex items-center gap-1"
            title="Dialogue block"
          >
            <MessageSquare className="w-3 h-3 text-zinc-400" />
            <span>Dialogue</span>
          </button>

          <button
            type="button"
            onClick={() => insertSnippet('\n                                            CUT TO:\n\n')}
            className="px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 rounded-md transition-colors cursor-pointer"
            title="Transition"
          >
            <span>CUT TO:</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {isDirty && (
            <button
              onClick={handleRevert}
              disabled={isSaving}
              className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
              title="Discard unsaved changes"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Discard Changes</span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className={`px-4 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              isDirty
                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-sm shadow-amber-950/40'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5 text-zinc-950" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save Screenplay'}</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {saveError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Screenplay Content Editor */}
      <div className="relative rounded-2xl border border-zinc-800 bg-[#0d0e11] overflow-hidden shadow-2xl">
        {/* Document Header Bar */}
        <div className="px-6 py-3 border-b border-zinc-800/80 bg-zinc-950/70 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-zinc-300">{projectTitle} — Screenplay</span>
            {isDirty && (
              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                Unsaved Edits
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-zinc-500">
            <span>{words} words</span>
            <span>~{estimatedPages} {estimatedPages === 1 ? 'page' : 'pages'}</span>
            {screenplay?.updated_at && (
              <div className="hidden sm:flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Saved {new Date(screenplay.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Textarea formatted as authentic courier screenplay manuscript */}
        <div className="p-6 md:p-10 max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="FADE IN:

EXT. SACRED GROVE - SUNSET

Ancient baobab branches silhouette against the burning dusk. The whispering wind carries the sound of distant drums..."
            rows={26}
            className="w-full bg-transparent font-script text-zinc-200 text-sm md:text-base leading-relaxed tracking-wide resize-y focus:outline-hidden placeholder:text-zinc-700 min-h-[500px]"
            spellCheck={false}
          />
        </div>

        {/* Footer info */}
        <div className="px-6 py-2.5 border-t border-zinc-800/60 bg-zinc-950/40 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Standard Hollywood / Cinematic screenplay layout</span>
          <span>Tab & Courier formatting preserved</span>
        </div>
      </div>
    </div>
  );
};
