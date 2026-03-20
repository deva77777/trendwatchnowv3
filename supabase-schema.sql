-- ============================================================
-- TrendWatchNow - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the database
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== POSTS TABLE ====================
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT DEFAULT '',
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Technology', 'Politics', 'World', 'Business', 'Science', 'Health', 'Entertainment')),
  image_url TEXT DEFAULT '',
  image_alt TEXT DEFAULT '',
  author TEXT DEFAULT 'TrendWatch AI',
  read_time INTEGER DEFAULT 5,
  published BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  meta_description TEXT DEFAULT '',
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts (published);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts (category);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts (slug);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts (featured) WHERE featured = true;

-- ==================== ROW LEVEL SECURITY ====================
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Public read access for published posts
CREATE POLICY "Public can view published posts"
  ON posts FOR SELECT
  USING (published = true);

-- Service role has full access (for API serverless functions)
CREATE POLICY "Service role has full access"
  ON posts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ==================== AUTO-UPDATE updated_at ====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================== ADMIN USER (Optional) ====================
-- If you want to store admin users in the database instead of env vars,
-- create an admins table. For now, we use env vars:
--   ADMIN_EMAIL=admin@trendwatchnow.com
--   ADMIN_PASSWORD_HASH=<bcrypt hash>
--
-- Generate hash: node -e "const b=require('bcryptjs');console.log(b.hashSync('your-password',10))"

-- ==================== SETTINGS TABLE ====================
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update timestamp
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to settings"
  ON settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ==================== ADD VIEWS COLUMN (Run if upgrading) ====================
-- Add views column to posts table (safe to run multiple times)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- Create index for sorting by views
CREATE INDEX IF NOT EXISTS idx_posts_views ON posts(views DESC);

-- Insert default schedule settings
INSERT INTO settings (key, value) VALUES (
  'schedule',
  '{
    "enabled": false,
    "frequency": "daily",
    "schedule_hour": 3,
    "schedule_minute": 30,
    "schedule_day": 1,
    "articles_per_run": 3,
    "auto_publish": true,
    "tone": "analytical",
    "preferred_categories": [],
    "last_run_at": null
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- ==================== SAMPLE DATA (Optional) ====================
-- INSERT INTO posts (title, slug, excerpt, content, category, image_url, image_alt, published, featured, tags)
-- VALUES (
--   'Welcome to TrendWatchNow',
--   'welcome-to-trendwatchnow',
--   'Your AI-powered source for trending news and in-depth analysis.',
--   'Welcome to TrendWatchNow! ...',
--   'Technology',
--   'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=800',
--   'Technology concept',
--   true,
--   true,
--   ARRAY['Welcome', 'AI', 'News']
-- );
