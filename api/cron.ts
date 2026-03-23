import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const groqApiKey = process.env.GROQ_API_KEY || '';
const pexelsApiKey = process.env.PEXELS_API_KEY || '';
const tavilyApiKey = process.env.TAVILY_API_KEY || '';
const cronSecret = process.env.CRON_SECRET || '';

const RSS_FEEDS = [
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', category: 'World' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'World' },
  { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', category: 'World' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'Technology' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'Technology' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'Technology' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', category: 'Technology' },
  { name: 'CNBC', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114', category: 'Business' },
  { name: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'Business' },
  { name: 'Science Daily', url: 'https://www.sciencedaily.com/rss/all.xml', category: 'Science' },
  { name: 'NASA', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', category: 'Science' },
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

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface ResearchBundle {
  query: string;
  results: TavilyResult[];
  combinedText: string;
}


// ─── RSS Fetcher ────────────────────────────────────────────────────────────

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

// ─── Tavily Research ─────────────────────────────────────────────────────────
// Takes an RSS headline, searches 3-5 sources, returns clean combined content

async function researchWithTavily(topic: string, originalLink: string): Promise<ResearchBundle> {
  const empty: ResearchBundle = { query: topic, results: [], combinedText: '' };
  if (!tavilyApiKey) {
    console.log('No TAVILY_API_KEY — skipping deep research');
    return empty;
  }
  try {
    console.log(`Tavily researching: "${topic}"`);
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tavilyApiKey}`,
      },
      body: JSON.stringify({
        query: topic,
        search_depth: 'advanced',
        max_results: 5,
        include_answer: false,
        include_raw_content: false,
        exclude_domains: ['youtube.com', 'tiktok.com', 'reddit.com'],
      }),
    });
    if (!res.ok) {
      console.error(`Tavily HTTP error: ${res.status}`);
      return empty;
    }
    const data = await res.json();
    const results: TavilyResult[] = (data.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      content: (r.content || '').substring(0, 1500),
      score: r.score || 0,
      published_date: r.published_date || '',
    }));
    if (results.length === 0) return empty;
    const combinedText = results
      .map((r, i) =>
        `SOURCE ${i + 1}: ${r.title}\nURL: ${r.url}${r.published_date ? `\nDate: ${r.published_date}` : ''}\n\n${r.content}`
      )
      .join('\n\n---\n\n');
    console.log(`Tavily: ${results.length} sources, ${combinedText.length} chars`);
    return { query: topic, results, combinedText };
  } catch (err) {
    console.error('Tavily error:', err);
    return empty;
  }
}

// ─── Pexels Image ────────────────────────────────────────────────────────────

async function fetchPexelsImage(query: string): Promise<{ url: string; alt: string }> {
  const fallback = {
    url: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: query,
  };
  if (!pexelsApiKey) return fallback;
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
      { headers: { Authorization: pexelsApiKey } }
    );
    const data = await res.json();
    if (data.photos?.length > 0) {
      const photo = data.photos[Math.floor(Math.random() * data.photos.length)];
      return { url: photo.src.large2x || photo.src.large, alt: photo.alt || query };
    }
  } catch (err) {
    console.error('Pexels error:', err);
  }
  return fallback;
}

// ─── Article Generator ───────────────────────────────────────────────────────
// Powered by multi-source Tavily research + Groq writing

async function generateArticle(
  topic: string,
  description: string,
  rssSource: string,
  categoryOverride?: string,
  tone: string = 'Analytical',
  research?: ResearchBundle
): Promise<{
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  citations: { title: string; url: string }[];
} | null> {
  try {
    const hasResearch = research && research.results.length > 0;

    const sourcesBlock = hasResearch
      ? `You have been given content from ${research!.results.length} real, freshly-searched sources on this topic:\n\n${research!.combinedText}\n\nSource reference list:\n${research!.results.map((r, i) => `[${i + 1}] ${r.title} — ${r.url}`).join('\n')}`
      : `TOPIC: ${topic}\nDESCRIPTION: ${description}\nSOURCE: ${rssSource}\n\n(No external research available — write from your knowledge.)`;

    const prompt = `You are a senior journalist at TrendWatchNow, known for sharp, fact-driven reporting.

${sourcesBlock}

TASK: Write a high-quality original news article on: "${topic}"

WRITING RULES:
- Tone: ${tone}
- Synthesize sources — do NOT copy sentences verbatim
- Lead with the single most important or surprising fact (inverted pyramid)
- Use SPECIFIC details: real names, exact numbers, dates, statistics from the sources
- Explain WHY this matters — context and broader significance
- Short paragraphs: 2-4 sentences max
- NO filler phrases: "experts believe", "many say", "it remains to be seen", "in conclusion"
- When citing a specific fact from a source, add [1], [2] etc inline
- End with what to watch: concrete upcoming events, decisions, or dates

STRUCTURE (800-1100 words total):
Opening paragraph (no header) — hook with the KEY fact
## What Happened — the core news in detail
## Why It Matters — context, significance, stakes
## Key Details — data, reactions, quotes, numbers
## What to Watch — next steps, upcoming dates, implications

Respond ONLY in this exact JSON format:
{
  "title": "Specific informative headline, not clickbait",
  "excerpt": "2-3 sentence summary of the core story",
  "content": "Full article text in markdown...",
  "category": "MUST be exactly one of: Technology, Politics, World, Business, Science, Health, Entertainment",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "citations": [{"title": "Source Name", "url": "https://..."}]
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
        temperature: 0.55,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });

    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    let finalContent = parsed.content || '';
    const citations: { title: string; url: string }[] = parsed.citations || [];

    // Append a sources section at the bottom of the article
    if (citations.length > 0) {
      const citationBlock = '\n\n## Sources\n' + citations.map((c, i) => `[${i + 1}] [${c.title}](${c.url})`).join('\n');
      finalContent += citationBlock;
    }

    const slug = parsed.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 80);

    return {
      title: parsed.title,
      slug,
      excerpt: parsed.excerpt,
      content: finalContent,
      category: CATEGORIES.includes(parsed.category) ? parsed.category : (categoryOverride || 'World'),
      tags: parsed.tags || [],
      citations,
    };
  } catch (err) {
    console.error('Groq API error:', err);
    return null;
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── POST: Manual generation from Admin dashboard ──
  if (req.method === 'POST') {
    const { manual, topic, description, source, category, tone } = req.body || {};
    if (manual && topic) {
      try {
        if (!groqApiKey) return res.status(500).json({ error: 'Groq API key not configured' });
        console.log(`Manual generation: ${topic}`);

        const research = await researchWithTavily(topic, source || '');
        const article = await generateArticle(topic, description || '', source || 'Manual', category, tone || 'Analytical', research);
        if (!article) return res.status(500).json({ error: 'AI generation failed' });

        const image = await fetchPexelsImage(article.tags[0] || article.category);
        const result = { ...article, image_url: image.url, image_alt: image.alt };

        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data, error } = await supabase
            .from('posts')
            .insert([{
              title: article.title, slug: article.slug, excerpt: article.excerpt,
              content: article.content, category: article.category,
              image_url: image.url, image_alt: image.alt,
              author: 'TrendWatch AI',
              read_time: Math.ceil(article.content.split(/\s+/).length / 200),
              published: false, featured: false,
              tags: article.tags, meta_description: article.excerpt, source_url: source || null,
            }])
            .select().single();
          if (!error && data) {
            return res.status(200).json({ article: { ...result, id: data.id }, saved: true, sources_used: research.results.length });
          }
        }
        return res.status(200).json({ article: result, saved: false, sources_used: research.results.length });
      } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Generation error' });
      }
    }
    return res.status(400).json({ error: 'Missing topic for manual generation' });
  }

  // ── GET: Automated cron job ──
  const authHeader = req.headers.authorization || '';
  const vercelCronHeader = req.headers['x-vercel-cron'] || '';
  const isManualCron = req.query?.manual === 'true';
  let isAuthorized = false;

  if (vercelCronHeader) isAuthorized = true;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) isAuthorized = true;
  if (!isAuthorized && authHeader.startsWith('Bearer ')) {
    try {
      const { jwtVerify } = await import('jose');
      const token = authHeader.replace('Bearer ', '');
      await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret'));
      isAuthorized = true;
    } catch { /* not authorized */ }
  }
  if (!isAuthorized) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Supabase not configured' });
    if (!groqApiKey) return res.status(500).json({ error: 'Groq API key not configured' });

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load settings
    let settings: any = {
      enabled: true, frequency: 'daily', schedule_hour: 3, schedule_minute: 30,
      schedule_day: 1, articles_per_run: 3, auto_publish: true,
      tone: 'Analytical', preferred_categories: [], last_run_at: null,
    };
    try {
      const { data: s } = await supabase.from('settings').select('value').eq('key', 'schedule').single();
      if (s?.value) settings = { ...settings, ...s.value };
    } catch { console.log('Using default settings'); }

    if (!settings.enabled && !isManualCron) {
      return res.status(200).json({ message: 'Automation disabled.', skipped: true });
    }

    if (!isManualCron) {
      const now = new Date();
      const h = now.getUTCHours();
      const d = now.getUTCDay();
      const sh = settings.schedule_hour ?? 3;
      const freq = settings.frequency || 'daily';
      let shouldRun = false;
      if (freq === 'hourly') shouldRun = true;
      else if (freq === 'every_3h') shouldRun = (h - sh + 24) % 3 === 0;
      else if (freq === 'every_6h') shouldRun = (h - sh + 24) % 6 === 0;
      else if (freq === 'every_12h') shouldRun = (h - sh + 24) % 12 === 0;
      else if (freq === 'daily') shouldRun = h === sh;
      else if (freq === 'weekly') shouldRun = h === sh && d === (settings.schedule_day ?? 1);
      if (!shouldRun) return res.status(200).json({ message: `Not scheduled. Freq: ${freq}, at ${sh}h UTC, now ${h}h UTC`, skipped: true });
      if (settings.last_run_at) {
        const mins = (Date.now() - new Date(settings.last_run_at).getTime()) / 60000;
        if (mins < 50) return res.status(200).json({ message: `Already ran ${Math.round(mins)}m ago.`, skipped: true });
      }
    }

    // Fetch RSS
    console.log('Fetching RSS feeds...');
    const allItems: RSSItem[] = [];
    const rssResults = await Promise.allSettled(RSS_FEEDS.map(f => fetchRSSFeed(f.url, f.name)));
    for (const r of rssResults) { if (r.status === 'fulfilled') allItems.push(...r.value); }
    console.log(`${allItems.length} RSS items fetched`);
    if (allItems.length === 0) return res.status(200).json({ message: 'No RSS items', generated: 0 });

    // Filter by preferred categories
    let filteredItems = [...allItems];
    const preferredCategories: string[] = settings.preferred_categories || [];
    if (preferredCategories.length > 0) {
      const kw: Record<string, string[]> = {
        Technology: ['tech', 'ai', 'software', 'app', 'digital', 'cyber', 'data', 'robot', 'computer', 'startup'],
        Politics: ['politic', 'election', 'government', 'president', 'congress', 'senate', 'vote', 'policy'],
        World: ['war', 'peace', 'nation', 'international', 'global', 'diplomat', 'nato', 'treaty'],
        Business: ['business', 'market', 'stock', 'econom', 'trade', 'company', 'revenue', 'invest'],
        Science: ['science', 'research', 'study', 'discover', 'space', 'nasa', 'climate', 'physics'],
        Health: ['health', 'medical', 'doctor', 'hospital', 'vaccine', 'disease', 'mental', 'drug'],
        Entertainment: ['movie', 'film', 'music', 'celebrity', 'award', 'show', 'actor', 'stream'],
      };
      const relevantKw = preferredCategories.flatMap(c => kw[c] || []);
      if (relevantKw.length > 0) {
        const scored = filteredItems.map(item => ({
          item, score: relevantKw.filter(k => `${item.title} ${item.description}`.toLowerCase().includes(k)).length,
        }));
        scored.sort((a, b) => b.score - a.score);
        filteredItems = scored.map(s => s.item);
      }
    } else {
      filteredItems.sort(() => Math.random() - 0.5);
    }

    const articlesPerRun = Math.min(settings.articles_per_run || 3, 10);
    const selectedTopics = filteredItems.slice(0, articlesPerRun + 5);
    const tone = settings.preferred_tone || settings.tone || 'Analytical';
    const autoPublish = settings.auto_publish !== false;

    console.log(`Generating ${articlesPerRun} articles | tone: ${tone} | Tavily: ${tavilyApiKey ? 'ON' : 'OFF'}`);

    const generatedArticles = [];

    for (const topic of selectedTopics) {
      if (generatedArticles.length >= articlesPerRun) break;
      console.log(`\n→ Topic: ${topic.title}`);

      // Deduplicate check
      const potSlug = topic.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 40);
      const { data: existing } = await supabase.from('posts').select('id').ilike('slug', `%${potSlug}%`).limit(1);
      if (existing?.length) { console.log(`  Skip (duplicate)`); continue; }

      const categoryOverride = preferredCategories.length > 0
        ? preferredCategories[Math.floor(Math.random() * preferredCategories.length)]
        : undefined;

      // 🔍 STEP A: Tavily research — RSS headline → 3-5 real sources
      const research = await researchWithTavily(topic.title, topic.link);

      // ✍️ STEP B: Groq writes article from real research
      const article = await generateArticle(topic.title, topic.description, topic.source, categoryOverride, tone, research);
      if (!article) continue;

      // 🖼️ STEP C: Pexels image
      const image = await fetchPexelsImage(article.tags[0] || article.category);

      // 💾 STEP D: Save to Supabase
      const { data, error } = await supabase
        .from('posts')
        .insert([{
          title: article.title, slug: article.slug, excerpt: article.excerpt,
          content: article.content, category: article.category,
          image_url: image.url, image_alt: image.alt,
          author: 'TrendWatch AI',
          read_time: Math.ceil(article.content.split(/\s+/).length / 200),
          published: autoPublish, featured: false,
          tags: article.tags, meta_description: article.excerpt, source_url: topic.link,
        }])
        .select().single();

      if (error) { console.error(`  Insert error: ${error.message}`); continue; }

      generatedArticles.push(data);
      console.log(`  ✓ "${article.title}" | ${research.results.length} Tavily sources | ${autoPublish ? 'published' : 'draft'}`);
    }

    // Update last_run_at
    try {
      await supabase.from('settings').update({ value: { ...settings, last_run_at: new Date().toISOString() } }).eq('key', 'schedule');
    } catch (e) { console.error('last_run_at update failed:', e); }

    return res.status(200).json({
      message: `Generated ${generatedArticles.length} articles (${autoPublish ? 'published' : 'drafts'})`,
      generated: generatedArticles.length,
      auto_published: autoPublish,
      tone,
      tavily_enabled: !!tavilyApiKey,
      articles: generatedArticles.map((a: any) => ({ id: a.id, title: a.title, slug: a.slug })),
    });
  } catch (err: any) {
    console.error('Cron error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
