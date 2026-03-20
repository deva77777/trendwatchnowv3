import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const groqApiKey = process.env.GROQ_API_KEY || '';
const pexelsApiKey = process.env.PEXELS_API_KEY || '';
const cronSecret = process.env.CRON_SECRET || '';

const RSS_FEEDS = [
  // World News
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', category: 'World' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'World' },
  { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', category: 'World' },
  
  // Technology - OFFICIAL feeds only
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'Technology' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'Technology' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'Technology' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', category: 'Technology' },
  
  // Business
  { name: 'CNBC', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114', category: 'Business' },
  { name: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'Business' },
  
  // Science & Health
  { name: 'Science Daily', url: 'https://www.sciencedaily.com/rss/all.xml', category: 'Science' },
  { name: 'NASA', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', category: 'Science' },
  
  // Politics
  { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss', category: 'Politics' },
  { name: 'Politico', url: 'https://www.politico.com/rss/politicopicks.xml', category: 'Politics' },
];

const CATEGORIES = ['Technology', 'Politics', 'World', 'Business', 'Science', 'Health', 'Entertainment'];

interface RSSItem {
  title: string;
  description: string;
  link: string;
  source: string;
}

async function fetchRSSFeed(feedUrl: string, sourceName: string): Promise<RSSItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'TrendWatchNow/1.0 RSS Reader' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await res.text();
    const items: RSSItem[] = [];
    const itemMatches = text.match(/<item>([\s\S]*?)<\/item>/gi) || [];

    for (const item of itemMatches.slice(0, 10)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/i);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]>|<description>(.*?)<\/description>/i);
      const linkMatch = item.match(/<link>(.*?)<\/link>/i);

      if (titleMatch) {
        items.push({
          title: (titleMatch[1] || titleMatch[2] || '').trim(),
          description: (descMatch?.[1] || descMatch?.[2] || '').replace(/<[^>]*>/g, '').trim(),
          link: (linkMatch?.[1] || '').trim(),
          source: sourceName,
        });
      }
    }

    return items;
  } catch (err) {
    console.error(`Error fetching ${sourceName}:`, err);
    return [];
  }
}

async function fetchPexelsImage(query: string): Promise<{ url: string; alt: string }> {
  if (!pexelsApiKey) {
    return {
      url: `https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=800`,
      alt: query,
    };
  }

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
      { headers: { Authorization: pexelsApiKey } }
    );
    const data = await res.json();

    if (data.photos && data.photos.length > 0) {
      const photo = data.photos[Math.floor(Math.random() * data.photos.length)];
      return {
        url: photo.src.large2x || photo.src.large,
        alt: photo.alt || query,
      };
    }
  } catch (err) {
    console.error('Pexels API error:', err);
  }

  return {
    url: `https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=800`,
    alt: query,
  };
}

async function generateArticle(
  topic: string,
  description: string,
  source: string,
  categoryOverride?: string,
  tone: string = 'Analytical'
): Promise<{
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
} | null> {
  try {
    const prompt = `You are a professional journalist writing for TrendWatchNow, an AI-powered news analysis blog.

Write an in-depth, well-structured article based on this trending topic:
Topic: ${topic}
Description: ${description}
Source: ${source}
Tone: ${tone}

Requirements:
1. Write a compelling, SEO-optimized title (different from the source title)
2. Write a 2-3 sentence excerpt/summary
3. Write 800-1200 words of original content with:
   - An engaging introduction
   - 3-5 sections with ## headers
   - Analysis and expert context (you may reference plausible experts and institutions)
   - A forward-looking conclusion
4. Assign ONE category from: ${CATEGORIES.join(', ')}${categoryOverride ? ` (prefer: ${categoryOverride})` : ''}
5. Suggest 3-5 relevant tags

Respond in valid JSON format:
{
  "title": "...",
  "excerpt": "...",
  "content": "...",
  "category": "...",
  "tags": ["...", "..."]
}`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });

    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    const slug = parsed.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 80);

    return {
      title: parsed.title,
      slug,
      excerpt: parsed.excerpt,
      content: parsed.content,
      category: CATEGORIES.includes(parsed.category) ? parsed.category : (categoryOverride || 'World'),
      tags: parsed.tags || [],
    };
  } catch (err) {
    console.error('Groq API error:', err);
    return null;
  }
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ======== POST: Manual single article generation from Admin ========
  if (req.method === 'POST') {
    const { manual, topic, description, source, category, tone } = req.body || {};

    if (manual && topic) {
      try {
        if (!groqApiKey) {
          return res.status(500).json({ error: 'Groq API key not configured' });
        }

        console.log(`Manual generation: ${topic}`);
        const article = await generateArticle(
          topic,
          description || '',
          source || 'Manual',
          category,
          tone || 'Analytical'
        );

        if (!article) {
          return res.status(500).json({ error: 'AI generation failed' });
        }

        // Fetch image from Pexels
        const imageQuery = article.tags[0] || article.category;
        const image = await fetchPexelsImage(imageQuery);

        const result = {
          ...article,
          image_url: image.url,
          image_alt: image.alt,
        };

        // Optionally save to Supabase if configured
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data, error } = await supabase
            .from('posts')
            .insert([{
              title: article.title,
              slug: article.slug,
              excerpt: article.excerpt,
              content: article.content,
              category: article.category,
              image_url: image.url,
              image_alt: image.alt,
              author: 'TrendWatch AI',
              read_time: Math.ceil(article.content.split(/\s+/).length / 200),
              published: false, // Admin reviews before publishing
              featured: false,
              tags: article.tags,
              meta_description: article.excerpt,
              source_url: null,
            }])
            .select()
            .single();

          if (!error && data) {
            return res.status(200).json({ article: { ...result, id: data.id }, saved: true });
          }
        }

        return res.status(200).json({ article: result, saved: false });
      } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Generation error' });
      }
    }

    return res.status(400).json({ error: 'Missing topic for manual generation' });
  }

  // ======== GET: Automated cron job ========
  const authHeader = req.headers.authorization || '';
  const vercelCronHeader = req.headers['x-vercel-cron'] || '';
  const isManualCron = req.query?.manual === 'true';

  // Authentication: Allow via CRON_SECRET, Vercel cron header, or valid JWT (admin manual trigger)
  let isAuthorized = false;

  // 1. Vercel's built-in cron header
  if (vercelCronHeader) {
    isAuthorized = true;
  }

  // 2. CRON_SECRET in Bearer token
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    isAuthorized = true;
  }

  // 3. JWT auth token from admin (for manual triggers)
  if (!isAuthorized && authHeader.startsWith('Bearer ')) {
    try {
      const { jwtVerify } = await import('jose');
      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
      const token = authHeader.replace('Bearer ', '');
      await jwtVerify(token, new TextEncoder().encode(jwtSecret));
      isAuthorized = true;
    } catch {
      // JWT verification failed — not authorized via this method
    }
  }

  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized. Provide CRON_SECRET or valid admin JWT.' });
  }

  try {
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }
    if (!groqApiKey) {
      return res.status(500).json({ error: 'Groq API key not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ---- Step 1: Read schedule settings from Supabase ----
    let settings: any = {
      enabled: true,
      frequency: 'daily',
      schedule_hour: 3,
      schedule_minute: 30,
      schedule_day: 1,
      articles_per_run: 3,
      auto_publish: true,
      tone: 'Analytical',
      preferred_categories: [],
      last_run_at: null,
    };

    try {
      const { data: settingsRow } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'schedule')
        .single();

      if (settingsRow?.value) {
        settings = { ...settings, ...settingsRow.value };
      }
    } catch (e) {
      console.log('No settings found, using defaults');
    }

    console.log('Schedule settings:', JSON.stringify(settings));

    // ---- Step 2: Check if automation is enabled ----
    if (!settings.enabled && !isManualCron) {
      return res.status(200).json({
        message: 'Automation is disabled. Enable it in Admin → Schedule.',
        skipped: true,
      });
    }

    // ---- Step 3: Check if it's time to run (skip for manual triggers) ----
    if (!isManualCron) {
      const now = new Date();
      const currentHour = now.getUTCHours();
      const currentDay = now.getUTCDay(); // 0=Sun, 1=Mon, ...

      // Check schedule_hour match
      const scheduleHour = settings.schedule_hour ?? 3;
      const scheduleDay = settings.schedule_day ?? 1;
      const frequency = settings.frequency || 'daily';

      let shouldRun = false;

      if (frequency === 'hourly') {
        // Run every hour — always run
        shouldRun = true;
      } else if (frequency === 'every_3h') {
        // Run every 3 hours starting from schedule_hour
        shouldRun = (currentHour - scheduleHour + 24) % 3 === 0;
      } else if (frequency === 'every_6h') {
        shouldRun = (currentHour - scheduleHour + 24) % 6 === 0;
      } else if (frequency === 'every_12h') {
        shouldRun = (currentHour - scheduleHour + 24) % 12 === 0;
      } else if (frequency === 'daily') {
        shouldRun = currentHour === scheduleHour;
      } else if (frequency === 'weekly') {
        shouldRun = currentHour === scheduleHour && currentDay === scheduleDay;
      }

      if (!shouldRun) {
        return res.status(200).json({
          message: `Not scheduled to run now. Frequency: ${frequency}, Schedule hour: ${scheduleHour} UTC, Current hour: ${currentHour} UTC`,
          skipped: true,
        });
      }

      // Check last_run_at to prevent double runs within same hour
      if (settings.last_run_at) {
        const lastRun = new Date(settings.last_run_at);
        const minutesSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60);
        if (minutesSinceLastRun < 50) {
          return res.status(200).json({
            message: `Already ran ${Math.round(minutesSinceLastRun)} minutes ago. Skipping.`,
            skipped: true,
          });
        }
      }
    }

    // ---- Step 4: Fetch RSS feeds ----
    console.log('Fetching RSS feeds...');
    const allItems: RSSItem[] = [];
    const fetchResults = await Promise.allSettled(
      RSS_FEEDS.map(feed => fetchRSSFeed(feed.url, feed.name))
    );
    for (const result of fetchResults) {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value);
      }
    }
    console.log(`Fetched ${allItems.length} RSS items`);

    if (allItems.length === 0) {
      return res.status(200).json({ message: 'No RSS items found', generated: 0 });
    }

    // ---- Step 5: Filter by preferred categories if set ----
    let filteredItems = [...allItems];
    const preferredCategories: string[] = settings.preferred_categories || [];

    if (preferredCategories.length > 0) {
      const categoryKeywords: Record<string, string[]> = {
        'Technology': ['tech', 'ai', 'software', 'app', 'digital', 'cyber', 'data', 'robot', 'computer', 'startup', 'silicon'],
        'Politics': ['politic', 'election', 'government', 'president', 'congress', 'senate', 'democrat', 'republican', 'vote', 'law', 'policy'],
        'World': ['war', 'peace', 'nation', 'country', 'international', 'global', 'diplomat', 'un ', 'nato', 'treaty', 'refugee'],
        'Business': ['business', 'market', 'stock', 'econom', 'trade', 'company', 'revenue', 'profit', 'invest', 'bank', 'finance'],
        'Science': ['science', 'research', 'study', 'discover', 'space', 'nasa', 'climate', 'environment', 'species', 'physics', 'quantum'],
        'Health': ['health', 'medical', 'doctor', 'hospital', 'vaccine', 'disease', 'mental', 'drug', 'patient', 'treatment', 'who '],
        'Entertainment': ['movie', 'film', 'music', 'celebrity', 'award', 'show', 'actor', 'stream', 'game', 'sport', 'concert'],
      };

      const relevantKeywords: string[] = [];
      for (const cat of preferredCategories) {
        if (categoryKeywords[cat]) {
          relevantKeywords.push(...categoryKeywords[cat]);
        }
      }

      if (relevantKeywords.length > 0) {
        const scored = filteredItems.map(item => {
          const text = `${item.title} ${item.description}`.toLowerCase();
          const score = relevantKeywords.filter(kw => text.includes(kw)).length;
          return { item, score };
        });
        scored.sort((a, b) => b.score - a.score);
        // Take items with score > 0 first, then fill with random ones
        const matched = scored.filter(s => s.score > 0).map(s => s.item);
        const unmatched = scored.filter(s => s.score === 0).map(s => s.item);
        filteredItems = [...matched, ...unmatched];
      }
    } else {
      // No preference — randomize
      filteredItems.sort(() => Math.random() - 0.5);
    }

    // ---- Step 6: Select topics based on articles_per_run ----
    const articlesPerRun = Math.min(settings.articles_per_run || 3, 10);
    const selectedTopics = filteredItems.slice(0, articlesPerRun + 5); // extra in case of duplicates
    const tone = settings.preferred_tone || settings.tone || 'Analytical';
    const autoPublish = settings.auto_publish !== false;

    console.log(`Generating ${articlesPerRun} articles with tone: ${tone}, auto_publish: ${autoPublish}`);

    // ---- Step 7: Generate articles ----
    const generatedArticles = [];

    for (const topic of selectedTopics) {
      if (generatedArticles.length >= articlesPerRun) break;

      console.log(`Generating article for: ${topic.title}`);

      // Check for duplicate slugs
      const potentialSlug = topic.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 40);
      const { data: existing } = await supabase
        .from('posts')
        .select('id')
        .ilike('slug', `%${potentialSlug}%`)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`Skipping duplicate topic: ${topic.title}`);
        continue;
      }

      // Pick category override from preferred categories
      const categoryOverride = preferredCategories.length > 0
        ? preferredCategories[Math.floor(Math.random() * preferredCategories.length)]
        : undefined;

      // Generate article with AI using configured tone
      const article = await generateArticle(topic.title, topic.description, topic.source, categoryOverride, tone);
      if (!article) continue;

      // Fetch relevant image from Pexels
      const imageQuery = article.tags[0] || article.category;
      const image = await fetchPexelsImage(imageQuery);

      // Insert into Supabase with auto_publish setting
      const { data, error } = await supabase
        .from('posts')
        .insert([{
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          content: article.content,
          category: article.category,
          image_url: image.url,
          image_alt: image.alt,
          author: 'TrendWatch AI',
          read_time: Math.ceil(article.content.split(/\s+/).length / 200),
          published: autoPublish,
          featured: false,
          tags: article.tags,
          meta_description: article.excerpt,
          source_url: topic.link,
        }])
        .select()
        .single();

      if (error) {
        console.error(`Error inserting article: ${error.message}`);
        continue;
      }

      generatedArticles.push(data);
      console.log(`Generated: ${article.title} (${autoPublish ? 'published' : 'draft'})`);
    }

    // ---- Step 8: Update last_run_at in settings ----
    try {
      await supabase
        .from('settings')
        .update({
          value: {
            ...settings,
            last_run_at: new Date().toISOString(),
          },
        })
        .eq('key', 'schedule');
      console.log('Updated last_run_at');
    } catch (e) {
      console.error('Failed to update last_run_at:', e);
    }

    return res.status(200).json({
      message: `Generated ${generatedArticles.length} articles (${autoPublish ? 'published' : 'drafts'})`,
      generated: generatedArticles.length,
      auto_published: autoPublish,
      tone: tone,
      articles: generatedArticles.map((a: any) => ({ id: a.id, title: a.title, slug: a.slug })),
    });
  } catch (err: any) {
    console.error('Cron error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
