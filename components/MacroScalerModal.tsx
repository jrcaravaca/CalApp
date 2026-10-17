'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Scale,
  Sparkles,
  ArrowRight,
  Check,
  Flame,
  Dumbbell,
  Wheat,
  Droplets,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { DailyLog, MealType, Profile } from '@/lib/types';

interface MacroScalerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMealType?: MealType;
  logs: DailyLog[];
  profile: Profile;
  onUpdateServing: (logId: string, grams: number) => void;
}

export const MacroScalerModal: React.FC<MacroScalerModalProps> = ({
  isOpen,
  onClose,
  defaultMealType = 'lunch',
  logs,
  profile,
  onUpdateServing,
}) => {
  const [selectedMeal, setSelectedMeal] = useState<MealType>(defaultMealType);
  const [scaleMode, setScaleMode] = useState<'calories' | 'protein' | 'multiplier'>('calories');
  const [targetCalories, setTargetCalories] = useState<number>(600);
  const [targetProtein, setTargetProtein] = useState<number>(45);
  const [customMultiplier, setCustomMultiplier] = useState<number>(1.25);

  useEffect(() => {
    setSelectedMeal(defaultMealType);
  }, [defaultMealType]);

  const mealLogs = logs.filter((l) => l.meal_type === selectedMeal);

  // Compute current meal totals
  let currentCalories = 0;
  let currentProtein = 0;
  let currentCarbs = 0;
  let currentFat = 0;

  mealLogs.forEach((l) => {
    if (l.food_item) {
      const g = l.serving_grams || 100;
      currentCalories += (l.food_item.calories_100g * g) / 100;
      currentProtein += (l.food_item.protein_100g * g) / 100;
      currentCarbs += (l.food_item.carbs_100g * g) / 100;
      currentFat += (l.food_item.fat_100g * g) / 100;
    }
  });

  currentCalories = Math.round(currentCalories);
  currentProtein = Math.round(currentProtein * 10) / 10;
  currentCarbs = Math.round(currentCarbs * 10) / 10;
  currentFat = Math.round(currentFat * 10) / 10;

  // Initialize target default when meal changes
  useEffect(() => {
    if (currentCalories > 0) {
      setTargetCalories(Math.round(currentCalories * 1.2));
    }
    if (currentProtein > 0) {
      setTargetProtein(Math.round(currentProtein * 1.2));
    }
  }, [selectedMeal, currentCalories, currentProtein]);

  // Compute scaling factor S
  let scaleFactor = 1.0;
  if (scaleMode === 'calories') {
    scaleFactor = currentCalories > 0 ? targetCalories / currentCalories : 1.0;
  } else if (scaleMode === 'protein') {
    scaleFactor = currentProtein > 0 ? targetProtein / currentProtein : 1.0;
  } else {
    scaleFactor = customMultiplier;
  }

  // Prevent unrealistic or negative bounds
  scaleFactor = Math.max(0.1, Math.min(4.0, scaleFactor));

  // Compute scaled values
  const scaledCalories = Math.round(currentCalories * scaleFactor);
  const scaledProtein = Math.round(currentProtein * scaleFactor * 10) / 10;
  const scaledCarbs = Math.round(currentCarbs * scaleFactor * 10) / 10;
  const scaledFat = Math.round(currentFat * scaleFactor * 10) / 10;

  const handleApplyScaling = () => {
    mealLogs.forEach((l) => {
      const newGrams = Math.max(1, Math.round(l.serving_grams * scaleFactor));
      onUpdateServing(l.id, newGrams);
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel bg-[#0B0F19] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h2 className="text-base font-bold text-white">Escalador de Macros</h2>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Fitia PRO Free
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Ajusta las porciones proporcionalmente (S = Meta / Actual)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meal Selector */}
        <div className="p-3 bg-slate-900/60 border-b border-white/5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Selecciona la comida a escalar:
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => {
              const labels: Record<MealType, string> = {
                breakfast: 'Desayuno',
                lunch: 'Almuerzo',
                dinner: 'Cena',
                snack: 'Snacks',
              };
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMeal(m)}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-xl border text-center transition ${
                    selectedMeal === m
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold shadow'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                  }`}
                >
                  {labels[m]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {mealLogs.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 text-slate-500 flex items-center justify-center mx-auto">
                <Scale className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-300">
                No hay alimentos en esta comida todavía.
              </p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Añade primero los ingredientes de tu plato (por ejemplo: pollo, arroz y aceite) y
                luego usa el escalador para que FitFree ajuste las cantidades exactas para cumplir
                tus macros.
              </p>
            </div>
          ) : (
            <>
              {/* Scaling Mode Selector */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Modo de Escalado:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => setScaleMode('calories')}
                    className={`py-1.5 px-2 text-xs font-bold rounded-xl border text-center transition ${
                      scaleMode === 'calories'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                        : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                    }`}
                  >
                    Por Calorías
                  </button>
                  <button
                    onClick={() => setScaleMode('protein')}
                    className={`py-1.5 px-2 text-xs font-bold rounded-xl border text-center transition ${
                      scaleMode === 'protein'
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                    }`}
                  >
                    Por Proteína
                  </button>
                  <button
                    onClick={() => setScaleMode('multiplier')}
                    className={`py-1.5 px-2 text-xs font-bold rounded-xl border text-center transition ${
                      scaleMode === 'multiplier'
                        ? 'bg-sky-500 text-slate-950 border-sky-500'
                        : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                    }`}
                  >
                    Multiplicador
                  </button>
                </div>
              </div>

              {/* Target Input based on Mode */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
                {scaleMode === 'calories' && (
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                      <span className="text-slate-300">Meta calórica para esta comida:</span>
                      <span className="text-emerald-400 font-extrabold text-sm">{targetCalories} kcal</span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="1500"
                      step="25"
                      value={targetCalories}
                      onChange={(e) => setTargetCalories(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                      <span>200 kcal</span>
                      <span>Actual: {currentCalories} kcal</span>
                      <span>1500 kcal</span>
                    </div>
                  </div>
                )}

                {scaleMode === 'protein' && (
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                      <span className="text-slate-300">Meta de proteína para esta comida:</span>
                      <span className="text-rose-400 font-extrabold text-sm">{targetProtein}g</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="120"
                      step="1"
                      value={targetProtein}
                      onChange={(e) => setTargetProtein(Number(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                      <span>10g</span>
                      <span>Actual: {currentProtein}g</span>
                      <span>120g</span>
                    </div>
                  </div>
                )}

                {scaleMode === 'multiplier' && (
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                      <span className="text-slate-300">Factor de escala:</span>
                      <span className="text-sky-400 font-extrabold text-sm">
                        {customMultiplier.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.05"
                      value={customMultiplier}
                      onChange={(e) => setCustomMultiplier(Number(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                      <span>0.5x (Mitad)</span>
                      <span>1.0x (Igual)</span>
                      <span>2.5x</span>
                    </div>
                  </div>
                )}

                {/* Factor Badge */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Factor de escala (S):</span>
                  <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">
                    x{scaleFactor.toFixed(2)} ({scaleFactor > 1 ? `+${Math.round((scaleFactor - 1) * 100)}%` : `${Math.round((scaleFactor - 1) * 100)}%`})
                  </span>
                </div>
              </div>

              {/* Before vs After Macros Comparison */}
              <div className="grid grid-cols-2 gap-2">
                {/* Current */}
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Actual
                  </p>
                  <p className="text-lg font-extrabold text-slate-300">{currentCalories} kcal</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="text-rose-400">{currentProtein}g P</span>
                    <span>•</span>
                    <span className="text-sky-400">{currentCarbs}g C</span>
                    <span>•</span>
                    <span className="text-amber-400">{currentFat}g F</span>
                  </div>
                </div>

                {/* Scaled Result */}
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Escalado Pro</span>
                  </p>
                  <p className="text-lg font-extrabold text-white">{scaledCalories} kcal</p>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                    <span className="text-rose-400">{scaledProtein}g P</span>
                    <span>•</span>
                    <span className="text-sky-400">{scaledCarbs}g C</span>
                    <span>•</span>
                    <span className="text-amber-400">{scaledFat}g F</span>
                  </div>
                </div>
              </div>

              {/* Ingredient Breakdown Comparison Table */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-300">Nuevas porciones de ingredientes:</p>
                <div className="space-y-1.5">
                  {mealLogs.map((log) => {
                    const food = log.food_item;
                    if (!food) return null;
                    const oldGrams = log.serving_grams;
                    const newGrams = Math.max(1, Math.round(oldGrams * scaleFactor));
                    const newCals = Math.round((food.calories_100g * newGrams) / 100);

                    return (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-xs font-semibold text-slate-200 truncate">{food.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="line-through text-slate-500">{oldGrams}g</span>
                            <ArrowRight className="w-3 h-3 text-emerald-400" />
                            <span className="font-extrabold text-emerald-300">{newGrams}g</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-white">{newCals} kcal</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleApplyScaling}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:opacity-95 transition"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar Nuevas Porciones al Diario</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
