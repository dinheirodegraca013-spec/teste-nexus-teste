import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read exclusively from standard Vite environment variables
const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabaseUrl = envSupabaseUrl.trim();
export const supabaseAnonKey = envSupabaseAnonKey.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  !supabaseUrl.includes('your-project.supabase.co')
);

if (!isSupabaseConfigured) {
  console.warn(
    '[NEXUS] Atenção: As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão configuradas no ambiente. Para conectar com o Supabase real na Vercel ou desenvolvimento, defina essas variáveis no arquivo .env.'
  );
}

// Supabase client instance with persistent session and auto token refresh
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder-nexus.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);
