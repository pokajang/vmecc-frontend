// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import OvertimeRecordsSection from '../OvertimeRecordsSection'

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

const baseProps = {
  search: '',
  setSearch: vi.fn(),
  period: 'all',
  setPeriod: vi.fn(),
  sort: 'appliedAt:desc',
  setSort: vi.fn(),
  statusFilter: 'All',
  setStatusFilter: vi.fn(),
  overtimeSortOptions: [{ value: 'appliedAt:desc', label: 'Newest' }],
  statusOptions: [
    { value: 'All', label: 'All status' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Pending', label: 'Pending' },
  ],
  clearFilters: vi.fn(),
  rowsToShow: 5,
  setRowsToShow: vi.fn(),
  overtimeRecordsCount: 2,
  startNewOvertime: vi.fn(),
  openOvertimeForEdit: vi.fn(),
  cancelOvertime: vi.fn(),
  deleteOvertime: vi.fn(),
  getDisplayOvertimeId: (row) => String(row?.id || ''),
  getStartDateTimeLabel: (row) => `${row?.claimDate || '-'} ${row?.startTime || '-'}`,
  getEndDateTimeLabel: (row) => `${row?.claimDate || '-'} ${row?.endTime || '-'}`,
  isLoading: false,
}

const draftRow = {
  id: 'DRAFT',
  recordKey: 'draft::u1',
  overtimeType: 'weekday',
  claimDate: '2026-04-12',
  startTime: '09:00',
  endTime: '11:00',
  durationMinutes: 120,
  reason: 'Draft overtime row',
  status: 'Draft',
  appliedAt: '2026-04-12T10:00:00.000Z',
  isDraft: true,
}

const pendingRow = {
  id: 'OT-2026-001',
  recordKey: 'u1::101',
  overtimeType: 'weekend',
  claimDate: '2026-04-10',
  startTime: '08:00',
  endTime: '10:00',
  durationMinutes: 120,
  reason: 'Pending overtime row',
  status: 'Pending',
  appliedAt: '2026-04-10T10:00:00.000Z',
  approvalHistory: [],
  workflowSnapshot: { requireRecommendation: true },
}

const pendingAfterReviewRow = {
  ...pendingRow,
  id: 'OT-2026-002',
  recordKey: 'u1::102',
  workflowStage: 'recommend',
  approvalHistory: [{ action: 'Reviewed', by: 'Contract Manager' }],
}

const pendingWithDraftChangesRow = {
  ...pendingRow,
  id: 'OT-2026-003',
  recordKey: 'u1::103',
  hasDraftChanges: true,
}

const publicHolidayRow = {
  ...pendingRow,
  id: 'OT-2026-004',
  recordKey: 'u1::104',
  overtimeType: 'publicHoliday',
  durationMinutes: 60,
}

describe('OvertimeRecordsSection draft row UX', () => {
  it('renders draft row first with loader + Draft and without approval gates', () => {
    const openRecord = vi.fn()
    const visibleRows = [draftRow, pendingRow]
    const filteredRecords = [draftRow, pendingRow]

    render(
      <OvertimeRecordsSection
        {...baseProps}
        openRecord={openRecord}
        visibleRows={visibleRows}
        filteredRecords={filteredRecords}
      />,
    )

    const bodyRows = Array.from(document.querySelectorAll('tbody tr'))
    expect(bodyRows.length > 0).toBe(true)
    const firstRow = bodyRows[0]
    expect(within(firstRow).getByText('DRAFT')).toBeTruthy()

    const draftStatus = screen.getByTestId('overtime-draft-status-DRAFT')
    expect(draftStatus.textContent || '').toContain('Draft')
    expect((draftStatus.className || '').includes('text-body-secondary')).toBe(true)
    expect(draftStatus.querySelector('svg')).toBeTruthy()

    expect(within(firstRow).queryByText('Reviewed')).toBeNull()
    expect(within(firstRow).queryByText('Recommended')).toBeNull()
    expect(within(firstRow).queryByText('Approved')).toBeNull()

    fireEvent.click(firstRow)
    expect(openRecord).toHaveBeenCalledTimes(1)
    expect(openRecord).toHaveBeenCalledWith(draftRow)
  })

  it('supports deleting the draft row from row actions', () => {
    const deleteOvertime = vi.fn()
    const visibleRows = [draftRow, pendingRow]
    const filteredRecords = [draftRow, pendingRow]

    const { container } = render(
      <OvertimeRecordsSection
        {...baseProps}
        deleteOvertime={deleteOvertime}
        openRecord={vi.fn()}
        visibleRows={visibleRows}
        filteredRecords={filteredRecords}
      />,
    )

    const bodyRows = Array.from(container.querySelectorAll('tbody tr'))
    const firstRow = bodyRows[0]
    const deleteAction = within(firstRow).getByRole('button', { name: 'Delete' })
    fireEvent.click(deleteAction)
    expect(deleteOvertime).toHaveBeenCalledTimes(1)
    expect(deleteOvertime).toHaveBeenCalledWith(draftRow)
  })

  it('disables edit action once pending claim has passed first approval step', () => {
    render(
      <OvertimeRecordsSection
        {...baseProps}
        openRecord={vi.fn()}
        visibleRows={[pendingAfterReviewRow]}
        filteredRecords={[pendingAfterReviewRow]}
      />,
    )

    const editButton = screen.getAllByRole('button', { name: 'Edit' }).at(-1)
    expect(editButton).toBeTruthy()
    expect(editButton.disabled).toBe(true)
  })

  it('shows draft changes marker on unchanged pending row when linked edit draft exists', () => {
    render(
      <OvertimeRecordsSection
        {...baseProps}
        openRecord={vi.fn()}
        visibleRows={[pendingWithDraftChangesRow]}
        filteredRecords={[pendingWithDraftChangesRow]}
      />,
    )

    const marker = screen.getByTestId('overtime-linked-draft-status-OT-2026-003')
    expect(marker).toBeTruthy()
    expect(marker.textContent || '').toContain('Draft saved')
    expect(marker.querySelector('svg')).toBeTruthy()
    expect(screen.queryByText('DRAFT')).toBeNull()
  })

  it('shows month totals grouped by overtime type instead of a single combined total', () => {
    render(
      <OvertimeRecordsSection
        {...baseProps}
        openRecord={vi.fn()}
        visibleRows={[pendingRow, publicHolidayRow]}
        filteredRecords={[pendingRow, publicHolidayRow]}
      />,
    )

    expect(screen.getByTestId('ot-type-summary-chip-weekend')).toBeTruthy()
    expect(screen.getByTestId('ot-type-summary-chip-publicHoliday')).toBeTruthy()
    expect(screen.getByTestId('ot-month-group-2026-04-month').textContent).toBe('APRIL 2026')
    expect(screen.getByText('2 records')).toBeTruthy()
    expect(screen.queryByText(/Total:/i)).toBeNull()
  })
})
