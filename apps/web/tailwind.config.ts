import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#ECEEF8',
          card: '#FFFFFF',
          sidebar: '#FFFFFF',
          border: '#E8EAF5',
          'border-subtle': '#F0F2FA',
        },
        palette: {
          canvas: '#ECEEF8',
          card: '#FFFFFF',
          border: '#E8EAF5',
          dark: '#18181B',
          'dark-pill': '#1E1B2E',
          purple: '#7C3AED',
          'purple-light': '#EDE9FE',
          'purple-hover': '#6D28D9',
          coral: '#FF647C',
          'coral-light': '#FFE4E8',
          peach: '#FFF7ED',
          'peach-border': '#FFEDD5',
          mint: '#10B981',
          'mint-light': '#ECFDF5',
          lavender: '#F4F4FD',
          'lavender-border': '#E0E7FF',
          text: '#18181B',
          muted: '#717182',
        },
        primary: {
          50: '#F4F4FD',
          100: '#EDE9FE',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
        },
        assistant: {
          white: '#FFFFFF',
          sky: '#7C3AED',
          navy: '#18181B',
          black: '#0F0E17',
          paleSky: '#EDE9FE',
          coolGrey: '#717182',
          green: '#10B981',
          red: '#FF647C',
          purple: '#7C3AED',
          amber: '#F59E0B',
        },
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'sm': '0 2px 4px 0 rgba(0, 0, 0, 0.04)',
        'md': '0 4px 10px -1px rgba(0, 0, 0, 0.05)',
        'lg': '0 10px 25px -3px rgba(0, 0, 0, 0.06)',
        'card': '0 8px 30px 0 rgba(24, 27, 46, 0.04)',
        'card-hover': '0 14px 35px 0 rgba(24, 27, 46, 0.07)',
        'pill': '0 2px 8px 0 rgba(24, 24, 27, 0.15)',
      },
      borderRadius: {
        'card': '24px',
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px',
      },
    },
  },
  plugins: [],
};

export default config;
