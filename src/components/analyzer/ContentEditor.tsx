"use client";

import React, { useState } from "react";
import { EditorViewMode } from "@/types/app";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PendingProposal } from "@/hooks/useEditor";
import {
  FileCode,
  Eye,
  Columns,
  Code2,
  Trash2,
  Wand2,
  Zap,
  Heading,
  Languages,
  Undo2,
  Check,
  X,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  htmlToMarkdown,
  extractHeadings,
  parseMarkdownBlocks,
} from "@/lib/markdown-parser";

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
}

export function ContentEditor({
  content,
  onContentChange,
  viewMode,
  onViewModeChange,
  onClear,
  title,
  onTitleChange,
  onOneClickFix,
  onHumanizeTone,
  onAutoHeadings,
  onDialectAdapt,
  onUndo,
  hasUndo = false,
  pendingProposal = null,
  onAcceptProposal,
  onRejectProposal,
}: ContentEditorProps) {
  const [showDialectMenu, setShowDialectMenu] = useState(false);

  // Extract structured headings in real-time
  const headings = React.useMemo(() => extractHeadings(content), [content]);
  const h1Count = headings.filter((h) => h.level === 1).length;
  const h2Count = headings.filter((h) => h.level === 2).length;
  const h3Count = headings.filter((h) => h.level === 3).length;

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');

    let textToInsert = plain;
    // If HTML contains semantic headings or rich tags, convert to clean Markdown
    if (html && (/<h[1-6]/i.test(html) || /<(?:p|ul|ol|li|a|strong|b|em|i|blockquote)/i.test(html))) {
      const converted = htmlToMarkdown(html);
      if (converted && converted.trim()) {
        textToInsert = converted;
      }
    }

    if (!textToInsert) return;

    e.preventDefault();
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);
    const nextContent = before + textToInsert + after;
    onContentChange(nextContent);

    // Auto-sync title if title input is empty and pasted content has H1
    if (!title.trim()) {
      const h1Match = textToInsert.match(/^(?:#\s+|<h1[^>]*>)(.+?)(?:<\/h1>)?$/m);
      if (h1Match) {
        onTitleChange(h1Match[1].trim());
      }
    }

    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    }, 0);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card shadow-sm overflow-hidden min-h-[640px]">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 border-b border-border bg-slate-50/80 dark:bg-slate-900/60">
        {/* Mode Selectors */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-200/60 dark:bg-slate-800 p-1">
          <button
            type="button"
            onClick={() => onViewModeChange("editor")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "editor"
                ? "bg-white dark:bg-slate-700 text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>Editor</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange("inspector")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "inspector"
                ? "bg-white dark:bg-slate-700 text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Inspector</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange("diff")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "diff"
                ? "bg-white dark:bg-slate-700 text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Columns className="h-3.5 w-3.5" />
            <span>Diff View</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange("preview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "preview"
                ? "bg-white dark:bg-slate-700 text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Safe Preview</span>
          </button>
        </div>

        {/* Operational Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {hasUndo && onUndo && (
            <Button
              size="sm"
              variant="outline"
              onClick={onUndo}
              className="text-xs font-semibold gap-1.5 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-950/20"
              title="Undo last optimization"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>Undo</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="default"
            onClick={onOneClickFix}
            disabled={!content.trim()}
            className="text-xs font-bold gap-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-brand-600 hover:from-emerald-700 hover:to-brand-700 text-white shadow-sm"
            title="Automated SEO on-page fix proposal"
          >
            <Wand2 className="h-3.5 w-3.5" />
            <span>1-Click SEO Fix</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onHumanizeTone}
            disabled={!content.trim()}
            className="text-xs font-semibold gap-1.5 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/20"
            title="Clean robotic filler phrases and clichés"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Humanize Tone</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onAutoHeadings}
            disabled={!content.trim()}
            className="text-xs font-semibold gap-1.5 hidden sm:flex"
            title="Generate structured H1 and H2 subheadings"
          >
            <Heading className="h-3.5 w-3.5" />
            <span>Auto Headings</span>
          </Button>

          <div className="relative inline-block">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDialectMenu(!showDialectMenu)}
              disabled={!content.trim()}
              className="text-xs font-semibold gap-1.5 hidden md:flex"
              title="Adapt spelling & vocabulary between US and UK English"
            >
              <Languages className="h-3.5 w-3.5" />
              <span>US ↔ UK Dialect</span>
            </Button>

            {showDialectMenu && (
              <div className="absolute right-0 mt-1 w-48 rounded-xl border border-border bg-card shadow-lg z-20 py-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    onDialectAdapt?.('UK');
                    setShowDialectMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground font-medium flex items-center justify-between"
                >
                  <span>🇬🇧 Convert to UK English</span>
                  <Badge variant="muted" className="text-[10px]">British</Badge>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDialectAdapt?.('US');
                    setShowDialectMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground font-medium flex items-center justify-between"
                >
                  <span>🇺🇸 Convert to US English</span>
                  <Badge variant="muted" className="text-[10px]">American</Badge>
                </button>
              </div>
            )}
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={onClear}
            className="text-muted-foreground hover:text-rose-500 h-8 w-8"
            title="Clear editor text"
            aria-label="Clear content"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Interactive Proposal Review Drawer (1-Click Fix, Auto Headings, etc.) */}
      {pendingProposal && (
        <div className="p-4 bg-brand-50/80 dark:bg-brand-950/40 border-b border-brand-500/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <h4 className="text-xs font-bold text-foreground">
                {pendingProposal.title}
              </h4>
              <Badge variant="info" className="text-[10px]">
                {pendingProposal.changes.length} change(s) proposed
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onRejectProposal}
                className="text-xs h-7 text-muted-foreground hover:text-rose-500 gap-1"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reject</span>
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={onAcceptProposal}
                className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 shadow-sm"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Accept Changes</span>
              </Button>
            </div>
          </div>

          {/* List of changes */}
          {pendingProposal.changes.length > 0 && (
            <div className="bg-white/80 dark:bg-slate-900/80 rounded-xl p-3 border border-border space-y-1 text-xs">
              <span className="font-semibold text-muted-foreground text-[11px] block">
                Proposed Improvements:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-foreground">
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
            <div className="p-3 rounded-xl border border-border bg-slate-100/70 dark:bg-slate-900/60 space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Original Draft</span>
              <div className="max-h-36 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
                {pendingProposal.originalContent}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1">
              <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">Proposed Version</span>
              <div className="max-h-36 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] text-foreground">
                {pendingProposal.proposedContent}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Main Canvas */}
      <div className="flex-1 flex flex-col p-4 sm:p-5">
        {viewMode === "editor" && (
          <div className="flex-1 flex flex-col space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Article H1 Title (e.g. Complete Technical SEO Checklist for Modern Web Apps)"
              className="w-full text-base sm:text-lg font-bold bg-transparent border-b border-border pb-2 outline-none text-foreground placeholder:text-muted-foreground/60 focus:border-brand-500 transition-colors"
            />

            {/* Live Document Headings Structure Bar */}
            {headings.length > 0 && (
              <div className="p-2.5 rounded-xl border border-border bg-slate-50/90 dark:bg-slate-900/60 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">
                    <Heading className="h-3.5 w-3.5 text-brand-500" />
                    <span>Document Heading Structure ({headings.length})</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold">
                    <Badge variant={h1Count === 1 ? "success" : h1Count > 1 ? "warning" : "danger"} className="text-[10px]">
                      {h1Count} H1
                    </Badge>
                    <Badge variant={h2Count >= 1 ? "success" : "warning"} className="text-[10px]">
                      {h2Count} H2
                    </Badge>
                    {h3Count > 0 && (
                      <Badge variant="muted" className="text-[10px]">
                        {h3Count} H3
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 overflow-x-auto max-h-24">
                  {headings.map((h, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-border text-[11px] font-semibold text-foreground max-w-sm truncate shadow-xs"
                      title={`${h.raw} (Line ${h.lineIndex + 1})`}
                    >
                      <Badge
                        variant={h.level === 1 ? "info" : h.level === 2 ? "secondary" : "muted"}
                        className="text-[9px] px-1.5 py-0 h-4 font-bold"
                      >
                        H{h.level}
                      </Badge>
                      <span className="truncate">{h.text}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              onPaste={handlePaste}
              placeholder={`Paste or type your article...

Features supported in this editor:
• Deterministic on-page SEO diagnostics & real checklist
• 1-Click SEO Fix: safe, proposed improvements with Preview, Accept, & Undo
• Scannability diagnostics (<80 words per mobile paragraph)
• Clean Markdown heading structure (# H1, ## H2, ### H3)
• Robotic cliché cleaner & US ↔ UK dialect adapter`}
              className="flex-1 min-h-[480px] text-xs sm:text-sm font-normal leading-relaxed border-none focus-visible:ring-0 p-0 resize-none bg-transparent"
            />
          </div>
        )}

        {viewMode === "inspector" && (
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Document Structure & Headings Inspector
              </h4>
              <Badge variant="muted">{headings.length} Heading(s) Detected</Badge>
            </div>
            {headings.length > 0 ? (
              <div className="space-y-2.5 font-mono text-xs">
                {headings.map((h, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3 ${
                      h.level === 1 ? 'border-brand-500/40 bg-brand-50/20 dark:bg-brand-950/20 font-bold' : ''
                    }`}
                    style={{ paddingLeft: `${Math.max(12, (h.level - 1) * 20 + 12)}px` }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant={h.level === 1 ? 'info' : h.level === 2 ? 'secondary' : 'muted'}
                        className="text-[10px] font-bold shrink-0"
                      >
                        H{h.level}
                      </Badge>
                      <span className="font-semibold text-foreground truncate">{h.text}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      Line {h.lineIndex + 1}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No headings detected. Add headings (e.g. # Main Title, ## Section) to inspect.
              </p>
            )}
          </div>
        )}

        {viewMode === "diff" && (
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Side-by-Side Revision Diff Viewer
              </h4>
              <Badge variant="muted">Revision Comparator</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/40 space-y-2">
                <span className="text-[11px] font-bold uppercase text-muted-foreground">
                  Current Draft
                </span>
                <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground max-h-96 overflow-y-auto">
                  {content || "No content entered yet."}
                </pre>
              </div>
              <div className="p-4 rounded-xl border border-brand-500/30 bg-brand-50/20 dark:bg-brand-950/10 space-y-2">
                <span className="text-[11px] font-bold uppercase text-brand-600 dark:text-brand-400">
                  {pendingProposal ? "Proposed Revision" : "Clean Preview"}
                </span>
                <pre className="text-xs whitespace-pre-wrap font-mono text-foreground max-h-96 overflow-y-auto">
                  {pendingProposal ? pendingProposal.proposedContent : content || "No content entered yet."}
                </pre>
              </div>
            </div>
          </div>
        )}

        {viewMode === "preview" && (
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Safe Clean Text Preview
              </h4>
              <div className="flex items-center gap-2">
                <Badge variant="muted">{headings.length} Headings</Badge>
                <Badge variant="success">XSS Safe</Badge>
              </div>
            </div>
            <div className="max-w-3xl space-y-4 text-xs sm:text-sm leading-relaxed text-foreground">
              {content ? (
                parseMarkdownBlocks(content).map((block, idx) => {
                  if (block.type === 'h1') {
                    return (
                      <h1 key={idx} className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight pb-2.5 border-b border-border mt-6 mb-3 flex items-center justify-between">
                        <span>{block.text}</span>
                        <Badge variant="info" className="text-[10px] font-bold">H1</Badge>
                      </h1>
                    );
                  }
                  if (block.type === 'h2') {
                    return (
                      <h2 key={idx} className="text-xl sm:text-2xl font-bold text-foreground tracking-tight pt-5 pb-2 border-b border-border/50 mt-5 mb-2.5 flex items-center justify-between">
                        <span>{block.text}</span>
                        <Badge variant="info" className="text-[10px] font-bold">H2</Badge>
                      </h2>
                    );
                  }
                  if (block.type === 'h3') {
                    return (
                      <h3 key={idx} className="text-base sm:text-lg font-bold text-foreground pt-4 mt-4 mb-2 flex items-center justify-between">
                        <span>{block.text}</span>
                        <Badge variant="muted" className="text-[10px] font-bold">H3</Badge>
                      </h3>
                    );
                  }
                  if (block.type === 'h4' || block.type === 'h5' || block.type === 'h6') {
                    return (
                      <h4 key={idx} className="text-sm sm:text-base font-semibold text-foreground pt-3 mt-3 mb-1">
                        {block.text}
                      </h4>
                    );
                  }
                  if (block.type === 'hr') {
                    return <hr key={idx} className="my-6 border-border" />;
                  }
                  if (block.type === 'quote') {
                    return (
                      <blockquote key={idx} className="border-l-4 border-brand-500 bg-brand-50/30 dark:bg-brand-950/20 p-3 rounded-r-xl text-sm italic text-muted-foreground my-3">
                        {renderInlineMarkdown(block.text)}
                      </blockquote>
                    );
                  }
                  if (block.type === 'list') {
                    return block.ordered ? (
                      <ol key={idx} className="list-decimal list-inside space-y-1 my-2 text-sm text-foreground/90 pl-2">
                        {block.items?.map((item, i) => (
                          <li key={i} className="leading-relaxed">{renderInlineMarkdown(item)}</li>
                        ))}
                      </ol>
                    ) : (
                      <ul key={idx} className="list-disc list-inside space-y-1 my-2 text-sm text-foreground/90 pl-2">
                        {block.items?.map((item, i) => (
                          <li key={i} className="leading-relaxed">{renderInlineMarkdown(item)}</li>
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <p key={idx} className="text-sm leading-relaxed text-foreground/90 my-2.5">
                      {renderInlineMarkdown(block.text)}
                    </p>
                  );
                })
              ) : (
                <p className="text-muted-foreground italic">No content to preview.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  const parts: React.ReactNode[] = [];
  const regex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    if (match[2] && match[3]) {
      parts.push(
        <a
          key={match.index}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-600 dark:text-brand-400 underline font-medium hover:text-brand-700"
        >
          {match[2]}
        </a>
      );
    } else if (match[4]) {
      parts.push(<strong key={match.index} className="font-bold text-foreground">{match[4]}</strong>);
    } else if (match[5]) {
      parts.push(<em key={match.index} className="italic text-foreground">{match[5]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

