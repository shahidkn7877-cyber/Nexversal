import { ROBOTIC_PATTERNS as BASE_ROBOTIC_PATTERNS } from './content-analyzer.service';
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

export interface DialectDetectionResult {
  detected: 'US' | 'UK' | 'mixed' | 'neutral';
  usCount: number;
  ukCount: number;
  confidence: number;
  recommendedTarget: 'US' | 'UK';
}

export interface DialectAdaptResult {
  proposedContent: string;
  changeCount: number;
  changes: Array<{ from: string; to: string }>;
  sourceVariant: 'US' | 'UK';
  targetVariant: 'US' | 'UK';
}

// Common English typos and misspellings
const COMMON_TYPOS: Record<string, string> = {
  teh: 'the',
  recieve: 'receive',
  recieved: 'received',
  recieving: 'receiving',
  seperate: 'separate',
  seperated: 'separated',
  seperating: 'separating',
  occured: 'occurred',
  occuring: 'occurring',
  untill: 'until',
  accomodate: 'accommodate',
  definately: 'definitely',
  goverment: 'government',
  tommorrow: 'tomorrow',
  beleive: 'believe',
  beleived: 'believed',
  truely: 'truly',
  calender: 'calendar',
  collegue: 'colleague',
  collegues: 'colleagues',
  independant: 'independent',
  wierd: 'weird',
  peice: 'piece',
  peices: 'pieces',
  acheive: 'achieve',
  acheived: 'achieved',
  acheiving: 'achieving',
  alot: 'a lot',
  reponsible: 'responsible',
  enviroment: 'environment',
  neccessary: 'necessary',
  unneccessary: 'unnecessary',
};

// Expanded list of formulaic clichés and filler phrases
const EXTENDED_ROBOTIC_PATTERNS: Array<{ phrase: string; category: string; suggestion: string }> = [
  ...BASE_ROBOTIC_PATTERNS,
  { phrase: "in today's digital landscape", category: 'Overused Cliché', suggestion: 'today' },
  { phrase: "in today's fast-paced world", category: 'Overused Cliché', suggestion: 'today' },
  { phrase: "in today's rapidly evolving", category: 'Overused Cliché', suggestion: 'currently' },
  { phrase: 'delve deeper into', category: 'AI Buzzword', suggestion: 'examine' },
  { phrase: 'serves as a testament to', category: 'Formulaic Metaphor', suggestion: 'demonstrates' },
  { phrase: 'a testament to', category: 'Formulaic Metaphor', suggestion: 'evidence of' },
  { phrase: 'plays a pivotal role in', category: 'Cliché Idiom', suggestion: 'is essential to' },
  { phrase: 'plays a pivotal role', category: 'Cliché Idiom', suggestion: 'is essential' },
  { phrase: 'in order to', category: 'Wordy Phrasing', suggestion: 'to' },
  { phrase: 'due to the fact that', category: 'Bloated Transition', suggestion: 'because' },
  { phrase: 'at this point in time', category: 'Wordy Phrasing', suggestion: 'now' },
  { phrase: 'has the capability to', category: 'Passive Phrasing', suggestion: 'can' },
  { phrase: 'a myriad of', category: 'Fluffy Phrasing', suggestion: 'many' },
  { phrase: 'harness the power of', category: 'Marketing Trope', suggestion: 'use' },
  { phrase: 'revolutionize the way', category: 'Hyperbole', suggestion: 'transform how' },
  { phrase: 'it is important to remember that', category: 'Filler Opening', suggestion: 'remember that' },
  { phrase: 'it is paramount to understand that', category: 'Filler Opening', suggestion: 'note that' },
  { phrase: 'it goes without saying that', category: 'Conversational Filler', suggestion: 'clearly,' },
  { phrase: 'needless to say,', category: 'Conversational Filler', suggestion: 'clearly,' },
  { phrase: 'furthermore, it is worth noting', category: 'Stiff Transition', suggestion: 'also,' },
  { phrase: 'in the final analysis,', category: 'Academic Cliché', suggestion: 'ultimately,' },
  { phrase: 'at the end of the day,', category: 'Conversational Cliché', suggestion: 'ultimately,' },
];

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
  candy: 'sweets',
  flashlight: 'torch',
  flashlights: 'torches',
  trunk: 'boot',
  windshield: 'windscreen',
  hood: 'bonnet',
  freeway: 'motorway',
  highway: 'motorway',
  crosswalk: 'zebra crossing',
  curb: 'kerb',
  curbs: 'kerbs',
  tire: 'tyre',
  tires: 'tyres',
  airplane: 'aeroplane',
  airplanes: 'aeroplanes',
  aluminum: 'aluminium',
  soccer: 'football',
  mailman: 'postman',
  zipcode: 'postcode',
  truck: 'lorry',
  trucks: 'lorries',
};

// Build reverse UK to US map
const UK_TO_US_WORDS: Record<string, string> = {};
for (const [us, uk] of Object.entries(US_TO_UK_WORDS)) {
  UK_TO_US_WORDS[uk] = us;
}

export class EditorActionsService {
  /**
   * Corrects grammar, spelling, punctuation, clarity, and on-page SEO issues.
   * Returns a complete, usable corrected proposal.
   */
  public oneClickSeoFix(params: {
    content: string;
    title?: string;
    slug?: string;
    focusKeyword?: string;
  }): OneClickSeoFixResult {
    const { content, title, slug, focusKeyword } = params;
    const kw = focusKeyword ? focusKeyword.trim() : '';
    const changes: string[] = [];
    let proposedTitle = title ? title.trim() : '';
    let proposedSlug = slug ? slug.trim() : '';
    let proposedContent = content;

    // 1. Optimize Title if keyword is missing
    if (kw) {
      const kwLower = kw.toLowerCase();
      if (!proposedTitle) {
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

    // 4. Clean up Punctuation and Spacing
    let punctuationFixCount = 0;

    // Fix double spaces (except markdown line breaks)
    proposedContent = proposedContent.replace(/([^\n\S]){2,}/g, (_match, _char, offset, str) => {
      // Don't modify code blocks
      const before = str.slice(0, offset);
      if ((before.match(/```/g) || []).length % 2 === 1) return _match;
      punctuationFixCount++;
      return ' ';
    });

    // Fix space before punctuation (e.g., "word ." -> "word.")
    proposedContent = proposedContent.replace(/([a-zA-Z0-9])\s+([.,;:!?])/g, (_match, word, punct) => {
      punctuationFixCount++;
      return `${word}${punct}`;
    });

    // Fix missing space after sentence-ending punctuation (e.g., "sentence.another" -> "sentence. another")
    proposedContent = proposedContent.replace(/([.!?])([a-zA-Z])/g, (_match, punct, letter, offset, str) => {
      const before = str.slice(0, offset);
      if (before.match(/https?:\/\/[^\s]+$/)) return _match;
      if (before.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$/)) return _match;
      punctuationFixCount++;
      return `${punct} ${letter}`;
    });

    // Fix duplicate punctuation (e.g. ",," -> ",")
    proposedContent = proposedContent.replace(/,{2,}/g, () => {
      punctuationFixCount++;
      return ',';
    });
    proposedContent = proposedContent.replace(/;{2,}/g, () => {
      punctuationFixCount++;
      return ';';
    });
    proposedContent = proposedContent.replace(/!{2,}/g, () => {
      punctuationFixCount++;
      return '!';
    });

    // Capitalize first letter of paragraph / document
    proposedContent = proposedContent.replace(/(^|\n\s*\n\s*)([a-z])/g, (_match, prefix, letter) => {
      punctuationFixCount++;
      return `${prefix}${letter.toUpperCase()}`;
    });

    // Capitalize sentence start after period + space
    proposedContent = proposedContent.replace(/(?<=[.!?]\s+)([a-z])/g, (match, letter, offset, str) => {
      // Avoid capitalizing inside code blocks or URLs
      const before = str.slice(0, offset);
      if ((before.match(/```/g) || []).length % 2 === 1) return match;
      if (before.match(/https?:\/\/[^\s]+$/)) return match;
      punctuationFixCount++;
      return letter.toUpperCase();
    });

    if (punctuationFixCount > 0) {
      changes.push(`Cleaned up ${punctuationFixCount} punctuation and capitalization formatting issue(s).`);
    }

    // 5. Fix Common Spelling Typos
    let typoCount = 0;
    for (const [typo, correction] of Object.entries(COMMON_TYPOS)) {
      const regex = new RegExp(`\\b${typo}\\b`, 'gi');
      if (regex.test(proposedContent)) {
        proposedContent = proposedContent.replace(regex, (match) => {
          typoCount++;
          const isCapital = match[0] === match[0].toUpperCase();
          return isCapital
            ? correction.charAt(0).toUpperCase() + correction.slice(1)
            : correction;
        });
      }
    }
    if (typoCount > 0) {
      changes.push(`Corrected ${typoCount} common spelling error(s).`);
    }

    // 6. Split bloated paragraphs exceeding 80 words for mobile scannability
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
        !trimmedPara.startsWith('1.') &&
        !trimmedPara.startsWith('>')
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

    // 7. Fill empty image alt tags
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

    // 8. Clean Robotic Clichés
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
   * Generates or optimizes headings for logical hierarchy without duplicating existing text.
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

      // 1. Missing H1: Add primary H1 at the very top if no H1 exists
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

      // 3. Inspect long unheaded stretches: If 3 or more consecutive paragraphs have no heading
      const paragraphs = modifiedLines.join('\n').split(/\n\s*\n/);
      const finalParagraphs: string[] = [];
      let unheadedStreak = 0;
      let insertedSectionCount = 0;

      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i].trim();
        if (p.startsWith('#')) {
          unheadedStreak = 0;
          finalParagraphs.push(p);
          continue;
        }

        unheadedStreak++;
        // If 3 paragraphs pass without a heading, insert a derived H2 subheading
        if (unheadedStreak >= 3 && p.length > 60 && !p.startsWith('```') && !p.startsWith('-')) {
          const subHeading = extractHeadingFromSentence(p, kw);
          const headingLine = `## ${subHeading}`;
          // Ensure we don't duplicate existing headings
          const alreadyExists = existingHeadings.some(
            (h) => h.text.toLowerCase() === subHeading.toLowerCase()
          );
          if (!alreadyExists) {
            finalParagraphs.push(headingLine);
            generatedHeadings.push(`Added section subheading: ${headingLine}`);
            hasModifications = true;
            insertedSectionCount++;
            unheadedStreak = 1;
          }
        }
        finalParagraphs.push(p);
      }

      if (insertedSectionCount > 0) {
        modifiedLines = finalParagraphs.join('\n\n').split('\n');
      }

      // If no modifications were needed
      if (!hasModifications) {
        return {
          proposedContent: content,
          generatedHeadings: [
            `Preserved all ${existingHeadings.length} existing headings intact. Structure is already well-organized.`,
          ],
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

    // Add contextual H2 subheadings derived from the first sentence of sections
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

    const sortedPatterns = [...EXTENDED_ROBOTIC_PATTERNS].sort(
      (a, b) => b.phrase.length - a.phrase.length
    );

    for (const pat of sortedPatterns) {
      // Match whole word boundary where appropriate
      const escaped = pat.phrase.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const regex = new RegExp(`(?<![\\w])${escaped}(?![\\w])`, 'gi');

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
   * Analyzes text to detect likely dialect variant (US vs UK English).
   */
  public detectDialect(content: string): DialectDetectionResult {
    if (!content || !content.trim()) {
      return { detected: 'neutral', usCount: 0, ukCount: 0, confidence: 0, recommendedTarget: 'UK' };
    }

    const text = content.toLowerCase();
    let usCount = 0;
    let ukCount = 0;

    // Check vocabulary counts
    for (const usWord of Object.keys(US_TO_UK_WORDS)) {
      const regex = new RegExp(`\\b${usWord}\\b`, 'g');
      const matches = text.match(regex);
      if (matches) usCount += matches.length;
    }

    for (const ukWord of Object.keys(UK_TO_US_WORDS)) {
      const regex = new RegExp(`\\b${ukWord}\\b`, 'g');
      const matches = text.match(regex);
      if (matches) ukCount += matches.length;
    }

    // Check spelling patterns: -ize vs -ise
    const izeMatches = text.match(/\b[a-z]{3,}ize(s|d|r|rs|ment|ments|tion|tions|ing)?\b/g);
    if (izeMatches) usCount += izeMatches.length;

    const iseMatches = text.match(/\b[a-z]{3,}ise(s|d|r|rs|ment|ments|tion|tions|ing)?\b/g);
    if (iseMatches) ukCount += iseMatches.length;

    // Check -or vs -our
    const orMatches = text.match(/\b(color|behavior|flavor|honor|labor|neighbor|rumor|harbor)\b/g);
    if (orMatches) usCount += orMatches.length;

    const ourMatches = text.match(/\b(colour|behaviour|flavour|honour|labour|neighbour|rumour|harbour)\b/g);
    if (ourMatches) ukCount += ourMatches.length;

    // Check -er vs -re
    const erMatches = text.match(/\b(center|theater|meter|fiber|liter)\b/g);
    if (erMatches) usCount += erMatches.length;

    const reMatches = text.match(/\b(centre|theatre|metre|fibre|litre)\b/g);
    if (reMatches) ukCount += reMatches.length;

    const total = usCount + ukCount;
    if (total === 0) {
      return { detected: 'neutral', usCount: 0, ukCount: 0, confidence: 0, recommendedTarget: 'UK' };
    }

    const ratio = Math.max(usCount, ukCount) / total;
    const confidence = Math.round(ratio * 100);

    if (usCount > ukCount) {
      return {
        detected: usCount >= ukCount * 2 ? 'US' : 'mixed',
        usCount,
        ukCount,
        confidence,
        recommendedTarget: 'UK',
      };
    } else if (ukCount > usCount) {
      return {
        detected: ukCount >= usCount * 2 ? 'UK' : 'mixed',
        usCount,
        ukCount,
        confidence,
        recommendedTarget: 'US',
      };
    }

    return { detected: 'mixed', usCount, ukCount, confidence: 50, recommendedTarget: 'UK' };
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
    const targetVariant =
      typeof inputOrContent === 'string' ? targetVariantParam || 'UK' : inputOrContent.targetVariant;
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

      // 2. Spelling: -ization to -isation and -ize to -ise
      proposed = proposed.replace(
        /\b([a-z]{3,})ization(s)?\b/gi,
        (match, stem, suffix = '') => {
          const replacement = `${stem}isation${suffix}`;
          changes.push({ from: match, to: replacement });
          return replacement;
        }
      );

      proposed = proposed.replace(
        /\b([a-z]{3,})ize(s|d|r|rs|ment|ments|able|ing|ings)?\b/gi,
        (match, stem, suffix = '') => {
          // Exclude words that genuinely end in -ize in both dialects (e.g. size, prize, capsize)
          const lowerStem = stem.toLowerCase();
          if (['s', 'pr', 'caps', 'ass'].includes(lowerStem)) return match;
          const replacement = `${stem}ise${suffix}`;
          changes.push({ from: match, to: replacement });
          return replacement;
        }
      );

      // 3. Spelling: -yze to -yse (analyze -> analyse)
      proposed = proposed.replace(
        /\b([a-z]{2,})yze(s|d|r|rs|ing|ings)?\b/gi,
        (match, stem, suffix = '') => {
          const replacement = `${stem}yse${suffix}`;
          changes.push({ from: match, to: replacement });
          return replacement;
        }
      );

      // 4. Spelling: -or to -our (color -> colour, behavior -> behaviour, humor -> humour)
      const orWords = [
        'color',
        'behavior',
        'favor',
        'honor',
        'humor',
        'labor',
        'neighbor',
        'flavor',
        'rumor',
        'harbor',
        'glamor',
        'odor',
        'vigor',
        'splendor',
      ];
      for (const word of orWords) {
        const regex = new RegExp(`\\b${word}(s|ed|ing|ful|less)?\\b`, 'gi');
        if (regex.test(proposed)) {
          proposed = proposed.replace(regex, (match) => {
            const ourWord = word.replace(/or$/, 'our');
            const replacement = match.toLowerCase().replace(word, ourWord);
            const formatted =
              match[0] === match[0].toUpperCase()
                ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
                : replacement;
            changes.push({ from: match, to: formatted });
            return formatted;
          });
        }
      }

      // 5. Spelling: -center/-theater to -centre/-theatre
      const erWords: Record<string, string> = {
        center: 'centre',
        theater: 'theatre',
        meter: 'metre',
        fiber: 'fibre',
        liter: 'litre',
      };
      for (const [us, uk] of Object.entries(erWords)) {
        const regex = new RegExp(`\\b${us}(s)?\\b`, 'gi');
        if (regex.test(proposed)) {
          proposed = proposed.replace(regex, (match, plural = '') => {
            const repl = `${uk}${plural}`;
            const formatted =
              match[0] === match[0].toUpperCase()
                ? repl.charAt(0).toUpperCase() + repl.slice(1)
                : repl;
            changes.push({ from: match, to: formatted });
            return formatted;
          });
        }
      }

      // 6. Spelling: -ense to -ence (defense -> defence, offense -> offence, pretense -> pretence)
      const enseWords: Record<string, string> = {
        defense: 'defence',
        offense: 'offence',
        pretense: 'pretence',
      };
      for (const [us, uk] of Object.entries(enseWords)) {
        const regex = new RegExp(`\\b${us}(s)?\\b`, 'gi');
        if (regex.test(proposed)) {
          proposed = proposed.replace(regex, (match, plural = '') => {
            const repl = `${uk}${plural}`;
            const formatted =
              match[0] === match[0].toUpperCase()
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

      // 2. Spelling: -isation to -ization and -ise to -ize
      proposed = proposed.replace(
        /\b([a-z]{3,})isation(s)?\b/gi,
        (match, stem, suffix = '') => {
          const replacement = `${stem}ization${suffix}`;
          changes.push({ from: match, to: replacement });
          return replacement;
        }
      );

      proposed = proposed.replace(
        /\b([a-z]{3,})ise(s|d|r|rs|ment|ments|able|ing|ings)?\b/gi,
        (match, stem, suffix = '') => {
          const lowerStem = stem.toLowerCase();
          // Words that stay -ise in US English
          if (['prom', 'adv', 'surpr', 'exerc', 'enterpr', 'superv', 'prais'].includes(lowerStem))
            return match;
          const replacement = `${stem}ize${suffix}`;
          changes.push({ from: match, to: replacement });
          return replacement;
        }
      );

      // 3. Spelling: -yse to -yze (analyse -> analyze)
      proposed = proposed.replace(
        /\b([a-z]{2,})yse(s|d|r|rs|ing|ings)?\b/gi,
        (match, stem, suffix = '') => {
          const replacement = `${stem}yze${suffix}`;
          changes.push({ from: match, to: replacement });
          return replacement;
        }
      );

      // 4. Spelling: -our to -or (colour -> color, humour -> humor)
      const ourWords = [
        'colour',
        'behaviour',
        'favour',
        'honour',
        'humour',
        'labour',
        'neighbour',
        'flavour',
        'rumour',
        'harbour',
        'glamour',
        'odour',
        'vigour',
        'splendour',
      ];
      for (const word of ourWords) {
        const regex = new RegExp(`\\b${word}(s|ed|ing|ful|less)?\\b`, 'gi');
        if (regex.test(proposed)) {
          proposed = proposed.replace(regex, (match) => {
            const orWord = word.replace(/our$/, 'or');
            const replacement = match.toLowerCase().replace(word, orWord);
            const formatted =
              match[0] === match[0].toUpperCase()
                ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
                : replacement;
            changes.push({ from: match, to: formatted });
            return formatted;
          });
        }
      }

      // 5. Spelling: -centre/-theatre to -center/-theater
      const reWords: Record<string, string> = {
        centre: 'center',
        theatre: 'theater',
        metre: 'meter',
        fibre: 'fiber',
        litre: 'liter',
      };
      for (const [uk, us] of Object.entries(reWords)) {
        const regex = new RegExp(`\\b${uk}(s)?\\b`, 'gi');
        if (regex.test(proposed)) {
          proposed = proposed.replace(regex, (match, plural = '') => {
            const repl = `${us}${plural}`;
            const formatted =
              match[0] === match[0].toUpperCase()
                ? repl.charAt(0).toUpperCase() + repl.slice(1)
                : repl;
            changes.push({ from: match, to: formatted });
            return formatted;
          });
        }
      }

      // 6. Spelling: -ence to -ense (defence -> defense)
      const enceWords: Record<string, string> = {
        defence: 'defense',
        offence: 'offense',
        pretence: 'pretense',
      };
      for (const [uk, us] of Object.entries(enceWords)) {
        const regex = new RegExp(`\\b${uk}(s)?\\b`, 'gi');
        if (regex.test(proposed)) {
          proposed = proposed.replace(regex, (match, plural = '') => {
            const repl = `${us}${plural}`;
            const formatted =
              match[0] === match[0].toUpperCase()
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
