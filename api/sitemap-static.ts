import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const staticPages = [
    { loc: 'https://www.ozomart.store/', priority: '1.0', changefreq: 'daily' },
    { loc: 'https://www.ozomart.store/products', priority: '0.9', changefreq: 'daily' },
    { loc: 'https://www.ozomart.store/about', priority: '0.8', changefreq: 'weekly' },
    { loc: 'https://www.ozomart.store/help', priority: '0.8', changefreq: 'weekly' },
    { loc: 'https://www.ozomart.store/contact', priority: '0.8', changefreq: 'weekly' },
    { loc: 'https://www.ozomart.store/careers', priority: '0.7', changefreq: 'monthly' },
    { loc: 'https://www.ozomart.store/blog', priority: '0.7', changefreq: 'weekly' },
    { loc: 'https://www.ozomart.store/press', priority: '0.7', changefreq: 'monthly' },
    { loc: 'https://www.ozomart.store/developer', priority: '0.7', changefreq: 'monthly' },
    { loc: 'https://www.ozomart.store/privacy', priority: '0.5', changefreq: 'monthly' },
    { loc: 'https://www.ozomart.store/terms', priority: '0.5', changefreq: 'monthly' },
    { loc: 'https://www.ozomart.store/cookies', priority: '0.5', changefreq: 'monthly' },
    { loc: 'https://www.ozomart.store/shipping', priority: '0.5', changefreq: 'monthly' },
    { loc: 'https://www.ozomart.store/refund-policy', priority: '0.5', changefreq: 'monthly' },
  ];

  const urls = staticPages.map(page => `
    <url>
      <loc>${page.loc}</loc>
      <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
      <changefreq>${page.changefreq}</changefreq>
      <priority>${page.priority}</priority>
    </url>
  `).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls}
  </urlset>`.trim();

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600');
  return res.status(200).send(xml);
}
