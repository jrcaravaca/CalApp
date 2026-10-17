import { DailyLog, FoodItem, Profile, MealType } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

const DEFAULT_PROFILE: Profile = {
  id: 'guest_user',
  daily_calories: 2200,
  protein_g: 165,
  carbs_g: 220,
  fat_g: 70,
  weight_kg: 75,
  height_cm: 178,
  activity_level: 'moderate',
  goal: 'maintain',
};

const DEFAULT_FOODS: FoodItem[] = [
  {
    id: 'f_chicken',
    name: 'Pechuga de Pollo (A la plancha)',
    brand: 'Fresco',
    calories_100g: 165,
    protein_100g: 31.0,
    carbs_100g: 0.0,
    fat_100g: 3.6,
    serving_size_g: 150,
  },
  {
    id: 'f_oats',
    name: 'Copos de Avena Integral',
    brand: 'Quaker',
    calories_100g: 389,
    protein_100g: 16.9,
    carbs_100g: 66.3,
    fat_100g: 6.9,
    serving_size_g: 50,
  },
  {
    id: 'f_egg',
    name: 'Huevo Entero Grande',
    brand: 'Granja',
    calories_100g: 143,
    protein_100g: 12.6,
    carbs_100g: 0.7,
    fat_100g: 9.5,
    serving_size_g: 60,
  },
  {
    id: 'f_rice',
    name: 'Arroz Basmati Cocido',
    brand: 'Sundari',
    calories_100g: 130,
    protein_100g: 2.7,
    carbs_100g: 28.2,
    fat_100g: 0.3,
    serving_size_g: 150,
  },
  {
    id: 'f_banana',
    name: 'Plátano / Banana',
    brand: 'Canarias',
    calories_100g: 89,
    protein_100g: 1.1,
    carbs_100g: 22.8,
    fat_100g: 0.3,
    serving_size_g: 120,
  },
  {
    id: 'f_olive_oil',
    name: 'Aceite de Oliva Virgen Extra',
    brand: 'Carbonell',
    calories_100g: 884,
    protein_100g: 0.0,
    carbs_100g: 0.0,
    fat_100g: 100.0,
    serving_size_g: 15,
  },
  {
    id: 'f_greek_yogurt',
    name: 'Yogur Griego 0% Grasa',
    brand: 'Fage',
    calories_100g: 57,
    protein_100g: 10.3,
    carbs_100g: 4.0,
    fat_100g: 0.0,
    serving_size_g: 170,
  },
  {
    id: 'f_whey',
    name: 'Proteína Whey Isolate',
    brand: 'Optimum Nutrition',
    calories_100g: 375,
    protein_100g: 80.0,
    carbs_100g: 5.0,
    fat_100g: 3.0,
    serving_size_g: 30,
  },
];

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function loadProfile(): Promise<Profile> {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;

  // Try Supabase if authenticated
  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (data && !error) {
          localStorage.setItem('fitfree_profile', JSON.stringify(data));
          return data as Profile;
        }
      }
    } catch (e) {
      console.warn('Supabase profile load fallback:', e);
    }
  }

  // Local fallback
  const stored = localStorage.getItem('fitfree_profile');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (_) {}
  }
  return DEFAULT_PROFILE;
}

export async function saveProfileToStore(profile: Profile): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem('fitfree_profile', JSON.stringify(profile));

  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        await supabase
          .from('profiles')
          .upsert({ ...profile, id: authData.user.id, updated_at: new Date().toISOString() });
      }
    } catch (e) {
      console.warn('Failed to sync profile to Supabase:', e);
    }
  }
}

export async function getFoodItems(): Promise<FoodItem[]> {
  let localFoods: FoodItem[] = DEFAULT_FOODS;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('fitfree_foods');
    if (stored) {
      try {
        localFoods = JSON.parse(stored);
      } catch (_) {}
    } else {
      localStorage.setItem('fitfree_foods', JSON.stringify(DEFAULT_FOODS));
    }
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('food_items').select('*').limit(50);
      if (data && !error && data.length > 0) {
        const merged = [...data];
        for (const lf of localFoods) {
          if (!merged.some((m) => m.name.toLowerCase() === lf.name.toLowerCase())) {
            merged.push(lf);
          }
        }
        return merged;
      }
    } catch (_) {}
  }

  return localFoods;
}

export async function saveFoodItemToStore(item: FoodItem): Promise<FoodItem> {
  const foods = await getFoodItems();
  const existingIndex = foods.findIndex(
    (f) => (item.barcode && f.barcode === item.barcode) || f.id === item.id
  );

  let updatedFoods: FoodItem[];
  if (existingIndex >= 0) {
    foods[existingIndex] = { ...foods[existingIndex], ...item };
    updatedFoods = foods;
  } else {
    updatedFoods = [item, ...foods];
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('fitfree_foods', JSON.stringify(updatedFoods));
  }

  // Also try saving to Supabase if available
  if (isSupabaseConfigured) {
    try {
      await supabase.from('food_items').upsert({
        name: item.name,
        brand: item.brand,
        barcode: item.barcode || null,
        calories_100g: item.calories_100g,
        protein_100g: item.protein_100g,
        carbs_100g: item.carbs_100g,
        fat_100g: item.fat_100g,
        serving_size_g: item.serving_size_g || 100,
      });
    } catch (e) {
      console.warn('Supabase food save fallback:', e);
    }
  }

  return item;
}

export async function getLogsForDate(date: string): Promise<DailyLog[]> {
  let localLogs: DailyLog[] = [];
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`fitfree_logs_${date}`);
    if (raw) {
      try {
        localLogs = JSON.parse(raw);
      } catch (_) {}
    } else if (date === getTodayDateString()) {
      // Seed initial sample meal for today if fresh user
      localLogs = [
        {
          id: 'log_seed_1',
          user_id: 'guest_user',
          date,
          meal_type: 'breakfast',
          food_id: 'f_oats',
          serving_grams: 60,
          food_item: DEFAULT_FOODS[1],
        },
        {
          id: 'log_seed_2',
          user_id: 'guest_user',
          date,
          meal_type: 'breakfast',
          food_id: 'f_banana',
          serving_grams: 110,
          food_item: DEFAULT_FOODS[4],
        },
        {
          id: 'log_seed_3',
          user_id: 'guest_user',
          date,
          meal_type: 'lunch',
          food_id: 'f_chicken',
          serving_grams: 180,
          food_item: DEFAULT_FOODS[0],
        },
        {
          id: 'log_seed_4',
          user_id: 'guest_user',
          date,
          meal_type: 'lunch',
          food_id: 'f_rice',
          serving_grams: 200,
          food_item: DEFAULT_FOODS[3],
        },
        {
          id: 'log_seed_5',
          user_id: 'guest_user',
          date,
          meal_type: 'lunch',
          food_id: 'f_olive_oil',
          serving_grams: 10,
          food_item: DEFAULT_FOODS[5],
        },
      ];
      localStorage.setItem(`fitfree_logs_${date}`, JSON.stringify(localLogs));
    }
  }

  // Attempt Supabase fetch if signed in
  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data, error } = await supabase
          .from('daily_logs')
          .select('*, food_item:food_items(*)')
          .eq('user_id', authData.user.id)
          .eq('date', date);

        if (data && !error && data.length > 0) {
          return data as DailyLog[];
        }
      }
    } catch (_) {}
  }

  return localLogs;
}

export async function saveLogEntry(
  date: string,
  meal_type: MealType,
  food: FoodItem,
  serving_grams: number
): Promise<DailyLog> {
  await saveFoodItemToStore(food);

  const newLog: DailyLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    user_id: 'guest_user',
    date,
    meal_type,
    food_id: food.id,
    serving_grams,
    food_item: food,
  };

  if (typeof window !== 'undefined') {
    const logs = await getLogsForDate(date);
    const updated = [...logs, newLog];
    localStorage.setItem(`fitfree_logs_${date}`, JSON.stringify(updated));
  }

  // Try Supabase insert
  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        newLog.user_id = authData.user.id;
        const { data, error } = await supabase
          .from('daily_logs')
          .insert({
            user_id: authData.user.id,
            date,
            meal_type,
            food_id: food.id,
            serving_grams,
          })
          .select('*, food_item:food_items(*)')
          .single();

        if (data && !error) {
          return data as DailyLog;
        }
      }
    } catch (e) {
      console.warn('Supabase log insert fallback:', e);
    }
  }

  return newLog;
}

export async function updateLogServing(
  date: string,
  logId: string,
  newGrams: number
): Promise<void> {
  if (typeof window !== 'undefined') {
    const logs = await getLogsForDate(date);
    const updated = logs.map((l) => (l.id === logId ? { ...l, serving_grams: newGrams } : l));
    localStorage.setItem(`fitfree_logs_${date}`, JSON.stringify(updated));
  }

  if (isSupabaseConfigured) {
    try {
      await supabase.from('daily_logs').update({ serving_grams: newGrams }).eq('id', logId);
    } catch (_) {}
  }
}

export async function deleteLogEntry(date: string, logId: string): Promise<void> {
  if (typeof window !== 'undefined') {
    const logs = await getLogsForDate(date);
    const filtered = logs.filter((l) => l.id !== logId);
    localStorage.setItem(`fitfree_logs_${date}`, JSON.stringify(filtered));
  }

  if (isSupabaseConfigured) {
    try {
      await supabase.from('daily_logs').delete().eq('id', logId);
    } catch (_) {}
  }
}
