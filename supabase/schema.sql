-- ==============================================================================
-- FitFree Database Schema & Row Level Security (RLS)
-- Free Clone of Fitia Premium Food Tracker
-- ==============================================================================

-- 1. PROFILES TABLE
-- Stores user targets and calorie / macronutrient goals
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_calories INT NOT NULL DEFAULT 2000,
  protein_g INT NOT NULL DEFAULT 150,
  carbs_g INT NOT NULL DEFAULT 200,
  fat_g INT NOT NULL DEFAULT 65,
  weight_kg FLOAT,
  height_cm FLOAT,
  activity_level TEXT DEFAULT 'moderate',
  goal TEXT DEFAULT 'maintain', -- 'lose', 'maintain', 'gain'
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. FOOD ITEMS TABLE
-- Stores shared food directory, barcode items, and AI-recognized foods
CREATE TABLE IF NOT EXISTS public.food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  brand TEXT,
  calories_100g FLOAT NOT NULL DEFAULT 0,
  protein_100g FLOAT NOT NULL DEFAULT 0,
  carbs_100g FLOAT NOT NULL DEFAULT 0,
  fat_100g FLOAT NOT NULL DEFAULT 0,
  serving_size_g FLOAT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index barcode for ultra-fast lookup
CREATE INDEX IF NOT EXISTS idx_food_items_barcode ON public.food_items(barcode);
CREATE INDEX IF NOT EXISTS idx_food_items_name ON public.food_items USING gin(to_tsvector('english', name));

-- 3. DAILY LOGS TABLE
-- Stores individual food intake entries per meal and date
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_id UUID NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
  serving_grams FLOAT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index logs for fast querying by user and date
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs(user_id, date);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can strictly manage only their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- Food Items: Shared database of nutritional items
-- Anyone authenticated can view and insert food items (e.g. barcode cache, new foods)
DROP POLICY IF EXISTS "Anyone authenticated can view food items" ON public.food_items;
CREATE POLICY "Anyone authenticated can view food items"
  ON public.food_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert food items" ON public.food_items;
CREATE POLICY "Authenticated users can insert food items"
  ON public.food_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update food items" ON public.food_items;
CREATE POLICY "Authenticated users can update food items"
  ON public.food_items FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Daily Logs: Users can strictly view and edit only their own meal entries
DROP POLICY IF EXISTS "Users can view own daily logs" ON public.daily_logs;
CREATE POLICY "Users can view own daily logs"
  ON public.daily_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own daily logs" ON public.daily_logs;
CREATE POLICY "Users can insert own daily logs"
  ON public.daily_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily logs" ON public.daily_logs;
CREATE POLICY "Users can update own daily logs"
  ON public.daily_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own daily logs" ON public.daily_logs;
CREATE POLICY "Users can delete own daily logs"
  ON public.daily_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-create profile trigger on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, daily_calories, protein_g, carbs_g, fat_g)
  VALUES (NEW.id, 2000, 150, 200, 65)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- INITIAL SEED DATA (Common verified pantry staples)
-- ==============================================================================
INSERT INTO public.food_items (name, brand, calories_100g, protein_100g, carbs_100g, fat_100g, serving_size_g)
VALUES
  ('Chicken Breast (Grilled)', 'Whole Foods', 165, 31.0, 0.0, 3.6, 150),
  ('Rolled Oats', 'Quaker', 389, 16.9, 66.3, 6.9, 50),
  ('Whole Large Egg', 'Farm Fresh', 143, 12.6, 0.7, 9.5, 60),
  ('Egg Whites', 'Liquid Egg', 52, 10.9, 0.7, 0.2, 100),
  ('White Basmati Rice (Cooked)', 'Generic', 130, 2.7, 28.2, 0.3, 150),
  ('Atlantic Salmon (Baked)', 'Generic', 208, 20.4, 0.0, 13.4, 150),
  ('Greek Yogurt 0% Fat', 'Fage', 57, 10.3, 4.0, 0.0, 170),
  ('Banana (Raw)', 'Generic', 89, 1.1, 22.8, 0.3, 120),
  ('Avocado', 'Hass', 160, 2.0, 8.5, 14.7, 75),
  ('Whey Protein Isolate', 'Optimum Nutrition', 375, 80.0, 5.0, 3.0, 30),
  ('Extra Virgin Olive Oil', 'Generic', 884, 0.0, 0.0, 100.0, 15),
  ('Peanut Butter (Smooth)', 'Generic', 588, 25.0, 20.0, 50.0, 32),
  ('Whole Wheat Bread', 'Bimbo', 247, 13.0, 41.0, 3.4, 40),
  ('Sweet Potato (Baked)', 'Generic', 90, 2.0, 20.7, 0.2, 150),
  ('Broccoli (Steamed)', 'Generic', 35, 2.4, 7.2, 0.4, 100)
ON CONFLICT DO NOTHING;
