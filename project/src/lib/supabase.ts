import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a singleton instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'pantry-pal-auth',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
    },
  },
});

// Initialize auth state early
const initPromise = supabase.auth.getSession();

export const getInitialSession = () => initPromise;