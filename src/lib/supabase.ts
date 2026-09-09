import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Sanitize string helper (removes accidental wrapping quotes and whitespace)
function sanitize(val: unknown): string {
  if (typeof val !== 'string') return '';
  let str = val.trim();
  if (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    str = str.slice(1, -1).trim();
  }
  return str;
}

// Read exclusively from standard Vite environment variables
export const supabaseUrl = sanitize(import.meta.env.VITE_SUPABASE_URL);
export const supabaseAnonKey = sanitize(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  /^https?:\/\//i.test(supabaseUrl) &&
  !supabaseUrl.includes('your-project.supabase.co') &&
  !supabaseUrl.includes('placeholder-nexus') &&
  !supabaseAnonKey.includes('your-anon-key')
);

if (!isSupabaseConfigured) {
  console.warn(
    '[NEXUS] Atenção: As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão configuradas no build deste ambiente. Defina essas variáveis no painel da Vercel (Settings > Environment Variables) e faça um redeploy sem cache.'
  );
}

// Supabase client instance with persistent session and auto token refresh (Singleton)
// No fallback to another project or fictional URL
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
  : (new Proxy(
      {},
      {
        get(_, prop) {
          if (prop === 'auth') {
            return {
              getSession: async () => ({ data: { session: null }, error: null }),
              getUser: async () => ({ data: { user: null }, error: null }),
              onAuthStateChange: () => ({
                data: {
                  subscription: {
                    unsubscribe: () => {},
                  },
                },
              }),
              signUp: async () => ({
                data: { user: null, session: null },
                error: new Error('O backend Supabase não está configurado neste ambiente.'),
              }),
              signInWithPassword: async () => ({
                data: { user: null, session: null },
                error: new Error('O backend Supabase não está configurado neste ambiente.'),
              }),
              signOut: async () => ({ error: null }),
              resetPasswordForEmail: async () => ({
                error: new Error('O backend Supabase não está configurado neste ambiente.'),
              }),
              updateUser: async () => ({
                data: { user: null },
                error: new Error('O backend Supabase não está configurado neste ambiente.'),
              }),
            };
          }
          if (prop === 'from') {
            return () => {
              const chain: any = {
                select: () => chain,
                insert: () => chain,
                update: () => chain,
                delete: () => chain,
                eq: () => chain,
                neq: () => chain,
                order: () => chain,
                single: async () => ({
                  data: null,
                  error: new Error('O backend Supabase não está configurado neste ambiente.'),
                }),
                maybeSingle: async () => ({ data: null, error: null }),
                then: (resolve: any) =>
                  resolve({
                    data: [],
                    error: new Error('O backend Supabase não está configurado neste ambiente.'),
                  }),
              };
              return chain;
            };
          }
          return () => {};
        },
      }
    ) as unknown as SupabaseClient);

