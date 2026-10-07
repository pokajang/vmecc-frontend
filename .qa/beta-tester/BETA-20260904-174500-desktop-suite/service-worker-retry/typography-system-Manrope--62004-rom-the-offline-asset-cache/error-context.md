# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: typography-system.spec.js >> Manrope is bundled and remains available from the offline asset cache
- Location: tests\e2e\typography-system.spec.js:7:5

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: page.evaluate: Test timeout of 90000ms exceeded.
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | 
  3  | test.use({
  4  |   serviceWorkers: 'allow',
  5  | })
  6  | 
  7  | test('Manrope is bundled and remains available from the offline asset cache', async ({
  8  |   context,
  9  |   page,
  10 | }) => {
  11 |   await page.route('**/api/**', (route) =>
  12 |     route.fulfill({
  13 |       status: 401,
  14 |       contentType: 'application/json',
  15 |       body: JSON.stringify({ message: 'Unauthenticated.' }),
  16 |     }),
  17 |   )
  18 | 
  19 |   await page.goto('/', { waitUntil: 'domcontentloaded' })
> 20 |   await page.evaluate(() => navigator.serviceWorker.ready)
     |              ^ Error: page.evaluate: Test timeout of 90000ms exceeded.
  21 |   await page.reload({ waitUntil: 'networkidle' })
  22 |   await page.evaluate(() => document.fonts.ready)
  23 |   await expect
  24 |     .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
  25 |     .toBe(true)
  26 | 
  27 |   const fontFamily = await page
  28 |     .locator('body')
  29 |     .evaluate((element) => getComputedStyle(element).fontFamily)
  30 |   expect(fontFamily).toContain('Manrope Variable')
  31 |   await expect(page.locator('html')).toHaveCSS('font-size', '16px')
  32 |   await expect(page.locator('body')).toHaveCSS('font-weight', '500')
  33 |   await page.setViewportSize({ width: 390, height: 844 })
  34 |   await expect(page.locator('html')).toHaveCSS('font-size', '16px')
  35 | 
  36 |   const fontUrl = await page.evaluate(
  37 |     () =>
  38 |       performance
  39 |         .getEntriesByType('resource')
  40 |         .map((entry) => entry.name)
  41 |         .find((url) => /manrope-latin-wght-normal.*\.woff2(?:$|\?)/.test(url)) || '',
  42 |   )
  43 |   expect(fontUrl).toContain('manrope-latin-wght-normal')
  44 |   expect(
  45 |     await page.evaluate(async (url) => {
  46 |       const response = await fetch(url, { cache: 'reload' })
  47 |       return response.ok
  48 |     }, fontUrl),
  49 |   ).toBe(true)
  50 | 
  51 |   await expect
  52 |     .poll(() =>
  53 |       page.evaluate(async (url) => {
  54 |         const cacheNames = await caches.keys()
  55 |         for (const cacheName of cacheNames) {
  56 |           const cache = await caches.open(cacheName)
  57 |           if (await cache.match(url)) return true
  58 |         }
  59 |         return false
  60 |       }, fontUrl),
  61 |     )
  62 |     .toBe(true)
  63 | 
  64 |   await context.setOffline(true)
  65 |   const cachedFontResponse = await page.evaluate(async (url) => {
  66 |     const response = await fetch(url)
  67 |     return { ok: response.ok, status: response.status }
  68 |   }, fontUrl)
  69 |   await context.setOffline(false)
  70 | 
  71 |   expect(cachedFontResponse).toEqual({ ok: true, status: 200 })
  72 | })
  73 | 
```