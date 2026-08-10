import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'allow' })

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

const resolveBuildPath = (root, pathname) => {
  const relativePath = decodeURIComponent(pathname).replace(/^\/+/, '')
  const candidate = path.resolve(root, relativePath || 'index.html')
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) return null
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  return path.join(root, 'index.html')
}

const isTransientNavigationError = (error) =>
  /Execution context was destroyed|Cannot find context with specified id|Target page, context or browser has been closed/i.test(
    String(error?.message || error),
  )

const evaluateAcrossNavigation = async (page, callback, transientValue = '') => {
  try {
    return await page.evaluate(callback)
  } catch (error) {
    if (isTransientNavigationError(error)) return transientValue
    throw error
  }
}

test('installed client moves from build A to B without clearing site data', async ({
  context,
  page,
}) => {
  const buildA = path.resolve(process.env.VMECC_PWA_BUILD_A || '')
  const buildB = path.resolve(process.env.VMECC_PWA_BUILD_B || '')
  test.skip(!existsSync(buildA) || !existsSync(buildB), 'Two generated PWA builds are required.')

  let activeRoot = buildA
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1')
    if (url.pathname === '/__pwa_audit/switch') {
      activeRoot = buildB
      response.writeHead(204, { 'Cache-Control': 'no-store' })
      response.end()
      return
    }

    const filePath = resolveBuildPath(activeRoot, url.pathname)
    if (!filePath) {
      response.writeHead(400)
      response.end()
      return
    }
    response.setHeader(
      'Content-Type',
      contentTypes[path.extname(filePath)] || 'application/octet-stream',
    )
    response.setHeader(
      'Cache-Control',
      /(?:index\.html|version\.json|service-worker\.js)$/.test(filePath)
        ? 'no-store, no-cache, must-revalidate'
        : 'public, max-age=31536000, immutable',
    )
    createReadStream(filePath).pipe(response)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const origin = `http://127.0.0.1:${address.port}`

  try {
    await page.route('**/api/**', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthenticated.' }),
      }),
    )
    await page.goto(origin, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload({ waitUntil: 'networkidle' })
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true)

    const initialEntryScript = await page.locator('script[type="module"][src]').getAttribute('src')
    await page.evaluate(async () => {
      const cache = await caches.open('pwa-audit-unrelated-cache')
      await cache.put('/pwa-audit-value', new Response('preserved'))
    })

    await context.request.get(`${origin}/__pwa_audit/switch`)
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))

    await expect
      .poll(() =>
        evaluateAcrossNavigation(page, async () => {
          const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
          return (await response.json()).buildId
        }),
      )
      .toBe('pwa-audit-build-b')
    await expect
      .poll(() =>
        evaluateAcrossNavigation(page, async () => {
          const names = await caches.keys()
          return names.find((name) => name === 'vmecc-app-shell-pwa-audit-build-b') || ''
        }),
      )
      .toBe('vmecc-app-shell-pwa-audit-build-b')
    await expect
      .poll(async () => {
        try {
          return await page.locator('script[type="module"][src]').getAttribute('src')
        } catch (error) {
          if (isTransientNavigationError(error)) return initialEntryScript
          throw error
        }
      })
      .not.toBe(initialEntryScript)

    await expect
      .poll(
        () =>
          evaluateAcrossNavigation(
            page,
            async () => {
              const names = await caches.keys()
              const unrelated = await caches.open('pwa-audit-unrelated-cache')
              return {
                names,
                unrelatedValue: await (await unrelated.match('/pwa-audit-value'))?.text(),
              }
            },
            null,
          ),
        { message: 'Expected both app-shell caches and unrelated site data after the update.' },
      )
      .toEqual({
        names: expect.arrayContaining([
          'vmecc-app-shell-pwa-audit-build-a',
          'vmecc-app-shell-pwa-audit-build-b',
        ]),
        unrelatedValue: 'preserved',
      })
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  }
})
