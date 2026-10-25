import { expect, test } from './helpers/test'
import { snap } from './helpers/snap'

interface ManifestIcon {
  src: string
  sizes: string
  purpose?: string
}

test('манифест ссылается на иконки нового логотипа, все они отдаются', async ({
  page,
  request,
}) => {
  const response = await request.get('/manifest.webmanifest')
  expect(response.ok()).toBe(true)
  const manifest = (await response.json()) as { icons: ManifestIcon[] }

  const sizes = manifest.icons.map((icon) => icon.sizes)
  expect(sizes).toEqual(expect.arrayContaining(['64x64', '192x192', '512x512']))
  expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true)

  for (const icon of manifest.icons) {
    const iconResponse = await request.get(`/${icon.src}`)
    expect(iconResponse.ok(), icon.src).toBe(true)
    expect(iconResponse.headers()['content-type']).toContain('image/png')
  }

  const logo = await request.get('/logo.svg')
  expect(await logo.text()).toContain('#2648E0')

  // fullPage-скриншот самостоятельного SVG-документа в Chromium зависает — показываем через <img>
  await page.goto('/login')
  await page.evaluate(() => {
    document.body.innerHTML = '<img src="/logo.svg" alt="Логотип" width="192" height="192" />'
  })
  await page.locator('img[alt="Логотип"]').waitFor()
  await page.waitForFunction(() => {
    const image = document.querySelector('img')
    return Boolean(image?.complete && image.naturalWidth > 0)
  })
  await snap(page, 'logo')
})
