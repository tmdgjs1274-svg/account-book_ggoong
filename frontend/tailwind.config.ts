import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3182F6',
          50: '#EEF6FF',
          100: '#DCEEFF',
          500: '#3182F6',
          600: '#2272EB',
          700: '#1B64D1',
        },
        income: '#00C2A8',
        expense: '#FF6B6B',
        ink: {
          900: '#191F28',
          700: '#333D4B',
          500: '#4E5968',
          300: '#8B95A1',
          100: '#B0B8C1',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F2F4F6',
          border: '#E5E8EB',
        },
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
        '3xl': '28px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(25, 31, 40, 0.04)',
        sheet: '0 -4px 24px rgba(25, 31, 40, 0.12)',
      },
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
