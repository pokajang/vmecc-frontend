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
  checklist: [{ id: 'safety:access-clear', label: 'Access clear', selected: true }],
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

const queuedRow = {
  id: 'queue-1',
  queueId: 'queue-1',
  displayId: 'INS-QUEUED-001',
  recordKind: 'queued',
  incidentType: 'Inspection',
  location: 'Zone Q',
  submittedAt: '2026-04-18T10:00:00.000Z',
  status: 'Queued',
  queueStatus: 'failed',
  lastError: 'Network unavailable',
  attempts: 1,
  nextRetryAt: '2026-04-18T10:05:00.000Z',
  history: [
    {
      action: 'queued',
      at: '2026-04-18T10:00:00.000Z',
      message: 'Inspection submission queued on this device.',
    },
  ],
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
  typeOptions: [{ value: 'All', label: 'All types' }],
  statusFilter: 'All',
  setStatusFilter: vi.fn(),
  statusOptions: [{ value: 'All', label: 'All status' }],
  checklistFilter: 'All',
  setChecklistFilter: vi.fn(),
  hasChecklistFilter: 'All',
  setHasChecklistFilter: vi.fn(),
  checklistOptions: [{ value: 'All', label: 'All checklist items' }],
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
  onSaveQueuedAsDraft: vi.fn(),
  onOpenQueueConflict: vi.fn(),
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
  queueSummary: null,
  isQueueSyncing: false,
  onRetryQueue: vi.fn(),
  checklistSummary: {
    totalReports: 1,
    withChecklist: 1,
    withoutChecklist: 0,
    items: [{ id: 'safety:access-clear', label: 'Access clear', count: 1 }],
  },
  offlineHealth: {
    indexedDbStatus: 'Available',
    cacheName: 'vmecc-app-shell-v2',
    pendingQueueCount: 0,
    storageRemaining: 1024 * 1024,
    warnings: [],
  },
  onRefreshOfflineAssets: vi.fn(),
  onRecoverLocalDraft: vi.fn(),
  ...overrides,
})

describe('InspectionRecordsSection', () => {
  it('renders mobile inspection cards with key details and keyboard open behavior', () => {
    const props = buildProps()
    render(<InspectionRecordsSection {...props} />)

    const mobileCard = screen
      .getAllByRole('button', {
        name: 'Open inspection record INS-2026-001 summary',
      })
      .find((button) => button.closest('article'))

    const mobileArticle = mobileCard.closest('article')
    expect(mobileArticle.className).toContain('list-group-item')
    expect(mobileArticle.closest('.list-group')).toBeTruthy()
    expect(mobileArticle.textContent).toContain('16 Apr 2026, 14:00')
    expect(mobileArticle.textContent).toContain('Safety - Workshop')
    expect(mobileArticle.textContent).toContain('Submitted')
    expect(mobileArticle.textContent).not.toContain('Monthly safety inspection.')
    expect(mobileArticle.textContent).not.toContain('Priya Lim')

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

    const mobileCard = screen
      .getAllByRole('button', {
        name: 'Open inspection record Draft summary',
      })
      .find((button) => button.closest('article'))
    fireEvent.keyDown(mobileCard, { key: 'Enter' })

    expect(props.onEditRecord).toHaveBeenCalledWith(draftRow)
    expect(props.onViewRecord).not.toHaveBeenCalled()
  })

  it('keeps mobile row actions from triggering inspection card navigation', () => {
    const props = buildProps()
    render(<InspectionRecordsSection {...props} />)

    const mobileCard = screen
      .getAllByRole('button', {
        name: 'Open inspection record INS-2026-001 summary',
      })
      .find((button) => button.closest('article'))
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

  it('opens submitted inspections from desktop row keyboard actions', () => {
    const props = buildProps()
    const { container } = render(<InspectionRecordsSection {...props} />)

    const desktopRow = Array.from(container.querySelectorAll('tbody tr')).find((row) =>
      row.textContent?.includes('INS-2026-001'),
    )

    expect(desktopRow.getAttribute('role')).toBe('button')
    expect(desktopRow.getAttribute('tabindex')).toBe('0')

    fireEvent.keyDown(desktopRow, { key: 'Enter' })
    fireEvent.keyDown(desktopRow, { key: ' ' })

    expect(props.onViewRecord).toHaveBeenCalledTimes(2)
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

  it('hides inspection actions that are unavailable to the current actor', () => {
    render(<InspectionRecordsSection {...buildProps({ canReviewRecord: () => false })} />)

    expect(screen.queryByRole('button', { name: 'Review' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'View details' }).length).toBeGreaterThan(0)
  })

  it('renders queued records with retry and local delete actions', () => {
    const props = buildProps({
      filteredRecords: [queuedRow],
      visibleRows: [queuedRow],
      queueRows: [queuedRow],
      queueSummary: { count: 1, failedCount: 1, syncingCount: 0, lastError: 'Network unavailable' },
    })

    render(<InspectionRecordsSection {...props} />)

    expect(screen.getAllByText('Network unavailable')).toHaveLength(2)
    fireEvent.click(screen.getAllByRole('button', { name: 'Retry now' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: 'Save as draft' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete queued' })[0])

    expect(props.onRetryQueue).toHaveBeenCalled()
    expect(props.onSaveQueuedAsDraft).toHaveBeenCalledWith(queuedRow)
    expect(props.onDeleteRecord).toHaveBeenCalledWith(queuedRow)
    expect(screen.queryByRole('button', { name: 'Review' })).toBeNull()
  })

  it('shows queue detail history and offline health', () => {
    const props = buildProps({
      filteredRecords: [queuedRow],
      visibleRows: [queuedRow],
      queueRows: [queuedRow],
      queueSummary: { count: 1, failedCount: 1, syncingCount: 0, lastError: 'Network unavailable' },
      offlineHealth: {
        indexedDbStatus: 'Available',
        cacheName: 'vmecc-app-shell-v2',
        pendingQueueCount: 1,
        storageRemaining: 1024 * 1024,
        warnings: [],
      },
    })

    render(<InspectionRecordsSection {...props} />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Details' })[0])

    expect(screen.getByText('Offline readiness')).toBeTruthy()
    expect(screen.getByText('Queue history')).toBeTruthy()
    expect(screen.getByText(/Inspection submission queued on this device/)).toBeTruthy()
  })

  it('does not render the legacy checklist summary panel', () => {
    render(<InspectionRecordsSection {...buildProps()} />)

    expect(screen.queryByText('Checklist Summary')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Export CSV' })).toBeNull()
  })
})
