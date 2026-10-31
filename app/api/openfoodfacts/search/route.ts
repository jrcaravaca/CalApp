import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() || '';

  if (!query || query.length > 120) {
    return NextResponse.json({ error: 'La búsqueda debe tener entre 1 y 120 caracteres.' }, { status: 400 });
  }

  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '10',
    lc: 'es',
    fields: 'code,product_name,product_name_es,product_name_en,brands,nutriments,serving_quantity,image_front_small_url,image_url',
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`, {
        headers: {
          'User-Agent': 'FitFreeApp/1.0 (fitfree.app - OpenFoodFacts integration)',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        return NextResponse.json(await response.json());
      }

      if (attempt === 1 || (response.status !== 429 && response.status < 500)) {
        console.warn('Open Food Facts search returned status:', response.status);
        return NextResponse.json({ error: 'Open Food Facts no está disponible.' }, { status: 502 });
      }
    } catch (error) {
      if (attempt === 1) {
        console.error('Error fetching Open Food Facts search:', error);
        return NextResponse.json({ error: 'No se pudo completar la búsqueda en Open Food Facts.' }, { status: 502 });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  return NextResponse.json({ error: 'Open Food Facts no está disponible.' }, { status: 502 });
}