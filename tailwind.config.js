/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './content/**/*.mdx',
  ],
  theme: {
    extend: {
      colors: {
        saffron: { DEFAULT: '#E8952E', dark: '#C97A1A', light: '#F5B04A' },
        emerald: { DEFAULT: '#1A7A52', dark: '#145C3D', light: '#E8F5EF' },
        forest: { DEFAULT: '#1A2E24', light: '#2D4A3A' },
        cream: { DEFAULT: '#FBF7F2', dark: '#F3EBE0' },
        gold: { DEFAULT: '#D4A82A' },
        mist: { DEFAULT: '#E8EFEA' },
      },
      boxShadow: {
        soft: '0 2px 12px rgba(26, 46, 36, 0.06)',
        card: '0 4px 24px rgba(26, 46, 36, 0.1)',
        glow: '0 8px 32px rgba(26, 122, 82, 0.12)',
        inner: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      backgroundImage: {
        'hero-mesh':
          'radial-gradient(at 80% 20%, rgba(232, 149, 46, 0.12) 0px, transparent 50%), radial-gradient(at 20% 80%, rgba(26, 122, 82, 0.1) 0px, transparent 50%)',
        'section-fade': 'linear-gradient(180deg, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 100%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      fontFamily: {
        serif: ['var(--font-lora)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['3.5rem', { lineHeight: '1.15', fontWeight: '600' }],
        h1: ['2.25rem', { lineHeight: '1.2', fontWeight: '600' }],
        h2: ['1.75rem', { lineHeight: '1.3', fontWeight: '600' }],
        h3: ['1.25rem', { lineHeight: '1.4', fontWeight: '500' }],
        body: ['1rem', { lineHeight: '1.7' }],
        small: ['0.875rem', { lineHeight: '1.5' }],
        label: ['0.75rem', { lineHeight: '1', letterSpacing: '0.07em' }],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
