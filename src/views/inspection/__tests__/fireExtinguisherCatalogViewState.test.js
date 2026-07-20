import { describe, expect, it } from 'vitest'

import {
  buildFireExtinguisherCatalogLocation,
  isSafeFireExtinguisherReturnLocation,
  parseFireExtinguisherCatalogViewState,
  serializeFireExtinguisherCatalogViewState,
} from '../records/fireExtinguisherCatalogViewState'

describe('fire extinguisher catalogue view state', () => {
  it('round-trips non-default filters through the catalogue URL', () => {
    const state = {
      search: 'CAN-002',
      period: 'last30',
      lifecycleFilter: 'retired',
      rowsToShow: 25,
      currentPage: 3,
    }
    const query = serializeFireExtinguisherCatalogViewState(state)

    expect(parseFireExtinguisherCatalogViewState(query)).toMatchObject(state)
    expect(buildFireExtinguisherCatalogLocation(state)).toContain('/inspection/all-extinguishers?')
  })

  it('only accepts catalogue list locations as return targets', () => {
    expect(
      isSafeFireExtinguisherReturnLocation('/inspection/all-extinguishers?lifecycle=retired'),
    ).toBe(true)
    expect(isSafeFireExtinguisherReturnLocation('/inspection/all-extinguishers/12')).toBe(false)
    expect(isSafeFireExtinguisherReturnLocation('https://example.com')).toBe(false)
  })
})
