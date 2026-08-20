// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

afterEach(() => {
  cleanup()
})

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

    const rowButton = within(document.querySelector('table')).getByRole('button', {
      name: 'Open leave record LV-AL-2026-001',
    })

    fireEvent.keyDown(rowButton, { key: 'Enter' })
    fireEvent.keyDown(rowButton, { key: ' ' })

    expect(props.openRecord).toHaveBeenCalledTimes(2)
  })

  it('renders a mobile record card with critical record details', () => {
    const props = buildProps()
    render(<LeaveRecordsSection {...props} />)

    const mobileCard = screen
      .getAllByRole('button', { name: 'Open leave record LV-AL-2026-001 summary' })
      .find((card) => card.closest('.d-md-none'))

    expect(mobileCard).toBeTruthy()
    expect(document.querySelector('.list-group')).toBeTruthy()
    expect(mobileCard.closest('article').className).toContain('list-group-item')
    expect(mobileCard.textContent).toContain('LV-AL-2026-001')
    expect(mobileCard.textContent).toContain('Annual Leave')
    expect(mobileCard.textContent).toContain('15 Apr 2026')
    expect(mobileCard.textContent).toContain('1')

    fireEvent.click(mobileCard)
    expect(props.openRecord).toHaveBeenCalledWith(props.visibleRows[0])
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
