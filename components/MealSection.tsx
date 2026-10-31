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
  History,
  ChevronRight,
} from 'lucide-react';
import { DailyLog, MealType } from '@/lib/types';
import { getLogsForDate } from '@/lib/storage';

interface MealSectionProps {
  mealType: MealType;
  currentDate: string;
  logs: DailyLog[];
  onOpenSearch: (mealType: MealType) => void;
  onOpenScanner: (mealType: MealType) => void;
  onOpenAI: (mealType: MealType) => void;
  onOpenScaler: (mealType: MealType) => void;
  onDeleteLog: (logId: string) => void;
  onUpdateServing: (logId: string, grams: number) => void;
  onCopyPreviousMeal: (sourceDate: string, sourceMealType: MealType, targetMealType: MealType) => Promise<void>;
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

const getPreviousDateString = (dateStr: string, offsetDays: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(y, m - 1, d - offsetDays);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(
    next.getDate()
  ).padStart(2, '0')}`;
};

const formatSimpleDate = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const parsed = new Date(y, m - 1, d);
  return parsed.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

export const MealSection: React.FC<MealSectionProps> = ({
  mealType,
  currentDate,
  logs,
  onOpenSearch,
  onOpenScanner,
  onOpenAI,
  onOpenScaler,
  onDeleteLog,
  onUpdateServing,
  onCopyPreviousMeal,
}) => {
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [tempGrams, setTempGrams] = useState<string>('100');
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);
  const [copyOptions, setCopyOptions] = useState<Array<{ date: string; summaries: DailyLog[] }>>([]);
  const [selectedCopy, setSelectedCopy] = useState<{ date: string; summaries: DailyLog[] } | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [showCopyPanel, setShowCopyPanel] = useState<boolean>(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);

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
        top: spaceBelow < menuHeight + 6 ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6,
        left: Math.min(rect.left, window.innerWidth - rect.width - 8),
        width: rect.width,
      });
    }
    setShowAddMenu((v) => !v);
  };

  const loadPreviousMeals = async () => {
    setShowCopyPanel(true);
    setIsLoadingHistory(true);
    setSelectedCopy(null);
    try {
      const options: Array<{ date: string; summaries: DailyLog[] }> = [];
      for (let offset = 1; offset <= 14; offset += 1) {
        const date = getPreviousDateString(currentDate, offset);
        const dayLogs = await getLogsForDate(date);
        const mealLogs = dayLogs.filter((log) => log.meal_type === mealType && Boolean(log.food_item));
        if (mealLogs.length > 0) {
          options.push({ date, summaries: mealLogs });
        }
      }
      setCopyOptions(options);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleCopySelection = async () => {
    if (!selectedCopy) return;
    await onCopyPreviousMeal(selectedCopy.date, mealType, mealType);
    setSelectedCopy(null);
    setCopyOptions([]);
    setShowCopyPanel(false);
  };

  const mealLogs = logs.filter((l) => l.meal_type === mealType);
  const config = MEAL_CONFIG[mealType];
  const IconComponent = config.icon;

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
    setTempGrams(String(log.serving_grams));
  };

  const handleSaveEdit = (logId: string) => {
    const grams = Number(tempGrams);
    if (!Number.isFinite(grams) || grams < 1) return;
    onUpdateServing(logId, grams);
    setEditingLogId(null);
  };

  return (
    <div className="glass-panel rounded-2xl p-4 border border-emerald-950/5 transition duration-200 hover:border-emerald-300">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#f3f7ef] border border-emerald-950/5 flex items-center justify-center shrink-0">
            <IconComponent className={`w-4 h-4 ${config.color}`} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-[#34463a]">{config.label}</h3>
            <div className="flex items-center gap-1.5 text-[11px] text-[#89958a] flex-wrap">
              <span className="font-semibold text-[#526156]">{totalCalories} kcal</span>
              <span>•</span>
              <span className="text-rose-400 font-medium">{totalProtein}g P</span>
              <span>•</span>
              <span className="text-sky-400 font-medium">{totalCarbs}g C</span>
              <span>•</span>
              <span className="text-amber-400 font-medium">{totalFat}g F</span>
            </div>
          </div>
        </div>

        {mealLogs.length > 0 && (
          <button
            onClick={() => onOpenScaler(mealType)}
            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 rounded-lg transition shrink-0"
            title="Escalar porciones de esta comida a tus metas"
          >
            <Scale className="w-3 h-3" />
            <span className="hidden sm:inline">Escalar</span>
          </button>
        )}
      </div>

      {showCopyPanel && (
        <div className="mb-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-2.5 space-y-2">
          {!selectedCopy ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-800">
                  <History className="w-3.5 h-3.5" />
                  <span>Copiar desde días anteriores</span>
                </div>
                <button
                  onClick={() => {
                    setShowCopyPanel(false);
                    setCopyOptions([]);
                  }}
                  className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-900"
                >
                  Cerrar
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="py-3 text-center text-[11px] font-medium text-[#5d6d60]">Buscando comidas previas…</div>
              ) : copyOptions.length === 0 ? (
                <div className="rounded-xl bg-white border border-emerald-200 p-3 text-center text-[11px] text-[#5d6d60]">
                  No hay comidas guardadas en los últimos 14 días para esta sección.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {copyOptions.map((option) => (
                    <button
                      key={option.date}
                      onClick={() => setSelectedCopy(option)}
                      className="w-full flex items-center justify-between gap-2 rounded-xl bg-white border border-emerald-200 px-2.5 py-2 text-left hover:border-emerald-400 transition"
                    >
                      <div>
                        <p className="text-[11px] font-bold text-[#26352d]">{formatSimpleDate(option.date)}</p>
                        <p className="text-[10px] text-[#6b7a6f]">{option.summaries.length} alimentos</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#6b7a6f]" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-emerald-800">Se añadirán a {config.label.toLowerCase()}:</p>
                <button
                  onClick={() => setSelectedCopy(null)}
                  className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-900"
                >
                  Cambiar
                </button>
              </div>
              <div className="space-y-1.5 rounded-xl bg-white border border-emerald-200 p-2">
                {selectedCopy.summaries.map((log) => (
                  <div key={`${selectedCopy.date}-${log.id}`} className="flex items-center justify-between gap-2 text-[10px] text-[#465448]">
                    <span className="truncate">{log.food_item?.name}</span>
                    <span className="font-bold text-[#26352d]">{log.serving_grams}g</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setSelectedCopy(null)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-emerald-200 text-[10px] font-bold text-[#526156]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCopySelection}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold shadow-sm"
                >
                  Confirmar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="space-y-2 mb-3">
        {mealLogs.length === 0 ? (
          <div className="text-center py-4 bg-[#f8faf5] rounded-xl border border-emerald-950/10 border-dashed">
            <p className="text-xs text-[#89958a]">No hay alimentos registrados en {config.label.toLowerCase()}</p>
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
                className="group flex items-center justify-between p-2.5 rounded-xl bg-[#f8faf6] hover:bg-emerald-50 border border-emerald-950/5 transition"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-[#35453a] truncate">{food.name}</p>
                    {food.brand && (
                      <span className="text-[10px] text-[#879287] truncate hidden xs:inline">
                        ({food.brand})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#879287] flex-wrap">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max="2000"
                          value={tempGrams}
                          onChange={(e) => setTempGrams(e.target.value)}
                          className="w-16 px-1.5 py-0.5 bg-white border border-emerald-500 rounded text-xs text-[#26352d] focus:outline-none"
                          autoFocus
                        />
                        <span className="text-xs text-[#879287]">g</span>
                        <button
                          onClick={() => handleSaveEdit(log.id)}
                          disabled={!tempGrams.trim() || !Number.isFinite(Number(tempGrams)) || Number(tempGrams) < 1}
                          aria-label="Guardar cantidad"
                          className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(log)}
                        className="flex items-center gap-1 text-[#657367] hover:text-emerald-700 underline decoration-dotted font-medium"
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

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-[#35453a] min-w-[50px] text-right">{cals} kcal</span>
                  <button
                    onClick={() => onDeleteLog(log.id)}
                    className="p-1 text-[#9ba59b] hover:text-rose-500 transition opacity-70 group-hover:opacity-100"
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

      <div className="flex flex-col gap-2">
        <button
          onClick={async () => {
            await loadPreviousMeals();
            setShowAddMenu(false);
          }}
          className="w-full py-2 px-3 rounded-xl border border-emerald-200 bg-white text-[11px] font-bold text-emerald-800 hover:bg-emerald-50 transition flex items-center justify-center gap-1.5"
        >
          <History className="w-3.5 h-3.5" />
          {isLoadingHistory ? 'Cargando…' : 'Copiar comida anterior'}
        </button>
        <button
          ref={addBtnRef}
          onClick={handleToggleMenu}
          className="w-full py-2 px-3 rounded-xl border border-dashed border-emerald-900/20 hover:border-emerald-500/60 bg-emerald-50/70 hover:bg-emerald-100 text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Añadir a {config.label}</span>
        </button>
      </div>

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
          className="bg-white border border-emerald-950/10 rounded-2xl p-2 shadow-xl animate-in fade-in zoom-in-95 duration-150"
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
                onClick={() => {
                  setShowAddMenu(false);
                  item.action();
                }}
                className="flex items-center space-x-2 p-2 rounded-xl bg-[#f7f9f4] hover:bg-emerald-50 text-left transition"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.color}`}>{item.icon}</div>
                <div>
                  <p className="text-xs font-bold text-[#35453a]">{item.label}</p>
                  <p className="text-[10px] text-[#849084]">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
