const fs = require('fs');

async function test() {
  console.log('--- Simulating Browser Hard Refresh (Ctrl+Shift+R) ---');
  
  const headers = {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  };

  const pages = ['/', '/crawler', '/keywords', '/reports', '/analyzer', '/settings'];

  for (const p of pages) {
    console.log(`\nFetching ${p} with hard-refresh headers...`);
    const res = await fetch(`http://localhost:3000${p}`, { headers });
    console.log(`HTML Status: ${res.status}`);
    const html = await res.text();
    console.log(`HTML Length: ${html.length}`);

    const cssMatches = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)];
    console.log(`Found CSS links: ${cssMatches.length}`);
    for (const m of cssMatches) {
      console.log(`Link: ${m[0]}`);
      const href = m[0].match(/href=["']([^"']+)["']/)?.[1];
      if (href) {
        const fullUrl = new URL(href, 'http://localhost:3000/').href;
        const cssRes = await fetch(fullUrl, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Accept': 'text/css,*/*;q=0.1',
            'Sec-Fetch-Dest': 'style',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'same-origin',
          }
        });
        console.log(`CSS [${href}] -> Status: ${cssRes.status}, Content-Type: ${cssRes.headers.get('content-type')}`);
        const text = await cssRes.text();
        console.log(`CSS bytes: ${text.length}, hasTailwind: ${text.includes('--tw-') || text.includes('tailwind')}`);
      }
    }
  }
}

test().catch(console.error);

