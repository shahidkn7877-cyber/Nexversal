import { NavigationItem } from '@/types/app';

export const APP_NAME = 'Nexversal';
export const APP_DESCRIPTION = 'Professional, modern SEO platform for content auditing, keyword optimization, and search visibility.';
export const APP_VERSION = '2.1.0';
function getSafeSiteUrl(): string {
  const fallback = 'https://nexversal.bond';
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) return fallback;

  try {
    const cleaned = raw.trim().replace(/^["']+|["']+$/g, '').replace(/[\\/]+$/, '').trim();
    if (!cleaned) return fallback;
    const parsed = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);
    return parsed.origin;
  } catch {
    return fallback;
  }
}

export const SITE_URL = getSafeSiteUrl();

export const SEO_LIMITS = {
  title: {
    min: 40,
    max: 60,
  },
  description: {
    min: 120,
    max: 160,
  },
  content: {
    minWords: 600,
    recommendedWords: 1500,
  },
};

export const NAV_ITEMS: NavigationItem[] = [
  {
    title: 'Dashboard',
    href: '/',
  },
  {
    title: 'Content Analyzer',
    href: '/analyzer',
  },
  {
    title: 'Live SEO Audit',
    href: '/crawler',
  },
  {
    title: 'Keyword Research',
    href: '/keywords',
  },
  {
    title: 'Audit Reports',
    href: '/reports',
  },
  {
    title: 'Settings',
    href: '/settings',
  },
];

