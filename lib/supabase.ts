import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Clean trailing /rest/v1/ or slashes if present
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabasePublicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

function decodeJwtPayload(token: string): any {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  try {
    const json = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}

export function isSafePublicSupabaseKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  if (key.startsWith('sb_secret_')) return false;
  if (key.startsWith('sb_publishable_')) return true;
  if (!key.startsWith('eyJ')) return false;

  const claims = decodeJwtPayload(key);
  return claims?.role === 'anon';
}

export const supabaseConfigurationIssue = !supabaseUrl
  ? 'Falta configurar la URL del proyecto Supabase.'
  : !supabasePublicKey
    ? 'Falta configurar la clave pública de Supabase (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY).'
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
