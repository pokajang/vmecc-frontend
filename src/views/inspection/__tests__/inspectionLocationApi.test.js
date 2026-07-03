import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
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

describe('inspectionLocationApi', () => {
  it('keeps cached seeded main and sub-locations actionable by default', () => {
    saveCachedInspectionLocationCatalog('Fire Extinguisher Inspection', [
      {
        id: 10,
        value: 'Manjung Hub',
        title: 'Manjung Hub',
        source: 'seed',
        subLocations: [
          {
            id: 11,
            value: 'Reception',
            title: 'Reception',
            source: 'seed',
          },
        ],
      },
    ])

    const [mainRow] = loadCachedInspectionLocationCatalog('Fire Extinguisher Inspection')
    const [subRow] = mainRow.subLocations

    expect(mainRow).toMatchObject({
      id: 10,
      value: 'Manjung Hub',
      title: 'Manjung Hub',
      source: 'seed',
      custom: false,
    })
    expect(subRow).toMatchObject({
      id: 11,
      value: 'Reception',
      title: 'Reception',
      source: 'seed',
      custom: false,
    })
    expect(mainRow.canEdit).not.toBe(false)
    expect(mainRow.canDelete).not.toBe(false)
    expect(subRow.canEdit).not.toBe(false)
    expect(subRow.canDelete).not.toBe(false)
  })
})
