const http = require('http');

async function testEndpoint() {
  const hardRefreshHeaders = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  };

  const routes = [
    { name: 'Dashboard', path: '/' },
    { name: 'Live SEO Audit (Nexversal Preset)', path: '/crawler' },
    { name: 'Keyword Explorer', path: '/keywords' },
    { name: 'Audit Reports', path: '/reports' },
    { name: 'Content Analyzer', path: '/analyzer' },
    { name: 'User Preferences / Settings', path: '/settings' },
    { name: 'Sign In', path: '/login' },
    { name: 'Create Account', path: '/register' },
  ];

  console.log('='.repeat(64));
  console.log(' STEP 1: HARD-REFRESH (Ctrl + Shift + R) SIMULATION ON ALL ROUTES');
  console.log('='.repeat(64));

  const testedCssUrls = new Set();
  let allRoutesPass = true;
  let allCssPass = true;

  for (const route of routes) {
    const url = `http://localhost:3000${route.path}`;
    try {
      const pageRes = await fetch(url, { headers: hardRefreshHeaders });
      const html = await pageRes.text();

      // Extract all stylesheet links
      const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]*>/gi;
      const links = [...html.matchAll(linkRegex)];

      console.log(`\n[ROUTE] ${route.name.padEnd(35)} -> HTTP ${pageRes.status} (${html.length} bytes)`);

      if (pageRes.status !== 200) {
        allRoutesPass = false;
      }

      if (links.length === 0) {
        console.log(`   [WARN] No stylesheet link found in HTML!`);
        allCssPass = false;
      }

      for (const link of links) {
        const hrefMatch = link[0].match(/href=["']([^"']+)["']/);
        if (hrefMatch) {
          const cssHref = hrefMatch[1];
          const fullCssUrl = new URL(cssHref, 'http://localhost:3000/').href;

          if (!testedCssUrls.has(fullCssUrl)) {
            testedCssUrls.add(fullCssUrl);

            // Fetch CSS with hard-refresh headers
            const cssRes = await fetch(fullCssUrl, {
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Accept': 'text/css,*/*;q=0.1',
              },
            });
            const cssText = await cssRes.text();
            const contentType = cssRes.headers.get('content-type') || '';
            const isCss = contentType.includes('text/css');
            const hasTailwind = cssText.includes('--tw-') || cssText.includes('tailwind') || cssText.includes('background-color');

            console.log(`   [CSS] ${cssHref}`);
            console.log(`         Status: ${cssRes.status} | Content-Type: ${contentType} | Size: ${cssText.length} bytes | Tailwind: ${hasTailwind ? 'YES' : 'NO'}`);

            if (cssRes.status !== 200 || !isCss || cssText.length < 5000 || !hasTailwind) {
              console.log(`   [FAIL] CSS Verification failed for ${cssHref}`);
              allCssPass = false;
            } else {
              console.log(`   [PASS] CSS loaded perfectly under Hard Refresh!`);
            }
          }
        }
      }

      // Feature specific checks
      if (route.path === '/crawler') {
        const hasNexversal = html.includes('https://nexversal.com/') || html.includes('Nexversal.com');
        const hasWikipedia = html.includes('Wikipedia SEO');
        const hasPreviousAudits = html.includes('Previous Audits');
        console.log(`   [PRESETS] Nexversal: ${hasNexversal ? 'OK' : 'MISSING'} | Wikipedia: ${hasWikipedia ? 'OK' : 'MISSING'}`);
        console.log(`   [PRIVACY] Previous Audits Section Present: ${hasPreviousAudits ? 'YES (FAIL)' : 'NO (PASSED - CLEAN)'}`);
      }

      // Check for removed development phase labels
      const phaseRegex = /Phase\s*[1-8]|Coming in Phase|Phase Complete|Phase In Progress/i;
      const hasPhaseLabel = phaseRegex.test(html);
      if (hasPhaseLabel) {
        console.log(`   [PHASE CHECK] Visible Phase Label Leaked: YES (FAIL)`);
      } else {
        console.log(`   [PHASE CHECK] Visible Phase Labels Absent: PASSED (CLEAN)`);
      }

      // Check for removed Engine Status and version footer
      const hasEngineStatus = html.includes('Engine Status');
      const hasVersionStatus = html.includes('v2.1.0');
      if (hasEngineStatus || hasVersionStatus) {
        console.log(`   [SIDEBAR CHECK] Engine Status/Version Leaked: YES (FAIL)`);
      } else {
        console.log(`   [SIDEBAR CHECK] Engine Status/Version Absent: PASSED (CLEAN)`);
      }

      if (route.path === '/settings') {
        const hasSecurityLeaked = html.includes('Security Architecture') || html.includes('crypto.timingSafeEqual');
        const hasAccountIdentLeaked = html.includes('Account Identifier');
        console.log(`   [LEAK-CHECK] Security Architecture Leaked: ${hasSecurityLeaked ? 'YES (BAD)' : 'NO (SECURE)'}`);
        console.log(`   [LEAK-CHECK] Account Identifier Leaked: ${hasAccountIdentLeaked ? 'YES (BAD)' : 'NO (SECURE)'}`);
      }
    } catch (err) {
      console.error(`   [ERROR] Failed to fetch route ${route.path}:`, err.message);
      allRoutesPass = false;
    }
  }

  console.log('\n' + '='.repeat(64));
  console.log(' STEP 2: BACKEND API CONNECTIVITY VERIFICATION');
  console.log('='.repeat(64));

  try {
    const authMeRes = await fetch('http://localhost:3000/api/v1/auth/me');
    const authMeJson = await authMeRes.json();
    console.log(`\nGET /api/v1/auth/me -> HTTP ${authMeRes.status} | Authenticated: ${authMeJson.authenticated}`);

    console.log('Triggering real SEO Audit for https://nexversal.com/...');
    const auditRes = await fetch('http://localhost:3000/api/v1/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://nexversal.com/', keyword: 'nexversal' }),
    });
    const auditJson = await auditRes.json();
    console.log(`POST /api/v1/audit -> HTTP ${auditRes.status}`);
    if (auditJson.success && auditJson.data) {
      const res = auditJson.data;
      console.log(`   -> Audit Score: ${res.score}/100`);
      console.log(`   -> Target URL: ${res.url}`);
      console.log(`   -> Checks Completed: ${res.checks ? res.checks.length : 0}`);
      console.log(`   -> Passed: ${res.passedCount ?? 'N/A'} | Warnings: ${res.warningCount ?? 'N/A'} | Critical: ${res.criticalCount ?? 'N/A'}`);
    } else {
      console.log('   -> Audit error:', auditJson.error);
    }

    // Verify Audit Reports history endpoint is active and working
    const historyRes = await fetch('http://localhost:3000/api/v1/audit');
    const historyJson = await historyRes.json();
    console.log(`GET /api/v1/audit (Audit Reports backend) -> HTTP ${historyRes.status} | Success: ${historyJson.success} | Saved Audits Accessible: ${historyJson.data?.audits ? historyJson.data.audits.length : 'N/A'}`);

    const settingsRes = await fetch('http://localhost:3000/api/v1/user/settings');
    console.log(`GET /api/v1/user/settings (unauth) -> HTTP ${settingsRes.status} (Expected 401)`);

    const kwRes = await fetch('http://localhost:3000/api/v1/keywords/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: 'test seo' }),
    });
    const kwJson = await kwRes.json();
    console.log(`POST /api/v1/keywords/research (unauth) -> HTTP ${kwRes.status}`);
    console.log(`   -> Error Code: ${kwJson.error?.code}`);
    console.log(`   -> Message: ${kwJson.error?.message}`);

  } catch (err) {
    console.error('API Verification Error:', err.message);
  }

  console.log('\n' + '='.repeat(64));
  console.log(`SUMMARY RESULT: Routes: ${allRoutesPass ? 'PASSED' : 'FAILED'} | CSS Hard Refresh: ${allCssPass ? 'PASSED' : 'FAILED'}`);
  console.log('='.repeat(64) + '\n');
}

testEndpoint();
