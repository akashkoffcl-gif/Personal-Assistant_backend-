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
          navy: '#142B4A',
          black: '#111827',
          paleSky: '#EAF7FF',
          coolGrey: '#64748B',
          green: '#16A34A',
          red: '#DC2626',
        },
      },
    },
  },
  plugins: [],
};

export default config;

