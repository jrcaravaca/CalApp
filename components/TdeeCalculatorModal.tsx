'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Target,
  Calculator,
  Flame,
  Dumbbell,
  Wheat,
  Droplets,
  Check,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { Profile } from '@/lib/types';
import { calculateTDEE, TDEEInputs } from '@/lib/tdee';

interface TdeeCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: Profile;
  onSaveProfile: (updatedProfile: Profile) => void;
}

export const TdeeCalculatorModal: React.FC<TdeeCalculatorModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
}) => {
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState<number>(26);
  const [weightKg, setWeightKg] = useState<number>(currentProfile.weight_kg || 75);
  const [heightCm, setHeightCm] = useState<number>(currentProfile.height_cm || 178);
  const [activityLevel, setActivityLevel] = useState<
    'sedentary' | 'light' | 'moderate' | 'heavy' | 'athlete'
  >(currentProfile.activity_level || 'moderate');
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain'>(
    currentProfile.goal || 'maintain'
  );
  const [macroPreset, setMacroPreset] = useState<'high_protein' | 'balanced' | 'low_carb'>(
    'high_protein'
  );

  // Custom manual override option
  const [customCalories, setCustomCalories] = useState<number>(currentProfile.daily_calories || 2000);
  const [customProtein, setCustomProtein] = useState<number>(currentProfile.protein_g || 150);
  const [customCarbs, setCustomCarbs] = useState<number>(currentProfile.carbs_g || 200);
  const [customFat, setCustomFat] = useState<number>(currentProfile.fat_g || 65);
  const [useCustomOverride, setUseCustomOverride] = useState<boolean>(false);

  // Live calculation
  const tdeeInputs: TDEEInputs = {
    gender,
    age,
    weight_kg: weightKg,
    height_cm: heightCm,
    activity_level: activityLevel,
    goal,
    macro_preset: macroPreset,
  };

  const calcResult = calculateTDEE(tdeeInputs);

  useEffect(() => {
    if (!useCustomOverride) {
      setCustomCalories(calcResult.target_calories);
      setCustomProtein(calcResult.protein_g);
      setCustomCarbs(calcResult.carbs_g);
      setCustomFat(calcResult.fat_g);
    }
  }, [gender, age, weightKg, heightCm, activityLevel, goal, macroPreset, useCustomOverride]);

  if (!isOpen) return null;

  const handleSave = () => {
    const updated: Profile = {
      ...currentProfile,
      daily_calories: customCalories,
      protein_g: customProtein,
      carbs_g: customCarbs,
      fat_g: customFat,
      weight_kg: weightKg,
      height_cm: heightCm,
      activity_level: activityLevel,
      goal,
    };
    onSaveProfile(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel bg-[#0B0F19] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Calculadora TDEE & Metas</h2>
              <p className="text-[11px] text-slate-400">Ecuación Mifflin-St Jeor & Distribución de Macros</p>
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
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Gender */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Género Biológico:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition ${
                  gender === 'male'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                Hombre
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition ${
                  gender === 'female'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                Mujer
              </button>
            </div>
          </div>

          {/* Biometrics (Age, Weight, Height) */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Edad</label>
              <div className="relative">
                <input
                  type="number"
                  min="14"
                  max="100"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-2 top-2 text-[10px] text-slate-500">años</span>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Peso</label>
              <div className="relative">
                <input
                  type="number"
                  min="30"
                  max="250"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-2 top-2 text-[10px] text-slate-500">kg</span>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Altura</label>
              <div className="relative">
                <input
                  type="number"
                  min="100"
                  max="230"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-2 top-2 text-[10px] text-slate-500">cm</span>
              </div>
            </div>
          </div>

          {/* Activity Level */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Nivel de Actividad:</label>
            <div className="space-y-1.5">
              {[
                { id: 'sedentary', label: 'Sedentario', desc: 'Trabajo de oficina, poco o ningún ejercicio' },
                { id: 'light', label: 'Ligero', desc: 'Ejercicio suave 1-3 días a la semana' },
                { id: 'moderate', label: 'Moderado (Recomendado)', desc: 'Entrenamiento 3-5 días/sem' },
                { id: 'heavy', label: 'Intenso', desc: 'Entrenamiento duro 6-7 días/sem' },
                { id: 'athlete', label: 'Atleta', desc: 'Doble sesión o trabajo físico muy pesado' },
              ].map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => setActivityLevel(act.id as any)}
                  className={`w-full p-2 rounded-xl border text-left flex items-center justify-between transition ${
                    activityLevel === act.id
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900/40 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-white">{act.label}</p>
                    <p className="text-[10px] text-slate-400">{act.desc}</p>
                  </div>
                  {activityLevel === act.id && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Objetivo:</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setGoal('lose')}
                className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                  goal === 'lose'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <TrendingDown className="w-4 h-4 mb-0.5 text-rose-400" />
                <span className="text-xs">Perder Grasa</span>
                <span className="text-[9px] text-slate-400">-20% Kcal</span>
              </button>

              <button
                type="button"
                onClick={() => setGoal('maintain')}
                className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                  goal === 'maintain'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Minus className="w-4 h-4 mb-0.5 text-emerald-400" />
                <span className="text-xs">Mantenimiento</span>
                <span className="text-[9px] text-slate-400">TDEE Exacto</span>
              </button>

              <button
                type="button"
                onClick={() => setGoal('gain')}
                className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                  goal === 'gain'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4 mb-0.5 text-sky-400" />
                <span className="text-xs">Volumen Limpio</span>
                <span className="text-[9px] text-slate-400">+15% Kcal</span>
              </button>
            </div>
          </div>

          {/* Macro Split Preset */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Distribución de Macros:</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setMacroPreset('high_protein')}
                className={`py-1.5 px-2 text-xs font-semibold rounded-xl border text-center transition ${
                  macroPreset === 'high_protein'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                Alta Proteína
              </button>
              <button
                type="button"
                onClick={() => setMacroPreset('balanced')}
                className={`py-1.5 px-2 text-xs font-semibold rounded-xl border text-center transition ${
                  macroPreset === 'balanced'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                Balanceada
              </button>
              <button
                type="button"
                onClick={() => setMacroPreset('low_carb')}
                className={`py-1.5 px-2 text-xs font-semibold rounded-xl border text-center transition ${
                  macroPreset === 'low_carb'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                Low Carb
              </button>
            </div>
          </div>

          {/* Computed Results Card */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Tu Meta Calculada
                </p>
                <p className="text-xl font-extrabold text-white">{customCalories} kcal / día</p>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                <p>BMR: <span className="text-slate-200 font-semibold">{calcResult.bmr} kcal</span></p>
                <p>TDEE: <span className="text-slate-200 font-semibold">{calcResult.tdee} kcal</span></p>
              </div>
            </div>

            {/* Macro Grams Preview & Custom Inputs */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5">
              <div className="p-2 rounded-xl bg-slate-800/60 border border-white/5 text-center">
                <p className="text-[10px] text-rose-400 font-bold">Proteína</p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <input
                    type="number"
                    value={customProtein}
                    onChange={(e) => {
                      setUseCustomOverride(true);
                      setCustomProtein(Number(e.target.value));
                    }}
                    className="w-12 text-center bg-transparent text-sm font-bold text-white focus:outline-none border-b border-rose-500/40"
                  />
                  <span className="text-xs text-slate-400">g</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-800/60 border border-white/5 text-center">
                <p className="text-[10px] text-sky-400 font-bold">Carbos</p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <input
                    type="number"
                    value={customCarbs}
                    onChange={(e) => {
                      setUseCustomOverride(true);
                      setCustomCarbs(Number(e.target.value));
                    }}
                    className="w-12 text-center bg-transparent text-sm font-bold text-white focus:outline-none border-b border-sky-500/40"
                  />
                  <span className="text-xs text-slate-400">g</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-800/60 border border-white/5 text-center">
                <p className="text-[10px] text-amber-400 font-bold">Grasas</p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <input
                    type="number"
                    value={customFat}
                    onChange={(e) => {
                      setUseCustomOverride(true);
                      setCustomFat(Number(e.target.value));
                    }}
                    className="w-12 text-center bg-transparent text-sm font-bold text-white focus:outline-none border-b border-amber-500/40"
                  />
                  <span className="text-xs text-slate-400">g</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:opacity-95 transition"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Metas en mi Perfil</span>
          </button>
        </div>
      </div>
    </div>
  );
};
