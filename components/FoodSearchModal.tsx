'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Plus,
  Check,
  Globe,
  Database,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { FoodItem, MealType } from '@/lib/types';
import { getFoodItems, saveFoodItemToStore } from '@/lib/storage';
import { searchOpenFoodFacts } from '@/lib/openfoodfacts';

interface FoodSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMealType?: MealType;
  onAddFood: (mealType: MealType, food: FoodItem, grams: number) => void;
}

export const FoodSearchModal: React.FC<FoodSearchModalProps> = ({
  isOpen,
  onClose,
  defaultMealType = 'lunch',
  onAddFood,
}) => {
  const [query, setQuery] = useState<string>('');
  const [localFoods, setLocalFoods] = useState<FoodItem[]>([]);
  const [onlineResults, setOnlineResults] = useState<FoodItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState<boolean>(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servingGrams, setServingGrams] = useState<number>(100);
  const [selectedMeal, setSelectedMeal] = useState<MealType>(defaultMealType);
  const [isCreatingCustom, setIsCreatingCustom] = useState<boolean>(false);

  // Custom food fields
  const [customName, setCustomName] = useState<string>('');
  const [customCals, setCustomCals] = useState<number>(150);
  const [customProtein, setCustomProtein] = useState<number>(10);
  const [customCarbs, setCustomCarbs] = useState<number>(15);
  const [customFat, setCustomFat] = useState<number>(5);

  useEffect(() => {
    setSelectedMeal(defaultMealType);
  }, [defaultMealType]);

  useEffect(() => {
    if (isOpen) {
      getFoodItems().then(setLocalFoods);
    }
  }, [isOpen]);

  // Filter local foods
  const filteredLocal = localFoods.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase()) ||
    (f.brand && f.brand.toLowerCase().includes(query.toLowerCase()))
  );

  const handleSearchOnline = async () => {
    if (!query.trim()) return;
    setIsSearchingOnline(true);
    const results = await searchOpenFoodFacts(query);
    setOnlineResults(results);
    setIsSearchingOnline(false);
  };

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setServingGrams(food.serving_size_g || 100);
  };

  const handleConfirmAdd = () => {
    if (!selectedFood) return;
    onAddFood(selectedMeal, selectedFood, Math.max(1, servingGrams));
    onClose();
    setSelectedFood(null);
  };

  const handleCreateCustomFood = async () => {
    if (!customName.trim()) return;
    const newFood: FoodItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: customName.trim(),
      calories_100g: customCals,
      protein_100g: customProtein,
      carbs_100g: customCarbs,
      fat_100g: customFat,
      serving_size_g: 100,
    };
    await saveFoodItemToStore(newFood);
    setLocalFoods([newFood, ...localFoods]);
    setSelectedFood(newFood);
    setIsCreatingCustom(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel bg-[#0B0F19] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Buscar Alimento</h2>
              <p className="text-[11px] text-slate-400">Base de datos & alimentos verificados</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input bar */}
        {!selectedFood && !isCreatingCustom && (
          <div className="p-3 bg-slate-900/60 border-b border-white/5 space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nombre (ej. avena, pollo, arroz...)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchOnline()}
                className="w-full pl-9 pr-20 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              {query.trim().length > 1 && (
                <button
                  onClick={handleSearchOnline}
                  className="absolute right-1.5 top-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px] hover:bg-emerald-400 transition"
                >
                  Buscar Web
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] px-1">
              <span className="text-slate-400">
                {filteredLocal.length} alimentos encontrados
              </span>
              <button
                onClick={() => setIsCreatingCustom(true)}
                className="text-emerald-400 font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Crear alimento manual</span>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {selectedFood ? (
            /* Selected Food Details & Portion Form */
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/30">
                {selectedFood.brand && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    {selectedFood.brand}
                  </span>
                )}
                <h3 className="text-base font-bold text-white mt-0.5">{selectedFood.name}</h3>
                <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-white/5">
                    <p className="text-[10px] text-slate-400">Calorías</p>
                    <p className="text-xs font-bold text-emerald-400">
                      {selectedFood.calories_100g} kcal
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-white/5">
                    <p className="text-[10px] text-slate-400">Proteína</p>
                    <p className="text-xs font-bold text-rose-400">{selectedFood.protein_100g}g</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-white/5">
                    <p className="text-[10px] text-slate-400">Carbos</p>
                    <p className="text-xs font-bold text-sky-400">{selectedFood.carbs_100g}g</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-white/5">
                    <p className="text-[10px] text-slate-400">Grasas</p>
                    <p className="text-xs font-bold text-amber-400">{selectedFood.fat_100g}g</p>
                  </div>
                </div>
              </div>

              {/* Serving Input */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Cantidad a consumir:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="2000"
                      value={servingGrams}
                      onChange={(e) => setServingGrams(Number(e.target.value))}
                      className="flex-1 px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-sm font-semibold text-slate-400">gramos</span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2">
                    {[50, 100, 150, 200, 250].map((g) => (
                      <button
                        key={g}
                        onClick={() => setServingGrams(g)}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition ${
                          servingGrams === g
                            ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                            : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                        }`}
                      >
                        {g}g
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Meal Type */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Comida de destino:
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

                {/* Live total for this portion */}
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400">Total {servingGrams}g:</span>
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-white">
                      {Math.round((selectedFood.calories_100g * servingGrams) / 100)} kcal
                    </span>
                    <span className="text-rose-400">
                      {Math.round(((selectedFood.protein_100g * servingGrams) / 100) * 10) / 10}g P
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setSelectedFood(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition"
                >
                  Volver a la lista
                </button>
                <button
                  onClick={handleConfirmAdd}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 hover:opacity-95 transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Añadir al Diario</span>
                </button>
              </div>
            </div>
          ) : isCreatingCustom ? (
            /* Custom Food Form */
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Crear Alimento Personalizado</h3>
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej. Batido de Proteínas Casero"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Calorías (por 100g)
                  </label>
                  <input
                    type="number"
                    value={customCals}
                    onChange={(e) => setCustomCals(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Proteína (por 100g)
                  </label>
                  <input
                    type="number"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Carbohidratos (por 100g)
                  </label>
                  <input
                    type="number"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Grasas (por 100g)
                  </label>
                  <input
                    type="number"
                    value={customFat}
                    onChange={(e) => setCustomFat(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setIsCreatingCustom(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCustomFood}
                  disabled={!customName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
                >
                  Guardar y Continuar
                </button>
              </div>
            </div>
          ) : (
            /* Food List Items */
            <div className="space-y-1.5">
              {filteredLocal.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectFood(item)}
                  className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-emerald-500/30 flex items-center justify-between cursor-pointer transition group"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-bold text-white group-hover:text-emerald-400 truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      {item.brand && <span className="text-slate-500">{item.brand} • </span>}
                      <span className="text-rose-400">{item.protein_100g}g P</span>
                      <span>•</span>
                      <span className="text-sky-400">{item.carbs_100g}g C</span>
                      <span>•</span>
                      <span className="text-amber-400">{item.fat_100g}g F</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-200">
                      {item.calories_100g} kcal
                    </span>
                    <span className="text-[10px] text-slate-500 block">/100g</span>
                  </div>
                </div>
              ))}

              {/* Online Results if searched */}
              {isSearchingOnline && (
                <div className="text-center py-6">
                  <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Buscando en Open Food Facts...</p>
                </div>
              )}

              {onlineResults.length > 0 && (
                <div className="pt-3 border-t border-white/5 space-y-1.5">
                  <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    Resultados de Open Food Facts:
                  </p>
                  {onlineResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectFood(item)}
                      className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/5 hover:border-sky-500/30 flex items-center justify-between cursor-pointer transition group"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold text-white group-hover:text-sky-300 truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.brand ? `${item.brand} • ` : ''}
                          {item.protein_100g}g P • {item.carbs_100g}g C • {item.fat_100g}g F
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-200">
                          {item.calories_100g} kcal
                        </span>
                        <span className="text-[10px] text-slate-500 block">/100g</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
