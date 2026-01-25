/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Health status colors
                'health-healthy-from': '#065f46',
                'health-healthy-to': '#047857',
                'health-damaged-from': '#92400e',
                'health-damaged-to': '#d97706',
                'health-critical-from': '#7f1d1d',
                'health-critical-to': '#dc2626',
                'health-dead': '#1f2937',

                // Special state colors
                'invulnerable-from': '#e5e5e5',
                'invulnerable-to': '#ffffff',
                'bloodlust-from': '#450a0a',
                'bloodlust-to': '#dc2626',
            },
            keyframes: {
                pulse: {
                    '0%, 100%': { opacity: '0.8' },
                    '50%': { opacity: '1' }
                },
                heartbeat: {
                    '0%, 100%': { transform: 'scale(1)' },
                    '10%': { transform: 'scale(1.1)' },
                    '20%': { transform: 'scale(1)' }
                },
                glow: {
                    '0%, 100%': { opacity: '0.4' },
                    '50%': { opacity: '0.8' }
                }
            },
            animation: {
                'pulse': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'heartbeat': 'heartbeat 0.8s ease-in-out infinite',
                'glow': 'glow 1s ease-in-out infinite'
            },
            boxShadow: {
                'glow-green': '0 0 20px rgba(16, 185, 129, 0.4)',
                'glow-amber': '0 0 20px rgba(245, 158, 11, 0.4)',
                'glow-red': '0 0 30px rgba(239, 68, 68, 0.6)',
                'glow-white': '0 0 30px rgba(255, 255, 255, 0.6)',
            }
        },
    },
    plugins: [],
}