// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import workerSource from '../../../public/service-worker.js?raw'

const loadWorker = ({ caches, fetchImpl }) => {
  const handlers = {}
  const worker = {
    clients: { claim: vi.fn() },
    location: { origin: 'https://vmecc.example' },
    skipWaiting: vi.fn(),
    addEventListener: (type, handler) => {
      handlers[type] = handler
    },
  }

  const runWorker = new Function('self', 'caches', 'fetch', 'Response', 'URL', workerSource)
  runWorker(worker, caches, fetchImpl, Response, URL)

  return handlers
}

const dispatchFetch = (handler, request) => {
  let responsePromise
  const waitUntil = vi.fn()
  handler({
    request,
    respondWith: (promise) => {
      responsePromise = promise
    },
    waitUntil,
  })
  return { responsePromise, waitUntil }
}

describe('service worker fetch fallbacks', () => {
  it('returns a controlled response when navigation and shell cache both fail', async () => {
    const caches = {
      match: vi.fn().mockResolvedValue(undefined),
      open: vi.fn(),
      keys: vi.fn(),
      delete: vi.fn(),
    }
    const handlers = loadWorker({
      caches,
      fetchImpl: vi.fn().mockRejectedValue(new Error('Network unavailable')),
    })

    const { responsePromise } = dispatchFetch(handlers.fetch, {
      method: 'GET',
      mode: 'navigate',
      url: 'https://vmecc.example/dashboard',
    })
    const response = await responsePromise

    expect(response.status).toBe(503)
    expect(await response.text()).toBe('VMECC is temporarily unavailable.')
  })

  it('returns a controlled response when an uncached asset fetch fails', async () => {
    const caches = {
      match: vi.fn().mockResolvedValue(undefined),
      open: vi.fn(),
      keys: vi.fn(),
      delete: vi.fn(),
    }
    const handlers = loadWorker({
      caches,
      fetchImpl: vi.fn().mockRejectedValue(new Error('Network unavailable')),
    })

    const { responsePromise } = dispatchFetch(handlers.fetch, {
      method: 'GET',
      mode: 'same-origin',
      url: 'https://vmecc.example/assets/app.js',
    })
    const response = await responsePromise

    expect(response.status).toBe(503)
  })

  it('does not replace the cached app shell with a failed navigation response', async () => {
    const cache = { put: vi.fn(), addAll: vi.fn() }
    const caches = {
      match: vi.fn().mockResolvedValue(undefined),
      open: vi.fn().mockResolvedValue(cache),
      keys: vi.fn(),
      delete: vi.fn(),
    }
    const handlers = loadWorker({
      caches,
      fetchImpl: vi.fn().mockResolvedValue(new Response('Failed', { status: 500 })),
    })

    const { responsePromise, waitUntil } = dispatchFetch(handlers.fetch, {
      method: 'GET',
      mode: 'navigate',
      url: 'https://vmecc.example/dashboard',
    })
    const response = await responsePromise

    expect(response.status).toBe(500)
    expect(waitUntil).not.toHaveBeenCalled()
    expect(cache.put).not.toHaveBeenCalled()
  })
})
