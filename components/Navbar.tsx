'use client';

import React from 'react';
import {
  BookOpen,
  Camera,
  ScanBarcode,
  Scale,
  Target,
  ChevronLeft,
  ChevronRight,
  Flame,
  User,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  currentDate: string;
  onDateChange: (newDate: string) => void;
  onOpenScanner: () => void;
  onOpenAI: () => void;
  onOpenScaler: () => void;
  onOpenTDEE: () => void;
  onOpenAuth: () => void;
  activeTab: 'diary' | 'scanner' | 'ai' | 'scaler' | 'tdee';
  setActiveTab: (tab: 'diary' | 'scanner' | 'ai' | 'scaler' | 'tdee') => void;
  isAuthenticated: boolean;
  userEmail?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentDate,
  onDateChange,
  onOpenScanner,
  onOpenAI,
  onOpenScaler,
  onOpenTDEE,
  onOpenAuth,
  activeTab,
  setActiveTab,
  isAuthenticated,
  userEmail,
}) => {
  // Format human-friendly date string
  const formatDisplayDate = (dateStr: string) => {
    const today = new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);

    const isToday =
      today.getFullYear() === target.getFullYear() &&
      today.getMonth() === target.getMonth() &&
      today.getDate() === target.getDate();

    if (isToday) return 'Hoy';

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isYesterday =
      yesterday.getFullYear() === target.getFullYear() &&
      yesterday.getMonth() === target.getMonth() &&
      yesterday.getDate() === target.getDate();

    if (isYesterday) return 'Ayer';

    return target.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const handlePrevDay = () => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    const str = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(
      prev.getDate()
    ).padStart(2, '0')}`;
    onDateChange(str);
  };

  const handleNextDay = () => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    const str = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(
      next.getDate()
    ).padStart(2, '0')}`;
    onDateChange(str);
  };

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full glass-panel border-b border-white/5 bg-[#080C14]/90 backdrop-blur-md px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Logo & Fitia Clone branding */}
          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setActiveTab('diary')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Flame className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  FitFree
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Smart Macro & Food Tracker</p>
            </div>
          </div>

          {/* Date Selector */}
          <div className="flex items-center space-x-1 bg-slate-900/80 border border-white/10 rounded-full px-2 py-1 shadow-inner">
            <button
              onClick={handlePrevDay}
              aria-label="Día anterior"
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-semibold text-slate-200 min-w-[70px] text-center">
              {formatDisplayDate(currentDate)}
            </span>
            <button
              onClick={handleNextDay}
              aria-label="Día siguiente"
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* User Profile / Supabase Auth Button */}
          <button
            onClick={onOpenAuth}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition"
          >
            <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <User className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden sm:inline max-w-[100px] truncate">
              {isAuthenticated ? userEmail?.split('@')[0] || 'Cuenta' : 'Conectar'}
            </span>
          </button>
        </div>
      </header>

      {/* Bottom Navigation for Mobile / Tablet */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 glass-panel border-t border-white/5 bg-[#090D17]/95 backdrop-blur-xl px-2 py-2 safe-area-pb">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          {/* Diario */}
          <button
            onClick={() => setActiveTab('diary')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
              activeTab === 'diary'
                ? 'text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">Diario</span>
          </button>

          {/* Escáner Código de Barras */}
          <button
            onClick={() => {
              setActiveTab('scanner');
              onOpenScanner();
            }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
              activeTab === 'scanner'
                ? 'text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ScanBarcode className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">Escáner</span>
          </button>

          {/* AI Meal Parser (Highlighted Central Button) */}
          <button
            onClick={() => {
              setActiveTab('ai');
              onOpenAI();
            }}
            className="relative -top-3.5 group flex flex-col items-center"
          >
            <div className="w-13 h-13 p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-300 text-slate-950 font-bold shadow-lg shadow-emerald-500/30 group-hover:scale-105 group-active:scale-95 transition flex items-center justify-center">
              <Camera className="w-6 h-6 text-slate-950" />
            </div>
            <span className="text-[10px] font-bold text-emerald-400 mt-0.5 flex items-center gap-0.5">
              IA Scan
            </span>
          </button>

          {/* Escalador de Macros */}
          <button
            onClick={() => {
              setActiveTab('scaler');
              onOpenScaler();
            }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
              activeTab === 'scaler'
                ? 'text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">Escalador</span>
          </button>

          {/* Metas / TDEE */}
          <button
            onClick={() => {
              setActiveTab('tdee');
              onOpenTDEE();
            }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
              activeTab === 'tdee'
                ? 'text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">Metas</span>
          </button>
        </div>
      </nav>
    </>
  );
};
