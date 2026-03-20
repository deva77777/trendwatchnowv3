import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Clock, Calendar, Share2, Bookmark, BookmarkCheck, Twitter, Facebook, LinkIcon, Tag, Linkedin, Mail, Check, Sparkles, ArrowRight } from 'lucide-react';
import { Post, CATEGORY_COLORS } from '../types';
import analytics from '../utils/analytics';

interface BlogPostProps {
  post: Post;
  allPosts: Post[];
  onBack: () => void;
  onPostClick: (slug: string) => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function renderContent(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactElement[] = [];
  let i = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { i++; continue; }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-2xl lg:text-[1.7rem] font-bold text-gray-900 mt-12 mb-4 font-serif leading-tight">
          {trimmed.replace('## ', '')}
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-xl font-semibold text-gray-800 mt-9 mb-3">
          {trimmed.replace('### ', '')}
        </h3>
      );
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      elements.push(
        <p key={i} className="font-semibold text-gray-900 mb-2 mt-5 text-[1.05rem]">
          {trimmed.replace(/\*\*/g, '')}
        </p>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={i} className="text-gray-600 leading-[1.85] ml-6 mb-2.5 list-disc text-[1.05rem]">
          {renderInlineFormatting(trimmed.replace(/^[-*]\s/, ''))}
        </li>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      elements.push(
        <li key={i} className="text-gray-600 leading-[1.85] ml-6 mb-2.5 list-decimal text-[1.05rem]">
          {renderInlineFormatting(trimmed.replace(/^\d+\.\s/, ''))}
        </li>
      );
    } else if (trimmed.startsWith('"') || trimmed.startsWith('\u201c')) {
      elements.push(
        <blockquote key={i} className="border-l-3 border-brand-400 pl-6 py-3 my-8 bg-gradient-to-r from-brand-50/60 to-transparent rounded-r-xl">
          <p className="text-gray-700 italic leading-relaxed text-[1.1rem]">{renderInlineFormatting(trimmed)}</p>
        </blockquote>
      );
    } else {
      elements.push(
        <p key={i} className="text-gray-600 leading-[1.9] mb-6 text-[1.075rem]">
          {renderInlineFormatting(trimmed)}
        </p>
      );
    }
    i++;
  }
  return elements;
}

function renderInlineFormatting(text: string): (string | React.ReactElement)[] {
  const parts: (string | React.ReactElement)[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(<strong key={match.index} className="font-semibold text-gray-900">{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export default function BlogPost({ post, allPosts, onBack, onPostClick }: BlogPostProps) {
  const [isBookmarked, setIsBookmarked] = useState(() => {
    const saved = localStorage.getItem('twn_bookmarks');
    if (saved) { const b: string[] = JSON.parse(saved); return b.includes(post.slug); }
    return false;
  });
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const scrollMilestonesRef = useRef<Set<number>>(new Set());
  const startTimeRef = useRef<number>(Date.now());

  // Track scroll depth milestones (25%, 50%, 75%, 100%)
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);
      
      const milestones = [25, 50, 75, 100] as const;
      for (const milestone of milestones) {
        if (scrollPercent >= milestone && !scrollMilestonesRef.current.has(milestone)) {
          scrollMilestonesRef.current.add(milestone);
          analytics.scrollDepth(milestone, post.id);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [post.id]);

  // Track time on page when leaving
  useEffect(() => {
    return () => {
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (timeSpent > 5) { // Only track if spent more than 5 seconds
        analytics.timeOnPage(timeSpent, `/post/${post.slug}`);
        // If read to at least 75%, track as article read
        if (scrollMilestonesRef.current.has(75)) {
          analytics.articleRead(post.id, post.title, timeSpent);
        }
      }
    };
  }, [post.id, post.slug, post.title]);

  const colors = CATEGORY_COLORS[post.category] || { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' };
  const articleUrl = `https://trendwatchnow.com/post/${post.slug}`;
  const encodedUrl = encodeURIComponent(articleUrl);
  const encodedTitle = encodeURIComponent(post.title);
  const encodedExcerpt = encodeURIComponent(post.excerpt || '');

  const relatedPosts = allPosts
    .filter(p => p.id !== post.id && p.category === post.category)
    .slice(0, 3);
  const moreFromOthers = relatedPosts.length < 3
    ? allPosts.filter(p => p.id !== post.id && p.category !== post.category).slice(0, 3 - relatedPosts.length)
    : [];
  const related = [...relatedPosts, ...moreFromOthers];

  const handleBookmark = () => {
    const saved = localStorage.getItem('twn_bookmarks');
    let bookmarks: string[] = saved ? JSON.parse(saved) : [];
    const action = isBookmarked ? 'remove' : 'add';
    if (isBookmarked) { bookmarks = bookmarks.filter(s => s !== post.slug); }
    else { bookmarks.push(post.slug); }
    localStorage.setItem('twn_bookmarks', JSON.stringify(bookmarks));
    setIsBookmarked(!isBookmarked);
    analytics.bookmark(post.id, post.title, action);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(articleUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
      analytics.copyLink(articleUrl);
    }).catch(() => {
      const t = document.createElement('textarea'); t.value = articleUrl;
      document.body.appendChild(t); t.select(); document.execCommand('copy');
      document.body.removeChild(t); setCopied(true); setTimeout(() => setCopied(false), 2000);
      analytics.copyLink(articleUrl);
    });
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try { 
        await navigator.share({ title: post.title, text: post.excerpt || '', url: articleUrl }); 
        analytics.socialShare('native', post.title, articleUrl);
      }
      catch { /* cancelled */ }
    } else { setShowShareMenu(!showShareMenu); }
  };

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=Check out this article: ${encodedUrl}%0A%0A${encodedExcerpt}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
  };

  const openShareLink = (platform: string, url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
    analytics.socialShare(platform, post.title, articleUrl);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Top Bar */}
      <div className="sticky top-16 lg:top-[68px] z-30 glass border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>

            {/* Center — title on scroll */}
            <p className="hidden sm:block text-sm font-semibold text-gray-700 truncate max-w-xs lg:max-w-md px-4">
              {post.title}
            </p>

            <div className="flex items-center gap-1 relative">
              <button
                onClick={handleBookmark}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isBookmarked
                    ? 'text-brand-600 bg-brand-50'
                    : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50'
                }`}
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              >
                {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>
              <button
                onClick={handleNativeShare}
                className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all duration-200"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>

              {showShareMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-2xl shadow-gray-200/60 border border-gray-100 py-2 z-50 animate-fade-in-scale">
                    {[
                      { onClick: () => openShareLink('twitter', shareLinks.twitter), icon: Twitter, label: 'Twitter / X', iconColor: 'text-sky-500' },
                      { onClick: () => openShareLink('facebook', shareLinks.facebook), icon: Facebook, label: 'Facebook', iconColor: 'text-blue-600' },
                      { onClick: () => openShareLink('linkedin', shareLinks.linkedin), icon: Linkedin, label: 'LinkedIn', iconColor: 'text-blue-700' },
                      { onClick: () => openShareLink('whatsapp', shareLinks.whatsapp), icon: Mail, label: 'WhatsApp', iconColor: 'text-green-600' },
                      { onClick: () => openShareLink('email', shareLinks.email), icon: Mail, label: 'Email', iconColor: 'text-gray-500' },
                    ].map(({ onClick, icon: Icon, label, iconColor }) => (
                      <button
                        key={label}
                        onClick={() => { onClick(); setShowShareMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Icon className={`w-4 h-4 ${iconColor}`} /> {label}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => { handleCopyLink(); setShowShareMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <LinkIcon className="w-4 h-4 text-gray-400" />}
                        {copied ? 'Copied!' : 'Copy link'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative w-full">
        <div className="w-full h-[300px] sm:h-[380px] md:h-[440px] lg:h-[520px] overflow-hidden">
          <img
            src={post.image_url}
            alt={post.image_alt}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} shadow-sm`}>
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            {post.category}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white ai-badge">
            <Sparkles className="w-2.5 h-2.5" /> AI Generated
          </span>
          <span className="text-sm text-gray-400">•</span>
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            {post.read_time} min read
          </span>
        </div>

        {/* Title */}
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-gray-900 leading-[1.15] mb-7 tracking-[-0.015em]">
          {post.title}
        </h1>

        {/* Author & Date */}
        <div className="flex items-center gap-4 pb-8 mb-10 border-b border-gray-100">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-400 via-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-[15px]">{post.author}</p>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(post.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Excerpt / Lead */}
        <div className="relative mb-10">
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b from-brand-500 to-purple-500" />
          <p className="text-xl lg:text-[1.3rem] text-gray-700 leading-relaxed font-light pl-6">
            {post.excerpt}
          </p>
        </div>

        {/* Content */}
        <div className="prose max-w-none">
          {renderContent(post.content)}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-14 pt-8 border-t border-gray-100">
            <Tag className="w-4 h-4 text-gray-300 mr-1" />
            {post.tags.map(tag => (
              <span key={tag} className="px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-medium rounded-full border border-gray-100 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 transition-colors cursor-default">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Share Bar */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-5 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-brand-500" />
            Share this article
          </h3>
          <div className="flex flex-wrap gap-2.5">
            {[
              { onClick: () => openShareLink('twitter', shareLinks.twitter), icon: Twitter, label: 'Twitter', hoverBg: 'hover:bg-sky-50', hoverText: 'hover:text-sky-600', hoverBorder: 'hover:border-sky-200' },
              { onClick: () => openShareLink('facebook', shareLinks.facebook), icon: Facebook, label: 'Facebook', hoverBg: 'hover:bg-blue-50', hoverText: 'hover:text-blue-600', hoverBorder: 'hover:border-blue-200' },
              { onClick: () => openShareLink('linkedin', shareLinks.linkedin), icon: Linkedin, label: 'LinkedIn', hoverBg: 'hover:bg-blue-50', hoverText: 'hover:text-blue-700', hoverBorder: 'hover:border-blue-200' },
              { onClick: () => openShareLink('whatsapp', shareLinks.whatsapp), icon: Mail, label: 'WhatsApp', hoverBg: 'hover:bg-green-50', hoverText: 'hover:text-green-600', hoverBorder: 'hover:border-green-200' },
              { onClick: () => openShareLink('email', shareLinks.email), icon: Mail, label: 'Email', hoverBg: 'hover:bg-gray-100', hoverText: 'hover:text-gray-700', hoverBorder: 'hover:border-gray-300' },
            ].map(({ onClick, icon: Icon, label, hoverBg, hoverText, hoverBorder }) => (
              <button
                key={label}
                onClick={onClick}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-500 ${hoverBg} ${hoverText} ${hoverBorder} transition-all duration-200 text-sm font-medium`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
            <button
              onClick={handleCopyLink}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all duration-200 text-sm font-medium ${
                copied
                  ? 'bg-green-50 text-green-600 border-green-200'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>
      </article>

      {/* Related Articles */}
      {related.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mt-8">
          <div className="border-t border-gray-100 pt-12">
            <div className="flex items-center gap-2 mb-8">
              <Sparkles className="w-5 h-5 text-brand-500" />
              <h2 className="text-2xl font-bold text-gray-900 font-serif">More to explore</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent ml-4" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map(rp => {
                const rpColors = CATEGORY_COLORS[rp.category] || { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' };
                return (
                  <article
                    key={rp.id}
                    className="group cursor-pointer"
                    onClick={() => { window.scrollTo(0, 0); onPostClick(rp.slug); }}
                  >
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden card-lift">
                      <div className="aspect-[16/10] overflow-hidden image-shine">
                        <img src={rp.image_url} alt={rp.image_alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      </div>
                      <div className="p-5">
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${rpColors.bg} ${rpColors.text}`}>
                            <span className={`w-1 h-1 rounded-full ${rpColors.dot}`} />
                            {rp.category}
                          </span>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white ai-badge">
                            <Sparkles className="w-2 h-2" /> AI
                          </span>
                        </div>
                        <h3 className="font-serif font-bold text-gray-900 group-hover:text-brand-700 transition-colors line-clamp-2 leading-snug text-[15px]">
                          {rp.title}
                        </h3>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                          <p className="text-xs text-gray-400">{rp.read_time} min read</p>
                          <span className="text-xs font-semibold text-brand-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            Read <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
