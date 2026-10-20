import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
export const editorEmail = import.meta.env.VITE_EDITOR_EMAIL;

const scheduleDatabaseOptions = { schema: 'public' as const, retry: false };

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabasePublishableKey as string, {
      // Schedule mutations already implement optimistic-concurrency recovery.
      // Retrying RPC POSTs can amplify one conflict/outage into a request storm.
      db: scheduleDatabaseOptions,
    })
  : null;
