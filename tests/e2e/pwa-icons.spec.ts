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

  await page.goto('/logo.svg')
  await snap(page, 'logo')
})
