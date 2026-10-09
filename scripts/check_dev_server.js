async function check3001() {
  try {
    const res = await fetch('http://localhost:3001/');
    console.log('Status on 3001:', res.status);
    const html = await res.text();
    console.log('Length:', html.length);
    const css = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)];
    console.log('CSS links found on 3001:', css.length);
    for (const c of css) {
      console.log('CSS tag:', c[0]);
      const href = c[0].match(/href=["']([^"']+)["']/)?.[1];
      if (href) {
        const full = new URL(href, 'http://localhost:3001/').href;
        const r = await fetch(full);
        console.log('Fetch', href, '-> status:', r.status, 'size:', (await r.text()).length);
      }
    }
  } catch (e) {
    console.error('Error connecting to 3001:', e.message);
  }
}

check3001();

