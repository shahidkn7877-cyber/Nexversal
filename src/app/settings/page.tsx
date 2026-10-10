'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  Check,
  Save,
  User,
  LogIn,
  Loader2,
} from 'lucide-react';

interface UserProfile {
  email: string;
  name: string | null;
}

export default function SettingsPage() {
  const [dialect, setDialect] = useState<'en-US' | 'en-GB'>('en-US');
  const [targetWords, setTargetWords] = useState('1,500');
  const [defaultDevice, setDefaultDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [autoSlug, setAutoSlug] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'account'>('general');

  useEffect(() => {
    // 1. Fetch user profile
    fetch('/api/v1/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.authenticated && json.data?.user) {
          setUser({
            email: json.data.user.email,
            name: json.data.user.name,
          });
        }
      })
      .catch(() => {});

    // 2. Fetch persistent user settings
    fetch('/api/v1/user/settings')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.settings) {
          const s = json.data.settings;
          if (s.editorDialect) setDialect(s.editorDialect);
          if (s.targetWordCount) setTargetWords(s.targetWordCount);
          if (s.defaultDevice) setDefaultDevice(s.defaultDevice);
          if (s.autoSlug !== undefined) setAutoSlug(s.autoSlug);
        }
      })
      .catch(() => {
        const localDialect = localStorage.getItem('seo_dialect');
        if (localDialect === 'en-GB' || localDialect === 'en-US') setDialect(localDialect);
        const localWords = localStorage.getItem('seo_target_words');
        if (localWords) setTargetWords(localWords);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      localStorage.setItem('seo_dialect', dialect);
      localStorage.setItem('seo_target_words', targetWords);

      await fetch('/api/v1/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editorDialect: dialect,
          targetWordCount: targetWords,
          defaultDevice,
          autoSlug,
        }),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // offline fallback
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell showSidebar={true}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Manage your editor preferences and personal account settings.
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-bold gap-1.5 h-9"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saved ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Preferences Saved!</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Preferences</span>
              </>
            )}
          </Button>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Button
            size="sm"
            variant={activeTab === 'general' ? 'default' : 'outline'}
            onClick={() => setActiveTab('general')}
            className="text-xs font-bold gap-1.5 h-8"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Localization & Defaults</span>
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'account' ? 'default' : 'outline'}
            onClick={() => setActiveTab('account')}
            className="text-xs font-bold gap-1.5 h-8"
          >
            <User className="h-3.5 w-3.5" />
            <span>Account Profile</span>
          </Button>
        </div>

        {/* General / Localization Section */}
        {activeTab === 'general' && (
          <Card className="border-border bg-card">
            <CardHeader className="p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                <CardTitle as="h2" className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Localization & Editor Defaults
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Configure primary dialect and default article word count targets.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Default Editor Dialect
                  </label>
                  <select
                    value={dialect}
                    onChange={(e) => setDialect(e.target.value as any)}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground"
                  >
                    <option value="en-US">🇺🇸 USA English (American)</option>
                    <option value="en-GB">🇬🇧 UK English (British)</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    Standardized on US English for on-page audits
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Default Word Count Target
                  </label>
                  <Input
                    value={targetWords}
                    onChange={(e) => setTargetWords(e.target.value)}
                    className="text-xs font-medium"
                    placeholder="1,500"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Recommended minimum depth for authoritative search rankings
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Default Preview Device
                  </label>
                  <select
                    value={defaultDevice}
                    onChange={(e) => setDefaultDevice(e.target.value as any)}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground"
                  >
                    <option value="desktop">🖥️ Desktop Browser (Google SERP)</option>
                    <option value="mobile">📱 Mobile Smartphone View</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    Default viewport when rendering the SERP snippet preview
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Automatic URL Slug Generation
                  </label>
                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="autoSlug"
                      checked={autoSlug}
                      onChange={(e) => setAutoSlug(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
                    />
                    <label htmlFor="autoSlug" className="text-xs text-foreground cursor-pointer select-none">
                      Generate SEO-friendly URL slugs automatically from H1 headline
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account & Profile Section */}
        {activeTab === 'account' && (
          <Card className="border-border bg-card">
            <CardHeader className="p-5 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  <CardTitle as="h2" className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Account Profile
                  </CardTitle>
                </div>
                <Badge variant={user ? 'success' : 'muted'}>
                  {user ? 'Authenticated' : 'Guest Session'}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Your personal account details and access preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {user ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground font-medium block text-[11px] uppercase tracking-wider">
                          Email Address
                        </span>
                        <span className="font-bold text-foreground text-sm">{user.email}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium block text-[11px] uppercase tracking-wider">
                          Display Name
                        </span>
                        <span className="font-semibold text-foreground">
                          {user.name || 'Not provided'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium block text-[11px] uppercase tracking-wider">
                          Account Status
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center space-y-4">
                  <div className="p-3 bg-muted rounded-full w-12 h-12 flex items-center justify-center mx-auto text-muted-foreground">
                    <User className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground">Operating as Guest Session</h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                      You are currently using the platform without an authenticated account. Sign in or register to link your audits, activity timeline, and customized settings.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Link href="/login">
                      <Button size="sm" className="text-xs font-bold gap-1.5 h-8">
                        <LogIn className="h-3.5 w-3.5" />
                        <span>Sign In</span>
                      </Button>
                    </Link>
                    <Link href="/register">
                      <Button size="sm" variant="outline" className="text-xs font-bold h-8">
                        <span>Create Account</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}