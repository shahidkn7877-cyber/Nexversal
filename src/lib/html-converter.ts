/**
 * Bidirectional conversion between Canonical Markdown and Semantic HTML
 * for Visual Editor, Source View, and Published Preview modes.
 */

/**
 * Strips dangerous executable script tags and attributes to prevent XSS.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return html
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove inline event handlers (onclick, onload, onerror, etc.)
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^>\s]+/gi, '')
    // Remove javascript: pseudo-protocol in href/src
    .replace(/(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '$1="#"')
    // Remove object, embed, iframe tags
    .replace(/<\/?(object|embed|iframe|applet|form|input|button)\b[^>]*>/gi, '');
}

/**
 * Converts Canonical Markdown into semantic HTML for the Visual Editor and Preview.
 * Does NOT emit literal '#', '##', or '###' characters.
 */
export function markdownToVisualHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return '';

  const lines = markdown.split('\n');
  const htmlParts: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let inBlockquote = false;
  let blockquoteLines: string[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      const pText = paragraphLines.join(' ').trim();
      if (pText) {
        htmlParts.push(`<p>${formatInlineMarkdown(pText)}</p>`);
      }
      paragraphLines = [];
    }
  };

  const flushList = () => {
    if (inList) {
      htmlParts.push(`</${inList}>`);
      inList = null;
    }
  };

  const flushBlockquote = () => {
    if (inBlockquote) {
      htmlParts.push(`<blockquote><p>${formatInlineMarkdown(blockquoteLines.join(' '))}</p></blockquote>`);
      inBlockquote = false;
      blockquoteLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line -> boundary
    if (!trimmed) {
      flushParagraph();
      flushList();
      flushBlockquote();
      continue;
    }

    // Heading 1
    const h1Match = trimmed.match(/^#\s+(.+)$/);
    if (h1Match) {
      flushParagraph();
      flushList();
      flushBlockquote();
      htmlParts.push(`<h1>${formatInlineMarkdown(h1Match[1].trim())}</h1>`);
      continue;
    }

    // Heading 2
    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      flushParagraph();
      flushList();
      flushBlockquote();
      htmlParts.push(`<h2>${formatInlineMarkdown(h2Match[1].trim())}</h2>`);
      continue;
    }

    // Heading 3
    const h3Match = trimmed.match(/^###\s+(.+)$/);
    if (h3Match) {
      flushParagraph();
      flushList();
      flushBlockquote();
      htmlParts.push(`<h3>${formatInlineMarkdown(h3Match[1].trim())}</h3>`);
      continue;
    }

    // Heading 4-6
    const h4Match = trimmed.match(/^####\s+(.+)$/);
    if (h4Match) {
      flushParagraph();
      flushList();
      flushBlockquote();
      htmlParts.push(`<h4>${formatInlineMarkdown(h4Match[1].trim())}</h4>`);
      continue;
    }

    // Blockquote
    const quoteMatch = trimmed.match(/^>\s*(.+)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      inBlockquote = true;
      blockquoteLines.push(quoteMatch[1].trim());
      continue;
    } else if (inBlockquote) {
      flushBlockquote();
    }

    // Unordered List
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      flushBlockquote();
      if (inList !== 'ul') {
        flushList();
        htmlParts.push('<ul>');
        inList = 'ul';
      }
      htmlParts.push(`<li>${formatInlineMarkdown(ulMatch[1].trim())}</li>`);
      continue;
    }

    // Ordered List
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      flushBlockquote();
      if (inList !== 'ol') {
        flushList();
        htmlParts.push('<ol>');
        inList = 'ol';
      }
      htmlParts.push(`<li>${formatInlineMarkdown(olMatch[1].trim())}</li>`);
      continue;
    }

    // If we were in a list, close it now that we hit a normal line
    flushList();

    // Image: ![alt](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      flushParagraph();
      htmlParts.push(`<img src="${imgMatch[2]}" alt="${imgMatch[1]}" class="max-w-full rounded-lg" />`);
      continue;
    }

    // Regular paragraph line
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushBlockquote();

  return htmlParts.join('\n');
}

/**
 * Formats inline bold, italic, links, images within text without HTML tags.
 */
function formatInlineMarkdown(text: string): string {
  let formatted = text;

  // Images: ![alt](url)
  formatted = formatted.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="max-w-full rounded-lg" />'
  );

  // Links: [anchor](url)
  formatted = formatted.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Bold: **text** or __text__
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Inline code: `code`
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

  return formatted;
}

/**
 * Converts rich visual editor HTML back to Canonical Markdown.
 * Preserves headings, lists, links, bold, italic, and paragraphs.
 */
export function visualHtmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return '';

  let sanitized = sanitizeHtml(html);

  // Normalize Windows newlines and excess whitespace between tags
  sanitized = sanitized.replace(/\r\n/g, '\n');

  // Replace block tags with markdown equivalents
  // Headings
  sanitized = sanitized.replace(/<h1[^>]*>(.*?)<\/h1>/gi, (_, text) => `\n# ${stripTags(text).trim()}\n`);
  sanitized = sanitized.replace(/<h2[^>]*>(.*?)<\/h2>/gi, (_, text) => `\n## ${stripTags(text).trim()}\n`);
  sanitized = sanitized.replace(/<h3[^>]*>(.*?)<\/h3>/gi, (_, text) => `\n### ${stripTags(text).trim()}\n`);
  sanitized = sanitized.replace(/<h4[^>]*>(.*?)<\/h4>/gi, (_, text) => `\n#### ${stripTags(text).trim()}\n`);

  // Blockquotes
  sanitized = sanitized.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_, content) => {
    const lines = stripTags(content).split('\n').map((l) => l.trim()).filter(Boolean);
    return `\n> ${lines.join(' ')}\n`;
  });

  // Images
  sanitized = sanitized.replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)');
  sanitized = sanitized.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*>/gi, '![$1]($2)');
  sanitized = sanitized.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, '![]($1)');

  // Links
  sanitized = sanitized.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (_, href, text) => {
    return `[${stripTags(text)}](${href})`;
  });

  // Bold & Italic
  sanitized = sanitized.replace(/<(?:strong|b)\b[^>]*>(.*?)<\/(?:strong|b)>/gi, '**$1**');
  sanitized = sanitized.replace(/<(?:em|i)\b[^>]*>(.*?)<\/(?:em|i)>/gi, '*$1*');
  sanitized = sanitized.replace(/<code\b[^>]*>(.*?)<\/code>/gi, '`$1`');

  // List Items
  sanitized = sanitized.replace(/<li[^>]*>(.*?)<\/li>/gi, (_, item) => {
    return `\n- ${item.trim()}\n`;
  });

  // Unordered and Ordered Lists wrappers
  sanitized = sanitized.replace(/<\/?(?:ul|ol)[^>]*>/gi, '\n');

  // Paragraphs & Divs
  sanitized = sanitized.replace(/<(?:p|div)[^>]*>(.*?)<\/(?:p|div)>/gi, (_, text) => {
    const t = text.trim();
    return t ? `\n\n${t}\n\n` : '\n\n';
  });

  // Line breaks
  sanitized = sanitized.replace(/<br\s*\/?>/gi, '\n');

  // Strip remaining HTML tags
  sanitized = sanitized.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  sanitized = sanitized
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Collapse 3+ consecutive newlines to 2 newlines (markdown paragraph separation)
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n').trim();

  return sanitized;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

