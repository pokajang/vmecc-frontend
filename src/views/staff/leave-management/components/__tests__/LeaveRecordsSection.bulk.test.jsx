// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import LeaveRecordsSection from '../LeaveRecordsSection'

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
    id: 'LV-AL-2026-001',
    recordKey: '1::101',
    ownerUserId: '1',
    employee: 'Jang',
    team: 'Alpha',
    leaveType: 'Annual Leave',
    reason: 'Family',
    startDate: '2026-04-10',
    endDate: '2026-04-10',
    startTime: '08:00',
    endTime: '17:00',
    days: 1,
    status: 'Pending',
    appliedAt: '2026-04-10T00:00:00.000Z',
    approvalHistory: [],
    workflowSnapshot: { requireRecommendation: true },
  },
  {
    id: 'LV-AL-2026-002',
    recordKey: '1::102',
    ownerUserId: '1',
    employee: 'Jang',
    team: 'Alpha',
    leaveType: 'Annual Leave',
    reason: 'Errand',
    startDate: '2026-04-14',
    endDate: '2026-04-14',
    startTime: '08:00',
    endTime: '17:00',
    days: 1,
    status: 'Pending',
    appliedAt: '2026-04-14T00:00:00.000Z',
    approvalHistory: [],
    workflowSnapshot: { requireRecommendation: true },
  },
]

describe('LeaveRecordsSection bulk workflow', () => {
  it('supports grouped bulk approve action in review mode', async () => {
    const onBulkWorkflowAction = vi.fn(async () => ({ succeeded: 2, failed: 0 }))
    render(
      <LeaveRecordsSection
        title="All Leaves"
        actionMode="review"
        search=""
        setSearch={vi.fn()}
        period="all"
        setPeriod={vi.fn()}
        sort="appliedAt:desc"
        setSort={vi.fn()}
        typeFilter="All"
        setTypeFilter={vi.fn()}
        statusFilter="All"
        setStatusFilter={vi.fn()}
        leaveSortOptions={[{ value: 'appliedAt:desc', label: 'Latest applied' }]}
        typeOptions={[{ value: 'All', label: 'All leave types' }]}
        statusOptions={[{ value: 'All', label: 'All status' }]}
        clearFilters={vi.fn()}
        filteredRecords={rows}
        visibleRows={rows}
        rowsToShow={5}
        setRowsToShow={vi.fn()}
        leaveRecordsCount={rows.length}
        openRecord={vi.fn()}
        approveLeave={vi.fn()}
        rejectLeave={vi.fn()}
        getReviewActionConfig={() => ({
          approveLabel: 'Review',
          approveDisabled: false,
          rejectDisabled: false,
        })}
        getDisplayLeaveId={(row) => row.id}
        getStartDateTimeLabel={(row) => `${row.startDate} ${row.startTime}`}
        getEndDateTimeLabel={(row) => `${row.endDate} ${row.endTime}`}
        formatDate={(value) => String(value || '').slice(0, 10)}
        onBulkWorkflowAction={onBulkWorkflowAction}
        bulkDeclarationLabel="I confirm these selected leave workflow actions are accurate and authorized."
      />,
    )

    const groupCheckbox = screen.getByRole('checkbox', {
      name: /Select actionable leave records/i,
    })
    fireEvent.click(groupCheckbox)

    expect(screen.getByText('2 leave records selected')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Review selected' }))

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /I confirm these selected leave workflow actions are accurate and authorized\./i,
      }),
    )
    fireEvent.click(screen.getAllByRole('button', { name: 'Review selected' }).at(-1))

    await waitFor(() => {
      expect(onBulkWorkflowAction).toHaveBeenCalledTimes(1)
      expect(onBulkWorkflowAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'approve',
          declarationChecked: true,
        }),
      )
    })
  })
})
