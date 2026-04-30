/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                display: ["'Fraunces'", 'ui-serif', 'Georgia', 'serif'],
                sans: ["'Manrope'", 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
                serif: ["'Fraunces'", 'ui-serif', 'Georgia', 'serif'],
            },
            colors: {
                'dark-bg':   '#05060A',
                'dark-card': '#0B0D16',
                'gold': {
                    50:  '#F6F0E3',
                    100: '#E9DCC2',
                    200: '#DCC9A6',
                    300: '#CDB88A',
                    400: '#BCA374',
                    500: '#A89060',
                    600: '#8F784E',
                    700: '#745F3D',
                    800: '#54452B',
                    900: '#3A2F1F',
                },
                'midnight': {
                    100: '#D2D8FF',
                    200: '#B9C2FF',
                    400: '#6F7AE6',
                    500: '#4A55C6',
                    600: '#2B2F6B',
                    700: '#1C1F4F',
                    800: '#14163A',
                    900: '#0B0C1F',
                },
                'ember': {
                    300: '#EE9777',
                    400: '#E07A5F',
                    500: '#C66A4F',
                    600: '#B85A45',
                    800: '#6E2F26',
                },
                accent: '#A89060',
                'accent-hover': '#CDB88A',
            },
            boxShadow: {
                'cin-1':       '0 10px 24px rgba(0,0,0,0.35)',
                'cin-2':       '0 18px 46px rgba(0,0,0,0.45)',
                'cin-3':       '0 32px 80px rgba(0,0,0,0.55)',
                'gold-glow':   '0 0 0 1px rgba(168,144,96,0.10), 0 0 28px rgba(168,144,96,0.10)',
                'gold-bloom':  '0 0 0 1px rgba(205,184,138,0.18), 0 0 60px rgba(205,184,138,0.12)',
                'ember-glow':  '0 0 0 1px rgba(224,122,95,0.18), 0 0 36px rgba(224,122,95,0.14)',
                'inset-hairline': 'inset 0 1px 0 rgba(255,255,255,0.05)',
            },
            animation: {
                'float':        'float 7s ease-in-out infinite',
                'sway':         'sway 9s ease-in-out infinite',
                'pulse-subtle': 'pulse-subtle 4s ease-in-out infinite',
                'breathe':      'breathe 22s cubic-bezier(0.2,0.8,0.2,1) infinite',
                'aurora':       'aurora 16s ease-in-out infinite',
                'shimmer-line': 'shimmerLine 5s linear infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%':      { transform: 'translateY(-14px)' },
                },
                sway: {
                    '0%, 100%': { transform: 'translateX(0px) rotate(0deg)' },
                    '50%':      { transform: 'translateX(8px) rotate(0.6deg)' },
                },
                'pulse-subtle': {
                    '0%, 100%': { opacity: '1' },
                    '50%':      { opacity: '0.86' },
                },
                breathe: {
                    '0%, 100%': { opacity: '0.10' },
                    '50%':      { opacity: '0.20' },
                },
                aurora: {
                    '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)', opacity: '0.55' },
                    '50%':      { transform: 'translate3d(2%,1%,0) scale(1.05)', opacity: '0.75' },
                },
                shimmerLine: {
                    '0%':   { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            letterSpacing: {
                'tightest': '-0.04em',
                'cinema':   '-0.025em',
                'wider':    '0.06em',
                'editorial':'0.18em',
            },
            lineHeight: {
                'tightest': '0.95',
                'cinema':   '1.04',
            },
        },
    },
    plugins: [],
}
