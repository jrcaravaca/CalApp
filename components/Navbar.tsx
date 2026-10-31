'use client';

import React from 'react';
import {
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
  onOpenAuth,
  isAuthenticated,
  userEmail,
}) => {
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
    <header className="sticky top-0 z-30 w-full border-b border-emerald-950/5 bg-white/90 backdrop-blur-md px-4 py-3 shadow-[0_4px_20px_rgba(48,76,50,0.05)]">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 cursor-pointer min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-br from-emerald-600 to-lime-400 flex items-center justify-center shadow-md shadow-emerald-800/15 shrink-0">
            <Flame className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#26352d]">FitFree</span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> PRO
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-[#718075] font-medium">Tu diario de alimentación</p>
          </div>
        </div>

        <div className="flex items-center space-x-0.5 sm:space-x-1 bg-[#f4f7ef] border border-emerald-950/10 rounded-full px-1.5 sm:px-2 py-1 shrink-0">
          <button
            onClick={handlePrevDay}
            aria-label="Día anterior"
            className="p-1 rounded-full text-[#768578] hover:text-emerald-800 hover:bg-emerald-100 transition shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-1.5 sm:px-2 text-xs font-semibold text-[#35453a] min-w-[48px] sm:min-w-[70px] text-center">
            {formatDisplayDate(currentDate)}
          </span>
          <button
            onClick={handleNextDay}
            aria-label="Día siguiente"
            className="p-1 rounded-full text-[#768578] hover:text-emerald-800 hover:bg-emerald-100 transition shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={onOpenAuth}
          aria-label={isAuthenticated ? 'Mi cuenta' : 'Mi espacio'}
          className="flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-emerald-50 border border-emerald-950/10 text-[#405044] transition shrink-0"
        >
          <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span className="hidden sm:inline max-w-[100px] truncate">
            {isAuthenticated ? userEmail?.split('@')[0] || 'Cuenta' : 'Mi espacio'}
          </span>
        </button>
      </div>
    </header>
  );
};
