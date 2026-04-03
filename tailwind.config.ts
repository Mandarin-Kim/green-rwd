import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0D9488', light: '#14B8A6', dark: '#0F766E' },
        navy: { DEFAULT: '#0F172A', light: '#1E293B', lighter: '#334155' },
        accent: { DEFAULT: '#F59E0B', light: '#FBBF24' },
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        surface: { DEFAULT: '#F8FAFC', card: '#FFFFFF', dark: '#0F172A' },
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
