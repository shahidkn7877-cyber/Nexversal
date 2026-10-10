'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  markdownToVisualHtml,
  visualHtmlToMarkdown,
  sanitizeHtml,
} from '@/lib/html-converter';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VisualEditorProps {
  content: string;
  onContentChange: (markdown: string) => void;
  isRtl?: boolean;
  placeholder?: string;
}

export function VisualEditor({
  content,
  onContentChange,
  isRtl = false,
  placeholder = 'Write your article here...',
}: VisualEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);
  const [selectedFormat, setSelectedFormat] = useState<'p' | 'h1' | 'h2' | 'h3'>('p');
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);

  // Sync external markdown changes into visual HTML only when external
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (editorRef.current) {
      const html = markdownToVisualHtml(content);
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html;
      }
    }
  }, [content]);

  // Sync internal visual DOM changes back to canonical Markdown
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalUpdate.current = true;
    const html = editorRef.current.innerHTML;
    const markdown = visualHtmlToMarkdown(html);
    onContentChange(markdown);
  }, [onContentChange]);

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  const setBlockFormat = (tag: 'p' | 'h1' | 'h2' | 'h3') => {
    setSelectedFormat(tag);
    setShowHeadingMenu(false);
    executeCommand('formatBlock', `<${tag}>`);
  };

  const handleInsertLink = () => {
    const url = window.prompt('Enter link destination URL:', 'https://');
    if (url && url.trim() && url !== 'https://') {
      executeCommand('createLink', url.trim());
    }
  };

  const handleInsertImage = () => {
    const url = window.prompt('Enter image URL:', 'https://');
    if (url && url.trim() && url !== 'https://') {
      const alt = window.prompt('Enter image descriptive alt text:', '') || '';
      if (!editorRef.current) return;
      editorRef.current.focus();
      const imgHtml = `<img src="${url.trim()}" alt="${alt.trim()}" class="max-w-full rounded-xl my-4 shadow-xs" />`;
      document.execCommand('insertHTML', false, imgHtml);
      handleInput();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');

    if (html && (/<(?:h[1-6]|p|ul|ol|li|a|strong|b|em|i|blockquote|img)/i.test(html))) {
      e.preventDefault();
      const cleanHtml = sanitizeHtml(html);
      const markdown = visualHtmlToMarkdown(cleanHtml);
      const visualHtml = markdownToVisualHtml(markdown);
      document.execCommand('insertHTML', false, visualHtml);
      handleInput();
    } else if (plain) {
      // Normal plain text paste
      e.preventDefault();
      document.execCommand('insertText', false, plain);
      handleInput();
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Visual Editor Dedicated Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
        {/* Heading Style Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowHeadingMenu(!showHeadingMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 shadow-xs"
            title="Heading style"
          >
            <span>
              {selectedFormat === 'p' && 'Paragraph'}
              {selectedFormat === 'h1' && 'Heading 1'}
              {selectedFormat === 'h2' && 'Heading 2'}
              {selectedFormat === 'h3' && 'Heading 3'}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showHeadingMenu && (
            <div className="absolute left-0 top-full mt-1 w-36 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg z-30 p-1 text-xs space-y-0.5">
              <button
                type="button"
                onClick={() => setBlockFormat('p')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-normal"
              >
                Paragraph
              </button>
              <button
                type="button"
                onClick={() => setBlockFormat('h1')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
              >
                Heading 1
              </button>
              <button
                type="button"
                onClick={() => setBlockFormat('h2')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
              >
                Heading 2
              </button>
              <button
                type="button"
                onClick={() => setBlockFormat('h3')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
              >
                Heading 3
              </button>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Inline Formatting */}
        <div className="flex items-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shadow-xs">
          <button
            type="button"
            onClick={() => executeCommand('bold')}
            className="p-1 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('italic')}
            className="p-1 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<blockquote>')}
            className="p-1 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Blockquote"
          >
            <Quote className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Lists */}
        <div className="flex items-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shadow-xs">
          <button
            type="button"
            onClick={() => executeCommand('insertUnorderedList')}
            className="p-1 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Bullet list"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertOrderedList')}
            className="p-1 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Numbered list"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Links & Images */}
        <div className="flex items-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shadow-xs">
          <button
            type="button"
            onClick={handleInsertLink}
            className="p-1 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Insert link"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleInsertImage}
            className="p-1 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Insert image with alt text"
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shadow-xs ml-auto">
          <button
            type="button"
            onClick={() => executeCommand('undo')}
            className="p-1 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Undo"
          >
            <Undo className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('redo')}
            className="p-1 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Redo"
          >
            <Redo className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Visual ContentEditable Canvas */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        dir={isRtl ? 'rtl' : 'ltr'}
        data-placeholder={placeholder}
        className={`flex-1 min-h-[500px] p-6 focus:outline-none text-base leading-relaxed text-slate-800 dark:text-slate-200 font-sans prose prose-slate dark:prose-invert max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300 dark:empty:before:text-slate-600 empty:before:pointer-events-none [&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:my-4 [&_h1]:text-slate-900 dark:[&_h1]:text-slate-100 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:my-3.5 [&_h2]:text-slate-900 dark:[&_h2]:text-slate-100 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:my-2.5 [&_h3]:text-slate-800 dark:[&_h3]:text-slate-200 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-3 [&_blockquote]:text-slate-600 dark:[&_blockquote]:text-slate-400 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline [&_a]:font-medium ${
          isRtl ? 'text-right' : 'text-left'
        }`}
      />
    </div>
  );
}

