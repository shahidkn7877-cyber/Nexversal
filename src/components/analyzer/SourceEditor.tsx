'use client';

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { markdownToVisualHtml, visualHtmlToMarkdown, sanitizeHtml } from '@/lib/html-converter';
import { Code2, FileCode, AlertCircle, Check } from 'lucide-react';

interface SourceEditorProps {
  content: string;
  onContentChange: (markdown: string) => void;
  isRtl?: boolean;
}

export function SourceEditor({
  content,
  onContentChange,
  isRtl = false,
}: SourceEditorProps) {
  const [sourceFormat, setSourceFormat] = useState<'markdown' | 'html'>('markdown');
  const [htmlDraft, setHtmlDraft] = useState(() => markdownToVisualHtml(content));
  const [syntaxError, setSyntaxError] = useState<string | null>(null);

  // When format is switched to HTML, render current markdown as clean HTML
  const handleFormatChange = (newFormat: 'markdown' | 'html') => {
    if (newFormat === 'html') {
      setHtmlDraft(markdownToVisualHtml(content));
    }
    setSourceFormat(newFormat);
    setSyntaxError(null);
  };

  const handleMarkdownChange = (val: string) => {
    setSyntaxError(null);
    onContentChange(val);
  };

  const handleHtmlChange = (val: string) => {
    setHtmlDraft(val);
    try {
      // Basic validation for script tags
      if (/<script\b/i.test(val)) {
        setSyntaxError('Script tags are not allowed for security reasons and will be stripped.');
      } else {
        setSyntaxError(null);
      }
      const safe = sanitizeHtml(val);
      const convertedMd = visualHtmlToMarkdown(safe);
      onContentChange(convertedMd);
    } catch (e) {
      setSyntaxError('Malformed HTML markup detected.');
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Source Format Switcher Bar */}
      <div className="flex items-center justify-between p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleFormatChange('markdown')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              sourceFormat === 'markdown'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileCode className="h-3 w-3" />
            <span>Markdown Source (.md)</span>
          </button>
          <button
            type="button"
            onClick={() => handleFormatChange('html')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              sourceFormat === 'html'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Code2 className="h-3 w-3" />
            <span>HTML Source (.html)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {syntaxError ? (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>{syntaxError}</span>
            </span>
          ) : (
            <Badge variant="muted" className="text-[10px] font-mono">
              Live Synchronized
            </Badge>
          )}
        </div>
      </div>

      {/* Code Textarea */}
      <div className="flex-1 p-4 bg-slate-50/40 dark:bg-slate-950/40">
        {sourceFormat === 'markdown' ? (
          <Textarea
            value={content}
            onChange={(e) => handleMarkdownChange(e.target.value)}
            placeholder="# Enter markdown source..."
            dir={isRtl ? 'rtl' : 'ltr'}
            className="w-full min-h-[500px] font-mono text-xs sm:text-sm leading-relaxed p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-blue-500 shadow-xs resize-none"
            spellCheck={false}
          />
        ) : (
          <Textarea
            value={htmlDraft}
            onChange={(e) => handleHtmlChange(e.target.value)}
            placeholder="<p>Enter HTML source...</p>"
            dir={isRtl ? 'rtl' : 'ltr'}
            className="w-full min-h-[500px] font-mono text-xs sm:text-sm leading-relaxed p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-blue-500 shadow-xs resize-none"
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}

