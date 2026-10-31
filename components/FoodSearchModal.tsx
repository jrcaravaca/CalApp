'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, Check, Globe, Sparkles } from 'lucide-react';
import { FoodItem, MealType } from '@/lib/types';
import { getFoodItems, saveFoodItemToStore } from '@/lib/storage';
import { searchOpenFoodFacts } from '@/lib/openfoodfacts';

interface FoodSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMealType?: MealType;
  onAddFood: (mealType: MealType, food: FoodItem, grams: number) => void;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export const FoodSearchModal: React.FC<FoodSearchModalProps> = ({
  isOpen,
  onClose,
  defaultMealType = 'lunch',
  onAddFood,
}) => {
  const [query, setQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [localFoods, setLocalFoods] = useState<FoodItem[]>([]);
  const [onlineResults, setOnlineResults] = useState<FoodItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState<boolean>(false);
  const [onlineSearchUnavailable, setOnlineSearchUnavailable] = useState<boolean>(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servingGrams, setServingGrams] = useState<string>('100');
  const [selectedMeal, setSelectedMeal] = useState<MealType>(defaultMealType);
  const [isCreatingCustom, setIsCreatingCustom] = useState<boolean>(false);
  const requestIdRef = useRef(0);

  const [customName, setCustomName] = useState<string>('');
  const [customCals, setCustomCals] = useState<string>('150');
  const [customProtein, setCustomProtein] = useState<string>('10');
  const [customCarbs, setCustomCarbs] = useState<string>('15');
  const [customFat, setCustomFat] = useState<string>('5');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedMeal(defaultMealType);
  }, [isOpen, defaultMealType]);

  useEffect(() => {
    if (!isOpen) return;
    getFoodItems().then(setLocalFoods);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 500);
    return () => window.clearTimeout(timer);
  }, [query, isOpen]);

  const normalizedQuery = normalizeSearchText(debouncedQuery);
  const filteredLocal = normalizedQuery
    ? localFoods.filter(
        (food) =>
          normalizeSearchText(food.name).includes(normalizedQuery) ||
          (food.brand && normalizeSearchText(food.brand).includes(normalizedQuery))
      )
    : [];
  const isDebouncing = query.trim() !== debouncedQuery;

  useEffect(() => {
    if (!isOpen) return;

    if (!debouncedQuery || filteredLocal.length > 0) {
      requestIdRef.current += 1;
      setOnlineResults([]);
      setIsSearchingOnline(false);
      setOnlineSearchUnavailable(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    let cancelled = false;
    setIsSearchingOnline(true);
    setOnlineSearchUnavailable(false);

    const runSearch = async () => {
      try {
        const results = await searchOpenFoodFacts(debouncedQuery);
        if (cancelled || requestId !== requestIdRef.current) return;
        setOnlineResults(results || []);
        setOnlineSearchUnavailable(results === null);
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setIsSearchingOnline(false);
        }
      }
    };

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, filteredLocal.length, isOpen]);

  const resetSearchState = () => {
    setQuery('');
    setDebouncedQuery('');
    setSelectedFood(null);
    setIsCreatingCustom(false);
    setOnlineResults([]);
    setOnlineSearchUnavailable(false);
    setServingGrams('100');
    requestIdRef.current += 1;
  };

  const handleClose = () => {
    resetSearchState();
    onClose();
  };

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setServingGrams(String(food.serving_size_g || 100));
  };

  const handleConfirmAdd = () => {
    const grams = Number(servingGrams);
    if (!selectedFood || !Number.isFinite(grams) || grams < 1) return;
    onAddFood(selectedMeal, selectedFood, grams);
    handleClose();
  };

  const handleCreateCustomFood = async () => {
    if (!customName.trim() || !customNutritionValid) return;
    const newFood: FoodItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: customName.trim(),
      calories_100g: Number(customCals),
      protein_100g: Number(customProtein),
      carbs_100g: Number(customCarbs),
      fat_100g: Number(customFat),
      serving_size_g: 100,
    };
    await saveFoodItemToStore(newFood);
    setLocalFoods((current) => [newFood, ...current]);
    setSelectedFood(newFood);
    setIsCreatingCustom(false);
  };

  const customNutritionValid = [customCals, customProtein, customCarbs, customFat].every(
    (value) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 1
  );
  const servingGramsValid = servingGrams.trim() !== '' && Number.isFinite(Number(servingGrams)) && Number(servingGrams) >= 1;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-3 bg-[#23342b]/35 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#fffefa] border border-emerald-950/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-[0_24px_80px_rgba(30,50,36,0.22)] flex flex-col max-h-[92dvh] min-h-0">
        <div className="flex items-center justify-between p-4 border-b border-emerald-950/5 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#2d3d31]">Buscar alimentos</h2>
              <p className="text-[11px] text-[#7b887c]">Básicos y productos verificados</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Cerrar búsqueda"
            className="p-1.5 rounded-full text-[#839084] hover:text-[#35453a] hover:bg-emerald-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!selectedFood && !isCreatingCustom && (
          <div className="sticky top-0 z-20 p-3 bg-[#f4f7ef] border-b border-emerald-950/5 space-y-2 shrink-0 backdrop-blur-sm">
            <div className="relative">
              <input
                type="text"
                placeholder="Busca leche, huevo, tomate, pollo..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-white border border-emerald-950/10 rounded-xl text-sm text-[#35453a] placeholder:text-[#9aa59d] focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <Search className="w-4 h-4 text-[#89958a] absolute left-3 top-3.5" />
            </div>

            <div className="flex items-center justify-between text-[11px] px-1 gap-2">
              <span className="text-[#7b887c] min-w-0 truncate">
                {debouncedQuery.trim() ? `${filteredLocal.length} alimentos locales` : 'Explora alimentos locales'}
              </span>
              <button
                onClick={() => setIsCreatingCustom(true)}
                className="text-emerald-800 font-semibold hover:underline flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>Crear alimento</span>
              </button>
            </div>
          </div>
        )}

        <div className="p-4 overflow-y-auto overflow-x-hidden flex-1 min-h-0 space-y-3">
          {selectedFood ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-3.5 rounded-2xl bg-[#f4f7ef] border border-emerald-200">
                {selectedFood.brand && (
                  <span className="text-[10px] font-bold uppercase text-emerald-800">{selectedFood.brand}</span>
                )}
                <h3 className="text-base font-extrabold text-[#2d3d31] mt-0.5">{selectedFood.name}</h3>
                <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                  <div className="p-2 rounded-xl bg-white border border-emerald-950/5">
                    <p className="text-[10px] text-[#7b887c]">Calorías</p>
                    <p className="text-xs font-bold text-emerald-600">{selectedFood.calories_100g} kcal</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-950/5">
                    <p className="text-[10px] text-[#7b887c]">Proteína</p>
                    <p className="text-xs font-bold text-rose-500">{selectedFood.protein_100g}g</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-950/5">
                    <p className="text-[10px] text-[#7b887c]">Carbos</p>
                    <p className="text-xs font-bold text-sky-500">{selectedFood.carbs_100g}g</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-950/5">
                    <p className="text-[10px] text-[#7b887c]">Grasas</p>
                    <p className="text-xs font-bold text-amber-500">{selectedFood.fat_100g}g</p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-emerald-950/5 space-y-3">
                <div>
                  <label className="text-xs font-bold text-[#526156] block mb-1.5">Cantidad a consumir:</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="2000"
                      value={servingGrams}
                      onChange={(e) => setServingGrams(e.target.value)}
                      className="flex-1 px-3 py-2.5 bg-[#f8faf6] border border-emerald-950/10 rounded-xl text-sm font-bold text-[#35453a] focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-sm font-semibold text-[#7b887c]">gramos</span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {[50, 100, 150, 200, 250].map((g) => (
                      <button
                        key={g}
                        onClick={() => setServingGrams(String(g))}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition ${
                          Number(servingGrams) === g
                            ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                            : 'bg-[#f4f7ef] text-[#657367] border-emerald-950/5 hover:bg-emerald-100'
                        }`}
                      >
                        {g}g
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#526156] block mb-1.5">Comida de destino:</label>
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
                              : 'bg-[#f4f7ef] text-[#657367] border-emerald-950/5 hover:text-emerald-900'
                          }`}
                        >
                          {labels[m]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-800">Total {servingGrams || 0}g:</span>
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-[#35453a]">{Math.round((selectedFood.calories_100g * (Number(servingGrams) || 0)) / 100)} kcal</span>
                    <span className="text-rose-500">{Math.round(((selectedFood.protein_100g * (Number(servingGrams) || 0)) / 100) * 10) / 10}g P</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setSelectedFood(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#f1f5ed] hover:bg-emerald-100 text-xs font-semibold text-[#657367] transition"
                >
                  Volver a la lista
                </button>
                <button
                  onClick={handleConfirmAdd}
                  disabled={!servingGramsValid}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  <span>Añadir al Diario</span>
                </button>
              </div>
            </div>
          ) : isCreatingCustom ? (
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-[#2d3d31]">Crear alimento personalizado</h3>
              <div>
                <label className="text-[11px] font-bold text-[#526156] block mb-1">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej. Batido de Proteínas Casero"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-emerald-950/10 rounded-xl text-sm text-[#35453a] placeholder:text-[#9aa59d] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-[#526156] block mb-1">Calorías (por 100g)</label>
                  <input
                    type="number"
                    min="1"
                    value={customCals}
                    onChange={(e) => setCustomCals(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-950/10 rounded-xl text-xs text-[#35453a] focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#526156] block mb-1">Proteína (por 100g)</label>
                  <input
                    type="number"
                    min="1"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-950/10 rounded-xl text-xs text-[#35453a] focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#526156] block mb-1">Carbohidratos (por 100g)</label>
                  <input
                    type="number"
                    min="1"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-950/10 rounded-xl text-xs text-[#35453a] focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#526156] block mb-1">Grasas (por 100g)</label>
                  <input
                    type="number"
                    min="1"
                    value={customFat}
                    onChange={(e) => setCustomFat(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-950/10 rounded-xl text-xs text-[#35453a] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setIsCreatingCustom(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#f1f5ed] hover:bg-emerald-100 text-xs font-semibold text-[#657367] transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCustomFood}
                  disabled={!customName.trim() || !customNutritionValid}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition disabled:opacity-50"
                >
                  Guardar y Continuar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {!query.trim() ? (
                <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-5 text-center">
                  <Sparkles className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#2d3d31]">Empieza a escribir</p>
                  <p className="text-xs text-[#738076] mt-1">Te mostraremos sugerencias locales tras 0.5 s.</p>
                </div>
              ) : isDebouncing ? (
                <div className="text-center py-6">
                  <p className="text-xs text-[#5d6d60]">Buscando en alimentos locales...</p>
                </div>
              ) : filteredLocal.length === 0 && !isSearchingOnline && !onlineResults.length ? (
                <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-5 text-center">
                  <Sparkles className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#2d3d31]">
                    {onlineSearchUnavailable ? 'Open Food Facts no está disponible' : 'No hay coincidencias'}
                  </p>
                  <p className="text-xs text-[#738076] mt-1">
                    {onlineSearchUnavailable
                      ? 'No se pudo completar la búsqueda. Inténtalo de nuevo en unos momentos.'
                      : 'Prueba con otro nombre o crea un alimento personalizado.'}
                  </p>
                </div>
              ) : null}

              {!isDebouncing && filteredLocal.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectFood(item)}
                  className="p-2.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-950/5 hover:border-emerald-400 flex items-center justify-between cursor-pointer transition group"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-bold text-[#2d3d31] group-hover:text-emerald-700 truncate">{item.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-[#6f7c70] mt-0.5 flex-wrap">
                      {item.brand && <span>{item.brand}</span>}
                      <span className="text-rose-500">{item.protein_100g}g P</span>
                      <span>•</span>
                      <span className="text-sky-500">{item.carbs_100g}g C</span>
                      <span>•</span>
                      <span className="text-amber-500">{item.fat_100g}g F</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#35453a]">{item.calories_100g} kcal</span>
                    <span className="text-[10px] text-[#7b887c] block">/100g</span>
                  </div>
                </div>
              ))}

              {!isDebouncing && isSearchingOnline && (
                <div className="text-center py-6">
                  <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-[#5d6d60]">Buscando en Open Food Facts...</p>
                </div>
              )}

              {!isDebouncing && filteredLocal.length === 0 && onlineResults.length > 0 && (
                <div className="pt-3 border-t border-emerald-950/5 space-y-1.5">
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    Resultados web
                  </p>
                  {onlineResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectFood(item)}
                      className="p-2.5 rounded-xl bg-[#f7faf5] hover:bg-emerald-50 border border-emerald-950/5 hover:border-sky-400 flex items-center justify-between cursor-pointer transition group"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold text-[#2d3d31] group-hover:text-sky-600 truncate">{item.name}</p>
                        <p className="text-[10px] text-[#6f7c70] mt-0.5">
                          {item.brand ? `${item.brand} • ` : ''}
                          {item.protein_100g}g P • {item.carbs_100g}g C • {item.fat_100g}g F
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#35453a]">{item.calories_100g} kcal</span>
                        <span className="text-[10px] text-[#7b887c] block">/100g</span>
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
