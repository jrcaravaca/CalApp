import { DailyLog, FoodItem, Profile, MealType } from './types';
import { supabase, isSupabaseConfigured } from './supabase';
import { translateCommonFoodName } from './foodTranslations';

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
    id: 'f_whole_wheat_bread',
    name: 'Pan integral',
    brand: 'Genérico',
    calories_100g: 247,
    protein_100g: 13,
    carbs_100g: 41,
    fat_100g: 3.4,
    serving_size_g: 40,
  },
  {
    id: 'f_white_bread',
    name: 'Pan blanco',
    brand: 'Genérico',
    calories_100g: 265,
    protein_100g: 9,
    carbs_100g: 49,
    fat_100g: 3.2,
    serving_size_g: 40,
  },
  {
    id: 'f_milk_whole',
    name: 'Leche entera',
    brand: 'Genérico',
    calories_100g: 61,
    protein_100g: 3.2,
    carbs_100g: 4.8,
    fat_100g: 3.3,
    serving_size_g: 200,
  },
  {
    id: 'f_milk_semi',
    name: 'Leche semidesnatada',
    brand: 'Genérico',
    calories_100g: 47,
    protein_100g: 3.3,
    carbs_100g: 4.8,
    fat_100g: 1.6,
    serving_size_g: 200,
  },
  {
    id: 'f_milk_skimmed',
    name: 'Leche desnatada',
    brand: 'Genérico',
    calories_100g: 35,
    protein_100g: 3.4,
    carbs_100g: 5,
    fat_100g: 0.1,
    serving_size_g: 200,
  },
  {
    id: 'f_tomato',
    name: 'Tomate crudo',
    brand: 'Genérico',
    calories_100g: 18,
    protein_100g: 0.9,
    carbs_100g: 3.9,
    fat_100g: 0.2,
    serving_size_g: 120,
  },
  {
    id: 'f_chicken_raw',
    name: 'Pechuga de pollo cruda',
    brand: 'Genérico',
    calories_100g: 120,
    protein_100g: 22.5,
    carbs_100g: 0,
    fat_100g: 2.6,
    serving_size_g: 150,
  },
  {
    id: 'f_turkey_breast',
    name: 'Pechuga de pavo',
    brand: 'Genérico',
    calories_100g: 135,
    protein_100g: 29,
    carbs_100g: 0,
    fat_100g: 1.5,
    serving_size_g: 150,
  },
  {
    id: 'f_beef_lean',
    name: 'Ternera magra',
    brand: 'Genérico',
    calories_100g: 170,
    protein_100g: 26,
    carbs_100g: 0,
    fat_100g: 7,
    serving_size_g: 150,
  },
  {
    id: 'f_pork_tenderloin',
    name: 'Lomo de cerdo',
    brand: 'Genérico',
    calories_100g: 143,
    protein_100g: 21,
    carbs_100g: 0,
    fat_100g: 6,
    serving_size_g: 150,
  },
  {
    id: 'f_salmon',
    name: 'Salmón',
    brand: 'Genérico',
    calories_100g: 208,
    protein_100g: 20.4,
    carbs_100g: 0,
    fat_100g: 13.4,
    serving_size_g: 150,
  },
  {
    id: 'f_tuna',
    name: 'Atún al natural escurrido',
    brand: 'Genérico',
    calories_100g: 116,
    protein_100g: 25.5,
    carbs_100g: 0,
    fat_100g: 0.8,
    serving_size_g: 80,
  },
  {
    id: 'f_potato',
    name: 'Patata cocida',
    brand: 'Genérico',
    calories_100g: 87,
    protein_100g: 1.9,
    carbs_100g: 20.1,
    fat_100g: 0.1,
    serving_size_g: 180,
  },
  {
    id: 'f_pasta_cooked',
    name: 'Pasta cocida',
    brand: 'Genérico',
    calories_100g: 158,
    protein_100g: 5.8,
    carbs_100g: 30.9,
    fat_100g: 0.9,
    serving_size_g: 180,
  },
  {
    id: 'f_lentils_cooked',
    name: 'Lentejas cocidas',
    brand: 'Genérico',
    calories_100g: 116,
    protein_100g: 9,
    carbs_100g: 20.1,
    fat_100g: 0.4,
    serving_size_g: 150,
  },
  {
    id: 'f_chickpeas_cooked',
    name: 'Garbanzos cocidos',
    brand: 'Genérico',
    calories_100g: 164,
    protein_100g: 8.9,
    carbs_100g: 27.4,
    fat_100g: 2.6,
    serving_size_g: 150,
  },
  {
    id: 'f_avocado',
    name: 'Aguacate',
    brand: 'Genérico',
    calories_100g: 160,
    protein_100g: 2,
    carbs_100g: 8.5,
    fat_100g: 14.7,
    serving_size_g: 75,
  },
  {
    id: 'f_apple',
    name: 'Manzana',
    brand: 'Genérico',
    calories_100g: 52,
    protein_100g: 0.3,
    carbs_100g: 13.8,
    fat_100g: 0.2,
    serving_size_g: 160,
  },
  {
    id: 'f_carrot',
    name: 'Zanahoria',
    brand: 'Genérico',
    calories_100g: 41,
    protein_100g: 0.9,
    carbs_100g: 9.6,
    fat_100g: 0.2,
    serving_size_g: 80,
  },
  {
    id: 'f_broccoli',
    name: 'Brócoli',
    brand: 'Genérico',
    calories_100g: 34,
    protein_100g: 2.8,
    carbs_100g: 6.6,
    fat_100g: 0.4,
    serving_size_g: 100,
  },
  {
    id: 'f_onion',
    name: 'Cebolla',
    brand: 'Genérico',
    calories_100g: 40,
    protein_100g: 1.1,
    carbs_100g: 9.3,
    fat_100g: 0.1,
    serving_size_g: 60,
  },
  {
    id: 'f_cucumber',
    name: 'Pepino',
    brand: 'Genérico',
    calories_100g: 15,
    protein_100g: 0.7,
    carbs_100g: 3.6,
    fat_100g: 0.1,
    serving_size_g: 100,
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
        const storedFoods = JSON.parse(stored) as FoodItem[];
        localFoods = [...DEFAULT_FOODS];
        for (const storedFood of storedFoods) {
          const matchingIndex = localFoods.findIndex((food) =>
            food.id === storedFood.id || food.name.toLowerCase() === storedFood.name.toLowerCase()
          );
          const normalizedFood = { ...storedFood, name: translateCommonFoodName(storedFood.name) };
          if (matchingIndex >= 0) localFoods[matchingIndex] = { ...localFoods[matchingIndex], ...normalizedFood };
          else localFoods.push(normalizedFood);
        }
        localStorage.setItem('fitfree_foods', JSON.stringify(localFoods));
      } catch (_) {}
    } else {
      localStorage.setItem('fitfree_foods', JSON.stringify(DEFAULT_FOODS));
    }
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('food_items').select('*').limit(50);
      if (data && !error && data.length > 0) {
        const merged = data.map((food) => ({
          ...food,
          name: translateCommonFoodName(food.name),
        })) as FoodItem[];
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getAuthenticatedUserId(): Promise<string | null> {
  if (!isSupabaseConfigured || typeof window === 'undefined') return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id || null;
}

function readCachedLogs(date: string): DailyLog[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(`fitfree_logs_${date}`) || '[]') as DailyLog[];
  } catch (_) {
    return [];
  }
}

function writeCachedLogs(date: string, logs: DailyLog[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`fitfree_logs_${date}`, JSON.stringify(logs));
  }
}

export async function saveFoodItemToStore(item: FoodItem): Promise<FoodItem> {
  let storedItem = item;
  const userId = await getAuthenticatedUserId();

  if (userId) {
    const payload = {
      name: item.name,
      brand: item.brand || null,
      barcode: item.barcode || null,
      calories_100g: item.calories_100g,
      protein_100g: item.protein_100g,
      carbs_100g: item.carbs_100g,
      fat_100g: item.fat_100g,
      serving_size_g: item.serving_size_g || 100,
    };
    let lookup = supabase.from('food_items').select('*');
    if (item.barcode) lookup = lookup.eq('barcode', item.barcode);
    else if (isUuid(item.id)) lookup = lookup.eq('id', item.id);
    else {
      lookup = lookup.eq('name', item.name);
      lookup = item.brand ? lookup.eq('brand', item.brand) : lookup.is('brand', null);
    }

    const { data: existing, error: lookupError } = await lookup.limit(1).maybeSingle();
    if (lookupError) throw new Error(`No se pudo buscar el alimento: ${lookupError.message}`);

    const result = existing
      ? await supabase.from('food_items').update(payload).eq('id', existing.id).select().single()
      : await supabase.from('food_items').insert(payload).select().single();
    if (result.error || !result.data) {
      throw new Error(`No se pudo guardar el alimento en Supabase: ${result.error?.message || 'sin respuesta'}`);
    }
    storedItem = { ...item, ...result.data } as FoodItem;
  }

  const foods = await getFoodItems();
  const existingIndex = foods.findIndex(
    (food) => (storedItem.barcode && food.barcode === storedItem.barcode) ||
      food.id === storedItem.id ||
      (food.name.toLowerCase() === storedItem.name.toLowerCase() && food.brand === storedItem.brand)
  );
  if (existingIndex >= 0) foods[existingIndex] = { ...foods[existingIndex], ...storedItem };
  else foods.unshift(storedItem);

  if (typeof window !== 'undefined') {
    localStorage.setItem('fitfree_foods', JSON.stringify(foods));
  }
  return storedItem;
}

export async function getLogsForDate(date: string): Promise<DailyLog[]> {
  const localLogs = readCachedLogs(date);
  const userId = await getAuthenticatedUserId();
  if (!userId) return localLogs;

  const { data, error } = await supabase
    .from('daily_logs')
    .select('*, food_item:food_items(*)')
    .eq('user_id', userId)
    .eq('date', date);

  if (error) {
    console.warn('Supabase log load fallback:', error.message);
    return localLogs;
  }

  const logs = (data || []) as DailyLog[];
  writeCachedLogs(date, logs);
  return logs;
}

export async function saveLogEntry(
  date: string,
  meal_type: MealType,
  food: FoodItem,
  serving_grams: number
): Promise<DailyLog> {
  const userId = await getAuthenticatedUserId();
  const storedFood = await saveFoodItemToStore(food);

  if (userId) {
    const { data, error } = await supabase
      .from('daily_logs')
      .insert({ user_id: userId, date, meal_type, food_id: storedFood.id, serving_grams })
      .select('*, food_item:food_items(*)')
      .single();
    if (error || !data) {
      throw new Error(`No se pudo guardar el registro: ${error?.message || 'sin respuesta'}`);
    }
    const savedLog = data as DailyLog;
    writeCachedLogs(date, [...readCachedLogs(date), savedLog]);
    return savedLog;
  }

  const newLog: DailyLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    user_id: 'guest_user',
    date,
    meal_type,
    food_id: storedFood.id,
    serving_grams,
    food_item: storedFood,
  };
  writeCachedLogs(date, [...readCachedLogs(date), newLog]);
  return newLog;
}

export async function updateLogServing(
  date: string,
  logId: string,
  newGrams: number
): Promise<void> {
  const userId = await getAuthenticatedUserId();
  if (userId) {
    const { error } = await supabase
      .from('daily_logs')
      .update({ serving_grams: newGrams })
      .eq('id', logId)
      .eq('user_id', userId);
    if (error) throw new Error(`No se pudo actualizar el registro: ${error.message}`);
  }
  writeCachedLogs(date, readCachedLogs(date).map((log) =>
    log.id === logId ? { ...log, serving_grams: newGrams } : log
  ));
}

export async function deleteLogEntry(date: string, logId: string): Promise<void> {
  const userId = await getAuthenticatedUserId();
  if (userId) {
    const { error } = await supabase
      .from('daily_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', userId);
    if (error) throw new Error(`No se pudo eliminar el registro: ${error.message}`);
  }
  writeCachedLogs(date, readCachedLogs(date).filter((log) => log.id !== logId));
}
