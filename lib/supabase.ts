import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Clean trailing /rest/v1/ or slashes if present
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabasePublicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export function isSafePublicSupabaseKey(key: string): boolean {
  if (key.startsWith('sb_publishable_')) return true;
  if (!key.startsWith('eyJ')) return false;

  try {
    const claims = JSON.parse(atob(key.split('.')[1]));
    return claims.role === 'anon';
  } catch (_) {
    return false;
  }
}

export const supabaseConfigurationIssue = !supabaseUrl
  ? 'Falta configurar la URL del proyecto Supabase.'
  : !supabasePublicKey
    ? 'Falta configurar la clave pública de Supabase.'
    : !isSafePublicSupabaseKey(supabasePublicKey)
      ? 'La clave configurada no es pública. Usa la clave publishable o anon; nunca una secret o service_role.'
      : null;

export const isSupabaseConfigured = !supabaseConfigurationIssue;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabasePublicKey : 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
