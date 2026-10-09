'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Cpu,
  Search,
  Activity,
  Key,
  FileText,
  BarChart3,
  ShieldAlert,
  HeartPulse,
  Terminal,
  LogOut,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ADMIN_NAV_ITEMS = [
  { title: 'Overview', href: '/admin', icon: LayoutDashboard },
  { title: 'AI Providers', href: '/admin/ai-providers', icon: Cpu, badge: 'Vault' },
  { title: 'SEO System', href: '/admin/seo-system', icon: Search },
  { title: 'Audit System', href: '/admin/audit-system', icon: Activity },
  { title: 'Keyword System', href: '/admin/keyword-system', icon: Key },
  { title: 'Content Analyzer', href: '/admin/content-analyzer', icon: FileText },
  { title: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { title: 'Security', href: '/admin/security', icon: ShieldAlert },
  { title: 'System Health', href: '/admin/health', icon: HeartPulse },
  { title: 'Logs', href: '/admin/logs', icon: Terminal },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/admin/auth', { method: 'DELETE' });
    } catch {
      // ignore
    }
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 text-slate-200 flex flex-col justify-between shrink-0 min-h-screen">
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-600/20 text-brand-400 border border-brand-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block">
                ADMIN CONSOLE
              </span>
              <span className="text-[10px] font-mono text-slate-400 block">
                Internal Vault v2.1
              </span>
            </div>
          </div>
          <Badge variant="destructive" className="text-[9px] uppercase tracking-wider font-mono py-0 px-1.5">
            Admin
          </Badge>
        </div>

        <nav className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-2">
            System Subsystems
          </span>
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-mono font-bold bg-brand-500/30 text-brand-300 px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800 space-y-2">
        <Link
          href="/"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Public Application</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400">Exit</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-all text-left"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out Admin</span>
        </button>
      </div>
    </aside>
  );
}
