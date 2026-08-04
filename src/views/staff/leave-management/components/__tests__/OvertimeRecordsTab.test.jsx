// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import OvertimeRecordsTab from '../OvertimeRecordsTab'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

vi.mock('src/components/RowActions', () => ({
  default: ({ items = [] }) => (
    <div>
      {items.map((item) => (
        <button
          key={item.key || item.label}
          type="button"
          disabled={Boolean(item.disabled)}
          onClick={item.onClick}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}))

const rows = [
  {
    id: 'OT-2026-001',
    recordKey: '1::11',
    ownerUserId: '1',
    employee: 'Jang',
    avatarUrl: 'https://example.com/jang.jpg',
    overtimeType: 'weekend',
    team: 'Alpha',
    claimDate: '2026-04-10',
    startTime: '08:00',
    endTime: '10:00',
    durationMinutes: 120,
    status: 'Pending',
    appliedAt: '2026-04-13T10:00:00.000Z',
    approvalHistory: [],
    workflowSnapshot: { requireRecommendation: true },
  },
  {
    id: 'OT-2026-002',
    recordKey: '1::12',
    ownerUserId: '1',
    employee: 'Jang',
    overtimeType: 'publicHoliday',
    team: 'Alpha',
    claimDate: '2026-04-11',
    startTime: '13:00',
    endTime: '14:00',
    durationMinutes: 60,
    status: 'Pending',
    appliedAt: '2026-04-13T11:00:00.000Z',
    approvalHistory: [],
    workflowSnapshot: { requireRecommendation: true },
  },
]

const baseVm = {
  search: '',
  period: 'all',
  sort: 'appliedAt:desc',
  statusFilter: 'All',
  overtimeTypeFilter: 'All',
  teamFilter: 'All',
  statusOptions: [{ value: 'All', label: 'All status' }],
  overtimeTypeOptions: [{ value: 'All', label: 'All OT type' }],
  teamOptions: [{ value: 'All', label: 'All team' }],
  overtimeSortOptions: [{ value: 'appliedAt:desc', label: 'Latest submitted' }],
  rows,
  rowsToShow: 5,
  currentPage: 1,
  lastPage: 3,
  filteredCount: 8,
  totalCount: 20,
  getDisplayOvertimeId: (row) => row.id,
  getStartDateTimeLabel: (row) => `${row.claimDate} ${row.startTime}`,
  getEndDateTimeLabel: (row) => `${row.claimDate} ${row.endTime}`,
  formatDate: (value) => String(value || '').slice(0, 10),
  getStatusLabel: () => 'Pending Review',
  getPendingActionHint: () => 'Awaiting Contract Manager',
  getReviewActionConfig: () => ({
    approveLabel: 'Review',
    approveDisabled: false,
    rejectDisabled: false,
  }),
}

const baseHandlers = {
  setSearch: vi.fn(),
  setPeriod: vi.fn(),
  setSort: vi.fn(),
  setStatusFilter: vi.fn(),
  setOvertimeTypeFilter: vi.fn(),
  setTeamFilter: vi.fn(),
  clearFilters: vi.fn(),
  setRowsToShow: vi.fn(),
  setPage: vi.fn(),
  approveOvertime: vi.fn(),
  rejectOvertime: vi.fn(),
  openOvertimeDetail: vi.fn(),
  onBulkWorkflowAction: vi.fn(async () => ({ succeeded: 2, failed: 0 })),
}

describe('OvertimeRecordsTab', () => {
  it('preserves loading and filtered-empty precedence', () => {
    const { rerender } = render(
      <OvertimeRecordsTab
        vm={{ ...baseVm, isLoading: true, rows: [], filteredCount: 0 }}
        handlers={baseHandlers}
      />,
    )

    expect(screen.getByRole('status').textContent).toContain('Loading')
    expect(screen.queryByText('No overtime records match the current filters.')).toBeNull()
    expect(document.querySelector('.mobile-record-list')).toBeNull()
    expect(document.querySelector('.d-none.d-md-block table')).toBeNull()
    expect(screen.queryByLabelText('Rows per page')).toBeNull()

    rerender(
      <OvertimeRecordsTab
        vm={{ ...baseVm, isLoading: false, rows: [], filteredCount: 0 }}
        handlers={baseHandlers}
      />,
    )

    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByText('No overtime records match the current filters.')).toBeTruthy()
    expect(document.querySelector('.mobile-record-list')).toBeNull()
    expect(document.querySelector('.d-none.d-md-block table')).toBeNull()
    expect(screen.queryByLabelText('Rows per page')).toBeNull()
  })

  it('preserves mobile, desktop, footer-count, and page-size behavior', () => {
    const handlers = { ...baseHandlers, setRowsToShow: vi.fn() }
    render(<OvertimeRecordsTab vm={baseVm} handlers={handlers} />)

    expect(document.querySelector('.mobile-record-list.list-group')).toBeNull()
    expect(document.querySelector('.mobile-record-list .list-group')).toBeTruthy()
    expect(document.querySelector('.d-none.d-md-block table')).toBeTruthy()
    expect(screen.getByText('Showing 2 of 8')).toBeTruthy()
    expect(screen.getByText('(filtered from 20)')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '10' } })
    expect(handlers.setRowsToShow).toHaveBeenCalledWith(10)
  })

  it('keeps every workflow row action available on mobile and desktop', () => {
    const handlers = {
      ...baseHandlers,
      approveOvertime: vi.fn(),
      rejectOvertime: vi.fn(),
      requestOvertimeCorrection: vi.fn(),
      openOvertimeDetail: vi.fn(),
    }
    render(<OvertimeRecordsTab vm={baseVm} handlers={handlers} />)

    const mobileList = document.querySelector('.mobile-record-list')
    const desktopTable = document.querySelector('.d-none.d-md-block table')
    for (const label of ['Review', 'Reject', 'Request correction']) {
      expect(within(mobileList).getAllByRole('button', { name: label })).toHaveLength(rows.length)
      expect(within(desktopTable).getAllByRole('button', { name: label })).toHaveLength(rows.length)
    }

    fireEvent.click(within(mobileList).getAllByRole('button', { name: 'Review' })[0])
    fireEvent.click(within(desktopTable).getAllByRole('button', { name: 'Reject' })[0])
    fireEvent.click(within(mobileList).getAllByRole('button', { name: 'Request correction' })[0])

    expect(handlers.approveOvertime).toHaveBeenCalledWith(rows[0])
    expect(handlers.rejectOvertime).toHaveBeenCalledWith(rows[0])
    expect(handlers.requestOvertimeCorrection).toHaveBeenCalledWith(rows[0])
    expect(handlers.openOvertimeDetail).not.toHaveBeenCalled()
  })

  it('renders month and user grouped headers with per-type totals and type column', () => {
    render(<OvertimeRecordsTab vm={baseVm} handlers={baseHandlers} />)

    expect(screen.getAllByText('Type').length).toBeGreaterThan(0)
    expect(screen.queryByText('Employee')).toBeNull()
    expect(screen.getAllByTestId('ot-type-summary-chip-weekend').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('ot-type-summary-chip-publicHoliday').length).toBeGreaterThan(0)
    expect(screen.getByTestId('ot-month-group-month-2026-04-month').textContent).toBe('APRIL 2026')
    expect(screen.getByTestId('ot-user-group-month-2026-04-user-1-name').textContent).toBe('Jang')
    expect(screen.getByTestId('ot-user-group-month-2026-04-user-1-avatar').tagName).toBe('IMG')
  })

  it('renders approval gates and mobile-readable workflow status text', () => {
    render(<OvertimeRecordsTab vm={baseVm} handlers={baseHandlers} />)

    expect(screen.getAllByText('Pending Review').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Reviewed').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Recommended').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0)
  })

  it('uses pagination controls to navigate pages', () => {
    render(<OvertimeRecordsTab vm={{ ...baseVm, currentPage: 2 }} handlers={baseHandlers} />)

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(baseHandlers.setPage).toHaveBeenCalledWith(1)
    expect(baseHandlers.setPage).toHaveBeenCalledWith(3)
  })

  it('supports bulk approve flow from grouped selection', async () => {
    const handlers = {
      ...baseHandlers,
      onBulkWorkflowAction: vi.fn(async () => ({ succeeded: 2, failed: 0 })),
    }
    render(<OvertimeRecordsTab vm={baseVm} handlers={handlers} />)

    const groupCheckbox = screen.getAllByRole('checkbox', {
      name: /Select actionable overtime records/i,
    })[0]
    fireEvent.click(groupCheckbox)

    expect(screen.getByText('2 overtime records selected')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Review selected' }))
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /I confirm these selected overtime workflow actions are accurate and authorized\./i,
      }),
    )
    fireEvent.click(screen.getAllByRole('button', { name: 'Review selected' }).at(-1))

    await waitFor(() => {
      expect(handlers.onBulkWorkflowAction).toHaveBeenCalledTimes(1)
      expect(handlers.onBulkWorkflowAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'approve',
          declarationChecked: true,
        }),
      )
    })
  })

  it('opens overtime records from keyboard activation and keeps actions separate', () => {
    const handlers = {
      ...baseHandlers,
      openOvertimeDetail: vi.fn(),
      approveOvertime: vi.fn(),
    }
    render(<OvertimeRecordsTab vm={baseVm} handlers={handlers} />)

    const desktopRow = document.querySelector('tr[aria-label="Open overtime record OT-2026-001"]')
    fireEvent.keyDown(desktopRow, { key: 'Enter' })
    fireEvent.keyDown(desktopRow, { key: ' ' })
    expect(handlers.openOvertimeDetail).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getAllByRole('button', { name: 'Open overtime record OT-2026-001' })[0])
    expect(handlers.openOvertimeDetail).toHaveBeenCalledTimes(3)

    fireEvent.click(screen.getAllByRole('button', { name: 'Review' })[0])
    expect(handlers.approveOvertime).toHaveBeenCalledTimes(1)
    expect(handlers.openOvertimeDetail).toHaveBeenCalledTimes(3)
  })
})
