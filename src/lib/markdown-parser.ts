/**
 * Robust, deterministic Markdown & HTML parser utilities for Content Analyzer.
 * Preserves heading hierarchy, line breaks, formatting, and prevents content flattening.
 */

export interface ParsedHeading {
  level: number;
  text: string;
  raw: string;
  lineIndex: number;
}

export interface MarkdownBlock {
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'paragraph' | 'list' | 'quote' | 'hr';
  level?: number;
  text: string;
  raw: string;
  items?: string[];
  ordered?: boolean;
}

/**
 * Converts rich HTML (from clipboard or web paste) into clean Markdown.
 * Preserves headings, paragraphs, lists, links, images, emphasis, and blockquotes.
 */
export function htmlToMarkdown(html: string): string {
  if (!html || typeof html !== 'string') return '';

  // Quick sanity check: if no tags, return trimmed text
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html;
  }

  // Use DOMParser in browser if available
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const body = doc.body;

      // Check if body contains semantic tags
      const hasHeadings = Boolean(body.querySelector('h1, h2, h3, h4, h5, h6'));
      const hasStructure = Boolean(body.querySelector('p, ul, ol, li, a, img, blockquote'));

      if (!hasHeadings && !hasStructure) {
        // Plain text wrapped in div/span
        return body.textContent || '';
      }

      const processNode = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent || '';
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
          return '';
        }

        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const innerText = Array.from(el.childNodes).map(processNode).join('');

        switch (tag) {
          case 'h1':
            return `\n\n# ${innerText.trim()}\n\n`;
          case 'h2':
            return `\n\n## ${innerText.trim()}\n\n`;
          case 'h3':
            return `\n\n### ${innerText.trim()}\n\n`;
          case 'h4':
            return `\n\n#### ${innerText.trim()}\n\n`;
          case 'h5':
            return `\n\n##### ${innerText.trim()}\n\n`;
          case 'h6':
            return `\n\n###### ${innerText.trim()}\n\n`;
          case 'p':
            return `\n\n${innerText.trim()}\n\n`;
          case 'br':
            return '\n';
          case 'hr':
            return '\n\n---\n\n';
          case 'strong':
          case 'b':
            return `**${innerText.trim()}**`;
          case 'em':
          case 'i':
            return `*${innerText.trim()}*`;
          case 'a': {
            const href = el.getAttribute('href') || '';
            const linkText = innerText.trim() || href;
            return href ? `[${linkText}](${href})` : linkText;
          }
          case 'img': {
            const src = el.getAttribute('src') || '';
            const alt = el.getAttribute('alt') || '';
            return src ? `![${alt}](${src})` : '';
          }
          case 'ul': {
            const items = Array.from(el.querySelectorAll(':scope > li'))
              .map((li) => `- ${Array.from(li.childNodes).map(processNode).join('').trim()}`)
              .join('\n');
            return `\n\n${items}\n\n`;
          }
          case 'ol': {
            const items = Array.from(el.querySelectorAll(':scope > li'))
              .map((li, idx) => `${idx + 1}. ${Array.from(li.childNodes).map(processNode).join('').trim()}`)
              .join('\n');
            return `\n\n${items}\n\n`;
          }
          case 'blockquote':
            return `\n\n> ${innerText.trim()}\n\n`;
          case 'div':
          case 'section':
          case 'article':
            return `\n${innerText}\n`;
          default:
            return innerText;
        }
      };

      const md = processNode(body);
      // Normalize excessive empty lines to double newlines
      return md
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    } catch {
      // Fallback regex if DOMParser fails
    }
  }

  // Regex-based fallback for server or environments without DOMParser
  return html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n')
    .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n\n##### $1\n\n')
    .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n\n###### $1\n\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n\n> $1\n\n')
    .replace(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img\s+[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)')
    .replace(/<img\s+[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*>/gi, '![$1]($2)')
    .replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**')
    .replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n\n---\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts all headings from markdown or HTML content with level, text, and line index.
 */
export function extractHeadings(content: string): ParsedHeading[] {
  if (!content) return [];
  const headings: ParsedHeading[] = [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Markdown headings: # H1, ## H2, or empty ##
    const mdMatch = line.match(/^(#{1,6})(?:\s+(.*))?$/);
    if (mdMatch) {
      headings.push({
        level: mdMatch[1].length,
        text: (mdMatch[2] || '').trim(),
        raw: line,
        lineIndex: i,
      });
      continue;
    }

    // HTML headings: <h1>H1</h1>, <h2>H2</h2>, etc.
    const htmlMatch = line.match(/^<h([1-6])[^>]*>(.*?)<\/h\1>$/i);
    if (htmlMatch) {
      headings.push({
        level: parseInt(htmlMatch[1], 10),
        text: htmlMatch[2].replace(/<[^>]+>/g, '').trim(),
        raw: line,
        lineIndex: i,
      });
    }
  }

  return headings;
}

/**
 * Parses markdown text into structured blocks for rich rendering.
 * Properly separates headings from paragraphs even when single-spaced.
 */
export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  if (!content) return [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ').trim();
      if (text) {
        blocks.push({
          type: 'paragraph',
          text,
          raw: currentParagraph.join('\n'),
        });
      }
      currentParagraph = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // Check for headings: # H1, ## H2, etc.
    const mdHeading = trimmed.match(/^(#{1,6})(?:\s+(.*))?$/);
    if (mdHeading) {
      flushParagraph();
      const level = mdHeading[1].length;
      const type = `h${level}` as MarkdownBlock['type'];
      blocks.push({
        type,
        level,
        text: (mdHeading[2] || '').trim(),
        raw: rawLine,
      });
      continue;
    }

    // Check for HTML headings: <h1-6>
    const htmlHeading = trimmed.match(/^<h([1-6])[^>]*>(.*?)<\/h\1>$/i);
    if (htmlHeading) {
      flushParagraph();
      const level = parseInt(htmlHeading[1], 10);
      const type = `h${level}` as MarkdownBlock['type'];
      blocks.push({
        type,
        level,
        text: htmlHeading[2].replace(/<[^>]+>/g, '').trim(),
        raw: rawLine,
      });
      continue;
    }

    // Check for Horizontal Rule
    if (/^---+$|^\*\*\*+$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'hr', text: '---', raw: rawLine });
      continue;
    }

    // Check for Blockquote
    if (trimmed.startsWith('>')) {
      flushParagraph();
      blocks.push({
        type: 'quote',
        text: trimmed.replace(/^>\s*/, ''),
        raw: rawLine,
      });
      continue;
    }

    // Check for List items
    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      const ordered = /^\d+\.\s+/.test(trimmed);
      const itemText = trimmed.replace(/^[-*]\s+|\d+\.\s+/, '');
      // Check if last block was a list
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock && lastBlock.type === 'list' && lastBlock.ordered === ordered && lastBlock.items) {
        lastBlock.items.push(itemText);
        lastBlock.raw += '\n' + rawLine;
      } else {
        blocks.push({
          type: 'list',
          text: itemText,
          items: [itemText],
          ordered,
          raw: rawLine,
        });
      }
      continue;
    }

    // Regular paragraph line
    currentParagraph.push(trimmed);
  }

  flushParagraph();
  return blocks;
}

/**
 * Derives a clean, topic-focused heading directly from the first sentence of an article section.
 * Never uses static generic templates like "Key Benefits" or "Best Practices".
 */
export function extractHeadingFromSentence(sentence: string, focusKeyword?: string): string {
  if (!sentence) return focusKeyword ? `${focusKeyword} Overview` : 'Section Overview';

  // Extract clean first sentence without markdown links or symbols
  const clean = sentence
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*`_~]/g, '')
    .split(/[.!?\n]/)[0]
    .replace(/^(first|second|third|finally|moreover|furthermore|in addition|additionally|also|however|then|for example|as a result|next|in conclusion),?\s+/i, '')
    .trim();

  const words = clean.split(/\s+/).filter(Boolean).slice(0, 7);
  if (words.length === 0) return focusKeyword ? `${focusKeyword} Topic` : 'Core Section';

  // Title case the words nicely
  const titleCased = words
    .map((w, idx) => {
      const stripped = w.replace(/[^a-zA-Z0-9-]/g, '');
      const lower = stripped.toLowerCase();
      if (idx > 0 && ['and', 'or', 'for', 'to', 'in', 'of', 'on', 'with', 'the', 'a', 'an'].includes(lower)) {
        return lower;
      }
      return stripped.charAt(0).toUpperCase() + stripped.slice(1).toLowerCase();
    })
    .join(' ');

  return titleCased;
}
