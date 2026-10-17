'use client';

import React from 'react';
import {
  Flame,
  Dumbbell,
  Wheat,
  Droplets,
  Sparkles,
  TrendingUp,
  Edit3,
  ClipboardList,
} from 'lucide-react';
import { Profile, DailyLog } from '@/lib/types';

interface MacroSummaryCardProps {
  profile: Profile;
  logs: DailyLog[];
  onOpenTDEE: (initialTab?: 'trainer' | 'calculator') => void;
}

export const MacroSummaryCard: React.FC<MacroSummaryCardProps> = ({
  profile,
  logs,
  onOpenTDEE,
}) => {
  // Aggregate daily consumed macros
  let consumedCalories = 0;
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;

  logs.forEach((log) => {
    if (log.food_item) {
      const g = log.serving_grams || 100;
      consumedCalories += (log.food_item.calories_100g * g) / 100;
      consumedProtein += (log.food_item.protein_100g * g) / 100;
      consumedCarbs += (log.food_item.carbs_100g * g) / 100;
      consumedFat += (log.food_item.fat_100g * g) / 100;
    }
  });

  consumedCalories = Math.round(consumedCalories);
  consumedProtein = Math.round(consumedProtein);
  consumedCarbs = Math.round(consumedCarbs);
  consumedFat = Math.round(consumedFat);

  const targetCalories = profile.daily_calories || 2200;
  const targetProtein = profile.protein_g || 165;
  const targetCarbs = profile.carbs_g || 220;
  const targetFat = profile.fat_g || 70;

  const remainingCalories = Math.max(0, targetCalories - consumedCalories);
  const calPercent = Math.min(100, Math.round((consumedCalories / targetCalories) * 100));

  // Circular progress calculations
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (calPercent / 100) * circumference;

  const proteinLeft = Math.max(0, targetProtein - consumedProtein);
  const carbsLeft = Math.max(0, targetCarbs - consumedCarbs);
  const fatLeft = Math.max(0, targetFat - consumedFat);

  const pPercent = Math.min(100, Math.round((consumedProtein / targetProtein) * 100));
  const cPercent = Math.min(100, Math.round((consumedCarbs / targetCarbs) * 100));
  const fPercent = Math.min(100, Math.round((consumedFat / targetFat) * 100));

  return (
    <div className="glass-panel rounded-3xl p-5 border border-white/10 shadow-2xl relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Title & Quick Action Buttons */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Resumen de Nutrientes
          </h2>
        </div>

        {/* Buttons to edit goals */}
        <div className="flex items-center space-x-1.5">
          {/* Direct Coach Preset Button */}
          <button
            onClick={() => onOpenTDEE('trainer')}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm transition group"
            title="Ajustar las calorías y gramos pautados por tu entrenador"
          >
            <Dumbbell className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition" />
            <span>Pauta de Entrenador</span>
          </button>

          {/* Calculator */}
          <button
            onClick={() => onOpenTDEE('calculator')}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition"
            title="Calcular TDEE con fórmula Mifflin-St Jeor"
          >
            <span>TDEE</span>
          </button>
        </div>
      </div>

      {/* Calorie Ring & Breakdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
        {/* Fitia-Style Calorie Ring (Clickable to edit) */}
        <div
          onClick={() => onOpenTDEE('trainer')}
          className="sm:col-span-5 flex flex-col items-center justify-center cursor-pointer group"
          title="Haz clic para modificar tus calorías diarias"
        >
          <div className="relative w-44 h-44 flex items-center justify-center group-hover:scale-102 transition">
            {/* SVG Progress Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              {/* Background track */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="text-slate-800"
                strokeWidth="12"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Dynamic Emerald Progress */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="text-emerald-500 transition-all duration-700 ease-out"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>

            {/* Inner Ring Text */}
            <div className="absolute flex flex-col items-center text-center">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {remainingCalories}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                Kcal Restantes
              </span>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                <span>{consumedCalories}</span>
                <span>/</span>
                <span className="font-bold text-slate-200">{targetCalories} kcal</span>
                <Edit3 className="w-2.5 h-2.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition" />
              </div>
            </div>
          </div>

          <div className="mt-2 text-center">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5 group-hover:border-emerald-500/30 transition">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              {calPercent}% de tu meta diaria
            </span>
          </div>
        </div>

        {/* 3 Macro Cards (Clickable to edit trainer targets) */}
        <div className="sm:col-span-7 flex flex-col space-y-3.5">
          {/* Proteínas */}
          <div
            onClick={() => onOpenTDEE('trainer')}
            className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 hover:border-rose-500/40 cursor-pointer transition group"
            title="Haz clic para modificar la proteína pautada"
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Dumbbell className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-slate-200">Proteína</span>
                  <span className="text-[10px] text-slate-400 ml-1.5 font-medium">
                    {proteinLeft}g restantes
                  </span>
                </div>
              </div>
              <div className="text-right flex items-center gap-1">
                <span className="font-extrabold text-rose-400">{consumedProtein}</span>
                <span className="text-slate-400 text-[11px] font-bold"> / {targetProtein}g</span>
                <Edit3 className="w-3 h-3 text-rose-400 opacity-0 group-hover:opacity-100 transition ml-0.5" />
              </div>
            </div>
            {/* Progress track */}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-rose-500 h-2 rounded-full transition-all duration-500 shadow-sm shadow-rose-500/50"
                style={{ width: `${pPercent}%` }}
              />
            </div>
          </div>

          {/* Carbohidratos */}
          <div
            onClick={() => onOpenTDEE('trainer')}
            className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 hover:border-sky-500/40 cursor-pointer transition group"
            title="Haz clic para modificar los carbohidratos pautados"
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Wheat className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-slate-200">Carbohidratos</span>
                  <span className="text-[10px] text-slate-400 ml-1.5 font-medium">
                    {carbsLeft}g restantes
                  </span>
                </div>
              </div>
              <div className="text-right flex items-center gap-1">
                <span className="font-extrabold text-sky-400">{consumedCarbs}</span>
                <span className="text-slate-400 text-[11px] font-bold"> / {targetCarbs}g</span>
                <Edit3 className="w-3 h-3 text-sky-400 opacity-0 group-hover:opacity-100 transition ml-0.5" />
              </div>
            </div>
            {/* Progress track */}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-sky-400 h-2 rounded-full transition-all duration-500 shadow-sm shadow-sky-400/50"
                style={{ width: `${cPercent}%` }}
              />
            </div>
          </div>

          {/* Grasas */}
          <div
            onClick={() => onOpenTDEE('trainer')}
            className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 hover:border-amber-500/40 cursor-pointer transition group"
            title="Haz clic para modificar las grasas pautadas"
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Droplets className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-slate-200">Grasas</span>
                  <span className="text-[10px] text-slate-400 ml-1.5 font-medium">
                    {fatLeft}g restantes
                  </span>
                </div>
              </div>
              <div className="text-right flex items-center gap-1">
                <span className="font-extrabold text-amber-400">{consumedFat}</span>
                <span className="text-slate-400 text-[11px] font-bold"> / {targetFat}g</span>
                <Edit3 className="w-3 h-3 text-amber-400 opacity-0 group-hover:opacity-100 transition ml-0.5" />
              </div>
            </div>
            {/* Progress track */}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-400 h-2 rounded-full transition-all duration-500 shadow-sm shadow-amber-400/50"
                style={{ width: `${fPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
