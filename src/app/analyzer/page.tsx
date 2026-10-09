'use client';

import React, { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ContentStats } from '@/components/analyzer/ContentStats';
import { KeywordInput } from '@/components/analyzer/KeywordInput';
import { ContentEditor } from '@/components/analyzer/ContentEditor';
import { AnalyzerTabs } from '@/components/analyzer/AnalyzerTabs';
import { SeoChecklist } from '@/components/analyzer/SeoChecklist';
import { SerpPreview } from '@/components/analyzer/SerpPreview';
import { AiPatternPanel } from '@/components/humanizer/AiPatternPanel';
import { AiImprovementPanel } from '@/components/analyzer/AiImprovementPanel';
import { FaqGenerator } from '@/components/faq/FaqGenerator';
import { SchemaPreview } from '@/components/schema/SchemaPreview';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEditor } from '@/hooks/useEditor';
import { Download, Copy, Check, Smartphone, Info, AlertCircle, CheckCircle2 } from 'lucide-react';

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
    triggerDialectAdapt,
    acceptProposal,
    rejectProposal,
    undoLastAction,
  } = useEditor();

  const [copied, setCopied] = React.useState(false);

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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.title || doc.metaTitle || 'Optimized Article'}</title>
  <meta name="description" content="${doc.metaDescription || ''}">
  <link rel="canonical" href="https://yourwebsite.com/${doc.slug || ''}">
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

  return (
    <AppShell showSidebar={false}>
      <div className="space-y-6">
        {/* Real-time Content Score & Metrics */}
        <ContentStats
          metrics={metrics}
          score={analysisResult.score}
          scoreCategory={analysisResult.scoreCategory}
        />

        {/* Real-time Analysis State Banner */}
        <div
          className={`px-4 py-2.5 rounded-2xl border text-xs flex items-center justify-between gap-3 transition-colors ${
            !doc.content.trim()
              ? 'border-border bg-slate-50/50 dark:bg-slate-900/30 text-muted-foreground'
              : !doc.focusKeyword.trim()
              ? 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200'
              : 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {!doc.content.trim() ? (
              <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : !doc.focusKeyword.trim() ? (
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <span className="font-medium">
              {!doc.content.trim()
                ? 'Ready for Article — Paste or type content in the editor to analyze in real time.'
                : !doc.focusKeyword.trim()
                ? 'Content Analyzed • Target Keyword Needed — Structure, readability, and links are analyzed. Enter a focus keyword to evaluate keyword density and targeting.'
                : `Live Analysis Synchronized — Target keyword "${analysisResult.analyzedKeyword || doc.focusKeyword}" active. All diagnostics up to date.`}
            </span>
          </div>
          <Badge
            variant={
              !doc.content.trim()
                ? 'muted'
                : !doc.focusKeyword.trim()
                ? 'warning'
                : 'success'
            }
            className="text-[10px] font-bold shrink-0 uppercase tracking-wider"
          >
            {!doc.content.trim()
              ? 'Waiting for Content'
              : !doc.focusKeyword.trim()
              ? 'Keyword Required'
              : 'Live Synchronized'}
          </Badge>
        </div>

        {/* Mobile Paragraph Length Warning Banner if long paragraphs detected */}
        {analysisResult.longParagraphs.length > 0 && (
          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Smartphone className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  Mobile Readability Alert: {analysisResult.longParagraphs.length} Paragraph(s) Exceed 80 Words
                </span>
                <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                  Paragraph(s) {analysisResult.longParagraphs.map((p) => `#${p.index} (${p.wordCount} words)`).join(', ')} exceed mobile scannability guidelines. Split them into shorter 2-to-3 sentence paragraphs for mobile users.
                </p>
              </div>
            </div>
            <Badge variant="warning" className="shrink-0 font-bold">
              Readability
            </Badge>
          </div>
        )}

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
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
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
              onHumanizeTone={triggerHumanizeTone}
              onDialectAdapt={triggerDialectAdapt}
              onUndo={undoLastAction}
              hasUndo={hasUndo}
              pendingProposal={pendingProposal}
              onAcceptProposal={acceptProposal}
              onRejectProposal={rejectProposal}
            />
          </div>

          <div className="lg:col-span-5 space-y-4">
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

            {activeTab === 'serp' && (
              <SerpPreview
                metaTitle={doc.metaTitle}
                onMetaTitleChange={(val) => updateField('metaTitle', val)}
                metaDescription={doc.metaDescription}
                onMetaDescriptionChange={(val) =>
                  updateField('metaDescription', val)
                }
                slug={doc.slug}
              />
            )}

            {activeTab === 'ai' && (
              <AiImprovementPanel
                content={doc.content}
                focusKeyword={doc.focusKeyword}
                title={doc.title}
                metaDescription={doc.metaDescription}
                onApplyTitle={(newTitle) => updateField('title', newTitle)}
                onApplyMetaDesc={(newMeta) => updateField('metaDescription', newMeta)}
              />
            )}

            {activeTab === 'patterns' && <AiPatternPanel patterns={[]} />}

            {activeTab === 'faq' && <FaqGenerator topic={doc.focusKeyword} />}

            {activeTab === 'schema' && (
              <SchemaPreview title={doc.title} url={`https://yourwebsite.com/${doc.slug}`} />
            )}

            {activeTab === 'export' && (
              <Card className="border-border bg-card">
                <CardHeader className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Export & Publishing
                    </CardTitle>
                    <Badge variant="success">Score: {analysisResult.score}/100</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Export your optimized article directly to clean Markdown or HTML for WordPress, Ghost, Webflow, or custom CMS:
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
                      <Download className="h-4 w-4 text-brand-500" />
                      <span>Download Clean HTML Document</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
