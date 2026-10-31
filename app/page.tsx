'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Navbar,
} from '@/components/Navbar';
import { MacroSummaryCard } from '@/components/MacroSummaryCard';
import { MealSection } from '@/components/MealSection';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { AIFoodModal } from '@/components/AIFoodModal';
import { MacroScalerModal } from '@/components/MacroScalerModal';
import { TdeeCalculatorModal } from '@/components/TdeeCalculatorModal';
import { FoodSearchModal } from '@/components/FoodSearchModal';
import { AuthModal } from '@/components/AuthModal';

import { DailyLog, FoodItem, MealType, Profile } from '@/lib/types';
import {
  getTodayDateString,
  loadProfile,
  saveProfileToStore,
  getLogsForDate,
  saveLogEntry,
  updateLogServing,
  deleteLogEntry,
} from '@/lib/storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  const [currentDate, setCurrentDate] = useState<string>(getTodayDateString());
  const [profile, setProfile] = useState<Profile>({
    id: 'guest_user',
    daily_calories: 2200,
    protein_g: 165,
    carbs_g: 220,
    fat_g: 70,
  });
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [activeTab, setActiveTab] = useState<'diary' | 'scanner' | 'ai' | 'scaler' | 'tdee'>('diary');

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isAIOpen, setIsAIOpen] = useState<boolean>(false);
  const [isScalerOpen, setIsScalerOpen] = useState<boolean>(false);
  const [isTDEEOpen, setIsTDEEOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [activeMealType, setActiveMealType] = useState<MealType>('lunch');

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [tdeeInitialTab, setTdeeInitialTab] = useState<'trainer' | 'calculator'>('trainer');
  const [streakDays, setStreakDays] = useState<number>(0);

  const computeCurrentStreak = useCallback(() => {
    if (typeof window === 'undefined') return 0;

    try {
      const activeDates = new Set<string>();
      Object.keys(localStorage).forEach((key) => {
        const match = key.match(/^fitfree_logs(?:_[^_]+)?_(\d{4}-\d{2}-\d{2})$/);
        if (!match) return;

        const raw = localStorage.getItem(key);
        if (!raw) return;

        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.some((entry) => entry && entry.food_item)) {
          activeDates.add(match[1]);
        }
      });

      if (activeDates.size === 0) return 0;

      let streak = 0;
      const cursor = new Date(currentDate);
      while (true) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(
          cursor.getDate()
        ).padStart(2, '0')}`;

        if (!activeDates.has(key)) break;
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }

      return streak;
    } catch {
      return 0;
    }
  }, [currentDate]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Check auth
  const refreshAuth = useCallback(async () => {
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setIsAuthenticated(true);
          setUserEmail(data.user.email);
          return;
        }
      } catch (_) {
        // Fallback to local user
      }
    }

    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('fitfree_local_user');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (parsed.is_local) {
            setIsAuthenticated(true);
            setUserEmail(parsed.user_metadata?.name || parsed.email || 'Mi Perfil');
            return;
          }
          localStorage.removeItem('fitfree_local_user');
        } catch (_) {}
      }
    }
    setIsAuthenticated(false);
    setUserEmail(undefined);
  }, []);

  // Load data for date
  const refreshData = useCallback(async () => {
    const p = await loadProfile();
    setProfile(p);
    const l = await getLogsForDate(currentDate);
    setLogs(l);
    setStreakDays(computeCurrentStreak());
  }, [computeCurrentStreak, currentDate]);

  useEffect(() => {
    refreshAuth();
    refreshData();

    if (isSupabaseConfigured) {
      const { data: authListener } = supabase.auth.onAuthStateChange(() => {
        refreshAuth();
        refreshData();
      });
      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, [refreshAuth, refreshData]);

  // Handlers for modals
  const handleOpenSearch = (mealType: MealType) => {
    setActiveMealType(mealType);
    setIsSearchOpen(true);
  };

  const handleOpenScanner = (mealType?: MealType) => {
    if (mealType) setActiveMealType(mealType);
    setIsScannerOpen(true);
  };

  const handleOpenAI = (mealType?: MealType) => {
    if (mealType) setActiveMealType(mealType);
    setIsAIOpen(true);
  };

  const handleOpenScaler = (mealType?: MealType) => {
    if (mealType) setActiveMealType(mealType);
    setIsScalerOpen(true);
  };

  const handleOpenTDEE = (initialTab: 'trainer' | 'calculator' = 'trainer') => {
    setTdeeInitialTab(initialTab);
    setIsTDEEOpen(true);
  };

  const handleOpenAuth = () => {
    setIsAuthOpen(true);
  };

  // Actions
  const handleAddFood = async (mealType: MealType, food: FoodItem, grams: number) => {
    try {
      await saveLogEntry(currentDate, mealType, food, grams);
      await refreshData();
      showToast(`✓ "${food.name}" (${grams}g) añadido a tu diario`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo guardar el alimento');
    }
  };

  const handleAddMultipleFoods = async (
    mealType: MealType,
    items: { food: FoodItem; grams: number }[]
  ) => {
    try {
      for (const item of items) {
        await saveLogEntry(currentDate, mealType, item.food, item.grams);
      }
      await refreshData();
      showToast(`✓ ${items.length} alimentos añadidos con Gemini AI`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudieron guardar los alimentos');
    }
  };

  const handleUpdateServing = async (logId: string, grams: number) => {
    try {
      await updateLogServing(currentDate, logId, grams);
      await refreshData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo actualizar la cantidad');
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      await deleteLogEntry(currentDate, logId);
      await refreshData();
      showToast('Alimento eliminado');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo eliminar el alimento');
    }
  };

  const handleCopyPreviousMeal = async (
    sourceDate: string,
    sourceMealType: MealType,
    targetMealType: MealType
  ) => {
    try {
      const sourceLogs = await getLogsForDate(sourceDate);
      const mealsToCopy = sourceLogs.filter(
        (log) => log.meal_type === sourceMealType && Boolean(log.food_item)
      );

      if (mealsToCopy.length === 0) {
        showToast('No había alimentos para copiar en ese día');
        return;
      }

      for (const item of mealsToCopy) {
        if (!item.food_item) continue;
        await saveLogEntry(currentDate, targetMealType, item.food_item, item.serving_grams);
      }

      await refreshData();
      showToast(`✓ ${mealsToCopy.length} alimentos copiados desde ${sourceDate}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo copiar la comida');
    }
  };

  const handleSaveProfile = async (updated: Profile) => {
    try {
      await saveProfileToStore(updated);
      setProfile(updated);
      showToast('Metas y macros actualizados');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error al guardar metas');
    }
  };

  return (
    <div className="min-h-screen text-[#26352d] flex flex-col font-sans">
      {/* Navbar & Header */}
      <Navbar
        currentDate={currentDate}
        onDateChange={(d) => setCurrentDate(d)}
        onOpenScanner={() => handleOpenScanner()}
        onOpenAI={() => handleOpenAI()}
        onOpenScaler={() => handleOpenScaler()}
        onOpenTDEE={handleOpenTDEE}
        onOpenAuth={handleOpenAuth}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-3.5 pt-4 pb-6 space-y-4">
        {/* Calorie & Macro Progress Card */}
        <MacroSummaryCard
          profile={profile}
          logs={logs}
          streakDays={streakDays}
          onOpenTDEE={handleOpenTDEE}
        />

        {/* Meals Sections: Breakfast, Lunch, Dinner, Snack */}
        <div className="space-y-3.5">
          <MealSection
            mealType="breakfast"
            currentDate={currentDate}
            logs={logs}
            onOpenSearch={handleOpenSearch}
            onOpenScanner={handleOpenScanner}
            onOpenAI={handleOpenAI}
            onOpenScaler={handleOpenScaler}
            onDeleteLog={handleDeleteLog}
            onUpdateServing={handleUpdateServing}
            onCopyPreviousMeal={handleCopyPreviousMeal}
          />

          <MealSection
            mealType="lunch"
            currentDate={currentDate}
            logs={logs}
            onOpenSearch={handleOpenSearch}
            onOpenScanner={handleOpenScanner}
            onOpenAI={handleOpenAI}
            onOpenScaler={handleOpenScaler}
            onDeleteLog={handleDeleteLog}
            onUpdateServing={handleUpdateServing}
            onCopyPreviousMeal={handleCopyPreviousMeal}
          />

          <MealSection
            mealType="dinner"
            currentDate={currentDate}
            logs={logs}
            onOpenSearch={handleOpenSearch}
            onOpenScanner={handleOpenScanner}
            onOpenAI={handleOpenAI}
            onOpenScaler={handleOpenScaler}
            onDeleteLog={handleDeleteLog}
            onUpdateServing={handleUpdateServing}
            onCopyPreviousMeal={handleCopyPreviousMeal}
          />

          <MealSection
            mealType="snack"
            currentDate={currentDate}
            logs={logs}
            onOpenSearch={handleOpenSearch}
            onOpenScanner={handleOpenScanner}
            onOpenAI={handleOpenAI}
            onOpenScaler={handleOpenScaler}
            onDeleteLog={handleDeleteLog}
            onUpdateServing={handleUpdateServing}
            onCopyPreviousMeal={handleCopyPreviousMeal}
          />
        </div>
      </main>

      <footer className="w-full max-w-2xl mx-auto px-4 pt-1 pb-[calc(1rem+env(safe-area-inset-bottom))] text-left text-[10px] leading-5 text-[#849087]">
        Artificially made by JRamonCP
      </footer>

      {/* Interactive Modals */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => {
          setIsScannerOpen(false);
          setActiveTab('diary');
        }}
        defaultMealType={activeMealType}
        onAddFood={handleAddFood}
      />

      <AIFoodModal
        isOpen={isAIOpen}
        onClose={() => {
          setIsAIOpen(false);
          setActiveTab('diary');
        }}
        defaultMealType={activeMealType}
        onAddMultipleFoods={handleAddMultipleFoods}
      />

      <MacroScalerModal
        isOpen={isScalerOpen}
        onClose={() => {
          setIsScalerOpen(false);
          setActiveTab('diary');
        }}
        defaultMealType={activeMealType}
        logs={logs}
        profile={profile}
        onUpdateServing={handleUpdateServing}
      />

      <TdeeCalculatorModal
        isOpen={isTDEEOpen}
        onClose={() => {
          setIsTDEEOpen(false);
          setActiveTab('diary');
        }}
        currentProfile={profile}
        onSaveProfile={handleSaveProfile}
        initialTab={tdeeInitialTab}
      />

      <FoodSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        defaultMealType={activeMealType}
        onAddFood={handleAddFood}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthChange={() => {
          refreshAuth();
          refreshData();
        }}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-panel bg-slate-900/95 border border-emerald-500/40 text-emerald-300 text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
