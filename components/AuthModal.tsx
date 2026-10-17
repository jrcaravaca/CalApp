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
  ExternalLink,
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
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && isSupabaseConfigured) {
      supabase.auth.getUser().then(({ data }) => {
        setUser(data?.user || null);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setUser(data.user);
      setMessage({ text: '¡Sesión iniciada con éxito!', type: 'success' });
      onAuthChange();
      setTimeout(onClose, 1000);
    } catch (err: any) {
      setMessage({ text: err.message || 'Error al iniciar sesión.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        setUser(data.user);
        setMessage({ text: '¡Cuenta creada y sesión iniciada!', type: 'success' });
        onAuthChange();
        setTimeout(onClose, 1000);
      } else {
        setMessage({
          text: 'Cuenta registrada. Por favor revisa tu correo de confirmación.',
          type: 'success',
        });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error al registrarse.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setIsLoading(false);
    setMessage({ text: 'Sesión cerrada. Modo invitado activo.', type: 'success' });
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
      <div className="relative w-full max-w-md glass-panel bg-[#0B0F19] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Mi Cuenta & Supabase</h2>
              <p className="text-[11px] text-slate-400">Sincronización en la nube & RLS</p>
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
        <div className="p-5 space-y-4">
          {/* Supabase Status Pill */}
          <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isSupabaseConfigured ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <div>
                <p className="text-xs font-bold text-white">
                  {isSupabaseConfigured ? 'Supabase Conectado' : 'Modo Local / Demo'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {isSupabaseConfigured
                    ? 'RLS activo en profiles, food_items y daily_logs'
                    : 'Almacenamiento offline en navegador'}
                </p>
              </div>
            </div>
            <Database className="w-4 h-4 text-slate-500" />
          </div>

          {user ? (
            /* Logged in state */
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Sesión iniciada como:</p>
                <p className="text-sm font-extrabold text-white mt-0.5">{user.email}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">ID: {user.id}</p>
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
            /* Auth Form */
            <form onSubmit={mode === 'login' ? handleLogin : handleSignUp} className="space-y-3.5">
              <div className="flex p-1 bg-slate-900 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                    mode === 'login' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                    mode === 'signup' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Crear Cuenta
                </button>
              </div>

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
                <span>{mode === 'login' ? 'Entrar a FitFree' : 'Crear Mi Cuenta Gratis'}</span>
              </button>
            </form>
          )}

          {/* Guest Mode fallback note */}
          <div className="p-3 rounded-2xl bg-white/2 border border-white/5 space-y-1.5">
            <p className="text-[11px] font-bold text-slate-300">¿Quieres probar sin registrarte?</p>
            <p className="text-[10px] text-slate-400">
              FitFree funciona en Modo Invitado local. Todos tus alimentos, escaneos y macros se
              guardan instantáneamente en tu navegador.
            </p>
          </div>

          {/* Database Schema notice */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-mono">schema.sql listo</span>
            <button
              onClick={handleCopySqlInfo}
              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedSql ? 'Copiado' : 'Instrucciones SQL'}</span>
            </button>
          </div>

          {message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
              }`}
            >
              {message.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
