# FitFree 🥗⚡ (Fitia Premium Free Clone)

**FitFree** es una aplicación web-first y mobile-friendly de seguimiento de alimentos y macronutrientes, inspirada en las funciones de Fitia Premium (Escalador de porciones, escáner de alimentos con Inteligencia Artificial, escáner de código de barras y calculadora TDEE).

Desarrollada con **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Lucide Icons**, **Supabase (PostgreSQL + RLS)** y la API de **Google Gemini (`gemini-2.5-flash`)** con integración de **Open Food Facts**.

---

## 🚀 Características Principales

1. **Dashboard Nutricional estilo Fitia**:
   - Anillo interactivo SVG con calorías restantes (`Meta - Consumidas`).
   - Barras de progreso de macronutrientes en tiempo real:
     - 🥩 **Proteína** (Rosa / Coral)
     - 🍞 **Carbohidratos** (Azul Cielo)
     - 🥑 **Grasas** (Ámbar)
   - Agrupación por comidas: **Desayuno**, **Almuerzo**, **Cena** y **Snacks/Meriendas**.
   - Edición rápida de gramos in-line y eliminación de registros.

2. **🤖 IA Meal Parser con Google Gemini (`gemini-2.5-flash`)**:
   - Reconocimiento de comidas mediante **texto en lenguaje natural** o **fotografía del plato**.
   - **100% Server-Side:** Todas las llamadas a Gemini se ejecutan de forma segura en `app/api/parse-food/route.ts`. La clave `GEMINI_API_KEY` nunca se expone al cliente.
   - Retorna un JSON estructurado con ingredientes individuales, pesos estimados en gramos, valores nutricionales por 100g y cálculo total de la porción.
   - Botón de 1-click para registrar todos los ingredientes identificados en el diario.

3. **📷 Escáner de Código de Barras en Navegador**:
   - Integración de cámara web / móvil utilizando `html5-qrcode`.
   - Consulta instantánea a la API mundial de **Open Food Facts** (`https://world.openfoodfacts.org/api/v2/product/{barcode}.json`).
   - Selector de cámara frontal/trasera, selector de porción en gramos y pestaña alternativa de **código manual** con muestras precargadas (Nutella, Oreo, Coca-Cola Zero, Avena).
   - Guarda los alimentos escaneados en la base de datos de Supabase.

4. **⚖️ Escalador de Macros (Macro Scaler - Fitia Signature Feature)**:
   - Calculadora de porciones proporcional basada en la fórmula:
     $$S = \frac{\text{Meta}}{\text{Actual}}$$
   - Permite escalar cualquier comida por **Calorías objetivo**, **Proteína objetivo** o **Multiplicador personalizado**.
   - Tabla comparativa en vivo: gramos antes vs. después, calorías y macronutrientes resultantes.
   - Aplica las nuevas porciones escaladas directamente al diario con un solo toque.

5. **🎯 Calculadora TDEE & Metas**:
   - Fórmula **Mifflin-St Jeor** para hombres y mujeres.
   - Factores de actividad: Sedentario, Ligero, Moderado, Intenso, Atleta.
   - Ajuste automático según objetivo: Pérdida de grasa (-20%), Mantenimiento o Ganancia muscular (+15%).
   - Distribuciones predefinidas (Alta Proteína, Balanceada, Low Carb) o ajuste manual de gramos.

6. **📱 Progressive Web App (PWA) & Despliegue en Netlify**:
   - Soporte "Añadir a la pantalla de inicio" con `public/manifest.json` e iconos vectoriales.
   - Configuración lista para producción con `netlify.toml` y `@netlify/plugin-nextjs`.

---

## 🔒 Seguridad y Buenas Prácticas

- **Aislamiento de Claves de API**: `GEMINI_API_KEY` sin prefijo `NEXT_PUBLIC_`, restringida exclusivamente a ejecución en Node.js server-side.
- **Git Hygiene**: `.gitignore` configurado explícitamente para ignorar `.env*`, `.env*.local`, `.next` y dependencias.
- **Row Level Security (RLS)**: Migración SQL completa en `supabase/schema.sql` con políticas estrictas basadas en `auth.uid() = user_id` o `auth.uid() = id`.
- **Modo Offline / Invitado**: Si el usuario navega sin registrarse o antes de migrar la base de datos, la aplicación cuenta con fallback automático en `localStorage` para garantizar interactividad inmediata.

---

## 🛠️ Estructura del Proyecto

```
CalApp/
├── app/
│   ├── api/
│   │   └── parse-food/
│   │       └── route.ts          # Endpoint seguro Gemini 2.5 Flash
│   ├── globals.css               # Estilos globales, diseño Fitia y efectos glass
│   ├── layout.tsx                # Layout raíz con configuración PWA
│   └── page.tsx                  # Dashboard principal reactivo
├── components/
│   ├── AIFoodModal.tsx           # Modal de escaneo de comida por IA (Foto/Texto)
│   ├── AuthModal.tsx             # Modal de autenticación Supabase y modo invitado
│   ├── BarcodeScannerModal.tsx   # Modal de escaneo de código de barras
│   ├── FoodSearchModal.tsx       # Búsqueda de alimentos en BD y Open Food Facts
│   ├── MacroScalerModal.tsx      # Escalador de porciones proporcional
│   ├── MacroSummaryCard.tsx      # Anillo de calorías y desglose de macros
│   ├── MealSection.tsx           # Sección de cada comida (Desayuno, Almuerzo...)
│   └── Navbar.tsx                # Barra superior y navegación móvil
├── lib/
│   ├── openfoodfacts.ts          # Cliente API Open Food Facts
│   ├── storage.ts                # Sincronización local y fallback offline
│   ├── supabase.ts               # Inicializador y sanitizador Supabase
│   ├── tdee.ts                   # Cálculo BMR, TDEE y fórmulas de macros
│   └── types.ts                  # Tipos TypeScript
├── public/
│   ├── manifest.json             # Manifiesto PWA
│   ├── icon-192.svg              # Icono PWA 192x192
│   └── icon-512.svg              # Icono PWA 512x512
├── supabase/
│   └── schema.sql                # Migración SQL con RLS, triggers y seed data
├── netlify.toml                  # Configuración de despliegue en Netlify
├── .env.local.example            # Plantilla de variables de entorno
└── package.json
```

---

## 📦 Puesta en Marcha Local

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Configurar variables de entorno en `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   GEMINI_API_KEY=tu-gemini-api-key
   ```

3. Ejecutar en desarrollo:
   ```bash
   npm run dev
   ```
   Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## 🗄️ Aplicar Migración en Supabase

1. Accede a tu proyecto en el [Dashboard de Supabase](https://supabase.com/dashboard).
2. Ve a la sección **SQL Editor**.
3. Copia y pega el contenido de [`supabase/schema.sql`](file:///home/jose-ramon/Proyectos/CalApp/supabase/schema.sql) y pulsa **Run**.
4. Se crearán automáticamente las tablas `profiles`, `food_items`, `daily_logs`, las políticas de seguridad RLS y los alimentos base.

---

## 🌐 Despliegue en Netlify

El proyecto incluye el archivo `netlify.toml` preconfigurado:
1. Conecta tu repositorio de GitHub / GitLab en Netlify.
2. Agrega las siguientes variables de entorno en **Site Settings > Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
3. Netlify compilará automáticamente el proyecto usando el comando:
   ```bash
   npm run build
   ```
