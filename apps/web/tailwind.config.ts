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
        assistant: {
          white: '#FFFFFF',
          sky: '#38BDF8',
          navy: '#0F1E36',
          black: '#0A0F1D',
          paleSky: '#EBF6FF',
          coolGrey: '#64748B',
          green: '#10B981',
          red: '#F43F5E',
          purple: '#8B5CF6',
          amber: '#F59E0B',
        },
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-hover': '0 14px 40px -4px rgba(31, 38, 135, 0.12)',
        'glass-card': '0 4px 20px -2px rgba(15, 23, 42, 0.04), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
        'glass-glow': '0 0 25px -4px rgba(56, 189, 248, 0.35)',
        'glass-glow-emerald': '0 0 25px -4px rgba(16, 185, 129, 0.35)',
        'glass-glow-rose': '0 0 25px -4px rgba(244, 63, 94, 0.35)',
        'glass-inner': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.8)',
      },
      backdropBlur: {
        'xs': '2px',
        '2xl': '24px',
        '3xl': '32px',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 5s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
