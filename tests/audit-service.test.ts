import { describe, it, expect } from 'vitest';
import { seoAuditService } from '../src/services/audit.service';

describe('SeoAuditService (auditHtml)', () => {
  const perfectHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Cloud Architecture Guide 2026</title>
  <meta name="description" content="Discover modern cloud architecture strategies in 2026. Compare patterns, scalability, security, and performance in this complete engineering guide.">
  <link rel="canonical" href="https://example.com/cloud-architecture-guide">
  <meta property="og:title" content="Complete Cloud Architecture Guide 2026">
  <meta property="og:description" content="Master modern enterprise cloud architecture.">
  <meta property="og:image" content="https://example.com/hero.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Complete Cloud Architecture Guide 2026"
  }
  </script>
</head>
<body>
  <h1>Complete Cloud Architecture Guide 2026</h1>
  <p>Looking for a complete cloud architecture guide? Modern enterprise frameworks help engineers design resilient systems in minutes.</p>
  <h2>Why Modern Cloud Architecture Matters</h2>
  <p>${'Informative content explaining cloud system resilience. '.repeat(50)}</p>
  <h2>Top Patterns Reviewed</h2>
  <p>${'Comparison of various architectural patterns and scaling paradigms. '.repeat(60)}</p>
  <img src="/infra.png" alt="Sample cloud infrastructure diagram">
  <a href="/pricing">View Pricing Plans</a>
  <a href="https://external-site.com">External Source</a>
</body>
</html>
  `;

  it('accurately scores a well-optimized HTML document', () => {
    const result = seoAuditService.auditHtml(
      perfectHtml,
      'https://example.com/cloud-architecture-guide',
      'cloud architecture guide'
    );

    expect(result.status).toBe('completed');
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.passedCount).toBeGreaterThan(10);
    expect(result.criticalCount).toBe(0);

    const titleCheck = result.checks.find((c) => c.id === 'title_tag');
    expect(titleCheck?.status).toBe('passed');

    const h1Check = result.checks.find((c) => c.id === 'h1_heading');
    expect(h1Check?.status).toBe('passed');

    const httpsCheck = result.checks.find((c) => c.id === 'https_protocol');
    expect(httpsCheck?.status).toBe('passed');

    const viewportCheck = result.checks.find((c) => c.id === 'mobile_viewport');
    expect(viewportCheck?.status).toBe('passed');

    const schemaCheck = result.checks.find((c) => c.id === 'structured_data');
    expect(schemaCheck?.status).toBe('passed');
  });

  it('detects critical issues in broken or thin HTML', () => {
    const brokenHtml = `
<!DOCTYPE html>
<html>
<head></head>
<body>
  <p>Short paragraph.</p>
</body>
</html>
    `;

    const result = seoAuditService.auditHtml(brokenHtml, 'http://insecure-site.org/page');
    expect(result.score).toBeLessThan(50);
    expect(result.criticalCount).toBeGreaterThan(0);

    const titleCheck = result.checks.find((c) => c.id === 'title_tag');
    expect(titleCheck?.status).toBe('critical');

    const h1Check = result.checks.find((c) => c.id === 'h1_heading');
    expect(h1Check?.status).toBe('critical');

    const httpsCheck = result.checks.find((c) => c.id === 'https_protocol');
    expect(httpsCheck?.status).toBe('critical');
  });
});
