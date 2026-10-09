import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/analyzer', '/crawler', '/keywords', '/reports', '/login', '/register'];
  const now = new Date();

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === '' || route === '/analyzer' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : route === '/analyzer' || route === '/crawler' ? 0.9 : 0.7,
  }));
}

