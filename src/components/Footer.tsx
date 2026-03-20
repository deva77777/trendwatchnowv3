import { TrendingUp, Mail, Github, Twitter, Rss, Sparkles, Bot, Globe, Heart } from 'lucide-react';
import { CATEGORIES, CATEGORY_COLORS } from '../types';

interface FooterProps {
  onNavigate: (page: string, category?: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const year = new Date().getFullYear();

  const sources = [
    { name: 'BBC News', color: 'bg-red-500' },
    { name: 'Reuters', color: 'bg-orange-500' },
    { name: 'Al Jazeera', color: 'bg-amber-500' },
    { name: 'TechCrunch', color: 'bg-green-500' },
    { name: 'The Guardian', color: 'bg-blue-500' },
  ];

  return (
    <footer className="relative bg-gray-950 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-600/5 rounded-full blur-3xl" />

      {/* Newsletter Section */}
      <div className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 mb-6">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-semibold text-brand-300">AI-Curated Newsletter</span>
            </div>
            <h3 className="text-2xl lg:text-3xl font-bold text-white mb-3 font-serif">
              Never miss a trending story
            </h3>
            <p className="text-gray-400 text-[15px] mb-8 leading-relaxed max-w-lg mx-auto">
              Join thousands of readers who get AI-curated trending news, analysis, and insights delivered to their inbox every morning.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-all"
              />
              <button className="px-7 py-3.5 bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 whitespace-nowrap">
                Subscribe Free
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-4">No spam, ever. Unsubscribe anytime.</p>
          </div>
        </div>
      </div>

      {/* Main Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <button onClick={() => onNavigate('home')} className="flex items-center gap-2.5 mb-5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold text-white tracking-tight">
                Trend<span className="text-brand-400">Watch</span>Now
              </span>
            </button>
            <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-xs">
              AI-powered editorial platform delivering original analysis on the world's most trending topics. Every article is crafted by advanced language models for depth and clarity.
            </p>

            {/* AI Tech Stack */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { icon: Bot, label: 'Llama 3.3 70B' },
                { icon: Globe, label: '5 RSS Sources' },
                { icon: Sparkles, label: 'Auto-Published' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-500">
                  <Icon className="w-3 h-3 text-brand-500" />
                  {label}
                </span>
              ))}
            </div>

            {/* Social Links */}
            <div className="flex gap-2">
              {[
                { icon: Twitter, label: 'Twitter' },
                { icon: Github, label: 'GitHub' },
                { icon: Rss, label: 'RSS' },
                { icon: Mail, label: 'Email' },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  title={label}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-brand-600/20 border border-white/5 hover:border-brand-500/30 flex items-center justify-center transition-all duration-200 group"
                >
                  <Icon className="w-4 h-4 text-gray-500 group-hover:text-brand-400 transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-5">Topics</h4>
            <ul className="space-y-3">
              {CATEGORIES.filter(c => c !== 'All').map(cat => {
                const colors = CATEGORY_COLORS[cat];
                return (
                  <li key={cat}>
                    <button
                      onClick={() => onNavigate('home', cat)}
                      className="group flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${colors?.dot || 'bg-gray-500'} opacity-60 group-hover:opacity-100 transition-opacity`} />
                      {cat}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-5">Company</h4>
            <ul className="space-y-3">
              {['About', 'Editorial Policy', 'Privacy', 'Terms', 'Contact'].map(item => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* News Sources */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-5">Sources</h4>
            <ul className="space-y-3">
              {sources.map(source => (
                <li key={source.name} className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${source.color}`} />
                  <span className="text-sm text-gray-500">{source.name}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-gray-600 mt-4 leading-relaxed">
              We analyze trending topics from these sources. All content is original AI-written analysis.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600">
              © {year} TrendWatchNow. All rights reserved.
            </p>
            <p className="text-xs text-gray-700 flex items-center gap-1.5">
              Made with <Heart className="w-3 h-3 text-red-500/50" /> using React, Vite, Tailwind, Groq AI & Supabase
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
