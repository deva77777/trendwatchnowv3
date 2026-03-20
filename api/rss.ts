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

interface FeedItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  category: string;
}

async function parseFeed(feedUrl: string, sourceName: string, defaultCategory: string): Promise<FeedItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'TrendWatchNow/1.0 RSS Reader' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await res.text();
    const items: FeedItem[] = [];
    const itemMatches = text.match(/<item>([\s\S]*?)<\/item>/gi) || [];

    for (const item of itemMatches.slice(0, 15)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/i);
      const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]>|<description>([\s\S]*?)<\/description>/i);
      const linkMatch = item.match(/<link>(.*?)<\/link>/i);
      const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/i);

      if (titleMatch) {
        const title = (titleMatch[1] || titleMatch[2] || '').trim();
        const description = (descMatch?.[1] || descMatch?.[2] || '')
          .replace(/<[^>]*>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();

        items.push({
          title,
          description: description.substring(0, 300),
          link: (linkMatch?.[1] || '').trim(),
          pubDate: dateMatch?.[1] || new Date().toISOString(),
          source: sourceName,
          category: defaultCategory,
        });
      }
    }

    return items;
  } catch (err) {
    console.error(`Error fetching ${sourceName}:`, err);
    return [];
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { source } = req.query;

    let feedsToFetch = RSS_FEEDS;
    if (source && typeof source === 'string') {
      feedsToFetch = RSS_FEEDS.filter(f =>
        f.name.toLowerCase().includes(source.toLowerCase())
      );
      if (feedsToFetch.length === 0) {
        return res.status(404).json({ error: 'Source not found', available: RSS_FEEDS.map(f => f.name) });
      }
    }

    const allItems: FeedItem[] = [];
    const results = await Promise.allSettled(
      feedsToFetch.map(feed => parseFeed(feed.url, feed.name, feed.category))
    );

    const sources: Record<string, number> = {};
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const feedName = feedsToFetch[i].name;
      if (result.status === 'fulfilled') {
        allItems.push(...result.value);
        sources[feedName] = result.value.length;
      } else {
        sources[feedName] = 0;
      }
    }

    // Sort by pubDate (newest first)
    allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    return res.status(200).json({
      items: allItems,
      total: allItems.length,
      sources,
      fetched_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('RSS fetch error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch RSS feeds' });
  }
}
