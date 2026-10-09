'use client';

import { useState, useMemo, useCallback } from 'react';
import { SeoDocument, ContentMetrics } from '@/types/content';
import { EditorViewMode, AnalyzerTabKey } from '@/types/app';
import { contentAnalyzerService } from '@/services/content-analyzer.service';
import { editorActionsService } from '@/services/editor-actions.service';
import { ContentAnalysisResult } from '@/types/analyzer';

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

  const [viewMode, setViewMode] = useState<EditorViewMode>('editor');
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
    triggerDialectAdapt,
    acceptProposal,
    rejectProposal,
    undoLastAction,
  };
}
