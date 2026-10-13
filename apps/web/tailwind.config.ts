import type { Config } from 'tailwindcss'

/** Цвета макета (design/garage.pen, «01 · Цвет»): имя класса = имя токена, значение — в tokens.css. */
const COLOR_TOKENS = [
  'bg',
  'surface',
  'surface-2',
  'surface-3',
  'border',
  'border-strong',
  'text',
  'text-2',
  'text-3',
  'inverse',
  'on-inverse',
  'inverse-accent',
  'inverse-success',
  'accent',
  'accent-pressed',
  'accent-soft',
  'accent-text',
  'on-accent',
  'focus-ring',
  'danger',
  'danger-pressed',
  'danger-soft',
  'danger-text',
  'on-danger',
  'warning',
  'warning-soft',
  'warning-text',
  'success',
  'success-soft',
  'success-text',
  'info',
  'info-soft',
  'info-text',
  'status-overdue',
  'status-overdue-soft',
  'status-overdue-text',
  'status-soon',
  'status-soon-soft',
  'status-soon-text',
  'status-ok',
  'status-ok-soft',
  'status-ok-text',
  'status-inactive',
  'status-inactive-soft',
  'status-inactive-text',
  'type-service',
  'type-service-soft',
  'type-repair',
  'type-repair-soft',
  'type-replace',
  'type-replace-soft',
  'type-purchase',
  'type-purchase-soft',
  'type-other',
  'type-other-soft',
  'chart-bar',
  'chart-bar-muted',
  'scrim',
  'shadow',
] as const

const SPACING_TOKENS = [1, 2, 3, 4, 5, 6, 8, 10, 12] as const

const tokenVars = (names: readonly (string | number)[], prefix = '') =>
  Object.fromEntries(names.map((name) => [`${prefix}${name}`, `var(--${prefix}${name})`]))

export default {
  darkMode: 'class',
  theme: {
    // Палитра Tailwind заменена целиком: slate-*, indigo-*, white и т. п. не генерируются,
    // цвет можно взять только из токенов
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      ...tokenVars(COLOR_TOKENS),
    },
    borderRadius: {
      none: '0',
      xs: 'var(--r-xs)',
      sm: 'var(--r-sm)',
      DEFAULT: 'var(--r-sm)',
      md: 'var(--r-md)',
      lg: 'var(--r-lg)',
      xl: 'var(--r-xl)',
      full: 'var(--r-full)',
    },
    boxShadow: {
      none: 'none',
      sm: 'var(--shadow-sm)',
      DEFAULT: 'var(--shadow-sm)',
      md: 'var(--shadow-md)',
      lg: 'var(--shadow-lg)',
    },
    extend: {
      // Значения по умолчанию в Tailwind ссылаются на удалённые gray/blue — без этого
      // голый `border` получил бы currentColor
      borderColor: { DEFAULT: 'var(--border)' },
      ringColor: { DEFAULT: 'var(--focus-ring)' },
      spacing: {
        ...tokenVars(SPACING_TOKENS, 'sp-'),
        'tap-min': 'var(--tap-min)',
        'tap-lg': 'var(--tap-lg)',
        'control-h': 'var(--control-h)',
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
        enter: 'var(--ease-enter)',
        exit: 'var(--ease-exit)',
      },
    },
  },
} satisfies Partial<Config>
