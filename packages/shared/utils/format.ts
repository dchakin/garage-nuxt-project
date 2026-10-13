// Форматирование для вывода в интерфейсе — единственное место, где числа и даты превращаются в текст.
// Без Intl/toLocaleString: результат не зависит от ICU среды (Node, браузер, WebView Capacitor).

/** Неразрывный пробел: разделитель разрядов и между числом и единицей. */
export const NBSP = ' '

const MONTHS_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сент',
  'окт',
  'нояб',
  'дек',
] as const

/** Сегодняшняя дата в локальном часовом поясе, `YYYY-MM-DD`. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** `6800` → `6 800`, `8.62, 1` → `8,6`. Разделитель разрядов — неразрывный пробел. */
export function formatNumber(value: number, fractionDigits = 0): string {
  const [intPart, fracPart] = Math.abs(value).toFixed(fractionDigits).split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  const sign = value < 0 && Number(intPart + (fracPart ?? '')) !== 0 ? '−' : ''
  return sign + grouped + (fracPart ? `,${fracPart}` : '')
}

/** `6800` → `6 800 ₽`. Валюта одна — рубли (мультивалютность вне scope, см. TZ.md). */
export function formatMoney(amount: number): string {
  return `${formatNumber(amount)}${NBSP}₽`
}

/** `87450` → `87 450 км`. */
export function formatMileage(km: number): string {
  return `${formatNumber(km)}${NBSP}км`
}

/** `'2026-09-12'` → `12 сент`; год добавляется, только если он не совпадает с годом `today`. */
export function formatDate(date: string, today: string = todayIso()): string {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number)
  const label = `${day}${NBSP}${MONTHS_SHORT[month - 1]}`
  return String(year) === today.slice(0, 4) ? label : `${label}${NBSP}${year}`
}

/** Выбор формы по числу: `pluralize(39, ['день', 'дня', 'дней'])` → `дней`. */
export function pluralize(count: number, forms: readonly [string, string, string]): string {
  const n = Math.abs(count) % 100
  const last = n % 10
  if (n > 10 && n < 20) return forms[2]
  if (last === 1) return forms[0]
  if (last >= 2 && last <= 4) return forms[1]
  return forms[2]
}

export const DAY_FORMS = ['день', 'дня', 'дней'] as const

/** `39` → `39 дней`. */
export function formatDays(days: number): string {
  return `${formatNumber(days)}${NBSP}${pluralize(days, DAY_FORMS)}`
}
