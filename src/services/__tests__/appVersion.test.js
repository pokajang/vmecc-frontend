import { describe, expect, it, vi } from 'vitest'
import {
  checkForAppUpdate,
  fetchLatestAppVersion,
  isDifferentAppVersion,
  normalizeAppVersionPayload,
} from '../appVersion'

const response = (payload, ok = true) => ({
  ok,
  json: async () => payload,
})

describe('appVersion service', () => {
  it('normalizes valid version payloads', () => {
    expect(
      normalizeAppVersionPayload({
        app: 'vmecc-frontend',
        version: '5.5.0',
        buildId: 'abc123',
        builtAt: '2026-06-23T00:00:00.000Z',
      }),
    ).toEqual({
      app: 'vmecc-frontend',
      version: '5.5.0',
      buildId: 'abc123',
      builtAt: '2026-06-23T00:00:00.000Z',
    })
  })

  it('ignores malformed version payloads', () => {
    expect(normalizeAppVersionPayload(null)).toBeNull()
    expect(normalizeAppVersionPayload([])).toBeNull()
    expect(normalizeAppVersionPayload({ version: '5.5.0' })).toBeNull()
  })

  it('detects different build ids only', () => {
    expect(isDifferentAppVersion({ buildId: 'new-build' }, 'old-build')).toBe(true)
    expect(isDifferentAppVersion({ buildId: 'same-build' }, 'same-build')).toBe(false)
    expect(isDifferentAppVersion({ version: '5.5.0' }, 'same-build')).toBe(false)
  })

  it('fetches version.json without cache', async () => {
    const fetchImpl = vi.fn(async () => response({ buildId: 'new-build' }))

    const result = await fetchLatestAppVersion({ fetchImpl, now: () => 12345 })

    expect(result).toEqual({
      app: '',
      version: '',
      buildId: 'new-build',
      builtAt: '',
    })
    expect(fetchImpl).toHaveBeenCalledWith('/version.json?t=12345', {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    })
  })

  it('returns no update for same build ids', async () => {
    const fetchImpl = vi.fn(async () => response({ buildId: 'current-build' }))

    await expect(
      checkForAppUpdate({ fetchImpl, currentBuildId: 'current-build' }),
    ).resolves.toMatchObject({
      available: false,
      latest: expect.objectContaining({ buildId: 'current-build' }),
    })
  })

  it('returns an update for a newer build id', async () => {
    const fetchImpl = vi.fn(async () => response({ buildId: 'new-build' }))

    await expect(
      checkForAppUpdate({ fetchImpl, currentBuildId: 'current-build' }),
    ).resolves.toMatchObject({
      available: true,
      latest: expect.objectContaining({ buildId: 'new-build' }),
    })
  })

  it('ignores failed version checks', async () => {
    const failingFetch = vi.fn(async () => {
      throw new Error('network down')
    })
    const notOkFetch = vi.fn(async () => response({ buildId: 'new-build' }, false))

    await expect(checkForAppUpdate({ fetchImpl: failingFetch })).resolves.toEqual({
      available: false,
      latest: null,
    })
    await expect(checkForAppUpdate({ fetchImpl: notOkFetch })).resolves.toEqual({
      available: false,
      latest: null,
    })
  })
})
