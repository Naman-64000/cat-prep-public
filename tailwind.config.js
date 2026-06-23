module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(148, 163, 184, 0.2), 0 20px 50px rgba(15, 23, 42, 0.4)'
      },
      colors: {
        appBg: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
        },
        cardBg: {
          default: 'var(--color-bg-card)',
          hover: 'var(--color-bg-card-hover)',
        },
        appBorder: 'var(--color-border)',
        appText: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          disabled: 'var(--color-text-disabled)',
        }
      }
    }
  },
  plugins: []
}
