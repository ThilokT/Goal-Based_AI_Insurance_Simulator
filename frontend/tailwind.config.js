/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange:        '#F36F21',
          'orange-light':'#F8A56A',
          'orange-dark': '#C85A10',
          navy:          '#003366',
          'navy-light':  '#004080',
          'navy-dark':   '#001F3F',
          gold:          '#C9A84C',
          cream:         '#FFF8F0',
        },
        surface: {
          DEFAULT:      '#FFFFFF',
          subtle:       '#F9FAFB',
          muted:        '#F3F4F6',
          dark:         '#111827',
          'dark-subtle':'#1F2937',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        xl:   '0.75rem',
        '2xl':'1rem',
        '3xl':'1.5rem',
      },
      boxShadow: {
        card:        '0 2px 12px 0 rgba(0,0,0,0.08)',
        'card-hover':'0 8px 32px 0 rgba(0,0,0,0.14)',
        orange:      '0 4px 20px 0 rgba(243,111,33,0.25)',
      },
      animation: {
        'fade-in':   'fadeIn 0.4s ease-out',
        'slide-up':  'slideUp 0.4s ease-out',
        'slide-right':'slideRight 0.4s ease-out',
        pulse2:      'pulse2 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn:     { from:{ opacity:'0' }, to:{ opacity:'1' } },
        slideUp:    { from:{ opacity:'0', transform:'translateY(16px)' }, to:{ opacity:'1', transform:'translateY(0)' } },
        slideRight: { from:{ opacity:'0', transform:'translateX(-16px)' }, to:{ opacity:'1', transform:'translateX(0)' } },
        pulse2:     { '0%,100%':{ opacity:'1' }, '50%':{ opacity:'0.4' } },
      },
    },
  },
  plugins: [],
}
