// @vitest-environment jsdom
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import LeaveRecordsSection from '../LeaveRecordsSection'

vi.mock('src/components/RowActions', () => ({
  default: ({ items = [] }) => (
    <div onClick={(event) => event.stopPropagation()}>
      {items.map((item) => (
        <button
          key={item.key || item.label}
          type="button"
          disabled={Boolean(item.disabled)}
          onClick={(event) => {
            event.stopPropagation()
            item.onClick?.(event)
          }}
        >
          {`Action ${item.label}`}
        </button>
      ))}
    </div>
  ),
}))

const buildProps = (overrides = {}) => {
  const row = {
    id: 'LV-AL-2026-001',
    recordKey: '1::LV-AL-2026-001',
    leaveType: 'Annual Leave',
    reason: 'Family event',
    startDate: '2026-04-15',
    endDate: '2026-04-15',
    days: 1,
    status: 'Pending',
    appliedAt: '2026-04-15T10:00:00.000Z',
    approvalHistory: [],
    workflowSnapshot: { requireRecommendation: true },
  }

  return {
    title: 'My Leave Records',
    showPrimaryAction: false,
    actionMode: 'self',
    search: '',
    setSearch: vi.fn(),
    period: 'all',
    setPeriod: vi.fn(),
    sort: 'appliedAt:desc',
    setSort: vi.fn(),
    typeFilter: 'All',
    setTypeFilter: vi.fn(),
    statusFilter: 'All',
    setStatusFilter: vi.fn(),
    leaveSortOptions: [{ value: 'appliedAt:desc', label: 'Latest submitted' }],
    typeOptions: [{ value: 'All', label: 'All leave types' }],
    statusOptions: [{ value: 'All', label: 'All status' }],
    clearFilters: vi.fn(),
    filteredRecords: [row],
    visibleRows: [row],
    rowsToShow: 10,
    setRowsToShow: vi.fn(),
    leaveRecordsCount: 1,
    startNewLeave: vi.fn(),
    openRecord: vi.fn(),
    openLeaveForEdit: vi.fn(),
    cancelLeave: vi.fn(),
    canCancelLeave: () => true,
    deleteLeave: vi.fn(),
    getDisplayLeaveId: (item) => item.id,
    getStartDateTimeLabel: () => '15 Apr 2026',
    getEndDateTimeLabel: () => '15 Apr 2026',
    isLoading: false,
    ...overrides,
  }
}

describe('LeaveRecordsSection interactions', () => {
  it('opens record from keyboard Enter/Space on row', () => {
    const props = buildProps()
    render(<LeaveRecordsSection {...props} />)

    const rowButton = screen.getByRole('button', { name: 'Open leave record LV-AL-2026-001' })

    fireEvent.keyDown(rowButton, { key: 'Enter' })
    fireEvent.keyDown(rowButton, { key: ' ' })

    expect(props.openRecord).toHaveBeenCalledTimes(2)
  })

  it('action click does not trigger row navigation', () => {
    const props = buildProps()
    render(<LeaveRecordsSection {...props} />)

    const actionButtons = screen.getAllByRole('button', { name: 'Action Cancel' })
    const enabledActions = actionButtons.filter((button) => !button.hasAttribute('disabled'))
    expect(enabledActions.length).toBeGreaterThan(0)
    enabledActions.forEach((button) => {
      fireEvent.click(button)
    })

    expect(props.cancelLeave).toHaveBeenCalled()
    expect(props.openRecord).toHaveBeenCalledTimes(0)
  })
})
