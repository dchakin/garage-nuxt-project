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
  'knob',
  'plate-bg',
  'plate-text',
  'shadow',
] as const

const SPACING_TOKENS = [1, 2, 3, 4, 5, 6, 8, 10, 12] as const

/** Шкала шрифтов макета («02 · Типографика»): размер / межстрочный / трекинг / начертание. */
const FONT_SIZES = {
  display: ['2.5rem', { lineHeight: '1.1', letterSpacing: '-1px', fontWeight: '700' }],
  amount: ['2.125rem', { lineHeight: '1.1', letterSpacing: '-0.8px', fontWeight: '700' }],
  h1: ['1.625rem', { lineHeight: '1.2', letterSpacing: '-0.5px', fontWeight: '700' }],
  h2: ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.2px', fontWeight: '600' }],
  h3: ['1.0625rem', { lineHeight: '1.3', fontWeight: '600' }],
  body: ['1rem', { lineHeight: '1.45' }],
  sm: ['0.875rem', { lineHeight: '1.4' }],
  xs: ['0.75rem', { lineHeight: '1.3' }],
  // Только подписи вкладок нижней панели и счётчики на них
  '2xs': ['0.6875rem', { lineHeight: '1.3' }],
} satisfies NonNullable<Config['theme']>['fontSize']

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
    // Шкала Tailwind (text-base/lg/xl…) заменена шкалой макета
    fontSize: FONT_SIZES,
    fontFamily: {
      // Из бандла (@fontsource, main.css) — свой origin, без CDN
      sans: ['"Onest Variable"', 'system-ui', 'sans-serif'],
      // Только госномер и VIN
      mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
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
      // Появление полосы категории («Anim · Графики расходов»: scaleX 0 → 1, dur-slow · enter)
      keyframes: { 'grow-x': { from: { transform: 'scaleX(0)' } } },
      animation: { 'grow-x': 'grow-x var(--dur-slow) var(--ease-enter) both' },
    },
  },
} satisfies Partial<Config>
