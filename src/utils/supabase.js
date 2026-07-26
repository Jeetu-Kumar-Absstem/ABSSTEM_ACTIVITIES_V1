// src/utils/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidUrl = (url) => {
  if (!url) return false;
  try {
    new URL(url);
    return !url.includes('Your Supabase URL');
  } catch (e) {
    return false;
  }
};

// Create a dummy client that won't crash the app if config is missing
const createDummyClient = () => {
  console.warn('Supabase is not configured. Using dummy client.');
  const noop = () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } });
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: noop,
      signOut: async () => ({ error: null }),
      signUp: noop,
      resetPasswordForEmail: noop,
      updateUser: noop,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            single: noop,
            then: (cb) => cb({ data: [], error: null })
          }),
          single: noop,
          then: (cb) => cb({ data: [], error: null })
        }),
        order: () => ({ then: (cb) => cb({ data: [], error: null }) }),
        then: (cb) => cb({ data: [], error: null })
      }),
      insert: () => ({ select: () => ({ single: noop }) }),
      update: () => ({ eq: () => noop() }),
      upsert: () => ({ select: () => ({ single: noop }) }),
      delete: () => ({ eq: () => noop() }),
    }),
    rpc: noop,
    storage: { from: () => ({ upload: noop, getPublicUrl: () => ({ data: { publicUrl: '' } }) }) }
  };
};

export const supabase = isValidUrl(supabaseUrl)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'pkce',
      },
    })
  : createDummyClient();
