'use client';

import React from 'react';
import { parseMarkdownBlocks } from '@/lib/markdown-parser';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Globe2 } from 'lucide-react';

interface PublishedPreviewProps {
  title: string;
  content: string;
  metaDescription?: string;
  slug?: string;
  language?: string;
  isRtl?: boolean;
  onBackToEdit: () => void;
}

export function PublishedPreview({
  title,
  content,
  metaDescription,
  slug,
  language,
  isRtl = false,
  onBackToEdit,
}: PublishedPreviewProps) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-slate-900">
      {/* Top Preview Status Strip */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onBackToEdit}
            className="h-8 text-xs font-semibold gap-1.5 text-blue-600 dark:text-blue-400 border-slate-200 dark:border-slate-800 hover:bg-blue-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Editor</span>
          </Button>
          <Badge variant="muted" className="text-[10px] uppercase font-bold tracking-wider">
            Published Article Preview
          </Badge>
          {isRtl && (
            <Badge variant="info" className="text-[10px]">
              RTL Active
            </Badge>
          )}
        </div>

        {slug && (
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline-flex items-center gap-1">
            <Globe2 className="h-3 w-3" />
            <span>https://nexversal.bond/{slug}</span>
          </span>
        )}
      </div>

      {/* Published Blog Article Canvas */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-12 lg:p-16">
        <article
          dir={isRtl ? 'rtl' : 'ltr'}
          className={`max-w-3xl mx-auto space-y-6 ${
            isRtl ? 'text-right' : 'text-left'
          }`}
        >
          {/* Article Main Headline */}
          {title ? (
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
              {title}
            </h1>
          ) : (
            <h1 className="text-3xl font-extrabold text-slate-300 dark:text-slate-700 italic">
              Untitled Article
            </h1>
          )}

          {/* Optional Subtitle / Meta Description */}
          {metaDescription && (
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-normal border-b border-slate-100 dark:border-slate-800 pb-6">
              {metaDescription}
            </p>
          )}

          {/* Article Body Elements */}
          <div className="space-y-5 text-base sm:text-lg leading-relaxed text-slate-800 dark:text-slate-200 font-sans pt-2">
            {blocks.length > 0 ? (
              blocks.map((block, idx) => {
                if (block.type === 'h1') {
                  return (
                    <h1
                      key={idx}
                      className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 pt-6 pb-2"
                    >
                      {block.text}
                    </h1>
                  );
                }
                if (block.type === 'h2') {
                  return (
                    <h2
                      key={idx}
                      className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 pt-5 pb-1.5"
                    >
                      {block.text}
                    </h2>
                  );
                }
                if (block.type === 'h3') {
                  return (
                    <h3
                      key={idx}
                      className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 pt-4"
                    >
                      {block.text}
                    </h3>
                  );
                }
                if (block.type === 'h4' || block.type === 'h5' || block.type === 'h6') {
                  return (
                    <h4 key={idx} className="text-base font-semibold text-slate-800 dark:text-slate-200 pt-2">
                      {block.text}
                    </h4>
                  );
                }
                if (block.type === 'quote') {
                  return (
                    <blockquote
                      key={idx}
                      className="border-l-4 border-blue-600 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-r-xl italic text-slate-700 dark:text-slate-300 my-4"
                    >
                      {renderInlineFormatting(block.text)}
                    </blockquote>
                  );
                }
                if (block.type === 'list') {
                  return block.ordered ? (
                    <ol key={idx} className="list-decimal list-inside space-y-2 pl-2 my-3">
                      {block.items?.map((item, i) => (
                        <li key={i}>{renderInlineFormatting(item)}</li>
                      ))}
                    </ol>
                  ) : (
                    <ul key={idx} className="list-disc list-inside space-y-2 pl-2 my-3">
                      {block.items?.map((item, i) => (
                        <li key={i}>{renderInlineFormatting(item)}</li>
                      ))}
                    </ul>
                  );
                }
                if (block.type === 'hr') {
                  return <hr key={idx} className="my-8 border-slate-200 dark:border-slate-800" />;
                }
                return (
                  <p key={idx} className="my-3 text-slate-800 dark:text-slate-200">
                    {renderInlineFormatting(block.text)}
                  </p>
                );
              })
            ) : (
              <p className="text-slate-400 italic">No article content to preview yet.</p>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

function renderInlineFormatting(text: string) {
  const parts: React.ReactNode[] = [];
  const regex = /(\[([^\]]+)\]\(([^)]+)\)|!\[([^\]]*)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    if (match[4] !== undefined && match[5]) {
      // Image
      parts.push(
        <img
          key={match.index}
          src={match[5]}
          alt={match[4]}
          className="max-w-full rounded-xl my-4 shadow-sm"
        />
      );
    } else if (match[2] && match[3]) {
      // Link
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
    } else if (match[6]) {
      // Bold
      parts.push(
        <strong key={match.index} className="font-bold text-slate-900 dark:text-slate-100">
          {match[6]}
        </strong>
      );
    } else if (match[7]) {
      // Italic
      parts.push(
        <em key={match.index} className="italic text-slate-800 dark:text-slate-200">
          {match[7]}
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

