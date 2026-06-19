// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import InspectionRecordsSection from '../InspectionRecordsSection'

vi.mock('src/components/RowActions', () => ({
  default: ({ items = [] }) => (
    <div>
      {items.map((item) => (
        <button
          key={item.key || item.label}
          type="button"
          disabled={Boolean(item.disabled)}
          title={item.disabled ? item.disabledReason : undefined}
          aria-label={item.disabled ? `${item.label}. ${item.disabledReason}` : item.label}
          onClick={() => {
            if (!item.disabled) item.onClick?.()
          }}
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

const submittedRow = {
  id: 'INS-001',
  displayId: 'INS-2026-001',
  incidentType: 'Safety',
  incidentTypeDescription: 'Monthly safety inspection.',
  location: 'Workshop',
  incidentDate: '2026-04-16',
  incidentTime: '14:00',
  submittedBy: 'Priya Lim',
  status: 'Submitted',
  timeline: [{ action: 'Submitted', by: 'Priya Lim', at: '2026-04-16T14:20:00.000Z' }],
}

const draftRow = {
  id: 'INS-DRAFT',
  displayId: 'Draft',
  recordKind: 'draft',
  incidentType: 'Equipment',
  location: 'Bridge',
  savedAt: '2026-04-14T09:00:00.000Z',
  status: 'Draft',
}

const buildProps = (overrides = {}) => ({
  startNew: vi.fn(),
  search: '',
  setSearch: vi.fn(),
  period: 'all',
  setPeriod: vi.fn(),
  sort: 'reportedAt:desc',
  setSort: vi.fn(),
  typeFilter: 'All',
  setTypeFilter: vi.fn(),
  typeOptions: [{ value: 'All', label: 'All inspection types' }],
  statusFilter: 'All',
  setStatusFilter: vi.fn(),
  statusOptions: [{ value: 'All', label: 'All status' }],
  sortOptions: [{ value: 'reportedAt:desc', label: 'Newest' }],
  clearFilters: vi.fn(),
  isLoading: false,
  filteredRecords: [submittedRow],
  visibleRows: [submittedRow],
  onViewRecord: vi.fn(),
  onDownloadRecord: vi.fn(),
  downloadingId: null,
  onEditRecord: vi.fn(),
  onDeleteRecord: vi.fn(),
  onReviewTransition: vi.fn(),
  onApproveTransition: vi.fn(),
  onRejectTransition: vi.fn(),
  canReviewRecord: () => true,
  canApproveRecord: () => false,
  canRejectRecord: () => false,
  canEditRecord: () => true,
  canDeleteRecord: () => true,
  formatDateTime: (date, time) => `${date} ${time}`,
  rowsToShow: 10,
  setRowsToShow: vi.fn(),
  totalCount: 1,
  ...overrides,
})

describe('InspectionRecordsSection', () => {
  it('renders mobile inspection cards with key details and keyboard open behavior', () => {
    const props = buildProps()
    render(<InspectionRecordsSection {...props} />)

    const mobileCard = screen.getByRole('button', {
      name: 'Open inspection record INS-2026-001 summary',
    })

    expect(mobileCard.textContent).toContain('INS-2026-001')
    expect(mobileCard.textContent).toContain('Safety')
    expect(mobileCard.textContent).toContain('Monthly safety inspection.')
    expect(mobileCard.textContent).toContain('Workshop')
    expect(mobileCard.textContent).toContain('Priya Lim')
    expect(mobileCard.textContent).toContain('2026-04-16 14:00')

    fireEvent.keyDown(mobileCard, { key: 'Enter' })
    fireEvent.keyDown(mobileCard, { key: ' ' })

    expect(props.onViewRecord).toHaveBeenCalledTimes(2)
    expect(props.onViewRecord).toHaveBeenCalledWith('INS-001')
  })

  it('opens inspection drafts for edit from the mobile card', () => {
    const props = buildProps({
      filteredRecords: [draftRow],
      visibleRows: [draftRow],
    })
    render(<InspectionRecordsSection {...props} />)

    const mobileCard = screen.getByRole('button', {
      name: 'Open inspection record Draft summary',
    })
    fireEvent.keyDown(mobileCard, { key: 'Enter' })

    expect(props.onEditRecord).toHaveBeenCalledWith(draftRow)
    expect(props.onViewRecord).not.toHaveBeenCalled()
  })

  it('keeps mobile row actions from triggering inspection card navigation', () => {
    const props = buildProps()
    render(<InspectionRecordsSection {...props} />)

    const mobileCard = screen.getByRole('button', {
      name: 'Open inspection record INS-2026-001 summary',
    })
    const mobileArticle = mobileCard.closest('article')
    fireEvent.click(within(mobileArticle).getByRole('button', { name: 'Review' }))

    expect(props.onReviewTransition).toHaveBeenCalledWith(submittedRow)
    expect(props.onViewRecord).not.toHaveBeenCalled()
  })

  it('opens submitted inspections from desktop row click', () => {
    const props = buildProps()
    const { container } = render(<InspectionRecordsSection {...props} />)

    const desktopRow = Array.from(container.querySelectorAll('tbody tr')).find((row) =>
      row.textContent?.includes('INS-2026-001'),
    )

    fireEvent.click(desktopRow)

    expect(props.onViewRecord).toHaveBeenCalledWith('INS-001')
  })

  it('keeps desktop row actions from triggering inspection row navigation', () => {
    const props = buildProps()
    const { container } = render(<InspectionRecordsSection {...props} />)

    const desktopRow = Array.from(container.querySelectorAll('tbody tr')).find((row) =>
      row.textContent?.includes('INS-2026-001'),
    )
    const reviewAction = within(desktopRow).getByRole('button', { name: 'Review' })

    fireEvent.click(reviewAction)

    expect(props.onReviewTransition).toHaveBeenCalledWith(submittedRow)
    expect(props.onViewRecord).not.toHaveBeenCalled()
  })

  it('exposes disabled inspection action reasons', () => {
    render(<InspectionRecordsSection {...buildProps({ canReviewRecord: () => false })} />)

    const reviewAction = screen.getAllByRole('button', {
      name: 'Review. Review is not available for this status.',
    })[0]

    expect(reviewAction.getAttribute('title')).toBe('Review is not available for this status.')
  })
})
