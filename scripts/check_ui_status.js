const fs = require('fs');

async function check() {
  const res = await fetch('http://localhost:3000/');
  const html = await res.text();
  console.log('HTML length:', html.length);
  const cssMatches = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)];
  console.log('Found CSS links:', cssMatches.length);
  for (const m of cssMatches) {
    console.log('Tag:', m[0]);
    const hrefMatch = m[0].match(/href=["']([^"']+)["']/);
    const href = hrefMatch ? hrefMatch[1] : null;
    if (href) {
      const fullUrl = new URL(href, 'http://localhost:3000/').href;
      try {
        const cssRes = await fetch(fullUrl);
        const cssText = await cssRes.text();
        console.log('Fetch', href, '-> status:', cssRes.status, 'Content-Type:', cssRes.headers.get('content-type'), 'bytes:', cssText.length);
        if (cssRes.status === 200) {
          console.log('CSS sample:', cssText.slice(0, 150));
        }
      } catch (err) {
        console.error('Fetch failed for', fullUrl, err.message);
      }
    }
  }

  // Also check crawler page
  console.log('\n--- Checking /crawler ---');
  const crawlerRes = await fetch('http://localhost:3000/crawler');
  const crawlerHtml = await crawlerRes.text();
  console.log('/crawler status:', crawlerRes.status, 'HTML length:', crawlerHtml.length);
  const crawlerCssMatches = [...crawlerHtml.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)];
  console.log('/crawler CSS links:', crawlerCssMatches.length);
  for (const m of crawlerCssMatches) {
    console.log('Tag:', m[0]);
    const hrefMatch = m[0].match(/href=["']([^"']+)["']/);
    const href = hrefMatch ? hrefMatch[1] : null;
    if (href) {
      const fullUrl = new URL(href, 'http://localhost:3000/').href;
      const cssRes = await fetch(fullUrl);
      console.log('Fetch', href, '-> status:', cssRes.status, 'bytes:', (await cssRes.text()).length);
    }
  }

  // Check API endpoints
  console.log('\n--- Checking API Endpoints ---');
  const apis = [
    { url: 'http://localhost:3000/api/v1/auth/me', method: 'GET' },
    { url: 'http://localhost:3000/api/v1/user/settings', method: 'GET' },
    { url: 'http://localhost:3000/api/v1/audit', method: 'GET' },
    { url: 'http://localhost:3000/api/v1/keywords/history', method: 'GET' },
    { url: 'http://localhost:3000/api/v1/keywords/research', method: 'POST', body: JSON.stringify({ keyword: 'seo test' }) },
  ];

  for (const api of apis) {
    try {
      const resp = await fetch(api.url, {
        method: api.method,
        headers: { 'Content-Type': 'application/json' },
        body: api.body,
      });
      const data = await resp.json();
      console.log(api.method, api.url, '-> status:', resp.status, 'body:', JSON.stringify(data).slice(0, 120));
    } catch (e) {
      console.error(api.method, api.url, '-> ERROR:', e.message);
    }
  }
}

check().catch(console.error);
