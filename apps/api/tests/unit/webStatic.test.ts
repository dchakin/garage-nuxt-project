import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getCacheControl,
  getMimeType,
  looksLikeFile,
  resolveWebFilePath,
} from '../../server/utils/webStatic'

const root = path.resolve('/srv/web')

describe('resolveWebFilePath', () => {
  it('разрешает пути внутри корня', () => {
    expect(resolveWebFilePath(root, '/_nuxt/app.js')).toBe(path.join(root, '_nuxt', 'app.js'))
    expect(resolveWebFilePath(root, '/')).toBe(root)
  })

  it('не выпускает за корень: «..» схлопываются, NUL и битая кодировка отклоняются', () => {
    expect(resolveWebFilePath(root, '/../etc/passwd')).toBe(path.join(root, 'etc', 'passwd'))
    expect(resolveWebFilePath(root, '/%2e%2e/%2e%2e/etc/passwd')).toBe(
      path.join(root, 'etc', 'passwd'),
    )
    expect(resolveWebFilePath(root, '/a%00b')).toBeNull()
    expect(resolveWebFilePath(root, '/%E0%A4%A')).toBeNull()
  })
})

describe('вспомогательные функции раздачи', () => {
  it('getMimeType по расширению', () => {
    expect(getMimeType('a.js')).toContain('javascript')
    expect(getMimeType('a.webmanifest')).toContain('manifest')
    expect(getMimeType('a.unknown')).toBe('application/octet-stream')
  })

  it('getCacheControl: immutable только для /_nuxt/', () => {
    expect(getCacheControl('/_nuxt/a.js')).toContain('immutable')
    expect(getCacheControl('/sw.js')).toBe('no-cache')
  })

  it('looksLikeFile отличает файлы от маршрутов SPA', () => {
    expect(looksLikeFile('/x.js')).toBe(true)
    expect(looksLikeFile('/cars/1')).toBe(false)
  })
})
