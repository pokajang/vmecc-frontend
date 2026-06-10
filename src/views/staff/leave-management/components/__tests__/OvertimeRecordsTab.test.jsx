// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import OvertimeRecordsTab from '../OvertimeRecordsTab'

afterEach(() => {
  cleanup()
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
  it('renders month and user grouped headers with per-type totals and type column', () => {
    render(<OvertimeRecordsTab vm={baseVm} handlers={baseHandlers} />)

    expect(screen.getByText('Type')).toBeTruthy()
    expect(screen.queryByText('Employee')).toBeNull()
    expect(screen.getAllByTestId('ot-type-summary-chip-weekend').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('ot-type-summary-chip-publicHoliday').length).toBeGreaterThan(0)
    expect(screen.getByTestId('ot-month-group-month-2026-04-month').textContent).toBe('APRIL 2026')
    expect(screen.getByTestId('ot-user-group-month-2026-04-user-1-name').textContent).toBe('Jang')
    expect(screen.getByTestId('ot-user-group-month-2026-04-user-1-avatar').tagName).toBe('IMG')
  })

  it('renders approval gates in status cell without redundant top status text', () => {
    render(<OvertimeRecordsTab vm={baseVm} handlers={baseHandlers} />)

    expect(screen.queryByText('Pending Review')).toBeNull()
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

    const groupCheckbox = screen.getByRole('checkbox', {
      name: /Select actionable overtime records/i,
    })
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
})
