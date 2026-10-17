export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Profile {
  id: string;
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  weight_kg?: number;
  height_cm?: number;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'heavy' | 'athlete';
  goal?: 'lose' | 'maintain' | 'gain';
  created_at?: string;
  updated_at?: string;
}

export interface FoodItem {
  id: string;
  barcode?: string | null;
  name: string;
  brand?: string | null;
  calories_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  serving_size_g?: number;
  image_url?: string | null;
  created_at?: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  meal_type: MealType;
  food_id: string;
  serving_grams: number;
  created_at?: string;
  food_item?: FoodItem; // Joined relation
}

export interface ParsedFoodItem {
  name: string;
  serving_grams: number;
  calories_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  notes?: string;
}

export interface AIParsedMealResponse {
  meal_name?: string;
  items: ParsedFoodItem[];
  total_meal_calories: number;
  total_meal_protein: number;
  total_meal_carbs: number;
  total_meal_fat: number;
  analysis_notes?: string;
}
