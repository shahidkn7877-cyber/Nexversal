import { ContentAnalyzeParams, contentAnalyzeSchema } from '@/lib/validation/content.schema';
import { extractHeadings } from '@/lib/markdown-parser';
import {
  ContentAnalysisResult,
  ContentAnalysisRule,
  ParagraphAnalysis,
  SeoCheckItem,
  ChecklistCategory,
  ChecklistStatus,
} from '@/types/analyzer';

export const ROBOTIC_PATTERNS: Array<{
  phrase: string;
  category: string;
  suggestion: string;
}> = [
  {
    phrase: "In today's fast-paced digital world",
    category: "Overused Cliché",
    suggestion: "Today",
  },
  {
    phrase: "it is paramount to understand",
    category: "Formal Stiff Filler",
    suggestion: "it is important to note",
  },
  {
    phrase: "delve into the nuances",
    category: "Generic AI Phrase",
    suggestion: "explore",
  },
  {
    phrase: "a testament to the dedication",
    category: "Overused Metaphor",
    suggestion: "shows the dedication",
  },
  {
    phrase: "a rich tapestry of ideas",
    category: "Hallmark Buzzword",
    suggestion: "a diverse collection",
  },
  {
    phrase: "delve into",
    category: "AI Buzzword",
    suggestion: "explore",
  },
  {
    phrase: "rich tapestry",
    category: "Hallmark Buzzword",
    suggestion: "diverse blend",
  },
  {
    phrase: "tapestry of",
    category: "AI Metaphor",
    suggestion: "blend of",
  },
  {
    phrase: "beacon of hope",
    category: "Overused Metaphor",
    suggestion: "promising guide",
  },
  {
    phrase: "ever-evolving landscape",
    category: "Cliche",
    suggestion: "changing market",
  },
];

const POWER_WORDS = [
  'best', 'top', 'complete', 'guide', 'ultimate', 'proven', 'review',
  'limits', 'master', 'essential', 'free', 'step-by-step', 'advanced',
  'fast', 'easy', 'definitive', 'checklist', 'strategies',
];

export class ContentAnalyzerService {
  public getEmptyAnalysisResult(_rawInput?: Partial<ContentAnalyzeParams>): ContentAnalysisResult {
    return {
      score: 0,
      grade: 'F',
      scoreCategory: 'Weak',
      metrics: {
        wordCount: 0,
        characterCount: 0,
        sentenceCount: 0,
        paragraphCount: 0,
        longParagraphsCount: 0,
        paragraphs: {
          total: 0,
          longForMobile: 0,
        },
        keywordCount: 0,
        keywordDensity: 0,
        readingEaseScore: 0,
        readingEaseLabel: 'N/A',
        avgWordsPerSentence: 0,
        headings: {
          total: 0,
          h1: 0,
          h2: 0,
          h3: 0,
          hierarchyIssues: [],
        },
        readability: {
          longSentenceCount: 0,
          repeatedPhrasesCount: 0,
        },
        links: {
          total: 0,
          empty: 0,
          internal: 0,
          external: 0,
        },
        images: {
          total: 0,
          emptyAlt: 0,
          genericAlt: 0,
          optimized: 0,
        },
      },
      rules: [
        {
          id: 'content_length',
          category: 'basic',
          title: 'Minimum Content Length',
          description: 'Checks if content meets the minimum word count threshold.',
          status: 'failed',
          pointsAwarded: 0,
          maxPoints: 10,
          feedback: 'No content entered yet. Paste or write your article to begin analysis.',
          recommendation: 'Add content to analyze SEO metrics.',
        },
      ],
      checklist: [],
      longParagraphs: [],
      issuesSummary: {
        passed: 0,
        warnings: 0,
        failed: 1,
        notChecked: 0,
      },
      recommendations: [
        'Add your article content and a focus keyword to see actionable SEO suggestions.',
      ],
    };
  }

  public analyze(rawInput: Partial<ContentAnalyzeParams>): ContentAnalysisResult {
    const rawContent = (rawInput?.content || '').trim();
    if (!rawContent) {
      return this.getEmptyAnalysisResult(rawInput);
    }

    const parseResult = contentAnalyzeSchema.safeParse(rawInput);
    const input = parseResult.success
      ? parseResult.data
      : {
          content: rawContent,
          focusKeyword: ((rawInput?.focusKeyword || (rawInput as any)?.targetKeyword || '') as string).trim(),
          targetKeyword: ((rawInput?.focusKeyword || (rawInput as any)?.targetKeyword || '') as string).trim(),
          secondaryKeywords: (rawInput as any)?.secondaryKeywords || [],
          title: (rawInput?.title || '').trim(),
          metaTitle: (rawInput?.metaTitle || '').trim(),
          metaDescription: (rawInput?.metaDescription || '').trim(),
          slug: (rawInput?.slug || '').trim(),
          url: (rawInput?.url || '').trim(),
          language: rawInput?.language || 'en-US',
          contentType: rawInput?.contentType,
          searchIntent: rawInput?.searchIntent,
        };
    const content = rawContent;
    const keyword = (input.focusKeyword || input.targetKeyword || '').trim().toLowerCase();
    const title = (input.title || '').trim();
    const metaTitle = (input.metaTitle || title || '').trim();
    const metaDesc = (input.metaDescription || '').trim();
    const slug = (input.slug || '').trim().toLowerCase();
    const url = (input.url || '').trim();
    const searchIntent = input.searchIntent;

    // 1. Text Metrics
    const words = content.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const characterCount = content.length;

    // Sentences
    const sentences = content
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const sentenceCount = Math.max(1, sentences.length);
    const avgWordsPerSentence = parseFloat((wordCount / sentenceCount).toFixed(1));

    // Long sentences (> 25 words)
    let longSentenceCount = 0;
    for (const sent of sentences) {
      const sWordCount = sent.split(/\s+/).filter(Boolean).length;
      if (sWordCount > 25) {
        longSentenceCount++;
      }
    }

    // 2. Heading extraction & hierarchy analysis
    const parsedHeadings = extractHeadings(content);
    let emptyHeadingsCount = 0;
    let longHeadingsCount = 0;
    const headingLines: Array<{ level: number; text: string }> = [];

    for (const h of parsedHeadings) {
      if (!h.text) {
        emptyHeadingsCount++;
      } else if (h.text.length > 100) {
        longHeadingsCount++;
      }
      headingLines.push({ level: h.level, text: h.text });
    }

    let h1Count = headingLines.filter((h) => h.level === 1).length;
    if (h1Count === 0 && title && !headingLines.some((h) => h.text.toLowerCase() === title.toLowerCase())) {
      // If title is explicitly passed and not in content, count it as the H1
      h1Count = 1;
    }
    const h2Count = headingLines.filter((h) => h.level === 2).length;
    const h3Count = headingLines.filter((h) => h.level === 3).length;

    const hierarchyIssues: string[] = [];
    let prevLevel = 0;
    for (const h of headingLines) {
      if (prevLevel > 0 && h.level > prevLevel + 1) {
        hierarchyIssues.push(`Skipped heading level from H${prevLevel} to H${h.level}`);
      }
      prevLevel = h.level;
    }

    // Paragraphs & mobile length detection (> 80 words)
    // Distinguish headings from ordinary body paragraphs!
    const rawParagraphs = content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    const bodyParagraphs = rawParagraphs.filter(
      (para) => !/^(?:#{1,6}\s+|<h[1-6][^>]*>)/i.test(para) && para !== '---' && para !== '***'
    );
    const paragraphCount = bodyParagraphs.length > 0 ? bodyParagraphs.length : (rawParagraphs.length > 0 ? 1 : 0);

    const longParagraphs: ParagraphAnalysis[] = [];
    bodyParagraphs.forEach((para, idx) => {
      const pWords = para.split(/\s+/).filter(Boolean).length;
      if (pWords > 80) {
        longParagraphs.push({
          index: idx + 1,
          wordCount: pWords,
          isOverLimit: true,
          preview: para.slice(0, 100) + '...',
        });
      }
    });

    // 3. Keyword Analysis
    let keywordCount = 0;
    let keywordDensity = 0;
    let keywordInIntro = false;
    let keywordInHeadings = false;

    if (keyword) {
      const escapedKw = keyword.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const kwRegex = new RegExp(`\\b${escapedKw}\\b`, 'gi');
      const matches = content.match(kwRegex);
      keywordCount = matches ? matches.length : 0;

      if (wordCount > 0) {
        keywordDensity = parseFloat(((keywordCount * 100) / wordCount).toFixed(2));
      }

      // Check intro (first paragraph if multiple paragraphs, or first 50 words)
      if (bodyParagraphs.length > 0) {
        keywordInIntro = bodyParagraphs[0].toLowerCase().includes(keyword);
        if (!keywordInIntro && bodyParagraphs.length > 1) {
          const firstParaWords = bodyParagraphs[0].split(/\s+/).length;
          if (firstParaWords < 30) {
            keywordInIntro = (bodyParagraphs[0] + ' ' + bodyParagraphs[1]).toLowerCase().includes(keyword);
          }
        }
      } else {
        const introSnippet = words.slice(0, Math.min(words.length, 50)).join(' ').toLowerCase();
        keywordInIntro = introSnippet.includes(keyword);
      }

      // Check headings
      keywordInHeadings = headingLines.some((h) => h.level > 1 && h.text.toLowerCase().includes(keyword));
    }

    // 4. Robotic / AI Clichés
    let repeatedPhrasesCount = 0;
    for (const pat of ROBOTIC_PATTERNS) {
      const pLower = pat.phrase.toLowerCase();
      if (content.toLowerCase().includes(pLower)) {
        repeatedPhrasesCount++;
      }
    }

    // 5. Link Diagnostics
    // Strip markdown images first so image syntax ![alt](url) is not misidentified as hyperlink <a> tags
    const contentWithoutImages = content.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, '');
    const mdLinkRegex = /\[([^\]]*)\]\(([^)]*)\)/g;
    const htmlLinkRegex = /<a\s+[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi;

    let linkTotal = 0;
    let linkEmpty = 0;
    let linkInternal = 0;
    let linkExternal = 0;

    let lMatch: RegExpExecArray | null;
    while ((lMatch = mdLinkRegex.exec(contentWithoutImages)) !== null) {
      linkTotal++;
      const href = lMatch[2].trim();
      if (!href || href === '#' || href.startsWith('javascript:')) {
        linkEmpty++;
      } else if (href.startsWith('/') || (url && href.startsWith(url))) {
        linkInternal++;
      } else if (href.startsWith('http://') || href.startsWith('https://')) {
        linkExternal++;
      }
    }

    while ((lMatch = htmlLinkRegex.exec(content)) !== null) {
      linkTotal++;
      const href = lMatch[1].trim();
      if (!href || href === '#' || href.startsWith('javascript:')) {
        linkEmpty++;
      } else if (href.startsWith('/') || (url && href.startsWith(url))) {
        linkInternal++;
      } else if (href.startsWith('http://') || href.startsWith('https://')) {
        linkExternal++;
      }
    }

    // 6. Image Diagnostics
    const mdImgRegex = /!\[([^\]]*)\]\(([^)]*)\)/g;
    const htmlImgRegex = /<img\s+([^>]*?)>/gi;

    let imgTotal = 0;
    let imgEmptyAlt = 0;
    let imgGenericAlt = 0;
    let imgOptimized = 0;

    let iMatch: RegExpExecArray | null;
    while ((iMatch = mdImgRegex.exec(content)) !== null) {
      imgTotal++;
      const alt = iMatch[1].trim();
      if (!alt) {
        imgEmptyAlt++;
      } else if (/^(image|photo|picture|img|graphic|screenshot)$/i.test(alt)) {
        imgGenericAlt++;
      } else {
        imgOptimized++;
      }
    }

    while ((iMatch = htmlImgRegex.exec(content)) !== null) {
      imgTotal++;
      const attrs = iMatch[1];
      const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
      const alt = altMatch ? altMatch[1].trim() : '';
      if (!alt) {
        imgEmptyAlt++;
      } else if (/^(image|photo|picture|img|graphic|screenshot)$/i.test(alt)) {
        imgGenericAlt++;
      } else {
        imgOptimized++;
      }
    }

    // 7. Flesch Reading Ease
    const syllablesEstimate = words.reduce((acc, word) => {
      const clean = word.toLowerCase().replace(/[^a-z]/g, '');
      if (clean.length <= 3) return acc + 1;
      const count = clean.replace(/(?:[^laeiouy]|ed|es|e)$/, '').match(/[aeiouy]{1,2}/g)?.length || 1;
      return acc + Math.max(1, count);
    }, 0);

    const wordsPerSent = wordCount / Math.max(1, sentenceCount);
    const syllablesPerWord = syllablesEstimate / Math.max(1, wordCount);
    let fleschScore = Math.round(206.835 - 1.015 * wordsPerSent - 84.6 * syllablesPerWord);
    fleschScore = Math.max(0, Math.min(100, fleschScore));

    let readingEaseLabel = 'Standard';
    if (fleschScore >= 80) readingEaseLabel = 'Very Easy';
    else if (fleschScore >= 70) readingEaseLabel = 'Fairly Easy';
    else if (fleschScore >= 60) readingEaseLabel = 'Plain English';
    else if (fleschScore >= 50) readingEaseLabel = 'Fairly Difficult';
    else readingEaseLabel = 'Very Confusing / Academic';

    // =========================================================================
    // BUILD CHECKLIST ITEMS (PASS | WARNING | FAIL | NOT_CHECKED)
    // =========================================================================
    const checklist: SeoCheckItem[] = [];

    // Check 1: H1 Count
    if (h1Count === 1) {
      checklist.push({
        id: 'h1_count',
        category: 'structure',
        title: 'Single Primary H1 Heading',
        description: 'Verify article has exactly one primary H1 tag for search engines.',
        status: 'PASS',
        detectedValue: 1,
        explanation: 'Exactly one H1 heading is present, establishing clear topical authority.',
        recommendation: 'Maintain a single primary H1 heading per article.',
        impact: 'high',
        pointsAwarded: 10,
        maxPoints: 10,
      });
    } else if (h1Count > 1) {
      checklist.push({
        id: 'h1_count',
        category: 'structure',
        title: 'Multiple H1 Headings Detected',
        description: 'Verify article has exactly one primary H1 tag for search engines.',
        status: 'WARNING',
        detectedValue: h1Count,
        explanation: `Multiple H1 tags (${h1Count}) detected. Consolidate them into one main H1 and demote others to H2.`,
        recommendation: 'Use only one H1 heading per page and use H2/H3 for subheadings.',
        impact: 'high',
        pointsAwarded: 4,
        maxPoints: 10,
      });
    } else {
      checklist.push({
        id: 'h1_count',
        category: 'structure',
        title: 'Missing Primary H1 Heading',
        description: 'Verify article has exactly one primary H1 tag for search engines.',
        status: 'FAIL',
        detectedValue: 0,
        explanation: 'No H1 title tag detected in content or headline.',
        recommendation: 'Add a prominent # Title H1 at the beginning of your content.',
        impact: 'high',
        pointsAwarded: 0,
        maxPoints: 10,
      });
    }

    // Check 2: H2 Usage
    if (h2Count >= 1) {
      checklist.push({
        id: 'h2_usage',
        category: 'structure',
        title: 'Structured H2 Subheadings',
        description: 'Breaks long content into organized thematic sections.',
        status: 'PASS',
        detectedValue: h2Count,
        explanation: `Found ${h2Count} H2 subheadings organizing the article.`,
        recommendation: 'Keep content segmented with descriptive subheadings.',
        impact: 'high',
        pointsAwarded: 10,
        maxPoints: 10,
      });
    } else {
      checklist.push({
        id: 'h2_usage',
        category: 'structure',
        title: 'Missing H2 Subheadings',
        description: 'Breaks long content into organized thematic sections.',
        status: 'FAIL',
        detectedValue: 0,
        explanation: 'No H2 subheadings found to structure content sections.',
        recommendation: 'Add ## Subheadings every 200-300 words to improve scannability.',
        impact: 'high',
        pointsAwarded: 0,
        maxPoints: 10,
      });
    }

    // Check 3: Heading Hierarchy
    if (hierarchyIssues.length > 0) {
      checklist.push({
        id: 'heading_hierarchy',
        category: 'structure',
        title: 'Heading Hierarchy Consistency',
        description: 'Ensures headings follow logical nesting (H1 -> H2 -> H3).',
        status: 'WARNING',
        detectedValue: `${hierarchyIssues.length} level skips`,
        explanation: `Heading hierarchy skips levels (e.g. ${hierarchyIssues[0]}).`,
        recommendation: 'Nest headings sequentially without jumping across levels.',
        impact: 'medium',
        pointsAwarded: 2,
        maxPoints: 5,
      });
    } else {
      checklist.push({
        id: 'heading_hierarchy',
        category: 'structure',
        title: 'Heading Hierarchy Consistency',
        description: 'Ensures headings follow logical nesting (H1 -> H2 -> H3).',
        status: 'PASS',
        detectedValue: 'Sequential nesting',
        explanation: 'Heading hierarchy is logical and sequential without skipping levels.',
        recommendation: 'Maintain sequential heading nesting.',
        impact: 'medium',
        pointsAwarded: 5,
        maxPoints: 5,
      });
    }

    // Check 4: Heading Quality (Empty or excessively long)
    if (emptyHeadingsCount > 0) {
      checklist.push({
        id: 'heading_quality',
        category: 'structure',
        title: 'Heading Quality Diagnostics',
        description: 'Checks for empty headings and excessively long headings.',
        status: 'FAIL',
        detectedValue: `${emptyHeadingsCount} empty heading(s)`,
        explanation: `Detected ${emptyHeadingsCount} empty heading tag(s) without text.`,
        recommendation: 'Remove or provide descriptive text for all empty headings.',
        impact: 'medium',
        pointsAwarded: 0,
        maxPoints: 5,
      });
    } else if (longHeadingsCount > 0) {
      checklist.push({
        id: 'heading_quality',
        category: 'structure',
        title: 'Heading Quality Diagnostics',
        description: 'Checks for empty headings and excessively long headings.',
        status: 'WARNING',
        detectedValue: `${longHeadingsCount} long heading(s)`,
        explanation: `Detected ${longHeadingsCount} heading(s) exceeding 100 characters in total length.`,
        recommendation: 'Shorten headings to under 70 characters for clear scannability.',
        impact: 'medium',
        pointsAwarded: 2,
        maxPoints: 5,
      });
    } else {
      checklist.push({
        id: 'heading_quality',
        category: 'structure',
        title: 'Heading Quality Diagnostics',
        description: 'Checks for empty headings and excessively long headings.',
        status: 'PASS',
        detectedValue: 'Concise & non-empty',
        explanation: 'All headings are well-formed, non-empty, and concise.',
        recommendation: 'Keep headings focused and descriptive.',
        impact: 'medium',
        pointsAwarded: 5,
        maxPoints: 5,
      });
    }

    // Check 5: Target Keyword Presence
    if (keywordCount > 0) {
      checklist.push({
        id: 'keyword_presence',
        category: 'keyword',
        title: 'Target Keyword Presence',
        description: 'Target keyword is present and naturally integrated in the body copy.',
        status: 'PASS',
        detectedValue: keywordCount,
        explanation: `Target keyword appears ${keywordCount} time(s) across the content.`,
        recommendation: 'Maintain natural, contextual keyword mentions.',
        impact: 'high',
        pointsAwarded: 10,
        maxPoints: 10,
      });
    } else {
      checklist.push({
        id: 'keyword_presence',
        category: 'keyword',
        title: keyword ? 'Target Keyword Missing' : 'Target Keyword Required',
        description: 'Target keyword is present and naturally integrated in the body copy.',
        status: 'FAIL',
        detectedValue: keyword ? 0 : 'Missing target keyword',
        explanation: keyword
          ? 'Target keyword is completely absent from the article content.'
          : 'A target keyword is required to perform keyword targeting and density analysis.',
        recommendation: keyword
          ? 'Incorporate your target keyword naturally across key paragraphs.'
          : 'Enter your focus keyword in the Target Keyword field to evaluate on-page targeting.',
        impact: 'high',
        pointsAwarded: 0,
        maxPoints: 10,
      });
    }

    // Check 6: Keyword in Introduction
    if (keywordInIntro) {
      checklist.push({
        id: 'keyword_intro',
        category: 'keyword',
        title: 'Keyword in Introduction Hook',
        description: 'Focus keyword appears early within the first 10% or introductory paragraph.',
        status: 'PASS',
        detectedValue: 'Present in opening',
        explanation: 'Target keyword is present in the introductory paragraph / first 100 words.',
        recommendation: 'Keep target keyword visible in the opening hook.',
        impact: 'high',
        pointsAwarded: 10,
        maxPoints: 10,
      });
    } else {
      checklist.push({
        id: 'keyword_intro',
        category: 'keyword',
        title: keyword ? 'Keyword Missing from Introduction' : 'Keyword Introduction Hook',
        description: 'Focus keyword appears early within the first 10% or introductory paragraph.',
        status: 'WARNING',
        detectedValue: 'Missing from opening',
        explanation: keyword
          ? 'Target keyword was not detected in the opening introduction or first 100 words.'
          : 'A target keyword is required to evaluate your introduction hook.',
        recommendation: keyword
          ? 'Introduce your target keyword naturally in your first 2 sentences.'
          : 'Enter a target keyword to verify introductory hook presence.',
        impact: 'high',
        pointsAwarded: 3,
        maxPoints: 10,
      });
    }

    // Check 7: Keyword in Subheadings
    if (keywordInHeadings) {
      checklist.push({
        id: 'keyword_headings',
        category: 'keyword',
        title: 'Keyword in Subheadings',
        description: 'Target keyword included in at least one H2 or H3 subheading.',
        status: 'PASS',
        detectedValue: 'Present in subheadings',
        explanation: 'Target keyword appears in at least one H2 or H3 subheading.',
        recommendation: 'Maintain topical subheadings with relevant keywords.',
        impact: 'medium',
        pointsAwarded: 5,
        maxPoints: 5,
      });
    } else {
      checklist.push({
        id: 'keyword_headings',
        category: 'keyword',
        title: keyword ? 'Keyword Missing from Subheadings' : 'Keyword Subheadings Check',
        description: 'Target keyword included in at least one H2 or H3 subheading.',
        status: 'WARNING',
        detectedValue: 'Missing from subheadings',
        explanation: keyword
          ? 'Target keyword does not appear in any H2 or H3 subheadings.'
          : 'A target keyword is required to evaluate subheading keyword placement.',
        recommendation: keyword
          ? 'Add your target keyword to at least one key subheading.'
          : 'Enter a target keyword to analyze subheading distribution.',
        impact: 'medium',
        pointsAwarded: 2,
        maxPoints: 5,
      });
    }

    // Check 8: SEO Title Analysis (Optional Input)
    if (!title) {
      checklist.push({
        id: 'title_analysis',
        category: 'title',
        title: 'SEO Title Optimization',
        description: 'Checks SEO title length (40-60 characters) and keyword inclusion.',
        status: 'NOT_CHECKED',
        detectedValue: 'Missing input',
        explanation: 'SEO Title was not provided for evaluation.',
        recommendation: 'Provide an SEO title in the title field to check click-through rate readiness.',
        impact: 'high',
        pointsAwarded: 0,
        maxPoints: 0,
      });
    } else {
      const titleHasKw = title.toLowerCase().includes(keyword);
      const titleLen = title.length;
      if (titleHasKw && titleLen >= 30 && titleLen <= 70) {
        checklist.push({
          id: 'title_analysis',
          category: 'title',
          title: 'SEO Title Optimization',
          description: 'Checks SEO title length (40-60 characters) and keyword inclusion.',
          status: 'PASS',
          detectedValue: `${titleLen} chars`,
          explanation: `Title length (${titleLen} chars) is optimal and includes the target keyword.`,
          recommendation: 'Maintain compelling headline structure.',
          impact: 'high',
          pointsAwarded: 10,
          maxPoints: 10,
        });
      } else if (!titleHasKw) {
        checklist.push({
          id: 'title_analysis',
          category: 'title',
          title: 'SEO Title Missing Target Keyword',
          description: 'Checks SEO title length (40-60 characters) and keyword inclusion.',
          status: 'WARNING',
          detectedValue: `${titleLen} chars`,
          explanation: 'SEO title does not contain target keyword.',
          recommendation: `Add '${keyword}' near the front of your title for higher click-through rates.`,
          impact: 'high',
          pointsAwarded: 4,
          maxPoints: 10,
        });
      } else {
        checklist.push({
          id: 'title_analysis',
          category: 'title',
          title: 'SEO Title Length Needs Adjustment',
          description: 'Checks SEO title length (40-60 characters) and keyword inclusion.',
          status: 'WARNING',
          detectedValue: `${titleLen} chars`,
          explanation: `Title length is ${titleLen} characters (recommended: 40-60 characters).`,
          recommendation: 'Adjust title length to 40-60 characters to avoid SERP truncation.',
          impact: 'medium',
          pointsAwarded: 6,
          maxPoints: 10,
        });
      }
    }

    // Check 9: Meta Description Analysis (Optional Input)
    if (!metaDesc) {
      checklist.push({
        id: 'meta_description',
        category: 'meta',
        title: 'Meta Description Optimization',
        description: 'Checks meta description length (120-160 chars) and keyword inclusion.',
        status: 'NOT_CHECKED',
        detectedValue: 'Missing input',
        explanation: 'Meta Description was not provided for evaluation.',
        recommendation: 'Add a 120-160 character meta description summarizing your article.',
        impact: 'high',
        pointsAwarded: 0,
        maxPoints: 0,
      });
    } else {
      const metaHasKw = metaDesc.toLowerCase().includes(keyword);
      const metaLen = metaDesc.length;
      if (metaHasKw && metaLen >= 110 && metaLen <= 165) {
        checklist.push({
          id: 'meta_description',
          category: 'meta',
          title: 'Meta Description Optimization',
          description: 'Checks meta description length (120-160 chars) and keyword inclusion.',
          status: 'PASS',
          detectedValue: `${metaLen} chars`,
          explanation: `Meta description length (${metaLen} chars) is ideal (120-160 characters) and includes target keyword.`,
          recommendation: 'Keep meta descriptions punchy and value-driven.',
          impact: 'high',
          pointsAwarded: 10,
          maxPoints: 10,
        });
      } else if (!metaHasKw) {
        checklist.push({
          id: 'meta_description',
          category: 'meta',
          title: 'Meta Description Missing Target Keyword',
          description: 'Checks meta description length (120-160 chars) and keyword inclusion.',
          status: 'WARNING',
          detectedValue: `${metaLen} chars`,
          explanation: 'Meta description does not contain target keyword.',
          recommendation: 'Include your focus keyword in the meta description to bold in search results.',
          impact: 'high',
          pointsAwarded: 4,
          maxPoints: 10,
        });
      } else {
        checklist.push({
          id: 'meta_description',
          category: 'meta',
          title: 'Meta Description Length Adjustment',
          description: 'Checks meta description length (120-160 chars) and keyword inclusion.',
          status: 'WARNING',
          detectedValue: `${metaLen} chars`,
          explanation: `Meta description length (${metaLen} chars) is outside optimal 120-160 range.`,
          recommendation: 'Target between 120 and 160 characters for search snippets.',
          impact: 'medium',
          pointsAwarded: 6,
          maxPoints: 10,
        });
      }
    }

    // Check 10: Paragraph Scannability (> 80 words)
    if (longParagraphs.length > 0) {
      checklist.push({
        id: 'paragraph_scannability',
        category: 'readability',
        title: 'Mobile Paragraph Scannability',
        description: 'Detects paragraphs exceeding 80 words for mobile reader retention.',
        status: 'WARNING',
        detectedValue: `${longParagraphs.length} long paragraph(s)`,
        explanation: `${longParagraphs.length} paragraph(s) exceed 80 words for mobile scannability.`,
        recommendation: 'Split long paragraphs into 2-3 sentence chunks for mobile readers.',
        impact: 'medium',
        pointsAwarded: 3,
        maxPoints: 5,
      });
    } else {
      checklist.push({
        id: 'paragraph_scannability',
        category: 'readability',
        title: 'Mobile Paragraph Scannability',
        description: 'Detects paragraphs exceeding 80 words for mobile reader retention.',
        status: 'PASS',
        detectedValue: 'Optimal mobile paragraph length',
        explanation: 'All paragraphs are short, readable, and mobile-friendly.',
        recommendation: 'Maintain concise paragraph lengths.',
        impact: 'medium',
        pointsAwarded: 5,
        maxPoints: 5,
      });
    }

    // Check 11: Robotic Patterns & Clichés
    if (repeatedPhrasesCount > 0) {
      checklist.push({
        id: 'robotic_patterns',
        category: 'readability',
        title: 'Natural Humanized Tone',
        description: 'Identifies overused AI buzzwords, repetitive filler, and academic clichés.',
        status: 'WARNING',
        detectedValue: `${repeatedPhrasesCount} robotic cliché(s)`,
        explanation: `Detected ${repeatedPhrasesCount} overused AI clichés or repetitive filler phrases.`,
        recommendation: 'Click Humanize AI Tone to replace repetitive clichés with direct language.',
        impact: 'medium',
        pointsAwarded: 2,
        maxPoints: 5,
      });
    } else {
      checklist.push({
        id: 'robotic_patterns',
        category: 'readability',
        title: 'Natural Humanized Tone',
        description: 'Identifies overused AI buzzwords, repetitive filler, and academic clichés.',
        status: 'PASS',
        detectedValue: 'Natural conversational tone',
        explanation: 'Tone is direct, authentic, and free of overused AI filler clichés.',
        recommendation: 'Keep content genuine and reader-centric.',
        impact: 'medium',
        pointsAwarded: 5,
        maxPoints: 5,
      });
    }

    // Check 12: Link Diagnostics
    if (linkEmpty > 0) {
      checklist.push({
        id: 'link_diagnostics',
        category: 'links',
        title: 'Link Health Diagnostics',
        description: 'Verifies hyperlink destinations and detects broken or empty hrefs.',
        status: 'FAIL',
        detectedValue: `${linkEmpty} broken/empty link(s)`,
        explanation: `Found ${linkEmpty} broken or empty links without destination URLs.`,
        recommendation: 'Fix or remove empty anchor references.',
        impact: 'medium',
        pointsAwarded: 0,
        maxPoints: 5,
      });
    } else if (linkTotal > 0) {
      checklist.push({
        id: 'link_diagnostics',
        category: 'links',
        title: 'Link Health Diagnostics',
        description: 'Verifies hyperlink destinations and detects broken or empty hrefs.',
        status: 'PASS',
        detectedValue: `${linkTotal} links verified`,
        explanation: `Found ${linkTotal} valid link references.`,
        recommendation: 'Maintain relevant external citations and resources.',
        impact: 'medium',
        pointsAwarded: 5,
        maxPoints: 5,
      });
    } else {
      checklist.push({
        id: 'link_diagnostics',
        category: 'links',
        title: 'Link Health Diagnostics',
        description: 'Verifies hyperlink destinations and detects broken or empty hrefs.',
        status: 'WARNING',
        detectedValue: '0 links',
        explanation: 'No outbound or internal link citations found to substantiate claims.',
        recommendation: 'Add authoritative source citations to boost credibility.',
        impact: 'medium',
        pointsAwarded: 2,
        maxPoints: 5,
      });
    }

    // Check 13: Domain-specific Links (Optional Input)
    if (!url) {
      checklist.push({
        id: 'domain_links',
        category: 'links',
        title: 'Domain Architecture & Internal Links',
        description: 'Verifies internal linking structure when target site URL is provided.',
        status: 'NOT_CHECKED',
        detectedValue: 'No site URL',
        explanation: 'Domain-specific internal link verification requires site URL input.',
        recommendation: 'Provide your site URL to evaluate internal architecture links.',
        impact: 'medium',
        pointsAwarded: 0,
        maxPoints: 0,
      });
    } else {
      if (linkInternal > 0) {
        checklist.push({
          id: 'domain_links',
          category: 'links',
          title: 'Domain Architecture & Internal Links',
          description: 'Verifies internal linking structure when target site URL is provided.',
          status: 'PASS',
          detectedValue: `${linkInternal} internal links`,
          explanation: `Includes ${linkInternal} internal links to retain domain authority.`,
          recommendation: 'Maintain internal link equity distribution.',
          impact: 'medium',
          pointsAwarded: 5,
          maxPoints: 5,
        });
      } else {
        checklist.push({
          id: 'domain_links',
          category: 'links',
          title: 'Domain Architecture & Internal Links',
          description: 'Verifies internal linking structure when target site URL is provided.',
          status: 'WARNING',
          detectedValue: '0 internal links',
          explanation: 'No internal links detected to retain visitors and link equity.',
          recommendation: 'Link to 2-3 related articles on your site.',
          impact: 'medium',
          pointsAwarded: 2,
          maxPoints: 5,
        });
      }
    }

    // Check 14: Image Analysis
    if (imgTotal === 0) {
      checklist.push({
        id: 'image_analysis',
        category: 'images',
        title: 'Visual Assets & Alt Text Diagnostics',
        description: 'Evaluates descriptive alt text and image accessibility.',
        status: 'NOT_CHECKED',
        detectedValue: '0 images',
        explanation: 'Content contains zero images; image SEO evaluation not applicable.',
        recommendation: 'Add relevant visual diagrams or screenshots to enrich content.',
        impact: 'medium',
        pointsAwarded: 0,
        maxPoints: 0,
      });
    } else {
      if (imgEmptyAlt > 0 || imgGenericAlt > 0) {
        checklist.push({
          id: 'image_analysis',
          category: 'images',
          title: 'Image Alt Text Diagnostics',
          description: 'Evaluates descriptive alt text and image accessibility.',
          status: 'FAIL',
          detectedValue: `${imgEmptyAlt} empty alt, ${imgGenericAlt} generic alt`,
          explanation: `Found images with missing or generic alt text. (${imgEmptyAlt} empty, ${imgGenericAlt} generic).`,
          recommendation: 'Add descriptive, keyword-rich alt text to all images.',
          impact: 'medium',
          pointsAwarded: 1,
          maxPoints: 5,
        });
      } else {
        checklist.push({
          id: 'image_analysis',
          category: 'images',
          title: 'Image Alt Text Diagnostics',
          description: 'Evaluates descriptive alt text and image accessibility.',
          status: 'PASS',
          detectedValue: `${imgOptimized}/${imgTotal} optimized alt tags`,
          explanation: 'All images include descriptive, accessible alt text.',
          recommendation: 'Maintain descriptive alt text for visual assets.',
          impact: 'medium',
          pointsAwarded: 5,
          maxPoints: 5,
        });
      }
    }

    // Check 15: Search Intent (Optional Input)
    if (!searchIntent) {
      checklist.push({
        id: 'search_intent',
        category: 'intent',
        title: 'Search Intent Alignment',
        description: 'Aligns article layout with informational, commercial, or transactional intent.',
        status: 'NOT_CHECKED',
        detectedValue: 'No intent selected',
        explanation: 'Search intent evaluation was not requested.',
        recommendation: 'Select search intent to evaluate alignment against SERP expectations.',
        impact: 'medium',
        pointsAwarded: 0,
        maxPoints: 0,
      });
    } else {
      if (searchIntent === 'informational') {
        checklist.push({
          id: 'search_intent',
          category: 'intent',
          title: 'Search Intent Alignment',
          description: 'Aligns article layout with informational, commercial, or transactional intent.',
          status: 'PASS',
          detectedValue: 'Informational intent',
          explanation: 'Article is well-structured for informational queries with clear educational sections.',
          recommendation: 'Maintain deep educational value.',
          impact: 'medium',
          pointsAwarded: 5,
          maxPoints: 5,
        });
      } else {
        checklist.push({
          id: 'search_intent',
          category: 'intent',
          title: 'Search Intent Alignment',
          description: 'Aligns article layout with informational, commercial, or transactional intent.',
          status: 'PASS',
          detectedValue: `${searchIntent} intent`,
          explanation: `Content satisfies ${searchIntent} search intent criteria.`,
          recommendation: 'Align calls-to-action with user search stage.',
          impact: 'medium',
          pointsAwarded: 5,
          maxPoints: 5,
        });
      }
    }

    // =========================================================================
    // LEGACY RULES (FOR BACKWARD COMPATIBILITY)
    // =========================================================================
    const rules: ContentAnalysisRule[] = [];

    // Rule 1: Content Length
    if (wordCount >= 600) {
      rules.push({
        id: 'content_length',
        category: 'basic',
        title: 'Comprehensive Content Length',
        description: 'Article meets comprehensive depth recommendations (600+ words).',
        status: 'passed',
        pointsAwarded: 10,
        maxPoints: 10,
        feedback: `Total word count is ${wordCount} words.`,
      });
    } else if (wordCount >= 300) {
      rules.push({
        id: 'content_length',
        category: 'basic',
        title: 'Moderate Content Length',
        description: 'Article has solid introductory coverage (300-599 words).',
        status: 'warning',
        pointsAwarded: 6,
        maxPoints: 10,
        feedback: `Current length is ${wordCount} words. Aim for 600+ for deeper coverage.`,
        recommendation: 'Expand key points to provide comprehensive value.',
      });
    } else {
      rules.push({
        id: 'content_length',
        category: 'basic',
        title: 'Thin Content Detected',
        description: 'Content is under 300 words and may be flagged as thin content.',
        status: 'failed',
        pointsAwarded: 2,
        maxPoints: 10,
        feedback: `Current length is only ${wordCount} words.`,
        recommendation: 'Add in-depth explanations to exceed the 300-word threshold.',
      });
    }

    // Rule 2: Keyword in Title
    const titleToCheck = title || metaTitle;
    if (titleToCheck && keyword && titleToCheck.toLowerCase().includes(keyword)) {
      rules.push({
        id: 'keyword_in_title',
        category: 'basic',
        title: 'Focus Keyword in Title',
        description: 'Target keyword is prominently included in the headline.',
        status: 'passed',
        pointsAwarded: 10,
        maxPoints: 10,
        feedback: 'Keyword found in title.',
      });
    } else {
      rules.push({
        id: 'keyword_in_title',
        category: 'basic',
        title: 'Focus Keyword Missing from Title',
        description: 'Title should contain the focus keyword.',
        status: 'failed',
        pointsAwarded: 0,
        maxPoints: 10,
        feedback: 'Target keyword not found in title.',
        recommendation: 'Include target keyword in title.',
      });
    }

    // Rule 3: Keyword in Intro
    if (keywordInIntro) {
      rules.push({
        id: 'keyword_intro',
        category: 'basic',
        title: 'Focus Keyword in Introduction',
        description: 'Focus keyword appears in first 100 words.',
        status: 'passed',
        pointsAwarded: 10,
        maxPoints: 10,
        feedback: 'Keyword placed naturally in introductory text.',
      });
    } else {
      rules.push({
        id: 'keyword_intro',
        category: 'basic',
        title: 'Focus Keyword Missing from Intro',
        description: 'Keyword was not detected in first 100 words.',
        status: 'failed',
        pointsAwarded: 0,
        maxPoints: 10,
        feedback: 'Add keyword to introduction.',
        recommendation: 'Hook readers by including focus keyword in opening paragraph.',
      });
    }

    // Rule 4: Keyword Density
    if (keywordDensity >= 0.8 && keywordDensity <= 3.5) {
      rules.push({
        id: 'keyword_density',
        category: 'basic',
        title: 'Optimal Keyword Frequency',
        description: `Natural density of ${keywordDensity}%.`,
        status: 'passed',
        pointsAwarded: 10,
        maxPoints: 10,
        feedback: 'Keyword appears at a natural, non-stuffed cadence.',
      });
    } else if (keywordDensity > 3.5 && wordCount >= 100) {
      rules.push({
        id: 'keyword_density',
        category: 'basic',
        title: 'High Keyword Density',
        description: `Density is ${keywordDensity}%. May trigger keyword stuffing filters.`,
        status: 'warning',
        pointsAwarded: 4,
        maxPoints: 10,
        feedback: 'Reduce repetitive keyword phrasing.',
      });
    } else {
      rules.push({
        id: 'keyword_density',
        category: 'basic',
        title: 'Keyword Density',
        description: `Density is ${keywordDensity}%.`,
        status: keywordCount > 0 ? 'passed' : 'warning',
        pointsAwarded: keywordCount > 0 ? 8 : 4,
        maxPoints: 10,
        feedback: 'Keyword density is within acceptable range.',
      });
    }

    // Rule 5: Paragraph Length
    if (longParagraphs.length === 0) {
      rules.push({
        id: 'paragraph_length',
        category: 'readability',
        title: 'Scannable Paragraph Lengths',
        description: 'All paragraphs are under 80 words for mobile readability.',
        status: 'passed',
        pointsAwarded: 10,
        maxPoints: 10,
        feedback: 'Great mobile scannability.',
      });
    } else {
      rules.push({
        id: 'paragraph_length',
        category: 'readability',
        title: 'Long Paragraphs Detected',
        description: `${longParagraphs.length} paragraphs exceed 80 words.`,
        status: 'warning',
        pointsAwarded: 5,
        maxPoints: 10,
        feedback: 'Split long paragraphs for mobile users.',
        recommendation: 'Break up dense paragraphs into shorter blocks.',
      });
    }

    // =========================================================================
    // DETERMINISTIC SCORING (EXCLUDING NOT_CHECKED ITEMS FROM DENOMINATOR)
    // =========================================================================
    const evaluatedItems = checklist.filter((item) => item.status !== 'NOT_CHECKED');
    const totalEarned = evaluatedItems.reduce((acc, item) => acc + item.pointsAwarded, 0);
    const totalMax = evaluatedItems.reduce((acc, item) => acc + item.maxPoints, 0);

    const finalScore = totalMax > 0 ? Math.min(100, Math.max(0, Math.round((totalEarned / totalMax) * 100))) : 0;

    let scoreCategory: 'Strong' | 'Needs Improvement' | 'Weak' = 'Weak';
    if (finalScore >= 80) scoreCategory = 'Strong';
    else if (finalScore >= 50) scoreCategory = 'Needs Improvement';

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (finalScore >= 92) grade = 'A+';
    else if (finalScore >= 85) grade = 'A';
    else if (finalScore >= 75) grade = 'B';
    else if (finalScore >= 65) grade = 'C';
    else if (finalScore >= 50) grade = 'D';

    const passedCount = checklist.filter((r) => r.status === 'PASS').length;
    const warningCount = checklist.filter((r) => r.status === 'WARNING').length;
    const failedCount = checklist.filter((r) => r.status === 'FAIL').length;
    const notCheckedCount = checklist.filter((r) => r.status === 'NOT_CHECKED').length;

    const recommendations: string[] = [];
    checklist
      .filter((r) => r.status !== 'PASS' && r.status !== 'NOT_CHECKED' && r.recommendation)
      .forEach((r) => {
        if (r.recommendation) recommendations.push(r.recommendation);
      });

    return {
      score: finalScore,
      grade,
      scoreCategory,
      metrics: {
        wordCount,
        characterCount,
        sentenceCount,
        paragraphCount,
        longParagraphsCount: longParagraphs.length,
        paragraphs: {
          total: paragraphCount,
          longForMobile: longParagraphs.length,
        },
        keywordCount,
        keywordDensity,
        readingEaseScore: fleschScore,
        readingEaseLabel,
        avgWordsPerSentence,
        headings: {
          total: parsedHeadings.length,
          h1: h1Count,
          h2: h2Count,
          h3: h3Count,
          hierarchyIssues,
        },
        readability: {
          longSentenceCount,
          repeatedPhrasesCount,
        },
        links: {
          total: linkTotal,
          empty: linkEmpty,
          internal: linkInternal,
          external: linkExternal,
        },
        images: {
          total: imgTotal,
          emptyAlt: imgEmptyAlt,
          genericAlt: imgGenericAlt,
          optimized: imgOptimized,
        },
      },
      rules,
      checklist,
      longParagraphs,
      issuesSummary: {
        passed: passedCount,
        warnings: warningCount,
        failed: failedCount,
        notChecked: notCheckedCount,
      },
      recommendations,
      analyzedKeyword: keyword,
      analyzedAt: new Date().toISOString(),
    };
  }
}

export const contentAnalyzerService = new ContentAnalyzerService();
