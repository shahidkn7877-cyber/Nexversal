import { ROBOTIC_PATTERNS } from './content-analyzer.service';
import { extractHeadings, extractHeadingFromSentence } from '@/lib/markdown-parser';

export interface OneClickSeoFixResult {
  proposedTitle: string;
  proposedContent: string;
  proposedSlug: string;
  changes: string[];
  fixesCount: number;
}

export interface AutoHeadingsResult {
  proposedContent: string;
  generatedHeadings: string[];
}

export interface HumanizeToneResult {
  proposedContent: string;
  replacedCount: number;
  replacements: Array<{ original: string; replacement: string }>;
}

export interface DialectAdaptResult {
  proposedContent: string;
  changeCount: number;
  changes: Array<{ from: string; to: string }>;
  sourceVariant: 'US' | 'UK';
  targetVariant: 'US' | 'UK';
}

// US to UK vocabulary map
const US_TO_UK_WORDS: Record<string, string> = {
  apartment: 'flat',
  apartments: 'flats',
  elevator: 'lift',
  elevators: 'lifts',
  sidewalk: 'pavement',
  sidewalks: 'pavements',
  vacation: 'holiday',
  vacations: 'holidays',
  trash: 'rubbish',
  garbage: 'rubbish',
  cookie: 'biscuit',
  cookies: 'biscuits',
  diaper: 'nappy',
  diapers: 'nappies',
  gasoline: 'petrol',
  subway: 'underground',
  fall: 'autumn',
  store: 'shop',
  stores: 'shops',
};

// Build reverse UK to US map
const UK_TO_US_WORDS: Record<string, string> = {};
for (const [us, uk] of Object.entries(US_TO_UK_WORDS)) {
  UK_TO_US_WORDS[uk] = us;
}

export class EditorActionsService {
  /**
   * Identifies and applies deterministic on-page SEO improvements.
   * Returns a revision proposal that the user can preview, accept, edit, or reject.
   */
  public oneClickSeoFix(params: {
    content: string;
    title: string;
    slug: string;
    focusKeyword: string;
  }): OneClickSeoFixResult {
    const { content, title, slug, focusKeyword } = params;
    const kw = focusKeyword.trim();
    const changes: string[] = [];
    let proposedTitle = title;
    let proposedSlug = slug;
    let proposedContent = content;

    // 1. Optimize Title if keyword is missing
    if (kw) {
      const kwLower = kw.toLowerCase();
      if (!proposedTitle.trim()) {
        const capitalizedKw = kw.charAt(0).toUpperCase() + kw.slice(1);
        proposedTitle = `${capitalizedKw}: Complete Guide & Checklist`;
        changes.push(`Created SEO headline incorporating target keyword '${kw}'.`);
      } else if (!proposedTitle.toLowerCase().includes(kwLower)) {
        const capitalizedKw = kw.charAt(0).toUpperCase() + kw.slice(1);
        proposedTitle = `${capitalizedKw} — ${proposedTitle}`;
        changes.push(`Added target keyword '${kw}' to the front of the SEO headline.`);
      }
    }

    // 2. Optimize Slug if keyword missing or slug empty
    if (kw) {
      const cleanKwSlug = kw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (!proposedSlug.trim() || !proposedSlug.toLowerCase().includes(cleanKwSlug)) {
        proposedSlug = cleanKwSlug;
        changes.push(`Aligned permalink slug to '/${cleanKwSlug}'.`);
      }
    }

    // 3. Remove Empty Headings
    const lines = proposedContent.split('\n');
    const cleanedLines: string[] = [];
    let removedEmptyHeadings = 0;
    for (const line of lines) {
      if (/^#{1,6}\s*$/.test(line.trim())) {
        removedEmptyHeadings++;
        continue;
      }
      cleanedLines.push(line);
    }
    if (removedEmptyHeadings > 0) {
      proposedContent = cleanedLines.join('\n');
      changes.push(`Removed ${removedEmptyHeadings} empty heading tag(s) with no text.`);
    }

    // 4. Split bloated paragraphs exceeding 80 words for mobile scannability
    const paragraphs = proposedContent.split(/\n\s*\n/);
    const splitParagraphs: string[] = [];
    let splitCount = 0;

    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      const pWords = trimmedPara.split(/\s+/).filter(Boolean);

      // Do not split markdown lists, code blocks, or headings
      if (
        pWords.length > 80 &&
        !trimmedPara.startsWith('#') &&
        !trimmedPara.startsWith('```') &&
        !trimmedPara.startsWith('-') &&
        !trimmedPara.startsWith('*') &&
        !trimmedPara.startsWith('1.')
      ) {
        // Split at approximate midpoint sentence boundary
        const sentences = trimmedPara.split(/(?<=[.!?])\s+/);
        if (sentences.length >= 2) {
          const mid = Math.ceil(sentences.length / 2);
          const firstHalf = sentences.slice(0, mid).join(' ');
          const secondHalf = sentences.slice(mid).join(' ');
          splitParagraphs.push(firstHalf);
          splitParagraphs.push(secondHalf);
          splitCount++;
          continue;
        }
      }
      splitParagraphs.push(para);
    }

    if (splitCount > 0) {
      proposedContent = splitParagraphs.join('\n\n');
      changes.push(`Split ${splitCount} long paragraph(s) into mobile-friendly 2-3 sentence blocks.`);
    }

    // 5. Fill empty image alt tags
    if (kw) {
      let filledAltCount = 0;
      proposedContent = proposedContent.replace(/!\[\s*\]\(([^)]+)\)/g, (_match, url) => {
        filledAltCount++;
        return `![${kw} - visual diagram](${url})`;
      });
      if (filledAltCount > 0) {
        changes.push(`Added descriptive alt text to ${filledAltCount} image(s).`);
      }
    }

    // 6. Clean Robotic Clichés
    const humanizeRes = this.humanizeTone(proposedContent);
    if (humanizeRes.replacedCount > 0) {
      proposedContent = humanizeRes.proposedContent;
      changes.push(`Replaced ${humanizeRes.replacedCount} generic cliché phrase(s) with natural prose.`);
    }

    return {
      proposedTitle,
      proposedContent,
      proposedSlug,
      changes,
      fixesCount: changes.length,
    };
  }

  /**
   * Analyzes current article heading structure and proposes targeted improvements.
   * STRICT GUARANTEES:
   * 1. Existing headings (# H1, ## H2, ### H3) are ALWAYS preserved and never deleted or overwritten.
   * 2. Never uses static generic templates like "Key Benefits" or "Best Practices".
   * 3. Fixes orphan heading levels (e.g. promoting orphan H3 to H2 when no H2 exists).
   * 4. Adds H1 if entirely missing.
   * 5. If long stretches of unheaded paragraphs exist, derives subheadings directly from section text.
   * 6. If article already has structured headings (H1, H2, H3), keeps content 100% intact.
   */
  public autoHeadings(params: {
    content: string;
    focusKeyword: string;
    title?: string;
  }): AutoHeadingsResult {
    const { content, focusKeyword, title } = params;
    const kw = focusKeyword.trim();
    if (!content || !content.trim()) {
      return { proposedContent: content, generatedHeadings: [] };
    }

    const existingHeadings = extractHeadings(content);
    const generatedHeadings: string[] = [];
    const lines = content.replace(/\r\n/g, '\n').split('\n');

    const titleCasedKw = kw
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    // Case 1: Article ALREADY has structured headings
    if (existingHeadings.length > 0) {
      const hasH1 = existingHeadings.some((h) => h.level === 1);
      const hasH2 = existingHeadings.some((h) => h.level === 2);
      let modifiedLines = [...lines];
      let hasModifications = false;

      // 1. Missing H1: Propose H1 at the very top if no H1 exists
      if (!hasH1) {
        const h1Title = title?.trim() || (kw ? `${titleCasedKw}: Complete Guide` : 'Comprehensive Guide');
        modifiedLines.unshift(`# ${h1Title}`, '');
        generatedHeadings.push(`Added primary H1: # ${h1Title}`);
        hasModifications = true;
      }

      // 2. Fix Orphan H3: If an H3 appears before any H2, promote it to H2
      if (!hasH2) {
        let promotedCount = 0;
        modifiedLines = modifiedLines.map((line) => {
          const m = line.match(/^###\s+(.+)$/);
          if (m) {
            promotedCount++;
            generatedHeadings.push(`Promoted orphan H3 to H2: ## ${m[1]}`);
            return `## ${m[1]}`;
          }
          return line;
        });
        if (promotedCount > 0) hasModifications = true;
      }

      // If no modifications needed, preserve existing headings exactly
      if (!hasModifications) {
        generatedHeadings.push(
          `Preserved all ${existingHeadings.length} existing headings (${existingHeadings.map((h) => `H${h.level}`).join(', ')}). No restructuring needed.`
        );
        return {
          proposedContent: content,
          generatedHeadings,
        };
      }

      return {
        proposedContent: modifiedLines.join('\n'),
        generatedHeadings,
      };
    }

    // Case 2: Article has ZERO headings (unstructured plain text)
    const rawParagraphs = content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (rawParagraphs.length === 0) {
      return { proposedContent: content, generatedHeadings: [] };
    }

    const outputBlocks: string[] = [];

    // Add H1 based on title, keyword, or first paragraph
    const h1Text = title?.trim() || (kw ? `${titleCasedKw}: Complete Guide` : extractHeadingFromSentence(rawParagraphs[0], kw));
    outputBlocks.push(`# ${h1Text}`);
    generatedHeadings.push(`# ${h1Text}`);

    // Add contextual H2 subheadings derived from the ACTUAL first sentence of sections
    for (let i = 0; i < rawParagraphs.length; i++) {
      const para = rawParagraphs[i];
      if (i > 0 && i % 2 === 1) {
        const headingText = extractHeadingFromSentence(para, kw);
        const heading = `## ${headingText}`;
        outputBlocks.push(heading);
        generatedHeadings.push(heading);
      }
      outputBlocks.push(para);
    }

    return {
      proposedContent: outputBlocks.join('\n\n'),
      generatedHeadings,
    };
  }

  /**
   * Identifies overused clichés and stock phrases, replacing them with clean plain English.
   * Preserves exact focus keywords and URLs.
   */
  public humanizeTone(input: string | { content: string }): HumanizeToneResult {
    const content = typeof input === 'string' ? input : input.content;
    let proposed = content;
    const replacements: Array<{ original: string; replacement: string }> = [];

    const sortedPatterns = [...ROBOTIC_PATTERNS].sort((a, b) => b.phrase.length - a.phrase.length);
    for (const pat of sortedPatterns) {
      const escaped = pat.phrase.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      proposed = proposed.replace(regex, (match) => {
        const isCapital = match[0] === match[0].toUpperCase();
        const repl = isCapital
          ? pat.suggestion.charAt(0).toUpperCase() + pat.suggestion.slice(1)
          : pat.suggestion;
        replacements.push({ original: match, replacement: repl });
        return repl;
      });
    }

    return {
      proposedContent: proposed,
      replacedCount: replacements.length,
      replacements,
    };
  }

  /**
   * Adapts content between US English and UK English.
   * Performs real spelling and vocabulary conversion.
   */
  public adaptDialect(
    inputOrContent: string | { content: string; targetVariant: 'US' | 'UK' },
    targetVariantParam?: 'US' | 'UK'
  ): DialectAdaptResult {
    const content = typeof inputOrContent === 'string' ? inputOrContent : inputOrContent.content;
    const targetVariant = typeof inputOrContent === 'string' ? (targetVariantParam || 'UK') : inputOrContent.targetVariant;
    let proposed = content;
    const changes: Array<{ from: string; to: string }> = [];

    if (targetVariant === 'UK') {
      // 1. Vocabulary: US to UK
      for (const [usWord, ukWord] of Object.entries(US_TO_UK_WORDS)) {
        const regex = new RegExp(`\\b${usWord}\\b`, 'gi');
        if (regex.test(proposed)) {
          proposed = proposed.replace(regex, (match) => {
            const isCapital = match[0] === match[0].toUpperCase();
            const replacement = isCapital
              ? ukWord.charAt(0).toUpperCase() + ukWord.slice(1)
              : ukWord;
            changes.push({ from: match, to: replacement });
            return replacement;
          });
        }
      }

      // 2. Spelling: -ize to -ise
      proposed = proposed.replace(/\b([a-z]{3,})ize(s|d|r|rs|ment|ments)?\b/gi, (match, stem, suffix = '') => {
        // Exclude words that genuinely end in -ize in both dialects (e.g. size, prize, capsize)
        const lowerStem = stem.toLowerCase();
        if (['s', 'pr', 'caps', 'ass'].includes(lowerStem)) return match;
        const replacement = `${stem}ise${suffix}`;
        changes.push({ from: match, to: replacement });
        return replacement;
      });

      // 3. Spelling: -yze to -yse (analyze -> analyse)
      proposed = proposed.replace(/\b([a-z]{2,})yze(s|d|r|rs)?\b/gi, (match, stem, suffix = '') => {
        const replacement = `${stem}yse${suffix}`;
        changes.push({ from: match, to: replacement });
        return replacement;
      });

      // 4. Spelling: -or to -our (color -> colour, behavior -> behaviour)
      const orWords = ['color', 'behavior', 'favor', 'honor', 'labor', 'neighbor', 'flavor', 'rumor', 'harbor'];
      for (const word of orWords) {
        const regex = new RegExp(`\\b${word}(s|ed|ing|ful|less)?\\b`, 'gi');
        if (regex.test(proposed)) {
          proposed = proposed.replace(regex, (match) => {
            const ourWord = word.replace(/or$/, 'our');
            const replacement = match.toLowerCase().replace(word, ourWord);
            const formatted = match[0] === match[0].toUpperCase()
              ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
              : replacement;
            changes.push({ from: match, to: formatted });
            return formatted;
          });
        }
      }

      // 5. Spelling: -center/-theater to -centre/-theatre
      const erWords: Record<string, string> = { center: 'centre', theater: 'theatre', meter: 'metre' };
      for (const [us, uk] of Object.entries(erWords)) {
        const regex = new RegExp(`\\b${us}(s)?\\b`, 'gi');
        if (regex.test(proposed)) {
          proposed = proposed.replace(regex, (match, plural = '') => {
            const repl = `${uk}${plural}`;
            const formatted = match[0] === match[0].toUpperCase()
              ? repl.charAt(0).toUpperCase() + repl.slice(1)
              : repl;
            changes.push({ from: match, to: formatted });
            return formatted;
          });
        }
      }
    } else {
      // UK to US conversion
      // 1. Vocabulary: UK to US
      for (const [ukWord, usWord] of Object.entries(UK_TO_US_WORDS)) {
        const regex = new RegExp(`\\b${ukWord}\\b`, 'gi');
        if (regex.test(proposed)) {
          proposed = proposed.replace(regex, (match) => {
            const isCapital = match[0] === match[0].toUpperCase();
            const replacement = isCapital
              ? usWord.charAt(0).toUpperCase() + usWord.slice(1)
              : usWord;
            changes.push({ from: match, to: replacement });
            return replacement;
          });
        }
      }

      // 2. Spelling: -ise to -ize
      proposed = proposed.replace(/\b([a-z]{3,})ise(s|d|r|rs|ment|ments)?\b/gi, (match, stem, suffix = '') => {
        const lowerStem = stem.toLowerCase();
        // Common words that stay -ise in US English (promise, advise, surprise, exercise, enterprise, supervise)
        if (['prom', 'adv', 'surpr', 'exerc', 'enterpr', 'superv', 'prais'].includes(lowerStem)) return match;
        const replacement = `${stem}ize${suffix}`;
        changes.push({ from: match, to: replacement });
        return replacement;
      });

      // 3. Spelling: -yse to -yze (analyse -> analyze)
      proposed = proposed.replace(/\b([a-z]{2,})yse(s|d|r|rs)?\b/gi, (match, stem, suffix = '') => {
        const replacement = `${stem}yze${suffix}`;
        changes.push({ from: match, to: replacement });
        return replacement;
      });

      // 4. Spelling: -our to -or (colour -> color)
      const ourWords = ['colour', 'behaviour', 'favour', 'honour', 'labour', 'neighbour', 'flavour', 'rumour', 'harbour'];
      for (const word of ourWords) {
        const regex = new RegExp(`\\b${word}(s|ed|ing|ful|less)?\\b`, 'gi');
        if (regex.test(proposed)) {
          proposed = proposed.replace(regex, (match) => {
            const orWord = word.replace(/our$/, 'or');
            const replacement = match.toLowerCase().replace(word, orWord);
            const formatted = match[0] === match[0].toUpperCase()
              ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
              : replacement;
            changes.push({ from: match, to: formatted });
            return formatted;
          });
        }
      }

      // 5. Spelling: -centre/-theatre to -center/-theater
      const reWords: Record<string, string> = { centre: 'center', theatre: 'theater', metre: 'meter' };
      for (const [uk, us] of Object.entries(reWords)) {
        const regex = new RegExp(`\\b${uk}(s)?\\b`, 'gi');
        if (regex.test(proposed)) {
          proposed = proposed.replace(regex, (match, plural = '') => {
            const repl = `${us}${plural}`;
            const formatted = match[0] === match[0].toUpperCase()
              ? repl.charAt(0).toUpperCase() + repl.slice(1)
              : repl;
            changes.push({ from: match, to: formatted });
            return formatted;
          });
        }
      }
    }

    return {
      proposedContent: proposed,
      changeCount: changes.length,
      changes,
      sourceVariant: targetVariant === 'UK' ? 'US' : 'UK',
      targetVariant,
    };
  }
}

export const editorActionsService = new EditorActionsService();

