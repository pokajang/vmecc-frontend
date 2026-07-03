import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadCachedFireExtinguisherCatalog,
  normalizeFireExtinguisherCatalogRows,
  saveCachedFireExtinguisherCatalog,
} from '../inspectionFireExtinguisherApi'

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
    clear: vi.fn(() => {
      store = {}
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

describe('inspectionFireExtinguisherApi', () => {
  it('treats seeded rows loaded from cache as editable and deletable by default', () => {
    const [row] = normalizeFireExtinguisherCatalogRows([
      {
        id: 101,
        source: 'seed',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        idLocNo: 'ADO-001',
        barcodeNo: 'EE042021Y544896',
        feType: 'DP 6KG',
      },
    ])

    expect(row).toMatchObject({
      equipmentSource: 'seed',
      canEdit: true,
      canDelete: true,
    })
  })

  it('still respects explicit backend restrictions when flags are false', () => {
    const [row] = normalizeFireExtinguisherCatalogRows([
      {
        id: 102,
        source: 'seed',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        idLocNo: 'ADO-002',
        barcodeNo: 'EE042021Y544897',
        feType: 'CO2 5KG',
        canEdit: false,
        canDelete: false,
      },
    ])

    expect(row).toMatchObject({
      canEdit: false,
      canDelete: false,
    })
  })

  it('preserves explicit false restrictions in the current cache version', () => {
    saveCachedFireExtinguisherCatalog('Manjung Hub', 'Reception', [
      {
        id: 103,
        source: 'seed',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        idLocNo: 'ADO-003',
        barcodeNo: 'EE042021Y544898',
        feType: 'DP 4KG',
        canEdit: false,
        canDelete: false,
      },
    ])

    const [row] = loadCachedFireExtinguisherCatalog('Manjung Hub', 'Reception')

    expect(row).toMatchObject({
      canEdit: false,
      canDelete: false,
    })
  })

  it('migrates old cached seeded rows away from legacy protected flags', () => {
    localStorage.setItem(
      'inspection_fire_extinguisher_catalog_cache_v1_manjung hub_reception',
      JSON.stringify({
        data: [
          {
            id: 104,
            source: 'seed',
            mainLocation: 'Manjung Hub',
            subLocation: 'Reception',
            idLocNo: 'ADO-004',
            barcodeNo: 'EE042021Y544899',
            feType: 'DP 4KG',
            canEdit: false,
            canDelete: false,
          },
        ],
      }),
    )

    const [row] = loadCachedFireExtinguisherCatalog('Manjung Hub', 'Reception')

    expect(row).toMatchObject({
      equipmentSource: 'seed',
      canEdit: true,
      canDelete: true,
    })
  })
})
