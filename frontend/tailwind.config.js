/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        aegis: {
          bg: '#000000',
          card: '#0B0B0F',
          border: 'rgba(255,255,255,0.06)',
          red: '#FF3B30',
          blue: '#0A84FF',
          signin: '#007AFF',
          success: '#22C55E',
          warning: '#F59E0B',
          critical: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Satoshi', 'Inter', 'SF Pro Display', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        glass: '0 24px 80px rgba(0,0,0,0.65)',
        neon: '0 0 0 1px rgba(255,59,48,0.35), 0 0 40px rgba(255,59,48,0.35)',
        float: '0 18px 60px rgba(0,0,0,0.55)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(to bottom, rgba(0,0,0,0) 0%, #000000 70%), radial-gradient(circle at 20% 20%, rgba(10,132,255,0.12), transparent 40%), radial-gradient(circle at 80% 0%, rgba(255,59,48,0.10), transparent 35%)',
      },
    },
  },
  plugins: [],
};
