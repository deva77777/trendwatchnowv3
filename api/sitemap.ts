import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const siteUrl = (process.env.SITE_URL || 'https://trendwatchnow.com').replace(/\/$/, '');

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Serve robots.txt
  if (req.query?.type === 'robots') {
    const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${siteUrl}/sitemap.xml
`;
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(robotsTxt);
  }

  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: posts, error } = await supabase
      .from('posts')
      .select('slug, updated_at, category')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    const allPosts = posts || [];
    const categories = [...new Set(allPosts.map((p: any) => p.category))];
    const now = new Date().toISOString().split('T')[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>${siteUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${categories.map((cat: string) => `  <url>
    <loc>${siteUrl}/category/${cat.toLowerCase()}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
${allPosts.map((post: any) => `  <url>
    <loc>${siteUrl}/post/${post.slug}</loc>
    <lastmod>${post.updated_at ? post.updated_at.split('T')[0] : now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    // NO aggressive caching — always fetch fresh from Supabase
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    return res.status(200).send(xml);

  } catch (err: any) {
    console.error('Sitemap generation error:', err.message);

    // Return minimal sitemap with error comment so you can debug
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Sitemap Error: ${err.message} -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    return res.status(200).send(xml);
  }
}
