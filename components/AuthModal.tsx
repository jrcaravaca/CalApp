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
  Database,
  Copy,
  Sparkles,
  Zap,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
  const [mode, setMode] = useState<'signup' | 'login' | 'local'>('signup');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [localName, setLocalName] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      // Check existing local or Supabase user
      const localUser = localStorage.getItem('fitfree_local_user');
      if (localUser) {
        try {
          setUser(JSON.parse(localUser));
        } catch (_) {}
      } else if (isSupabaseConfigured) {
        supabase.auth.getUser().then(({ data }) => {
          if (data?.user) setUser(data.user);
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSupabaseAuth = async (action: 'signup' | 'login') => {
    if (!email || !password) return;
    setIsLoading(true);
    setMessage(null);

    try {
      // Use internal server-side proxy route to avoid browser adblockers and CORS issues
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al conectar con la autenticación.');
      }

      const activeUser = data.user || { email, id: `user_${Date.now()}` };
      localStorage.setItem('fitfree_local_user', JSON.stringify(activeUser));
      setUser(activeUser);

      setMessage({
        text: action === 'signup'
          ? (data.session ? '¡Cuenta creada con éxito!' : '¡Cuenta registrada! Sesión activa.')
          : '¡Sesión iniciada con éxito!',
        type: 'success',
      });

      onAuthChange();
      setTimeout(onClose, 1200);
    } catch (err: any) {
      console.warn('Auth attempt error:', err);
      // Helpful fallback message
      setMessage({
        text: `${err.message} Puedes usar el 'Modo Local' abajo para continuar sin restricciones.`,
        type: 'warning',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantLocalAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const name = localName.trim() || email.trim() || 'Atleta FitFree';
    const fakeEmail = name.includes('@') ? name : `${name.toLowerCase().replace(/\s+/g, '')}@fitfree.app`;

    const localAccount = {
      id: `local_${Date.now()}`,
      email: fakeEmail,
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

  const handleCopySqlInfo = () => {
    navigator.clipboard.writeText(
      'Para habilitar la base de datos completa de FitFree en Supabase, abre tu Dashboard de Supabase > SQL Editor y ejecuta el archivo supabase/schema.sql generado en tu proyecto.'
    );
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel bg-[#0B0F19] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Mi Cuenta & Acceso</h2>
              <p className="text-[11px] text-slate-400">Guarda tus macros y diario de comidas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {user ? (
            /* Logged in state */
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Sesión activa como:</p>
                <p className="text-sm font-extrabold text-white mt-0.5">{user.email}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">
                  {user.is_local ? 'Perfil Local Guardado' : 'Conectado con Supabase'}
                </p>
              </div>

              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 border border-white/10 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          ) : (
            /* Form states */
            <div className="space-y-3.5">
              {/* Tab Selector */}
              <div className="flex p-1 bg-slate-900 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setMessage(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    mode === 'signup' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  Crear Cuenta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setMessage(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    mode === 'login' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('local');
                    setMessage(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    mode === 'local' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  Perfil Rápido
                </button>
              </div>

              {mode === 'local' ? (
                /* Instant local profile without email wait */
                <form onSubmit={handleInstantLocalAccount} className="space-y-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-slate-300">
                    <p className="font-bold text-emerald-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" />
                      Acceso Inmediato Sin Esperas
                    </p>
                    <p className="text-[11px] mt-1 text-slate-300">
                      Crea tu perfil local al instante para empezar a registrar tu comida y pauta de macros sin esperas de confirmación de correo.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Tu Nombre o Alias
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. José Ramón"
                      value={localName}
                      onChange={(e) => setLocalName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 hover:opacity-95 transition"
                  >
                    <span>Empezar con este Perfil</span>
                  </button>
                </form>
              ) : (
                /* Supabase Cloud Auth Form */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSupabaseAuth(mode);
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 hover:opacity-95 transition"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                    ) : (
                      <span>{mode === 'signup' ? 'Crear Cuenta en Supabase' : 'Iniciar Sesión'}</span>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setMode('local')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline"
                    >
                      ¿Prefieres empezar sin registrar email? Activa Perfil Rápido
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  : message.type === 'warning'
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
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

          {/* Database Schema copy notice */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-mono">schema.sql listo para Supabase</span>
            <button
              onClick={handleCopySqlInfo}
              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedSql ? 'Copiado' : 'Instrucciones SQL'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
