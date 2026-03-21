import { useState, useEffect } from 'react';
import { TrendingUp, Menu, X, Shield, ChevronDown, Search, Sparkles, Sun, Moon } from 'lucide-react';
import { CATEGORIES, Category, Post } from '../types';

interface HeaderProps {
  currentCategory: string;
  onNavigate: (page: string, category?: string) => void;
  isAdmin: boolean;
  posts?: Post[];
  onPostClick?: (slug: string) => void;
  showProgress?: boolean;
  isDark?: boolean;
  onToggleDark?: () => void;
}

export default function Header({ currentCategory, onNavigate, isAdmin, posts = [], onPostClick, showProgress, isDark, onToggleDark }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoryDropdown, setCategoryDropdown] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
      if (showProgress) {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;
        setScrollProgress(Math.min(progress, 100));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showProgress]);

  const handleCategoryClick = (cat: Category) => {
    onNavigate('home', cat === 'All' ? undefined : cat);
    setCategoryDropdown(false);
    setMobileMenuOpen(false);
  };

  const searchResults = searchQuery.trim().length > 1
    ? posts.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  return (
    <>
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'glass border-b border-gray-200/60 shadow-sm shadow-gray-100/50'
          : 'bg-white border-b border-gray-100'
      }`}>
        {/* Main Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[68px]">
            {/* Logo */}
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 group shrink-0"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-purple-700 flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:shadow-brand-500/40 transition-all duration-300 group-hover:scale-105">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white animate-pulse-glow">
                  <div className="w-full h-full rounded-full bg-emerald-400" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold tracking-tight text-gray-900 leading-none">
                  Trend<span className="text-gradient">Watch</span>Now
                </span>
                <span className="text-[9px] font-semibold text-gray-400 tracking-[0.2em] uppercase leading-none mt-0.5 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-brand-400" />
                  AI-Powered Insights
                </span>
              </div>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-0.5">
              <button
                onClick={() => onNavigate('home')}
                className={`px-4 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 ${
                  !currentCategory
                    ? 'text-brand-700 bg-brand-50/80'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Latest
              </button>

              {/* Inline top categories */}
              {['Technology', 'World', 'Business'].map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat as Category)}
                  className={`px-4 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 ${
                    currentCategory === cat
                      ? 'text-brand-700 bg-brand-50/80'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}

              {/* More categories dropdown */}
              <div className="relative">
                <button
                  onClick={() => setCategoryDropdown(!categoryDropdown)}
                  className={`flex items-center gap-1 px-4 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 ${
                    ['Politics', 'Science', 'Health', 'Entertainment'].includes(currentCategory)
                      ? 'text-brand-700 bg-brand-50/80'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  More
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${categoryDropdown ? 'rotate-180' : ''}`} />
                </button>

                {categoryDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setCategoryDropdown(false)} />
                    <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl shadow-gray-200/60 border border-gray-100 py-2 z-20 animate-fade-in-scale">
                      {CATEGORIES.filter(c => !['All', 'Technology', 'World', 'Business'].includes(c)).map(cat => (
                        <button
                          key={cat}
                          onClick={() => handleCategoryClick(cat)}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-150 ${
                            currentCategory === cat
                              ? 'text-brand-700 bg-brand-50 font-semibold'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="w-px h-5 bg-gray-200 mx-1" />

              {/* Search */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50/60 rounded-lg transition-all duration-200"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Dark mode toggle */}
              <button
                onClick={onToggleDark}
                className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50/60 rounded-lg transition-all duration-200"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Admin */}
              <button
                onClick={() => onNavigate(isAdmin ? 'admin-dashboard' : 'admin-login')}
                className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-gray-400 hover:text-brand-700 hover:bg-brand-50/60 rounded-lg transition-all duration-200"
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Admin</span>
              </button>
            </nav>

            {/* Mobile: Search + Dark mode + Menu */}
            <div className="flex items-center gap-1 lg:hidden">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={onToggleDark}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Search Overlay */}
        {searchOpen && (
          <div className="border-t border-gray-100 animate-slide-down">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles, topics, categories..."
                  className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
                  autoFocus
                />
                <button
                  onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-3 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
                  {searchResults.map((post, i) => (
                    <button
                      key={post.id}
                      onClick={() => {
                        onPostClick?.(post.slug);
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors ${
                        i > 0 ? 'border-t border-gray-50' : ''
                      }`}
                    >
                      <img src={post.image_url} alt="" className="w-14 h-10 rounded-lg object-cover flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{post.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{post.category} · {post.read_time} min read</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchQuery.trim().length > 1 && searchResults.length === 0 && (
                <p className="mt-4 text-center text-sm text-gray-400">No articles found for "{searchQuery}"</p>
              )}
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 animate-slide-down bg-white">
            <div className="px-4 py-5 space-y-1">
              <button
                onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
                className={`w-full px-4 py-3 text-sm font-semibold rounded-xl text-left transition-all ${
                  !currentCategory ? 'text-brand-700 bg-brand-50' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Latest News
              </button>
              <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Categories
              </p>
              {CATEGORIES.filter(c => c !== 'All').map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat)}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl text-left transition-all ${
                    currentCategory === cat
                      ? 'text-brand-700 bg-brand-50 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <div className="divider-gradient my-3" />
              <button
                onClick={() => { onNavigate(isAdmin ? 'admin-dashboard' : 'admin-login'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-gray-500 hover:text-brand-700 hover:bg-brand-50 rounded-xl transition-all"
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </button>
            </div>
          </div>
        )}

        {/* Reading Progress */}
        {showProgress && scrollProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-100">
            <div
              className="reading-progress h-full rounded-r-full"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        )}
      </header>

      {/* Search overlay backdrop */}
      {searchOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
          onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
        />
      )}
    </>
  );
}
