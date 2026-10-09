import { NavigationItem } from '@/types/app';

export const APP_NAME = 'AI SEO Optimizer & Technical Platform';
export const APP_VERSION = '2.1.0';

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

