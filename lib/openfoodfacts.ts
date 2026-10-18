import { FoodItem } from './types';
import { translateCommonFoodName } from './foodTranslations';

export interface OFFProductResponse {
  status: number;
  code: string;
  product?: {
    product_name?: string;
    product_name_es?: string;
    product_name_en?: string;
    brands?: string;
    image_front_small_url?: string;
    image_url?: string;
    serving_quantity?: number | string;
    nutriments?: {
      'energy-kcal_100g'?: number;
      'energy-kcal'?: number;
      'energy_100g'?: number;
      proteins_100g?: number;
      carbohydrates_100g?: number;
      fat_100g?: number;
    };
  };
}

export async function fetchProductByBarcode(barcode: string): Promise<FoodItem | null> {
  const cleanBarcode = barcode.trim().replace(/\s+/g, '');
  if (!cleanBarcode) return null;

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json?lc=es`, {
      headers: {
        'User-Agent': 'FitFreeApp/1.0 (fitfree.app - OpenFoodFacts integration)',
      },
    });

    if (!res.ok) {
      console.warn('Open Food Facts returned status:', res.status);
      return null;
    }

    const data: OFFProductResponse = await res.json();
    if (data.status !== 1 || !data.product) {
      return null;
    }

    const p = data.product;
    const nutriments = p.nutriments || {};

    let calories = nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'];
    if (calories === undefined && nutriments['energy_100g']) {
      // convert kJ to kcal
      calories = Math.round(nutriments['energy_100g'] / 4.184);
    }

    const protein = nutriments.proteins_100g ?? 0;
    const carbs = nutriments.carbohydrates_100g ?? 0;
    const fat = nutriments.fat_100g ?? 0;

    const name = translateCommonFoodName(p.product_name_es || p.product_name || p.product_name_en || 'Producto sin nombre');
    const brand = p.brands || null;
    const serving = Number(p.serving_quantity) || 100;
    const imageUrl = p.image_front_small_url || p.image_url || null;

    return {
      id: `off_${cleanBarcode}`,
      barcode: cleanBarcode,
      name,
      brand,
      calories_100g: Math.round((calories || 0) * 10) / 10,
      protein_100g: Math.round(protein * 10) / 10,
      carbs_100g: Math.round(carbs * 10) / 10,
      fat_100g: Math.round(fat * 10) / 10,
      serving_size_g: serving,
      image_url: imageUrl,
    };
  } catch (error) {
    console.error('Error fetching from Open Food Facts:', error);
    return null;
  }
}

export async function searchOpenFoodFacts(query: string): Promise<FoodItem[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  try {
    const params = new URLSearchParams({
      search_terms: cleanQuery,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '10',
      lc: 'es',
      fields: 'code,product_name,product_name_es,product_name_en,brands,nutriments,serving_quantity,image_front_small_url,image_url',
    });
    const url = `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'FitFreeApp/1.0 (fitfree.app - OpenFoodFacts integration)',
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!data.products || !Array.isArray(data.products)) return [];

    return data.products
      .filter((p: any) => (p.product_name_es || p.product_name || p.product_name_en) && p.nutriments)
      .map((p: any) => {
        const nutriments = p.nutriments || {};
        let calories = nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'];
        if (calories === undefined && nutriments['energy_100g']) {
          calories = Math.round(nutriments['energy_100g'] / 4.184);
        }

        return {
          id: p.code ? `off_${p.code}` : `off_search_${Math.random().toString(36).substring(7)}`,
          barcode: p.code || null,
          name: translateCommonFoodName(p.product_name_es || p.product_name || p.product_name_en || 'Producto sin nombre'),
          brand: p.brands || null,
          calories_100g: Math.round((calories || 0) * 10) / 10,
          protein_100g: Math.round((nutriments.proteins_100g || 0) * 10) / 10,
          carbs_100g: Math.round((nutriments.carbohydrates_100g || 0) * 10) / 10,
          fat_100g: Math.round((nutriments.fat_100g || 0) * 10) / 10,
          serving_size_g: Number(p.serving_quantity) || 100,
          image_url: p.image_front_small_url || p.image_url || null,
        };
      });
  } catch (error) {
    console.error('Error searching Open Food Facts:', error);
    return [];
  }
}
