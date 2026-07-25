import { expect, test } from '@playwright/test'

test.use({
  serviceWorkers: 'allow',
})

test('Manrope is bundled and remains available from the offline asset cache', async ({
  context,
  page,
}) => {
  await page.route('**/api/**', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unauthenticated.' }),
    }),
  )

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload({ waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true)

  const fontFamily = await page
    .locator('body')
    .evaluate((element) => getComputedStyle(element).fontFamily)
  expect(fontFamily).toContain('Manrope Variable')
  await expect(page.locator('html')).toHaveCSS('font-size', '16.8px')
  await expect(page.locator('body')).toHaveCSS('font-weight', '500')

  const fontUrl = await page.evaluate(
    () =>
      performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .find((url) => /manrope-latin-wght-normal.*\.woff2(?:$|\?)/.test(url)) || '',
  )
  expect(fontUrl).toContain('manrope-latin-wght-normal')
  expect(
    await page.evaluate(async (url) => {
      const response = await fetch(url, { cache: 'reload' })
      return response.ok
    }, fontUrl),
  ).toBe(true)

  await expect
    .poll(() =>
      page.evaluate(async (url) => {
        const cacheNames = await caches.keys()
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName)
          if (await cache.match(url)) return true
        }
        return false
      }, fontUrl),
    )
    .toBe(true)

  await context.setOffline(true)
  const cachedFontResponse = await page.evaluate(async (url) => {
    const response = await fetch(url)
    return { ok: response.ok, status: response.status }
  }, fontUrl)
  await context.setOffline(false)

  expect(cachedFontResponse).toEqual({ ok: true, status: 200 })
})
