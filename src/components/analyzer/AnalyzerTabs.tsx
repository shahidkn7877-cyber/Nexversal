'use client';

import React from 'react';
import { AnalyzerTabKey } from '@/types/app';
import {
  CheckSquare,
  Globe,
  Download,
  Sparkles,
  HelpCircle,
  Code,
  Feather,
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
      label: 'Checklist',
      icon: CheckSquare,
    },
    {
      key: 'style_review' as AnalyzerTabKey,
      label: 'Style Review',
      icon: Feather,
    },
    {
      key: 'serp' as AnalyzerTabKey,
      label: 'SERP Preview',
      icon: Globe,
    },
    {
      key: 'ai' as AnalyzerTabKey,
      label: 'AI Assist',
      icon: Sparkles,
    },
    {
      key: 'export' as AnalyzerTabKey,
      label: 'Export',
      icon: Download,
    },
    {
      key: 'faq' as AnalyzerTabKey,
      label: 'FAQ',
      icon: HelpCircle,
    },
    {
      key: 'schema' as AnalyzerTabKey,
      label: 'Schema',
      icon: Code,
    },
  ];

  return (
    <div className="flex items-center overflow-x-auto p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 gap-1 border border-slate-200/80 dark:border-slate-800 scrollbar-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              isActive
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
