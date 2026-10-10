"use client";

import React, { useRef, useState, useMemo } from "react";
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
  Undo2,
  Check,
  X,
  Sparkles,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  HelpCircle,
  AlertTriangle,
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Extract structured headings in real-time
  const headings = useMemo(() => extractHeadings(content), [content]);
  const h1Count = headings.filter((h) => h.level === 1).length;
  const h2Count = headings.filter((h) => h.level === 2).length;
  const h3Count = headings.filter((h) => h.level === 3).length;

  // Real-time heading hierarchy skips check (e.g. H1 -> H3)
  const hierarchySkips = useMemo(() => {
    const issues: string[] = [];
    let prevLevel = 0;
    for (const h of headings) {
      if (prevLevel > 0 && h.level > prevLevel + 1) {
        issues.push(`Heading skip from H${prevLevel} to H${h.level}: "${h.text}"`);
      }
      prevLevel = h.level;
    }
    return issues;
  }, [headings]);

  // Real toolbar action handler: inserts or wraps markdown formatting around selection
  const applyFormatting = (
    type: 'bold' | 'italic' | 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'quote' | 'link'
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);

    let replacement = "";
    let cursorOffset = 0;

    switch (type) {
      case "bold":
        replacement = selected ? `**${selected}**` : "**bold text**";
        cursorOffset = selected ? replacement.length : 2;
        break;
      case "italic":
        replacement = selected ? `*${selected}*` : "*italic text*";
        cursorOffset = selected ? replacement.length : 1;
        break;
      case "h1":
        replacement = selected ? `# ${selected}` : "# Heading 1";
        cursorOffset = replacement.length;
        break;
      case "h2":
        replacement = selected ? `## ${selected}` : "## Heading 2";
        cursorOffset = replacement.length;
        break;
      case "h3":
        replacement = selected ? `### ${selected}` : "### Heading 3";
        cursorOffset = replacement.length;
        break;
      case "p":
        replacement = selected.replace(/^#{1,6}\s+/gm, "");
        cursorOffset = replacement.length;
        break;
      case "ul":
        replacement = selected
          ? selected
              .split("\n")
              .map((l) => (l.startsWith("- ") ? l : `- ${l}`))
              .join("\n")
          : "- List item";
        cursorOffset = replacement.length;
        break;
      case "ol":
        replacement = selected
          ? selected
              .split("\n")
              .map((l, i) => `${i + 1}. ${l.replace(/^\d+\.\s*/, "")}`)
              .join("\n")
          : "1. List item";
        cursorOffset = replacement.length;
        break;
      case "quote":
        replacement = selected
          ? selected
              .split("\n")
              .map((l) => (l.startsWith("> ") ? l : `> ${l}`))
              .join("\n")
          : "> Blockquote";
        cursorOffset = replacement.length;
        break;
      case "link":
        replacement = selected
          ? `[${selected}](https://)`
          : "[link text](https://example.com)";
        cursorOffset = replacement.length;
        break;
    }

    const nextContent =
      content.substring(0, start) + replacement + content.substring(end);
    onContentChange(nextContent);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = start + cursorOffset;
        textareaRef.current.selectionEnd = start + cursorOffset;
      }
    }, 0);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");

    let textToInsert = plain;
    // If HTML contains semantic headings or rich tags, convert to clean Markdown
    if (
      html &&
      (/<h[1-6]/i.test(html) ||
        /<(?:p|ul|ol|li|a|strong|b|em|i|blockquote)/i.test(html))
    ) {
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
      const h1Match = textToInsert.match(
        /^(?:#\s+|<h1[^>]*>)(.+?)(?:<\/h1>)?$/m
      );
      if (h1Match) {
        onTitleChange(h1Match[1].trim());
      }
    }

    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd =
        start + textToInsert.length;
    }, 0);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden min-h-[640px] transition-all">
      {/* Editor Clean Header & Toolbar */}
      <div className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 px-3.5 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left Side: Writing Controls (Functional WYSIWYG Actions) */}
        {viewMode === "editor" ? (
          <div className="flex flex-wrap items-center gap-1">
            {/* Paragraph / Headings */}
            <div className="flex items-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => applyFormatting("p")}
                className="px-2 py-1 text-xs font-semibold rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Normal Paragraph"
              >
                P
              </button>
              <button
                type="button"
                onClick={() => applyFormatting("h1")}
                className="px-2 py-1 text-xs font-bold rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Heading 1 (#)"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => applyFormatting("h2")}
                className="px-2 py-1 text-xs font-bold rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Heading 2 (##)"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => applyFormatting("h3")}
                className="px-2 py-1 text-xs font-bold rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Heading 3 (###)"
              >
                H3
              </button>
            </div>

            {/* Inline Formatting */}
            <div className="flex items-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => applyFormatting("bold")}
                className="p-1 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Bold (**text**)"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormatting("italic")}
                className="p-1 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Italic (*text*)"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormatting("quote")}
                className="p-1 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Blockquote (>)"
              >
                <Quote className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormatting("ul")}
                className="p-1 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Bulleted List (-)"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormatting("ol")}
                className="p-1 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Numbered List (1.)"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormatting("link")}
                className="p-1 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Insert Link ([text](url))"
              >
                <LinkIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs font-semibold text-slate-500">
            {viewMode === "preview" && "Safe Formatted Preview Mode"}
            {viewMode === "inspector" && "Document Headings Hierarchy"}
            {viewMode === "diff" && "Side-by-Side Revisions Comparison"}
          </div>
        )}

        {/* Right Side: View Modes & Draft Actions */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Mode Tabs */}
          <div className="flex items-center rounded-lg bg-slate-200/70 dark:bg-slate-800 p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange("editor")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === "editor"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <FileCode className="h-3 w-3" />
              <span>Editor</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("preview")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === "preview"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Eye className="h-3 w-3" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("inspector")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === "inspector"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Code2 className="h-3 w-3" />
              <span>Headings</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("diff")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === "diff"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Columns className="h-3 w-3" />
              <span>Diff</span>
            </button>
          </div>

          {/* Undo Action */}
          {hasUndo && onUndo && (
            <Button
              size="sm"
              variant="outline"
              onClick={onUndo}
              className="h-7 text-xs font-semibold gap-1 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              title="Undo last optimization"
            >
              <Undo2 className="h-3 w-3" />
              <span>Undo</span>
            </Button>
          )}

          {/* Clear Draft */}
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

      {/* Interactive Proposal Review Drawer (1-Click Fix, Auto Headings, etc.) */}
      {pendingProposal && (
        <div className="p-4 bg-blue-50/90 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/50 space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {pendingProposal.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Review proposed improvements before applying to your draft
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

          {/* List of changes */}
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

      {/* Editor Canvas Container */}
      <div className="flex-1 flex flex-col p-5 sm:p-6 bg-white dark:bg-slate-900">
        {viewMode === "editor" && (
          <div className="flex-1 flex flex-col space-y-3">
            {/* Article Headline Title (Notion/Substack Style) */}
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Article title..."
              className="w-full text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 bg-transparent border-b border-slate-100 dark:border-slate-800/80 pb-3 outline-none transition-colors"
            />

            {/* Real-time Headings Warning Alert (e.g. hierarchy skips) */}
            {hierarchySkips.length > 0 && (
              <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="font-medium">
                  {hierarchySkips[0]} (Fix by adding intermediate H2 before H3)
                </span>
              </div>
            )}

            {/* Clean Article Writing Textarea */}
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              onPaste={handlePaste}
              placeholder={`Write or paste your article content here...

Use headings (# H1, ## H2, ### H3) to structure your post.
Select text to apply formatting like bold, italic, lists, and links.
Paste content from Google Docs or Word with formatting preserved.`}
              className="flex-1 min-h-[480px] text-base leading-relaxed text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 border-none focus-visible:ring-0 p-0 resize-none bg-transparent font-sans"
            />
          </div>
        )}

        {viewMode === "inspector" && (
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Document Structure & Headings Hierarchy
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Search engines rely on a logical H1 → H2 → H3 outline to index your content
                </p>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <Badge
                  variant={h1Count === 1 ? "success" : h1Count > 1 ? "warning" : "danger"}
                  className="text-[10px]"
                >
                  {h1Count} H1
                </Badge>
                <Badge
                  variant={h2Count >= 1 ? "success" : "warning"}
                  className="text-[10px]"
                >
                  {h2Count} H2
                </Badge>
                {h3Count > 0 && (
                  <Badge variant="muted" className="text-[10px]">
                    {h3Count} H3
                  </Badge>
                )}
              </div>
            </div>

            {hierarchySkips.length > 0 && (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Hierarchy Skips Detected:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5">
                  {hierarchySkips.map((skip, idx) => (
                    <li key={idx}>{skip}</li>
                  ))}
                </ul>
              </div>
            )}

            {headings.length > 0 ? (
              <div className="space-y-2 font-mono text-xs">
                {headings.map((h, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3 ${
                      h.level === 1
                        ? "border-blue-400 bg-blue-50/30 dark:bg-blue-950/20 font-bold"
                        : ""
                    }`}
                    style={{
                      paddingLeft: `${Math.max(12, (h.level - 1) * 20 + 12)}px`,
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant={
                          h.level === 1 ? "info" : h.level === 2 ? "secondary" : "muted"
                        }
                        className="text-[10px] font-bold shrink-0"
                      >
                        H{h.level}
                      </Badge>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {h.text}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      Line {h.lineIndex + 1}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <HelpCircle className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p>No headings detected in this article.</p>
                <p className="text-[11px] text-slate-500">
                  Add # for H1, ## for H2, and ### for H3 subheadings.
                </p>
              </div>
            )}
          </div>
        )}

        {viewMode === "diff" && (
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Side-by-Side Revision Diff Viewer
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Compare your current draft against proposed optimization changes
                </p>
              </div>
              <Badge variant="muted">Comparator</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-500">
                  Current Draft
                </span>
                <pre className="text-xs whitespace-pre-wrap font-mono text-slate-600 dark:text-slate-400 max-h-96 overflow-y-auto">
                  {content || "No content entered yet."}
                </pre>
              </div>
              <div className="p-4 rounded-xl border border-blue-300 dark:border-blue-900 bg-blue-50/20 dark:bg-blue-950/10 space-y-2">
                <span className="text-[11px] font-bold uppercase text-blue-600 dark:text-blue-400">
                  {pendingProposal ? "Proposed Revision" : "Current Preview"}
                </span>
                <pre className="text-xs whitespace-pre-wrap font-mono text-slate-900 dark:text-slate-100 max-h-96 overflow-y-auto">
                  {pendingProposal
                    ? pendingProposal.proposedContent
                    : content || "No content entered yet."}
                </pre>
              </div>
            </div>
          </div>
        )}

        {viewMode === "preview" && (
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Safe Formatted Article Preview
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Clean typographic layout showing how readers see your article
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="muted">{headings.length} Headings</Badge>
                <Badge variant="success">XSS Safe</Badge>
              </div>
            </div>
            <article className="max-w-3xl space-y-4 text-slate-800 dark:text-slate-200">
              {title && (
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight pb-3 border-b border-slate-200 dark:border-slate-800 mb-6">
                  {title}
                </h1>
              )}
              {content ? (
                parseMarkdownBlocks(content).map((block, idx) => {
                  if (block.type === "h1") {
                    return (
                      <h1
                        key={idx}
                        className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight pb-2 border-b border-slate-200 dark:border-slate-800 mt-6 mb-3 flex items-center justify-between"
                      >
                        <span>{block.text}</span>
                        <Badge variant="info" className="text-[10px] font-bold">
                          H1
                        </Badge>
                      </h1>
                    );
                  }
                  if (block.type === "h2") {
                    return (
                      <h2
                        key={idx}
                        className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight pt-5 pb-2 border-b border-slate-100 dark:border-slate-800 mt-5 mb-2.5 flex items-center justify-between"
                      >
                        <span>{block.text}</span>
                        <Badge variant="info" className="text-[10px] font-bold">
                          H2
                        </Badge>
                      </h2>
                    );
                  }
                  if (block.type === "h3") {
                    return (
                      <h3
                        key={idx}
                        className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 pt-4 mt-4 mb-2 flex items-center justify-between"
                      >
                        <span>{block.text}</span>
                        <Badge variant="muted" className="text-[10px] font-bold">
                          H3
                        </Badge>
                      </h3>
                    );
                  }
                  if (
                    block.type === "h4" ||
                    block.type === "h5" ||
                    block.type === "h6"
                  ) {
                    return (
                      <h4
                        key={idx}
                        className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 pt-3 mt-3 mb-1"
                      >
                        {block.text}
                      </h4>
                    );
                  }
                  if (block.type === "hr") {
                    return (
                      <hr
                        key={idx}
                        className="my-6 border-slate-200 dark:border-slate-800"
                      />
                    );
                  }
                  if (block.type === "quote") {
                    return (
                      <blockquote
                        key={idx}
                        className="border-l-4 border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 p-3.5 rounded-r-xl text-sm italic text-slate-700 dark:text-slate-300 my-4"
                      >
                        {renderInlineMarkdown(block.text)}
                      </blockquote>
                    );
                  }
                  if (block.type === "list") {
                    return block.ordered ? (
                      <ol
                        key={idx}
                        className="list-decimal list-inside space-y-1.5 my-3 text-sm text-slate-800 dark:text-slate-200 pl-2"
                      >
                        {block.items?.map((item, i) => (
                          <li key={i} className="leading-relaxed">
                            {renderInlineMarkdown(item)}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <ul
                        key={idx}
                        className="list-disc list-inside space-y-1.5 my-3 text-sm text-slate-800 dark:text-slate-200 pl-2"
                      >
                        {block.items?.map((item, i) => (
                          <li key={i} className="leading-relaxed">
                            {renderInlineMarkdown(item)}
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <p
                      key={idx}
                      className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300 my-3"
                    >
                      {renderInlineMarkdown(block.text)}
                    </p>
                  );
                })
              ) : (
                <p className="text-slate-400 italic text-sm">
                  No content to preview yet. Write in the editor to see formatted output.
                </p>
              )}
            </article>
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
          className="text-blue-600 dark:text-blue-400 underline font-medium hover:text-blue-700"
        >
          {match[2]}
        </a>
      );
    } else if (match[4]) {
      parts.push(
        <strong key={match.index} className="font-bold text-slate-900 dark:text-slate-100">
          {match[4]}
        </strong>
      );
    } else if (match[5]) {
      parts.push(
        <em key={match.index} className="italic text-slate-800 dark:text-slate-200">
          {match[5]}
        </em>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
