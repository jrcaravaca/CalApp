import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isSafePublicSupabaseKey } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!cleanUrl || !isSafePublicSupabaseKey(publicKey)) return null;
  return createClient(cleanUrl, publicKey);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, password } = body;

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase requiere una clave publishable o anon pública. No configures una clave secret/service_role.' },
        { status: 503 }
      );
    }

    if (action === 'signup') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        // Handle common Supabase rate limit / validation errors
        let friendlyMessage = error.message;
        if (error.message.includes('rate limit')) {
          friendlyMessage = 'Límite de envíos de correo de Supabase excedido temporalmente. Puedes usar el Modo Local / Invitado mientras tanto.';
        } else if (error.message.includes('invalid')) {
          friendlyMessage = 'Formato de correo electrónico no válido.';
        }
        return NextResponse.json({ error: friendlyMessage, code: error.code }, { status: 400 });
      }

      return NextResponse.json({
        user: data.user,
        session: data.session,
        message: data.session ? 'Sesión iniciada' : 'Cuenta creada. Revisa tu correo.',
      });
    }

    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        user: data.user,
        session: data.session,
        message: 'Sesión iniciada con éxito',
      });
    }

    if (action === 'guest') {
      // Instant local/guest user generation
      const guestId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      return NextResponse.json({
        user: {
          id: guestId,
          email: email || 'usuario@fitfree.local',
          is_guest: true,
        },
        message: 'Sesión local activada',
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err: any) {
    console.error('Auth API error:', err);
    return NextResponse.json(
      { error: err.message || 'Error en el servidor de autenticación' },
      { status: 500 }
    );
  }
}
