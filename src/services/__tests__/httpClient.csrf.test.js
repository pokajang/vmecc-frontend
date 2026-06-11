import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, clearCsrfToken, getCsrfToken, setCsrfToken } from '../api/httpClient'

const jsonResponse = (payload, init = {}) =>
  new Response(JSON.stringify(payload), {
    status: init.status || 200,
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  })

describe('httpClient CSRF handling', () => {
  beforeEach(() => {
    clearCsrfToken()
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    })
  })

  it('sends the csrf token on unsafe API requests', async () => {
    setCsrfToken('csrf-123')
    fetch.mockResolvedValueOnce(jsonResponse({ ok: true }))

    await apiRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][1].headers['X-CSRF-Token']).toBe('csrf-123')
  })

  it('refreshes session once and retries unsafe requests after 419', async () => {
    setCsrfToken('old-token')
    fetch
      .mockResolvedValueOnce(jsonResponse({ message: 'CSRF token mismatch.' }, { status: 419 }))
      .mockResolvedValueOnce(jsonResponse({ csrf_token: 'new-token', user: { id: 1 } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    const result = await apiRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Retried' }),
    })

    expect(result).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(fetch.mock.calls[0][1].headers['X-CSRF-Token']).toBe('old-token')
    expect(fetch.mock.calls[1][0]).toContain('/auth/session')
    expect(fetch.mock.calls[2][1].headers['X-CSRF-Token']).toBe('new-token')
    expect(getCsrfToken()).toBe('new-token')
  })
})
