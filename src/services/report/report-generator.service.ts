import { AuditResult } from '@/types/audit';

export class ReportGeneratorService {
  /**
   * Generates a self-contained, professional, standalone HTML executive report.
   */
  public generateHtmlReport(audit: AuditResult): string {
    const formattedDate = new Date(audit.timestamp).toUTCString();
    const scoreColor =
      audit.score >= 80 ? '#10b981' : audit.score >= 60 ? '#f59e0b' : '#ef4444';
    const scoreBg =
      audit.score >= 80
        ? 'rgba(16, 185, 129, 0.1)'
        : audit.score >= 60
        ? 'rgba(245, 158, 11, 0.1)'
        : 'rgba(239, 68, 68, 0.1)';

    const checksHtml = (audit.checks || [])
      .map((c) => {
        const isPassed = c.status === 'passed';
        const isWarning = c.status === 'warning';
        const statusColor = isPassed ? '#10b981' : isWarning ? '#f59e0b' : '#ef4444';
        const statusBg = isPassed
          ? '#ecfdf5'
          : isWarning
          ? '#fffbeb'
          : '#fef2f2';

        return `
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 12px; background: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="font-size: 14px; color: #0f172a;">${escapeHtml(c.title)}</strong>
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 3px 8px; border-radius: 9999px; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor}40;">
              ${escapeHtml(c.status)}
            </span>
          </div>
          <p style="font-size: 13px; color: #475569; margin: 4px 0 8px 0; line-height: 1.5;">${escapeHtml(c.description)}</p>
          ${
            c.value !== undefined && c.value !== null
              ? `<div style="font-family: monospace; font-size: 11px; background: #f8fafc; padding: 6px 10px; border-radius: 6px; color: #334155; margin-bottom: 6px; word-break: break-all;">Found: ${escapeHtml(String(c.value))}</div>`
              : ''
          }
          ${
            c.recommendation && !isPassed
              ? `<div style="font-size: 12px; color: #92400e; background: #fef3c7; padding: 8px 12px; border-radius: 6px; margin-top: 6px;">
                  <strong>🎯 Recommendation:</strong> ${escapeHtml(c.recommendation)}
                </div>`
              : ''
          }
        </div>`;
      })
      .join('');

    const pageDataHtml = audit.pageData
      ? `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; background: #ffffff; margin-bottom: 24px;">
        <h3 style="font-size: 15px; color: #0f172a; margin-top: 0; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Technical Page Diagnostics</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
          <tr>
            <td style="padding: 6px 0; font-weight: 600; width: 35%;">Title Tag:</td>
            <td style="padding: 6px 0; color: #475569;">${escapeHtml(audit.pageData.title || '(None detected)')} (${audit.pageData.titleLength ?? 0} chars)</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">Meta Description:</td>
            <td style="padding: 6px 0; color: #475569;">${escapeHtml(audit.pageData.metaDescription || '(None detected)')} (${audit.pageData.metaDescriptionLength ?? 0} chars)</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">Primary H1:</td>
            <td style="padding: 6px 0; color: #475569;">${escapeHtml(audit.pageData.h1Text || '(None detected)')}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">Word Count:</td>
            <td style="padding: 6px 0; color: #475569;">${audit.pageData.wordCount ?? 0} words</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">HTTPS Encryption:</td>
            <td style="padding: 6px 0; color: ${audit.pageData.hasHttps ? '#10b981' : '#ef4444'}; font-weight: 600;">
              ${audit.pageData.hasHttps ? 'Active (Secure)' : 'Missing (Insecure HTTP)'}
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">Image Alt Coverage:</td>
            <td style="padding: 6px 0; color: #475569;">${audit.pageData.imagesWithAlt ?? 0} / ${audit.pageData.imagesTotal ?? 0} images</td>
          </tr>
        </table>
      </div>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Technical Audit Report — ${escapeHtml(audit.url)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background-color: #f8fafc;
      margin: 0;
      padding: 32px 16px;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .brand {
      display: inline-block;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #2563eb;
      margin-bottom: 4px;
    }
    h1 {
      margin: 4px 0 12px 0;
      font-size: 24px;
      color: #0f172a;
    }
    .meta-bar {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .score-card {
      background: ${scoreBg};
      border: 1px solid ${scoreColor}40;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      margin-bottom: 24px;
    }
    .score-number {
      font-size: 48px;
      font-weight: 900;
      color: ${scoreColor};
      line-height: 1;
    }
    .stats-row {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 14px;
      font-size: 13px;
      font-weight: 600;
    }
    .stat-critical { color: #ef4444; }
    .stat-warning { color: #f59e0b; }
    .stat-passed { color: #10b981; }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      margin-top: 32px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">Nexversal · Executive SEO Audit</div>
      <h1>Website Technical &amp; On-Page SEO Report</h1>
      <div class="meta-bar"><strong>Audited URL:</strong> <a href="${escapeHtml(audit.url)}" style="color: #2563eb; text-decoration: none;" target="_blank" rel="noopener noreferrer">${escapeHtml(audit.url)}</a></div>
      ${audit.targetKeyword ? `<div class="meta-bar"><strong>Target Focus Keyword:</strong> &quot;${escapeHtml(audit.targetKeyword)}&quot;</div>` : ''}
      <div class="meta-bar"><strong>Audit Date:</strong> ${formattedDate} · <strong>Audit ID:</strong> <code>${escapeHtml(audit.id)}</code></div>
    </div>

    <div class="score-card">
      <div class="score-number">${audit.score} <span style="font-size: 20px; font-weight: 600; color: #64748b;">/ 100</span></div>
      <div style="font-size: 14px; font-weight: 700; color: ${scoreColor}; margin-top: 6px;">
        ${audit.score >= 80 ? 'Excellent Technical Health' : audit.score >= 60 ? 'Moderate Optimization Needs' : 'Critical Fixes Required'}
      </div>
      <div class="stats-row">
        <span class="stat-critical">● ${audit.criticalCount} Critical</span>
        <span class="stat-warning">● ${audit.warningCount} Warnings</span>
        <span class="stat-passed">● ${audit.passedCount} Passed</span>
      </div>
    </div>

    ${pageDataHtml}

    <h2 style="font-size: 18px; color: #0f172a; margin-bottom: 14px;">Evaluated Factor Details (${audit.checks?.length ?? 0} Checks)</h2>
    <div>
      ${checksHtml}
    </div>

    <div class="footer">
      Generated automatically by Nexversal SEO Platform · SSRF-Protected Live DOM Analysis · Confidential Report
    </div>
  </div>
</body>
</html>`;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const reportGeneratorService = new ReportGeneratorService();

