// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../domain/api/inspectionSiteLocationApi', () => ({
  fetchSiteLocationHierarchy: vi.fn(),
  createSiteLocationNode: vi.fn(),
  updateSiteLocationNode: vi.fn(),
  archiveSiteLocationNode: vi.fn(),
}))

import {
  archiveSiteLocationNode,
  createSiteLocationNode,
  fetchSiteLocationHierarchy,
} from '../domain/api/inspectionSiteLocationApi'
import {
  archiveSiteLocation,
  createSiteLocation,
  getSiteLocationCatalogSnapshot,
  refreshSiteLocationCatalog,
  resetSiteLocationCatalogStoreForTests,
} from '../state/siteLocationCatalogStore'

describe('site location catalogue store', () => {
  beforeEach(() => {
    const values = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
      clear: () => values.clear(),
    })
    localStorage.clear()
    resetSiteLocationCatalogStoreForTests()
    vi.clearAllMocks()
  })

  it('returns cached data while one shared refresh is in flight', async () => {
    localStorage.setItem(
      'inspection_site_location_catalog_cache_v1',
      JSON.stringify({ data: [{ id: 'cached', name: 'Cached Zone' }] }),
    )
    let resolveFetch
    fetchSiteLocationHierarchy.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      }),
    )

    expect(getSiteLocationCatalogSnapshot().hierarchy[0].name).toBe('Cached Zone')
    const first = refreshSiteLocationCatalog()
    const second = refreshSiteLocationCatalog()
    expect(first).toBe(second)
    expect(fetchSiteLocationHierarchy).toHaveBeenCalledTimes(1)

    resolveFetch({ data: [{ id: 'fresh', name: 'Fresh Zone', level: 'zone' }] })
    await first
    expect(getSiteLocationCatalogSnapshot()).toMatchObject({
      hierarchy: [expect.objectContaining({ id: 'fresh' })],
      isStale: false,
    })
  })

  it('publishes create and archive mutations to the shared snapshot', async () => {
    fetchSiteLocationHierarchy.mockResolvedValue({ data: [] })
    createSiteLocationNode.mockResolvedValue({
      data: { id: '9', parentId: null, level: 'zone', name: '9', children: [] },
      created: true,
    })
    archiveSiteLocationNode.mockResolvedValue(true)
    await refreshSiteLocationCatalog()
    await createSiteLocation({ level: 'zone', name: '9' })
    expect(getSiteLocationCatalogSnapshot().hierarchy[0].name).toBe('9')
    await archiveSiteLocation('9')
    expect(getSiteLocationCatalogSnapshot().hierarchy).toEqual([])
  })

  it('does not let an in-flight refresh overwrite a completed mutation', async () => {
    let resolveFetch
    fetchSiteLocationHierarchy.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      }),
    )
    createSiteLocationNode.mockResolvedValue({
      data: { id: '9', parentId: null, level: 'zone', name: '9', children: [] },
      created: true,
    })

    const refresh = refreshSiteLocationCatalog()
    await createSiteLocation({ level: 'zone', name: '9' })
    resolveFetch({ data: [] })
    await refresh

    expect(getSiteLocationCatalogSnapshot().hierarchy).toEqual([
      expect.objectContaining({ id: '9', name: '9' }),
    ])
  })

  it('refreshes a duplicate result so an existing node retains its descendants', async () => {
    fetchSiteLocationHierarchy.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({
      data: [
        {
          id: '1',
          level: 'zone',
          name: '1',
          children: [
            {
              id: '2',
              parentId: '1',
              level: 'area',
              name: 'Workshop',
              children: [{ id: '3', parentId: '2', level: 'location', name: 'Bay', children: [] }],
            },
          ],
        },
      ],
    })
    createSiteLocationNode.mockResolvedValue({
      data: { id: '2', parentId: '1', level: 'area', name: 'Workshop', children: [] },
      created: false,
    })
    await refreshSiteLocationCatalog()

    const result = await createSiteLocation({ level: 'area', parentId: '1', name: 'Workshop' })

    expect(result.created).toBe(false)
    expect(result.data.children).toEqual([expect.objectContaining({ id: '3', name: 'Bay' })])
    expect(fetchSiteLocationHierarchy).toHaveBeenCalledTimes(2)
  })

  it('ignores a superseded refresh even when its fetch does not honor abort', async () => {
    let resolveFirst
    let resolveSecond
    fetchSiteLocationHierarchy
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecond = resolve
        }),
      )

    const first = refreshSiteLocationCatalog()
    const second = refreshSiteLocationCatalog({ force: true })
    resolveSecond({ data: [{ id: 'fresh', name: 'Fresh', level: 'zone' }] })
    await second
    resolveFirst({ data: [{ id: 'stale', name: 'Stale', level: 'zone' }] })
    await first

    expect(getSiteLocationCatalogSnapshot().hierarchy).toEqual([
      expect.objectContaining({ id: 'fresh' }),
    ])
  })

  it('retains cached hierarchy and exposes a retryable network error', async () => {
    localStorage.setItem(
      'inspection_site_location_catalog_cache_v1',
      JSON.stringify({ data: [{ id: '1', name: '1' }] }),
    )
    resetSiteLocationCatalogStoreForTests()
    fetchSiteLocationHierarchy.mockRejectedValue(new Error('Offline'))

    await expect(refreshSiteLocationCatalog()).rejects.toThrow('Offline')
    expect(getSiteLocationCatalogSnapshot()).toMatchObject({
      error: 'Offline',
      isStale: true,
    })
    expect(getSiteLocationCatalogSnapshot().hierarchy[0].name).toBe('1')
  })
})
