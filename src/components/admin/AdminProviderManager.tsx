'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Cpu,
  ExternalLink,
  Lock,
  Play,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Shield,
} from 'lucide-react';

export interface AdminProviderItem {
  id: string;
  name: string;
  websiteUrl: string;
  documentationUrl?: string;
  integrationType: string;
  capabilities: string[];
  status: 'NOT_CONFIGURED' | 'AVAILABLE' | 'DISABLED' | 'ERROR';
  envKeyRequired: string;
  isConfigured: boolean;
  serverEnvDetected: boolean;
}

interface AdminProviderManagerProps {
  initialProviders: AdminProviderItem[];
}

export function AdminProviderManager({ initialProviders }: AdminProviderManagerProps) {
  const [providers] = useState<AdminProviderItem[]>(initialProviders);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<
      string,
      {
        success: boolean;
        message: string;
        recommendation?: string;
        timestamp: string;
      }
    >
  >({});
  const [disabledMap, setDisabledMap] = useState<Record<string, boolean>>({});

  const handleTestConnection = async (providerId: string) => {
    setTestingId(providerId);

    try {
      const res = await fetch(`/api/v1/admin/ai/providers/${providerId}/test`, {
        method: 'POST',
      });
      const json = await res.json();

      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          success: json.success,
          message:
            json.data?.message ||
            (json.success ? 'Connection verified.' : 'Connection test failed.'),
          recommendation: json.data?.recommendation,
          timestamp: new Date().toLocaleTimeString(),
        },
      }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          success: false,
          message: 'Network error communicating with admin test endpoint.',
          timestamp: new Date().toLocaleTimeString(),
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleEnable = (providerId: string) => {
    setDisabledMap((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl border border-brand-500/30 bg-brand-500/10 text-xs flex items-start gap-3">
        <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-foreground block">
            Zero-Leak Administrative Vault
          </span>
          <p className="text-muted-foreground leading-relaxed">
            API keys and vendor credentials are read directly from server environment variables (<code className="font-mono text-foreground font-semibold">process.env</code>) and are never exposed in browser bundles, HTTP responses, or public client views.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {providers.map((p) => {
          const isDisabled = Boolean(disabledMap[p.id]);
          const effectiveStatus = isDisabled ? 'DISABLED' : p.status;
          const isTesting = testingId === p.id;
          const testResult = testResults[p.id];

          return (
            <Card key={p.id} className="border-border bg-card shadow-sm flex flex-col justify-between">
              <div>
                <CardHeader className="p-5 border-b border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                        <CardTitle className="text-sm font-bold text-foreground">
                          {p.name}
                        </CardTitle>
                      </div>
                      <a
                        href={p.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>Official Vendor Portal</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <Badge
                        variant={
                          effectiveStatus === 'AVAILABLE'
                            ? 'success'
                            : effectiveStatus === 'DISABLED'
                            ? 'secondary'
                            : 'warning'
                        }
                        className="text-[10px] font-mono font-bold uppercase tracking-wider"
                      >
                        {effectiveStatus}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleToggleEnable(p.id)}
                        className="text-[10px] text-muted-foreground hover:text-foreground font-medium underline"
                      >
                        {isDisabled ? 'Enable Adapter' : 'Disable Adapter'}
                      </button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border/80">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Integration Type
                      </span>
                      <span className="font-semibold text-foreground text-[11px]">
                        {p.integrationType === 'official_api'
                          ? 'Official SDK / REST'
                          : p.integrationType}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Server Detection
                      </span>
                      <span
                        className={`font-semibold text-[11px] ${
                          p.serverEnvDetected
                            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {p.serverEnvDetected ? 'Key Present in Environment' : 'Key Not Detected'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border space-y-1.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-[10px] uppercase tracking-wider">
                      <Lock className="h-3.5 w-3.5" />
                      <span>Required Server Variable</span>
                    </div>
                    <code className="text-xs font-mono text-foreground font-bold block bg-background px-2.5 py-1.5 rounded-lg border border-border">
                      {p.envKeyRequired}
                    </code>
                    <p className="text-[10px] text-muted-foreground">
                      Set this secret in <code className="font-mono">.env.local</code> on the production server. The application never stores keys in client code or databases.
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Supported Capabilities
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {p.capabilities.map((cap) => (
                        <Badge
                          key={cap}
                          variant="secondary"
                          className="text-[10px] py-0 px-2 font-mono font-medium"
                        >
                          {cap.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {testResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        testResult.success
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-[11px]">
                        <span className="flex items-center gap-1.5">
                          {testResult.success ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          )}
                          <span>
                            {testResult.success ? 'Diagnostic Passed' : 'Configuration Required'}
                          </span>
                        </span>
                        <span className="text-[9px] font-mono opacity-70">
                          {testResult.timestamp}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {testResult.message}
                      </p>
                      {testResult.recommendation && (
                        <p className="text-[10px] font-mono opacity-85">
                          Tip: {testResult.recommendation}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </div>

              <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-between gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isTesting}
                  onClick={() => handleTestConnection(p.id)}
                  className="w-full text-xs font-bold gap-2 h-8"
                >
                  {isTesting ? (
                    <>
                      <RotateCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Testing Connection...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>Test Provider Connection</span>
                    </>
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
