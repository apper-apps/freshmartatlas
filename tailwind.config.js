/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2E7D32',
        secondary: '#FF6F00',
        accent: '#4CAF50',
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336',
        info: '#2196F3',
        surface: '#FFFFFF',
        background: '#F5F5F5',
      },
      fontFamily: {
        display: ['Poppins', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 8px rgba(0, 0, 0, 0.1)',
        premium: '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'quantity-change': 'quantity-pulse 0.3s ease-in-out',
        'scale-102': 'scale-102 0.2s ease-in-out',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'quantity-pulse': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)', boxShadow: '0 0 0 4px rgba(76, 175, 80, 0.3)' },
          '100%': { transform: 'scale(1)' },
        },
        'scale-102': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}