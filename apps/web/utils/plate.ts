/** Российский госномер: буква, три цифры, две буквы + регион из 2–3 цифр */
const PLATE_PATTERN = /^([А-ЯA-Z]\d{3}[А-ЯA-Z]{2})\s*\|?\s*(\d{2,3})$/

/** «а123вс 77» → `{ number: 'А123ВС', region: '77' }`; нестандартный номер — целиком в `number`. */
export function splitPlate(plateNumber: string): { number: string; region: string | null } {
  const normalized = plateNumber.trim().toUpperCase()
  const match = PLATE_PATTERN.exec(normalized)
  return match ? { number: match[1]!, region: match[2]! } : { number: normalized, region: null }
}
