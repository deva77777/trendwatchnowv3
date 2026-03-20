export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  image_url: string;
  image_alt: string;
  author: string;
  read_time: number;
  published: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
  source_url?: string;
  meta_description?: string;
  tags?: string[];
  views?: number;
}

export interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  category: string;
}

export type Category =
  | 'All'
  | 'Technology'
  | 'Politics'
  | 'World'
  | 'Business'
  | 'Science'
  | 'Health'
  | 'Entertainment';

export interface AdminStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  categories: number;
}

export type View =
  | { page: 'home'; category?: string }
  | { page: 'post'; slug: string }
  | { page: 'admin-login' }
  | { page: 'admin-dashboard' };

export const CATEGORIES: Category[] = [
  'All',
  'Technology',
  'Politics',
  'World',
  'Business',
  'Science',
  'Health',
  'Entertainment',
];

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Technology: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  Politics: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  World: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Business: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  Science: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  Health: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
  Entertainment: { bg: 'bg-pink-50', text: 'text-pink-700', dot: 'bg-pink-500' },
};
