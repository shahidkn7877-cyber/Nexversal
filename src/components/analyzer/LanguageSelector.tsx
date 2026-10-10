'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LANGUAGE_REGISTRY,
  LanguageOption,
  getLanguageByCode,
  filterLanguages,
  isRtlLanguage,
} from '@/lib/languages';
import { Globe2, Search, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface LanguageSelectorProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

export function LanguageSelector({
  value,
  onChange,
  className = '',
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLang = useMemo(() => {
    return getLanguageByCode(value) || {
      code: value,
      name: value,
      nativeName: value,
      isRtl: isRtlLanguage(value),
    };
  }, [value]);

  const filtered = useMemo(() => {
    return filterLanguages(search);
  }, [search]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate">
          <Globe2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="truncate">
            {selectedLang.name}
            {selectedLang.nativeName && selectedLang.nativeName !== selectedLang.name && (
              <span className="text-slate-400 font-normal ml-1">
                ({selectedLang.nativeName})
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {selectedLang.isRtl && (
            <Badge variant="muted" className="text-[9px] px-1 py-0 h-4 font-bold">
              RTL
            </Badge>
          )}
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 p-2 space-y-2 animate-in fade-in zoom-in-95">
          {/* Search Filter Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search language or code..."
              className="h-8 pl-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg"
              autoFocus
            />
          </div>

          {/* Alphabetical List */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
            {filtered.length > 0 ? (
              filtered.map((lang) => {
                const isSelected =
                  lang.code.toLowerCase() === value.toLowerCase();
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      onChange(lang.code);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate">{lang.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal truncate">
                        {lang.nativeName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {lang.isRtl && (
                        <span className="text-[9px] text-slate-400 font-mono">
                          RTL
                        </span>
                      )}
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="text-center text-xs text-slate-400 py-3">
                No languages match &quot;{search}&quot;
              </p>
            )}
          </div>

          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 px-1">
            Setting language updates metadata. Use &quot;Translate Article&quot; to translate content.
          </div>
        </div>
      )}
    </div>
  );
}

