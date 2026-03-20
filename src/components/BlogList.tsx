import { useState, useEffect } from 'react';
import { Clock, ArrowRight, Calendar, Sparkles, Zap, TrendingUp, Bot, ChevronRight, Eye } from 'lucide-react';
import { Post, CATEGORIES, CATEGORY_COLORS } from '../types';

interface BlogListProps {
  posts: Post[];
  currentCategory?: string;
  onCategoryChange: (category?: string) => void;
  onPostClick: (slug: string) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function CategoryBadge({ category, size = 'sm' }: { category: string; size?: 'sm' | 'lg' }) {
  const colors = CATEGORY_COLORS[category] || { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${colors.bg} ${colors.text} ${
      size === 'lg' ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'
    }`}>
      <span className={`rounded-full ${colors.dot} ${size === 'lg' ? 'w-1.5 h-1.5' : 'w-1 h-1'}`} />
      {category}
    </span>
  );
}

function AIBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ai-badge ${className}`}>
      <Sparkles className="w-2.5 h-2.5" />
      AI
    </span>
  );
}

/* ============================================
   HERO SECTION — Featured + 2 Side Stories
   ============================================ */
function HeroSection({ posts, onPostClick }: { posts: Post[]; onPostClick: (slug: string) => void }) {
  const featured = posts[0];
  const sideStories = posts.slice(1, 3);

  if (!featured) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Main Featured */}
        <div
          className="lg:col-span-3 relative group cursor-pointer overflow-hidden rounded-2xl lg:rounded-3xl"
          onClick={() => onPostClick(featured.slug)}
        >
          <div className="relative aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[420px]">
            <img
              src={featured.image_url}
              alt={featured.image_alt}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/5" />
            <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm border border-white/10">
                  <Zap className="w-3 h-3 text-accent-400" />
                  Featured
                </span>
                <CategoryBadge category={featured.category} />
                <AIBadge />
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight max-w-2xl">
                {featured.title}
              </h2>
              <p className="text-gray-300 text-sm lg:text-[15px] max-w-xl mb-4 line-clamp-2 hidden sm:block leading-relaxed">
                {featured.excerpt}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(featured.created_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {featured.read_time} min read
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Side Stories */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {sideStories.map((post) => (
            <div
              key={post.id}
              className="relative group cursor-pointer overflow-hidden rounded-2xl flex-1"
              onClick={() => onPostClick(post.slug)}
            >
              <div className="relative h-full min-h-[200px]">
                <img
                  src={post.image_url}
                  alt={post.image_alt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <CategoryBadge category={post.category} />
                    <AIBadge />
                  </div>
                  <h3 className="font-serif text-lg lg:text-xl font-bold text-white leading-snug line-clamp-2 group-hover:underline decoration-brand-400 decoration-2 underline-offset-2">
                    {post.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(post.created_at)}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.read_time} min</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================
   TRENDING TICKER
   ============================================ */
function TrendingTicker({ posts, onPostClick }: { posts: Post[]; onPostClick: (slug: string) => void }) {
  if (posts.length < 3) return null;
  const tickerPosts = [...posts.slice(0, 8), ...posts.slice(0, 8)]; // duplicate for seamless loop

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
      <div className="flex items-center gap-4 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg shrink-0">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-bold text-red-700 uppercase tracking-wide whitespace-nowrap">Trending</span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="ticker-track flex items-center gap-8 w-max">
            {tickerPosts.map((post, i) => (
              <button
                key={`${post.id}-${i}`}
                onClick={() => onPostClick(post.slug)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-700 transition-colors whitespace-nowrap shrink-0"
              >
                <span className="font-bold text-brand-500">#{i % posts.length + 1}</span>
                <span className="font-medium truncate max-w-[280px]">{post.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================
   POST CARD — Standard Grid Card
   ============================================ */
function PostCard({ post, onPostClick, index, variant = 'default' }: {
  post: Post;
  onPostClick: (slug: string) => void;
  index: number;
  variant?: 'default' | 'horizontal' | 'compact';
}) {
  if (variant === 'horizontal') {
    return (
      <article
        className="group cursor-pointer animate-fade-in"
        style={{ animationDelay: `${index * 60}ms` }}
        onClick={() => onPostClick(post.slug)}
      >
        <div className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden card-lift h-full flex flex-row">
          <div className="relative overflow-hidden w-2/5 image-shine">
            <img src={post.image_url} alt={post.image_alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            <div className="absolute top-2.5 left-2.5"><AIBadge /></div>
          </div>
          <div className="p-5 flex flex-col flex-1 justify-center">
            <CategoryBadge category={post.category} />
            <h3 className="font-serif text-lg font-bold text-gray-900 mt-2.5 mb-2 group-hover:text-brand-700 transition-colors leading-snug line-clamp-2">
              {post.title}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">{post.excerpt}</p>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(post.created_at)}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.read_time} min</span>
            </div>
          </div>
        </div>
      </article>
    );
  }

  if (variant === 'compact') {
    return (
      <article
        className="group cursor-pointer animate-fade-in"
        style={{ animationDelay: `${index * 60}ms` }}
        onClick={() => onPostClick(post.slug)}
      >
        <div className="flex items-center gap-4 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 -mx-3 px-3 rounded-xl transition-colors">
          <span className="text-2xl font-black text-gray-200 w-8 text-center shrink-0">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CategoryBadge category={post.category} />
              <AIBadge />
            </div>
            <h4 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors">
              {post.title}
            </h4>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
              <span>{formatDate(post.created_at)}</span>
              <span>·</span>
              <span>{post.read_time} min read</span>
            </p>
          </div>
          <img src={post.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 hidden sm:block" />
        </div>
      </article>
    );
  }

  // Default card
  return (
    <article
      className="group cursor-pointer animate-fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={() => onPostClick(post.slug)}
    >
      <div className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden card-lift h-full flex flex-col">
        <div className="relative overflow-hidden aspect-[16/10] image-shine">
          <img
            src={post.image_url}
            alt={post.image_alt}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <CategoryBadge category={post.category} />
            <AIBadge />
          </div>
        </div>
        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-serif text-lg lg:text-xl font-bold text-gray-900 mb-2.5 group-hover:text-brand-700 transition-colors leading-snug line-clamp-2">
            {post.title}
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-3 flex-1">
            {post.excerpt}
          </p>
          <div className="flex items-center justify-between pt-4 border-t border-gray-50">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(post.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {post.read_time} min
              </span>
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-brand-600 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-4px] group-hover:translate-x-0">
              Read <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ============================================
   AI EDITORIAL SECTION
   ============================================ */
function AIEditorialBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-br from-gray-900 via-brand-950 to-purple-950 p-8 lg:p-10">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-brand-500 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-purple-500 blur-3xl" />
      </div>

      <div className="relative flex flex-col lg:flex-row items-center gap-8">
        {/* Icon */}
        <div className="relative shrink-0">
          <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-brand-500/30 animate-float">
            <Bot className="w-10 h-10 lg:w-12 lg:h-12 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent-400 flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 h-4 text-gray-900" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center lg:text-left flex-1">
          <h3 className="text-xl lg:text-2xl font-bold text-white mb-3 flex items-center justify-center lg:justify-start gap-2">
            <span>Powered by Advanced AI</span>
          </h3>
          <p className="text-gray-300 text-sm lg:text-[15px] leading-relaxed max-w-2xl mb-4">
            Every article on TrendWatchNow is intelligently crafted by our AI editorial engine. We scan
            <span className="text-brand-300 font-semibold"> BBC, Reuters, Al Jazeera, TechCrunch,</span> and
            <span className="text-brand-300 font-semibold"> The Guardian</span> for trending topics — then our AI (powered by Llama 3.3 70B) writes original, in-depth analysis with
            <span className="text-brand-300 font-semibold"> HD imagery from Pexels</span>.
          </p>
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
            {[
              { icon: TrendingUp, label: 'Trending RSS Feeds', color: 'text-emerald-400' },
              { icon: Bot, label: 'AI-Written Articles', color: 'text-brand-400' },
              { icon: Eye, label: 'HD Pexels Images', color: 'text-purple-400' },
              { icon: Zap, label: 'Auto-Published Daily', color: 'text-accent-400' },
            ].map(({ icon: Icon, label, color }) => (
              <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================
   MAIN BLOG LIST
   ============================================ */
export default function BlogList({ posts, currentCategory, onCategoryChange, onPostClick }: BlogListProps) {
  const [visibleCount, setVisibleCount] = useState(9);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { setLoaded(true); }, []);
  useEffect(() => { setVisibleCount(9); }, [currentCategory]);

  const filteredPosts = currentCategory
    ? posts.filter(p => p.category === currentCategory)
    : posts;

  const heroEligible = !currentCategory && filteredPosts.length >= 3;
  const heroPostIds = heroEligible ? filteredPosts.slice(0, 3).map(p => p.id) : [];
  const gridPosts = filteredPosts.filter(p => !heroPostIds.includes(p.id));
  const visiblePosts = gridPosts.slice(0, visibleCount);
  const hasMore = visibleCount < gridPosts.length;

  // Sidebar trending (top 5 by recency when viewing a category)
  const trendingPosts = currentCategory
    ? posts.filter(p => p.category !== currentCategory).slice(0, 5)
    : posts.slice(3, 8);

  return (
    <div className={`min-h-screen transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
      {/* HERO — only on "Latest" (no category) */}
      {heroEligible && (
        <HeroSection posts={filteredPosts} onPostClick={onPostClick} />
      )}

      {/* TRENDING TICKER */}
      {!currentCategory && filteredPosts.length >= 5 && (
        <TrendingTicker posts={filteredPosts} onPostClick={onPostClick} />
      )}

      {/* Category Filter Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 py-4">
          {CATEGORIES.map(cat => {
            const isActive = cat === 'All' ? !currentCategory : currentCategory === cat;
            const count = cat === 'All' ? posts.length : posts.filter(p => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat === 'All' ? undefined : cat)}
                className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                {cat}
                <span className={`text-xs px-1.5 py-0.5 rounded-md transition-colors ${
                  isActive ? 'bg-white/20 text-white/80' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Category Header (when filtered) */}
      {currentCategory && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${CATEGORY_COLORS[currentCategory]?.bg || 'bg-gray-100'}`}>
              <TrendingUp className={`w-5 h-5 ${CATEGORY_COLORS[currentCategory]?.text || 'text-gray-600'}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{currentCategory}</h1>
              <p className="text-sm text-gray-500">{filteredPosts.length} article{filteredPosts.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </section>
      )}

      {/* MAIN CONTENT — Grid + Sidebar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No articles yet</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {currentCategory
                ? `No articles in ${currentCategory} yet. Our AI is working on it — check back soon!`
                : 'No articles yet. Our AI will start publishing soon!'}
            </p>
          </div>
        ) : (
          <div className="flex gap-8">
            {/* Main Grid */}
            <div className="flex-1 min-w-0">
              {/* Section title */}
              {!currentCategory && (
                <div className="flex items-center gap-2 mb-6 pt-2">
                  <Sparkles className="w-4 h-4 text-brand-500" />
                  <h2 className="text-lg font-bold text-gray-900">Latest Stories</h2>
                  <div className="flex-1 divider-gradient ml-4" />
                </div>
              )}

              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visiblePosts.map((post, i) => (
                  <PostCard key={post.id} post={post} onPostClick={onPostClick} index={i} />
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="mt-10 text-center">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 6)}
                    className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white border-2 border-gray-200 text-sm font-bold text-gray-700 hover:border-brand-500 hover:text-brand-700 hover:shadow-lg hover:shadow-brand-100/50 transition-all duration-300"
                  >
                    Load more articles
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <p className="text-xs text-gray-400 mt-3">
                    Showing {visiblePosts.length} of {gridPosts.length} articles
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar — Desktop only */}
            <aside className="hidden xl:block w-80 shrink-0">
              {/* Trending Box */}
              <div className="sticky top-24">
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wider mb-5">
                    <TrendingUp className="w-4 h-4 text-brand-500" />
                    {currentCategory ? 'From Other Topics' : 'Popular Now'}
                  </h3>
                  <div>
                    {trendingPosts.map((post, i) => (
                      <PostCard key={post.id} post={post} onPostClick={onPostClick} index={i} variant="compact" />
                    ))}
                  </div>
                </div>

                {/* Newsletter Mini */}
                <div className="mt-6 bg-gradient-to-br from-brand-600 to-purple-700 rounded-2xl p-6 text-white">
                  <h4 className="font-bold text-lg mb-2">Stay Informed</h4>
                  <p className="text-brand-200 text-sm mb-4 leading-relaxed">Get AI-curated trending stories delivered to your inbox.</p>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 mb-3"
                  />
                  <button className="w-full py-2.5 bg-white text-brand-700 text-sm font-bold rounded-xl hover:bg-brand-50 transition-colors">
                    Subscribe Free
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>

      {/* AI EDITORIAL BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <AIEditorialBanner />
      </section>
    </div>
  );
}
