'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileSearch,
  Network,
  BarChart3,
  Settings,
  Sparkles,
  KeyRound,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const primaryItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/analyzer', label: 'Content Analyzer', icon: FileSearch },
    { href: '/crawler', label: 'Live SEO Audit', icon: Network },
    { href: '/keywords', label: 'Keyword Research', icon: KeyRound },
    { href: '/reports', label: 'Audit Reports', icon: BarChart3 },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-border bg-card/60 backdrop-blur hidden lg:flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16">
      <div className="p-4 space-y-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3">
            Core Modules
          </span>
          <nav className="mt-2 space-y-1">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="rounded-2xl border border-brand-500/20 bg-brand-50/50 dark:bg-brand-950/20 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 font-bold text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Live Analysis Engine</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Deterministic SEO auditing, Rank Math content checking, and keyword research engines are live.
          </p>
        </div>
      </div>
    </aside>
  );
}
