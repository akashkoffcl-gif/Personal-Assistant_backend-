import { createClient, SupabaseClient } from '@supabase/supabase-js';

let rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xeluxqrwaihtlbuuxdbv.supabase.co';
if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
  rawUrl = 'https://xeluxqrwaihtlbuuxdbv.supabase.co';
}

const supabaseUrl = rawUrl;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (typeof window === 'undefined') {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'assistant_auth_token',
      },
    });
  }

  return client;
}

export const supabase = getSupabase();
