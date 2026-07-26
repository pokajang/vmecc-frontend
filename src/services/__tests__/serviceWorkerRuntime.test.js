// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import workerTemplate from '../../service-worker/service-worker.template.js?raw'

const workerSource = workerTemplate
  .replaceAll('__VMECC_SW_BUILD_ID__', JSON.stringify('test-build'))
  .replaceAll('__VMECC_SW_PRECACHE_ASSETS__', JSON.stringify(['/assets/index-test.js']))

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

  const runWorker = new Function(
    'self',
    'caches',
    'fetch',
    'Response',
    'Request',
    'URL',
    workerSource,
  )
  const WorkerRequest = function (input, options) {
    return new Request(new URL(input, worker.location.origin), options)
  }
  runWorker(worker, caches, fetchImpl, Response, WorkerRequest, URL)

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
  it('waits for an explicit message before activating an installed update', async () => {
    const cache = { addAll: vi.fn().mockResolvedValue(undefined) }
    const caches = {
      match: vi.fn(),
      open: vi.fn().mockResolvedValue(cache),
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn(),
    }
    const handlers = loadWorker({ caches, fetchImpl: vi.fn() })
    const waitUntil = vi.fn()

    handlers.install({ waitUntil })
    expect(waitUntil).toHaveBeenCalledTimes(1)
    await waitUntil.mock.calls[0][0]
    expect(cache.addAll).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://vmecc.example/assets/index-test.js' }),
      ]),
    )

    handlers.message({ data: { type: 'VMECC_SKIP_WAITING' }, waitUntil })
    expect(waitUntil).toHaveBeenCalledTimes(2)
  })

  it('keeps one previous shell and only removes older VMECC caches during activation', async () => {
    const caches = {
      match: vi.fn(),
      open: vi.fn(),
      keys: vi
        .fn()
        .mockResolvedValue([
          'vmecc-app-shell-older',
          'vmecc-app-shell-previous',
          'vmecc-app-shell-test-build',
          'other-cache',
        ]),
      delete: vi.fn().mockResolvedValue(true),
    }
    const handlers = loadWorker({ caches, fetchImpl: vi.fn() })
    let activation

    handlers.activate({
      waitUntil: (promise) => {
        activation = promise
      },
    })
    await activation

    expect(caches.delete).toHaveBeenCalledWith('vmecc-app-shell-older')
    expect(caches.delete).not.toHaveBeenCalledWith('vmecc-app-shell-previous')
    expect(caches.delete).not.toHaveBeenCalledWith('other-cache')
  })

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
