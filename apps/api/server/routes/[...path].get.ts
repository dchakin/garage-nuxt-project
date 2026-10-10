import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import {
  SPA_FALLBACK_FILES,
  getCacheControl,
  getMimeType,
  looksLikeFile,
  resolveWebFilePath,
} from '../utils/webStatic'

async function findFile(candidate: string): Promise<string | null> {
  const info = await stat(candidate).catch(() => null)
  return info?.isFile() ? candidate : null
}

// Раздача собранного клиента (apps/web) с SPA-фолбэком. Включается заданием NUXT_WEB_DIST_DIR;
// /api/** обслуживают собственные роуты, неизвестный /api/** — честный 404 JSON, а не index.html.
export default defineEventHandler(async (event) => {
  const root = String(useRuntimeConfig().webDistDir || '')
  const urlPath = event.path.split('?')[0]
  if (!root || urlPath.startsWith('/api/')) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const requested = resolveWebFilePath(root, urlPath)
  let file = requested ? await findFile(requested) : null
  if (!file && requested) file = await findFile(path.join(requested, 'index.html'))
  if (!file && !looksLikeFile(urlPath)) {
    for (const name of SPA_FALLBACK_FILES) {
      file = await findFile(path.join(path.resolve(root), name))
      if (file) break
    }
  }
  if (!file) throw createError({ statusCode: 404, statusMessage: 'Not Found' })

  setResponseHeader(event, 'content-type', getMimeType(file))
  setResponseHeader(event, 'cache-control', getCacheControl(urlPath))
  return sendStream(event, createReadStream(file))
})
