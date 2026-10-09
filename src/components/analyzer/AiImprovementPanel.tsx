'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImprovementAction } from '@/providers/ai/types';
import {
  Sparkles,
  RotateCw,
  AlertCircle,
  Settings,
  ArrowRight,
  CheckCircle2,
  FileText,
  Heading,
  Eye,
  Target,
} from 'lucide-react';

interface AiImprovementPanelProps {
  content: string;
  focusKeyword: string;
  title: string;
  metaDescription: string;
  onApplyTitle?: (newTitle: string) => void;
  onApplyMetaDesc?: (newMeta: string) => void;
}

export function AiImprovementPanel({
  content,
  focusKeyword,
  title,
  metaDescription,
  onApplyTitle,
  onApplyMetaDesc,
}: AiImprovementPanelProps) {
  const [action, setAction] = useState<ImprovementAction>('improve_title');
  const [tone, setTone] = useState<'conversational' | 'professional' | 'authoritative' | 'engaging' | 'neutral'>('conversational');
  const [instructions, setInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responseState, setResponseState] = useState<{
    configured: boolean;
    message?: string;
    result?: { original: string; improved: string; explanation: string };
  } | null>(null);

  const handleRunImprovement = async () => {
    setIsLoading(true);
    setResponseState(null);

    try {
      const res = await fetch('/api/v1/content/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          action,
          focusKeyword,
          desiredTone: tone,
          instructions: instructions.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setResponseState({
          configured: false,
          message:
            json.error?.message ||
            'No AI provider is configured. Connect an official AI provider to use AI-powered improvements.',
        });
      } else {
        setResponseState({
          configured: true,
          result: json.data?.result,
        });
      }
    } catch (err: unknown) {
      setResponseState({
        configured: false,
        message: err instanceof Error ? err.message : 'Network error reaching AI service.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const actions = [
    { key: 'improve_title' as ImprovementAction, label: 'Improve Title', icon: Heading },
    { key: 'improve_intro' as ImprovementAction, label: 'Improve Introduction', icon: FileText },
    { key: 'improve_meta_description' as ImprovementAction, label: 'Improve Meta Description', icon: Eye },
    { key: 'improve_readability' as ImprovementAction, label: 'Improve Readability', icon: Sparkles },
    { key: 'suggest_keyword_placement' as ImprovementAction, label: 'Suggest Keyword Placement', icon: Target },
  ];

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              AI Content Improvements
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4 text-xs">
        <p className="text-muted-foreground leading-relaxed">
          Select a content improvement operation. Powered by the provider-independent AI service layer.
        </p>

        {/* Action Selector */}
        <div className="space-y-1.5">
          <label className="font-bold text-foreground">Improvement Target</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {actions.map((act) => {
              const Icon = act.icon;
              const isSelected = action === act.key;
              return (
                <button
                  key={act.key}
                  type="button"
                  onClick={() => setAction(act.key)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-foreground font-bold shadow-sm'
                      : 'border-border bg-slate-50/50 dark:bg-slate-900/30 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-brand-600 dark:text-brand-400' : ''}`} />
                  <span className="text-[11px] truncate">{act.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tone Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1.5">
            <label className="font-bold text-foreground">Desired Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as any)}
              className="w-full h-9 rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground"
            >
              <option value="conversational">Conversational (Mobile friendly)</option>
              <option value="professional">Professional</option>
              <option value="authoritative">Authoritative</option>
              <option value="engaging">Engaging & Punchy</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-foreground">Custom Instructions (Optional)</label>
            <Input
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Include power words & year 2026"
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            onClick={handleRunImprovement}
            disabled={isLoading}
            className="w-full text-xs font-bold gap-2 h-9"
          >
            {isLoading ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" />
                <span>Checking AI Provider...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Run AI Content Improvement</span>
              </>
            )}
          </Button>
        </div>

        {/* Provider-Required State (When not configured) */}
        {responseState && !responseState.configured && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2.5 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <span className="font-bold text-sm">No AI Provider Configured</span>
                <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                  {responseState.message ||
                    'No AI provider is configured. Connect an official AI provider to use AI-powered improvements.'}
                </p>
              </div>
            </div>

            <div className="pt-1">
              <Link href="/settings">
                <Button size="sm" variant="outline" className="w-full text-xs font-bold gap-1.5 bg-white dark:bg-slate-900">
                  <Settings className="h-3.5 w-3.5" />
                  <span>Configure AI Providers in Settings</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Success Output (When provider is available in future) */}
        {responseState && responseState.configured && responseState.result && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Improvement Ready</span>
            </div>
            <p className="text-foreground font-mono bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-border">
              {responseState.result.improved}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
