import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const siteUrl = (process.env.SITE_URL || 'https://trendwatchnow.com').replace(/\/$/, '');

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }
  return createClient(supabaseUrl, supabaseKey);
}

// Detect social media / search engine bots
function isBot(userAgent: string): boolean {
  const botPatterns = [
    'facebookexternalhit', 'Facebot',
    'Twitterbot',
    'LinkedInBot',
    'WhatsApp',
    'Slackbot',
    'TelegramBot',
    'Discordbot',
    'Googlebot', 'Google-InspectionTool',
    'bingbot',
    'Baiduspider',
    'YandexBot',
    'DuckDuckBot',
    'Applebot',
    'PinterestBot',
    'redditbot',
    'Embedly',
    'Quora Link Preview',
    'Showyoubot',
    'outbrain',
    'vkShare',
    'W3C_Validator',
    'Iframely',
    'developers.google.com',
  ];
  const ua = (userAgent || '').toLowerCase();
  return botPatterns.some(bot => ua.includes(bot.toLowerCase()));
}

// Generate full HTML page with OG meta tags for a single post
function renderPostOgHtml(post: any): string {
  const postUrl = `${siteUrl}/post/${post.slug}`;
  const imageUrl = post.image_url || `${siteUrl}/og-default.png`;
  const description = (post.excerpt || post.meta_description || post.content?.substring(0, 160) || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const title = (post.title || 'TrendWatchNow').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const author = post.author || 'TrendWatchNow';
  const publishedDate = post.created_at || new Date().toISOString();
  const modifiedDate = post.updated_at || publishedDate;
  const tags = Array.isArray(post.tags) ? post.tags.join(', ') : '';
  const category = post.category || 'News';

  // Convert markdown-ish content to basic HTML for bots
  const contentHtml = (post.content || '')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${title} | TrendWatchNow</title>
  <meta name="title" content="${title} | TrendWatchNow">
  <meta name="description" content="${description}">
  <meta name="author" content="${author}">
  <meta name="keywords" content="${tags}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <link rel="canonical" href="${postUrl}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${postUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${title}">
  <meta property="og:site_name" content="TrendWatchNow">
  <meta property="og:locale" content="en_US">
  <meta property="article:published_time" content="${publishedDate}">
  <meta property="article:modified_time" content="${modifiedDate}">
  <meta property="article:author" content="${author}">
  <meta property="article:section" content="${category}">
  ${Array.isArray(post.tags) ? post.tags.map((t: string) => `<meta property="article:tag" content="${t}">`).join('\n  ') : ''}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${postUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:image:alt" content="${title}">
  <meta name="twitter:site" content="@trendwatchnow">

  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": "${title}",
    "description": "${description}",
    "image": ["${imageUrl}"],
    "datePublished": "${publishedDate}",
    "dateModified": "${modifiedDate}",
    "author": {
      "@type": "Organization",
      "name": "${author}",
      "url": "${siteUrl}"
    },
    "publisher": {
      "@type": "Organization",
      "name": "TrendWatchNow",
      "url": "${siteUrl}",
      "logo": {
        "@type": "ImageObject",
        "url": "${siteUrl}/favicon.svg"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "${postUrl}"
    },
    "articleSection": "${category}",
    "keywords": "${tags}"
  }
  </script>

  <!-- Redirect humans to SPA after meta tags are parsed -->
  <meta http-equiv="refresh" content="0;url=${siteUrl}/?post=${post.slug}">
  
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #1a1a2e; }
    h1 { font-size: 2em; margin-bottom: 0.5em; }
    .meta { color: #666; margin-bottom: 1em; font-size: 0.9em; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    .category { display: inline-block; background: #4f46e5; color: white; padding: 2px 10px; border-radius: 12px; font-size: 0.8em; }
    p { margin-bottom: 1em; }
  </style>
</head>
<body>
  <article>
    <header>
      <span class="category">${category}</span>
      <h1>${title}</h1>
      <div class="meta">
        <span>By ${author}</span> · 
        <time datetime="${publishedDate}">${new Date(publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
        ${post.read_time ? ` · <span>${post.read_time} min read</span>` : ''}
      </div>
    </header>
    ${imageUrl ? `<img src="${imageUrl}" alt="${title}" width="1200" height="630">` : ''}
    <p>${description}</p>
    <div>${contentHtml}</div>
  </article>
  <footer>
    <p><a href="${siteUrl}">← Back to TrendWatchNow</a></p>
  </footer>
  <script>
    // Redirect to SPA immediately for JS-enabled browsers
    window.location.replace('${siteUrl}/?post=${post.slug}');
  </script>
</body>
</html>`;
}

// Generate HTML for category page
function renderCategoryOgHtml(category: string, posts: any[]): string {
  const catUrl = `${siteUrl}/category/${category.toLowerCase()}`;
  const catTitle = category.charAt(0).toUpperCase() + category.slice(1);
  const description = `Latest ${catTitle} news, analysis and trending topics on TrendWatchNow. Stay updated with AI-curated ${catTitle.toLowerCase()} articles.`;
  const firstImage = posts.find((p: any) => p.image_url)?.image_url || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${catTitle} News & Analysis | TrendWatchNow</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${catUrl}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${catUrl}">
  <meta property="og:title" content="${catTitle} News & Analysis | TrendWatchNow">
  <meta property="og:description" content="${description}">
  ${firstImage ? `<meta property="og:image" content="${firstImage}">` : ''}
  <meta property="og:site_name" content="TrendWatchNow">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${catTitle} News & Analysis | TrendWatchNow">
  <meta name="twitter:description" content="${description}">
  ${firstImage ? `<meta name="twitter:image" content="${firstImage}">` : ''}
  <meta http-equiv="refresh" content="0;url=${siteUrl}/?category=${category.toLowerCase()}">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "${catTitle} News & Analysis",
    "description": "${description}",
    "url": "${catUrl}",
    "isPartOf": { "@type": "WebSite", "name": "TrendWatchNow", "url": "${siteUrl}" }
  }
  </script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { font-size: 2em; }
    .post { margin-bottom: 1.5em; padding-bottom: 1.5em; border-bottom: 1px solid #eee; }
    .post h2 { margin-bottom: 0.3em; }
    .post h2 a { color: #4f46e5; text-decoration: none; }
    .meta { color: #666; font-size: 0.85em; }
  </style>
</head>
<body>
  <h1>${catTitle} News & Analysis</h1>
  <p>${description}</p>
  ${posts.slice(0, 20).map((p: any) => `
  <div class="post">
    <h2><a href="${siteUrl}/post/${p.slug}">${(p.title || '').replace(/</g, '&lt;')}</a></h2>
    <div class="meta">${new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    <p>${(p.excerpt || '').replace(/</g, '&lt;')}</p>
  </div>`).join('')}
  <p><a href="${siteUrl}">← Back to TrendWatchNow</a></p>
  <script>window.location.replace('${siteUrl}/?category=${category.toLowerCase()}');</script>
</body>
</html>`;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabase = getSupabase();

    // ==================== OG RENDER: /post/:slug ====================
    if (req.method === 'GET' && req.query?.render === 'og' && req.query?.slug) {
      const slug = req.query.slug as string;
      const userAgent = req.headers['user-agent'] || '';

      // Fetch the post
      const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single();

      if (error || !post) {
        // Post not found — redirect to homepage
        res.setHeader('Location', siteUrl);
        return res.status(302).end();
      }

      // For bots: Serve full HTML with OG tags
      if (isBot(userAgent)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
        return res.status(200).send(renderPostOgHtml(post));
      }

      // For humans: Redirect to SPA with query param
      res.setHeader('Location', `${siteUrl}/?post=${slug}`);
      return res.status(302).end();
    }

    // ==================== OG RENDER: /category/:name ====================
    if (req.method === 'GET' && req.query?.render === 'og' && req.query?.category) {
      const category = req.query.category as string;
      const userAgent = req.headers['user-agent'] || '';

      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('published', true)
        .eq('category', category)
        .order('created_at', { ascending: false })
        .limit(20);

      if (isBot(userAgent)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
        return res.status(200).send(renderCategoryOgHtml(category, posts || []));
      }

      res.setHeader('Location', `${siteUrl}/?category=${category.toLowerCase()}`);
      return res.status(302).end();
    }

    // ==================== GET: Fetch posts (JSON API) ====================
    if (req.method === 'GET') {
      const { category, slug, limit = '50', offset = '0', published } = req.query;

      if (slug && typeof slug === 'string') {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('slug', slug)
          .single();

        if (error) {
          return res.status(404).json({ error: 'Post not found' });
        }
        return res.status(200).json({ post: data });
      }

      let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      // By default, only show published posts for public access
      if (published !== 'all') {
        query = query.eq('published', true);
      }

      if (category && typeof category === 'string') {
        query = query.eq('category', category);
      }

      query = query.range(Number(offset), Number(offset) + Number(limit) - 1);

      const { data, error, count } = await query;
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ posts: data, count });
    }

    // ==================== POST: Create a new post ====================
    if (req.method === 'POST') {
      const { title, slug, excerpt, content, category, image_url, image_alt, author, read_time, published, featured, tags, meta_description, source_url } = req.body;

      if (!title || !slug || !content || !category) {
        return res.status(400).json({ error: 'Title, slug, content, and category are required' });
      }

      const { data, error } = await supabase
        .from('posts')
        .insert([{
          title,
          slug,
          excerpt: excerpt || content.substring(0, 200) + '...',
          content,
          category,
          image_url: image_url || '',
          image_alt: image_alt || title,
          author: author || 'TrendWatch AI',
          read_time: read_time || Math.ceil(content.split(/\s+/).length / 200),
          published: published === true || published === 'true' ? true : false,
          featured: featured === true || featured === 'true' ? true : false,
          tags: tags || [],
          meta_description: meta_description || excerpt,
          source_url: source_url || null,
        }])
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json({ post: data });
    }

    // ==================== PUT: Update a post ====================
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Post ID is required' });
      }

      updates.updated_at = new Date().toISOString();

      // Ensure published is a proper boolean
      if ('published' in updates) {
        updates.published = updates.published === true || updates.published === 'true' ? true : false;
      }
      if ('featured' in updates) {
        updates.featured = updates.featured === true || updates.featured === 'true' ? true : false;
      }

      const { data, error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ post: data });
    }

    // ==================== DELETE: Remove a post ====================
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Post ID is required' });
      }

      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ deleted: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
