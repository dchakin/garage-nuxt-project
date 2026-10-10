import path from 'node:path'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

/** SPA-оболочка, которую `nuxt generate` кладёт для маршрутов без собственного HTML. */
export const SPA_FALLBACK_FILES = ['200.html', 'index.html']

export function getMimeType(file: string): string {
  return MIME_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
}

/**
 * Превращает URL-путь в абсолютный путь файла внутри `root`.
 * Возвращает null, если путь выходит за корень (path traversal) или содержит NUL.
 */
export function resolveWebFilePath(root: string, urlPath: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(urlPath)
  } catch {
    return null
  }
  if (decoded.includes('\0')) return null

  const absoluteRoot = path.resolve(root)
  const target = path.resolve(absoluteRoot, '.' + path.posix.normalize('/' + decoded))
  return target === absoluteRoot || target.startsWith(absoluteRoot + path.sep) ? target : null
}

/** Ресурсы с хэшем в имени кэшируются навсегда, остальное (HTML, sw.js, манифест) — всегда перепроверяется. */
export function getCacheControl(urlPath: string): string {
  return urlPath.startsWith('/_nuxt/') ? 'public, max-age=31536000, immutable' : 'no-cache'
}

/** Путь выглядит как запрос файла (`/x.js`), а не как маршрут SPA (`/cars/1`). */
export function looksLikeFile(urlPath: string): boolean {
  return path.posix.extname(urlPath) !== ''
}
