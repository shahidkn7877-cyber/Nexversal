'use client';

import React from 'react';
import { AnalyzerTabKey } from '@/types/app';
import {
  CheckSquare,
  Globe,
  Zap,
  HelpCircle,
  Code,
  Download,
  Sparkles,
} from 'lucide-react';

interface AnalyzerTabsProps {
  activeTab: AnalyzerTabKey;
  onTabChange: (tab: AnalyzerTabKey) => void;
  patternCount?: number;
}

export function AnalyzerTabs({
  activeTab,
  onTabChange,
  patternCount = 0,
}: AnalyzerTabsProps) {
  const tabs = [
    {
      key: 'seo' as AnalyzerTabKey,
      label: 'SEO Checklist',
      icon: CheckSquare,
    },
    {
      key: 'serp' as AnalyzerTabKey,
      label: 'SERP Simulator',
      icon: Globe,
    },
    {
      key: 'ai' as AnalyzerTabKey,
      label: 'AI Improvements',
      icon: Sparkles,
    },
    {
      key: 'patterns' as AnalyzerTabKey,
      label: 'Pattern Cleaner',
      icon: Zap,
      badge: patternCount > 0 ? patternCount : undefined,
    },
    {
      key: 'faq' as AnalyzerTabKey,
      label: 'FAQ Generator',
      icon: HelpCircle,
    },
    {
      key: 'schema' as AnalyzerTabKey,
      label: 'JSON-LD Schema',
      icon: Code,
    },
    {
      key: 'export' as AnalyzerTabKey,
      label: 'Export',
      icon: Download,
    },
  ];

  return (
    <div className="flex items-center overflow-x-auto p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 gap-1 border border-border">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              isActive
                ? 'bg-white dark:bg-slate-900 text-foreground shadow-sm font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="ml-1 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 px-1.5 py-0.2 text-[10px] font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
