import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, FileText, Eye, EyeOff, Clock, Sparkles,
  LogOut, TrendingUp, BarChart3, Trash2, Edit3,
  Plus, RefreshCw, Rss, Globe, Zap,
  X, Check, Save, ExternalLink, Loader2, AlertCircle,
  Newspaper, Send, Settings, Timer, Power, CalendarClock,
  Hash, Layers, ToggleLeft, ToggleRight, Play, Pause,
  ChevronDown, Info, PieChart, Calendar, Tag, BookOpen,
  ArrowUp, ArrowDown, Minus, Activity, Target, Award, CheckCircle,
  Sun, Moon
} from 'lucide-react';
import { Post, RSSItem, CATEGORY_COLORS, CATEGORIES } from '../types';

interface AdminDashboardProps {
  posts: Post[];
  authToken: string | null;
  hasBackend: boolean;
  apiBase: string;
  onLogout: () => void;
  onBack: () => void;
  onCreatePost: (post: Partial<Post>) => Promise<Post | null>;
  onUpdatePost: (id: string, updates: Partial<Post>) => Promise<Post | null>;
  onDeletePost: (id: string) => Promise<boolean>;
  isDark?: boolean;
  onToggleDark?: () => void;
}

type Tab = 'overview' | 'posts' | 'generate' | 'sources' | 'settings' | 'analytics';

interface GeneratedArticle {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  image_url: string;
  image_alt: string;
}

interface ScheduleSettings {
  enabled: boolean;
  frequency: 'every_hour' | 'every_3h' | 'every_6h' | 'every_12h' | 'daily' | 'weekly';
  time_utc: string; // HH:MM in UTC
  day_of_week: number; // 0=Sunday, 1=Monday, ... (for weekly)
  articles_per_run: number;
  auto_publish: boolean;
  preferred_categories: string[];
  preferred_tone: string;
  last_run_at: string | null;
  next_run_at: string | null;
}

const DEFAULT_SETTINGS: ScheduleSettings = {
  enabled: false,
  frequency: 'daily',
  time_utc: '03:30',
  day_of_week: 1,
  articles_per_run: 3,
  auto_publish: true,
  preferred_categories: [],
  preferred_tone: 'Analytical',
  last_run_at: null,
  next_run_at: null,
};

const FREQUENCY_OPTIONS = [
  { value: 'every_hour', label: 'Every Hour', desc: '24 runs/day', icon: '⚡' },
  { value: 'every_3h', label: 'Every 3 Hours', desc: '8 runs/day', icon: '🔄' },
  { value: 'every_6h', label: 'Every 6 Hours', desc: '4 runs/day', icon: '📊' },
  { value: 'every_12h', label: 'Every 12 Hours', desc: '2 runs/day', icon: '📰' },
  { value: 'daily', label: 'Once Daily', desc: '1 run/day', icon: '📅' },
  { value: 'weekly', label: 'Once Weekly', desc: '1 run/week', icon: '📆' },
];

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function utcToLocal(utcTime: string): string {
  const [h, m] = utcTime.split(':').map(Number);
  const d = new Date();
  d.setUTCHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getNextRunDescription(settings: ScheduleSettings): string {
  if (!settings.enabled) return 'Automation is paused';
  const localTime = utcToLocal(settings.time_utc);
  switch (settings.frequency) {
    case 'every_hour': return `Every hour, generating ${settings.articles_per_run} article(s)`;
    case 'every_3h': return `Every 3 hours, generating ${settings.articles_per_run} article(s)`;
    case 'every_6h': return `Every 6 hours, generating ${settings.articles_per_run} article(s)`;
    case 'every_12h': return `Every 12 hours, generating ${settings.articles_per_run} article(s)`;
    case 'daily': return `Daily at ${localTime} (your local time), generating ${settings.articles_per_run} article(s)`;
    case 'weekly': return `Every ${DAYS_OF_WEEK[settings.day_of_week]} at ${localTime}, generating ${settings.articles_per_run} article(s)`;
    default: return '';
  }
}

// ===================== PostEditor Component =====================
function PostEditor({
  post,
  onSave,
  onCancel,
  saving,
}: {
  post?: Post;
  onSave: (data: Partial<Post>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(post?.title || '');
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [content, setContent] = useState(post?.content || '');
  const [category, setCategory] = useState(post?.category || 'Technology');
  const [imageUrl, setImageUrl] = useState(post?.image_url || '');
  const [imageAlt, setImageAlt] = useState(post?.image_alt || '');
  const [published, setPublished] = useState(post?.published ?? false);
  const [featured, setFeatured] = useState(post?.featured ?? false);
  const [tagsStr, setTagsStr] = useState((post?.tags || []).join(', '));

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 80);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      slug,
      excerpt,
      content,
      category,
      image_url: imageUrl,
      image_alt: imageAlt || title,
      published,
      featured,
      tags: tagsStr
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
      author: 'TrendWatch AI',
      read_time: Math.ceil(content.split(/\s+/).length / 200),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">
            {post ? 'Edit Post' : 'Create New Post'}
          </h3>
          <button onClick={onCancel} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter article title..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            {title && (
              <p className="text-xs text-gray-400 mt-1">
                Slug: <span className="font-mono text-gray-500">{slug}</span>
              </p>
            )}
          </div>

          {/* Category + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
              >
                {CATEGORIES.filter(c => c !== 'All').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={e => setPublished(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm font-medium text-gray-700">Published</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={e => setFeatured(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm font-medium text-gray-700">Featured</span>
              </label>
            </div>
          </div>

          {/* Image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://images.pexels.com/..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Image Alt Text</label>
              <input
                type="text"
                value={imageAlt}
                onChange={e => setImageAlt(e.target.value)}
                placeholder="Describe the image..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Image preview */}
          {imageUrl && (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 h-40">
              <img src={imageUrl} alt={imageAlt} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Excerpt</label>
            <textarea
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              rows={2}
              placeholder="Brief summary of the article..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Content * <span className="text-xs font-normal text-gray-400">(Markdown supported: ## headers, **bold**, - lists)</span>
            </label>
            <textarea
              required
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={14}
              placeholder="Write your article content here using Markdown..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">
              ~{Math.ceil(content.split(/\s+/).filter(Boolean).length / 200)} min read • {content.split(/\s+/).filter(Boolean).length} words
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tags</label>
            <input
              type="text"
              value={tagsStr}
              onChange={e => setTagsStr(e.target.value)}
              placeholder="AI, Technology, Future of Work (comma separated)"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={saving || !title || !content}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-500 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {post ? 'Update Post' : 'Create Post'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== Main Dashboard =====================
export default function AdminDashboard({
  posts,
  authToken,
  hasBackend,
  apiBase,
  onLogout,
  onBack,
  onCreatePost,
  onUpdatePost,
  onDeletePost,
  isDark,
  onToggleDark,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [creatingPost, setCreatingPost] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // AI Generate state
  const [rssTopics, setRssTopics] = useState<RSSItem[]>([]);
  const [fetchingRss, setFetchingRss] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<RSSItem | null>(null);
  const [manualTopic, setManualTopic] = useState('');
  const [genCategory, setGenCategory] = useState('');
  const [genTone, setGenTone] = useState('Analytical');
  const [generating, setGenerating] = useState(false);
  const [generatedArticle, setGeneratedArticle] = useState<GeneratedArticle | null>(null);
  const [publishing, setPublishing] = useState(false);

  // RSS Sources tab state
  const [rssSourceItems, setRssSourceItems] = useState<Record<string, RSSItem[]>>({});
  const [fetchingAllRss, setFetchingAllRss] = useState(false);

  // Schedule Settings state
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [triggeringManualRun, setTriggeringManualRun] = useState(false);

  const publishedPosts = posts.filter(p => p.published);
  const draftPosts = posts.filter(p => !p.published);
  const categories = [...new Set(posts.map(p => p.category))];

  // Auto-clear status messages
  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: Activity },
    { id: 'posts', label: 'Posts', icon: FileText },
    { id: 'generate', label: 'AI Generate', icon: Sparkles },
    { id: 'sources', label: 'RSS Sources', icon: Rss },
    { id: 'settings', label: 'Schedule', icon: Settings },
  ];

  const stats = [
    { label: 'Total Posts', value: posts.length, icon: FileText, color: 'from-blue-500 to-blue-600' },
    { label: 'Published', value: publishedPosts.length, icon: Eye, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Drafts', value: draftPosts.length, icon: Clock, color: 'from-amber-500 to-amber-600' },
    { label: 'Categories', value: categories.length, icon: BarChart3, color: 'from-purple-500 to-purple-600' },
  ];

  const rssSources = [
    // World News
    { name: 'BBC News', url: 'feeds.bbci.co.uk/news/rss.xml', category: 'World' },
    { name: 'Al Jazeera', url: 'aljazeera.com/xml/rss/all.xml', category: 'World' },
    { name: 'NPR News', url: 'feeds.npr.org/1001/rss.xml', category: 'World' },
    // Technology
    { name: 'Wired', url: 'wired.com/feed/rss', category: 'Technology' },
    { name: 'Ars Technica', url: 'feeds.arstechnica.com/arstechnica/index', category: 'Technology' },
    { name: 'The Verge', url: 'theverge.com/rss/index.xml', category: 'Technology' },
    { name: 'Hacker News', url: 'hnrss.org/frontpage', category: 'Technology' },
    // Business
    { name: 'CNBC', url: 'search.cnbc.com/rs/search/combinedcms/view.xml', category: 'Business' },
    { name: 'Bloomberg', url: 'feeds.bloomberg.com/markets/news.rss', category: 'Business' },
    // Science
    { name: 'Science Daily', url: 'sciencedaily.com/rss/all.xml', category: 'Science' },
    { name: 'NASA', url: 'nasa.gov/rss/dyn/breaking_news.rss', category: 'Science' },
    // Politics
    { name: 'The Guardian', url: 'theguardian.com/world/rss', category: 'Politics' },
    { name: 'Politico', url: 'politico.com/rss/politicopicks.xml', category: 'Politics' },
  ];

  // ===== CRUD handlers =====
  const handleSavePost = async (data: Partial<Post>) => {
    setSaving(true);
    try {
      if (editingPost) {
        await onUpdatePost(editingPost.id, data);
        setStatusMsg({ type: 'success', text: `"${data.title}" updated successfully.` });
        setEditingPost(null);
      } else {
        await onCreatePost(data);
        setStatusMsg({ type: 'success', text: `"${data.title}" created successfully.` });
        setCreatingPost(false);
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to save post. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const post = posts.find(p => p.id === id);
    const ok = await onDeletePost(id);
    if (ok) {
      setStatusMsg({ type: 'success', text: `"${post?.title}" deleted.` });
    } else {
      setStatusMsg({ type: 'error', text: 'Failed to delete post.' });
    }
    setDeleteConfirm(null);
  };

  const handleTogglePublish = async (post: Post) => {
    await onUpdatePost(post.id, { published: !post.published });
    setStatusMsg({
      type: 'success',
      text: post.published
        ? `"${post.title}" unpublished.`
        : `"${post.title}" published!`,
    });
  };

  // ===== RSS Fetch =====
  const fetchRSSTopics = async () => {
    setFetchingRss(true);
    setRssTopics([]);
    try {
      if (hasBackend) {
        const res = await fetch(`${apiBase}/rss`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setRssTopics(data.items || []);
          setStatusMsg({ type: 'success', text: `Fetched ${data.total || 0} trending topics from ${Object.keys(data.sources || {}).length} sources.` });
        } else {
          setStatusMsg({ type: 'error', text: 'Failed to fetch RSS feeds.' });
        }
      } else {
        // Demo mode — generate mock RSS items
        const demoItems: RSSItem[] = [
          { title: 'AI Agents Are Becoming Enterprise-Ready', description: 'Major tech companies are deploying autonomous AI agents for enterprise workflows, raising questions about the future of knowledge work.', link: 'https://example.com/1', pubDate: new Date().toISOString(), source: 'TechCrunch', category: 'Technology' },
          { title: 'Global Markets Rally on Fed Rate Cut Signals', description: 'Stock markets worldwide surge as Federal Reserve hints at potential interest rate cuts in the coming quarter.', link: 'https://example.com/2', pubDate: new Date().toISOString(), source: 'Reuters', category: 'Business' },
          { title: 'Breakthrough in Solid-State Battery Technology', description: 'Toyota announces a major breakthrough in solid-state battery technology that could revolutionize electric vehicles.', link: 'https://example.com/3', pubDate: new Date().toISOString(), source: 'BBC News', category: 'Science' },
          { title: 'New Climate Accord Draws Criticism from Developing Nations', description: 'A new climate agreement faces pushback from developing nations who say it doesn\'t go far enough to address historical emissions.', link: 'https://example.com/4', pubDate: new Date().toISOString(), source: 'Al Jazeera', category: 'World' },
          { title: 'Streaming Wars Heat Up with Live Sports Deals', description: 'Netflix, Amazon, and Apple compete for exclusive live sports broadcasting rights in multi-billion dollar deals.', link: 'https://example.com/5', pubDate: new Date().toISOString(), source: 'The Guardian', category: 'Entertainment' },
          { title: 'Cybersecurity Threats Surge in Healthcare Sector', description: 'Hospitals and healthcare providers face unprecedented wave of ransomware attacks, prompting calls for federal intervention.', link: 'https://example.com/6', pubDate: new Date().toISOString(), source: 'BBC News', category: 'Health' },
        ];
        setRssTopics(demoItems);
        setStatusMsg({ type: 'success', text: 'Loaded 6 demo trending topics (connect backend for live RSS).' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Error connecting to RSS feeds.' });
    } finally {
      setFetchingRss(false);
    }
  };

  // ===== AI Generate =====
  const generateArticle = async () => {
    const topic = selectedTopic?.title || manualTopic;
    if (!topic) {
      setStatusMsg({ type: 'error', text: 'Please select a topic or enter one manually.' });
      return;
    }

    setGenerating(true);
    setGeneratedArticle(null);

    try {
      if (hasBackend) {
        // Call the cron endpoint with specific topic for single article generation
        const res = await fetch(`${apiBase}/cron`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            manual: true,
            topic,
            description: selectedTopic?.description || '',
            source: selectedTopic?.source || 'Manual',
            category: genCategory || undefined,
            tone: genTone,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.article) {
            setGeneratedArticle(data.article);
            setStatusMsg({ type: 'success', text: 'Article generated! Review and publish below.' });
          } else {
            setStatusMsg({ type: 'error', text: 'AI could not generate an article. Try again.' });
          }
        } else {
          setStatusMsg({ type: 'error', text: 'Generation failed. Check API keys.' });
        }
      } else {
        // Demo mode — simulate AI generation
        await new Promise(r => setTimeout(r, 2000));
        const cat = genCategory || selectedTopic?.category || 'Technology';
        const demoArticle: GeneratedArticle = {
          title: `In-Depth Analysis: ${topic}`,
          slug: topic.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 80),
          excerpt: `A comprehensive analysis of "${topic}" exploring its implications, key developments, and what experts are saying about this trending topic.`,
          content: `The topic of "${topic}" has been making headlines across major news outlets, signaling a significant shift in how we understand this space.\n\n## Background\n\nThis story has been developing over several weeks, with multiple stakeholders weighing in on the implications. Industry experts have noted that this represents a pivotal moment that could reshape the landscape for years to come.\n\n## Key Developments\n\nSeveral critical factors have converged to bring this topic to the forefront:\n\n- **Growing public interest** in the subject has reached an all-time high\n- **Policy makers** are being forced to address the issue head-on\n- **Industry leaders** are positioning themselves for what comes next\n- **Research institutions** have published new findings that add context\n\n## Expert Analysis\n\n"This is one of the most significant developments we've seen in recent memory," said Dr. Sarah Chen, a leading researcher in the field. "The implications extend far beyond what most people realize."\n\nThe data supports this assessment. According to recent studies, the trend has accelerated by over 300% in the past year alone, outpacing most predictions.\n\n## What It Means Going Forward\n\nAs this story continues to develop, several outcomes seem likely:\n\n1. Increased regulatory attention and potential policy changes\n2. Significant investment flowing into related sectors\n3. A fundamental shift in public understanding and discourse\n4. New opportunities for innovation and disruption\n\n## Conclusion\n\nWhile it's too early to predict exactly how this will play out, one thing is clear: "${topic}" is not a passing trend. It represents a fundamental shift that will have lasting implications across multiple domains. Staying informed and engaged with these developments will be crucial for anyone looking to understand and navigate the changes ahead.`,
          category: cat,
          tags: [cat, 'Trending', 'Analysis', '2025'],
          image_url: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=800',
          image_alt: topic,
        };
        setGeneratedArticle(demoArticle);
        setStatusMsg({ type: 'success', text: 'Demo article generated! Review and publish below.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Error during generation. Please try again.' });
    } finally {
      setGenerating(false);
    }
  };

  const publishGeneratedArticle = async () => {
    if (!generatedArticle) return;
    setPublishing(true);
    try {
      await onCreatePost({
        title: generatedArticle.title,
        slug: generatedArticle.slug,
        excerpt: generatedArticle.excerpt,
        content: generatedArticle.content,
        category: generatedArticle.category,
        image_url: generatedArticle.image_url,
        image_alt: generatedArticle.image_alt,
        tags: generatedArticle.tags,
        published: true,
        featured: false,
        author: 'TrendWatch AI',
      });
      setStatusMsg({ type: 'success', text: `"${generatedArticle.title}" published!` });
      setGeneratedArticle(null);
      setSelectedTopic(null);
      setManualTopic('');
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to publish article.' });
    } finally {
      setPublishing(false);
    }
  };

  const saveDraftGeneratedArticle = async () => {
    if (!generatedArticle) return;
    setPublishing(true);
    try {
      await onCreatePost({
        ...generatedArticle,
        published: false,
      });
      setStatusMsg({ type: 'success', text: `"${generatedArticle.title}" saved as draft.` });
      setGeneratedArticle(null);
      setSelectedTopic(null);
      setManualTopic('');
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to save draft.' });
    } finally {
      setPublishing(false);
    }
  };

  // ===== RSS Sources Fetch All =====
  const fetchAllSources = async () => {
    setFetchingAllRss(true);
    try {
      if (hasBackend) {
        const res = await fetch(`${apiBase}/rss`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          const grouped: Record<string, RSSItem[]> = {};
          for (const item of (data.items || []) as RSSItem[]) {
            if (!grouped[item.source]) grouped[item.source] = [];
            grouped[item.source].push(item);
          }
          setRssSourceItems(grouped);
          setStatusMsg({ type: 'success', text: `Fetched ${data.total || 0} items from ${Object.keys(grouped).length} sources.` });
        }
      } else {
        setStatusMsg({ type: 'success', text: 'Connect backend for live RSS feed data.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Error fetching RSS sources.' });
    } finally {
      setFetchingAllRss(false);
    }
  };

  // ===== Schedule Settings =====
  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      if (hasBackend) {
        const res = await fetch(`${apiBase}/admin?action=settings`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setScheduleSettings({ ...DEFAULT_SETTINGS, ...data.settings });
            setSettingsLoaded(true);
            return;
          }
        }
      }
      // Try localStorage fallback
      const saved = localStorage.getItem('twn_schedule_settings');
      if (saved) {
        setScheduleSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
      setSettingsLoaded(true);
    } catch {
      const saved = localStorage.getItem('twn_schedule_settings');
      if (saved) {
        setScheduleSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
      setSettingsLoaded(true);
    } finally {
      setLoadingSettings(false);
    }
  }, [hasBackend, apiBase, authToken]);

  useEffect(() => {
    if (activeTab === 'settings' && !settingsLoaded) {
      loadSettings();
    }
  }, [activeTab, settingsLoaded, loadSettings]);

  const updateSetting = <K extends keyof ScheduleSettings>(key: K, value: ScheduleSettings[K]) => {
    setScheduleSettings(prev => ({ ...prev, [key]: value }));
    setSettingsDirty(true);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      // Always save to localStorage as fallback
      localStorage.setItem('twn_schedule_settings', JSON.stringify(scheduleSettings));

      if (hasBackend) {
        const res = await fetch(`${apiBase}/admin`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ action: 'save_settings', settings: scheduleSettings }),
        });
        if (res.ok) {
          setStatusMsg({ type: 'success', text: 'Schedule settings saved successfully!' });
          setSettingsDirty(false);
          return;
        } else {
          setStatusMsg({ type: 'error', text: 'Failed to save to server. Saved locally.' });
        }
      } else {
        setStatusMsg({ type: 'success', text: 'Settings saved locally (connect backend for server sync).' });
      }
      setSettingsDirty(false);
    } catch {
      setStatusMsg({ type: 'error', text: 'Error saving settings.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const triggerManualCronRun = async () => {
    setTriggeringManualRun(true);
    try {
      if (hasBackend) {
        const res = await fetch(`${apiBase}/cron?manual=true`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setStatusMsg({
            type: 'success',
            text: `Manual run complete! Generated ${data.generated || 0} article(s)${data.auto_published ? ' (published)' : ' (drafts)'}.`,
          });
          // Refresh posts list after generating
          setTimeout(() => window.location.reload(), 1500);
        } else {
          const err = await res.json().catch(() => ({}));
          setStatusMsg({ type: 'error', text: err.error || 'Manual run failed.' });
        }
      } else {
        await new Promise(r => setTimeout(r, 2000));
        setStatusMsg({ type: 'success', text: `Demo: Would generate ${scheduleSettings.articles_per_run} articles with current settings.` });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Error triggering manual run.' });
    } finally {
      setTriggeringManualRun(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Status Toast */}
      {statusMsg && (
        <div className={`fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg animate-fade-in ${
          statusMsg.type === 'success'
            ? 'bg-emerald-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {statusMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm font-medium">{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="ml-2 p-0.5 hover:bg-white/20 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-bold text-gray-900">Delete Post?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              This action cannot be undone. The post will be permanently removed from the database.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Editor Modal */}
      {(editingPost || creatingPost) && (
        <PostEditor
          post={editingPost || undefined}
          onSave={handleSavePost}
          onCancel={() => {
            setEditingPost(null);
            setCreatingPost(false);
          }}
          saving={saving}
        />
      )}

      {/* Admin Header */}
      <div className="bg-brand-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm">TrendWatchNow</span>
                <span className="px-2 py-0.5 bg-brand-800 rounded text-[10px] font-semibold uppercase tracking-wider">
                  Admin
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="text-xs text-brand-300 hover:text-white transition-colors flex items-center gap-1"
              >
                <Globe className="w-3 h-3" />
                View Blog
              </button>
              <div className="w-px h-5 bg-brand-800" />
              <button
                onClick={onToggleDark}
                className="flex items-center gap-1.5 text-xs text-brand-300 hover:text-white transition-colors"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                {isDark ? 'Light' : 'Dark'}
              </button>
              <div className="w-px h-5 bg-brand-800" />
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 text-xs text-brand-300 hover:text-white transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 mb-6 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-200'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* =================== Overview Tab =================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Recent Posts</h3>
                <button
                  onClick={() => setActiveTab('posts')}
                  className="text-xs text-brand-600 font-medium hover:text-brand-700"
                >
                  View All →
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {posts.slice(0, 5).map(post => {
                  const colors = CATEGORY_COLORS[post.category] || { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' };
                  return (
                    <div key={post.id} className="p-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                      <img src={post.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{post.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors.bg} ${colors.text}`}>
                            {post.category}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {post.published ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            <Eye className="w-3 h-3" />
                            Live
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                            <EyeOff className="w-3 h-3" />
                            Draft
                          </span>
                        )}
                        <button
                          onClick={() => setEditingPost(post)}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setCreatingPost(true)}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-200 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                  <Plus className="w-5 h-5 text-brand-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-gray-900">Create Post</p>
                  <p className="text-xs text-gray-400">Write a new article manually</p>
                </div>
              </button>
              <button
                onClick={() => { setActiveTab('generate'); fetchRSSTopics(); }}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-gray-900">AI Generate</p>
                  <p className="text-xs text-gray-400">Generate from trending topics</p>
                </div>
              </button>
              <button
                onClick={() => { setActiveTab('sources'); fetchAllSources(); }}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                  <Rss className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-gray-900">RSS Sources</p>
                  <p className="text-xs text-gray-400">View live feed status</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* =================== Analytics Tab =================== */}
        {activeTab === 'analytics' && (() => {
          // Compute all analytics data
          const now = new Date();
          const totalWords = posts.reduce((sum, p) => sum + (p.content?.split(/\s+/).length || 0), 0);
          const avgWords = posts.length ? Math.round(totalWords / posts.length) : 0;
          const avgReadTime = posts.length ? Math.round(posts.reduce((sum, p) => sum + (p.read_time || 0), 0) / posts.length) : 0;
          const totalReadTime = posts.reduce((sum, p) => sum + (p.read_time || 0), 0);

          // Posts by category
          const categoryStats = CATEGORIES.map(cat => {
            const catPosts = posts.filter(p => p.category === cat);
            const published = catPosts.filter(p => p.published).length;
            const drafts = catPosts.length - published;
            return { category: cat, total: catPosts.length, published, drafts };
          }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

          const maxCategoryCount = Math.max(...categoryStats.map(c => c.total), 1);

          // Posts over last 30 days
          const last30Days: { date: string; count: number; label: string }[] = [];
          for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const count = posts.filter(p => p.created_at.split('T')[0] === dateStr).length;
            last30Days.push({
              date: dateStr,
              count,
              label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
            });
          }
          const maxDayCount = Math.max(...last30Days.map(d => d.count), 1);

          // Posts by week (last 12 weeks)
          const last12Weeks: { week: string; count: number; start: Date }[] = [];
          for (let i = 11; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (i * 7));
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            const count = posts.filter(p => {
              const d = new Date(p.created_at);
              return d >= weekStart && d < weekEnd;
            }).length;
            last12Weeks.push({
              week: weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
              count,
              start: weekStart,
            });
          }
          const maxWeekCount = Math.max(...last12Weeks.map(w => w.count), 1);

          // This week vs last week
          const thisWeekStart = new Date(now);
          thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
          thisWeekStart.setHours(0, 0, 0, 0);
          const lastWeekStart = new Date(thisWeekStart);
          lastWeekStart.setDate(lastWeekStart.getDate() - 7);
          const thisWeekPosts = posts.filter(p => new Date(p.created_at) >= thisWeekStart).length;
          const lastWeekPosts = posts.filter(p => {
            const d = new Date(p.created_at);
            return d >= lastWeekStart && d < thisWeekStart;
          }).length;
          const weekChange = lastWeekPosts === 0 ? (thisWeekPosts > 0 ? 100 : 0) : Math.round(((thisWeekPosts - lastWeekPosts) / lastWeekPosts) * 100);

          // This month vs last month
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const thisMonthPosts = posts.filter(p => new Date(p.created_at) >= thisMonthStart).length;
          const lastMonthPosts = posts.filter(p => {
            const d = new Date(p.created_at);
            return d >= lastMonthStart && d < thisMonthStart;
          }).length;
          const monthChange = lastMonthPosts === 0 ? (thisMonthPosts > 0 ? 100 : 0) : Math.round(((thisMonthPosts - lastMonthPosts) / lastMonthPosts) * 100);

          // Tag frequency
          const tagMap: Record<string, number> = {};
          posts.forEach(p => (p.tags || []).forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; }));
          const topTags = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 20);
          const maxTagCount = Math.max(...topTags.map(t => t[1]), 1);

          // Publish rate
          const publishRate = posts.length ? Math.round((publishedPosts.length / posts.length) * 100) : 0;

          // Publishing heatmap (day of week)
          const dayOfWeekStats = Array.from({ length: 7 }, (_, i) => ({
            day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
            count: posts.filter(p => new Date(p.created_at).getDay() === i).length,
          }));
          const maxDowCount = Math.max(...dayOfWeekStats.map(d => d.count), 1);

          // Hour of day distribution
          const hourStats = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            count: posts.filter(p => new Date(p.created_at).getHours() === i).length,
          }));
          const maxHourCount = Math.max(...hourStats.map(h => h.count), 1);

          // Recent activity (last 7 days)
          const last7Days = posts.filter(p => {
            const d = new Date(p.created_at);
            const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
            return diff <= 7;
          }).length;

          // Content length distribution
          const shortPosts = posts.filter(p => (p.content?.split(/\s+/).length || 0) < 500).length;
          const mediumPosts = posts.filter(p => {
            const w = p.content?.split(/\s+/).length || 0;
            return w >= 500 && w < 1000;
          }).length;
          const longPosts = posts.filter(p => (p.content?.split(/\s+/).length || 0) >= 1000).length;

          // Views analytics
          const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
          const avgViews = posts.length ? Math.round(totalViews / posts.length) : 0;
          const topPostsByViews = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
          const maxViews = Math.max(...posts.map(p => p.views || 0), 1);
          
          // Views by category
          const viewsByCategory = categories.map(cat => ({
            category: cat,
            views: posts.filter(p => p.category === cat).reduce((sum, p) => sum + (p.views || 0), 0),
          })).sort((a, b) => b.views - a.views);
          const maxCategoryViews = Math.max(...viewsByCategory.map(c => c.views), 1);

          return (
          <div className="space-y-6 animate-fade-in">
            {/* KPI Cards Row 1 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Total Articles', value: posts.length, icon: FileText, color: 'from-blue-500 to-blue-600', sub: `${totalWords.toLocaleString()} words total` },
                { label: 'Total Views', value: totalViews.toLocaleString(), icon: Eye, color: 'from-indigo-500 to-indigo-600', sub: `${avgViews} avg per post` },
                { label: 'Published', value: publishedPosts.length, icon: CheckCircle, color: 'from-emerald-500 to-emerald-600', sub: `${publishRate}% publish rate` },
                { label: 'Drafts', value: draftPosts.length, icon: EyeOff, color: 'from-amber-500 to-amber-600', sub: 'Awaiting review' },
                { label: 'This Week', value: thisWeekPosts, icon: Calendar, color: 'from-purple-500 to-purple-600', sub: weekChange >= 0 ? `↑ ${weekChange}% vs last week` : `↓ ${Math.abs(weekChange)}% vs last week` },
                { label: 'This Month', value: thisMonthPosts, icon: Target, color: 'from-pink-500 to-pink-600', sub: monthChange >= 0 ? `↑ ${monthChange}% vs last month` : `↓ ${Math.abs(monthChange)}% vs last month` },
                { label: 'Last 7 Days', value: last7Days, icon: Activity, color: 'from-cyan-500 to-cyan-600', sub: `${(last7Days / 7).toFixed(1)} per day avg` },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg mb-3`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs font-medium text-gray-600 mt-0.5">{stat.label}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{stat.sub}</p>
                  </div>
                );
              })}
            </div>

            {/* Row 2: Publishing Timeline + Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Publishing Timeline - 30 Day Bar Chart */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-brand-600" />
                      Publishing Timeline
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Articles published per day — last 30 days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{last30Days.reduce((s, d) => s + d.count, 0)}</p>
                    <p className="text-[10px] text-gray-400">total in 30 days</p>
                  </div>
                </div>
                <div className="flex items-end gap-[3px] h-40">
                  {last30Days.map((day, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center group relative">
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        {day.label}: {day.count} post{day.count !== 1 ? 's' : ''}
                      </div>
                      <div
                        className={`w-full rounded-t transition-all duration-300 ${
                          day.count > 0
                            ? 'bg-gradient-to-t from-brand-600 to-brand-400 group-hover:from-brand-500 group-hover:to-brand-300'
                            : 'bg-gray-100 group-hover:bg-gray-200'
                        }`}
                        style={{ height: day.count > 0 ? `${Math.max((day.count / maxDayCount) * 100, 8)}%` : '4px', minHeight: day.count > 0 ? '8px' : '2px' }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-gray-400">{last30Days[0]?.label}</span>
                  <span className="text-[10px] text-gray-400">Today</span>
                </div>
              </div>

              {/* Category Distribution */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <PieChart className="w-4 h-4 text-purple-600" />
                  Categories
                </h3>
                {categoryStats.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-gray-300">
                    <p className="text-sm">No posts yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categoryStats.map(cat => {
                      const colors = CATEGORY_COLORS[cat.category] || { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400' };
                      const pct = Math.round((cat.total / posts.length) * 100);
                      return (
                        <div key={cat.category}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                              <span className="text-xs font-medium text-gray-700">{cat.category}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-900">{cat.total}</span>
                              <span className="text-[10px] text-gray-400">({pct}%)</span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${colors.dot.replace('bg-', 'bg-')}`}
                              style={{ width: `${(cat.total / maxCategoryCount) * 100}%` }}
                            />
                          </div>
                          <div className="flex gap-3 mt-0.5">
                            <span className="text-[10px] text-emerald-500">{cat.published} published</span>
                            {cat.drafts > 0 && <span className="text-[10px] text-amber-500">{cat.drafts} draft{cat.drafts > 1 ? 's' : ''}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Weekly Trend + Content Metrics + Publish Rate */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 12-Week Trend */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Weekly Trend
                </h3>
                <p className="text-[10px] text-gray-400 mb-4">Last 12 weeks</p>
                <div className="flex items-end gap-1 h-24">
                  {last12Weeks.map((week, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center group relative">
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        {week.week}: {week.count}
                      </div>
                      <div
                        className={`w-full rounded-t transition-all ${
                          week.count > 0 ? 'bg-gradient-to-t from-emerald-500 to-emerald-300' : 'bg-gray-100'
                        }`}
                        style={{ height: week.count > 0 ? `${Math.max((week.count / maxWeekCount) * 100, 10)}%` : '3px' }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-gray-400">12w ago</span>
                  <span className="text-[10px] text-gray-400">This week</span>
                </div>
              </div>

              {/* Content Metrics */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Content Metrics
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl">
                    <div>
                      <p className="text-xs text-gray-500">Avg. Word Count</p>
                      <p className="text-lg font-bold text-gray-900">{avgWords.toLocaleString()}</p>
                    </div>
                    <Hash className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50/50 rounded-xl">
                    <div>
                      <p className="text-xs text-gray-500">Avg. Read Time</p>
                      <p className="text-lg font-bold text-gray-900">{avgReadTime} min</p>
                    </div>
                    <Clock className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl">
                    <div>
                      <p className="text-xs text-gray-500">Total Read Time</p>
                      <p className="text-lg font-bold text-gray-900">{totalReadTime} min</p>
                    </div>
                    <Timer className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Publish Rate Gauge */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-pink-600" />
                  Publish Rate
                </h3>
                <div className="flex flex-col items-center">
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                      <circle
                        cx="60" cy="60" r="50" fill="none"
                        stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={`${(publishRate / 100) * 314} 314`}
                      />
                      <defs>
                        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-gray-900">{publishRate}%</span>
                      <span className="text-[10px] text-gray-400">published</span>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-4 text-center">
                    <div>
                      <p className="text-sm font-bold text-emerald-600">{publishedPosts.length}</p>
                      <p className="text-[10px] text-gray-400">Live</p>
                    </div>
                    <div className="w-px bg-gray-200" />
                    <div>
                      <p className="text-sm font-bold text-amber-600">{draftPosts.length}</p>
                      <p className="text-[10px] text-gray-400">Drafts</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 4: Publishing Heatmap + Hour Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Day of Week */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  Posts by Day of Week
                </h3>
                <p className="text-[10px] text-gray-400 mb-4">When articles get published</p>
                <div className="space-y-2">
                  {dayOfWeekStats.map(d => (
                    <div key={d.day} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-500 w-8">{d.day}</span>
                      <div className="flex-1 h-6 bg-gray-50 rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-lg transition-all duration-500 flex items-center px-2"
                          style={{ width: `${Math.max((d.count / maxDowCount) * 100, d.count > 0 ? 12 : 0)}%` }}
                        >
                          {d.count > 0 && <span className="text-[10px] font-bold text-white">{d.count}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hour Distribution */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Posts by Hour (UTC)
                </h3>
                <p className="text-[10px] text-gray-400 mb-4">Peak publishing hours</p>
                <div className="flex items-end gap-[2px] h-24">
                  {hourStats.map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center group relative">
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        {h.hour}:00 — {h.count} post{h.count !== 1 ? 's' : ''}
                      </div>
                      <div
                        className={`w-full rounded-t transition-all ${
                          h.count > 0 ? 'bg-gradient-to-t from-indigo-500 to-indigo-300' : 'bg-gray-100'
                        }`}
                        style={{ height: h.count > 0 ? `${Math.max((h.count / maxHourCount) * 100, 8)}%` : '2px' }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-gray-400">0:00</span>
                  <span className="text-[10px] text-gray-400">6:00</span>
                  <span className="text-[10px] text-gray-400">12:00</span>
                  <span className="text-[10px] text-gray-400">18:00</span>
                  <span className="text-[10px] text-gray-400">23:00</span>
                </div>
              </div>
            </div>

            {/* Row 5: Tag Cloud + Content Length + Growth */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Tag Cloud */}
              <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
                  <Tag className="w-4 h-4 text-cyan-600" />
                  Top Tags
                </h3>
                <p className="text-[10px] text-gray-400 mb-4">{Object.keys(tagMap).length} unique tags across all posts</p>
                {topTags.length === 0 ? (
                  <p className="text-sm text-gray-300 text-center py-8">No tags found</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {topTags.map(([tag, count]) => {
                      const intensity = count / maxTagCount;
                      const size = intensity > 0.7 ? 'text-sm px-3 py-1.5' : intensity > 0.4 ? 'text-xs px-2.5 py-1' : 'text-[11px] px-2 py-0.5';
                      const bg = intensity > 0.7
                        ? 'bg-brand-100 text-brand-800 border-brand-200'
                        : intensity > 0.4
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200';
                      return (
                        <span key={tag} className={`inline-flex items-center gap-1 rounded-full border font-medium ${size} ${bg}`}>
                          #{tag}
                          <span className="opacity-60">({count})</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Content Length Breakdown */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4 text-violet-600" />
                  Article Length
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'Short', desc: '< 500 words', count: shortPosts, color: 'from-sky-400 to-sky-500', icon: '📄' },
                    { label: 'Medium', desc: '500–1000 words', count: mediumPosts, color: 'from-violet-400 to-violet-500', icon: '📝' },
                    { label: 'Long', desc: '1000+ words', count: longPosts, color: 'from-rose-400 to-rose-500', icon: '📚' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700">{item.label}</span>
                          <span className="text-xs font-bold text-gray-900">{item.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                            style={{ width: posts.length ? `${(item.count / posts.length) * 100}%` : '0%' }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 6: Growth Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Week-over-Week',
                  current: thisWeekPosts,
                  previous: lastWeekPosts,
                  change: weekChange,
                  period: 'this week vs last',
                },
                {
                  label: 'Month-over-Month',
                  current: thisMonthPosts,
                  previous: lastMonthPosts,
                  change: monthChange,
                  period: 'this month vs last',
                },
                {
                  label: 'Avg. per Day (30d)',
                  current: Number((last30Days.reduce((s, d) => s + d.count, 0) / 30).toFixed(1)),
                  previous: null,
                  change: null,
                  period: 'last 30 days',
                },
                {
                  label: 'Content Velocity',
                  current: posts.length,
                  previous: null,
                  change: null,
                  period: `${categories.length} categories covered`,
                },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{card.label}</p>
                  <div className="flex items-end gap-2 mt-2">
                    <span className="text-2xl font-bold text-gray-900">{card.current}</span>
                    {card.change !== null && (
                      <span className={`flex items-center gap-0.5 text-xs font-semibold mb-1 ${
                        card.change > 0 ? 'text-emerald-600' : card.change < 0 ? 'text-red-500' : 'text-gray-400'
                      }`}>
                        {card.change > 0 ? <ArrowUp className="w-3 h-3" /> : card.change < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        {Math.abs(card.change)}%
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{card.period}</p>
                  {card.previous !== null && (
                    <p className="text-[10px] text-gray-300 mt-0.5">Previous: {card.previous}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Row 7: Top Posts by Views + Views by Category */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Posts by Views */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    Top Posts by Views
                  </h3>
                  <span className="text-xs text-gray-400">{totalViews.toLocaleString()} total views</span>
                </div>
                {topPostsByViews.length === 0 ? (
                  <p className="text-sm text-gray-300 text-center py-8">No view data yet</p>
                ) : (
                  <div className="space-y-3">
                    {topPostsByViews.map((post, i) => {
                      const viewPct = maxViews > 0 ? ((post.views || 0) / maxViews) * 100 : 0;
                      const colors = CATEGORY_COLORS[post.category] || { dot: 'bg-gray-400' };
                      return (
                        <div key={post.id} className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{post.title}</p>
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                                style={{ width: `${Math.max(viewPct, 2)}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-gray-900">{(post.views || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-gray-400">views</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Views by Category */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <PieChart className="w-4 h-4 text-purple-600" />
                  Views by Category
                </h3>
                {viewsByCategory.length === 0 ? (
                  <p className="text-sm text-gray-300 text-center py-8">No view data yet</p>
                ) : (
                  <div className="space-y-3">
                    {viewsByCategory.filter(c => c.views > 0).map(cat => {
                      const viewPct = maxCategoryViews > 0 ? (cat.views / maxCategoryViews) * 100 : 0;
                      const colors = CATEGORY_COLORS[cat.category] || { dot: 'bg-gray-400' };
                      return (
                        <div key={cat.category}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                              <span className="text-xs font-medium text-gray-700">{cat.category}</span>
                            </div>
                            <span className="text-xs font-bold text-gray-900">{cat.views.toLocaleString()}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${colors.dot}`}
                              style={{ width: `${Math.max(viewPct, 2)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Row 8: AI Summary Card */}
            <div className="bg-gradient-to-br from-gray-900 via-brand-950 to-purple-950 rounded-2xl p-6 text-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Award className="w-6 h-6 text-purple-300" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Content Intelligence Summary</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Your blog has <span className="text-white font-semibold">{posts.length} articles</span> with{' '}
                    <span className="text-indigo-300 font-semibold">{totalViews.toLocaleString()} total views</span> ({avgViews} avg per post).{' '}
                    {topPostsByViews[0] && (topPostsByViews[0].views || 0) > 0 && <>Most viewed: <span className="text-amber-300 font-semibold">"{topPostsByViews[0].title.slice(0, 40)}{topPostsByViews[0].title.length > 40 ? '...' : ''}"</span> with {(topPostsByViews[0].views || 0).toLocaleString()} views. </>}
                    {categoryStats[0] && <>Strongest category: <span className="text-purple-300 font-semibold">{categoryStats[0].category}</span> ({categoryStats[0].total} articles). </>}
                    {publishRate >= 80
                      ? 'Excellent publish rate — most content goes live immediately.'
                      : publishRate >= 50
                      ? 'Good publish rate — consider reviewing your drafts.'
                      : 'Many articles are in draft — review and publish them.'}
                    {' '}Average article: <span className="text-white font-semibold">{avgWords} words</span> ({avgReadTime} min read).
                    {thisWeekPosts > lastWeekPosts
                      ? ' Publishing momentum is UP this week! 🚀'
                      : thisWeekPosts === lastWeekPosts
                      ? ' Pace is steady.'
                      : ' Publishing has slowed — consider generating more AI articles.'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {topTags.slice(0, 5).map(([tag]) => (
                      <span key={tag} className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] text-purple-200 font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {/* =================== Posts Tab =================== */}
        {activeTab === 'posts' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">All Posts ({posts.length})</h3>
              <button
                onClick={() => setCreatingPost(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-500 transition-colors shadow-md"
              >
                <Plus className="w-4 h-4" />
                New Post
              </button>
            </div>

            {posts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <Newspaper className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-700 mb-2">No posts yet</h3>
                <p className="text-sm text-gray-400 mb-4">Create your first post or generate one with AI.</p>
                <button
                  onClick={() => setCreatingPost(true)}
                  className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-500"
                >
                  Create Post
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Article</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Category</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Views</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {posts.map(post => {
                        const colors = CATEGORY_COLORS[post.category] || { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' };
                        return (
                          <tr key={post.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <img src={post.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-medium text-sm text-gray-900 truncate max-w-xs">{post.title}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">{post.read_time} min read</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors.bg} ${colors.text}`}>
                                {post.category}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <button
                                onClick={() => handleTogglePublish(post)}
                                className="group"
                                title={post.published ? 'Click to unpublish' : 'Click to publish'}
                              >
                                {post.published ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 group-hover:text-amber-600 transition-colors">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:bg-amber-500" />
                                    Published
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 group-hover:text-emerald-600 transition-colors">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 group-hover:bg-emerald-500" />
                                    Draft
                                  </span>
                                )}
                              </button>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5">
                                <Eye className="w-3 h-3 text-gray-400" />
                                <span className="text-xs font-medium text-gray-700">{(post.views || 0).toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-xs text-gray-500">
                                {new Date(post.created_at).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center justify-end gap-1.5">
                                {post.published ? (
                                  <button
                                    onClick={() => handleTogglePublish(post)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                                    title="Unpublish this post"
                                  >
                                    <EyeOff className="w-3 h-3" />
                                    Unpublish
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleTogglePublish(post)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                                    title="Publish this post"
                                  >
                                    <Eye className="w-3 h-3" />
                                    Publish
                                  </button>
                                )}
                                <button
                                  onClick={() => setEditingPost(post)}
                                  className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(post.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================== AI Generate Tab =================== */}
        {activeTab === 'generate' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">

            {/* Step 1: Fetch Topics */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Rss className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Step 1: Fetch Trending Topics</h3>
                    <p className="text-xs text-gray-400">Pull latest headlines from RSS sources</p>
                  </div>
                </div>
                <button
                  onClick={fetchRSSTopics}
                  disabled={fetchingRss}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-xl hover:bg-orange-400 transition-colors disabled:opacity-50"
                >
                  {fetchingRss ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {fetchingRss ? 'Fetching...' : 'Fetch Topics'}
                </button>
              </div>

              {rssTopics.length > 0 && (
                <div className="space-y-2 mt-4 max-h-72 overflow-y-auto pr-1">
                  {rssTopics.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedTopic(item);
                        setManualTopic('');
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selectedTopic === item
                          ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-200'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-gray-900 leading-snug">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase">{item.source}</span>
                          {selectedTopic === item && (
                            <div className="mt-1">
                              <Check className="w-4 h-4 text-brand-600 ml-auto" />
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Configure & Generate */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Step 2: Generate Article with AI</h3>
                  <p className="text-xs text-gray-400">Powered by Groq LLaMA 3.3 70B</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Manual topic input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Topic {selectedTopic ? '(from RSS — or type your own below)' : ''}
                  </label>
                  <input
                    type="text"
                    value={selectedTopic ? selectedTopic.title : manualTopic}
                    onChange={e => {
                      setManualTopic(e.target.value);
                      setSelectedTopic(null);
                    }}
                    placeholder="Enter a trending topic or select from above..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                    <select
                      value={genCategory}
                      onChange={e => setGenCategory(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
                    >
                      <option value="">Auto-detect</option>
                      {CATEGORIES.filter(c => c !== 'All').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tone</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Analytical', 'Informative', 'Conversational'].map(tone => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => setGenTone(tone)}
                          className={`px-3 py-2 border rounded-xl text-sm text-center transition-all ${
                            genTone === tone
                              ? 'border-brand-500 bg-brand-50 text-brand-700 font-semibold'
                              : 'border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50'
                          }`}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={generateArticle}
                  disabled={generating || (!selectedTopic && !manualTopic)}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating article...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Generate Article
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 3: Preview & Publish */}
            {generatedArticle && (
              <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm overflow-hidden animate-fade-in">
                <div className="bg-emerald-50 px-6 py-3 border-b border-emerald-100">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-semibold text-emerald-800 text-sm">Step 3: Review & Publish</h3>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Preview image */}
                  {generatedArticle.image_url && (
                    <div className="rounded-xl overflow-hidden border border-gray-200 h-48">
                      <img
                        src={generatedArticle.image_url}
                        alt={generatedArticle.image_alt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Title & meta */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        CATEGORY_COLORS[generatedArticle.category]?.bg || 'bg-gray-50'
                      } ${CATEGORY_COLORS[generatedArticle.category]?.text || 'text-gray-700'}`}>
                        {generatedArticle.category}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400">
                        ~{Math.ceil(generatedArticle.content.split(/\s+/).length / 200)} min read
                      </span>
                    </div>
                    <h4 className="font-serif text-xl font-bold text-gray-900 leading-snug">
                      {generatedArticle.title}
                    </h4>
                    <p className="text-sm text-gray-500 mt-2">{generatedArticle.excerpt}</p>
                  </div>

                  {/* Content preview */}
                  <div className="bg-gray-50 rounded-xl p-4 max-h-60 overflow-y-auto">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">
                      {generatedArticle.content}
                    </pre>
                  </div>

                  {/* Tags */}
                  {generatedArticle.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {generatedArticle.tags.map(tag => (
                        <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={publishGeneratedArticle}
                      disabled={publishing}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50"
                    >
                      {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Publish Now
                    </button>
                    <button
                      onClick={saveDraftGeneratedArticle}
                      disabled={publishing}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      Save as Draft
                    </button>
                    <button
                      onClick={() => setGeneratedArticle(null)}
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="Discard"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* How it works */}
            <div className="bg-gradient-to-r from-brand-50 via-purple-50 to-pink-50 rounded-2xl p-5 border border-brand-100">
              <p className="text-xs text-gray-600 leading-relaxed">
                <strong className="text-gray-800">How it works:</strong> Click "Fetch Topics" to pull live headlines from BBC, Reuters, Al Jazeera, TechCrunch, and The Guardian. Select a topic (or type your own), configure category and tone, then click "Generate". The AI analyzes the topic, writes an original in-depth article, and fetches a relevant Pexels image. Review the result and publish with one click. The automated cron runs daily at 9:00 AM IST.
              </p>
            </div>
          </div>
        )}

        {/* =================== RSS Sources Tab =================== */}
        {activeTab === 'sources' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">RSS Feed Sources</h3>
              <button
                onClick={fetchAllSources}
                disabled={fetchingAllRss}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-500 transition-colors shadow-md disabled:opacity-50"
              >
                {fetchingAllRss ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {fetchingAllRss ? 'Fetching...' : 'Fetch All'}
              </button>
            </div>

            <div className="grid gap-4">
              {rssSources.map(source => {
                const sourceItems = rssSourceItems[source.name] || [];
                const hasItems = sourceItems.length > 0;
                return (
                  <div key={source.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                          <Rss className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">{source.name}</h4>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{source.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                        {hasItems && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {sourceItems.length} items
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Show fetched items if available */}
                    {hasItems && (
                      <div className="border-t border-gray-50 divide-y divide-gray-50 max-h-52 overflow-y-auto">
                        {sourceItems.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="px-5 py-3 flex items-start justify-between gap-3 hover:bg-gray-50/50">
                            <div className="min-w-0">
                              <p className="text-sm text-gray-700 font-medium leading-snug truncate">{item.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>
                            </div>
                            {item.link && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 p-1 text-gray-300 hover:text-brand-500"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cron Schedule */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
                  <RefreshCw className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Automated Generation</h3>
                  <p className="text-xs text-gray-500">
                    {scheduleSettings.enabled
                      ? getNextRunDescription(scheduleSettings)
                      : 'Paused — configure in Schedule tab'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('settings')}
                className="w-full mt-2 px-4 py-2.5 bg-brand-50 text-brand-700 text-sm font-medium rounded-xl hover:bg-brand-100 transition-colors flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Configure Schedule & Automation
              </button>
            </div>
          </div>
        )}

        {/* =================== Schedule Settings Tab =================== */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">

            {/* Header with save */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Automation Schedule</h3>
                <p className="text-sm text-gray-500 mt-0.5">Configure when and how AI generates blog articles automatically</p>
              </div>
              <div className="flex items-center gap-3">
                {settingsDirty && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-medium animate-fade-in">
                    Unsaved changes
                  </span>
                )}
                <button
                  onClick={saveSettings}
                  disabled={savingSettings || !settingsDirty}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-500 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingSettings ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>

            {loadingSettings ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">Loading settings...</p>
              </div>
            ) : (
              <>
                {/* Master Toggle */}
                <div className={`rounded-2xl border-2 shadow-sm p-5 transition-all ${
                  scheduleSettings.enabled
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                        scheduleSettings.enabled
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500'
                      }`}>
                        {scheduleSettings.enabled ? (
                          <Play className="w-6 h-6 text-white" />
                        ) : (
                          <Pause className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">
                          {scheduleSettings.enabled ? 'Automation Active' : 'Automation Paused'}
                        </h4>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {scheduleSettings.enabled
                            ? getNextRunDescription(scheduleSettings)
                            : 'Turn on to enable automated article generation'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateSetting('enabled', !scheduleSettings.enabled)}
                      className="flex-shrink-0"
                    >
                      {scheduleSettings.enabled ? (
                        <ToggleRight className="w-12 h-12 text-emerald-500 hover:text-emerald-600 transition-colors" />
                      ) : (
                        <ToggleLeft className="w-12 h-12 text-gray-400 hover:text-gray-500 transition-colors" />
                      )}
                    </button>
                  </div>

                  {scheduleSettings.last_run_at && (
                    <div className="mt-3 pt-3 border-t border-emerald-100 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        Last run: {new Date(scheduleSettings.last_run_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Frequency Selection */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Timer className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">Run Frequency</h4>
                      <p className="text-xs text-gray-400">How often should the AI generate new articles?</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {FREQUENCY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => updateSetting('frequency', opt.value as ScheduleSettings['frequency'])}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                          scheduleSettings.frequency === opt.value
                            ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-200'
                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-xl mb-2 block">{opt.icon}</span>
                        <p className={`font-semibold text-sm ${
                          scheduleSettings.frequency === opt.value ? 'text-brand-700' : 'text-gray-900'
                        }`}>{opt.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                        {scheduleSettings.frequency === opt.value && (
                          <div className="absolute top-2 right-2">
                            <Check className="w-4 h-4 text-brand-600" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time & Day Configuration */}
                {(scheduleSettings.frequency === 'daily' || scheduleSettings.frequency === 'weekly' ||
                  scheduleSettings.frequency === 'every_12h') && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                        <CalendarClock className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">Schedule Time</h4>
                        <p className="text-xs text-gray-400">Set the preferred time for article generation</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Time (UTC)</label>
                        <input
                          type="time"
                          value={scheduleSettings.time_utc}
                          onChange={e => updateSetting('time_utc', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          Your local time: <strong>{utcToLocal(scheduleSettings.time_utc)}</strong>
                        </p>
                      </div>

                      {scheduleSettings.frequency === 'weekly' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
                          <div className="grid grid-cols-4 gap-2">
                            {DAYS_OF_WEEK.map((day, idx) => (
                              <button
                                key={day}
                                onClick={() => updateSetting('day_of_week', idx)}
                                className={`px-2 py-2 rounded-lg text-xs font-medium text-center transition-all ${
                                  scheduleSettings.day_of_week === idx
                                    ? 'bg-brand-600 text-white shadow-md'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                {day.slice(0, 3)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Articles Per Run */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Hash className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">Articles Per Run</h4>
                      <p className="text-xs text-gray-400">Number of articles to generate each time the automation runs</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={scheduleSettings.articles_per_run}
                      onChange={e => updateSetting('articles_per_run', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                    />
                    <div className="flex-shrink-0 w-16 h-12 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center">
                      <span className="text-xl font-bold text-brand-700">{scheduleSettings.articles_per_run}</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                    <span>1 article</span>
                    <span>5 articles</span>
                    <span>10 articles</span>
                  </div>

                  {scheduleSettings.frequency !== 'daily' && scheduleSettings.frequency !== 'weekly' && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">
                        With <strong>{FREQUENCY_OPTIONS.find(o => o.value === scheduleSettings.frequency)?.label}</strong> frequency
                        and <strong>{scheduleSettings.articles_per_run}</strong> articles/run, you'll generate approximately{' '}
                        <strong>
                          {scheduleSettings.frequency === 'every_hour'
                            ? scheduleSettings.articles_per_run * 24
                            : scheduleSettings.frequency === 'every_3h'
                            ? scheduleSettings.articles_per_run * 8
                            : scheduleSettings.frequency === 'every_6h'
                            ? scheduleSettings.articles_per_run * 4
                            : scheduleSettings.articles_per_run * 2}
                        </strong>{' '}
                        articles/day. This will consume more API credits.
                      </p>
                    </div>
                  )}
                </div>

                {/* Publishing & Categories */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Auto-Publish */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Power className="w-4 h-4 text-emerald-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 text-sm">Auto-Publish</h4>
                    </div>

                    <div className="space-y-3">
                      <button
                        onClick={() => updateSetting('auto_publish', true)}
                        className={`w-full p-3.5 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                          scheduleSettings.auto_publish
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <Eye className={`w-5 h-5 ${scheduleSettings.auto_publish ? 'text-emerald-600' : 'text-gray-400'}`} />
                        <div>
                          <p className={`font-medium text-sm ${scheduleSettings.auto_publish ? 'text-emerald-800' : 'text-gray-700'}`}>
                            Publish Immediately
                          </p>
                          <p className="text-xs text-gray-400">Articles go live right away</p>
                        </div>
                      </button>

                      <button
                        onClick={() => updateSetting('auto_publish', false)}
                        className={`w-full p-3.5 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                          !scheduleSettings.auto_publish
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <EyeOff className={`w-5 h-5 ${!scheduleSettings.auto_publish ? 'text-amber-600' : 'text-gray-400'}`} />
                        <div>
                          <p className={`font-medium text-sm ${!scheduleSettings.auto_publish ? 'text-amber-800' : 'text-gray-700'}`}>
                            Save as Draft
                          </p>
                          <p className="text-xs text-gray-400">Review before publishing</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Preferred Tone */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-pink-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 text-sm">Writing Tone</h4>
                    </div>

                    <div className="space-y-2">
                      {['Analytical', 'Informative', 'Conversational', 'Investigative', 'Opinion'].map(tone => (
                        <button
                          key={tone}
                          onClick={() => updateSetting('preferred_tone', tone)}
                          className={`w-full px-4 py-2.5 rounded-xl border text-left text-sm transition-all ${
                            scheduleSettings.preferred_tone === tone
                              ? 'border-brand-500 bg-brand-50 text-brand-700 font-semibold'
                              : 'border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preferred Categories */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <Layers className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">Preferred Categories</h4>
                      <p className="text-xs text-gray-400">Select categories to focus on (leave empty for all)</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.filter(c => c !== 'All').map(cat => {
                      const isSelected = scheduleSettings.preferred_categories.includes(cat);
                      const colors = CATEGORY_COLORS[cat] || { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' };
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            if (isSelected) {
                              updateSetting('preferred_categories', scheduleSettings.preferred_categories.filter(c => c !== cat));
                            } else {
                              updateSetting('preferred_categories', [...scheduleSettings.preferred_categories, cat]);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                            isSelected
                              ? `${colors.bg} ${colors.text} border-current`
                              : 'border-gray-100 text-gray-500 hover:border-gray-200'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isSelected ? colors.dot : 'bg-gray-300'}`} />
                          {cat}
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>

                  {scheduleSettings.preferred_categories.length === 0 && (
                    <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      No categories selected — AI will cover all topics
                    </p>
                  )}
                </div>

                {/* Manual Run & Summary */}
                <div className="bg-gradient-to-r from-brand-50 via-purple-50 to-pink-50 rounded-2xl p-6 border border-brand-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center shadow-lg">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Run Now</h4>
                      <p className="text-xs text-gray-500">
                        Trigger a manual run with current settings ({scheduleSettings.articles_per_run} articles,{' '}
                        {scheduleSettings.auto_publish ? 'auto-publish' : 'draft mode'})
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={triggerManualCronRun}
                    disabled={triggeringManualRun}
                    className="w-full py-3 bg-gradient-to-r from-brand-600 to-purple-600 text-white font-semibold rounded-xl hover:from-brand-500 hover:to-purple-500 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {triggeringManualRun ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Running... fetching topics, generating articles...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Run Automation Now
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-500 mt-3 text-center">
                    This will fetch RSS feeds → pick {scheduleSettings.articles_per_run} trending topic(s) → generate AI articles → {scheduleSettings.auto_publish ? 'publish live' : 'save as drafts'}
                  </p>
                </div>

                {/* Configuration Summary */}
                <div className="bg-gray-900 rounded-2xl p-6">
                  <h4 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                    Configuration Summary
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-gray-800 rounded-xl p-3.5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Status</p>
                      <p className={`font-bold text-sm ${scheduleSettings.enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {scheduleSettings.enabled ? '● Active' : '● Paused'}
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-3.5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Frequency</p>
                      <p className="font-bold text-sm text-white">
                        {FREQUENCY_OPTIONS.find(o => o.value === scheduleSettings.frequency)?.label}
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-3.5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Articles/Run</p>
                      <p className="font-bold text-sm text-white">{scheduleSettings.articles_per_run}</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-3.5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Publish</p>
                      <p className={`font-bold text-sm ${scheduleSettings.auto_publish ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {scheduleSettings.auto_publish ? 'Auto' : 'Draft'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 bg-gray-800 rounded-xl p-3.5">
                    <code className="text-xs text-green-400 font-mono leading-relaxed block">
                      <span className="text-gray-500">// Equivalent cron expression</span><br />
                      {`schedule: "${
                        scheduleSettings.frequency === 'every_hour' ? '0 * * * *' :
                        scheduleSettings.frequency === 'every_3h' ? '0 */3 * * *' :
                        scheduleSettings.frequency === 'every_6h' ? '0 */6 * * *' :
                        scheduleSettings.frequency === 'every_12h' ? '0 */12 * * *' :
                        scheduleSettings.frequency === 'weekly' ? `${scheduleSettings.time_utc.split(':')[1]} ${scheduleSettings.time_utc.split(':')[0]} * * ${scheduleSettings.day_of_week}` :
                        `${scheduleSettings.time_utc.split(':')[1]} ${scheduleSettings.time_utc.split(':')[0]} * * *`
                      }"`}<br />
                      {`articles: ${scheduleSettings.articles_per_run}`}<br />
                      {`auto_publish: ${scheduleSettings.auto_publish}`}<br />
                      {`tone: "${scheduleSettings.preferred_tone}"`}<br />
                      {scheduleSettings.preferred_categories.length > 0
                        ? `categories: [${scheduleSettings.preferred_categories.map(c => `"${c}"`).join(', ')}]`
                        : 'categories: "all"'}
                    </code>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
