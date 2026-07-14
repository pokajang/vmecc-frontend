// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useLocationTypeManager from '../useLocationTypeManager'
import { SITE_ZONE_LOCATION_ROWS } from '../form/inspectionSiteLocationDefaults'
import { resetSiteLocationCatalogStoreForTests } from '../state/siteLocationCatalogStore'

const siteApi = vi.hoisted(() => ({
  fetch: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  archive: vi.fn(),
}))

vi.mock('../domain/api/inspectionSiteLocationApi', () => ({
  fetchSiteLocationHierarchy: siteApi.fetch,
  createSiteLocationNode: siteApi.create,
  updateSiteLocationNode: siteApi.update,
  archiveSiteLocationNode: siteApi.archive,
}))

const MANJUNG_HUB_LOCATION_COUNT =
  SITE_ZONE_LOCATION_ROWS.find((zone) => zone.value === '1')?.subLocations.find(
    (area) => area.value === 'Manjung Hub',
  )?.subLocations.length ?? 0
const MANJUNG_HUB_META_LABEL = `${MANJUNG_HUB_LOCATION_COUNT} locations`

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
    dump: () => ({ ...store }),
  }
}

const FIRE_LOCATION_CACHE_KEY = 'inspection_location_catalog_cache_v3_fire-extinguisher-inspection'
const GENERAL_LOCATION_CACHE_KEY = 'inspection_location_catalog_cache_v3_general-inspection'

let nextSiteId = 10000
const canonicalSiteRows = (rows = SITE_ZONE_LOCATION_ROWS, parentId = null, depth = 0) =>
  rows.map((row, index) => {
    const id = String(row.id || `site-${depth}-${parentId || 'root'}-${index}`)
    const name = String(row.value || row.title)
    return {
      id,
      parentId,
      level: ['zone', 'area', 'location'][depth],
      name,
      displayName: depth === 0 && /^\d/.test(name) ? `Zone ${name}` : name,
      source: 'seed',
      permissions: { canEdit: true, canDelete: true },
      children: canonicalSiteRows(row.subLocations || row.children || [], id, depth + 1),
    }
  })

const SITE_LOCATION_CACHE_KEY = 'inspection_site_location_catalog_cache_v1'
const seedSiteLocationCatalogCache = () => {
  if (!localStorage.getItem(SITE_LOCATION_CACHE_KEY)) {
    localStorage.setItem(SITE_LOCATION_CACHE_KEY, JSON.stringify({ data: canonicalSiteRows() }))
  }
}

const findCanonicalNode = (rows, id) => {
  for (const row of rows) {
    if (row.id === String(id)) return row
    const child = findCanonicalNode(row.children, id)
    if (child) return child
  }
  return null
}

const renderLocationManager = (props = {}) => {
  const updateSetupField = vi.fn()
  const pushToast = vi.fn()
  const hook = renderHook(
    (hookProps) =>
      useLocationTypeManager({
        userId: 'user-1',
        inspectionType: 'General Inspection',
        mainLocation: '',
        subLocation: '',
        updateSetupField,
        pushToast,
        ...hookProps,
      }),
    { initialProps: props },
  )
  return { ...hook, updateSetupField, pushToast }
}

const renderFireLocationManager = (props = {}) => {
  seedSiteLocationCatalogCache()
  return renderLocationManager({
    inspectionType: 'Fire Extinguisher Inspection',
    ...props,
  })
}

const renderGeneralLocationManager = (props = {}) => {
  seedSiteLocationCatalogCache()
  return renderLocationManager({
    inspectionType: 'General Inspection',
    ...props,
  })
}

const renderHseLocationManager = (props = {}) => {
  seedSiteLocationCatalogCache()
  return renderLocationManager({
    inspectionType: 'Health Safety Environment Inspection',
    ...props,
  })
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorageMock())
  resetSiteLocationCatalogStoreForTests()
  nextSiteId = 10000
  siteApi.fetch.mockRejectedValue(new Error('Catalog API unavailable'))
  siteApi.create.mockImplementation(async (payload) => ({
    data: {
      id: String(nextSiteId++),
      parentId: payload.parentId == null ? null : String(payload.parentId),
      level: payload.level,
      name: payload.name,
      displayName: payload.level === 'zone' ? `Zone ${payload.name}` : payload.name,
      source: 'custom',
      permissions: { canEdit: true, canDelete: true },
      children: [],
    },
    created: true,
  }))
  siteApi.update.mockImplementation(async (id, payload) => ({
    data: {
      ...findCanonicalNode(canonicalSiteRows(), id),
      name: payload.name,
      displayName: payload.name,
    },
    updated: true,
  }))
  siteApi.archive.mockResolvedValue(true)
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Promise.reject(new Error('Catalog API unavailable'))),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useLocationTypeManager', () => {
  it('keeps the selected sub-location after saving an edit with the same name', async () => {
    const { result, updateSetupField } = renderGeneralLocationManager({
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
    })
    const reception = result.current.subLocationOptions.find((row) => row.value === 'Reception')

    act(() => result.current.startEditType(reception))
    await act(async () => result.current.saveType())

    expect(updateSetupField).toHaveBeenLastCalledWith('locationSelection', {
      zone: '1',
      zoneId: expect.any(String),
      mainLocation: 'Manjung Hub',
      mainLocationId: expect.any(String),
      subLocation: 'Reception',
      subLocationId: expect.any(String),
    })
  })

  it('moves custom sub-locations when the selected main location is renamed', async () => {
    const { result, rerender, updateSetupField } = renderGeneralLocationManager({
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Pump Room',
    })

    act(() => result.current.openAddSubLocationModal())
    act(() => {
      result.current.setNewLocationName('Pump Room')
      result.current.setNewLocationDescription('User-defined inspection point.')
    })
    await act(async () => result.current.saveType())

    const manjungHub = result.current.areaOptions.find((row) => row.value === 'Manjung Hub')
    act(() => result.current.startEditType(manjungHub))
    act(() => result.current.setNewLocationName('Manjung Hub A'))
    await act(async () => result.current.saveType())
    rerender({ zone: '1', mainLocation: 'Manjung Hub A', subLocation: 'Pump Room' })

    expect(siteApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'location', name: 'Pump Room' }),
    )
    expect(siteApi.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ name: 'Manjung Hub A' }),
    )
    expect(result.current.subLocationOptions.map((row) => row.value)).toContain('Pump Room')
    expect(updateSetupField).toHaveBeenLastCalledWith('locationSelection', {
      zone: '1',
      zoneId: expect.any(String),
      mainLocation: 'Manjung Hub A',
      mainLocationId: expect.any(String),
      subLocation: 'Pump Room',
      subLocationId: expect.any(String),
    })
  })

  it('adds custom fire main areas under the selected zone instead of root zones', async () => {
    const { result, updateSetupField } = renderFireLocationManager({
      zone: '1',
      mainLocation: '',
      subLocation: '',
    })

    act(() => result.current.openAddMainLocationModal())
    act(() => {
      result.current.setNewLocationName('Audit Area')
      result.current.setNewLocationDescription('Temporary fire inspection area.')
    })
    await act(async () => result.current.saveType())

    expect(result.current.zoneOptions.map((row) => row.value)).not.toContain('Audit Area')
    expect(result.current.areaOptions.map((row) => row.value)).toContain('Audit Area')
    expect(updateSetupField).toHaveBeenLastCalledWith('locationSelection', {
      zone: '1',
      zoneId: expect.any(String),
      mainLocation: 'Audit Area',
      mainLocationId: expect.any(String),
      subLocation: '',
    })
  })

  it('adds a new Zone globally and selects the returned canonical node', async () => {
    const { result, updateSetupField } = renderFireLocationManager()

    act(() => result.current.openAddZoneModal())
    act(() => result.current.setNewLocationName('9'))
    await act(async () => result.current.saveType())

    expect(siteApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'zone', parentId: null, name: '9' }),
    )
    expect(result.current.zoneOptions.map((row) => row.value)).toContain('9')
    expect(updateSetupField).toHaveBeenLastCalledWith(
      'locationSelection',
      expect.objectContaining({ zone: '9', zoneId: expect.any(String) }),
    )
  })

  it('ignores stale two-level fire location cache and falls back to seeded zone options', () => {
    localStorage.setItem(
      FIRE_LOCATION_CACHE_KEY,
      JSON.stringify({
        data: [
          {
            value: 'ASIC',
            title: 'ASIC',
            subLocations: [{ value: 'ASIC', title: 'ASIC' }],
          },
          {
            value: 'Canteen',
            title: 'Canteen',
            subLocations: [{ value: 'Canteen', title: 'Canteen' }],
          },
        ],
      }),
    )

    const { result } = renderFireLocationManager()
    const zoneValues = result.current.zoneOptions.map((row) => row.value)

    expect(zoneValues).toContain('1')
    expect(zoneValues).toContain('Others')
    expect(zoneValues).not.toContain('ASIC')
    expect(zoneValues).not.toContain('Canteen')
    expect(localStorage.getItem(FIRE_LOCATION_CACHE_KEY)).not.toBeNull()
  })

  it('formats and sorts fire extinguisher zones numerically before alphabetic zones', () => {
    const { result } = renderFireLocationManager()
    const zoneRows = result.current.zoneOptions
    const zoneValues = zoneRows.map((row) => row.value)
    const zoneTitles = zoneRows.map((row) => row.title)

    expect(zoneTitles.slice(0, 5)).toEqual(['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4 & 4B', 'Zone 5'])
    expect(zoneValues.indexOf('6')).toBeLessThan(zoneValues.indexOf('Others'))
    expect(zoneTitles).toContain('Others')
    expect(zoneRows.find((row) => row.value === '1')?.metaLabel).toBe('15 areas')
  })

  it('uses the zone main-area location flow for general inspection locations', () => {
    const { result, updateSetupField } = renderGeneralLocationManager({ zone: '1' })

    expect(result.current.zoneOptions.map((row) => row.title).slice(0, 2)).toEqual([
      'Zone 1',
      'Zone 2',
    ])
    expect(result.current.areaOptions.map((row) => row.value)).toContain('Manjung Hub')

    act(() => result.current.setMainLocation('Manjung Hub'))

    expect(updateSetupField).toHaveBeenLastCalledWith('locationSelection', {
      zone: '1',
      zoneId: expect.any(String),
      mainLocation: 'Manjung Hub',
      mainLocationId: expect.any(String),
      subLocation: '',
    })
  })

  it('fills missing General main-area location children from the seeded hierarchy', () => {
    localStorage.setItem(
      GENERAL_LOCATION_CACHE_KEY,
      JSON.stringify({
        data: [
          {
            value: '1',
            title: '1',
            subLocations: [
              {
                value: 'Manjung Hub',
                title: 'Manjung Hub',
                subLocations: [],
              },
            ],
          },
        ],
      }),
    )
    seedSiteLocationCatalogCache()

    const { result } = renderLocationManager({
      inspectionType: 'General Inspection',
      zone: '1',
    })
    const manjungHub = result.current.areaOptions.find((row) => row.value === 'Manjung Hub')

    expect(MANJUNG_HUB_LOCATION_COUNT).toBeGreaterThan(0)
    expect(manjungHub?.metaLabel).not.toBe('0 locations')
    expect(manjungHub?.metaLabel).toBe(MANJUNG_HUB_META_LABEL)
    expect(result.current.subLocationOptions).toHaveLength(0)
  })

  it('uses the zone main-area location flow for HSE inspection locations', () => {
    const { result, updateSetupField } = renderHseLocationManager({
      zone: '1',
      mainLocation: 'Manjung Hub',
    })

    expect(result.current.subLocationOptions.map((row) => row.value)).toContain('Reception')

    act(() => result.current.setSubLocation('Reception'))

    expect(updateSetupField).toHaveBeenLastCalledWith('locationSelection', {
      zone: '1',
      zoneId: expect.any(String),
      mainLocation: 'Manjung Hub',
      mainLocationId: expect.any(String),
      subLocation: 'Reception',
      subLocationId: expect.any(String),
    })
  })

  it('loads fire extinguisher main areas when the selected zone includes the Zone prefix', () => {
    const { result } = renderFireLocationManager({ zone: 'Zone 1' })
    const manjungHub = result.current.areaOptions.find((row) => row.value === 'Manjung Hub')

    expect(result.current.areaOptions.map((row) => row.value)).toContain('Manjung Hub')
    expect(manjungHub?.metaLabel).toBe(MANJUNG_HUB_META_LABEL)
    expect(result.current.visibleZoneOptions.some((row) => row.value === '1')).toBe(true)
  })

  it('collapses expanded fire extinguisher zone options after selecting a zone', () => {
    const { result } = renderFireLocationManager()

    act(() => result.current.setShowAllZoneTypes(true))
    expect(result.current.visibleZoneOptions.some((row) => row.title === 'Show less')).toBe(true)

    act(() => result.current.setZone('1'))

    expect(result.current.visibleZoneOptions.some((row) => row.title === 'Show less')).toBe(false)
  })

  it('collapses expanded fire extinguisher main-area options after selecting a main area', () => {
    const { result } = renderFireLocationManager({ zone: '1' })

    act(() => result.current.setShowAllMainLocationTypes(true))
    expect(result.current.showAllMainLocationTypes).toBe(true)

    act(() => result.current.setMainLocation('Manjung Hub'))

    expect(result.current.showAllMainLocationTypes).toBe(false)
  })

  it('collapses expanded fire extinguisher sub-location options after selecting a sub-location', () => {
    const { result } = renderFireLocationManager({ zone: '1', mainLocation: 'Manjung Hub' })

    act(() => result.current.setShowAllSubLocationTypes(true))
    expect(result.current.showAllSubLocationTypes).toBe(true)

    act(() => result.current.setSubLocation('Reception'))

    expect(result.current.showAllSubLocationTypes).toBe(false)
  })

  it('removes custom fire locations under the selected zone and main area', async () => {
    const { result } = renderFireLocationManager({
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Audit Room',
    })

    act(() => result.current.openAddSubLocationModal())
    act(() => {
      result.current.setNewLocationName('Audit Room')
      result.current.setNewLocationDescription('Temporary fire inspection point.')
    })
    await act(async () => result.current.saveType())

    expect(result.current.subLocationOptions.map((row) => row.value)).toContain('Audit Room')

    await act(async () => result.current.removeType('Audit Room'))

    expect(result.current.subLocationOptions.map((row) => row.value)).not.toContain('Audit Room')
  })
})
