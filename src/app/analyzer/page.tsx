'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ContentStats } from '@/components/analyzer/ContentStats';
import { KeywordInput } from '@/components/analyzer/KeywordInput';
import { ContentEditor } from '@/components/analyzer/ContentEditor';
import { AnalyzerTabs } from '@/components/analyzer/AnalyzerTabs';
import { SeoChecklist } from '@/components/analyzer/SeoChecklist';
import { HeadingStructurePanel } from '@/components/analyzer/HeadingStructurePanel';
import { StyleReviewPanel } from '@/components/analyzer/StyleReviewPanel';
import { TranslationModal } from '@/components/analyzer/TranslationModal';
import { SerpPreview } from '@/components/analyzer/SerpPreview';
import { AiPatternPanel } from '@/components/humanizer/AiPatternPanel';
import { AiImprovementPanel } from '@/components/analyzer/AiImprovementPanel';
import { FaqGenerator } from '@/components/faq/FaqGenerator';
import { SchemaPreview } from '@/components/schema/SchemaPreview';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEditor } from '@/hooks/useEditor';
import {
  Download,
  Copy,
  Check,
  Wand2,
  Zap,
  Heading,
  Languages,
  Undo2,
  Sparkles,
  RefreshCw,
  Feather,
} from 'lucide-react';

export default function AnalyzerPage() {
  const {
    doc,
    updateField,
    metrics,
    analysisResult,
    viewMode,
    setViewMode,
    activeTab,
    setActiveTab,
    clearContent,
    pendingProposal,
    hasUndo,
    triggerOneClickFix,
    triggerAutoHeadings,
    triggerHumanizeTone,
    triggerAiHumanizeTone,
    isHumanizing,
    humanizeError,
    triggerTranslation,
    isTranslating,
    translationError,
    triggerStyleReview,
    isStyleReviewing,
    styleReviewResult,
    triggerTargetedRewrite,
    acceptStyleFinding,
    rejectStyleFinding,
    rewritingFindingId,
    triggerDialectAdapt,
    acceptProposal,
    rejectProposal,
    undoLastAction,
  } = useEditor();

  const [copied, setCopied] = useState(false);
  const [showDialectMenu, setShowDialectMenu] = useState(false);
  const [showTranslateModal, setShowTranslateModal] = useState(false);

  const handleSyncSlug = () => {
    if (doc.focusKeyword.trim()) {
      const cleanSlug = doc.focusKeyword
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      updateField('slug', cleanSlug);
    }
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(doc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportHtml = () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="${doc.language || 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.title || doc.metaTitle || 'Optimized Article'}</title>
  <meta name="description" content="${doc.metaDescription || ''}">
  <link rel="canonical" href="https://nexversal.bond/${doc.slug || ''}">
</head>
<body>
  <h1>${doc.title || 'Article Headline'}</h1>
  <main>
    ${doc.content
      .split('\n\n')
      .map((p) => `<p>${p.trim()}</p>`)
      .join('\n    ')}
  </main>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.slug || 'article'}-seo-optimized.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Content Score explanation based on score and diagnostics
  const scoreExplanation = React.useMemo(() => {
    const s = analysisResult.score;
    if (s >= 80) {
      return 'Strong — Your content is well-structured and optimized for search engines with solid keyword placement.';
    }
    if (s >= 50) {
      return 'Needs Improvement — Good foundation, but keyword frequency, headings, or meta descriptions need refinement.';
    }
    return 'Weak — Optimize your article by adding structured headings (# H1, ## H2), targeting your focus keyword, and adding meta tags.';
  }, [analysisResult.score]);

  return (
    <AppShell showSidebar={false}>
      <div className="space-y-5 max-w-[1600px] mx-auto w-full">
        {/* Simplified Page Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Content Analyzer &amp; Publisher
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Write, refine, and optimize your content for search.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Small Analysis Status Indicator */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              {!doc.content.trim() ? (
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
                  Ready for Writing
                </span>
              ) : !doc.focusKeyword.trim() ? (
                <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Keyword Needed
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Live Synchronized
                </span>
              )}
            </div>

            {/* Quick Refresh Status Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {}}
              className="text-xs h-8 gap-1.5 font-medium text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Real-time analysis active"
            >
              <RefreshCw className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <span>Real-Time Sync</span>
            </Button>
          </div>
        </header>

        {/* Two-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Article Editor Column (approx 67% on desktop) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Top Inputs: Focus Keyword & Collapsible Search Preview / Metadata */}
            <KeywordInput
              focusKeyword={doc.focusKeyword}
              onFocusKeywordChange={(val) => updateField('focusKeyword', val)}
              secondaryKeywords={doc.secondaryKeywords}
              onSecondaryKeywordsChange={(val) =>
                updateField('secondaryKeywords', val)
              }
              slug={doc.slug}
              onSlugChange={(val) => updateField('slug', val)}
              keywordMatchCount={metrics.keywordCount}
              language={doc.language}
              onLanguageChange={(val) => updateField('language', val)}
              onSyncSlug={handleSyncSlug}
              metaTitle={doc.metaTitle}
              onMetaTitleChange={(val) => updateField('metaTitle', val)}
              metaDescription={doc.metaDescription}
              onMetaDescriptionChange={(val) =>
                updateField('metaDescription', val)
              }
            />

            {/* Compact Live Writing Statistics Row */}
            <ContentStats
              metrics={metrics}
              score={analysisResult.score}
              scoreCategory={analysisResult.scoreCategory}
              longParagraphsCount={analysisResult.longParagraphs.length}
            />

            {/* Clean Article Writing Canvas with 3 Modes: Visual, Source, Preview */}
            <ContentEditor
              content={doc.content}
              onContentChange={(val) => updateField('content', val)}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onClear={clearContent}
              title={doc.title}
              onTitleChange={(val) => updateField('title', val)}
              onOneClickFix={triggerOneClickFix}
              onAutoHeadings={triggerAutoHeadings}
              onHumanizeTone={triggerAiHumanizeTone}
              onDialectAdapt={triggerDialectAdapt}
              onUndo={undoLastAction}
              hasUndo={hasUndo}
              pendingProposal={pendingProposal}
              onAcceptProposal={acceptProposal}
              onRejectProposal={rejectProposal}
              language={doc.language}
              metaDescription={doc.metaDescription}
              slug={doc.slug}
            />
          </div>

          {/* Right Sidebar: SEO Insights & Automated Actions (approx 33% on desktop) */}
          <div className="lg:col-span-4 space-y-4">
            {/* 1. Content Score Card */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Content SEO Score
                </span>
                <Badge
                  variant={
                    analysisResult.score >= 80
                      ? 'success'
                      : analysisResult.score >= 50
                      ? 'warning'
                      : 'danger'
                  }
                  className="text-xs font-bold"
                >
                  {analysisResult.scoreCategory || 'Pending'}
                </Badge>
              </div>

              <div className="flex items-baseline gap-2">
                <span
                  className={`text-4xl font-extrabold tracking-tight ${
                    analysisResult.score >= 80
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : analysisResult.score >= 50
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {analysisResult.score}
                </span>
                <span className="text-sm font-semibold text-slate-400">/ 100</span>
              </div>

              {/* Short Score Explanation */}
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {scoreExplanation}
              </p>

              {/* Issue Summary Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                <Badge variant="success" className="text-[10px] font-bold">
                  {analysisResult.issuesSummary.passed} Passed
                </Badge>
                {analysisResult.issuesSummary.warnings > 0 && (
                  <Badge variant="warning" className="text-[10px] font-bold">
                    {analysisResult.issuesSummary.warnings} Warnings
                  </Badge>
                )}
                {analysisResult.issuesSummary.failed > 0 && (
                  <Badge variant="danger" className="text-[10px] font-bold">
                    {analysisResult.issuesSummary.failed} Action Needed
                  </Badge>
                )}
              </div>
            </div>

            {/* 2. Quick Actions Panel */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Quick Actions
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Automated optimization workflows
                  </p>
                </div>
                {hasUndo && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={undoLastAction}
                    className="h-6 text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 p-1 gap-1"
                    title="Undo last change"
                  >
                    <Undo2 className="h-3 w-3" />
                    <span>Undo</span>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* 1-Click SEO Fix */}
                <Button
                  size="sm"
                  variant="default"
                  onClick={triggerOneClickFix}
                  disabled={!doc.content.trim()}
                  className="text-xs font-bold gap-1.5 h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                  title="Automated on-page SEO fix proposal"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  <span>1-Click Fix</span>
                </Button>

                {/* Real AI Humanize Tone */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={triggerAiHumanizeTone}
                  disabled={!doc.content.trim() || isHumanizing}
                  className="text-xs font-semibold gap-1.5 h-9 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  title="Humanize tone with active AI provider"
                >
                  <Zap className={`h-3.5 w-3.5 text-amber-500 ${isHumanizing ? 'animate-spin' : ''}`} />
                  <span>{isHumanizing ? 'Humanizing...' : 'Humanize Tone'}</span>
                </Button>

                {/* Translate Article Action */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTranslateModal(true)}
                  disabled={!doc.content.trim()}
                  className="text-xs font-semibold gap-1.5 h-9 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  title="Translate article into another language"
                >
                  <Languages className="h-3.5 w-3.5 text-blue-600" />
                  <span>Translate</span>
                </Button>

                {/* Review Writing Style */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={triggerStyleReview}
                  disabled={!doc.content.trim() || isStyleReviewing}
                  className="text-xs font-semibold gap-1.5 h-9 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  title="Analyze passages for formulaic patterns and clichés"
                >
                  <Feather className={`h-3.5 w-3.5 text-purple-600 ${isStyleReviewing ? 'animate-spin' : ''}`} />
                  <span>{isStyleReviewing ? 'Scanning...' : 'Style Review'}</span>
                </Button>

                {/* Auto Headings */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={triggerAutoHeadings}
                  disabled={!doc.content.trim()}
                  className="text-xs font-semibold gap-1.5 h-9 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  title="Structure article into H1 and H2 subheadings"
                >
                  <Heading className="h-3.5 w-3.5 text-blue-600" />
                  <span>Auto Headings</span>
                </Button>

                {/* US <-> UK Dialect */}
                <div className="relative">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDialectMenu(!showDialectMenu)}
                    disabled={!doc.content.trim()}
                    className="w-full text-xs font-semibold gap-1.5 h-9 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                    title="Adapt spelling between US and UK English"
                  >
                    <Languages className="h-3.5 w-3.5 text-emerald-600" />
                    <span>US ↔ UK</span>
                  </Button>

                  {showDialectMenu && (
                    <div className="absolute right-0 bottom-full mb-1 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg z-30 py-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          triggerDialectAdapt('UK');
                          setShowDialectMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium flex items-center justify-between"
                      >
                        <span>🇬🇧 Convert to UK English</span>
                        <Badge variant="muted" className="text-[10px]">
                          British
                        </Badge>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerDialectAdapt('US');
                          setShowDialectMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium flex items-center justify-between"
                      >
                        <span>🇺🇸 Convert to US English</span>
                        <Badge variant="muted" className="text-[10px]">
                          American
                        </Badge>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Message for AI Provider Error if any */}
              {humanizeError && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
                  {humanizeError}
                </div>
              )}
            </div>

            {/* 3. Heading Structure Inspector */}
            <HeadingStructurePanel content={doc.content} />

            {/* 4. Secondary Tools Tabs & Panels */}
            <div className="space-y-3">
              <AnalyzerTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                patternCount={0}
              />

              {activeTab === 'seo' && (
                <SeoChecklist
                  rules={analysisResult.rules}
                  analysisResult={analysisResult}
                  isAnalyzed={true}
                />
              )}

              {activeTab === 'style_review' && (
                <StyleReviewPanel
                  findings={styleReviewResult?.findings || []}
                  summary={
                    styleReviewResult?.summary ||
                    'Click "Scan Style" above to analyze your article for formulaic passages and rhythm.'
                  }
                  isLoading={isStyleReviewing}
                  onRefreshReview={triggerStyleReview}
                  onRequestTargetedRewrite={triggerTargetedRewrite}
                  onAcceptRewrite={acceptStyleFinding}
                  onRejectRewrite={rejectStyleFinding}
                  rewritingId={rewritingFindingId}
                />
              )}

              {activeTab === 'serp' && (
                <SerpPreview
                  metaTitle={doc.metaTitle}
                  onMetaTitleChange={(val) => updateField('metaTitle', val)}
                  metaDescription={doc.metaDescription}
                  onMetaDescriptionChange={(val) =>
                    updateField('metaDescription', val)
                  }
                  slug={doc.slug}
                  baseUrl="https://nexversal.bond"
                />
              )}

              {activeTab === 'ai' && (
                <AiImprovementPanel
                  content={doc.content}
                  focusKeyword={doc.focusKeyword}
                  title={doc.title}
                  metaDescription={doc.metaDescription}
                  onApplyTitle={(newTitle) => updateField('title', newTitle)}
                  onApplyMetaDesc={(newMeta) =>
                    updateField('metaDescription', newMeta)
                  }
                />
              )}

              {activeTab === 'patterns' && <AiPatternPanel patterns={[]} />}

              {activeTab === 'faq' && <FaqGenerator topic={doc.focusKeyword} />}

              {activeTab === 'schema' && (
                <SchemaPreview
                  title={doc.title}
                  url={`https://nexversal.bond/${doc.slug}`}
                />
              )}

              {activeTab === 'export' && (
                <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                  <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Export &amp; Publishing
                      </CardTitle>
                      <Badge variant="success">Score: {analysisResult.score}/100</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Export your optimized article directly to clean Markdown or HTML for WordPress, Ghost, Substack, Webflow, or custom CMS:
                    </p>
                    <div className="flex flex-col gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyMarkdown}
                        className="text-xs justify-start gap-2 h-9"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        <span>{copied ? 'Copied Markdown!' : 'Copy Clean Markdown'}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportHtml}
                        className="text-xs justify-start gap-2 h-9 font-medium"
                      >
                        <Download className="h-4 w-4 text-blue-600" />
                        <span>Download Clean HTML Document</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Translation Modal */}
        <TranslationModal
          isOpen={showTranslateModal}
          onClose={() => setShowTranslateModal(false)}
          onTranslate={async (sourceLang, targetLang) => {
            await triggerTranslation(targetLang, sourceLang);
            setShowTranslateModal(false);
          }}
          currentLanguage={doc.language}
          isTranslating={isTranslating}
          error={translationError}
        />
      </div>
    </AppShell>
  );
}
