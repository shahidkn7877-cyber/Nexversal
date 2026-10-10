'use client';

import { useState, useMemo, useCallback } from 'react';
import { SeoDocument, ContentMetrics } from '@/types/content';
import { EditorViewMode, AnalyzerTabKey } from '@/types/app';
import { contentAnalyzerService } from '@/services/content-analyzer.service';
import { editorActionsService } from '@/services/editor-actions.service';
import { ContentAnalysisResult } from '@/types/analyzer';
import { StyleReviewResult, StyleFinding } from '@/services/style-review.service';

export interface PendingProposal {
  title: string;
  originalContent: string;
  proposedContent: string;
  changes: string[];
  proposedDocFields?: Partial<SeoDocument>;
}

export function useEditor(initialDoc?: Partial<SeoDocument>) {
  const [doc, setDoc] = useState<SeoDocument>({
    title: initialDoc?.title || '',
    slug: initialDoc?.slug || '',
    metaTitle: initialDoc?.metaTitle || '',
    metaDescription: initialDoc?.metaDescription || '',
    content: initialDoc?.content || '',
    focusKeyword: initialDoc?.focusKeyword || '',
    secondaryKeywords: initialDoc?.secondaryKeywords || '',
    language: initialDoc?.language || 'en-US',
  });

  const [viewMode, setViewMode] = useState<EditorViewMode>('visual');
  const [activeTab, setActiveTab] = useState<AnalyzerTabKey>('seo');

  const updateField = useCallback(
    <K extends keyof SeoDocument>(field: K, value: SeoDocument[K]) => {
      setDoc((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Instantaneous pure analysis execution
  const analysisResult: ContentAnalysisResult = useMemo(() => {
    return contentAnalyzerService.analyze({
      content: doc.content,
      focusKeyword: doc.focusKeyword,
      secondaryKeywords: doc.secondaryKeywords,
      title: doc.title,
      metaTitle: doc.metaTitle,
      metaDescription: doc.metaDescription,
      slug: doc.slug,
      language: doc.language,
    });
  }, [
    doc.content,
    doc.focusKeyword,
    doc.secondaryKeywords,
    doc.title,
    doc.metaTitle,
    doc.metaDescription,
    doc.slug,
    doc.language,
  ]);

  const metrics: ContentMetrics = useMemo(() => {
    const text = doc.content.trim();
    if (!text) {
      return {
        wordCount: 0,
        charCount: 0,
        sentenceCount: 0,
        paragraphCount: 0,
        readingTimeMinutes: 0,
        speakingTimeMinutes: 0,
        avgWordsPerSentence: 0,
        keywordCount: 0,
        keywordDensity: 0,
      };
    }

    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const charCount = text.length;
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
    const speakingTimeMinutes = Math.max(1, Math.ceil(wordCount / 130));
    const avgWordsPerSentence =
      sentences.length > 0
        ? parseFloat((wordCount / sentences.length).toFixed(1))
        : 0;

    return {
      wordCount,
      charCount,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      readingTimeMinutes,
      speakingTimeMinutes,
      avgWordsPerSentence,
      keywordCount: analysisResult.metrics.keywordCount,
      keywordDensity: analysisResult.metrics.keywordDensity,
    };
  }, [doc.content, analysisResult.metrics.keywordCount, analysisResult.metrics.keywordDensity]);

  const [pendingProposal, setPendingProposal] = useState<PendingProposal | null>(null);
  const [previousDoc, setPreviousDoc] = useState<SeoDocument | null>(null);

  // AI & Async State
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [humanizeError, setHumanizeError] = useState<string | null>(null);

  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const [styleReviewResult, setStyleReviewResult] = useState<StyleReviewResult | null>(null);
  const [isStyleReviewing, setIsStyleReviewing] = useState(false);
  const [rewritingFindingId, setRewritingFindingId] = useState<string | null>(null);

  const clearContent = useCallback(() => {
    setDoc({
      title: '',
      slug: '',
      metaTitle: '',
      metaDescription: '',
      content: '',
      focusKeyword: '',
      secondaryKeywords: '',
      language: 'en-US',
    });
    setPendingProposal(null);
    setStyleReviewResult(null);
  }, []);

  const triggerOneClickFix = useCallback(() => {
    const result = editorActionsService.oneClickSeoFix({
      content: doc.content,
      focusKeyword: doc.focusKeyword,
      title: doc.title,
      slug: doc.slug,
    });
    setPendingProposal({
      title: '1-Click SEO Fix Proposal',
      originalContent: doc.content,
      proposedContent: result.proposedContent,
      changes: result.changes,
      proposedDocFields: {
        title: result.proposedTitle,
        slug: result.proposedSlug,
      },
    });
  }, [doc.content, doc.focusKeyword, doc.title, doc.slug]);

  const triggerAutoHeadings = useCallback(() => {
    const result = editorActionsService.autoHeadings({
      content: doc.content,
      focusKeyword: doc.focusKeyword,
    });
    setPendingProposal({
      title: 'Auto Headings Proposal',
      originalContent: doc.content,
      proposedContent: result.proposedContent,
      changes: result.generatedHeadings.map((h) => `Added heading: ${h}`),
    });
  }, [doc.content, doc.focusKeyword]);

  // Deterministic local humanizer (instant fallback)
  const triggerHumanizeTone = useCallback(() => {
    const result = editorActionsService.humanizeTone({
      content: doc.content,
    });
    setPendingProposal({
      title: 'Humanize AI Tone Proposal',
      originalContent: doc.content,
      proposedContent: result.proposedContent,
      changes: result.replacements.map(
        (r) => `Replaced "${r.original}" with "${r.replacement}"`
      ),
    });
  }, [doc.content]);

  // Real AI Humanize Tone (calls configured provider)
  const triggerAiHumanizeTone = useCallback(async () => {
    if (!doc.content.trim()) return;
    setIsHumanizing(true);
    setHumanizeError(null);

    try {
      const res = await fetch('/api/v1/content/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: doc.content,
          action: 'humanize_tone',
          focusKeyword: doc.focusKeyword || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.result?.improved) {
        setPendingProposal({
          title: 'AI Humanized Tone Proposal',
          originalContent: doc.content,
          proposedContent: data.data.result.improved,
          changes: [
            'Eliminated robotic phrasing and enhanced natural rhythm',
            'Preserved all Markdown headings, links, and keywords',
          ],
        });
      } else {
        // Fall back to rule-based humanizer or report limitation
        const fallback = editorActionsService.humanizeTone({ content: doc.content });
        if (fallback.replacedCount > 0) {
          setPendingProposal({
            title: 'Humanize Tone (Rules Engine Proposal)',
            originalContent: doc.content,
            proposedContent: fallback.proposedContent,
            changes: fallback.replacements.map(
              (r) => `Replaced "${r.original}" with "${r.replacement}"`
            ),
          });
        } else {
          setHumanizeError(data.error?.message || 'AI improvements are currently unavailable.');
        }
      }
    } catch {
      setHumanizeError('AI improvements are currently unavailable.');
    } finally {
      setIsHumanizing(false);
    }
  }, [doc.content, doc.focusKeyword]);

  // Translation Workflow
  const triggerTranslation = useCallback(
    async (targetLang: string, sourceLang: string = 'auto') => {
      if (!doc.content.trim()) return;
      setIsTranslating(true);
      setTranslationError(null);

      try {
        const res = await fetch('/api/v1/content/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: doc.content,
            targetLanguage: targetLang,
            sourceLanguage: sourceLang !== 'auto' ? sourceLang : undefined,
            focusKeyword: doc.focusKeyword || undefined,
          }),
        });

        const data = await res.json();
        if (data.success && data.data?.result?.improved) {
          setPendingProposal({
            title: `Article Translation (${targetLang}) Proposal`,
            originalContent: doc.content,
            proposedContent: data.data.result.improved,
            changes: [
              `Translated full article content into ${targetLang}`,
              'Preserved headings, links, and formatting hierarchy',
            ],
            proposedDocFields: {
              language: targetLang,
            },
          });
        } else {
          setTranslationError(data.error?.message || 'AI improvements are currently unavailable.');
        }
      } catch {
        setTranslationError('AI improvements are currently unavailable.');
      } finally {
        setIsTranslating(false);
      }
    },
    [doc.content, doc.focusKeyword]
  );

  // Writing Style Review Workflow
  const triggerStyleReview = useCallback(async () => {
    if (!doc.content.trim()) return;
    setIsStyleReviewing(true);

    try {
      const res = await fetch('/api/v1/content/style-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: doc.content }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setStyleReviewResult(data.data);
        setActiveTab('style_review');
      }
    } catch {
      // Ignored
    } finally {
      setIsStyleReviewing(false);
    }
  }, [doc.content]);

  // Targeted Rewrite Loop for Specific Passage
  const triggerTargetedRewrite = useCallback(
    async (finding: StyleFinding) => {
      setRewritingFindingId(finding.id);

      try {
        const res = await fetch('/api/v1/content/improve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: doc.content,
            action: 'targeted_rewrite',
            targetPassage: finding.passage,
            styleFinding: finding.explanation,
          }),
        });

        const data = await res.json();
        if (data.success && data.data?.result?.improved) {
          setStyleReviewResult((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              findings: prev.findings.map((f) =>
                f.id === finding.id
                  ? {
                      ...f,
                      status: 'rewritten',
                      rewrittenPassage: data.data.result.improved,
                    }
                  : f
              ),
            };
          });
        }
      } catch {
        // Ignored
      } finally {
        setRewritingFindingId(null);
      }
    },
    [doc.content]
  );

  const acceptStyleFinding = useCallback(
    (finding: StyleFinding) => {
      if (!finding.rewrittenPassage) return;
      setPreviousDoc({ ...doc });

      // Replace passage in canonical content
      const updatedContent = doc.content.replace(finding.passage, finding.rewrittenPassage);
      setDoc((prev) => ({ ...prev, content: updatedContent }));

      setStyleReviewResult((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          findings: prev.findings.map((f) =>
            f.id === finding.id ? { ...f, status: 'accepted' } : f
          ),
        };
      });
    },
    [doc]
  );

  const rejectStyleFinding = useCallback((finding: StyleFinding) => {
    setStyleReviewResult((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        findings: prev.findings.map((f) =>
          f.id === finding.id ? { ...f, status: 'rejected' } : f
        ),
      };
    });
  }, []);

  const triggerDialectAdapt = useCallback(
    (targetVariant: 'US' | 'UK') => {
      const result = editorActionsService.adaptDialect({
        content: doc.content,
        targetVariant,
      });
      setPendingProposal({
        title: `Adapt to ${targetVariant} English Proposal`,
        originalContent: doc.content,
        proposedContent: result.proposedContent,
        changes: result.changes.map((c) => `Adapted "${c.from}" → "${c.to}"`),
      });
    },
    [doc.content]
  );

  const acceptProposal = useCallback(() => {
    if (!pendingProposal) return;
    setPreviousDoc({ ...doc });
    setDoc((prev) => ({
      ...prev,
      content: pendingProposal.proposedContent,
      ...(pendingProposal.proposedDocFields || {}),
    }));
    setPendingProposal(null);
  }, [pendingProposal, doc]);

  const rejectProposal = useCallback(() => {
    setPendingProposal(null);
  }, []);

  const undoLastAction = useCallback(() => {
    if (!previousDoc) return;
    setDoc(previousDoc);
    setPreviousDoc(null);
  }, [previousDoc]);

  return {
    doc,
    setDoc,
    updateField,
    metrics,
    analysisResult,
    viewMode,
    setViewMode,
    activeTab,
    setActiveTab,
    clearContent,
    pendingProposal,
    hasUndo: Boolean(previousDoc),
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
  };
}
