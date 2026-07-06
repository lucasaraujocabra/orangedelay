/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // OrangeDelay identity
        void: '#000000',
        surface: '#0A0A0A',
        surface2: '#111111',
        edge: '#1C1C1C',
        energy: '#FF5E1F',
        'energy-dim': '#B33E12',
        live: '#22C55E',
        muted: '#6B6B6B'
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        pixel: '2px'
      }
    }
  },
  plugins: []
}
