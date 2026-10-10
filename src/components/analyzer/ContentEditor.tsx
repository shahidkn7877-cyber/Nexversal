'use client';

import React, { useMemo, useState } from 'react';
import { EditorViewMode } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PendingProposal } from '@/hooks/useEditor';
import { VisualEditor } from './VisualEditor';
import { SourceEditor } from './SourceEditor';
import { PublishedPreview } from './PublishedPreview';
import { isRtlLanguage } from '@/lib/languages';
import {
  FileCode,
  Code2,
  Eye,
  Columns,
  Heading,
  Trash2,
  Undo2,
  Check,
  X,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  Download,
  FileText,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { extractHeadings } from '@/lib/markdown-parser';

interface ContentEditorProps {
  content: string;
  onContentChange: (val: string) => void;
  viewMode: EditorViewMode;
  onViewModeChange: (mode: EditorViewMode) => void;
  onClear: () => void;
  title: string;
  onTitleChange: (val: string) => void;
  onOneClickFix?: () => void;
  onHumanizeTone?: () => void;
  onAutoHeadings?: () => void;
  onDialectAdapt?: (variant: 'US' | 'UK') => void;
  onUndo?: () => void;
  hasUndo?: boolean;
  pendingProposal?: PendingProposal | null;
  onAcceptProposal?: () => void;
  onRejectProposal?: () => void;
  language?: string;
  metaDescription?: string;
  slug?: string;
  onExportArticle?: (format: 'pdf' | 'docx') => void;
  isExporting?: boolean;
}

export function ContentEditor({
  content,
  onContentChange,
  viewMode,
  onViewModeChange,
  onClear,
  title,
  onTitleChange,
  onUndo,
  hasUndo = false,
  pendingProposal = null,
  onAcceptProposal,
  onRejectProposal,
  language = 'en-US',
  metaDescription = '',
  slug = '',
  onExportArticle,
  isExporting = false,
}: ContentEditorProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const isRtl = useMemo(() => isRtlLanguage(language), [language]);

  // Extract structured headings in real-time
  const headings = useMemo(() => extractHeadings(content), [content]);
  const h1Count = headings.filter((h) => h.level === 1).length;
  const h2Count = headings.filter((h) => h.level === 2).length;
  const h3Count = headings.filter((h) => h.level === 3).length;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden min-h-[640px] transition-all">
      {/* Top Mode Bar */}
      <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Three Primary Editor Modes + Secondary Inspection Modes */}
        <div className="flex items-center rounded-xl bg-slate-200/70 dark:bg-slate-800 p-1 gap-0.5">
          {/* 1. Visual Editor Mode */}
          <button
            type="button"
            onClick={() => onViewModeChange('visual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'visual' || viewMode === 'editor'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>Visual Editor</span>
          </button>

          {/* 2. Source / Code View Mode */}
          <button
            type="button"
            onClick={() => onViewModeChange('source')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'source'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Source View</span>
          </button>

          {/* 3. Published Article Preview Mode */}
          <button
            type="button"
            onClick={() => onViewModeChange('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'preview'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Article Preview</span>
          </button>

          {/* Headings Inspector Mode */}
          <button
            type="button"
            onClick={() => onViewModeChange('inspector')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hidden sm:flex ${
              viewMode === 'inspector'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Heading className="h-3.5 w-3.5" />
            <span>Headings</span>
          </button>

          {/* Diff View Mode */}
          <button
            type="button"
            onClick={() => onViewModeChange('diff')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hidden md:flex ${
              viewMode === 'diff'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Columns className="h-3.5 w-3.5" />
            <span>Diff</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Download / Export Article Control */}
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              disabled={!content.trim() || isExporting}
              onClick={() => setShowExportMenu((prev) => !prev)}
              className="h-7 text-xs font-semibold gap-1 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={content.trim() ? 'Download article as PDF or Word document' : 'Write or paste content to download'}
            >
              {isExporting ? (
                <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
              ) : (
                <Download className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              )}
              <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Download Article'}</span>
              <span className="sm:hidden">Export</span>
              <ChevronDown className="h-2.5 w-2.5 opacity-60" />
            </Button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
                  Export Document
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportArticle?.('pdf');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-rose-500" />
                    <span>Download as PDF</span>
                  </div>
                  <Badge variant="muted" className="text-[10px]">.pdf</Badge>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportArticle?.('docx');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-blue-600" />
                    <span>Download as Word</span>
                  </div>
                  <Badge variant="muted" className="text-[10px]">.docx</Badge>
                </button>
              </div>
            )}
          </div>

          {hasUndo && onUndo && (
            <Button
              size="sm"
              variant="outline"
              onClick={onUndo}
              className="h-7 text-xs font-semibold gap-1 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 hover:bg-blue-50"
              title="Undo last change"
            >
              <Undo2 className="h-3 w-3" />
              <span>Undo</span>
            </Button>
          )}

          <Button
            size="icon"
            variant="ghost"
            onClick={onClear}
            className="h-7 w-7 text-slate-400 hover:text-rose-500 rounded-lg"
            title="Clear editor text"
            aria-label="Clear content"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Interactive Proposal Review Drawer (Humanize Tone, 1-Click Fix, Translation, etc.) */}
      {pendingProposal && (
        <div className="p-4 bg-blue-50/90 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/50 space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {pendingProposal.title}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Review proposed revisions before applying to your draft
                </p>
              </div>
              <Badge variant="info" className="text-[10px] ml-1">
                {pendingProposal.changes.length} change(s) proposed
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onRejectProposal}
                className="text-xs h-7 text-slate-600 dark:text-slate-400 hover:text-rose-600 gap-1"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reject</span>
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={onAcceptProposal}
                className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1 shadow-xs"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Accept Changes</span>
              </Button>
            </div>
          </div>

          {pendingProposal.changes.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] block">
                Proposed Improvements:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                {pendingProposal.changes.map((change, idx) => (
                  <li key={idx} className="leading-snug">
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Side-by-side preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Original Draft</span>
              <div className="max-h-36 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                {pendingProposal.originalContent}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-blue-300 dark:border-blue-900 bg-white dark:bg-slate-900 space-y-1">
              <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">Proposed Version</span>
              <div className="max-h-36 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] text-slate-900 dark:text-slate-100">
                {pendingProposal.proposedContent}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Article Title Input (rendered in editing modes) */}
      {viewMode !== 'preview' && (
        <div className="px-6 pt-5 pb-2 bg-white dark:bg-slate-900">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Article title..."
            dir={isRtl ? 'rtl' : 'ltr'}
            className={`w-full text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 bg-transparent border-b border-slate-100 dark:border-slate-800/80 pb-3 outline-none transition-colors ${
              isRtl ? 'text-right' : 'text-left'
            }`}
          />
        </div>
      )}

      {/* Editor Body Rendered by Mode */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
        {/* Mode A: Visual Editor (Default) */}
        {(viewMode === 'visual' || viewMode === 'editor') && (
          <VisualEditor
            content={content}
            onContentChange={onContentChange}
            isRtl={isRtl}
          />
        )}

        {/* Mode B: Source / Code View */}
        {viewMode === 'source' && (
          <SourceEditor
            content={content}
            onContentChange={onContentChange}
            isRtl={isRtl}
          />
        )}

        {/* Mode C: Published Article Preview */}
        {viewMode === 'preview' && (
          <PublishedPreview
            title={title}
            content={content}
            metaDescription={metaDescription}
            slug={slug}
            language={language}
            isRtl={isRtl}
            onBackToEdit={() => onViewModeChange('visual')}
          />
        )}

        {/* Headings Inspector Mode */}
        {viewMode === 'inspector' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Document Headings Hierarchy
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <Badge
                  variant={h1Count === 1 ? 'success' : h1Count > 1 ? 'warning' : 'danger'}
                  className="text-[10px]"
                >
                  {h1Count} H1
                </Badge>
                <Badge variant={h2Count >= 1 ? 'success' : 'warning'} className="text-[10px]">
                  {h2Count} H2
                </Badge>
                {h3Count > 0 && (
                  <Badge variant="muted" className="text-[10px]">
                    {h3Count} H3
                  </Badge>
                )}
              </div>
            </div>

            {headings.length > 0 ? (
              <div className="space-y-2 font-mono text-xs">
                {headings.map((h, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3 ${
                      h.level === 1 ? 'border-blue-400 bg-blue-50/30 dark:bg-blue-950/20 font-bold' : ''
                    }`}
                    style={{
                      paddingLeft: `${Math.max(12, (h.level - 1) * 20 + 12)}px`,
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant={h.level === 1 ? 'info' : h.level === 2 ? 'secondary' : 'muted'}
                        className="text-[10px] font-bold shrink-0"
                      >
                        H{h.level}
                      </Badge>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {h.text}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">Line {h.lineIndex + 1}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <HelpCircle className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p>No headings detected in this article.</p>
              </div>
            )}
          </div>
        )}

        {/* Diff Mode */}
        {viewMode === 'diff' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Side-by-Side Revision Diff Viewer
              </div>
              <Badge variant="muted">Comparator</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-500">Current Draft</span>
                <pre className="text-xs whitespace-pre-wrap font-mono text-slate-600 dark:text-slate-400 max-h-96 overflow-y-auto">
                  {content || 'No content entered yet.'}
                </pre>
              </div>
              <div className="p-4 rounded-xl border border-blue-300 dark:border-blue-900 bg-blue-50/20 dark:bg-blue-950/10 space-y-2">
                <span className="text-[11px] font-bold uppercase text-blue-600 dark:text-blue-400">
                  {pendingProposal ? 'Proposed Revision' : 'Current Preview'}
                </span>
                <pre className="text-xs whitespace-pre-wrap font-mono text-slate-900 dark:text-slate-100 max-h-96 overflow-y-auto">
                  {pendingProposal ? pendingProposal.proposedContent : content || 'No content entered yet.'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
