// src/utils/supabase.js
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: log during build to catch missing env vars early
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing env vars — VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found at build time.');
}

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
  console.warn('[Supabase] Using dummy client — real Supabase calls will not work.');
  const noop = () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } });
  const noopChain = () => ({
    data: null,
    error: { message: 'Supabase not configured' },
  });

  // A fully chainable query builder that always resolves to empty/noop
  const makeChain = () => {
    const chain = {
      select: () => makeChain(),
      eq: () => makeChain(),
      neq: () => makeChain(),
      gt: () => makeChain(),
      lt: () => makeChain(),
      gte: () => makeChain(),
      lte: () => makeChain(),
      like: () => makeChain(),
      ilike: () => makeChain(),
      in: () => makeChain(),
      is: () => makeChain(),
      not: () => makeChain(),
      or: () => makeChain(),
      and: () => makeChain(),
      filter: () => makeChain(),
      match: () => makeChain(),
      order: () => makeChain(),
      limit: () => makeChain(),
      range: () => makeChain(),
      single: noop,
      maybeSingle: noop,
      insert: () => makeChain(),
      update: () => makeChain(),
      upsert: () => makeChain(),
      delete: () => makeChain(),
      then: (cb) => Promise.resolve(cb({ data: [], error: null })),
      catch: (cb) => Promise.resolve(cb(null)),
    };
    return chain;
  };

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
    from: () => makeChain(),
    rpc: noop,
    storage: {
      from: () => ({
        upload: noop,
        download: noop,
        remove: noop,
        list: noop,
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        createSignedUrl: noop,
      }),
    },
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
