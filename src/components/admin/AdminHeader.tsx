'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, Server, Activity } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  description?: string;
}

export function AdminHeader({ title, description }: AdminHeaderProps) {
  return (
    <header className="border-b border-border bg-card/60 backdrop-blur px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sticky top-0 z-20">
      <div>
        <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <span>{title}</span>
        </h1>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2.5 self-start sm:self-auto">
        <Badge variant="outline" className="text-[10px] font-mono gap-1.5 py-1">
          <Server className="h-3 w-3 text-emerald-500" />
          <span>Server Sandbox</span>
        </Badge>
        <Badge variant="outline" className="text-[10px] font-mono gap-1.5 py-1">
          <Activity className="h-3 w-3 text-brand-500" />
          <span>System Normal</span>
        </Badge>
        <Badge variant="destructive" className="text-[10px] font-mono gap-1.5 py-1">
          <Shield className="h-3 w-3" />
          <span>Protected Area</span>
        </Badge>
      </div>
    </header>
  );
}
