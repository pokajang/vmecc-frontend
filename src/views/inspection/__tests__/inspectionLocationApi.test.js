import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  hasFireExtinguisherZoneHierarchy,
  loadCachedInspectionLocationCatalog,
  saveCachedInspectionLocationCatalog,
} from '../inspectionLocationApi'

const createStorageMock = () => {
  let store = {}
  return {
    getItem: vi.fn((key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null)),
    setItem: vi.fn((key, value) => {
      store[key] = String(value)
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorageMock())
  vi.stubGlobal('window', { localStorage })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('inspectionLocationApi', () => {
  it('detects recursive fire extinguisher zone hierarchy', () => {
    expect(
      hasFireExtinguisherZoneHierarchy([
        {
          value: '1',
          subLocations: [
            {
              value: 'Manjung Hub',
              subLocations: [{ value: 'Reception' }],
            },
          ],
        },
      ]),
    ).toBe(true)

    expect(
      hasFireExtinguisherZoneHierarchy([
        {
          value: '1',
          children: [
            {
              value: 'Manjung Hub',
              children: [{ value: 'Reception' }],
            },
          ],
        },
      ]),
    ).toBe(true)

    expect(
      hasFireExtinguisherZoneHierarchy([
        {
          value: 'ASIC',
          subLocations: [{ value: 'ASIC' }],
        },
      ]),
    ).toBe(false)
  })

  it('does not load or save stale two-level fire extinguisher location catalogs', () => {
    const staleRows = [
      {
        value: 'ASIC',
        subLocations: [{ value: 'ASIC' }],
      },
    ]

    saveCachedInspectionLocationCatalog('Fire Extinguisher Inspection', staleRows)
    expect(localStorage.setItem).not.toHaveBeenCalled()

    localStorage.setItem(
      'inspection_location_catalog_cache_v3_fire-extinguisher-inspection',
      JSON.stringify({ data: staleRows }),
    )

    expect(loadCachedInspectionLocationCatalog('Fire Extinguisher Inspection')).toEqual([])
    expect(
      localStorage.getItem('inspection_location_catalog_cache_v3_fire-extinguisher-inspection'),
    ).toBeNull()
  })
})
