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
  Sparkles,
  ClipboardList,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { Profile } from '@/lib/types';
import { calculateTDEE, TDEEInputs } from '@/lib/tdee';

interface TdeeCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: Profile;
  onSaveProfile: (updatedProfile: Profile) => void;
  initialTab?: 'trainer' | 'calculator';
}

export const TdeeCalculatorModal: React.FC<TdeeCalculatorModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
  initialTab = 'trainer',
}) => {
  const [activeTab, setActiveTab] = useState<'trainer' | 'calculator'>(initialTab);

  // Manual Coach / Trainer Targets
  const [targetCalories, setTargetCalories] = useState<number>(currentProfile.daily_calories || 2200);
  const [targetProtein, setTargetProtein] = useState<number>(currentProfile.protein_g || 165);
  const [targetCarbs, setTargetCarbs] = useState<number>(currentProfile.carbs_g || 220);
  const [targetFat, setTargetFat] = useState<number>(currentProfile.fat_g || 70);
  const [coachNotes, setCoachNotes] = useState<string>('');

  // TDEE Calculator Fields
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

  useEffect(() => {
    if (isOpen) {
      setTargetCalories(currentProfile.daily_calories || 2200);
      setTargetProtein(currentProfile.protein_g || 165);
      setTargetCarbs(currentProfile.carbs_g || 220);
      setTargetFat(currentProfile.fat_g || 70);
      setWeightKg(currentProfile.weight_kg || 75);
      setHeightCm(currentProfile.height_cm || 178);
      setActiveTab(initialTab);
    }
  }, [isOpen, currentProfile, initialTab]);

  // Live calculation for TDEE tab
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

  // Calculate real calories from macros: P*4 + C*4 + F*9
  const macroCalculatedCalories = Math.round(
    targetProtein * 4 + targetCarbs * 4 + targetFat * 9
  );
  const calorieDiff = targetCalories - macroCalculatedCalories;

  // Percentage shares
  const totalMacroKcal = macroCalculatedCalories || 1;
  const pKcal = targetProtein * 4;
  const cKcal = targetCarbs * 4;
  const fKcal = targetFat * 9;
  const pPercent = Math.round((pKcal / totalMacroKcal) * 100);
  const cPercent = Math.round((cKcal / totalMacroKcal) * 100);
  const fPercent = Math.max(0, 100 - pPercent - cPercent);

  // g/kg bodyweight
  const gPerKg = weightKg > 0 ? (targetProtein / weightKg).toFixed(1) : null;

  if (!isOpen) return null;

  const handleSyncCaloriesWithMacros = () => {
    setTargetCalories(macroCalculatedCalories);
  };

  const handleApplyCalculatedToTrainer = () => {
    setTargetCalories(calcResult.target_calories);
    setTargetProtein(calcResult.protein_g);
    setTargetCarbs(calcResult.carbs_g);
    setTargetFat(calcResult.fat_g);
    setActiveTab('trainer');
  };

  const handleSave = () => {
    const updated: Profile = {
      ...currentProfile,
      daily_calories: Math.max(500, targetCalories),
      protein_g: Math.max(10, targetProtein),
      carbs_g: Math.max(10, targetCarbs),
      fat_g: Math.max(10, targetFat),
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-bold">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Metas & Pauta Nutricional</h2>
              <p className="text-[11px] text-slate-400">Personaliza calorías y macros a tu medida</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Pauta de Entrenador (Manual) vs Calculadora TDEE */}
        <div className="flex p-2 bg-slate-900/50 border-b border-white/5">
          <button
            onClick={() => setActiveTab('trainer')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'trainer'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Pauta de mi Entrenador (Manual)</span>
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'calculator'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Calculadora TDEE</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'trainer' ? (
            /* TAB 1: PAUTA DE ENTRENADOR (MANUAL) */
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Info banner */}
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-emerald-300">Modo Pauta Personalizada</p>
                  <p className="text-slate-300 text-[11px] mt-0.5">
                    Introduce los valores exactos que te ha pautado tu entrenador o nutricionista. FitFree usará estos números exactos en tu diario.
                  </p>
                </div>
              </div>

              {/* Calorías Objetivo Input */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-emerald-400" />
                    <span>Calorías Diarias Objetivo</span>
                  </label>
                  <span className="text-[11px] text-slate-400">kcal / día</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="500"
                    max="8000"
                    step="50"
                    value={targetCalories}
                    onChange={(e) => setTargetCalories(Number(e.target.value))}
                    className="flex-1 px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-lg font-extrabold text-white text-center focus:outline-none focus:border-emerald-500"
                  />
                  {/* Quick adjustments */}
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => setTargetCalories((c) => Math.max(500, c - 100))}
                      className="px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300"
                    >
                      -100
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetCalories((c) => c + 100)}
                      className="px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300"
                    >
                      +100
                    </button>
                  </div>
                </div>
              </div>

              {/* 3 Macro Cards (Protein, Carbs, Fat) */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Macronutrientes en Gramos:
                </label>

                {/* Proteína */}
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-rose-500/20 hover:border-rose-500/40 transition flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5 min-w-[110px]">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                      <Dumbbell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Proteína</p>
                      <p className="text-[10px] text-slate-400">{pKcal} kcal ({pPercent}%)</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setTargetProtein((p) => Math.max(10, p - 5))}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 flex items-center justify-center"
                    >
                      -
                    </button>
                    <div className="relative">
                      <input
                        type="number"
                        min="10"
                        max="500"
                        value={targetProtein}
                        onChange={(e) => setTargetProtein(Number(e.target.value))}
                        className="w-18 px-2 py-1.5 bg-slate-800 border border-white/10 rounded-xl text-center text-sm font-extrabold text-rose-400 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <span className="text-xs text-slate-400 font-bold">g</span>
                    <button
                      type="button"
                      onClick={() => setTargetProtein((p) => p + 5)}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Carbohidratos */}
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-sky-500/20 hover:border-sky-500/40 transition flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5 min-w-[110px]">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                      <Wheat className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Carbohidratos</p>
                      <p className="text-[10px] text-slate-400">{cKcal} kcal ({cPercent}%)</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setTargetCarbs((c) => Math.max(10, c - 10))}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 flex items-center justify-center"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      value={targetCarbs}
                      onChange={(e) => setTargetCarbs(Number(e.target.value))}
                      className="w-18 px-2 py-1.5 bg-slate-800 border border-white/10 rounded-xl text-center text-sm font-extrabold text-sky-400 focus:outline-none focus:border-sky-500"
                    />
                    <span className="text-xs text-slate-400 font-bold">g</span>
                    <button
                      type="button"
                      onClick={() => setTargetCarbs((c) => c + 10)}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Grasas */}
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-amber-500/20 hover:border-amber-500/40 transition flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5 min-w-[110px]">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Grasas</p>
                      <p className="text-[10px] text-slate-400">{fKcal} kcal ({fPercent}%)</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setTargetFat((f) => Math.max(10, f - 5))}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 flex items-center justify-center"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      value={targetFat}
                      onChange={(e) => setTargetFat(Number(e.target.value))}
                      className="w-18 px-2 py-1.5 bg-slate-800 border border-white/10 rounded-xl text-center text-sm font-extrabold text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-xs text-slate-400 font-bold">g</span>
                    <button
                      type="button"
                      onClick={() => setTargetFat((f) => f + 5)}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Macro Distribution Segmented Bar */}
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>Distribución calórica:</span>
                  <div className="flex gap-2 text-[10px] font-bold">
                    <span className="text-rose-400">{pPercent}% P</span>
                    <span className="text-sky-400">{cPercent}% C</span>
                    <span className="text-amber-400">{fPercent}% G</span>
                  </div>
                </div>

                <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-800">
                  <div style={{ width: `${pPercent}%` }} className="bg-rose-500 transition-all duration-300" />
                  <div style={{ width: `${cPercent}%` }} className="bg-sky-400 transition-all duration-300" />
                  <div style={{ width: `${fPercent}%` }} className="bg-amber-400 transition-all duration-300" />
                </div>

                {/* Macro Sum vs Target comparison & Sync Button */}
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-slate-400">
                    Suma de macros: <b className="text-white">{macroCalculatedCalories} kcal</b>
                  </span>
                  {Math.abs(calorieDiff) > 10 && (
                    <button
                      type="button"
                      onClick={handleSyncCaloriesWithMacros}
                      className="text-emerald-400 hover:text-emerald-300 underline font-semibold flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Ajustar calorías ({macroCalculatedCalories})</span>
                    </button>
                  )}
                </div>

                {gPerKg && (
                  <p className="text-[10px] text-slate-400">
                    Relación de proteína: <b className="text-rose-300">{gPerKg} g/kg</b> (para {weightKg} kg de peso corporal)
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: CALCULADORA TDEE */
            <div className="space-y-4 animate-in fade-in duration-150">
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

              {/* Biometrics */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Edad</label>
                  <input
                    type="number"
                    min="14"
                    max="100"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    min="30"
                    max="250"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Altura (cm)</label>
                  <input
                    type="number"
                    min="100"
                    max="230"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Activity Level */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Nivel de Actividad:</label>
                <div className="space-y-1.5">
                  {[
                    { id: 'sedentary', label: 'Sedentario', desc: 'Poco o ningún ejercicio' },
                    { id: 'light', label: 'Ligero', desc: 'Ejercicio suave 1-3 días/sem' },
                    { id: 'moderate', label: 'Moderado', desc: 'Entrenamiento 3-5 días/sem' },
                    { id: 'heavy', label: 'Intenso', desc: 'Entrenamiento duro 6-7 días/sem' },
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
                      {activityLevel === act.id && <Check className="w-4 h-4 text-emerald-400" />}
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
                    className={`p-2 rounded-xl border text-center transition ${
                      goal === 'lose'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-white/5 border-white/5 text-slate-400'
                    }`}
                  >
                    <span className="text-xs block">Definición</span>
                    <span className="text-[9px] text-slate-400">-20%</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoal('maintain')}
                    className={`p-2 rounded-xl border text-center transition ${
                      goal === 'maintain'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-white/5 border-white/5 text-slate-400'
                    }`}
                  >
                    <span className="text-xs block">Mantenimiento</span>
                    <span className="text-[9px] text-slate-400">TDEE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoal('gain')}
                    className={`p-2 rounded-xl border text-center transition ${
                      goal === 'gain'
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                        : 'bg-white/5 border-white/5 text-slate-400'
                    }`}
                  >
                    <span className="text-xs block">Volumen</span>
                    <span className="text-[9px] text-slate-400">+15%</span>
                  </button>
                </div>
              </div>

              {/* Calculation Preview card */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-slate-200">Resultado Calculado:</p>
                  <p className="text-base font-extrabold text-emerald-400">
                    {calcResult.target_calories} kcal
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="p-1.5 rounded-lg bg-slate-800">
                    <span className="text-rose-400 font-bold">{calcResult.protein_g}g</span> P
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-800">
                    <span className="text-sky-400 font-bold">{calcResult.carbs_g}g</span> C
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-800">
                    <span className="text-amber-400 font-bold">{calcResult.fat_g}g</span> G
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyCalculatedToTrainer}
                  className="w-full mt-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition"
                >
                  <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cargar estos valores en Pauta de Entrenador</span>
                </button>
              </div>
            </div>
          )}

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
