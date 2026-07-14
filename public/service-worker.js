const CACHE_NAME = 'vmecc-app-shell-v7'
const APP_SHELL = [
  '/',
  '/index.html',
  '/inspection',
  '/manifest.json?v=20260714',
  '/favicon.svg?v=20260714',
  '/favicon.ico?v=20260714',
]
const NEVER_CACHE_PATHS = ['/api/', '/sanctum/', '/version.json']

const isNeverCached = (url) =>
  NEVER_CACHE_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(path))

const refreshAppShellCache = async () => {
  const cache = await caches.open(CACHE_NAME)
  await cache.addAll(APP_SHELL)
  return { cacheName: CACHE_NAME, shellCount: APP_SHELL.length }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  )
  self.clients.claim()
})

self.addEventListener('message', (event) => {
  const type = event?.data?.type
  const port = event?.ports?.[0]
  if (type === 'VMECC_GET_OFFLINE_CACHE_STATUS') {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((cache) =>
          Promise.all(APP_SHELL.map((path) => cache.match(path))).then((matches) => ({
            cacheName: CACHE_NAME,
            shellCount: APP_SHELL.length,
            cachedShellCount: matches.filter(Boolean).length,
          })),
        )
        .then((payload) => port?.postMessage({ ok: true, payload }))
        .catch((error) =>
          port?.postMessage({ ok: false, error: error?.message || 'Cache status unavailable.' }),
        ),
    )
  }
  if (type === 'VMECC_REFRESH_OFFLINE_ASSETS') {
    event.waitUntil(
      refreshAppShellCache()
        .then((payload) => port?.postMessage({ ok: true, payload }))
        .catch((error) =>
          port?.postMessage({ ok: false, error: error?.message || 'Unable to refresh cache.' }),
        ),
    )
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || isNeverCached(url)) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || caches.match('/'))),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request).then((response) => {
        const shouldCache =
          response.ok &&
          (url.pathname.startsWith('/assets/') ||
            url.pathname.startsWith('/icons/') ||
            url.pathname === '/manifest.json' ||
            url.pathname === '/favicon.svg' ||
            url.pathname === '/favicon.ico')

        if (shouldCache) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }

        return response
      })
    }),
  )
})
