import { URL } from 'url';

export interface UrlSafetyCheck {
  safe: boolean;
  reason?: string;
  parsedUrl?: URL;
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
  '169.254.169.254', // AWS/GCP metadata
  'metadata.google.internal',
  'instance-data',
]);

const BLOCKED_DOMAINS_SUFFIXES = [
  '.local',
  '.internal',
  '.localhost',
  '.lan',
  '.home',
  '.corp',
];

export function isSafeExternalUrl(inputUrl: string): UrlSafetyCheck {
  try {
    const parsed = new URL(inputUrl);

    // Enforce protocol
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        safe: false,
        reason: 'Protocol must be http:// or https://. Schemes like file://, ftp://, or data: are blocked.',
      };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check exact blocked hosts
    if (BLOCKED_HOSTNAMES.has(hostname)) {
      return {
        safe: false,
        reason: `Access to ${hostname} is blocked for security (loopback or cloud metadata).`,
      };
    }

    // Check suffix rules
    for (const suffix of BLOCKED_DOMAINS_SUFFIXES) {
      if (hostname.endsWith(suffix)) {
        return {
          safe: false,
          reason: `Access to internal domain suffix (${suffix}) is forbidden.`,
        };
      }
    }

    // IPv4 private ranges check
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
      const octets = [
        parseInt(ipMatch[1], 10),
        parseInt(ipMatch[2], 10),
        parseInt(ipMatch[3], 10),
        parseInt(ipMatch[4], 10),
      ];

      // Check range validity
      if (octets.some((o) => o < 0 || o > 255)) {
        return { safe: false, reason: 'Invalid IP address octets.' };
      }

      // Loopback 127.0.0.0/8
      if (octets[0] === 127) {
        return { safe: false, reason: 'Loopback IP addresses (127.x.x.x) are blocked.' };
      }

      // Private 10.0.0.0/8
      if (octets[0] === 10) {
        return { safe: false, reason: 'Private IP addresses (10.x.x.x) are blocked.' };
      }

      // Private 172.16.0.0/12
      if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
        return { safe: false, reason: 'Private IP addresses (172.16-31.x.x) are blocked.' };
      }

      // Private 192.168.0.0/16
      if (octets[0] === 192 && octets[1] === 168) {
        return { safe: false, reason: 'Private IP addresses (192.168.x.x) are blocked.' };
      }

      // Link-local 169.254.0.0/16
      if (octets[0] === 169 && octets[1] === 254) {
        return { safe: false, reason: 'Link-local IP addresses (169.254.x.x) are blocked.' };
      }

      // Broadcast / zero
      if (octets[0] === 0 || octets[0] === 255) {
        return { safe: false, reason: 'Reserved IP addresses are blocked.' };
      }
    }

    return { safe: true, parsedUrl: parsed };
  } catch (err) {
    return {
      safe: false,
      reason: err instanceof Error ? err.message : 'Invalid URL provided',
    };
  }
}

export interface SafeFetchHtmlResult {
  html: string;
  status: number;
  contentType: string;
  finalUrl: string;
  redirected: boolean;
  responseTimeMs: number;
  contentSizeBytes: number;
  xRobotsTag?: string | null;
}

export interface SafeFetchResourceResult {
  text: string;
  status: number;
  contentType: string;
  finalUrl: string;
}

export async function safeFetchHtml(
  url: string,
  timeoutMs = 9000,
  maxSizeBytes = 4 * 1024 * 1024 // 4MB
): Promise<SafeFetchHtmlResult> {
  const safety = isSafeExternalUrl(url);
  if (!safety.safe) {
    throw new Error(safety.reason || 'URL failed security validation');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NexversalBot/2.0; +https://nexversal.bond/bot)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;
    const finalUrl = response.url || url;

    // Verify redirected URL for SSRF protection
    if (finalUrl !== url) {
      const redirectSafety = isSafeExternalUrl(finalUrl);
      if (!redirectSafety.safe) {
        throw new Error(
          `Redirect destination ${finalUrl} failed security validation: ${redirectSafety.reason}`
        );
      }
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      throw new Error(
        `The target URL did not return HTML content (Content-Type: ${contentType || 'unknown'}). Audits only support web pages.`
      );
    }

    const xRobotsTag = response.headers.get('x-robots-tag');
    const text = await response.text();
    const contentSizeBytes = Buffer.byteLength(text, 'utf8');

    return {
      html: text.length > maxSizeBytes ? text.slice(0, maxSizeBytes) : text,
      status: response.status,
      contentType,
      finalUrl,
      redirected: Boolean(response.redirected || finalUrl !== url),
      responseTimeMs,
      contentSizeBytes,
      xRobotsTag,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error(`Network timeout: The remote server at ${url} did not respond within ${timeoutMs / 1000} seconds.`);
      }
      throw err;
    }
    throw new Error('Failed to fetch external URL due to an unknown network error.');
  }
}

export async function safeFetchResource(
  url: string,
  timeoutMs = 6000,
  maxSizeBytes = 2 * 1024 * 1024 // 2MB
): Promise<SafeFetchResourceResult> {
  const safety = isSafeExternalUrl(url);
  if (!safety.safe) {
    throw new Error(safety.reason || 'Resource URL failed security validation');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NexversalBot/2.0; +https://nexversal.bond/bot)',
        Accept: 'text/plain,application/xml,text/xml,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);
    const finalUrl = response.url || url;

    if (finalUrl !== url) {
      const redirectSafety = isSafeExternalUrl(finalUrl);
      if (!redirectSafety.safe) {
        throw new Error(`Redirect destination failed security validation: ${redirectSafety.reason}`);
      }
    }

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    return {
      text: text.length > maxSizeBytes ? text.slice(0, maxSizeBytes) : text,
      status: response.status,
      contentType,
      finalUrl,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error(`Network timeout for resource at ${url}`);
      }
      throw err;
    }
    throw new Error('Failed to fetch resource.');
  }
}
