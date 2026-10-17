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
import {
  ScanBarcode,
  Sparkles,
  Scale,
  Search,
  CheckCircle2,
  Zap,
} from 'lucide-react';

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
        } else {
          setIsAuthenticated(false);
          setUserEmail(undefined);
        }
      } catch (_) {
        setIsAuthenticated(false);
      }
    }
  }, []);

  // Load data for date
  const refreshData = useCallback(async () => {
    const p = await loadProfile();
    setProfile(p);
    const l = await getLogsForDate(currentDate);
    setLogs(l);
  }, [currentDate]);

  useEffect(() => {
    refreshAuth();
    refreshData();
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

  const handleOpenTDEE = () => {
    setIsTDEEOpen(true);
  };

  const handleOpenAuth = () => {
    setIsAuthOpen(true);
  };

  // Actions
  const handleAddFood = async (mealType: MealType, food: FoodItem, grams: number) => {
    await saveLogEntry(currentDate, mealType, food, grams);
    await refreshData();
    showToast(`✓ "${food.name}" (${grams}g) añadido a tu diario`);
  };

  const handleAddMultipleFoods = async (
    mealType: MealType,
    items: { food: FoodItem; grams: number }[]
  ) => {
    for (const item of items) {
      await saveLogEntry(currentDate, mealType, item.food, item.grams);
    }
    await refreshData();
    showToast(`✓ ${items.length} alimentos añadidos con Gemini AI`);
  };

  const handleUpdateServing = async (logId: string, grams: number) => {
    await updateLogServing(currentDate, logId, grams);
    await refreshData();
  };

  const handleDeleteLog = async (logId: string) => {
    await deleteLogEntry(currentDate, logId);
    await refreshData();
    showToast('Alimento eliminado');
  };

  const handleSaveProfile = async (updated: Profile) => {
    await saveProfileToStore(updated);
    setProfile(updated);
    showToast('Metas y macros actualizados');
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col font-sans">
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
      <main className="flex-1 max-w-2xl w-full mx-auto px-3.5 pt-4 pb-28 space-y-4">
        {/* Calorie & Macro Progress Card */}
        <MacroSummaryCard
          profile={profile}
          logs={logs}
          onOpenTDEE={handleOpenTDEE}
        />

        {/* Quick Action Feature Highlights */}
        <div className="grid grid-cols-3 gap-2">
          {/* AI Parser */}
          <button
            onClick={() => handleOpenAI()}
            className="p-3 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-emerald-500/20 hover:border-emerald-500/40 text-left transition group shadow-lg"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-white group-hover:text-emerald-400">IA Scan</p>
            <p className="text-[10px] text-slate-400">Gemini 2.5</p>
          </button>

          {/* Barcode Scanner */}
          <button
            onClick={() => handleOpenScanner()}
            className="p-3 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-sky-500/20 hover:border-sky-500/40 text-left transition group shadow-lg"
          >
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <ScanBarcode className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-white group-hover:text-sky-300">Código</p>
            <p className="text-[10px] text-slate-400">Open Food Facts</p>
          </button>

          {/* Macro Scaler */}
          <button
            onClick={() => handleOpenScaler()}
            className="p-3 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-indigo-500/20 hover:border-indigo-500/40 text-left transition group shadow-lg"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <Scale className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-white group-hover:text-indigo-300">Escalar</p>
            <p className="text-[10px] text-slate-400">Fitia Pro Clone</p>
          </button>
        </div>

        {/* Meals Sections: Breakfast, Lunch, Dinner, Snack */}
        <div className="space-y-3.5">
          <MealSection
            mealType="breakfast"
            logs={logs}
            onOpenSearch={handleOpenSearch}
            onOpenScanner={handleOpenScanner}
            onOpenAI={handleOpenAI}
            onOpenScaler={handleOpenScaler}
            onDeleteLog={handleDeleteLog}
            onUpdateServing={handleUpdateServing}
          />

          <MealSection
            mealType="lunch"
            logs={logs}
            onOpenSearch={handleOpenSearch}
            onOpenScanner={handleOpenScanner}
            onOpenAI={handleOpenAI}
            onOpenScaler={handleOpenScaler}
            onDeleteLog={handleDeleteLog}
            onUpdateServing={handleUpdateServing}
          />

          <MealSection
            mealType="dinner"
            logs={logs}
            onOpenSearch={handleOpenSearch}
            onOpenScanner={handleOpenScanner}
            onOpenAI={handleOpenAI}
            onOpenScaler={handleOpenScaler}
            onDeleteLog={handleDeleteLog}
            onUpdateServing={handleUpdateServing}
          />

          <MealSection
            mealType="snack"
            logs={logs}
            onOpenSearch={handleOpenSearch}
            onOpenScanner={handleOpenScanner}
            onOpenAI={handleOpenAI}
            onOpenScaler={handleOpenScaler}
            onDeleteLog={handleDeleteLog}
            onUpdateServing={handleUpdateServing}
          />
        </div>
      </main>

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
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 glass-panel bg-slate-900/95 border border-emerald-500/40 text-emerald-300 text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
