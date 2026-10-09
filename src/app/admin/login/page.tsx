'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Lock, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) {
      setError('Please provide the administrator key.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey: adminKey.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Invalid administrator security key.');
      } else {
        router.push('/admin');
        router.refresh();
      }
    } catch {
      setError('Failed to reach authentication service. Please verify your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-brand-600/20 text-brand-400 border border-brand-500/30">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Admin Security Gateway
          </h1>
          <p className="text-xs text-slate-400">
            Authorized personnel only. Protected server environment.
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur">
          <CardHeader className="p-6 border-b border-slate-800">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-brand-400" />
              <span>Administrative Authorization</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Enter your master administrative key to unlock provider vault management.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Master Security Key
                </label>
                <div className="relative">
                  <Input
                    type="password"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="Enter admin authorization key"
                    className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 h-10 text-xs pr-10 font-mono"
                    autoFocus
                  />
                  <Lock className="absolute right-3 top-3 h-4 w-4 text-slate-500" />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-start gap-2 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white"
              >
                {isLoading ? 'Verifying Credentials...' : 'Authenticate & Unlock Vault'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Public Application</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
