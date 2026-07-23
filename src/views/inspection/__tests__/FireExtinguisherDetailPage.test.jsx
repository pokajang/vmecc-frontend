// @vitest-environment jsdom

import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchFireExtinguisherCoverageDetail,
  fetchFireExtinguisherInspectionHistory,
} from 'src/views/inspection/inspectionFireExtinguisherApi'
import FireExtinguisherDetailPage from '../records/FireExtinguisherDetailPage'

vi.mock('src/views/inspection/inspectionFireExtinguisherApi', () => ({
  fetchFireExtinguisherCoverageDetail: vi.fn(),
  fetchFireExtinguisherInspectionHistory: vi.fn(),
  markFireExtinguisherOutOfService: vi.fn(),
  restoreFireExtinguisher: vi.fn(),
  retireFireExtinguisher: vi.fn(),
  returnFireExtinguisherToService: vi.fn(),
  updateFireExtinguisherOption: vi.fn(),
}))

vi.mock('../records/AllExtinguishersSection', () => ({
  CoverageDetailBody: ({ detail, pageLayout }) => (
    <div data-testid="detail-body" data-page-layout={String(pageLayout)}>
      {detail?.idLocNo || 'Loading'}
    </div>
  ),
  getPeriodLabel: () => 'All time',
}))

const CatalogLocation = () => {
  const location = useLocation()
  return <div data-testid="catalog-location">{`${location.pathname}${location.search}`}</div>
}

describe('FireExtinguisherDetailPage', () => {
  beforeEach(() => {
    vi.mocked(fetchFireExtinguisherCoverageDetail).mockReset()
    vi.mocked(fetchFireExtinguisherInspectionHistory).mockReset()
    vi.mocked(fetchFireExtinguisherCoverageDetail).mockResolvedValue({
      data: {
        catalogId: 42,
        idLocNo: 'CAN-002',
        lifecycleStatus: 'retired',
        zone: '1',
        location: 'Canteen',
        subLocation: 'Canteen',
        historyRecords: [],
      },
      meta: {},
    })
    vi.mocked(fetchFireExtinguisherInspectionHistory).mockResolvedValue({
      data: [],
      meta: { page: 1, lastPage: 1, total: 0 },
    })
  })

  it('loads a route-backed asset page and preserves the catalogue return state', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/inspection/all-extinguishers/42',
            state: {
              returnTo: '/inspection/all-extinguishers?lifecycle=retired&page=2',
              catalogViewState: { lifecycleFilter: 'retired', currentPage: 2 },
            },
          },
        ]}
      >
        <Routes>
          <Route
            path="/inspection/all-extinguishers/:extinguisherId"
            element={<FireExtinguisherDetailPage canManageCatalog />}
          />
          <Route path="/inspection/all-extinguishers" element={<CatalogLocation />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'CAN-002' })).toBeTruthy()
    expect(screen.getByText('Retired')).toBeTruthy()
    expect(screen.getByTestId('detail-body').getAttribute('data-page-layout')).toBe('true')
    expect(fetchFireExtinguisherCoverageDetail).toHaveBeenCalledWith(
      '42',
      expect.objectContaining({ period: 'all' }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(fetchFireExtinguisherInspectionHistory).toHaveBeenCalledWith(
      '42',
      expect.objectContaining({ page: 1, perPage: 25, period: 'all' }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back to all extinguishers' }))

    await waitFor(() => {
      expect(screen.getByTestId('catalog-location').textContent).toBe(
        '/inspection/all-extinguishers?lifecycle=retired&page=2',
      )
    })
  })
})
