'use client';

import React, { useState } from 'react';
import { LanguageSelector } from './LanguageSelector';
import { Button } from '@/components/ui/button';
import { getLanguageByCode } from '@/lib/languages';
import { Languages, X, Check, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranslate: (sourceLang: string, targetLang: string) => Promise<void>;
  currentLanguage: string;
  isTranslating: boolean;
  error?: string | null;
}

export function TranslationModal({
  isOpen,
  onClose,
  onTranslate,
  currentLanguage,
  isTranslating,
  error = null,
}: TranslationModalProps) {
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState(
    currentLanguage === 'es' ? 'en' : 'es'
  );

  if (!isOpen) return null;

  const targetLangMeta = getLanguageByCode(targetLang);

  const handleStartTranslate = async () => {
    await onTranslate(sourceLang, targetLang);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Translate Article
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isTranslating}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Translation details */}
        <p className="text-xs text-slate-500 leading-relaxed">
          Translates full article content preserving all Markdown headings, links, formatting, and technical terms using the active AI provider.
        </p>

        {/* Language Selection */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Target Language:
            </label>
            <LanguageSelector
              value={targetLang}
              onChange={(code) => setTargetLang(code)}
            />
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            disabled={isTranslating}
            className="text-xs text-slate-500"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={handleStartTranslate}
            disabled={isTranslating}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 shadow-xs"
          >
            {isTranslating ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Translating Content...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Translate into {targetLangMeta?.name || targetLang}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

