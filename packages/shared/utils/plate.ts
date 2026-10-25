/** Госномер хранится и показывается заглавными буквами: `у911рв` → `У911РВ`. */
export function normalizePlateNumber(value: string): string {
  return value.trim().toUpperCase()
}
