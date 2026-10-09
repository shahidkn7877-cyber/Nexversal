import { safeFetchResource } from '@/lib/security/ssrf';

export interface RobotsTxtResult {
  exists: boolean;
  url: string;
  allowed: boolean;
  sitemaps: string[];
  matchedRule?: string;
  directivesCount: number;
  rawContent?: string;
}

export class RobotsParserService {
  /**
   * Safely retrieves and parses robots.txt for a given domain/URL.
   * Evaluates Allow and Disallow rules against the target path.
   */
  public async fetchAndParse(targetUrl: string): Promise<RobotsTxtResult> {
    let robotsUrl = '';
    let targetPath = '/';

    try {
      const parsed = new URL(targetUrl);
      robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
      targetPath = parsed.pathname || '/';
    } catch {
      return {
        exists: false,
        url: '',
        allowed: true,
        sitemaps: [],
        directivesCount: 0,
      };
    }

    try {
      const fetchRes = await safeFetchResource(robotsUrl, 4000);
      if (fetchRes.status < 200 || fetchRes.status >= 300 || !fetchRes.text.trim()) {
        return {
          exists: false,
          url: robotsUrl,
          allowed: true,
          sitemaps: [],
          directivesCount: 0,
        };
      }

      return this.parseRobotsTxt(fetchRes.text, targetPath, robotsUrl);
    } catch {
      // 404 or connection error means no robots.txt restrictions
      return {
        exists: false,
        url: robotsUrl,
        allowed: true,
        sitemaps: [],
        directivesCount: 0,
      };
    }
  }

  /**
   * Parses the text of robots.txt for User-agent: * rules and Sitemap references.
   */
  public parseRobotsTxt(content: string, targetPath: string, robotsUrl = ''): RobotsTxtResult {
    const lines = content.split(/\r?\n/);
    const sitemaps: string[] = [];
    const allowRules: string[] = [];
    const disallowRules: string[] = [];

    let isTargetUserAgent = false;
    let directiveCount = 0;

    for (const rawLine of lines) {
      // Strip comments
      const line = rawLine.replace(/#.*$/, '').trim();
      if (!line) continue;

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const field = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();

      if (field === 'sitemap') {
        if (value && !sitemaps.includes(value)) {
          sitemaps.push(value);
        }
        continue;
      }

      if (field === 'user-agent') {
        directiveCount++;
        const ua = value.toLowerCase();
        // Target wildcard bot or specific modern bot
        if (ua === '*' || ua.includes('modernseo') || ua.includes('bot')) {
          isTargetUserAgent = true;
        } else {
          isTargetUserAgent = false;
        }
        continue;
      }

      if (!isTargetUserAgent) continue;

      if (field === 'disallow') {
        directiveCount++;
        if (value) {
          disallowRules.push(value);
        }
      } else if (field === 'allow') {
        directiveCount++;
        if (value) {
          allowRules.push(value);
        }
      }
    }

    // Evaluate rules against targetPath using longest-match precedence
    let matchedRule: string | undefined;
    let longestAllow = -1;
    let longestDisallow = -1;

    for (const rule of allowRules) {
      if (this.pathMatchesRule(targetPath, rule) && rule.length > longestAllow) {
        longestAllow = rule.length;
      }
    }

    for (const rule of disallowRules) {
      if (this.pathMatchesRule(targetPath, rule) && rule.length > longestDisallow) {
        longestDisallow = rule.length;
        matchedRule = `Disallow: ${rule}`;
      }
    }

    // In standard robots.txt, the longest matching rule wins. If equal, Allow wins.
    const isAllowed = longestAllow >= longestDisallow;

    return {
      exists: true,
      url: robotsUrl,
      allowed: isAllowed,
      sitemaps,
      matchedRule: isAllowed ? undefined : matchedRule,
      directivesCount: directiveCount,
      rawContent: content.length > 5000 ? content.slice(0, 5000) + '...' : content,
    };
  }

  private pathMatchesRule(targetPath: string, rule: string): boolean {
    if (!rule) return false;
    // Fast path: root
    if (rule === '/') return true;

    // Handle end of pattern character '$'
    if (rule.endsWith('$')) {
      const pattern = rule.slice(0, -1);
      return targetPath === pattern;
    }

    // Handle wildcard '*'
    if (rule.includes('*')) {
      const escaped = rule.split('*').map((s) => s.replace(/[-[\]{}()+?.,\\^$|#\s]/g, '\\$&')).join('.*');
      const regex = new RegExp('^' + escaped);
      return regex.test(targetPath);
    }

    // Standard prefix match
    return targetPath.startsWith(rule);
  }
}

export const robotsParserService = new RobotsParserService();
