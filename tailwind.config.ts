import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        card: '#111827',
        cardBorder: '#1F2937',
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        macro: {
          protein: '#FB7185', // rose-400
          carbs: '#38BDF8',   // sky-400
          fat: '#FBBF24',     // amber-400
          calories: '#10B981' // emerald-500
        }
      },
      boxShadow: {
        'glow-brand': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
        'glow-protein': '0 0 20px -5px rgba(251, 113, 133, 0.3)',
        'glow-carbs': '0 0 20px -5px rgba(56, 189, 248, 0.3)',
        'glow-fat': '0 0 20px -5px rgba(251, 191, 36, 0.3)',
      }
    },
  },
  plugins: [],
};

export default config;
