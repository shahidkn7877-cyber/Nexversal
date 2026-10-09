async function test() {
  const url = 'http://localhost:3000/_next/static/css/3857fd7e2ef216f4.css';
  const headersList = [
    { label: 'empty', headers: {} },
    { label: 'cache-control', headers: { 'Cache-Control': 'no-cache' } },
    { label: 'pragma', headers: { 'Pragma': 'no-cache' } },
    { label: 'accept text/css', headers: { 'Accept': 'text/css,*/*;q=0.1' } },
    { label: 'sec-fetch-dest', headers: { 'Sec-Fetch-Dest': 'style' } },
    { label: 'sec-fetch-mode', headers: { 'Sec-Fetch-Mode': 'no-cors' } },
    { label: 'sec-fetch-site', headers: { 'Sec-Fetch-Site': 'same-origin' } },
    { label: 'user-agent', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } },
    { label: 'accept-language', headers: { 'Accept-Language': 'en-US,en;q=0.9' } },
    { label: 'combined Chrome hard-refresh headers', headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Accept': 'text/css,*/*;q=0.1',
      'Sec-Fetch-Dest': 'style',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    } },
  ];

  for (const item of headersList) {
    try {
      const res = await fetch(url, { headers: item.headers });
      console.log(`${item.label.padEnd(35)} -> Status: ${res.status} | Content-Type: ${res.headers.get('content-type')}`);
    } catch (e) {
      console.log(`${item.label.padEnd(35)} -> ERROR: ${e.message}`);
    }
  }
}

test();

