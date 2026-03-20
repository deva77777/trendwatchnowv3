import { createRequire } from 'module';
import { SignJWT, jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'trendwatchnow-secret-key-change-in-production');
// Support both ADMIN_EMAIL and ADMIN_USERNAME env vars
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME || 'admin@trendwatchnow.com';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync('admin123', 10);

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

async function createToken(email: string): Promise<string> {
  return new SignJWT({ email, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .setIssuer('trendwatchnow')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: 'trendwatchnow' });
    return payload;
  } catch {
    return null;
  }
}

async function authenticateRequest(req: any): Promise<boolean> {
  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) return false;
  const payload = await verifyToken(authHeader.split(' ')[1]);
  return !!payload;
}

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ============ GET — Read settings ============
  if (req.method === 'GET') {
    const { action } = req.query || {};

    if (action === 'settings') {
      // Verify JWT
      const isAuth = await authenticateRequest(req);
      if (!isAuth) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const supabase = getSupabase();
      if (!supabase) {
        return res.status(500).json({ error: 'Database not configured' });
      }

      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'schedule')
          .single();

        if (error) {
          console.error('Settings read error:', error);
          return res.status(404).json({ error: 'Settings not found', details: error.message });
        }

        return res.status(200).json({ settings: data.value });
      } catch (err: any) {
        console.error('Settings fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch settings', details: err.message });
      }
    }

    return res.status(400).json({ error: 'Invalid action. Use ?action=settings' });
  }

  // ============ POST — Login & Verify ============
  if (req.method === 'POST') {
    const { action, email, password } = req.body || {};

    if (action === 'login') {
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Case-insensitive email comparison
      if (email.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase().trim()) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const passwordValid = bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
      if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = await createToken(email);
      return res.status(200).json({ token, email, role: 'admin' });
    }

    if (action === 'verify') {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const payload = await verifyToken(authHeader.split(' ')[1]);
      if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      return res.status(200).json({ valid: true, email: payload.email, role: payload.role });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  // ============ PUT — Save settings ============
  if (req.method === 'PUT') {
    // Verify JWT
    const isAuth = await authenticateRequest(req);
    if (!isAuth) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { action, settings } = req.body || {};

    if (action === 'save_settings' || action === 'update_settings') {
      if (!settings) {
        return res.status(400).json({ error: 'Settings object is required' });
      }

      const supabase = getSupabase();
      if (!supabase) {
        return res.status(500).json({ error: 'Database not configured' });
      }

      try {
        // Upsert — insert if not exists, update if exists
        const { data, error } = await supabase
          .from('settings')
          .upsert(
            {
              key: 'schedule',
              value: settings,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'key' }
          )
          .select()
          .single();

        if (error) {
          console.error('Settings save error:', error);
          return res.status(500).json({ error: 'Failed to save settings', details: error.message });
        }

        return res.status(200).json({ success: true, settings: data.value });
      } catch (err: any) {
        console.error('Settings save exception:', err);
        return res.status(500).json({ error: 'Failed to save settings', details: err.message });
      }
    }

    return res.status(400).json({ error: 'Invalid action. Use action: "save_settings"' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
