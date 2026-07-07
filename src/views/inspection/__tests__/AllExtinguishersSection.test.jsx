// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import AllExtinguishersSection, {
  ALL_EXTINGUISHERS_DEMO_ROWS,
} from '../records/AllExtinguishersSection'

vi.mock('src/components/RowActions', () => ({
  default: ({ items = [], toggleAriaLabel = 'Row actions' }) => (
    <div>
      <button type="button" aria-label={toggleAriaLabel}>
        Actions
      </button>
      {items.map((item) => (
        <button
          key={item.key || item.label}
          type="button"
          aria-label={`${item.label} ${toggleAriaLabel}`}
          onClick={(event) => item.onClick?.(event)}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}))

afterEach(() => {
  cleanup()
})

describe('AllExtinguishersSection', () => {
  it('renders the Excel-style extinguisher table headers and summary counts', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    expect(screen.getByText('ID Loc. No.')).toBeTruthy()
    expect(screen.getByText('Certification Validity')).toBeTruthy()
    expect(screen.getByText('Last Inspected Date')).toBeTruthy()
    expect(screen.getByText('Remarks')).toBeTruthy()
    expect(screen.getByText('Operational')).toBeTruthy()
    expect(screen.getByText('Action').className).toContain(
      'all-extinguishers-table__sticky-action-cell',
    )

    const summary = screen.getByTestId('all-extinguishers-summary')
    expect(within(summary).getByText('Total')).toBeTruthy()
    expect(within(summary).getByText('6')).toBeTruthy()
    expect(within(summary).getByText('Inspected')).toBeTruthy()
    expect(within(summary).getByText('4')).toBeTruthy()
    expect(within(summary).getByText('Not inspected')).toBeTruthy()
    expect(within(summary).getByText('2')).toBeTruthy()
    expect(within(summary).getByText('Issues')).toBeTruthy()
    expect(within(summary).getAllByText('1').length).toBeGreaterThan(0)
  })

  it('filters fixture rows by search text', async () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    expect(screen.getAllByText('ADO-001').length).toBeGreaterThan(0)
    expect(screen.getAllByText('PW-001').length).toBeGreaterThan(0)

    fireEvent.change(screen.getAllByPlaceholderText('Search extinguishers')[1], {
      target: { value: 'PW-001' },
    })

    await waitFor(() => {
      expect(screen.getAllByText('PW-001').length).toBeGreaterThan(0)
      expect(screen.queryAllByText('ADO-001')).toHaveLength(0)
      expect(screen.getAllByText('Showing 1 of 1').length).toBeGreaterThan(0)
    })
  })

  it('filters fixture rows by last inspected by', async () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.change(screen.getAllByDisplayValue('All inspectors')[0], {
      target: { value: 'Jang' },
    })

    await waitFor(() => {
      expect(screen.getAllByText('ADO-001').length).toBeGreaterThan(0)
      expect(screen.getAllByText('PW-001').length).toBeGreaterThan(0)
      expect(screen.queryAllByText('ADO-002')).toHaveLength(0)
      expect(screen.queryAllByText('SW-001')).toHaveLength(0)
      expect(screen.getAllByText('Showing 2 of 2').length).toBeGreaterThan(0)
    })
  })

  it('shows custom period date controls when custom range is selected', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    const periodSelect = screen.getAllByDisplayValue('All time')[0]
    expect(within(periodSelect).getByText('This month')).toBeTruthy()
    expect(within(periodSelect).getByText('Last 90 days')).toBeTruthy()
    expect(within(periodSelect).getByText('Custom range')).toBeTruthy()

    fireEvent.change(periodSelect, { target: { value: 'custom' } })

    expect(screen.getAllByLabelText('Custom period from date').length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText('Custom period to date').length).toBeGreaterThan(0)
  })

  it('renders condensed mobile card data from the same rows', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    expect(
      screen.getByText('Zone 2 > Potable Water Pump House > Potable Water Pump House'),
    ).toBeTruthy()
    expect(screen.getAllByText('Last inspected date').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Certification').length).toBeGreaterThan(0)
  })

  it('shows an empty state when no extinguisher rows match', async () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.change(screen.getAllByPlaceholderText('Search extinguishers')[1], {
      target: { value: 'not-a-real-extinguisher' },
    })

    await waitFor(() => {
      expect(screen.getAllByText('No extinguishers match the current filters.').length).toBe(2)
    })
  })

  it('opens the extinguisher detail panel with historical records', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'View details Extinguisher actions for ADO-002',
      })[0],
    )

    const panel = screen.getByRole('dialog', { name: 'ADO-002' })
    expect(panel).toBeTruthy()
    expect(within(panel).getByText('Showing records: All time')).toBeTruthy()
    expect(within(panel).getByText('1 historical issue')).toBeTruthy()
    expect(within(panel).getByText('Historical Issues')).toBeTruthy()
    expect(within(panel).getByText('Historical Inspection Records')).toBeTruthy()
    expect(within(panel).getByText('Physical')).toBeTruthy()
    expect(within(panel).getByText('Signage')).toBeTruthy()
    expect(within(panel).getByText('Box Key')).toBeTruthy()
    expect(within(panel).getByText('Box Glass')).toBeTruthy()
    expect(within(panel).getByText('Operational')).toBeTruthy()
    expect(within(panel).getAllByText('Operational Condition').length).toBeGreaterThan(0)
    expect(within(panel).getAllByText('INS-02-772026').length).toBeGreaterThan(0)
    expect(within(panel).getByText('INS-02-762026')).toBeTruthy()
    expect(within(panel).getAllByText('Ali').length).toBeGreaterThan(0)
    expect(within(panel).getByText('Jang')).toBeTruthy()
    expect(within(panel).getAllByText('Repeat check').length).toBeGreaterThan(0)
  })

  it('opens the extinguisher detail panel when a desktop table row is clicked', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.click(screen.getByRole('button', { name: 'View details for ADO-001' }))

    expect(screen.getByRole('dialog', { name: 'ADO-001' })).toBeTruthy()
  })

  it('opens the extinguisher detail panel when a desktop table row is activated by keyboard', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.keyDown(screen.getByRole('button', { name: 'View details for ADO-001' }), {
      key: 'Enter',
    })

    expect(screen.getByRole('dialog', { name: 'ADO-001' })).toBeTruthy()
  })

  it('switches from history list to a historical record detail and back', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'View details Extinguisher actions for ADO-002',
      })[0],
    )
    fireEvent.click(screen.getByRole('button', { name: 'View INS-02-772026' }))

    const detailPanel = screen.getByRole('dialog', { name: 'INS-02-772026' })
    expect(detailPanel).toBeTruthy()
    expect(within(detailPanel).getByText('Operational Condition')).toBeTruthy()
    expect(within(detailPanel).getByText('Operational condition reported not good.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Back to historical records' }))

    expect(screen.getByRole('dialog', { name: 'ADO-002' })).toBeTruthy()
    expect(screen.getByText('Historical Inspection Records')).toBeTruthy()
  })

  it('opens the historical record detail from a historical issue row', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'View details Extinguisher actions for ADO-002',
      })[0],
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'View INS-02-772026 details for Operational Condition',
      }),
    )

    const detailPanel = screen.getByRole('dialog', { name: 'INS-02-772026' })
    expect(detailPanel).toBeTruthy()
    expect(within(detailPanel).getByText('Operational condition reported not good.')).toBeTruthy()
  })

  it('opens criterion photos from a historical record detail', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'View details Extinguisher actions for ADO-002',
      })[0],
    )
    fireEvent.click(screen.getByRole('button', { name: 'View INS-02-772026' }))
    fireEvent.click(screen.getByRole('button', { name: 'View photos' }))

    expect(screen.getByText('ADO-002 - Operational Condition photos')).toBeTruthy()
    expect(screen.getByText('1 photo')).toBeTruthy()
  })

  it('opens criterion photos directly from the historical records table', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'View details Extinguisher actions for ADO-002',
      })[0],
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'View Operational Condition photos from INS-02-772026',
      }),
    )

    expect(screen.getByText('ADO-002 - INS-02-772026 - Operational Condition photos')).toBeTruthy()
    expect(screen.getAllByText('1 photo').length).toBeGreaterThan(0)
  })

  it('closes the detail panel without clearing active table filters', async () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.change(screen.getAllByPlaceholderText('Search extinguishers')[1], {
      target: { value: 'ADO-002' },
    })

    await waitFor(() => {
      expect(screen.getAllByText('Showing 1 of 1').length).toBeGreaterThan(0)
    })

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'View details Extinguisher actions for ADO-002',
      })[0],
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close ADO-002' }))

    expect(screen.queryByRole('dialog', { name: 'ADO-002' })).toBeNull()
    expect(screen.getAllByText('Showing 1 of 1').length).toBeGreaterThan(0)
    expect(screen.getAllByDisplayValue('ADO-002').length).toBeGreaterThan(0)
  })

  it('infers historical issue and evidence counts from criterion values and photos', () => {
    const rows = [
      {
        ...ALL_EXTINGUISHERS_DEMO_ROWS[0],
        id: 'fe-inferred-issue',
        idLocNo: 'INF-001',
        latestReportId: 'INS-INF-001',
        latestInspectionAt: '2026-07-07T10:00:00+08:00',
        issueCount: 0,
        historyRecords: [
          {
            reportId: 'INS-INF-001',
            submittedAt: '2026-07-07T10:00:00+08:00',
            submittedBy: 'Jang',
            checks: [
              {
                key: 'boxKey',
                label: 'FE Box Key Availability',
                value: 'No',
                photos: [
                  {
                    id: 'inferred-photo',
                    fileName: 'box-key.jpg',
                    url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
                  },
                ],
              },
            ],
          },
        ],
      },
    ]

    render(<AllExtinguishersSection rows={rows} />)

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'View details Extinguisher actions for INF-001',
      })[0],
    )

    const panel = screen.getByRole('dialog', { name: 'INF-001' })
    expect(within(panel).getByText('Issues recorded (1)')).toBeTruthy()
    expect(within(panel).getByText('1 evidence item')).toBeTruthy()
    expect(within(panel).getAllByText('FE Box Key Availability').length).toBeGreaterThan(0)
  })

  it('keeps asset identity in the header and shows compact metadata for not-inspected rows', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'View details Extinguisher actions for SW-001',
      })[0],
    )

    const panel = screen.getByRole('dialog', { name: 'SW-001' })
    expect(within(panel).getAllByText('SW-001')).toHaveLength(1)
    expect(within(panel).getByText('FE Type')).toBeTruthy()
    expect(within(panel).getByText('Barcode')).toBeTruthy()
    expect(within(panel).getByText('Certification')).toBeTruthy()
    expect(within(panel).getByText('Last inspected')).toBeTruthy()
    expect(within(panel).getByText('Historical Issues')).toBeTruthy()
    expect(within(panel).getAllByText('Report ID').length).toBeGreaterThanOrEqual(2)
    expect(
      within(panel).getByText('No historical issues found for the selected period.'),
    ).toBeTruthy()
    expect(
      within(panel).getByText('No inspection records found for the selected period.'),
    ).toBeTruthy()
    expect(within(panel).queryByText('Latest Inspection')).toBeNull()
    expect(within(panel).queryByText('Issues recorded (0)')).toBeNull()
    expect(within(panel).queryByText('Latest inspection criteria')).toBeNull()
  })
})
