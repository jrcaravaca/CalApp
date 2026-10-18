'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  LogOut,
  Check,
  AlertCircle,
  Cloud,
  Smartphone,
} from 'lucide-react';
import { supabase, isSupabaseConfigured, supabaseConfigurationIssue } from '@/lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthChange: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthChange,
}) => {
  const [mode, setMode] = useState<'signup' | 'login' | 'local'>('local');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [localName, setLocalName] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const checkUser = async () => {
        if (isSupabaseConfigured) {
          const { data } = await supabase.auth.getUser();
          if (data?.user) {
            setUser(data.user);
            return;
          }
        }
        const localUser = localStorage.getItem('fitfree_local_user');
        if (localUser) {
          try {
            const parsedUser = JSON.parse(localUser);
            if (parsedUser.is_local) setUser(parsedUser);
            else localStorage.removeItem('fitfree_local_user');
          } catch (_) {}
        }
      };
      checkUser();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSupabaseAuth = async (action: 'signup' | 'login') => {
    if (!email || !password) return;
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error de autenticación.');
      }

      if (data.session) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (sessionError) throw sessionError;
        setUser(data.user);
      } else if (action === 'signup') {
        setMessage({
          text: 'Cuenta creada. Revisa tu correo para confirmar y después inicia sesión.',
          type: 'success',
        });
        return;
      }

      setMessage({
        text: action === 'signup' ? '¡Cuenta creada con éxito!' : '¡Sesión iniciada con éxito!',
        type: 'success',
      });

      onAuthChange();
      setTimeout(onClose, 1200);
    } catch (err: any) {
      const msg: string = err.message || '';
      // Supabase free plan: 2 emails/hour rate limit
      const isRateLimit = msg.toLowerCase().includes('rate') ||
        msg.toLowerCase().includes('over_email_send_rate_limit') ||
        msg.includes('429');

      if (isRateLimit) {
        setMessage({
          text: '⚠️ Límite de correos alcanzado (plan gratuito de Supabase). Opciones: (1) Usa el botón "Perfil Rápido" sin email, (2) Usa "Entrar como Invitado", o (3) En tu dashboard de Supabase desactiva "Confirm email" en Authentication → Providers → Email.',
          type: 'warning',
        });
      } else {
        setMessage({
          text: `${msg} Prueba el acceso rápido sin email.`,
          type: 'warning',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantLocalAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const name = localName.trim() || email.trim() || 'Atleta FitFree';
    const localAccount = {
      id: `local_${Date.now()}`,
      email: name,
      user_metadata: { name },
      is_local: true,
    };

    localStorage.setItem('fitfree_local_user', JSON.stringify(localAccount));
    setUser(localAccount);
    setMessage({
      text: `¡Bienvenido ${name}! Tu perfil local ha sido activado con guardado automático.`,
      type: 'success',
    });
    onAuthChange();
    setTimeout(onClose, 1200);
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    localStorage.removeItem('fitfree_local_user');
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (_) {}
    }
    setUser(null);
    setIsLoading(false);
    setMessage({ text: 'Sesión cerrada.', type: 'success' });
    onAuthChange();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-[#23342b]/35 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#fffefa] border border-emerald-950/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-[0_24px_80px_rgba(30,50,36,0.22)] flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-emerald-950/5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#2d3d31]">Tu espacio FitFree</h2>
              <p className="text-[11px] text-[#7b887c]">Tu alimentación, a tu ritmo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 rounded-full text-[#839084] hover:text-[#35453a] hover:bg-emerald-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {user ? (
            /* Logged in state */
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <Check className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs text-[#7b887c]">{user.is_local ? 'Diario en este dispositivo' : 'Sincronización activada'}</p>
                <p className="text-base font-extrabold text-[#2d3d31] mt-0.5">{user.user_metadata?.name || user.email}</p>
                <p className="text-xs text-[#7b887c] mt-1">
                  {user.is_local ? 'Tus datos se guardan en este navegador.' : 'Tu diario estará disponible al iniciar sesión en otro dispositivo.'}
                </p>
              </div>

              {user.is_local && (
                <button
                  onClick={() => {
                    setUser(null);
                    setMode('login');
                    setMessage(null);
                  }}
                  className="w-full py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold flex items-center justify-center gap-2 transition"
                >
                  <Cloud className="w-4 h-4" />
                  Sincronizar con una cuenta
                </button>
              )}

              {user.is_local ? (
                <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#6f7d71] hover:bg-emerald-50 transition">
                  Volver a mi diario
                </button>
              ) : (
              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-emerald-950/10 text-sm font-semibold text-[#647166] flex items-center justify-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar Sesión</span>
              </button>
              )}
            </div>
          ) : (
            /* Form states */
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#f1f5ed] rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setMode('local');
                    setMessage(null);
                  }}
                  className={`py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
                    mode === 'local' ? 'bg-white text-emerald-800 shadow-sm' : 'text-[#778479]'
                  }`}
                >
                  <Smartphone className="w-4 h-4" /> En este dispositivo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setMessage(null);
                  }}
                  className={`py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
                    mode !== 'local' ? 'bg-white text-emerald-800 shadow-sm' : 'text-[#778479]'
                  }`}
                >
                  <Cloud className="w-4 h-4" /> Sincronizar
                </button>
              </div>

              {mode === 'local' ? (
                <form onSubmit={handleInstantLocalAccount} className="space-y-4">
                  <div className="pt-2 pb-1 text-center">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-[22px] bg-gradient-to-br from-lime-100 to-emerald-100 text-emerald-800 flex items-center justify-center">
                      <Smartphone className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-extrabold text-[#2d3d31]">Empieza por lo sencillo</h3>
                    <p className="text-sm text-[#748176] mt-1">Sin contraseña y sin crear una cuenta.</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#f4f7ef] border border-emerald-950/5 text-xs text-[#647166]">
                    <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Guardado privado en este dispositivo
                    </p>
                    <p className="text-[11px] mt-1 leading-relaxed">
                      Para usar el mismo diario en otro dispositivo, podrás conectar una cuenta después. En Safari, evita borrar los datos del sitio.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#526156] block mb-1.5">
                      ¿Cómo te llamamos? <span className="font-normal text-[#8c978d]">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Tu nombre o apodo"
                      value={localName}
                      onChange={(e) => setLocalName(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-emerald-950/10 rounded-xl text-sm text-[#35453a] placeholder:text-[#a2aba2] focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/10 transition"
                  >
                    <span>Entrar a mi diario</span>
                  </button>
                </form>
              ) : (
                !isSupabaseConfigured ? (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-950">
                    <p className="font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" />Sincronización no configurada</p>
                    <p className="text-xs leading-relaxed mt-2">{supabaseConfigurationIssue}</p>
                    <p className="text-xs leading-relaxed mt-2">En tu archivo de entorno, configura NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY con la clave pública del proyecto y reinicia la app. No uses una clave secreta ni service_role en el navegador.</p>
                  </div>
                ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSupabaseAuth(mode);
                  }}
                  className="space-y-3.5 pt-2"
                >
                  <div className="pb-1">
                    <h3 className="text-lg font-extrabold text-[#2d3d31]">Sincroniza tu diario</h3>
                    <p className="text-xs text-[#748176] mt-1">Entra desde Safari, Chrome o cualquier dispositivo.</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setMode('login')} className={`flex-1 py-2 rounded-xl text-xs font-bold ${mode === 'login' ? 'bg-emerald-100 text-emerald-900' : 'text-[#788579]'}`}>Ya tengo cuenta</button>
                    <button type="button" onClick={() => setMode('signup')} className={`flex-1 py-2 rounded-xl text-xs font-bold ${mode === 'signup' ? 'bg-emerald-100 text-emerald-900' : 'text-[#788579]'}`}>Crear cuenta</button>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#526156] block mb-1.5">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-3 bg-white border border-emerald-950/10 rounded-xl text-sm text-[#35453a] placeholder:text-[#a2aba2] focus:outline-none focus:border-emerald-500"
                      />
                      <Mail className="w-4 h-4 text-[#89958a] absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#526156] block mb-1.5">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        minLength={6}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-3 py-3 bg-white border border-emerald-950/10 rounded-xl text-sm text-[#35453a] placeholder:text-[#a2aba2] focus:outline-none focus:border-emerald-500"
                      />
                      <Lock className="w-4 h-4 text-[#89958a] absolute left-3 top-3" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/10 transition"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    ) : (
                      <span>{mode === 'signup' ? 'Crear Cuenta' : 'Iniciar Sesión'}</span>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setMode('local')}
                      className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold underline"
                    >
                      Seguir sin cuenta en este dispositivo
                    </button>
                  </div>
                </form>
                )
              )}
            </div>
          )}

          {message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : message.type === 'warning'
                  ? 'bg-amber-50 border border-amber-200 text-amber-900'
                  : 'bg-rose-50 border border-rose-200 text-rose-900'
              }`}
            >
              {message.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{message.text}</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
