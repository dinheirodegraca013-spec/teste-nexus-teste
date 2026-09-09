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
    '[NEXUS] Atenção: As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão configuradas no build deste ambiente. Defina essas variáveis no painel da Vercel (Settings > Environment Variables) e faça um redeploy.'
  );
}

// Fallback safe URL only for valid client creation when variables are empty, preventing invalid domain resolution
const effectiveUrl = isSupabaseConfigured ? supabaseUrl : 'https://supabase-not-configured.local';
const effectiveKey = isSupabaseConfigured ? supabaseAnonKey : 'not-configured-key';

// Supabase client instance with persistent session and auto token refresh (Singleton)
export const supabase: SupabaseClient = createClient(
  effectiveUrl,
  effectiveKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);
