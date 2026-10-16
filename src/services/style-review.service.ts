export interface StyleFinding {
  id: string;
  passage: string;
  issueType:
    | 'repeated_opening'
    | 'cliche_filler'
    | 'repetitive_transition'
    | 'wordy_phrasing'
    | 'overlong_sentence';
  explanation: string;
  suggestion: string;
  status: 'pending' | 'rewritten' | 'accepted' | 'rejected';
  rewrittenPassage?: string;
}

export interface StyleReviewResult {
  totalFindings: number;
  summary: string;
  findings: StyleFinding[];
}

const CLICHE_PHRASES: Array<{ phrase: string; explanation: string; suggestion: string }> = [
  {
    phrase: 'delve into',
    explanation: 'Overused editorial cliché commonly flagged as formulaic phrasing.',
    suggestion: 'Use "explore", "examine", or "look into" instead.',
  },
  {
    phrase: 'it is important to remember',
    explanation: 'Unnecessary filler opening that adds wordiness before the main point.',
    suggestion: 'State the point directly or use "Remember that".',
  },
  {
    phrase: 'in today\'s digital landscape',
    explanation: 'Generic corporate trope that sounds predictable and dated.',
    suggestion: 'Specify the exact industry context or remove the phrase.',
  },
  {
    phrase: 'in today\'s fast-paced',
    explanation: 'Overused buzzword phrase that weakens natural narrative punch.',
    suggestion: 'State the specific timeline or challenge directly.',
  },
  {
    phrase: 'serves as a testament to',
    explanation: 'Formulaic filler phrase often perceived as boilerplate copy.',
    suggestion: 'Use "demonstrates", "proves", or "shows" instead.',
  },
  {
    phrase: 'plays a pivotal role',
    explanation: 'Cliche idiom that can be phrased more specifically.',
    suggestion: 'Use "is essential to" or describe the exact function.',
  },
  {
    phrase: 'in order to',
    explanation: 'Wordy phrasing that adds unnecessary clutter.',
    suggestion: 'Simplify to "to".',
  },
  {
    phrase: 'due to the fact that',
    explanation: 'Bloated transition phrase.',
    suggestion: 'Simplify to "because" or "since".',
  },
  {
    phrase: 'has the capability to',
    explanation: 'Passive, verbose phrasing.',
    suggestion: 'Simplify to "can".',
  },
  {
    phrase: 'needless to say',
    explanation: 'Conversational filler that undermines the sentence if the point is indeed self-evident.',
    suggestion: 'Remove the phrase and state the point directly.',
  },
];

export class StyleReviewService {
  /**
   * Analyzes an article's actual text to identify formulaic, repetitive, or unnatural passages.
   * Discloses stylistic patterns without making unverified claims of AI authorship.
   */
  public analyzeStyle(content: string): StyleReviewResult {
    if (!content || !content.trim()) {
      return {
        totalFindings: 0,
        summary: 'No article content to review.',
        findings: [],
      };
    }

    const findings: StyleFinding[] = [];
    const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

    let findingCounter = 0;

    // 1. Check for Cliché and Filler Phrases in actual sentences
    for (const para of paragraphs) {
      if (para.startsWith('#')) continue; // Skip headings

      const sentences = para.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);

      for (const sentence of sentences) {
        const sentenceLower = sentence.toLowerCase();

        for (const item of CLICHE_PHRASES) {
          if (sentenceLower.includes(item.phrase)) {
            findingCounter++;
            findings.push({
              id: `finding-${findingCounter}`,
              passage: sentence.trim(),
              issueType: 'cliche_filler',
              explanation: `Contains "${item.phrase}": ${item.explanation}`,
              suggestion: item.suggestion,
              status: 'pending',
            });
            break; // One finding per sentence
          }
        }
      }
    }

    // 2. Check for Repeated Sentence Openings in adjacent sentences
    for (const para of paragraphs) {
      if (para.startsWith('#')) continue;

      const sentences = para.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);

      for (let i = 0; i < sentences.length - 1; i++) {
        const wordsA = sentences[i].trim().split(/\s+/);
        const wordsB = sentences[i + 1].trim().split(/\s+/);

        if (wordsA.length >= 2 && wordsB.length >= 2) {
          const openingA = `${wordsA[0]} ${wordsA[1]}`.toLowerCase();
          const openingB = `${wordsB[0]} ${wordsB[1]}`.toLowerCase();

          if (openingA === openingB && !['in the', 'on the', 'to the'].includes(openingA)) {
            findingCounter++;
            findings.push({
              id: `finding-${findingCounter}`,
              passage: `${sentences[i].trim()} ${sentences[i + 1].trim()}`,
              issueType: 'repeated_opening',
              explanation: `Adjacent sentences start with the identical opening "${openingA}".`,
              suggestion: 'Vary the sentence opening or combine the two statements to improve rhythm.',
              status: 'pending',
            });
          }
        }
      }
    }

    // 3. Check for Overly Long / Run-on Sentences (>35 words without punctuation)
    for (const para of paragraphs) {
      if (para.startsWith('#')) continue;

      const sentences = para.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);

      for (const sentence of sentences) {
        const words = sentence.trim().split(/\s+/);
        if (words.length > 38) {
          // Verify it doesn't already have finding
          const alreadyFlagged = findings.some((f) => f.passage.includes(sentence.trim()));
          if (!alreadyFlagged) {
            findingCounter++;
            findings.push({
              id: `finding-${findingCounter}`,
              passage: sentence.trim(),
              issueType: 'overlong_sentence',
              explanation: `Sentence contains ${words.length} words without breathing pauses, which can strain reader comprehension.`,
              suggestion: 'Split into two focused sentences or trim subordinate clauses.',
              status: 'pending',
            });
          }
        }
      }
    }

    // 4. Check for Repetitive Transitions (e.g. Furthermore, Moreover)
    const transitions = ['furthermore', 'moreover', 'additionally', 'consequently'];
    for (const para of paragraphs) {
      const sentences = para.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
      let prevTransition: string | null = null;

      for (const s of sentences) {
        const firstWord = s.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
        if (transitions.includes(firstWord)) {
          if (prevTransition && prevTransition === firstWord) {
            findingCounter++;
            findings.push({
              id: `finding-${findingCounter}`,
              passage: s.trim(),
              issueType: 'repetitive_transition',
              explanation: `Repeated transition word "${firstWord}" in consecutive statements.`,
              suggestion: 'Use a transitional prepositional phrase or connect ideas directly.',
              status: 'pending',
            });
          }
          prevTransition = firstWord;
        } else {
          prevTransition = null;
        }
      }
    }

    // Deduplicate and limit to top 8 findings to prevent overwhelming user
    const uniqueFindings = findings.slice(0, 8);

    const summary =
      uniqueFindings.length === 0
        ? 'No formulaic or repetitive passages detected. Content reads naturally.'
        : `Identified ${uniqueFindings.length} passage(s) that could be refined for natural human flow and variety.`;

    return {
      totalFindings: uniqueFindings.length,
      summary,
      findings: uniqueFindings,
    };
  }

  /**
   * Deterministically rewrites a flagged passage based on the finding's issueType,
   * providing an immediate high-quality proposal even when external AI is offline.
   */
  public generateFallbackRewrite(finding: StyleFinding): string {
    const passage = finding.passage.trim();
    if (!passage) return passage;

    if (finding.issueType === 'cliche_filler') {
      let rewritten = passage;
      for (const item of CLICHE_PHRASES) {
        const regex = new RegExp(`\\b${item.phrase.replace(/'/g, "['’]")}\\b`, 'gi');
        if (regex.test(rewritten)) {
          if (item.phrase === 'delve into') {
            rewritten = rewritten.replace(regex, 'explore');
          } else if (item.phrase === 'it is important to remember') {
            rewritten = rewritten.replace(regex, 'remember');
          } else if (item.phrase.includes("today's digital landscape")) {
            rewritten = rewritten.replace(regex, 'today');
          } else if (item.phrase.includes("today's fast-paced")) {
            rewritten = rewritten.replace(regex, 'modern');
          } else if (item.phrase === 'serves as a testament to') {
            rewritten = rewritten.replace(regex, 'demonstrates');
          } else if (item.phrase === 'plays a pivotal role') {
            rewritten = rewritten.replace(regex, 'is essential');
          } else if (item.phrase === 'in order to') {
            rewritten = rewritten.replace(regex, 'to');
          } else if (item.phrase === 'due to the fact that') {
            rewritten = rewritten.replace(regex, 'because');
          } else if (item.phrase === 'has the capability to') {
            rewritten = rewritten.replace(regex, 'can');
          } else if (item.phrase === 'needless to say') {
            rewritten = rewritten.replace(regex, 'clearly');
          }
        }
      }
      rewritten = rewritten.replace(/\s{2,}/g, ' ').replace(/\s+([.,;:!?])/g, '$1');
      rewritten = rewritten.charAt(0).toUpperCase() + rewritten.slice(1);
      return rewritten;
    }

    if (finding.issueType === 'repeated_opening') {
      const sentences = passage.split(/(?<=[.!?])\s+/).filter(Boolean);
      if (sentences.length >= 2) {
        const s1 = sentences[0];
        let s2 = sentences[1];
        const words = s2.split(/\s+/);
        if (words.length >= 2) {
          s2 = `Additionally, ${s2.charAt(0).toLowerCase() + s2.slice(1)}`;
          return `${s1} ${s2}`;
        }
      }
      return passage;
    }

    if (finding.issueType === 'repetitive_transition') {
      const m = passage.match(/^([A-Za-z]+),?\s+(.+)$/);
      if (m) {
        const word = m[1].toLowerCase();
        const rest = m[2];
        let replacement = 'In addition,';
        if (word === 'furthermore') replacement = 'Additionally,';
        else if (word === 'moreover') replacement = 'Also,';
        else if (word === 'additionally') replacement = 'Furthermore,';
        return `${replacement} ${rest}`;
      }
      return passage;
    }

    if (finding.issueType === 'overlong_sentence') {
      const words = passage.split(/\s+/);
      if (words.length > 25) {
        const midpoint = Math.floor(words.length / 2);
        let splitIdx = -1;
        for (let i = Math.max(0, midpoint - 6); i <= midpoint + 6 && i < words.length; i++) {
          const w = words[i].toLowerCase().replace(/[^a-z]/g, '');
          if (['and', 'but', 'while', 'because', 'which', 'although'].includes(w)) {
            splitIdx = i;
            break;
          }
        }
        if (splitIdx !== -1) {
          const firstPart = words.slice(0, splitIdx).join(' ').replace(/[,;]$/, '');
          const secondWords = words.slice(splitIdx + 1);
          let secondPart = secondWords.join(' ');
          if (secondPart.length > 0) {
            secondPart = secondPart.charAt(0).toUpperCase() + secondPart.slice(1);
          }
          return `${firstPart}. ${secondPart}`;
        }
      }
      return passage;
    }

    return passage;
  }
}

export const styleReviewService = new StyleReviewService();

