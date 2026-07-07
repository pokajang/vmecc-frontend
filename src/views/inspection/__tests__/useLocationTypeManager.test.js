// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useLocationTypeManager from '../useLocationTypeManager'

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

const storedRows = () =>
  Object.entries(localStorage.dump())
    .filter(([key]) => key.includes('custom_location_types'))
    .map(([, value]) => value)
    .map((value) => JSON.parse(value))
    .flat()

const FIRE_LOCATION_CACHE_KEY = 'inspection_location_catalog_cache_v3_fire-extinguisher-inspection'
const GENERAL_LOCATION_CACHE_KEY = 'inspection_location_catalog_cache_v3_general-inspection'
const HSE_LOCATION_CACHE_KEY =
  'inspection_location_catalog_cache_v3_health-safety-environment-inspection'
const FIRE_LOCATION_CATALOG = [
  {
    value: '1',
    title: '1',
    subLocations: [
      {
        value: 'Manjung Hub',
        title: 'Manjung Hub',
        subLocations: [{ value: 'Reception', title: 'Reception' }],
      },
    ],
  },
  {
    value: 'Others',
    title: 'Others',
    subLocations: [
      {
        value: 'Misc Area',
        title: 'Misc Area',
        subLocations: [{ value: 'Misc Room', title: 'Misc Room' }],
      },
    ],
  },
  {
    value: '2',
    title: '2',
    subLocations: [
      {
        value: 'Zone 2 Area',
        title: 'Zone 2 Area',
        subLocations: [{ value: 'Level 1', title: 'Level 1' }],
      },
    ],
  },
  {
    value: '3',
    title: '3',
    subLocations: [
      {
        value: 'Zone 3 Area',
        title: 'Zone 3 Area',
        subLocations: [{ value: 'Level 1', title: 'Level 1' }],
      },
    ],
  },
  {
    value: '4 & 4B',
    title: '4 & 4B',
    subLocations: [
      {
        value: 'Zone 4 Area',
        title: 'Zone 4 Area',
        subLocations: [{ value: 'Level 1', title: 'Level 1' }],
      },
    ],
  },
  {
    value: '5',
    title: '5',
    subLocations: [
      {
        value: 'Zone 5 Area',
        title: 'Zone 5 Area',
        subLocations: [{ value: 'Level 1', title: 'Level 1' }],
      },
    ],
  },
  {
    value: '6',
    title: '6',
    subLocations: [
      {
        value: 'Zone 6 Area',
        title: 'Zone 6 Area',
        subLocations: [{ value: 'Level 1', title: 'Level 1' }],
      },
    ],
  },
]

const seedFireLocationCatalogCache = () => {
  if (localStorage.getItem(FIRE_LOCATION_CACHE_KEY)) return
  localStorage.setItem(FIRE_LOCATION_CACHE_KEY, JSON.stringify({ data: FIRE_LOCATION_CATALOG }))
}

const seedZoneLocationCatalogCache = (cacheKey) => {
  if (localStorage.getItem(cacheKey)) return
  localStorage.setItem(cacheKey, JSON.stringify({ data: FIRE_LOCATION_CATALOG }))
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
  seedFireLocationCatalogCache()
  return renderLocationManager({
    inspectionType: 'Fire Extinguisher Inspection',
    ...props,
  })
}

const renderGeneralLocationManager = (props = {}) => {
  seedZoneLocationCatalogCache(GENERAL_LOCATION_CACHE_KEY)
  return renderLocationManager({
    inspectionType: 'General Inspection',
    ...props,
  })
}

const renderHseLocationManager = (props = {}) => {
  seedZoneLocationCatalogCache(HSE_LOCATION_CACHE_KEY)
  return renderLocationManager({
    inspectionType: 'Health Safety Environment Inspection',
    ...props,
  })
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorageMock())
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
      zoneId: '',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
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

    expect(storedRows()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'sub',
          parentValue: '1\u001fManjung Hub A',
          value: 'Pump Room',
        }),
      ]),
    )
    expect(result.current.subLocationOptions.map((row) => row.value)).toContain('Pump Room')
    expect(updateSetupField).toHaveBeenLastCalledWith('locationSelection', {
      zone: '1',
      zoneId: '',
      mainLocation: 'Manjung Hub A',
      subLocation: 'Pump Room',
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
      zoneId: '',
      mainLocation: 'Audit Area',
      subLocation: '',
    })
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
    expect(localStorage.getItem(FIRE_LOCATION_CACHE_KEY)).toBeNull()
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
      zoneId: '',
      mainLocation: 'Manjung Hub',
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

    const { result } = renderLocationManager({
      inspectionType: 'General Inspection',
      zone: '1',
    })
    const manjungHub = result.current.areaOptions.find((row) => row.value === 'Manjung Hub')

    expect(manjungHub?.metaLabel).not.toBe('0 locations')
    expect(manjungHub?.metaLabel).toBe('13 locations')
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
      zoneId: '',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
    })
  })

  it('loads fire extinguisher main areas when the selected zone includes the Zone prefix', () => {
    const { result } = renderFireLocationManager({ zone: 'Zone 1' })
    const manjungHub = result.current.areaOptions.find((row) => row.value === 'Manjung Hub')

    expect(result.current.areaOptions.map((row) => row.value)).toContain('Manjung Hub')
    expect(manjungHub?.metaLabel).toBe('13 locations')
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

    act(() => result.current.removeType('Audit Room'))

    expect(result.current.subLocationOptions.map((row) => row.value)).not.toContain('Audit Room')
  })
})
