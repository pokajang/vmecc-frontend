// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { migrateLegacySiteLocations } from '../state/useLegacySiteLocationMigration'

const storage = () => {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  }
}

describe('legacy site location migration', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', storage())
  })

  it('migrates only explicitly hierarchical legacy rows in dependency order', async () => {
    const catalog = {
      hierarchy: [],
      createZone: vi.fn(async ({ name }) => ({
        data: { id: '1', parentId: null, level: 'zone', name, children: [] },
      })),
      createArea: vi.fn(async (parentId, { name }) => ({
        data: { id: '2', parentId, level: 'area', name, children: [] },
      })),
      createLocation: vi.fn(async (parentId, { name }) => ({
        data: { id: '3', parentId, level: 'location', name, children: [] },
      })),
    }
    const rows = [
      { kind: 'zone', value: '9' },
      { kind: 'main', parentValue: '9', value: 'Workshop' },
      { kind: 'sub', parentValue: '9\u001fWorkshop', value: 'Bay 1' },
      { kind: 'main', parentValue: '', value: 'Legacy flat General location' },
    ]

    const result = await migrateLegacySiteLocations({ userId: '7', rows, catalog })

    expect(catalog.createZone).toHaveBeenCalledWith(expect.objectContaining({ name: '9' }))
    expect(catalog.createArea).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ name: 'Workshop' }),
    )
    expect(catalog.createLocation).toHaveBeenCalledWith(
      '2',
      expect.objectContaining({ name: 'Bay 1' }),
    )
    expect(result.remaining).toEqual([rows[3]])
    expect(localStorage.getItem('inspection_site_location_catalog_migrated_v1_user_7')).toBe('1')
  })

  it('does not mark migration complete when a hierarchical row has no safe parent', async () => {
    const rows = [{ kind: 'main', parentValue: 'Missing Zone', value: 'Workshop' }]
    const result = await migrateLegacySiteLocations({
      userId: '8',
      rows,
      catalog: {
        hierarchy: [],
        createZone: vi.fn(),
        createArea: vi.fn(),
        createLocation: vi.fn(),
      },
    })

    expect(result.remaining).toEqual(rows)
    expect(localStorage.getItem('inspection_site_location_catalog_migrated_v1_user_8')).toBeNull()
  })
})
