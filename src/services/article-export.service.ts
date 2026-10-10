import PDFDocument from 'pdfkit';
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  ExternalHyperlink,
  Packer,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';
import { parseMarkdownBlocks, MarkdownBlock } from '@/lib/markdown-parser';

export interface InlineSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  link?: string;
}

export interface TableParsed {
  headers: string[];
  rows: string[][];
}

export interface ExportArticleOptions {
  title?: string;
  content: string;
  format: 'pdf' | 'docx';
  focusKeyword?: string;
  metaDescription?: string;
}

export class ArticleExportService {
  /**
   * Sanitizes article title into a clean, filesystem-safe filename.
   */
  public sanitizeFilename(title?: string, format: 'pdf' | 'docx' = 'pdf'): string {
    const raw = (title || '').trim();
    if (!raw) {
      return `nexversal-article.${format}`;
    }

    const clean = raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);

    return (clean || 'nexversal-article') + `.${format}`;
  }

  /**
   * Parses inline Markdown formatting (bold, italic, links) into structured segments.
   */
  public parseInlineSegments(text: string): InlineSegment[] {
    if (!text) return [];

    const segments: InlineSegment[] = [];
    // Tokenize links, bold, and italic
    // Pattern: [link text](url) | ***bold-italic*** | **bold** | *italic*
    const tokenRegex = /\[([^\]]+)\]\(([^)]+)\)|\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*|__([^_]+)__|([^[*\n_]+)/g;

    let match;
    let lastIndex = 0;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const gap = text.substring(lastIndex, match.index);
        if (gap) segments.push({ text: gap });
      }

      if (match[1] !== undefined && match[2] !== undefined) {
        // Link: [text](url)
        segments.push({
          text: match[1],
          link: match[2],
        });
      } else if (match[3] !== undefined) {
        // Bold + Italic: ***text***
        segments.push({
          text: match[3],
          bold: true,
          italic: true,
        });
      } else if (match[4] !== undefined) {
        // Bold: **text**
        segments.push({
          text: match[4],
          bold: true,
        });
      } else if (match[5] !== undefined) {
        // Italic: *text*
        segments.push({
          text: match[5],
          italic: true,
        });
      } else if (match[6] !== undefined) {
        // Bold: __text__
        segments.push({
          text: match[6],
          bold: true,
        });
      } else if (match[7] !== undefined) {
        // Plain text run
        segments.push({ text: match[7] });
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      segments.push({ text: text.substring(lastIndex) });
    }

    return segments.length > 0 ? segments : [{ text }];
  }

  /**
   * Detects and parses a Markdown table if present.
   */
  public parseMarkdownTable(text: string): TableParsed | null {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return null;

    // Check if lines contain pipe characters
    if (!lines[0].includes('|') || !lines[1].includes('|')) return null;

    // Line 1 is header, line 2 should be separator | --- | --- |
    const isSeparator = /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(lines[1]);
    if (!isSeparator) return null;

    const splitRow = (row: string) =>
      row
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => c.trim());

    const headers = splitRow(lines[0]);
    const rows = lines.slice(2).map(splitRow);

    return { headers, rows };
  }

  /**
   * Generates a genuine PDF document from canonical article content using PDFKit.
   */
  public async generatePdf(options: ExportArticleOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const docTitle = options.title?.trim() || 'SEO Optimized Article';
        const doc = new PDFDocument({
          size: 'A4',
          margin: 54, // 0.75 inch margin
          bufferPages: true,
          info: {
            Title: docTitle,
            Author: 'Nexversal SEO SaaS Platform',
            Subject: 'Optimized Article Publication',
            Keywords: options.focusKeyword || 'SEO Article',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        doc.on('error', (err) => reject(err));

        const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

        // Document Main Title (Cover / Header)
        doc
          .font('Helvetica-Bold')
          .fontSize(22)
          .fillColor('#0f172a')
          .text(docTitle, { width: contentWidth, lineGap: 4 });

        doc.moveDown(0.5);

        // Optional Meta Sub-header
        if (options.focusKeyword || options.metaDescription) {
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor('#64748b')
            .text(
              [
                options.focusKeyword ? `Focus Keyword: ${options.focusKeyword}` : null,
                `Generated via Nexversal SEO Platform · ${new Date().toLocaleDateString()}`,
              ]
                .filter(Boolean)
                .join('  |  '),
              { width: contentWidth }
            );

          doc.moveDown(1);
          // Subtle horizontal divider rule
          doc
            .strokeColor('#e2e8f0')
            .lineWidth(1)
            .moveTo(doc.page.margins.left, doc.y)
            .lineTo(doc.page.margins.left + contentWidth, doc.y)
            .stroke();

          doc.moveDown(1);
        } else {
          doc.moveDown(0.75);
        }

        // Parse structured Markdown blocks
        const blocks = parseMarkdownBlocks(options.content);

        for (const block of blocks) {
          // Check for page overflow
          if (doc.y > doc.page.height - doc.page.margins.bottom - 60) {
            doc.addPage();
          }

          switch (block.type) {
            case 'h1': {
              doc.moveDown(0.75);
              doc
                .font('Helvetica-Bold')
                .fontSize(18)
                .fillColor('#0f172a')
                .text(block.text, { width: contentWidth, lineGap: 3 });
              doc.moveDown(0.4);
              break;
            }
            case 'h2': {
              doc.moveDown(0.6);
              doc
                .font('Helvetica-Bold')
                .fontSize(14)
                .fillColor('#1e293b')
                .text(block.text, { width: contentWidth, lineGap: 2 });
              doc.moveDown(0.3);
              break;
            }
            case 'h3': {
              doc.moveDown(0.5);
              doc
                .font('Helvetica-Bold')
                .fontSize(12)
                .fillColor('#334155')
                .text(block.text, { width: contentWidth, lineGap: 2 });
              doc.moveDown(0.25);
              break;
            }
            case 'h4':
            case 'h5':
            case 'h6': {
              doc.moveDown(0.4);
              doc
                .font('Helvetica-Bold')
                .fontSize(11)
                .fillColor('#475569')
                .text(block.text, { width: contentWidth });
              doc.moveDown(0.2);
              break;
            }
            case 'quote': {
              doc.moveDown(0.3);
              const startY = doc.y;
              doc
                .font('Helvetica-Oblique')
                .fontSize(10.5)
                .fillColor('#475569')
                .text(block.text, doc.page.margins.left + 14, startY, {
                  width: contentWidth - 14,
                  lineGap: 3,
                });
              const endY = doc.y;
              // Left quote bar
              doc
                .strokeColor('#3b82f6')
                .lineWidth(3)
                .moveTo(doc.page.margins.left, startY)
                .lineTo(doc.page.margins.left, endY)
                .stroke();
              doc.x = doc.page.margins.left;
              doc.moveDown(0.5);
              break;
            }
            case 'list': {
              if (block.items && block.items.length > 0) {
                block.items.forEach((item, idx) => {
                  if (doc.y > doc.page.height - doc.page.margins.bottom - 40) {
                    doc.addPage();
                  }
                  const bullet = block.ordered ? `${idx + 1}. ` : '•  ';
                  doc
                    .font('Helvetica')
                    .fontSize(10.5)
                    .fillColor('#334155');

                  const itemSegments = this.parseInlineSegments(item);
                  doc.text(bullet, doc.page.margins.left + 12, doc.y, { continued: true });
                  this.renderPdfSegments(doc, itemSegments, contentWidth - 20);
                  doc.moveDown(0.2);
                });
                doc.x = doc.page.margins.left;
                doc.moveDown(0.4);
              }
              break;
            }
            case 'hr': {
              doc.moveDown(0.5);
              doc
                .strokeColor('#e2e8f0')
                .lineWidth(1)
                .moveTo(doc.page.margins.left, doc.y)
                .lineTo(doc.page.margins.left + contentWidth, doc.y)
                .stroke();
              doc.moveDown(0.5);
              break;
            }
            case 'paragraph':
            default: {
              // Check if paragraph is actually a markdown table
              const table = this.parseMarkdownTable(block.text);
              if (table) {
                this.renderPdfTable(doc, table, contentWidth);
              } else {
                const segments = this.parseInlineSegments(block.text);
                doc.x = doc.page.margins.left;
                this.renderPdfSegments(doc, segments, contentWidth);
                doc.moveDown(0.5);
              }
              break;
            }
          }
        }

        // Add page numbering across all pages
        const pageRange = doc.bufferedPageRange();
        for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
          doc.switchToPage(i);
          doc
            .font('Helvetica')
            .fontSize(8.5)
            .fillColor('#94a3b8')
            .text(
              `Page ${i + 1} of ${pageRange.count}`,
              doc.page.margins.left,
              doc.page.height - 38,
              { align: 'center', width: contentWidth }
            );
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Helper to render inline segments in PDFKit.
   */
  private renderPdfSegments(doc: typeof PDFDocument.prototype, segments: InlineSegment[], width: number) {
    segments.forEach((seg, index) => {
      const isLast = index === segments.length - 1;
      let fontName = 'Helvetica';
      if (seg.bold && seg.italic) fontName = 'Helvetica-BoldOblique';
      else if (seg.bold) fontName = 'Helvetica-Bold';
      else if (seg.italic) fontName = 'Helvetica-Oblique';

      doc.font(fontName).fontSize(10.5);

      if (seg.link) {
        doc.fillColor('#2563eb');
        doc.text(seg.text, {
          continued: !isLast,
          link: seg.link,
          underline: true,
          lineGap: 3,
          width,
        });
      } else {
        doc.fillColor('#334155');
        doc.text(seg.text, {
          continued: !isLast,
          lineGap: 3,
          width,
        });
      }
    });
  }

  /**
   * Helper to render a table in PDFKit.
   */
  private renderPdfTable(doc: typeof PDFDocument.prototype, table: TableParsed, contentWidth: number) {
    const colCount = Math.max(table.headers.length, 1);
    const colWidth = contentWidth / colCount;

    doc.moveDown(0.3);

    // Headers
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a');
    let currentX = doc.page.margins.left;
    const startY = doc.y;

    table.headers.forEach((h) => {
      doc.text(h, currentX + 4, startY + 4, { width: colWidth - 8, lineGap: 1 });
      currentX += colWidth;
    });

    doc.moveDown(0.5);

    // Rows
    doc.font('Helvetica').fontSize(9).fillColor('#334155');
    table.rows.forEach((row) => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 30) {
        doc.addPage();
      }
      let cellX = doc.page.margins.left;
      const rowY = doc.y;
      row.forEach((cell) => {
        doc.text(cell, cellX + 4, rowY + 3, { width: colWidth - 8, lineGap: 1 });
        cellX += colWidth;
      });
      doc.moveDown(0.4);
    });

    doc.moveDown(0.4);
  }

  /**
   * Generates a genuine Microsoft Word (.docx) document from canonical article content using `docx`.
   */
  public async generateDocx(options: ExportArticleOptions): Promise<Buffer> {
    const docTitle = options.title?.trim() || 'SEO Optimized Article';
    const blocks = parseMarkdownBlocks(options.content);

    const docChildren: (Paragraph | Table)[] = [];

    // Document Title
    docChildren.push(
      new Paragraph({
        text: docTitle,
        heading: HeadingLevel.TITLE,
        spacing: { after: 200, before: 100 },
      })
    );

    // Optional Focus Keyword / Meta info
    if (options.focusKeyword || options.metaDescription) {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: options.focusKeyword
                ? `Focus Keyword: ${options.focusKeyword}   |   `
                : '',
              italics: true,
              color: '64748B',
              size: 18,
            }),
            new TextRun({
              text: `Generated via Nexversal SEO Platform · ${new Date().toLocaleDateString()}`,
              italics: true,
              color: '94A3B8',
              size: 18,
            }),
          ],
          spacing: { after: 300 },
        })
      );
    }

    // Process blocks into Word paragraphs
    for (const block of blocks) {
      switch (block.type) {
        case 'h1': {
          docChildren.push(
            new Paragraph({
              text: block.text,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 360, after: 140 },
            })
          );
          break;
        }
        case 'h2': {
          docChildren.push(
            new Paragraph({
              text: block.text,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 280, after: 120 },
            })
          );
          break;
        }
        case 'h3': {
          docChildren.push(
            new Paragraph({
              text: block.text,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100 },
            })
          );
          break;
        }
        case 'h4':
        case 'h5':
        case 'h6': {
          docChildren.push(
            new Paragraph({
              text: block.text,
              heading: HeadingLevel.HEADING_4,
              spacing: { before: 160, after: 80 },
            })
          );
          break;
        }
        case 'quote': {
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: block.text,
                  italics: true,
                  color: '475569',
                }),
              ],
              indent: { left: 720 }, // 0.5 in indent
              spacing: { before: 140, after: 140 },
              border: {
                left: {
                  color: '3B82F6',
                  space: 12,
                  style: BorderStyle.SINGLE,
                  size: 24,
                },
              },
            })
          );
          break;
        }
        case 'list': {
          if (block.items) {
            block.items.forEach((item) => {
              const runs = this.buildDocxTextRuns(item);
              docChildren.push(
                new Paragraph({
                  children: runs,
                  bullet: { level: 0 },
                  spacing: { before: 40, after: 40 },
                })
              );
            });
          }
          break;
        }
        case 'hr': {
          docChildren.push(
            new Paragraph({
              border: {
                bottom: {
                  color: 'CBD5E1',
                  space: 8,
                  style: BorderStyle.SINGLE,
                  size: 6,
                },
              },
              spacing: { before: 200, after: 200 },
            })
          );
          break;
        }
        case 'paragraph':
        default: {
          const tableData = this.parseMarkdownTable(block.text);
          if (tableData) {
            const tableElement = this.buildDocxTable(tableData);
            docChildren.push(tableElement);
          } else {
            const runs = this.buildDocxTextRuns(block.text);
            docChildren.push(
              new Paragraph({
                children: runs,
                spacing: { before: 80, after: 140, line: 320 },
              })
            );
          }
          break;
        }
      }
    }

    const doc = new Document({
      title: docTitle,
      description: options.metaDescription || undefined,
      creator: 'Nexversal SEO SaaS Platform',
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1080, // 0.75 in
                right: 1080,
                bottom: 1080,
                left: 1080,
              },
            },
          },
          children: docChildren,
        },
      ],
    });

    return Packer.toBuffer(doc);
  }

  /**
   * Helper to convert an inline formatted string into docx TextRuns & Hyperlinks.
   */
  private buildDocxTextRuns(text: string): (TextRun | ExternalHyperlink)[] {
    const segments = this.parseInlineSegments(text);
    return segments.map((seg) => {
      if (seg.link) {
        return new ExternalHyperlink({
          children: [
            new TextRun({
              text: seg.text,
              color: '2563EB',
              underline: {},
            }),
          ],
          link: seg.link,
        });
      }

      return new TextRun({
        text: seg.text,
        bold: seg.bold,
        italics: seg.italic,
        color: '334155',
        size: 22, // 11pt
      });
    });
  }

  /**
   * Helper to build a styled table in docx.
   */
  private buildDocxTable(table: TableParsed): Table {
    const headerRow = new TableRow({
      tableHeader: true,
      children: table.headers.map(
        (h) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: h, bold: true, size: 20, color: '0F172A' })],
              }),
            ],
            shading: { fill: 'F1F5F9' },
          })
      ),
    });

    const dataRows = table.rows.map(
      (r) =>
        new TableRow({
          children: r.map(
            (c) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: c, size: 20, color: '334155' })],
                  }),
                ],
              })
          ),
        })
    );

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    });
  }
}

export const articleExportService = new ArticleExportService();
