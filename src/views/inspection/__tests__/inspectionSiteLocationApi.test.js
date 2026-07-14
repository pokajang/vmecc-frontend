import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from 'src/services/apiClient'

import {
  createSiteLocationNode,
  fetchSiteLocationHierarchy,
  getSiteLocationDuplicate,
} from '../domain/api/inspectionSiteLocationApi'

vi.mock('src/services/apiClient', () => ({ apiRequest: vi.fn() }))

describe('inspection site location API', () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset())

  it('normalizes the canonical hierarchy once at the API boundary', async () => {
    apiRequest.mockResolvedValue({
      data: [{ id: 1, name: '1', children: [{ id: 2, parentId: 1, name: 'Workshop' }] }],
    })

    const result = await fetchSiteLocationHierarchy()

    expect(result.data[0]).toMatchObject({ id: '1', level: 'zone', displayName: 'Zone 1' })
    expect(result.data[0].children[0]).toMatchObject({ id: '2', level: 'area' })
  })

  it('normalizes duplicate conflicts as an existing canonical selection', () => {
    const conflict = Object.assign(new Error('Already exists'), {
      status: 409,
      payload: {
        code: 'SITE_LOCATION_ALREADY_EXISTS',
        data: { existing: { id: 7, parentId: 1, level: 'area', name: 'Workshop' } },
      },
    })
    expect(getSiteLocationDuplicate(conflict)).toMatchObject({ id: '7', level: 'area' })
  })

  it('submits a create request and normalizes the new node', async () => {
    apiRequest.mockResolvedValue({
      data: { id: 8, parentId: 1, level: 'area', name: 'Workshop' },
    })

    await expect(
      createSiteLocationNode({ level: 'area', parentId: 1, name: 'Workshop' }),
    ).resolves.toMatchObject({
      created: true,
      data: { id: '8', parentId: '1', level: 'area', name: 'Workshop' },
    })
  })
})
