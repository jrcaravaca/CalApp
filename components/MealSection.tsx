'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Coffee,
  UtensilsCrossed,
  Moon,
  Apple,
  Plus,
  Trash2,
  ScanBarcode,
  Camera,
  Search,
  Scale,
  Edit2,
  Check,
} from 'lucide-react';
import { DailyLog, MealType, FoodItem } from '@/lib/types';

interface MealSectionProps {
  mealType: MealType;
  logs: DailyLog[];
  onOpenSearch: (mealType: MealType) => void;
  onOpenScanner: (mealType: MealType) => void;
  onOpenAI: (mealType: MealType) => void;
  onOpenScaler: (mealType: MealType) => void;
  onDeleteLog: (logId: string) => void;
  onUpdateServing: (logId: string, grams: number) => void;
}

const MEAL_CONFIG: Record<
  MealType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  breakfast: { label: 'Desayuno', icon: Coffee, color: 'text-amber-400' },
  lunch: { label: 'Almuerzo', icon: UtensilsCrossed, color: 'text-emerald-400' },
  dinner: { label: 'Cena', icon: Moon, color: 'text-indigo-400' },
  snack: { label: 'Snacks & Meriendas', icon: Apple, color: 'text-rose-400' },
};

export const MealSection: React.FC<MealSectionProps> = ({
  mealType,
  logs,
  onOpenSearch,
  onOpenScanner,
  onOpenAI,
  onOpenScaler,
  onDeleteLog,
  onUpdateServing,
}) => {
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [tempGrams, setTempGrams] = useState<number>(100);
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Close on click-outside
  useEffect(() => {
    if (!showAddMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        addBtnRef.current && !addBtnRef.current.contains(e.target as Node)
      ) setShowAddMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddMenu]);

  const handleToggleMenu = () => {
    if (!showAddMenu && addBtnRef.current) {
      const rect = addBtnRef.current.getBoundingClientRect();
      const menuHeight = 120;
      const spaceBelow = window.innerHeight - rect.bottom;
      setMenuPos({
        top: spaceBelow < menuHeight + 6
          ? Math.max(8, rect.top - menuHeight - 6)
          : rect.bottom + 6,
        left: Math.min(rect.left, window.innerWidth - rect.width - 8),
        width: rect.width,
      });
    }
    setShowAddMenu((v) => !v);
  };

  const mealLogs = logs.filter((l) => l.meal_type === mealType);
  const config = MEAL_CONFIG[mealType];
  const IconComponent = config.icon;

  // Calculate meal total macros
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  mealLogs.forEach((l) => {
    if (l.food_item) {
      const g = l.serving_grams || 100;
      totalCalories += (l.food_item.calories_100g * g) / 100;
      totalProtein += (l.food_item.protein_100g * g) / 100;
      totalCarbs += (l.food_item.carbs_100g * g) / 100;
      totalFat += (l.food_item.fat_100g * g) / 100;
    }
  });

  totalCalories = Math.round(totalCalories);
  totalProtein = Math.round(totalProtein * 10) / 10;
  totalCarbs = Math.round(totalCarbs * 10) / 10;
  totalFat = Math.round(totalFat * 10) / 10;

  const handleStartEdit = (log: DailyLog) => {
    setEditingLogId(log.id);
    setTempGrams(log.serving_grams);
  };

  const handleSaveEdit = (logId: string) => {
    onUpdateServing(logId, Math.max(1, tempGrams));
    setEditingLogId(null);
  };

  return (
    <div className="glass-panel rounded-2xl p-4 border border-white/5 transition duration-200 hover:border-white/10">
      {/* Meal Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center shadow-inner">
            <IconComponent className={`w-4 h-4 ${config.color}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">{config.label}</h3>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="font-semibold text-white">{totalCalories} kcal</span>
              <span>•</span>
              <span className="text-rose-400 font-medium">{totalProtein}g P</span>
              <span>•</span>
              <span className="text-sky-400 font-medium">{totalCarbs}g C</span>
              <span>•</span>
              <span className="text-amber-400 font-medium">{totalFat}g F</span>
            </div>
          </div>
        </div>

        {/* Scaler quick action on meal header if meal has items */}
        {mealLogs.length > 0 && (
          <button
            onClick={() => onOpenScaler(mealType)}
            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 rounded-lg transition"
            title="Escalar porciones de esta comida a tus metas"
          >
            <Scale className="w-3 h-3" />
            <span className="hidden sm:inline">Escalar</span>
          </button>
        )}
      </div>

      {/* Logged Items List */}
      <div className="space-y-2 mb-3">
        {mealLogs.length === 0 ? (
          <div className="text-center py-4 bg-slate-900/40 rounded-xl border border-white/5 border-dashed">
            <p className="text-xs text-slate-500">No hay alimentos registrados en {config.label.toLowerCase()}</p>
          </div>
        ) : (
          mealLogs.map((log) => {
            const food = log.food_item;
            if (!food) return null;

            const g = log.serving_grams || 100;
            const cals = Math.round((food.calories_100g * g) / 100);
            const p = Math.round(((food.protein_100g * g) / 100) * 10) / 10;
            const c = Math.round(((food.carbs_100g * g) / 100) * 10) / 10;
            const f = Math.round(((food.fat_100g * g) / 100) * 10) / 10;

            const isEditing = editingLogId === log.id;

            return (
              <div
                key={log.id}
                className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-900/80 border border-white/5 transition"
              >
                {/* Left: Food details */}
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-slate-200 truncate">{food.name}</p>
                    {food.brand && (
                      <span className="text-[10px] text-slate-400 truncate hidden xs:inline">
                        ({food.brand})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max="2000"
                          value={tempGrams}
                          onChange={(e) => setTempGrams(Number(e.target.value))}
                          className="w-16 px-1.5 py-0.5 bg-slate-800 border border-emerald-500 rounded text-xs text-white focus:outline-none"
                          autoFocus
                        />
                        <span className="text-xs text-slate-400">g</span>
                        <button
                          onClick={() => handleSaveEdit(log.id)}
                          className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(log)}
                        className="flex items-center gap-1 text-slate-300 hover:text-emerald-400 underline decoration-dotted font-medium"
                        title="Editar cantidad"
                      >
                        <span>{g}g</span>
                        <Edit2 className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                      </button>
                    )}
                    <span>•</span>
                    <span className="text-rose-400">{p}g P</span>
                    <span>•</span>
                    <span className="text-sky-400">{c}g C</span>
                    <span>•</span>
                    <span className="text-amber-400">{f}g F</span>
                  </div>
                </div>

                {/* Right: Calories & Delete */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-100 min-w-[50px] text-right">
                    {cals} kcal
                  </span>
                  <button
                    onClick={() => onDeleteLog(log.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition opacity-70 group-hover:opacity-100"
                    title="Eliminar alimento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Food Trigger */}
      <div>
        <button
          ref={addBtnRef}
          onClick={handleToggleMenu}
          className="w-full py-2 px-3 rounded-xl border border-dashed border-white/10 hover:border-emerald-500/40 bg-white/2 hover:bg-emerald-500/5 text-xs font-semibold text-slate-300 hover:text-emerald-400 flex items-center justify-center gap-1.5 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Añadir a {config.label}</span>
        </button>
      </div>

      {/* Fixed portal dropdown — never clipped by parent overflow */}
      {showAddMenu && menuPos && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
            zIndex: 9999,
          }}
          className="bg-[#0d1117] border border-white/10 rounded-2xl p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: 'Buscar', sub: 'Base de datos', icon: <Search className="w-3.5 h-3.5" />, color: 'bg-emerald-500/20 text-emerald-400', action: () => onOpenSearch(mealType) },
              { label: 'IA Gemini', sub: 'Foto o texto', icon: <Camera className="w-3.5 h-3.5" />, color: 'bg-teal-500/20 text-teal-300', action: () => onOpenAI(mealType) },
              { label: 'Cód. Barras', sub: 'Cámara en vivo', icon: <ScanBarcode className="w-3.5 h-3.5" />, color: 'bg-sky-500/20 text-sky-400', action: () => onOpenScanner(mealType) },
              { label: 'Escalador', sub: 'Ajustar macros', icon: <Scale className="w-3.5 h-3.5" />, color: 'bg-indigo-500/20 text-indigo-400', action: () => onOpenScaler(mealType) },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => { setShowAddMenu(false); item.action(); }}
                className="flex items-center space-x-2 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-left transition"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.color}`}>{item.icon}</div>
                <div>
                  <p className="text-xs font-bold text-white">{item.label}</p>
                  <p className="text-[10px] text-slate-400">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
