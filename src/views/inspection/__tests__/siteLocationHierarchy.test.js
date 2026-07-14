import { describe, expect, it } from 'vitest'

import {
  findSiteLocationByName,
  getSiteLocationChildren,
  normalizeSiteLocationHierarchy,
  removeSiteLocationNode,
  toLegacySiteLocationRows,
  upsertSiteLocationNode,
  validateCompleteSiteLocation,
} from '../domain/locations/siteLocationHierarchy'

const hierarchy = normalizeSiteLocationHierarchy([
  {
    id: 1,
    name: '1',
    children: [
      {
        id: 2,
        parentId: 1,
        name: 'Canteen',
        children: [{ id: 3, parentId: 2, name: 'Dry Store' }],
      },
    ],
  },
])

describe('site location hierarchy utilities', () => {
  it('normalizes the canonical three-level shape and Zone aliases', () => {
    expect(hierarchy[0]).toMatchObject({ id: '1', level: 'zone', displayName: 'Zone 1' })
    expect(findSiteLocationByName(hierarchy, 'Zone 1', 'zone')?.id).toBe('1')
    expect(getSiteLocationChildren(hierarchy, '1', 'area')[0]).toMatchObject({
      id: '2',
      level: 'area',
    })
  })

  it('upserts and recursively removes immutable nodes', () => {
    const withLocation = upsertSiteLocationNode(hierarchy, {
      id: 4,
      parentId: 2,
      level: 'location',
      name: 'Kitchen',
    })
    expect(getSiteLocationChildren(withLocation, '2', 'location')).toHaveLength(2)
    expect(getSiteLocationChildren(hierarchy, '2', 'location')).toHaveLength(1)
    expect(findSiteLocationByName(removeSiteLocationNode(withLocation, '2'), 'Kitchen')).toBeNull()
  })

  it('adapts legacy boundaries and validates complete selections', () => {
    const legacy = toLegacySiteLocationRows(hierarchy)
    expect(legacy[0].subLocations[0].subLocations[0].value).toBe('Dry Store')
    expect(
      validateCompleteSiteLocation({
        zone: hierarchy[0],
        area: hierarchy[0].children[0],
        location: hierarchy[0].children[0].children[0],
      }),
    ).toEqual({ valid: true, missing: [] })
    expect(validateCompleteSiteLocation({ zone: hierarchy[0] }).missing).toEqual([
      'area',
      'location',
    ])
  })
})
