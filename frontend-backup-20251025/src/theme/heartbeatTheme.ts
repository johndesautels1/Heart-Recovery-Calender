export const heartbeatTheme = {
  colors: {
    panel: 'rgba(255,255,255,0.85)',
    background: '#f3f6fb',
    textPrimary: '#1a1b23',
    heading: '#1e2753',
    border: '#e0e7ff',
    shadow: '0 8px 32px 0 rgba(31, 38, 135, 0.12)',
    confirmed: '#4ade80',
    requested: '#60a5fa',
    urgent: '#f87171',
    mealInSpec: '#bbf7d0',
    mealOutOfSpec: '#fca5a5',
    // Additional colors for health tracking
    vitalsNormal: '#4ade80',
    vitalsWarning: '#fbbf24',
    vitalsCritical: '#ef4444',
    medicationActive: '#8b5cf6',
    medicationInactive: '#9ca3af',
    exerciseCompleted: '#10b981',
    exerciseMissed: '#f59e0b',
  },
  borderRadius: '14px',
  font: {
    family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  transitions: {
    fast: '150ms ease-in-out',
    base: '250ms ease-in-out',
    slow: '350ms ease-in-out',
  },
  breakpoints: {
    mobile: '640px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1280px',
  },
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  }
};