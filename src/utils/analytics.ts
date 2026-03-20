/**
 * Google Analytics 4 Utility
 * 
 * Usage:
 * 1. Set VITE_GA_ID=G-XXXXXXXXXX in Vercel environment variables
 * 2. Import and use: analytics.pageView('/post/my-article')
 * 
 * All methods are safe to call even if GA is not loaded.
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    GA_MEASUREMENT_ID?: string;
    dataLayer?: any[];
  }
}

// Check if GA is available
const isGALoaded = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof window.gtag === 'function' && 
         !!window.GA_MEASUREMENT_ID;
};

// Safe gtag wrapper
const gtag = (...args: any[]): void => {
  if (isGALoaded() && window.gtag) {
    window.gtag(...args);
  }
};

/**
 * Track a page view
 */
export const pageView = (path: string, title?: string): void => {
  gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.origin + path
  });
};

/**
 * Track article view
 */
export const articleView = (articleId: string, title: string, category: string): void => {
  gtag('event', 'article_view', {
    article_id: articleId,
    article_title: title,
    article_category: category,
    content_type: 'article'
  });
};

/**
 * Track article read (when user scrolls to end)
 */
export const articleRead = (articleId: string, title: string, readTimeSeconds: number): void => {
  gtag('event', 'article_read', {
    article_id: articleId,
    article_title: title,
    read_time_seconds: readTimeSeconds
  });
};

/**
 * Track search
 */
export const search = (searchTerm: string, resultsCount: number): void => {
  gtag('event', 'search', {
    search_term: searchTerm,
    results_count: resultsCount
  });
};

/**
 * Track category filter
 */
export const categoryFilter = (category: string): void => {
  gtag('event', 'category_filter', {
    category_name: category
  });
};

/**
 * Track social share
 */
export const socialShare = (platform: string, articleTitle: string, articleUrl: string): void => {
  gtag('event', 'share', {
    method: platform,
    content_type: 'article',
    item_id: articleUrl,
    content_id: articleTitle
  });
};

/**
 * Track newsletter signup
 */
export const newsletterSignup = (location: string): void => {
  gtag('event', 'newsletter_signup', {
    signup_location: location
  });
};

/**
 * Track bookmark
 */
export const bookmark = (articleId: string, articleTitle: string, action: 'add' | 'remove'): void => {
  gtag('event', 'bookmark', {
    article_id: articleId,
    article_title: articleTitle,
    bookmark_action: action
  });
};

/**
 * Track copy link
 */
export const copyLink = (articleUrl: string): void => {
  gtag('event', 'copy_link', {
    article_url: articleUrl
  });
};

/**
 * Track admin login
 */
export const adminLogin = (success: boolean): void => {
  gtag('event', 'admin_login', {
    login_success: success
  });
};

/**
 * Track AI article generation
 */
export const aiArticleGenerated = (topic: string, category: string): void => {
  gtag('event', 'ai_article_generated', {
    topic: topic,
    category: category
  });
};

/**
 * Track article publish
 */
export const articlePublished = (articleId: string, title: string, isAIGenerated: boolean): void => {
  gtag('event', 'article_published', {
    article_id: articleId,
    article_title: title,
    is_ai_generated: isAIGenerated
  });
};

/**
 * Track scroll depth (25%, 50%, 75%, 100%)
 */
export const scrollDepth = (depth: 25 | 50 | 75 | 100, articleId: string): void => {
  gtag('event', 'scroll_depth', {
    depth_percentage: depth,
    article_id: articleId
  });
};

/**
 * Track outbound link clicks
 */
export const outboundClick = (url: string, linkText: string): void => {
  gtag('event', 'click', {
    event_category: 'outbound',
    event_label: linkText,
    transport_type: 'beacon',
    outbound_url: url
  });
};

/**
 * Track time on page
 */
export const timeOnPage = (seconds: number, pagePath: string): void => {
  gtag('event', 'timing_complete', {
    name: 'time_on_page',
    value: seconds,
    page_path: pagePath
  });
};

/**
 * Set user properties (for logged-in admin)
 */
export const setUserProperties = (properties: Record<string, any>): void => {
  gtag('set', 'user_properties', properties);
};

/**
 * Track custom event
 */
export const trackEvent = (eventName: string, params?: Record<string, any>): void => {
  gtag('event', eventName, params);
};

// Export as single object for easier imports
const analytics = {
  pageView,
  articleView,
  articleRead,
  search,
  categoryFilter,
  socialShare,
  newsletterSignup,
  bookmark,
  copyLink,
  adminLogin,
  aiArticleGenerated,
  articlePublished,
  scrollDepth,
  outboundClick,
  timeOnPage,
  setUserProperties,
  trackEvent,
  isGALoaded
};

export default analytics;
