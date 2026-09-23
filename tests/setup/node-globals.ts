import { createError } from 'h3'

// server/utils/*.ts используют createError как авто-импорт Nitro (без явного
// import), поэтому при прямом импорте этих файлов в тестах его нужно
// положить в globalThis вручную — иначе ReferenceError при вызове.
if (!(globalThis as any).createError) {
  ;(globalThis as any).createError = createError
}
