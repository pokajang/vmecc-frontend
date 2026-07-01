// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import ReportRecordsSection from '../ReportRecordsSection'

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
  id: 'RPT-001',
  displayId: 'ERCO-2026-001',
  incidentType: 'Medical Emergency',
  incidentTypeDescription: 'Crew member required medical assistance.',
  location: 'Engine Room',
  incidentDate: '2026-04-15',
  incidentTime: '10:30',
  submittedBy: 'Alex Tan',
  status: 'Submitted',
  timeline: [{ action: 'Submitted', by: 'Alex Tan', at: '2026-04-15T10:45:00.000Z' }],
}

const draftRow = {
  id: 'DRAFT-001',
  displayId: 'Draft',
  recordKind: 'draft',
  incidentType: 'Near Miss',
  location: 'Deck',
  savedAt: '2026-04-14T09:00:00.000Z',
  status: 'Draft',
}

const buildProps = (overrides = {}) => ({
  reportTypeLabel: 'ERCO',
  startNew: vi.fn(),
  search: '',
  setSearch: vi.fn(),
  period: 'all',
  setPeriod: vi.fn(),
  sort: 'reportedAt:desc',
  setSort: vi.fn(),
  typeFilter: 'All',
  setTypeFilter: vi.fn(),
  typeOptions: [{ value: 'All', label: 'All incident types' }],
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

describe('ReportRecordsSection', () => {
  it('renders mobile report cards with key details and keyboard open behavior', () => {
    const props = buildProps()
    render(<ReportRecordsSection {...props} />)

    const mobileCard = screen.getByRole('button', {
      name: 'Open erco report ERCO-2026-001 summary',
    })
    const mobileArticle = mobileCard.closest('article')

    expect(document.querySelector('.list-group')).toBeTruthy()
    expect(mobileArticle.className).toContain('list-group-item')
    expect(mobileCard.querySelector('.fw-semibold')?.textContent).toBe('Medical Emergency')
    expect(mobileCard.querySelector('.record-card-eyebrow')?.textContent).toBe('ERCO-2026-001')
    expect(mobileCard.querySelector('.small.text-body-secondary')?.textContent).toBe('Engine Room')
    expect(mobileCard.textContent).toContain('ERCO-2026-001')
    expect(mobileCard.textContent).toContain('Medical Emergency')
    expect(mobileCard.textContent).toContain('Engine Room')
    expect(mobileCard.textContent).toContain('Alex Tan')
    expect(mobileCard.textContent).toContain('2026-04-15 10:30')
    expect(mobileArticle.textContent).toContain('Submitted')
    expect(mobileArticle.textContent).toContain('15 Apr 2026')

    fireEvent.keyDown(mobileCard, { key: 'Enter' })
    fireEvent.keyDown(mobileCard, { key: ' ' })

    expect(props.onViewRecord).toHaveBeenCalledTimes(2)
    expect(props.onViewRecord).toHaveBeenCalledWith('RPT-001')
  })

  it('opens draft reports for edit from the mobile card', () => {
    const props = buildProps({
      filteredRecords: [draftRow],
      visibleRows: [draftRow],
    })
    render(<ReportRecordsSection {...props} />)

    const mobileCard = screen.getByRole('button', { name: 'Open erco report Draft summary' })
    fireEvent.keyDown(mobileCard, { key: 'Enter' })

    expect(props.onEditRecord).toHaveBeenCalledWith(draftRow)
    expect(props.onViewRecord).not.toHaveBeenCalled()
  })

  it('keeps mobile row actions from triggering report card navigation', () => {
    const props = buildProps()
    render(<ReportRecordsSection {...props} />)

    const mobileCard = screen.getByRole('button', {
      name: 'Open erco report ERCO-2026-001 summary',
    })
    const mobileArticle = mobileCard.closest('article')
    fireEvent.click(within(mobileArticle).getByRole('button', { name: 'Review' }))

    expect(props.onReviewTransition).toHaveBeenCalledWith(submittedRow)
    expect(props.onViewRecord).not.toHaveBeenCalled()
  })

  it('opens submitted reports from desktop row click', () => {
    const props = buildProps()
    const { container } = render(<ReportRecordsSection {...props} />)

    const desktopRow = Array.from(container.querySelectorAll('tbody tr')).find((row) =>
      row.textContent?.includes('ERCO-2026-001'),
    )

    fireEvent.click(desktopRow)

    expect(props.onViewRecord).toHaveBeenCalledWith('RPT-001')
  })

  it('keeps desktop row actions from triggering report row navigation', () => {
    const props = buildProps()
    const { container } = render(<ReportRecordsSection {...props} />)

    const desktopRow = Array.from(container.querySelectorAll('tbody tr')).find((row) =>
      row.textContent?.includes('ERCO-2026-001'),
    )
    const reviewAction = within(desktopRow).getByRole('button', { name: 'Review' })

    fireEvent.click(reviewAction)

    expect(props.onReviewTransition).toHaveBeenCalledWith(submittedRow)
    expect(props.onViewRecord).not.toHaveBeenCalled()
  })

  it('exposes disabled report action reasons', () => {
    render(<ReportRecordsSection {...buildProps({ canReviewRecord: () => false })} />)

    const reviewAction = screen.getAllByRole('button', {
      name: 'Review. Review is not available for this status.',
    })[0]

    expect(reviewAction.getAttribute('title')).toBe('Review is not available for this status.')
  })

  it('renders the configured report type label in the desktop table', () => {
    render(
      <ReportRecordsSection
        {...buildProps({
          reportTypeLabel: 'Fitness Test',
          typeLabel: 'Fitness Test Type',
        })}
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Fitness Test Type' })).toBeTruthy()
  })
})
