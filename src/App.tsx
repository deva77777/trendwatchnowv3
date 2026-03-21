import { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import BlogList from './components/BlogList';
import BlogPost from './components/BlogPost';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import { mockPosts } from './data/mockPosts';
import type { Post, View } from './types';
import analytics from './utils/analytics';
import { useDarkMode } from './hooks/useDarkMode';

const HAS_BACKEND = import.meta.env.VITE_HAS_BACKEND === 'true';
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function App() {
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [view, setView] = useState<View>({ page: 'home' });
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState('');

  // Parse URL path for routing
  const parseUrl = useCallback(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    // Check query params first (from OG redirects: ?post=slug or ?category=name)
    const postParam = params.get('post');
    const categoryParam = params.get('category');

    if (postParam) {
      setView({ page: 'post', slug: postParam });
      window.history.replaceState({}, '', `/post/${postParam}`);
      return;
    }
    if (categoryParam) {
      setView({ page: 'home', category: categoryParam });
      window.history.replaceState({}, '', `/category/${categoryParam}`);
      return;
    }

    // Check clean URL paths: /post/slug or /category/name
    const postMatch = path.match(/^\/post\/(.+)$/);
    if (postMatch) {
      setView({ page: 'post', slug: postMatch[1] });
      return;
    }

    const categoryMatch = path.match(/^\/category\/(.+)$/);
    if (categoryMatch) {
      setView({ page: 'home', category: categoryMatch[1] });
      return;
    }

    if (path === '/admin') {
      setView({ page: 'admin-login' });
      return;
    }
  }, []);

  // On load: fetch posts + parse URL for deep linking
  useEffect(() => {
    if (HAS_BACKEND) {
      fetchPosts();
    }
    parseUrl();

    // Handle browser back/forward buttons
    const handlePopState = () => {
      parseUrl();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const fetchPosts = async (includeAll = false, token?: string | null) => {
    try {
      const activeToken = token ?? authToken;
      const url = includeAll
        ? `${API_BASE}/posts?published=all`
        : `${API_BASE}/posts`;
      const headers: Record<string, string> = {};
      if (activeToken && includeAll) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.posts && data.posts.length > 0) {
          setPosts(data.posts);
        }
      }
    } catch (err) {
      console.log('Using mock data - API not available');
    }
  };

  const handleNavigate = useCallback((page: string, category?: string) => {
    window.scrollTo(0, 0);
    if (page === 'home') {
      setView({ page: 'home', category });
      // Update URL bar
      if (category) {
        window.history.pushState({}, '', `/category/${category.toLowerCase()}`);
        analytics.pageView(`/category/${category.toLowerCase()}`, `${category} - TrendWatchNow`);
        analytics.categoryFilter(category);
      } else {
        window.history.pushState({}, '', '/');
        analytics.pageView('/', 'TrendWatchNow - AI-Powered News');
      }
      // Refetch latest posts from DB when navigating to blog
      if (HAS_BACKEND) {
        fetchPosts(false);
      }
    } else if (page === 'admin-login') {
      setView({ page: 'admin-login' });
      analytics.pageView('/admin/login', 'Admin Login - TrendWatchNow');
    } else if (page === 'admin-dashboard') {
      setView({ page: 'admin-dashboard' });
      analytics.pageView('/admin/dashboard', 'Admin Dashboard - TrendWatchNow');
      // Refetch all posts (including drafts) for admin
      if (HAS_BACKEND && authToken) {
        fetchPosts(true, authToken);
      }
    }
  }, [authToken]);

  const handlePostClick = useCallback((slug: string) => {
    window.scrollTo(0, 0);
    setView({ page: 'post', slug });
    // Update URL bar so users can copy/share the clean URL
    window.history.pushState({}, '', `/post/${slug}`);
    
    // Track article view in Google Analytics
    const post = posts.find(p => p.slug === slug);
    if (post) {
      analytics.pageView(`/post/${slug}`, `${post.title} - TrendWatchNow`);
      analytics.articleView(post.id, post.title, post.category);
    }
  }, [posts]);

  const handleCategoryChange = useCallback((category?: string) => {
    setView({ page: 'home', category });
    // Update URL bar for category pages
    if (category) {
      window.history.pushState({}, '', `/category/${category.toLowerCase()}`);
      analytics.pageView(`/category/${category.toLowerCase()}`, `${category} - TrendWatchNow`);
      analytics.categoryFilter(category);
    } else {
      window.history.pushState({}, '', '/');
      analytics.pageView('/', 'TrendWatchNow - AI-Powered News');
    }
  }, []);

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    if (HAS_BACKEND) {
      try {
        const res = await fetch(`${API_BASE}/admin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', email, password }),
        });
        if (res.ok) {
          const data = await res.json();
          setAuthToken(data.token);
          setIsAdmin(true);
          setLoginError('');
          setView({ page: 'admin-dashboard' });
          analytics.adminLogin(true);
          analytics.setUserProperties({ user_type: 'admin' });
          // Refetch posts with all (drafts too) — pass token directly since state hasn't updated yet
          fetchPosts(true, data.token);
          return true;
        } else {
          const data = await res.json();
          setLoginError(data.error || 'Invalid credentials');
          analytics.adminLogin(false);
          return false;
        }
      } catch {
        setLoginError('Connection error. Please try again.');
        return false;
      }
    } else {
      // Demo mode: accept any credentials
      if (email && password) {
        setAuthToken('demo-token');
        setIsAdmin(true);
        setLoginError('');
        setView({ page: 'admin-dashboard' });
        return true;
      }
      return false;
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setIsAdmin(false);
    setView({ page: 'home' });
  };

  // --- Admin CRUD operations ---
  const handleCreatePost = async (post: Partial<Post>): Promise<Post | null> => {
    if (HAS_BACKEND && authToken) {
      try {
        const res = await fetch(`${API_BASE}/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            ...post,
            published: post.published === true ? true : false,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          // Small delay to ensure Supabase has committed
          await new Promise(r => setTimeout(r, 300));
          // Refetch all posts from DB to stay in sync
          await fetchPosts(true, authToken);
          return data.post;
        } else {
          const errData = await res.json().catch(() => ({}));
          console.error('Create post API error:', errData);
          return null;
        }
      } catch (err) {
        console.error('Create post error:', err);
        return null;
      }
    }
    // Demo mode: create locally
    const newPost: Post = {
      id: crypto.randomUUID(),
      title: post.title || 'Untitled',
      slug: post.slug || post.title?.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 80) || 'untitled',
      excerpt: post.excerpt || '',
      content: post.content || '',
      category: post.category || 'Technology',
      image_url: post.image_url || 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=800',
      image_alt: post.image_alt || post.title || 'Article image',
      author: post.author || 'TrendWatch AI',
      read_time: post.read_time || Math.ceil((post.content || '').split(/\s+/).length / 200),
      published: post.published ?? false,
      featured: post.featured ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: post.tags || [],
      source_url: post.source_url,
      meta_description: post.meta_description,
    };
    setPosts(prev => [newPost, ...prev]);
    return newPost;
  };

  const handleUpdatePost = async (id: string, updates: Partial<Post>): Promise<Post | null> => {
    if (HAS_BACKEND && authToken) {
      try {
        // Ensure published is explicitly boolean
        const cleanUpdates = { ...updates };
        if ('published' in cleanUpdates) {
          cleanUpdates.published = cleanUpdates.published === true ? true : false;
        }
        const res = await fetch(`${API_BASE}/posts`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ id, ...cleanUpdates }),
        });
        if (res.ok) {
          const data = await res.json();
          // Small delay to ensure Supabase has committed
          await new Promise(r => setTimeout(r, 300));
          // Refetch all posts from DB to stay in sync
          await fetchPosts(true, authToken);
          return data.post;
        } else {
          const errData = await res.json().catch(() => ({}));
          console.error('Update post API error:', errData);
          return null;
        }
      } catch (err) {
        console.error('Update post error:', err);
        return null;
      }
    }
    // Demo mode: update locally
    const updated = { ...updates, updated_at: new Date().toISOString() };
    setPosts(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updated } as Post : p))
    );
    return null;
  };

  const handleDeletePost = async (id: string): Promise<boolean> => {
    if (HAS_BACKEND && authToken) {
      try {
        const res = await fetch(`${API_BASE}/posts?id=${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        if (res.ok) {
          // Refetch all posts from DB to stay in sync
          await fetchPosts(true, authToken);
          return true;
        }
      } catch (err) {
        console.error('Delete post error:', err);
      }
    }
    // Demo mode: delete locally
    setPosts(prev => prev.filter(p => p.id !== id));
    return true;
  };

  // Determine current category for header
  const currentCategory = view.page === 'home' ? view.category : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hide header on admin pages */}
      {view.page !== 'admin-dashboard' && (
        <Header
          currentCategory={currentCategory || ''}
          onNavigate={handleNavigate}
          isAdmin={isAdmin}
          posts={posts.filter(p => p.published)}
          onPostClick={handlePostClick}
          showProgress={view.page === 'post'}
          isDark={isDark}
          onToggleDark={toggleDark}
        />
      )}

      <main className="flex-1">
        {view.page === 'home' && (
          <BlogList
            posts={posts.filter(p => p.published)}
            currentCategory={view.category}
            onCategoryChange={handleCategoryChange}
            onPostClick={handlePostClick}
          />
        )}

        {view.page === 'post' && (() => {
          const post = posts.find(p => p.slug === view.slug);
          if (!post) {
            return (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Article not found</h2>
                <p className="text-gray-500 mb-6">The article you're looking for doesn't exist or has been removed.</p>
                <button
                  onClick={() => handleNavigate('home')}
                  className="px-6 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-500 transition-colors"
                >
                  Back to Home
                </button>
              </div>
            );
          }
          return (
            <BlogPost
              post={post}
              allPosts={posts.filter(p => p.published)}
              onBack={() => handleNavigate('home')}
              onPostClick={handlePostClick}
            />
          );
        })()}

        {view.page === 'admin-login' && (
          <AdminLogin
            onLogin={handleLogin}
            onBack={() => handleNavigate('home')}
            error={loginError}
          />
        )}

        {view.page === 'admin-dashboard' && (
          <AdminDashboard
            posts={posts}
            authToken={authToken}
            hasBackend={HAS_BACKEND}
            apiBase={API_BASE}
            onLogout={handleLogout}
            onBack={() => handleNavigate('home')}
            onCreatePost={handleCreatePost}
            onUpdatePost={handleUpdatePost}
            onDeletePost={handleDeletePost}
            isDark={isDark}
            onToggleDark={toggleDark}
          />
        )}
      </main>

      {/* Hide footer on admin pages */}
      {view.page !== 'admin-dashboard' && view.page !== 'admin-login' && (
        <Footer onNavigate={handleNavigate} />
      )}
    </div>
  );
}
