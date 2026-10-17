'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Camera,
  Upload,
  Type,
  Check,
  AlertCircle,
  Edit2,
  Trash2,
  Bot,
  Lightbulb,
} from 'lucide-react';
import { AIParsedMealResponse, FoodItem, MealType, ParsedFoodItem } from '@/lib/types';

interface AIFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMealType?: MealType;
  onAddMultipleFoods: (
    mealType: MealType,
    items: { food: FoodItem; grams: number }[]
  ) => void;
}

export const AIFoodModal: React.FC<AIFoodModalProps> = ({
  isOpen,
  onClose,
  defaultMealType = 'lunch',
  onAddMultipleFoods,
}) => {
  const [mode, setMode] = useState<'text' | 'photo'>('text');
  const [textPrompt, setTextPrompt] = useState<string>('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealType>(defaultMealType);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AIParsedMealResponse | null>(null);
  const [editableItems, setEditableItems] = useState<ParsedFoodItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const SAMPLE_MEALS = [
    '3 huevos revueltos con 1 rebanada de pan integral y 10g mantequilla',
    'Bol de 60g de avena con 30g de proteína whey y medio plátano',
    '180g pechuga de pollo a la plancha con 200g arroz blanco y 10ml aceite de oliva',
    'Ensalada con 150g salmón al horno, medio aguacate y tomate cherry',
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async (customPrompt?: string) => {
    const promptToSend = customPrompt || textPrompt;
    if (mode === 'text' && !promptToSend.trim()) {
      setErrorMsg('Por favor escribe la descripción de tu comida.');
      return;
    }
    if (mode === 'photo' && !imageBase64) {
      setErrorMsg('Por favor sube o toma una foto de tu comida.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setAiResult(null);

    try {
      const response = await fetch('/app/api/parse-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: mode === 'text' ? promptToSend : undefined,
          image: mode === 'photo' ? imageBase64 : undefined,
          meal_type: selectedMeal,
        }),
      });

      // Next.js App Router route is at /api/parse-food
      const res = response.status === 404
        ? await fetch('/api/parse-food', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: mode === 'text' ? promptToSend : undefined,
              image: mode === 'photo' ? imageBase64 : undefined,
              meal_type: selectedMeal,
            }),
          })
        : response;

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al analizar la comida con Gemini.');
      }

      setAiResult(data);
      setEditableItems(data.items || []);
    } catch (err: any) {
      console.error('AI food error:', err);
      setErrorMsg(err.message || 'Error de conexión con el servicio de IA.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemGramsChange = (index: number, newGrams: number) => {
    const updated = [...editableItems];
    const item = updated[index];
    const g = Math.max(1, newGrams);
    item.serving_grams = g;
    item.total_calories = Math.round((item.calories_100g * g) / 100);
    item.total_protein = Math.round(((item.protein_100g * g) / 100) * 10) / 10;
    item.total_carbs = Math.round(((item.carbs_100g * g) / 100) * 10) / 10;
    item.total_fat = Math.round(((item.fat_100g * g) / 100) * 10) / 10;
    setEditableItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setEditableItems(editableItems.filter((_, i) => i !== index));
  };

  const handleConfirmAddAll = () => {
    if (editableItems.length === 0) return;

    const foodsToAdd = editableItems.map((item) => ({
      food: {
        id: `ai_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name: item.name,
        calories_100g: item.calories_100g,
        protein_100g: item.protein_100g,
        carbs_100g: item.carbs_100g,
        fat_100g: item.fat_100g,
        serving_size_g: item.serving_grams,
      } as FoodItem,
      grams: item.serving_grams,
    }));

    onAddMultipleFoods(selectedMeal, foodsToAdd);
    onClose();
    // Reset state
    setAiResult(null);
    setImageBase64(null);
    setTextPrompt('');
  };

  if (!isOpen) return null;

  // Compute live totals from editable items
  const currentTotalCalories = editableItems.reduce((acc, i) => acc + (i.total_calories || 0), 0);
  const currentTotalProtein = Math.round(
    editableItems.reduce((acc, i) => acc + (i.total_protein || 0), 0) * 10
  ) / 10;
  const currentTotalCarbs = Math.round(
    editableItems.reduce((acc, i) => acc + (i.total_carbs || 0), 0) * 10
  ) / 10;
  const currentTotalFat = Math.round(
    editableItems.reduce((acc, i) => acc + (i.total_fat || 0), 0) * 10
  ) / 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel bg-[#0B0F19] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>IA Meal Scanner</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Gemini 2.5 Flash
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Reconocimiento nutricional automático</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (only before parsing) */}
        {!aiResult && (
          <div className="flex p-2 bg-slate-900/50 border-b border-white/5">
            <button
              onClick={() => {
                setMode('text');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
                mode === 'text'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Describir con Texto</span>
            </button>
            <button
              onClick={() => {
                setMode('photo');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
                mode === 'photo'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Foto del Plato</span>
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 animate-pulse">
                  <Bot className="w-7 h-7" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-sm font-bold text-white">Gemini está analizando tu comida...</p>
              <p className="text-xs text-slate-400 text-center max-w-xs">
                Desglosando ingredientes, estimando gramos y calculando macronutrientes precisos.
              </p>
            </div>
          ) : aiResult ? (
            /* Analysis Results Screen */
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Plato Identificado
                  </span>
                  <span className="text-xs font-bold text-white">
                    {editableItems.length} ingredientes
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-white mt-0.5">
                  {aiResult.meal_name || 'Comida Analizada'}
                </h3>
                {aiResult.analysis_notes && (
                  <p className="text-xs text-slate-400 mt-1 italic">
                    💡 {aiResult.analysis_notes}
                  </p>
                )}
              </div>

              {/* Live Totals Banner */}
              <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <div>
                  <p className="text-[10px] font-bold text-slate-400">Calorías</p>
                  <p className="text-base font-extrabold text-white">{currentTotalCalories} kcal</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400">Proteína</p>
                  <p className="text-base font-extrabold text-rose-400">{currentTotalProtein}g</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400">Carbos</p>
                  <p className="text-base font-extrabold text-sky-400">{currentTotalCarbs}g</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400">Grasas</p>
                  <p className="text-base font-extrabold text-amber-400">{currentTotalFat}g</p>
                </div>
              </div>

              {/* Editable Ingredients Table */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-300">
                  Ingredientes reconocidos (ajusta los gramos si es necesario):
                </p>
                {editableItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-900/70 border border-white/5 flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{item.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        <span className="text-rose-400 font-semibold">{item.total_protein}g P</span>
                        <span>•</span>
                        <span className="text-sky-400 font-semibold">{item.total_carbs}g C</span>
                        <span>•</span>
                        <span className="text-amber-400 font-semibold">{item.total_fat}g F</span>
                        {item.notes && <span className="text-slate-500 hidden sm:inline">({item.notes})</span>}
                      </div>
                    </div>

                    {/* Grams input */}
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="number"
                        min="1"
                        max="2000"
                        value={item.serving_grams}
                        onChange={(e) => handleItemGramsChange(idx, Number(e.target.value))}
                        className="w-16 px-1.5 py-1 bg-slate-800 border border-white/10 rounded-lg text-xs font-bold text-white text-center focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-xs text-slate-400 font-medium">g</span>
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition"
                        title="Quitar ingrediente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Meal Type selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Guardar en comida:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => {
                    const labels: Record<MealType, string> = {
                      breakfast: 'Desayuno',
                      lunch: 'Almuerzo',
                      dinner: 'Cena',
                      snack: 'Snack',
                    };
                    return (
                      <button
                        key={m}
                        onClick={() => setSelectedMeal(m)}
                        className={`py-1.5 px-1 text-[11px] font-semibold rounded-xl border text-center transition ${
                          selectedMeal === m
                            ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                            : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                        }`}
                      >
                        {labels[m]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setAiResult(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition"
                >
                  Volver a intentar
                </button>
                <button
                  onClick={handleConfirmAddAll}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 hover:opacity-95 transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Añadir Todos a mi Diario</span>
                </button>
              </div>
            </div>
          ) : mode === 'text' ? (
            /* Text Mode Input */
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Escribe lo que comiste (en lenguaje natural):
                </label>
                <textarea
                  rows={4}
                  placeholder="Ej: 2 huevos fritos, 2 rebanadas de pan tostado con 10g de mantequilla y un vaso de zumo de naranja recién exprimido..."
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed resize-none"
                />
              </div>

              {/* Sample Quick Prompts */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  Ejemplos rápidos para probar:
                </p>
                <div className="space-y-1.5">
                  {SAMPLE_MEALS.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setTextPrompt(s);
                        handleAnalyze(s);
                      }}
                      className="w-full text-left p-2 rounded-xl bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-white/5 text-[11px] text-slate-300 transition flex items-center justify-between group"
                    >
                      <span className="truncate pr-2">{s}</span>
                      <Sparkles className="w-3 h-3 text-emerald-400 opacity-60 group-hover:opacity-100 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={() => handleAnalyze()}
                disabled={!textPrompt.trim()}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 disabled:opacity-50 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:opacity-95 transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>Analizar con Gemini AI</span>
              </button>
            </div>
          ) : (
            /* Photo Mode Upload */
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />

              {imageBase64 ? (
                <div className="relative rounded-2xl overflow-hidden border border-emerald-500/30 max-h-[260px] flex items-center justify-center bg-black">
                  <img
                    src={imageBase64}
                    alt="Foto de la comida"
                    className="w-full h-full object-cover max-h-[260px]"
                  />
                  <button
                    onClick={() => setImageBase64(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/10 hover:border-emerald-500/40 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-white">Toma una foto o sube una imagen</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Gemini identificará cada alimento y calculará las porciones
                  </p>
                </div>
              )}

              {/* Submit Photo Button */}
              <button
                onClick={() => handleAnalyze()}
                disabled={!imageBase64}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 disabled:opacity-50 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:opacity-95 transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>Analizar Foto del Plato</span>
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
